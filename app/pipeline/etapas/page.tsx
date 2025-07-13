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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import { Plus, ArrowUp, ArrowDown, Trash2, Pencil } from "lucide-react"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useTeam } from "@/lib/team-context"

interface Pipeline {
  id: string
  name: string
  description: string
  created_at: string
}

interface PipelineStage {
  id: string
  pipeline_id: string
  stage_name: string
  stage_order: number
  created_at: string
}

const stageSchema = z.object({
  stage_name: z.string().min(1, "Nome do estágio é obrigatório"),
  pipeline_id: z.string().min(1, "Pipeline é obrigatório"),
})

type StageFormData = z.infer<typeof stageSchema>

export default function PipelineStagesPage() {
  const router = useRouter()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null)
  const { currentTeam } = useTeam()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<StageFormData>({
    resolver: zodResolver(stageSchema),
  })

  useEffect(() => {
    loadPipelines()
  }, [currentTeam])

  useEffect(() => {
    if (selectedPipeline) {
      loadStages(selectedPipeline)
    }
  }, [selectedPipeline])

  async function loadPipelines() {
    try {
      setLoading(true)
      
      // Verificar se há um time selecionado
      if (!currentTeam?.id) {
        setPipelines([])
        toast.warning("Selecione um time para visualizar os pipelines")
        return
      }
      
      // Filtrar pipelines pelo time atual
      const { data, error } = await supabase
        .from('pipelines')
        .select('*')
        .eq('team_id', currentTeam.id)
        .not('team_id', 'is', null) // Garantir que team_id não seja nulo
        .order('name')
      
      if (error) throw error
      
      setPipelines(data || [])
      
      // Se tiver pipelines, seleciona o primeiro por padrão
      if (data && data.length > 0 && !selectedPipeline) {
        setSelectedPipeline(data[0].id)
        await loadStages(data[0].id)
      }
    } catch (error) {
      console.error('Erro ao carregar pipelines:', error)
      toast.error("Erro ao carregar pipelines")
    } finally {
      setLoading(false)
    }
  }

  async function loadStages(pipelineId: string) {
    try {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('stage_order')

      if (error) throw error
      setStages(data || [])
    } catch (error) {
      console.error('Erro ao carregar estágios:', error)
      toast.error("Erro ao carregar estágios do pipeline")
    }
  }

  async function onSubmit(data: StageFormData) {
    try {
      if (editingStage) {
        // Atualizar estágio existente
        const { error } = await supabase
          .from('pipeline_stages')
          .update({ stage_name: data.stage_name })
          .eq('id', editingStage.id)

        if (error) throw error
        toast.success("Estágio atualizado com sucesso!")
      } else {
        // Criar novo estágio
        // Determinar a ordem do novo estágio (último + 1)
        const nextOrder = stages.length > 0 
          ? Math.max(...stages.map(s => s.stage_order)) + 1 
          : 1

        const { error } = await supabase
          .from('pipeline_stages')
          .insert([{ 
            pipeline_id: data.pipeline_id, 
            stage_name: data.stage_name,
            stage_order: nextOrder
          }])

        if (error) throw error
        toast.success("Estágio adicionado com sucesso!")
      }

      // Recarregar estágios e fechar o diálogo
      loadStages(selectedPipeline!)
      closeDialog()
    } catch (error) {
      console.error('Erro ao salvar estágio:', error)
      toast.error("Erro ao salvar estágio")
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este estágio?")) return

    try {
      // Verificar se há leads neste estágio
      const { data: leadsInStage, error: checkError } = await supabase
        .from('lead_pipelines')
        .select('id')
        .eq('current_stage_id', id)
        .limit(1)

      if (checkError) throw checkError

      if (leadsInStage && leadsInStage.length > 0) {
        return toast.error("Não é possível excluir um estágio que contém leads")
      }

      const { error } = await supabase
        .from('pipeline_stages')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success("Estágio excluído com sucesso!")
      loadStages(selectedPipeline!)
    } catch (error) {
      console.error('Erro ao excluir estágio:', error)
      toast.error("Erro ao excluir estágio")
    }
  }

  async function handleMoveStage(id: string, direction: 'up' | 'down') {
    try {
      const currentIndex = stages.findIndex(s => s.id === id)
      if (currentIndex === -1) return
      
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      
      // Verificar se o movimento é válido
      if (targetIndex < 0 || targetIndex >= stages.length) return
      
      const currentStage = stages[currentIndex]
      const targetStage = stages[targetIndex]
      
      // Trocar as ordens
      const { error: error1 } = await supabase
        .from('pipeline_stages')
        .update({ stage_order: targetStage.stage_order })
        .eq('id', currentStage.id)
        
      if (error1) throw error1
      
      const { error: error2 } = await supabase
        .from('pipeline_stages')
        .update({ stage_order: currentStage.stage_order })
        .eq('id', targetStage.id)
        
      if (error2) throw error2
      
      toast.success("Ordem atualizada com sucesso!")
      loadStages(selectedPipeline!)
    } catch (error) {
      console.error('Erro ao mover estágio:', error)
      toast.error("Erro ao atualizar ordem dos estágios")
    }
  }

  function openNewStageDialog() {
    setEditingStage(null)
    reset({ stage_name: '', pipeline_id: selectedPipeline || '' })
    setIsDialogOpen(true)
  }

  function openEditStageDialog(stage: PipelineStage) {
    setEditingStage(stage)
    reset({ 
      stage_name: stage.stage_name, 
      pipeline_id: stage.pipeline_id 
    })
    setIsDialogOpen(true)
  }

  function closeDialog() {
    setIsDialogOpen(false)
    setEditingStage(null)
    reset()
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
                  <BreadcrumbPage>Configurar Etapas</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">Configurar Etapas</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie os estágios dos seus pipelines de vendas
              </p>
            </div>
            <Button onClick={() => router.push('/pipeline/novo')}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Pipeline
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <p>Carregando pipelines...</p>
            </div>
          ) : pipelines.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 border rounded-lg p-6">
              <h3 className="text-lg font-medium mb-2">Nenhum pipeline encontrado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie seu primeiro pipeline para começar a configurar os estágios
              </p>
              <Button onClick={() => router.push('/pipeline/novo')}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Pipeline
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <div className="w-64">
                  <Select
                    value={selectedPipeline || undefined}
                    onValueChange={setSelectedPipeline}
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
                <Button onClick={openNewStageDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Estágio
                </Button>
              </div>

              {stages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 border rounded-lg p-6">
                  <h3 className="text-lg font-medium mb-2">Nenhum estágio encontrado</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Adicione estágios ao seu pipeline para começar a gerenciar seus leads
                  </p>
                  <Button onClick={openNewStageDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Estágio
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ordem</TableHead>
                        <TableHead>Nome do Estágio</TableHead>
                        <TableHead className="w-[150px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stages.map((stage, index) => (
                        <TableRow key={stage.id}>
                          <TableCell className="font-medium">
                            {stage.stage_order}
                          </TableCell>
                          <TableCell>{stage.stage_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {index > 0 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleMoveStage(stage.id, 'up')}
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </Button>
                              )}
                              {index < stages.length - 1 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleMoveStage(stage.id, 'down')}
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditStageDialog(stage)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(stage.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStage ? "Editar Estágio" : "Adicionar Estágio"}
              </DialogTitle>
              <DialogDescription>
                {editingStage 
                  ? "Edite as informações do estágio do pipeline" 
                  : "Preencha as informações para adicionar um novo estágio ao pipeline"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="stage_name">Nome do Estágio</Label>
                <Input
                  id="stage_name"
                  placeholder="Ex: Qualificação, Proposta, Fechamento"
                  {...register("stage_name")}
                />
                {errors.stage_name && (
                  <p className="text-sm text-red-500">{errors.stage_name.message}</p>
                )}
              </div>

              <input
                type="hidden"
                {...register("pipeline_id")}
                value={selectedPipeline || ''}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingStage ? "Salvar" : "Adicionar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
} 