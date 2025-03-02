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

export default function DashboardPage() {
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
                  <BreadcrumbPage>Visão Geral</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {/* Cards de Resumo */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl bg-card p-6 shadow">
              <h3 className="text-sm font-medium text-muted-foreground">Total de Leads</h3>
              <p className="mt-2 text-3xl font-bold">127</p>
              <p className="text-xs text-muted-foreground">+5.2% em relação ao mês anterior</p>
            </div>
            <div className="rounded-xl bg-card p-6 shadow">
              <h3 className="text-sm font-medium text-muted-foreground">Leads Qualificados</h3>
              <p className="mt-2 text-3xl font-bold">45</p>
              <p className="text-xs text-muted-foreground">35% de taxa de qualificação</p>
            </div>
            <div className="rounded-xl bg-card p-6 shadow">
              <h3 className="text-sm font-medium text-muted-foreground">Oportunidades</h3>
              <p className="mt-2 text-3xl font-bold">28</p>
              <p className="text-xs text-muted-foreground">62% de taxa de conversão</p>
            </div>
            <div className="rounded-xl bg-card p-6 shadow">
              <h3 className="text-sm font-medium text-muted-foreground">Vendas Fechadas</h3>
              <p className="mt-2 text-3xl font-bold">12</p>
              <p className="text-xs text-muted-foreground">R$ 156.000 em receita</p>
            </div>
          </div>

          {/* Gráficos e Tabelas */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="min-h-[400px] rounded-xl bg-card p-6 shadow">
              <h3 className="text-lg font-semibold">Funil de Vendas</h3>
              <div className="mt-4 h-[300px] bg-muted/20">
                {/* Aqui irá o gráfico de funil */}
              </div>
            </div>
            <div className="min-h-[400px] rounded-xl bg-card p-6 shadow">
              <h3 className="text-lg font-semibold">Leads Recentes</h3>
              <div className="mt-4">
                <div className="space-y-4">
                  {Array.from({length: 5}).map((_, i) => (
                    <div key={i} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <p className="font-medium">Lead #{i + 1}</p>
                        <p className="text-sm text-muted-foreground">Empresa ABC</p>
                      </div>
                      <span className="rounded-full bg-muted px-2 py-1 text-xs">Novo</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
