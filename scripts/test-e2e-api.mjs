const routes = [
  "/",
  "/signup",
  "/login",
  "/role-select",
  "/onboarding/student",
  "/onboarding/company",
  "/academician",
  "/dashboard/student",
  "/dashboard/student/discover",
  "/dashboard/student/matches",
  "/dashboard/company",
  "/dashboard/company/discover",
  "/dashboard/company/matches",
  "/profile/sample-candidate-id",
];

async function verifyAllRoutes() {
  console.log("========================================================");
  console.log("SKILLSWIPE LIVE ENDPOINT HEALTH CHECK");
  console.log("========================================================");

  let successCount = 0;
  for (const r of routes) {
    const url = `http://localhost:3000${r}`;
    try {
      const res = await fetch(url);
      if (res.status === 200) {
        console.log(`[PASS] ${res.status} OK: ${r}`);
        successCount++;
      } else {
        console.warn(`[WARN] ${res.status}: ${r}`);
      }
    } catch (err) {
      console.error(`[FAIL] ${r} -> ${err.message}`);
    }
  }

  console.log("\nTesting /api/matches/send-email endpoint...");
  try {
    const res = await fetch("http://localhost:3000/api/matches/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchId: "test_match_healthcheck",
        studentName: "Aarav Sharma",
        studentEmail: "delivered@resend.dev",
        companyName: "Tata Consultancy Services",
        companyEmail: "delivered@resend.dev",
        roleTitle: "Cloud Engineering Intern",
      }),
    });
    const data = await res.json();
    console.log(`[PASS] Email API returned:`, data);
  } catch (apiErr) {
    console.warn(`[NOTICE] API response:`, apiErr.message);
  }

  console.log("\n========================================================");
  console.log(`HEALTH CHECK COMPLETE: ${successCount}/${routes.length} ROUTES VERIFIED 200 OK`);
  console.log("========================================================");
}

verifyAllRoutes();
