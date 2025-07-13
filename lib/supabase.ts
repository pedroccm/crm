import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Verificar se estamos em um ambiente de build
const isBuilding = process.env.NODE_ENV === 'production' && !process.env.VERCEL && !process.env.NETLIFY;

export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey,
  {
    auth: {
      persistSession: !isBuilding,
      autoRefreshToken: !isBuilding,
    }
  }
);

/**
 * Verifica a conexão básica com o Supabase
 */
export async function checkSupabaseConnection() {
  console.log("Verificando conexão básica com o Supabase...");
  
  try {
    // Verificar se as variáveis de ambiente estão definidas
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return {
        success: false,
        message: "Variáveis de ambiente do Supabase não estão configuradas corretamente",
        details: {
          NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? "Configurado" : "Não configurado",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseKey ? "Configurado" : "Não configurado"
        }
      };
    }
    
    // Tentar fazer uma consulta simples para verificar a conexão
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('companies')
      .select('count')
      .limit(1)
      .single();
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    if (error) {
      console.error("Erro ao conectar ao Supabase:", error);
      
      // Verificar se o erro é de conexão
      if (error.code === 'PGRST301' || error.message.includes('connection')) {
        return {
          success: false,
          message: "Não foi possível conectar ao Supabase",
          code: error.code,
          details: error
        };
      }
      
      // Verificar se a tabela não existe
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return {
          success: false,
          message: "A tabela 'companies' não existe no banco de dados",
          code: error.code,
          details: error
        };
      }
      
      return {
        success: false,
        message: "Erro ao acessar o Supabase",
        code: error.code,
        details: error
      };
    }
    
    // Conexão bem-sucedida
    return {
      success: true,
      message: `Conexão com o Supabase estabelecida com sucesso (${responseTime}ms)`,
      data: {
        responseTime: `${responseTime}ms`,
        url: supabaseUrl
      }
    };
    
  } catch (error) {
    console.error("Erro inesperado ao verificar conexão com Supabase:", error);
    return {
      success: false,
      message: "Erro inesperado ao verificar conexão com Supabase",
      details: error
    };
  }
}

// Função para verificar a conexão com o Supabase Auth
export async function checkSupabaseAuth() {
  try {
    console.log('Verificando conexão com Supabase Auth');
    
    // Verificar se as variáveis de ambiente estão definidas
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Variáveis de ambiente do Supabase não estão definidas');
      return {
        success: false,
        message: 'Variáveis de ambiente do Supabase não estão definidas',
        details: {
          url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        }
      };
    }
    
    // Verificar se podemos obter a configuração do Auth
    const { data: authSettings, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error('Erro ao verificar Auth:', authError);
      return {
        success: false,
        message: 'Erro ao verificar Auth',
        error: authError
      };
    }
    
    // Verificar se podemos acessar a tabela de perfis
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (profilesError) {
      console.error('Erro ao acessar tabela de perfis:', profilesError);
      return {
        success: false,
        message: 'Erro ao acessar tabela de perfis',
        error: profilesError,
        authSettings
      };
    }
    
    console.log('Conexão com Supabase Auth verificada com sucesso');
    return {
      success: true,
      message: 'Conexão com Supabase Auth verificada com sucesso',
      authSettings,
      profilesData
    };
  } catch (error) {
    console.error('Erro ao verificar conexão com Supabase Auth:', error);
    return {
      success: false,
      message: 'Erro ao verificar conexão com Supabase Auth',
      error
    };
  }
}

// Tipos de ações para o log de atividades de leads
export enum LeadLogActionType {
  CREATED = 'created',
  UPDATED = 'updated',
  STAGE_CHANGED = 'stage_changed',
  FIELD_ADDED = 'field_added',
  FIELD_UPDATED = 'field_updated',
  FIELD_DELETED = 'field_deleted',
  STATUS_CHANGED = 'status_changed',
  PIPELINE_ADDED = 'pipeline_added',
  NOTE_ADDED = 'note_added',
  ACTIVITY_SCHEDULED = 'activity_scheduled',
  ACTIVITY_COMPLETED = 'activity_completed',
  ACTIVITY_UPDATED = 'activity_updated',
  ACTIVITY_DELETED = 'activity_deleted'
}

// Interface para entradas de log de atividades de leads
export interface LeadLogEntry {
  lead_id: string;
  action_type: LeadLogActionType;
  description: string;
  details?: any;
  user_id?: string;
  created_at?: string;
}

// Função para registrar atividades de leads
export async function logLeadActivity(logEntry: LeadLogEntry) {
  try {
    console.log('Registrando atividade do lead:', logEntry);
    
    // Obter o usuário atual se não foi fornecido
    let userId = logEntry.user_id;
    
    if (!userId) {
      try {
        // Tentar obter o usuário atual da sessão
        const { data: sessionData } = await supabase.auth.getSession();
        userId = sessionData.session?.user?.id || 'system';
        
        // Se não conseguir obter o ID do usuário, usar 'system'
        if (!userId || userId === 'null') {
          userId = 'system';
        }
      } catch (error) {
        console.error('Erro ao obter usuário atual:', error);
        userId = 'system';
      }
    }
    
    const { data, error } = await supabase
      .from('lead_activity_logs')
      .insert({
        lead_id: logEntry.lead_id,
        action_type: logEntry.action_type,
        description: logEntry.description,
        details: logEntry.details || {},
        user_id: userId,
        created_at: logEntry.created_at || new Date().toISOString()
      })
      .select();
    
    if (error) {
      console.error('Erro ao registrar atividade do lead:', error);
      throw error;
    }
    
    return { data };
  } catch (error) {
    console.error('Erro ao registrar atividade do lead:', error);
    return { error };
  }
}

// Função para obter logs de atividades de um lead
export async function getLeadActivityLogs(leadId: string) {
  try {
    console.log('Buscando logs de atividade para o lead:', leadId);
    
    // Buscar logs com informações do usuário
    const { data, error } = await supabase
      .from('lead_activity_logs')
      .select(`
        *,
        profiles:user_id (
          id,
          email,
          name,
          role
        )
      `)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao buscar logs de atividade:', error);
      throw error;
    }
    
    // Formatar os dados para incluir informações do usuário de forma mais acessível
    const formattedLogs = data?.map(log => ({
      ...log,
      user_name: log.profiles?.name || log.profiles?.email || 'Sistema',
      user_email: log.profiles?.email || '',
      user_role: log.profiles?.role || ''
    })) || [];
    
    console.log('Logs de atividade encontrados:', formattedLogs.length);
    return formattedLogs;
  } catch (error) {
    console.error('Erro ao buscar logs de atividade:', error);
    return [];
  }
}

// Interface para atividades
export interface Activity {
  id?: string;
  title: string;
  description?: string;
  lead_id: string;
  team_id?: string;
  scheduled_date: string; // formato YYYY-MM-DD
  scheduled_time?: string; // formato HH:MM
  completed: boolean;
  completed_at?: string;
  created_at?: string;
}

// Função para criar uma nova atividade
export async function createActivity(activity: Activity) {
  try {
    console.log('Criando nova atividade:', activity);
    
    const { data, error } = await supabase
      .from('activities')
      .insert({
        title: activity.title,
        description: activity.description || '',
        lead_id: activity.lead_id,
        team_id: activity.team_id,
        scheduled_date: activity.scheduled_date,
        scheduled_time: activity.scheduled_time || null,
        completed: false,
        created_at: new Date().toISOString()
      })
      .select();
    
    if (error) {
      console.error('Erro ao criar atividade:', error);
      throw error;
    }
    
    // Registrar no log de atividades do lead
    if (data && data.length > 0) {
      await logLeadActivity({
        lead_id: activity.lead_id,
        action_type: LeadLogActionType.ACTIVITY_SCHEDULED,
        description: `Atividade agendada: ${activity.title}`,
        details: {
          activity_id: data[0].id,
          scheduled_date: activity.scheduled_date,
          scheduled_time: activity.scheduled_time
        }
      });
    }
    
    console.log('Atividade criada com sucesso:', data);
    return data;
  } catch (error) {
    console.error('Erro ao criar atividade:', error);
    throw error;
  }
}

// Função para obter atividades por data
export async function getActivitiesByDate(date: string) {
  try {
    console.log('Buscando atividades para a data:', date);
    
    const { data, error } = await supabase
      .from('activities')
      .select(`
        *,
        leads:lead_id (
          id,
          name,
          email,
          company_id,
          companies:company_id (
            id,
            name
          )
        )
      `)
      .eq('scheduled_date', date)
      .order('scheduled_time');
    
    if (error) {
      console.error('Erro ao buscar atividades:', error);
      throw error;
    }
    
    console.log('Atividades encontradas:', data?.length || 0);
    
    // Separar atividades pendentes e concluídas
    const pendingActivities = data?.filter(a => !a.completed) || [];
    const completedActivities = data?.filter(a => a.completed) || [];
    
    return { pendingActivities, completedActivities };
  } catch (error) {
    console.error('Erro ao obter atividades por data:', error);
    throw error;
  }
}

// Função para obter todas as atividades
export async function getAllActivities(completed: boolean = false) {
  try {
    console.log('Buscando todas as atividades, completed:', completed);
    
    const { data, error } = await supabase
      .from('activities')
      .select(`
        *,
        leads:lead_id (
          id,
          name,
          email,
          company_id,
          companies:company_id (
            id,
            name
          )
        )
      `)
      .eq('completed', completed)
      .order('scheduled_date')
      .order('scheduled_time');
    
    if (error) {
      console.error('Erro ao buscar atividades:', error);
      throw error;
    }
    
    console.log('Atividades encontradas:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar atividades:', error);
    return [];
  }
}

// Função para marcar uma atividade como concluída
export async function completeActivity(activityId: string, leadId: string) {
  try {
    console.log('Marcando atividade como concluída:', activityId);
    
    const completedAt = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('activities')
      .update({
        completed: true,
        completed_at: completedAt
      })
      .eq('id', activityId)
      .select();
    
    if (error) {
      console.error('Erro ao marcar atividade como concluída:', error);
      throw error;
    }
    
    // Registrar no log de atividades do lead
    if (data && data.length > 0) {
      await logLeadActivity({
        lead_id: leadId,
        action_type: LeadLogActionType.ACTIVITY_COMPLETED,
        description: `Atividade concluída: ${data[0].title}`,
        details: {
          activity_id: activityId,
          completed_at: completedAt
        }
      });
    }
    
    console.log('Atividade marcada como concluída com sucesso:', data);
    return data;
  } catch (error) {
    console.error('Erro ao marcar atividade como concluída:', error);
    throw error;
  }
}

// Função para atualizar uma atividade
export async function updateActivity(activityId: string, leadId: string, updates: Partial<Activity>) {
  try {
    console.log('Atualizando atividade:', activityId, updates);
    
    const { data, error } = await supabase
      .from('activities')
      .update(updates)
      .eq('id', activityId)
      .select();
    
    if (error) {
      console.error('Erro ao atualizar atividade:', error);
      throw error;
    }
    
    // Registrar no log de atividades do lead
    if (data && data.length > 0) {
      await logLeadActivity({
        lead_id: leadId,
        action_type: LeadLogActionType.ACTIVITY_UPDATED,
        description: `Atividade atualizada: ${data[0].title}`,
        details: {
          activity_id: activityId,
          updates: updates
        }
      });
    }
    
    console.log('Atividade atualizada com sucesso:', data);
    return data;
  } catch (error) {
    console.error('Erro ao atualizar atividade:', error);
    throw error;
  }
}

// Função para excluir uma atividade
export async function deleteActivity(activityId: string, leadId: string, activityTitle: string) {
  try {
    console.log('Excluindo atividade:', activityId);
    
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', activityId);
    
    if (error) {
      console.error('Erro ao excluir atividade:', error);
      throw error;
    }
    
    // Registrar no log de atividades do lead
    await logLeadActivity({
      lead_id: leadId,
      action_type: LeadLogActionType.ACTIVITY_DELETED,
      description: `Atividade excluída: ${activityTitle}`,
      details: {
        activity_id: activityId
      }
    });
    
    console.log('Atividade excluída com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao excluir atividade:', error);
    throw error;
  }
}

/**
 * Verifica as políticas de segurança (RLS) da tabela activities
 */
export async function checkActivitiesRLS() {
  console.log("Verificando políticas de segurança da tabela activities...");
  
  try {
    // Primeiro, verificar se conseguimos acessar a tabela activities
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('count')
      .limit(1)
      .single();
    
    if (activitiesError) {
      console.error("Erro ao acessar a tabela activities:", activitiesError);
      
      // Verificar se o erro é relacionado a políticas de segurança
      if (activitiesError.code === 'PGRST301' || 
          activitiesError.message.includes('permission denied') ||
          activitiesError.message.includes('RLS')) {
        return {
          success: false,
          message: "Erro nas políticas de segurança da tabela activities",
          code: activitiesError.code,
          details: activitiesError
        };
      }
      
      // Verificar se a tabela não existe
      if (activitiesError.code === '42P01' || activitiesError.message.includes('does not exist')) {
        return {
          success: false,
          message: "A tabela 'activities' não existe no banco de dados",
          code: activitiesError.code,
          details: activitiesError
        };
      }
      
      return {
        success: false,
        message: "Erro ao acessar a tabela activities",
        code: activitiesError.code,
        details: activitiesError
      };
    }
    
    // Tentar inserir uma atividade de teste
    const testActivity = {
      title: "Atividade de teste para verificação de RLS",
      description: "Esta atividade será excluída automaticamente",
      lead_id: "00000000-0000-0000-0000-000000000000", // ID fictício
      scheduled_date: new Date().toISOString().split('T')[0],
      completed: false
    };
    
    const { data: insertedActivity, error: insertError } = await supabase
      .from('activities')
      .insert(testActivity)
      .select()
      .single();
    
    if (insertError) {
      console.error("Erro ao inserir atividade de teste:", insertError);
      
      // Verificar se o erro é relacionado a políticas de segurança
      if (insertError.code === 'PGRST301' || 
          insertError.message.includes('permission denied') ||
          insertError.message.includes('RLS')) {
        return {
          success: false,
          message: "Erro nas políticas de inserção da tabela activities",
          code: insertError.code,
          details: insertError
        };
      }
      
      return {
        success: false,
        message: "Erro ao inserir atividade de teste",
        code: insertError.code,
        details: insertError
      };
    }
    
    // Se conseguiu inserir, tentar excluir a atividade de teste
    if (insertedActivity && insertedActivity.id) {
      const { error: deleteError } = await supabase
        .from('activities')
        .delete()
        .eq('id', insertedActivity.id);
      
      if (deleteError) {
        console.error("Erro ao excluir atividade de teste:", deleteError);
        
        // Verificar se o erro é relacionado a políticas de segurança
        if (deleteError.code === 'PGRST301' || 
            deleteError.message.includes('permission denied') ||
            deleteError.message.includes('RLS')) {
          return {
            success: false,
            message: "Erro nas políticas de exclusão da tabela activities",
            code: deleteError.code,
            details: deleteError
          };
        }
        
        return {
          success: false,
          message: "Erro ao excluir atividade de teste",
          code: deleteError.code,
          details: deleteError
        };
      }
    }
    
    // Se chegou até aqui, as políticas de segurança estão configuradas corretamente
    return {
      success: true,
      message: "Políticas de segurança da tabela activities configuradas corretamente",
      details: {
        read: true,
        insert: true,
        delete: true
      }
    };
    
  } catch (error) {
    console.error("Erro inesperado ao verificar políticas de segurança:", error);
    return {
      success: false,
      message: "Erro inesperado ao verificar políticas de segurança",
      details: error
    };
  }
}

// Função para desmarcar uma atividade como concluída
export async function uncompleteActivity(activityId: string, leadId: string) {
  try {
    console.log('Desmarcando atividade como concluída:', activityId);
    
    const { data, error } = await supabase
      .from('activities')
      .update({
        completed: false,
        completed_at: null
      })
      .eq('id', activityId)
      .select();
    
    if (error) {
      console.error('Erro ao desmarcar atividade como concluída:', error);
      throw error;
    }
    
    // Registrar no log de atividades do lead
    if (data && data.length > 0) {
      await logLeadActivity({
        lead_id: leadId,
        action_type: LeadLogActionType.ACTIVITY_UPDATED,
        description: `Atividade desmarcada como concluída: ${data[0].title}`,
        details: {
          activity_id: activityId
        }
      });
    }
    
    console.log('Atividade desmarcada como concluída com sucesso:', data);
    return data;
  } catch (error) {
    console.error('Erro ao desmarcar atividade como concluída:', error);
    throw error;
  }
}

// Tipos para autenticação
export interface UserCredentials {
  email: string;
  password: string;
}

export interface UserRegistration extends UserCredentials {
  name: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  role?: string;
  created_at?: string;
  email_confirmed?: boolean;
  last_sign_in?: string;
}

/**
 * Registra um novo usuário no sistema
 */
export async function registerUser(userData: UserRegistration) {
  console.log("Iniciando registro de novo usuário:", { email: userData.email, name: userData.name });
  
  try {
    // Verificar se os dados necessários foram fornecidos
    if (!userData.email || !userData.email.trim()) {
      console.error("Email não fornecido para registro");
      throw new Error("Email é obrigatório");
    }
    
    if (!userData.password || userData.password.length < 6) {
      console.error("Senha inválida para registro");
      throw new Error("Senha deve ter pelo menos 6 caracteres");
    }
    
    if (!userData.name || !userData.name.trim()) {
      console.error("Nome não fornecido para registro");
      throw new Error("Nome é obrigatório");
    }
    
    // Registrar o usuário no Supabase Auth
    console.log("Chamando supabase.auth.signUp...");
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          name: userData.name,
        },
      },
    });
    
    if (error) {
      console.error("Erro ao registrar usuário:", error);
      throw error;
    }
    
    if (!data.user) {
      console.error("Usuário não retornado após registro");
      throw new Error("Falha ao criar usuário");
    }
    
    console.log("Usuário registrado com sucesso:", { id: data.user.id, email: data.user.email });
    
    // O perfil será criado automaticamente pelo trigger no Supabase
    
    return { user: data.user };
  } catch (error) {
    console.error("Erro durante o processo de registro:", error);
    throw error;
  }
}

/**
 * Realiza o login do usuário
 */
export async function loginUser(credentials: UserCredentials) {
  console.log("Iniciando login com:", { email: credentials.email });
  
  try {
    // Verificar se os dados necessários foram fornecidos
    if (!credentials.email || !credentials.email.trim()) {
      console.error("Email não fornecido para login");
      throw new Error("Email é obrigatório");
    }
    
    if (!credentials.password || credentials.password.length < 1) {
      console.error("Senha não fornecida para login");
      throw new Error("Senha é obrigatória");
    }
    
    // Realizar o login
    console.log("Chamando supabase.auth.signInWithPassword...");
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });
    
    if (error) {
      console.error("Erro retornado pelo Supabase Auth durante login:", error);
      throw error;
    }
    
    console.log("Resposta do login:", JSON.stringify(data));
    
    if (!data.user) {
      console.error("Login bem-sucedido, mas nenhum usuário retornado");
      throw new Error("Falha ao obter dados do usuário");
    }
    
    console.log("Login bem-sucedido para:", { id: data.user.id, email: data.user.email });
    
    // Verificar se o cookie da sessão foi definido
    console.log("Verificando cookies após login...");
    setTimeout(() => {
      console.log("Cookies disponíveis:", document.cookie);
    }, 500);
    
    return { user: data.user, session: data.session };
  } catch (error) {
    console.error("Erro durante o processo de login:", error);
    throw error;
  }
}

// Função para fazer logout
export async function logoutUser() {
  try {
    console.log('Iniciando processo de logout no Supabase...');
    
    // Limpar qualquer cache de sessão local
    localStorage.removeItem('supabase.auth.token');
    
    // Fazer logout no Supabase
    const { error } = await supabase.auth.signOut({
      scope: 'global' // Desconecta de todas as sessões, não apenas a atual
    });
    
    if (error) {
      console.error('Erro ao fazer logout no Supabase:', error);
      throw error;
    }
    
    console.log('Logout realizado com sucesso no Supabase');
    return true;
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    throw error;
  }
}

// Função para recuperar senha
export async function resetPassword(email: string) {
  try {
    console.log('Enviando email de recuperação de senha para:', email);
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    
    if (error) {
      console.error('Erro ao enviar email de recuperação:', error);
      throw error;
    }
    
    console.log('Email de recuperação enviado com sucesso');
    return data;
  } catch (error) {
    console.error('Erro ao enviar email de recuperação:', error);
    throw error;
  }
}

// Função para atualizar senha
export async function updatePassword(newPassword: string) {
  try {
    console.log('Atualizando senha do usuário');
    
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) {
      console.error('Erro ao atualizar senha:', error);
      throw error;
    }
    
    console.log('Senha atualizada com sucesso');
    return data;
  } catch (error) {
    console.error('Erro ao atualizar senha:', error);
    throw error;
  }
}

/**
 * Obtém os dados do usuário atualmente autenticado
 */
export async function getCurrentUser() {
  console.log("Verificando usuário atual...");
  
  try {
    // Verificar se há uma sessão ativa
    console.log("Verificando sessão...");
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error("Erro ao verificar sessão:", sessionError);
      return { user: null }; // Retornar null em vez de lançar erro
    }
    
    if (!sessionData.session) {
      console.log("Nenhuma sessão ativa encontrada");
      return { user: null };
    }
    
    // Obter dados do usuário
    console.log("Obtendo dados do usuário...");
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error("Erro ao obter dados do usuário:", userError);
      return { user: null }; // Retornar null em vez de lançar erro
    }
    
    if (!userData.user) {
      console.log("Nenhum usuário encontrado na sessão ativa");
      return { user: null };
    }
    
    console.log("Usuário autenticado encontrado:", { id: userData.user.id, email: userData.user.email });
    
    return { user: userData.user };
    
  } catch (error) {
    console.error("Erro ao verificar usuário atual:", error);
    return { user: null }; // Retornar null em vez de lançar erro
  }
}

// Função para listar todos os usuários (apenas para administradores)
export async function listUsers() {
  try {
    console.log('Listando usuários');
    
    // Obter o usuário atual
    const { data: currentUser, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Erro ao obter usuário atual:', userError);
      throw userError;
    }
    
    if (!currentUser?.user?.id) {
      console.error('Usuário não autenticado');
      throw new Error('Usuário não autenticado');
    }
    
    // Verificar se o usuário é super admin
    const { data: adminData, error: adminError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.user.id)
      .single();
    
    if (adminError) {
      console.error('Erro ao verificar perfil do usuário:', adminError);
      throw adminError;
    }
    
    const isSuperAdmin = adminData?.role === 'super_admin';
    
    // Buscar informações de autenticação para verificar email confirmado
    // Usar a API de admin para obter informações detalhadas dos usuários
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Erro ao buscar informações de autenticação:', authError);
      // Não lançamos erro aqui, continuamos com os dados que temos
    }
    
    // Criar um mapa de usuários com informação de email confirmado
    const authUserMap = new Map();
    if (authData?.users) {
      authData.users.forEach(user => {
        authUserMap.set(user.id, {
          email_confirmed_at: user.email_confirmed_at,
          last_sign_in_at: user.last_sign_in_at
        });
      });
    }
    
    if (isSuperAdmin) {
      // Super admin pode ver todos os usuários
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Erro ao listar usuários:', error);
        throw error;
      }
      
      // Adicionar informação de email confirmado
      const enhancedData = data?.map(user => {
        const authInfo = authUserMap.get(user.id);
        return {
          ...user,
          email_confirmed: authInfo?.email_confirmed_at ? true : false,
          last_sign_in: authInfo?.last_sign_in_at
        };
      });
      
      console.log('Usuários listados com sucesso (super admin):', enhancedData?.length || 0);
      return enhancedData || [];
    } else {
      // Usuários normais só podem ver usuários do mesmo time
      // Primeiro, buscar os times do usuário
      const { data: teamMemberships, error: teamError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', currentUser.user.id);
      
      if (teamError) {
        console.error('Erro ao buscar times do usuário:', teamError);
        throw teamError;
      }
      
      if (!teamMemberships || teamMemberships.length === 0) {
        console.log('Usuário não pertence a nenhum time');
        return [];
      }
      
      const teamIds = teamMemberships.map(tm => tm.team_id);
      
      // Buscar todos os membros dos times do usuário com seus papéis
      const { data: teamMembers, error: membersError } = await supabase
        .from('team_members')
        .select('user_id, role, team_id')
        .in('team_id', teamIds);
      
      if (membersError) {
        console.error('Erro ao buscar membros dos times:', membersError);
        throw membersError;
      }
      
      if (!teamMembers || teamMembers.length === 0) {
        console.log('Nenhum membro encontrado nos times do usuário');
        return [];
      }
      
      // Criar um mapa de usuários com seus papéis nos times
      const userRoleMap = new Map();
      teamMembers.forEach(member => {
        // Se o usuário já tem um papel em outro time, usar o papel mais alto
        const existingRole = userRoleMap.get(member.user_id);
        if (!existingRole || getRolePriority(member.role) > getRolePriority(existingRole)) {
          userRoleMap.set(member.user_id, member.role);
        }
      });
      
      const userIds = [...new Set(teamMembers.map(tm => tm.user_id))];
      
      // Buscar os perfis dos usuários
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds)
        .order('created_at', { ascending: false });
      
      if (profilesError) {
        console.error('Erro ao buscar perfis dos usuários:', profilesError);
        throw profilesError;
      }
      
      // Adicionar informação de email confirmado e papel no time
      const enhancedProfiles = profiles?.map(user => {
        const authInfo = authUserMap.get(user.id);
        const teamRole = userRoleMap.get(user.id);
        
        return {
          ...user,
          role: teamRole || user.role || 'member', // Usar o papel no time se disponível
          email_confirmed: authInfo?.email_confirmed_at ? true : false,
          last_sign_in: authInfo?.last_sign_in_at
        };
      });
      
      console.log('Usuários listados com sucesso (time):', enhancedProfiles?.length || 0);
      return enhancedProfiles || [];
    }
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    throw error;
  }
}

// Função auxiliar para determinar a prioridade dos papéis
function getRolePriority(role: string): number {
  switch (role) {
    case 'super_admin': return 5;
    case 'owner': return 4;
    case 'admin': return 3;
    case 'member': return 2;
    case 'guest': return 1;
    default: return 0;
  }
}

// Função para criar um novo usuário (apenas para administradores)
export async function createUser(userData: UserRegistration) {
  try {
    console.log('Criando novo usuário:', userData.email);
    
    // Verificar se o email já existe
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', userData.email)
      .maybeSingle();
    
    if (existingUser) {
      console.error('Email já está em uso:', userData.email);
      throw new Error('Este email já está sendo usado por outro usuário. Por favor, use um email diferente.');
    }
    
    // Obter o usuário atual (que está criando o novo usuário)
    const { data: currentUser, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Erro ao obter usuário atual:', userError);
      throw userError;
    }
    
    if (!currentUser?.user?.id) {
      console.error('Usuário não autenticado');
      throw new Error('Usuário não autenticado');
    }
    
    // Verificar se o usuário atual é super admin
    const { data: adminData, error: adminError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.user.id)
      .single();
    
    if (adminError) {
      console.error('Erro ao verificar perfil do usuário:', adminError);
      throw adminError;
    }
    
    const isSuperAdmin = adminData?.role === 'super_admin';
    
    // Primeiro registramos o usuário no Auth
    const authData = await registerUser(userData);
    
    if (!authData.user) {
      throw new Error('Falha ao criar usuário');
    }
    
    // O perfil será criado automaticamente pelo trigger no Supabase
    // Mas podemos verificar se foi criado corretamente
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    
    if (profileError) {
      console.error('Erro ao verificar perfil do usuário:', profileError);
      // Não lançamos erro aqui, pois o usuário já foi criado
    }
    
    // Se não for super admin, adicionar o novo usuário apenas ao time atual
    if (!isSuperAdmin) {
      // Buscar o time atual do localStorage
      let currentTeamId = null;
      
      if (typeof window !== 'undefined') {
        const storedTeam = localStorage.getItem('currentTeam');
        if (storedTeam) {
          try {
            const teamData = JSON.parse(storedTeam);
            currentTeamId = teamData.id;
          } catch (e) {
            console.error('Erro ao parsear time atual do localStorage:', e);
          }
        }
      }
      
      if (!currentTeamId) {
        // Se não encontrou no localStorage, buscar o primeiro time do usuário
        const { data: teamMemberships, error: teamError } = await supabase
          .from('team_members')
          .select('team_id, role')
          .eq('user_id', currentUser.user.id)
          .order('created_at', { ascending: true })
          .limit(1);
        
        if (teamError) {
          console.error('Erro ao buscar time do usuário:', teamError);
          throw teamError;
        }
        
        if (teamMemberships && teamMemberships.length > 0) {
          currentTeamId = teamMemberships[0].team_id;
        }
      }
      
      if (currentTeamId) {
        // Verificar se o usuário atual é admin ou owner do time
        const { data: membership, error: membershipError } = await supabase
          .from('team_members')
          .select('role')
          .eq('team_id', currentTeamId)
          .eq('user_id', currentUser.user.id)
          .single();
        
        if (membershipError) {
          console.error('Erro ao verificar permissão no time:', membershipError);
          throw membershipError;
        }
        
        if (membership && (membership.role === 'owner' || membership.role === 'admin')) {
          const { error: addError } = await supabase
            .from('team_members')
            .insert({
              team_id: currentTeamId,
              user_id: authData.user.id,
              role: 'member' // Novo usuário sempre começa como membro comum
            });
          
          if (addError) {
            console.error(`Erro ao adicionar usuário ao time ${currentTeamId}:`, addError);
            throw addError;
          } else {
            console.log(`Usuário adicionado ao time ${currentTeamId}`);
          }
        } else {
          console.error('Usuário não tem permissão para adicionar membros ao time');
          throw new Error('Você não tem permissão para adicionar usuários a este time');
        }
      } else {
        console.error('Não foi possível determinar o time atual');
        throw new Error('Não foi possível determinar o time atual');
      }
    }
    
    console.log('Usuário criado com sucesso:', authData);
    return authData;
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    throw error;
  }
}

// Tipos de campos personalizados
export enum CustomFieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  SELECT = 'select',
  CHECKBOX = 'checkbox',
  EMAIL = 'email',
  PHONE = 'phone',
  URL = 'url',
  TEXTAREA = 'textarea'
}

// Interface para definição de campos personalizados
export interface CustomFieldDefinition {
  id?: string;
  team_id: string;
  entity_type: 'lead' | 'company';
  field_name: string;
  display_name: string;
  field_type: CustomFieldType;
  field_options?: { 
    options?: { label: string; value: string }[];
    placeholder?: string;
    default_value?: any;
    min?: number;
    max?: number;
    [key: string]: any;
  };
  is_required: boolean;
  is_visible: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

// Função para listar campos personalizados por tipo de entidade e time
export async function listCustomFields(teamId: string, entityType: 'lead' | 'company'): Promise<CustomFieldDefinition[]> {
  try {
    console.log(`Listando campos personalizados para ${entityType} do time ${teamId}`);
    
    const { data, error } = await supabase
      .from('custom_field_definitions')
      .select('*')
      .eq('team_id', teamId)
      .eq('entity_type', entityType)
      .order('sort_order', { ascending: true });
    
    if (error) {
      console.error(`Erro ao listar campos personalizados para ${entityType}:`, error);
      throw error;
    }
    
    console.log(`${data?.length || 0} campos personalizados encontrados para ${entityType}`);
    return data || [];
  } catch (error) {
    console.error(`Erro ao listar campos personalizados para ${entityType}:`, error);
    throw error;
  }
}

// Função para criar um novo campo personalizado
export async function createCustomField(field: CustomFieldDefinition): Promise<CustomFieldDefinition> {
  try {
    console.log(`Criando campo personalizado ${field.field_name} para ${field.entity_type}`);
    
    // Validar nome do campo (apenas letras, números e underscore)
    const fieldNameRegex = /^[a-zA-Z0-9_]+$/;
    if (!fieldNameRegex.test(field.field_name)) {
      throw new Error('Nome do campo deve conter apenas letras, números e underscore (_)');
    }
    
    // Verificar se já existe um campo com o mesmo nome
    const { data: existingField, error: checkError } = await supabase
      .from('custom_field_definitions')
      .select('id')
      .eq('team_id', field.team_id)
      .eq('entity_type', field.entity_type)
      .eq('field_name', field.field_name)
      .maybeSingle();
    
    if (existingField) {
      throw new Error(`Já existe um campo com o nome "${field.field_name}" para ${field.entity_type}`);
    }
    
    // Criar o campo
    const { data, error } = await supabase
      .from('custom_field_definitions')
      .insert(field)
      .select()
      .single();
    
    if (error) {
      console.error(`Erro ao criar campo personalizado ${field.field_name}:`, error);
      throw error;
    }
    
    console.log(`Campo personalizado ${field.field_name} criado com sucesso:`, data);
    return data;
  } catch (error) {
    console.error(`Erro ao criar campo personalizado ${field.field_name}:`, error);
    throw error;
  }
}

// Função para atualizar um campo personalizado
export async function updateCustomField(fieldId: string, updates: Partial<CustomFieldDefinition>): Promise<CustomFieldDefinition> {
  try {
    console.log(`Atualizando campo personalizado ${fieldId}`);
    
    // Não permitir alterar o nome do campo se já existirem dados
    if (updates.field_name) {
      // Verificar se já existe um campo com o mesmo nome (exceto o próprio campo)
      const { data: existingField, error: checkError } = await supabase
        .from('custom_field_definitions')
        .select('id')
        .eq('team_id', updates.team_id!)
        .eq('entity_type', updates.entity_type!)
        .eq('field_name', updates.field_name)
        .neq('id', fieldId)
        .maybeSingle();
      
      if (existingField) {
        throw new Error(`Já existe um campo com o nome "${updates.field_name}" para ${updates.entity_type}`);
      }
    }
    
    const { data, error } = await supabase
      .from('custom_field_definitions')
      .update(updates)
      .eq('id', fieldId)
      .select()
      .single();
    
    if (error) {
      console.error(`Erro ao atualizar campo personalizado ${fieldId}:`, error);
      throw error;
    }
    
    console.log(`Campo personalizado ${fieldId} atualizado com sucesso:`, data);
    return data;
  } catch (error) {
    console.error(`Erro ao atualizar campo personalizado ${fieldId}:`, error);
    throw error;
  }
}

// Função para excluir um campo personalizado
export async function deleteCustomField(fieldId: string): Promise<void> {
  try {
    console.log(`Excluindo campo personalizado ${fieldId}`);
    
    const { error } = await supabase
      .from('custom_field_definitions')
      .delete()
      .eq('id', fieldId);
    
    if (error) {
      console.error(`Erro ao excluir campo personalizado ${fieldId}:`, error);
      throw error;
    }
    
    console.log(`Campo personalizado ${fieldId} excluído com sucesso`);
  } catch (error) {
    console.error(`Erro ao excluir campo personalizado ${fieldId}:`, error);
    throw error;
  }
}

// Função para reordenar campos personalizados
export async function reorderCustomFields(teamId: string, entityType: 'lead' | 'company', fieldIds: string[]): Promise<void> {
  try {
    console.log(`Reordenando campos personalizados para ${entityType}`);
    
    // Atualizar a ordem de cada campo
    for (let i = 0; i < fieldIds.length; i++) {
      const { error } = await supabase
        .from('custom_field_definitions')
        .update({ sort_order: i })
        .eq('id', fieldIds[i])
        .eq('team_id', teamId)
        .eq('entity_type', entityType);
      
      if (error) {
        console.error(`Erro ao reordenar campo ${fieldIds[i]}:`, error);
        throw error;
      }
    }
    
    console.log(`Campos personalizados para ${entityType} reordenados com sucesso`);
  } catch (error) {
    console.error(`Erro ao reordenar campos personalizados para ${entityType}:`, error);
    throw error;
  }
} 