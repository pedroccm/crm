-- Criar tabela para conversas da Evolution API
CREATE TABLE IF NOT EXISTS public.evolution_api_chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    name TEXT,
    last_message TEXT,
    unread_count INTEGER DEFAULT 0,
    profile_picture_url TEXT,
    whatsapp_jid TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (team_id, phone)
);

-- Adicionar índices para melhorar a performance das consultas
CREATE INDEX IF NOT EXISTS evolution_api_chats_team_id_idx ON public.evolution_api_chats(team_id);
CREATE INDEX IF NOT EXISTS evolution_api_chats_phone_idx ON public.evolution_api_chats(phone);

-- Criar tabela para mensagens da Evolution API
CREATE TABLE IF NOT EXISTS public.evolution_api_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    chat_id UUID REFERENCES public.evolution_api_chats(id) ON DELETE CASCADE,
    message_id TEXT,
    phone TEXT NOT NULL,
    text TEXT,
    from_me BOOLEAN DEFAULT FALSE,
    media_url TEXT,
    media_type TEXT,
    media_caption TEXT,
    status TEXT DEFAULT 'sent',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar índices para melhorar a performance das consultas
CREATE INDEX IF NOT EXISTS evolution_api_messages_team_id_idx ON public.evolution_api_messages(team_id);
CREATE INDEX IF NOT EXISTS evolution_api_messages_chat_id_idx ON public.evolution_api_messages(chat_id);
CREATE INDEX IF NOT EXISTS evolution_api_messages_phone_idx ON public.evolution_api_messages(phone);
CREATE INDEX IF NOT EXISTS evolution_api_messages_timestamp_idx ON public.evolution_api_messages(timestamp);

-- Adicionar políticas de segurança RLS
ALTER TABLE IF EXISTS public.evolution_api_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.evolution_api_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para evolution_api_chats
CREATE POLICY "Membros podem ver conversas do time" ON public.evolution_api_chats
    FOR SELECT
    USING (auth.uid() IN (
        SELECT user_id FROM team_members WHERE team_id = evolution_api_chats.team_id
    ));

CREATE POLICY "Membros podem inserir conversas no time" ON public.evolution_api_chats
    FOR INSERT
    WITH CHECK (auth.uid() IN (
        SELECT user_id FROM team_members WHERE team_id = evolution_api_chats.team_id
    ));

CREATE POLICY "Membros podem atualizar conversas do time" ON public.evolution_api_chats
    FOR UPDATE
    USING (auth.uid() IN (
        SELECT user_id FROM team_members WHERE team_id = evolution_api_chats.team_id
    ));

CREATE POLICY "Admins podem excluir conversas do time" ON public.evolution_api_chats
    FOR DELETE
    USING (auth.uid() IN (
        SELECT user_id FROM team_members WHERE team_id = evolution_api_chats.team_id AND role IN ('owner', 'admin')
    ));

-- Políticas para evolution_api_messages
CREATE POLICY "Membros podem ver mensagens do time" ON public.evolution_api_messages
    FOR SELECT
    USING (auth.uid() IN (
        SELECT user_id FROM team_members WHERE team_id = evolution_api_messages.team_id
    ));

CREATE POLICY "Membros podem inserir mensagens no time" ON public.evolution_api_messages
    FOR INSERT
    WITH CHECK (auth.uid() IN (
        SELECT user_id FROM team_members WHERE team_id = evolution_api_messages.team_id
    ));

CREATE POLICY "Membros podem atualizar mensagens do time" ON public.evolution_api_messages
    FOR UPDATE
    USING (auth.uid() IN (
        SELECT user_id FROM team_members WHERE team_id = evolution_api_messages.team_id
    ));

CREATE POLICY "Admins podem excluir mensagens do time" ON public.evolution_api_messages
    FOR DELETE
    USING (auth.uid() IN (
        SELECT user_id FROM team_members WHERE team_id = evolution_api_messages.team_id AND role IN ('owner', 'admin')
    ));

-- Trigger para atualizar o campo updated_at em chats
CREATE OR REPLACE FUNCTION update_evolution_api_chats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_evolution_api_chats_updated_at
BEFORE UPDATE ON public.evolution_api_chats
FOR EACH ROW
EXECUTE FUNCTION update_evolution_api_chats_updated_at(); 