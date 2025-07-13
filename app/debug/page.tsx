"use client";

import FixTeamCreationComponent from "./fix-team-creation";
import FixMiddlewareComponent from "./fix-middleware";
import CheckTablesComponent from "./check-tables";
import ExecuteSQLComponent from "./execute-sql";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Componente para desativar o redirecionamento do contexto de time
function DisableTeamRedirect() {
  // Definir flag de debug no localStorage ao montar o componente
  if (typeof window !== 'undefined') {
    localStorage.setItem("debug_mode", "true");
  }
  return null;
}

export default function DebugPage() {
  return (
    <div className="container mx-auto py-10">
      <DisableTeamRedirect />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Página de Debug</h1>
        <div className="space-x-2">
          <Button variant="outline" asChild>
            <Link href="/login-debug">Login Debug</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Voltar para o App</Link>
          </Button>
        </div>
      </div>
      
      <div className="grid gap-6">
        <FixMiddlewareComponent />
        <FixTeamCreationComponent />
        <CheckTablesComponent />
        <ExecuteSQLComponent />
      </div>
    </div>
  );
} 