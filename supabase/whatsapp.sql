-- Criar tabela para armazenar mensagens do WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_phone VARCHAR(20) NOT NULL,
  lead_name VARCHAR(255),
  message TEXT NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_id VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'delivered', 'read', 'received', 'failed')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhorar a performance das consultas
CREATE INDEX IF NOT EXISTS whatsapp_messages_lead_phone_idx ON public.whatsapp_messages(lead_phone);
CREATE INDEX IF NOT EXISTS whatsapp_messages_message_id_idx ON public.whatsapp_messages(message_id);
CREATE INDEX IF NOT EXISTS whatsapp_messages_timestamp_idx ON public.whatsapp_messages(timestamp);
CREATE INDEX IF NOT EXISTS whatsapp_messages_direction_idx ON public.whatsapp_messages(direction);

-- Adicionar campo phone na tabela leads se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN phone VARCHAR(20);
  END IF;
END
$$;

-- Configurar políticas de segurança (RLS)
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura para usuários autenticados
CREATE POLICY "Usuários autenticados podem ler mensagens do WhatsApp" 
ON public.whatsapp_messages FOR SELECT 
TO authenticated 
USING (true);

-- Política para permitir inserção para usuários autenticados
CREATE POLICY "Usuários autenticados podem inserir mensagens do WhatsApp" 
ON public.whatsapp_messages FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Política para permitir atualização para usuários autenticados
CREATE POLICY "Usuários autenticados podem atualizar mensagens do WhatsApp" 
ON public.whatsapp_messages FOR UPDATE 
TO authenticated 
USING (true);

-- Função para atualizar o timestamp de created_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar o timestamp de updated_at
CREATE TRIGGER update_whatsapp_messages_updated_at
BEFORE UPDATE ON public.whatsapp_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column(); 