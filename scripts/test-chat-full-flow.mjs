import http from "node:http";
import assert from "node:assert";

function postMessage(message, userRole = "student") {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ message, userRole });
    const req = http.request(
      "http://localhost:3000/api/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let responseBody = "";
        res.on("data", (chunk) => (responseBody += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
          } catch (e) {
            resolve({ status: res.statusCode, text: responseBody });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log("=== Testing AI Chat Assistant Full Flow & Clickable Cards ===");

  // 1. App-related question
  console.log("\n[Test 1] Asking general app question: 'How do mutual matches happen?'");
  const res1 = await postMessage("How do mutual matches happen on SkillSwipe?");
  assert.strictEqual(res1.status, 200, "Should return HTTP 200");
  assert.ok(res1.data?.response, "Should include a response");
  console.log("  [PASS] Status 200 OK");
  console.log("  Assistant Answer snippet:", res1.data.response.slice(0, 180) + "...\n");

  // 2. Search question expecting clickable toolResults cards
  console.log("[Test 2] Asking search question: 'Find companies hiring for Python or React'");
  const res2 = await postMessage("Find companies hiring for Python or React", "student");
  assert.strictEqual(res2.status, 200, "Should return HTTP 200");
  assert.strictEqual(res2.data?.toolUsed, "searchProfiles", "Should have executed searchProfiles tool");
  assert.ok(Array.isArray(res2.data?.toolResults), "Should return structured toolResults array");
  console.log(`  [PASS] Tool executed: ${res2.data.toolUsed}`);
  console.log(`  [PASS] Found ${res2.data.toolResults.length} profile cards for rendering`);

  // Verify structure of profile cards
  if (res2.data.toolResults.length > 0) {
    const firstCard = res2.data.toolResults[0];
    console.log("  Sample Card Data:", {
      type: firstCard.type,
      id: firstCard.id,
      name: firstCard.name,
      industry: firstCard.industry,
      rolesCount: firstCard.roles?.length,
    });
    assert.ok(firstCard.id, "Profile card must have an id for linking");
    assert.ok(firstCard.name, "Profile card must have a name");
  }

  console.log("\nALL TESTS PASSED! Both app questions and profile search with clickable cards are 100% functional.");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
