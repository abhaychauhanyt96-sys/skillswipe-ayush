"use client";

import React, { useEffect, useState } from "react";
import { CareerTrack } from "@/types";
import { db } from "@/lib/firebase/config";
import { collection, getDocs } from "firebase/firestore";
import {
  Compass,
  CheckCircle2,
  Briefcase,
  Building2,
  Sparkles,
  HelpCircle,
  Loader2,
  AlertCircle,
  GraduationCap,
} from "lucide-react";

interface CareerTrackSelectorProps {
  selectedTrackId: string | null | undefined;
  onSelectTrack: (trackId: string | null, trackDetails: CareerTrack | null) => void;
}

export function CareerTrackSelector({
  selectedTrackId,
  onSelectTrack,
}: CareerTrackSelectorProps) {
  const [tracks, setTracks] = useState<CareerTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTracks() {
      try {
        setLoading(true);
        setError(null);
        const colRef = collection(db, "careerTracks");
        const snapshot = await getDocs(colRef);
        const loadedTracks: CareerTrack[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loadedTracks.push({
            id: docSnap.id,
            name: data.name || docSnap.id,
            idealFor: data.idealFor || "",
            targetRoles: data.targetRoles || [],
            exampleEmployers: data.exampleEmployers || [],
          });
        });
        setTracks(loadedTracks);
      } catch (err: any) {
        console.error("Failed to load career tracks:", err);
        setError("Unable to load career tracks from database. Please check your network connection.");
      } finally {
        setLoading(false);
      }
    }

    fetchTracks();
  }, []);

  const isExploringSelected = selectedTrackId === null;

  return (
    <div className="space-y-6">
      <div className="border-b border-brand-navy/10 pb-4">
        <div className="flex items-center gap-2 text-brand-navy">
          <Compass className="h-5 w-5 text-brand-gold" />
          <h2 className="font-serif text-2xl font-bold">
            Which AYUSH career track interests you?
          </h2>
        </div>
        <p className="mt-1 text-xs text-brand-slate">
          Choose a primary trajectory to unlock tailored micro-credentials, targeted role matching, and gap analysis.
        </p>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
          <p className="text-sm font-medium text-brand-slate">Loading career pathways...</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-brand-brick/30 bg-brand-brick/10 p-4 text-xs text-brand-brick">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {!loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {tracks.map((track) => {
            const isSelected = selectedTrackId === track.id;
            return (
              <div
                key={track.id}
                id={`track-card-${track.id}`}
                onClick={() => onSelectTrack(track.id, track)}
                className={`relative flex flex-col justify-between rounded-xl border-2 p-5 text-left transition-all cursor-pointer select-none ${
                  isSelected
                    ? "border-brand-navy bg-white shadow-md ring-2 ring-brand-navy/20"
                    : "border-brand-navy/15 bg-white/70 hover:border-brand-navy/40 hover:bg-white hover:shadow-xs"
                }`}
              >
                {/* Header with Title and Selection Radio */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-serif text-lg font-bold text-brand-navy">
                      {track.name}
                    </h3>
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                        isSelected
                          ? "border-brand-teal bg-brand-teal text-white"
                          : "border-brand-navy/30 bg-white"
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="h-4 w-4" />}
                    </div>
                  </div>

                  {/* Ideal For section */}
                  {track.idealFor && (
                    <div className="mt-2.5 flex items-start gap-1.5 rounded-md bg-brand-paper/80 p-2.5 text-xs text-brand-slate border border-brand-navy/10">
                      <GraduationCap className="h-4 w-4 shrink-0 text-brand-teal mt-0.5" />
                      <span className="leading-snug">{track.idealFor}</span>
                    </div>
                  )}
                </div>

                {/* Footer preview: Roles & Employers */}
                <div className="mt-4 space-y-2.5 border-t border-brand-navy/10 pt-3 text-xs">
                  {track.targetRoles && track.targetRoles.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-slate flex items-center gap-1">
                        <Briefcase className="h-3 w-3 text-brand-gold" />
                        Target Roles Preview
                      </span>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {track.targetRoles.slice(0, 3).map((role) => (
                          <span
                            key={role}
                            className="rounded bg-brand-paper px-2 py-0.5 text-[11px] font-medium text-brand-navy border border-brand-navy/10"
                          >
                            {role}
                          </span>
                        ))}
                        {track.targetRoles.length > 3 && (
                          <span className="text-[10px] text-brand-slate self-center px-1 font-mono">
                            +{track.targetRoles.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {track.exampleEmployers && track.exampleEmployers.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-slate flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-brand-teal" />
                        Key Employers
                      </span>
                      <p className="mt-0.5 text-[11px] text-brand-slate leading-relaxed">
                        {track.exampleEmployers.slice(0, 4).join(" • ")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* 5th Option: Still exploring / not sure yet */}
          <div
            id="track-card-still-exploring"
            onClick={() => onSelectTrack(null, null)}
            className={`relative flex flex-col justify-between rounded-xl border-2 p-5 text-left transition-all cursor-pointer select-none sm:col-span-2 ${
              isExploringSelected
                ? "border-brand-gold bg-amber-50/40 shadow-md ring-2 ring-brand-gold/30"
                : "border-dashed border-brand-navy/25 bg-white/50 hover:border-brand-navy/40 hover:bg-white hover:shadow-xs"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-gold/15 text-brand-gold border border-brand-gold/30">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-brand-navy">
                    Still exploring / not sure yet
                  </h3>
                  <p className="mt-1 text-xs text-brand-slate leading-relaxed">
                    Don&apos;t want to commit to a specific career track today? That&apos;s completely fine! You can freely calibrate custom skills from any domain and browse opportunities across all AYUSH disciplines.
                  </p>
                </div>
              </div>

              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                  isExploringSelected
                    ? "border-brand-gold bg-brand-gold text-white"
                    : "border-brand-navy/30 bg-white"
                }`}
              >
                {isExploringSelected && <CheckCircle2 className="h-4 w-4" />}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
