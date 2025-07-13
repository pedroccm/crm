import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login Debug - Gaia CRM",
  description: "Login para acesso à página de debug",
};

export default function DebugLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 