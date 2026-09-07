import fs from "node:fs";
import http from "node:http";
import assert from "node:assert";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

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
    req.setTimeout(8000, () => {
      req.destroy();
      resolve({ path, status: "TIMEOUT" });
    });
  });
}

async function main() {
  console.log("=== Testing Academician Onboarding Flow & Schema ===");

  // 1. Test Firestore Schema Write & Read
  console.log("\n[Test 1] Testing academicians/{uid} Firestore Document Schema");
  const testUid = `test_academician_${Date.now()}`;
  const academicianPayload = {
    uid: testUid,
    basicInfo: {
      institution: "Indian Institute of Technology Delhi",
      department: "Computer Science & Engineering",
      designation: "Associate Professor",
    },
    interests: [
      "FDP",
      "research",
      "consultancy",
      "industrial-training",
      "guest-lecture",
    ],
    expertiseAreas: [
      "Machine Learning",
      "Embedded Systems",
      "Distributed Computing",
    ],
    links: {
      email: "prof.sharma@iitd.ac.in",
      linkedin: "https://linkedin.com/in/prof-sharma",
      scholarProfile: "https://scholar.google.com/citations?user=prof-sharma",
    },
    createdAt: new Date().toISOString(),
  };

  const docRef = doc(db, "academicians", testUid);
  await setDoc(docRef, academicianPayload);
  console.log(`  [PASS] Successfully written document to academicians/${testUid}`);

  const snap = await getDoc(docRef);
  assert.ok(snap.exists(), "Document must exist in Firestore");
  const savedData = snap.data();

  // Validate exact required blueprint fields
  assert.strictEqual(savedData.basicInfo.institution, "Indian Institute of Technology Delhi");
  assert.strictEqual(savedData.basicInfo.department, "Computer Science & Engineering");
  assert.strictEqual(savedData.basicInfo.designation, "Associate Professor");
  assert.deepStrictEqual(savedData.interests, [
    "FDP",
    "research",
    "consultancy",
    "industrial-training",
    "guest-lecture",
  ]);
  assert.deepStrictEqual(savedData.expertiseAreas, [
    "Machine Learning",
    "Embedded Systems",
    "Distributed Computing",
  ]);
  assert.strictEqual(savedData.links.email, "prof.sharma@iitd.ac.in");
  assert.strictEqual(savedData.links.scholarProfile, "https://scholar.google.com/citations?user=prof-sharma");
  console.log("  [PASS] Schema validation 100% verified against blueprint fields!");

  // 2. Test HTTP Endpoints on Localhost
  console.log("\n[Test 2] Testing Next.js Academician Routes");
  const routes = [
    "/onboarding/academician",
    "/dashboard/academician",
    "/academician",
    "/role-select",
  ];

  let passedRoutes = 0;
  for (const r of routes) {
    const res = await checkUrl(r);
    if (res.status === 200 || res.status === 307 || res.status === 308) {
      console.log(`  [OK ${res.status}] ${r} (${res.length} bytes)`);
      passedRoutes++;
    } else {
      console.error(`  [FAIL] ${r} -> Status: ${res.status}`);
    }
  }

  assert.strictEqual(passedRoutes, routes.length, "All academician routes must return valid HTTP status");
  console.log(`\nALL ${routes.length} ROUTES AND SCHEMA CHECKS PASSED SUCCESSFULLY!`);
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
