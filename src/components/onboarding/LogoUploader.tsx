"use client";

import React, { useState, useRef } from "react";
import { storage } from "@/lib/firebase/config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Building2, UploadCloud, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LogoUploaderProps {
  userId: string;
  logoUrl: string;
  onChange: (url: string) => void;
}

export function LogoUploader({ userId, logoUrl, onChange }: LogoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(logoUrl || "");
  const [manualUrl, setManualUrl] = useState(logoUrl || "");
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    if (file.size > 5 * 1024 * 1024) {
      setError("Logo image must be under 5MB.");
      return;
    }

    // Local object preview
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setError(null);
    setUploading(true);

    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storageRef = ref(storage, `company_logos/${userId}/${Date.now()}_${sanitizedName}`);
      const snapshot = await uploadBytes(storageRef, file);
      const remoteUrl = await getDownloadURL(snapshot.ref);

      setPreviewUrl(remoteUrl);
      onChange(remoteUrl);
      setManualUrl(remoteUrl);
    } catch (err: any) {
      console.warn("Storage logo upload notice:", err);
      // If Storage is not provisioned yet or gives 404, retain the local preview / fallback
      onChange(localPreview);
      if (err.status_ === 404 || err.code === "storage/unknown") {
        setError(
          "Cloud Storage bucket is not yet provisioned in your Firebase Console. You can also paste a direct logo image URL below."
        );
      } else {
        setError(err.message || "Failed to upload logo to storage.");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleManualUrlSave = () => {
    if (manualUrl.trim()) {
      setPreviewUrl(manualUrl.trim());
      onChange(manualUrl.trim());
      setError(null);
    }
  };

  return (
    <div className="rounded-xl border border-brand-navy/15 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-brand-teal" />
        <h3 className="font-serif text-sm font-bold text-brand-navy">
          Company Brand Logo
        </h3>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Logo Preview Box */}
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-brand-navy/20 bg-brand-paper/50 overflow-hidden relative shadow-xs">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Company Logo Preview"
              className="h-full w-full object-contain p-1"
            />
          ) : (
            <div className="flex flex-col items-center text-center p-2 text-brand-slate/60">
              <ImageIcon className="h-6 w-6 mb-1" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">No Logo</span>
            </div>
          )}

          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex-1 space-y-3 w-full">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-slate">
              Upload Image File (PNG, JPG, SVG)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={handleFileChange}
              className="mt-1.5 block w-full text-xs text-brand-slate file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:border-brand-navy/20 file:text-xs file:font-semibold file:bg-brand-paper file:text-brand-navy hover:file:bg-brand-paper/60 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-slate">
              Or Public Image URL
            </label>
            <div className="flex gap-2 mt-1">
              <input
                type="url"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="block flex-1 rounded-md border border-brand-navy/20 bg-brand-paper/30 px-3 py-1.5 text-xs text-brand-navy placeholder:text-brand-slate/50 focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleManualUrlSave}
                disabled={!manualUrl.trim() || manualUrl === logoUrl}
                className="h-8 text-xs"
              >
                Apply
              </Button>
            </div>
          </div>

          {error && (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
