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
  MessageSquare, 
  Mail, 
  CreditCard, 
  FileText, 
  Calendar, 
  Phone 
} from "lucide-react"

export default function IntegracoesPage() {
  const router = useRouter()

  const integrationItems = [
    {
      title: "Evolution API",
      description: "Integre com o WhatsApp através da Evolution API",
      icon: MessageSquare,
      href: "/configuracoes/evolution-api",
      status: "Disponível"
    },
    {
      title: "Email Marketing",
      description: "Integre com serviços de email marketing",
      icon: Mail,
      href: "/configuracoes/integracoes/email",
      status: "Em breve"
    },
    {
      title: "Pagamentos",
      description: "Integre com gateways de pagamento",
      icon: CreditCard,
      href: "/configuracoes/integracoes/pagamentos",
      status: "Em breve"
    },
    {
      title: "Documentos",
      description: "Integre com serviços de assinatura de documentos",
      icon: FileText,
      href: "/configuracoes/integracoes/documentos",
      status: "Em breve"
    },
    {
      title: "Calendário",
      description: "Integre com Google Calendar e outros serviços",
      icon: Calendar,
      href: "/configuracoes/integracoes/calendario",
      status: "Em breve"
    },
    {
      title: "Telefonia",
      description: "Integre com serviços de telefonia",
      icon: Phone,
      href: "/configuracoes/integracoes/telefonia",
      status: "Em breve"
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
                  <BreadcrumbLink href="/configuracoes">Configurações</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Integrações</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">Integrações</h1>
              <p className="text-sm text-muted-foreground">
                Configure integrações com serviços externos
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrationItems.map((item, index) => (
              <Card key={index} className={`hover:shadow-md transition-shadow ${item.status === 'Em breve' ? 'opacity-60' : ''}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <item.icon className="h-5 w-5 text-primary" />
                      <CardTitle>{item.title}</CardTitle>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${item.status === 'Disponível' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {item.status}
                    </span>
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
                    disabled={item.status === 'Em breve'}
                  >
                    {item.status === 'Disponível' ? 'Configurar' : 'Em breve'}
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