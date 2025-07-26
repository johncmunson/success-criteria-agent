"use client"

import { useCompletion } from "@ai-sdk/react"
import { PromptCard } from "@/components/llm/PromptCard"
import { CanvasCard } from "@/components/llm/CanvasCard"

import { Header } from "@/components/llm/Header"

export default function Home() {
  const {
    completion,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
  } = useCompletion({
    api: "/api/generate-response",
  })

  return (
    <div className="h-screen bg-gray-50 p-6 flex flex-col">
      <div className="w-full px-4 flex flex-col h-full space-y-6">
        <Header />
        <div className="grid grid-cols-2 gap-6 flex-1 min-h-0 min-w-[1000px]">
          <PromptCard
            input={input}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
          />
          <CanvasCard completion={completion} />
        </div>
      </div>
    </div>
  )
}