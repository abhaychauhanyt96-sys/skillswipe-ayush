import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { ChatAssistantModal } from "@/components/chat/ChatAssistantModal";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SkillSwipe — Mutual-Consent Talent & Industry Portal",
  description: "Unified mutual-matching platform connecting students, industries, and academicians for internships, research, and hiring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable}`}>
      <body className="min-h-screen bg-brand-paper text-brand-navy antialiased font-sans">
        <AuthProvider>
          <Navbar />
          {children}
          <ChatAssistantModal />
        </AuthProvider>
      </body>
    </html>
  );
}
