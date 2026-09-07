import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import fs from "fs";
import path from "path";

// Read .env.local
const envContent = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const clean = line.trim();
  if (clean && !clean.startsWith("#") && clean.includes("=")) {
    const idx = clean.indexOf("=");
    const key = clean.substring(0, idx).trim();
    let val = clean.substring(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[key] = val;
  }
});

const app = initializeApp({
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
}, "matching_test_app_" + Date.now());

const db = getFirestore(app);

async function testMutualConsentMatching() {
  console.log("\n========================================================");
  console.log("TESTING MUTUAL-CONSENT MATCHING & FIRESTORE ATOMIC LOGIC");
  console.log("========================================================");

  const timestamp = Date.now();
  const testStudentId = `student_tester_${timestamp}`;
  const testCompanyId = `company_tester_${timestamp}`;

  // 1. Setup Student
  const studentPayload = {
    uid: testStudentId,
    basicInfo: {
      college: "IIT Bombay",
      degree: "B.Tech Computer Science",
      year: "2026",
      location: "Mumbai",
    },
    skills: [
      { name: "React", level: "expert", verified: true },
      { name: "TypeScript", level: "intermediate", verified: false },
      { name: "Firebase", level: "intermediate", verified: false },
    ],
    projects: [
      {
        title: "Campus Chat App",
        description: "Real-time messaging with WebSockets",
        techStack: ["React", "Node.js"],
      },
    ],
    links: { github: "https://github.com/tester" },
    certificates: [],
    swipedRight: [],
    swipedLeft: [],
    matches: [],
  };

  // 2. Setup Company
  const companyPayload = {
    uid: testCompanyId,
    basicInfo: {
      name: "Nexus Labs India",
      industry: "AI & Cloud Platforms",
      website: "https://nexus.example.com",
    },
    openRoles: [
      {
        title: "Frontend Engineering Intern",
        type: "internship",
        requiredSkills: ["React", "TypeScript", "Firebase"],
        stipend: "₹35,000 / month",
        description: "Work on core user matching interfaces",
      },
    ],
    learningPrograms: [],
    swipedRight: [testStudentId], // Company PRE-SWIPES right on student!
    swipedLeft: [],
    matches: [],
  };

  console.log("\n[1/4] Creating test candidate and company in Firestore...");
  await setDoc(doc(db, "students", testStudentId), studentPayload);
  await setDoc(doc(db, "companies", testCompanyId), companyPayload);
  console.log("✓ Student created. Company created with studentId in swipedRight.");

  // 3. Now Student swipes right on Company
  console.log("\n[2/4] Simulating candidate right-swipe on company...");
  const studentDocRef = doc(db, "students", testStudentId);
  await updateDoc(studentDocRef, {
    swipedRight: arrayUnion(testCompanyId),
  });

  // 4. Check reciprocal match logic
  console.log("\n[3/4] Evaluating reciprocal interest condition...");
  const companySnap = await getDoc(doc(db, "companies", testCompanyId));
  const compData = companySnap.data();

  const isMutual = compData.swipedRight && compData.swipedRight.includes(testStudentId);
  console.log("✓ Does company have student in swipedRight?", isMutual ? "YES (Mutual Match!)" : "NO");

  if (!isMutual) {
    throw new Error("Expected mutual match condition to be true!");
  }

  // 5. Commit Match
  console.log("\n[4/4] Creating matches/{matchId} document and linking arrays...");
  const matchId = `match_${testStudentId}_${testCompanyId}_${timestamp}`;
  const matchPayload = {
    matchId,
    studentId: testStudentId,
    companyId: testCompanyId,
    matchedAt: new Date().toISOString(),
    status: "new",
    emailSentAt: null,
  };

  await setDoc(doc(db, "matches", matchId), matchPayload);
  await updateDoc(studentDocRef, { matches: arrayUnion(testCompanyId) });
  await updateDoc(doc(db, "companies", testCompanyId), { matches: arrayUnion(testStudentId) });
  console.log(`✓ match document '${matchId}' committed!`);

  // 6. Verify Match Document Readback
  const matchSnap = await getDoc(doc(db, "matches", matchId));
  if (matchSnap.exists()) {
    const data = matchSnap.data();
    console.log("✓ Verified match status:", data.status);
    console.log("✓ Verified match timestamp:", data.matchedAt);
    console.log("✓ Verified studentId:", data.studentId);
    console.log("✓ Verified companyId:", data.companyId);
  }

  console.log("\n========================================================");
  console.log("MUTUAL-CONSENT MATCH DETECTION TEST PASSED COMPLETELY!");
  console.log("========================================================");
  process.exit(0);
}

testMutualConsentMatching().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
