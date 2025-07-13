-- Script para criar a estrutura de times/contas no Supabase
-- Este script cria as tabelas necessárias para gerenciar times, membros e permissões

-- Habilitar a extensão de UUID se ainda não estiver habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de times (contas de clientes)
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para a tabela de times
CREATE INDEX IF NOT EXISTS teams_name_idx ON public.teams(name);
CREATE INDEX IF NOT EXISTS teams_slug_idx ON public.teams(slug);
CREATE INDEX IF NOT EXISTS teams_created_by_idx ON public.teams(created_by);

-- Tabela de membros do time (associação entre usuários e times)
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'guest')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Índices para a tabela de membros do time
CREATE INDEX IF NOT EXISTS team_members_team_id_idx ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS team_members_user_id_idx ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS team_members_role_idx ON public.team_members(role);

-- Tabela de convites para times
CREATE TABLE IF NOT EXISTS public.team_invitations (
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

-- Índices para a tabela de convites
CREATE INDEX IF NOT EXISTS team_invitations_team_id_idx ON public.team_invitations(team_id);
CREATE INDEX IF NOT EXISTS team_invitations_email_idx ON public.team_invitations(email);
CREATE INDEX IF NOT EXISTS team_invitations_token_idx ON public.team_invitations(token);

-- Modificar tabelas existentes para incluir o team_id

-- Adicionar team_id à tabela companies
ALTER TABLE IF EXISTS public.companies 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS companies_team_id_idx ON public.companies(team_id);

-- Adicionar team_id à tabela leads
ALTER TABLE IF EXISTS public.leads 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS leads_team_id_idx ON public.leads(team_id);

-- Adicionar team_id à tabela pipelines
ALTER TABLE IF EXISTS public.pipelines 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS pipelines_team_id_idx ON public.pipelines(team_id);

-- Adicionar team_id à tabela activities
ALTER TABLE IF EXISTS public.activities 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS activities_team_id_idx ON public.activities(team_id);

-- Adicionar team_id à tabela whatsapp_settings
ALTER TABLE IF EXISTS public.whatsapp_settings 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS whatsapp_settings_team_id_idx ON public.whatsapp_settings(team_id);

-- Adicionar team_id à tabela whatsapp_messages
ALTER TABLE IF EXISTS public.whatsapp_messages 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS whatsapp_messages_team_id_idx ON public.whatsapp_messages(team_id);

-- Habilitar RLS (Row Level Security) para todas as tabelas
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Função para verificar se um usuário é membro de um time
CREATE OR REPLACE FUNCTION public.is_team_member(team_id UUID, user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = $1 AND user_id = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se um usuário tem uma função específica em um time
CREATE OR REPLACE FUNCTION public.has_team_role(team_id UUID, role TEXT, user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = $1 AND user_id = $2 AND role = $3
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se um usuário é admin ou owner de um time
CREATE OR REPLACE FUNCTION public.is_team_admin(team_id UUID, user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = $1 AND user_id = $2 AND role IN ('admin', 'owner')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se um usuário é super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = $1 AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas para a tabela teams

-- Qualquer usuário autenticado pode ver times dos quais é membro
CREATE POLICY "Usuários podem ver seus times" ON public.teams
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.team_members WHERE team_id = id
    ) OR public.is_super_admin()
  );

-- Apenas super_admin pode criar times
CREATE POLICY "Super admin pode criar times" ON public.teams
  FOR INSERT WITH CHECK (
    public.is_super_admin()
  );

-- Apenas admin/owner do time ou super_admin pode atualizar times
CREATE POLICY "Admins podem atualizar times" ON public.teams
  FOR UPDATE USING (
    public.is_team_admin(id) OR public.is_super_admin()
  );

-- Apenas super_admin pode excluir times
CREATE POLICY "Super admin pode excluir times" ON public.teams
  FOR DELETE USING (
    public.is_super_admin()
  );

-- Políticas para a tabela team_members

-- Membros do time e super_admin podem ver membros do time
CREATE POLICY "Membros podem ver outros membros" ON public.team_members
  FOR SELECT USING (
    public.is_team_member(team_id) OR public.is_super_admin()
  );

-- Apenas admin/owner do time ou super_admin pode adicionar membros
CREATE POLICY "Admins podem adicionar membros" ON public.team_members
  FOR INSERT WITH CHECK (
    public.is_team_admin(team_id) OR public.is_super_admin()
  );

-- Apenas admin/owner do time ou super_admin pode atualizar membros
CREATE POLICY "Admins podem atualizar membros" ON public.team_members
  FOR UPDATE USING (
    public.is_team_admin(team_id) OR public.is_super_admin()
  );

-- Apenas admin/owner do time ou super_admin pode remover membros
CREATE POLICY "Admins podem remover membros" ON public.team_members
  FOR DELETE USING (
    public.is_team_admin(team_id) OR public.is_super_admin()
  );

-- Políticas para a tabela team_invitations

-- Membros do time e super_admin podem ver convites do time
CREATE POLICY "Membros podem ver convites" ON public.team_invitations
  FOR SELECT USING (
    public.is_team_member(team_id) OR public.is_super_admin()
  );

-- Apenas admin/owner do time ou super_admin pode criar convites
CREATE POLICY "Admins podem criar convites" ON public.team_invitations
  FOR INSERT WITH CHECK (
    public.is_team_admin(team_id) OR public.is_super_admin()
  );

-- Apenas admin/owner do time ou super_admin pode atualizar convites
CREATE POLICY "Admins podem atualizar convites" ON public.team_invitations
  FOR UPDATE USING (
    public.is_team_admin(team_id) OR public.is_super_admin()
  );

-- Apenas admin/owner do time ou super_admin pode excluir convites
CREATE POLICY "Admins podem excluir convites" ON public.team_invitations
  FOR DELETE USING (
    public.is_team_admin(team_id) OR public.is_super_admin()
  );

-- Trigger para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar o trigger às tabelas
CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_invitations_updated_at
BEFORE UPDATE ON public.team_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Atualizar o perfil para incluir o campo de super_admin
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- Adicionar políticas RLS para as tabelas existentes com base no team_id

-- Políticas para companies
CREATE POLICY "Membros podem ver empresas do time" ON public.companies
  FOR SELECT USING (
    public.is_team_member(team_id) OR public.is_super_admin()
  );

CREATE POLICY "Membros podem inserir empresas no time" ON public.companies
  FOR INSERT WITH CHECK (
    public.is_team_member(team_id) OR public.is_super_admin()
  );

CREATE POLICY "Membros podem atualizar empresas do time" ON public.companies
  FOR UPDATE USING (
    public.is_team_member(team_id) OR public.is_super_admin()
  );

CREATE POLICY "Admins podem excluir empresas do time" ON public.companies
  FOR DELETE USING (
    public.is_team_admin(team_id) OR public.is_super_admin()
  );

-- Políticas para leads
CREATE POLICY "Membros podem ver leads do time" ON public.leads
  FOR SELECT USING (
    public.is_team_member(team_id) OR public.is_super_admin()
  );

CREATE POLICY "Membros podem inserir leads no time" ON public.leads
  FOR INSERT WITH CHECK (
    public.is_team_member(team_id) OR public.is_super_admin()
  );

CREATE POLICY "Membros podem atualizar leads do time" ON public.leads
  FOR UPDATE USING (
    public.is_team_member(team_id) OR public.is_super_admin()
  );

CREATE POLICY "Admins podem excluir leads do time" ON public.leads
  FOR DELETE USING (
    public.is_team_admin(team_id) OR public.is_super_admin()
  );

-- Políticas para pipelines
CREATE POLICY "Membros podem ver pipelines do time" ON public.pipelines
  FOR SELECT USING (
    public.is_team_member(team_id) OR public.is_super_admin()
  );

CREATE POLICY "Membros podem inserir pipelines no time" ON public.pipelines
  FOR INSERT WITH CHECK (
    public.is_team_member(team_id) OR public.is_super_admin()
  );

CREATE POLICY "Membros podem atualizar pipelines do time" ON public.pipelines
  FOR UPDATE USING (
    public.is_team_member(team_id) OR public.is_super_admin()
  );

CREATE POLICY "Admins podem excluir pipelines do time" ON public.pipelines
  FOR DELETE USING (
    public.is_team_admin(team_id) OR public.is_super_admin()
  );

-- Políticas para activities
CREATE POLICY "Membros podem ver atividades do time" ON public.activities
  FOR SELECT USING (
    public.is_team_member(team_id) OR public.is_super_admin()
  );

CREATE POLICY "Membros podem inserir atividades no time" ON public.activities
  FOR INSERT WITH CHECK (
    public.is_team_member(team_id) OR public.is_super_admin()
  );

CREATE POLICY "Membros podem atualizar atividades do time" ON public.activities
  FOR UPDATE USING (
    public.is_team_member(team_id) OR public.is_super_admin()
  );

CREATE POLICY "Admins podem excluir atividades do time" ON public.activities
  FOR DELETE USING (
    public.is_team_admin(team_id) OR public.is_super_admin()
  );

-- Políticas para whatsapp_settings
CREATE POLICY "Membros podem ver configurações de WhatsApp do time" ON public.whatsapp_settings
  FOR SELECT USING (
    public.is_team_member(team_id) OR public.is_super_admin()
  );

CREATE POLICY "Admins podem inserir configurações de WhatsApp no time" ON public.whatsapp_settings
  FOR INSERT WITH CHECK (
    public.is_team_admin(team_id) OR public.is_super_admin()
  );

CREATE POLICY "Admins podem atualizar configurações de WhatsApp do time" ON public.whatsapp_settings
  FOR UPDATE USING (
    public.is_team_admin(team_id) OR public.is_super_admin()
  );

CREATE POLICY "Admins podem excluir configurações de WhatsApp do time" ON public.whatsapp_settings
  FOR DELETE USING (
    public.is_team_admin(team_id) OR public.is_super_admin()
  );

-- Políticas para whatsapp_messages
CREATE POLICY "Membros podem ver mensagens de WhatsApp do time" ON public.whatsapp_messages
  FOR SELECT USING (
    public.is_team_member(team_id) OR public.is_super_admin()
  );

CREATE POLICY "Membros podem inserir mensagens de WhatsApp no time" ON public.whatsapp_messages
  FOR INSERT WITH CHECK (
    public.is_team_member(team_id) OR public.is_super_admin()
  );

CREATE POLICY "Membros podem atualizar mensagens de WhatsApp do time" ON public.whatsapp_messages
  FOR UPDATE USING (
    public.is_team_member(team_id) OR public.is_super_admin()
  );

CREATE POLICY "Admins podem excluir mensagens de WhatsApp do time" ON public.whatsapp_messages
  FOR DELETE USING (
    public.is_team_admin(team_id) OR public.is_super_admin()
  ); 