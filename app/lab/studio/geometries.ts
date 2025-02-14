import * as THREE from 'three';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import { NDimensionalParams } from './types';

// Valid numbers of faces for Platonic solids
const PLATONIC_SOLIDS = {
  TETRAHEDRON: 4,
  CUBE: 6,
  OCTAHEDRON: 8,
  DODECAHEDRON: 12,
  ICOSAHEDRON: 20
} as const;

// Helper function to find nearest valid number of faces
function getNearestPlatonicSolid(n: number): number {
  const validFaces = Object.values(PLATONIC_SOLIDS);
  return validFaces.reduce((prev, curr) =>
    Math.abs(curr - n) < Math.abs(prev - n) ? curr : prev
  );
}

// Calculate optimal vertex count for a given number of faces using Euler's formula
// and edge-face relationships
function calculateOptimalVertices(faces: number): {
  vertices: number;
  edges: number;
  edgesPerFace: number;
} {
  // Try different edge configurations (3=triangular, 4=square, 5=pentagonal)
  const configurations = [3, 4, 5].map(edgesPerFace => {
    // Calculate edges using face-edge relationship: F * p = 2E
    // where F is faces, p is edges per face, E is total edges
    const edges = Math.ceil((faces * edgesPerFace) / 2);

    // Use Euler's formula to calculate vertices: V = 2 + E - F
    const vertices = 2 + edges - faces;

    // Verify the configuration meets constraints
    const isValid =
      vertices > 0 &&
      edges > 0 &&
      // Check 3F ≤ 2E constraint
      3 * faces <= 2 * edges &&
      // Check E ≤ 3V - 6 constraint
      edges <= 3 * vertices - 6 &&
      // Check edge-face relationship constraint
      edges * 2 >= edgesPerFace * faces;

    return {
      edgesPerFace,
      vertices,
      edges,
      error: isValid ? Math.abs(edges - (3 * vertices - 6) / 2) : Infinity // Minimize deviation from ideal
    };
  });

  // Choose the configuration with minimum error
  const bestConfig = configurations.reduce((prev, curr) =>
    curr.error < prev.error ? curr : prev
  );

  return {
    vertices: bestConfig.vertices,
    edges: bestConfig.edges,
    edgesPerFace: bestConfig.edgesPerFace
  };
}

// Generate vertices for regular polyhedra
function generateRegularPolyhedronVertices(sides: number, scale: number): THREE.Vector3[] {
  const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio

  // Handle Platonic solids first
  if (sides === PLATONIC_SOLIDS.TETRAHEDRON) {
    const a = scale / Math.sqrt(3);
    return [
      new THREE.Vector3(a, a, a),
      new THREE.Vector3(-a, -a, a),
      new THREE.Vector3(-a, a, -a),
      new THREE.Vector3(a, -a, -a)
    ];
  }

  if (sides === PLATONIC_SOLIDS.CUBE) {
    const a = scale / Math.sqrt(3);
    return [
      new THREE.Vector3(-a, -a, -a),
      new THREE.Vector3(a, -a, -a),
      new THREE.Vector3(a, a, -a),
      new THREE.Vector3(-a, a, -a),
      new THREE.Vector3(-a, -a, a),
      new THREE.Vector3(a, -a, a),
      new THREE.Vector3(a, a, a),
      new THREE.Vector3(-a, a, a)
    ];
  }

  if (sides === PLATONIC_SOLIDS.OCTAHEDRON) {
    const a = scale;
    return [
      new THREE.Vector3(a, 0, 0),
      new THREE.Vector3(-a, 0, 0),
      new THREE.Vector3(0, a, 0),
      new THREE.Vector3(0, -a, 0),
      new THREE.Vector3(0, 0, a),
      new THREE.Vector3(0, 0, -a)
    ];
  }

  if (sides === PLATONIC_SOLIDS.ICOSAHEDRON) {
    const a = scale / Math.sqrt(phi * Math.sqrt(5));
    const b = a * phi;
    return [
      new THREE.Vector3(0, b, -a),
      new THREE.Vector3(0, b, a),
      new THREE.Vector3(0, -b, -a),
      new THREE.Vector3(0, -b, a),
      new THREE.Vector3(a, 0, -b),
      new THREE.Vector3(a, 0, b),
      new THREE.Vector3(-a, 0, -b),
      new THREE.Vector3(-a, 0, b),
      new THREE.Vector3(b, -a, 0),
      new THREE.Vector3(b, a, 0),
      new THREE.Vector3(-b, -a, 0),
      new THREE.Vector3(-b, a, 0)
    ];
  }

  if (sides === PLATONIC_SOLIDS.DODECAHEDRON) {
    const b = scale / Math.sqrt(3);
    const c = b / phi;
    const d = b * phi;
    return [
      new THREE.Vector3(b, b, b),
      new THREE.Vector3(b, b, -b),
      new THREE.Vector3(b, -b, b),
      new THREE.Vector3(b, -b, -b),
      new THREE.Vector3(-b, b, b),
      new THREE.Vector3(-b, b, -b),
      new THREE.Vector3(-b, -b, b),
      new THREE.Vector3(-b, -b, -b),
      new THREE.Vector3(0, d, c),
      new THREE.Vector3(0, d, -c),
      new THREE.Vector3(0, -d, c),
      new THREE.Vector3(0, -d, -c),
      new THREE.Vector3(c, 0, d),
      new THREE.Vector3(-c, 0, d),
      new THREE.Vector3(c, 0, -d),
      new THREE.Vector3(-c, 0, -d),
      new THREE.Vector3(d, c, 0),
      new THREE.Vector3(d, -c, 0),
      new THREE.Vector3(-d, c, 0),
      new THREE.Vector3(-d, -c, 0)
    ];
  }

  // For non-Platonic numbers of faces, calculate optimal vertex configuration
  const { vertices: numVertices, edgesPerFace } = calculateOptimalVertices(sides);

  // Generate vertices using spherical fibonacci distribution
  const vertices: THREE.Vector3[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // Golden angle in radians

  for (let i = 0; i < numVertices; i++) {
    // Use spherical fibonacci distribution for optimal vertex spacing
    const y = 1 - (i / (numVertices - 1)) * 2; // y goes from 1 to -1
    const radius = Math.sqrt(1 - y * y); // radius at y

    // Adjust spacing based on preferred face type
    const theta = goldenAngle * i * (edgesPerFace / 3); // Scale angle based on face type

    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;

    vertices.push(new THREE.Vector3(x * scale, y * scale, z * scale));
  }

  return vertices;
}

// Generate a polyhedron with the given number of vertices
export function generatePolyhedron(params: NDimensionalParams): THREE.BufferGeometry {
  const { sides } = params;
  const FIXED_SCALE = 1.5;

  // Handle special cases
  if (sides === 1) {
    return new THREE.SphereGeometry(FIXED_SCALE * 0.1, 8, 8);
  }
  if (sides === 2) {
    return new THREE.CylinderGeometry(
      FIXED_SCALE * 0.05,
      FIXED_SCALE * 0.05,
      FIXED_SCALE * 2,
      8,
      1,
      true
    );
  }
  if (sides === 3) {
    const h = FIXED_SCALE * Math.sqrt(3) / 2;
    return new ConvexGeometry([
      new THREE.Vector3(FIXED_SCALE, 0, 0),
      new THREE.Vector3(-FIXED_SCALE * 0.5, h, 0),
      new THREE.Vector3(-FIXED_SCALE * 0.5, -h, 0)
    ]);
  }

  // Generate vertices based on the number of sides
  const vertices = generateRegularPolyhedronVertices(sides, FIXED_SCALE);

  // Create convex hull from vertices
  return new ConvexGeometry(vertices);
}