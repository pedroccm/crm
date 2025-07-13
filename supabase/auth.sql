-- Configuração de autenticação para o Supabase

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

-- Remover políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Permitir leitura pública de perfis" ON public.profiles;
DROP POLICY IF EXISTS "Permitir inserção de perfis por usuários autenticados" ON public.profiles;
DROP POLICY IF EXISTS "Permitir atualização de perfis pelo próprio usuário" ON public.profiles;
DROP POLICY IF EXISTS "Permitir exclusão de perfis pelo próprio usuário" ON public.profiles;
DROP POLICY IF EXISTS "Permitir acesso total para administradores" ON public.profiles;
DROP POLICY IF EXISTS "Permitir leitura de perfis por usuários autenticados" ON public.profiles;
DROP POLICY IF EXISTS "Permitir criação de perfis pelo sistema" ON public.profiles;
DROP POLICY IF EXISTS "Permitir atualização de perfis por administradores" ON public.profiles;
DROP POLICY IF EXISTS "Permitir exclusão de perfis por administradores" ON public.profiles;

-- Criar políticas de segurança para a tabela profiles

-- 1. Política para permitir leitura de perfis por qualquer usuário autenticado
CREATE POLICY "Permitir leitura de perfis por usuários autenticados" 
ON public.profiles
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 2. Política para permitir que usuários autenticados criem seus próprios perfis
CREATE POLICY "Permitir criação de perfis por usuários autenticados" 
ON public.profiles
FOR INSERT 
WITH CHECK (
  auth.uid() = id OR 
  auth.role() = 'authenticated'
);

-- 3. Política para permitir que o serviço de autenticação crie perfis
CREATE POLICY "Permitir criação de perfis pelo sistema" 
ON public.profiles
FOR INSERT 
WITH CHECK (true);

-- 4. Política para permitir que usuários atualizem seus próprios perfis
CREATE POLICY "Permitir atualização de perfis pelo próprio usuário" 
ON public.profiles
FOR UPDATE 
USING (auth.uid() = id);

-- 5. Política para permitir que administradores atualizem qualquer perfil
CREATE POLICY "Permitir atualização de perfis por administradores" 
ON public.profiles
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- 6. Política para permitir que administradores excluam qualquer perfil
CREATE POLICY "Permitir exclusão de perfis por administradores" 
ON public.profiles
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
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

-- Trigger para criar perfil automaticamente
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

-- Trigger para atualizar o campo updated_at
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