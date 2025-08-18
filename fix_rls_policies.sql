-- Fix RLS policies for lead_activity_logs and lead_labels tables

-- 1. Políticas para lead_activity_logs
DROP POLICY IF EXISTS "Users can view lead activity logs for their team" ON lead_activity_logs;
DROP POLICY IF EXISTS "Users can insert lead activity logs for their team" ON lead_activity_logs;
DROP POLICY IF EXISTS "Users can update lead activity logs for their team" ON lead_activity_logs;
DROP POLICY IF EXISTS "Users can delete lead activity logs for their team" ON lead_activity_logs;

-- Permitir visualizar logs de atividades para leads do mesmo time
CREATE POLICY "Users can view lead activity logs for their team" ON lead_activity_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_activity_logs.lead_id 
    AND leads.team_id = (
      SELECT team_id FROM user_teams 
      WHERE user_id = auth.uid() 
      AND is_active = true
      LIMIT 1
    )
  )
);

-- Permitir inserir logs de atividades para leads do mesmo time
CREATE POLICY "Users can insert lead activity logs for their team" ON lead_activity_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_activity_logs.lead_id 
    AND leads.team_id = (
      SELECT team_id FROM user_teams 
      WHERE user_id = auth.uid() 
      AND is_active = true
      LIMIT 1
    )
  )
);

-- Permitir atualizar logs de atividades para leads do mesmo time
CREATE POLICY "Users can update lead activity logs for their team" ON lead_activity_logs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_activity_logs.lead_id 
    AND leads.team_id = (
      SELECT team_id FROM user_teams 
      WHERE user_id = auth.uid() 
      AND is_active = true
      LIMIT 1
    )
  )
);

-- Permitir deletar logs de atividades para leads do mesmo time (apenas para admins)
CREATE POLICY "Users can delete lead activity logs for their team" ON lead_activity_logs
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_activity_logs.lead_id 
    AND leads.team_id = (
      SELECT team_id FROM user_teams 
      WHERE user_id = auth.uid() 
      AND is_active = true
      AND role IN ('admin', 'owner')
      LIMIT 1
    )
  )
);

-- 2. Políticas para lead_labels
DROP POLICY IF EXISTS "Users can view lead labels for their team" ON lead_labels;
DROP POLICY IF EXISTS "Users can insert lead labels for their team" ON lead_labels;
DROP POLICY IF EXISTS "Users can update lead labels for their team" ON lead_labels;
DROP POLICY IF EXISTS "Users can delete lead labels for their team" ON lead_labels;

-- Permitir visualizar labels de leads para leads do mesmo time
CREATE POLICY "Users can view lead labels for their team" ON lead_labels
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_labels.lead_id 
    AND leads.team_id = (
      SELECT team_id FROM user_teams 
      WHERE user_id = auth.uid() 
      AND is_active = true
      LIMIT 1
    )
  )
);

-- Permitir inserir labels para leads do mesmo time
CREATE POLICY "Users can insert lead labels for their team" ON lead_labels
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_labels.lead_id 
    AND leads.team_id = (
      SELECT team_id FROM user_teams 
      WHERE user_id = auth.uid() 
      AND is_active = true
      LIMIT 1
    )
  )
  AND
  EXISTS (
    SELECT 1 FROM labels 
    WHERE labels.id = lead_labels.label_id 
    AND labels.team_id = (
      SELECT team_id FROM user_teams 
      WHERE user_id = auth.uid() 
      AND is_active = true
      LIMIT 1
    )
  )
);

-- Permitir atualizar labels para leads do mesmo time
CREATE POLICY "Users can update lead labels for their team" ON lead_labels
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_labels.lead_id 
    AND leads.team_id = (
      SELECT team_id FROM user_teams 
      WHERE user_id = auth.uid() 
      AND is_active = true
      LIMIT 1
    )
  )
);

-- Permitir deletar labels para leads do mesmo time
CREATE POLICY "Users can delete lead labels for their team" ON lead_labels
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_labels.lead_id 
    AND leads.team_id = (
      SELECT team_id FROM user_teams 
      WHERE user_id = auth.uid() 
      AND is_active = true
      LIMIT 1
    )
  )
);

-- 3. Verificar se as tabelas têm RLS habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('lead_activity_logs', 'lead_labels');

-- 4. Verificar políticas criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('lead_activity_logs', 'lead_labels')
ORDER BY tablename, policyname;