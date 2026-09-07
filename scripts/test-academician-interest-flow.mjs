import fs from "node:fs";
import http from "node:http";
import assert from "node:assert";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

// Read Firebase client config from .env.local
const envContent = fs.readFileSync(".env.local", "utf8");
function getEnv(key) {
  const m = envContent.match(new RegExp(`${key}=["']?([^"'\\r\\n]+)`));
  return m ? m[1] : "";
}

const firebaseConfig = {
  apiKey: getEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
  authDomain: getEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: getEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function checkUrl(path) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:3000${path}`, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({ path, status: res.statusCode, length: data.length });
      });
    });
    req.on("error", (err) => resolve({ path, status: "ERR", error: err.message }));
    req.setTimeout(25000, () => {
      req.destroy();
      resolve({ path, status: "TIMEOUT" });
    });
  });
}

function postJson(path, payload) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(payload);
    const req = http.request(
      `http://localhost:3000${path}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(bodyStr),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, data: parsed });
          } catch {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );
    req.on("error", (err) => reject(err));
    req.setTimeout(25000, () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
    req.write(bodyStr);
    req.end();
  });
}

async function main() {
  console.log("=== Testing Full Academician Dashboard & Express Interest Flow ===");

  const timestamp = Date.now();
  const testCompanyId = `test_company_${timestamp}`;
  const testAcademicianId = `test_academician_${timestamp}`;
  const testOppId = `test_opp_${timestamp}`;
  const testInterestId = `test_interest_${timestamp}`;

  // 1. Setup Company Record in companies & users
  console.log("\n[Test 1] Setting up mock company & academician in Firestore");
  await setDoc(doc(db, "companies", testCompanyId), {
    basicInfo: {
      name: "Quantum Innovations Lab",
      industry: "Artificial Intelligence & Quantum Computing",
      location: "Bengaluru, India",
    },
  });
  // Use developer account email so Resend test tier authorizes delivery
  await setDoc(doc(db, "users", testCompanyId), {
    name: "Quantum Innovations Recruiter",
    email: "abhaychauhanyt96@gmail.com",
    role: "company",
  });

  // Setup Academician Record in academicians & users
  await setDoc(doc(db, "academicians", testAcademicianId), {
    uid: testAcademicianId,
    basicInfo: {
      institution: "Indian Institute of Science (IISc)",
      department: "Dept. of Computational & Data Sciences",
      designation: "Professor",
    },
    interests: ["FDP", "research"],
    expertiseAreas: ["Quantum Machine Learning", "Distributed Systems", "Graph Neural Networks"],
    links: {
      email: "prof.quantum@iisc.example.ac.in",
      linkedin: "https://linkedin.com/in/prof-quantum",
      scholarProfile: "https://scholar.google.com/citations?user=test_quantum",
    },
    createdAt: new Date().toISOString(),
  });
  await setDoc(doc(db, "users", testAcademicianId), {
    name: "Prof. Arvind Ramanathan",
    email: "prof.quantum@iisc.example.ac.in",
    role: "academician",
  });
  console.log("  Mock profiles committed successfully.");

  // 2. Post Academic Opportunity (Company action)
  console.log("\n[Test 2] Posting Academic Opportunity (Company Action)");
  const oppPayload = {
    postedBy: testCompanyId,
    type: "FDP",
    title: "Advanced Quantum Computing & QML Faculty Fellowship",
    description: "Intensive 2-week sponsored fellowship for faculty to co-develop quantum algorithm course curricula and conduct hybrid quantum simulation benchmarks.",
    requiredExpertise: ["Quantum Machine Learning", "Distributed Systems", "Python"],
    duration: "2 Weeks",
    mode: "hybrid",
    applyBy: "2026-11-30",
    createdAt: serverTimestamp(),
    companyName: "Quantum Innovations Lab",
  };
  await setDoc(doc(db, "academicOpportunities", testOppId), oppPayload);
  console.log(`  Opportunity posted: "${oppPayload.title}" (ID: ${testOppId})`);

  // 3. Express Interest (Academician Action)
  console.log("\n[Test 3] Expressing Interest as Academician in academicianInterests/{id}");
  const interestPayload = {
    academicianId: testAcademicianId,
    opportunityId: testOppId,
    companyId: testCompanyId,
    expressedAt: serverTimestamp(),
    status: "new",
    opportunityTitle: oppPayload.title,
    academicianName: "Prof. Arvind Ramanathan",
  };
  await setDoc(doc(db, "academicianInterests", testInterestId), interestPayload);

  // Validate Firestore record
  const interestSnap = await getDoc(doc(db, "academicianInterests", testInterestId));
  assert(interestSnap.exists(), "Interest document must exist");
  const interestData = interestSnap.data();
  assert.strictEqual(interestData.academicianId, testAcademicianId);
  assert.strictEqual(interestData.opportunityId, testOppId);
  assert.strictEqual(interestData.companyId, testCompanyId);
  assert.strictEqual(interestData.status, "new");
  console.log("  Interest document verified in Firestore.");

  // 4. Trigger Email Notification API Route
  console.log("\n[Test 4] Dispatching notification email via /api/academician/send-interest-email");
  const emailRes = await postJson("/api/academician/send-interest-email", {
    interestId: testInterestId,
    academicianId: testAcademicianId,
    opportunityId: testOppId,
    companyId: testCompanyId,
  });

  console.log("  API Response Status:", emailRes.status);
  console.log("  API Response Data:", emailRes.data);
  assert.strictEqual(emailRes.status, 200, "Email API must return HTTP 200");
  assert.strictEqual(emailRes.data.success, true, "Email dispatch should indicate success");
  assert(emailRes.data.emailSentAt, "emailSentAt must be present in response");

  // Verify interest record updated with emailSentAt in Firestore
  const updatedInterestSnap = await getDoc(doc(db, "academicianInterests", testInterestId));
  const updatedInterestData = updatedInterestSnap.data();
  assert(updatedInterestData.emailSentAt, "emailSentAt must be written to interest document");
  console.log("  Firestore interest record successfully updated with emailSentAt:", updatedInterestData.emailSentAt);

  // 5. Test Public Academician Profile Route
  console.log("\n[Test 5] Verifying Public Academician Profile Page");
  const profileRes = await checkUrl(`/profile/academician/${testAcademicianId}`);
  console.log(`  Route /profile/academician/${testAcademicianId} -> Status: ${profileRes.status} (${profileRes.length} bytes)`);
  assert.strictEqual(profileRes.status, 200, "Public academician profile must return HTTP 200");

  // 6. Test Academician Dashboard Route
  console.log("\n[Test 6] Verifying Academician Dashboard Page");
  const dashRes = await checkUrl(`/dashboard/academician`);
  console.log(`  Route /dashboard/academician -> Status: ${dashRes.status} (${dashRes.length} bytes)`);
  assert.strictEqual(dashRes.status, 200, "Academician dashboard must return HTTP 200");

  // 7. Cleanup
  console.log("\n[Test 7] Cleaning up test records");
  await deleteDoc(doc(db, "academicOpportunities", testOppId));
  await deleteDoc(doc(db, "academicianInterests", testInterestId));
  await deleteDoc(doc(db, "academicians", testAcademicianId));
  await deleteDoc(doc(db, "companies", testCompanyId));
  await deleteDoc(doc(db, "users", testAcademicianId));
  await deleteDoc(doc(db, "users", testCompanyId));
  console.log("  Cleanup finished.");

  console.log("\n==================================================================");
  console.log("ALL TESTS PASSED! Full Academician Flow & Email Dispatch 100% OK!");
  console.log("==================================================================");
}

main().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
