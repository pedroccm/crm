import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    // Obter dados da requisição
    const { status, publicRoutes } = await req.json();
    
    // Validar dados
    if (!status || !publicRoutes || !Array.isArray(publicRoutes)) {
      return NextResponse.json(
        { error: "Dados inválidos" },
        { status: 400 }
      );
    }
    
    // Caminho para o arquivo middleware.ts
    const middlewarePath = path.join(process.cwd(), "middleware.ts");
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(middlewarePath)) {
      return NextResponse.json(
        { error: "Arquivo middleware.ts não encontrado" },
        { status: 404 }
      );
    }
    
    // Ler o conteúdo do arquivo
    const middlewareContent = fs.readFileSync(middlewarePath, "utf-8");
    
    // Criar backup do arquivo
    const backupPath = path.join(process.cwd(), "middleware.backup.ts");
    fs.writeFileSync(backupPath, middlewareContent);
    
    // Atualizar rotas públicas
    const publicRoutesString = publicRoutes
      .map(route => `"${route}"`)
      .join(", ");
    
    // Substituir rotas públicas no arquivo
    let updatedContent = middlewareContent.replace(
      /const publicRoutes\s*=\s*\[([\s\S]*?)\]/,
      `const publicRoutes = [${publicRoutesString}]`
    );
    
    // Atualizar status do middleware
    if (status === "enabled") {
      // Substituir a função middleware por uma versão ativa
      updatedContent = updatedContent.replace(
        /export async function middleware\(req: NextRequest\) {[\s\S]*?}/,
        `export async function middleware(req: NextRequest) {
  // Obter a URL atual
  const url = req.nextUrl.clone();
  const { pathname } = url;

  // Verificar se a rota é pública ou deve ser ignorada
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  const shouldBeIgnored = ignoredRoutes.some(route => pathname.startsWith(route));

  if (isPublicRoute || shouldBeIgnored) {
    return NextResponse.next();
  }

  // Verificar autenticação
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value;
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // Se não estiver autenticado, redirecionar para o login
  if (!session) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}`
      );
    } else {
      // Substituir a função middleware por uma versão desativada
      updatedContent = updatedContent.replace(
        /export async function middleware\(req: NextRequest\) {[\s\S]*?}/,
        `export async function middleware(req: NextRequest) {
  // Middleware completamente desativado para resolver problemas de autenticação
  console.log("Middleware desativado para resolver problemas de autenticação");
  return NextResponse.next();
}`
      );
    }
    
    // Escrever o conteúdo atualizado no arquivo
    fs.writeFileSync(middlewarePath, updatedContent);
    
    return NextResponse.json({
      success: true,
      status,
      publicRoutes
    });
  } catch (error: any) {
    console.error("Erro ao atualizar middleware:", error);
    
    return NextResponse.json(
      { error: error.message || "Erro ao atualizar middleware" },
      { status: 500 }
    );
  }
} 