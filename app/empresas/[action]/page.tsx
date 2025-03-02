"use client"

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
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"

const companySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  address: z.string().optional(),
  website: z.string().url("Website inválido").optional().or(z.literal("")),
})

type CompanyFormData = z.infer<typeof companySchema>

interface PageProps {
  params: {
    action: string
  }
}

export default function CompanyFormPage({ params }: PageProps) {
  const router = useRouter()
  const isEditing = params.action !== "nova"
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(isEditing)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
  })

  useEffect(() => {
    if (isEditing) {
      loadCompany()
    }
  }, [isEditing])

  async function loadCompany() {
    try {
      setLoadingData(true)
      console.log("Carregando empresa com ID:", params.action)
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', params.action)
        .single()

      if (error) {
        console.error('Erro ao carregar empresa:', error)
        throw error
      }
      
      if (data) {
        console.log("Dados da empresa carregados:", data)
        reset(data)
      } else {
        console.error('Empresa não encontrada')
        toast.error("Empresa não encontrada")
        router.push('/empresas')
      }
    } catch (error) {
      console.error('Erro ao carregar empresa:', error)
      toast.error("Erro ao carregar dados da empresa")
    } finally {
      setLoadingData(false)
    }
  }

  async function onSubmit(data: CompanyFormData) {
    try {
      setLoading(true)

      if (isEditing) {
        const { error } = await supabase
          .from('companies')
          .update(data)
          .eq('id', params.action)

        if (error) throw error
        toast.success("Empresa atualizada com sucesso!")
      } else {
        const { error } = await supabase
          .from('companies')
          .insert([data])

        if (error) throw error
        toast.success("Empresa cadastrada com sucesso!")
      }

      router.push('/empresas')
    } catch (error) {
      console.error('Erro ao salvar empresa:', error)
      toast.error("Erro ao salvar empresa")
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
                    <BreadcrumbLink href="/empresas">Empresas</BreadcrumbLink>
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
            <p>Carregando dados da empresa...</p>
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
                  <BreadcrumbLink href="/empresas">Empresas</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {isEditing ? "Editar" : "Nova"} Empresa
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">
              {isEditing ? "Editar" : "Nova"} Empresa
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEditing
                ? "Edite os dados da empresa"
                : "Preencha os dados para cadastrar uma nova empresa"}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  placeholder="Nome da empresa"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@empresa.com"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  placeholder="(00) 0000-0000"
                  {...register("phone")}
                />
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  placeholder="https://www.empresa.com"
                  {...register("website")}
                />
                {errors.website && (
                  <p className="text-sm text-red-500">{errors.website.message}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  placeholder="Endereço completo"
                  {...register("address")}
                />
                {errors.address && (
                  <p className="text-sm text-red-500">{errors.address.message}</p>
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
                onClick={() => router.push('/empresas')}
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