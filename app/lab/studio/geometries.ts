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
  const { vertices: numVertices } = calculateOptimalVertices(sides);

  // Generate vertices using spherical fibonacci distribution
  const vertices: THREE.Vector3[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // Golden angle in radians
  const numPoints = Math.max(numVertices, sides * 2); // Ensure enough points for face count

  for (let i = 0; i < numPoints; i++) {
    // Use spherical fibonacci distribution for optimal vertex spacing
    const t = i / (numPoints - 1);
    const inclination = Math.acos(2 * t - 1) - Math.PI / 2;
    const azimuth = goldenAngle * i;

    // Convert spherical coordinates to Cartesian
    const x = Math.cos(inclination) * Math.cos(azimuth);
    const y = Math.cos(inclination) * Math.sin(azimuth);
    const z = Math.sin(inclination);

    vertices.push(new THREE.Vector3(x * scale, y * scale, z * scale));
  }

  // Add some random jitter to vertices to create more interesting shapes for high face counts
  if (sides > 20) {
    const jitterAmount = 0.1; // 10% jitter
    vertices.forEach(vertex => {
      vertex.x += (Math.random() - 0.5) * jitterAmount * scale;
      vertex.y += (Math.random() - 0.5) * jitterAmount * scale;
      vertex.z += (Math.random() - 0.5) * jitterAmount * scale;
    });
  }

  return vertices;
}

// Store the current random parameters for regeneration
let currentRandomParams: {
  radialAmplitudes: number[];
  heightAmplitudes: number[];
  phases: number[];
} | null = null;

// Export current params for saving
export function getCurrentRandomParams() {
  return currentRandomParams;
}

// Set specific random params
export function setCurrentRandomParams(params: {
  radialAmplitudes: number[];
  heightAmplitudes: number[];
  phases: number[];
} | null) {
  currentRandomParams = params;
}

function generateRandomParams(sides: number): {
  radialAmplitudes: number[];
  heightAmplitudes: number[];
  phases: number[];
} {
  // Use 3 sets of sine waves for complexity
  const numWaves = 3;
  const radialAmplitudes = Array.from({ length: numWaves }, () => Math.random() * 0.5);
  const heightAmplitudes = Array.from({ length: numWaves }, () => Math.random() * 0.5);
  const phases = Array.from({ length: numWaves }, () => Math.random() * Math.PI * 2);

  return {
    radialAmplitudes,
    heightAmplitudes,
    phases
  };
}

function generateSymmetricVertices(sides: number, scale: number, randomParams?: {
  radialAmplitudes: number[];
  heightAmplitudes: number[];
  phases: number[];
}): THREE.Vector3[] {
  // Generate or use provided random parameters
  const params = randomParams || generateRandomParams(sides);
  currentRandomParams = params;

  const vertices: THREE.Vector3[] = [];
  const numRings = Math.max(2, Math.floor(sides / 8)); // At least 2 rings, more for higher face counts

  // Generate vertices in rings
  for (let ring = 0; ring <= numRings; ring++) {
    const ringY = (ring / numRings) * 2 - 1; // -1 to 1
    const ringRadius = Math.sqrt(1 - ringY * ringY); // Base radius follows sphere profile
    const pointsInRing = ring === 0 || ring === numRings ? 1 : sides;

    if (pointsInRing === 1) {
      // Pole points
      vertices.push(new THREE.Vector3(0, ringY * scale, 0));
      continue;
    }

    for (let i = 0; i < pointsInRing; i++) {
      const angle = (i / pointsInRing) * Math.PI * 2;

      // Apply sine wave modifications
      let radiusModifier = 1;
      let heightModifier = 0;

      params.radialAmplitudes.forEach((amp, idx) => {
        const freq = idx + 1;
        radiusModifier += amp * Math.sin(freq * angle + params.phases[idx]);
      });

      params.heightAmplitudes.forEach((amp, idx) => {
        const freq = idx + 1;
        heightModifier += amp * Math.sin(freq * angle + params.phases[idx]);
      });

      // Calculate final position
      const radius = ringRadius * radiusModifier;
      const x = Math.cos(angle) * radius * scale;
      const y = (ringY + heightModifier * (1 - Math.abs(ringY))) * scale;
      const z = Math.sin(angle) * radius * scale;

      vertices.push(new THREE.Vector3(x, y, z));
    }
  }

  return vertices;
}

// Update the generatePolyhedron function
export function generatePolyhedron(params: NDimensionalParams, forceNewRandom: boolean = false): THREE.BufferGeometry {
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

  // Use Platonic solids for specific face counts
  if (!forceNewRandom && Object.values(PLATONIC_SOLIDS).includes(sides as any)) {
    const vertices = generateRegularPolyhedronVertices(sides as any, FIXED_SCALE);
    return new ConvexGeometry(vertices);
  }

  // For all other cases, generate symmetric random shape
  const vertices = generateSymmetricVertices(
    sides,
    FIXED_SCALE,
    forceNewRandom ? undefined : currentRandomParams || undefined
  );

  return new ConvexGeometry(vertices);
}