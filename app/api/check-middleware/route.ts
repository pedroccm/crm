import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  try {
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
    
    // Verificar se o middleware está desativado
    const isDisabled = middlewareContent.includes("Middleware desativado") || 
                      middlewareContent.includes("return NextResponse.next()");
    
    // Extrair rotas públicas
    const publicRoutesMatch = middlewareContent.match(/const publicRoutes\s*=\s*\[([\s\S]*?)\]/);
    let publicRoutes: string[] = [];
    
    if (publicRoutesMatch && publicRoutesMatch[1]) {
      // Extrair as rotas da string
      const routesString = publicRoutesMatch[1];
      publicRoutes = routesString
        .split(",")
        .map(route => route.trim())
        .filter(route => route.startsWith('"') || route.startsWith("'"))
        .map(route => route.replace(/['"]/g, ""));
    }
    
    return NextResponse.json({
      status: isDisabled ? "disabled" : "enabled",
      publicRoutes,
      code: middlewareContent
    });
  } catch (error: any) {
    console.error("Erro ao verificar middleware:", error);
    
    return NextResponse.json(
      { error: error.message || "Erro ao verificar middleware" },
      { status: 500 }
    );
  }
} 