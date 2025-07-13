"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useTeam } from "@/lib/team-context"
import { 
  getEvolutionAPIConfig,
  fetchInstances,
  connectInstance,
  restartInstance,
  logoutInstance,
  deleteInstance,
  getConnectionState,
  EvolutionAPIConfig
} from "@/lib/evolution-api-service"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  MessageSquare, 
  RefreshCw, 
  Power, 
  LogOut, 
  Trash2, 
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function ChatEvoConfiguracoesPage() {
  const router = useRouter()
  const { currentTeam } = useTeam()
  const [apiConfig, setApiConfig] = useState<EvolutionAPIConfig | null>(null)
  const [configError, setConfigError] = useState(false)
  const [connectionState, setConnectionState] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingState, setLoadingState] = useState(false)
  const [loadingConnect, setLoadingConnect] = useState(false)
  const [loadingRestart, setLoadingRestart] = useState(false)
  const [loadingLogout, setLoadingLogout] = useState(false)
  const [loadingDelete, setLoadingDelete] = useState(false)

  // Carregar configuração da Evolution API
  useEffect(() => {
    async function loadConfig() {
      if (currentTeam?.id) {
        const config = await getEvolutionAPIConfig(currentTeam.id)
        setApiConfig(config)
        setConfigError(!config)
        
        if (config) {
          await checkConnectionState(config)
        }
      }
    }
    
    loadConfig()
  }, [currentTeam])

  // Verificar o estado da conexão
  async function checkConnectionState(config: EvolutionAPIConfig) {
    try {
      setLoadingState(true)
      
      const result = await getConnectionState(config)
      
      if (result && result.state) {
        setConnectionState(result.state)
      } else {
        setConnectionState('DISCONNECTED')
      }
    } catch (error) {
      console.error('Erro ao verificar estado da conexão:', error)
      setConnectionState('ERROR')
    } finally {
      setLoadingState(false)
    }
  }

  // Conectar instância
  async function handleConnectInstance() {
    if (!apiConfig) return
    
    try {
      setLoadingConnect(true)
      
      await connectInstance(apiConfig)
      
      toast.success("Instância conectada com sucesso!")
      
      // Atualizar o estado da conexão
      await checkConnectionState(apiConfig)
    } catch (error) {
      console.error('Erro ao conectar instância:', error)
      toast.error("Erro ao conectar instância")
    } finally {
      setLoadingConnect(false)
    }
  }

  // Reiniciar instância
  async function handleRestartInstance() {
    if (!apiConfig) return
    
    try {
      setLoadingRestart(true)
      
      await restartInstance(apiConfig)
      
      toast.success("Instância reiniciada com sucesso!")
      
      // Atualizar o estado da conexão
      await checkConnectionState(apiConfig)
    } catch (error) {
      console.error('Erro ao reiniciar instância:', error)
      toast.error("Erro ao reiniciar instância")
    } finally {
      setLoadingRestart(false)
    }
  }

  // Desconectar instância
  async function handleLogoutInstance() {
    if (!apiConfig) return
    
    try {
      setLoadingLogout(true)
      
      await logoutInstance(apiConfig)
      
      toast.success("Instância desconectada com sucesso!")
      
      // Atualizar o estado da conexão
      await checkConnectionState(apiConfig)
    } catch (error) {
      console.error('Erro ao desconectar instância:', error)
      toast.error("Erro ao desconectar instância")
    } finally {
      setLoadingLogout(false)
    }
  }

  // Excluir instância
  async function handleDeleteInstance() {
    if (!apiConfig) return
    
    // Confirmar exclusão
    if (!confirm("Tem certeza que deseja excluir esta instância? Esta ação não pode ser desfeita.")) {
      return
    }
    
    try {
      setLoadingDelete(true)
      
      await deleteInstance(apiConfig)
      
      toast.success("Instância excluída com sucesso!")
      
      // Atualizar o estado da conexão
      setConnectionState('DELETED')
    } catch (error) {
      console.error('Erro ao excluir instância:', error)
      toast.error("Erro ao excluir instância")
    } finally {
      setLoadingDelete(false)
    }
  }

  // Função para obter a cor do status
  function getStatusColor(state: string | null) {
    if (!state) return 'bg-gray-100 text-gray-800'
    
    switch (state.toUpperCase()) {
      case 'CONNECTED':
        return 'bg-green-100 text-green-800'
      case 'CONNECTING':
        return 'bg-yellow-100 text-yellow-800'
      case 'DISCONNECTED':
        return 'bg-red-100 text-red-800'
      case 'DELETED':
        return 'bg-purple-100 text-purple-800'
      case 'ERROR':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Função para obter o ícone do status
  function getStatusIcon(state: string | null) {
    if (!state) return <AlertCircle className="h-4 w-4" />
    
    switch (state.toUpperCase()) {
      case 'CONNECTED':
        return <CheckCircle className="h-4 w-4" />
      case 'CONNECTING':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'DISCONNECTED':
        return <XCircle className="h-4 w-4" />
      case 'DELETED':
        return <Trash2 className="h-4 w-4" />
      case 'ERROR':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/chat-evo">Chat Evo</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Configurações</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">Configurações do Chat Evo</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie as configurações da instância da Evolution API
              </p>
            </div>
          </div>

          {configError ? (
            <div className="flex flex-col items-center justify-center w-full p-8">
              <Alert className="max-w-md">
                <MessageSquare className="h-4 w-4" />
                <AlertTitle>Configuração não encontrada</AlertTitle>
                <AlertDescription>
                  Para usar o Chat Evo, você precisa configurar a Evolution API primeiro.
                </AlertDescription>
              </Alert>
              <Button 
                className="mt-4"
                onClick={() => router.push('/configuracoes/evolution-api')}
              >
                Configurar Evolution API
              </Button>
            </div>
          ) : (
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Status da Instância</CardTitle>
                    <div className={`px-2 py-1 rounded-full flex items-center gap-1 text-xs ${getStatusColor(connectionState)}`}>
                      {getStatusIcon(connectionState)}
                      <span>{connectionState || 'Desconhecido'}</span>
                    </div>
                  </div>
                  <CardDescription>
                    Gerencie o estado da sua instância da Evolution API
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Button
                      variant="outline"
                      className="flex flex-col items-center justify-center h-24 gap-2"
                      onClick={handleConnectInstance}
                      disabled={loadingConnect || connectionState === 'CONNECTED'}
                    >
                      {loadingConnect ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <Power className="h-6 w-6" />
                      )}
                      <span>Conectar</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="flex flex-col items-center justify-center h-24 gap-2"
                      onClick={handleRestartInstance}
                      disabled={loadingRestart || connectionState === 'DISCONNECTED'}
                    >
                      {loadingRestart ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <RefreshCw className="h-6 w-6" />
                      )}
                      <span>Reiniciar</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="flex flex-col items-center justify-center h-24 gap-2"
                      onClick={handleLogoutInstance}
                      disabled={loadingLogout || connectionState === 'DISCONNECTED'}
                    >
                      {loadingLogout ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <LogOut className="h-6 w-6" />
                      )}
                      <span>Desconectar</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="flex flex-col items-center justify-center h-24 gap-2 text-destructive hover:text-destructive"
                      onClick={handleDeleteInstance}
                      disabled={loadingDelete}
                    >
                      {loadingDelete ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <Trash2 className="h-6 w-6" />
                      )}
                      <span>Excluir</span>
                    </Button>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <p className="text-sm text-muted-foreground">
                    Última verificação: {new Date().toLocaleTimeString()}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => apiConfig && checkConnectionState(apiConfig)}
                    disabled={loadingState}
                  >
                    {loadingState ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Atualizar
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Informações da Instância</CardTitle>
                  <CardDescription>
                    Detalhes da sua instância da Evolution API
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>URL da Instância</Label>
                        <Input
                          value={apiConfig?.instance_url || ''}
                          readOnly
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nome da Instância</Label>
                        <Input
                          value={apiConfig?.instance_name || ''}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/configuracoes/evolution-api')}
                  >
                    Editar Configurações
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 