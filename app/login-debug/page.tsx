"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function LoginDebugPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [fixingAuth, setFixingAuth] = useState(false);
  const [fixAuthResult, setFixAuthResult] = useState<any>(null);
  const router = useRouter();

  const handleDirectLogin = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log("Tentando login direto com Supabase...");
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        throw error;
      }
      
      console.log("Login direto bem-sucedido:", data);
      setSuccess("Login realizado com sucesso!");
      setSessionInfo(data);
      
      // Definir flag de debug no localStorage
      localStorage.setItem("debug_mode", "true");
      
      // Redirecionar após 2 segundos
      setTimeout(() => {
        router.push("/debug");
      }, 2000);
      
    } catch (err: any) {
      console.error("Erro no login direto:", err);
      setError(err.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  const checkSession = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log("Verificando sessão atual...");
      
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        throw error;
      }
      
      console.log("Dados da sessão:", data);
      
      if (data.session) {
        setSuccess("Sessão ativa encontrada!");
        setSessionInfo(data);
        
        // Definir flag de debug no localStorage
        localStorage.setItem("debug_mode", "true");
      } else {
        setError("Nenhuma sessão ativa encontrada");
      }
      
    } catch (err: any) {
      console.error("Erro ao verificar sessão:", err);
      setError(err.message || "Erro ao verificar sessão");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log("Realizando logout...");
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      console.log("Logout realizado com sucesso");
      setSuccess("Logout realizado com sucesso!");
      setSessionInfo(null);
      
      // Remover flag de debug do localStorage
      localStorage.removeItem("debug_mode");
      
    } catch (err: any) {
      console.error("Erro ao fazer logout:", err);
      setError(err.message || "Erro ao fazer logout");
    } finally {
      setLoading(false);
    }
  };

  const fixAuthIssues = async () => {
    setFixingAuth(true);
    setError(null);
    setSuccess(null);
    setFixAuthResult(null);
    
    try {
      console.log("Corrigindo problemas de autenticação...");
      
      const response = await fetch("/api/fix-auth");
      const result = await response.json();
      
      console.log("Resultado da correção:", result);
      setFixAuthResult(result);
      
      if (result.success) {
        setSuccess("Configurações de autenticação corrigidas com sucesso!");
      } else {
        setError("Erro ao corrigir configurações de autenticação");
      }
      
    } catch (err: any) {
      console.error("Erro ao corrigir autenticação:", err);
      setError(err.message || "Erro ao corrigir autenticação");
    } finally {
      setFixingAuth(false);
    }
  };

  useEffect(() => {
    // Verificar sessão ao carregar a página
    checkSession();
  }, []);

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Login Debug</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Login Direto</CardTitle>
            <CardDescription>
              Tenta fazer login diretamente com o Supabase, sem usar o contexto de autenticação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button onClick={handleDirectLogin} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Login Direto"
              )}
            </Button>
            <Button variant="outline" onClick={checkSession} disabled={loading}>
              Verificar Sessão
            </Button>
            <Button variant="destructive" onClick={handleLogout} disabled={loading}>
              Logout
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Corrigir Problemas de Autenticação</CardTitle>
            <CardDescription>
              Corrige problemas comuns de autenticação, como políticas de segurança e configurações de cookies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Atenção</AlertTitle>
                <AlertDescription>
                  Use esta opção se estiver enfrentando problemas de login em loop ou erros de autenticação.
                </AlertDescription>
              </Alert>
              
              <Button 
                className="w-full" 
                onClick={fixAuthIssues} 
                disabled={fixingAuth}
              >
                {fixingAuth ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Corrigindo...
                  </>
                ) : (
                  "Corrigir Problemas de Autenticação"
                )}
              </Button>
              
              {fixAuthResult && (
                <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-md">
                  <h3 className="font-medium mb-2">Resultado:</h3>
                  <pre className="text-xs overflow-auto max-h-40">
                    {JSON.stringify(fixAuthResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" onClick={() => router.push("/debug")}>
              Ir para Página de Debug
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mt-6">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert variant="default" className="mt-6 bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-800">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle>Sucesso</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      
      {sessionInfo && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Informações da Sessão</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto max-h-60 bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
              {JSON.stringify(sessionInfo, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 