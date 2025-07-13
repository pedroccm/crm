-- Script para verificar e corrigir a tabela de perfis no Supabase

-- Verificar se a tabela de perfis existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    RAISE NOTICE 'A tabela profiles não existe. Criando...';
    
    -- Criar a tabela de perfis
    CREATE TABLE public.profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email TEXT UNIQUE,
      name TEXT,
      role TEXT DEFAULT 'user',
      is_super_admin BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Criar índices
    CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
    CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);
    CREATE INDEX IF NOT EXISTS profiles_is_super_admin_idx ON public.profiles(is_super_admin);
    
    -- Habilitar RLS
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  ELSE
    RAISE NOTICE 'A tabela profiles já existe.';
  END IF;
END
$$;

-- Verificar se a coluna is_super_admin existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'is_super_admin'
  ) THEN
    RAISE NOTICE 'A coluna is_super_admin não existe na tabela profiles. Adicionando...';
    
    -- Adicionar a coluna is_super_admin
    ALTER TABLE public.profiles ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE;
    
    -- Criar índice
    CREATE INDEX IF NOT EXISTS profiles_is_super_admin_idx ON public.profiles(is_super_admin);
  ELSE
    RAISE NOTICE 'A coluna is_super_admin já existe na tabela profiles.';
  END IF;
END
$$;

-- Verificar se existem usuários sem perfil
DO $$
BEGIN
  -- Verificar se existem usuários sem perfil
  IF EXISTS (
    SELECT auth.users.id
    FROM auth.users
    LEFT JOIN public.profiles ON auth.users.id = public.profiles.id
    WHERE public.profiles.id IS NULL
  ) THEN
    RAISE NOTICE 'Existem usuários sem perfil. Criando perfis para eles...';
    
    -- Criar perfis para usuários que não têm
    INSERT INTO public.profiles (id, email, name)
    SELECT 
      auth.users.id,
      auth.users.email,
      COALESCE(
        auth.users.raw_user_meta_data->>'name',
        split_part(auth.users.email, '@', 1),
        'Usuário'
      )
    FROM auth.users
    LEFT JOIN public.profiles ON auth.users.id = public.profiles.id
    WHERE public.profiles.id IS NULL;
  ELSE
    RAISE NOTICE 'Todos os usuários têm perfil.';
  END IF;
END
$$;

-- Criar função para o trigger de criação de perfil
CREATE OR REPLACE FUNCTION public.create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'Usuário')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar se o trigger para criar perfis automaticamente existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_trigger
    WHERE tgname = 'create_profile_trigger'
  ) THEN
    RAISE NOTICE 'O trigger create_profile_trigger não existe. Criando...';
    
    -- Criar trigger
    CREATE TRIGGER create_profile_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_profile_for_user();
  ELSE
    RAISE NOTICE 'O trigger create_profile_trigger já existe.';
  END IF;
END
$$;

-- Criar função para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verificar se o trigger para atualizar o campo updated_at existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_trigger
    WHERE tgname = 'update_profiles_updated_at'
  ) THEN
    RAISE NOTICE 'O trigger update_profiles_updated_at não existe. Criando...';
    
    -- Criar trigger
    CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  ELSE
    RAISE NOTICE 'O trigger update_profiles_updated_at já existe.';
  END IF;
END
$$;

-- Verificar e corrigir as políticas de segurança
DO $$
BEGIN
  -- Remover políticas existentes para evitar conflitos
  DROP POLICY IF EXISTS "Usuários podem ver seus próprios perfis" ON public.profiles;
  DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios perfis" ON public.profiles;
  DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON public.profiles;
  DROP POLICY IF EXISTS "Admins podem atualizar todos os perfis" ON public.profiles;
  
  -- Criar novas políticas
  CREATE POLICY "Usuários podem ver seus próprios perfis"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
  );
  
  CREATE POLICY "Usuários podem atualizar seus próprios perfis"
  ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() = id
  );
  
  CREATE POLICY "Admins podem ver todos os perfis"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = TRUE)
    )
  );
  
  CREATE POLICY "Admins podem atualizar todos os perfis"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = TRUE)
    )
  );
  
  RAISE NOTICE 'Políticas de segurança atualizadas com sucesso.';
END
$$;

-- Opcional: Definir o primeiro usuário como super admin
-- Descomente e substitua 'seu_email@exemplo.com' pelo email do usuário que deve ser super admin
/*
DO $$
BEGIN
  UPDATE public.profiles
  SET is_super_admin = TRUE
  WHERE email = 'seu_email@exemplo.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE is_super_admin = TRUE
  );
  
  IF FOUND THEN
    RAISE NOTICE 'Usuário definido como super admin com sucesso.';
  ELSE
    RAISE NOTICE 'Não foi possível definir o usuário como super admin ou já existe um super admin.';
  END IF;
END
$$;
*/

-- Garantir que exista pelo menos um super admin
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE is_super_admin = TRUE) THEN
    RAISE NOTICE 'Não existe nenhum super admin. Definindo o primeiro usuário como super admin...';
    
    UPDATE public.profiles
    SET is_super_admin = TRUE
    WHERE id = (SELECT id FROM public.profiles ORDER BY created_at ASC LIMIT 1);
    
    IF FOUND THEN
      RAISE NOTICE 'Primeiro usuário definido como super admin com sucesso.';
    ELSE
      RAISE NOTICE 'Não foi possível definir o primeiro usuário como super admin.';
    END IF;
  ELSE
    RAISE NOTICE 'Já existe pelo menos um super admin.';
  END IF;
END
$$; 