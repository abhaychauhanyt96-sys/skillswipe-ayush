import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
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

async function testBucket(bucketName) {
  console.log(`\nTesting storage bucket: '${bucketName}'...`);
  const app = initializeApp({
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: bucketName,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  }, "app_" + bucketName.replace(/[^a-zA-Z0-9]/g, "_"));

  const storage = getStorage(app);
  const testRef = ref(storage, `test_ping_${Date.now()}.txt`);
  try {
    await uploadBytes(testRef, Buffer.from("ping"));
    const url = await getDownloadURL(testRef);
    console.log(`✓ Bucket '${bucketName}' SUCCESS! URL:`, url);
    return true;
  } catch (err) {
    console.log(`✗ Bucket '${bucketName}' failed:`, err.message, "status:", err.status_);
    return false;
  }
}

async function testFirestore() {
  console.log("\nTesting Firestore write/read directly...");
  const app = initializeApp({
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  }, "firestore_app");

  const db = getFirestore(app);
  const testDoc = doc(db, "students", "test_ping_student");
  try {
    await setDoc(testDoc, {
      basicInfo: { college: "IIT Delhi", degree: "B.Tech", year: "2026", location: "Delhi" },
      skills: [{ name: "React", level: "intermediate", verified: false }],
      projects: [],
      links: {},
      certificates: [],
      swipedRight: [],
      swipedLeft: [],
      matches: [],
      updatedAt: new Date().toISOString()
    });
    console.log("✓ Firestore write to 'students' succeeded!");
    const snap = await getDoc(testDoc);
    console.log("✓ Firestore read from 'students' succeeded:", snap.data().basicInfo.college);
    return true;
  } catch (err) {
    console.log("✗ Firestore error:", err.message);
    return false;
  }
}

async function main() {
  await testFirestore();
  await testBucket("skillswipe-cf5aa.firebasestorage.app");
  await testBucket("skillswipe-cf5aa.appspot.com");
}

main();
