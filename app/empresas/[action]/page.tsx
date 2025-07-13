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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const companySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  address: z.string().optional(),
  website: z.string().url("Website inválido").optional().or(z.literal("")),
  custom_fields: z.any().optional(),
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
  const { currentTeam } = useTeam()
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([])
  const [loadingCustomFields, setLoadingCustomFields] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    control,
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      custom_fields: {}
    }
  })

  useEffect(() => {
    if (isEditing) {
      loadCompany()
    }
    if (currentTeam?.id) {
      loadCustomFields()
    }
  }, [isEditing, currentTeam])

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

  async function loadCustomFields() {
    try {
      setLoadingCustomFields(true)
      
      if (!currentTeam?.id) {
        return
      }
      
      const fields = await listCustomFields(currentTeam.id, 'company')
      setCustomFields(fields)
    } catch (error) {
      console.error('Erro ao carregar campos personalizados:', error)
    } finally {
      setLoadingCustomFields(false)
    }
  }

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

  async function onSubmit(data: CompanyFormData) {
    try {
      setLoading(true)
      
      if (!currentTeam?.id) {
        toast.error("Selecione um time para salvar a empresa")
        setLoading(false)
        return
      }

      const companyData = {
        ...data,
        team_id: currentTeam.id
      }

      if (isEditing) {
        const { error } = await supabase
          .from('companies')
          .update(companyData)
          .eq('id', params.action)

        if (error) throw error
        toast.success("Empresa atualizada com sucesso!")
      } else {
        const { error } = await supabase
          .from('companies')
          .insert([companyData])

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

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/empresas')}
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