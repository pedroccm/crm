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
import { toast } from "sonner"
import { useTeam } from "@/lib/team-context"
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
import { MessageSquare, AlertCircle, Loader2 } from "lucide-react"

export default function NovaChatEvoPage() {
  const router = useRouter()
  const { currentTeam } = useTeam()
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [isWhatsApp, setIsWhatsApp] = useState<boolean | null>(null)
  const [apiConfig, setApiConfig] = useState<EvolutionAPIConfig | null>(null)
  const [configError, setConfigError] = useState(false)

  // Carregar configuração da Evolution API
  useEffect(() => {
    async function loadConfig() {
      if (currentTeam?.id) {
        const config = await getEvolutionAPIConfig(currentTeam.id)
        setApiConfig(config)
        setConfigError(!config)
      }
    }
    
    loadConfig()
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

  // Handler para o campo de telefone
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Usar o valor diretamente, sem formatação
    setPhone(e.target.value)
    
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