"use client"

import { useState, useEffect } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
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
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { Plus, Search, Trash2, Pencil, FileText } from "lucide-react"
import { useTeam } from "@/lib/team-context"
import { toast } from "sonner"

interface MessageTemplate {
  id: string
  name: string
  content: string
  variables: string[] | string
  category: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function TemplatesPage() {
  const { currentTeam } = useTeam()
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null)
  const [saving, setSaving] = useState(false)
  
  // Form states
  const [formData, setFormData] = useState({
    name: "",
    content: "",
    category: "geral",
    is_active: true
  })

  const categories = [
    { value: "geral", label: "Geral" },
    { value: "atendimento", label: "Atendimento" },
    { value: "vendas", label: "Vendas" },
    { value: "suporte", label: "Suporte" },
    { value: "marketing", label: "Marketing" },
    { value: "cobranca", label: "Cobrança" },
    { value: "agendamento", label: "Agendamento" }
  ]

  useEffect(() => {
    loadTemplates()
  }, [currentTeam])

  async function loadTemplates() {
    if (!currentTeam?.id) return
    
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .eq('team_id', currentTeam.id)
        .order('category', { ascending: true })
        .order('name', { ascending: true })
      
      if (error) throw error
      
      // Processar templates para garantir que variables seja um array
      const processedTemplates = (data || []).map(template => ({
        ...template,
        variables: typeof template.variables === 'string' 
          ? JSON.parse(template.variables) 
          : Array.isArray(template.variables) 
            ? template.variables 
            : []
      }))
      
      setTemplates(processedTemplates)
    } catch (error) {
      console.error('Erro ao carregar templates:', error)
      toast.error("Erro ao carregar templates")
    } finally {
      setLoading(false)
    }
  }

  function openDialog(template?: MessageTemplate) {
    if (template) {
      setEditingTemplate(template)
      setFormData({
        name: template.name,
        content: template.content,
        category: template.category,
        is_active: template.is_active
      })
    } else {
      setEditingTemplate(null)
      setFormData({
        name: "",
        content: "",
        category: "geral",
        is_active: true
      })
    }
    setIsDialogOpen(true)
  }

  function closeDialog() {
    setIsDialogOpen(false)
    setEditingTemplate(null)
    setFormData({
      name: "",
      content: "",
      category: "geral",
      is_active: true
    })
  }

  // Campos básicos suportados pelo sistema
  const basicSupportedFields = [
    // Campos de lead
    'lead.name', 'lead.nome', 'name', 'nome',
    'lead.email', 'email',
    'lead.phone', 'lead.telefone', 'phone', 'telefone',
    'lead.status', 'status',
    'lead.url', 'lead.link',
    
    // Campos de studio
    'studio.slug', 'studio.url',
    
    // Campos de company
    'company.name', 'company.nome', 'empresa.name', 'empresa.nome',
    'company.email', 'empresa.email',
    'company.phone', 'company.telefone', 'empresa.phone', 'empresa.telefone',
    'company.address', 'company.endereco', 'empresa.address', 'empresa.endereco',
    'company.website', 'company.site', 'empresa.website', 'empresa.site'
  ]

  // Estados para campos personalizados
  const [customLeadFields, setCustomLeadFields] = useState<string[]>([])
  const [customCompanyFields, setCustomCompanyFields] = useState<string[]>([])

  // Carregar campos personalizados quando o team mudar
  useEffect(() => {
    if (currentTeam?.id) {
      loadCustomFields()
    }
  }, [currentTeam])

  async function loadCustomFields() {
    if (!currentTeam?.id) return
    
    try {
      // Método 1: Buscar campos das definições (mais confiável)
      const { data: fieldDefinitions, error: definitionsError } = await supabase
        .from('custom_field_definitions')
        .select('entity_type, field_name')
        .eq('team_id', currentTeam.id)
        .eq('is_visible', true)
      
      const leadFieldsFromDefs = new Set<string>()
      const companyFieldsFromDefs = new Set<string>()
      
      if (!definitionsError && fieldDefinitions) {
        fieldDefinitions.forEach(def => {
          if (def.entity_type === 'lead') {
            leadFieldsFromDefs.add(def.field_name)
          } else if (def.entity_type === 'company') {
            companyFieldsFromDefs.add(def.field_name)
          }
        })
      }
      
      // Método 2: Buscar campos dos registros existentes (fallback)
      const { data: leadFields, error: leadError } = await supabase
        .from('leads')
        .select('custom_fields')
        .eq('team_id', currentTeam.id)
        .not('custom_fields', 'is', null)
        .limit(100)
      
      const { data: companyFields, error: companyError } = await supabase
        .from('companies')
        .select('custom_fields')
        .eq('team_id', currentTeam.id)
        .not('custom_fields', 'is', null)
        .limit(100)
      
      // Extrair campos dos registros existentes
      const allLeadFields = new Set<string>()
      const allCompanyFields = new Set<string>()
      
      if (!leadError && leadFields) {
        leadFields.forEach(lead => {
          if (lead.custom_fields && typeof lead.custom_fields === 'object') {
            Object.keys(lead.custom_fields).forEach(field => allLeadFields.add(field))
          }
        })
      }
      
      if (!companyError && companyFields) {
        companyFields.forEach(company => {
          if (company.custom_fields && typeof company.custom_fields === 'object') {
            Object.keys(company.custom_fields).forEach(field => allCompanyFields.add(field))
          }
        })
      }
      
      // Combinar campos das definições com campos dos registros
      const finalLeadFields = new Set([...leadFieldsFromDefs, ...allLeadFields])
      const finalCompanyFields = new Set([...companyFieldsFromDefs, ...allCompanyFields])
      
      console.log('Campos de leads encontrados:', Array.from(finalLeadFields))
      console.log('Campos de empresas encontrados:', Array.from(finalCompanyFields))
      
      setCustomLeadFields(Array.from(finalLeadFields))
      setCustomCompanyFields(Array.from(finalCompanyFields))
      
    } catch (error) {
      console.error('Erro ao carregar campos personalizados:', error)
    }
  }

  // Extrair variáveis do conteúdo
  function extractVariables(content: string): string[] {
    const variables = content.match(/\{\{([^}]+)\}\}/g) || []
    return [...new Set(variables.map(v => v.replace(/[{}]/g, '')))]
  }

  // Validar se as variáveis são suportadas
  function validateVariables(content: string): { isValid: boolean; invalidVariables: string[] } {
    const variables = extractVariables(content)
    
    // Combinar todos os campos suportados
    const allSupportedFields = [
      ...basicSupportedFields,
      // Campos personalizados de leads com prefixo
      ...customLeadFields.map(field => `lead.${field}`),
      ...customLeadFields, // Manter compatibilidade sem prefixo
      // Campos personalizados de empresas com prefixo  
      ...customCompanyFields.map(field => `company.${field}`),
      ...customCompanyFields.map(field => `empresa.${field}`)
    ]
    
    const invalidVariables = variables.filter(variable => 
      !allSupportedFields.includes(variable.toLowerCase())
    )
    
    return {
      isValid: invalidVariables.length === 0,
      invalidVariables
    }
  }

  // Função auxiliar para garantir que variables seja sempre um array
  function getVariablesArray(variables: string[] | string): string[] {
    if (typeof variables === 'string') {
      try {
        return JSON.parse(variables)
      } catch {
        return []
      }
    }
    return Array.isArray(variables) ? variables : []
  }

  async function handleSave() {
    if (!currentTeam?.id) return
    
    // Validar variáveis antes de salvar
    const validation = validateVariables(formData.content)
    if (!validation.isValid) {
      const allSupportedFields = [
        ...basicSupportedFields,
        // Campos personalizados de leads com prefixo
        ...customLeadFields.map(field => `lead.${field}`),
        ...customLeadFields, // Manter compatibilidade sem prefixo
        // Campos personalizados de empresas com prefixo  
        ...customCompanyFields.map(field => `company.${field}`),
        ...customCompanyFields.map(field => `empresa.${field}`)
      ]
      toast.error(`Variáveis não suportadas: ${validation.invalidVariables.join(', ')}. Use apenas: ${allSupportedFields.join(', ')}`)
      return
    }
    
    try {
      setSaving(true)
      
      const variables = extractVariables(formData.content)
      
      const templateData = {
        name: formData.name,
        content: formData.content,
        variables: JSON.stringify(variables),
        category: formData.category,
        is_active: formData.is_active,
        team_id: currentTeam.id
      }
      
      if (editingTemplate) {
        // Atualizar template existente
        const { error } = await supabase
          .from('message_templates')
          .update(templateData)
          .eq('id', editingTemplate.id)
          
        if (error) throw error
        
        toast.success("Template atualizado com sucesso!")
      } else {
        // Criar novo template
        const { error } = await supabase
          .from('message_templates')
          .insert(templateData)
          
        if (error) throw error
        
        toast.success("Template criado com sucesso!")
      }
      
      closeDialog()
      loadTemplates()
      
    } catch (error) {
      console.error('Erro ao salvar template:', error)
      toast.error("Erro ao salvar template")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este template?")) return
    
    try {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      toast.success("Template excluído com sucesso!")
      loadTemplates()
      
    } catch (error) {
      console.error('Erro ao excluir template:', error)
      toast.error("Erro ao excluir template")
    }
  }

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
                  <BreadcrumbPage>Templates de Mensagens</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">Templates de Mensagens</h1>
              <p className="text-sm text-muted-foreground">
                Crie e gerencie templates para acelerar o atendimento
              </p>
            </div>
            <Button onClick={() => openDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Template
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar templates..."
                className="pl-8"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Conteúdo</TableHead>
                  <TableHead>Variáveis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredTemplates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Nenhum template encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTemplates.map(template => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">
                        {template.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {template.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="truncate">{template.content}</p>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const variablesArray = getVariablesArray(template.variables)
                          return variablesArray.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {variablesArray.slice(0, 3).map((variable) => (
                                <Badge key={variable} variant="outline" className="text-xs">
                                  {variable}
                                </Badge>
                              ))}
                              {variablesArray.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{variablesArray.length - 3}
                                </Badge>
                              )}
                            </div>
                          )
                        })()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={template.is_active ? "default" : "secondary"}>
                          {template.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDialog(template)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(template.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </SidebarInset>

      {/* Modal de criação/edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Editar Template" : "Novo Template"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate 
                ? "Edite as informações do template"
                : "Crie um novo template de mensagem para acelerar o atendimento"
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Template</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Boas-vindas"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo da Mensagem</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Digite a mensagem. Use {{variavel}} para criar campos dinâmicos."
                rows={6}
              />
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">
                  Campos suportados:
                </p>
                
                {/* Campos básicos de Lead */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Campos básicos do Lead:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <code className="bg-blue-100 text-blue-800 px-1 rounded">{'{{lead.name}}'}</code> ou <code className="bg-blue-100 text-blue-800 px-1 rounded">{'{{name}}'}</code> - Nome do lead
                    </div>
                    <div>
                      <code className="bg-blue-100 text-blue-800 px-1 rounded">{'{{lead.email}}'}</code> ou <code className="bg-blue-100 text-blue-800 px-1 rounded">{'{{email}}'}</code> - Email do lead
                    </div>
                    <div>
                      <code className="bg-blue-100 text-blue-800 px-1 rounded">{'{{lead.phone}}'}</code> ou <code className="bg-blue-100 text-blue-800 px-1 rounded">{'{{phone}}'}</code> - Telefone do lead
                    </div>
                    <div>
                      <code className="bg-blue-100 text-blue-800 px-1 rounded">{'{{lead.status}}'}</code> - Status do lead
                    </div>
                    <div>
                      <code className="bg-blue-100 text-blue-800 px-1 rounded">{'{{lead.url}}'}</code> - Link do lead no CRM
                    </div>
                  </div>
                </div>

                {/* Campos básicos de Studio */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Campos básicos do Studio:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <code className="bg-purple-100 text-purple-800 px-1 rounded">{'{{studio.slug}}'}</code> - Slug do studio para URL
                    </div>
                    <div>
                      <code className="bg-purple-100 text-purple-800 px-1 rounded">{'{{studio.url}}'}</code> - URL completa do studio
                    </div>
                  </div>
                </div>

                {/* Campos básicos de Company */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Campos básicos da Empresa:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <code className="bg-green-100 text-green-800 px-1 rounded">{'{{company.name}}'}</code> - Nome da empresa
                    </div>
                    <div>
                      <code className="bg-green-100 text-green-800 px-1 rounded">{'{{company.email}}'}</code> - Email da empresa
                    </div>
                    <div>
                      <code className="bg-green-100 text-green-800 px-1 rounded">{'{{company.phone}}'}</code> - Telefone da empresa
                    </div>
                    <div>
                      <code className="bg-green-100 text-green-800 px-1 rounded">{'{{company.address}}'}</code> - Endereço da empresa
                    </div>
                    <div>
                      <code className="bg-green-100 text-green-800 px-1 rounded">{'{{company.website}}'}</code> - Website da empresa
                    </div>
                  </div>
                </div>

                {/* Campos personalizados de leads */}
                {customLeadFields.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Campos personalizados de leads:</p>
                    <div className="flex flex-wrap gap-1">
                      {customLeadFields.map(field => (
                        <code key={field} className="bg-blue-100 text-blue-800 px-1 rounded text-xs">
                          {`{{lead.${field}}}`}
                        </code>
                      ))}
                    </div>
                  </div>
                )}

                {/* Campos personalizados de empresas */}
                {customCompanyFields.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Campos personalizados de empresas:</p>
                    <div className="flex flex-wrap gap-1">
                      {customCompanyFields.map(field => (
                        <code key={field} className="bg-green-100 text-green-800 px-1 rounded text-xs">
                          {`{{company.${field}}}`}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {formData.content && (
              <div className="space-y-2">
                <Label>Variáveis Detectadas</Label>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const variables = extractVariables(formData.content)
                    const validation = validateVariables(formData.content)
                    
                    if (variables.length === 0) {
                      return <p className="text-sm text-muted-foreground">Nenhuma variável detectada</p>
                    }
                    
                    return variables.map((variable) => (
                      <Badge 
                        key={variable} 
                        variant={validation.invalidVariables.includes(variable) ? "destructive" : "outline"}
                      >
                        {variable}
                        {validation.invalidVariables.includes(variable) && " ❌"}
                      </Badge>
                    ))
                  })()}
                </div>
                {(() => {
                  const validation = validateVariables(formData.content)
                  if (!validation.isValid) {
                    return (
                      <p className="text-sm text-red-600">
                        ⚠️ Variáveis inválidas detectadas: {validation.invalidVariables.join(', ')}
                      </p>
                    )
                  }
                  return null
                })()}
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="is_active">Template ativo</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={
                !formData.name || 
                !formData.content || 
                saving || 
                !validateVariables(formData.content).isValid
              }
            >
              {saving ? "Salvando..." : (editingTemplate ? "Atualizar" : "Criar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}