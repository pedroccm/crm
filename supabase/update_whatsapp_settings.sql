-- Script para adicionar as colunas de configuração da API do WhatsApp Business à tabela existente
ALTER TABLE public.whatsapp_settings 
ADD COLUMN IF NOT EXISTS phone_number_id TEXT,
ADD COLUMN IF NOT EXISTS business_account_id TEXT,
ADD COLUMN IF NOT EXISTS access_token TEXT,
ADD COLUMN IF NOT EXISTS api_version TEXT DEFAULT 'v18.0';

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.whatsapp_settings.phone_number_id IS 'ID do número de telefone no WhatsApp Business API';
COMMENT ON COLUMN public.whatsapp_settings.business_account_id IS 'ID da conta de negócios no WhatsApp Business API';
COMMENT ON COLUMN public.whatsapp_settings.access_token IS 'Token de acesso para a API do WhatsApp Business';
COMMENT ON COLUMN public.whatsapp_settings.api_version IS 'Versão da API do WhatsApp Business';

-- Atualizar as políticas de segurança para garantir que elas incluam as novas colunas
DROP POLICY IF EXISTS whatsapp_settings_update_policy ON public.whatsapp_settings;
CREATE POLICY whatsapp_settings_update_policy
  ON public.whatsapp_settings
  FOR UPDATE
  USING (auth.uid() = user_id); 