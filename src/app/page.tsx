"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const { user, userProfile } = useAuth();

  const getDestinationLink = () => {
    if (!user) return "/signup";
    if (!userProfile?.role) return "/role-select";
    if (userProfile.role === "student") return "/dashboard/student";
    if (userProfile.role === "company") return "/dashboard/company";
    return "/academician";
  };

  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 py-12 text-center">
      {/* Subtle academic seal / badge */}
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-navy/15 bg-white/80 px-4 py-1.5 text-xs font-medium text-brand-navy shadow-sm backdrop-blur-sm">
        <ShieldCheck className="h-4 w-4 text-brand-teal" />
        <span>SIH 206644 • Academia–Industry Collaboration Portal</span>
      </div>

      {/* Hero Title with Humanist Serif */}
      <h1 className="max-w-3xl font-serif text-4xl font-bold tracking-tight text-brand-navy sm:text-6xl">
        SkillSwipe
      </h1>

      {/* Subtitle */}
      <p className="mt-4 max-w-xl text-base text-brand-slate sm:text-lg">
        Mutual-consent matching connecting students, industry recruiters, and academicians — without the cold application noise.
      </p>

      {/* Call to Action */}
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link href={getDestinationLink()}>
          <Button id="hero-get-started-btn" size="lg" className="px-8 shadow-md">
            <span>{user ? "Go to Dashboard" : "Get Started"}</span>
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
        {!user && (
          <Link href="/login">
            <Button id="hero-sign-in-btn" variant="outline" size="lg" className="px-6">
              Sign In
            </Button>
          </Link>
        )}
      </div>

      {/* Infrastructure Status Banner */}
      <div className="mt-16 rounded-lg border border-dashed border-brand-navy/20 bg-white/50 px-5 py-3 text-xs text-brand-slate">
        <span className="font-semibold text-brand-navy">Onboarding Modules:</span> Student & Company Wizards Active • Firestore Collections Synced
      </div>
    </main>
  );
}
