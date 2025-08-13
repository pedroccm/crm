-- Corrigir políticas RLS para tabela activities

-- Remover políticas existentes se houver conflitos
DROP POLICY IF EXISTS "Users can view activities from their team" ON activities;
DROP POLICY IF EXISTS "Users can insert activities to their team" ON activities;
DROP POLICY IF EXISTS "Users can update activities from their team" ON activities;
DROP POLICY IF EXISTS "Users can delete activities from their team" ON activities;
DROP POLICY IF EXISTS "Team members can view activities" ON activities;
DROP POLICY IF EXISTS "Team members can insert activities" ON activities;
DROP POLICY IF EXISTS "Team members can update activities" ON activities;
DROP POLICY IF EXISTS "Team members can delete activities" ON activities;

-- Garantir que RLS está habilitado
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Policy para visualizar atividades do time
CREATE POLICY "Users can view activities from their team"
ON activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = activities.team_id
    AND tm.user_id = auth.uid()
  )
);

-- Policy para inserir atividades no time
CREATE POLICY "Users can insert activities to their team"
ON activities FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = activities.team_id
    AND tm.user_id = auth.uid()
  )
);

-- Policy para atualizar atividades do time
CREATE POLICY "Users can update activities from their team"
ON activities FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = activities.team_id
    AND tm.user_id = auth.uid()
  )
);

-- Policy para deletar atividades do time
CREATE POLICY "Users can delete activities from their team"
ON activities FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = activities.team_id
    AND tm.user_id = auth.uid()
  )
);

-- Verificar se a tabela activities tem a estrutura correta
-- Se não tiver as colunas necessárias, criar
DO $$
BEGIN
  -- Verificar se a coluna team_id existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activities' AND column_name = 'team_id'
  ) THEN
    ALTER TABLE activities ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
  END IF;
  
  -- Verificar se a coluna created_by existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activities' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE activities ADD COLUMN created_by UUID REFERENCES profiles(id);
  END IF;
END $$;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_activities_team_id ON activities(team_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_by ON activities(created_by);

-- Atualizar atividades existentes sem team_id (se houver)
-- Isso vai tentar associar atividades ao time do usuário que as criou
UPDATE activities 
SET team_id = (
  SELECT tm.team_id 
  FROM team_members tm 
  WHERE tm.user_id = activities.created_by 
  LIMIT 1
)
WHERE team_id IS NULL 
AND created_by IS NOT NULL;