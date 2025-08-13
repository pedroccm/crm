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
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { useTeam } from "@/lib/team-context"
import { 
  CustomFieldDefinition, 
  CustomFieldType, 
  listCustomFields 
} from "@/lib/supabase"
import { 
  Checkbox 
} from "@/components/ui/checkbox"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"

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
  const searchParams = useSearchParams()
  const isEditing = params.action !== "novo"
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(isEditing)
  const [companies, setCompanies] = useState<Company[]>([])
  const [notes, setNotes] = useState("")
  const { currentTeam } = useTeam()
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([])
  const [loadingCustomFields, setLoadingCustomFields] = useState(false)

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
    if (currentTeam?.id) {
      loadCustomFields()
    }
  }, [isEditing, currentTeam])

  // useEffect para preencher telefone quando vier da URL
  useEffect(() => {
    if (!isEditing && searchParams) {
      const phoneParam = searchParams.get('phone')
      if (phoneParam) {
        setValue('phone', decodeURIComponent(phoneParam))
      }
    }
  }, [searchParams, isEditing, setValue])

  async function loadCompanies() {
    try {
      // Verificar se há um time selecionado
      if (!currentTeam?.id) {
        setCompanies([])
        toast.warning("Selecione um time para visualizar as empresas")
        return
      }
      
      // Filtrar empresas pelo time atual
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .eq('team_id', currentTeam.id)
        .not('team_id', 'is', null) // Garantir que team_id não seja nulo
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

  async function loadCustomFields() {
    try {
      setLoadingCustomFields(true)
      
      if (!currentTeam?.id) {
        return
      }
      
      const fields = await listCustomFields(currentTeam.id, 'lead')
      setCustomFields(fields)
    } catch (error) {
      console.error('Erro ao carregar campos personalizados:', error)
    } finally {
      setLoadingCustomFields(false)
    }
  }

  async function onSubmit(data: LeadFormData) {
    try {
      setLoading(true)
      
      // Verificar se há um time selecionado
      if (!currentTeam?.id) {
        toast.error("Selecione um time para salvar o lead")
        setLoading(false)
        return
      }

      // Adicionar as notas ao custom_fields
      const customFields = { ...(data.custom_fields || {}) } as CustomFields
      if (notes) {
        customFields.notes = notes
      }
      data.custom_fields = customFields

      // Garantir que o team_id seja incluído
      const leadData = {
        ...data,
        team_id: currentTeam.id // Usar currentTeam.id diretamente, já que verificamos acima
      };

      if (isEditing) {
        const { error } = await supabase
          .from('leads')
          .update(leadData)
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
          .insert([leadData])
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
              status: data.status,
              team_id: currentTeam.id // Usar currentTeam.id diretamente
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

  // Função para renderizar um campo personalizado com base no tipo
  function renderCustomField(field: CustomFieldDefinition) {
    const fieldValue = control._formValues.custom_fields?.[field.field_name] || ''
    
    switch (field.field_type) {
      case CustomFieldType.TEXT:
      case CustomFieldType.EMAIL:
      case CustomFieldType.PHONE:
      case CustomFieldType.URL:
        return (
          <div className="space-y-2" key={field.id}>
            <Label htmlFor={`custom_${field.field_name}`}>
              {field.display_name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Controller
              name={`custom_fields.${field.field_name}`}
              control={control}
              defaultValue={fieldValue}
              render={({ field: controllerField }) => (
                <Input
                  id={`custom_${field.field_name}`}
                  placeholder={`Digite ${field.display_name.toLowerCase()}`}
                  type={field.field_type === CustomFieldType.EMAIL ? 'email' : 
                        field.field_type === CustomFieldType.URL ? 'url' : 'text'}
                  {...controllerField}
                  required={field.is_required}
                />
              )}
            />
          </div>
        )
        
      case CustomFieldType.NUMBER:
        return (
          <div className="space-y-2" key={field.id}>
            <Label htmlFor={`custom_${field.field_name}`}>
              {field.display_name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Controller
              name={`custom_fields.${field.field_name}`}
              control={control}
              defaultValue={fieldValue}
              render={({ field: controllerField }) => (
                <Input
                  id={`custom_${field.field_name}`}
                  placeholder={`Digite ${field.display_name.toLowerCase()}`}
                  type="number"
                  {...controllerField}
                  required={field.is_required}
                />
              )}
            />
          </div>
        )
        
      case CustomFieldType.DATE:
        return (
          <div className="space-y-2" key={field.id}>
            <Label htmlFor={`custom_${field.field_name}`}>
              {field.display_name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Controller
              name={`custom_fields.${field.field_name}`}
              control={control}
              defaultValue={fieldValue}
              render={({ field: controllerField }) => (
                <Input
                  id={`custom_${field.field_name}`}
                  type="date"
                  {...controllerField}
                  required={field.is_required}
                />
              )}
            />
          </div>
        )
        
      case CustomFieldType.TEXTAREA:
        return (
          <div className="space-y-2" key={field.id}>
            <Label htmlFor={`custom_${field.field_name}`}>
              {field.display_name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Controller
              name={`custom_fields.${field.field_name}`}
              control={control}
              defaultValue={fieldValue}
              render={({ field: controllerField }) => (
                <Textarea
                  id={`custom_${field.field_name}`}
                  placeholder={`Digite ${field.display_name.toLowerCase()}`}
                  {...controllerField}
                  required={field.is_required}
                />
              )}
            />
          </div>
        )
        
      case CustomFieldType.SELECT:
        return (
          <div className="space-y-2" key={field.id}>
            <Label htmlFor={`custom_${field.field_name}`}>
              {field.display_name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Controller
              name={`custom_fields.${field.field_name}`}
              control={control}
              defaultValue={fieldValue}
              render={({ field: controllerField }) => (
                <Select
                  onValueChange={controllerField.onChange}
                  value={controllerField.value}
                >
                  <SelectTrigger id={`custom_${field.field_name}`}>
                    <SelectValue placeholder={`Selecione ${field.display_name.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.field_options?.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )
        
      case CustomFieldType.CHECKBOX:
        return (
          <div className="flex items-center space-x-2" key={field.id}>
            <Controller
              name={`custom_fields.${field.field_name}`}
              control={control}
              defaultValue={fieldValue === 'true'}
              render={({ field: controllerField }) => (
                <Checkbox
                  id={`custom_${field.field_name}`}
                  checked={controllerField.value === 'true'}
                  onCheckedChange={(checked) => {
                    controllerField.onChange(checked ? 'true' : 'false');
                  }}
                />
              )}
            />
            <Label htmlFor={`custom_${field.field_name}`}>
              {field.display_name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
          </div>
        )
        
      default:
        return null
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

              {/* Campos personalizados */}
              {customFields.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Informações Adicionais</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      {customFields
                        .filter(field => field.is_visible)
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map(field => renderCustomField(field))
                      }
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Observações sobre o lead"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/leads')}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || loadingData}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 