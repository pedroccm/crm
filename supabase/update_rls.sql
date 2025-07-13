-- Atualização das políticas de segurança para usar autenticação

-- Tabela companies
ALTER TABLE IF EXISTS public.companies ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DROP POLICY IF EXISTS "Companies são visíveis para todos" ON public.companies;
DROP POLICY IF EXISTS "Companies podem ser inseridas por qualquer um" ON public.companies;
DROP POLICY IF EXISTS "Companies podem ser atualizadas por qualquer um" ON public.companies;
DROP POLICY IF EXISTS "Companies podem ser excluídas por qualquer um" ON public.companies;

-- Criar novas políticas
CREATE POLICY "Companies são visíveis para todos" ON public.companies
  FOR SELECT USING (true);

CREATE POLICY "Companies podem ser inseridas por usuários autenticados" ON public.companies
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Companies podem ser atualizadas por usuários autenticados" ON public.companies
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Companies podem ser excluídas por usuários autenticados" ON public.companies
  FOR DELETE USING (auth.role() = 'authenticated');

-- Tabela leads
ALTER TABLE IF EXISTS public.leads ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DROP POLICY IF EXISTS "Leads são visíveis para todos" ON public.leads;
DROP POLICY IF EXISTS "Leads podem ser inseridos por qualquer um" ON public.leads;
DROP POLICY IF EXISTS "Leads podem ser atualizados por qualquer um" ON public.leads;
DROP POLICY IF EXISTS "Leads podem ser excluídos por qualquer um" ON public.leads;

-- Criar novas políticas
CREATE POLICY "Leads são visíveis para todos" ON public.leads
  FOR SELECT USING (true);

CREATE POLICY "Leads podem ser inseridos por usuários autenticados" ON public.leads
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Leads podem ser atualizados por usuários autenticados" ON public.leads
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Leads podem ser excluídos por usuários autenticados" ON public.leads
  FOR DELETE USING (auth.role() = 'authenticated');

-- Tabela pipelines
ALTER TABLE IF EXISTS public.pipelines ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DROP POLICY IF EXISTS "Pipelines são visíveis para todos" ON public.pipelines;
DROP POLICY IF EXISTS "Pipelines podem ser inseridos por qualquer um" ON public.pipelines;
DROP POLICY IF EXISTS "Pipelines podem ser atualizados por qualquer um" ON public.pipelines;
DROP POLICY IF EXISTS "Pipelines podem ser excluídos por qualquer um" ON public.pipelines;

-- Criar novas políticas
CREATE POLICY "Pipelines são visíveis para todos" ON public.pipelines
  FOR SELECT USING (true);

CREATE POLICY "Pipelines podem ser inseridos por usuários autenticados" ON public.pipelines
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Pipelines podem ser atualizados por usuários autenticados" ON public.pipelines
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Pipelines podem ser excluídos por usuários autenticados" ON public.pipelines
  FOR DELETE USING (auth.role() = 'authenticated');

-- Tabela pipeline_stages
ALTER TABLE IF EXISTS public.pipeline_stages ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DROP POLICY IF EXISTS "Pipeline stages são visíveis para todos" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Pipeline stages podem ser inseridos por qualquer um" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Pipeline stages podem ser atualizados por qualquer um" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Pipeline stages podem ser excluídos por qualquer um" ON public.pipeline_stages;

-- Criar novas políticas
CREATE POLICY "Pipeline stages são visíveis para todos" ON public.pipeline_stages
  FOR SELECT USING (true);

CREATE POLICY "Pipeline stages podem ser inseridos por usuários autenticados" ON public.pipeline_stages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Pipeline stages podem ser atualizados por usuários autenticados" ON public.pipeline_stages
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Pipeline stages podem ser excluídos por usuários autenticados" ON public.pipeline_stages
  FOR DELETE USING (auth.role() = 'authenticated');

-- Tabela lead_pipelines
ALTER TABLE IF EXISTS public.lead_pipelines ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DROP POLICY IF EXISTS "Lead pipelines são visíveis para todos" ON public.lead_pipelines;
DROP POLICY IF EXISTS "Lead pipelines podem ser inseridos por qualquer um" ON public.lead_pipelines;
DROP POLICY IF EXISTS "Lead pipelines podem ser atualizados por qualquer um" ON public.lead_pipelines;
DROP POLICY IF EXISTS "Lead pipelines podem ser excluídos por qualquer um" ON public.lead_pipelines;

-- Criar novas políticas
CREATE POLICY "Lead pipelines são visíveis para todos" ON public.lead_pipelines
  FOR SELECT USING (true);

CREATE POLICY "Lead pipelines podem ser inseridos por usuários autenticados" ON public.lead_pipelines
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Lead pipelines podem ser atualizados por usuários autenticados" ON public.lead_pipelines
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Lead pipelines podem ser excluídos por usuários autenticados" ON public.lead_pipelines
  FOR DELETE USING (auth.role() = 'authenticated');

-- Tabela lead_activity_logs
ALTER TABLE IF EXISTS public.lead_activity_logs ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DROP POLICY IF EXISTS "Lead activity logs são visíveis para todos" ON public.lead_activity_logs;
DROP POLICY IF EXISTS "Lead activity logs podem ser inseridos por qualquer um" ON public.lead_activity_logs;

-- Criar novas políticas
CREATE POLICY "Lead activity logs são visíveis para todos" ON public.lead_activity_logs
  FOR SELECT USING (true);

CREATE POLICY "Lead activity logs podem ser inseridos por usuários autenticados" ON public.lead_activity_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Tabela activities
ALTER TABLE IF EXISTS public.activities ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DROP POLICY IF EXISTS "Activities são visíveis para todos" ON public.activities;
DROP POLICY IF EXISTS "Activities podem ser inseridas por qualquer um" ON public.activities;
DROP POLICY IF EXISTS "Activities podem ser atualizadas por qualquer um" ON public.activities;
DROP POLICY IF EXISTS "Activities podem ser excluídas por qualquer um" ON public.activities;

-- Criar novas políticas
CREATE POLICY "Activities são visíveis para todos" ON public.activities
  FOR SELECT USING (true);

CREATE POLICY "Activities podem ser inseridas por usuários autenticados" ON public.activities
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Activities podem ser atualizadas por usuários autenticados" ON public.activities
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Activities podem ser excluídas por usuários autenticados" ON public.activities
  FOR DELETE USING (auth.role() = 'authenticated'); 