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
import { Textarea } from "@/components/ui/textarea"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { supabase } from "@/lib/supabase"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"

interface PageProps {
  params: {
    action: string
  }
}

const pipelineSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
})

type PipelineFormData = z.infer<typeof pipelineSchema>

export default function PipelineFormPage({ params }: PageProps) {
  const router = useRouter()
  const isEditing = params.action !== "novo"
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(isEditing)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PipelineFormData>({
    resolver: zodResolver(pipelineSchema),
  })

  useEffect(() => {
    if (isEditing) {
      loadPipeline()
    }
  }, [isEditing])

  async function loadPipeline() {
    try {
      setLoadingData(true)
      console.log("Carregando pipeline com ID:", params.action)
      
      const { data, error } = await supabase
        .from('pipelines')
        .select('*')
        .eq('id', params.action)
        .single()

      if (error) {
        console.error('Erro ao carregar pipeline:', error)
        throw error
      }
      
      if (data) {
        console.log("Dados do pipeline carregados:", data)
        reset(data)
      } else {
        console.error('Pipeline não encontrado')
        toast.error("Pipeline não encontrado")
        router.push('/pipeline')
      }
    } catch (error) {
      console.error('Erro ao carregar pipeline:', error)
      toast.error("Erro ao carregar dados do pipeline")
    } finally {
      setLoadingData(false)
    }
  }

  async function onSubmit(data: PipelineFormData) {
    try {
      setLoading(true)

      if (isEditing) {
        const { error } = await supabase
          .from('pipelines')
          .update(data)
          .eq('id', params.action)

        if (error) throw error
        toast.success("Pipeline atualizado com sucesso!")
      } else {
        const { error } = await supabase
          .from('pipelines')
          .insert([data])

        if (error) throw error
        toast.success("Pipeline criado com sucesso!")
      }

      router.push('/pipeline')
    } catch (error) {
      console.error('Erro ao salvar pipeline:', error)
      toast.error("Erro ao salvar pipeline")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
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
                    <BreadcrumbPage>Carregando...</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="flex flex-1 flex-col items-center justify-center">
            <p>Carregando dados do pipeline...</p>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
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
                  <BreadcrumbPage>
                    {isEditing ? "Editar" : "Novo"} Pipeline
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">
              {isEditing ? "Editar" : "Novo"} Pipeline
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEditing
                ? "Edite as informações do pipeline"
                : "Preencha as informações para criar um novo pipeline"}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Pipeline</Label>
                <Input
                  id="name"
                  placeholder="Ex: Vendas, Prospecção, Atendimento"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o objetivo deste pipeline"
                  className="min-h-[120px]"
                  {...register("description")}
                />
                {errors.description && (
                  <p className="text-sm text-red-500">{errors.description.message}</p>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
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