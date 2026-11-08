import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createIncompleteEquationClarification,
  createQuadraticFunctionExplanation,
  isIncompleteEquation,
  parseQuadraticEquation,
  sampleQuadratic,
  solveQuadraticEquation,
} from './workspaceGraph.js';

test('parses supported quadratic equations and rejects ambiguous or unsupported input', () => {
  assert.deepEqual(parseQuadraticEquation('y = x² - 3'), { a: 1, b: 0, c: -3 });
  assert.deepEqual(parseQuadraticEquation('f(x) = -2x^2 + 3x + 4'), { a: -2, b: 3, c: 4 });
  assert.deepEqual(parseQuadraticEquation('y=0.5x^2-x'), { a: 0.5, b: -1, c: 0 });
  assert.deepEqual(parseQuadraticEquation('x² - 5x + 6 = 0'), { a: 1, b: -5, c: 6 });
  assert.deepEqual(parseQuadraticEquation('x² - 5x + 6 = x + 6'), { a: 1, b: -6, c: 0 });
  assert.deepEqual(sampleQuadratic(parseQuadraticEquation('y = 2x - 4'), -5, 5).roots, [2]);
  assert.equal(parseQuadraticEquation('y = x^3'), null);
  assert.equal(parseQuadraticEquation('x^2 - 3'), null);
  assert.equal(parseQuadraticEquation('y = x^2 + mystery'), null);
});

test('solves a quadratic equation and reports its roots, discriminant and vertex', () => {
  assert.deepEqual(solveQuadraticEquation('x² - 5x + 6 = 0'), {
    coefficients: { a: 1, b: -5, c: 6 },
    discriminant: 1,
    roots: [2, 3],
    vertex: { x: 2.5, y: -0.25 },
    kind: 'quadratic',
  });
  assert.deepEqual(solveQuadraticEquation('2x - 4 = 0'), {
    coefficients: { a: 0, b: 2, c: -4 },
    discriminant: null,
    roots: [2],
    vertex: null,
    kind: 'linear',
  });
  assert.deepEqual(solveQuadraticEquation('x² + 1 = 0')?.roots, []);
});

test('samples an accurate curve and identifies intercepts and turning point', () => {
  const graph = sampleQuadratic(parseQuadraticEquation('y = x² - 3'), -3, 3, 7);
  assert.ok(graph);
  assert.deepEqual(graph.points[3], { x: 0, y: -3 });
  assert.equal(graph.yIntercept, -3);
  assert.deepEqual(graph.vertex, { x: 0, y: -3 });
  assert.equal(graph.roots.length, 2);
  assert.ok(Math.abs(graph.roots[0] + Math.sqrt(3)) < 1e-10);
  assert.ok(Math.abs(graph.roots[1] - Math.sqrt(3)) < 1e-10);
});

test('detects an incomplete equation without guessing its missing right-hand side', () => {
  assert.equal(isIncompleteEquation('x² + 5 ='), true);
  assert.equal(isIncompleteEquation('\\[x^2 + 5 =\\]'), true);
  assert.equal(isIncompleteEquation('y = x² - 6x + 2'), false);
  assert.equal(isIncompleteEquation('How do I solve this?'), false);
  assert.equal(createIncompleteEquationClarification('x² + 5 ='), [
    'What I noticed',
    'Your equation currently reads:',
    '',
    '\\[x² + 5 =\\]',
    '',
    'The right-hand side is missing.',
    '',
    'Let’s complete it',
    'What should come after the equals sign?',
  ].join('\n'));
});

test('creates a checked, specific explanation for a quadratic function', () => {
  const explanation = createQuadraticFunctionExplanation('y = x² - 6x + 2');
  assert.ok(explanation);
  assert.match(explanation, /y = x² - 6x \+ 2/);
  assert.match(explanation, /a=1,\\ b=-6,\\ c=2/);
  assert.match(explanation, /\\frac\{6\}\{2\(1\)\}=3/);
  assert.match(explanation, /3\^2-6\(3\)\+2=-7/);
  assert.match(explanation, /x=3 \\pm \\sqrt\{7\}/);
  assert.match(explanation, /x\\approx0\.354/);
  assert.match(explanation, /x\\approx5\.646/);
  assert.match(explanation, /\\\(3,-7\\\)/);
  assert.equal(createQuadraticFunctionExplanation('x² - 6x + 2 = 0'), null);
});
