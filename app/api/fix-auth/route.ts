import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({
      success: false,
      error: "Credenciais do Supabase não configuradas",
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const errors: string[] = [];
  const fixes: string[] = [];

  try {
    // 1. Verificar configurações de cookies
    console.log("Verificando configurações de cookies...");
    const { data: cookieConfig, error: cookieError } = await supabase.from("auth.config").select("*");
    
    if (cookieError) {
      console.error("Erro ao verificar configurações de cookies:", cookieError);
      errors.push(`Erro ao verificar cookies: ${cookieError.message}`);
    } else {
      fixes.push("Verificação de cookies concluída");
    }

    // 2. Atualizar configurações de cookies
    console.log("Atualizando configurações de cookies...");
    const { error: updateCookieError } = await supabase.rpc("set_auth_cookie_settings", {
      same_site: "lax",
      secure: false, // Definir como false para desenvolvimento local
      http_only: true,
    });

    if (updateCookieError) {
      console.error("Erro ao atualizar configurações de cookies:", updateCookieError);
      errors.push(`Erro ao atualizar cookies: ${updateCookieError.message}`);
    } else {
      fixes.push("Configurações de cookies atualizadas");
    }

    // 3. Verificar configurações atualizadas
    console.log("Verificando configurações atualizadas...");
    const { data: updatedConfig, error: verifyError } = await supabase.from("auth.config").select("*");
    
    if (verifyError) {
      console.error("Erro ao verificar configurações atualizadas:", verifyError);
      errors.push(`Erro ao verificar configurações: ${verifyError.message}`);
    } else {
      fixes.push("Verificação de configurações atualizadas concluída");
    }

    // 4. Verificar políticas de segurança para a tabela profiles
    console.log("Verificando políticas de segurança para profiles...");
    const { data: policies, error: policiesError } = await supabase.rpc("get_policies_for_table", {
      table_name: "profiles",
    });

    if (policiesError) {
      console.error("Erro ao verificar políticas:", policiesError);
      errors.push(`Erro ao verificar políticas: ${policiesError.message}`);
    } else {
      fixes.push("Verificação de políticas concluída");
    }

    // 5. Remover políticas existentes e criar novas
    console.log("Removendo políticas existentes para profiles...");
    const { error: dropPoliciesError } = await supabase.rpc("drop_all_policies_for_table", {
      table_name: "profiles",
    });

    if (dropPoliciesError) {
      console.error("Erro ao remover políticas:", dropPoliciesError);
      errors.push(`Erro ao remover políticas: ${dropPoliciesError.message}`);
    } else {
      fixes.push("Políticas existentes removidas");
    }

    // 6. Habilitar RLS para a tabela profiles
    console.log("Habilitando RLS para profiles...");
    const { error: enableRlsError } = await supabase.rpc("enable_rls_for_table", {
      table_name: "profiles",
    });

    if (enableRlsError) {
      console.error("Erro ao habilitar RLS:", enableRlsError);
      errors.push(`Erro ao habilitar RLS: ${enableRlsError.message}`);
    } else {
      fixes.push("RLS habilitado para profiles");
    }

    // 7. Criar políticas simplificadas
    console.log("Criando políticas simplificadas...");
    
    // Política para visualização
    const { error: viewPolicyError } = await supabase.rpc("create_policy_for_table", {
      table_name: "profiles",
      policy_name: "Profiles are viewable by everyone",
      policy_definition: "true",
      policy_operation: "SELECT",
    });

    if (viewPolicyError) {
      console.error("Erro ao criar política de visualização:", viewPolicyError);
      errors.push(`Erro ao criar política de visualização: ${viewPolicyError.message}`);
    } else {
      fixes.push("Política de visualização criada");
    }

    // Política para inserção
    const { error: insertPolicyError } = await supabase.rpc("create_policy_for_table", {
      table_name: "profiles",
      policy_name: "Profiles can be inserted by authenticated users",
      policy_definition: "auth.uid() = id",
      policy_operation: "INSERT",
    });

    if (insertPolicyError) {
      console.error("Erro ao criar política de inserção:", insertPolicyError);
      errors.push(`Erro ao criar política de inserção: ${insertPolicyError.message}`);
    } else {
      fixes.push("Política de inserção criada");
    }

    // Política para atualização
    const { error: updatePolicyError } = await supabase.rpc("create_policy_for_table", {
      table_name: "profiles",
      policy_name: "Profiles can be updated by the owner",
      policy_definition: "auth.uid() = id",
      policy_operation: "UPDATE",
    });

    if (updatePolicyError) {
      console.error("Erro ao criar política de atualização:", updatePolicyError);
      errors.push(`Erro ao criar política de atualização: ${updatePolicyError.message}`);
    } else {
      fixes.push("Política de atualização criada");
    }

    // Política para exclusão
    const { error: deletePolicyError } = await supabase.rpc("create_policy_for_table", {
      table_name: "profiles",
      policy_name: "Profiles can be deleted by the owner",
      policy_definition: "auth.uid() = id",
      policy_operation: "DELETE",
    });

    if (deletePolicyError) {
      console.error("Erro ao criar política de exclusão:", deletePolicyError);
      errors.push(`Erro ao criar política de exclusão: ${deletePolicyError.message}`);
    } else {
      fixes.push("Política de exclusão criada");
    }

    // 8. Verificar e recriar trigger para criação automática de perfil
    console.log("Verificando trigger para criação automática de perfil...");
    const { data: triggers, error: triggersError } = await supabase.rpc("get_triggers_for_table", {
      table_name: "profiles",
    });

    if (triggersError) {
      console.error("Erro ao verificar triggers:", triggersError);
      errors.push(`Erro ao verificar triggers: ${triggersError.message}`);
    } else {
      fixes.push("Verificação de triggers concluída");
    }

    // 9. Recriar trigger para criação automática de perfil
    console.log("Recriando trigger para criação automática de perfil...");
    const { error: recreateTriggerError } = await supabase.rpc("recreate_profile_trigger");

    if (recreateTriggerError) {
      console.error("Erro ao recriar trigger:", recreateTriggerError);
      errors.push(`Erro ao recriar trigger: ${recreateTriggerError.message}`);
    } else {
      fixes.push("Trigger recriado com sucesso");
    }

    // 10. Conceder permissões necessárias
    console.log("Concedendo permissões necessárias...");
    const { error: grantPermissionsError } = await supabase.rpc("grant_permissions_on_profiles");

    if (grantPermissionsError) {
      console.error("Erro ao conceder permissões:", grantPermissionsError);
      errors.push(`Erro ao conceder permissões: ${grantPermissionsError.message}`);
    } else {
      fixes.push("Permissões concedidas com sucesso");
    }

    return NextResponse.json({
      success: errors.length === 0,
      fixes,
      errors: errors.length > 0 ? errors : null,
      cookieConfig: updatedConfig || cookieConfig,
    });
  } catch (error: any) {
    console.error("Erro ao corrigir configurações de autenticação:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Erro desconhecido ao corrigir configurações de autenticação",
    });
  }
} 