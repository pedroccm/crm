import { supabase } from './supabase';
import { sendWhatsAppTextMessage } from './whatsapp';

export interface WhatsAppConversation {
  lead_phone: string;
  lead_name: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

export interface WhatsAppMessage {
  id: string;
  lead_phone: string;
  lead_name: string;
  message: string;
  direction: 'inbound' | 'outbound';
  status: 'sent' | 'delivered' | 'read' | 'received' | 'failed';
  timestamp: string;
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  company_name?: string;
  status: string;
}

// Buscar todas as conversas do WhatsApp
export async function fetchWhatsAppConversations(): Promise<WhatsAppConversation[]> {
  try {
    // Buscar as conversas agrupadas por número de telefone
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select(`
        lead_phone,
        lead_name,
        message,
        direction,
        timestamp,
        status
      `)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Erro ao buscar conversas:', error);
      return [];
    }

    // Agrupar mensagens por número de telefone
    const conversationsMap = new Map<string, WhatsAppConversation>();
    
    data.forEach(message => {
      if (!conversationsMap.has(message.lead_phone)) {
        conversationsMap.set(message.lead_phone, {
          lead_phone: message.lead_phone,
          lead_name: message.lead_name || 'Desconhecido',
          last_message: message.message,
          last_message_time: message.timestamp,
          unread_count: message.direction === 'inbound' && message.status !== 'read' ? 1 : 0
        });
      } else if (message.direction === 'inbound' && message.status !== 'read') {
        const conversation = conversationsMap.get(message.lead_phone)!;
        conversation.unread_count += 1;
      }
    });

    return Array.from(conversationsMap.values());
  } catch (error) {
    console.error('Erro ao processar conversas:', error);
    return [];
  }
}

// Buscar mensagens de uma conversa específica
export async function fetchWhatsAppMessages(phoneNumber: string): Promise<WhatsAppMessage[]> {
  try {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('lead_phone', phoneNumber)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Erro ao buscar mensagens:', error);
      return [];
    }

    return data as WhatsAppMessage[];
  } catch (error) {
    console.error('Erro ao processar mensagens:', error);
    return [];
  }
}

// Enviar mensagem via WhatsApp
export async function sendWhatsAppMessage(phoneNumber: string, message: string): Promise<boolean> {
  try {
    console.log('=== INÍCIO DO PROCESSO DE ENVIO DE MENSAGEM (whatsapp-service) ===');
    console.log('Número de telefone recebido:', phoneNumber);
    console.log('Mensagem a ser enviada:', message);
    
    // Formatar o número de telefone se necessário
    const formattedPhone = formatPhoneNumber(phoneNumber);
    console.log('Número formatado antes de enviar para a API:', formattedPhone);
    
    // Enviar a mensagem via API do WhatsApp
    console.log('Chamando função sendWhatsAppTextMessage...');
    const response = await sendWhatsAppTextMessage(formattedPhone, message);
    
    if (!response) {
      console.error('ERRO: Falha ao enviar mensagem WhatsApp - resposta nula ou indefinida');
      return false;
    }
    
    console.log('Resposta da API recebida com sucesso:', JSON.stringify(response, null, 2));
    console.log('ID da mensagem:', response.messages[0].id);
    
    // Registrar a mensagem no banco de dados
    console.log('Registrando mensagem no banco de dados...');
    const { error } = await supabase.from('whatsapp_messages').insert({
      lead_phone: phoneNumber,
      message: message,
      direction: 'outbound',
      message_id: response.messages[0].id,
      status: 'sent',
      timestamp: new Date().toISOString()
    });

    if (error) {
      console.error('ERRO ao registrar mensagem enviada no banco de dados:', error);
      return false;
    }

    console.log('Mensagem registrada com sucesso no banco de dados');
    console.log('=== FIM DO PROCESSO DE ENVIO DE MENSAGEM (whatsapp-service) ===');
    return true;
  } catch (error) {
    console.error('ERRO CRÍTICO ao enviar mensagem:', error);
    return false;
  }
}

// Marcar mensagens como lidas
export async function markMessagesAsRead(phoneNumber: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('whatsapp_messages')
      .update({ status: 'read' })
      .eq('lead_phone', phoneNumber)
      .eq('direction', 'inbound')
      .neq('status', 'read');

    if (error) {
      console.error('Erro ao marcar mensagens como lidas:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao processar atualização de status:', error);
    return false;
  }
}

// Buscar leads disponíveis para iniciar um novo chat
export async function fetchLeadsForChat(searchTerm: string = ''): Promise<Lead[]> {
  try {
    let query = supabase
      .from('leads')
      .select(`
        id,
        name,
        phone,
        email,
        status,
        companies (
          name
        )
      `)
      .order('name', { ascending: true });
    
    // Adicionar filtro de pesquisa se fornecido
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }
    
    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar leads:', error);
      return [];
    }

    // Formatar os dados dos leads
    return data.map(lead => ({
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      company_name: lead.companies && lead.companies.length > 0 ? lead.companies[0].name : undefined,
      status: lead.status
    }));
  } catch (error) {
    console.error('Erro ao processar leads:', error);
    return [];
  }
}

// Iniciar uma nova conversa com um lead
export async function startNewChat(lead: Lead, initialMessage: string): Promise<boolean> {
  try {
    if (!lead.phone) {
      console.error('Lead não possui número de telefone');
      return false;
    }
    
    // Verificar se já existe uma conversa com este lead
    const existingMessages = await fetchWhatsAppMessages(lead.phone);
    
    // Se não existir mensagens anteriores, registrar o lead no banco de dados
    if (existingMessages.length === 0) {
      // Verificar se o lead já existe na tabela de leads
      const { data: existingLead, error: leadError } = await supabase
        .from('leads')
        .select('id')
        .eq('phone', lead.phone)
        .single();
      
      if (leadError && leadError.code !== 'PGRST116') {
        console.error('Erro ao verificar lead existente:', leadError);
      }
      
      // Se o lead não existir, criar um novo
      if (!existingLead) {
        const { error: insertError } = await supabase
          .from('leads')
          .insert({
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            status: 'novo'
          });
        
        if (insertError) {
          console.error('Erro ao criar novo lead:', insertError);
        }
      }
    }
    
    // Enviar a mensagem inicial
    return await sendWhatsAppMessage(lead.phone, initialMessage);
  } catch (error) {
    console.error('Erro ao iniciar nova conversa:', error);
    return false;
  }
}

// Função auxiliar para formatar número de telefone
function formatPhoneNumber(phoneNumber: string): string {
  console.log(`[whatsapp-service] Número original: ${phoneNumber}`);
  
  // Remove caracteres não numéricos
  const cleaned = phoneNumber.replace(/\D/g, '');
  console.log(`[whatsapp-service] Após remover caracteres não numéricos: ${cleaned}`);
  
  // Verifica se já tem o código do país
  if (cleaned.startsWith('55')) {
    console.log(`[whatsapp-service] Código do país já presente: ${cleaned}`);
    return cleaned;
  }
  
  // Adiciona o código do Brasil (55)
  const formatted = `55${cleaned}`;
  console.log(`[whatsapp-service] Adicionado código do país: ${formatted}`);
  return formatted;
} 