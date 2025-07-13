"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import { supabase, logLeadActivity, getLeadActivityLogs, LeadLogActionType } from "@/lib/supabase"
import { Plus, Settings, Trash2, GripVertical, Pencil, X, Mail, Phone, Building2, Calendar, Tag, ExternalLink, Clock, History, PlusCircle } from "lucide-react"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Label,
} from "@/components/ui/label"
import { Input } from "@/components/ui/input"
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

interface Lead {
  id: string
  name: string
  email: string
  phone: string
  company_id: string
  company_name?: string
  status: string
  custom_fields?: {
    notes?: string
    [key: string]: any
  }
  created_at: string
}

interface LeadPipeline {
  id: string
  lead_id: string
  pipeline_id: string
  current_stage_id: string
  created_at: string
  lead?: Lead
}

// Tipo para o item arrastável
interface DragItem {
  type: string
  leadPipelineId: string
  currentStageId: string
}

// Componente para o card de lead arrastável
const DraggableLeadCard = ({ 
  leadPipeline, 
  getStatusClass, 
  router, 
  handleMoveCard, 
  stages,
  onLeadClick
}: { 
  leadPipeline: LeadPipeline, 
  getStatusClass: (status: string) => string, 
  router: any, 
  handleMoveCard: (leadPipelineId: string, newStageId: string) => Promise<void>,
  stages: PipelineStage[],
  onLeadClick: (lead: Lead) => void
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  
  const [{ isDragging }, drag, dragPreview] = useDrag(() => ({
    type: 'LEAD_CARD',
    item: { 
      type: 'LEAD_CARD', 
      leadPipelineId: leadPipeline.id,
      currentStageId: leadPipeline.current_stage_id
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));
  
  // Aplicar os refs
  dragPreview(cardRef);
  drag(handleRef);

  const handleCardClick = (e: React.MouseEvent) => {
    // Evitar que o clique no ícone de arrastar abra o painel
    if (e.target instanceof Node && handleRef.current?.contains(e.target)) {
      return;
    }
    
    if (leadPipeline.lead) {
      onLeadClick(leadPipeline.lead);
    }
  };

  return (
    <Card 
      ref={cardRef}
      className={`shadow-sm ${isDragging ? 'opacity-50' : ''} cursor-move`}
      onClick={handleCardClick}
    >
      <CardHeader className="p-3 pb-0 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-sm font-medium">
            {leadPipeline.lead?.name}
          </CardTitle>
          <CardDescription className="text-xs">
            {leadPipeline.lead?.company_name || "Sem empresa"}
          </CardDescription>
        </div>
        <div 
          ref={handleRef}
          className="text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-2">
        <div className="flex items-center justify-between">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(leadPipeline.lead?.status || '')}`}>
            {leadPipeline.lead?.status}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(leadPipeline.created_at).toLocaleDateString('pt-BR')}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// Componente para exibir os detalhes do lead
const LeadDetailsSheet = ({ 
  lead, 
  isOpen, 
  onClose,
  getStatusClass
}: { 
  lead: Lead | null, 
  isOpen: boolean, 
  onClose: () => void,
  getStatusClass: (status: string) => string
}) => {
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [customFieldName, setCustomFieldName] = useState("");
  const [customFieldValue, setCustomFieldValue] = useState("");
  const [isAddingField, setIsAddingField] = useState(false);
  const [localLead, setLocalLead] = useState<Lead | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (lead) {
      setLocalLead(lead);
      if (isOpen) {
        loadActivityLogs(lead.id);
      }
    }
  }, [lead, isOpen]);

  useEffect(() => {
    if (localLead?.company_id) {
      loadCompanyDetails(localLead.company_id);
    }
  }, [localLead]);

  async function loadActivityLogs(leadId: string) {
    try {
      setLoadingLogs(true);
      const logs = await getLeadActivityLogs(leadId);
      setActivityLogs(logs);
    } catch (error) {
      console.error('Erro ao carregar histórico de atividades:', error);
    } finally {
      setLoadingLogs(false);
    }
  }

  async function loadCompanyDetails(companyId: string) {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (error) throw error;
      setCompanyDetails(data);
    } catch (error) {
      console.error('Erro ao carregar detalhes da empresa:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCustomField() {
    if (!localLead || !customFieldName.trim() || !customFieldValue.trim()) return;
    
    try {
      // Criar uma cópia dos campos customizados existentes ou um objeto vazio
      const customFields = { ...(localLead.custom_fields || {}) };
      
      // Adicionar o novo campo
      customFields[customFieldName] = customFieldValue;
      
      // Atualizar o lead no Supabase
      const { error } = await supabase
        .from('leads')
        .update({ custom_fields: customFields })
        .eq('id', localLead.id);
        
      if (error) throw error;
      
      // Registrar a atividade no log
      await logLeadActivity({
        lead_id: localLead.id,
        action_type: LeadLogActionType.FIELD_ADDED,
        description: `Campo "${customFieldName}" adicionado`,
        details: { 
          field_name: customFieldName,
          field_value: customFieldValue
        }
      });
      
      // Atualizar o lead localmente
      setLocalLead({
        ...localLead,
        custom_fields: customFields
      });
      
      // Recarregar os logs
      loadActivityLogs(localLead.id);
      
      toast.success("Campo personalizado adicionado com sucesso!");
      
      // Limpar os campos
      setCustomFieldName("");
      setCustomFieldValue("");
      setIsAddingField(false);
    } catch (error) {
      console.error('Erro ao adicionar campo personalizado:', error);
      toast.error("Erro ao adicionar campo personalizado");
    }
  }

  async function handleEditField() {
    if (!localLead || !editingField || !editingValue.trim()) return;
    
    try {
      // Criar uma cópia dos campos customizados existentes
      const customFields = { ...(localLead.custom_fields || {}) };
      
      // Guardar o valor antigo para o log
      const oldValue = customFields[editingField];
      
      // Atualizar o valor do campo
      customFields[editingField] = editingValue;
      
      // Atualizar o lead no Supabase
      const { error } = await supabase
        .from('leads')
        .update({ custom_fields: customFields })
        .eq('id', localLead.id);
        
      if (error) throw error;
      
      // Registrar a atividade no log
      await logLeadActivity({
        lead_id: localLead.id,
        action_type: LeadLogActionType.FIELD_UPDATED,
        description: `Campo "${editingField}" atualizado`,
        details: { 
          field_name: editingField,
          old_value: oldValue,
          new_value: editingValue
        }
      });
      
      // Atualizar o lead localmente
      setLocalLead({
        ...localLead,
        custom_fields: customFields
      });
      
      // Recarregar os logs
      loadActivityLogs(localLead.id);
      
      toast.success("Campo atualizado com sucesso!");
      
      // Limpar o estado de edição
      setEditingField(null);
      setEditingValue("");
    } catch (error) {
      console.error('Erro ao atualizar campo personalizado:', error);
      toast.error("Erro ao atualizar campo");
    }
  }

  async function handleDeleteField(fieldName: string) {
    if (!localLead || !fieldName) return;
    
    if (!confirm(`Tem certeza que deseja excluir o campo "${fieldName}"?`)) return;
    
    try {
      // Criar uma cópia dos campos customizados existentes
      const customFields = { ...(localLead.custom_fields || {}) };
      
      // Guardar o valor antigo para o log
      const oldValue = customFields[fieldName];
      
      // Remover o campo
      delete customFields[fieldName];
      
      // Atualizar o lead no Supabase
      const { error } = await supabase
        .from('leads')
        .update({ custom_fields: customFields })
        .eq('id', localLead.id);
        
      if (error) throw error;
      
      // Registrar a atividade no log
      await logLeadActivity({
        lead_id: localLead.id,
        action_type: LeadLogActionType.FIELD_DELETED,
        description: `Campo "${fieldName}" excluído`,
        details: { 
          field_name: fieldName,
          field_value: oldValue
        }
      });
      
      // Atualizar o lead localmente
      setLocalLead({
        ...localLead,
        custom_fields: customFields
      });
      
      // Recarregar os logs
      loadActivityLogs(localLead.id);
      
      toast.success("Campo excluído com sucesso!");
      
      // Se estiver editando este campo, cancelar a edição
      if (editingField === fieldName) {
        setEditingField(null);
        setEditingValue("");
      }
    } catch (error) {
      console.error('Erro ao excluir campo personalizado:', error);
      toast.error("Erro ao excluir campo");
    }
  }

  function startEditingField(fieldName: string, value: string) {
    setEditingField(fieldName);
    setEditingValue(String(value));
  }

  function cancelEditing() {
    setEditingField(null);
    setEditingValue("");
  }

  // Função para formatar a data de uma forma mais amigável
  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Função para obter o ícone e a cor com base no tipo de ação
  function getActionIcon(actionType: string) {
    switch (actionType) {
      case LeadLogActionType.CREATED:
        return <Plus className="h-4 w-4 text-green-500" />;
      case LeadLogActionType.UPDATED:
        return <Pencil className="h-4 w-4 text-blue-500" />;
      case LeadLogActionType.STAGE_CHANGED:
        return <GripVertical className="h-4 w-4 text-yellow-500" />;
      case LeadLogActionType.FIELD_ADDED:
        return <Plus className="h-4 w-4 text-green-500" />;
      case LeadLogActionType.FIELD_UPDATED:
        return <Pencil className="h-4 w-4 text-blue-500" />;
      case LeadLogActionType.FIELD_DELETED:
        return <Trash2 className="h-4 w-4 text-red-500" />;
      case LeadLogActionType.STATUS_CHANGED:
        return <Tag className="h-4 w-4 text-purple-500" />;
      case LeadLogActionType.PIPELINE_ADDED:
        return <Plus className="h-4 w-4 text-green-500" />;
      case LeadLogActionType.NOTE_ADDED:
        return <Plus className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  }

  if (!localLead) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="text-xl font-semibold">{localLead.name}</SheetTitle>
          <SheetDescription>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(localLead.status)}`}>
              {localLead.status}
            </span>
          </SheetDescription>
        </SheetHeader>

        {/* Abas de navegação */}
        <div className="flex border-b mt-4">
          <button
            className={`px-4 py-2 text-sm font-medium ${activeTab === 'details' ? 'border-b-2 border-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('details')}
          >
            Detalhes
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium ${activeTab === 'history' ? 'border-b-2 border-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('history')}
          >
            Histórico
          </button>
        </div>

        {activeTab === 'details' ? (
          <div className="mt-6 space-y-6">
            {/* Informações de contato */}
            <div>
              <h3 className="text-sm font-medium mb-3">Informações de Contato</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">{localLead.email}</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">{localLead.phone}</span>
                </div>
              </div>
            </div>

            {/* Informações da empresa */}
            <div>
              <h3 className="text-sm font-medium mb-3">Empresa</h3>
              {loading ? (
                <p className="text-sm text-muted-foreground">Carregando informações da empresa...</p>
              ) : companyDetails ? (
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">{companyDetails.name}</span>
                  </div>
                  {companyDetails.website && (
                    <div className="flex items-center">
                      <ExternalLink className="h-4 w-4 mr-2 text-muted-foreground" />
                      <a 
                        href={companyDetails.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:underline"
                      >
                        {companyDetails.website}
                      </a>
                    </div>
                  )}
                  {companyDetails.address && (
                    <div className="flex items-start">
                      <Building2 className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
                      <span className="text-sm">{companyDetails.address}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma informação disponível</p>
              )}
            </div>

            {/* Campos personalizados */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Informações Adicionais</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2 text-xs"
                  onClick={() => setIsAddingField(!isAddingField)}
                >
                  {isAddingField ? "Cancelar" : "Adicionar Campo"}
                </Button>
              </div>
              
              {isAddingField && (
                <div className="space-y-3 mb-4 p-3 border rounded-md bg-muted/20">
                  <div className="grid gap-2">
                    <Label htmlFor="fieldName" className="text-xs">Nome do Campo</Label>
                    <Input 
                      id="fieldName" 
                      value={customFieldName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomFieldName(e.target.value)}
                      placeholder="Ex: Cargo, Interesse, Orçamento"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="fieldValue" className="text-xs">Valor</Label>
                    <Input 
                      id="fieldValue" 
                      value={customFieldValue}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomFieldValue(e.target.value)}
                      placeholder="Valor do campo"
                      className="h-8 text-sm"
                    />
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full h-8"
                    onClick={handleAddCustomField}
                  >
                    Salvar Campo
                  </Button>
                </div>
              )}
              
              {localLead.custom_fields && Object.keys(localLead.custom_fields).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(localLead.custom_fields).map(([key, value]) => (
                    <div key={key} className="flex items-start group">
                      <Tag className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
                      <div className="flex-1">
                        {editingField === key ? (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">{key}</p>
                            <div className="flex gap-2">
                              <Input 
                                value={editingValue}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingValue(e.target.value)}
                                className="h-7 text-sm flex-1"
                              />
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-7 px-2"
                                onClick={handleEditField}
                              >
                                Salvar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-7 px-2"
                                onClick={cancelEditing}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs text-muted-foreground">{key}</p>
                            <p className="text-sm">{String(value)}</p>
                          </div>
                        )}
                      </div>
                      {editingField !== key && (
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 w-6 p-0"
                            onClick={() => startEditingField(key, String(value))}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 w-6 p-0 text-red-500"
                            onClick={() => handleDeleteField(key)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum campo personalizado</p>
              )}
            </div>

            {/* Data de criação */}
            <div>
              <h3 className="text-sm font-medium mb-3">Informações do Sistema</h3>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Data de criação</p>
                  <p className="text-sm">{new Date(localLead.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
                </div>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex gap-2 pt-4 border-t">
              <Button 
                className="flex-1"
                onClick={() => window.open(`/leads/${localLead.id}`, '_blank')}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Editar Lead
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Histórico de Atividades</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2 text-xs"
                onClick={() => loadActivityLogs(localLead.id)}
              >
                <History className="h-3 w-3 mr-1" />
                Atualizar
              </Button>
            </div>
            
            {loadingLogs ? (
              <div className="flex justify-center py-8">
                <p className="text-sm text-muted-foreground">Carregando histórico...</p>
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 border rounded-lg">
                <History className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma atividade registrada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activityLogs.map((log) => (
                  <div key={log.id} className="border-b pb-3 last:border-0">
                    <div className="flex items-start">
                      <div className="mr-3 mt-1">
                        {getActionIcon(log.action_type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{log.description}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatDate(log.created_at)}</span>
                          <span>•</span>
                          <span>Por: {log.user_name || 'Sistema'}</span>
                        </div>
                        
                        {/* Detalhes adicionais, se houver */}
                        {log.details && Object.keys(log.details).length > 0 && (
                          <div className="mt-2 p-2 bg-muted/20 rounded-md text-xs">
                            {log.action_type === LeadLogActionType.FIELD_UPDATED && (
                              <>
                                <p><span className="font-medium">Valor anterior:</span> {log.details.old_value}</p>
                                <p><span className="font-medium">Novo valor:</span> {log.details.new_value}</p>
                              </>
                            )}
                            
                            {log.action_type === LeadLogActionType.STAGE_CHANGED && (
                              <>
                                <p><span className="font-medium">De:</span> {log.details.from_stage}</p>
                                <p><span className="font-medium">Para:</span> {log.details.to_stage}</p>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

// Componente para a coluna que recebe os cards
const StageColumn = ({ 
  stage, 
  getLeadsForStage, 
  getStatusClass, 
  router, 
  handleMoveCard, 
  selectedPipeline,
  stages,
  onLeadClick
}: { 
  stage: PipelineStage, 
  getLeadsForStage: (stageId: string) => LeadPipeline[], 
  getStatusClass: (status: string) => string, 
  router: any, 
  handleMoveCard: (leadPipelineId: string, newStageId: string) => Promise<void>,
  selectedPipeline: string | null,
  stages: PipelineStage[],
  onLeadClick: (lead: Lead) => void
}) => {
  const dropRef = useRef<HTMLDivElement>(null);
  
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'LEAD_CARD',
    drop: (item: DragItem) => {
      if (item.currentStageId !== stage.id) {
        handleMoveCard(item.leadPipelineId, stage.id)
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));
  
  // Aplicar o ref
  drop(dropRef);

  const leadsInStage = getLeadsForStage(stage.id)

  return (
    <div 
      ref={dropRef}
      key={stage.id} 
      className={`flex-shrink-0 w-80 rounded-lg p-3 ${isOver ? 'bg-muted/50' : 'bg-muted/30'}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">{stage.stage_name}</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
          {leadsInStage.length}
        </span>
      </div>
      
      <div className="space-y-3">
        {leadsInStage.map((leadPipeline) => (
          <DraggableLeadCard 
            key={leadPipeline.id}
            leadPipeline={leadPipeline}
            getStatusClass={getStatusClass}
            router={router}
            handleMoveCard={handleMoveCard}
            stages={stages}
            onLeadClick={onLeadClick}
          />
        ))}
        
        {leadsInStage.length === 0 && (
          <div className="flex flex-col items-center justify-center h-20 border border-dashed rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              Nenhum lead neste estágio
            </p>
          </div>
        )}
        
        <Button 
          variant="ghost" 
          className="w-full justify-start text-sm"
          onClick={() => router.push(`/pipeline/adicionar-lead/${selectedPipeline}/${stage.id}`)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Adicionar Lead
        </Button>
      </div>
    </div>
  )
}

export default function PipelinePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pipelineIdFromUrl = searchParams ? searchParams.get('id') : null
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(pipelineIdFromUrl)
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [leadPipelines, setLeadPipelines] = useState<LeadPipeline[]>([])
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isLeadDetailsOpen, setIsLeadDetailsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingPipelines, setLoadingPipelines] = useState(true)
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [loadingStages, setLoadingStages] = useState(false)
  const [isAddingStage, setIsAddingStage] = useState(false)
  const [newStageName, setNewStageName] = useState("")
  const { currentTeam } = useTeam()

  // Efeito para carregar pipelines quando o time mudar
  useEffect(() => {
    loadPipelines()
  }, [currentTeam])

  // Efeito para definir o pipeline selecionado a partir da URL
  useEffect(() => {
    if (pipelineIdFromUrl) {
      setSelectedPipeline(pipelineIdFromUrl)
    }
  }, [pipelineIdFromUrl])

  // Efeito para carregar estágios e leads quando o pipeline selecionado mudar
  useEffect(() => {
    if (selectedPipeline) {
      // Definir loading como true apenas quando estamos carregando dados
      setLoading(true)
      
      // Carregar estágios e leads em paralelo
      Promise.all([
        loadStages(selectedPipeline),
        loadLeadPipelines(selectedPipeline)
      ])
      .finally(() => {
        // Quando ambas as promessas terminarem, definir loading como false
        setLoading(false)
      })
    }
  }, [selectedPipeline])

  async function loadPipelines() {
    try {
      setLoadingPipelines(true)
      
      // Verificar se há um time selecionado
      if (!currentTeam?.id) {
        setPipelines([])
        toast.warning("Selecione um time para visualizar os pipelines")
        setLoadingPipelines(false)
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
      
      // Se não tiver um pipeline selecionado (nem da URL nem do estado)
      if (data && data.length > 0 && !selectedPipeline) {
        setSelectedPipeline(data[0].id)
      }
      
      // Se tiver um pipeline selecionado (da URL ou do estado), verificar se ele existe na lista
      if (selectedPipeline && data) {
        const pipelineExists = data.some(p => p.id === selectedPipeline)
        if (!pipelineExists && data.length > 0) {
          // Se o pipeline selecionado não existir, selecionar o primeiro
          setSelectedPipeline(data[0].id)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar pipelines:', error)
      toast.error("Erro ao carregar pipelines")
    } finally {
      setLoadingPipelines(false)
    }
  }

  async function loadStages(pipelineId: string) {
    try {
      setLoadingStages(true)
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
    } finally {
      setLoadingStages(false)
    }
  }

  async function loadLeadPipelines(pipelineId: string) {
    try {
      setLoadingLeads(true)
      
      // Verificar se há um time selecionado
      if (!currentTeam?.id) {
        setLeadPipelines([])
        setLoadingLeads(false)
        return
      }
      
      // Filtrar lead_pipelines pelo pipeline selecionado e time atual
      const { data, error } = await supabase
        .from('lead_pipelines')
        .select(`
          *,
          lead:leads (
            id,
            name,
            email,
            phone,
            company_id,
            status,
            custom_fields,
            created_at
          )
        `)
        .eq('pipeline_id', pipelineId)
        .eq('leads.team_id', currentTeam.id)
        .not('leads.team_id', 'is', null) // Garantir que team_id não seja nulo
      
      if (error) throw error
      
      // Processar os dados para incluir o lead no objeto leadPipeline
      const processedLeadPipelines = data?.map(lp => ({
        ...lp,
        lead: lp.lead
      })) || []
      
      setLeadPipelines(processedLeadPipelines)
    } catch (error) {
      console.error('Erro ao carregar leads do pipeline:', error)
      toast.error("Erro ao carregar leads do pipeline")
    } finally {
      setLoadingLeads(false)
    }
  }

  async function handleMoveCard(leadPipelineId: string, newStageId: string) {
    try {
      // Obter o lead pipeline atual para registrar o estágio anterior
      const currentLeadPipeline = leadPipelines.find(lp => lp.id === leadPipelineId);
      if (!currentLeadPipeline) return;
      
      // Obter os nomes dos estágios para o log
      const fromStage = stages.find(s => s.id === currentLeadPipeline.current_stage_id);
      const toStage = stages.find(s => s.id === newStageId);
      
      // Atualizar no Supabase
      const { error } = await supabase
        .from('lead_pipelines')
        .update({ current_stage_id: newStageId })
        .eq('id', leadPipelineId);

      if (error) throw error;
      
      // Registrar a atividade no log
      if (currentLeadPipeline.lead) {
        await logLeadActivity({
          lead_id: currentLeadPipeline.lead.id,
          action_type: LeadLogActionType.STAGE_CHANGED,
          description: `Lead movido de "${fromStage?.stage_name || 'Estágio anterior'}" para "${toStage?.stage_name || 'Novo estágio'}"`,
          details: { 
            from_stage: fromStage?.stage_name || 'Desconhecido',
            to_stage: toStage?.stage_name || 'Desconhecido',
            pipeline_id: currentLeadPipeline.pipeline_id
          }
        });
      }
      
      // Atualizar o estado local
      setLeadPipelines(prevLeads => 
        prevLeads.map(lp => 
          lp.id === leadPipelineId 
            ? { ...lp, current_stage_id: newStageId } 
            : lp
        )
      );
      
      toast.success("Lead movido com sucesso!");
    } catch (error) {
      console.error('Erro ao mover lead:', error);
      toast.error("Erro ao mover lead");
    }
  }

  // Função para obter os leads de um estágio específico
  function getLeadsForStage(stageId: string) {
    return leadPipelines.filter(lp => lp.current_stage_id === stageId)
  }

  // Função para obter a classe de cor com base no status
  function getStatusClass(status: string) {
    switch (status.toLowerCase()) {
      case 'novo':
        return 'bg-blue-100 text-blue-800'
      case 'qualificado':
        return 'bg-green-100 text-green-800'
      case 'desqualificado':
        return 'bg-red-100 text-red-800'
      case 'em negociação':
        return 'bg-yellow-100 text-yellow-800'
      case 'convertido':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setIsLeadDetailsOpen(true);
  };

  const handleCloseLeadDetails = () => {
    setIsLeadDetailsOpen(false);
    // Opcional: limpar o lead selecionado após um delay para evitar flash visual
    setTimeout(() => setSelectedLead(null), 300);
  };

  function handleAddStage() {
    setNewStageName("")
    setIsAddingStage(true)
  }

  async function saveNewStage() {
    if (!newStageName.trim() || !selectedPipeline) return
    
    try {
      // Calcular a próxima ordem
      const nextOrder = stages.length > 0 
        ? Math.max(...stages.map(s => s.stage_order)) + 1 
        : 1
      
      // Inserir a nova etapa
      const { data, error } = await supabase
        .from('pipeline_stages')
        .insert({
          pipeline_id: selectedPipeline,
          stage_name: newStageName.trim(),
          stage_order: nextOrder
        })
        .select()

      if (error) throw error
      
      // Atualizar a lista de etapas
      if (data) {
        setStages([...stages, data[0]])
        toast.success("Etapa adicionada com sucesso!")
      }
    } catch (error) {
      console.error('Erro ao adicionar etapa:', error)
      toast.error("Erro ao adicionar etapa")
    } finally {
      setIsAddingStage(false)
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
                  <BreadcrumbPage>Pipeline</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">Pipeline</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie seus leads através do funil de vendas
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => router.push('/pipeline/etapas')}
              >
                <Settings className="mr-2 h-4 w-4" />
                Configurar Etapas
              </Button>
            </div>
          </div>

          {loadingPipelines ? (
            <div className="flex items-center justify-center h-40">
              <p>Carregando pipelines...</p>
            </div>
          ) : pipelines.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 border rounded-lg p-6">
              <h3 className="text-lg font-medium mb-2">Nenhum pipeline encontrado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie seu primeiro pipeline para começar a gerenciar seus leads
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
                    onValueChange={(value) => {
                      // Usar o router para navegar para o pipeline selecionado
                      router.push(`/pipeline?id=${value}`)
                    }}
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
                {selectedPipeline && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/pipeline/${selectedPipeline}`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Tem certeza que deseja excluir este pipeline?")) {
                          // Implementar exclusão
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <p>Carregando dados do pipeline...</p>
                </div>
              ) : stages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 border rounded-lg p-6">
                  <h3 className="text-lg font-medium mb-2">Nenhum estágio encontrado</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Adicione estágios ao seu pipeline para começar a gerenciar seus leads
                  </p>
                  <Button onClick={() => router.push('/pipeline/etapas')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Estágios
                  </Button>
                </div>
              ) : (
                <DndProvider backend={HTML5Backend}>
                  <div className="flex gap-4 overflow-x-auto pb-4">
                    {stages.map((stage) => (
                      <StageColumn
                        key={stage.id}
                        stage={stage}
                        getLeadsForStage={getLeadsForStage}
                        getStatusClass={getStatusClass}
                        router={router}
                        handleMoveCard={handleMoveCard}
                        selectedPipeline={selectedPipeline}
                        stages={stages}
                        onLeadClick={handleLeadClick}
                      />
                    ))}
                    
                    {/* Botão para adicionar nova etapa */}
                    <div className="flex-shrink-0 w-80 h-full">
                      <div 
                        className="h-full flex flex-col items-center justify-center p-4 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={handleAddStage}
                      >
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <PlusCircle className="h-10 w-10" />
                          <span className="font-medium">Adicionar Etapa</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </DndProvider>
              )}
            </>
          )}
        </div>

        {/* Modal para adicionar nova etapa */}
        <Dialog open={isAddingStage} onOpenChange={setIsAddingStage}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Adicionar Nova Etapa</DialogTitle>
              <DialogDescription>
                Digite o nome da nova etapa para o pipeline.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="stageName">Nome da Etapa</Label>
                <Input
                  id="stageName"
                  placeholder="Ex: Qualificação, Proposta, Fechamento"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddingStage(false)}>
                Cancelar
              </Button>
              <Button onClick={saveNewStage} disabled={!newStageName.trim()}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Painel lateral de detalhes do lead */}
        <LeadDetailsSheet 
          lead={selectedLead} 
          isOpen={isLeadDetailsOpen} 
          onClose={handleCloseLeadDetails}
          getStatusClass={getStatusClass}
        />
      </SidebarInset>
    </SidebarProvider>
  )
} 