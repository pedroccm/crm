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
import { Textarea } from "@/components/ui/textarea"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown } from "lucide-react"
import { toast } from "sonner"
import { useTeam } from "@/lib/team-context"
import { supabase } from "@/lib/supabase"
import { 
  getEvolutionAPIConfig, 
  sendTextMessage, 
  checkIsWhatsApp, 
  setPresence,
  saveChat,
  saveMessage,
  findChatByPhone,
  EvolutionAPIDBChat,
  EvolutionAPIDBMessage,
  EvolutionAPIConfig
} from "@/lib/evolution-api-service"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { MessageSquare, AlertCircle, Loader2, User, FileText } from "lucide-react"

export default function NovaChatEvoPage() {
  const router = useRouter()
  const { currentTeam } = useTeam()
  const [selectedLeadId, setSelectedLeadId] = useState<string>("")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [leads, setLeads] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [leadSearchOpen, setLeadSearchOpen] = useState(false)
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [checking, setChecking] = useState(false)
  const [isWhatsApp, setIsWhatsApp] = useState<boolean | null>(null)
  const [apiConfig, setApiConfig] = useState<EvolutionAPIConfig | null>(null)
  const [configError, setConfigError] = useState(false)

  // Carregar configuração da Evolution API, leads e templates
  useEffect(() => {
    async function loadData() {
      if (currentTeam?.id) {
        setLoadingData(true)
        try {
          // Carregar configuração da API
          const config = await getEvolutionAPIConfig(currentTeam.id)
          setApiConfig(config)
          setConfigError(!config)
          
          // Carregar leads
          try {
            const { data: leadsData, error: leadsError } = await supabase
              .from('leads')
              .select(`
                id,
                name,
                email,
                phone,
                company_id,
                companies:company_id (
                  id,
                  name
                )
              `)
              .eq('team_id', currentTeam.id)
              .order('name')
            
            if (!leadsError && leadsData) {
              setLeads(leadsData)
            } else if (leadsError) {
              console.error('Erro ao carregar leads:', leadsError)
            }
          } catch (err) {
            console.error('Erro ao buscar leads:', err)
          }
          
          // Carregar templates de mensagem
          try {
            const { data: templatesData, error: templatesError } = await supabase
              .from('message_templates')
              .select('id, name, content, variables, category')
              .eq('team_id', currentTeam.id)
              .eq('is_active', true)
              .order('name')
            
            if (!templatesError && templatesData) {
              setTemplates(templatesData)
            } else if (templatesError) {
              console.error('Erro ao carregar templates:', templatesError)
              // Se a tabela não existir, apenas ignore silenciosamente
              if (templatesError.code !== 'PGRST116') {
                console.warn('Tabela message_templates pode não existir ainda')
              }
            }
          } catch (err) {
            console.error('Erro ao buscar templates:', err)
          }
        } catch (error) {
          console.error('Erro ao carregar dados:', error)
        } finally {
          setLoadingData(false)
        }
      }
    }
    
    loadData()
  }, [currentTeam])

  // Função para iniciar uma conversa
  const handleStartConversation = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!phone.trim() || !message.trim() || !apiConfig) {
      toast.error("Preencha todos os campos")
      return
    }
    
    try {
      setLoading(true)
      
      // Usar o número como está, sem formatação
      const phoneNumber = phone.trim()
      
      console.log("Iniciando conversa com:", phoneNumber)
      console.log("Mensagem:", message)
      console.log("API Config:", { ...apiConfig, api_key: "***" })
      
      // Enviar a mensagem diretamente sem usar setPresence
      console.log("Enviando mensagem diretamente...")
      
      // Enviar a mensagem
      const result = await sendTextMessage(apiConfig, phoneNumber, message)
      
      console.log("Resultado do envio:", result)
      
      toast.success("Mensagem enviada com sucesso!")
      
      // Salvar a conversa no banco de dados
      try {
        console.log("Iniciando salvamento da conversa e mensagem no banco de dados...")
        
        // Verificar se a conversa já existe
        const existingChat = await findChatByPhone(apiConfig.team_id, phoneNumber)
        console.log("Verificação de conversa existente:", existingChat ? "Encontrada" : "Não encontrada")
        
        let chatId: string
        
        if (existingChat) {
          // Atualizar a conversa existente
          const updatedChat: EvolutionAPIDBChat = {
            ...existingChat,
            last_message: message,
            updated_at: new Date().toISOString()
          }
          
          console.log("Atualizando conversa existente:", updatedChat)
          const savedChat = await saveChat(updatedChat)
          chatId = savedChat.id!
          console.log("Conversa atualizada no banco:", savedChat)
        } else {
          // Criar nova conversa
          const newChat: EvolutionAPIDBChat = {
            team_id: apiConfig.team_id,
            phone: phoneNumber,
            name: phoneNumber,
            last_message: message,
            whatsapp_jid: `${phoneNumber}@s.whatsapp.net`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          
          console.log("Criando nova conversa:", newChat)
          const savedChat = await saveChat(newChat)
          chatId = savedChat.id!
          console.log("Nova conversa salva no banco:", savedChat)
        }
        
        // Salvar a mensagem
        const newMessage: EvolutionAPIDBMessage = {
          team_id: apiConfig.team_id,
          chat_id: chatId,
          message_id: result.key?.id,
          phone: phoneNumber,
          text: message,
          from_me: true,
          status: 'sent',
          timestamp: new Date().toISOString()
        }
        
        console.log("Salvando nova mensagem:", newMessage)
        const savedMessage = await saveMessage(newMessage)
        console.log("Mensagem salva no banco:", savedMessage)
        
        console.log("Salvamento concluído com sucesso!")
      } catch (dbError) {
        console.error("Erro ao salvar conversa/mensagem no banco:", dbError)
        // Continuar mesmo se houver erro ao salvar no banco
      }
      
      // Redirecionar para a página de chat após um breve delay
      setTimeout(() => {
        router.push('/chat-evo')
      }, 1500)
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      toast.error("Erro ao enviar mensagem. Verifique o console para mais detalhes.")
    } finally {
      setLoading(false)
    }
  }

  // Função para verificar se o número é WhatsApp
  const handleCheckNumber = async () => {
    if (!phone.trim() || !apiConfig) return
    
    try {
      setChecking(true)
      setIsWhatsApp(null)
      
      // Usar o número como está, sem formatação
      const phoneNumber = phone.trim()
      
      console.log("Verificando número:", phoneNumber)
      
      // Verificar se o número é WhatsApp
      const result = await checkIsWhatsApp(apiConfig, phoneNumber)
      
      console.log("Resultado da verificação:", result)
      
      // Verificar o resultado
      // A API retorna { exists: boolean, jid: string, number: string }
      setIsWhatsApp(result.exists || false)
      
      if (result.exists) {
        toast.success("Número verificado com sucesso!")
      } else {
        toast.error("Este número não está disponível no WhatsApp")
      }
    } catch (error) {
      console.error('Erro ao verificar número:', error)
      toast.error("Erro ao verificar se o número é WhatsApp")
      setIsWhatsApp(false)
    } finally {
      setChecking(false)
    }
  }

  // Handler para seleção de lead
  const handleLeadSelect = (leadId: string) => {
    const selectedLead = leads.find(lead => lead.id === leadId)
    if (selectedLead) {
      setSelectedLeadId(leadId)
      setPhone(selectedLead.phone || '')
      // Resetar o status de verificação quando o lead mudar
      if (isWhatsApp !== null) {
        setIsWhatsApp(null)
      }
    }
  }
  
  // Handler para seleção de template
  const handleTemplateSelect = (templateId: string) => {
    const selectedTemplate = templates.find(template => template.id === templateId)
    if (selectedTemplate) {
      setSelectedTemplateId(templateId)
      
      // Substituir variáveis do template com dados do lead selecionado
      let templateContent = selectedTemplate.content
      
      if (selectedLeadId) {
        const selectedLead = leads.find(lead => lead.id === selectedLeadId)
        if (selectedLead) {
          // Substituir variáveis comuns
          templateContent = templateContent.replace(/{{name}}/g, selectedLead.name || '')
          templateContent = templateContent.replace(/{{email}}/g, selectedLead.email || '')
          templateContent = templateContent.replace(/{{phone}}/g, selectedLead.phone || '')
          templateContent = templateContent.replace(/{{company}}/g, selectedLead.companies?.name || '')
        }
      }
      
      setMessage(templateContent)
    }
  }
  
  // Handler para o campo de telefone
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Usar o valor diretamente, sem formatação
    setPhone(e.target.value)
    
    // Resetar seleção de lead se o telefone for alterado manualmente
    if (selectedLeadId) {
      const selectedLead = leads.find(lead => lead.id === selectedLeadId)
      if (selectedLead && selectedLead.phone !== e.target.value) {
        setSelectedLeadId('')
      }
    }
    
    // Resetar o status de verificação
    if (isWhatsApp !== null) {
      setIsWhatsApp(null)
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
                  <BreadcrumbPage>Nova Conversa</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">Nova Conversa</h1>
              <p className="text-sm text-muted-foreground">
                Inicie uma nova conversa via Evolution API
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
            <div className="grid gap-6 max-w-xl mx-auto">
              {/* Seleção de Lead */}
              <div className="space-y-2">
                <Label htmlFor="lead">Selecionar Lead</Label>
                <Popover open={leadSearchOpen} onOpenChange={setLeadSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={leadSearchOpen}
                      className="w-full justify-between"
                      disabled={loadingData}
                    >
                      {selectedLeadId
                        ? leads.find((lead) => lead.id === selectedLeadId)?.name
                        : loadingData ? "Carregando leads..." : "Escolha um lead ou digite um número manualmente"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Buscar lead..." />
                      <CommandEmpty>Nenhum lead encontrado.</CommandEmpty>
                      <CommandGroup>
                        {leads.map((lead) => (
                          <CommandItem
                            key={lead.id}
                            value={lead.name}
                            onSelect={() => {
                              handleLeadSelect(lead.id)
                              setLeadSearchOpen(false)
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                selectedLeadId === lead.id ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            {lead.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedLeadId && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Lead selecionado: {leads.find(l => l.id === selectedLeadId)?.name}
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedLeadId('')
                        setPhone('')
                        setIsWhatsApp(null)
                      }}
                    >
                      Limpar
                    </Button>
                  </div>
                )}
              </div>

              {/* Seleção de Template */}
              <div className="space-y-2">
                <Label htmlFor="template">Template de Mensagem</Label>
                <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingData ? "Carregando templates..." : "Escolha um template ou digite uma mensagem personalizada"} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.length > 0 ? templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4" />
                          <span>{template.name}</span>
                          <span className="text-muted-foreground">• {template.category}</span>
                        </div>
                      </SelectItem>
                    )) : (
                      <div className="p-2 text-sm text-muted-foreground">
                        Nenhum template encontrado
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {selectedTemplateId && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Template selecionado: {templates.find(t => t.id === selectedTemplateId)?.name}
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedTemplateId('')
                        setMessage('')
                      }}
                    >
                      Limpar
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Número de telefone</Label>
                <div className="flex gap-2">
                  <Input
                    id="phone"
                    placeholder="Ex: 5511987654321"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="flex-1"
                  />
                  <Button 
                    variant="outline" 
                    onClick={handleCheckNumber}
                    disabled={!phone.trim() || checking || !apiConfig}
                  >
                    {checking ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Verificar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Digite o número completo com código do país, sem espaços ou caracteres especiais.
                  <br />
                  Exemplos:
                  <br />
                  • Brasil: 5511987654321 (55 = país, 11 = DDD, 987654321 = número)
                  <br />
                  • EUA: 12025550123 (1 = país, 202 = área, 5550123 = número)
                </p>
                {isWhatsApp === true && (
                  <p className="text-sm text-green-600 flex items-center">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Este número está disponível no WhatsApp
                  </p>
                )}
                {isWhatsApp === false && (
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Este número não está disponível no WhatsApp
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Mensagem inicial</Label>
                <Textarea
                  id="message"
                  placeholder="Digite sua mensagem inicial..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push('/chat-evo')}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleStartConversation}
                  disabled={!phone.trim() || !message.trim() || loading || !apiConfig || isWhatsApp === false}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Enviando...
                    </>
                  ) : (
                    "Iniciar Conversa"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 