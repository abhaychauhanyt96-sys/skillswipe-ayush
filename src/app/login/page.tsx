"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { ShieldCheck, AlertCircle, ArrowRight } from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { loginWithEmail, loginWithGoogle, user, userProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl");

  // Route authenticated users
  const handleRedirect = (role?: string) => {
    if (returnUrl) {
      router.push(returnUrl);
      return;
    }
    if (!role) {
      router.push("/role-select");
    } else if (role === "student") {
      router.push("/onboarding/student");
    } else if (role === "company") {
      router.push("/onboarding/company");
    } else if (role === "academician") {
      router.push("/academician");
    }
  };

  React.useEffect(() => {
    if (user && userProfile) {
      handleRedirect(userProfile.role);
    }
  }, [user, userProfile]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await loginWithEmail(email, password);
      // Auth state listener handles redirect once profile is fetched
    } catch (err: any) {
      console.error("Login error:", err);
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        setError("Invalid email or password. Please check your credentials.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please reset your password or try again later.");
      } else {
        setError(err.message || "Failed to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const { isNewUser } = await loginWithGoogle();
      if (isNewUser) {
        router.push("/role-select");
      }
    } catch (err: any) {
      console.error("Google sign in error:", err);
      if (err.code !== "auth/popup-closed-by-user") {
        setError(err.message || "Failed to authenticate with Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-xl border border-brand-navy/15 bg-white p-8 shadow-sm">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-brand-navy text-brand-gold shadow-sm">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="mt-4 font-serif text-2xl font-bold tracking-tight text-brand-navy">
          Welcome back
        </h1>
        <p className="mt-1 text-xs text-brand-slate">
          Sign in to your SkillSwipe account
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          id="login-error-banner"
          className="mt-5 flex items-start gap-2 rounded-md border border-brand-brick/30 bg-brand-brick/10 p-3 text-xs text-brand-brick"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleEmailLogin} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="login-email"
            className="block text-xs font-semibold uppercase tracking-wider text-brand-slate"
          >
            Email Address
          </label>
          <input
            id="login-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@institution.edu or company.com"
            className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2.5 text-sm text-brand-navy placeholder:text-brand-slate/50 focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy"
          />
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="block text-xs font-semibold uppercase tracking-wider text-brand-slate"
          >
            Password
          </label>
          <input
            id="login-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2.5 text-sm text-brand-navy placeholder:text-brand-slate/50 focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy"
          />
        </div>

        <Button
          id="login-submit-btn"
          type="submit"
          disabled={loading}
          className="w-full mt-2"
        >
          {loading ? "Signing in..." : "Sign In"}
          {!loading && <ArrowRight className="h-4 w-4 ml-1" />}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative my-6 text-center text-xs">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-brand-navy/15" />
        </div>
        <span className="relative bg-white px-3 font-medium uppercase tracking-wider text-brand-slate/70">
          or continue with
        </span>
      </div>

      {/* Google Sign-in */}
      <Button
        id="google-login-btn"
        type="button"
        variant="outline"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full bg-white border-brand-navy/20 hover:bg-brand-paper/50 text-brand-navy font-normal"
      >
        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        Google Account
      </Button>

      {/* Link to signup */}
      <p className="mt-6 text-center text-xs text-brand-slate">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-semibold text-brand-navy underline underline-offset-2 hover:text-brand-gold"
        >
          Create Account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Suspense fallback={<div className="text-xs text-brand-slate">Loading sign-in...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
