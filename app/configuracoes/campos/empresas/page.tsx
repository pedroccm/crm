"use client"

import { useState, useEffect } from "react"
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
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toast } from "sonner"
import { useTeam } from "@/lib/team-context"
import { 
  CustomFieldDefinition, 
  CustomFieldType, 
  listCustomFields, 
  createCustomField, 
  updateCustomField, 
  deleteCustomField,
  reorderCustomFields
} from "@/lib/supabase"
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  MoveUp, 
  MoveDown,
  GripVertical,
  Building2
} from "lucide-react"

export default function CamposEmpresasPage() {
  const router = useRouter()
  const { currentTeam } = useTeam()
  const [fields, setFields] = useState<CustomFieldDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentField, setCurrentField] = useState<CustomFieldDefinition | null>(null)
  
  // Form state
  const [fieldName, setFieldName] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [fieldType, setFieldType] = useState<CustomFieldType>(CustomFieldType.TEXT)
  const [isRequired, setIsRequired] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [options, setOptions] = useState<string>("")
  const [error, setError] = useState("")
  
  useEffect(() => {
    if (currentTeam?.id) {
      loadFields()
    }
  }, [currentTeam])
  
  async function loadFields() {
    try {
      setLoading(true)
      
      if (!currentTeam?.id) {
        toast.error("Nenhum time selecionado")
        return
      }
      
      const data = await listCustomFields(currentTeam.id, 'company')
      setFields(data)
    } catch (error: any) {
      console.error("Erro ao carregar campos:", error)
      toast.error(`Erro ao carregar campos: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }
  
  function resetForm() {
    setFieldName("")
    setDisplayName("")
    setFieldType(CustomFieldType.TEXT)
    setIsRequired(false)
    setIsVisible(true)
    setOptions("")
    setError("")
    setCurrentField(null)
    setIsEditing(false)
  }
  
  function openNewFieldDialog() {
    resetForm()
    setIsDialogOpen(true)
  }
  
  function openEditFieldDialog(field: CustomFieldDefinition) {
    setCurrentField(field)
    setFieldName(field.field_name)
    setDisplayName(field.display_name)
    setFieldType(field.field_type)
    setIsRequired(field.is_required)
    setIsVisible(field.is_visible)
    
    if (field.field_type === CustomFieldType.SELECT && field.field_options?.options) {
      const optionsString = field.field_options.options
        .map(opt => opt.label)
        .join("\n")
      setOptions(optionsString)
    } else {
      setOptions("")
    }
    
    setIsEditing(true)
    setIsDialogOpen(true)
  }
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    
    try {
      if (!currentTeam?.id) {
        toast.error("Nenhum time selecionado")
        return
      }
      
      if (!fieldName || !displayName) {
        setError("Nome do campo e nome de exibição são obrigatórios")
        return
      }
      
      // Validar nome do campo (apenas letras, números e underscore)
      const fieldNameRegex = /^[a-zA-Z0-9_]+$/
      if (!fieldNameRegex.test(fieldName)) {
        setError("Nome do campo deve conter apenas letras, números e underscore (_)")
        return
      }
      
      setIsSubmitting(true)
      
      // Preparar opções para campos do tipo select
      let fieldOptions = undefined
      if (fieldType === CustomFieldType.SELECT && options.trim()) {
        const optionsArray = options
          .split("\n")
          .map(opt => opt.trim())
          .filter(opt => opt)
          .map(opt => ({ label: opt, value: opt.toLowerCase().replace(/\s+/g, '_') }))
        
        fieldOptions = { options: optionsArray }
      }
      
      const fieldData: CustomFieldDefinition = {
        team_id: currentTeam.id,
        entity_type: 'company',
        field_name: fieldName,
        display_name: displayName,
        field_type: fieldType,
        field_options: fieldOptions,
        is_required: isRequired,
        is_visible: isVisible,
        sort_order: isEditing ? currentField!.sort_order : fields.length
      }
      
      if (isEditing && currentField?.id) {
        // Atualizar campo existente
        await updateCustomField(currentField.id, fieldData)
        toast.success("Campo atualizado com sucesso")
      } else {
        // Criar novo campo
        await createCustomField(fieldData)
        toast.success("Campo criado com sucesso")
      }
      
      // Recarregar campos
      await loadFields()
      
      // Fechar diálogo e resetar formulário
      setIsDialogOpen(false)
      resetForm()
    } catch (error: any) {
      console.error("Erro ao salvar campo:", error)
      setError(error.message || "Erro ao salvar campo")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  async function handleDeleteField(field: CustomFieldDefinition) {
    if (!field.id) return
    
    if (!confirm(`Tem certeza que deseja excluir o campo "${field.display_name}"? Esta ação não pode ser desfeita.`)) {
      return
    }
    
    try {
      await deleteCustomField(field.id)
      toast.success("Campo excluído com sucesso")
      await loadFields()
    } catch (error: any) {
      console.error("Erro ao excluir campo:", error)
      toast.error(`Erro ao excluir campo: ${error.message}`)
    }
  }
  
  async function handleMoveField(field: CustomFieldDefinition, direction: 'up' | 'down') {
    if (!currentTeam?.id || !field.id) return
    
    const currentIndex = fields.findIndex(f => f.id === field.id)
    if (currentIndex === -1) return
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    
    // Verificar se o novo índice é válido
    if (newIndex < 0 || newIndex >= fields.length) return
    
    // Criar uma cópia do array de campos
    const newFields = [...fields]
    
    // Trocar os campos de posição
    const temp = newFields[currentIndex]
    newFields[currentIndex] = newFields[newIndex]
    newFields[newIndex] = temp
    
    // Atualizar a ordem dos campos
    try {
      const fieldIds = newFields.map(f => f.id!)
      await reorderCustomFields(currentTeam.id, 'company', fieldIds)
      
      // Atualizar o estado
      setFields(newFields)
      toast.success("Ordem dos campos atualizada")
    } catch (error: any) {
      console.error("Erro ao reordenar campos:", error)
      toast.error(`Erro ao reordenar campos: ${error.message}`)
    }
  }
  
  function getFieldTypeLabel(type: CustomFieldType): string {
    switch (type) {
      case CustomFieldType.TEXT: return "Texto"
      case CustomFieldType.NUMBER: return "Número"
      case CustomFieldType.DATE: return "Data"
      case CustomFieldType.SELECT: return "Seleção"
      case CustomFieldType.CHECKBOX: return "Checkbox"
      case CustomFieldType.EMAIL: return "Email"
      case CustomFieldType.PHONE: return "Telefone"
      case CustomFieldType.URL: return "URL"
      case CustomFieldType.TEXTAREA: return "Área de texto"
      default: return type
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
                  <BreadcrumbLink href="/configuracoes">Configurações</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Campos de Empresas</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">Campos de Empresas</h1>
              <p className="text-sm text-muted-foreground">
                Configure campos personalizados para empresas
              </p>
            </div>
            <Button onClick={openNewFieldDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Campo
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center items-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : fields.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Nenhum campo personalizado</h3>
                  <p className="text-sm text-muted-foreground max-w-md mt-2">
                    Crie campos personalizados para coletar informações adicionais sobre suas empresas.
                  </p>
                  <Button className="mt-4" onClick={openNewFieldDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Primeiro Campo
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Ordem</TableHead>
                      <TableHead>Nome de Exibição</TableHead>
                      <TableHead>Nome do Campo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="w-[100px]">Obrigatório</TableHead>
                      <TableHead className="w-[100px]">Visível</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleMoveField(field, 'up')}
                              disabled={index === 0}
                              className="h-8 w-8"
                            >
                              <MoveUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleMoveField(field, 'down')}
                              disabled={index === fields.length - 1}
                              className="h-8 w-8"
                            >
                              <MoveDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{field.display_name}</TableCell>
                        <TableCell className="font-mono text-sm">{field.field_name}</TableCell>
                        <TableCell>{getFieldTypeLabel(field.field_type)}</TableCell>
                        <TableCell>{field.is_required ? "Sim" : "Não"}</TableCell>
                        <TableCell>{field.is_visible ? "Sim" : "Não"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditFieldDialog(field)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteField(field)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? "Editar Campo" : "Novo Campo"}
              </DialogTitle>
              <DialogDescription>
                {isEditing 
                  ? "Edite as propriedades do campo personalizado" 
                  : "Configure um novo campo personalizado para empresas"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm mb-4">
                  {error}
                </div>
              )}
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="displayName" className="text-right">
                    Nome de Exibição
                  </Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="col-span-3"
                    placeholder="Ex: Setor"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="fieldName" className="text-right">
                    Nome do Campo
                  </Label>
                  <Input
                    id="fieldName"
                    value={fieldName}
                    onChange={(e) => setFieldName(e.target.value)}
                    className="col-span-3 font-mono"
                    placeholder="Ex: setor"
                    disabled={isEditing} // Não permitir editar o nome do campo
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="fieldType" className="text-right">
                    Tipo
                  </Label>
                  <Select
                    value={fieldType}
                    onValueChange={(value) => setFieldType(value as CustomFieldType)}
                    disabled={isEditing} // Não permitir editar o tipo do campo
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CustomFieldType.TEXT}>Texto</SelectItem>
                      <SelectItem value={CustomFieldType.NUMBER}>Número</SelectItem>
                      <SelectItem value={CustomFieldType.DATE}>Data</SelectItem>
                      <SelectItem value={CustomFieldType.SELECT}>Seleção</SelectItem>
                      <SelectItem value={CustomFieldType.CHECKBOX}>Checkbox</SelectItem>
                      <SelectItem value={CustomFieldType.EMAIL}>Email</SelectItem>
                      <SelectItem value={CustomFieldType.PHONE}>Telefone</SelectItem>
                      <SelectItem value={CustomFieldType.URL}>URL</SelectItem>
                      <SelectItem value={CustomFieldType.TEXTAREA}>Área de texto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {fieldType === CustomFieldType.SELECT && (
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="options" className="text-right pt-2">
                      Opções
                    </Label>
                    <div className="col-span-3">
                      <textarea
                        id="options"
                        value={options}
                        onChange={(e) => setOptions(e.target.value)}
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Digite uma opção por linha"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Digite uma opção por linha
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="isRequired" className="text-right">
                    Obrigatório
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isRequired"
                      checked={isRequired}
                      onCheckedChange={setIsRequired}
                    />
                    <Label htmlFor="isRequired">
                      {isRequired ? "Sim" : "Não"}
                    </Label>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="isVisible" className="text-right">
                    Visível
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isVisible"
                      checked={isVisible}
                      onCheckedChange={setIsVisible}
                    />
                    <Label htmlFor="isVisible">
                      {isVisible ? "Sim" : "Não"}
                    </Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditing ? "Salvando..." : "Criando..."}
                    </>
                  ) : (
                    isEditing ? "Salvar" : "Criar"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
} 