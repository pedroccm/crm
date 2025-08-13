"use client"

import { useState } from "react"
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
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useTeam } from "@/lib/team-context"

const pipelineSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
})

type PipelineFormData = z.infer<typeof pipelineSchema>

export default function NovoPipelinePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { currentTeam, isLoadingTeams } = useTeam()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PipelineFormData>({
    resolver: zodResolver(pipelineSchema),
  })

  async function onSubmit(data: PipelineFormData) {
    try {
      setLoading(true)
      
      // Verificar se ainda está carregando ou se há um time selecionado
      if (isLoadingTeams) {
        toast.error("Aguarde o carregamento dos times")
        return
      }
      
      if (!currentTeam?.id) {
        toast.error("Selecione um time para criar um pipeline")
        return
      }
      
      // Criar o pipeline
      const { data: newPipeline, error } = await supabase
        .from('pipelines')
        .insert([{
          name: data.name,
          description: data.description || "",
          team_id: currentTeam.id
        }])
        .select()

      if (error) throw error
      
      toast.success("Pipeline criado com sucesso!")
      
      // Criar estágio inicial padrão
      if (newPipeline && newPipeline.length > 0) {
        const { error: stageError } = await supabase
          .from('pipeline_stages')
          .insert([{
            pipeline_id: newPipeline[0].id,
            stage_name: "Novo",
            stage_order: 1
          }])
        
        if (stageError) {
          console.error("Erro ao criar estágio inicial:", stageError)
          // Não impede o fluxo, apenas loga o erro
        }
        
        // Redirecionar para a página do pipeline
        router.push(`/pipeline?id=${newPipeline[0].id}`)
      } else {
        router.push('/pipeline')
      }
    } catch (error) {
      console.error('Erro ao criar pipeline:', error)
      toast.error("Erro ao criar pipeline")
    } finally {
      setLoading(false)
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
                  <BreadcrumbPage>Novo Pipeline</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">Novo Pipeline</h1>
              <p className="text-sm text-muted-foreground">
                Crie um novo pipeline para gerenciar suas oportunidades de vendas
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Pipeline</Label>
                <Input
                  id="name"
                  placeholder="Ex: Funil de Vendas"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o propósito deste pipeline"
                  {...register("description")}
                />
                {errors.description && (
                  <p className="text-sm text-red-500">{errors.description.message}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading || isLoadingTeams}>
                {loading ? "Criando..." : isLoadingTeams ? "Carregando..." : "Criar Pipeline"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/pipeline')}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 