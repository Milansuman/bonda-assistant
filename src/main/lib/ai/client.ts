import { createGroq } from '@ai-sdk/groq';

// In the main process, we need to access environment variables differently
// The VITE_ prefix is for the renderer process, but we can also use GROQ_API_KEY
const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  console.error('GROQ API key not found. Please set GROQ_API_KEY or VITE_GROQ_API_KEY environment variable.');
}

export const groq = createGroq({
  apiKey: apiKey
});