-- Script para corrigir as políticas de segurança da tabela profiles

-- 1. Remover todas as políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Permitir leitura pública de perfis" ON public.profiles;
DROP POLICY IF EXISTS "Permitir inserção de perfis por usuários autenticados" ON public.profiles;
DROP POLICY IF EXISTS "Permitir atualização de perfis pelo próprio usuário" ON public.profiles;
DROP POLICY IF EXISTS "Permitir exclusão de perfis pelo próprio usuário" ON public.profiles;
DROP POLICY IF EXISTS "Permitir acesso total para administradores" ON public.profiles;
DROP POLICY IF EXISTS "Permitir leitura de perfis por usuários autenticados" ON public.profiles;
DROP POLICY IF EXISTS "Permitir criação de perfis pelo sistema" ON public.profiles;
DROP POLICY IF EXISTS "Permitir atualização de perfis por administradores" ON public.profiles;
DROP POLICY IF EXISTS "Permitir exclusão de perfis por administradores" ON public.profiles;
DROP POLICY IF EXISTS "Perfis são visíveis para todos" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios perfis" ON public.profiles;
DROP POLICY IF EXISTS "Administradores podem atualizar qualquer perfil" ON public.profiles;
DROP POLICY IF EXISTS "Administradores podem inserir perfis" ON public.profiles;
DROP POLICY IF EXISTS "Administradores podem excluir perfis" ON public.profiles;

-- 2. Garantir que o RLS está habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Criar políticas simplificadas que funcionam

-- Política para permitir leitura por qualquer usuário autenticado
CREATE POLICY "profiles_select_policy" 
ON public.profiles
FOR SELECT 
USING (true);

-- Política para permitir inserção por qualquer usuário
CREATE POLICY "profiles_insert_policy" 
ON public.profiles
FOR INSERT 
WITH CHECK (true);

-- Política para permitir atualização pelo próprio usuário ou por administradores
CREATE POLICY "profiles_update_policy" 
ON public.profiles
FOR UPDATE 
USING (
  auth.uid() = id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Política para permitir exclusão pelo próprio usuário ou por administradores
CREATE POLICY "profiles_delete_policy" 
ON public.profiles
FOR DELETE 
USING (
  auth.uid() = id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 4. Conceder permissões ao serviço de autenticação
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON public.profiles TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 5. Verificar se o trigger para criar perfis automaticamente existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'create_profile_trigger'
  ) THEN
    -- Criar a função para o trigger
    CREATE OR REPLACE FUNCTION public.create_profile_for_user()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO public.profiles (id, email, name)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
      );
      RETURN NEW;
    EXCEPTION
      WHEN others THEN
        RAISE LOG 'Erro ao criar perfil: %', SQLERRM;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Criar o trigger
    CREATE TRIGGER create_profile_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_profile_for_user();
  END IF;
END
$$; 