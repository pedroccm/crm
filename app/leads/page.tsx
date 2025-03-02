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
import { supabase } from "@/lib/supabase"
import { Plus, Search, Trash2, Info, Pencil } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface Lead {
  id: string
  name: string
  email: string
  phone: string
  company_id: string
  companies?: { name: string }
  company_name?: string
  status: string
  custom_fields?: {
    notes?: string
    [key: string]: any
  }
  created_at: string
}

export default function LeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    loadLeads()
  }, [])

  async function loadLeads() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          companies (
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Transformar os dados para incluir o nome da empresa
      const formattedLeads = data?.map(lead => ({
        ...lead,
        company_name: lead.companies?.name
      })) || []
      
      setLeads(formattedLeads)
    } catch (error) {
      console.error('Erro ao carregar leads:', error)
      toast.error("Erro ao carregar leads")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este lead?")) return

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id)

      if (error) throw error

      setLeads(leads.filter(lead => lead.id !== id))
      toast.success("Lead excluído com sucesso!")
    } catch (error) {
      console.error('Erro ao excluir lead:', error)
      toast.error("Erro ao excluir lead")
    }
  }

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lead.company_name && lead.company_name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

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

  // Função para verificar se o lead tem observações
  function hasNotes(lead: Lead): boolean {
    return !!lead.custom_fields?.notes;
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
                  <BreadcrumbPage>Leads</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">Leads</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie os leads cadastrados no sistema
              </p>
            </div>
            <Button onClick={() => router.push('/leads/novo')}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Lead
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar leads..."
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
                  <TableHead>Email</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
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
                ) : filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Nenhum lead encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map(lead => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="font-medium"
                          >
                            {lead.name}
                          </div>
                          {hasNotes(lead) && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-blue-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">{lead.custom_fields?.notes}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{lead.email}</TableCell>
                      <TableCell>{lead.company_name || "-"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(lead.status)}`}>
                          {lead.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              console.log("Navegando para edição do lead:", lead.id);
                              router.push(`/leads/${lead.id}`);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(lead.id)}
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
    </SidebarProvider>
  )
} 