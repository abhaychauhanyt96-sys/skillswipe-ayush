"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types";
import { ShieldAlert } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Not logged in -> redirect to login with returnUrl
        router.replace(`/login?returnUrl=${encodeURIComponent(pathname)}`);
        return;
      }

      // If user has no role yet and is not already on /role-select
      if (!userProfile?.role && pathname !== "/role-select") {
        router.replace("/role-select");
        return;
      }

      // If specific roles are required and user has a role that isn't allowed
      if (
        allowedRoles &&
        allowedRoles.length > 0 &&
        userProfile?.role &&
        !allowedRoles.includes(userProfile.role)
      ) {
        // Redirect to their respective home
        if (userProfile.role === "student") router.replace("/onboarding/student");
        else if (userProfile.role === "company") router.replace("/onboarding/company");
        else if (userProfile.role === "academician") router.replace("/academician");
      }
    }
  }, [user, userProfile, loading, pathname, router, allowedRoles]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-navy/20 border-t-brand-navy" />
        <p className="mt-4 text-xs font-medium tracking-wide uppercase text-brand-slate">
          Verifying credentials...
        </p>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}
