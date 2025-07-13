"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Calendar as CalendarIcon, Plus, Check, Clock, X, Pencil, Trash2 } from "lucide-react"
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
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { 
  getAllActivities, 
  getActivitiesByDate, 
  createActivity, 
  completeActivity,
  uncompleteActivity,
  updateActivity, 
  deleteActivity,
  Activity
} from "@/lib/supabase"
import { useTeam } from "@/lib/team-context"
import { supabase } from "@/lib/supabase"

interface Lead {
  id: string
  name: string
  email: string
  company_id: string
  companies?: {
    id: string
    name: string
  }
}

interface ActivityWithLead extends Activity {
  leads?: Lead
}

// Funções auxiliares para manipulação de datas
function formatDate(date: Date | string, format: string): string {
  if (!date) return "";
  const d = new Date(date);
  
  // Formato básico: yyyy-MM-dd
  if (format === 'yyyy-MM-dd') {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  
  // Formato: dd/MM/yyyy
  if (format === 'dd/MM/yyyy') {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
  
  // Formato: dd/MM/yyyy HH:mm
  if (format === 'dd/MM/yyyy HH:mm') {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  
  return d.toLocaleDateString();
}

function parseISODate(dateString: string): Date {
  return new Date(dateString);
}

function addDaysToDate(date: Date, days: number): Date {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
}

function subDaysFromDate(date: Date, days: number): Date {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() - days);
  return newDate;
}

export default function AtividadesPage() {
  const router = useRouter()
  const [date, setDate] = useState<Date>(new Date())
  const [activities, setActivities] = useState<ActivityWithLead[]>([])
  const [completedActivities, setCompletedActivities] = useState<ActivityWithLead[]>([])
  const [allActivities, setAllActivities] = useState<ActivityWithLead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedActivity, setSelectedActivity] = useState<ActivityWithLead | null>(null)
  const [isAddingActivity, setIsAddingActivity] = useState(false)
  const [isEditingActivity, setIsEditingActivity] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [activeTab, setActiveTab] = useState("date")
  
  // Formulário de nova atividade
  const [formTitle, setFormTitle] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formLeadId, setFormLeadId] = useState("")
  const [formTime, setFormTime] = useState("")
  
  const { currentTeam } = useTeam()
  
  useEffect(() => {
    loadLeads()
  }, [currentTeam])
  
  useEffect(() => {
    if (activeTab === "date") {
      loadActivitiesByDate(formatDate(date, 'yyyy-MM-dd'))
    } else {
      loadAllActivities()
    }
  }, [activeTab, date, currentTeam])
  
  async function loadLeads() {
    try {
      // Verificar se há um time selecionado
      if (!currentTeam?.id) {
        setLeads([])
        return
      }
      
      // Filtrar leads pelo time atual
      const { data, error } = await supabase
        .from('leads')
        .select(`
          id,
          name,
          email,
          company_id,
          companies:companies (
            id,
            name
          )
        `)
        .eq('team_id', currentTeam.id)
        .not('team_id', 'is', null)
        .order('name')
      
      if (error) throw error
      
      // Converter os dados para o formato esperado pela interface Lead
      const formattedLeads: Lead[] = data?.map(lead => ({
        id: lead.id,
        name: lead.name,
        email: lead.email,
        company_id: lead.company_id,
        companies: lead.companies && lead.companies.length > 0 ? {
          id: lead.companies[0].id,
          name: lead.companies[0].name
        } : undefined
      })) || []
      
      setLeads(formattedLeads)
    } catch (error) {
      console.error('Erro ao carregar leads:', error)
      toast.error("Erro ao carregar leads")
    }
  }
  
  async function loadActivitiesByDate(dateStr: string) {
    try {
      setLoading(true)
      
      // Verificar se há um time selecionado
      if (!currentTeam?.id) {
        setActivities([])
        toast.warning("Selecione um time para visualizar as atividades")
        return
      }
      
      // Filtrar atividades pela data e time atual
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          leads (
            id,
            name,
            email,
            company_id,
            companies (
              id,
              name
            )
          )
        `)
        .eq('scheduled_date', dateStr)
        .eq('completed', false)
        .eq('team_id', currentTeam.id)
        .not('team_id', 'is', null)
        .order('scheduled_time')
      
      if (error) throw error
      
      setActivities(data || [])
    } catch (error) {
      console.error('Erro ao carregar atividades:', error)
      toast.error("Erro ao carregar atividades")
    } finally {
      setLoading(false)
    }
  }
  
  async function loadAllActivities() {
    try {
      setLoading(true)
      
      // Verificar se há um time selecionado
      if (!currentTeam?.id) {
        setActivities([])
        toast.warning("Selecione um time para visualizar as atividades")
        return
      }
      
      // Filtrar todas as atividades não concluídas pelo time atual
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          leads (
            id,
            name,
            email,
            company_id,
            companies (
              id,
              name
            )
          )
        `)
        .eq('completed', false)
        .eq('team_id', currentTeam.id)
        .not('team_id', 'is', null)
        .order('scheduled_date')
        .order('scheduled_time')
      
      if (error) throw error
      
      setActivities(data || [])
    } catch (error) {
      console.error('Erro ao carregar atividades:', error)
      toast.error("Erro ao carregar atividades")
    } finally {
      setLoading(false)
    }
  }
  
  async function handleAddActivity() {
    try {
      // Validações
      if (!formTitle.trim() || !formLeadId) {
        toast.error("Preencha o título e selecione um lead")
        return
      }
      
      if (!currentTeam?.id) {
        toast.error("Selecione um time para criar uma atividade")
        return
      }
      
      // Criar objeto de atividade
      const teamId = currentTeam.id
      const newActivity = {
        title: formTitle.trim(),
        description: formDescription.trim(),
        lead_id: formLeadId,
        team_id: teamId,
        scheduled_date: formatDate(date, 'yyyy-MM-dd'),
        scheduled_time: formTime || undefined,
        completed: false
      }
      
      // Salvar atividade
      await createActivity(newActivity)
      
      // Feedback e atualização da UI
      toast.success("Atividade criada com sucesso")
      resetForm()
      setIsAddingActivity(false)
      
      // Recarregar atividades
      if (activeTab === "date") {
        loadActivitiesByDate(formatDate(date, 'yyyy-MM-dd'))
      } else {
        loadAllActivities()
      }
    } catch (error) {
      console.error('Erro ao criar atividade:', error)
      toast.error("Erro ao criar atividade")
    }
  }
  
  async function handleCompleteActivity(activity: ActivityWithLead) {
    try {
      if (!activity.id || !activity.lead_id) return
      
      await completeActivity(activity.id, activity.lead_id)
      
      toast.success("Atividade marcada como concluída")
      
      if (activeTab === "date") {
        loadActivitiesByDate(formatDate(date, 'yyyy-MM-dd'))
      } else {
        loadAllActivities()
      }
    } catch (error) {
      console.error('Erro ao concluir atividade:', error)
      toast.error("Erro ao concluir atividade")
    }
  }
  
  async function handleUncompleteActivity(activity: ActivityWithLead) {
    try {
      if (!activity.id || !activity.lead_id) return
      
      await uncompleteActivity(activity.id, activity.lead_id)
      
      toast.success("Atividade desmarcada como concluída")
      
      if (activeTab === "date") {
        loadActivitiesByDate(formatDate(date, 'yyyy-MM-dd'))
      } else {
        loadAllActivities()
      }
    } catch (error) {
      console.error('Erro ao desmarcar atividade como concluída:', error)
      toast.error("Erro ao desmarcar atividade como concluída")
    }
  }
  
  async function handleUpdateActivity() {
    try {
      if (!selectedActivity?.id || !selectedActivity.lead_id) return
      if (!formTitle.trim() || !formLeadId) {
        toast.error("Preencha o título e selecione um lead")
        return
      }
      
      if (!currentTeam?.id) {
        toast.error("Selecione um time para atualizar uma atividade")
        return
      }
      
      const updates: Partial<Activity> = {
        title: formTitle.trim(),
        description: formDescription.trim(),
        lead_id: formLeadId,
        team_id: currentTeam.id,
        scheduled_date: formatDate(date, 'yyyy-MM-dd'),
        scheduled_time: formTime || undefined
      }
      
      await updateActivity(selectedActivity.id, selectedActivity.lead_id, updates)
      
      toast.success("Atividade atualizada com sucesso")
      resetForm()
      setIsEditingActivity(false)
      
      if (activeTab === "date") {
        loadActivitiesByDate(formatDate(date, 'yyyy-MM-dd'))
      } else {
        loadAllActivities()
      }
    } catch (error) {
      console.error('Erro ao atualizar atividade:', error)
      toast.error("Erro ao atualizar atividade")
    }
  }
  
  async function handleDeleteActivity(activity: ActivityWithLead) {
    try {
      if (!activity.id || !activity.lead_id) return
      
      if (!confirm("Tem certeza que deseja excluir esta atividade?")) return
      
      await deleteActivity(activity.id, activity.lead_id, activity.title)
      
      toast.success("Atividade excluída com sucesso")
      
      if (activeTab === "date") {
        loadActivitiesByDate(formatDate(date, 'yyyy-MM-dd'))
      } else {
        loadAllActivities()
      }
    } catch (error) {
      console.error('Erro ao excluir atividade:', error)
      toast.error("Erro ao excluir atividade")
    }
  }
  
  function openEditDialog(activity: ActivityWithLead) {
    setSelectedActivity(activity)
    setFormTitle(activity.title)
    setFormDescription(activity.description || "")
    setFormLeadId(activity.lead_id)
    setFormTime(activity.scheduled_time || "")
    setIsEditingActivity(true)
  }
  
  function resetForm() {
    setFormTitle("")
    setFormDescription("")
    setFormLeadId("")
    setFormTime("")
    setSelectedActivity(null)
  }
  
  function formatTime(time?: string) {
    if (!time) return ""
    return time
  }
  
  function getLeadName(leadId: string) {
    const lead = leads.find(l => l.id === leadId)
    return lead ? lead.name : "Lead não encontrado"
  }
  
  function getCompanyName(leadId: string) {
    const lead = leads.find(l => l.id === leadId)
    if (!lead || !lead.companies) return ""
    return lead.companies.name
  }
  
  return (
    <SidebarProvider>
      <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
        <AppSidebar />
        <div className="flex flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/dashboard">Home</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Atividades</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold">Atividades</h1>
              <Button onClick={() => router.push('/atividades/nova')}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Atividade
              </Button>
            </div>
            <Separator />
            
            <Tabs defaultValue="date" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-auto">
                <TabsTrigger value="date" className="px-3 py-1.5 text-sm">Por Data</TabsTrigger>
                <TabsTrigger value="all" className="px-3 py-1.5 text-sm">Todas</TabsTrigger>
              </TabsList>
              
              <TabsContent value="date">
                <div className="grid grid-cols-1 md:grid-cols-[350px_1fr] gap-6">
                  {/* Coluna do Calendário */}
                  <div className="space-y-4">
                    <Card>
                      <CardContent className="p-4">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={(date) => date && setDate(date)}
                          className="rounded-md border"
                        />
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Coluna das Atividades */}
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Atividades para {formatDate(date, 'dd/MM/yyyy')}</CardTitle>
                        <CardDescription>
                          {activities.length + completedActivities.length === 0 
                            ? "Nenhuma atividade encontrada para esta data" 
                            : `${activities.length} atividades pendentes, ${completedActivities.length} concluídas`}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {loading ? (
                          <div className="flex justify-center p-4">
                            <p>Carregando atividades...</p>
                          </div>
                        ) : (
                          <Tabs defaultValue="pendentes">
                            <TabsList className="w-auto">
                              <TabsTrigger value="pendentes" className="px-3 py-1.5 text-sm">Pendentes ({activities.length})</TabsTrigger>
                              <TabsTrigger value="concluidas" className="px-3 py-1.5 text-sm">Concluídas ({completedActivities.length})</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="pendentes" className="space-y-4 mt-4">
                              {activities.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 border rounded-lg p-6">
                                  <p className="text-sm text-muted-foreground">
                                    Nenhuma atividade pendente para esta data
                                  </p>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="mt-4"
                                    onClick={() => {
                                      resetForm()
                                      setIsAddingActivity(true)
                                    }}
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Adicionar Atividade
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {activities.map((activity) => (
                                    <Card key={activity.id} className="overflow-hidden">
                                      <div className="p-4">
                                        <div className="flex items-center justify-between">
                                          <h3 className="font-medium">
                                            {activity.title}
                                          </h3>
                                          <div className="flex items-center gap-2">
                                            <Button 
                                              variant="ghost" 
                                              size="icon"
                                              onClick={() => handleCompleteActivity(activity)}
                                            >
                                              <Check className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                              variant="ghost" 
                                              size="icon"
                                              onClick={() => openEditDialog(activity)}
                                            >
                                              <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                              variant="ghost" 
                                              size="icon"
                                              onClick={() => handleDeleteActivity(activity)}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </div>
                                        
                                        {activity.description && (
                                          <p className="text-sm text-muted-foreground mt-1">
                                            {activity.description}
                                          </p>
                                        )}
                                        
                                        <div className="flex items-center gap-4 mt-2">
                                          {activity.scheduled_time && (
                                            <div className="flex items-center text-xs text-muted-foreground">
                                              <Clock className="h-3 w-3 mr-1" />
                                              {formatTime(activity.scheduled_time)}
                                            </div>
                                          )}
                                          
                                          <div className="text-xs text-muted-foreground">
                                            Lead: {activity.leads?.name || "Lead não encontrado"}
                                          </div>
                                          
                                          {activity.leads?.companies && (
                                            <div className="text-xs text-muted-foreground">
                                              Empresa: {activity.leads.companies.name}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </Card>
                                  ))}
                                </div>
                              )}
                            </TabsContent>
                            
                            <TabsContent value="concluidas" className="space-y-4 mt-4">
                              {completedActivities.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 border rounded-lg p-6">
                                  <p className="text-sm text-muted-foreground">
                                    Nenhuma atividade concluída para esta data
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {completedActivities.map((activity) => (
                                    <Card key={activity.id} className="overflow-hidden bg-muted/30">
                                      <div className="p-4">
                                        <div className="flex items-center justify-between">
                                          <h3 className="font-medium line-through text-muted-foreground">
                                            {activity.title}
                                          </h3>
                                          <div className="flex items-center gap-2">
                                            <Button 
                                              variant="ghost" 
                                              size="icon"
                                              onClick={() => handleUncompleteActivity(activity)}
                                              title="Desmarcar como concluída"
                                            >
                                              <X className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                              variant="ghost" 
                                              size="icon"
                                              onClick={() => handleDeleteActivity(activity)}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </div>
                                        
                                        {activity.description && (
                                          <p className="text-sm text-muted-foreground mt-1 line-through">
                                            {activity.description}
                                          </p>
                                        )}
                                        
                                        <div className="flex items-center gap-4 mt-2">
                                          {activity.scheduled_time && (
                                            <div className="flex items-center text-xs text-muted-foreground">
                                              <Clock className="h-3 w-3 mr-1" />
                                              {formatTime(activity.scheduled_time)}
                                            </div>
                                          )}
                                          
                                          <div className="text-xs text-muted-foreground">
                                            Lead: {activity.leads?.name || "Lead não encontrado"}
                                          </div>
                                          
                                          {activity.leads?.companies && (
                                            <div className="text-xs text-muted-foreground">
                                              Empresa: {activity.leads.companies.name}
                                            </div>
                                          )}
                                          
                                          {activity.completed_at && (
                                            <div className="text-xs text-muted-foreground">
                                              Concluída em: {formatDate(parseISODate(activity.completed_at), 'dd/MM/yyyy HH:mm')}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </Card>
                                  ))}
                                </div>
                              )}
                            </TabsContent>
                          </Tabs>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="all">
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Todas as Atividades</CardTitle>
                      <CardDescription>
                        {allActivities.length + completedActivities.length === 0 
                          ? "Nenhuma atividade encontrada" 
                          : `${allActivities.length} atividades pendentes, ${completedActivities.length} concluídas`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <div className="flex justify-center p-4">
                          <p>Carregando atividades...</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {allActivities.length > 0 && (
                            <div className="space-y-2">
                              <h3 className="text-lg font-medium">Atividades Pendentes</h3>
                              <div className="space-y-3">
                                {allActivities.map((activity) => (
                                  <Card key={activity.id} className="overflow-hidden">
                                    <div className="p-4">
                                      <div className="flex items-center justify-between">
                                        <h3 className="font-medium">
                                          {activity.title}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                          <Button 
                                            variant="ghost" 
                                            size="icon"
                                            onClick={() => handleCompleteActivity(activity)}
                                          >
                                            <Check className="h-4 w-4" />
                                          </Button>
                                          <Button 
                                            variant="ghost" 
                                            size="icon"
                                            onClick={() => openEditDialog(activity)}
                                          >
                                            <Pencil className="h-4 w-4" />
                                          </Button>
                                          <Button 
                                            variant="ghost" 
                                            size="icon"
                                            onClick={() => handleDeleteActivity(activity)}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                      
                                      {activity.description && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                          {activity.description}
                                        </p>
                                      )}
                                      
                                      <div className="flex items-center gap-4 mt-2">
                                        <div className="flex items-center text-xs text-muted-foreground">
                                          Data: {formatDate(activity.scheduled_date, 'dd/MM/yyyy')}
                                        </div>
                                        
                                        {activity.scheduled_time && (
                                          <div className="flex items-center text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3 mr-1" />
                                            {formatTime(activity.scheduled_time)}
                                          </div>
                                        )}
                                        
                                        <div className="text-xs text-muted-foreground">
                                          Lead: {activity.leads?.name || "Lead não encontrado"}
                                        </div>
                                        
                                        {activity.leads?.companies && (
                                          <div className="text-xs text-muted-foreground">
                                            Empresa: {activity.leads.companies.name}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {completedActivities.length > 0 && (
                            <div className="space-y-2">
                              <h3 className="text-lg font-medium">Atividades Concluídas</h3>
                              <div className="space-y-3">
                                {completedActivities.map((activity) => (
                                  <Card key={activity.id} className="overflow-hidden bg-muted/30">
                                    <div className="p-4">
                                      <div className="flex items-center justify-between">
                                        <h3 className="font-medium line-through text-muted-foreground">
                                          {activity.title}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                          <Button 
                                            variant="ghost" 
                                            size="icon"
                                            onClick={() => handleUncompleteActivity(activity)}
                                            title="Desmarcar como concluída"
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                          <Button 
                                            variant="ghost" 
                                            size="icon"
                                            onClick={() => handleDeleteActivity(activity)}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                      
                                      {activity.description && (
                                        <p className="text-sm text-muted-foreground mt-1 line-through">
                                          {activity.description}
                                        </p>
                                      )}
                                      
                                      <div className="flex items-center gap-4 mt-2">
                                        <div className="flex items-center text-xs text-muted-foreground">
                                          Data: {formatDate(activity.scheduled_date, 'dd/MM/yyyy')}
                                        </div>
                                        
                                        {activity.scheduled_time && (
                                          <div className="flex items-center text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3 mr-1" />
                                            {formatTime(activity.scheduled_time)}
                                          </div>
                                        )}
                                        
                                        <div className="text-xs text-muted-foreground">
                                          Lead: {activity.leads?.name || "Lead não encontrado"}
                                        </div>
                                        
                                        {activity.leads?.companies && (
                                          <div className="text-xs text-muted-foreground">
                                            Empresa: {activity.leads.companies.name}
                                          </div>
                                        )}
                                        
                                        {activity.completed_at && (
                                          <div className="text-xs text-muted-foreground">
                                            Concluída em: {formatDate(parseISODate(activity.completed_at), 'dd/MM/yyyy HH:mm')}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
      
      {/* Modal para adicionar atividade */}
      <Dialog open={isAddingActivity} onOpenChange={setIsAddingActivity}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova Atividade</DialogTitle>
            <DialogDescription>
              Adicione uma nova atividade para o dia {formatDate(date, 'dd/MM/yyyy')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                placeholder="Título da atividade"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descrição da atividade"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead">Lead</Label>
              <Select value={formLeadId} onValueChange={setFormLeadId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um lead" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name} {lead.companies && `(${lead.companies.name})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="time">Horário (opcional)</Label>
              <Input
                id="time"
                type="time"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingActivity(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddActivity}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal para editar atividade */}
      <Dialog open={isEditingActivity} onOpenChange={setIsEditingActivity}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Atividade</DialogTitle>
            <DialogDescription>
              Edite os detalhes da atividade
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Título</Label>
              <Input
                id="edit-title"
                placeholder="Título da atividade"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                placeholder="Descrição da atividade"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-lead">Lead</Label>
              <Select value={formLeadId} onValueChange={setFormLeadId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um lead" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name} {lead.companies && `(${lead.companies.name})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-time">Horário (opcional)</Label>
              <Input
                id="edit-time"
                type="time"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingActivity(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateActivity}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
} 