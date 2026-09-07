import fs from "node:fs";

// Inspect what company documents currently exist in Firestore emulator or production
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function inspect() {
  const snap = await getDocs(collection(db, "companies"));
  console.log(`Found ${snap.size} company documents in Firestore:`);
  snap.forEach((d) => {
    const data = d.data();
    console.log(`- ${d.id}:`, data.basicInfo?.name, `(Industry: ${data.basicInfo?.industry})`);
    console.log("  Roles:", data.openRoles?.map((r) => `${r.title} [${r.requiredSkills?.join(", ")}]`));
  });
}

inspect().catch(console.error);
