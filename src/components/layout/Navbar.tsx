"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { ShieldCheck, LogOut, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export function Navbar() {
  const { user, userProfile, logout } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await logout();
      router.push("/");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "student":
        return "bg-brand-paper border-brand-navy/20 text-brand-navy";
      case "company":
        return "bg-brand-teal/10 border-brand-teal/30 text-brand-teal";
      case "academician":
        return "bg-brand-gold/15 border-brand-gold/30 text-[#8f6a00]";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-brand-navy/10 bg-brand-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand Link */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-navy text-brand-gold shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="font-serif text-lg font-bold tracking-tight text-brand-navy">
              SkillSwipe
            </span>
            <span className="hidden text-[10px] font-medium uppercase tracking-widest text-brand-slate sm:inline-block ml-2 border-l border-brand-navy/20 pl-2">
              SIH 206644
            </span>
          </div>
        </Link>

        {/* User Navigation / Auth Controls */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              {userProfile?.role && (
                <span
                  id="navbar-role-badge"
                  className={`hidden sm:inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${getRoleBadge(
                    userProfile.role
                  )}`}
                >
                  {userProfile.role}
                </span>
              )}

              <div className="flex items-center gap-2 text-xs text-brand-slate">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-navy/10 text-brand-navy font-semibold">
                  {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                </div>
                <span className="hidden md:inline font-medium text-brand-navy">
                  {user.displayName || user.email?.split("@")[0]}
                </span>
              </div>

              <Button
                id="signout-button"
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="text-xs text-brand-slate hover:text-brand-brick hover:border-brand-brick/40"
              >
                <LogOut className="h-3.5 w-3.5 mr-1" />
                <span>Sign Out</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button id="nav-login-button" variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button id="nav-signup-button" variant="primary" size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
