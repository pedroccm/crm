-- =====================================================
-- GAIA CRM - SCRIPT COMPLETO DE CRIAÇÃO DA BASE DE DADOS
-- =====================================================
-- Este script contém TODAS as tabelas, funções, políticas e estruturas
-- utilizadas no sistema Gaia CRM para recriação completa no Supabase

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Criar esquema de autenticação se não existir
CREATE SCHEMA IF NOT EXISTS auth;

-- =====================================================
-- TABELAS PRINCIPAIS DO SISTEMA
-- =====================================================

-- Tabela de perfis de usuários
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user',
  is_super_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de times/equipes
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

-- Tabela de membros do time
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'guest')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

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

-- Tabela de empresas
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  website TEXT,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de leads
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'new',
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de pipelines
CREATE TABLE IF NOT EXISTS public.pipelines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de etapas do pipeline
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de relacionamento entre leads e pipelines
CREATE TABLE IF NOT EXISTS public.lead_pipelines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  current_stage_id UUID NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de log de atividades de leads
CREATE TABLE IF NOT EXISTS public.lead_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  description TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de atividades
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELAS DE WHATSAPP
-- =====================================================

-- Tabela de configurações do WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  auto_reply BOOLEAN DEFAULT true,
  business_hours BOOLEAN DEFAULT true,
  notify_new_messages BOOLEAN DEFAULT true,
  sync_interval INTEGER DEFAULT 30,
  webhook_url TEXT,
  verify_token TEXT,
  phone_number TEXT,
  business_name TEXT,
  auto_reply_message TEXT DEFAULT 'Olá! Obrigado por entrar em contato. Responderemos sua mensagem o mais breve possível.',
  business_hours_start TIME DEFAULT '08:00:00',
  business_hours_end TIME DEFAULT '18:00:00',
  phone_number_id TEXT,
  business_account_id TEXT,
  access_token TEXT,
  api_version TEXT DEFAULT 'v18.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Tabela de mensagens do WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_phone TEXT NOT NULL,
  lead_name TEXT,
  message TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'read', 'received', 'failed')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELAS EVOLUTION API
-- =====================================================

-- Tabela de configurações da Evolution API
CREATE TABLE IF NOT EXISTS public.evolution_api_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  instance_url TEXT NOT NULL,
  instance_name TEXT NOT NULL,
  api_key TEXT NOT NULL,
  security_token TEXT NOT NULL,
  automation_interval_min INTEGER DEFAULT 0,
  automation_interval_max INTEGER DEFAULT 0,
  typing_animation_interval_min INTEGER DEFAULT 0,
  typing_animation_interval_max INTEGER DEFAULT 1,
  typing_animation_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (team_id)
);

-- Tabela de conversas da Evolution API
CREATE TABLE IF NOT EXISTS public.evolution_api_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  last_message TEXT,
  unread_count INTEGER DEFAULT 0,
  profile_picture_url TEXT,
  whatsapp_jid TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (team_id, phone)
);

-- Tabela de mensagens da Evolution API
CREATE TABLE IF NOT EXISTS public.evolution_api_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES public.evolution_api_chats(id) ON DELETE CASCADE,
  message_id TEXT,
  phone TEXT NOT NULL,
  text TEXT,
  from_me BOOLEAN DEFAULT FALSE,
  media_url TEXT,
  media_type TEXT,
  media_caption TEXT,
  status TEXT DEFAULT 'sent',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELAS DE CAMPOS CUSTOMIZADOS
-- =====================================================

-- Tabela de definições de campos personalizados
CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'company')),
  field_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'select', 'checkbox', 'textarea', 'email', 'phone')),
  field_options JSONB,
  is_required BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (team_id, entity_type, field_name)
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para profiles
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);
CREATE INDEX IF NOT EXISTS profiles_is_super_admin_idx ON public.profiles(is_super_admin);

-- Índices para teams
CREATE INDEX IF NOT EXISTS teams_name_idx ON public.teams(name);
CREATE INDEX IF NOT EXISTS teams_slug_idx ON public.teams(slug);
CREATE INDEX IF NOT EXISTS teams_created_by_idx ON public.teams(created_by);

-- Índices para team_members
CREATE INDEX IF NOT EXISTS team_members_team_id_idx ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS team_members_user_id_idx ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS team_members_role_idx ON public.team_members(role);

-- Índices para team_invitations
CREATE INDEX IF NOT EXISTS team_invitations_team_id_idx ON public.team_invitations(team_id);
CREATE INDEX IF NOT EXISTS team_invitations_email_idx ON public.team_invitations(email);
CREATE INDEX IF NOT EXISTS team_invitations_token_idx ON public.team_invitations(token);

-- Índices para companies
CREATE INDEX IF NOT EXISTS companies_team_id_idx ON public.companies(team_id);
CREATE INDEX IF NOT EXISTS companies_name_idx ON public.companies(name);
CREATE INDEX IF NOT EXISTS companies_email_idx ON public.companies(email);

-- Índices para leads
CREATE INDEX IF NOT EXISTS leads_team_id_idx ON public.leads(team_id);
CREATE INDEX IF NOT EXISTS leads_company_id_idx ON public.leads(company_id);
CREATE INDEX IF NOT EXISTS leads_status_idx ON public.leads(status);
CREATE INDEX IF NOT EXISTS leads_name_idx ON public.leads(name);
CREATE INDEX IF NOT EXISTS leads_email_idx ON public.leads(email);

-- Índices para pipelines
CREATE INDEX IF NOT EXISTS pipelines_team_id_idx ON public.pipelines(team_id);
CREATE INDEX IF NOT EXISTS pipelines_name_idx ON public.pipelines(name);

-- Índices para pipeline_stages
CREATE INDEX IF NOT EXISTS pipeline_stages_pipeline_id_idx ON public.pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS pipeline_stages_stage_order_idx ON public.pipeline_stages(stage_order);

-- Índices para lead_pipelines
CREATE INDEX IF NOT EXISTS lead_pipelines_lead_id_idx ON public.lead_pipelines(lead_id);
CREATE INDEX IF NOT EXISTS lead_pipelines_pipeline_id_idx ON public.lead_pipelines(pipeline_id);
CREATE INDEX IF NOT EXISTS lead_pipelines_current_stage_id_idx ON public.lead_pipelines(current_stage_id);

-- Índices para lead_activity_logs
CREATE INDEX IF NOT EXISTS lead_activity_logs_lead_id_idx ON public.lead_activity_logs(lead_id);
CREATE INDEX IF NOT EXISTS lead_activity_logs_user_id_idx ON public.lead_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS lead_activity_logs_action_type_idx ON public.lead_activity_logs(action_type);

-- Índices para activities
CREATE INDEX IF NOT EXISTS activities_lead_id_idx ON public.activities(lead_id);
CREATE INDEX IF NOT EXISTS activities_team_id_idx ON public.activities(team_id);
CREATE INDEX IF NOT EXISTS activities_scheduled_date_idx ON public.activities(scheduled_date);
CREATE INDEX IF NOT EXISTS activities_completed_idx ON public.activities(completed);

-- Índices para whatsapp_settings
CREATE INDEX IF NOT EXISTS whatsapp_settings_user_id_idx ON public.whatsapp_settings(user_id);
CREATE INDEX IF NOT EXISTS whatsapp_settings_team_id_idx ON public.whatsapp_settings(team_id);

-- Índices para whatsapp_messages
CREATE INDEX IF NOT EXISTS whatsapp_messages_lead_phone_idx ON public.whatsapp_messages(lead_phone);
CREATE INDEX IF NOT EXISTS whatsapp_messages_message_id_idx ON public.whatsapp_messages(message_id);
CREATE INDEX IF NOT EXISTS whatsapp_messages_timestamp_idx ON public.whatsapp_messages(timestamp);
CREATE INDEX IF NOT EXISTS whatsapp_messages_direction_idx ON public.whatsapp_messages(direction);
CREATE INDEX IF NOT EXISTS whatsapp_messages_team_id_idx ON public.whatsapp_messages(team_id);

-- Índices para evolution_api_config
CREATE INDEX IF NOT EXISTS evolution_api_config_team_id_idx ON public.evolution_api_config(team_id);

-- Índices para evolution_api_chats
CREATE INDEX IF NOT EXISTS evolution_api_chats_team_id_idx ON public.evolution_api_chats(team_id);
CREATE INDEX IF NOT EXISTS evolution_api_chats_phone_idx ON public.evolution_api_chats(phone);

-- Índices para evolution_api_messages
CREATE INDEX IF NOT EXISTS evolution_api_messages_team_id_idx ON public.evolution_api_messages(team_id);
CREATE INDEX IF NOT EXISTS evolution_api_messages_chat_id_idx ON public.evolution_api_messages(chat_id);
CREATE INDEX IF NOT EXISTS evolution_api_messages_phone_idx ON public.evolution_api_messages(phone);
CREATE INDEX IF NOT EXISTS evolution_api_messages_timestamp_idx ON public.evolution_api_messages(timestamp);

-- Índices para custom_field_definitions
CREATE INDEX IF NOT EXISTS custom_field_definitions_team_id_idx ON public.custom_field_definitions(team_id);
CREATE INDEX IF NOT EXISTS custom_field_definitions_entity_type_idx ON public.custom_field_definitions(entity_type);

-- =====================================================
-- FUNÇÕES AUXILIARES
-- =====================================================

-- Função para criar perfil automaticamente
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

-- Função para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
    WHERE id = $1 AND is_super_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar completed_at quando atividade é concluída
CREATE OR REPLACE FUNCTION public.update_activity_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed = true AND OLD.completed = false THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para executar SQL diretamente (apenas para super admins)
CREATE OR REPLACE FUNCTION public.execute_raw_sql(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_super_admin = TRUE
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Apenas super admins podem executar SQL diretamente';
  END IF;
  
  EXECUTE 'SELECT jsonb_build_object(''result'', TRUE, ''message'', ''SQL executado com sucesso'')' INTO result;
  EXECUTE sql_query;
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'result', FALSE,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para criar perfil automaticamente
CREATE TRIGGER create_profile_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_profile_for_user();

-- Triggers para atualizar o campo updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

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

CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pipelines_updated_at
BEFORE UPDATE ON public.pipelines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pipeline_stages_updated_at
BEFORE UPDATE ON public.pipeline_stages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_pipelines_updated_at
BEFORE UPDATE ON public.lead_pipelines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_settings_updated_at
BEFORE UPDATE ON public.whatsapp_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evolution_api_config_updated_at
BEFORE UPDATE ON public.evolution_api_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evolution_api_chats_updated_at
BEFORE UPDATE ON public.evolution_api_chats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_field_definitions_updated_at
BEFORE UPDATE ON public.custom_field_definitions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar completed_at quando atividade é concluída
CREATE TRIGGER set_activity_completed_at
BEFORE UPDATE ON public.activities
FOR EACH ROW
EXECUTE FUNCTION public.update_activity_completed_at();

-- =====================================================
-- HABILITAR ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_api_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_api_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_api_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS DE SEGURANÇA - PROFILES
-- =====================================================

-- Limpeza de políticas existentes
DROP POLICY IF EXISTS "Permitir leitura de perfis por usuários autenticados" ON public.profiles;
DROP POLICY IF EXISTS "Permitir criação de perfis por usuários autenticados" ON public.profiles;
DROP POLICY IF EXISTS "Permitir criação de perfis pelo sistema" ON public.profiles;
DROP POLICY IF EXISTS "Permitir atualização de perfis pelo próprio usuário" ON public.profiles;
DROP POLICY IF EXISTS "Permitir atualização de perfis por administradores" ON public.profiles;
DROP POLICY IF EXISTS "Permitir exclusão de perfis por administradores" ON public.profiles;

-- Políticas para profiles
CREATE POLICY "Permitir leitura de perfis por usuários autenticados" 
ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir criação de perfis por usuários autenticados" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id OR auth.role() = 'authenticated');

CREATE POLICY "Permitir criação de perfis pelo sistema" 
ON public.profiles FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização de perfis pelo próprio usuário" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Permitir atualização de perfis por administradores" 
ON public.profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = TRUE)
);

CREATE POLICY "Permitir exclusão de perfis por administradores" 
ON public.profiles FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = TRUE)
);

-- =====================================================
-- POLÍTICAS DE SEGURANÇA - TEAMS
-- =====================================================

-- Políticas para teams
CREATE POLICY "Usuários podem ver seus times" ON public.teams
FOR SELECT USING (
  auth.uid() IN (
    SELECT user_id FROM public.team_members WHERE team_id = id
  ) OR public.is_super_admin()
);

CREATE POLICY "Super admin pode criar times" ON public.teams
FOR INSERT WITH CHECK (public.is_super_admin());

CREATE POLICY "Admins podem atualizar times" ON public.teams
FOR UPDATE USING (public.is_team_admin(id) OR public.is_super_admin());

CREATE POLICY "Super admin pode excluir times" ON public.teams
FOR DELETE USING (public.is_super_admin());

-- Políticas para team_members
CREATE POLICY "Membros podem ver outros membros" ON public.team_members
FOR SELECT USING (public.is_team_member(team_id) OR public.is_super_admin());

CREATE POLICY "Admins podem adicionar membros" ON public.team_members
FOR INSERT WITH CHECK (public.is_team_admin(team_id) OR public.is_super_admin());

CREATE POLICY "Admins podem atualizar membros" ON public.team_members
FOR UPDATE USING (public.is_team_admin(team_id) OR public.is_super_admin());

CREATE POLICY "Admins podem remover membros" ON public.team_members
FOR DELETE USING (public.is_team_admin(team_id) OR public.is_super_admin());

-- Políticas para team_invitations
CREATE POLICY "Membros podem ver convites" ON public.team_invitations
FOR SELECT USING (public.is_team_member(team_id) OR public.is_super_admin());

CREATE POLICY "Admins podem criar convites" ON public.team_invitations
FOR INSERT WITH CHECK (public.is_team_admin(team_id) OR public.is_super_admin());

CREATE POLICY "Admins podem atualizar convites" ON public.team_invitations
FOR UPDATE USING (public.is_team_admin(team_id) OR public.is_super_admin());

CREATE POLICY "Admins podem excluir convites" ON public.team_invitations
FOR DELETE USING (public.is_team_admin(team_id) OR public.is_super_admin());

-- =====================================================
-- POLÍTICAS DE SEGURANÇA - DADOS PRINCIPAIS
-- =====================================================

-- Políticas para companies
CREATE POLICY "Membros podem ver empresas do time" ON public.companies
FOR SELECT USING (public.is_team_member(team_id) OR public.is_super_admin());

CREATE POLICY "Membros podem inserir empresas no time" ON public.companies
FOR INSERT WITH CHECK (public.is_team_member(team_id) OR public.is_super_admin());

CREATE POLICY "Membros podem atualizar empresas do time" ON public.companies
FOR UPDATE USING (public.is_team_member(team_id) OR public.is_super_admin());

CREATE POLICY "Admins podem excluir empresas do time" ON public.companies
FOR DELETE USING (public.is_team_admin(team_id) OR public.is_super_admin());

-- Políticas para leads
CREATE POLICY "Membros podem ver leads do time" ON public.leads
FOR SELECT USING (public.is_team_member(team_id) OR public.is_super_admin());

CREATE POLICY "Membros podem inserir leads no time" ON public.leads
FOR INSERT WITH CHECK (public.is_team_member(team_id) OR public.is_super_admin());

CREATE POLICY "Membros podem atualizar leads do time" ON public.leads
FOR UPDATE USING (public.is_team_member(team_id) OR public.is_super_admin());

CREATE POLICY "Admins podem excluir leads do time" ON public.leads
FOR DELETE USING (public.is_team_admin(team_id) OR public.is_super_admin());

-- Políticas para pipelines
CREATE POLICY "Membros podem ver pipelines do time" ON public.pipelines
FOR SELECT USING (public.is_team_member(team_id) OR public.is_super_admin());

CREATE POLICY "Membros podem inserir pipelines no time" ON public.pipelines
FOR INSERT WITH CHECK (public.is_team_member(team_id) OR public.is_super_admin());

CREATE POLICY "Membros podem atualizar pipelines do time" ON public.pipelines
FOR UPDATE USING (public.is_team_member(team_id) OR public.is_super_admin());

CREATE POLICY "Admins podem excluir pipelines do time" ON public.pipelines
FOR DELETE USING (public.is_team_admin(team_id) OR public.is_super_admin());

-- Políticas para pipeline_stages
CREATE POLICY "Membros podem ver etapas do pipeline" ON public.pipeline_stages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.pipelines p 
    WHERE p.id = pipeline_id AND (public.is_team_member(p.team_id) OR public.is_super_admin())
  )
);

CREATE POLICY "Membros podem inserir etapas no pipeline" ON public.pipeline_stages
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pipelines p 
    WHERE p.id = pipeline_id AND (public.is_team_member(p.team_id) OR public.is_super_admin())
  )
);

CREATE POLICY "Membros podem atualizar etapas do pipeline" ON public.pipeline_stages
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.pipelines p 
    WHERE p.id = pipeline_id AND (public.is_team_member(p.team_id) OR public.is_super_admin())
  )
);

CREATE POLICY "Admins podem excluir etapas do pipeline" ON public.pipeline_stages
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.pipelines p 
    WHERE p.id = pipeline_id AND (public.is_team_admin(p.team_id) OR public.is_super_admin())
  )
);

-- Políticas para lead_pipelines
CREATE POLICY "Membros podem ver lead pipelines" ON public.lead_pipelines
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.leads l 
    WHERE l.id = lead_id AND (public.is_team_member(l.team_id) OR public.is_super_admin())
  )
);

CREATE POLICY "Membros podem inserir lead pipelines" ON public.lead_pipelines
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads l 
    WHERE l.id = lead_id AND (public.is_team_member(l.team_id) OR public.is_super_admin())
  )
);

CREATE POLICY "Membros podem atualizar lead pipelines" ON public.lead_pipelines
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.leads l 
    WHERE l.id = lead_id AND (public.is_team_member(l.team_id) OR public.is_super_admin())
  )
);

CREATE POLICY "Admins podem excluir lead pipelines" ON public.lead_pipelines
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.leads l 
    WHERE l.id = lead_id AND (public.is_team_admin(l.team_id) OR public.is_super_admin())
  )
);

-- Políticas para lead_activity_logs
CREATE POLICY "Membros podem ver logs de atividades" ON public.lead_activity_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.leads l 
    WHERE l.id = lead_id AND (public.is_team_member(l.team_id) OR public.is_super_admin())
  )
);

CREATE POLICY "Membros podem inserir logs de atividades" ON public.lead_activity_logs
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads l 
    WHERE l.id = lead_id AND (public.is_team_member(l.team_id) OR public.is_super_admin())
  )
);

-- Políticas para activities
CREATE POLICY "Membros podem ver atividades do time" ON public.activities
FOR SELECT USING (public.is_team_member(team_id) OR public.is_super_admin());

CREATE POLICY "Membros podem inserir atividades no time" ON public.activities
FOR INSERT WITH CHECK (public.is_team_member(team_id) OR public.is_super_admin());

CREATE POLICY "Membros podem atualizar atividades do time" ON public.activities
FOR UPDATE USING (public.is_team_member(team_id) OR public.is_super_admin());

CREATE POLICY "Admins podem excluir atividades do time" ON public.activities
FOR DELETE USING (public.is_team_admin(team_id) OR public.is_super_admin());

-- =====================================================
-- POLÍTICAS DE SEGURANÇA - WHATSAPP
-- =====================================================

-- Políticas para whatsapp_settings
CREATE POLICY "Usuários podem ver suas configurações" ON public.whatsapp_settings
FOR SELECT USING (auth.uid() = user_id OR public.is_team_member(team_id) OR public.is_super_admin());

CREATE POLICY "Usuários podem inserir suas configurações" ON public.whatsapp_settings
FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_team_member(team_id) OR public.is_super_admin());

CREATE POLICY "Usuários podem atualizar suas configurações" ON public.whatsapp_settings
FOR UPDATE USING (auth.uid() = user_id OR public.is_team_member(team_id) OR public.is_super_admin());

CREATE POLICY "Usuários podem excluir suas configurações" ON public.whatsapp_settings
FOR DELETE USING (auth.uid() = user_id OR public.is_team_admin(team_id) OR public.is_super_admin());

-- Políticas para whatsapp_messages
CREATE POLICY "Membros podem ver mensagens do time" ON public.whatsapp_messages
FOR SELECT USING (public.is_team_member(team_id) OR public.is_super_admin());

CREATE POLICY "Membros podem inserir mensagens no time" ON public.whatsapp_messages
FOR INSERT WITH CHECK (public.is_team_member(team_id) OR public.is_super_admin());

CREATE POLICY "Membros podem atualizar mensagens do time" ON public.whatsapp_messages
FOR UPDATE USING (public.is_team_member(team_id) OR public.is_super_admin());

-- =====================================================
-- POLÍTICAS DE SEGURANÇA - EVOLUTION API
-- =====================================================

-- Políticas para evolution_api_config
CREATE POLICY "Membros podem ver configurações do time" ON public.evolution_api_config
FOR SELECT USING (public.is_team_member(team_id) OR public.is_super_admin());

CREATE POLICY "Admins podem inserir configurações no time" ON public.evolution_api_config
FOR INSERT WITH CHECK (public.is_team_admin(team_id) OR public.is_super_admin());

CREATE POLICY "Admins podem atualizar configurações do time" ON public.evolution_api_config
FOR UPDATE USING (public.is_team_admin(team_id) OR public.is_super_admin());

CREATE POLICY "Admins podem excluir configurações do time" ON public.evolution_api_config
FOR DELETE USING (public.is_team_admin(team_id) OR public.is_super_admin());

-- Políticas para evolution_api_chats
CREATE POLICY "Membros podem ver conversas do time" ON public.evolution_api_chats
FOR SELECT USING (public.is_team_member(team_id) OR public.is_super_admin());

CREATE POLICY "Membros podem inserir conversas no time" ON public.evolution_api_chats
FOR INSERT WITH CHECK (public.is_team_member(team_id) OR public.is_super_admin());

CREATE POLICY "Membros podem atualizar conversas do time" ON public.evolution_api_chats
FOR UPDATE USING (public.is_team_member(team_id) OR public.is_super_admin());

CREATE POLICY "Admins podem excluir conversas do time" ON public.evolution_api_chats
FOR DELETE USING (public.is_team_admin(team_id) OR public.is_super_admin());

-- Políticas para evolution_api_messages
CREATE POLICY "Membros podem ver mensagens do time" ON public.evolution_api_messages
FOR SELECT USING (public.is_team_member(team_id) OR public.is_super_admin());

CREATE POLICY "Membros podem inserir mensagens no time" ON public.evolution_api_messages
FOR INSERT WITH CHECK (public.is_team_member(team_id) OR public.is_super_admin());

CREATE POLICY "Membros podem atualizar mensagens do time" ON public.evolution_api_messages
FOR UPDATE USING (public.is_team_member(team_id) OR public.is_super_admin());

CREATE POLICY "Admins podem excluir mensagens do time" ON public.evolution_api_messages
FOR DELETE USING (public.is_team_admin(team_id) OR public.is_super_admin());

-- =====================================================
-- POLÍTICAS DE SEGURANÇA - CAMPOS CUSTOMIZADOS
-- =====================================================

-- Políticas para custom_field_definitions
CREATE POLICY "Equipes podem ver suas próprias definições de campos" ON public.custom_field_definitions
FOR SELECT USING (public.is_team_member(team_id) OR public.is_super_admin());

CREATE POLICY "Administradores podem criar definições de campos" ON public.custom_field_definitions
FOR INSERT WITH CHECK (public.is_team_admin(team_id) OR public.is_super_admin());

CREATE POLICY "Administradores podem atualizar definições de campos" ON public.custom_field_definitions
FOR UPDATE USING (public.is_team_admin(team_id) OR public.is_super_admin());

CREATE POLICY "Administradores podem excluir definições de campos" ON public.custom_field_definitions
FOR DELETE USING (public.is_team_admin(team_id) OR public.is_super_admin());

-- =====================================================
-- CONCEDER PERMISSÕES
-- =====================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE public.profiles IS 'Perfis de usuários do sistema';
COMMENT ON TABLE public.teams IS 'Times/equipes do sistema';
COMMENT ON TABLE public.team_members IS 'Membros de cada time';
COMMENT ON TABLE public.team_invitations IS 'Convites para times';
COMMENT ON TABLE public.companies IS 'Empresas/clientes';
COMMENT ON TABLE public.leads IS 'Leads do sistema';
COMMENT ON TABLE public.pipelines IS 'Pipelines de vendas';
COMMENT ON TABLE public.pipeline_stages IS 'Etapas dos pipelines';
COMMENT ON TABLE public.lead_pipelines IS 'Relacionamento leads-pipelines';
COMMENT ON TABLE public.lead_activity_logs IS 'Log de atividades';
COMMENT ON TABLE public.activities IS 'Atividades agendadas';
COMMENT ON TABLE public.whatsapp_settings IS 'Configurações do WhatsApp';
COMMENT ON TABLE public.whatsapp_messages IS 'Mensagens do WhatsApp';
COMMENT ON TABLE public.evolution_api_config IS 'Configurações da Evolution API';
COMMENT ON TABLE public.evolution_api_chats IS 'Conversas da Evolution API';
COMMENT ON TABLE public.evolution_api_messages IS 'Mensagens da Evolution API';
COMMENT ON TABLE public.custom_field_definitions IS 'Definições de campos personalizados';

-- =====================================================
-- INSTRUÇÕES DE CONFIGURAÇÃO
-- =====================================================

/*
INSTRUÇÕES PARA USAR ESTE SCRIPT:

1. Acesse o painel do Supabase (https://app.supabase.io)
2. Vá para SQL Editor
3. Execute este script completo
4. Após a execução, configure o primeiro usuário como super admin:
   UPDATE public.profiles SET is_super_admin = TRUE WHERE email = 'seu_email@exemplo.com';

TABELAS CRIADAS:
- profiles: Perfis de usuários
- teams: Times/equipes
- team_members: Membros dos times
- team_invitations: Convites para times
- companies: Empresas/clientes
- leads: Leads do sistema
- pipelines: Pipelines de vendas
- pipeline_stages: Etapas dos pipelines
- lead_pipelines: Relacionamento leads-pipelines
- lead_activity_logs: Log de atividades
- activities: Atividades agendadas
- whatsapp_settings: Configurações WhatsApp
- whatsapp_messages: Mensagens WhatsApp
- evolution_api_config: Configurações Evolution API
- evolution_api_chats: Conversas Evolution API
- evolution_api_messages: Mensagens Evolution API
- custom_field_definitions: Campos personalizados

FUNÇÕES CRIADAS:
- create_profile_for_user(): Cria perfil automaticamente
- update_updated_at_column(): Atualiza timestamp
- is_team_member(): Verifica se é membro do time
- has_team_role(): Verifica função no time
- is_team_admin(): Verifica se é admin do time
- is_super_admin(): Verifica se é super admin
- update_activity_completed_at(): Atualiza data de conclusão
- execute_raw_sql(): Executa SQL (só super admin)

RECURSOS INCLUÍDOS:
- Row Level Security (RLS) completo
- Triggers para timestamps automáticos
- Índices para performance
- Políticas de segurança detalhadas
- Funções auxiliares
- Comentários de documentação
*/ 