"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { loginUser, logoutUser, registerUser, resetPassword, updatePassword, getCurrentUser, UserCredentials, UserRegistration } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: UserCredentials, redirectPath?: string) => Promise<void>;
  register: (userData: UserRegistration, redirectPath?: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      try {
        setLoading(true);
        console.log("Carregando usuário no contexto de autenticação...");
        const { user: currentUser } = await getCurrentUser();
        console.log("Usuário carregado:", currentUser?.id || "nenhum");
        setUser(currentUser);
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
    
    // Configurar um listener para mudanças na autenticação
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Evento de autenticação detectado:", event);
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          console.log("Usuário autenticado, atualizando estado...");
          const { user: currentUser } = await getCurrentUser();
          setUser(currentUser);
        } else if (event === "SIGNED_OUT") {
          console.log("Usuário desconectado, limpando estado...");
          setUser(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function login(credentials: UserCredentials, redirectPath = "/dashboard") {
    try {
      setLoading(true);
      console.log("Iniciando processo de login no contexto...");
      
      const { user: loggedUser, session } = await loginUser(credentials);
      console.log("Login realizado com sucesso, dados do usuário:", loggedUser?.id);
      console.log("Sessão obtida:", session?.access_token ? "Sim" : "Não");
      
      setUser(loggedUser);
      toast.success("Login realizado com sucesso!");
      
      // Verificar se o usuário foi definido corretamente
      console.log("Usuário definido no estado:", loggedUser?.id);
      
      // Remover o redirecionamento automático para evitar problemas
      console.log("Login concluído. O usuário deve ser redirecionado manualmente ou pelo useEffect.");
      
      // Definir loading como false para permitir que a página de login detecte a mudança
      setLoading(false);
      
    } catch (error: any) {
      console.error("Erro no login:", error);
      
      // Traduzir mensagens de erro comuns
      let errorMessage = error.message || "Credenciais inválidas";
      if (errorMessage === "Invalid login credentials") {
        errorMessage = "Credenciais de login inválidas";
      } else if (errorMessage.includes("credentials")) {
        errorMessage = errorMessage.replace("credentials", "credenciais");
      }
      
      toast.error(`Erro ao fazer login: ${errorMessage}`);
      setLoading(false);
      throw error;
    }
  }

  async function register(userData: UserRegistration, redirectPath = "/dashboard") {
    try {
      setLoading(true);
      const { user: newUser } = await registerUser(userData);
      setUser(newUser);
      toast.success("Registro realizado com sucesso!");
      
      // Usar redirecionamento direto com window.location
      console.log("Redirecionando para:", redirectPath);
      setTimeout(() => {
        window.location.href = redirectPath;
      }, 1000);
      
    } catch (error: any) {
      console.error("Erro no registro:", error);
      toast.error(`Erro ao registrar: ${error.message || "Falha no registro"}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      setLoading(true);
      console.log("Iniciando processo de logout...");
      
      // Limpar o estado do usuário antes de fazer o logout no Supabase
      setUser(null);
      
      // Fazer logout no Supabase
      await logoutUser();
      
      console.log("Logout realizado com sucesso no Supabase");
      toast.success("Logout realizado com sucesso!");
      
      // Redirecionar para a página de login usando window.location para garantir um redirecionamento completo
      console.log("Redirecionando para a página de login...");
      window.location.href = "/login";
      
    } catch (error: any) {
      console.error("Erro no logout:", error);
      toast.error(`Erro ao fazer logout: ${error.message || "Falha no logout"}`);
      
      // Mesmo com erro, tentar redirecionar para a página de login
      window.location.href = "/login";
    } finally {
      setLoading(false);
    }
  }

  async function forgotPassword(email: string) {
    try {
      setLoading(true);
      await resetPassword(email);
      toast.success("Email de recuperação enviado com sucesso!");
      
      // Usar redirecionamento direto com window.location
      setTimeout(() => {
        window.location.href = "/login";
      }, 1000);
      
    } catch (error: any) {
      console.error("Erro na recuperação de senha:", error);
      toast.error(`Erro ao recuperar senha: ${error.message || "Falha na recuperação"}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function changePassword(newPassword: string) {
    try {
      setLoading(true);
      await updatePassword(newPassword);
      toast.success("Senha atualizada com sucesso!");
      
      // Usar redirecionamento direto com window.location
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
      
    } catch (error: any) {
      console.error("Erro na alteração de senha:", error);
      toast.error(`Erro ao alterar senha: ${error.message || "Falha na alteração"}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    forgotPassword,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
} 