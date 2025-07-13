-- Tabela para armazenar configurações do WhatsApp Business
CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_reply BOOLEAN DEFAULT true,
  business_hours BOOLEAN DEFAULT true,
  notify_new_messages BOOLEAN DEFAULT true,
  sync_interval INTEGER DEFAULT 30,
  webhook_url TEXT,
  verify_token TEXT,
  phone_number TEXT,
  business_name TEXT,
  auto_reply_message TEXT DEFAULT 'Olá! Obrigado por entrar em contato. Responderemos sua mensagem o mais breve possível.',
  business_hours_start TIME DEFAULT '08:00:00',
  business_hours_end TIME DEFAULT '18:00:00',
  -- Campos de configuração da API do WhatsApp Business
  phone_number_id TEXT,
  business_account_id TEXT,
  access_token TEXT,
  api_version TEXT DEFAULT 'v18.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Índices para otimização de consultas
CREATE INDEX IF NOT EXISTS whatsapp_settings_user_id_idx ON public.whatsapp_settings(user_id);

-- Habilitar Row Level Security
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
-- Política para leitura: usuários só podem ver suas próprias configurações
CREATE POLICY whatsapp_settings_select_policy
  ON public.whatsapp_settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política para inserção: usuários só podem inserir suas próprias configurações
CREATE POLICY whatsapp_settings_insert_policy
  ON public.whatsapp_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política para atualização: usuários só podem atualizar suas próprias configurações
CREATE POLICY whatsapp_settings_update_policy
  ON public.whatsapp_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Política para exclusão: usuários só podem excluir suas próprias configurações
CREATE POLICY whatsapp_settings_delete_policy
  ON public.whatsapp_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Função para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar o timestamp de updated_at
CREATE TRIGGER update_whatsapp_settings_updated_at
BEFORE UPDATE ON public.whatsapp_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE public.whatsapp_settings IS 'Armazena configurações do WhatsApp Business para cada usuário';
COMMENT ON COLUMN public.whatsapp_settings.auto_reply IS 'Indica se respostas automáticas estão ativadas';
COMMENT ON COLUMN public.whatsapp_settings.business_hours IS 'Indica se respostas são enviadas apenas em horário comercial';
COMMENT ON COLUMN public.whatsapp_settings.notify_new_messages IS 'Indica se notificações para novas mensagens estão ativadas';
COMMENT ON COLUMN public.whatsapp_settings.sync_interval IS 'Intervalo de sincronização em segundos';
COMMENT ON COLUMN public.whatsapp_settings.webhook_url IS 'URL do webhook configurado no Facebook Developer Portal';
COMMENT ON COLUMN public.whatsapp_settings.verify_token IS 'Token de verificação para o webhook';
COMMENT ON COLUMN public.whatsapp_settings.phone_number IS 'Número de telefone verificado no WhatsApp Business';
COMMENT ON COLUMN public.whatsapp_settings.business_name IS 'Nome da empresa registrado no WhatsApp Business';
COMMENT ON COLUMN public.whatsapp_settings.auto_reply_message IS 'Mensagem automática enviada quando auto_reply está ativado';
COMMENT ON COLUMN public.whatsapp_settings.business_hours_start IS 'Hora de início do horário comercial';
COMMENT ON COLUMN public.whatsapp_settings.business_hours_end IS 'Hora de término do horário comercial';
COMMENT ON COLUMN public.whatsapp_settings.phone_number_id IS 'ID do número de telefone no WhatsApp Business API';
COMMENT ON COLUMN public.whatsapp_settings.business_account_id IS 'ID da conta de negócios no WhatsApp Business API';
COMMENT ON COLUMN public.whatsapp_settings.access_token IS 'Token de acesso para a API do WhatsApp Business';
COMMENT ON COLUMN public.whatsapp_settings.api_version IS 'Versão da API do WhatsApp Business'; 