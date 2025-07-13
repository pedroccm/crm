"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Settings2, Send, Smile, Paperclip, Phone, MessageSquare } from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import Image from "next/image"
import { 
  fetchWhatsAppConversations, 
  fetchWhatsAppMessages, 
  sendWhatsAppMessage, 
  markMessagesAsRead,
  WhatsAppConversation,
  WhatsAppMessage
} from "@/lib/whatsapp-service"
import { toast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"

interface Contact {
  phone: string;
  name: string;
  avatar?: string;
}

export default function ChatPage() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Carregar conversas do WhatsApp
  useEffect(() => {
    async function loadConversations() {
      setIsLoading(true);
      try {
        const whatsappConversations = await fetchWhatsAppConversations();
        setConversations(whatsappConversations);
      } catch (error) {
        console.error("Erro ao carregar conversas:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as conversas do WhatsApp",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadConversations();
    
    // Atualização automática desativada temporariamente
    // Será implementada via webhook posteriormente
    // const intervalId = setInterval(loadConversations, 30000);
    // return () => clearInterval(intervalId);
  }, []);

  // Carregar mensagens quando um contato é selecionado
  useEffect(() => {
    async function loadMessages() {
      if (!selectedContact) return;
      
      try {
        const whatsappMessages = await fetchWhatsAppMessages(selectedContact.phone);
        setMessages(whatsappMessages);
        
        // Marcar mensagens como lidas
        await markMessagesAsRead(selectedContact.phone);
        
        // Atualizar contagem de não lidas nas conversas
        setConversations(prev => 
          prev.map(conv => 
            conv.lead_phone === selectedContact.phone 
              ? { ...conv, unread_count: 0 } 
              : conv
          )
        );
      } catch (error) {
        console.error("Erro ao carregar mensagens:", error);
      }
    }

    loadMessages();
    
    // Atualização automática desativada temporariamente
    // Será implementada via webhook posteriormente
    // const intervalId = setInterval(loadMessages, 10000);
    // return () => clearInterval(intervalId);
  }, [selectedContact]);

  // Rolar para a última mensagem quando as mensagens são atualizadas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Função para filtrar conversas com base no termo de pesquisa
  const filteredConversations = conversations.filter(conv => 
    conv.lead_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.lead_phone.includes(searchTerm)
  );

  // Função para enviar mensagem
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return;
    
    console.log('=== INÍCIO DO ENVIO DE MENSAGEM (interface) ===');
    console.log('Contato selecionado:', selectedContact);
    console.log('Mensagem a ser enviada:', newMessage);
    
    setIsSending(true);
    
    try {
      // Enviar mensagem via WhatsApp
      console.log('Chamando função sendWhatsAppMessage com:', selectedContact.phone, newMessage);
      const success = await sendWhatsAppMessage(selectedContact.phone, newMessage);
      
      console.log('Resultado do envio:', success ? 'Sucesso' : 'Falha');
      
      if (success) {
        console.log('Mensagem enviada com sucesso, atualizando interface');
        // Adicionar mensagem à lista local
        const newMsg: WhatsAppMessage = {
          id: `temp-${Date.now()}`,
          lead_phone: selectedContact.phone,
          lead_name: selectedContact.name,
          message: newMessage,
          direction: 'outbound',
          status: 'sent',
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString()
        };
        
        console.log('Nova mensagem adicionada localmente:', newMsg);
        setMessages(prev => [...prev, newMsg]);
        setNewMessage("");
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível enviar a mensagem",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao enviar a mensagem",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Função para lidar com a tecla Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Função para selecionar um contato a partir de uma conversa
  const selectContactFromConversation = (conversation: WhatsAppConversation) => {
    setSelectedContact({
      phone: conversation.lead_phone,
      name: conversation.lead_name,
    });
  };

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
                  <BreadcrumbPage>Chat</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex h-[calc(100vh-4rem)] flex-col md:flex-row">
          {/* Sidebar de conversas */}
          <div className="w-full border-r md:w-80 flex flex-col">
            <div className="flex h-16 items-center justify-between border-b px-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Pesquise seus contatos"
                  className="w-full pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex ml-2">
                <Button variant="ghost" size="icon" className="flex-shrink-0" asChild>
                  <a href="/chat/novo">
                    <MessageSquare className="h-4 w-4" />
                  </a>
                </Button>
                <Button variant="ghost" size="icon" className="flex-shrink-0" asChild>
                  <a href="/chat/configuracoes">
                    <Settings2 className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
            
            <Tabs defaultValue="todos" className="flex-1 flex flex-col">
              <div className="border-b px-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="todos">Todos</TabsTrigger>
                  <TabsTrigger value="aberto">Em aberto</TabsTrigger>
                  <TabsTrigger value="recentes">Recentes</TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="todos" className="m-0 flex-1 overflow-auto">
                {isLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  </div>
                ) : filteredConversations.length > 0 ? (
                  <div className="divide-y">
                    {filteredConversations.map((conv) => (
                      <button
                        key={conv.lead_phone}
                        className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted"
                        onClick={() => selectContactFromConversation(conv)}
                      >
                        <div className="relative h-10 w-10 overflow-hidden rounded-full flex-shrink-0 bg-primary text-primary-foreground flex items-center justify-center">
                          {conv.lead_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{conv.lead_name}</p>
                              <Badge variant="outline" className="h-5 flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                <span className="text-xs">WhatsApp</span>
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(conv.last_message_time).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className="truncate text-sm text-muted-foreground">
                            {conv.last_message}
                          </p>
                        </div>
                        {conv.unread_count > 0 && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground flex-shrink-0">
                            {conv.unread_count}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                      <MessageSquare className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="mb-1 text-xl font-semibold">Sem conversas iniciadas</h3>
                    <p className="text-muted-foreground">
                      As conversas do WhatsApp aparecerão aqui quando seus leads enviarem mensagens.
                    </p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="aberto" className="m-0 flex-1 overflow-auto">
                {isLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  </div>
                ) : filteredConversations.filter(c => c.unread_count > 0).length > 0 ? (
                  <div className="divide-y">
                    {filteredConversations
                      .filter(c => c.unread_count > 0)
                      .map((conv) => (
                        <button
                          key={conv.lead_phone}
                          className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted"
                          onClick={() => selectContactFromConversation(conv)}
                        >
                          <div className="relative h-10 w-10 overflow-hidden rounded-full flex-shrink-0 bg-primary text-primary-foreground flex items-center justify-center">
                            {conv.lead_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{conv.lead_name}</p>
                                <Badge variant="outline" className="h-5 flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  <span className="text-xs">WhatsApp</span>
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(conv.last_message_time).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <p className="truncate text-sm text-muted-foreground">
                              {conv.last_message}
                            </p>
                          </div>
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground flex-shrink-0">
                            {conv.unread_count}
                          </div>
                        </button>
                      ))}
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                      <MessageSquare className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="mb-1 text-xl font-semibold">Sem conversas em aberto</h3>
                    <p className="text-muted-foreground">
                      Todas as mensagens foram lidas.
                    </p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="recentes" className="m-0 flex-1 overflow-auto">
                {isLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  </div>
                ) : filteredConversations.length > 0 ? (
                  <div className="divide-y">
                    {filteredConversations
                      .slice(0, 5)
                      .map((conv) => (
                        <button
                          key={conv.lead_phone}
                          className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted"
                          onClick={() => selectContactFromConversation(conv)}
                        >
                          <div className="relative h-10 w-10 overflow-hidden rounded-full flex-shrink-0 bg-primary text-primary-foreground flex items-center justify-center">
                            {conv.lead_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{conv.lead_name}</p>
                                <Badge variant="outline" className="h-5 flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  <span className="text-xs">WhatsApp</span>
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(conv.last_message_time).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <p className="truncate text-sm text-muted-foreground">
                              {conv.last_message}
                            </p>
                          </div>
                          {conv.unread_count > 0 && (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground flex-shrink-0">
                              {conv.unread_count}
                            </div>
                          )}
                        </button>
                      ))}
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                      <MessageSquare className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="mb-1 text-xl font-semibold">Sem conversas recentes</h3>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Área principal de chat */}
          <div className="flex flex-1 flex-col">
            {selectedContact ? (
              <>
                <div className="flex h-16 items-center justify-between border-b px-4">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 overflow-hidden rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      {selectedContact.avatar ? (
                        <Image
                          src={selectedContact.avatar}
                          alt={selectedContact.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <span>{selectedContact.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{selectedContact.name}</p>
                        <Badge variant="outline" className="h-5 flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          <span className="text-xs">WhatsApp</span>
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{selectedContact.phone}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Phone className="h-3 w-3 mr-1" />
                    Ligar
                  </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4">
                  {messages.length > 0 ? (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.direction === 'inbound' ? "justify-start" : "justify-end"
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              message.direction === 'inbound'
                                ? "bg-muted text-foreground"
                                : "bg-primary text-primary-foreground"
                            }`}
                          >
                            <p>{message.message}</p>
                            <div className="mt-1 text-right text-xs opacity-70 flex justify-end items-center gap-1">
                              <span>
                                {new Date(message.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              {message.direction === 'outbound' && (
                                <span>
                                  {message.status === 'sent' && '✓'}
                                  {message.status === 'delivered' && '✓✓'}
                                  {message.status === 'read' && '✓✓'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center">
                      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                        <MessageSquare className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <h3 className="mb-1 text-xl font-semibold">Inicie uma conversa</h3>
                      <p className="text-center text-muted-foreground">
                        Envie uma mensagem para {selectedContact.name} via WhatsApp
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="border-t p-4">
                  <div className="flex gap-2 items-center">
                    <Button variant="outline" size="icon" className="flex-shrink-0">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Input
                      placeholder="Digite sua mensagem..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      className="flex-1"
                      disabled={isSending}
                    />
                    <Button variant="outline" size="icon" className="flex-shrink-0">
                      <Smile className="h-4 w-4" />
                    </Button>
                    <Button 
                      onClick={handleSendMessage} 
                      className="flex-shrink-0"
                      disabled={isSending || !newMessage.trim()}
                    >
                      {isSending ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent mr-2"></div>
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Enviar
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                <div className="mb-6 flex h-40 w-40 items-center justify-center">
                  <Image 
                    src="/chat-illustration.svg" 
                    alt="Chat Illustration" 
                    width={200} 
                    height={200}
                    className="h-auto w-auto"
                    priority
                  />
                </div>
                <h2 className="mb-2 text-2xl font-bold">WhatsApp Business</h2>
                <p className="text-muted-foreground max-w-md">
                  Acompanhe as conversas com seus leads via WhatsApp. Selecione uma conversa à esquerda para começar.
                </p>
                <div className="mt-6 flex flex-col gap-4">
                  <Badge variant="outline" className="py-2 px-3 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span>Integrado com WhatsApp Business API</span>
                  </Badge>
                  <Button onClick={() => router.push('/chat/novo')} className="mt-2">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Iniciar Nova Conversa
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 