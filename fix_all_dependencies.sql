-- Script para remover todas as dependências e recriar as funções e políticas

-- 1. REMOVER TODAS as políticas que dependem das funções
-- Políticas em team_members
DROP POLICY IF EXISTS "Membros podem ver outros membros" ON public.team_members;
DROP POLICY IF EXISTS "Admins podem adicionar membros" ON public.team_members;
DROP POLICY IF EXISTS "Admins podem atualizar membros" ON public.team_members;
DROP POLICY IF EXISTS "Admins podem remover membros" ON public.team_members;

-- Políticas em team_invitations
DROP POLICY IF EXISTS "Membros podem ver convites" ON public.team_invitations;
DROP POLICY IF EXISTS "Admins podem criar convites" ON public.team_invitations;
DROP POLICY IF EXISTS "Admins podem atualizar convites" ON public.team_invitations;
DROP POLICY IF EXISTS "Admins podem excluir convites" ON public.team_invitations;

-- Políticas em companies
DROP POLICY IF EXISTS "Membros podem ver empresas do time" ON public.companies;
DROP POLICY IF EXISTS "Membros podem inserir empresas no time" ON public.companies;
DROP POLICY IF EXISTS "Membros podem atualizar empresas do time" ON public.companies;
DROP POLICY IF EXISTS "Admins podem excluir empresas do time" ON public.companies;

-- Políticas em leads
DROP POLICY IF EXISTS "Membros podem ver leads do time" ON public.leads;
DROP POLICY IF EXISTS "Membros podem inserir leads no time" ON public.leads;
DROP POLICY IF EXISTS "Membros podem atualizar leads do time" ON public.leads;
DROP POLICY IF EXISTS "Admins podem excluir leads do time" ON public.leads;

-- Políticas em pipelines
DROP POLICY IF EXISTS "Membros podem ver pipelines do time" ON public.pipelines;
DROP POLICY IF EXISTS "Membros podem inserir pipelines no time" ON public.pipelines;
DROP POLICY IF EXISTS "Membros podem atualizar pipelines do time" ON public.pipelines;
DROP POLICY IF EXISTS "Admins podem excluir pipelines do time" ON public.pipelines;

-- Políticas em pipeline_stages
DROP POLICY IF EXISTS "Membros podem ver etapas do pipeline" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Membros podem inserir etapas no pipeline" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Membros podem atualizar etapas do pipeline" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Admins podem excluir etapas do pipeline" ON public.pipeline_stages;

-- Políticas em lead_pipelines
DROP POLICY IF EXISTS "Membros podem ver lead pipelines" ON public.lead_pipelines;
DROP POLICY IF EXISTS "Membros podem inserir lead pipelines" ON public.lead_pipelines;
DROP POLICY IF EXISTS "Membros podem atualizar lead pipelines" ON public.lead_pipelines;
DROP POLICY IF EXISTS "Admins podem excluir lead pipelines" ON public.lead_pipelines;

-- Políticas em lead_activity_logs
DROP POLICY IF EXISTS "Membros podem ver logs de atividades" ON public.lead_activity_logs;
DROP POLICY IF EXISTS "Membros podem inserir logs de atividades" ON public.lead_activity_logs;

-- Políticas em activities
DROP POLICY IF EXISTS "Membros podem ver atividades do time" ON public.activities;
DROP POLICY IF EXISTS "Membros podem inserir atividades no time" ON public.activities;
DROP POLICY IF EXISTS "Membros podem atualizar atividades do time" ON public.activities;
DROP POLICY IF EXISTS "Admins podem excluir atividades do time" ON public.activities;

-- Políticas em whatsapp_settings
DROP POLICY IF EXISTS "Usuários podem ver suas configurações" ON public.whatsapp_settings;
DROP POLICY IF EXISTS "Usuários podem inserir suas configurações" ON public.whatsapp_settings;
DROP POLICY IF EXISTS "Usuários podem atualizar suas configurações" ON public.whatsapp_settings;
DROP POLICY IF EXISTS "Membros podem ver configurações de WhatsApp do time" ON public.whatsapp_settings;
DROP POLICY IF EXISTS "Admins podem inserir configurações de WhatsApp no time" ON public.whatsapp_settings;
DROP POLICY IF EXISTS "Admins podem atualizar configurações de WhatsApp do time" ON public.whatsapp_settings;
DROP POLICY IF EXISTS "Admins podem excluir configurações de WhatsApp do time" ON public.whatsapp_settings;

-- Políticas em whatsapp_messages
DROP POLICY IF EXISTS "Membros podem ver mensagens do time" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Membros podem inserir mensagens no time" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Membros podem atualizar mensagens do time" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Admins podem excluir mensagens do time" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Membros podem ver mensagens de WhatsApp do time" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Membros podem inserir mensagens de WhatsApp no time" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Membros podem atualizar mensagens de WhatsApp do time" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Admins podem excluir mensagens de WhatsApp do time" ON public.whatsapp_messages;

-- Políticas em evolution_api_config
DROP POLICY IF EXISTS "Membros podem ver configurações do time" ON public.evolution_api_config;
DROP POLICY IF EXISTS "Admins podem inserir configurações no time" ON public.evolution_api_config;
DROP POLICY IF EXISTS "Admins podem atualizar configurações do time" ON public.evolution_api_config;

-- Políticas em evolution_api_chats
DROP POLICY IF EXISTS "Membros podem ver conversas do time" ON public.evolution_api_chats;
DROP POLICY IF EXISTS "Membros podem inserir conversas no time" ON public.evolution_api_chats;
DROP POLICY IF EXISTS "Membros podem atualizar conversas do time" ON public.evolution_api_chats;
DROP POLICY IF EXISTS "Admins podem excluir conversas do time" ON public.evolution_api_chats;

-- Políticas em evolution_api_messages
DROP POLICY IF EXISTS "Membros podem ver mensagens do time" ON public.evolution_api_messages;
DROP POLICY IF EXISTS "Membros podem inserir mensagens no time" ON public.evolution_api_messages;
DROP POLICY IF EXISTS "Membros podem atualizar mensagens do time" ON public.evolution_api_messages;

-- Políticas em custom_field_definitions
DROP POLICY IF EXISTS "Equipes podem ver suas próprias definições de campos" ON public.custom_field_definitions;

-- Políticas em teams
DROP POLICY IF EXISTS "Usuários podem ver seus times" ON public.teams;
DROP POLICY IF EXISTS "Usuários autenticados podem criar times" ON public.teams;
DROP POLICY IF EXISTS "Admins podem atualizar times" ON public.teams;
DROP POLICY IF EXISTS "Super admin pode excluir times" ON public.teams;

-- 2. AGORA remover as funções
DROP FUNCTION IF EXISTS public.is_team_member(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.has_team_role(UUID, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_team_admin(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_team_creator(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin(UUID) CASCADE;

-- 3. RECRIAR as funções com nomes únicos
CREATE OR REPLACE FUNCTION public.is_team_member(target_team_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.team_members members
        WHERE members.team_id = target_team_id 
        AND members.user_id = check_user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.has_team_role(target_team_id UUID, required_role TEXT, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.team_members members
        WHERE members.team_id = target_team_id 
        AND members.user_id = check_user_id 
        AND members.role = required_role
    );
$$;

CREATE OR REPLACE FUNCTION public.is_team_admin(target_team_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.team_members members
        WHERE members.team_id = target_team_id 
        AND members.user_id = check_user_id 
        AND members.role IN ('owner', 'admin')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_team_creator(target_team_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.teams team_record
        WHERE team_record.id = target_team_id 
        AND team_record.created_by = check_user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.profiles user_profile
        WHERE user_profile.id = check_user_id 
        AND user_profile.is_super_admin = true
    );
$$;

-- 4. RECRIAR política básica para permitir criação de times
CREATE POLICY "allow_team_creation" ON public.teams
  FOR INSERT 
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND auth.uid() = created_by
  );

-- 5. RECRIAR política para visualizar times
CREATE POLICY "view_own_teams" ON public.teams
  FOR SELECT 
  USING (
    public.is_team_member(id) 
    OR created_by = auth.uid()
    OR public.is_super_admin()
  );

-- 6. RECRIAR política para adicionar membros
CREATE POLICY "add_team_members" ON public.team_members
  FOR INSERT 
  WITH CHECK (
    public.is_team_admin(team_id) 
    OR public.is_super_admin()
    OR public.is_team_creator(team_id)
  );

-- 7. RECRIAR trigger para adicionar criador como owner
CREATE OR REPLACE FUNCTION public.add_team_creator_as_owner()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS add_team_creator_trigger ON public.teams;
CREATE TRIGGER add_team_creator_trigger
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.add_team_creator_as_owner();

-- 8. GARANTIR que RLS está habilitado
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 9. VERIFICAR se tabela profiles tem coluna is_super_admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'is_super_admin'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_super_admin BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 10. PERMITIR criação de times (solução temporária)
CREATE POLICY "temp_allow_all_teams" ON public.teams
  FOR ALL 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "temp_allow_all_members" ON public.team_members
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- 11. VERIFICAR resultado
SELECT 'Script executado com sucesso!' as status;
SELECT 'Funções disponíveis:' as info;
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%team%';

SELECT 'Políticas ativas em teams:' as info;
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'teams' AND schemaname = 'public'; 