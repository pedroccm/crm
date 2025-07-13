"use client"

import { useEffect, useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, Plus, Check } from "lucide-react"
import { useTeam } from "@/lib/team-context"

interface PageProps {
  params: {
    pipeline: string
    stage: string
  }
}

interface Lead {
  id: string
  name: string
  email: string
  company_id: string
  company_name?: string
  status: string
  created_at: string
}

interface Pipeline {
  id: string
  name: string
}

interface PipelineStage {
  id: string
  stage_name: string
}

const addLeadSchema = z.object({
  lead_id: z.string().min(1, "Lead é obrigatório"),
})

type AddLeadFormData = z.infer<typeof addLeadSchema>

export default function AddLeadToPipelinePage({ params }: PageProps) {
  const router = useRouter()
  const [pipeline, setPipeline] = useState<Pipeline | null>(null)
  const [stage, setStage] = useState<PipelineStage | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [addingLead, setAddingLead] = useState(false)
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const { currentTeam } = useTeam()

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AddLeadFormData>({
    resolver: zodResolver(addLeadSchema),
  })

  useEffect(() => {
    loadPipelineInfo()
    loadLeads()
  }, [])

  useEffect(() => {
    filterLeads()
  }, [searchTerm, leads])

  async function loadPipelineInfo() {
    try {
      // Carregar informações do pipeline
      const { data: pipelineData, error: pipelineError } = await supabase
        .from('pipelines')
        .select('id, name')
        .eq('id', params.pipeline)
        .single()

      if (pipelineError) throw pipelineError
      setPipeline(pipelineData)

      // Carregar informações do estágio
      const { data: stageData, error: stageError } = await supabase
        .from('pipeline_stages')
        .select('id, stage_name')
        .eq('id', params.stage)
        .single()

      if (stageError) throw stageError
      setStage(stageData)
    } catch (error) {
      console.error('Erro ao carregar informações:', error)
      toast.error("Erro ao carregar informações do pipeline")
      router.push('/pipeline')
    }
  }

  async function loadLeads() {
    try {
      setLoading(true)
      
      // Verificar se há um time selecionado
      if (!currentTeam?.id) {
        setLeads([])
        setFilteredLeads([])
        toast.warning("Selecione um time para visualizar os leads")
        return
      }
      
      // Carregar leads que ainda não estão neste pipeline
      const { data: existingLeadPipelines, error: existingError } = await supabase
        .from('lead_pipelines')
        .select('lead_id')
        .eq('pipeline_id', params.pipeline)
      
      if (existingError) throw existingError
      
      // Extrair IDs de leads que já estão no pipeline
      const existingLeadIds = existingLeadPipelines?.map(lp => lp.lead_id) || []
      
      // Carregar todos os leads do time atual
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          companies (
            name
          )
        `)
        .eq('team_id', currentTeam.id)
        .not('team_id', 'is', null)
        .order('name')
      
      if (error) throw error
      
      // Transformar os dados para incluir o nome da empresa
      const formattedLeads = data?.map(lead => ({
        ...lead,
        company_name: lead.companies?.name
      })) || []
      
      // Filtrar leads que já estão no pipeline
      const availableLeads = existingLeadIds.length > 0
        ? formattedLeads.filter(lead => !existingLeadIds.includes(lead.id))
        : formattedLeads
      
      setLeads(availableLeads)
      setFilteredLeads(availableLeads)
    } catch (error) {
      console.error('Erro ao carregar leads:', error)
      toast.error("Erro ao carregar leads disponíveis")
    } finally {
      setLoading(false)
    }
  }

  function filterLeads() {
    if (!searchTerm.trim()) {
      setFilteredLeads(leads)
      return
    }

    const filtered = leads.filter(lead =>
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.company_name && lead.company_name.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    
    setFilteredLeads(filtered)
  }

  async function addLeadToPipeline(leadId: string) {
    try {
      setAddingLead(true)
      
      const { error } = await supabase
        .from('lead_pipelines')
        .insert([{
          lead_id: leadId,
          pipeline_id: params.pipeline,
          current_stage_id: params.stage
        }])
      
      if (error) throw error
      
      // Remover o lead da lista
      setLeads(prevLeads => prevLeads.filter(lead => lead.id !== leadId))
      setSelectedLeads(prevSelected => prevSelected.filter(id => id !== leadId))
      
      toast.success("Lead adicionado ao pipeline com sucesso!")
    } catch (error) {
      console.error('Erro ao adicionar lead ao pipeline:', error)
      toast.error("Erro ao adicionar lead ao pipeline")
    } finally {
      setAddingLead(false)
    }
  }

  async function addSelectedLeads() {
    if (selectedLeads.length === 0) {
      toast.error("Selecione pelo menos um lead para adicionar")
      return
    }
    
    try {
      setAddingLead(true)
      
      // Criar array de objetos para inserção
      const leadsToAdd = selectedLeads.map(leadId => ({
        lead_id: leadId,
        pipeline_id: params.pipeline,
        current_stage_id: params.stage
      }))
      
      const { error } = await supabase
        .from('lead_pipelines')
        .insert(leadsToAdd)
      
      if (error) throw error
      
      // Remover os leads adicionados da lista
      setLeads(prevLeads => prevLeads.filter(lead => !selectedLeads.includes(lead.id)))
      setSelectedLeads([])
      
      toast.success(`${leadsToAdd.length} leads adicionados ao pipeline com sucesso!`)
      
      // Redirecionar para a página do pipeline após adicionar
      router.push('/pipeline')
    } catch (error) {
      console.error('Erro ao adicionar leads ao pipeline:', error)
      toast.error("Erro ao adicionar leads ao pipeline")
    } finally {
      setAddingLead(false)
    }
  }

  function toggleLeadSelection(leadId: string) {
    setSelectedLeads(prevSelected => 
      prevSelected.includes(leadId)
        ? prevSelected.filter(id => id !== leadId)
        : [...prevSelected, leadId]
    )
  }

  function selectAllLeads() {
    if (selectedLeads.length === filteredLeads.length) {
      // Se todos já estão selecionados, desmarcar todos
      setSelectedLeads([])
    } else {
      // Caso contrário, selecionar todos
      setSelectedLeads(filteredLeads.map(lead => lead.id))
    }
  }

  // Função para obter a classe de cor com base no status
  function getStatusClass(status: string) {
    switch (status.toLowerCase()) {
      case 'novo':
        return 'bg-blue-100 text-blue-800'
      case 'qualificado':
        return 'bg-green-100 text-green-800'
      case 'desqualificado':
        return 'bg-red-100 text-red-800'
      case 'em negociação':
        return 'bg-yellow-100 text-yellow-800'
      case 'convertido':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
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
                  <BreadcrumbLink href="/pipeline">Pipeline</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Adicionar Lead</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Adicionar Lead ao Pipeline</h1>
            <p className="text-sm text-muted-foreground">
              {pipeline && stage 
                ? `Adicionar lead ao pipeline "${pipeline.name}" no estágio "${stage.stage_name}"`
                : "Carregando informações..."}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar leads por nome, email ou empresa..."
                className="pl-8"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={selectAllLeads}
              >
                {selectedLeads.length === filteredLeads.length && filteredLeads.length > 0
                  ? "Desmarcar Todos"
                  : "Selecionar Todos"}
              </Button>
              
              <Button
                onClick={addSelectedLeads}
                disabled={selectedLeads.length === 0 || addingLead}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Selecionados ({selectedLeads.length})
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <p>Carregando leads disponíveis...</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 border rounded-lg p-6">
              <h3 className="text-lg font-medium mb-2">Nenhum lead disponível</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Todos os leads já foram adicionados a este pipeline ou não há leads cadastrados.
              </p>
              <Button onClick={() => router.push('/leads/novo')}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Novo Lead
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                          onChange={selectAllLeads}
                        />
                      </div>
                    </TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={selectedLeads.includes(lead.id)}
                            onChange={() => toggleLeadSelection(lead.id)}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell>{lead.email}</TableCell>
                      <TableCell>{lead.company_name || "-"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(lead.status)}`}>
                          {lead.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() => addLeadToPipeline(lead.id)}
                          disabled={addingLead}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Adicionar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 