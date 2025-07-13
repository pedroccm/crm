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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useTeam } from "@/lib/team-context"
import { Eye, EyeOff, Loader2 } from "lucide-react"

interface EvolutionAPIConfig {
  id?: string
  team_id: string
  instance_url: string
  instance_name: string
  api_key: string
  security_token: string
  automation_interval_min: number
  automation_interval_max: number
  typing_animation_interval_min: number
  typing_animation_interval_max: number
  typing_animation_enabled: boolean
}

export default function EvolutionAPIConfigPage() {
  const router = useRouter()
  const { currentTeam } = useTeam()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [showApiKey, setShowApiKey] = useState(false)
  const [showSecurityToken, setShowSecurityToken] = useState(false)
  
  const [config, setConfig] = useState<EvolutionAPIConfig>({
    team_id: currentTeam?.id || "",
    instance_url: "",
    instance_name: "",
    api_key: "",
    security_token: "",
    automation_interval_min: 0,
    automation_interval_max: 0,
    typing_animation_interval_min: 0,
    typing_animation_interval_max: 1,
    typing_animation_enabled: false
  })

  // Carregar configurações existentes
  useEffect(() => {
    if (currentTeam?.id) {
      loadConfig()
    } else {
      setLoadingData(false)
    }
  }, [currentTeam])

  async function loadConfig() {
    try {
      setLoadingData(true)
      
      if (!currentTeam?.id) {
        setLoadingData(false)
        return
      }
      
      // Buscar configuração existente
      const { data, error } = await supabase
        .from('evolution_api_config')
        .select('*')
        .eq('team_id', currentTeam.id)
        .single()
      
      // Se houver erro que não seja "nenhum resultado encontrado"
      if (error && error.code !== 'PGRST116') {
        throw error
      }
      
      // Se encontrou configuração, atualizar o estado
      if (data) {
        setConfig(data)
      }
    } catch (error: any) {
      console.error('Erro ao carregar configurações:', error)
      toast.error(`Erro ao carregar configurações: ${error.message || 'Erro desconhecido'}`)
    } finally {
      setLoadingData(false)
    }
  }

  async function saveConfig() {
    try {
      setLoading(true)
      
      if (!currentTeam?.id) {
        toast.error("Selecione um time para salvar as configurações")
        setLoading(false)
        return
      }
      
      // Validar campos obrigatórios
      if (!config.instance_url || !config.instance_name) {
        toast.error("Preencha todos os campos obrigatórios")
        setLoading(false)
        return
      }
      
      // Preparar dados para salvar
      const configData = {
        ...config,
        team_id: currentTeam.id
      }
      
      // Salvar configurações
      if (config.id) {
        // Atualizar configuração existente
        const { error } = await supabase
          .from('evolution_api_config')
          .update(configData)
          .eq('id', config.id)
        
        if (error) {
          throw error
        }
      } else {
        // Inserir nova configuração
        const { data, error } = await supabase
          .from('evolution_api_config')
          .insert([configData])
          .select()
        
        if (error) {
          throw error
        }
        
        // Atualizar o ID no estado
        if (data && data.length > 0) {
          setConfig(prev => ({
            ...prev,
            id: data[0].id
          }))
        }
      }
      
      toast.success("Configurações salvas com sucesso")
      
      // Redirecionar para a página de configurações
      router.push('/configuracoes')
    } catch (error: any) {
      console.error('Erro ao salvar configurações:', error)
      toast.error(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`)
    } finally {
      setLoading(false)
    }
  }

  function handleChange(field: keyof EvolutionAPIConfig, value: any) {
    // Converter valores numéricos para números
    if (
      field === 'automation_interval_min' || 
      field === 'automation_interval_max' || 
      field === 'typing_animation_interval_min' || 
      field === 'typing_animation_interval_max'
    ) {
      // Garantir que o valor seja um número
      const numValue = typeof value === 'string' ? parseInt(value) || 0 : value;
      
      setConfig(prev => ({
        ...prev,
        [field]: numValue
      }));
      return;
    }
    
    // Converter valores booleanos para boolean
    if (field === 'typing_animation_enabled') {
      const boolValue = Boolean(value);
      
      setConfig(prev => ({
        ...prev,
        [field]: boolValue
      }));
      return;
    }
    
    // Para outros campos, usar o valor diretamente
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
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
                  <BreadcrumbLink href="/configuracoes">Configurações</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Evolution API</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">Configuração da Evolution API</h1>
              <p className="text-sm text-muted-foreground">
                Integre soluções de maneira fácil e prática
              </p>
            </div>
          </div>

          <Tabs defaultValue="autenticacao">
            <TabsList>
              <TabsTrigger value="autenticacao">Autenticação</TabsTrigger>
              <TabsTrigger value="intervalos">Intervalos</TabsTrigger>
            </TabsList>
            
            {/* Aba de Autenticação */}
            <TabsContent value="autenticacao" className="space-y-4 py-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instance_url">URL da instância</Label>
                  <Input
                    id="instance_url"
                    placeholder="URL da instância do Evolution API"
                    value={config.instance_url}
                    onChange={(e) => handleChange('instance_url', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="instance_name">Nome da instância</Label>
                  <Input
                    id="instance_name"
                    placeholder="Nome da instância do Evolution API"
                    value={config.instance_name}
                    onChange={(e) => handleChange('instance_name', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="api_key">Chave de API</Label>
                  <div className="relative">
                    <Input
                      id="api_key"
                      type={showApiKey ? "text" : "password"}
                      placeholder="Acesse o Evolution Manager para obter a Chave de API"
                      value={config.api_key}
                      onChange={(e) => handleChange('api_key', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="security_token">Token de segurança do Evolution API</Label>
                  <div className="relative">
                    <Input
                      id="security_token"
                      type={showSecurityToken ? "text" : "password"}
                      placeholder="Token de segurança do Evolution API"
                      value={config.security_token}
                      onChange={(e) => handleChange('security_token', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecurityToken(!showSecurityToken)}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      {showSecurityToken ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Aba de Intervalos */}
            <TabsContent value="intervalos" className="space-y-4 py-4">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Intervalo de envio das automações</Label>
                  <div className="flex items-center gap-2">
                    <span>Entre</span>
                    <Input
                      type="number"
                      min="0"
                      className="w-16"
                      value={config.automation_interval_min}
                      onChange={(e) => handleChange('automation_interval_min', parseInt(e.target.value) || 0)}
                    />
                    <span>e</span>
                    <Input
                      type="number"
                      min="0"
                      className="w-16"
                      value={config.automation_interval_max}
                      onChange={(e) => handleChange('automation_interval_max', parseInt(e.target.value) || 0)}
                    />
                    <span>segundos</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Evolution API permite a configuração do tempo de espera entre as mensagens enviadas. Por padrão esse intervalo é 0 (inativo). Isso pode ser alterado para evitar bloqueios devido ao envio de mensagens em um curto período de tempo.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Intervalo da animação de "Digitando..."</Label>
                  <div className="flex items-center gap-2">
                    <span>Entre</span>
                    <Input
                      type="number"
                      min="0"
                      className="w-16"
                      value={config.typing_animation_interval_min}
                      onChange={(e) => handleChange('typing_animation_interval_min', parseInt(e.target.value) || 0)}
                    />
                    <span>e</span>
                    <Input
                      type="number"
                      min="0"
                      className="w-16"
                      value={config.typing_animation_interval_max}
                      onChange={(e) => handleChange('typing_animation_interval_max', parseInt(e.target.value) || 1)}
                    />
                    <span>segundos</span>
                    <Switch
                      checked={config.typing_animation_enabled}
                      onCheckedChange={(checked) => handleChange('typing_animation_enabled', checked)}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/configuracoes')}
              disabled={loading}
            >
              Voltar
            </Button>
            <Button
              onClick={saveConfig}
              disabled={loading || !currentTeam?.id}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                "Salvar Configurações"
              )}
            </Button>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 