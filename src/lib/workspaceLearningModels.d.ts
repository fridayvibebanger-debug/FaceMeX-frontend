export type Point3D = [number, number, number];

export type LearningModelAtom = {
  id: string;
  label: 'O' | 'H';
  element: 'Oxygen' | 'Hydrogen';
  position: Point3D;
};

export const WATER_MOLECULE_ATOMS: LearningModelAtom[];
export const CUBE_VERTICES: Point3D[];
export const CUBE_EDGES: Array<[number, number]>;
export function rotatePoint3D(point: Point3D, yaw: number, pitch: number, roll?: number): {
  x: number;
  y: number;
  z: number;
};
export function getWaterMoleculeBondAngleDegrees(): number;
export function getWaterMoleculeBondLengthAngstroms(): number;
export function getLinearMarketEquilibrium(demandIntercept: number, supplyIntercept: number): {
  quantity: number;
  price: number;
  demandSlope: number;
  supplySlope: number;
} | null;
