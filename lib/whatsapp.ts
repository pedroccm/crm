import { supabase } from './supabase';
import { fetchWhatsAppSettings, isWithinBusinessHours } from './whatsapp-settings-service';

// Tipos para a API do WhatsApp
export interface WhatsAppMessage {
  messaging_product: string;
  recipient_type: string;
  to: string;
  type: 'text' | 'template' | 'image' | 'document' | 'audio' | 'video';
  text?: {
    body: string;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: any[];
  };
  image?: {
    link: string;
  };
}

export interface WhatsAppResponse {
  messaging_product: string;
  contacts: {
    input: string;
    wa_id: string;
  }[];
  messages: {
    id: string;
  }[];
}

export interface WhatsAppWebhookMessage {
  object: string;
  entry: {
    id: string;
    changes: {
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: {
          profile: {
            name: string;
          };
          wa_id: string;
        }[];
        messages?: {
          id: string;
          from: string;
          timestamp: string;
          type: string;
          text?: {
            body: string;
          };
          image?: {
            mime_type: string;
            sha256: string;
            id: string;
          };
        }[];
        statuses?: {
          id: string;
          recipient_id: string;
          status: 'sent' | 'delivered' | 'read';
          timestamp: string;
        }[];
      };
      field: string;
    }[];
  }[];
}

// Configurações da API do WhatsApp
// Estas variáveis serão substituídas pelas configurações do banco de dados
// Removendo as variáveis de ambiente, pois usaremos apenas as configurações do banco
// const WHATSAPP_API_VERSION = process.env.NEXT_PUBLIC_WHATSAPP_API_VERSION || 'v18.0';
// const WHATSAPP_PHONE_NUMBER_ID = process.env.NEXT_PUBLIC_WHATSAPP_PHONE_NUMBER_ID;
// const WHATSAPP_ACCESS_TOKEN = process.env.NEXT_PUBLIC_WHATSAPP_ACCESS_TOKEN;

/**
 * Obtém as configurações do WhatsApp do banco de dados
 */
async function getWhatsAppConfig() {
  console.log('Buscando configurações do WhatsApp...');
  const settings = await fetchWhatsAppSettings();
  console.log('Configurações obtidas do banco:', settings);
  
  if (!settings) {
    console.error('Configurações do WhatsApp não encontradas no banco de dados');
    return {
      apiVersion: '',
      phoneNumberId: '',
      accessToken: '',
      verifyToken: ''
    };
  }
  
  const config = {
    apiVersion: settings.api_version || 'v18.0',
    phoneNumberId: settings.phone_number_id || '',
    accessToken: settings.access_token || '',
    verifyToken: settings.verify_token || ''
  };
  
  console.log('Configuração final (sem tokens sensíveis):');
  console.log('apiVersion:', config.apiVersion);
  console.log('phoneNumberId:', config.phoneNumberId);
  console.log('accessToken:', config.accessToken ? 'Definido (não exibido por segurança)' : 'Não definido');
  console.log('verifyToken:', config.verifyToken ? 'Definido (não exibido por segurança)' : 'Não definido');
  
  return config;
}

/**
 * Envia uma mensagem de texto via WhatsApp
 */
export async function sendWhatsAppTextMessage(phoneNumber: string, message: string): Promise<WhatsAppResponse | null> {
  try {
    console.log('=== INÍCIO DO ENVIO DE MENSAGEM WHATSAPP ===');
    console.log('Iniciando envio de mensagem WhatsApp para:', phoneNumber);
    console.log('Mensagem a ser enviada:', message);
    
    // Obter configurações do WhatsApp
    const config = await getWhatsAppConfig();
    console.log('Configurações obtidas:');
    console.log('- apiVersion:', config.apiVersion);
    console.log('- phoneNumberId:', config.phoneNumberId);
    console.log('- accessToken:', config.accessToken ? `${config.accessToken.substring(0, 10)}...` : 'Não definido');
    
    if (!config.phoneNumberId || !config.accessToken) {
      console.error('ERRO: Configurações do WhatsApp não encontradas ou incompletas');
      console.error('- phoneNumberId presente:', !!config.phoneNumberId);
      console.error('- accessToken presente:', !!config.accessToken);
      return null;
    }
    
    const apiUrl = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;
    console.log('URL da API completa:', apiUrl);
    
    // Formatar o número de telefone (remover caracteres não numéricos e adicionar código do país se necessário)
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
    console.log('Número original:', phoneNumber);
    console.log('Número formatado:', formattedPhoneNumber);
    
    const messageData: WhatsAppMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhoneNumber,
      type: 'text',
      text: {
        body: message
      }
    };
    console.log('Dados da mensagem completos:', JSON.stringify(messageData, null, 2));

    console.log('Headers da requisição:');
    console.log('- Content-Type: application/json');
    console.log('- Authorization: Bearer', config.accessToken ? `${config.accessToken.substring(0, 10)}...` : 'Não definido');
    
    console.log('Enviando requisição para a API do WhatsApp...');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.accessToken}`
      },
      body: JSON.stringify(messageData)
    });

    console.log('Resposta da API - Status:', response.status);
    console.log('Resposta da API - Status Text:', response.statusText);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('ERRO ao enviar mensagem WhatsApp. Detalhes:', JSON.stringify(errorData, null, 2));
      if (errorData.error && errorData.error.message) {
        console.error('Mensagem de erro:', errorData.error.message);
      }
      if (errorData.error && errorData.error.code) {
        console.error('Código de erro:', errorData.error.code);
      }
      return null;
    }

    const data = await response.json();
    console.log('Resposta da API (dados):', JSON.stringify(data, null, 2));
    
    // Registrar a mensagem enviada no banco de dados
    await logWhatsAppMessage({
      lead_phone: formattedPhoneNumber,
      message: message,
      direction: 'outbound',
      message_id: data.messages?.[0]?.id,
      status: 'sent',
      timestamp: new Date().toISOString()
    });
    
    return data;
  } catch (error) {
    console.error('Erro ao enviar mensagem WhatsApp:', error);
    return null;
  }
}

/**
 * Envia uma mensagem de template via WhatsApp
 */
export async function sendWhatsAppTemplateMessage(
  phoneNumber: string, 
  templateName: string, 
  languageCode: string = 'pt_BR',
  components: any[] = []
): Promise<WhatsAppResponse | null> {
  try {
    // Obter configurações do WhatsApp
    const config = await getWhatsAppConfig();
    
    if (!config.phoneNumberId || !config.accessToken) {
      console.error('Configurações do WhatsApp não encontradas');
      return null;
    }
    
    const apiUrl = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;
    
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
    
    const messageData: WhatsAppMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhoneNumber,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode
        },
        components: components
      }
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.accessToken}`
      },
      body: JSON.stringify(messageData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro ao enviar mensagem de template WhatsApp:', errorData);
      return null;
    }

    const data = await response.json();
    
    // Registrar a mensagem enviada no banco de dados
    await logWhatsAppMessage({
      lead_phone: formattedPhoneNumber,
      message: `Template: ${templateName}`,
      direction: 'outbound',
      message_id: data.messages?.[0]?.id,
      status: 'sent',
      timestamp: new Date().toISOString()
    });
    
    return data;
  } catch (error) {
    console.error('Erro ao enviar mensagem de template WhatsApp:', error);
    return null;
  }
}

/**
 * Processa um webhook recebido do WhatsApp
 */
export async function processWhatsAppWebhook(webhookData: WhatsAppWebhookMessage): Promise<void> {
  try {
    // Obter configurações do WhatsApp
    const config = await getWhatsAppConfig();
    
    // Processar mensagens recebidas
    if (webhookData.entry && webhookData.entry.length > 0) {
      for (const entry of webhookData.entry) {
        for (const change of entry.changes) {
          // Processar mensagens recebidas
          if (change.value.messages && change.value.messages.length > 0) {
            for (const message of change.value.messages) {
              const contact = change.value.contacts?.find(c => c.wa_id === message.from);
              const contactName = contact?.profile?.name || 'Desconhecido';
              
              // Processar mensagem de texto
              if (message.type === 'text' && message.text) {
                console.log(`Mensagem recebida de ${contactName} (${message.from}): ${message.text.body}`);
                
                // Registrar a mensagem recebida no banco de dados
                await logWhatsAppMessage({
                  lead_phone: message.from,
                  lead_name: contactName,
                  message: message.text.body,
                  direction: 'inbound',
                  message_id: message.id,
                  status: 'received',
                  timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString()
                });
                
                // Verificar se o lead existe, caso contrário, criar um novo
                await findOrCreateLeadFromWhatsApp(message.from, contactName);
                
                // Implementar lógica de resposta automática aqui, se necessário
                const settings = await fetchWhatsAppSettings();
                if (settings?.auto_reply) {
                  // Verificar se está dentro do horário comercial, se configurado
                  const isWithinHours = !settings.business_hours || isWithinBusinessHours(settings);
                  
                  if (isWithinHours) {
                    await sendWhatsAppTextMessage(message.from, settings.auto_reply_message);
                  }
                }
              }
              // Outros tipos de mensagem (imagem, áudio, etc.) podem ser processados aqui
            }
          }
          
          // Processar atualizações de status
          if (change.value.statuses && change.value.statuses.length > 0) {
            for (const status of change.value.statuses) {
              console.log(`Atualização de status para mensagem ${status.id}: ${status.status}`);
              
              // Atualizar o status da mensagem no banco de dados
              if (['delivered', 'read'].includes(status.status)) {
                await updateWhatsAppMessageStatus(status.id, status.status);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Erro ao processar webhook do WhatsApp:', error);
  }
}

/**
 * Formata um número de telefone para o formato esperado pelo WhatsApp
 */
function formatPhoneNumber(phoneNumber: string): string {
  console.log(`[formatPhoneNumber] Número original: ${phoneNumber}`);
  
  // Remover caracteres não numéricos
  let formatted = phoneNumber.replace(/\D/g, '');
  console.log(`[formatPhoneNumber] Após remover caracteres não numéricos: ${formatted}`);
  
  // Adicionar código do país (55 para Brasil) se não estiver presente
  if (!formatted.startsWith('55') && formatted.length <= 11) {
    formatted = `55${formatted}`;
    console.log(`[formatPhoneNumber] Adicionado código do país: ${formatted}`);
  } else {
    console.log(`[formatPhoneNumber] Código do país já presente ou número muito longo: ${formatted}`);
  }
  
  console.log(`[formatPhoneNumber] Número final formatado: ${formatted}`);
  return formatted;
}

/**
 * Registra uma mensagem do WhatsApp no banco de dados
 */
interface WhatsAppMessageLog {
  lead_phone: string;
  lead_name?: string;
  message: string;
  direction: 'inbound' | 'outbound';
  message_id: string;
  status: 'sent' | 'delivered' | 'read' | 'received' | 'failed';
  timestamp: string;
}

async function logWhatsAppMessage(messageLog: WhatsAppMessageLog): Promise<void> {
  try {
    const { error } = await supabase
      .from('whatsapp_messages')
      .insert([messageLog]);
      
    if (error) throw error;
  } catch (error) {
    console.error('Erro ao registrar mensagem do WhatsApp:', error);
  }
}

/**
 * Atualiza o status de uma mensagem do WhatsApp
 */
async function updateWhatsAppMessageStatus(messageId: string, status: 'sent' | 'delivered' | 'read'): Promise<void> {
  try {
    const { error } = await supabase
      .from('whatsapp_messages')
      .update({ status })
      .eq('message_id', messageId);
      
    if (error) throw error;
  } catch (error) {
    console.error('Erro ao atualizar status da mensagem:', error);
  }
}

/**
 * Encontra ou cria um lead a partir de uma mensagem do WhatsApp
 */
async function findOrCreateLeadFromWhatsApp(phoneNumber: string, name: string): Promise<void> {
  try {
    // Verificar se o lead já existe
    const { data: existingLeads, error: searchError } = await supabase
      .from('leads')
      .select('id, phone, name')
      .eq('phone', phoneNumber)
      .limit(1);
      
    if (searchError) throw searchError;
    
    // Se o lead não existir, criar um novo
    if (!existingLeads || existingLeads.length === 0) {
      const { error: insertError } = await supabase
        .from('leads')
        .insert([{
          name: name,
          phone: phoneNumber,
          status: 'novo',
          custom_fields: {
            source: 'whatsapp'
          }
        }]);
        
      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error('Erro ao processar lead do WhatsApp:', error);
  }
} 