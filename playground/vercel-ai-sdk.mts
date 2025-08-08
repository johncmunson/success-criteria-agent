import "../lib/envConfig.ts"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"

// USAGE: npx tsx playground/vercel-ai-sdk.mts

// NOTE: The .mts extension allows us to use ES modules
// and things like top-level await with tsx.

const { text, usage, providerMetadata } = await generateText({
  model: openai("o3-mini"),
  prompt: "Invent a new holiday and describe its traditions.",
  providerOptions: {
    openai: {
      reasoningEffort: "low",
    },
  },
})

console.log(text)
console.log("Usage:", {
  ...usage,
  reasoningTokens: providerMetadata?.openai?.reasoningTokens,
})
