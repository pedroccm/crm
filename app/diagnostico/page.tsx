"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { checkSupabaseConnection, checkActivitiesRLS, checkSupabaseAuth } from "@/lib/supabase"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import AppLayout from "@/components/app-layout"
import { useAuth } from "@/lib/auth-context"

export default function DiagnosticoPage() {
  const { user, loading } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [authResults, setAuthResults] = useState<any>(null)
  const [rlsResults, setRlsResults] = useState<any>(null)
  const [authStatus, setAuthStatus] = useState<any>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [cookieInfo, setCookieInfo] = useState<string>("")
  
  useEffect(() => {
    // Exibir informações sobre cookies
    setCookieInfo(document.cookie)
  }, [])

  async function runDiagnostics() {
    setIsLoading(true)
    try {
      // Verificar conexão básica com o Supabase
      const connectionResult = await checkSupabaseConnection()
      
      // Verificar autenticação do Supabase
      const authResult = await checkSupabaseAuth()
      
      // Verificar políticas de segurança das atividades
      const rlsResult = await checkActivitiesRLS()
      
      setResults(connectionResult)
      setAuthResults(authResult)
      setRlsResults(rlsResult)
    } catch (error) {
      console.error("Erro ao executar diagnósticos:", error)
    } finally {
      setIsLoading(false)
    }
  }

  async function checkAuth() {
    setIsChecking(true)
    try {
      const result = await checkSupabaseAuth()
      setAuthStatus(result)
    } catch (error) {
      console.error("Erro ao verificar autenticação:", error)
      setAuthStatus({ success: false, error })
    } finally {
      setIsChecking(false)
    }
  }

  function handleRedirect() {
    window.location.href = "/dashboard"
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-4 md:p-8">
        <div>
          <h1 className="text-2xl font-bold">Diagnóstico do Sistema</h1>
          <p className="text-muted-foreground">Verifique a conexão com o Supabase e as configurações do sistema</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Verificação de Conexão</CardTitle>
            <CardDescription>
              Verifique se o sistema está conectado corretamente ao Supabase
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={runDiagnostics} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Executar Diagnóstico"
              )}
            </Button>
            
            {results && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0">
                    {results.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">Conexão com Supabase</h3>
                    <p className="text-sm text-muted-foreground">{results.message}</p>
                  </div>
                </div>
                
                {results.data && (
                  <div className="rounded-md bg-muted p-4">
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(results.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
            
            {authResults && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0">
                    {authResults.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">Autenticação Supabase</h3>
                    <p className="text-sm text-muted-foreground">{authResults.message}</p>
                  </div>
                </div>
                
                {authResults.error && (
                  <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                    <h4 className="font-medium text-red-600 dark:text-red-400">Erro:</h4>
                    <pre className="text-xs overflow-auto text-red-600 dark:text-red-400">
                      {JSON.stringify(authResults.error, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
            
            {rlsResults && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0">
                    {rlsResults.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">Políticas de Segurança (RLS)</h3>
                    <p className="text-sm text-muted-foreground">{rlsResults.message}</p>
                  </div>
                </div>
                
                {rlsResults.details && (
                  <div className="rounded-md bg-muted p-4">
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(rlsResults.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Estado da Autenticação</CardTitle>
            <CardDescription>Informações sobre o estado atual da autenticação</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Status de Carregamento:</h3>
                <p>{loading ? "Carregando..." : "Carregamento concluído"}</p>
              </div>
              
              <div>
                <h3 className="font-medium">Usuário Autenticado:</h3>
                <p>{user ? "Sim" : "Não"}</p>
              </div>
              
              {user && (
                <div className="space-y-2">
                  <h3 className="font-medium">Detalhes do Usuário:</h3>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-auto text-sm">
                    {JSON.stringify(user, null, 2)}
                  </pre>
                </div>
              )}
              
              <div className="space-y-2">
                <h3 className="font-medium">Cookies:</h3>
                <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-auto text-sm">
                  {cookieInfo || "Nenhum cookie encontrado"}
                </pre>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleRedirect} className="mr-2">
              Ir para Dashboard
            </Button>
            <Button variant="outline" onClick={() => window.location.href = "/login"}>
              Ir para Login
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Verificação do Supabase Auth</CardTitle>
            <CardDescription>Verifica a conexão com o Supabase Auth</CardDescription>
          </CardHeader>
          <CardContent>
            {isChecking ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : authStatus ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">Status:</h3>
                  <p className={authStatus.success ? "text-green-600" : "text-red-600"}>
                    {authStatus.success ? "Sucesso" : "Falha"}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium">Mensagem:</h3>
                  <p>{authStatus.message}</p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">Detalhes:</h3>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-auto text-sm">
                    {JSON.stringify(authStatus, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <p>Clique no botão abaixo para verificar a conexão com o Supabase Auth</p>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={checkAuth} disabled={isChecking}>
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Verificar Conexão"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AppLayout>
  )
} 