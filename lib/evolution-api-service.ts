import { supabase } from './supabase';

// Interfaces para a Evolution API
export interface EvolutionAPIConfig {
  id?: string;
  team_id: string;
  instance_url: string;
  instance_name: string;
  api_key: string;
  security_token: string;
  automation_interval_min: number;
  automation_interval_max: number;
  typing_animation_interval_min: number;
  typing_animation_interval_max: number;
  typing_animation_enabled: boolean;
}

export interface EvolutionAPIInstance {
  instance: {
    instanceName: string;
    instanceId: string;
    state: string;
    status: string;
  };
}

export interface EvolutionAPIMessage {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: {
    conversation?: string;
    imageMessage?: {
      url: string;
      caption?: string;
    };
    videoMessage?: {
      url: string;
      caption?: string;
    };
    documentMessage?: {
      url: string;
      fileName: string;
    };
    audioMessage?: {
      url: string;
    };
    stickerMessage?: {
      url: string;
    };
    extendedTextMessage?: {
      text: string;
    };
  };
  messageTimestamp: number;
  status?: string;
}

export interface EvolutionAPIChat {
  id: string;
  name: string;
  phone: string;
  unreadCount: number;
  lastMessage?: {
    text: string;
    timestamp: number;
  };
  profilePictureUrl?: string;
}

// Interfaces para as tabelas do banco de dados
export interface EvolutionAPIDBChat {
  id?: string;
  team_id: string;
  phone: string;
  name?: string;
  last_message?: string;
  unread_count?: number;
  profile_picture_url?: string;
  whatsapp_jid?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EvolutionAPIDBMessage {
  id?: string;
  team_id: string;
  chat_id: string;
  message_id?: string;
  phone: string;
  text?: string;
  from_me: boolean;
  media_url?: string;
  media_type?: string;
  media_caption?: string;
  status?: string;
  timestamp?: string;
  created_at?: string;
}

export interface EvolutionAPIMessageResponse {
  messages: {
    total: number;
    pages: number;
    currentPage: number;
    records: Array<{
      id: string;
      key: {
        id: string;
        fromMe: boolean;
        remoteJid: string;
      };
      pushName?: string;
      messageType: string;
      message: any;
      messageTimestamp: number;
      status?: string;
      instanceId: string;
      source: string;
      contextInfo: any;
      MessageUpdate: any[];
    }>;
  };
}

// Função para obter a configuração da Evolution API para o time atual
export async function getEvolutionAPIConfig(teamId: string): Promise<EvolutionAPIConfig | null> {
  try {
    const { data, error } = await supabase
      .from('evolution_api_config')
      .select('*')
      .eq('team_id', teamId)
      .single();
    
    if (error) {
      console.error('Erro ao buscar configuração da Evolution API:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao buscar configuração da Evolution API:', error);
    return null;
  }
}

// Função para fazer requisições à Evolution API
async function makeEvolutionAPIRequest(
  config: EvolutionAPIConfig,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: any
) {
  try {
    const url = `${config.instance_url}${endpoint}`;
    
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'apikey': config.api_key
    };
    
    if (config.security_token) {
      headers['Authorization'] = `Bearer ${config.security_token}`;
    }
    
    
    const options: RequestInit = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    };
    
    const response = await fetch(url, options);
    
    // Tentar obter o corpo da resposta como texto
    const responseText = await response.text();
    
    // Tentar parsear como JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { text: responseText };
    }
    
    
    if (!response.ok) {
      throw new Error(`Evolution API request failed: ${response.status} ${response.statusText}\nResponse: ${JSON.stringify(responseData)}`);
    }
    
    return responseData;
  } catch (error) {
    console.error('Erro na requisição à Evolution API:', error);
    throw error;
  }
}

// Funções para gerenciar instâncias
export async function createInstance(config: EvolutionAPIConfig, instanceName: string) {
  return makeEvolutionAPIRequest(
    config,
    '/instance/create',
    'POST',
    {
      instanceName
    }
  );
}

export async function fetchInstances(config: EvolutionAPIConfig) {
  return makeEvolutionAPIRequest(
    config,
    '/instance/fetchInstances',
    'GET'
  );
}

export async function connectInstance(config: EvolutionAPIConfig) {
  return makeEvolutionAPIRequest(
    config,
    `/instance/connect/${config.instance_name}`,
    'GET'
  );
}

export async function restartInstance(config: EvolutionAPIConfig) {
  return makeEvolutionAPIRequest(
    config,
    `/instance/restart/${config.instance_name}`,
    'PUT'
  );
}

export async function getConnectionState(config: EvolutionAPIConfig) {
  return makeEvolutionAPIRequest(
    config,
    `/instance/connectionState/${config.instance_name}`,
    'GET'
  );
}

export async function logoutInstance(config: EvolutionAPIConfig) {
  return makeEvolutionAPIRequest(
    config,
    `/instance/logout/${config.instance_name}`,
    'DELETE'
  );
}

export async function deleteInstance(config: EvolutionAPIConfig) {
  return makeEvolutionAPIRequest(
    config,
    `/instance/delete/${config.instance_name}`,
    'DELETE'
  );
}

// Funções para enviar mensagens
export async function sendTextMessage(
  config: EvolutionAPIConfig,
  phone: string,
  message: string,
  options?: {
    delay?: number;
    presence?: 'available' | 'composing' | 'recording' | 'paused';
  }
) {
  
  // Formato que estava funcionando anteriormente
  const payload = {
    number: phone,
    text: message,
    delay: options?.delay || 1000,
    // Opcionais
    linkPreview: true
  };
  
  
  return makeEvolutionAPIRequest(
    config,
    `/message/sendText/${config.instance_name}`,
    'POST',
    payload
  );
}

export async function sendMediaMessage(
  config: EvolutionAPIConfig,
  phone: string,
  mediaType: 'image' | 'video' | 'document' | 'audio',
  mediaUrl: string,
  caption?: string,
  fileName?: string
) {
  const body: any = {
    number: phone,
    options: {
      delay: 1000,
      presence: 'composing'
    }
  };
  
  if (mediaType === 'image') {
    body.imageMessage = {
      image: mediaUrl,
      caption: caption || ''
    };
  } else if (mediaType === 'video') {
    body.videoMessage = {
      video: mediaUrl,
      caption: caption || ''
    };
  } else if (mediaType === 'document') {
    body.documentMessage = {
      document: mediaUrl,
      fileName: fileName || 'document'
    };
  } else if (mediaType === 'audio') {
    body.audioMessage = {
      audio: mediaUrl
    };
  }
  
  return makeEvolutionAPIRequest(
    config,
    `/message/sendMedia/${config.instance_name}`,
    'POST',
    body
  );
}

// Funções para gerenciar chats
export async function findChats(config: EvolutionAPIConfig): Promise<EvolutionAPIChat[]> {
  try {
    const response = await makeEvolutionAPIRequest(
      config,
      `/chat/findChats/${config.instance_name}`,
      'POST',
      {}
    );
    
    return response.chats || [];
  } catch (error) {
    console.error('Erro ao buscar chats:', error);
    return [];
  }
}

export async function findMessages(
  config: EvolutionAPIConfig,
  phone: string,
  count: number = 20
): Promise<EvolutionAPIMessageResponse> {
  try {
    const response = await makeEvolutionAPIRequest(
      config,
      `/chat/findMessages/${config.instance_name}`,
      'POST',
      {
        where: {
          key: {
            remoteJid: `${phone}@s.whatsapp.net`
          }
        },
        limit: count
      }
    );
    
    return response;
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    throw error;
  }
}

export async function markMessageAsRead(
  config: EvolutionAPIConfig,
  messageId: string,
  phone: string,
  fromMe: boolean = false
) {
  return makeEvolutionAPIRequest(
    config,
    `/chat/markMessageAsRead/${config.instance_name}`,
    'POST',
    {
      readMessages: [
        {
          id: messageId,
          remoteJid: `${phone}@s.whatsapp.net`,
          fromMe: fromMe
        }
      ]
    }
  );
}

// Funções para gerenciar contatos
export async function findContacts(config: EvolutionAPIConfig) {
  return makeEvolutionAPIRequest(
    config,
    `/chat/findContacts/${config.instance_name}`,
    'POST',
    {}
  );
}

export async function fetchProfilePictureUrl(
  config: EvolutionAPIConfig,
  phone: string
) {
  return makeEvolutionAPIRequest(
    config,
    `/chat/fetchProfilePictureUrl/${config.instance_name}`,
    'POST',
    {
      number: phone
    }
  );
}

// Funções para verificar se um número é WhatsApp
export async function checkIsWhatsApp(
  config: EvolutionAPIConfig,
  phone: string
) {
  
  // Formato correto conforme a documentação
  // POST /chat/whatsappNumbers/{instance}
  // Body: { numbers: [string] }
  return makeEvolutionAPIRequest(
    config,
    `/chat/whatsappNumbers/${config.instance_name}`,
    'POST',
    {
      numbers: [phone]
    }
  ).then(response => {
    
    // A resposta é um array, pegamos o primeiro item
    if (Array.isArray(response) && response.length > 0) {
      return response[0];
    }
    return { exists: false, number: phone };
  });
}

// Funções para gerenciar presença
export async function setPresence(
  config: EvolutionAPIConfig,
  presence: 'available' | 'unavailable' | 'composing' | 'recording' | 'paused',
  phone: string
) {
  
  // Formato que estava funcionando anteriormente
  return makeEvolutionAPIRequest(
    config,
    `/chat/sendPresence/${config.instance_name}`,
    'POST',
    {
      presence,
      number: phone
    }
  );
}

// Funções para gerenciar conversas no banco de dados
export async function saveChat(chat: EvolutionAPIDBChat): Promise<EvolutionAPIDBChat> {
  try {
    const { data, error } = await supabase
      .from('evolution_api_chats')
      .upsert([chat], {
        onConflict: 'team_id,phone',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao salvar conversa:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erro ao salvar conversa:', error);
    throw error;
  }
}

export async function findChatByPhone(teamId: string, phone: string): Promise<EvolutionAPIDBChat | null> {
  try {
    const { data, error } = await supabase
      .from('evolution_api_chats')
      .select('*')
      .eq('team_id', teamId)
      .eq('phone', phone)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Não encontrou nenhum registro
        return null;
      }
      console.error('Erro ao buscar conversa:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erro ao buscar conversa:', error);
    return null;
  }
}

export async function findChatsFromDB(teamId: string): Promise<EvolutionAPIDBChat[]> {
  try {
    const { data, error } = await supabase
      .from('evolution_api_chats')
      .select('*')
      .eq('team_id', teamId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar conversas:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar conversas:', error);
    return [];
  }
}

export async function deleteChat(chatId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('evolution_api_chats')
      .delete()
      .eq('id', chatId);

    if (error) {
      console.error('Erro ao excluir conversa:', error);
      throw error;
    }
  } catch (error) {
    console.error('Erro ao excluir conversa:', error);
    throw error;
  }
}

// Funções para gerenciar mensagens no banco de dados
export async function saveMessage(message: EvolutionAPIDBMessage): Promise<EvolutionAPIDBMessage> {
  try {
    const { data, error } = await supabase
      .from('evolution_api_messages')
      .insert([message])
      .select()
      .single();

    if (error) {
      console.error('Erro ao salvar mensagem:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erro ao salvar mensagem:', error);
    throw error;
  }
}

export async function findMessagesByChatId(chatId: string, limit: number = 50): Promise<EvolutionAPIDBMessage[]> {
  try {
    const { data, error } = await supabase
      .from('evolution_api_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erro ao buscar mensagens:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    return [];
  }
}

export async function findMessagesByPhone(teamId: string, phone: string, limit: number = 50): Promise<EvolutionAPIDBMessage[]> {
  try {
    const { data, error } = await supabase
      .from('evolution_api_messages')
      .select('*')
      .eq('team_id', teamId)
      .eq('phone', phone)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erro ao buscar mensagens:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    return [];
  }
}

export async function updateMessageStatus(messageId: string, status: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('evolution_api_messages')
      .update({ status })
      .eq('id', messageId);

    if (error) {
      console.error('Erro ao atualizar status da mensagem:', error);
      throw error;
    }
  } catch (error) {
    console.error('Erro ao atualizar status da mensagem:', error);
    throw error;
  }
}

// Função auxiliar para converter mensagens do banco para o formato da API
export function convertDBMessageToAPIMessage(dbMessage: EvolutionAPIDBMessage): EvolutionAPIMessage {
  return {
    key: {
      id: dbMessage.message_id || dbMessage.id || '',
      fromMe: dbMessage.from_me,
      remoteJid: `${dbMessage.phone}@s.whatsapp.net`
    },
    message: {
      conversation: dbMessage.text || '',
      // Adicionar outros tipos de mensagem conforme necessário
    },
    messageTimestamp: dbMessage.timestamp 
      ? new Date(dbMessage.timestamp).getTime() / 1000 
      : new Date().getTime() / 1000,
    status: dbMessage.status || 'sent'
  };
}

// Função auxiliar para converter chats do banco para o formato da API
export function convertDBChatToAPIChat(dbChat: EvolutionAPIDBChat): EvolutionAPIChat {
  return {
    id: dbChat.whatsapp_jid || `${dbChat.phone}@s.whatsapp.net`,
    name: dbChat.name || dbChat.phone,
    phone: dbChat.phone,
    unreadCount: dbChat.unread_count || 0,
    lastMessage: dbChat.last_message ? {
      text: dbChat.last_message,
      timestamp: dbChat.updated_at 
        ? new Date(dbChat.updated_at).getTime() / 1000 
        : new Date().getTime() / 1000
    } : undefined,
    profilePictureUrl: dbChat.profile_picture_url
  };
}

// Função específica para enviar áudio do WhatsApp
export async function sendWhatsAppAudio(
  config: EvolutionAPIConfig,
  phone: string,
  audioBase64: string,
  options?: {
    delay?: number;
    encoding?: boolean;
  }
) {
  const payload = {
    number: phone,
    audio: audioBase64,
    delay: options?.delay || 1000,
    encoding: options?.encoding !== undefined ? options.encoding : true
  };
  
  return makeEvolutionAPIRequest(
    config,
    `/message/sendWhatsAppAudio/${config.instance_name}`,
    'POST',
    payload
  );
} 