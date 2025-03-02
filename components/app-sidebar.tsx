"use client"

import * as React from "react"
import {
  Building2,
  Users,
  PieChart,
  Settings2,
  LayoutDashboard,
  FolderKanban,
  UserCircle,
  Building,
  Target,
  LineChart,
  BadgeDollarSign
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "Pedro Reis",
    email: "pedro@example.com",
    avatar: "/avatars/user.png",
  },
  teams: [
    {
      name: "Gaia CRM",
      logo: Building,
      plan: "Pro",
    }
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Empresas",
      url: "/empresas",
      icon: Building2,
      items: [
        {
          title: "Lista de Empresas",
          url: "/empresas",
        },
        {
          title: "Nova Empresa",
          url: "/empresas/nova",
        },
        {
          title: "Categorias",
          url: "/empresas/categorias",
        },
      ],
    },
    {
      title: "Leads",
      url: "/leads",
      icon: Users,
      items: [
        {
          title: "Todos os Leads",
          url: "/leads",
        },
        {
          title: "Novo Lead",
          url: "/leads/novo",
        },
        {
          title: "Qualificação",
          url: "/leads/qualificacao",
        },
      ],
    },
    {
      title: "Pipeline",
      url: "/pipeline",
      icon: FolderKanban,
      items: [
        {
          title: "Funil de Vendas",
          url: "/pipeline",
        },
        {
          title: "Oportunidades",
          url: "/pipeline/oportunidades",
        },
        {
          title: "Configurar Etapas",
          url: "/pipeline/etapas",
        },
      ],
    },
    {
      title: "Relatórios",
      url: "/relatorios",
      icon: PieChart,
      items: [
        {
          title: "Visão Geral",
          url: "/relatorios",
        },
        {
          title: "Vendas",
          url: "/relatorios/vendas",
        },
        {
          title: "Conversão",
          url: "/relatorios/conversao",
        },
        {
          title: "Performance",
          url: "/relatorios/performance",
        },
      ],
    },
    {
      title: "Configurações",
      url: "/configuracoes",
      icon: Settings2,
      items: [
        {
          title: "Geral",
          url: "/configuracoes",
        },
        {
          title: "Usuários",
          url: "/configuracoes/usuarios",
        },
        {
          title: "Integrações",
          url: "/configuracoes/integracoes",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Metas do Mês",
      url: "/metas",
      icon: Target,
    },
    {
      name: "Performance",
      url: "/performance",
      icon: LineChart,
    },
    {
      name: "Receita",
      url: "/receita",
      icon: BadgeDollarSign,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
