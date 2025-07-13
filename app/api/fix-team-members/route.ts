import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    console.log("Iniciando correção de funções e políticas de team_members");
    
    // Inicializar o cliente Supabase com credenciais de serviço
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Credenciais do Supabase não configuradas");
      return NextResponse.json({
        success: false,
        error: "Credenciais do Supabase não configuradas",
      });
    }

    console.log("Conectando ao Supabase");
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verificar se o usuário está autenticado e é super admin
    console.log("Verificando autenticação do usuário");
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("Usuário não autenticado");
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    // Verificar se o usuário é super admin
    console.log("Verificando se o usuário é super admin");
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_super_admin")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Erro ao verificar perfil do usuário:", profileError);
      return NextResponse.json(
        { success: false, error: "Erro ao verificar perfil do usuário" },
        { status: 403 }
      );
    }

    if (!profile.is_super_admin) {
      console.error("Usuário não é super admin");
      return NextResponse.json(
        { success: false, error: "Apenas super admins podem executar esta operação" },
        { status: 403 }
      );
    }

    // Caminho para o script SQL
    const scriptPath = path.join(process.cwd(), "supabase", "fix_team_members.sql");

    // Verificar se o arquivo existe
    console.log("Verificando se o script SQL existe:", scriptPath);
    if (!fs.existsSync(scriptPath)) {
      console.error("Script SQL não encontrado:", scriptPath);
      return NextResponse.json(
        { success: false, error: "Script SQL não encontrado" },
        { status: 404 }
      );
    }

    // Ler o conteúdo do script SQL
    console.log("Lendo conteúdo do script SQL");
    const sqlScript = fs.readFileSync(scriptPath, "utf8");
    console.log("Tamanho do script SQL:", sqlScript.length, "caracteres");

    // Executar o script SQL
    console.log("Executando script SQL");
    const { data, error } = await supabase.rpc("execute_raw_sql", {
      sql_query: sqlScript,
    });

    if (error) {
      console.error("Erro ao executar script SQL:", error);
      return NextResponse.json(
        { 
          success: false, 
          error: `Erro ao executar script SQL: ${error.message}`,
          details: error
        },
        { status: 500 }
      );
    }

    console.log("Script SQL executado com sucesso");
    return NextResponse.json({
      success: true,
      message: "Funções e políticas de team_members corrigidas com sucesso",
      details: data,
    });
  } catch (error: any) {
    console.error("Erro ao corrigir funções e políticas de team_members:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Erro ao corrigir funções e políticas de team_members: ${error.message}`,
        stack: error.stack
      },
      { status: 500 }
    );
  }
} 