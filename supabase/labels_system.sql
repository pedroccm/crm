-- Sistema de Labels para Leads
-- Criação das tabelas e políticas RLS

-- Tabela de labels
CREATE TABLE IF NOT EXISTS public.labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#3b82f6', -- Hex color
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT labels_team_name_unique UNIQUE(team_id, name),
    CONSTRAINT labels_color_format CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Tabela de relacionamento leads-labels
CREATE TABLE IF NOT EXISTS public.lead_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT lead_labels_unique UNIQUE(lead_id, label_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS labels_team_id_idx ON public.labels(team_id);
CREATE INDEX IF NOT EXISTS labels_is_active_idx ON public.labels(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS lead_labels_lead_id_idx ON public.lead_labels(lead_id);
CREATE INDEX IF NOT EXISTS lead_labels_label_id_idx ON public.lead_labels(label_id);

-- Habilitar RLS
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_labels ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para labels
CREATE POLICY "Membros podem ver labels do time" ON public.labels
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.team_members tm 
        WHERE tm.team_id = labels.team_id 
        AND tm.user_id = auth.uid()
    )
);

CREATE POLICY "Membros podem inserir labels no time" ON public.labels
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.team_members tm 
        WHERE tm.team_id = labels.team_id 
        AND tm.user_id = auth.uid()
    )
);

CREATE POLICY "Membros podem atualizar labels do time" ON public.labels
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.team_members tm 
        WHERE tm.team_id = labels.team_id 
        AND tm.user_id = auth.uid()
    )
);

CREATE POLICY "Administradores podem excluir labels" ON public.labels
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.team_members tm 
        WHERE tm.team_id = labels.team_id 
        AND tm.user_id = auth.uid()
        AND tm.role = 'admin'
    )
);

-- Políticas RLS para lead_labels
CREATE POLICY "Membros podem ver lead_labels do time" ON public.lead_labels
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.leads l
        JOIN public.team_members tm ON l.team_id = tm.team_id
        WHERE l.id = lead_labels.lead_id 
        AND tm.user_id = auth.uid()
    )
);

CREATE POLICY "Membros podem inserir lead_labels do time" ON public.lead_labels
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.leads l
        JOIN public.team_members tm ON l.team_id = tm.team_id
        WHERE l.id = lead_labels.lead_id 
        AND tm.user_id = auth.uid()
    )
    AND
    EXISTS (
        SELECT 1 FROM public.labels lb
        JOIN public.team_members tm ON lb.team_id = tm.team_id
        WHERE lb.id = lead_labels.label_id 
        AND tm.user_id = auth.uid()
    )
    AND assigned_by = auth.uid()
);

CREATE POLICY "Membros podem atualizar lead_labels do time" ON public.lead_labels
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.leads l
        JOIN public.team_members tm ON l.team_id = tm.team_id
        WHERE l.id = lead_labels.lead_id 
        AND tm.user_id = auth.uid()
    )
);

CREATE POLICY "Membros podem excluir lead_labels do time" ON public.lead_labels
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.leads l
        JOIN public.team_members tm ON l.team_id = tm.team_id
        WHERE l.id = lead_labels.lead_id 
        AND tm.user_id = auth.uid()
    )
);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at na tabela labels
DROP TRIGGER IF EXISTS update_labels_updated_at ON public.labels;
CREATE TRIGGER update_labels_updated_at
    BEFORE UPDATE ON public.labels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Labels padrão para times
INSERT INTO public.labels (team_id, name, color, description) 
SELECT DISTINCT t.id, 'Quente', '#ef4444', 'Lead muito interessado' 
FROM public.teams t 
WHERE NOT EXISTS (
    SELECT 1 FROM public.labels l 
    WHERE l.team_id = t.id AND l.name = 'Quente'
);

INSERT INTO public.labels (team_id, name, color, description) 
SELECT DISTINCT t.id, 'Frio', '#06b6d4', 'Lead sem interesse no momento' 
FROM public.teams t 
WHERE NOT EXISTS (
    SELECT 1 FROM public.labels l 
    WHERE l.team_id = t.id AND l.name = 'Frio'
);

INSERT INTO public.labels (team_id, name, color, description) 
SELECT DISTINCT t.id, 'Seguimento', '#eab308', 'Precisa de follow-up' 
FROM public.teams t 
WHERE NOT EXISTS (
    SELECT 1 FROM public.labels l 
    WHERE l.team_id = t.id AND l.name = 'Seguimento'
);

INSERT INTO public.labels (team_id, name, color, description) 
SELECT DISTINCT t.id, 'VIP', '#f59e0b', 'Cliente importante' 
FROM public.teams t 
WHERE NOT EXISTS (
    SELECT 1 FROM public.labels l 
    WHERE l.team_id = t.id AND l.name = 'VIP'
);

INSERT INTO public.labels (team_id, name, color, description) 
SELECT DISTINCT t.id, 'Prospect', '#22c55e', 'Lead qualificado' 
FROM public.teams t 
WHERE NOT EXISTS (
    SELECT 1 FROM public.labels l 
    WHERE l.team_id = t.id AND l.name = 'Prospect'
);

-- Comentários
COMMENT ON TABLE public.labels IS 'Labels/etiquetas para categorizar leads';
COMMENT ON TABLE public.lead_labels IS 'Relacionamento entre leads e suas labels';
COMMENT ON COLUMN public.labels.color IS 'Cor da label em formato hexadecimal (#RRGGBB)';