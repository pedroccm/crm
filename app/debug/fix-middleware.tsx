"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function FixMiddlewareComponent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [middlewareStatus, setMiddlewareStatus] = useState<"enabled" | "disabled" | "unknown">("unknown");
  const [publicRoutes, setPublicRoutes] = useState<string[]>([
    "/login", 
    "/registro", 
    "/esqueci-senha", 
    "/reset-password", 
    "/login-debug", 
    "/auth-diagnostico", 
    "/debug"
  ]);
  const [newRoute, setNewRoute] = useState("");
  const [middlewareCode, setMiddlewareCode] = useState("");

  const checkMiddleware = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      // Simular verificação do middleware
      // Em um ambiente real, você poderia fazer uma chamada para uma API que verifica o status do middleware
      const response = await fetch("/api/check-middleware");
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setMiddlewareStatus(data.status);
      setPublicRoutes(data.publicRoutes || publicRoutes);
      setMiddlewareCode(data.code || "");
      
      setSuccess(true);
    } catch (err: any) {
      console.error("Erro ao verificar middleware:", err);
      setError(err.message || "Erro ao verificar middleware");
      
      // Fallback para simulação
      setMiddlewareStatus("disabled");
      setMiddlewareCode(`
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
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleMiddleware = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const newStatus = middlewareStatus === "enabled" ? "disabled" : "enabled";
      
      // Simular atualização do middleware
      // Em um ambiente real, você faria uma chamada para uma API que atualiza o middleware
      const response = await fetch("/api/update-middleware", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          publicRoutes,
        }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setMiddlewareStatus(newStatus);
      setSuccess(true);
    } catch (err: any) {
      console.error("Erro ao atualizar middleware:", err);
      setError(err.message || "Erro ao atualizar middleware");
      
      // Simular atualização para demonstração
      setMiddlewareStatus(middlewareStatus === "enabled" ? "disabled" : "enabled");
    } finally {
      setLoading(false);
    }
  };

  const addPublicRoute = () => {
    if (!newRoute.trim()) return;
    
    if (!newRoute.startsWith("/")) {
      setError("A rota deve começar com '/'");
      return;
    }
    
    if (publicRoutes.includes(newRoute)) {
      setError("Esta rota já está na lista");
      return;
    }
    
    setPublicRoutes([...publicRoutes, newRoute]);
    setNewRoute("");
    setError(null);
  };

  const removePublicRoute = (route: string) => {
    setPublicRoutes(publicRoutes.filter(r => r !== route));
  };

  const updatePublicRoutes = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      // Simular atualização das rotas públicas
      // Em um ambiente real, você faria uma chamada para uma API que atualiza o middleware
      const response = await fetch("/api/update-middleware", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: middlewareStatus,
          publicRoutes,
        }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setSuccess(true);
    } catch (err: any) {
      console.error("Erro ao atualizar rotas públicas:", err);
      setError(err.message || "Erro ao atualizar rotas públicas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Diagnóstico do Middleware</CardTitle>
        <CardDescription>
          Verifique e corrija problemas com o middleware de autenticação
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="status">
          <TabsList className="mb-4">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="routes">Rotas Públicas</TabsTrigger>
            <TabsTrigger value="code">Código</TabsTrigger>
          </TabsList>
          
          <TabsContent value="status">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-md">
                <div>
                  <h3 className="text-lg font-medium">Status do Middleware</h3>
                  <p className="text-sm text-gray-500">
                    {middlewareStatus === "enabled" && "O middleware está ativado e verificando autenticação"}
                    {middlewareStatus === "disabled" && "O middleware está desativado (não verifica autenticação)"}
                    {middlewareStatus === "unknown" && "Status do middleware desconhecido"}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="middleware-status" 
                    checked={middlewareStatus === "enabled"}
                    onCheckedChange={toggleMiddleware}
                    disabled={loading || middlewareStatus === "unknown"}
                  />
                  <Label htmlFor="middleware-status">
                    {middlewareStatus === "enabled" ? "Ativado" : "Desativado"}
                  </Label>
                </div>
              </div>
              
              <Button onClick={checkMiddleware} disabled={loading} variant="outline">
                Verificar Status do Middleware
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="routes">
            <div className="space-y-4">
              <div className="p-4 border rounded-md">
                <h3 className="text-lg font-medium mb-2">Rotas Públicas</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Estas rotas não requerem autenticação
                </p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {publicRoutes.map(route => (
                    <div key={route} className="flex items-center bg-gray-100 px-3 py-1 rounded-full text-sm">
                      <span>{route}</span>
                      <button 
                        className="ml-2 text-gray-500 hover:text-red-500"
                        onClick={() => removePublicRoute(route)}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Nova rota pública (ex: /minha-rota)"
                    value={newRoute}
                    onChange={(e) => setNewRoute(e.target.value)}
                    className="h-10"
                  />
                  <Button onClick={addPublicRoute} disabled={!newRoute.trim()}>
                    Adicionar
                  </Button>
                </div>
              </div>
              
              <Button onClick={updatePublicRoutes} disabled={loading}>
                Atualizar Rotas Públicas
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="code">
            <div className="space-y-4">
              <div className="p-4 border rounded-md">
                <h3 className="text-lg font-medium mb-2">Código do Middleware</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Visualize o código atual do middleware
                </p>
                
                <Textarea
                  value={middlewareCode}
                  readOnly
                  className="min-h-[300px] font-mono text-sm"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mt-4 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-700">Sucesso</AlertTitle>
            <AlertDescription className="text-green-600">
              Operação concluída com sucesso!
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <div className="text-sm text-gray-500">
          O middleware controla a autenticação em todas as rotas da aplicação.
        </div>
      </CardFooter>
    </Card>
  );
} 