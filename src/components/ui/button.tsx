import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-md";

  const variants = {
    primary:
      "bg-brand-gold text-brand-navy font-semibold hover:bg-[#c49214] focus:ring-brand-gold shadow-sm active:scale-[0.98]",
    secondary:
      "bg-brand-navy text-brand-paper hover:bg-[#182344] focus:ring-brand-navy shadow-sm active:scale-[0.98]",
    outline:
      "border border-brand-navy/30 text-brand-navy hover:bg-brand-navy/5 focus:ring-brand-navy",
    ghost:
      "text-brand-slate hover:text-brand-navy hover:bg-brand-navy/5 focus:ring-brand-navy",
    destructive:
      "bg-rose-600 text-white font-semibold hover:bg-rose-700 focus:ring-rose-500 shadow-sm active:scale-[0.98]",
  };

  const sizes = {
    sm: "text-xs px-3 py-1.5 gap-1.5",
    md: "text-sm px-4 py-2.5 gap-2",
    lg: "text-base px-6 py-3.5 gap-2.5",
  };

  return (
    <button
      className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
      {...props}
    >
      {children}
    </button>
  );
}
