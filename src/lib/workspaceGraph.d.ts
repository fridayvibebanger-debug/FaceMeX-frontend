export type QuadraticCoefficients = {
  a: number;
  b: number;
  c: number;
};

export type GraphPoint = {
  x: number;
  y: number;
};

export function parseQuadraticEquation(input: string): QuadraticCoefficients | null;
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
