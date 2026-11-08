export type QuadraticCoefficients = {
  a: number;
  b: number;
  c: number;
};

export type GraphPoint = {
  x: number;
  y: number;
};

export type ParsedGraphFunction = {
  expression: string;
  family: string;
  coefficients: QuadraticCoefficients | null;
  evaluate(x: number): number | null;
};

export type GraphPracticeQuestion = {
  id: string;
  prompt: string;
  answer: string;
  hint: string;
  explanation: string;
  options?: string[];
};

export type GraphPracticeSession = {
  topic: string;
  equation: string;
  questions: GraphPracticeQuestion[];
  currentIndex: number;
  attempts: number;
  correct: number;
  completed: boolean;
  createdAt: string;
  lastAttemptAt: string | null;
};

export function parseQuadraticEquation(input: string): QuadraticCoefficients | null;
export function parseGraphFunction(input: string): ParsedGraphFunction | null;
export function sampleGraphFunction(
  input: string | ParsedGraphFunction,
  minimumX?: number,
  maximumX?: number,
  pointCount?: number,
): { expression: string; family: string; points: Array<GraphPoint | null> } | null;
export function createLinearFunctionExplanation(input: string): string | null;
export function createGraphPractice(input: string): GraphPracticeSession | null;
export function isIncompleteEquation(input: string): boolean;
export function createIncompleteEquationClarification(input: string): string | null;
export function createQuadraticFunctionExplanation(input: string): string | null;
export function solveQuadraticEquation(input: string): {
  coefficients: QuadraticCoefficients;
  discriminant: number | null;
  roots: number[];
  vertex: GraphPoint | null;
  kind: 'linear' | 'quadratic';
} | null;
export function sampleQuadratic(
  coefficients: QuadraticCoefficients,
  minimumX: number,
  maximumX: number,
  pointCount?: number,
): {
  points: GraphPoint[];
  roots: number[];
  yIntercept: number;
  vertex: GraphPoint | null;
} | null;
