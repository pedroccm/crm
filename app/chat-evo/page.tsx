"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, Send, Smile, Paperclip, MessageSquare, RefreshCw, Menu, Clock, Check, CheckCheck, Mic, MicOff, StopCircle, Trash2, Target, FileText } from "lucide-react"
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
import { useRouter, useSearchParams } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import { Loader2, MessageSquareOff } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"

interface Contact {
  phone: string;
  name: string;
  avatar?: string;
}

export default function ChatEvoPage() {
  const { user } = useAuth()
  const { currentTeam } = useTeam()
  const searchParams = useSearchParams()
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
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const lastMessageTimestampRef = useRef<number>(0)
  const [isAtBottom, setIsAtBottom] = useState(true)
  
  // Estados para gravação de áudio
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Estados para seletor de pipeline
  const [isPipelineSelectorOpen, setIsPipelineSelectorOpen] = useState(false)
  const [pipelines, setPipelines] = useState<any[]>([])
  const [stages, setStages] = useState<any[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState<string>('')
  const [selectedStage, setSelectedStage] = useState<string>('')
  const [currentLead, setCurrentLead] = useState<any>(null)
  const [loadingPipelines, setLoadingPipelines] = useState(false)
  const [updatingLead, setUpdatingLead] = useState(false)
  
  // Estados para templates de mensagens
  const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState(false)
  const [messageTemplates, setMessageTemplates] = useState<any[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  // Carregar configuração da Evolution API
  useEffect(() => {
    async function loadConfig() {
      if (currentTeam?.id) {
        const config = await getEvolutionAPIConfig(currentTeam.id)
        setApiConfig(config)
        setConfigError(!config)
        
        // Carregar templates quando tiver configuração e team
        loadMessageTemplates()
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

  // Processar parâmetro phone da URL para seleção automática de conversa
  useEffect(() => {
    const phoneParam = searchParams?.get('phone')
    
    if (phoneParam && apiConfig && conversations.length > 0 && phoneParam !== processedPhoneParam) {
      // Limpar formatação do telefone (manter apenas números)
      const cleanPhone = phoneParam.replace(/\D/g, '')
      
      // Procurar conversa existente com esse telefone
      const existingChat = conversations.find(conv => {
        // Usar phone se existir, senão extrair do id
        const convPhoneFromField = conv.phone?.replace(/\D/g, '') || ''
        const convPhoneFromId = conv.id.replace(/\D/g, '')
        
        const isMatch = 
          convPhoneFromField === cleanPhone || 
          convPhoneFromId === cleanPhone || 
          convPhoneFromField.endsWith(cleanPhone) || 
          convPhoneFromId.endsWith(cleanPhone) ||
          cleanPhone.endsWith(convPhoneFromField) ||
          cleanPhone.endsWith(convPhoneFromId)
          
        console.log('Comparando telefones:', {
          cleanPhone,
          convPhoneFromField,
          convPhoneFromId,
          convId: conv.id,
          isMatch
        })
        
        return isMatch
      })
      
      if (existingChat) {
        // Sempre selecionar conversa existente, mesmo se já estiver selecionada
        const contact: Contact = {
          phone: existingChat.phone || existingChat.id,
          name: existingChat.name || existingChat.phone || existingChat.id,
          avatar: existingChat.profilePictureUrl
        }
        setSelectedContact(contact)
        console.log('Conversa encontrada e selecionada:', contact)
      } else {
        // Não encontrou conversa existente, criar nova conversa automaticamente
        const newContact: Contact = {
          phone: phoneParam,
          name: phoneParam, // Será atualizado quando as mensagens carregarem
          avatar: undefined
        }
        setSelectedContact(newContact)
        console.log('Nova conversa criada e selecionada:', newContact)
        
        // Buscar o nome do lead de forma assíncrona e atualizar depois
        findLeadByPhone().then(lead => {
          if (lead) {
            setSelectedContact(prev => prev ? { ...prev, name: lead.name } : prev)
            console.log('Nome do lead atualizado:', lead.name)
          }
        }).catch(error => {
          console.log('Erro ao buscar nome do lead:', error)
        })
      }
      
      // Marcar este telefone como processado
      setProcessedPhoneParam(phoneParam)
      
      // Remover parâmetro da URL para não interferir depois
      const url = new URL(window.location.href)
      url.searchParams.delete('phone')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams, apiConfig, conversations])

  // Carregar mensagens quando um contato for selecionado
  useEffect(() => {
    
    if (selectedContact && apiConfig) {
      loadMessages()
      
      
      // Configurar polling inteligente para verificar apenas novas mensagens a cada 3 segundos
      const intervalId = setInterval(() => {
        if (selectedContact && apiConfig) {
          checkForNewMessages() // função mais leve que só verifica novas mensagens
        }
      }, 3000)
      
      // Limpar interval quando componente for desmontado ou contato mudar
      return () => {
        clearInterval(intervalId)
      }
    }
  }, [selectedContact, apiConfig])

  // Função para verificar se o usuário está no final da conversa
  const checkIfAtBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10 // 10px de tolerância
      setIsAtBottom(isAtBottom)
    }
  }, [])

  // Rolar para o final das mensagens quando novas mensagens forem carregadas (só se estiver no final)
  useEffect(() => {
    if (messagesEndRef.current && isAtBottom) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isAtBottom])

  // Função para verificar novas mensagens
  const checkNewMessages = useCallback(async () => {
    if (!selectedContact || !apiConfig) return
    
    try {
      
      // Buscar mensagens da API
      const response = await findMessages(apiConfig, selectedContact.phone, 20)
      
      // Verificar se a resposta tem o formato esperado
      if (!response || !response.messages || !response.messages.records) {
        return
      }
      
      const apiMessages = response.messages.records
      
      // Se não há mensagens, não fazer nada
      if (!apiMessages || apiMessages.length === 0) {
        return
      }
      
      
      // Obter IDs das mensagens atuais
      const currentMessageIds = new Set(messages.map(msg => msg.key.id))
      
      // Encontrar mensagens novas (que não estão na lista atual)
      const newMessages = apiMessages.filter(msg => !currentMessageIds.has(msg.key.id))
      
      if (newMessages.length > 0) {
        
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
            try {
              await markMessageAsRead(apiConfig, msg.key.id, selectedContact.phone, msg.key.fromMe)
            } catch (readError) {
              console.error("Erro ao marcar mensagem como lida:", readError)
              // Continuar mesmo se der erro ao marcar como lida
            }
          }
        }
        
        // Atualizar a lista de conversas
        loadConversations()
      } else {
      }
    } catch (error) {
      console.error("Erro ao verificar novas mensagens:", error)
    }
  }, [selectedContact, apiConfig, messages])

  // Função para carregar pipelines
  async function loadPipelines() {
    if (!currentTeam?.id) return
    
    try {
      setLoadingPipelines(true)
      const { data: pipelineData, error: pipelineError } = await supabase
        .from('pipelines')
        .select('*')
        .eq('team_id', currentTeam.id)
        .order('name')
      
      if (pipelineError) throw pipelineError
      setPipelines(pipelineData || [])
    } catch (error) {
      console.error('Erro ao carregar pipelines:', error)
      toast.error('Erro ao carregar pipelines')
    } finally {
      setLoadingPipelines(false)
    }
  }

  // Função para carregar estágios de um pipeline
  async function loadStages(pipelineId: string) {
    try {
      const { data: stageData, error: stageError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('stage_order')
      
      if (stageError) throw stageError
      setStages(stageData || [])
    } catch (error) {
      console.error('Erro ao carregar estágios:', error)
      toast.error('Erro ao carregar estágios')
    }
  }

  // Função para buscar o pipeline atual do lead
  async function getCurrentLeadPipeline(leadId: string) {
    try {
      const { data: leadPipelineData, error } = await supabase
        .from('lead_pipelines')
        .select('pipeline_id, stage_id')
        .eq('lead_id', leadId)
        .single()
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Erro ao buscar pipeline do lead:', error)
        return null
      }
      
      return leadPipelineData
    } catch (error) {
      console.error('Erro ao buscar pipeline do lead:', error)
      return null
    }
  }

  // Função para buscar lead pelo telefone
  async function findLeadByPhone() {
    if (!selectedContact?.phone || !currentTeam?.id) return null
    
    try {
      const cleanPhone = selectedContact.phone.replace(/\D/g, '')
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('team_id', currentTeam.id)
        .or(`phone.eq.${cleanPhone},phone.eq.${selectedContact.phone}`)
        .single()
      
      if (leadError && leadError.code !== 'PGRST116') throw leadError
      return leadData || null
    } catch (error) {
      console.error('Erro ao buscar lead:', error)
      return null
    }
  }

  // Função para abrir o seletor de pipeline
  async function openPipelineSelector() {
    const lead = await findLeadByPhone()
    setCurrentLead(lead)
    
    if (!lead) {
      // Em vez de mostrar erro, redirecionar para cadastro de lead com telefone preenchido
      const phoneParam = encodeURIComponent(selectedContact?.phone || '')
      router.push(`/leads/novo?phone=${phoneParam}`)
      return
    }
    
    await loadPipelines()
    
    // Buscar o pipeline atual do lead se existir
    const currentLeadPipeline = await getCurrentLeadPipeline(lead.id)
    
    // Aguardar pipelines carregarem
    const { data: pipelineData } = await supabase
      .from('pipelines')
      .select('*')
      .eq('team_id', currentTeam?.id)
      .order('name')
    
    const availablePipelines = pipelineData || []
    
    if (availablePipelines.length === 0) {
      toast.error('Nenhum pipeline encontrado')
      return
    }
    
    // Se só existe um pipeline, selecionar automaticamente
    if (availablePipelines.length === 1) {
      const pipeline = availablePipelines[0]
      setSelectedPipeline(pipeline.id)
      await loadStages(pipeline.id)
      
      // Se o lead já está neste pipeline, mostrar estágio atual
      if (currentLeadPipeline && currentLeadPipeline.pipeline_id === pipeline.id) {
        setSelectedStage(currentLeadPipeline.stage_id)
      }
      
      setIsPipelineSelectorOpen(true)
      return
    }
    
    // Se o lead já está em um pipeline, selecionar automaticamente
    if (currentLeadPipeline) {
      setSelectedPipeline(currentLeadPipeline.pipeline_id)
      await loadStages(currentLeadPipeline.pipeline_id)
      setSelectedStage(currentLeadPipeline.stage_id)
      setIsPipelineSelectorOpen(true)
      return
    }
    
    // Se existem múltiplos pipelines e o lead não está em nenhum, mostrar seletor
    setIsPipelineSelectorOpen(true)
  }

  // Função para atualizar lead no pipeline/estágio
  async function updateLeadPipeline() {
    if (!currentLead || !selectedPipeline || !selectedStage) return
    
    try {
      setUpdatingLead(true)
      
      // Verificar se já existe lead_pipeline
      const { data: existingLP, error: checkError } = await supabase
        .from('lead_pipelines')
        .select('*')
        .eq('lead_id', currentLead.id)
        .single()
      
      if (checkError && checkError.code !== 'PGRST116') throw checkError
      
      if (existingLP) {
        // Atualizar existente
        const { error: updateError } = await supabase
          .from('lead_pipelines')
          .update({
            pipeline_id: selectedPipeline,
            current_stage_id: selectedStage
          })
          .eq('id', existingLP.id)
        
        if (updateError) throw updateError
      } else {
        // Criar novo
        const { error: insertError } = await supabase
          .from('lead_pipelines')
          .insert({
            lead_id: currentLead.id,
            pipeline_id: selectedPipeline,
            current_stage_id: selectedStage
          })
        
        if (insertError) throw insertError
      }
      
      toast.success('Lead atualizado no pipeline com sucesso!')
      setIsPipelineSelectorOpen(false)
      setSelectedPipeline('')
      setSelectedStage('')
      setStages([])
      
    } catch (error) {
      console.error('Erro ao atualizar lead no pipeline:', error)
      toast.error('Erro ao atualizar lead no pipeline')
    } finally {
      setUpdatingLead(false)
    }
  }

  // Função para carregar templates de mensagens
  async function loadMessageTemplates() {
    if (!currentTeam?.id) return
    
    try {
      setLoadingTemplates(true)
      
      const { data: templates, error } = await supabase
        .from('message_templates')
        .select('*')
        .eq('team_id', currentTeam.id)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true })
      
      if (error) throw error
      
      // Processar templates para garantir que variables seja um array
      const processedTemplates = (templates || []).map(template => ({
        ...template,
        variables: typeof template.variables === 'string' 
          ? JSON.parse(template.variables) 
          : Array.isArray(template.variables) 
            ? template.variables 
            : []
      }))
      
      setMessageTemplates(processedTemplates)
    } catch (error) {
      console.error('Erro ao carregar templates:', error)
      toast.error('Erro ao carregar templates de mensagens')
    } finally {
      setLoadingTemplates(false)
    }
  }

  // Função para aplicar template selecionado
  async function applyTemplate(template: any) {
    if (!template) return
    
    let processedContent = template.content
    
    // Se há um contato selecionado, buscar dados do lead
    if (selectedContact) {
      try {
        // Buscar lead pelo telefone
        const lead = await findLeadByPhone()
        
        if (lead) {
          // Substituir variáveis básicas do lead
          processedContent = processedContent.replace(/\{\{name\}\}/g, lead.name || '')
          processedContent = processedContent.replace(/\{\{nome\}\}/g, lead.name || '')
          processedContent = processedContent.replace(/\{\{email\}\}/g, lead.email || '')
          processedContent = processedContent.replace(/\{\{phone\}\}/g, lead.phone || '')
          processedContent = processedContent.replace(/\{\{telefone\}\}/g, lead.phone || '')
          processedContent = processedContent.replace(/\{\{empresa\}\}/g, lead.company_name || '')
          processedContent = processedContent.replace(/\{\{company\}\}/g, lead.company_name || '')
          
          // Campos personalizados do lead
          if (lead.custom_fields) {
            Object.entries(lead.custom_fields).forEach(([key, value]) => {
              const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi') // Case insensitive
              processedContent = processedContent.replace(regex, String(value || ''))
            })
          }
          
          // Buscar dados da empresa para campos personalizados
          if (lead.company_id) {
            try {
              const { data: company, error: companyError } = await supabase
                .from('companies')
                .select('*')
                .eq('id', lead.company_id)
                .single()
              
              if (!companyError && company) {
                // Campos personalizados da empresa
                if (company.custom_fields) {
                  Object.entries(company.custom_fields).forEach(([key, value]) => {
                    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi') // Case insensitive
                    processedContent = processedContent.replace(regex, String(value || ''))
                  })
                }
              }
            } catch (error) {
              console.error('Erro ao buscar dados da empresa:', error)
            }
          }
        }
      } catch (error) {
        console.error('Erro ao buscar dados do lead:', error)
      }
    }
    
    // Aplicar template processado
    setNewMessage(processedContent)
    setIsTemplateSelectorOpen(false)
  }


  // Função para atualizar manualmente as mensagens
  const handleRefreshMessages = async () => {
    if (!selectedContact || !apiConfig || refreshing) return
    
    setRefreshing(true)
    toast.loading("Verificando novas mensagens...", { id: "refresh-messages" })
    
    try {
      
      // Buscar mensagens da API
      const response = await findMessages(apiConfig, selectedContact.phone, 50)
      
      // Verificar se a resposta tem o formato esperado
      if (!response || !response.messages || !response.messages.records) {
        toast.error("Erro ao verificar novas mensagens", { id: "refresh-messages" })
        return
      }
      
      const apiMessages = response.messages.records
      
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
      }
      
      // Buscar mensagens existentes no banco para evitar duplicação
      const existingMessages = await findMessagesByPhone(apiConfig.team_id, selectedContact.phone)
      const existingMessageIds = new Set(existingMessages.map(msg => msg.message_id))
      
      // Identificar novas mensagens
      const newApiMessages = apiMessages.filter(msg => !existingMessageIds.has(msg.key.id))
      
      if (newApiMessages.length > 0) {
        
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
          
          for (const msg of unreadMessages) {
            try {
              await markMessageAsRead(apiConfig, msg.key.id, selectedContact.phone, msg.key.fromMe)
            } catch (readError) {
              console.error("Erro ao marcar mensagem como lida:", readError)
              // Continuar mesmo se der erro ao marcar como lida
            }
          }
        }
        
        // Rolar para o final das mensagens apenas se o usuário estiver no final
        if (isAtBottom) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
          }, 100)
        }
        
        toast.success(`${newApiMessages.length} novas mensagens encontradas`, { id: "refresh-messages" })
      } else {
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
      
      
      // Primeiro, tentar carregar do banco de dados
      try {
        const dbChats = await findChatsFromDB(apiConfig.team_id)
        
        if (dbChats.length > 0) {
          
          // Converter para o formato esperado pela interface
          const formattedChats = dbChats.map(convertDBChatToAPIChat)
          
          setConversations(formattedChats)
          setLoadingConversations(false)
          return
        } else {
        }
      } catch (dbError) {
        console.error("Erro ao carregar conversas do banco de dados:", dbError)
      }
      
      // Se não encontrou no banco ou ocorreu erro, tentar da API
      try {
        const apiChats = await findChats(apiConfig)
        
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

  async function loadMessages(showToasts = true) {
    if (!selectedContact || !apiConfig) return
    
    try {
      setLoadingMessages(true)
      
      // Primeiro, carregar mensagens do banco de dados para exibição imediata
      try {
        const dbMessages = await findMessagesByPhone(apiConfig.team_id, selectedContact.phone)
        
        if (dbMessages.length > 0) {
          
          // Converter para o formato esperado pela interface
          const formattedMessages = dbMessages.map(convertDBMessageToAPIMessage)
          
          // Ordenar mensagens por timestamp (mais antigas primeiro)
          formattedMessages.sort((a, b) => a.messageTimestamp - b.messageTimestamp)
          
          // Atualizar a interface imediatamente com as mensagens do banco
          setMessages(formattedMessages)
          
          // Rolar para o final das mensagens apenas se o usuário estiver no final
          if (isAtBottom) {
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            }, 100)
          }
        }
      } catch (dbError) {
        console.error("Erro ao carregar mensagens do banco de dados:", dbError)
      }
      
      // Em segundo plano, buscar mensagens mais recentes da API
      setLoadingMessages(false) // Desativar o loading principal
      
      // Mostrar um indicador de atualização
      toast.loading("Verificando novas mensagens...", { id: "checking-messages" })
      
      try {
        const response = await findMessages(apiConfig, selectedContact.phone, 50)
        
        // Verificar se a resposta tem o formato esperado
        if (!response || !response.messages || !response.messages.records) {
            toast.error("Erro ao verificar novas mensagens", { id: "checking-messages" })
          return
        }
        
        const apiMessages = response.messages.records
          
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
          }
        
        // Buscar mensagens existentes no banco para evitar duplicação
        const existingMessages = await findMessagesByPhone(apiConfig.team_id, selectedContact.phone)
        const existingMessageIds = new Set(existingMessages.map(msg => msg.message_id))
        
        // Identificar novas mensagens
        const newApiMessages = apiMessages.filter(msg => !existingMessageIds.has(msg.key.id))
        
        if (newApiMessages.length > 0) {
            
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
              
            for (const msg of unreadMessages) {
              try {
                await markMessageAsRead(apiConfig, msg.key.id, selectedContact.phone, msg.key.fromMe)
              } catch (readError) {
                console.error("Erro ao marcar mensagem como lida:", readError)
                // Continuar mesmo se der erro ao marcar como lida
              }
            }
          }
          
          // Rolar para o final das mensagens apenas se o usuário estiver no final
          if (isAtBottom) {
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            }, 100)
          }
          
          if (showToasts) {
            toast.success(`${newApiMessages.length} novas mensagens encontradas`, { id: "checking-messages" })
          }
        } else {
            if (showToasts) {
            toast.success("Mensagens atualizadas", { id: "checking-messages" })
          }
        }
      } catch (apiError) {
        console.error("Erro ao verificar novas mensagens:", apiError)
        if (showToasts) {
          toast.error("Erro ao verificar novas mensagens", { id: "checking-messages" })
        }
      }
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error)
      setLoadingMessages(false)
      if (showToasts) {
        toast.error("Erro ao carregar mensagens")
      }
      
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

  // Função inteligente que só verifica novas mensagens sem recarregar tudo
  async function checkForNewMessages() {
    
    if (!selectedContact || !apiConfig) {
      return
    }
    
    try {
      // Pegar o timestamp da mensagem mais recente que temos (se houver mensagens)
      const lastTimestamp = messages.length > 0 ? (messages[messages.length - 1].messageTimestamp || 0) : 0
      
      
      // Buscar mensagens da API Evolution
      const apiResponse = await findMessages(apiConfig, selectedContact.phone)
      const apiMessages = apiResponse?.messages?.records || []
      
      if (apiMessages && apiMessages.length > 0) {
        // Criar um Set com os IDs das mensagens que já temos (se houver mensagens)
        const existingMessageIds = new Set(messages.map(msg => msg.key.id))
        
        let newMessages: EvolutionAPIMessage[] = []
        
        if (messages.length === 0) {
          // Se não há mensagens carregadas, considerar todas as mensagens da API como novas
          newMessages = apiMessages
        } else {
          // Filtrar mensagens que não temos (por ID) OU que são mais recentes (por timestamp)
          newMessages = apiMessages.filter(msg => {
            const msgId = msg.key?.id
            const msgTimestamp = msg.messageTimestamp || 0
            
            // Verificar se é nova por ID (mais confiável)
            const isNewById = msgId && !existingMessageIds.has(msgId)
            
            // Verificar se é nova por timestamp (fallback)
            const isNewByTimestamp = msgTimestamp > lastTimestamp
            
            const isNew = isNewById || isNewByTimestamp
            
            
            return isNew
          })
        }
        
        if (newMessages.length > 0) {
          
          // Ordenar as novas mensagens
          newMessages.sort((a, b) => a.messageTimestamp - b.messageTimestamp)
          
          if (messages.length === 0) {
            // Se não há mensagens carregadas, definir todas as mensagens de uma vez
            setMessages(newMessages)
          } else {
            // Adicionar apenas as novas mensagens ao estado existente
            setMessages(prevMessages => {
              const updated = [...prevMessages, ...newMessages]
              return updated
            })
          }
          
          // Verificar quais mensagens realmente precisam ser salvas no banco
          try {
            // Buscar mensagens existentes no banco para evitar duplicatas
            const existingDbMessages = await findMessagesByPhone(apiConfig.team_id, selectedContact.phone)
            const existingDbMessageIds = new Set(existingDbMessages.map(msg => msg.message_id))
            
            // Filtrar apenas mensagens que não existem no banco
            const messagesToSave = newMessages.filter(msg => 
              msg.key?.id && !existingDbMessageIds.has(msg.key.id)
            )
            
            if (messagesToSave.length > 0) {
              // Buscar ou criar o chat antes de salvar a mensagem
              let chat = await findChatByPhone(apiConfig.team_id, selectedContact.phone)
              
              if (!chat) {
                // Criar novo chat se não existir
                const newChat: EvolutionAPIDBChat = {
                  team_id: apiConfig.team_id,
                  phone: selectedContact.phone,
                  name: selectedContact.name,
                  whatsapp_jid: `${selectedContact.phone}@s.whatsapp.net`,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
                
                chat = await saveChat(newChat)
              }
              
              // Salvar apenas as mensagens que não existem no banco
              for (const message of messagesToSave) {
                try {
                  const dbMessage: EvolutionAPIDBMessage = {
                    team_id: apiConfig.team_id,
                    chat_id: chat.id!,
                    message_id: message.key?.id,
                    phone: selectedContact.phone,
                    text: message.message?.conversation || message.message?.extendedTextMessage?.text || '',
                    from_me: message.key?.fromMe || false,
                    status: 'received',
                    timestamp: new Date((message.messageTimestamp || 0) * 1000).toISOString()
                  }
                  
                  await saveMessage(dbMessage)
                } catch (saveError) {
                  console.error("Erro ao salvar mensagem nova no banco:", saveError)
                }
              }
            }
          } catch (dbError) {
            console.error("Erro ao verificar mensagens no banco:", dbError)
          }
          
          // Marcar mensagens como lidas se não forem nossas
          const unreadMessages = newMessages.filter(msg => !msg.key.fromMe)
          
          if (unreadMessages.length > 0) {
            for (const msg of unreadMessages) {
              try {
                await markMessageAsRead(apiConfig, msg.key.id, selectedContact.phone, msg.key.fromMe)
              } catch (readError) {
                console.error("Erro ao marcar mensagem como lida:", readError)
              }
            }
          }
          
          // Rolar para o final suavemente apenas se o usuário estiver no final
          if (isAtBottom) {
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            }, 100)
          }
        }
      }
    } catch (error) {
      console.error("❌ Erro ao verificar novas mensagens:", error)
      console.error("Stack trace:", (error as Error)?.stack)
      // Não mostrar toast para não incomodar o usuário
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
      
      // Garantir que o scroll vá para o final ao enviar mensagem
      setIsAtBottom(true)
      
      // Enviar a mensagem para a API
      const result = await sendTextMessage(apiConfig, selectedContact.phone, messageText)
      
      // Salvar a mensagem e atualizar a conversa no banco de dados
      try {
        
        // Verificar se a conversa já existe
        const existingChat = await findChatByPhone(apiConfig.team_id, selectedContact.phone)
        
        let chatId: string
        
        if (existingChat) {
          // Atualizar a conversa existente
          const updatedChat: EvolutionAPIDBChat = {
            ...existingChat,
            last_message: messageText,
            updated_at: new Date().toISOString()
          }
          
          const savedChat = await saveChat(updatedChat)
          chatId = savedChat.id!
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
          
          const savedChat = await saveChat(newChat)
          chatId = savedChat.id!
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
        
        const savedMessage = await saveMessage(newMessageObj)
        
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
        prevMessages.filter(msg => msg.key.id !== tempMessage.key.id)
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
    
    // Quando muda de contato, sempre considerar que está no final
    setIsAtBottom(true)
  }

  // Função para enriquecer conversas com dados do lead
  const enrichConversationsWithLeads = useCallback(async (conversations: EvolutionAPIChat[]) => {
    if (!currentTeam?.id) return conversations

    const enrichedConversations = await Promise.all(
      conversations.map(async (conversation) => {
        try {
          const cleanPhone = conversation.phone?.replace(/\D/g, '') || ''
          const { data: leads } = await supabase
            .from('leads')
            .select('name')
            .eq('team_id', currentTeam.id)
            .or(`phone.eq.${cleanPhone},phone.eq.${conversation.phone}`)
            .single()

          return {
            ...conversation,
            leadName: leads?.name || null
          }
        } catch (error) {
          return conversation
        }
      })
    )

    return enrichedConversations
  }, [currentTeam?.id])

  // Estado para conversas enriquecidas
  const [enrichedConversations, setEnrichedConversations] = useState<any[]>([])
  const [processedPhoneParam, setProcessedPhoneParam] = useState<string | null>(null)

  // Enriquecer conversas quando mudarem
  useEffect(() => {
    if (conversations.length > 0) {
      enrichConversationsWithLeads(conversations).then(setEnrichedConversations)
    } else {
      setEnrichedConversations([])
    }
  }, [conversations, enrichConversationsWithLeads])

  const filteredConversations = enrichedConversations.filter(conversation => {
    const searchLower = searchTerm.toLowerCase()
    return (
      conversation.leadName?.toLowerCase().includes(searchLower) ||
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
        
        // Garantir que o scroll vá para o final ao enviar áudio
        setIsAtBottom(true)
        
        
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

        <div className="flex flex-1 overflow-hidden h-[calc(100vh-4rem)]">
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
              <div className="w-80 border-r flex flex-col h-[calc(100vh-4rem)]">
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
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-sm truncate">
                                  {conversation.leadName || conversation.name || 'Sem nome'}
                                </h3>
                                <p className="text-xs text-muted-foreground/70 truncate">
                                  {conversation.phone}
                                </p>
                              </div>
                              {conversation.lastMessage?.timestamp && (
                                <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                                  {formatMessageDate(conversation.lastMessage.timestamp)}
                                </span>
                              )}
                            </div>
                            {conversation.lastMessage?.text && (
                              <p className="text-xs text-muted-foreground truncate mt-1">
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
              <div className="flex-1 flex flex-col h-[calc(100vh-4rem)]">
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
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={openPipelineSelector}
                          title="Gerenciar Pipeline"
                        >
                          <Target className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={handleRefreshMessages}
                          disabled={refreshing}
                        >
                          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    </div>
                    
                    <div 
                      ref={messagesContainerRef}
                      className="flex-1 overflow-y-auto p-4 space-y-4 h-[calc(100vh-12rem)]"
                      onScroll={checkIfAtBottom}
                    >
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
                                    <p className="text-sm break-words break-all">
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
                                        <p className="text-sm break-words break-all">{message.message.imageMessage.caption}</p>
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
                                        <p className="text-sm break-words break-all">{message.message.videoMessage.caption}</p>
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
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setIsTemplateSelectorOpen(true)}
                            title="Selecionar template"
                          >
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          </Button>
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
      
      {/* Modal do Seletor de Pipeline */}
      <Dialog open={isPipelineSelectorOpen} onOpenChange={setIsPipelineSelectorOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Gerenciar Pipeline</DialogTitle>
            <DialogDescription>
              Selecione o pipeline e estágio para o lead {currentLead?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="pipeline">Pipeline</Label>
              <Select
                value={selectedPipeline}
                onValueChange={(value) => {
                  setSelectedPipeline(value)
                  setSelectedStage('')
                  loadStages(value)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {stages.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="stage">Estágio</Label>
                <Select value={selectedStage} onValueChange={setSelectedStage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um estágio" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.stage_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {currentLead && (
              <div className="text-sm text-muted-foreground">
                <p><strong>Lead:</strong> {currentLead.name}</p>
                <p><strong>Email:</strong> {currentLead.email}</p>
                <p><strong>Telefone:</strong> {currentLead.phone}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsPipelineSelectorOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={updateLeadPipeline}
              disabled={!selectedPipeline || !selectedStage || updatingLead}
            >
              {updatingLead ? 'Atualizando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de seleção de templates */}
      <Dialog open={isTemplateSelectorOpen} onOpenChange={setIsTemplateSelectorOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Selecionar Template de Mensagem</DialogTitle>
            <DialogDescription>
              Escolha um template para acelerar o envio de mensagens
            </DialogDescription>
          </DialogHeader>
          
          {/* Sempre mostrar a tela de seleção de templates */}
          {(
            // Tela de seleção de templates
            <div className="space-y-4">
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Carregando templates...</span>
                </div>
              ) : messageTemplates.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Nenhum template encontrado. 
                    <Link href="/configuracoes" className="text-primary underline ml-1">
                      Criar templates
                    </Link>
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {/* Agrupar templates por categoria */}
                  {(() => {
                    const groupedTemplates = messageTemplates.reduce((acc, template) => {
                      const category = template.category || 'Geral'
                      if (!acc[category]) acc[category] = []
                      acc[category].push(template)
                      return acc
                    }, {} as Record<string, any[]>)
                    
                    return Object.entries(groupedTemplates).map(([category, templates]) => (
                      <div key={category} className="space-y-2">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                          {category}
                        </h4>
                        {templates.map((template) => (
                          <div 
                            key={template.id}
                            className="p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                            onClick={() => applyTemplate(template)}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <h5 className="font-medium">{template.name}</h5>
                              {(() => {
                                const variablesArray = Array.isArray(template.variables) ? template.variables : []
                                return variablesArray.length > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {variablesArray.length} variáveis
                                  </Badge>
                                )
                              })()}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {template.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    ))
                  })()}
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsTemplateSelectorOpen(false)}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
} 