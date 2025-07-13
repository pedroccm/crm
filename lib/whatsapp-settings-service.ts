import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Interface para as configurações do WhatsApp Business
export interface WhatsAppSettings {
  id?: string;
  user_id?: string;
  auto_reply: boolean;
  business_hours: boolean;
  notify_new_messages: boolean;
  sync_interval: number;
  webhook_url?: string;
  verify_token?: string;
  phone_number?: string;
  business_name?: string;
  auto_reply_message: string;
  business_hours_start: string; // formato HH:MM
  business_hours_end: string; // formato HH:MM
  created_at?: string;
  updated_at?: string;
  // Campos de configuração da API do WhatsApp Business
  phone_number_id?: string;
  business_account_id?: string;
  access_token?: string;
  api_version?: string;
}

// Valores padrão para as configurações
export const defaultWhatsAppSettings: WhatsAppSettings = {
  auto_reply: true,
  business_hours: true,
  notify_new_messages: true,
  sync_interval: 30,
  auto_reply_message: 'Olá! Obrigado por entrar em contato. Responderemos sua mensagem o mais breve possível.',
  business_hours_start: '08:00',
  business_hours_end: '18:00',
  api_version: 'v18.0',
  phone_number_id: '',
  business_account_id: '',
  access_token: '',
  verify_token: '',
};

/**
 * Busca as configurações do WhatsApp Business para o usuário atual
 * @returns As configurações do WhatsApp Business ou null se não encontradas
 */
export async function fetchWhatsAppSettings(): Promise<WhatsAppSettings | null> {
  try {
    console.log('[fetchWhatsAppSettings] Iniciando busca de configurações do WhatsApp');
    
    // Verifica se o usuário está autenticado
    const { data: { user } } = await supabase.auth.getUser();
    console.log('[fetchWhatsAppSettings] Usuário autenticado:', user?.id ? 'Sim' : 'Não');
    
    if (!user) {
      console.error('[fetchWhatsAppSettings] Usuário não autenticado');
      console.log('[fetchWhatsAppSettings] Retornando configurações padrão devido a usuário não autenticado');
      return defaultWhatsAppSettings;
    }

    // Busca as configurações do usuário
    console.log('[fetchWhatsAppSettings] Buscando configurações para o usuário:', user.id);
    const { data, error } = await supabase
      .from('whatsapp_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // Se o erro for "não encontrado", retorna as configurações padrão
      if (error.code === 'PGRST116') {
        console.log('[fetchWhatsAppSettings] Configurações não encontradas, retornando padrão');
        return defaultWhatsAppSettings;
      }
      console.error('[fetchWhatsAppSettings] Erro ao buscar configurações do WhatsApp:', error);
      console.log('[fetchWhatsAppSettings] Retornando null devido a erro');
      return null;
    }

    console.log('[fetchWhatsAppSettings] Configurações encontradas:', data);
    
    // Formata as horas para o formato HH:MM
    const settings: WhatsAppSettings = {
      ...data,
      business_hours_start: data.business_hours_start ? data.business_hours_start.substring(0, 5) : '08:00',
      business_hours_end: data.business_hours_end ? data.business_hours_end.substring(0, 5) : '18:00',
    };

    console.log('[fetchWhatsAppSettings] Configurações formatadas:', settings);
    return settings;
  } catch (error) {
    console.error('[fetchWhatsAppSettings] Erro ao buscar configurações do WhatsApp:', error);
    console.log('[fetchWhatsAppSettings] Retornando null devido a exceção');
    return null;
  }
}

/**
 * Salva as configurações do WhatsApp Business para o usuário atual
 * @param settings As configurações a serem salvas
 * @returns true se as configurações foram salvas com sucesso, false caso contrário
 */
export async function saveWhatsAppSettings(settings: WhatsAppSettings): Promise<boolean> {
  try {
    // Verifica se o usuário está autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('Usuário não autenticado');
      return false;
    }

    // Verifica se o usuário já tem configurações
    const { data: existingSettings } = await supabase
      .from('whatsapp_settings')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // Prepara os dados para salvar
    const settingsData = {
      ...settings,
      user_id: user.id,
    };

    let result;
    
    // Se já existem configurações, atualiza; caso contrário, insere
    if (existingSettings) {
      result = await supabase
        .from('whatsapp_settings')
        .update(settingsData)
        .eq('user_id', user.id);
    } else {
      result = await supabase
        .from('whatsapp_settings')
        .insert(settingsData);
    }

    if (result.error) {
      console.error('Erro ao salvar configurações do WhatsApp:', result.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao salvar configurações do WhatsApp:', error);
    return false;
  }
}

/**
 * Atualiza configurações específicas do WhatsApp Business para o usuário atual
 * @param updates As atualizações a serem aplicadas
 * @returns true se as configurações foram atualizadas com sucesso, false caso contrário
 */
export async function updateWhatsAppSettings(updates: Partial<WhatsAppSettings>): Promise<boolean> {
  try {
    // Verifica se o usuário está autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('Usuário não autenticado');
      return false;
    }

    // Atualiza as configurações
    const { error } = await supabase
      .from('whatsapp_settings')
      .update(updates)
      .eq('user_id', user.id);

    if (error) {
      console.error('Erro ao atualizar configurações do WhatsApp:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao atualizar configurações do WhatsApp:', error);
    return false;
  }
}

/**
 * Verifica se o horário atual está dentro do horário comercial configurado
 * @param settings As configurações do WhatsApp Business
 * @returns true se o horário atual está dentro do horário comercial, false caso contrário
 */
export function isWithinBusinessHours(settings: WhatsAppSettings): boolean {
  // Se o horário comercial não estiver ativado, sempre retorna true
  if (!settings.business_hours) {
    return true;
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Converte o horário atual para minutos desde a meia-noite
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  
  // Converte o horário de início para minutos desde a meia-noite
  const [startHour, startMinute] = settings.business_hours_start.split(':').map(Number);
  const startTimeInMinutes = startHour * 60 + startMinute;
  
  // Converte o horário de término para minutos desde a meia-noite
  const [endHour, endMinute] = settings.business_hours_end.split(':').map(Number);
  const endTimeInMinutes = endHour * 60 + endMinute;
  
  // Verifica se o horário atual está dentro do horário comercial
  return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
}

/**
 * Verifica se as configurações do WhatsApp Business estão completas
 * @param settings As configurações do WhatsApp Business
 * @returns true se as configurações estão completas, false caso contrário
 */
export function areSettingsComplete(settings: WhatsAppSettings): boolean {
  // Verifica as configurações básicas
  const basicSettingsComplete = !!(
    settings.phone_number &&
    settings.business_name &&
    settings.webhook_url &&
    settings.verify_token
  );
  
  // Verifica as configurações da API
  const apiSettingsComplete = !!(
    settings.phone_number_id &&
    settings.business_account_id &&
    settings.access_token &&
    settings.api_version
  );
  
  return basicSettingsComplete && apiSettingsComplete;
} 