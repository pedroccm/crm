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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { Plus, Search, Trash2, Info, Pencil, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useTeam } from "@/lib/team-context"
import { Label, getLeadLabels, getLabels } from "@/lib/supabase"
import { LabelBadge } from "@/components/labels/LabelBadge"

interface Lead {
  id: string
  name: string
  email: string
  phone: string
  company_id: string
  companies?: { 
    name: string
    website?: string
    address?: string
  }
  company_name?: string
  status: string
  custom_fields?: {
    notes?: string
    city?: string
    [key: string]: any
  }
  created_at: string
  labels?: Label[]
}

export default function LeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [websiteFilter, setWebsiteFilter] = useState<string>("all")
  const [cityFilter, setCityFilter] = useState<string>("all")
  const [labelFilter, setLabelFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [availableCities, setAvailableCities] = useState<string[]>([])
  const [availableLabels, setAvailableLabels] = useState<Label[]>([])
  const { currentTeam } = useTeam()

  const ITEMS_PER_PAGE = 50

  // Debounce para a busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)
    
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    loadLeads()
  }, [currentTeam, currentPage, websiteFilter, cityFilter, labelFilter, debouncedSearchTerm])

  // Reset da página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, websiteFilter, cityFilter, labelFilter])

  useEffect(() => {
    loadCities()
    loadAvailableLabels()
  }, [currentTeam])

  async function loadLeads() {
    try {
      setLoading(true)
      
      // Verificar se há um time selecionado
      if (!currentTeam?.id) {
        setLeads([])
        setTotalCount(0)
        toast.warning("Selecione um time para visualizar os leads")
        return
      }
      
      // Construir query base
      let query = supabase
        .from('leads')
        .select(`
          *,
          companies (
            name,
            website,
            address
          )
        `, { count: 'exact' })
        .eq('team_id', currentTeam.id)
        .not('team_id', 'is', null)
      
      // Aplicar filtros um por vez para evitar conflitos
      try {
        if (websiteFilter === 'with_website') {
          query = query.not('companies.website', 'is', null).neq('companies.website', '')
          console.log('Filtro "com website" aplicado')
        } else if (websiteFilter === 'without_website') {
          // Usar filtro mais simples: leads sem empresa ou com website vazio/nulo
          query = query.or(`company_id.is.null,companies.website.is.null`)
          console.log('Filtro "sem website" aplicado')
        }
        
        if (cityFilter && cityFilter !== 'all') {
          query = query.ilike('companies.address', `%${cityFilter}%`)
          console.log('Filtro cidade aplicado:', cityFilter)
        }
        
        if (debouncedSearchTerm && debouncedSearchTerm.trim() !== '') {
          const term = debouncedSearchTerm.trim()
          // Usar sintaxe correta para o OR do Supabase
          query = query.or(`name.ilike.*${term}*,email.ilike.*${term}*,phone.ilike.*${term}*`)
          console.log('Filtro busca aplicado:', term)
        }
        
        // Aplicar filtro de label se selecionado
        if (labelFilter && labelFilter !== 'all') {
          // Buscar leads que possuem a label específica através da tabela de relacionamento
          const { data: leadsWithLabel, error: labelError } = await supabase
            .from('lead_labels')
            .select('lead_id')
            .eq('label_id', labelFilter)
          
          if (labelError) {
            console.error('Erro ao buscar leads por label:', labelError)
          } else if (leadsWithLabel && leadsWithLabel.length > 0) {
            const leadIds = leadsWithLabel.map(item => item.lead_id)
            query = query.in('id', leadIds)
            console.log('Filtro label aplicado:', labelFilter, 'Lead IDs:', leadIds)
          } else {
            // Se não há leads com essa label, forçar resultado vazio
            query = query.eq('id', 'no-leads-with-this-label')
            console.log('Nenhum lead encontrado com a label:', labelFilter)
          }
        }
      } catch (filterError) {
        console.error('Erro ao aplicar filtros:', filterError)
        // Se houver erro nos filtros, usar query básica
        query = supabase
          .from('leads')
          .select(`
            *,
            companies (
              name,
              website,
              address
            )
          `, { count: 'exact' })
          .eq('team_id', currentTeam.id)
      }
      
      console.log('Filtros aplicados:', {
        websiteFilter,
        cityFilter,
        labelFilter,
        searchTerm: debouncedSearchTerm,
        currentPage,
        teamId: currentTeam.id
      })
      
      // Aplicar paginação
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1
      
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to)
      
      if (error) {
        console.error('Erro detalhado na consulta Supabase:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }
      
      console.log('Query executada com sucesso:', {
        totalCount: count,
        resultsCount: data?.length
      })
      
      // Processar os dados para adicionar company_name e carregar labels
      const processedLeads = data?.map(lead => ({
        ...lead,
        company_name: lead.companies?.name
      })) || []
      
      // Carregar labels para cada lead
      const leadsWithLabels = await Promise.all(
        processedLeads.map(async (lead) => {
          try {
            const labels = await getLeadLabels(lead.id)
            return { ...lead, labels }
          } catch (error) {
            console.error(`Erro ao carregar labels do lead ${lead.id}:`, error)
            return { ...lead, labels: [] }
          }
        })
      )
      
      setLeads(leadsWithLabels)
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Erro ao carregar leads:', error)
      toast.error(`Erro ao carregar leads: ${error.message || 'Erro desconhecido'}`)
    } finally {
      setLoading(false)
    }
  }

  async function loadAvailableLabels() {
    try {
      if (!currentTeam?.id) {
        setAvailableLabels([])
        return
      }
      
      const labels = await getLabels(currentTeam.id)
      setAvailableLabels(labels)
    } catch (error) {
      console.error('Erro ao carregar labels disponíveis:', error)
    }
  }

  async function loadCities() {
    try {
      if (!currentTeam?.id) return
      
      // Carregar cidades dos leads e das empresas associadas
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select(`
          custom_fields,
          companies (
            address
          )
        `)
        .eq('team_id', currentTeam.id)
      
      if (leadsError) throw leadsError
      
      const cities = new Set<string>()
      
      // Extrair cidades dos custom_fields dos leads
      leadsData?.forEach(lead => {
        if (lead.custom_fields?.city) {
          const city = lead.custom_fields.city
          if (typeof city === 'string' && city.trim() !== '') {
            cities.add(city.trim())
          }
        }
        
        // Extrair cidades dos endereços das empresas
        if (lead.companies?.address) {
          const address = lead.companies.address
          if (typeof address === 'string' && address.includes(',')) {
            // Tentar extrair cidade do endereço (assumindo formato "Rua, Cidade, Estado" ou "Rua, Bairro, Cidade, Estado")
            const parts = address.split(',').map(part => part.trim())
            if (parts.length >= 2) {
              const possibleCity = parts[parts.length - 2] // Penúltima parte
              // Verificar se não é um código postal (números apenas ou formato CEP)
              if (possibleCity && 
                  possibleCity.length > 2 && 
                  !/^\d+$/.test(possibleCity) && // Não é só números
                  !/^\d{5}-?\d{3}$/.test(possibleCity) && // Não é CEP
                  !/^[A-Z]{2}$/.test(possibleCity)) { // Não é sigla de estado
                cities.add(possibleCity)
              }
            }
          }
        }
      })
      
      setAvailableCities(Array.from(cities).sort())
      console.log('Cidades carregadas:', Array.from(cities).sort())
    } catch (error) {
      console.error('Erro ao carregar cidades:', error)
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

  // A busca agora é feita no servidor, não precisamos filtrar localmente
  const filteredLeads = leads

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  function handlePageChange(page: number) {
    setCurrentPage(page)
  }

  function handleWebsiteFilterChange(value: string) {
    setWebsiteFilter(value)
    setCurrentPage(1)
  }

  function handleCityFilterChange(value: string) {
    setCityFilter(value)
    setCurrentPage(1)
  }

  function handleLabelFilterChange(value: string) {
    setLabelFilter(value)
    setCurrentPage(1)
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
            <Select value={websiteFilter} onValueChange={handleWebsiteFilterChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os leads</SelectItem>
                <SelectItem value="with_website">Com site</SelectItem>
                <SelectItem value="without_website">Sem site</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cityFilter} onValueChange={handleCityFilterChange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filtrar por cidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as cidades</SelectItem>
                {availableCities.map(city => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={labelFilter} onValueChange={handleLabelFilterChange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filtrar por label" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as labels</SelectItem>
                {availableLabels.map(label => (
                  <SelectItem key={label.id} value={label.id!}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: label.color }}
                      />
                      {label.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Labels</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
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
                      <TableCell>{lead.phone || "-"}</TableCell>
                      <TableCell>{lead.company_name || "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {lead.labels && lead.labels.length > 0 ? (
                            lead.labels.slice(0, 3).map(label => (
                              <LabelBadge
                                key={label.id}
                                label={label}
                                size="sm"
                              />
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                          {lead.labels && lead.labels.length > 3 && (
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                              +{lead.labels.length - 3}
                            </span>
                          )}
                        </div>
                      </TableCell>
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
                              if (!lead.phone) {
                                toast.error("Lead não possui telefone cadastrado");
                                return;
                              }
                              
                              // Formatar telefone para o chat
                              let phoneNumber = lead.phone.replace(/\D/g, '');
                              if (phoneNumber.length === 11 && phoneNumber.startsWith('11')) {
                                phoneNumber = '55' + phoneNumber; // Adicionar código do país
                              } else if (phoneNumber.length === 10) {
                                phoneNumber = '5511' + phoneNumber; // Adicionar código do país e área
                              }
                              
                              // Passar tanto o telefone quanto o ID do lead
                              router.push(`/chat-evo?phone=${phoneNumber}&lead_id=${lead.id}&lead_name=${encodeURIComponent(lead.name)}`);
                            }}
                            title="Conversar com o lead"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
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

          {/* Informações de paginação e controles */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Mostrando {filteredLeads.length} de {totalCount} leads
              {totalPages > 1 && (
                <span className="ml-2">
                  (Página {currentPage} de {totalPages})
                </span>
              )}
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber
                    if (totalPages <= 5) {
                      pageNumber = i + 1
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i
                    } else {
                      pageNumber = currentPage - 2 + i
                    }
                    
                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNumber)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNumber}
                      </Button>
                    )
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 