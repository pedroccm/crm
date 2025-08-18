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
import { Label as LabelComponent } from "@/components/ui/label"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Edit, Trash2, Tag, Palette } from "lucide-react"
import { toast } from "sonner"
import { useTeam } from "@/lib/team-context"
import { 
  Label, 
  getLabels, 
  createLabel, 
  updateLabel, 
  deactivateLabel, 
  DEFAULT_LABEL_COLORS 
} from "@/lib/supabase"
import { LabelBadge } from "@/components/labels/LabelBadge"
import { cn } from "@/lib/utils"

export default function LabelsPage() {
  const { currentTeam } = useTeam()
  const [labels, setLabels] = useState<Label[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingLabel, setEditingLabel] = useState<Label | null>(null)
  const [labelToDelete, setLabelToDelete] = useState<Label | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    color: DEFAULT_LABEL_COLORS[0],
    description: ""
  })

  useEffect(() => {
    if (currentTeam?.id) {
      loadLabels()
    }
  }, [currentTeam?.id])

  async function loadLabels() {
    try {
      setLoading(true)
      const data = await getLabels(currentTeam!.id)
      setLabels(data)
    } catch (error) {
      console.error('Erro ao carregar labels:', error)
      toast.error('Erro ao carregar labels')
    } finally {
      setLoading(false)
    }
  }

  function openCreateDialog() {
    setEditingLabel(null)
    setFormData({
      name: "",
      color: DEFAULT_LABEL_COLORS[0],
      description: ""
    })
    setDialogOpen(true)
  }

  function openEditDialog(label: Label) {
    setEditingLabel(label)
    setFormData({
      name: label.name,
      color: label.color,
      description: label.description || ""
    })
    setDialogOpen(true)
  }

  function openDeleteDialog(label: Label) {
    setLabelToDelete(label)
    setDeleteDialogOpen(true)
  }

  async function handleSubmit() {
    if (!formData.name.trim() || !currentTeam?.id) return

    try {
      if (editingLabel) {
        // Editar label existente
        const updatedLabel = await updateLabel(editingLabel.id!, {
          name: formData.name.trim(),
          color: formData.color,
          description: formData.description.trim() || undefined
        })
        
        setLabels(labels.map(l => 
          l.id === editingLabel.id ? updatedLabel : l
        ))
        
        toast.success(`Label "${updatedLabel.name}" atualizada com sucesso`)
      } else {
        // Criar nova label
        const newLabel = await createLabel({
          team_id: currentTeam.id,
          name: formData.name.trim(),
          color: formData.color,
          description: formData.description.trim() || undefined,
          is_active: true
        })
        
        setLabels([...labels, newLabel])
        toast.success(`Label "${newLabel.name}" criada com sucesso`)
      }
      
      setDialogOpen(false)
    } catch (error) {
      console.error('Erro ao salvar label:', error)
      toast.error('Erro ao salvar label')
    }
  }

  async function handleDelete() {
    if (!labelToDelete?.id) return

    try {
      await deactivateLabel(labelToDelete.id)
      setLabels(labels.filter(l => l.id !== labelToDelete.id))
      toast.success(`Label "${labelToDelete.name}" removida com sucesso`)
      setDeleteDialogOpen(false)
      setLabelToDelete(null)
    } catch (error) {
      console.error('Erro ao remover label:', error)
      toast.error('Erro ao remover label')
    }
  }

  if (!currentTeam) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex flex-1 items-center justify-center">
            <p>Selecione um time para gerenciar as labels</p>
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
                  <BreadcrumbLink href="/configuracoes">Configurações</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Labels</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Labels</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie as labels para categorizar seus leads
              </p>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Label
            </Button>
          </div>

          <div className="border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <p>Carregando labels...</p>
              </div>
            ) : labels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Tag className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma label criada</h3>
                <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
                  Labels ajudam a categorizar e organizar seus leads. Crie sua primeira label para começar.
                </p>
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar primeira label
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Cor</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labels.map((label) => (
                    <TableRow key={label.id}>
                      <TableCell>
                        <LabelBadge label={label} size="default" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: label.color }}
                          />
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {label.color}
                          </code>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {label.description || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {label.created_at && (
                          <span className="text-sm text-muted-foreground">
                            {new Date(label.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(label)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(label)}
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
          </div>
        </div>
      </SidebarInset>

      {/* Dialog para criar/editar label */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLabel ? "Editar Label" : "Nova Label"}
            </DialogTitle>
            <DialogDescription>
              {editingLabel 
                ? "Edite as informações da label abaixo." 
                : "Crie uma nova label para categorizar seus leads."
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <LabelComponent htmlFor="label-name">Nome *</LabelComponent>
              <Input
                id="label-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Cliente VIP, Seguimento, Interessado..."
                maxLength={50}
              />
            </div>
            
            <div>
              <LabelComponent>Cor *</LabelComponent>
              <div className="flex flex-wrap gap-2 mt-2">
                {DEFAULT_LABEL_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all hover:scale-105",
                      formData.color === color 
                        ? "border-gray-900 scale-110" 
                        : "border-gray-300"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>
            
            <div>
              <LabelComponent htmlFor="label-description">Descrição</LabelComponent>
              <Textarea
                id="label-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição opcional da label..."
                rows={3}
              />
            </div>
            
            {/* Preview */}
            {formData.name && (
              <div>
                <LabelComponent>Preview</LabelComponent>
                <div className="mt-2">
                  <LabelBadge 
                    label={{
                      id: "preview",
                      team_id: currentTeam.id,
                      name: formData.name || "Preview",
                      color: formData.color,
                      description: formData.description,
                      is_active: true
                    }} 
                  />
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.name.trim()}
            >
              {editingLabel ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Label</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a label "{labelToDelete?.name}"? 
              Esta ação não pode ser desfeita e a label será removida de todos os leads.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  )
}