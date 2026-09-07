import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
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
}, "company_test_app_" + Date.now());

const db = getFirestore(app);

async function testCompanySchema() {
  console.log("Testing Firestore collection 'companies' schema commitment...");
  const testCompanyId = "test_company_sih_" + Date.now();

  const companyData = {
    uid: testCompanyId,
    basicInfo: {
      name: "Acme Quantum Innovations",
      industry: "Information Technology & SaaS",
      website: "https://acme-quantum.example.com",
      logoUrl: "https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=128",
    },
    openRoles: [
      {
        title: "Full Stack Engineer Intern",
        type: "internship",
        requiredSkills: ["React", "TypeScript", "Node.js", "Firebase"],
        stipend: "₹30,000 / month",
        description: "Develop interactive candidate swipe stack and real-time messaging pipeline.",
      },
      {
        title: "AI / Data Science Apprentice",
        type: "job",
        requiredSkills: ["Python", "Machine Learning", "SQL"],
        stipend: "₹45,000 / month",
        description: "Tune mutual vector compatibility ranking algorithms and candidate summarization.",
      },
    ],
    learningPrograms: [
      {
        title: "Cloud Native Developer Academy",
        description: "12-week intensive mentorship covering microservices and serverless infrastructure.",
        certificationOffered: true,
      },
    ],
    swipedRight: [],
    swipedLeft: [],
    matches: [],
  };

  try {
    const docRef = doc(db, "companies", testCompanyId);
    await setDoc(docRef, companyData);
    console.log("✓ Document successfully written to Firestore 'companies' collection!");

    // Read back verification
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      console.log("✓ Read back verified! Company Name:", data.basicInfo.name);
      console.log("✓ Verified open roles count:", data.openRoles.length);
      console.log("✓ Verified required skills for role 0:", data.openRoles[0].requiredSkills.join(", "));
      console.log("✓ Verified learning program:", data.learningPrograms[0].title);
      console.log("\n==========================================");
      console.log("COMPANY SCHEMA VERIFICATION SUCCESSFUL!");
      console.log("==========================================");
      process.exit(0);
    } else {
      throw new Error("Document was not found after writing.");
    }
  } catch (err) {
    console.error("Failed company schema test:", err);
    process.exit(1);
  }
}

testCompanySchema();
