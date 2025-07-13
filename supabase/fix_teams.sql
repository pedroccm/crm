-- Script para verificar e corrigir as tabelas de times no Supabase

-- Verificar se a extensão de UUID está habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verificar se a tabela teams existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teams') THEN
    RAISE NOTICE 'A tabela teams não existe. Criando...';
    
    -- Criar a tabela teams
    CREATE TABLE public.teams (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      logo_url TEXT,
      description TEXT,
      created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Criar índices
    CREATE INDEX IF NOT EXISTS teams_name_idx ON public.teams(name);
    CREATE INDEX IF NOT EXISTS teams_slug_idx ON public.teams(slug);
    CREATE INDEX IF NOT EXISTS teams_created_by_idx ON public.teams(created_by);
    
    -- Habilitar RLS
    ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
  ELSE
    RAISE NOTICE 'A tabela teams já existe.';
  END IF;
END
$$;

-- Verificar se a tabela team_members existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'team_members') THEN
    RAISE NOTICE 'A tabela team_members não existe. Criando...';
    
    -- Criar a tabela team_members
    CREATE TABLE public.team_members (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'guest')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(team_id, user_id)
    );
    
    -- Criar índices
    CREATE INDEX IF NOT EXISTS team_members_team_id_idx ON public.team_members(team_id);
    CREATE INDEX IF NOT EXISTS team_members_user_id_idx ON public.team_members(user_id);
    CREATE INDEX IF NOT EXISTS team_members_role_idx ON public.team_members(role);
    
    -- Habilitar RLS
    ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
  ELSE
    RAISE NOTICE 'A tabela team_members já existe.';
  END IF;
END
$$;

-- Verificar se a tabela team_invitations existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'team_invitations') THEN
    RAISE NOTICE 'A tabela team_invitations não existe. Criando...';
    
    -- Criar a tabela team_invitations
    CREATE TABLE public.team_invitations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'guest')),
      invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Criar índices
    CREATE INDEX IF NOT EXISTS team_invitations_team_id_idx ON public.team_invitations(team_id);
    CREATE INDEX IF NOT EXISTS team_invitations_email_idx ON public.team_invitations(email);
    CREATE INDEX IF NOT EXISTS team_invitations_token_idx ON public.team_invitations(token);
    
    -- Habilitar RLS
    ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
  ELSE
    RAISE NOTICE 'A tabela team_invitations já existe.';
  END IF;
END
$$;

-- Verificar e adicionar a coluna team_id nas tabelas existentes
DO $$
BEGIN
  -- Verificar companies
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'companies' 
    AND column_name = 'team_id'
  ) THEN
    RAISE NOTICE 'Adicionando coluna team_id à tabela companies...';
    ALTER TABLE public.companies ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS companies_team_id_idx ON public.companies(team_id);
  END IF;
  
  -- Verificar leads
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'team_id'
  ) THEN
    RAISE NOTICE 'Adicionando coluna team_id à tabela leads...';
    ALTER TABLE public.leads ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS leads_team_id_idx ON public.leads(team_id);
  END IF;
  
  -- Verificar pipelines
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'pipelines' 
    AND column_name = 'team_id'
  ) THEN
    RAISE NOTICE 'Adicionando coluna team_id à tabela pipelines...';
    ALTER TABLE public.pipelines ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS pipelines_team_id_idx ON public.pipelines(team_id);
  END IF;
  
  -- Verificar activities
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'activities' 
    AND column_name = 'team_id'
  ) THEN
    RAISE NOTICE 'Adicionando coluna team_id à tabela activities...';
    ALTER TABLE public.activities ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS activities_team_id_idx ON public.activities(team_id);
  END IF;
  
  -- Verificar whatsapp_settings
  IF EXISTS (
    SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'whatsapp_settings'
  ) AND NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'whatsapp_settings' 
    AND column_name = 'team_id'
  ) THEN
    RAISE NOTICE 'Adicionando coluna team_id à tabela whatsapp_settings...';
    ALTER TABLE public.whatsapp_settings ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS whatsapp_settings_team_id_idx ON public.whatsapp_settings(team_id);
  END IF;
  
  -- Verificar whatsapp_messages
  IF EXISTS (
    SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'whatsapp_messages'
  ) AND NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'whatsapp_messages' 
    AND column_name = 'team_id'
  ) THEN
    RAISE NOTICE 'Adicionando coluna team_id à tabela whatsapp_messages...';
    ALTER TABLE public.whatsapp_messages ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS whatsapp_messages_team_id_idx ON public.whatsapp_messages(team_id);
  END IF;
END
$$;

-- Criar funções para verificar permissões de times

-- Função para verificar se o usuário é membro de um time
CREATE OR REPLACE FUNCTION public.is_team_member(team_id UUID, user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = $1 AND user_id = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se o usuário tem uma determinada função em um time
CREATE OR REPLACE FUNCTION public.has_team_role(team_id UUID, role TEXT, user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = $1 AND user_id = $2 AND role = $3
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se o usuário é admin de um time
CREATE OR REPLACE FUNCTION public.is_team_admin(team_id UUID, user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = $1 AND user_id = $2 AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se o usuário é super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = $1 AND is_super_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar e corrigir as políticas de segurança para times
DO $$
BEGIN
  -- Remover políticas existentes para evitar conflitos
  DROP POLICY IF EXISTS "Usuários podem ver times dos quais são membros" ON public.teams;
  DROP POLICY IF EXISTS "Super admins podem ver todos os times" ON public.teams;
  DROP POLICY IF EXISTS "Usuários podem criar times" ON public.teams;
  DROP POLICY IF EXISTS "Admins podem atualizar seus times" ON public.teams;
  DROP POLICY IF EXISTS "Owners podem excluir seus times" ON public.teams;
  
  -- Criar novas políticas para teams
  CREATE POLICY "Usuários podem ver times dos quais são membros"
  ON public.teams
  FOR SELECT
  USING (
    is_team_member(id) OR is_super_admin()
  );
  
  CREATE POLICY "Super admins podem ver todos os times"
  ON public.teams
  FOR SELECT
  USING (
    is_super_admin()
  );
  
  CREATE POLICY "Usuários podem criar times"
  ON public.teams
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
  );
  
  CREATE POLICY "Admins podem atualizar seus times"
  ON public.teams
  FOR UPDATE
  USING (
    is_team_admin(id) OR is_super_admin()
  );
  
  CREATE POLICY "Owners podem excluir seus times"
  ON public.teams
  FOR DELETE
  USING (
    has_team_role(id, 'owner') OR is_super_admin()
  );
  
  -- Remover políticas existentes para team_members
  DROP POLICY IF EXISTS "Usuários podem ver membros dos times dos quais são membros" ON public.team_members;
  DROP POLICY IF EXISTS "Admins podem adicionar membros aos seus times" ON public.team_members;
  DROP POLICY IF EXISTS "Admins podem atualizar membros dos seus times" ON public.team_members;
  DROP POLICY IF EXISTS "Admins podem remover membros dos seus times" ON public.team_members;
  
  -- Criar novas políticas para team_members
  CREATE POLICY "Usuários podem ver membros dos times dos quais são membros"
  ON public.team_members
  FOR SELECT
  USING (
    is_team_member(team_id) OR is_super_admin()
  );
  
  CREATE POLICY "Admins podem adicionar membros aos seus times"
  ON public.team_members
  FOR INSERT
  WITH CHECK (
    is_team_admin(team_id) OR is_super_admin()
  );
  
  CREATE POLICY "Admins podem atualizar membros dos seus times"
  ON public.team_members
  FOR UPDATE
  USING (
    is_team_admin(team_id) OR is_super_admin()
  );
  
  CREATE POLICY "Admins podem remover membros dos seus times"
  ON public.team_members
  FOR DELETE
  USING (
    is_team_admin(team_id) OR is_super_admin() OR auth.uid() = user_id
  );
  
  -- Remover políticas existentes para team_invitations
  DROP POLICY IF EXISTS "Usuários podem ver convites dos times dos quais são admins" ON public.team_invitations;
  DROP POLICY IF EXISTS "Admins podem criar convites para seus times" ON public.team_invitations;
  DROP POLICY IF EXISTS "Admins podem excluir convites dos seus times" ON public.team_invitations;
  
  -- Criar novas políticas para team_invitations
  CREATE POLICY "Usuários podem ver convites dos times dos quais são admins"
  ON public.team_invitations
  FOR SELECT
  USING (
    is_team_admin(team_id) OR is_super_admin()
  );
  
  CREATE POLICY "Admins podem criar convites para seus times"
  ON public.team_invitations
  FOR INSERT
  WITH CHECK (
    is_team_admin(team_id) OR is_super_admin()
  );
  
  CREATE POLICY "Admins podem excluir convites dos seus times"
  ON public.team_invitations
  FOR DELETE
  USING (
    is_team_admin(team_id) OR is_super_admin()
  );
  
  RAISE NOTICE 'Políticas de segurança para times atualizadas com sucesso.';
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

-- Criar triggers para atualizar o campo updated_at
DO $$
BEGIN
  -- Trigger para teams
  DROP TRIGGER IF EXISTS update_teams_updated_at ON public.teams;
  CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
  
  -- Trigger para team_members
  DROP TRIGGER IF EXISTS update_team_members_updated_at ON public.team_members;
  CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
  
  -- Trigger para team_invitations
  DROP TRIGGER IF EXISTS update_team_invitations_updated_at ON public.team_invitations;
  CREATE TRIGGER update_team_invitations_updated_at
  BEFORE UPDATE ON public.team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
END
$$; 