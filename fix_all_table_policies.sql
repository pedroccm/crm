-- Script para corrigir todas as políticas RLS das tabelas principais

-- 1. ACTIVITIES TABLE
-- Remover políticas conflitantes
DROP POLICY IF EXISTS "Users can view activities from their team" ON activities;
DROP POLICY IF EXISTS "Users can insert activities to their team" ON activities;
DROP POLICY IF EXISTS "Users can update activities from their team" ON activities;
DROP POLICY IF EXISTS "Users can delete activities from their team" ON activities;

-- Habilitar RLS
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Políticas para activities
CREATE POLICY "Users can view activities from their team"
ON activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = activities.team_id
    AND tm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert activities to their team"
ON activities FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = activities.team_id
    AND tm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update activities from their team"
ON activities FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = activities.team_id
    AND tm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete activities from their team"
ON activities FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = activities.team_id
    AND tm.user_id = auth.uid()
  )
);

-- 2. CUSTOM_FIELDS_SETTINGS TABLE (se existir)
-- Remover políticas conflitantes
DROP POLICY IF EXISTS "Users can view custom fields from their team" ON custom_fields_settings;
DROP POLICY IF EXISTS "Users can insert custom fields to their team" ON custom_fields_settings;
DROP POLICY IF EXISTS "Users can update custom fields from their team" ON custom_fields_settings;
DROP POLICY IF EXISTS "Users can delete custom fields from their team" ON custom_fields_settings;

-- Habilitar RLS
ALTER TABLE custom_fields_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para custom_fields_settings
CREATE POLICY "Users can view custom fields from their team"
ON custom_fields_settings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = custom_fields_settings.team_id
    AND tm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert custom fields to their team"
ON custom_fields_settings FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = custom_fields_settings.team_id
    AND tm.user_id = auth.uid()
    AND tm.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Users can update custom fields from their team"
ON custom_fields_settings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = custom_fields_settings.team_id
    AND tm.user_id = auth.uid()
    AND tm.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Users can delete custom fields from their team"
ON custom_fields_settings FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = custom_fields_settings.team_id
    AND tm.user_id = auth.uid()
    AND tm.role IN ('owner', 'admin')
  )
);

-- 3. LEAD_ACTIVITIES TABLE (se existir)
-- Remover políticas conflitantes
DROP POLICY IF EXISTS "Users can view lead activities from their team" ON lead_activities;
DROP POLICY IF EXISTS "Users can insert lead activities to their team" ON lead_activities;
DROP POLICY IF EXISTS "Users can update lead activities from their team" ON lead_activities;
DROP POLICY IF EXISTS "Users can delete lead activities from their team" ON lead_activities;

-- Habilitar RLS se a tabela existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_activities') THEN
    ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
    
    -- Políticas para lead_activities
    CREATE POLICY "Users can view lead activities from their team"
    ON lead_activities FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM leads l
        JOIN team_members tm ON tm.team_id = l.team_id
        WHERE l.id = lead_activities.lead_id
        AND tm.user_id = auth.uid()
      )
    );

    CREATE POLICY "Users can insert lead activities to their team"
    ON lead_activities FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM leads l
        JOIN team_members tm ON tm.team_id = l.team_id
        WHERE l.id = lead_activities.lead_id
        AND tm.user_id = auth.uid()
      )
    );

    CREATE POLICY "Users can update lead activities from their team"
    ON lead_activities FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM leads l
        JOIN team_members tm ON tm.team_id = l.team_id
        WHERE l.id = lead_activities.lead_id
        AND tm.user_id = auth.uid()
      )
    );

    CREATE POLICY "Users can delete lead activities from their team"
    ON lead_activities FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM leads l
        JOIN team_members tm ON tm.team_id = l.team_id
        WHERE l.id = lead_activities.lead_id
        AND tm.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_activities_team_id ON activities(team_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_by ON activities(created_by);

-- Atualizar registros existentes sem team_id
UPDATE activities 
SET team_id = (
  SELECT tm.team_id 
  FROM team_members tm 
  WHERE tm.user_id = activities.created_by 
  LIMIT 1
)
WHERE team_id IS NULL 
AND created_by IS NOT NULL;