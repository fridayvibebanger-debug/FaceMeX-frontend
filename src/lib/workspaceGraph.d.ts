export type QuadraticCoefficients = {
  a: number;
  b: number;
  c: number;
};

export type GraphPoint = {
  x: number;
  y: number;
};

export type GraphPracticeQuestion = {
  question: string;
  answer: string;
  explanation: string;
};

export type GraphSample = {
  points: GraphPoint[];
  roots: number[];
  yIntercept: number;
  vertex: GraphPoint | null;
};

export function parseGraphFunction(input: string): QuadraticCoefficients | null;
export function createGraphPractice(input: string): GraphPracticeQuestion[] | null;
export function createLinearFunctionExplanation(input: string): string | null;
export function parseQuadraticEquation(input: string): QuadraticCoefficients | null;
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
): GraphSample | null;
export function sampleGraphFunction(
  coefficients: QuadraticCoefficients,
  minimumX: number,
  maximumX: number,
  pointCount?: number,
): GraphSample | null;
