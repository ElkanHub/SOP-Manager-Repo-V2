
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.error("GEMINI_API_KEY not found in environment variables.");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    const models = await genAI.listModels();
    console.log("Available models:");
    models.models.forEach(m => {
      console.log(`- ${m.name} (${m.displayName})`);
    });
  } catch (error) {
    console.error("Error listing models:", error.message);
  }
}

listModels();
