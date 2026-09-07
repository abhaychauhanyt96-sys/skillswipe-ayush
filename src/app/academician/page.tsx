"use client";

import React from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { Award, Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AcademicianRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/academician");
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6 text-center">
      <div className="space-y-3">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-navy text-brand-gold shadow-md">
          <Award className="h-7 w-7" />
        </div>
        <h2 className="font-serif text-xl font-bold text-brand-navy">Entering Academician Portal...</h2>
        <p className="text-xs text-brand-slate">Redirecting to your verified faculty dashboard.</p>
      </div>
    </div>
  );
}
