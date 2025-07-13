import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Rotas que não requerem autenticação
const publicRoutes = ["/login", "/registro", "/esqueci-senha", "/reset-password", "/login-debug", "/auth-diagnostico", "/debug"];

// Rotas que devem ser ignoradas pelo middleware
const ignoredRoutes = ["/api", "/_next", "/favicon.ico", "/diagnostico"];

export async function middleware(req: NextRequest) {
  // Middleware completamente desativado para resolver problemas de autenticação
  console.log("Middleware desativado para resolver problemas de autenticação");
  return NextResponse.next();
}

// Configurar quais rotas o middleware deve ser executado
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
} 