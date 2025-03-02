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
import { Plus, Search, Trash2, Pencil } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

interface Company {
  id: string
  name: string
  email: string
  phone: string
  address?: string
  website?: string
  created_at: string
}

export default function EmpresasPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    loadCompanies()
  }, [])

  async function loadCompanies() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name')

      if (error) throw error
      setCompanies(data || [])
    } catch (error) {
      console.error('Erro ao carregar empresas:', error)
      toast.error("Erro ao carregar empresas")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta empresa?")) return

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id)

      if (error) throw error

      setCompanies(companies.filter(company => company.id !== id))
      toast.success("Empresa excluída com sucesso!")
    } catch (error) {
      console.error('Erro ao excluir empresa:', error)
      toast.error("Erro ao excluir empresa")
    }
  }

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.email.toLowerCase().includes(searchTerm.toLowerCase())
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
                  <BreadcrumbPage>Empresas</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">Empresas</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie as empresas cadastradas no sistema
              </p>
            </div>
            <Button onClick={() => router.push('/empresas/nova')}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Empresa
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar empresas..."
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
                  <TableHead>Telefone</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredCompanies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Nenhuma empresa encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCompanies.map(company => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <div
                          className="font-medium"
                        >
                          {company.name}
                        </div>
                      </TableCell>
                      <TableCell>{company.email}</TableCell>
                      <TableCell>{company.phone}</TableCell>
                      <TableCell>
                        {company.website && (
                          <a
                            href={company.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            {company.website}
                          </a>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              console.log("Navegando para edição da empresa:", company.id);
                              router.push(`/empresas/${company.id}`);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(company.id)}
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