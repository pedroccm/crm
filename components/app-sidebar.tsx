"use client"

import * as React from "react"
import {
  Building2,
  Users,
  PieChart,
  Settings2,
  LayoutDashboard,
  FolderKanban,
  Building,
  Activity,
  Calendar,
  Wrench,
  UserCog,
  MessageSquare,
  UsersRound,
  FileText
} from "lucide-react"
import Link from "next/link"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent
} from "@/components/ui/accordion"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuth } from "@/lib/auth-context"
import { useTeam } from "@/lib/team-context"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const { currentTeam, isSuperAdmin } = useTeam();
  const [pipelines, setPipelines] = useState<{id: string, name: string}[]>([]);
  
  // Carregar pipelines do time atual
  useEffect(() => {
    if (currentTeam?.id) {
      loadPipelines();
    } else {
      setPipelines([]);
    }
  }, [currentTeam]);
  
  async function loadPipelines() {
    try {
      const { data, error } = await supabase
        .from('pipelines')
        .select('id, name')
        .eq('team_id', currentTeam?.id)
        .not('team_id', 'is', null)
        .order('name');
        
      if (error) throw error;
      setPipelines(data || []);
    } catch (error) {
      console.error('Erro ao carregar pipelines para o menu:', error);
    }
  }
  
  // Criar itens de pipeline dinamicamente
  const pipelineItems = [
    ...pipelines.map(pipeline => ({
      title: pipeline.name,
      url: `/pipeline?id=${pipeline.id}`,
    })),
    {
      title: "Gerenciar Etapas",
      url: "/pipeline/etapas",
    },
    {
      title: "Novo Pipeline",
      url: "/pipeline/novo",
    }
  ];
  
  const navMainItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: false,
    },
    {
      title: "Empresas",
      url: "/empresas",
      icon: Building2,
      isActive: false,
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
      isActive: false,
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
      isActive: false,
      items: pipelineItems,
    },
    {
      title: "Atividades",
      url: "/atividades",
      icon: Calendar,
      isActive: false,
      items: [
        {
          title: "Agenda",
          url: "/atividades",
        },
        {
          title: "Nova Atividade",
          url: "/atividades/nova",
        },
        {
          title: "Concluídas",
          url: "/atividades/concluidas",
        },
      ],
    },
    {
      title: "Chat",
      url: "/chat",
      icon: MessageSquare,
      isActive: false,
      items: [
        {
          title: "Conversas",
          url: "/chat",
        },
        {
          title: "Configurações",
          url: "/chat/configuracoes",
        },
      ],
    },
    {
      title: "Chat Evo",
      url: "/chat-evo",
      icon: MessageSquare,
      isActive: false,
      items: [
        {
          title: "Conversas",
          url: "/chat-evo",
        },
        {
          title: "Nova Conversa",
          url: "/chat-evo/novo",
        },
        {
          title: "Configurações",
          url: "/chat-evo/configuracoes",
        },
      ],
    },
    {
      title: "Usuários",
      url: "/usuarios",
      icon: UserCog,
      isActive: false,
      items: [
        {
          title: "Lista de Usuários",
          url: "/usuarios",
        },
        {
          title: "Novo Usuário",
          url: "/usuarios/novo",
        },
      ],
    },
    {
      title: "Relatórios",
      url: "/relatorios",
      icon: PieChart,
      isActive: false,
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
      isActive: false,
      items: [
        {
          title: "Perfil",
          url: "/perfil",
        },
        {
          title: "Time",
          url: "/configuracoes/time",
        },
        {
          title: "Campos de Leads",
          url: "/configuracoes/campos/leads",
        },
        {
          title: "Campos de Empresas",
          url: "/configuracoes/campos/empresas",
        },
        {
          title: "Labels",
          url: "/configuracoes/labels",
        },
        {
          title: "Integrações",
          url: "/configuracoes/integracoes",
        },
        {
          title: "Evolution API",
          url: "/configuracoes/evolution-api",
        },
        {
          title: "Templates de Mensagens",
          url: "/configuracoes/templates",
        },
      ],
    },
  ];

  const data = {
    user: {
      name: user?.user_metadata?.name || user?.email || "Usuário",
      email: user?.email || "",
      avatar: "/avatars/user.svg",
    },
    navMain: navMainItems,
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center p-2">
          <Building className="h-6 w-6 mr-2" />
          <div className="flex flex-col">
            <span className="font-semibold text-sm">
              {currentTeam?.name || "Selecione um time"}
            </span>
            <span className="text-xs text-muted-foreground">
              {currentTeam?.slug ? `@${currentTeam.slug}` : "Nenhum time selecionado"}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <Accordion type="single" collapsible>
          {isSuperAdmin && (
            <AccordionItem value="admin">
              <AccordionTrigger className="flex items-center gap-2 p-2 hover:bg-muted">
                <UsersRound className="h-4 w-4" />
                <span className="text-sm">Administração</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-1 pl-6">
                  <Link
                    href="/admin/times"
                    className="flex items-center gap-2 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Building2 className="h-4 w-4" />
                    <span className="text-sm">Gerenciar Times</span>
                  </Link>
                  <Link
                    href="/admin/usuarios"
                    className="flex items-center gap-2 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Users className="h-4 w-4" />
                    <span className="text-sm">Gerenciar Usuários</span>
                  </Link>
                  <Link
                    href="/admin/configuracoes"
                    className="flex items-center gap-2 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Settings2 className="h-4 w-4" />
                    <span className="text-sm">Configurações Globais</span>
                  </Link>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
          <AccordionItem value="diagnostico">
            <AccordionTrigger className="flex items-center gap-2 p-2 hover:bg-muted">
              <Activity className="h-4 w-4" />
              <span className="text-sm">Diagnóstico</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-1 pl-6">
                <Link
                  href="/diagnostico"
                  className="flex items-center gap-2 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Wrench className="h-4 w-4" />
                  <span className="text-sm">Verificar Sistema</span>
                </Link>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
