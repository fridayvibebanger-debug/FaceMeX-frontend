import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseQuadraticEquation, sampleQuadratic } from './workspaceGraph.js';

test('parses supported quadratic equations and rejects ambiguous or unsupported input', () => {
  assert.deepEqual(parseQuadraticEquation('y = x² - 3'), { a: 1, b: 0, c: -3 });
  assert.deepEqual(parseQuadraticEquation('f(x) = -2x^2 + 3x + 4'), { a: -2, b: 3, c: 4 });
  assert.deepEqual(parseQuadraticEquation('y=0.5x^2-x'), { a: 0.5, b: -1, c: 0 });
  assert.deepEqual(sampleQuadratic(parseQuadraticEquation('y = 2x - 4'), -5, 5).roots, [2]);
  assert.equal(parseQuadraticEquation('y = x^3'), null);
  assert.equal(parseQuadraticEquation('x^2 - 3'), null);
  assert.equal(parseQuadraticEquation('y = x^2 + mystery'), null);
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
