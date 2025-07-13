-- Criar tabela para configurações da Evolution API
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

-- Adicionar índice para melhorar a performance das consultas
CREATE INDEX IF NOT EXISTS evolution_api_config_team_id_idx ON public.evolution_api_config(team_id);

-- Adicionar políticas de segurança RLS
ALTER TABLE IF EXISTS public.evolution_api_config ENABLE ROW LEVEL SECURITY;

-- Políticas para evolution_api_config
CREATE POLICY "Membros podem ver configurações do time" ON public.evolution_api_config
    FOR SELECT
    USING (auth.uid() IN (
        SELECT user_id FROM team_members WHERE team_id = evolution_api_config.team_id
    ));

CREATE POLICY "Admins podem inserir configurações no time" ON public.evolution_api_config
    FOR INSERT
    WITH CHECK (auth.uid() IN (
        SELECT user_id FROM team_members WHERE team_id = evolution_api_config.team_id AND role IN ('owner', 'admin')
    ));

CREATE POLICY "Admins podem atualizar configurações do time" ON public.evolution_api_config
    FOR UPDATE
    USING (auth.uid() IN (
        SELECT user_id FROM team_members WHERE team_id = evolution_api_config.team_id AND role IN ('owner', 'admin')
    ));

CREATE POLICY "Admins podem excluir configurações do time" ON public.evolution_api_config
    FOR DELETE
    USING (auth.uid() IN (
        SELECT user_id FROM team_members WHERE team_id = evolution_api_config.team_id AND role IN ('owner', 'admin')
    ));

-- Trigger para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION update_evolution_api_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_evolution_api_config_updated_at
BEFORE UPDATE ON public.evolution_api_config
FOR EACH ROW
EXECUTE FUNCTION update_evolution_api_config_updated_at(); 