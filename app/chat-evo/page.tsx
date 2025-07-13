"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, Settings2, Send, Smile, Paperclip, Phone, MessageSquare, RefreshCw, Menu, Clock, Check, CheckCheck, Mic, MicOff, StopCircle, Trash2 } from "lucide-react"
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
import { useAuth } from "@/lib/auth-context"
import { useTeam } from "@/lib/team-context"
import Image from "next/image"
import { 
  getEvolutionAPIConfig,
  findChats,
  findMessages,
  sendTextMessage,
  sendMediaMessage,
  sendWhatsAppAudio,
  markMessageAsRead,
  setPresence,
  EvolutionAPIChat,
  EvolutionAPIMessage,
  EvolutionAPIConfig,
  findChatsFromDB,
  convertDBChatToAPIChat,
  findMessagesByPhone,
  convertDBMessageToAPIMessage,
  findChatByPhone,
  saveMessage,
  saveChat,
  EvolutionAPIDBChat,
  EvolutionAPIDBMessage,
  EvolutionAPIMessageResponse
} from "@/lib/evolution-api-service"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import { Loader2, MessageSquareOff } from "lucide-react"

interface Contact {
  phone: string;
  name: string;
  avatar?: string;
}

export default function ChatEvoPage() {
  const { user } = useAuth()
  const { currentTeam } = useTeam()
  const [conversations, setConversations] = useState<EvolutionAPIChat[]>([])
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<EvolutionAPIMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [apiConfig, setApiConfig] = useState<EvolutionAPIConfig | null>(null)
  const [configError, setConfigError] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const lastMessageTimestampRef = useRef<number>(0)
  
  // Estados para gravação de áudio
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

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

  // Carregar conversas quando a configuração estiver disponível
  useEffect(() => {
    if (apiConfig) {
      loadConversations()
    }
  }, [apiConfig])

  // Carregar mensagens quando um contato for selecionado
  useEffect(() => {
    if (selectedContact && apiConfig) {
      loadMessages()
    }
  }, [selectedContact, apiConfig])

  // Rolar para o final das mensagens quando novas mensagens forem carregadas
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Função para verificar novas mensagens
  const checkNewMessages = useCallback(async () => {
    if (!selectedContact || !apiConfig) return
    
    try {
      console.log("Verificando novas mensagens para:", selectedContact.phone)
      
      // Buscar mensagens da API
      const response = await findMessages(apiConfig, selectedContact.phone, 20)
      
      // Verificar se a resposta tem o formato esperado
      if (!response || !response.messages || !response.messages.records) {
        console.log("Formato de resposta inesperado:", response)
        return
      }
      
      const apiMessages = response.messages.records
      
      // Se não há mensagens, não fazer nada
      if (!apiMessages || apiMessages.length === 0) {
        console.log("Nenhuma mensagem encontrada")
        return
      }
      
      console.log(`Encontradas ${apiMessages.length} mensagens na API`)
      
      // Obter IDs das mensagens atuais
      const currentMessageIds = new Set(messages.map(msg => msg.key.id))
      
      // Encontrar mensagens novas (que não estão na lista atual)
      const newMessages = apiMessages.filter(msg => !currentMessageIds.has(msg.key.id))
      
      if (newMessages.length > 0) {
        console.log(`Encontradas ${newMessages.length} novas mensagens:`, newMessages)
        
        // Atualizar o timestamp da última mensagem
        if (apiMessages.length > 0) {
          const latestTimestamp = Math.max(...apiMessages.map(msg => msg.messageTimestamp))
          lastMessageTimestampRef.current = latestTimestamp
        }
        
        // Salvar as novas mensagens no banco de dados
        try {
          // Buscar o chat para obter o chat_id
          let chat = await findChatByPhone(apiConfig.team_id, selectedContact.phone)
          
          if (!chat) {
            // Criar novo chat
            const newChat: EvolutionAPIDBChat = {
              team_id: apiConfig.team_id,
              phone: selectedContact.phone,
              name: selectedContact.name,
              whatsapp_jid: `${selectedContact.phone}@s.whatsapp.net`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
            
            chat = await saveChat(newChat)
            console.log("Novo chat criado no banco:", chat)
          }
          
          // Salvar cada nova mensagem no banco
          for (const msg of newMessages) {
            const messageText = getMessageText(msg)
            
            const newMessageObj: EvolutionAPIDBMessage = {
              team_id: apiConfig.team_id,
              chat_id: chat.id!,
              message_id: msg.key.id,
              phone: selectedContact.phone,
              text: messageText,
              from_me: msg.key.fromMe,
              status: msg.status || 'received',
              timestamp: new Date(msg.messageTimestamp * 1000).toISOString()
            }
            
            await saveMessage(newMessageObj)
            console.log("Nova mensagem salva no banco:", newMessageObj)
            
            // Atualizar a última mensagem do chat
            const updatedChat: EvolutionAPIDBChat = {
              ...chat,
              last_message: messageText,
              updated_at: new Date().toISOString()
            }
            
            await saveChat(updatedChat)
          }
        } catch (dbError) {
          console.error("Erro ao salvar novas mensagens no banco:", dbError)
        }
        
        // Converter mensagens para o formato esperado pela interface
        const formattedNewMessages: EvolutionAPIMessage[] = newMessages.map(msg => ({
          key: {
            id: msg.key.id,
            fromMe: msg.key.fromMe,
            remoteJid: msg.key.remoteJid
          },
          message: msg.message,
          messageTimestamp: msg.messageTimestamp,
          status: msg.status || 'received'
        }))
        
        // Atualizar a lista de mensagens na tela
        setMessages(prevMessages => {
          // Combinar mensagens existentes com novas mensagens
          const combined = [...prevMessages, ...formattedNewMessages]
          
          // Ordenar por timestamp (mais antigas primeiro)
          combined.sort((a, b) => a.messageTimestamp - b.messageTimestamp)
          
          return combined
        })
        
        // Marcar mensagens como lidas
        for (const msg of formattedNewMessages) {
          if (!msg.key.fromMe && msg.status !== 'read') {
            await markMessageAsRead(apiConfig, msg.key.id, selectedContact.phone)
          }
        }
        
        // Atualizar a lista de conversas
        loadConversations()
      } else {
        console.log("Nenhuma mensagem nova encontrada")
      }
    } catch (error) {
      console.error("Erro ao verificar novas mensagens:", error)
    }
  }, [selectedContact, apiConfig, messages])

  // Função para atualizar manualmente as mensagens
  const handleRefreshMessages = async () => {
    if (!selectedContact || !apiConfig || refreshing) return
    
    setRefreshing(true)
    toast.loading("Verificando novas mensagens...", { id: "refresh-messages" })
    
    try {
      console.log("Verificando novas mensagens para:", selectedContact.phone)
      
      // Buscar mensagens da API
      const response = await findMessages(apiConfig, selectedContact.phone, 50)
      
      // Verificar se a resposta tem o formato esperado
      if (!response || !response.messages || !response.messages.records) {
        console.log("Formato de resposta inesperado:", response)
        toast.error("Erro ao verificar novas mensagens", { id: "refresh-messages" })
        return
      }
      
      const apiMessages = response.messages.records
      console.log(`Encontradas ${apiMessages.length} mensagens na API`)
      
      // Verificar se o chat existe ou criar um novo
      let chat = await findChatByPhone(apiConfig.team_id, selectedContact.phone)
      
      if (!chat) {
        // Criar novo chat
        const newChat: EvolutionAPIDBChat = {
          team_id: apiConfig.team_id,
          phone: selectedContact.phone,
          name: selectedContact.name,
          whatsapp_jid: `${selectedContact.phone}@s.whatsapp.net`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        chat = await saveChat(newChat)
        console.log("Novo chat criado no banco:", chat)
      }
      
      // Buscar mensagens existentes no banco para evitar duplicação
      const existingMessages = await findMessagesByPhone(apiConfig.team_id, selectedContact.phone)
      const existingMessageIds = new Set(existingMessages.map(msg => msg.message_id))
      
      // Identificar novas mensagens
      const newApiMessages = apiMessages.filter(msg => !existingMessageIds.has(msg.key.id))
      
      if (newApiMessages.length > 0) {
        console.log(`Encontradas ${newApiMessages.length} novas mensagens`)
        
        // Salvar novas mensagens no banco
        for (const msg of newApiMessages) {
          const messageText = getMessageText(msg)
          
          const newMessage: EvolutionAPIDBMessage = {
            team_id: apiConfig.team_id,
            chat_id: chat.id!,
            message_id: msg.key.id,
            phone: selectedContact.phone,
            text: messageText,
            from_me: msg.key.fromMe,
            status: msg.status || 'received',
            timestamp: new Date(msg.messageTimestamp * 1000).toISOString()
          }
          
          await saveMessage(newMessage)
        }
        
        // Atualizar o chat com a última mensagem
        if (apiMessages.length > 0) {
          const lastMsg = apiMessages.sort((a, b) => b.messageTimestamp - a.messageTimestamp)[0]
          const lastMessageText = getMessageText(lastMsg)
          
          const updatedChat: EvolutionAPIDBChat = {
            ...chat,
            last_message: lastMessageText,
            updated_at: new Date().toISOString()
          }
          
          await saveChat(updatedChat)
        }
        
        // Converter todas as mensagens da API para o formato esperado pela interface
        const formattedMessages: EvolutionAPIMessage[] = apiMessages.map(msg => ({
          key: {
            id: msg.key.id,
            fromMe: msg.key.fromMe,
            remoteJid: msg.key.remoteJid
          },
          message: msg.message,
          messageTimestamp: msg.messageTimestamp,
          status: msg.status || 'received'
        }))
        
        // Ordenar mensagens por timestamp (mais antigas primeiro)
        formattedMessages.sort((a, b) => a.messageTimestamp - b.messageTimestamp)
        
        // Atualizar a interface com todas as mensagens
        setMessages(formattedMessages)
        
        // Marcar mensagens como lidas
        const unreadMessages = formattedMessages.filter(msg => !msg.key.fromMe && msg.status !== 'read')
        
        if (unreadMessages.length > 0) {
          console.log(`Marcando ${unreadMessages.length} mensagens como lidas`)
          
          for (const msg of unreadMessages) {
            await markMessageAsRead(apiConfig, msg.key.id, selectedContact.phone)
          }
        }
        
        // Rolar para o final das mensagens
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
        
        toast.success(`${newApiMessages.length} novas mensagens encontradas`, { id: "refresh-messages" })
      } else {
        console.log("Nenhuma nova mensagem encontrada")
        toast.success("Mensagens atualizadas", { id: "refresh-messages" })
      }
      
      // Atualizar a lista de conversas
      loadConversations()
    } catch (error) {
      console.error("Erro ao verificar novas mensagens:", error)
      toast.error("Erro ao verificar novas mensagens", { id: "refresh-messages" })
    } finally {
      setRefreshing(false)
    }
  }

  async function loadConversations() {
    try {
      setLoadingConversations(true)
      
      if (!apiConfig) {
        setConfigError(true)
        return
      }
      
      console.log("Carregando conversas...")
      
      // Primeiro, tentar carregar do banco de dados
      try {
        console.log("Buscando conversas do banco de dados para o time:", apiConfig.team_id)
        const dbChats = await findChatsFromDB(apiConfig.team_id)
        
        if (dbChats.length > 0) {
          console.log(`Encontradas ${dbChats.length} conversas no banco de dados:`, dbChats)
          
          // Converter para o formato esperado pela interface
          const formattedChats = dbChats.map(convertDBChatToAPIChat)
          console.log("Conversas formatadas:", formattedChats)
          
          setConversations(formattedChats)
          setLoadingConversations(false)
          return
        } else {
          console.log("Nenhuma conversa encontrada no banco de dados")
        }
      } catch (dbError) {
        console.error("Erro ao carregar conversas do banco de dados:", dbError)
      }
      
      // Se não encontrou no banco ou ocorreu erro, tentar da API
      try {
        console.log("Buscando conversas da API Evolution")
        const apiChats = await findChats(apiConfig)
        console.log(`Encontradas ${apiChats.length} conversas na API:`, apiChats)
        
        setConversations(apiChats)
      } catch (apiError) {
        console.error("Erro ao carregar conversas da API:", apiError)
        toast.error("Erro ao carregar conversas")
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error)
      toast.error("Erro ao carregar conversas")
    } finally {
      setLoadingConversations(false)
    }
  }

  async function loadMessages() {
    if (!selectedContact || !apiConfig) return
    
    try {
      setLoadingMessages(true)
      console.log("Carregando mensagens para o contato:", selectedContact.phone)
      
      // Primeiro, carregar mensagens do banco de dados para exibição imediata
      try {
        console.log("Buscando mensagens do banco de dados para:", selectedContact.phone)
        const dbMessages = await findMessagesByPhone(apiConfig.team_id, selectedContact.phone)
        
        if (dbMessages.length > 0) {
          console.log(`Encontradas ${dbMessages.length} mensagens no banco de dados`)
          
          // Converter para o formato esperado pela interface
          const formattedMessages = dbMessages.map(convertDBMessageToAPIMessage)
          
          // Ordenar mensagens por timestamp (mais antigas primeiro)
          formattedMessages.sort((a, b) => a.messageTimestamp - b.messageTimestamp)
          
          // Atualizar a interface imediatamente com as mensagens do banco
          setMessages(formattedMessages)
          
          // Rolar para o final das mensagens
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
          }, 100)
        }
      } catch (dbError) {
        console.error("Erro ao carregar mensagens do banco de dados:", dbError)
      }
      
      // Em segundo plano, buscar mensagens mais recentes da API
      setLoadingMessages(false) // Desativar o loading principal
      
      // Mostrar um indicador de atualização
      toast.loading("Verificando novas mensagens...", { id: "checking-messages" })
      
      try {
        console.log("Buscando mensagens da API Evolution para:", selectedContact.phone)
        const response = await findMessages(apiConfig, selectedContact.phone, 50)
        
        // Verificar se a resposta tem o formato esperado
        if (!response || !response.messages || !response.messages.records) {
          console.log("Formato de resposta inesperado:", response)
          toast.error("Erro ao verificar novas mensagens", { id: "checking-messages" })
          return
        }
        
        const apiMessages = response.messages.records
        console.log(`Encontradas ${apiMessages.length} mensagens na API`)
        
        // Verificar se o chat existe ou criar um novo
        let chat = await findChatByPhone(apiConfig.team_id, selectedContact.phone)
        
        if (!chat) {
          // Criar novo chat
          const newChat: EvolutionAPIDBChat = {
            team_id: apiConfig.team_id,
            phone: selectedContact.phone,
            name: selectedContact.name,
            whatsapp_jid: `${selectedContact.phone}@s.whatsapp.net`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          
          chat = await saveChat(newChat)
          console.log("Novo chat criado no banco:", chat)
        }
        
        // Buscar mensagens existentes no banco para evitar duplicação
        const existingMessages = await findMessagesByPhone(apiConfig.team_id, selectedContact.phone)
        const existingMessageIds = new Set(existingMessages.map(msg => msg.message_id))
        
        // Identificar novas mensagens
        const newApiMessages = apiMessages.filter(msg => !existingMessageIds.has(msg.key.id))
        
        if (newApiMessages.length > 0) {
          console.log(`Encontradas ${newApiMessages.length} novas mensagens`)
          
          // Salvar novas mensagens no banco
          for (const msg of newApiMessages) {
            const messageText = getMessageText(msg)
            
            const newMessage: EvolutionAPIDBMessage = {
              team_id: apiConfig.team_id,
              chat_id: chat.id!,
              message_id: msg.key.id,
              phone: selectedContact.phone,
              text: messageText,
              from_me: msg.key.fromMe,
              status: msg.status || 'received',
              timestamp: new Date(msg.messageTimestamp * 1000).toISOString()
            }
            
            await saveMessage(newMessage)
          }
          
          // Atualizar o chat com a última mensagem
          if (apiMessages.length > 0) {
            const lastMsg = apiMessages.sort((a, b) => b.messageTimestamp - a.messageTimestamp)[0]
            const lastMessageText = getMessageText(lastMsg)
            
            const updatedChat: EvolutionAPIDBChat = {
              ...chat,
              last_message: lastMessageText,
              updated_at: new Date().toISOString()
            }
            
            await saveChat(updatedChat)
          }
          
          // Converter todas as mensagens da API para o formato esperado pela interface
          const formattedMessages: EvolutionAPIMessage[] = apiMessages.map(msg => ({
            key: {
              id: msg.key.id,
              fromMe: msg.key.fromMe,
              remoteJid: msg.key.remoteJid
            },
            message: msg.message,
            messageTimestamp: msg.messageTimestamp,
            status: msg.status || 'received'
          }))
          
          // Ordenar mensagens por timestamp (mais antigas primeiro)
          formattedMessages.sort((a, b) => a.messageTimestamp - b.messageTimestamp)
          
          // Atualizar a interface com todas as mensagens
          setMessages(formattedMessages)
          
          // Marcar mensagens como lidas
          const unreadMessages = formattedMessages.filter(msg => !msg.key.fromMe && msg.status !== 'read')
          
          if (unreadMessages.length > 0) {
            console.log(`Marcando ${unreadMessages.length} mensagens como lidas`)
            
            for (const msg of unreadMessages) {
              await markMessageAsRead(apiConfig, msg.key.id, selectedContact.phone)
            }
          }
          
          // Rolar para o final das mensagens
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
          }, 100)
          
          toast.success(`${newApiMessages.length} novas mensagens encontradas`, { id: "checking-messages" })
        } else {
          console.log("Nenhuma nova mensagem encontrada")
          toast.success("Mensagens atualizadas", { id: "checking-messages" })
        }
      } catch (apiError) {
        console.error("Erro ao verificar novas mensagens:", apiError)
        toast.error("Erro ao verificar novas mensagens", { id: "checking-messages" })
      }
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error)
      setLoadingMessages(false)
      toast.error("Erro ao carregar mensagens")
      
      // Se não conseguiu carregar mensagens de nenhuma fonte, mostrar mensagem de boas-vindas
      const welcomeMessage: EvolutionAPIMessage = {
        key: {
          id: `welcome-${Date.now()}`,
          fromMe: false,
          remoteJid: `${selectedContact.phone}@s.whatsapp.net`
        },
        message: {
          conversation: "Esta conversa foi iniciada, mas ainda não tem mensagens disponíveis."
        },
        messageTimestamp: Date.now() / 1000,
        status: 'read'
      }
      
      setMessages([welcomeMessage])
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact || !apiConfig) return
    
    try {
      setSendingMessage(true)
      
      // Salvar a mensagem atual antes de limpar o campo
      const messageText = newMessage.trim()
      
      // Limpar o campo de mensagem imediatamente para permitir nova digitação
      setNewMessage("")
      
      // Enviar a mensagem diretamente sem usar setPresence
      console.log("Enviando mensagem diretamente para:", selectedContact.phone)
      console.log("Texto da mensagem:", messageText)
      
      // Criar uma mensagem temporária para exibir imediatamente na tela
      const tempMessage: EvolutionAPIMessage = {
        key: {
          id: `temp-${Date.now()}`,
          fromMe: true,
          remoteJid: `${selectedContact.phone}@s.whatsapp.net`
        },
        message: {
          conversation: messageText
        },
        messageTimestamp: Date.now() / 1000,
        status: 'sending'
      }
      
      // Adicionar a mensagem temporária à lista de mensagens
      setMessages(prevMessages => [...prevMessages, tempMessage])
      console.log("Mensagem temporária adicionada à tela:", tempMessage)
      
      // Enviar a mensagem para a API
      const result = await sendTextMessage(apiConfig, selectedContact.phone, messageText)
      console.log("Resposta da API:", result)
      
      // Salvar a mensagem e atualizar a conversa no banco de dados
      try {
        console.log("Iniciando salvamento no banco de dados...")
        
        // Verificar se a conversa já existe
        const existingChat = await findChatByPhone(apiConfig.team_id, selectedContact.phone)
        console.log("Conversa existente:", existingChat)
        
        let chatId: string
        
        if (existingChat) {
          // Atualizar a conversa existente
          const updatedChat: EvolutionAPIDBChat = {
            ...existingChat,
            last_message: messageText,
            updated_at: new Date().toISOString()
          }
          
          console.log("Atualizando conversa:", updatedChat)
          const savedChat = await saveChat(updatedChat)
          chatId = savedChat.id!
          console.log("Conversa atualizada no banco:", savedChat)
        } else {
          // Criar nova conversa
          const newChat: EvolutionAPIDBChat = {
            team_id: apiConfig.team_id,
            phone: selectedContact.phone,
            name: selectedContact.name,
            last_message: messageText,
            whatsapp_jid: `${selectedContact.phone}@s.whatsapp.net`,
            profile_picture_url: selectedContact.avatar,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          
          console.log("Criando nova conversa:", newChat)
          const savedChat = await saveChat(newChat)
          chatId = savedChat.id!
          console.log("Nova conversa salva no banco:", savedChat)
        }
        
        // Salvar a mensagem
        const newMessageObj: EvolutionAPIDBMessage = {
          team_id: apiConfig.team_id,
          chat_id: chatId,
          message_id: result.key?.id,
          phone: selectedContact.phone,
          text: messageText,
          from_me: true,
          status: 'sent',
          timestamp: new Date().toISOString()
        }
        
        console.log("Salvando mensagem no banco:", newMessageObj)
        const savedMessage = await saveMessage(newMessageObj)
        console.log("Mensagem salva no banco:", savedMessage)
        
        // Atualizar a mensagem temporária com o ID real
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.key.id === tempMessage.key.id 
              ? {
                  ...msg,
                  key: { ...msg.key, id: result.key?.id || msg.key.id },
                  status: 'sent'
                }
              : msg
          )
        )
        
        console.log("Salvamento concluído com sucesso!")
      } catch (dbError) {
        console.error("Erro ao salvar conversa/mensagem no banco:", dbError)
        // Continuar mesmo se houver erro ao salvar no banco
      }
      
      // Atualizar a lista de conversas
      loadConversations()
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      toast.error("Erro ao enviar mensagem")
      
      // Remover a mensagem temporária em caso de erro
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.key.id !== `temp-${Date.now()}`)
      )
    } finally {
      setSendingMessage(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const selectContactFromConversation = (conversation: EvolutionAPIChat) => {
    // Extrair o número de telefone do ID se for uma conversa do localStorage
    let phone = conversation.phone
    
    // Se não tiver phone (conversas do localStorage), extrair do ID
    if (!phone && conversation.id) {
      // Remover o sufixo @s.whatsapp.net se existir
      phone = conversation.id.replace('@s.whatsapp.net', '')
    }
    
    setSelectedContact({
      phone: phone,
      name: conversation.name || phone,
      avatar: conversation.profilePictureUrl
    })
  }

  const filteredConversations = conversations.filter(conversation => {
    const searchLower = searchTerm.toLowerCase()
    return (
      conversation.name?.toLowerCase().includes(searchLower) ||
      conversation.phone.toLowerCase().includes(searchLower)
    )
  })

  // Função para formatar a data da mensagem
  const formatMessageDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Função para extrair o texto da mensagem
  const getMessageText = (message: EvolutionAPIMessage | any): string => {
    if (message.message?.conversation) {
      return message.message.conversation
    } else if (message.message?.extendedTextMessage?.text) {
      return message.message.extendedTextMessage.text
    } else if (message.message?.imageMessage) {
      return message.message.imageMessage.caption || 'Imagem'
    } else if (message.message?.videoMessage) {
      return message.message.videoMessage.caption || 'Vídeo'
    } else if (message.message?.documentMessage) {
      return message.message.documentMessage.fileName || 'Documento'
    } else if (message.message?.audioMessage) {
      return 'Áudio'
    } else if (message.message?.stickerMessage) {
      return 'Sticker'
    } else {
      return 'Mensagem não suportada'
    }
  }

  // Função para iniciar a gravação de áudio
  const startRecording = async () => {
    try {
      // Limpar qualquer gravação anterior
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
        setAudioUrl(null)
      }
      setAudioBlob(null)
      audioChunksRef.current = []
      
      // Solicitar permissão para acessar o microfone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Criar o MediaRecorder
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      
      // Configurar o evento de dados disponíveis
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      // Configurar o evento de parada
      mediaRecorder.onstop = () => {
        // Criar o blob de áudio
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(audioBlob)
        
        // Criar URL para o blob
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        
        // Parar o timer de gravação
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current)
          recordingTimerRef.current = null
        }
        
        // Parar todas as faixas do stream
        stream.getTracks().forEach(track => track.stop())
      }
      
      // Iniciar a gravação
      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      
      // Iniciar o timer para atualizar o tempo de gravação
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error)
      toast.error('Não foi possível acessar o microfone')
    }
  }
  
  // Função para parar a gravação
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }
  
  // Função para cancelar a gravação
  const cancelRecording = () => {
    // Parar a gravação
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
    
    // Limpar os dados
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioUrl(null)
    setAudioBlob(null)
    audioChunksRef.current = []
    
    // Parar o timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    setRecordingTime(0)
  }
  
  // Função para enviar o áudio gravado
  const sendAudio = async () => {
    if (!audioBlob || !selectedContact || !apiConfig) return
    
    try {
      setSendingMessage(true)
      
      // Converter o blob para base64
      const reader = new FileReader()
      reader.readAsDataURL(audioBlob)
      
      reader.onloadend = async () => {
        const base64data = reader.result as string
        // Remover o prefixo "data:audio/webm;base64," para obter apenas os dados
        const base64Audio = base64data.split(',')[1]
        
        // Criar uma mensagem temporária para exibir imediatamente na tela
        const tempMessage: EvolutionAPIMessage = {
          key: {
            id: `temp-${Date.now()}`,
            fromMe: true,
            remoteJid: `${selectedContact.phone}@s.whatsapp.net`
          },
          message: {
            audioMessage: {
              url: audioUrl || ''
            }
          },
          messageTimestamp: Date.now() / 1000,
          status: 'sending'
        }
        
        // Adicionar a mensagem temporária à lista de mensagens
        setMessages(prevMessages => [...prevMessages, tempMessage])
        
        console.log("Enviando áudio para:", selectedContact.phone);
        
        // Enviar o áudio para a API usando a função específica para áudio
        const result = await sendWhatsAppAudio(
          apiConfig,
          selectedContact.phone,
          base64Audio,
          {
            delay: 1000,
            encoding: true
          }
        )
        
        console.log("Resposta da API (áudio):", result)
        
        // Salvar a mensagem no banco de dados
        try {
          // Verificar se a conversa já existe
          let chat = await findChatByPhone(currentTeam?.id || '', selectedContact.phone)
          
          if (!chat) {
            // Criar uma nova conversa
            chat = await saveChat({
              team_id: currentTeam?.id || '',
              phone: selectedContact.phone,
              name: selectedContact.name,
              last_message: 'Áudio',
              unread_count: 0,
              whatsapp_jid: `${selectedContact.phone}@s.whatsapp.net`
            })
          } else {
            // Atualizar a conversa existente
            await saveChat({
              ...chat,
              last_message: 'Áudio',
              updated_at: new Date().toISOString()
            })
          }
          
          // Salvar a mensagem
          await saveMessage({
            team_id: currentTeam?.id || '',
            chat_id: chat.id || '',
            message_id: result.messages?.[0]?.id || `temp-${Date.now()}`,
            phone: selectedContact.phone,
            text: 'Áudio',
            from_me: true,
            media_type: 'audio',
            media_url: audioUrl || '',
            status: 'sent',
            timestamp: new Date().toISOString()
          })
          
          // Atualizar a lista de conversas
          loadConversations()
          
        } catch (dbError) {
          console.error("Erro ao salvar mensagem de áudio no banco:", dbError)
        }
        
        // Limpar o áudio após o envio
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl)
        }
        setAudioUrl(null)
        setAudioBlob(null)
        audioChunksRef.current = []
        setRecordingTime(0)
        
        // Rolar para o final da conversa
        scrollToBottom()
      }
    } catch (error) {
      console.error('Erro ao enviar áudio:', error)
      toast.error('Erro ao enviar áudio')
    } finally {
      setSendingMessage(false)
    }
  }
  
  // Função para formatar o tempo de gravação
  const formatRecordingTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Função para rolar para o final da conversa
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

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
                  <BreadcrumbPage>Chat Evo</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
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
            <>
              {/* Lista de conversas */}
              <div className="w-80 border-r flex flex-col h-full">
                <div className="shrink-0 p-4 border-b">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar conversas..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {loadingConversations ? (
                    <div className="flex items-center justify-center h-20">
                      <p className="text-sm text-muted-foreground">Carregando conversas...</p>
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 p-4">
                      <p className="text-sm text-muted-foreground text-center">
                        Nenhuma conversa encontrada.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => router.push('/chat-evo/novo')}
                      >
                        Nova conversa
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredConversations.map((conversation) => (
                        <div
                          key={conversation.id}
                          className={`p-3 cursor-pointer hover:bg-muted flex items-start gap-3 ${
                            selectedContact?.phone === conversation.phone ? 'bg-muted' : ''
                          }`}
                          onClick={() => selectContactFromConversation(conversation)}
                        >
                          <div className="relative">
                            {conversation.profilePictureUrl ? (
                              <Image
                                src={conversation.profilePictureUrl}
                                alt={conversation.name || conversation.phone}
                                width={40}
                                height={40}
                                className="rounded-full"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-primary font-medium">
                                  {(conversation.name || conversation.phone).charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            {conversation.unreadCount > 0 && (
                              <Badge
                                className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center"
                                variant="destructive"
                              >
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <h3 className="font-medium text-sm truncate">
                                {conversation.name || conversation.phone}
                              </h3>
                              {conversation.lastMessage?.timestamp && (
                                <span className="text-xs text-muted-foreground">
                                  {formatMessageDate(conversation.lastMessage.timestamp)}
                                </span>
                              )}
                            </div>
                            {conversation.lastMessage?.text && (
                              <p className="text-xs text-muted-foreground truncate">
                                {conversation.lastMessage.text}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="shrink-0 p-3 border-t">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/chat-evo/novo')}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Nova conversa
                  </Button>
                </div>
              </div>

              {/* Área de chat */}
              <div className="flex-1 flex flex-col h-full">
                {selectedContact ? (
                  <>
                    <div className="shrink-0 p-3 border-b flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          {selectedContact.avatar ? (
                            <Image
                              src={selectedContact.avatar}
                              alt={selectedContact.name}
                              width={40}
                              height={40}
                              className="rounded-full"
                            />
                          ) : (
                            <MessageSquare className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <h2 className="font-medium">{selectedContact.name}</h2>
                          <p className="text-xs text-muted-foreground">{selectedContact.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon">
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={handleRefreshMessages}
                          disabled={refreshing}
                        >
                          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button 
                          variant="ghost"
                          size="icon" 
                          onClick={() => router.push('/chat-evo/configuracoes')}
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {loadingMessages ? (
                        <div className="flex items-center justify-center h-20">
                          <p className="text-sm text-muted-foreground">Carregando mensagens...</p>
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-sm text-muted-foreground">
                            Nenhuma mensagem encontrada. Envie uma mensagem para iniciar a conversa.
                          </p>
                        </div>
                      ) : (
                        messages
                          .sort((a, b) => a.messageTimestamp - b.messageTimestamp)
                          .map((message, index) => {
                            // Garantir que a chave seja única mesmo se houver mensagens com o mesmo ID
                            const uniqueKey = `${message.key.id}-${index}`;
                            
                            return (
                              <div
                                key={uniqueKey}
                                className={`flex ${
                                  message.key.fromMe ? 'justify-end' : 'justify-start'
                                }`}
                              >
                                <div
                                  className={`max-w-[80%] rounded-lg p-3 ${
                                    message.key.fromMe
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-muted'
                                  }`}
                                >
                                  {/* Conteúdo da mensagem baseado no tipo */}
                                  {message.message?.conversation || message.message?.extendedTextMessage?.text ? (
                                    <p className="text-sm">
                                      {message.message?.conversation || message.message?.extendedTextMessage?.text}
                                    </p>
                                  ) : message.message?.imageMessage ? (
                                    <div className="space-y-2">
                                      <img
                                        src={message.message.imageMessage.url}
                                        alt="Imagem"
                                        className="rounded max-h-[200px] max-w-full"
                                      />
                                      {message.message.imageMessage.caption && (
                                        <p className="text-sm">{message.message.imageMessage.caption}</p>
                                      )}
                                    </div>
                                  ) : message.message?.videoMessage ? (
                                    <div className="space-y-2">
                                      <video
                                        src={message.message.videoMessage.url}
                                        controls
                                        className="rounded max-h-[200px] max-w-full"
                                      />
                                      {message.message.videoMessage.caption && (
                                        <p className="text-sm">{message.message.videoMessage.caption}</p>
                                      )}
                                    </div>
                                  ) : message.message?.audioMessage ? (
                                    <div className="w-full">
                                      <audio 
                                        src={message.message.audioMessage.url} 
                                        controls 
                                        className="w-full h-10"
                                      />
                                    </div>
                                  ) : message.message?.documentMessage ? (
                                    <div className="flex items-center space-x-2">
                                      <Paperclip className="h-4 w-4" />
                                      <a
                                        href={message.message.documentMessage.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm underline"
                                      >
                                        {message.message.documentMessage.fileName}
                                      </a>
                                    </div>
                                  ) : (
                                    <p className="text-sm">Mensagem não suportada</p>
                                  )}
                                  
                                  {/* Timestamp e status */}
                                  <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${
                                    message.key.fromMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                  }`}>
                                    <span>{formatMessageDate(message.messageTimestamp)}</span>
                                    {message.key.fromMe && (
                                      <span>
                                        {message.status === 'sending' ? (
                                          <Clock className="h-3 w-3" />
                                        ) : message.status === 'sent' ? (
                                          <Check className="h-3 w-3" />
                                        ) : message.status === 'delivered' ? (
                                          <CheckCheck className="h-3 w-3" />
                                        ) : message.status === 'read' ? (
                                          <CheckCheck className="h-3 w-3 text-blue-400" />
                                        ) : null}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                    
                    <div className="border-t p-4 flex items-center gap-2">
                      {!isRecording && !audioUrl && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => {}}>
                            <Smile className="h-5 w-5 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => {}}>
                            <Paperclip className="h-5 w-5 text-muted-foreground" />
                          </Button>
                          <Input
                            placeholder="Digite uma mensagem..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyPress}
                            disabled={!selectedContact || sendingMessage || isRecording}
                            className="flex-1"
                          />
                          {newMessage.trim() ? (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={handleSendMessage}
                              disabled={!selectedContact || sendingMessage}
                            >
                              <Send className="h-5 w-5 text-primary" />
                            </Button>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={startRecording}
                              disabled={!selectedContact || sendingMessage}
                            >
                              <Mic className="h-5 w-5 text-primary" />
                            </Button>
                          )}
                        </>
                      )}
                      
                      {/* Interface de gravação de áudio */}
                      {isRecording && (
                        <div className="flex items-center gap-2 w-full">
                          <div className="flex-1 flex items-center gap-2">
                            <Mic className="h-5 w-5 text-red-500 animate-pulse" />
                            <span className="text-sm font-medium">Gravando: {formatRecordingTime(recordingTime)}</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={stopRecording}
                            disabled={sendingMessage}
                          >
                            <StopCircle className="h-5 w-5 text-primary" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={cancelRecording}
                            disabled={sendingMessage}
                          >
                            <Trash2 className="h-5 w-5 text-destructive" />
                          </Button>
                        </div>
                      )}
                      
                      {/* Interface de áudio gravado */}
                      {!isRecording && audioUrl && (
                        <div className="flex items-center gap-2 w-full">
                          <div className="flex-1">
                            <audio src={audioUrl} controls className="w-full h-10" />
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={sendAudio}
                            disabled={sendingMessage}
                          >
                            <Send className="h-5 w-5 text-primary" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={cancelRecording}
                            disabled={sendingMessage}
                          >
                            <Trash2 className="h-5 w-5 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                    <h2 className="text-xl font-medium mb-2">Chat Evo</h2>
                    <p className="text-center text-muted-foreground mb-4">
                      Selecione uma conversa ou inicie uma nova para começar a enviar mensagens
                      usando a Evolution API.
                    </p>
                    <Button onClick={() => router.push('/chat-evo/novo')}>
                      Nova conversa
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 