import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Credenciais do Supabase não encontradas no ambiente.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Função auxiliar para verificar se o cliente está conectado
export async function checkSupabaseConnection() {
  try {
    console.log('Tentando conectar ao Supabase...');
    console.log('URL:', supabaseUrl);
    console.log('Chave está presente:', !!supabaseAnonKey);

    // Verifica a conexão usando a API de autenticação
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error('Erro na autenticação:', authError);
      throw new Error(`Erro na conexão: ${authError.message}`);
    }

    // Tenta fazer uma consulta na tabela companies
    const { data, error } = await supabase
      .from('companies')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Erro ao acessar tabela companies:', error);
      throw new Error(`Erro na conexão: ${error.message}`);
    }

    console.log('Conexão bem-sucedida! Tabela companies está acessível.');
    return true;
  } catch (error) {
    console.error('Erro ao tentar conectar:', error);
    throw error;
  }
}

// Tipos de ações para o log
export enum LeadLogActionType {
  CREATED = 'created',
  UPDATED = 'updated',
  STAGE_CHANGED = 'stage_changed',
  FIELD_ADDED = 'field_added',
  FIELD_UPDATED = 'field_updated',
  FIELD_DELETED = 'field_deleted',
  STATUS_CHANGED = 'status_changed',
  PIPELINE_ADDED = 'pipeline_added',
  NOTE_ADDED = 'note_added'
}

// Interface para o log
export interface LeadLogEntry {
  lead_id: string;
  action_type: LeadLogActionType;
  description: string;
  details?: any;
  user_id?: string;
  created_at?: string;
}

// Função para registrar uma ação no log
export async function logLeadActivity(logEntry: LeadLogEntry) {
  try {
    console.log('Tentando registrar atividade:', logEntry);
    
    // Verificar se a tabela existe
    const { data: tableExists, error: tableCheckError } = await supabase
      .from('lead_activity_logs')
      .select('id')
      .limit(1);
      
    if (tableCheckError) {
      console.error('Erro ao verificar tabela lead_activity_logs:', tableCheckError);
      console.error('Código do erro:', tableCheckError.code);
      console.error('Mensagem do erro:', tableCheckError.message);
      console.error('Detalhes do erro:', tableCheckError.details);
      console.error('Hint do erro:', tableCheckError.hint);
      
      // Tentar criar a tabela se ela não existir
      console.log('Tentando uma abordagem alternativa...');
      
      // Tentar inserir diretamente sem verificar a tabela
      const insertResult = await supabase.rpc('insert_lead_log', {
        p_lead_id: logEntry.lead_id,
        p_action_type: logEntry.action_type,
        p_description: logEntry.description,
        p_details: logEntry.details || {},
        p_user_id: logEntry.user_id || 'sistema'
      });
      
      if (insertResult.error) {
        console.error('Erro na abordagem alternativa:', insertResult.error);
        return false;
      }
      
      console.log('Log registrado com abordagem alternativa');
      return true;
    }
    
    console.log('Tabela lead_activity_logs existe, tentando inserir registro');
    
    // Tentar inserção com método simplificado
    const { error } = await supabase
      .from('lead_activity_logs')
      .insert({
        lead_id: logEntry.lead_id,
        action_type: logEntry.action_type,
        description: logEntry.description,
        details: logEntry.details || {},
        user_id: logEntry.user_id || 'sistema'
      });

    if (error) {
      console.error('Erro ao registrar log de atividade:', error);
      console.error('Código do erro:', error.code);
      console.error('Mensagem do erro:', error.message);
      console.error('Detalhes do erro:', error.details);
      console.error('Hint do erro:', error.hint);
      
      // Tentar uma abordagem alternativa
      console.log('Tentando uma abordagem alternativa de inserção...');
      
      // Usar o método upsert em vez de insert
      const upsertResult = await supabase
        .from('lead_activity_logs')
        .upsert({
          id: crypto.randomUUID(), // Gerar um UUID aleatório
          lead_id: logEntry.lead_id,
          action_type: logEntry.action_type,
          description: logEntry.description,
          details: logEntry.details || {},
          user_id: logEntry.user_id || 'sistema',
          created_at: new Date().toISOString()
        });
        
      if (upsertResult.error) {
        console.error('Erro na abordagem alternativa:', upsertResult.error);
        return false;
      }
      
      console.log('Log registrado com abordagem alternativa');
      return true;
    }
    
    console.log('Log de atividade registrado com sucesso');
    return true;
  } catch (error) {
    console.error('Exceção ao registrar log de atividade:', error);
    if (error instanceof Error) {
      console.error('Mensagem de erro:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    // Registrar o log localmente no localStorage como fallback
    try {
      const localLogs = JSON.parse(localStorage.getItem('leadActivityLogs') || '[]');
      localLogs.push({
        ...logEntry,
        created_at: new Date().toISOString(),
        id: crypto.randomUUID()
      });
      localStorage.setItem('leadActivityLogs', JSON.stringify(localLogs));
      console.log('Log salvo localmente como fallback');
    } catch (localError) {
      console.error('Erro ao salvar log localmente:', localError);
    }
    
    return false;
  }
}

// Função para obter o histórico de atividades de um lead
export async function getLeadActivityLogs(leadId: string) {
  try {
    console.log('Buscando logs de atividade para o lead:', leadId);
    
    // Tentar buscar do Supabase
    const { data, error } = await supabase
      .from('lead_activity_logs')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar logs de atividade:', error);
      console.error('Código do erro:', error.code);
      console.error('Mensagem do erro:', error.message);
      console.error('Detalhes do erro:', error.details);
      console.error('Hint do erro:', error.hint);
      
      // Buscar do localStorage como fallback
      console.log('Buscando logs do localStorage como fallback');
      if (typeof window !== 'undefined') {
        try {
          const localLogs = JSON.parse(localStorage.getItem('leadActivityLogs') || '[]');
          const filteredLogs = localLogs.filter((log: any) => log.lead_id === leadId);
          console.log(`Encontrados ${filteredLogs.length} logs locais para o lead ${leadId}`);
          return filteredLogs;
        } catch (localError) {
          console.error('Erro ao buscar logs locais:', localError);
        }
      }
      
      return [];
    }

    // Se encontrou dados no Supabase, verificar se há logs locais para mesclar
    let allLogs = data || [];
    
    if (typeof window !== 'undefined') {
      try {
        const localLogs = JSON.parse(localStorage.getItem('leadActivityLogs') || '[]');
        const filteredLogs = localLogs.filter((log: any) => log.lead_id === leadId);
        
        if (filteredLogs.length > 0) {
          console.log(`Mesclando ${filteredLogs.length} logs locais com ${allLogs.length} logs do Supabase`);
          allLogs = [...allLogs, ...filteredLogs];
          // Ordenar por data de criação (mais recente primeiro)
          allLogs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
      } catch (localError) {
        console.error('Erro ao mesclar logs locais:', localError);
      }
    }
    
    console.log(`Encontrados ${allLogs.length} logs de atividade para o lead ${leadId}`);
    return allLogs;
  } catch (error) {
    console.error('Exceção ao buscar logs de atividade:', error);
    if (error instanceof Error) {
      console.error('Mensagem de erro:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    // Tentar buscar do localStorage como último recurso
    if (typeof window !== 'undefined') {
      try {
        const localLogs = JSON.parse(localStorage.getItem('leadActivityLogs') || '[]');
        const filteredLogs = localLogs.filter((log: any) => log.lead_id === leadId);
        console.log(`Encontrados ${filteredLogs.length} logs locais para o lead ${leadId}`);
        return filteredLogs;
      } catch (localError) {
        console.error('Erro ao buscar logs locais:', localError);
      }
    }
    
    return [];
  }
} 