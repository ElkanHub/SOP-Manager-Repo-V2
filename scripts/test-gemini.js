// scripts/test-gemini.js
const { GoogleGenAI } = require("@google/genai"); // The 2026 SDK
require('dotenv').config();

async function testGemini() {
  // Step 1: Securely load your API key
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    console.error("❌ Error: GEMINI_API_KEY not found in your .env file.");
    return;
  }

  // Step 2: Initialize the modern SDK client
  // The SDK automatically handles the v1beta endpoint for Gemini 3
  const ai = new GoogleGenAI({ apiKey });

  console.log("🚀 Initializing Gemini 3 Flash...");

  try {
    // Step 3: Call the specific 2026 Gemini 3 model
    // 'gemini-3-flash-preview' is the current stable ID for the hackathon
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Hello, respond with 'KEY_WORKS' and nothing else.",
      config: {
        temperature: 0.7,
        maxOutputTokens: 500,
      }
    });

    const responseText = response.text.trim();
    console.log("📡 Model Response:", responseText);

    if (responseText.includes("KEY_WORKS")) {
      console.log("✅ Success: Your Gemini 3 API key is active and the model is reachable!");
    } else {
      console.log("⚠️  Warning: Connection successful, but the response was unexpected:", responseText);
    }
  } catch (error) {
    // Detailed error handling for common 2026 deployment issues
    console.error("❌ Gemini API Error:");
    console.error(`- Status: ${error.status || 'Unknown'}`);
    console.error(`- Message: ${error.message}`);

    if (error.message.includes("404")) {
      console.log("\n💡 Tip: Your region might still be on the rolling update. Try changing the model to 'gemini-flash-latest' which automatically routes to the best available version.");
    }
  }
}

testGemini();