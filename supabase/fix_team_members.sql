-- Script para corrigir o problema de ambiguidade na coluna team_id e políticas de segurança

-- Verificar se existem funções ou triggers que podem estar causando ambiguidade
SELECT 
  routine_name, 
  routine_type,
  routine_definition
FROM 
  information_schema.routines
WHERE 
  routine_definition LIKE '%team_id%'
  AND routine_schema = 'public';

-- Verificar políticas que podem estar causando ambiguidade
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM 
  pg_policies
WHERE 
  qual::text LIKE '%team_id%' OR with_check::text LIKE '%team_id%';

-- Atualizar a função is_team_member para usar aliases e evitar ambiguidade
-- Mantendo os nomes originais dos parâmetros para não quebrar as dependências
CREATE OR REPLACE FUNCTION public.is_team_member(team_id UUID, user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM team_members tm
        WHERE tm.team_id = team_id 
        AND tm.user_id = user_id
    );
$$;

-- Atualizar a função has_team_role para usar aliases e evitar ambiguidade
-- Mantendo os nomes originais dos parâmetros para não quebrar as dependências
CREATE OR REPLACE FUNCTION public.has_team_role(team_id UUID, role TEXT, user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM team_members tm
        WHERE tm.team_id = team_id 
        AND tm.user_id = user_id 
        AND tm.role = role
    );
$$;

-- Atualizar a função is_team_admin para usar aliases e evitar ambiguidade
-- Mantendo os nomes originais dos parâmetros para não quebrar as dependências
CREATE OR REPLACE FUNCTION public.is_team_admin(team_id UUID, user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM team_members tm
        WHERE tm.team_id = team_id 
        AND tm.user_id = user_id 
        AND (tm.role = 'owner' OR tm.role = 'admin')
    );
$$;

-- Função para verificar se o usuário é o criador do time
CREATE OR REPLACE FUNCTION public.is_team_creator(team_id UUID, user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM teams t
        WHERE t.id = team_id 
        AND t.created_by = user_id
    );
$$;

-- Atualizar diretamente a política existente para permitir que o criador do time adicione membros
ALTER POLICY "Admins podem adicionar membros" ON public.team_members
WITH CHECK (is_team_admin(team_id) OR is_super_admin() OR is_team_creator(team_id));

-- Atualizar a política "Admins podem adicionar membros aos seus times" se existir
ALTER POLICY "Admins podem adicionar membros aos seus times" ON public.team_members
WITH CHECK (is_team_admin(team_id) OR is_super_admin() OR is_team_creator(team_id));

-- Corrigir a política de seleção para teams
DO $$
DECLARE
    policy_exists BOOLEAN;
BEGIN
    -- Verificar se existe uma política para seleção em teams
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'teams' 
        AND cmd = 'SELECT'
        AND policyname = 'Usuários podem ver seus times'
    ) INTO policy_exists;
    
    -- Se existir, atualizar a política
    IF policy_exists THEN
        ALTER POLICY "Usuários podem ver seus times" ON public.teams
        USING (
            (auth.uid() IN (
                SELECT user_id
                FROM team_members
                WHERE team_members.team_id = teams.id
            )) OR is_super_admin() OR created_by = auth.uid()
        );
        
        RAISE NOTICE 'Política "Usuários podem ver seus times" atualizada com sucesso';
    END IF;
    
    -- Verificar se existe uma política para inserção em teams
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'teams' 
        AND cmd = 'INSERT'
    ) INTO policy_exists;
    
    -- Se não existir, criar a política
    IF NOT policy_exists THEN
        CREATE POLICY insert_teams ON public.teams
        FOR INSERT
        WITH CHECK (
            auth.uid() IS NOT NULL
        );
        
        RAISE NOTICE 'Política insert_teams criada com sucesso';
    END IF;
    
    -- Garantir que RLS está habilitado para a tabela teams
    ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE 'Políticas para teams verificadas e atualizadas';
END
$$;

-- Verificar e corrigir as políticas para as tabelas relacionadas aos times
DO $$
DECLARE
    tables TEXT[] := ARRAY['companies', 'leads', 'pipelines', 'activities', 'whatsapp_settings', 'whatsapp_messages'];
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY tables
    LOOP
        -- Verificar e atualizar a política de seleção
        EXECUTE format('
            DO $inner$
            DECLARE
                policy_exists BOOLEAN;
            BEGIN
                SELECT EXISTS (
                    SELECT 1 FROM pg_policies 
                    WHERE schemaname = ''public'' 
                    AND tablename = ''%1$s'' 
                    AND cmd = ''SELECT''
                ) INTO policy_exists;
                
                IF policy_exists THEN
                    ALTER POLICY "Membros podem ver %1$s do time" ON public.%1$s
                    USING (is_team_member(team_id) OR is_super_admin());
                    
                    RAISE NOTICE ''Política de seleção para %1$s atualizada'';
                END IF;
                
                -- Verificar e atualizar a política de inserção
                SELECT EXISTS (
                    SELECT 1 FROM pg_policies 
                    WHERE schemaname = ''public'' 
                    AND tablename = ''%1$s'' 
                    AND cmd = ''INSERT''
                ) INTO policy_exists;
                
                IF policy_exists THEN
                    ALTER POLICY "Membros podem inserir %1$s no time" ON public.%1$s
                    WITH CHECK (is_team_member(team_id) OR is_super_admin());
                    
                    RAISE NOTICE ''Política de inserção para %1$s atualizada'';
                END IF;
                
                -- Verificar e atualizar a política de atualização
                SELECT EXISTS (
                    SELECT 1 FROM pg_policies 
                    WHERE schemaname = ''public'' 
                    AND tablename = ''%1$s'' 
                    AND cmd = ''UPDATE''
                ) INTO policy_exists;
                
                IF policy_exists THEN
                    ALTER POLICY "Membros podem atualizar %1$s do time" ON public.%1$s
                    USING (is_team_member(team_id) OR is_super_admin());
                    
                    RAISE NOTICE ''Política de atualização para %1$s atualizada'';
                END IF;
                
                -- Verificar e atualizar a política de exclusão
                SELECT EXISTS (
                    SELECT 1 FROM pg_policies 
                    WHERE schemaname = ''public'' 
                    AND tablename = ''%1$s'' 
                    AND cmd = ''DELETE''
                ) INTO policy_exists;
                
                IF policy_exists THEN
                    ALTER POLICY "Admins podem excluir %1$s do time" ON public.%1$s
                    USING (is_team_admin(team_id) OR is_super_admin());
                    
                    RAISE NOTICE ''Política de exclusão para %1$s atualizada'';
                END IF;
                
                -- Garantir que RLS está habilitado para a tabela
                EXECUTE ''ALTER TABLE public.%1$s ENABLE ROW LEVEL SECURITY'';
            END
            $inner$;
        ', table_name);
        
        RAISE NOTICE 'Políticas para % verificadas e atualizadas', table_name;
    END LOOP;
END
$$; 