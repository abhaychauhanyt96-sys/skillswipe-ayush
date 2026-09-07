"use client";

import React from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MatchesView } from "@/components/matches/MatchesView";

export default function CompanyMatchesPage() {
  return (
    <ProtectedRoute allowedRoles={["company"]}>
      <MatchesView role="company" />
    </ProtectedRoute>
  );
}
