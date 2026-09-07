import http from "node:http";

function checkRoute(path, method = "GET", postData = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: "localhost",
      port: 3000,
      path,
      method,
      headers: postData
        ? {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(postData),
          }
        : {},
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({ path, method, status: res.statusCode, length: data.length });
      });
    });

    req.on("error", (err) => resolve({ path, method, status: "ERR", error: err.message }));
    req.setTimeout(8000, () => {
      req.destroy();
      resolve({ path, method, status: "TIMEOUT" });
    });

    if (postData) req.write(postData);
    req.end();
  });
}

async function runHealthCheck() {
  console.log("=== Comprehensive Platform & AI Chatbot Health Check ===");

  const routes = [
    { path: "/", method: "GET" },
    { path: "/login", method: "GET" },
    { path: "/signup", method: "GET" },
    { path: "/role-select", method: "GET" },
    { path: "/dashboard/student", method: "GET" },
    { path: "/dashboard/student/discover", method: "GET" },
    { path: "/dashboard/student/browse", method: "GET" },
    { path: "/dashboard/student/matches", method: "GET" },
    { path: "/dashboard/company", method: "GET" },
    { path: "/dashboard/company/discover", method: "GET" },
    { path: "/dashboard/company/browse", method: "GET" },
    { path: "/dashboard/company/matches", method: "GET" },
    { path: "/profile/demo_candidate", method: "GET" },
    { path: "/company/demo_partner", method: "GET" },
    {
      path: "/api/chat",
      method: "POST",
      data: JSON.stringify({ message: "What is SkillSwipe?", userRole: "student" }),
    },
  ];

  let passed = 0;
  for (const r of routes) {
    const res = await checkRoute(r.path, r.method, r.data);
    if (res.status === 200) {
      console.log(`  [OK 200] ${r.method} ${r.path} (${res.length} bytes)`);
      passed++;
    } else {
      console.error(`  [FAIL] ${r.method} ${r.path} -> Status: ${res.status}`);
    }
  }

  console.log(`\nVerified: ${passed}/${routes.length} platform endpoints functioning with HTTP 200 OK!`);
  if (passed === routes.length) {
    console.log("COMPLETE SYSTEM HEALTHY AND OPERATIONAL!");
  } else {
    process.exit(1);
  }
}

runHealthCheck();
