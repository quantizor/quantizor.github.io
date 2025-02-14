export type ProjectionType = 'orthographic' | 'stereographic';

export interface GeometryType {
  id: string;
  name: string;
  description: string;
}

export interface NDimensionalParams {
  sides: number; // Number of sides/divisions for deformation pattern
}

export const GEOMETRY_TYPES: GeometryType[] = [
  {
    id: 'tetrahedron',
    name: 'Tetrahedron',
    description: 'Regular 4-sided Platonic solid',
  },
  {
    id: 'cube',
    name: 'Cube',
    description: 'Regular 6-sided Platonic solid',
  },
  {
    id: 'octahedron',
    name: 'Octahedron',
    description: 'Regular 8-sided Platonic solid',
  },
  {
    id: 'dodecahedron',
    name: 'Dodecahedron',
    description: 'Regular 12-sided Platonic solid',
  },
  {
    id: 'icosahedron',
    name: 'Icosahedron',
    description: 'Regular 20-sided Platonic solid',
  },
  {
    id: 'hypercube',
    name: 'Hypercube',
    description: 'N-dimensional analog of a cube',
  },
  {
    id: 'hypersphere',
    name: 'Hypersphere',
    description: 'N-dimensional analog of a sphere',
  },
  {
    id: 'klein',
    name: 'Klein Bottle',
    description: 'Non-orientable surface with no inside or outside',
  },
];