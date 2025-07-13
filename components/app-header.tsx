"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";
import { Menu, User, LogOut, Settings, Building2 } from "lucide-react";
import { ModeToggle } from "./mode-toggle";
import { TeamSelector } from "./team-selector";

export function AppHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  async function handleLogout() {
    try {
      console.log("Iniciando logout a partir do cabeçalho...");
      await logout();
      // O redirecionamento será feito pelo contexto de autenticação
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  }

  return (
    <header className="border-b bg-background">
      <div className="flex h-16 items-center px-4 md:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
        
        {/* Logo e nome do app */}
        <div className="flex items-center">
          <Link href="/dashboard" className="flex items-center">
            <Building2 className="h-6 w-6 mr-2" />
            <span className="font-bold text-lg">Gaia CRM</span>
          </Link>
        </div>
        
        {/* Seletor de times */}
        <div className="ml-6 hidden md:block">
          <TeamSelector />
        </div>
        
        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <User className="h-5 w-5" />
                <span className="sr-only">Perfil</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                {user?.user_metadata?.name || user?.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/perfil">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Seletor de times para mobile */}
      {isMobileMenuOpen && (
        <div className="p-4 border-t md:hidden">
          <TeamSelector />
        </div>
      )}
    </header>
  );
} 