"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, XCircle, Plus, Trash2, Wand2, Play, BarChart3 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface SuccessCriterion {
  id: string
  description: string
  type: "hard" | "soft"
  weight: number
  required: boolean
  threshold?: number // For soft criteria
}

interface EvaluationResult {
  criterionId: string
  passed: boolean
  score: number
  contribution: number
  feedback?: string
}

interface OverallResult {
  totalScore: number
  passed: boolean
  rejected: boolean
  results: EvaluationResult[]
}

export default function Home() {
  const [prompt, setPrompt] = useState("")
  const [generatedResponse, setGeneratedResponse] = useState("")
  const [successCriteria, setSuccessCriteria] = useState<SuccessCriterion[]>([])
  const [totalScoreThreshold, setTotalScoreThreshold] = useState(7)
  const [evaluationResult, setEvaluationResult] = useState<OverallResult | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [isGeneratingCriteria, setIsGeneratingCriteria] = useState(false)

  const addCriterion = () => {
    const newCriterion: SuccessCriterion = {
      id: Date.now().toString(),
      description: "",
      type: "soft",
      weight: 1,
      required: false,
      threshold: 7,
    }
    setSuccessCriteria([...successCriteria, newCriterion])
  }

  const updateCriterion = (id: string, updates: Partial<SuccessCriterion>) => {
    setSuccessCriteria((criteria) => criteria.map((c) => (c.id === id ? { ...c, ...updates } : c)))
  }

  const removeCriterion = (id: string) => {
    setSuccessCriteria((criteria) => criteria.filter((c) => c.id !== id))
  }

  const generateResponse = async () => {
    setIsGenerating(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setGeneratedResponse(
      `This is a simulated LLM response to the prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? "..." : ""}"\n\nThe response demonstrates various capabilities and addresses the key points mentioned in the prompt. It provides detailed explanations, examples, and maintains coherence throughout the generated content.`,
    )
    setIsGenerating(false)
  }

  const generateCriteria = async () => {
    setIsGeneratingCriteria(true)
    // Simulate AI-generated criteria based on prompt
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const generatedCriteria: SuccessCriterion[] = [
      {
        id: Date.now().toString(),
        description: "Response directly addresses the main question or request",
        type: "hard",
        weight: 2,
        required: true,
      },
      {
        id: (Date.now() + 1).toString(),
        description: "Content is factually accurate and well-researched",
        type: "soft",
        weight: 1.5,
        required: true,
        threshold: 8,
      },
      {
        id: (Date.now() + 2).toString(),
        description: "Writing is clear, coherent, and well-structured",
        type: "soft",
        weight: 1,
        required: false,
        threshold: 7,
      },
      {
        id: (Date.now() + 3).toString(),
        description: "Response length is appropriate for the request",
        type: "soft",
        weight: 0.5,
        required: false,
        threshold: 6,
      },
    ]

    setSuccessCriteria(generatedCriteria)
    setIsGeneratingCriteria(false)
  }

  const runEvaluation = async () => {
    setIsEvaluating(true)
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Simulate evaluation results
    const results: EvaluationResult[] = successCriteria.map((criterion) => {
      const score = criterion.type === "hard" ? (Math.random() > 0.2 ? 10 : 0) : Math.floor(Math.random() * 4) + 7 // 7-10 range for demo

      const passed = criterion.type === "hard" ? score === 10 : score >= (criterion.threshold || 7)

      const contribution = (score / 10) * criterion.weight

      return {
        criterionId: criterion.id,
        passed,
        score,
        contribution,
        feedback: `Evaluation feedback for: ${criterion.description.substring(0, 50)}...`,
      }
    })

    const totalWeight = successCriteria.reduce((sum, c) => sum + c.weight, 0)
    const totalScore = (results.reduce((sum, r) => sum + r.contribution, 0) / totalWeight) * 10

    const requiredFailed = results.some((r, i) => successCriteria[i].required && !r.passed)

    const passed = !requiredFailed && totalScore >= totalScoreThreshold

    setEvaluationResult({
      totalScore,
      passed,
      rejected: !passed,
      results,
    })

    setIsEvaluating(false)
  }

  const totalWeight = successCriteria.reduce((sum, c) => sum + c.weight, 0)

  return (
    <div className="h-screen bg-gray-50 p-6 flex flex-col">
      <div className="w-full px-4 flex flex-col h-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">LLM Response Evaluator</h1>
          <p className="text-muted-foreground">Generate and evaluate LLM responses with custom success criteria</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-0">
          {/* Left Column - Prompt Input */}
          <div className="flex flex-col min-h-[600px] h-full">
            {/* Prompt Input Section */}
            <Card className="flex-1 flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Prompt Input
                </CardTitle>
                <CardDescription>Enter your complex, multi-faceted prompt for the LLM</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-4">
                <Textarea
                  placeholder="Enter your detailed prompt here. You can include multiple requirements, context, and specific instructions..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="flex-1 resize-none min-h-[200px]"
                />
                <Button onClick={generateResponse} disabled={!prompt.trim() || isGenerating} className="w-full">
                  {isGenerating ? (
                    <>Generating Response...</>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Generate Response
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Success Criteria */}
          <div className="flex flex-col min-h-[600px] h-full">
            <Card className="flex-1 flex flex-col">
              <CardHeader>
                <CardTitle>Success Criteria</CardTitle>
                <CardDescription>Define evaluation metrics for the LLM response</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={generateCriteria}
                    disabled={!prompt.trim() || isGeneratingCriteria}
                    variant="outline"
                    className="flex-1 bg-transparent"
                  >
                    {isGeneratingCriteria ? (
                      <>Generating...</>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Generate Criteria
                      </>
                    )}
                  </Button>
                  <Button onClick={addCriterion} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Total Score Threshold</Label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={totalScoreThreshold}
                    onChange={(e) => setTotalScoreThreshold(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Minimum weighted average score required to pass</p>
                </div>

                <Separator />

                <div className="flex-1 min-h-0 space-y-4 overflow-y-auto">
                  {successCriteria.map((criterion) => (
                    <Card key={criterion.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <Textarea
                            placeholder="Describe the success criterion..."
                            value={criterion.description}
                            onChange={(e) => updateCriterion(criterion.id, { description: e.target.value })}
                            className="flex-1 mr-2 min-h-[60px]"
                          />
                          <Button onClick={() => removeCriterion(criterion.id)} variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Type</Label>
                            <Select
                              value={criterion.type}
                              onValueChange={(value: "hard" | "soft") => updateCriterion(criterion.id, { type: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="hard">Hard (Pass/Fail)</SelectItem>
                                <SelectItem value="soft">Soft (0-10 Scale)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs">Weight</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.1"
                              value={criterion.weight}
                              onChange={(e) => updateCriterion(criterion.id, { weight: Number(e.target.value) })}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={criterion.required}
                              onCheckedChange={(checked) => updateCriterion(criterion.id, { required: checked })}
                            />
                            <Label className="text-xs">Required</Label>
                          </div>

                          {criterion.type === "soft" && (
                            <div className="flex items-center space-x-2">
                              <Label className="text-xs">Threshold:</Label>
                              <Input
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                value={criterion.threshold || 7}
                                onChange={(e) => updateCriterion(criterion.id, { threshold: Number(e.target.value) })}
                                className="w-16"
                              />
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Badge variant={criterion.type === "hard" ? "destructive" : "secondary"}>
                            {criterion.type}
                          </Badge>
                          {criterion.required && <Badge variant="outline">Required</Badge>}
                          <Badge variant="outline">Weight: {criterion.weight}</Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {successCriteria.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      Total Weight: {totalWeight.toFixed(1)} | Required Criteria:{" "}
                      {successCriteria.filter((c) => c.required).length} | Total Criteria: {successCriteria.length}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Generated Response */}
          <div className="flex flex-col min-h-[600px] h-full">
            <Card className="flex-1 flex flex-col">
              <CardHeader>
                <CardTitle>Generated Response</CardTitle>
                <CardDescription>LLM output to be evaluated</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {generatedResponse ? (
                  <div className="bg-gray-50 p-4 rounded-lg flex-1 overflow-y-auto">
                    <p className="whitespace-pre-wrap text-sm">{generatedResponse}</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-8 rounded-lg flex-1 flex items-center justify-center text-center text-muted-foreground">
                    <p>Generate a response from your prompt to see it here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Evaluation Section */}
        {generatedResponse && successCriteria.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Evaluation</CardTitle>
              <CardDescription>Run evaluations against the defined success criteria</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={runEvaluation} disabled={isEvaluating} className="w-full" size="lg">
                {isEvaluating ? (
                  <>Running Evaluations...</>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Run Evaluations
                  </>
                )}
              </Button>

              {evaluationResult && (
                <div className="space-y-4">
                  {/* Overall Result */}
                  <Alert
                    className={evaluationResult.passed ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}
                  >
                    <div className="flex items-center gap-2">
                      {evaluationResult.passed ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <AlertDescription className="font-medium">
                        {evaluationResult.passed ? "PASSED" : "REJECTED"} - Final Score:{" "}
                        {evaluationResult.totalScore.toFixed(1)}/10
                        {!evaluationResult.passed &&
                          evaluationResult.totalScore >= totalScoreThreshold &&
                          " (Failed required criteria)"}
                      </AlertDescription>
                    </div>
                  </Alert>

                  {/* Score Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Overall Score</span>
                      <span>{evaluationResult.totalScore.toFixed(1)}/10</span>
                    </div>
                    <Progress value={evaluationResult.totalScore * 10} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Threshold: {totalScoreThreshold}</span>
                      <span>{evaluationResult.totalScore >= totalScoreThreshold ? "Above" : "Below"} threshold</span>
                    </div>
                  </div>

                  {/* Individual Results */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Individual Criterion Results</h4>
                    {evaluationResult.results.map((result, index) => {
                      const criterion = successCriteria[index]
                      return (
                        <Card key={result.criterionId} className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <p className="text-sm font-medium flex-1">{criterion.description}</p>
                              <div className="flex items-center gap-2">
                                {result.passed ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-600" />
                                )}
                                <Badge variant={result.passed ? "default" : "destructive"}>
                                  {result.passed ? "PASS" : "FAIL"}
                                </Badge>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Score: </span>
                                <span className="font-medium">
                                  {criterion.type === "hard"
                                    ? result.score === 10
                                      ? "Pass"
                                      : "Fail"
                                    : `${result.score}/10`}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Weight: </span>
                                <span className="font-medium">{criterion.weight}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Contribution: </span>
                                <span className="font-medium">{result.contribution.toFixed(2)}</span>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Badge
                                variant={criterion.type === "hard" ? "destructive" : "secondary"}
                                className="text-xs"
                              >
                                {criterion.type}
                              </Badge>
                              {criterion.required && (
                                <Badge variant="outline" className="text-xs">
                                  Required
                                </Badge>
                              )}
                              {criterion.type === "soft" && (
                                <Badge variant="outline" className="text-xs">
                                  Threshold: {criterion.threshold}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
