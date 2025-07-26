import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type SoftCriterion = {
  type: "soft";
  score: number;  // Must be between 0 and 1
  weight: number; // Must be >= 0
};

export type HardCriterion = {
  type: "hard";
  score: 0 | 1;
  weight: number; // Must be >= 0
};

export type Criterion = SoftCriterion | HardCriterion;

export function evaluateCriteria(criteria: Criterion[]): number {
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return NaN; // Or handle as needed

  const weightedSum = criteria.reduce((sum, c) => sum + c.score * c.weight, 0);
  return weightedSum / totalWeight;
}

export function isValidCriterion(criterion: Criterion): boolean {
  if (criterion.type === "soft") {
    return (
      criterion.score >= 0 && criterion.score <= 1 &&
      criterion.weight >= 0
    );
  } else if (criterion.type === "hard") {
    return (
      (criterion.score === 0 || criterion.score === 1) &&
      criterion.weight >= 0
    );
  }
  return false; // Invalid type
}
