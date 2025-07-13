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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
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
import { createActivity, Activity } from "@/lib/supabase"
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

export default function NovaAtividadePage() {
  const router = useRouter()
  const [date, setDate] = useState<Date>(new Date())
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [leadId, setLeadId] = useState("")
  const [time, setTime] = useState("")
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const { currentTeam } = useTeam()
  
  useEffect(() => {
    loadLeads()
  }, [currentTeam])
  
  async function loadLeads() {
    try {
      // Verificar se há um time selecionado
      if (!currentTeam?.id) {
        setLeads([])
        return
      }
      
      // Usar Supabase diretamente para filtrar por team_id
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
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!title.trim() || !leadId) {
      toast.error("Preencha o título e selecione um lead")
      return
    }
    
    if (!currentTeam?.id) {
      toast.error("Selecione um time para criar uma atividade")
      return
    }
    
    try {
      setLoading(true)
      
      const newActivity: Activity = {
        title: title.trim(),
        description: description.trim(),
        lead_id: leadId,
        team_id: currentTeam.id,
        scheduled_date: formatDate(date, 'yyyy-MM-dd'),
        scheduled_time: time || undefined,
        completed: false
      }
      
      await createActivity(newActivity)
      
      toast.success("Atividade criada com sucesso")
      router.push('/atividades')
    } catch (error) {
      console.error('Erro ao criar atividade:', error)
      toast.error("Erro ao criar atividade")
    } finally {
      setLoading(false)
    }
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
                    <BreadcrumbPage>Nova Atividade</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold">Nova Atividade</h1>
              <Button variant="outline" onClick={() => router.push('/atividades')}>
                Cancelar
              </Button>
            </div>
            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-[350px_1fr] gap-6">
              {/* Coluna do Calendário */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Data da Atividade</CardTitle>
                    <CardDescription>Selecione a data para a atividade</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(date) => date && setDate(date)}
                      className="rounded-md border"
                    />
                  </CardContent>
                  <CardFooter>
                    <p className="text-sm text-muted-foreground">
                      Data selecionada: {formatDate(date, 'dd/MM/yyyy')}
                    </p>
                  </CardFooter>
                </Card>
              </div>
              
              {/* Formulário */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Detalhes da Atividade</CardTitle>
                    <CardDescription>Preencha as informações da atividade</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="title">Título</Label>
                        <Input
                          id="title"
                          placeholder="Título da atividade"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                          id="description"
                          placeholder="Descrição da atividade"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={4}
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="lead">Lead</Label>
                        <Select value={leadId} onValueChange={setLeadId} required>
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
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                        />
                      </div>
                      
                      <div className="flex justify-end gap-2 pt-4">
                        <Button 
                          variant="outline" 
                          type="button"
                          onClick={() => router.push('/atividades')}
                        >
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                          {loading ? "Salvando..." : "Salvar Atividade"}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
} 