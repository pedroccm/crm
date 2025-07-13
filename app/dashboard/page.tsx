"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { Loader2, Users, Building2, Calendar } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { supabase } from "@/lib/supabase";
import { getAllActivities } from "@/lib/supabase";

export default function DashboardPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [leadCount, setLeadCount] = useState(0);
  const [leadCountLastMonth, setLeadCountLastMonth] = useState(0);
  const [companyCount, setCompanyCount] = useState(0);
  const [companyCountLastMonth, setCompanyCountLastMonth] = useState(0);
  const [pendingActivitiesCount, setPendingActivitiesCount] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        
        // Obter contagem total de leads
        const { count: totalLeads, error: leadsError } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true });
        
        if (leadsError) throw leadsError;
        setLeadCount(totalLeads || 0);
        
        // Obter contagem de leads criados nos últimos 30 dias
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { count: recentLeads, error: recentLeadsError } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString());
        
        if (recentLeadsError) throw recentLeadsError;
        setLeadCountLastMonth(recentLeads || 0);
        
        // Obter contagem total de empresas
        const { count: totalCompanies, error: companiesError } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true });
        
        if (companiesError) throw companiesError;
        setCompanyCount(totalCompanies || 0);
        
        // Obter contagem de empresas criadas nos últimos 30 dias
        const { count: recentCompanies, error: recentCompaniesError } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString());
        
        if (recentCompaniesError) throw recentCompaniesError;
        setCompanyCountLastMonth(recentCompanies || 0);
        
        // Obter atividades pendentes para os próximos 7 dias
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        const pendingActivities = await getAllActivities(false);
        const nextWeekActivities = pendingActivities.filter(activity => {
          const activityDate = new Date(activity.scheduled_date);
          return activityDate >= today && activityDate <= nextWeek;
        });
        
        setPendingActivitiesCount(nextWeekActivities.length);
        
      } catch (error) {
        console.error("Erro ao carregar dados do dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, []);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-4 md:p-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo, {user?.user_metadata?.name || user?.email || "Usuário"}!
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total de Leads
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{leadCount}</div>
                  <p className="text-xs text-muted-foreground">
                    +{leadCountLastMonth} nos últimos 30 dias
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Empresas
                  </CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{companyCount}</div>
                  <p className="text-xs text-muted-foreground">
                    +{companyCountLastMonth} nos últimos 30 dias
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Atividades Pendentes
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingActivitiesCount}</div>
                  <p className="text-xs text-muted-foreground">
                    Para os próximos 7 dias
                  </p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="w-auto">
                <TabsTrigger value="overview" className="px-3 py-1.5 text-sm">Visão Geral</TabsTrigger>
                <TabsTrigger value="analytics" className="px-3 py-1.5 text-sm">Análises</TabsTrigger>
                <TabsTrigger value="reports" className="px-3 py-1.5 text-sm">Relatórios</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Resumo do Sistema</CardTitle>
                    <CardDescription>
                      Visão geral do seu CRM
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pl-2">
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <div className="font-medium">Atividades recentes</div>
                        <ul className="list-disc pl-5 space-y-2 text-sm">
                          <li>{leadCountLastMonth} novos leads adicionados</li>
                          <li>{companyCountLastMonth} novas empresas cadastradas</li>
                          <li>{pendingActivitiesCount} atividades pendentes para os próximos dias</li>
                        </ul>
                      </div>
                      <div className="grid gap-2">
                        <div className="font-medium">Próximos passos</div>
                        <ul className="list-disc pl-5 space-y-2 text-sm">
                          <li>Acompanhar leads em negociação</li>
                          <li>Atualizar informações de empresas</li>
                          <li>Completar atividades pendentes</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="analytics" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Análises</CardTitle>
                    <CardDescription>
                      Dados analíticos do seu CRM
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px] flex items-center justify-center border rounded-md">
                      <p className="text-muted-foreground">Gráficos e análises serão exibidos aqui</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="reports" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Relatórios</CardTitle>
                    <CardDescription>
                      Relatórios detalhados do seu CRM
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px] flex items-center justify-center border rounded-md">
                      <p className="text-muted-foreground">Relatórios serão exibidos aqui</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppLayout>
  );
}
