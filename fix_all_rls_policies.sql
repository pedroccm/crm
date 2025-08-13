-- SCRIPT UNIFICADO PARA CORRIGIR TODAS AS POLÍTICAS RLS
-- Este script corrige as políticas de Row Level Security para todas as tabelas do sistema

-- =====================================================
-- 1. POLÍTICAS PARA COMPANIES
-- =====================================================

-- Garantir que RLS está habilitado
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DROP POLICY IF EXISTS "Membros podem ver empresas do time" ON public.companies;
DROP POLICY IF EXISTS "Membros podem inserir empresas no time" ON public.companies;
DROP POLICY IF EXISTS "Membros podem atualizar empresas do time" ON public.companies;
DROP POLICY IF EXISTS "Admins podem excluir empresas do time" ON public.companies;
DROP POLICY IF EXISTS "Companies são visíveis para todos" ON public.companies;
DROP POLICY IF EXISTS "Companies podem ser inseridas por usuários autenticados" ON public.companies;
DROP POLICY IF EXISTS "Companies podem ser atualizadas por usuários autenticados" ON public.companies;
DROP POLICY IF EXISTS "Companies podem ser excluídas por usuários autenticados" ON public.companies;

-- Criar novas políticas para companies
CREATE POLICY "Membros podem ver empresas do time" ON public.companies
FOR SELECT USING (
    is_team_member(team_id) OR is_super_admin()
);

CREATE POLICY "Membros podem inserir empresas no time" ON public.companies
FOR INSERT WITH CHECK (
    is_team_member(team_id) OR is_super_admin()
);

CREATE POLICY "Membros podem atualizar empresas do time" ON public.companies
FOR UPDATE USING (
    is_team_member(team_id) OR is_super_admin()
);

CREATE POLICY "Admins podem excluir empresas do time" ON public.companies
FOR DELETE USING (
    is_team_admin(team_id) OR is_super_admin()
);

-- =====================================================
-- 2. POLÍTICAS PARA PIPELINES
-- =====================================================

-- Garantir que RLS está habilitado
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DROP POLICY IF EXISTS "Membros podem ver pipelines do time" ON public.pipelines;
DROP POLICY IF EXISTS "Membros podem inserir pipelines no time" ON public.pipelines;
DROP POLICY IF EXISTS "Membros podem atualizar pipelines do time" ON public.pipelines;
DROP POLICY IF EXISTS "Admins podem excluir pipelines do time" ON public.pipelines;

-- Criar políticas para pipelines
CREATE POLICY "Membros podem ver pipelines do time" ON public.pipelines
FOR SELECT USING (
    is_team_member(team_id) OR is_super_admin()
);

CREATE POLICY "Membros podem inserir pipelines no time" ON public.pipelines
FOR INSERT WITH CHECK (
    is_team_member(team_id) OR is_super_admin()
);

CREATE POLICY "Membros podem atualizar pipelines do time" ON public.pipelines
FOR UPDATE USING (
    is_team_member(team_id) OR is_super_admin()
);

CREATE POLICY "Admins podem excluir pipelines do time" ON public.pipelines
FOR DELETE USING (
    is_team_admin(team_id) OR is_super_admin()
);

-- =====================================================
-- 3. POLÍTICAS PARA PIPELINE_STAGES
-- =====================================================

-- Garantir que RLS está habilitado
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DROP POLICY IF EXISTS "Membros podem ver etapas do pipeline" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Membros podem inserir etapas no pipeline" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Membros podem atualizar etapas do pipeline" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Admins podem excluir etapas do pipeline" ON public.pipeline_stages;

-- Criar políticas para pipeline_stages (verificação através do pipeline)
CREATE POLICY "Membros podem ver etapas do pipeline" ON public.pipeline_stages
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.pipelines p 
        WHERE p.id = pipeline_id 
        AND (is_team_member(p.team_id) OR is_super_admin())
    )
);

CREATE POLICY "Membros podem inserir etapas no pipeline" ON public.pipeline_stages
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.pipelines p 
        WHERE p.id = pipeline_id 
        AND (is_team_member(p.team_id) OR is_super_admin())
    )
);

CREATE POLICY "Membros podem atualizar etapas do pipeline" ON public.pipeline_stages
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.pipelines p 
        WHERE p.id = pipeline_id 
        AND (is_team_member(p.team_id) OR is_super_admin())
    )
);

CREATE POLICY "Admins podem excluir etapas do pipeline" ON public.pipeline_stages
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.pipelines p 
        WHERE p.id = pipeline_id 
        AND (is_team_admin(p.team_id) OR is_super_admin())
    )
);

-- =====================================================
-- 4. POLÍTICAS PARA LEADS
-- =====================================================

-- Garantir que RLS está habilitado
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DROP POLICY IF EXISTS "Membros podem ver leads do time" ON public.leads;
DROP POLICY IF EXISTS "Membros podem inserir leads no time" ON public.leads;
DROP POLICY IF EXISTS "Membros podem atualizar leads do time" ON public.leads;
DROP POLICY IF EXISTS "Admins podem excluir leads do time" ON public.leads;
DROP POLICY IF EXISTS "Leads são visíveis para todos" ON public.leads;
DROP POLICY IF EXISTS "Leads podem ser inseridos por usuários autenticados" ON public.leads;
DROP POLICY IF EXISTS "Leads podem ser atualizados por usuários autenticados" ON public.leads;
DROP POLICY IF EXISTS "Leads podem ser excluídos por usuários autenticados" ON public.leads;

-- Criar políticas para leads
CREATE POLICY "Membros podem ver leads do time" ON public.leads
FOR SELECT USING (
    is_team_member(team_id) OR is_super_admin()
);

CREATE POLICY "Membros podem inserir leads no time" ON public.leads
FOR INSERT WITH CHECK (
    is_team_member(team_id) OR is_super_admin()
);

CREATE POLICY "Membros podem atualizar leads do time" ON public.leads
FOR UPDATE USING (
    is_team_member(team_id) OR is_super_admin()
);

CREATE POLICY "Admins podem excluir leads do time" ON public.leads
FOR DELETE USING (
    is_team_admin(team_id) OR is_super_admin()
);

-- =====================================================
-- 5. POLÍTICAS PARA LEAD_ACTIVITY_LOGS
-- =====================================================

-- Garantir que RLS está habilitado
ALTER TABLE public.lead_activity_logs ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DROP POLICY IF EXISTS "Membros podem ver logs de atividades" ON public.lead_activity_logs;
DROP POLICY IF EXISTS "Membros podem inserir logs de atividades" ON public.lead_activity_logs;
DROP POLICY IF EXISTS "Membros podem atualizar logs de atividades" ON public.lead_activity_logs;
DROP POLICY IF EXISTS "Admins podem excluir logs de atividades" ON public.lead_activity_logs;

-- Criar políticas para lead_activity_logs (verificação através do lead)
CREATE POLICY "Membros podem ver logs de atividades" ON public.lead_activity_logs
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.leads l 
        WHERE l.id = lead_id 
        AND (is_team_member(l.team_id) OR is_super_admin())
    )
);

CREATE POLICY "Membros podem inserir logs de atividades" ON public.lead_activity_logs
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.leads l 
        WHERE l.id = lead_id 
        AND (is_team_member(l.team_id) OR is_super_admin())
    )
);

CREATE POLICY "Membros podem atualizar logs de atividades" ON public.lead_activity_logs
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.leads l 
        WHERE l.id = lead_id 
        AND (is_team_member(l.team_id) OR is_super_admin())
    )
);

CREATE POLICY "Admins podem excluir logs de atividades" ON public.lead_activity_logs
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.leads l 
        WHERE l.id = lead_id 
        AND (is_team_admin(l.team_id) OR is_super_admin())
    )
);

-- =====================================================
-- 6. POLÍTICAS PARA LEAD_PIPELINES
-- =====================================================

-- Garantir que RLS está habilitado
ALTER TABLE public.lead_pipelines ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DROP POLICY IF EXISTS "Membros podem ver lead pipelines" ON public.lead_pipelines;
DROP POLICY IF EXISTS "Membros podem inserir lead pipelines" ON public.lead_pipelines;
DROP POLICY IF EXISTS "Membros podem atualizar lead pipelines" ON public.lead_pipelines;
DROP POLICY IF EXISTS "Admins podem excluir lead pipelines" ON public.lead_pipelines;

-- Criar políticas para lead_pipelines (verificação através do lead)
CREATE POLICY "Membros podem ver lead pipelines" ON public.lead_pipelines
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.leads l 
        WHERE l.id = lead_id 
        AND (is_team_member(l.team_id) OR is_super_admin())
    )
);

CREATE POLICY "Membros podem inserir lead pipelines" ON public.lead_pipelines
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.leads l 
        WHERE l.id = lead_id 
        AND (is_team_member(l.team_id) OR is_super_admin())
    )
);

CREATE POLICY "Membros podem atualizar lead pipelines" ON public.lead_pipelines
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.leads l 
        WHERE l.id = lead_id 
        AND (is_team_member(l.team_id) OR is_super_admin())
    )
);

CREATE POLICY "Admins podem excluir lead pipelines" ON public.lead_pipelines
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.leads l 
        WHERE l.id = lead_id 
        AND (is_team_admin(l.team_id) OR is_super_admin())
    )
);

-- =====================================================
-- 7. GARANTIR PERMISSÕES PARA TODAS AS TABELAS
-- =====================================================

-- Conceder permissões nas tabelas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipelines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipeline_stages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_activity_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_pipelines TO authenticated;

-- Conceder permissões nas sequências
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- 8. COMENTÁRIOS DE CONFIRMAÇÃO
-- =====================================================

COMMENT ON TABLE public.companies IS 'Políticas RLS configuradas - controle de acesso por time';
COMMENT ON TABLE public.pipelines IS 'Políticas RLS configuradas - controle de acesso por time';
COMMENT ON TABLE public.pipeline_stages IS 'Políticas RLS configuradas - controle via pipeline/time';
COMMENT ON TABLE public.leads IS 'Políticas RLS configuradas - controle de acesso por time';
COMMENT ON TABLE public.lead_activity_logs IS 'Políticas RLS configuradas - controle via lead/time';
COMMENT ON TABLE public.lead_pipelines IS 'Políticas RLS configuradas - controle via lead/time';

-- Script executado com sucesso!
-- Todas as políticas RLS foram configuradas para o controle de acesso baseado em times.