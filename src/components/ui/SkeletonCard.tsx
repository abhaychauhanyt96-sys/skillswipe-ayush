import React from "react";

export function SkeletonBox({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-black/10 dark:bg-white/10 ${className}`}
    />
  );
}

/**
 * Academic credential card skeleton for Discover screen loading
 */
export function DiscoverCardSkeleton() {
  return (
    <div className="relative mx-auto flex h-[500px] w-full max-w-[380px] flex-col justify-between rounded-xl border-2 border-[#101830]/30 bg-[#F7F5EF] p-6 shadow-xl overflow-hidden">
      {/* Top gold accent line */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#D4A017]/60" />

      {/* Header section */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <SkeletonBox className="h-12 w-12 rounded-lg bg-[#101830]/15" />
            <div className="space-y-2">
              <SkeletonBox className="h-4 w-32 bg-[#101830]/20" />
              <SkeletonBox className="h-3 w-24 bg-[#101830]/15" />
            </div>
          </div>
          <SkeletonBox className="h-6 w-16 rounded-full bg-[#D4A017]/25" />
        </div>

        {/* Role title & stipend skeleton */}
        <div className="mt-6 space-y-2">
          <SkeletonBox className="h-5 w-48 bg-[#101830]/25" />
          <SkeletonBox className="h-4 w-28 bg-[#1F6F5C]/20" />
        </div>

        {/* Description lines */}
        <div className="mt-4 space-y-2">
          <SkeletonBox className="h-3 w-full bg-[#101830]/10" />
          <SkeletonBox className="h-3 w-5/6 bg-[#101830]/10" />
          <SkeletonBox className="h-3 w-4/6 bg-[#101830]/10" />
        </div>

        {/* Skill chips skeleton */}
        <div className="mt-6">
          <SkeletonBox className="h-3 w-20 mb-2 bg-[#101830]/15" />
          <div className="flex flex-wrap gap-1.5">
            <SkeletonBox className="h-6 w-16 rounded bg-[#101830]/15" />
            <SkeletonBox className="h-6 w-20 rounded bg-[#101830]/15" />
            <SkeletonBox className="h-6 w-14 rounded bg-[#101830]/15" />
            <SkeletonBox className="h-6 w-18 rounded bg-[#101830]/15" />
          </div>
        </div>
      </div>

      {/* Footer seal skeleton */}
      <div className="border-t border-[#101830]/15 pt-4 flex items-center justify-between">
        <SkeletonBox className="h-3 w-28 bg-[#101830]/15" />
        <SkeletonBox className="h-7 w-7 rounded-full bg-[#D4A017]/30" />
      </div>
    </div>
  );
}

/**
 * Matches list skeleton loader
 */
export function MatchesListSkeleton() {
  return (
    <div className="mt-6 space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-xl border-2 border-[#101830]/20 bg-[#F7F5EF] p-5 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <SkeletonBox className="h-12 w-12 rounded-lg bg-[#101830]/15 shrink-0" />
              <div className="space-y-2">
                <SkeletonBox className="h-5 w-40 bg-[#101830]/20" />
                <SkeletonBox className="h-3 w-32 bg-[#101830]/15" />
                <SkeletonBox className="h-3 w-24 bg-[#101830]/10" />
              </div>
            </div>
            <div className="flex sm:flex-col sm:items-end gap-2">
              <SkeletonBox className="h-7 w-28 rounded-md bg-[#101830]/15" />
              <SkeletonBox className="h-8 w-36 rounded-md bg-[#101830]/20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Dashboard stats skeleton loader
 */
export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-lg border border-brand-navy/10 bg-brand-paper/50 p-4 space-y-2"
        >
          <SkeletonBox className="h-3 w-20 bg-brand-navy/15" />
          <SkeletonBox className="h-7 w-12 bg-brand-navy/25" />
          <SkeletonBox className="h-3 w-24 bg-brand-navy/10" />
        </div>
      ))}
    </div>
  );
}
