import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Debug - Gaia CRM",
  description: "Página de debug para o Gaia CRM",
};

export default function DebugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 