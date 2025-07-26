"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface CanvasCardProps {
  completion: string
}

export function CanvasCard({ completion }: CanvasCardProps) {
  return (
    <div className="flex flex-col min-h-[600px] h-full">
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle>Canvas</CardTitle>
          <CardDescription>LLM output to be evaluated</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          {completion ? (
            <div className="bg-gray-50 p-4 rounded-lg flex-1 overflow-y-auto">
              <p className="whitespace-pre-wrap text-sm">{completion}</p>
            </div>
          ) : (
            <div className="bg-gray-50 p-8 rounded-lg flex-1 flex items-center justify-center text-center text-muted-foreground">
              <p>Generate a response from your prompt to see it here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
