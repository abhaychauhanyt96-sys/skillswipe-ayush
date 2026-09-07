"use client";

import React from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MatchesView } from "@/components/matches/MatchesView";

export default function StudentMatchesPage() {
  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <MatchesView role="student" />
    </ProtectedRoute>
  );
}
