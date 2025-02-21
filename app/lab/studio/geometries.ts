import * as THREE from 'three';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import { NDimensionalParams } from './types';

// Valid numbers of faces for Platonic solids
const PLATONIC_SOLIDS = {
  TETRAHEDRON: 4,
  CUBE: 6,
  OCTAHEDRON: 8,
  DODECAHEDRON: 12,
  ICOSAHEDRON: 20,
} as const;

// Icosahedron base vertices and faces for geodesic sphere generation
const ICOSAHEDRON_VERTICES = [
  0.0,
  1.0,
  0.0, // 0: top vertex
  0.894,
  0.447,
  0.0, // 1: upper ring
  0.276,
  0.447,
  0.851, // 2
  -0.724,
  0.447,
  0.526, // 3
  -0.724,
  0.447,
  -0.526, // 4
  0.276,
  0.447,
  -0.851, // 5
  0.724,
  -0.447,
  0.526, // 6: lower ring
  -0.276,
  -0.447,
  0.851, // 7
  -0.894,
  -0.447,
  0.0, // 8
  -0.276,
  -0.447,
  -0.851, // 9
  0.724,
  -0.447,
  -0.526, // 10
  0.0,
  -1.0,
  0.0, // 11: bottom vertex
];

const ICOSAHEDRON_FACES = [
  0,
  2,
  1,
  0,
  3,
  2,
  0,
  4,
  3,
  0,
  5,
  4,
  0,
  1,
  5, // top cap
  1,
  2,
  6,
  2,
  3,
  7,
  3,
  4,
  8,
  4,
  5,
  9,
  5,
  1,
  10, // upper middle
  2,
  7,
  6,
  3,
  8,
  7,
  4,
  9,
  8,
  5,
  10,
  9,
  1,
  6,
  10, // lower middle
  6,
  7,
  11,
  7,
  8,
  11,
  8,
  9,
  11,
  9,
  10,
  11,
  10,
  6,
  11, // bottom cap
];

// Helper function to normalize a vector
function normalizeVector(v: THREE.Vector3): THREE.Vector3 {
  const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  return new THREE.Vector3(v.x / length, v.y / length, v.z / length);
}

// Helper function to get midpoint between two vectors
function getMidpoint(v1: THREE.Vector3, v2: THREE.Vector3): THREE.Vector3 {
  return normalizeVector(new THREE.Vector3((v1.x + v2.x) / 2, (v1.y + v2.y) / 2, (v1.z + v2.z) / 2));
}

// Generate a geodesic sphere with the target number of faces
function generateGeodesicSphere(targetFaces: number, scale: number): { vertices: number[]; indices: number[] } {
  // Convert icosahedron vertices to Vector3 array
  const baseVertices: THREE.Vector3[] = [];
  for (let i = 0; i < ICOSAHEDRON_VERTICES.length; i += 3) {
    baseVertices.push(
      new THREE.Vector3(ICOSAHEDRON_VERTICES[i], ICOSAHEDRON_VERTICES[i + 1], ICOSAHEDRON_VERTICES[i + 2])
    );
  }

  // Each subdivision multiplies face count by 4
  // Starting from icosahedron (20 faces)
  // Calculate frequency to get closest to target faces
  let frequency = 1;
  let currentFaces = 20;
  while (currentFaces < targetFaces) {
    frequency++;
    currentFaces *= 4;
  }

  // If we overshot by a lot, go back one step
  if (currentFaces > targetFaces * 2) {
    frequency = Math.max(1, frequency - 1);
  }

  let vertices: THREE.Vector3[] = [...baseVertices];
  let indices: number[] = [...ICOSAHEDRON_FACES];

  // Subdivide faces
  for (let i = 0; i < frequency - 1; i++) {
    const newIndices: number[] = [];
    const vertexMap = new Map<string, number>();

    // Helper to get or create vertex
    const getVertexIndex = (v: THREE.Vector3): number => {
      const key = `${Math.round(v.x * 1000)},${Math.round(v.y * 1000)},${Math.round(v.z * 1000)}`;
      if (!vertexMap.has(key)) {
        vertexMap.set(key, vertices.length);
        vertices.push(v);
      }
      return vertexMap.get(key)!;
    };

    // Subdivide each triangle
    for (let f = 0; f < indices.length; f += 3) {
      const v1 = vertices[indices[f]];
      const v2 = vertices[indices[f + 1]];
      const v3 = vertices[indices[f + 2]];

      const v12 = getMidpoint(v1, v2);
      const v23 = getMidpoint(v2, v3);
      const v31 = getMidpoint(v3, v1);

      const i1 = indices[f];
      const i2 = indices[f + 1];
      const i3 = indices[f + 2];
      const i12 = getVertexIndex(v12);
      const i23 = getVertexIndex(v23);
      const i31 = getVertexIndex(v31);

      // Create 4 new triangles
      newIndices.push(i1, i12, i31, i12, i2, i23, i31, i23, i3, i12, i23, i31);
    }

    indices = newIndices;
  }

  // Scale vertices
  vertices = vertices.map((v) => new THREE.Vector3(v.x * scale, v.y * scale, v.z * scale));

  // Convert vertices to flat array
  const vertexArray = vertices.flatMap((v) => [v.x, v.y, v.z]);

  return {
    vertices: vertexArray,
    indices: indices,
  };
}

// Generate vertices for Platonic solids
function generatePlatonicSolid(sides: number, scale: number): { vertices: number[]; indices: number[] } {
  if (sides === PLATONIC_SOLIDS.TETRAHEDRON) {
    const a = scale / Math.sqrt(3);
    return {
      vertices: [a, a, a, -a, -a, a, -a, a, -a, a, -a, -a],
      indices: [2, 1, 0, 0, 3, 2, 1, 3, 0, 2, 3, 1],
    };
  }

  if (sides === PLATONIC_SOLIDS.CUBE) {
    const a = scale / Math.sqrt(3);
    return {
      vertices: [
        -a,
        -a,
        -a, // 0
        a,
        -a,
        -a, // 1
        a,
        a,
        -a, // 2
        -a,
        a,
        -a, // 3
        -a,
        -a,
        a, // 4
        a,
        -a,
        a, // 5
        a,
        a,
        a, // 6
        -a,
        a,
        a, // 7
      ],
      indices: [
        0,
        1,
        2,
        0,
        2,
        3, // front
        5,
        4,
        7,
        5,
        7,
        6, // back
        4,
        0,
        3,
        4,
        3,
        7, // left
        1,
        5,
        6,
        1,
        6,
        2, // right
        4,
        5,
        1,
        4,
        1,
        0, // bottom
        3,
        2,
        6,
        3,
        6,
        7, // top
      ],
    };
  }

  if (sides === PLATONIC_SOLIDS.OCTAHEDRON) {
    const a = scale;
    return {
      vertices: [
        a,
        0,
        0, // 0
        -a,
        0,
        0, // 1
        0,
        a,
        0, // 2
        0,
        -a,
        0, // 3
        0,
        0,
        a, // 4
        0,
        0,
        -a, // 5
      ],
      indices: [0, 2, 4, 2, 1, 4, 1, 3, 4, 3, 0, 4, 2, 0, 5, 1, 2, 5, 3, 1, 5, 0, 3, 5],
    };
  }

  // For icosahedron and dodecahedron, use the base geodesic sphere implementation
  // but without subdivision
  return generateGeodesicSphere(sides, scale);
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
export function setCurrentRandomParams(
  params: {
  radialAmplitudes: number[];
  heightAmplitudes: number[];
  phases: number[];
  } | null
) {
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
    phases,
  };
}

// Add new function to determine appropriate face types
function determinePolygonSides(targetFaces: number): number {
  // For low face counts, use regular polygons
  if (targetFaces <= 4) return 3; // triangles
  if (targetFaces <= 6) return 4; // quads
  if (targetFaces <= 12) return 5; // pentagons
  if (targetFaces <= 20) return 3; // back to triangles for icosahedron

  // For higher face counts, use a mix of polygons
  // More sides for fewer faces, fewer sides for more faces
  return Math.max(3, Math.min(6, Math.floor(20 / Math.sqrt(targetFaces))));
}

// Update generateSymmetricVertices to create appropriate polygon faces
function generateSymmetricVertices(
  sides: number,
  scale: number,
  randomParams?: {
  radialAmplitudes: number[];
  heightAmplitudes: number[];
  phases: number[];
  }
): THREE.Vector3[] {
  // Generate or use provided random parameters
  const params = randomParams || generateRandomParams(sides);
  currentRandomParams = params;

  const vertices: THREE.Vector3[] = [];
  const numRings = Math.max(2, Math.floor(sides / 8)); // At least 2 rings
  const polygonSides = determinePolygonSides(sides);

  // Generate vertices in rings with polygon-appropriate spacing
  for (let ring = 0; ring <= numRings; ring++) {
    const ringY = (ring / numRings) * 2 - 1; // -1 to 1
    const ringRadius = Math.sqrt(1 - ringY * ringY); // Base radius follows sphere profile

    // Adjust points in ring based on polygon sides
    const pointsInRing = ring === 0 || ring === numRings ? 1 : Math.max(polygonSides, Math.floor(sides / numRings));

    if (pointsInRing === 1) {
      // Pole points
      vertices.push(new THREE.Vector3(0, ringY * scale, 0));
      continue;
    }

    // Add slight rotation offset to each ring for more interesting shapes
    const ringOffset = ring * (Math.PI / pointsInRing);

    for (let i = 0; i < pointsInRing; i++) {
      const angle = (i / pointsInRing) * Math.PI * 2 + ringOffset;

      // Apply sine wave modifications with polygon-appropriate frequencies
      let radiusModifier = 1;
      let heightModifier = 0;

      // Adjust wave frequencies based on polygon sides
      const baseFreq = (Math.PI * 2) / polygonSides;
      params.radialAmplitudes.forEach((amp, idx) => {
        const freq = (idx + 1) * baseFreq;
        radiusModifier += amp * Math.sin(freq * angle + params.phases[idx]);
      });

      params.heightAmplitudes.forEach((amp, idx) => {
        const freq = (idx + 1) * baseFreq;
        heightModifier += amp * Math.sin(freq * angle + params.phases[idx]);
      });

      // Add some controlled randomness to vertex positions
      const jitter = (Math.random() - 0.5) * 0.1 * (1 - Math.abs(ringY));
      const radius = (ringRadius + jitter) * radiusModifier;

      // Calculate final position
      const x = Math.cos(angle) * radius * scale;
      const y = (ringY + heightModifier * (1 - Math.abs(ringY))) * scale;
      const z = Math.sin(angle) * radius * scale;

      vertices.push(new THREE.Vector3(x, y, z));
    }
  }

  return vertices;
}

// Store the current vertices for face generation
let vertices: THREE.Vector3[] = [];

// Add new function to generate polyhedron faces
function generatePolyhedronFaces(sides: number): number[] {
  // For Platonic solids, define faces explicitly with triangles
  if (sides === PLATONIC_SOLIDS.TETRAHEDRON) {
    return [
      2,
      1,
      0, // face 1
      0,
      3,
      2, // face 2
      1,
      3,
      0, // face 3
      2,
      3,
      1, // face 4
    ];
  }

  if (sides === PLATONIC_SOLIDS.CUBE) {
    // Each quad face must be split into two triangles
    return [
      0,
      1,
      2,
      0,
      2,
      3, // front face
      5,
      4,
      7,
      5,
      7,
      6, // back face
      4,
      0,
      3,
      4,
      3,
      7, // left face
      1,
      5,
      6,
      1,
      6,
      2, // right face
      4,
      5,
      1,
      4,
      1,
      0, // top face
      3,
      2,
      6,
      3,
      6,
      7, // bottom face
    ];
  }

  if (sides === PLATONIC_SOLIDS.OCTAHEDRON) {
    return [
      0,
      2,
      4, // top front
      2,
      1,
      4, // top right
      1,
      3,
      4, // bottom right
      3,
      0,
      4, // bottom front
      2,
      0,
      5, // top back
      1,
      2,
      5, // right back
      3,
      1,
      5, // bottom back
      0,
      3,
      5, // left back
    ];
  }

  if (sides === PLATONIC_SOLIDS.DODECAHEDRON) {
    // Convert pentagon faces to triangles
    const faces: number[] = [];
    const pentagonFaces = [
      [0, 1, 2, 3, 4], // top pentagon
      [5, 6, 7, 8, 9], // upper middle pentagon
      [10, 11, 12, 13, 14], // lower middle pentagon
      [15, 16, 17, 18, 19], // bottom pentagon
    ];

    // Triangulate each pentagon by creating triangles from center to edges
    pentagonFaces.forEach((pentagon) => {
      const center = pentagon
        .reduce((acc, idx) => {
          acc.x += vertices[idx].x;
          acc.y += vertices[idx].y;
          acc.z += vertices[idx].z;
          return acc;
        }, new THREE.Vector3())
        .divideScalar(5);

      // Add center vertex
      vertices.push(center);
      const centerIdx = vertices.length - 1;

      // Create triangles from center to edges
      for (let i = 0; i < pentagon.length; i++) {
        faces.push(centerIdx, pentagon[i], pentagon[(i + 1) % pentagon.length]);
      }
    });

    return faces;
  }

  // For other shapes, generate triangulated faces based on vertex rings
  const faces: number[] = [];
  const numRings = Math.max(2, Math.floor(sides / 8));
  let vertexIndex = 0;

  for (let ring = 0; ring < numRings; ring++) {
    const pointsInCurrentRing =
      ring === 0 || ring === numRings - 1 ? 1 : Math.max(determinePolygonSides(sides), Math.floor(sides / numRings));
    const pointsInNextRing =
      ring + 1 === numRings ? 1 : Math.max(determinePolygonSides(sides), Math.floor(sides / numRings));

    // Connect vertices between rings
    for (let i = 0; i < pointsInCurrentRing; i++) {
      const nextI = (i + 1) % pointsInCurrentRing;

      if (ring === 0) {
        // Connect top vertex to first ring (already triangles)
        faces.push(0, vertexIndex + i + 1, vertexIndex + nextI + 1);
      } else if (ring === numRings - 1) {
        // Connect last ring to bottom vertex (already triangles)
        const lastVertex = vertexIndex + pointsInCurrentRing;
        faces.push(vertexIndex + i, lastVertex, vertexIndex + nextI);
      } else {
        // Connect between rings - split quad into two triangles
        const nextRingStart = vertexIndex + pointsInCurrentRing;
        const nextRingI = nextRingStart + i;
        const nextRingNextI = nextRingStart + ((i + 1) % pointsInNextRing);

        // First triangle
        faces.push(vertexIndex + i, nextRingI, vertexIndex + nextI);

        // Second triangle
        faces.push(vertexIndex + nextI, nextRingI, nextRingNextI);
      }
    }
    vertexIndex += pointsInCurrentRing;
  }

  return faces;
}

// Define types for face composition
interface FaceComposition {
  triangles: number;
  squares: number;
  pentagons: number;
}

// Get possible face compositions for a target face count
function getFaceCompositions(targetFaces: number): FaceComposition[] {
  // Special cases for low face counts
  if (targetFaces <= 0) return [{ triangles: 0, squares: 0, pentagons: 0 }];
  if (targetFaces === 1) return [{ triangles: 0, squares: 1, pentagons: 0 }];
  if (targetFaces === 2) return [{ triangles: 2, squares: 0, pentagons: 0 }];
  if (targetFaces === 3) return [{ triangles: 3, squares: 0, pentagons: 0 }];
  if (targetFaces === 4) return [{ triangles: 4, squares: 0, pentagons: 0 }];
  if (targetFaces === 5)
    return [
      { triangles: 4, squares: 1, pentagons: 0 },
      { triangles: 5, squares: 0, pentagons: 0 },
    ];
  if (targetFaces === 6) return [{ triangles: 0, squares: 6, pentagons: 0 }];

  // For higher counts, generate valid combinations
  const compositions: FaceComposition[] = [];

  // Maximum number of pentagons we'll consider
  const maxPentagons = Math.floor(targetFaces / 5);

  for (let p = 0; p <= maxPentagons; p++) {
    const remainingFaces = targetFaces - p * 5;
    const maxSquares = Math.floor(remainingFaces / 4);

    for (let s = 0; s <= maxSquares; s++) {
      const triangles = remainingFaces - s * 4;
      if (triangles >= 0 && triangles % 1 === 0) {
        compositions.push({
          triangles,
          squares: s,
          pentagons: p,
        });
      }
    }
  }

  return compositions;
}

// Helper to get a random composition for a target face count
function getRandomComposition(targetFaces: number): FaceComposition {
  const compositions = getFaceCompositions(targetFaces);
  return compositions[Math.floor(Math.random() * compositions.length)];
}

// Helper function to generate a random point on a unit sphere
function randomPointOnSphere(scale: number = 1): THREE.Vector3 {
  const u = Math.random(); // Random value in [0, 1)
  const v = Math.random(); // Random value in [0, 1)
  const theta = 2 * Math.PI * u; // Azimuth angle [0, 2π)
  const phi = Math.acos(2 * v - 1); // Polar angle adjusted for uniformity
  const x = Math.sin(phi) * Math.cos(theta);
  const y = Math.sin(phi) * Math.sin(theta);
  const z = Math.cos(phi);
  return new THREE.Vector3(x, y, z).multiplyScalar(scale);
}

// Add helper function to calculate face centers
function calculateFaceCenters(geometry: THREE.BufferGeometry): THREE.Vector3[] {
  const centers: THREE.Vector3[] = [];
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();

  if (!index) return centers;

  // Process each triangle
  for (let i = 0; i < index.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(position, index.getX(i));
    const b = new THREE.Vector3().fromBufferAttribute(position, index.getX(i + 1));
    const c = new THREE.Vector3().fromBufferAttribute(position, index.getX(i + 2));

    // Calculate face center
    const center = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3);

    centers.push(center);
  }

  return centers;
}

// Update generatePolyhedron to include face centers and numbers
export function generatePolyhedron(params: NDimensionalParams, forceNewRandom: boolean = false): THREE.BufferGeometry {
  const { sides } = params;
  const FIXED_SCALE = 1.5;

  // Special cases for very low face counts
  if (sides === 1) {
    const geometry = new THREE.CircleGeometry(FIXED_SCALE, 32);
    // Add face center and index for single face
    const center = new THREE.Vector3(0, 0, 0);
    const faceCenters = new Float32Array([center.x, center.y, center.z]);
    const faceIndices = new Float32Array([0]);

    // Repeat the center and index for each vertex
    const numVertices = geometry.getAttribute('position').count;
    const repeatedCenters = new Float32Array(numVertices * 3);
    const repeatedIndices = new Float32Array(numVertices);

    for (let i = 0; i < numVertices; i++) {
      repeatedCenters[i * 3] = center.x;
      repeatedCenters[i * 3 + 1] = center.y;
      repeatedCenters[i * 3 + 2] = center.z;
      repeatedIndices[i] = 0;
    }

    geometry.setAttribute('faceCenter', new THREE.BufferAttribute(repeatedCenters, 3));
    geometry.setAttribute('faceIndex', new THREE.BufferAttribute(repeatedIndices, 1));
    return geometry;
  }

  // For Platonic solids and higher face counts
  try {
    let geometry: THREE.BufferGeometry;

    if (Object.values(PLATONIC_SOLIDS).includes(sides as any)) {
      const { vertices, indices } = generatePlatonicSolid(sides, FIXED_SCALE);
      geometry = new THREE.PolyhedronGeometry(vertices, indices, FIXED_SCALE, 0);
    } else {
      // Generate points for convex hull
      const points: THREE.Vector3[] = [];
      const numVertices = Math.max(sides * 2, 12);

      // Surface points
      for (let i = 0; i < numVertices; i++) {
        points.push(randomPointOnSphere(FIXED_SCALE));
      }

      // Internal points
      const numInternalPoints = Math.min(sides, 8);
      for (let i = 0; i < numInternalPoints; i++) {
        points.push(randomPointOnSphere(FIXED_SCALE * 0.5));
      }

      geometry = new ConvexGeometry(points);
    }

    // Ensure we have indices
    if (!geometry.getIndex()) {
      const position = geometry.getAttribute('position');
      const indices = [];
      for (let i = 0; i < position.count; i += 3) {
        indices.push(i, i + 1, i + 2);
      }
      geometry.setIndex(indices);
    }

    // Calculate face centers
    const position = geometry.getAttribute('position');
    const index = geometry.getIndex()!;
    const faceCenters: number[] = [];
    const vertexFaceCenters: number[] = [];
    const vertexFaceIndices: number[] = [];

    // Map to store vertex to face associations
    const vertexFaces = new Map<number, Set<number>>();

    // Calculate face centers and build vertex-face associations
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i);
      const b = index.getX(i + 1);
      const c = index.getX(i + 2);

      const faceIndex = i / 3;

      // Store face associations for each vertex
      [a, b, c].forEach((vertexIndex) => {
        if (!vertexFaces.has(vertexIndex)) {
          vertexFaces.set(vertexIndex, new Set());
        }
        vertexFaces.get(vertexIndex)!.add(faceIndex);
      });

      // Calculate face center
      const va = new THREE.Vector3().fromBufferAttribute(position, a);
      const vb = new THREE.Vector3().fromBufferAttribute(position, b);
      const vc = new THREE.Vector3().fromBufferAttribute(position, c);

      const center = new THREE.Vector3().add(va).add(vb).add(vc).divideScalar(3);

      faceCenters.push(center.x, center.y, center.z);
    }

    // Create per-vertex attributes
    for (let i = 0; i < position.count; i++) {
      const faces = vertexFaces.get(i) || new Set();
      const faceList = Array.from(faces);

      if (faceList.length > 0) {
        // Use the first associated face's center and index
        const faceIndex = faceList[0];
        vertexFaceCenters.push(
          faceCenters[faceIndex * 3],
          faceCenters[faceIndex * 3 + 1],
          faceCenters[faceIndex * 3 + 2]
        );
        vertexFaceIndices.push(faceIndex);
      } else {
        // Fallback values if no face association found
        vertexFaceCenters.push(0, 0, 0);
        vertexFaceIndices.push(0);
      }
    }

    // Add attributes to geometry
    geometry.setAttribute('faceCenter', new THREE.Float32BufferAttribute(vertexFaceCenters, 3));
    geometry.setAttribute('faceIndex', new THREE.Float32BufferAttribute(vertexFaceIndices, 1));

    geometry.computeVertexNormals();
    return geometry;
  } catch (error) {
    console.warn('Failed to create geometry, falling back to octahedron:', error);

    // Create backup octahedron
    const geometry = new THREE.OctahedronGeometry(FIXED_SCALE, 0);

    // Add face centers and indices
    const position = geometry.getAttribute('position');
    const vertexFaceCenters = new Float32Array(position.count * 3).fill(0);
    const vertexFaceIndices = new Float32Array(position.count).fill(0);

    geometry.setAttribute('faceCenter', new THREE.BufferAttribute(vertexFaceCenters, 3));
    geometry.setAttribute('faceIndex', new THREE.BufferAttribute(vertexFaceIndices, 1));

    return geometry;
  }
}
