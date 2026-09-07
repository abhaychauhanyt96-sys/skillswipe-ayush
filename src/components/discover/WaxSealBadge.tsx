import React from "react";

interface WaxSealBadgeProps {
  className?: string;
  size?: number | "xs" | "sm" | "md" | "lg";
  label?: string;
}

export function WaxSealBadge({ className = "", size = 28, label }: WaxSealBadgeProps) {
  const pixelSize =
    typeof size === "number"
      ? size
      : size === "xs"
      ? 14
      : size === "sm"
      ? 18
      : size === "md"
      ? 24
      : size === "lg"
      ? 32
      : 28;

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      title={label ? `Verified Skill: ${label}` : "Official Verified Credential Seal"}
    >
      <svg
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-xs"
      >
        {/* Scalloped Wax Edge */}
        <path
          d="M18 2C19.8 2 21.2 3.1 22.8 3.7C24.4 4.3 26.2 4.4 27.5 5.5C28.8 6.6 29.3 8.3 30.3 9.7C31.3 11.1 32.7 12.2 33.2 13.8C33.7 15.4 33.2 17.2 33.2 18.9C33.2 20.6 33.7 22.4 33.2 24C32.7 25.6 31.3 26.7 30.3 28.1C29.3 29.5 28.8 31.2 27.5 32.3C26.2 33.4 24.4 33.5 22.8 34.1C21.2 34.7 19.8 35.8 18 35.8C16.2 35.8 14.8 34.7 13.2 34.1C11.6 33.5 9.8 33.4 8.5 32.3C7.2 31.2 6.7 29.5 5.7 28.1C4.7 26.7 3.3 25.6 2.8 24C2.3 22.4 2.8 20.6 2.8 18.9C2.8 17.2 2.3 15.4 2.8 13.8C3.3 12.2 4.7 11.1 5.7 9.7C6.7 8.3 7.2 6.6 8.5 5.5C9.8 4.4 11.6 4.3 13.2 3.7C14.8 3.1 16.2 2 18 2Z"
          fill="#D4A017"
        />
        {/* Inner Stamped Rim */}
        <circle cx="18" cy="18.9" r="11" stroke="#9E7307" strokeWidth="1.2" fill="#E5B22B" />
        <circle cx="18" cy="18.9" r="9" stroke="#9E7307" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
        {/* Center Star / Seal Insignia */}
        <path
          d="M18 12.5L19.5 16.2L23.5 16.5L20.5 19.2L21.4 23.2L18 21.1L14.6 23.2L15.5 19.2L12.5 16.5L16.5 16.2L18 12.5Z"
          fill="#7A5800"
        />
      </svg>
      {label && <span className="font-mono text-xs font-semibold text-brand-navy">{label}</span>}
    </span>
  );
}
