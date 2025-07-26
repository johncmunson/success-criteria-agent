"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Play, BarChart3 } from "lucide-react"

interface PromptCardProps {
  input: string
  handleInputChange: (
    e: React.ChangeEvent<HTMLTextAreaElement> | React.ChangeEvent<HTMLInputElement>
  ) => void
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  isLoading: boolean
}

export function PromptCard({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
}: PromptCardProps) {
  return (
    <div className="flex flex-col min-h-[600px] h-full">
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Prompt
          </CardTitle>
          <CardDescription>
            Enter your complex, multi-faceted prompt for the LLM
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <form
            onSubmit={handleSubmit}
            className="flex-1 flex flex-col space-y-4"
          >
            <Textarea
              placeholder="Enter your detailed prompt here. You can include multiple requirements, context, and specific instructions..."
              value={input}
              onChange={handleInputChange}
              className="flex-1 resize-none min-h-[200px]"
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>Generating Response...</>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Generate Response
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
