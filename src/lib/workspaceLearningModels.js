const WATER_BOND_LENGTH_ANGSTROMS = 0.96;
const WATER_BOND_ANGLE_DEGREES = 104.5;
const HALF_WATER_BOND_ANGLE_RADIANS = (WATER_BOND_ANGLE_DEGREES / 2) * (Math.PI / 180);

export const WATER_MOLECULE_ATOMS = [
  { id: 'oxygen', label: 'O', element: 'Oxygen', position: [0, 0, 0] },
  {
    id: 'hydrogen-1',
    label: 'H',
    element: 'Hydrogen',
    position: [
      WATER_BOND_LENGTH_ANGSTROMS * Math.sin(HALF_WATER_BOND_ANGLE_RADIANS),
      WATER_BOND_LENGTH_ANGSTROMS * Math.cos(HALF_WATER_BOND_ANGLE_RADIANS),
      0,
    ],
  },
  {
    id: 'hydrogen-2',
    label: 'H',
    element: 'Hydrogen',
    position: [
      -WATER_BOND_LENGTH_ANGSTROMS * Math.sin(HALF_WATER_BOND_ANGLE_RADIANS),
      WATER_BOND_LENGTH_ANGSTROMS * Math.cos(HALF_WATER_BOND_ANGLE_RADIANS),
      0,
    ],
  },
];

export const CUBE_VERTICES = [
  [-1, -1, -1],
  [1, -1, -1],
  [1, 1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [1, 1, 1],
  [-1, 1, 1],
];

export const CUBE_EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

export function rotatePoint3D([x, y, z], yaw, pitch, roll = 0) {
  const yawCos = Math.cos(yaw);
  const yawSin = Math.sin(yaw);
  const pitchCos = Math.cos(pitch);
  const pitchSin = Math.sin(pitch);
  const rollCos = Math.cos(roll);
  const rollSin = Math.sin(roll);
  const rotatedX = x * yawCos + z * yawSin;
  const rotatedZ = -x * yawSin + z * yawCos;
  const rotatedY = y * pitchCos - rotatedZ * pitchSin;
  const pitchedZ = y * pitchSin + rotatedZ * pitchCos;
  return {
    x: rotatedX * rollCos - rotatedY * rollSin,
    y: rotatedX * rollSin + rotatedY * rollCos,
    z: pitchedZ,
  };
}

export function getWaterMoleculeBondAngleDegrees() {
  const [oxygen, firstHydrogen, secondHydrogen] = WATER_MOLECULE_ATOMS.map(({ position }) => position);
  const firstBond = firstHydrogen.map((coordinate, index) => coordinate - oxygen[index]);
  const secondBond = secondHydrogen.map((coordinate, index) => coordinate - oxygen[index]);
  const dotProduct = firstBond.reduce((sum, coordinate, index) => sum + coordinate * secondBond[index], 0);
  const firstLength = Math.hypot(...firstBond);
  const secondLength = Math.hypot(...secondBond);
  const cosine = Math.max(-1, Math.min(1, dotProduct / (firstLength * secondLength)));
  return (Math.acos(cosine) * 180) / Math.PI;
}

export function getWaterMoleculeBondLengthAngstroms() {
  return Math.hypot(...WATER_MOLECULE_ATOMS[1].position);
}

export function getLinearMarketEquilibrium(demandIntercept, supplyIntercept) {
  const demandSlope = 2;
  const supplySlope = 1;
  if (![demandIntercept, supplyIntercept].every(Number.isFinite) ||
    demandIntercept < 0 || supplyIntercept < 0 || supplyIntercept >= demandIntercept) return null;
  const quantity = (demandIntercept - supplyIntercept) / (demandSlope + supplySlope);
  const price = supplyIntercept + supplySlope * quantity;
  return { quantity, price, demandSlope, supplySlope };
}
