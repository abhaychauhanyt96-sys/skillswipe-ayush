import fs from "node:fs";

const envContent = fs.readFileSync(".env.local", "utf8");
const match = envContent.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)/);
const apiKey = match[1];

async function listModels() {
  console.log("Listing available models...");
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.models) {
    console.log("Supported models:");
    const flashModels = data.models
      .filter((m) => m.name.includes("flash"))
      .map((m) => m.name);
    console.log(flashModels);
  } else {
    console.log("Failed to list models:", data);
  }
}

async function testModel(modelName) {
  console.log(`Testing model ${modelName}...`);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: "Hello! Answer in 5 words." }] }],
    }),
  });
  const data = await res.json();
  if (res.ok) {
    console.log(`  [SUCCESS] ${modelName} responded:`, data.candidates?.[0]?.content?.parts?.[0]?.text?.trim());
    return true;
  } else {
    console.log(`  [FAILED] ${modelName}:`, res.status, data.error?.message || data);
    return false;
  }
}

async function run() {
  await listModels();
  await testModel("gemini-3.6-flash");
}

run();
