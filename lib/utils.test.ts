import { describe, it, expect } from "vitest"
import { evaluateCriteria, isValidCriterion, Criterion } from "./utils"

describe("Success Criteria Evaluation", () => {
  describe("isValidCriterion", () => {
    it("should return true for a valid soft criterion", () => {
      const criterion: Criterion = { type: "soft", score: 0.5, weight: 1 }
      expect(isValidCriterion(criterion)).toBe(true)
    })

    it("should return false for a soft criterion with a score less than 0", () => {
      const criterion: Criterion = { type: "soft", score: -0.1, weight: 1 }
      expect(isValidCriterion(criterion)).toBe(false)
    })

    it("should return false for a soft criterion with a score greater than 1", () => {
      const criterion: Criterion = { type: "soft", score: 1.1, weight: 1 }
      expect(isValidCriterion(criterion)).toBe(false)
    })

    it("should return false for a soft criterion with a negative weight", () => {
      const criterion: Criterion = { type: "soft", score: 0.5, weight: -1 }
      expect(isValidCriterion(criterion)).toBe(false)
    })

    it("should return true for a valid hard criterion with score 0", () => {
      const criterion: Criterion = { type: "hard", score: 0, weight: 1 }
      expect(isValidCriterion(criterion)).toBe(true)
    })

    it("should return true for a valid hard criterion with score 1", () => {
      const criterion: Criterion = { type: "hard", score: 1, weight: 1 }
      expect(isValidCriterion(criterion)).toBe(true)
    })

    it("should return false for a hard criterion with a score other than 0 or 1", () => {
      const criterion = {
        type: "hard",
        score: 0.5,
        weight: 1,
      } as unknown as Criterion
      expect(isValidCriterion(criterion)).toBe(false)
    })

    it("should return false for a hard criterion with a negative weight", () => {
      const criterion: Criterion = { type: "hard", score: 1, weight: -1 }
      expect(isValidCriterion(criterion)).toBe(false)
    })

    it("should return false for an invalid criterion type", () => {
      const criterion = {
        type: "invalid",
        score: 0.5,
        weight: 1,
      } as unknown as Criterion
      expect(isValidCriterion(criterion)).toBe(false)
    })
  })

  describe("evaluateCriteria", () => {
    it("should return NaN for an empty list of criteria", () => {
      expect(evaluateCriteria([])).toBeNaN()
    })

    it("should return NaN when total weight is zero", () => {
      const criteria: Criterion[] = [
        { type: "soft", score: 0.5, weight: 0 },
        { type: "hard", score: 1, weight: 0 },
      ]
      expect(evaluateCriteria(criteria)).toBeNaN()
    })

    it("should correctly evaluate a mix of soft and hard criteria", () => {
      const criteria: Criterion[] = [
        { type: "soft", score: 0.8, weight: 2 },
        { type: "hard", score: 1, weight: 1 },
        { type: "soft", score: 0.5, weight: 1 },
      ]
      // (0.8 * 2 + 1 * 1 + 0.5 * 1) / (2 + 1 + 1) = (1.6 + 1 + 0.5) / 4 = 3.1 / 4 = 0.775
      expect(evaluateCriteria(criteria)).toBeCloseTo(0.775)
    })

    it("should correctly evaluate when some criteria have zero weight", () => {
      const criteria: Criterion[] = [
        { type: "soft", score: 0.8, weight: 2 },
        { type: "hard", score: 1, weight: 0 },
        { type: "soft", score: 0.5, weight: 1 },
      ]
      // (0.8 * 2 + 0.5 * 1) / (2 + 1) = (1.6 + 0.5) / 3 = 2.1 / 3 = 0.7
      expect(evaluateCriteria(criteria)).toBeCloseTo(0.7)
    })

    it("should correctly evaluate only hard criteria", () => {
      const criteria: Criterion[] = [
        { type: "hard", score: 1, weight: 1 },
        { type: "hard", score: 0, weight: 1 },
        { type: "hard", score: 1, weight: 2 },
      ]
      // (1 * 1 + 0 * 1 + 1 * 2) / (1 + 1 + 2) = (1 + 2) / 4 = 3 / 4 = 0.75
      expect(evaluateCriteria(criteria)).toBeCloseTo(0.75)
    })

    it("should correctly evaluate only soft criteria", () => {
      const criteria: Criterion[] = [
        { type: "soft", score: 0.2, weight: 1 },
        { type: "soft", score: 0.9, weight: 3 },
      ]
      // (0.2 * 1 + 0.9 * 3) / (1 + 3) = (0.2 + 2.7) / 4 = 2.9 / 4 = 0.725
      expect(evaluateCriteria(criteria)).toBeCloseTo(0.725)
    })
  })
})
