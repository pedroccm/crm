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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { supabase, logLeadActivity, LeadLogActionType } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"

interface Company {
  id: string
  name: string
}

// Definindo o tipo para custom_fields
interface CustomFields {
  [key: string]: string;
}

const leadSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  company_id: z.string().min(1, "Empresa é obrigatória"),
  status: z.string().min(1, "Status é obrigatório"),
  custom_fields: z.any().optional(),
})

type LeadFormData = z.infer<typeof leadSchema>

interface PageProps {
  params: {
    action: string
  }
}

export default function LeadFormPage({ params }: PageProps) {
  const router = useRouter()
  const isEditing = params.action !== "novo"
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(isEditing)
  const [companies, setCompanies] = useState<Company[]>([])
  const [notes, setNotes] = useState("")

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    setValue,
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      status: "Novo",
      custom_fields: {} as CustomFields,
    }
  })

  useEffect(() => {
    loadCompanies()
    if (isEditing) {
      loadLead()
    }
  }, [isEditing])

  async function loadCompanies() {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name')

      if (error) throw error
      setCompanies(data || [])
    } catch (error) {
      console.error('Erro ao carregar empresas:', error)
      toast.error("Erro ao carregar lista de empresas")
    }
  }

  async function loadLead() {
    try {
      setLoadingData(true)
      console.log("Carregando lead com ID:", params.action)
      
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', params.action)
        .single()

      if (error) {
        console.error('Erro ao carregar lead:', error)
        throw error
      }
      
      if (data) {
        console.log("Dados do lead carregados:", data)
        // Extrair as notas do custom_fields se existirem
        if (data.custom_fields && data.custom_fields.notes) {
          setNotes(data.custom_fields.notes)
          // Criar uma cópia do objeto para manipulação
          const customFields = { ...data.custom_fields } as CustomFields
          delete customFields.notes
          data.custom_fields = customFields
        }
        reset(data)
      } else {
        console.error('Lead não encontrado')
        toast.error("Lead não encontrado")
        router.push('/leads')
      }
    } catch (error) {
      console.error('Erro ao carregar lead:', error)
      toast.error("Erro ao carregar dados do lead")
    } finally {
      setLoadingData(false)
    }
  }

  async function onSubmit(data: LeadFormData) {
    try {
      setLoading(true)

      // Adicionar as notas ao custom_fields
      const customFields = { ...(data.custom_fields || {}) } as CustomFields
      if (notes) {
        customFields.notes = notes
      }
      data.custom_fields = customFields

      if (isEditing) {
        const { error } = await supabase
          .from('leads')
          .update(data)
          .eq('id', params.action)

        if (error) throw error
        
        // Registrar a atividade de atualização no log
        await logLeadActivity({
          lead_id: params.action,
          action_type: LeadLogActionType.UPDATED,
          description: `Lead "${data.name}" atualizado`,
          details: { 
            updated_fields: Object.keys(data).filter(key => key !== 'custom_fields')
          }
        });
        
        toast.success("Lead atualizado com sucesso!")
      } else {
        // Inserir o novo lead
        const { data: newLead, error } = await supabase
          .from('leads')
          .insert([data])
          .select()

        if (error) throw error
        
        // Registrar a atividade de criação no log se temos o ID do novo lead
        if (newLead && newLead.length > 0) {
          await logLeadActivity({
            lead_id: newLead[0].id,
            action_type: LeadLogActionType.CREATED,
            description: `Lead "${data.name}" criado`,
            details: { 
              company_id: data.company_id,
              status: data.status
            }
          });
        }
        
        toast.success("Lead cadastrado com sucesso!")
      }

      router.push('/leads')
    } catch (error) {
      console.error('Erro ao salvar lead:', error)
      toast.error("Erro ao salvar lead")
    } finally {
      setLoading(false)
    }
  }

  const statusOptions = [
    { value: "Novo", label: "Novo" },
    { value: "Qualificado", label: "Qualificado" },
    { value: "Desqualificado", label: "Desqualificado" },
    { value: "Em negociação", label: "Em negociação" },
    { value: "Convertido", label: "Convertido" },
  ]

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
                    <BreadcrumbLink href="/leads">Leads</BreadcrumbLink>
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
            <p>Carregando dados do lead...</p>
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
                  <BreadcrumbLink href="/leads">Leads</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {isEditing ? "Editar" : "Novo"} Lead
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">
              {isEditing ? "Editar" : "Novo"} Lead
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEditing
                ? "Edite os dados do lead"
                : "Preencha os dados para cadastrar um novo lead"}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  placeholder="Nome do contato"
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
                  placeholder="email@exemplo.com"
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
                <Label htmlFor="company_id">Empresa</Label>
                <Controller
                  name="company_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.company_id && (
                  <p className="text-sm text-red-500">{errors.company_id.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.status && (
                  <p className="text-sm text-red-500">{errors.status.message}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  placeholder="Informações adicionais sobre o lead"
                  className="min-h-[120px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/leads')}
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