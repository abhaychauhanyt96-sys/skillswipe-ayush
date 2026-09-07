import http from "node:http";
import assert from "node:assert";

function checkUrl(path) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:3000${path}`, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({ path, status: res.statusCode, length: data.length, body: data });
      });
    });
    req.on("error", (err) => {
      resolve({ path, status: "ERR", error: err.message });
    });
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ path, status: "TIMEOUT" });
    });
  });
}

async function main() {
  console.log("=== Testing Search & Browse All Routes ===");

  const routes = [
    "/dashboard/student/browse",
    "/dashboard/company/browse",
    "/company/sample_company_123",
    "/dashboard/student/discover",
    "/dashboard/company/discover",
    "/dashboard/student",
    "/dashboard/company",
    "/profile/sample_student_123",
  ];

  let passed = 0;
  for (const route of routes) {
    const res = await checkUrl(route);
    if (res.status === 200) {
      console.log(`  [OK 200] ${route} (${res.length} bytes)`);
      passed++;
    } else {
      console.error(`  [FAIL] ${route} -> Status: ${res.status}`);
    }
  }

  console.log(`\nResults: ${passed}/${routes.length} routes verified 200 OK!`);
  if (passed === routes.length) {
    console.log("ALL ROUTES WORKING PROPERLY!");
  } else {
    process.exit(1);
  }
}

main();
