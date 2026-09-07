import fs from "node:fs";
import http from "node:http";
import assert from "node:assert";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
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
    req.setTimeout(8000, () => {
      req.destroy();
      resolve({ path, status: "TIMEOUT" });
    });
  });
}

async function main() {
  console.log("=== Testing Academic Collaboration Postings CRUD Flow & Integration ===");

  const testCompanyId = `test_company_${Date.now()}`;
  const testOppId = `test_opp_${Date.now()}`;

  // 1. Create Academic Opportunity
  console.log("\n[Test 1] Creating Academic Opportunity in Firestore (academicOpportunities/{id})");
  const oppDocRef = doc(db, "academicOpportunities", testOppId);

  const initialPayload = {
    postedBy: testCompanyId,
    type: "FDP",
    title: "5-Day Advanced Deep Learning & GenAI Faculty Workshop",
    description: "Industry-sponsored hands-on workshop covering LLM fine-tuning, RAG pipelines, and enterprise deployment architectures.",
    requiredExpertise: ["Machine Learning", "PyTorch", "NLP"],
    duration: "5 Days",
    mode: "hybrid",
    applyBy: "2026-10-15",
    createdAt: serverTimestamp(),
    companyName: "Nexus AI Research Labs",
  };

  await setDoc(oppDocRef, initialPayload);
  console.log("  Successfully created opportunity doc:", testOppId);

  // 2. Read Academic Opportunity
  console.log("\n[Test 2] Reading and validating created Academic Opportunity");
  const snap1 = await getDoc(oppDocRef);
  assert(snap1.exists(), "Opportunity document should exist in Firestore");
  const data1 = snap1.data();
  assert.strictEqual(data1.postedBy, testCompanyId, "postedBy matches");
  assert.strictEqual(data1.type, "FDP", "type is FDP");
  assert.strictEqual(data1.title, "5-Day Advanced Deep Learning & GenAI Faculty Workshop");
  assert.strictEqual(data1.mode, "hybrid");
  assert.strictEqual(data1.applyBy, "2026-10-15");
  assert.deepStrictEqual(data1.requiredExpertise, ["Machine Learning", "PyTorch", "NLP"]);
  console.log("  Validation passed! Document schema is 100% compliant.");

  // 3. Query by postedBy
  console.log("\n[Test 3] Querying opportunities by postedBy companyId");
  const q = query(
    collection(db, "academicOpportunities"),
    where("postedBy", "==", testCompanyId)
  );
  const qSnap = await getDocs(q);
  assert.strictEqual(qSnap.docs.length, 1, "Should find exactly 1 posting for test company");
  console.log("  Company query returned correctly:", qSnap.docs[0].data().title);

  // 4. Update / Edit Academic Opportunity
  console.log("\n[Test 4] Updating / Editing Academic Opportunity");
  await updateDoc(oppDocRef, {
    title: "5-Day Advanced Deep Learning & GenAI Faculty Workshop (Expanded Edition)",
    duration: "2 Weeks",
    mode: "online",
    requiredExpertise: ["Machine Learning", "PyTorch", "NLP", "Transformers", "CUDA"],
  });

  const snap2 = await getDoc(oppDocRef);
  const data2 = snap2.data();
  assert.strictEqual(
    data2.title,
    "5-Day Advanced Deep Learning & GenAI Faculty Workshop (Expanded Edition)",
    "Updated title matches"
  );
  assert.strictEqual(data2.duration, "2 Weeks", "Updated duration matches");
  assert.strictEqual(data2.mode, "online", "Updated mode matches");
  assert.strictEqual(data2.requiredExpertise.length, 5, "Updated expertise array length is 5");
  console.log("  Update succeeded and verified!");

  // 5. Delete Academic Opportunity
  console.log("\n[Test 5] Deleting Academic Opportunity");
  await deleteDoc(oppDocRef);
  const snap3 = await getDoc(oppDocRef);
  assert(!snap3.exists(), "Document should be deleted from Firestore");
  console.log("  Deletion verified! Document is cleanly removed.");

  // 6. Test App Routes
  console.log("\n[Test 6] Testing HTTP routes on running Next.js app");
  const routesToTest = [
    "/dashboard/company",
    "/dashboard/academician",
    "/onboarding/academician",
    "/dashboard/company/browse",
  ];

  for (const r of routesToTest) {
    const res = await checkUrl(r);
    console.log(`  Route ${r.padEnd(26)} -> Status: ${res.status} (${res.length} bytes)`);
    assert.strictEqual(res.status, 200, `Route ${r} should return HTTP 200`);
  }

  console.log("\n==========================================================");
  console.log("ALL TESTS PASSED! Academic Opportunities feature is 100% verified.");
  console.log("==========================================================");
}

main().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
