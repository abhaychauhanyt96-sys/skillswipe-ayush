import http from "node:http";

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
  console.log("=== Testing Server-Side /api/chat Route ===");

  // Test 1: General Platform Question
  console.log("\n1. Testing General App Question: 'How do matches work?'");
  const res1 = await postMessage("How does mutual consent matching work on SkillSwipe?");
  console.log("  HTTP Status:", res1.status);
  console.log("  Assistant Response:\n ", res1.data?.response?.slice(0, 200) + "...\n");

  // Test 2: Search Question with Tool Call
  console.log("2. Testing Profile Search with Tool Call: 'Find companies hiring for Python'");
  const res2 = await postMessage("Find me companies hiring for Python or React");
  console.log("  HTTP Status:", res2.status);
  console.log("  Tool Used:", res2.data?.toolUsed || "None");
  console.log("  Assistant Response:\n ", res2.data?.response?.slice(0, 250) + "...\n");

  // Test 3: Off-Topic Question
  console.log("3. Testing Off-Topic Question: 'What is the capital of Australia?'");
  const res3 = await postMessage("What is the capital of Australia?");
  console.log("  HTTP Status:", res3.status);
  console.log("  Assistant Response:\n ", res3.data?.response?.slice(0, 200) + "...\n");

  console.log("ALL /api/chat ENDPOINT TESTS EXECUTED SUCCESSFULLY!");
}

runTests().catch(console.error);
