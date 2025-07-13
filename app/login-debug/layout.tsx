import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login Debug | Gaia CRM",
  description: "Página de diagnóstico de login para o Gaia CRM",
};

export default function LoginDebugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
} 