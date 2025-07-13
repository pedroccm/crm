"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase, checkSupabaseAuth } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthDiagnosticoPage() {
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [cookieInfo, setCookieInfo] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<any>(null);

  useEffect(() => {
    // Exibir informações sobre cookies
    setCookieInfo(document.cookie);
    
    // Verificar sessão e usuário
    checkAuth();
  }, []);

  async function checkAuth() {
    setIsLoading(true);
    try {
      // Verificar sessão
      const { data: sessionData } = await supabase.auth.getSession();
      setSessionInfo(sessionData);
      
      // Verificar usuário
      const { data: userData } = await supabase.auth.getUser();
      setUserInfo(userData);
      
      // Verificar conexão com Supabase Auth
      const result = await checkSupabaseAuth();
      setAuthStatus(result);
    } catch (error) {
      console.error("Erro ao verificar autenticação:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogin() {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "teste@exemplo.com",
        password: "senha123",
      });
      
      if (error) {
        console.error("Erro ao fazer login:", error);
        alert(`Erro ao fazer login: ${error.message}`);
      } else {
        console.log("Login bem-sucedido:", data);
        alert("Login bem-sucedido!");
        checkAuth();
      }
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      alert(`Erro ao fazer login: ${error}`);
    }
  }

  async function handleLogout() {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Erro ao fazer logout:", error);
        alert(`Erro ao fazer logout: ${error.message}`);
      } else {
        console.log("Logout bem-sucedido");
        alert("Logout bem-sucedido!");
        checkAuth();
      }
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      alert(`Erro ao fazer logout: ${error}`);
    }
  }

  function handleRedirect(path: string) {
    window.location.href = path;
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Diagnóstico de Autenticação</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Estado da Autenticação</CardTitle>
            <CardDescription>Informações sobre o estado atual da autenticação</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium">Sessão:</h3>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-auto text-sm">
                    {JSON.stringify(sessionInfo, null, 2) || "Nenhuma sessão encontrada"}
                  </pre>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">Usuário:</h3>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-auto text-sm">
                    {JSON.stringify(userInfo, null, 2) || "Nenhum usuário encontrado"}
                  </pre>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">Cookies:</h3>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-auto text-sm">
                    {cookieInfo || "Nenhum cookie encontrado"}
                  </pre>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">Status do Supabase Auth:</h3>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-auto text-sm">
                    {JSON.stringify(authStatus, null, 2) || "Status não verificado"}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button onClick={() => checkAuth()} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Atualizar Informações"
              )}
            </Button>
            <Button onClick={handleLogin} variant="outline" className="mr-2">
              Testar Login
            </Button>
            <Button onClick={handleLogout} variant="outline" className="mr-2">
              Testar Logout
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Navegação</CardTitle>
            <CardDescription>Navegue para outras páginas do sistema</CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-wrap gap-2">
            <Button onClick={() => handleRedirect("/login")} className="mr-2">
              Ir para Login
            </Button>
            <Button onClick={() => handleRedirect("/dashboard")} className="mr-2">
              Ir para Dashboard
            </Button>
            <Button onClick={() => handleRedirect("/diagnostico")} variant="outline">
              Ir para Diagnóstico Geral
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 