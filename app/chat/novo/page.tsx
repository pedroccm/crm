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
import { Textarea } from "@/components/ui/textarea"
import { Search, MessageSquare, Send, Phone, User, Mail, Building2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { fetchLeadsForChat, startNewChat, Lead } from "@/lib/whatsapp-service"
import { Badge } from "@/components/ui/badge"

export default function NovoChatPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [leads, setLeads] = useState<Lead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [initialMessage, setInitialMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)

  // Carregar leads ao montar o componente
  useEffect(() => {
    async function loadLeads() {
      setIsLoading(true)
      try {
        const data = await fetchLeadsForChat()
        setLeads(data)
        setFilteredLeads(data)
      } catch (error) {
        console.error("Erro ao carregar leads:", error)
        toast({
          title: "Erro",
          description: "Não foi possível carregar a lista de leads",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadLeads()
  }, [toast])

  // Filtrar leads quando o termo de pesquisa mudar
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredLeads(leads)
      return
    }

    const term = searchTerm.toLowerCase()
    const filtered = leads.filter(
      lead =>
        lead.name.toLowerCase().includes(term) ||
        lead.phone.includes(term) ||
        (lead.email && lead.email.toLowerCase().includes(term))
    )
    setFilteredLeads(filtered)
  }, [searchTerm, leads])

  // Função para iniciar um novo chat
  const handleStartChat = async () => {
    if (!selectedLead) {
      toast({
        title: "Erro",
        description: "Selecione um lead para iniciar a conversa",
        variant: "destructive",
      })
      return
    }

    if (!initialMessage.trim()) {
      toast({
        title: "Erro",
        description: "Digite uma mensagem inicial",
        variant: "destructive",
      })
      return
    }

    setIsSending(true)

    try {
      const success = await startNewChat(selectedLead, initialMessage)

      if (success) {
        toast({
          title: "Sucesso",
          description: "Conversa iniciada com sucesso",
        })
        
        // Redirecionar para a página de chat
        router.push("/chat")
      } else {
        throw new Error("Falha ao iniciar conversa")
      }
    } catch (error) {
      console.error("Erro ao iniciar conversa:", error)
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a conversa. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  // Função para selecionar um lead
  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead)
    
    // Pré-preencher a mensagem inicial com o nome do lead
    if (!initialMessage) {
      setInitialMessage(`Olá ${lead.name}, tudo bem?`)
    }
  }

  // Função para obter a classe CSS com base no status do lead
  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'novo':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'qualificado':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'desqualificado':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'cliente':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
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
                  <BreadcrumbLink href="/chat">Chat</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Nova Conversa</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex-1 space-y-8 p-8 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Nova Conversa</h2>
              <p className="text-muted-foreground">
                Inicie uma nova conversa com um lead via WhatsApp.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Coluna de seleção de lead */}
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle>Selecione um Lead</CardTitle>
                <CardDescription>
                  Escolha um lead para iniciar uma conversa via WhatsApp.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Pesquise por nome, telefone ou email"
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="h-[400px] overflow-y-auto border rounded-md">
                  {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    </div>
                  ) : filteredLeads.length > 0 ? (
                    <div className="divide-y">
                      {filteredLeads.map((lead) => (
                        <button
                          key={lead.id}
                          className={`flex w-full items-start gap-3 p-4 text-left hover:bg-muted ${
                            selectedLead?.id === lead.id ? 'bg-muted' : ''
                          }`}
                          onClick={() => handleSelectLead(lead)}
                        >
                          <div className="relative h-10 w-10 overflow-hidden rounded-full flex-shrink-0 bg-primary text-primary-foreground flex items-center justify-center">
                            {lead.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{lead.name}</p>
                              <span className={`text-xs px-2 py-1 rounded-full ${getStatusClass(lead.status)}`}>
                                {lead.status}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{lead.phone}</span>
                            </div>
                            {lead.email && (
                              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                <span>{lead.email}</span>
                              </div>
                            )}
                            {lead.company_name && (
                              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                                <Building2 className="h-3 w-3" />
                                <span>{lead.company_name}</span>
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                        <User className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <h3 className="mb-1 text-xl font-semibold">Nenhum lead encontrado</h3>
                      <p className="text-muted-foreground">
                        Tente ajustar sua pesquisa ou adicione um novo lead.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Coluna de mensagem inicial */}
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle>Mensagem Inicial</CardTitle>
                <CardDescription>
                  Escreva a primeira mensagem para iniciar a conversa.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedLead ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 border rounded-md bg-muted/50">
                      <div className="relative h-10 w-10 overflow-hidden rounded-full flex-shrink-0 bg-primary text-primary-foreground flex items-center justify-center">
                        {selectedLead.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{selectedLead.name}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="h-5 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span className="text-xs">{selectedLead.phone}</span>
                          </Badge>
                          <Badge variant="outline" className="h-5 flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            <span className="text-xs">WhatsApp</span>
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Mensagem</Label>
                      <Textarea
                        id="message"
                        placeholder="Digite sua mensagem inicial..."
                        className="min-h-[150px]"
                        value={initialMessage}
                        onChange={(e) => setInitialMessage(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Esta mensagem será enviada via WhatsApp para o número {selectedLead.phone}.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-[300px] flex-col items-center justify-center p-4 text-center">
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                      <MessageSquare className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="mb-1 text-xl font-semibold">Selecione um lead</h3>
                    <p className="text-muted-foreground">
                      Escolha um lead na lista à esquerda para iniciar uma conversa.
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button 
                  variant="outline" 
                  className="mr-2"
                  onClick={() => router.push("/chat")}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleStartChat} 
                  disabled={!selectedLead || !initialMessage.trim() || isSending}
                >
                  {isSending ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Iniciar Conversa
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 