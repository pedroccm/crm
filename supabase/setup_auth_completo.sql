-- Script completo para configuração de autenticação no Supabase
-- Este script configura a tabela de perfis e as políticas de segurança necessárias

-- Habilitar a extensão de autenticação do Supabase
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar esquema de autenticação se não existir
CREATE SCHEMA IF NOT EXISTS auth;

-- Criar tabela de perfis de usuários
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhorar a performance
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remover todas as políticas existentes para evitar conflitos
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
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

-- Criar políticas simplificadas que funcionam

-- Política para permitir leitura por qualquer usuário
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

-- Função para criar automaticamente um perfil quando um usuário é criado
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

-- Remover o trigger se já existir
DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users;

-- Criar o trigger para criar perfil automaticamente
CREATE TRIGGER create_profile_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_profile_for_user();

-- Função para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover o trigger se já existir
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

-- Criar o trigger para atualizar o campo updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Conceder permissões ao serviço de autenticação
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON public.profiles TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Configurar o primeiro usuário como administrador (executar manualmente após criar o primeiro usuário)
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'seu_email@exemplo.com';

-- Configuração das políticas de segurança para a tabela activities
ALTER TABLE IF EXISTS activities ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Permitir leitura pública de atividades" ON activities;
DROP POLICY IF EXISTS "Permitir inserção de atividades" ON activities;
DROP POLICY IF EXISTS "Permitir atualização de atividades" ON activities;
DROP POLICY IF EXISTS "Permitir exclusão de atividades" ON activities;

-- Criar políticas para a tabela activities
CREATE POLICY "Permitir leitura pública de atividades" 
ON activities
FOR SELECT 
USING (true);

CREATE POLICY "Permitir inserção de atividades" 
ON activities
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir atualização de atividades" 
ON activities
FOR UPDATE 
USING (true);

CREATE POLICY "Permitir exclusão de atividades" 
ON activities
FOR DELETE 
USING (true);

-- Função para atualizar o campo completed_at quando uma atividade é marcada como concluída
CREATE OR REPLACE FUNCTION update_activity_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover o trigger se já existir
DROP TRIGGER IF EXISTS set_activity_completed_at ON activities;

-- Criar o trigger para atualizar o campo completed_at
CREATE TRIGGER set_activity_completed_at
BEFORE UPDATE ON activities
FOR EACH ROW
EXECUTE FUNCTION update_activity_completed_at(); 