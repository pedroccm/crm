-- Script para corrigir configurações de autenticação no Supabase

-- Verificar configurações atuais de cookies
SELECT * FROM auth.config;

-- Função para definir configurações de cookies
CREATE OR REPLACE FUNCTION public.set_auth_cookie_settings(
  same_site text DEFAULT 'lax',
  secure boolean DEFAULT false,
  http_only boolean DEFAULT true
) RETURNS void AS $$
BEGIN
  UPDATE auth.config
  SET cookie_options = jsonb_build_object(
    'path', '/',
    'same_site', same_site,
    'secure', secure,
    'http_only', http_only
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter políticas para uma tabela
CREATE OR REPLACE FUNCTION public.get_policies_for_table(
  table_name text
) RETURNS TABLE (
  policyname name,
  tablename name,
  operation text,
  definition text
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.policyname, p.tablename, p.operation, p.definition
  FROM pg_policies p
  WHERE p.tablename = table_name
  AND p.schemaname = 'public';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para remover todas as políticas de uma tabela
CREATE OR REPLACE FUNCTION public.drop_all_policies_for_table(
  table_name text
) RETURNS void AS $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = table_name
    AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_record.policyname, table_name);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para habilitar RLS em uma tabela
CREATE OR REPLACE FUNCTION public.enable_rls_for_table(
  table_name text
) RETURNS void AS $$
BEGIN
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar uma política para uma tabela
CREATE OR REPLACE FUNCTION public.create_policy_for_table(
  table_name text,
  policy_name text,
  policy_definition text,
  policy_operation text DEFAULT 'ALL'
) RETURNS void AS $$
BEGIN
  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR %s USING (%s)',
    policy_name,
    table_name,
    policy_operation,
    policy_definition
  );
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Erro ao criar política %: %', policy_name, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter triggers para uma tabela
CREATE OR REPLACE FUNCTION public.get_triggers_for_table(
  table_name text
) RETURNS TABLE (
  trigger_name name,
  event_manipulation text,
  action_statement text
) AS $$
BEGIN
  RETURN QUERY
  SELECT t.tgname, e.event_manipulation, pg_get_triggerdef(t.oid)
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  JOIN information_schema.triggers e ON t.tgname = e.trigger_name
  WHERE n.nspname = 'public'
  AND c.relname = table_name
  AND NOT t.tgisinternal;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para recriar o trigger de criação de perfil
CREATE OR REPLACE FUNCTION public.recreate_profile_trigger() RETURNS void AS $$
BEGIN
  -- Recriar a função do trigger
  CREATE OR REPLACE FUNCTION public.create_profile_for_user()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO public.profiles (id, email, name, role)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      'user'
    );
    RETURN NEW;
  EXCEPTION
    WHEN others THEN
      RAISE LOG 'Erro ao criar perfil para usuário: %', SQLERRM;
      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  -- Recriar o trigger
  DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users;

  CREATE TRIGGER create_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_profile_for_user();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para conceder permissões na tabela profiles
CREATE OR REPLACE FUNCTION public.grant_permissions_on_profiles() RETURNS void AS $$
BEGIN
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  GRANT ALL ON public.profiles TO anon, authenticated, service_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Executar as funções para corrigir as configurações
SELECT set_auth_cookie_settings('lax', false, true);

-- Verificar configurações atualizadas
SELECT * FROM auth.config;

-- Corrigir políticas para a tabela profiles
SELECT drop_all_policies_for_table('profiles');
SELECT enable_rls_for_table('profiles');

-- Criar políticas simplificadas
SELECT create_policy_for_table('profiles', 'Profiles are viewable by everyone', 'true', 'SELECT');
SELECT create_policy_for_table('profiles', 'Profiles can be inserted by authenticated users', 'auth.uid() = id', 'INSERT');
SELECT create_policy_for_table('profiles', 'Profiles can be updated by the owner', 'auth.uid() = id', 'UPDATE');
SELECT create_policy_for_table('profiles', 'Profiles can be deleted by the owner', 'auth.uid() = id', 'DELETE');

-- Recriar trigger para criação automática de perfil
SELECT recreate_profile_trigger();

-- Conceder permissões necessárias
SELECT grant_permissions_on_profiles(); 