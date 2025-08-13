-- Criar tabela para templates de mensagens
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  category VARCHAR(100) DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_message_templates_team_id ON message_templates(team_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_category ON message_templates(category);
CREATE INDEX IF NOT EXISTS idx_message_templates_active ON message_templates(is_active);

-- RLS policies para message_templates
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- Policy para visualizar templates do time
CREATE POLICY "Users can view message templates from their team"
ON message_templates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = message_templates.team_id
    AND tm.user_id = auth.uid()
  )
);

-- Policy para inserir templates (apenas admins e owners)
CREATE POLICY "Team admins can insert message templates"
ON message_templates FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = message_templates.team_id
    AND tm.user_id = auth.uid()
    AND tm.role IN ('owner', 'admin')
  )
);

-- Policy para atualizar templates (apenas admins e owners)
CREATE POLICY "Team admins can update message templates"
ON message_templates FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = message_templates.team_id
    AND tm.user_id = auth.uid()
    AND tm.role IN ('owner', 'admin')
  )
);

-- Policy para deletar templates (apenas admins e owners)
CREATE POLICY "Team admins can delete message templates"
ON message_templates FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = message_templates.team_id
    AND tm.user_id = auth.uid()
    AND tm.role IN ('owner', 'admin')
  )
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_message_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_message_templates_updated_at
  BEFORE UPDATE ON message_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_message_templates_updated_at();

-- Inserir alguns templates de exemplo com campos reais do banco
INSERT INTO message_templates (team_id, name, content, variables, category, created_by) 
SELECT 
  t.id as team_id,
  'Boas-vindas',
  'Olá {{name}}, seja bem-vindo! Como posso ajudá-lo hoje?',
  '["name"]'::jsonb,
  'atendimento',
  tm.user_id
FROM teams t
JOIN team_members tm ON tm.team_id = t.id AND tm.role = 'owner'
WHERE NOT EXISTS (
  SELECT 1 FROM message_templates mt 
  WHERE mt.team_id = t.id AND mt.name = 'Boas-vindas'
);

INSERT INTO message_templates (team_id, name, content, variables, category, created_by) 
SELECT 
  t.id as team_id,
  'Apresentação',
  'Olá {{name}}, me chamo João da {{company}}. Gostaria de apresentar nossos serviços. Posso enviar um material?',
  '["name", "company"]'::jsonb,
  'vendas',
  tm.user_id
FROM teams t
JOIN team_members tm ON tm.team_id = t.id AND tm.role = 'owner'
WHERE NOT EXISTS (
  SELECT 1 FROM message_templates mt 
  WHERE mt.team_id = t.id AND mt.name = 'Apresentação'
);

INSERT INTO message_templates (team_id, name, content, variables, category, created_by) 
SELECT 
  t.id as team_id,
  'Follow-up',
  'Oi {{name}}, como está? Queria saber se teve alguma dúvida sobre nossa conversa anterior. Posso ajudar?',
  '["name"]'::jsonb,
  'vendas',
  tm.user_id
FROM teams t
JOIN team_members tm ON tm.team_id = t.id AND tm.role = 'owner'
WHERE NOT EXISTS (
  SELECT 1 FROM message_templates mt 
  WHERE mt.team_id = t.id AND mt.name = 'Follow-up'
);

INSERT INTO message_templates (team_id, name, content, variables, category, created_by) 
SELECT 
  t.id as team_id,
  'Informações de Contato',
  'Olá {{name}}! Seus dados: Email: {{email}}, Telefone: {{phone}}. Está tudo correto?',
  '["name", "email", "phone"]'::jsonb,
  'atendimento',
  tm.user_id
FROM teams t
JOIN team_members tm ON tm.team_id = t.id AND tm.role = 'owner'
WHERE NOT EXISTS (
  SELECT 1 FROM message_templates mt 
  WHERE mt.team_id = t.id AND mt.name = 'Informações de Contato'
);