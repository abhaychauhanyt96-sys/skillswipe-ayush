"use client";

import React, { useState, useRef } from "react";
import { StudentCertificate } from "@/types";
import { storage } from "@/lib/firebase/config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import {
  Award,
  UploadCloud,
  FileText,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
  Plus,
} from "lucide-react";

interface CertificateUploaderProps {
  userId: string;
  certificates: StudentCertificate[];
  onChange: (certs: StudentCertificate[]) => void;
}

export function CertificateUploader({
  userId,
  certificates,
  onChange,
}: CertificateUploaderProps) {
  const [name, setName] = useState("");
  const [issuer, setIssuer] = useState("");
  const [date, setDate] = useState("");
  const [fallbackUrl, setFallbackUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [storageNeedsInit, setStorageNeedsInit] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setUploadError("File size exceeds 10MB limit.");
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleAddCertificate = async () => {
    if (!name.trim()) {
      setUploadError("Certificate title is required.");
      return;
    }
    if (!issuer.trim()) {
      setUploadError("Issuing authority is required.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    let finalFileUrl = fallbackUrl.trim();

    // If file was selected, attempt upload to Firebase Storage
    if (selectedFile) {
      try {
        const sanitizedFilename = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const storagePath = `certificates/${userId}/${Date.now()}_${sanitizedFilename}`;
        const storageRef = ref(storage, storagePath);

        const snapshot = await uploadBytes(storageRef, selectedFile);
        finalFileUrl = await getDownloadURL(snapshot.ref);
      } catch (err: any) {
        console.warn("Storage upload notice:", err);
        if (err.status_ === 404 || err.code === "storage/unknown") {
          setStorageNeedsInit(true);
          setUploadError(
            "Firebase Storage is not enabled yet in your console (Build > Storage > Get Started). You can still provide an external certificate link below or proceed."
          );
          setUploading(false);
          return;
        } else {
          setUploadError(err.message || "Failed to upload file to Firebase Storage.");
          setUploading(false);
          return;
        }
      }
    }

    const newCert: StudentCertificate = {
      name: name.trim(),
      issuer: issuer.trim(),
      date: date || new Date().toISOString().split("T")[0],
      fileUrl: finalFileUrl || "https://example.com/certificate",
    };

    onChange([...certificates, newCert]);

    // Reset fields
    setName("");
    setIssuer("");
    setDate("");
    setFallbackUrl("");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploading(false);
    setUploadError(null);
  };

  const handleRemoveCertificate = (index: number) => {
    onChange(certificates.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-6">
      {/* Upload Box */}
      <div className="rounded-xl border border-brand-navy/15 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-navy text-brand-gold">
            <Award className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-serif text-sm font-bold text-brand-navy">
              Add Verified Credential / Certificate
            </h3>
            <p className="text-[11px] text-brand-slate">
              Upload certificates to Cloud Storage or provide external verification links
            </p>
          </div>
        </div>

        {uploadError && (
          <div className="mb-4 flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-700" />
            <div>
              <span>{uploadError}</span>
              {storageNeedsInit && (
                <p className="mt-1 font-semibold text-amber-800">
                  Tip: Enable Cloud Storage in Firebase Console &gt; Build &gt; Storage &gt; Get Started.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="cert-name-input"
              className="block text-xs font-semibold uppercase tracking-wider text-brand-slate"
            >
              Certificate Title *
            </label>
            <input
              id="cert-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AWS Certified Developer, NPTEL Cloud"
              className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy placeholder:text-brand-slate/50 focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy"
            />
          </div>

          <div>
            <label
              htmlFor="cert-issuer-input"
              className="block text-xs font-semibold uppercase tracking-wider text-brand-slate"
            >
              Issuing Organization *
            </label>
            <input
              id="cert-issuer-input"
              type="text"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              placeholder="e.g. Amazon Web Services, IIT Madras, Coursera"
              className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy placeholder:text-brand-slate/50 focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy"
            />
          </div>

          <div>
            <label
              htmlFor="cert-date-input"
              className="block text-xs font-semibold uppercase tracking-wider text-brand-slate"
            >
              Issue Date
            </label>
            <input
              id="cert-date-input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy"
            />
          </div>

          <div>
            <label
              htmlFor="cert-file-input"
              className="block text-xs font-semibold uppercase tracking-wider text-brand-slate"
            >
              Certificate File (PDF, PNG, JPG)
            </label>
            <input
              id="cert-file-input"
              type="file"
              ref={fileInputRef}
              accept=".pdf,image/png,image/jpeg"
              onChange={handleFileChange}
              className="mt-1.5 block w-full text-xs text-brand-slate file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:border-brand-navy/20 file:text-xs file:font-semibold file:bg-brand-paper file:text-brand-navy hover:file:bg-brand-paper/60 cursor-pointer"
            />
          </div>

          {storageNeedsInit && (
            <div className="sm:col-span-2">
              <label
                htmlFor="cert-fallback-url"
                className="block text-xs font-semibold uppercase tracking-wider text-brand-slate"
              >
                Or Certificate Verification Link (URL)
              </label>
              <input
                id="cert-fallback-url"
                type="url"
                value={fallbackUrl}
                onChange={(e) => setFallbackUrl(e.target.value)}
                placeholder="https://coursera.org/verify/..."
                className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy"
              />
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            id="upload-cert-btn"
            type="button"
            size="sm"
            onClick={handleAddCertificate}
            disabled={uploading || !name.trim() || !issuer.trim()}
          >
            {uploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                <span>Uploading to Cloud Storage...</span>
              </>
            ) : selectedFile ? (
              <>
                <UploadCloud className="h-4 w-4 mr-1.5" />
                <span>Upload & Link Certificate</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1.5" />
                <span>Add Certificate Link</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Uploaded Certificates List */}
      <div>
        <span className="block text-xs font-semibold uppercase tracking-wider text-brand-slate">
          Attached Certificates ({certificates.length})
        </span>

        {certificates.length === 0 ? (
          <div className="mt-2 rounded-lg border border-dashed border-brand-navy/20 bg-white/40 p-5 text-center text-xs text-brand-slate">
            No certificates attached yet. Add course or specialization credentials to enhance your candidate score.
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {certificates.map((cert, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-brand-navy/15 bg-white p-3.5 shadow-xs"
              >
                <div className="flex items-start gap-2.5 overflow-hidden">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-navy/5 text-brand-navy">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="truncate">
                    <h4 className="truncate text-xs font-bold text-brand-navy">
                      {cert.name}
                    </h4>
                    <p className="truncate text-[11px] text-brand-slate">
                      {cert.issuer} {cert.date ? `• ${cert.date}` : ""}
                    </p>
                    {cert.fileUrl && (
                      <a
                        href={cert.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-teal hover:underline mt-0.5"
                      >
                        <span>View Document</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveCertificate(index)}
                  aria-label={`Remove certificate ${cert.name}`}
                  className="rounded-md p-1.5 text-brand-slate hover:bg-brand-brick/10 hover:text-brand-brick transition-colors shrink-0 ml-2"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
