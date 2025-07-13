-- Criar a tabela de atividades
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Criar índices para melhorar a performance
CREATE INDEX IF NOT EXISTS activities_lead_id_idx ON activities(lead_id);
CREATE INDEX IF NOT EXISTS activities_scheduled_date_idx ON activities(scheduled_date);
CREATE INDEX IF NOT EXISTS activities_completed_idx ON activities(completed);

-- Criar políticas de segurança RLS
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura pública
CREATE POLICY "Permitir leitura pública de atividades" ON activities
  FOR SELECT USING (true);

-- Política para permitir inserção por qualquer usuário
CREATE POLICY "Permitir inserção de atividades por qualquer usuário" ON activities
  FOR INSERT WITH CHECK (true);

-- Política para permitir atualização por qualquer usuário
CREATE POLICY "Permitir atualização de atividades por qualquer usuário" ON activities
  FOR UPDATE USING (true);

-- Política para permitir exclusão por qualquer usuário
CREATE POLICY "Permitir exclusão de atividades por qualquer usuário" ON activities
  FOR DELETE USING (true);

-- Adicionar gatilho para atualizar o campo completed_at quando a atividade for marcada como concluída
CREATE OR REPLACE FUNCTION update_activity_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed = true AND OLD.completed = false THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_activity_completed_at
BEFORE UPDATE ON activities
FOR EACH ROW
EXECUTE FUNCTION update_activity_completed_at(); 