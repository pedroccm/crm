"use client"

import { useEffect, useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageSquare, Phone, Bell, Clock, RefreshCw, Copy, Eye, Plus, Save, Key, Info } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { 
  WhatsAppSettings, 
  defaultWhatsAppSettings, 
  fetchWhatsAppSettings, 
  saveWhatsAppSettings 
} from "@/lib/whatsapp-settings-service"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function ChatConfigPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [whatsappSettings, setWhatsappSettings] = useState<WhatsAppSettings>(defaultWhatsAppSettings)

  // Buscar configurações ao carregar a página
  useEffect(() => {
    const loadSettings = async () => {
      setIsFetching(true)
      try {
        const settings = await fetchWhatsAppSettings()
        if (settings) {
          setWhatsappSettings(settings)
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error)
        toast({
          variant: "destructive",
          description: "Erro ao carregar configurações. Tente novamente.",
        })
      } finally {
        setIsFetching(false)
      }
    }

    loadSettings()
  }, [toast])

  // Função para salvar as configurações no Supabase
  const handleSaveSettings = async () => {
    // Se já estiver carregando, não faz nada para evitar múltiplas chamadas
    if (isLoading) return;
    
    setIsLoading(true)
    
    try {
      const success = await saveWhatsAppSettings(whatsappSettings)
      
      if (success) {
        toast({
          description: "Configurações do WhatsApp atualizadas com sucesso",
        })
      } else {
        throw new Error("Falha ao salvar configurações")
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      toast({
        variant: "destructive",
        description: "Erro ao salvar configurações. Tente novamente.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Função para atualizar um campo específico das configurações
  const updateSetting = (field: keyof WhatsAppSettings, value: any) => {
    setWhatsappSettings(prev => ({
      ...prev,
      [field]: value
    }))
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
                  <BreadcrumbLink href="/chat">Chat</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Configurações</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex-1 space-y-8 p-8 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Configurações do Chat</h2>
              <p className="text-muted-foreground">
                Gerencie as configurações de integração com WhatsApp e outras plataformas de mensagens.
              </p>
            </div>
            <Button 
              type="button"
              onClick={handleSaveSettings} 
              disabled={isLoading || isFetching}
            >
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar alterações
                </>
              )}
            </Button>
          </div>

          <Tabs defaultValue="whatsapp" className="space-y-6">
            <TabsList className="bg-background">
              <TabsTrigger value="whatsapp" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                WhatsApp
              </TabsTrigger>
              <TabsTrigger value="api" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                API
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notificações
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Templates
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="whatsapp" className="space-y-6">
              {isFetching ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                </div>
              ) : (
                <>
                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle>Configurações do WhatsApp Business</CardTitle>
                      <CardDescription>
                        Configure as opções de integração com a API do WhatsApp Business.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="phone_number">Número de telefone</Label>
                          <Input 
                            id="phone_number" 
                            value={whatsappSettings.phone_number || ""} 
                            onChange={(e) => updateSetting('phone_number', e.target.value)}
                            placeholder="+55 (11) 98765-4321"
                          />
                          <p className="text-xs text-muted-foreground">
                            Este é o número de telefone verificado na sua conta do WhatsApp Business.
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="business_name">Nome da empresa</Label>
                          <Input 
                            id="business_name" 
                            value={whatsappSettings.business_name || ""} 
                            onChange={(e) => updateSetting('business_name', e.target.value)}
                            placeholder="Gaia CRM"
                          />
                          <p className="text-xs text-muted-foreground">
                            Nome da empresa registrado no WhatsApp Business.
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="webhook_url">URL do Webhook</Label>
                        <div className="flex gap-2">
                          <Input 
                            id="webhook_url" 
                            value={whatsappSettings.webhook_url || "https://gaia-crm.vercel.app/api/whatsapp/webhook"} 
                            onChange={(e) => updateSetting('webhook_url', e.target.value)}
                            className="flex-1"
                          />
                          <Button variant="outline" size="icon" onClick={() => {
                            navigator.clipboard.writeText(whatsappSettings.webhook_url || "https://gaia-crm.vercel.app/api/whatsapp/webhook");
                            toast({
                              description: "URL do webhook copiada para a área de transferência",
                            })
                          }}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Configure esta URL no painel do Facebook Developer para receber mensagens.
                        </p>
                      </div>
                      
                      <Separator className="my-4" />
                      
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="auto_reply">Resposta automática</Label>
                            <p className="text-sm text-muted-foreground">
                              Enviar mensagem automática quando receber uma nova mensagem.
                            </p>
                          </div>
                          <Switch 
                            id="auto_reply" 
                            checked={whatsappSettings.auto_reply}
                            onCheckedChange={(checked) => updateSetting('auto_reply', checked)}
                          />
                        </div>

                        {whatsappSettings.auto_reply && (
                          <div className="space-y-2 pl-6 border-l-2 border-muted">
                            <Label htmlFor="auto_reply_message">Mensagem automática</Label>
                            <Input 
                              id="auto_reply_message" 
                              value={whatsappSettings.auto_reply_message} 
                              onChange={(e) => updateSetting('auto_reply_message', e.target.value)}
                              placeholder="Olá! Obrigado por entrar em contato. Responderemos sua mensagem o mais breve possível."
                            />
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="business_hours">Horário comercial</Label>
                            <p className="text-sm text-muted-foreground">
                              Responder apenas durante o horário comercial.
                            </p>
                          </div>
                          <Switch 
                            id="business_hours" 
                            checked={whatsappSettings.business_hours}
                            onCheckedChange={(checked) => updateSetting('business_hours', checked)}
                          />
                        </div>

                        {whatsappSettings.business_hours && (
                          <div className="grid grid-cols-2 gap-4 pl-6 border-l-2 border-muted">
                            <div className="space-y-2">
                              <Label htmlFor="business_hours_start">Início</Label>
                              <Input 
                                id="business_hours_start" 
                                type="time"
                                value={whatsappSettings.business_hours_start} 
                                onChange={(e) => updateSetting('business_hours_start', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="business_hours_end">Término</Label>
                              <Input 
                                id="business_hours_end" 
                                type="time"
                                value={whatsappSettings.business_hours_end} 
                                onChange={(e) => updateSetting('business_hours_end', e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="notify">Notificações</Label>
                            <p className="text-sm text-muted-foreground">
                              Receber notificações de novas mensagens.
                            </p>
                          </div>
                          <Switch 
                            id="notify" 
                            checked={whatsappSettings.notify_new_messages}
                            onCheckedChange={(checked) => updateSetting('notify_new_messages', checked)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="sync_interval">Intervalo de sincronização</Label>
                            <div className="flex items-center gap-2">
                              <RefreshCw className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{whatsappSettings.sync_interval} segundos</span>
                            </div>
                          </div>
                          <input
                            id="sync_interval"
                            type="range"
                            min="10"
                            max="60"
                            step="5"
                            value={whatsappSettings.sync_interval}
                            onChange={(e) => updateSetting('sync_interval', parseInt(e.target.value))}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>10s</span>
                            <span>30s</span>
                            <span>60s</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle>Status da conexão</CardTitle>
                      <CardDescription>
                        Verifique o status da conexão com a API do WhatsApp Business.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-green-500"></div>
                          <span className="font-medium">Conectado</span>
                          <span className="text-sm text-muted-foreground">- Última verificação: há 5 minutos</span>
                        </div>
                        
                        <div className="grid gap-6 rounded-lg border p-6 md:grid-cols-3">
                          <div>
                            <p className="text-sm font-medium">Mensagens enviadas hoje</p>
                            <p className="text-2xl font-bold">24</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Mensagens recebidas hoje</p>
                            <p className="text-2xl font-bold">18</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Taxa de entrega</p>
                            <p className="text-2xl font-bold">98%</p>
                          </div>
                        </div>
                        
                        <Button variant="outline" className="w-full">
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Verificar conexão
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="api" className="space-y-6">
              {isFetching ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                </div>
              ) : (
                <Card className="border shadow-sm">
                  <CardHeader>
                    <CardTitle>Configurações da API do WhatsApp Business</CardTitle>
                    <CardDescription>
                      Configure as credenciais da API do WhatsApp Business para envio e recebimento de mensagens.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="phone_number_id">ID do Número de Telefone</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">O ID do número de telefone encontrado no Facebook Developer Portal. Exemplo: 609710445550899</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Input 
                        id="phone_number_id" 
                        value={whatsappSettings.phone_number_id || ""} 
                        onChange={(e) => updateSetting('phone_number_id', e.target.value)}
                        placeholder="609710445550899"
                      />
                      <p className="text-xs text-muted-foreground">
                        Encontrado no Facebook Developer Portal, na seção WhatsApp &gt; Configuração.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="business_account_id">ID da Conta de Negócios</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">O ID da conta de negócios do WhatsApp. Exemplo: 680213044508068</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Input 
                        id="business_account_id" 
                        value={whatsappSettings.business_account_id || ""} 
                        onChange={(e) => updateSetting('business_account_id', e.target.value)}
                        placeholder="680213044508068"
                      />
                      <p className="text-xs text-muted-foreground">
                        Encontrado no Facebook Business Manager, na seção Configurações da Empresa.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="access_token">Token de Acesso</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Token de acesso permanente para a API do WhatsApp Business.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="flex gap-2">
                        <Input 
                          id="access_token" 
                          value={whatsappSettings.access_token || ""} 
                          onChange={(e) => updateSetting('access_token', e.target.value)}
                          type="password"
                          className="flex-1"
                          placeholder="EAAZAehCqrki8BO..."
                        />
                        <Button variant="outline" size="icon" onClick={() => {
                          const input = document.getElementById('access_token') as HTMLInputElement;
                          input.type = input.type === 'password' ? 'text' : 'password';
                        }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Token de acesso gerado no Facebook Developer Portal, na seção Sistema &gt; Tokens de Acesso.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="api_version">Versão da API</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">A versão da API do WhatsApp Business a ser utilizada.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Input 
                        id="api_version" 
                        value={whatsappSettings.api_version || "v18.0"} 
                        onChange={(e) => updateSetting('api_version', e.target.value)}
                        placeholder="v18.0"
                      />
                      <p className="text-xs text-muted-foreground">
                        Versão da API do WhatsApp Business. Recomendado: v18.0
                      </p>
                    </div>

                    <Separator className="my-4" />

                    <h3 className="text-lg font-medium mb-4">Configurações do Webhook</h3>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="verify_token">Token de Verificação do Webhook</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Token usado para verificar seu webhook no Facebook Developer Portal.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="flex gap-2">
                        <Input 
                          id="verify_token" 
                          value={whatsappSettings.verify_token || ""} 
                          onChange={(e) => updateSetting('verify_token', e.target.value)}
                          type="password"
                          className="flex-1"
                          placeholder="seu_token_de_verificacao"
                        />
                        <Button variant="outline" size="icon" onClick={() => {
                          const input = document.getElementById('verify_token') as HTMLInputElement;
                          input.type = input.type === 'password' ? 'text' : 'password';
                        }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Este token é usado para verificar a autenticidade das solicitações de webhook.
                      </p>
                    </div>

                    <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                      <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">Importante</h3>
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        Estas credenciais são sensíveis e devem ser mantidas em segurança. Elas são armazenadas de forma criptografada e são usadas apenas para comunicação com a API do WhatsApp Business.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="notifications" className="space-y-6">
              <Card className="border shadow-sm">
                <CardHeader>
                  <CardTitle>Configurações de notificações</CardTitle>
                  <CardDescription>
                    Configure como e quando deseja receber notificações de mensagens.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notificações no navegador</Label>
                      <p className="text-sm text-muted-foreground">
                        Receber notificações no navegador quando estiver online.
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notificações por e-mail</Label>
                      <p className="text-sm text-muted-foreground">
                        Receber um resumo diário das mensagens não lidas.
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Som de notificação</Label>
                      <p className="text-sm text-muted-foreground">
                        Tocar um som quando receber uma nova mensagem.
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="ml-auto">Salvar preferências</Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="templates" className="space-y-6">
              <Card className="border shadow-sm">
                <CardHeader>
                  <CardTitle>Templates de mensagens</CardTitle>
                  <CardDescription>
                    Gerencie seus templates de mensagens aprovados pelo WhatsApp.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="rounded-lg border">
                      <div className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-medium">Boas-vindas</p>
                          <p className="text-sm text-muted-foreground">
                            Olá [nome], bem-vindo à Gaia CRM! Como podemos ajudar?
                          </p>
                        </div>
                        <Button variant="outline" size="sm">Usar</Button>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-medium">Confirmação</p>
                          <p className="text-sm text-muted-foreground">
                            Olá [nome], sua solicitação foi confirmada para [data].
                          </p>
                        </div>
                        <Button variant="outline" size="sm">Usar</Button>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-medium">Agradecimento</p>
                          <p className="text-sm text-muted-foreground">
                            Obrigado por entrar em contato, [nome]! Estamos à disposição.
                          </p>
                        </div>
                        <Button variant="outline" size="sm">Usar</Button>
                      </div>
                    </div>
                    
                    <Button className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Criar novo template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 