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
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useRouter } from "next/navigation"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  Settings, 
  MessageSquare, 
  Plug, 
  Building2, 
  Bell, 
  Shield, 
  Database 
} from "lucide-react"

export default function ConfiguracoesPage() {
  const router = useRouter()

  const configItems = [
    {
      title: "Time",
      description: "Gerencie seu time e convite novos membros",
      icon: Users,
      href: "/configuracoes/time"
    },
    {
      title: "Evolution API",
      description: "Configure a integração com a Evolution API",
      icon: MessageSquare,
      href: "/configuracoes/evolution-api"
    },
    {
      title: "Integrações",
      description: "Conecte com outras ferramentas e serviços",
      icon: Plug,
      href: "/configuracoes/integracoes"
    },
    {
      title: "Campos de Leads",
      description: "Configure campos personalizados para leads",
      icon: Database,
      href: "/configuracoes/campos/leads"
    },
    {
      title: "Campos de Empresas",
      description: "Configure campos personalizados para empresas",
      icon: Building2,
      href: "/configuracoes/campos/empresas"
    },
    {
      title: "Notificações",
      description: "Configure suas preferências de notificação",
      icon: Bell,
      href: "/configuracoes/notificacoes"
    },
    {
      title: "Segurança",
      description: "Configure opções de segurança e autenticação",
      icon: Shield,
      href: "/configuracoes/seguranca"
    },
    {
      title: "Dados",
      description: "Gerencie seus dados e exportações",
      icon: Database,
      href: "/configuracoes/dados"
    },
    {
      title: "Geral",
      description: "Configure opções gerais do sistema",
      icon: Settings,
      href: "/configuracoes/geral"
    }
  ]

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
                  <BreadcrumbPage>Configurações</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">Configurações</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie as configurações do sistema
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {configItems.map((item, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <item.icon className="h-5 w-5 text-primary" />
                    <CardTitle>{item.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{item.description}</CardDescription>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push(item.href)}
                  >
                    Configurar
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 