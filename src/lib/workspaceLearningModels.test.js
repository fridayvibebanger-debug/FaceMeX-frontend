import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CUBE_EDGES,
  CUBE_VERTICES,
  WATER_MOLECULE_ATOMS,
  getWaterMoleculeBondAngleDegrees,
  getWaterMoleculeBondLengthAngstroms,
  getLinearMarketEquilibrium,
  rotatePoint3D,
} from './workspaceLearningModels.js';

test('water model contains one oxygen, two hydrogens, and accurate geometry', () => {
  assert.equal(WATER_MOLECULE_ATOMS.filter((atom) => atom.element === 'Oxygen').length, 1);
  assert.equal(WATER_MOLECULE_ATOMS.filter((atom) => atom.element === 'Hydrogen').length, 2);
  assert.ok(Math.abs(getWaterMoleculeBondAngleDegrees() - 104.5) < 1e-10);
  assert.ok(Math.abs(getWaterMoleculeBondLengthAngstroms() - 0.96) < 1e-10);
});

test('cube model has eight vertices and twelve edges', () => {
  assert.equal(CUBE_VERTICES.length, 8);
  assert.equal(CUBE_EDGES.length, 12);
  assert.ok(CUBE_VERTICES.every((vertex) => vertex.every((coordinate) => Math.abs(coordinate) === 1)));
});

test('3D point rotation preserves distance from the origin', () => {
  const original = [0.3, -0.5, 0.8];
  const rotated = rotatePoint3D(original, 1.2, -0.7, 0.4);
  assert.ok(Math.abs(Math.hypot(...original) - Math.hypot(rotated.x, rotated.y, rotated.z)) < 1e-12);
});

test('linear supply and demand controls calculate equilibrium correctly', () => {
  assert.deepEqual(getLinearMarketEquilibrium(100, 20), {
    quantity: 80 / 3,
    price: 140 / 3,
    demandSlope: 2,
    supplySlope: 1,
  });
  assert.equal(getLinearMarketEquilibrium(20, 20), null);
});
