-- Tabela para definições de campos personalizados
CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL, -- 'lead' ou 'company'
  field_name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  field_type VARCHAR(50) NOT NULL, -- 'text', 'number', 'date', 'select', 'checkbox', etc.
  field_options JSONB, -- opções para campos do tipo select
  is_required BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (team_id, entity_type, field_name)
);

-- Índices para melhorar a performance
CREATE INDEX IF NOT EXISTS custom_field_definitions_team_id_idx ON public.custom_field_definitions(team_id);
CREATE INDEX IF NOT EXISTS custom_field_definitions_entity_type_idx ON public.custom_field_definitions(entity_type);

-- Função para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION update_custom_field_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar o timestamp de updated_at
CREATE TRIGGER update_custom_field_definitions_updated_at
BEFORE UPDATE ON public.custom_field_definitions
FOR EACH ROW
EXECUTE FUNCTION update_custom_field_definitions_updated_at();

-- Permissões RLS
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Equipes podem ver suas próprias definições de campos"
  ON public.custom_field_definitions
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.team_members WHERE team_id = team_id
    )
  );

CREATE POLICY "Administradores podem criar definições de campos"
  ON public.custom_field_definitions
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.team_members 
      WHERE team_id = team_id AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Administradores podem atualizar definições de campos"
  ON public.custom_field_definitions
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.team_members 
      WHERE team_id = team_id AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Administradores podem excluir definições de campos"
  ON public.custom_field_definitions
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.team_members 
      WHERE team_id = team_id AND role IN ('owner', 'admin')
    )
  );

-- Modificar tabelas existentes para suportar campos personalizados
-- Adicionar coluna custom_fields às tabelas leads e companies se ainda não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'custom_fields'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN custom_fields JSONB DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'custom_fields'
  ) THEN
    ALTER TABLE public.companies ADD COLUMN custom_fields JSONB DEFAULT '{}'::jsonb;
  END IF;
END
$$; 