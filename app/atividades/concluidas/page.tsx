"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Calendar as CalendarIcon, Trash2 } from "lucide-react"
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toast } from "sonner"
import { 
  getAllActivities, 
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

export default function AtividadesConcluidasPage() {
  const router = useRouter()
  const [activities, setActivities] = useState<ActivityWithLead[]>([])
  const [loading, setLoading] = useState(true)
  const { currentTeam } = useTeam()
  
  useEffect(() => {
    loadActivities()
  }, [currentTeam])
  
  async function loadActivities() {
    try {
      setLoading(true)
      
      // Verificar se há um time selecionado
      if (!currentTeam?.id) {
        setActivities([])
        toast.warning("Selecione um time para visualizar as atividades concluídas")
        return
      }
      
      // Filtrar atividades concluídas pelo time atual
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
        .eq('completed', true)
        .eq('team_id', currentTeam.id)
        .not('team_id', 'is', null)
        .order('completed_at', { ascending: false })
      
      if (error) throw error
      
      setActivities(data || [])
    } catch (error) {
      console.error('Erro ao carregar atividades concluídas:', error)
      toast.error("Erro ao carregar atividades concluídas")
    } finally {
      setLoading(false)
    }
  }
  
  async function handleDeleteActivity(activity: ActivityWithLead) {
    try {
      if (!activity.id || !activity.lead_id) return
      
      if (!confirm("Tem certeza que deseja excluir esta atividade?")) return
      
      await deleteActivity(activity.id, activity.lead_id, activity.title)
      
      toast.success("Atividade excluída com sucesso")
      loadActivities()
    } catch (error) {
      console.error('Erro ao excluir atividade:', error)
      toast.error("Erro ao excluir atividade")
    }
  }
  
  function formatTime(timeStr: string) {
    if (!timeStr) return "";
    return timeStr;
  }
  
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
                    <BreadcrumbLink href="/atividades">Atividades</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Concluídas</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold">Atividades Concluídas</h1>
              <Button variant="outline" onClick={() => router.push('/atividades')}>
                Voltar para Agenda
              </Button>
            </div>
            <Separator />
            
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Atividades</CardTitle>
                  <CardDescription>
                    {activities.length === 0 
                      ? "Nenhuma atividade concluída encontrada" 
                      : `${activities.length} atividades concluídas`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center p-4">
                      <p>Carregando atividades...</p>
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 border rounded-lg p-6">
                      <p className="text-sm text-muted-foreground">
                        Nenhuma atividade concluída encontrada
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activities.map((activity) => (
                        <Card key={activity.id} className="overflow-hidden bg-muted/30">
                          <div className="p-4">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium line-through text-muted-foreground">
                                {activity.title}
                              </h3>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDeleteActivity(activity)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
                                  <CalendarIcon className="h-3 w-3 mr-1" />
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
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
} 