import { ArrowsClockwise, Cube, CubeTransparent, Palette, Shuffle, SmileyMelting } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { generatePolyhedron, getCurrentRandomParams, setCurrentRandomParams } from './geometries';
import { NDimensionalParams, SavedShape } from './types';

const STORAGE_KEY = 'polyhedron-simulator-settings';
const CAMERA_STORAGE_KEY = 'polyhedron-simulator-camera';
const SAVED_SHAPES_KEY = 'polyhedron-simulator-saved-shapes';
const APPEARANCE_KEY = 'polyhedron-simulator-appearance';

interface CameraState {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  quaternion: { x: number; y: number; z: number; w: number };
  zoom: number;
  rootRotation: { x: number; y: number; z: number; w: number };
}

interface AppearanceState {
  isShaded: boolean;
  isRotating: boolean;
  gradientStart: string;
  gradientEnd: string;
  colorScheme: 'classic' | 'neon' | 'sunset' | 'ocean';
}

const DEFAULT_CAMERA_STATE: CameraState = {
  position: { x: 0, y: 0, z: 3 },
  target: { x: 0, y: 0, z: 0 },
  quaternion: { x: 0, y: 0, z: 0, w: 1 },
  zoom: 1,
  rootRotation: { x: 0, y: 0, z: 0, w: 1 },
};

const DEFAULT_PARAMS: NDimensionalParams = {
  sides: 4, // Start with tetrahedron as default
};

function createWireframeFromGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const wireframeGeometry = new THREE.BufferGeometry();
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();

  if (index) {
    // Create a set to store unique edges
    const edges = new Set<string>();
    const vertices: number[] = [];

    // Process each triangle
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i);
      const b = index.getX(i + 1);
      const c = index.getX(i + 2);

      // Add each edge (ensuring consistent ordering)
      [
        [a, b],
        [b, c],
        [c, a],
      ].forEach(([v1, v2]) => {
        const edgeKey = [Math.min(v1, v2), Math.max(v1, v2)].join(',');
        if (!edges.has(edgeKey)) {
          edges.add(edgeKey);
          // Add both vertices of the edge
          vertices.push(
            position.getX(v1),
            position.getY(v1),
            position.getZ(v1),
            position.getX(v2),
            position.getY(v2),
            position.getZ(v2)
          );
        }
      });
    }

    // Create the line segments geometry
    wireframeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  } else {
    // If no index, create edges from raw triangles
    const vertices: number[] = [];
    for (let i = 0; i < position.count; i += 3) {
      // Add all three edges of each triangle
      for (let j = 0; j < 3; j++) {
        const v1 = i + j;
        const v2 = i + ((j + 1) % 3);
        vertices.push(
          position.getX(v1),
          position.getY(v1),
          position.getZ(v1),
          position.getX(v2),
          position.getY(v2),
          position.getZ(v2)
        );
      }
    }
    wireframeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  }

  return wireframeGeometry;
}

// Add new interface for morph state
interface MorphState {
  sourcePoints: THREE.Vector3[];
  targetPoints: THREE.Vector3[];
  progress: number;
  targetSides: number;
  originalGeometry?: THREE.BufferGeometry;
  phase: 'matching_faces' | 'final_shape';
  intermediateGeometry?: THREE.BufferGeometry;
  nextShowTarget?: {
    sides: number;
    startColor: string;
    endColor: string;
  };
}

export default function PolyStudio() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    geometry?: THREE.BufferGeometry;
    material?: THREE.Material;
    mesh?: THREE.Mesh;
    wireframe?: THREE.LineSegments;
    camera?: THREE.PerspectiveCamera;
    controls?: OrbitControls;
    group?: THREE.Group;
  }>({});
  const [isShaded, setIsShaded] = useState(true);
  const [isRotating, setIsRotating] = useState(true);
  const [params, setParams] = useState<NDimensionalParams>(DEFAULT_PARAMS);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [shapeName, setShapeName] = useState('');
  const [savedShapes, setSavedShapes] = useState<SavedShape[]>([]);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [gradientStart, setGradientStart] = useState('#666666');
  const [gradientEnd, setGradientEnd] = useState('#ffffff');
  const [colorScheme, setColorScheme] = useState<'classic' | 'neon' | 'sunset' | 'ocean'>('classic');
  const morphStateRef = useRef<MorphState | null>(null);
  const [morphComplete, setMorphComplete] = useState(false);
  const currentRotationRef = useRef(0);
  const lastRotationRef = useRef(0);
  const [isShowMode, setIsShowMode] = useState(false);

  // Color scheme presets
  const COLOR_SCHEMES = {
    classic: { start: '#666666', end: '#ffffff' },
    neon: { start: '#ff00ff', end: '#00ffff' },
    sunset: { start: '#ff6b6b', end: '#ffd93d' },
    ocean: { start: '#4facfe', end: '#00f2fe' },
  };

  // Update colors when scheme changes
  useEffect(() => {
    const scheme = COLOR_SCHEMES[colorScheme];
    setGradientStart(scheme.start);
    setGradientEnd(scheme.end);
  }, [colorScheme]);

  // Load saved shapes after mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVED_SHAPES_KEY);
      if (saved) {
        setSavedShapes(JSON.parse(saved));
      }
    } catch (error) {
      console.warn('Failed to load saved shapes:', error);
    }
  }, []);

  // Save shapes to localStorage when updated
  useEffect(() => {
    try {
      localStorage.setItem(SAVED_SHAPES_KEY, JSON.stringify(savedShapes));
    } catch (error) {
      console.warn('Failed to save shapes:', error);
    }
  }, [savedShapes]);

  const handleSaveShape = () => {
    if (!shapeName.trim()) return;

    const newShape: SavedShape = {
      id: crypto.randomUUID(),
      name: shapeName.trim(),
      params,
      randomParams: getCurrentRandomParams(),
      createdAt: Date.now(),
    };

    setSavedShapes((prev) => [...prev, newShape]);
    setShapeName('');
    setIsSaveModalOpen(false);
  };

  const handleLoadShape = (shape: SavedShape) => {
    setParams(shape.params);
    setCurrentRandomParams(shape.randomParams);
    setIsLoadModalOpen(false);

    // Force geometry update
    const group = sceneRef.current.group;
    if (!group) return;

    if (sceneRef.current.wireframe) {
      group.remove(sceneRef.current.wireframe);
      group.remove(sceneRef.current.mesh!);
      sceneRef.current.geometry?.dispose();
      sceneRef.current.material?.dispose();
    }

    const geometry = generatePolyhedron(shape.params);

    // Create solid mesh with shader material
    const meshMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0xffffff) },
        gradientStart: { value: new THREE.Color(gradientStart) },
        gradientEnd: { value: new THREE.Color(gradientEnd) },
      },
      vertexShader: `
        attribute vec3 faceCenter;
        attribute float faceIndex;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vWorldPosition;
        varying vec3 vFaceCenter;
        varying float vFaceIndex;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          vFaceCenter = (modelMatrix * vec4(faceCenter, 1.0)).xyz;
          vFaceIndex = faceIndex;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform vec3 gradientStart;
        uniform vec3 gradientEnd;

        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vWorldPosition;
        varying vec3 vFaceCenter;
        varying float vFaceIndex;

        // SDF (Signed Distance Field) for basic numerical digits
        float sdfNumber(vec2 p, float num) {
          p = abs(p);
          if (num == 0.0) return min(max(p.x-0.3, p.y-0.4), max(0.1-abs(p.x-0.15), 0.1-abs(p.y-0.2)));
          if (num == 1.0) return max(abs(p.x-0.15)-0.05, abs(p.y-0.2)-0.2);
          if (num == 2.0) {
            float d = p.y - 0.2;
            d = min(d, length(p - vec2(0.2, 0.3)) - 0.15);
            d = min(d, length(p - vec2(0.2, 0.1)) - 0.15);
            return d;
          }
          if (num == 3.0) {
            float d = length(p - vec2(0.15, 0.3)) - 0.15;
            d = min(d, length(p - vec2(0.15, 0.2)) - 0.12);
            d = min(d, length(p - vec2(0.15, 0.1)) - 0.15);
            return d;
          }
          if (num == 4.0) {
            float d = max(abs(p.x-0.2)-0.2, abs(p.y-0.25)-0.15);
            d = min(d, max(abs(p.x-0.1)-0.05, p.y-0.4));
            return d;
          }
          if (num == 5.0) {
            float d = p.y - 0.2;
            d = min(d, length(p - vec2(0.1, 0.3)) - 0.15);
            d = min(d, length(p - vec2(0.3, 0.1)) - 0.15);
            return d;
          }
          if (num == 6.0) {
            float d = length(p - vec2(0.2, 0.2)) - 0.2;
            d = min(d, length(p - vec2(0.1, 0.3)) - 0.15);
            return d;
          }
          if (num == 7.0) {
            float d = max(abs(p.x-0.2)-0.2, p.y-0.4);
            d = min(d, max(abs(p.y-0.2)-0.2, p.x-0.4));
            return d;
          }
          if (num == 8.0) {
            float d = length(p - vec2(0.2, 0.3)) - 0.15;
            d = min(d, length(p - vec2(0.2, 0.1)) - 0.15);
            return d;
          }
          if (num == 9.0) {
            float d = length(p - vec2(0.2, 0.2)) - 0.2;
            d = min(d, length(p - vec2(0.3, 0.3)) - 0.15);
            return d;
          }
          return 1.0;
        }

        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);
          float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 2.0);
          vec3 finalColor = mix(gradientEnd, gradientStart, fresnel);

          // Add basic lighting
          vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
          float diffuse = max(dot(normal, lightDir), 0.2);
          vec3 baseColor = finalColor * diffuse;

          // Calculate distance to face center and create a coordinate system for the number
          vec3 toCenter = vWorldPosition - vFaceCenter;
          float distToCenter = length(toCenter);

          // Project the point onto the face plane
          vec3 up = normalize(normal);
          vec3 right = normalize(cross(up, vec3(0.0, 1.0, 0.0)));
          vec3 forward = cross(right, up);

          // Calculate 2D coordinates in face plane
          vec2 faceCoord = vec2(
            dot(toCenter, right),
            dot(toCenter, forward)
          ) * 3.0; // Scale factor for number size

          // Get the digit to display (1-based index)
          float digit = mod(vFaceIndex + 1.0, 10.0);

          // Calculate the SDF for the number
          float numberDist = sdfNumber(faceCoord, digit);

          // Create sharp number edges with some anti-aliasing
          float numberMask = 1.0 - smoothstep(-0.01, 0.01, numberDist);

          // Fade out numbers near edges of faces
          float edgeFade = 1.0 - smoothstep(0.3, 0.4, distToCenter);
          numberMask *= edgeFade;

          // Mix the number with the base color
          vec3 numberColor = vec3(1.0); // White numbers
          vec3 mixedColor = mix(baseColor, numberColor, numberMask);

          gl_FragColor = vec4(mixedColor, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, meshMaterial);
    mesh.visible = isShaded;

    // Create wireframe
    const frontWireframeMaterial = new THREE.LineBasicMaterial({
      color: isShaded ? 0x444444 : 0xffffff,
      transparent: true,
      depthTest: true,
      depthWrite: true,
      linewidth: isShaded ? 1 : 2,
      opacity: isShaded ? 0.05 : 1.0,
    });

    const wireframeGeometry = createWireframeFromGeometry(geometry);
    const wireframe = new THREE.LineSegments(wireframeGeometry, frontWireframeMaterial);
    wireframe.visible = true;

    group.add(mesh);
    group.add(wireframe);

    sceneRef.current = {
      ...sceneRef.current,
      geometry,
      material: meshMaterial,
      mesh,
      wireframe,
      group,
    };
  };

  const handleDeleteShape = (id: string) => {
    setSavedShapes((prev) => prev.filter((shape) => shape.id !== id));
  };

  // Load saved settings after mount
  useEffect(() => {
    try {
      // Load geometry params
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const savedParams = JSON.parse(saved);
        setParams(savedParams);
      }

      // Load appearance settings
      const savedAppearance = localStorage.getItem(APPEARANCE_KEY);
      if (savedAppearance) {
        const appearance: AppearanceState = JSON.parse(savedAppearance);
        setIsShaded(appearance.isShaded);
        setIsRotating(appearance.isRotating);
        setGradientStart(appearance.gradientStart);
        setGradientEnd(appearance.gradientEnd);
        setColorScheme(appearance.colorScheme);
      }
    } catch (error) {
      console.warn('Failed to load saved settings:', error);
    }
  }, []);

  const saveCameraState = () => {
    const camera = sceneRef.current.camera;
    const controls = sceneRef.current.controls;
    const rootGroup = sceneRef.current.group;

    if (!camera || !controls || !rootGroup) return;

    try {
      const cameraState: CameraState = {
        position: {
          x: camera.position.x || 0,
          y: camera.position.y || 0,
          z: camera.position.z || 0,
        },
        target: {
          x: controls.target.x || 0,
          y: controls.target.y || 0,
          z: controls.target.z || 0,
        },
        quaternion: {
          x: camera.quaternion.x || 0,
          y: camera.quaternion.y || 0,
          z: camera.quaternion.z || 0,
          w: camera.quaternion.w || 1,
        },
        zoom: camera.zoom || 1,
        rootRotation: {
          x: rootGroup.quaternion.x || 0,
          y: rootGroup.quaternion.y || 0,
          z: rootGroup.quaternion.z || 0,
          w: rootGroup.quaternion.w || 1,
        },
      };

      localStorage.setItem(CAMERA_STORAGE_KEY, JSON.stringify(cameraState));
    } catch (error) {
      console.warn('Failed to save camera state:', error);
    }
  };

  const loadSavedCamera = (): CameraState => {
    if (typeof window === 'undefined') return DEFAULT_CAMERA_STATE;

    try {
      const saved = localStorage.getItem(CAMERA_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load camera settings:', error);
    }
    return DEFAULT_CAMERA_STATE;
  };

  // Update mesh material when gradient colors change
  useEffect(() => {
    if (!sceneRef.current.mesh) return;

    const material = sceneRef.current.material as THREE.ShaderMaterial;
    if (material && material.uniforms) {
      material.uniforms.gradientStart.value.setStyle(gradientStart);
      material.uniforms.gradientEnd.value.setStyle(gradientEnd);
    }
  }, [gradientStart, gradientEnd]);

  // Add point cloud sampling function
  const samplePointsFromMesh = (mesh: THREE.Mesh, targetFaces: number): THREE.Vector3[] => {
    // Calculate number of points to sample based on face count
    // For high face counts, we want to ensure we maintain shape integrity
    const numPoints = Math.min(Math.max(targetFaces * 4, 24), 150);

    // First, get the bounding sphere to help with point distribution
    mesh.geometry.computeBoundingSphere();
    const boundingSphere = mesh.geometry.boundingSphere;

    // If bounding sphere is invalid, create a default sphere
    const radius = boundingSphere && !isNaN(boundingSphere.radius) ? boundingSphere.radius : 1;
    const center = boundingSphere && !isNaN(boundingSphere.center.x) ? boundingSphere.center : new THREE.Vector3();

    const sampler = new MeshSurfaceSampler(mesh).setWeightAttribute('position').build();
    const points: THREE.Vector3[] = [];
    const tempPosition = new THREE.Vector3();

    // Sample vertices first to maintain sharp features
    const vertices = Array.from(mesh.geometry.getAttribute('position').array);
    const uniqueVertices = new Map<string, THREE.Vector3>();

    // Helper to check if a vector has valid components
    const isValidVector = (v: THREE.Vector3) =>
      !isNaN(v.x) && !isNaN(v.y) && !isNaN(v.z) && isFinite(v.x) && isFinite(v.y) && isFinite(v.z);

    for (let i = 0; i < vertices.length; i += 3) {
      const vertex = new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]);

      // Skip invalid vertices
      if (!isValidVector(vertex)) continue;

      // Use a key that accounts for small numerical differences
      const key = vertex
        .toArray()
        .map((v) => Math.round(v * 1000) / 1000)
        .join(',');
      uniqueVertices.set(key, vertex);
    }

    // If we have no valid vertices, create a default shape
    if (uniqueVertices.size === 0) {
      const baseRadius = 0.5;
      uniqueVertices.set('v1', new THREE.Vector3(baseRadius, baseRadius, baseRadius));
      uniqueVertices.set('v2', new THREE.Vector3(-baseRadius, -baseRadius, baseRadius));
      uniqueVertices.set('v3', new THREE.Vector3(-baseRadius, baseRadius, -baseRadius));
      uniqueVertices.set('v4', new THREE.Vector3(baseRadius, -baseRadius, -baseRadius));
    }

    points.push(...Array.from(uniqueVertices.values()));

    // Then sample surface points with stratification
    const remainingPoints = numPoints - points.length;
    const existingPoints = new Set(
      points.map((p) =>
        p
          .toArray()
          .map((v) => Math.round(v * 1000) / 1000)
          .join(',')
      )
    );

    let attempts = 0;
    const maxAttempts = remainingPoints * 10; // Limit attempts to prevent infinite loops

    while (points.length < numPoints && attempts < maxAttempts) {
      sampler.sample(tempPosition);

      // Skip invalid sampled points
      if (!isValidVector(tempPosition)) {
        attempts++;
        continue;
      }

      // Normalize the point to ensure it's on the surface
      const direction = tempPosition.clone().sub(center).normalize();
      const surfacePoint = direction.multiplyScalar(radius).add(center);

      // Add some controlled variation to prevent points from being too regular
      const jitter = 0.02; // Small random variation
      surfacePoint.add(
        new THREE.Vector3(
          (Math.random() - 0.5) * jitter * radius,
          (Math.random() - 0.5) * jitter * radius,
          (Math.random() - 0.5) * jitter * radius
        )
      );

      // Skip if jittered point became invalid
      if (!isValidVector(surfacePoint)) {
        attempts++;
        continue;
      }

      const key = surfacePoint
        .toArray()
        .map((v) => Math.round(v * 1000) / 1000)
        .join(',');

      // Only add points that are sufficiently different from existing ones
      if (!existingPoints.has(key)) {
        points.push(surfacePoint.clone());
        existingPoints.add(key);
      }

      attempts++;
    }

    // Ensure points form a valid 3D shape by adding points if necessary
    if (points.length < 4) {
      // Add points to ensure tetrahedron minimum
      const baseRadius = radius * 0.5;
      const defaultPoints = [
        new THREE.Vector3(baseRadius, baseRadius, baseRadius),
        new THREE.Vector3(-baseRadius, -baseRadius, baseRadius),
        new THREE.Vector3(-baseRadius, baseRadius, -baseRadius),
        new THREE.Vector3(baseRadius, -baseRadius, -baseRadius),
      ];

      defaultPoints.forEach((p) => {
        if (isValidVector(p)) {
          points.push(p.add(center));
        }
      });
    }

    // Sort points by distance from center to maintain correspondence
    // Filter out any invalid points that might have slipped through
    return points.filter((p) => isValidVector(p)).sort((a, b) => a.distanceTo(center) - b.distanceTo(center));
  };

  // Update createMeshFromPoints to handle potential degenerate cases
  const createMeshFromPoints = (points: THREE.Vector3[]): THREE.BufferGeometry => {
    try {
      // Filter out any invalid points
      const validPoints = points.filter(
        (p) => !isNaN(p.x) && !isNaN(p.y) && !isNaN(p.z) && isFinite(p.x) && isFinite(p.y) && isFinite(p.z)
      );

      // Ensure we have enough valid points
      if (validPoints.length < 4) {
        throw new Error('Not enough valid points for convex hull');
      }

      // Create a convex hull from the points
      const geometry = new ConvexGeometry(validPoints);

      // Verify the geometry is valid
      if (!geometry.attributes.position || geometry.attributes.position.count < 3) {
        throw new Error('Degenerate geometry created');
      }

      // Verify no NaN values in the position attribute
      const positions = geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i++) {
        if (isNaN(positions[i]) || !isFinite(positions[i])) {
          throw new Error('Invalid position values in geometry');
        }
      }

      return geometry;
    } catch (error) {
      console.warn('Failed to create convex hull, falling back to simpler geometry:', error);

      // Create a default tetrahedron if everything else fails
      const baseRadius = 0.5;
      const defaultPoints = [
        new THREE.Vector3(baseRadius, baseRadius, baseRadius),
        new THREE.Vector3(-baseRadius, -baseRadius, baseRadius),
        new THREE.Vector3(-baseRadius, baseRadius, -baseRadius),
        new THREE.Vector3(baseRadius, -baseRadius, -baseRadius),
      ];

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          defaultPoints.flatMap((p) => [p.x, p.y, p.z]),
          3
        )
      );

      // Compute vertex normals
      geometry.computeVertexNormals();

      return geometry;
    }
  };

  const easeInOutCubic = (x: number): number => {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };

  // Add a new smoother easing function
  const smootherstep = (x: number): number => {
    // Improved smootherstep with 6th order polynomial
    return x * x * x * (x * (x * 6 - 15) + 10);
  };

  // Blend between smootherstep and cubic for extra smoothness
  const smoothBlend = (x: number): number => {
    const smoothed = smootherstep(x);
    const cubic = easeInOutCubic(x);
    // Use smootherstep to blend between the two functions
    const blend = smootherstep(x);
    return cubic * (1 - blend) + smoothed * blend;
  };

  // Update the animation loop to handle point cloud morphing
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = null; // Set to null instead of black

    // Add cursor state handling for OrbitControls
    const container = containerRef.current;
    container.style.backgroundColor = '#000000'; // Set container background
    const handlePointerDown = () => {
      container.style.cursor = 'grabbing';
      // Disable rotation when user starts manipulating the object
      if (isRotating) {
        setIsRotating(false);
      }
    };
    const handlePointerUp = () => {
      container.style.cursor = 'grab';
    };
    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('pointerleave', handlePointerUp);

    // Add touch-action CSS to prevent default touch behaviors
    container.style.touchAction = 'none';

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    // Create directional light that will follow the camera
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(0, 0, 1); // Start at camera position
    scene.add(directionalLight);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 10000);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    renderer.setClearColor(0x000000, 0); // Set clear color to transparent
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    // Load saved camera state
    const savedCamera = loadSavedCamera();

    // Set initial camera position with fallbacks
    camera.position.set(
      savedCamera.position?.x ?? DEFAULT_CAMERA_STATE.position.x,
      savedCamera.position?.y ?? DEFAULT_CAMERA_STATE.position.y,
      savedCamera.position?.z ?? DEFAULT_CAMERA_STATE.position.z
    );

    // Set initial camera rotation with fallbacks
    const quaternion = savedCamera.quaternion ?? DEFAULT_CAMERA_STATE.quaternion;
    camera.quaternion.set(quaternion.x ?? 0, quaternion.y ?? 0, quaternion.z ?? 0, quaternion.w ?? 1);

    // Set camera zoom
    camera.zoom = savedCamera.zoom ?? DEFAULT_CAMERA_STATE.zoom;
    camera.updateProjectionMatrix();

    // Set initial target with fallbacks
    const target = savedCamera.target ?? DEFAULT_CAMERA_STATE.target;
    camera.lookAt(target.x ?? 0, target.y ?? 0, target.z ?? 0);

    // Controls setup
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.1;
    orbitControls.rotateSpeed = 1.0;
    orbitControls.zoomSpeed = 1.2;
    orbitControls.panSpeed = 1.0;
    orbitControls.minDistance = 0.1;
    orbitControls.maxDistance = 1000;
    orbitControls.enableZoom = true;
    orbitControls.enablePan = true;
    orbitControls.screenSpacePanning = true;
    orbitControls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    // Set orbit controls target with fallbacks
    orbitControls.target.set(target.x ?? 0, target.y ?? 0, target.z ?? 0);

    // Create a parent group for all objects
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Restore root group rotation
    const rootRotation = savedCamera.rootRotation ?? DEFAULT_CAMERA_STATE.rootRotation;
    rootGroup.quaternion.set(rootRotation.x ?? 0, rootRotation.y ?? 0, rootRotation.z ?? 0, rootRotation.w ?? 1);

    // Group for geometry
    const geometryGroup = new THREE.Group();
    rootGroup.add(geometryGroup);

    // Add event listener for control changes
    orbitControls.addEventListener('start', () => {
      if (isRotating) {
        setIsRotating(false);
      }
    });

    // Save camera state when controls change
    orbitControls.addEventListener('end', () => {
      saveCameraState();
    });

    orbitControls.update();

    // Initial geometry update
    const geometry = generatePolyhedron(params);

    // Create solid mesh with shader material
    const meshMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0xffffff) },
        gradientStart: { value: new THREE.Color(gradientStart) },
        gradientEnd: { value: new THREE.Color(gradientEnd) },
      },
      vertexShader: `
        attribute vec3 faceCenter;
        attribute float faceIndex;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vWorldPosition;
        varying vec3 vFaceCenter;
        varying float vFaceIndex;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          vFaceCenter = (modelMatrix * vec4(faceCenter, 1.0)).xyz;
          vFaceIndex = faceIndex;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform vec3 gradientStart;
        uniform vec3 gradientEnd;

        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vWorldPosition;
        varying vec3 vFaceCenter;
        varying float vFaceIndex;

        // SDF (Signed Distance Field) for basic numerical digits
        float sdfNumber(vec2 p, float num) {
          p = abs(p);
          if (num == 0.0) return min(max(p.x-0.3, p.y-0.4), max(0.1-abs(p.x-0.15), 0.1-abs(p.y-0.2)));
          if (num == 1.0) return max(abs(p.x-0.15)-0.05, abs(p.y-0.2)-0.2);
          if (num == 2.0) {
            float d = p.y - 0.2;
            d = min(d, length(p - vec2(0.2, 0.3)) - 0.15);
            d = min(d, length(p - vec2(0.2, 0.1)) - 0.15);
            return d;
          }
          if (num == 3.0) {
            float d = length(p - vec2(0.15, 0.3)) - 0.15;
            d = min(d, length(p - vec2(0.15, 0.2)) - 0.12);
            d = min(d, length(p - vec2(0.15, 0.1)) - 0.15);
            return d;
          }
          if (num == 4.0) {
            float d = max(abs(p.x-0.2)-0.2, abs(p.y-0.25)-0.15);
            d = min(d, max(abs(p.x-0.1)-0.05, p.y-0.4));
            return d;
          }
          if (num == 5.0) {
            float d = p.y - 0.2;
            d = min(d, length(p - vec2(0.1, 0.3)) - 0.15);
            d = min(d, length(p - vec2(0.3, 0.1)) - 0.15);
            return d;
          }
          if (num == 6.0) {
            float d = length(p - vec2(0.2, 0.2)) - 0.2;
            d = min(d, length(p - vec2(0.1, 0.3)) - 0.15);
            return d;
          }
          if (num == 7.0) {
            float d = max(abs(p.x-0.2)-0.2, p.y-0.4);
            d = min(d, max(abs(p.y-0.2)-0.2, p.x-0.4));
            return d;
          }
          if (num == 8.0) {
            float d = length(p - vec2(0.2, 0.3)) - 0.15;
            d = min(d, length(p - vec2(0.2, 0.1)) - 0.15);
            return d;
          }
          if (num == 9.0) {
            float d = length(p - vec2(0.2, 0.2)) - 0.2;
            d = min(d, length(p - vec2(0.3, 0.3)) - 0.15);
            return d;
          }
          return 1.0;
        }

        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);
          float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 2.0);
          vec3 finalColor = mix(gradientEnd, gradientStart, fresnel);

          // Add basic lighting
          vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
          float diffuse = max(dot(normal, lightDir), 0.2);
          vec3 baseColor = finalColor * diffuse;

          // Calculate distance to face center and create a coordinate system for the number
          vec3 toCenter = vWorldPosition - vFaceCenter;
          float distToCenter = length(toCenter);

          // Project the point onto the face plane
          vec3 up = normalize(normal);
          vec3 right = normalize(cross(up, vec3(0.0, 1.0, 0.0)));
          vec3 forward = cross(right, up);

          // Calculate 2D coordinates in face plane
          vec2 faceCoord = vec2(
            dot(toCenter, right),
            dot(toCenter, forward)
          ) * 3.0; // Scale factor for number size

          // Get the digit to display (1-based index)
          float digit = mod(vFaceIndex + 1.0, 10.0);

          // Calculate the SDF for the number
          float numberDist = sdfNumber(faceCoord, digit);

          // Create sharp number edges with some anti-aliasing
          float numberMask = 1.0 - smoothstep(-0.01, 0.01, numberDist);

          // Fade out numbers near edges of faces
          float edgeFade = 1.0 - smoothstep(0.3, 0.4, distToCenter);
          numberMask *= edgeFade;

          // Mix the number with the base color
          vec3 numberColor = vec3(1.0); // White numbers
          vec3 mixedColor = mix(baseColor, numberColor, numberMask);

          gl_FragColor = vec4(mixedColor, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, meshMaterial);
    mesh.visible = isShaded;

    // Create wireframe
    const frontWireframeMaterial = new THREE.LineBasicMaterial({
      color: isShaded ? 0x444444 : 0xffffff,
      transparent: true,
      depthTest: true,
      depthWrite: true,
      linewidth: isShaded ? 1 : 2,
      opacity: isShaded ? 0.05 : 1.0,
    });

    const wireframeGeometry = createWireframeFromGeometry(geometry);
    const wireframe = new THREE.LineSegments(wireframeGeometry, frontWireframeMaterial);
    wireframe.visible = true;

    geometryGroup.add(mesh);
    geometryGroup.add(wireframe);

    // Store scene objects in ref for updates
    sceneRef.current = {
      geometry,
      material: meshMaterial,
      mesh,
      wireframe,
      camera,
      controls: orbitControls,
      group: geometryGroup,
    };

    // Animation loop setup with rotation
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Handle auto-rotation
      if (isRotating && sceneRef.current.group) {
        const rotationSpeed = 0.5;
        currentRotationRef.current += rotationSpeed * deltaTime;
        lastRotationRef.current = currentRotationRef.current;
        sceneRef.current.group.rotation.y = currentRotationRef.current;
      } else if (sceneRef.current.group) {
        sceneRef.current.group.rotation.y = lastRotationRef.current;
      }

      // Handle point cloud morphing
      if (morphStateRef.current && sceneRef.current.mesh && morphStateRef.current.progress < 1) {
        const morphState = morphStateRef.current;
        const rawProgress = morphState.progress;
        const eased = smoothBlend(rawProgress);

        try {
          // Interpolate points
          const morphedPoints = morphState.sourcePoints.map((sourcePoint, i) => {
            const targetPoint = morphState.targetPoints[i];
            return new THREE.Vector3(
              sourcePoint.x + (targetPoint.x - sourcePoint.x) * eased,
              sourcePoint.y + (targetPoint.y - sourcePoint.y) * eased,
              sourcePoint.z + (targetPoint.z - sourcePoint.z) * eased
            );
          });

          // Create morphed geometry
          const morphedGeometry = createMeshFromPoints(morphedPoints);
          sceneRef.current.mesh.geometry.dispose();
          sceneRef.current.mesh.geometry = morphedGeometry;

          if (sceneRef.current.wireframe) {
            const wireframeGeometry = createWireframeFromGeometry(morphedGeometry);
            sceneRef.current.wireframe.geometry.dispose();
            sceneRef.current.wireframe.geometry = wireframeGeometry;
          }

          // Always interpolate colors during morphing
          const material = sceneRef.current.mesh.material as THREE.ShaderMaterial;
          if (material && material.uniforms) {
            const currentStart = material.uniforms.gradientStart.value;
            const currentEnd = material.uniforms.gradientEnd.value;

            const targetStart = morphState.nextShowTarget
              ? new THREE.Color(morphState.nextShowTarget.startColor)
              : currentStart.clone();
            const targetEnd = morphState.nextShowTarget
              ? new THREE.Color(morphState.nextShowTarget.endColor)
              : currentEnd.clone();

            const lerpedStart = currentStart.clone().lerp(targetStart, eased);
            const lerpedEnd = currentEnd.clone().lerp(targetEnd, eased);

            material.uniforms.gradientStart.value.copy(lerpedStart);
            material.uniforms.gradientEnd.value.copy(lerpedEnd);

            if (sceneRef.current.wireframe) {
              const wireframeMaterial = sceneRef.current.wireframe.material as THREE.LineBasicMaterial;
              if (wireframeMaterial) {
                wireframeMaterial.color.copy(isShaded ? new THREE.Color(0x444444) : lerpedStart);
              }
            }
          }

          // Check if morph is complete
          if (rawProgress >= 1) {
            // Ensure we switch to the final geometry
            if (morphState.originalGeometry) {
              sceneRef.current.mesh.geometry.dispose();
              sceneRef.current.mesh.geometry = morphState.originalGeometry.clone();

              if (sceneRef.current.wireframe) {
                const wireframeGeometry = createWireframeFromGeometry(morphState.originalGeometry);
                sceneRef.current.wireframe.geometry.dispose();
                sceneRef.current.wireframe.geometry = wireframeGeometry;
              }
            }

            // Update params and handle next target if in show mode
            setParams({ sides: morphState.targetSides });

            if (isShowMode) {
              // Generate new random target for continuous show mode
              const nextTarget = {
                sides: Math.floor(4 + Math.random() * 97),
                startColor: `hsl(${Math.random() * 360}, ${30 + Math.random() * 40}%, ${30 + Math.random() * 40}%)`,
                endColor: `hsl(${Math.random() * 360}, ${30 + Math.random() * 40}%, ${30 + Math.random() * 40}%)`,
              };

              // Clear current morph state
              morphStateRef.current = null;

              // Start new morph after a short delay
              setTimeout(() => {
                handleSidesChange(nextTarget.sides, nextTarget.startColor, nextTarget.endColor);
              }, 500);
            } else {
              if (morphState.nextShowTarget) {
                const nextTarget = morphState.nextShowTarget;
                setGradientStart(nextTarget.startColor);
                setGradientEnd(nextTarget.endColor);
                handleSidesChange(nextTarget.sides);
              }
              morphStateRef.current = null;
              setMorphComplete(true);
            }
          }
        } catch (error) {
          console.warn('Error in morphing:', error);
          // On error, switch to final geometry immediately
          if (morphState.originalGeometry) {
            sceneRef.current.mesh.geometry.dispose();
            sceneRef.current.mesh.geometry = morphState.originalGeometry.clone();

            if (sceneRef.current.wireframe) {
              const wireframeGeometry = createWireframeFromGeometry(morphState.originalGeometry);
              sceneRef.current.wireframe.geometry.dispose();
              sceneRef.current.wireframe.geometry = wireframeGeometry;
            }
          }
          morphStateRef.current = null;
          setMorphComplete(true);
        }

        // Update progress with faster speed for show mode
        const progressSpeed = isShowMode ? 1.2 : 0.8;
        const newProgress = Math.min(1, morphState.progress + deltaTime * progressSpeed);
        morphState.progress = newProgress;
      }

      // Update light position to match camera
      const cameraDirection = new THREE.Vector3(0, 0, -1);
      cameraDirection.applyQuaternion(camera.quaternion);
      directionalLight.position.copy(camera.position);
      directionalLight.target.position.copy(camera.position).add(cameraDirection);

      orbitControls.update();
      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('pointerleave', handlePointerUp);

      if (sceneRef.current.wireframe) {
        scene.remove(sceneRef.current.wireframe);
        sceneRef.current.geometry?.dispose();
        sceneRef.current.material?.dispose();
      }

      orbitControls.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      scene.clear();
    };
  }, [isRotating, isShowMode]);

  // Save settings whenever they change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
    } catch (error) {
      console.warn('Failed to save settings:', error);
    }
  }, [params]);

  // Save appearance settings whenever they change
  useEffect(() => {
    try {
      const appearance: AppearanceState = {
        isShaded,
        isRotating,
        gradientStart,
        gradientEnd,
        colorScheme,
      };
      localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance));
    } catch (error) {
      console.warn('Failed to save appearance settings:', error);
    }
  }, [isShaded, isRotating, gradientStart, gradientEnd, colorScheme]);

  // Restore geometry update effect
  useEffect(() => {
    const group = sceneRef.current.group;
    if (!group) return;

    const updateGeometry = () => {
      if (sceneRef.current.wireframe) {
        group.remove(sceneRef.current.wireframe);
        group.remove(sceneRef.current.mesh!);
        sceneRef.current.geometry?.dispose();
        sceneRef.current.material?.dispose();
      }

      const geometry = generatePolyhedron(params);

      // Create solid mesh with shader material
      const meshMaterial = new THREE.ShaderMaterial({
        uniforms: {
          color: { value: new THREE.Color(0xffffff) },
          gradientStart: { value: new THREE.Color(gradientStart) },
          gradientEnd: { value: new THREE.Color(gradientEnd) },
        },
        vertexShader: `
          attribute vec3 faceCenter;
          attribute float faceIndex;
          varying vec3 vNormal;
          varying vec3 vViewPosition;
          varying vec3 vWorldPosition;
          varying vec3 vFaceCenter;
          varying float vFaceIndex;

          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vViewPosition = -mvPosition.xyz;
            vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
            vFaceCenter = (modelMatrix * vec4(faceCenter, 1.0)).xyz;
            vFaceIndex = faceIndex;
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 color;
          uniform vec3 gradientStart;
          uniform vec3 gradientEnd;

          varying vec3 vNormal;
          varying vec3 vViewPosition;
          varying vec3 vWorldPosition;
          varying vec3 vFaceCenter;
          varying float vFaceIndex;

          // SDF (Signed Distance Field) for basic numerical digits
          float sdfNumber(vec2 p, float num) {
            p = abs(p);
            if (num == 0.0) return min(max(p.x-0.3, p.y-0.4), max(0.1-abs(p.x-0.15), 0.1-abs(p.y-0.2)));
            if (num == 1.0) return max(abs(p.x-0.15)-0.05, abs(p.y-0.2)-0.2);
            if (num == 2.0) {
              float d = p.y - 0.2;
              d = min(d, length(p - vec2(0.2, 0.3)) - 0.15);
              d = min(d, length(p - vec2(0.2, 0.1)) - 0.15);
              return d;
            }
            if (num == 3.0) {
              float d = length(p - vec2(0.15, 0.3)) - 0.15;
              d = min(d, length(p - vec2(0.15, 0.2)) - 0.12);
              d = min(d, length(p - vec2(0.15, 0.1)) - 0.15);
              return d;
            }
            if (num == 4.0) {
              float d = max(abs(p.x-0.2)-0.2, abs(p.y-0.25)-0.15);
              d = min(d, max(abs(p.x-0.1)-0.05, p.y-0.4));
              return d;
            }
            if (num == 5.0) {
              float d = p.y - 0.2;
              d = min(d, length(p - vec2(0.1, 0.3)) - 0.15);
              d = min(d, length(p - vec2(0.3, 0.1)) - 0.15);
              return d;
            }
            if (num == 6.0) {
              float d = length(p - vec2(0.2, 0.2)) - 0.2;
              d = min(d, length(p - vec2(0.1, 0.3)) - 0.15);
              return d;
            }
            if (num == 7.0) {
              float d = max(abs(p.x-0.2)-0.2, p.y-0.4);
              d = min(d, max(abs(p.y-0.2)-0.2, p.x-0.4));
              return d;
            }
            if (num == 8.0) {
              float d = length(p - vec2(0.2, 0.3)) - 0.15;
              d = min(d, length(p - vec2(0.2, 0.1)) - 0.15);
              return d;
            }
            if (num == 9.0) {
              float d = length(p - vec2(0.2, 0.2)) - 0.2;
              d = min(d, length(p - vec2(0.3, 0.3)) - 0.15);
              return d;
            }
            return 1.0;
          }

          void main() {
            vec3 normal = normalize(vNormal);
            vec3 viewDir = normalize(vViewPosition);
            float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 2.0);
            vec3 finalColor = mix(gradientEnd, gradientStart, fresnel);

            // Add basic lighting
            vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
            float diffuse = max(dot(normal, lightDir), 0.2);
            vec3 baseColor = finalColor * diffuse;

            // Calculate distance to face center and create a coordinate system for the number
            vec3 toCenter = vWorldPosition - vFaceCenter;
            float distToCenter = length(toCenter);

            // Project the point onto the face plane
            vec3 up = normalize(normal);
            vec3 right = normalize(cross(up, vec3(0.0, 1.0, 0.0)));
            vec3 forward = cross(right, up);

            // Calculate 2D coordinates in face plane
            vec2 faceCoord = vec2(
              dot(toCenter, right),
              dot(toCenter, forward)
            ) * 3.0; // Scale factor for number size

            // Get the digit to display (1-based index)
            float digit = mod(vFaceIndex + 1.0, 10.0);

            // Calculate the SDF for the number
            float numberDist = sdfNumber(faceCoord, digit);

            // Create sharp number edges with some anti-aliasing
            float numberMask = 1.0 - smoothstep(-0.01, 0.01, numberDist);

            // Fade out numbers near edges of faces
            float edgeFade = 1.0 - smoothstep(0.3, 0.4, distToCenter);
            numberMask *= edgeFade;

            // Mix the number with the base color
            vec3 numberColor = vec3(1.0); // White numbers
            vec3 mixedColor = mix(baseColor, numberColor, numberMask);

            gl_FragColor = vec4(mixedColor, 1.0);
          }
        `,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geometry, meshMaterial);
      mesh.visible = isShaded;

      // Create wireframe
      const frontWireframeMaterial = new THREE.LineBasicMaterial({
        color: isShaded ? 0x444444 : 0xffffff,
        transparent: true,
        depthTest: true,
        depthWrite: true,
        linewidth: isShaded ? 1 : 2,
        opacity: isShaded ? 0.05 : 1.0,
      });

      const wireframeGeometry = createWireframeFromGeometry(geometry);
      const wireframe = new THREE.LineSegments(wireframeGeometry, frontWireframeMaterial);
      wireframe.visible = true;

      group.add(mesh);
      group.add(wireframe);

      sceneRef.current = {
        ...sceneRef.current,
        geometry,
        material: meshMaterial,
        mesh,
        wireframe,
        group,
      };
    };

    updateGeometry();
  }, [params, isShaded, gradientStart, gradientEnd]);

  // Function to convert the current view to SVG
  const convertToSVG = () => {
    if (!sceneRef.current.mesh || !sceneRef.current.camera) {
      console.warn('No mesh or camera found');
      return;
    }

    const mesh = sceneRef.current.mesh;
    const camera = sceneRef.current.camera;
    const geometry = sceneRef.current.geometry!; // Use original geometry, not wireframe

    // Debug logging
    console.log('Converting to SVG:', {
      mesh: mesh,
      geometry: geometry,
      camera: camera,
    });

    // Get the vertices from the geometry
    const position = geometry.getAttribute('position');
    if (!position) {
      console.warn('No position attribute found in geometry');
      return;
    }

    // Create vertices array from buffer geometry
    const vertices: THREE.Vector3[] = [];
    for (let i = 0; i < position.count; i++) {
      const vertex = new THREE.Vector3(position.getX(i), position.getY(i), position.getZ(i));
      // Apply the full transformation chain
      vertex.applyMatrix4(mesh.matrixWorld);
      vertices.push(vertex);
    }

    console.log('Original vertices:', vertices);

    // Project vertices to 2D and calculate depth
    const projectedVertices = vertices.map((vertex) => {
      const v = vertex.clone();

      // Transform vertex to view space (camera space)
      v.applyMatrix4(camera.matrixWorldInverse);

      // Use negative Z in view space for depth (negative because view space Z points backwards)
      const depth = -v.z;

      // Project to screen space for 2D coordinates
      v.project(camera);

      return {
        x: ((v.x + 1) * window.innerWidth) / 2,
        y: ((-v.y + 1) * window.innerHeight) / 2,
        depth,
      };
    });

    console.log('Projected vertices with depths:', projectedVertices);

    // Create SVG content
    const minX = Math.min(...projectedVertices.map((v) => v.x));
    const maxX = Math.max(...projectedVertices.map((v) => v.x));
    const minY = Math.min(...projectedVertices.map((v) => v.y));
    const maxY = Math.max(...projectedVertices.map((v) => v.y));
    const width = maxX - minX;
    const height = maxY - minY;
    const padding = 20;

    // Create SVG paths for edges
    const edges = new Set<string>();
    const index = geometry.getIndex();

    if (!index) {
      console.warn('No index found in geometry');
      // If no index, try to create edges from vertices directly
      for (let i = 0; i < vertices.length; i += 3) {
        const a = i;
        const b = i + 1;
        const c = i + 2;
        if (b < vertices.length && c < vertices.length) {
          [
            [a, b],
            [b, c],
            [c, a],
          ].forEach(([v1, v2]) => {
            const edgeKey = [Math.min(v1, v2), Math.max(v1, v2)].join(',');
            edges.add(edgeKey);
          });
        }
      }
    } else {
      // Use indexed geometry
      for (let i = 0; i < index.count; i += 3) {
        const a = index.getX(i);
        const b = index.getX(i + 1);
        const c = index.getX(i + 2);

        [
          [a, b],
          [b, c],
          [c, a],
        ].forEach(([v1, v2]) => {
          const edgeKey = [Math.min(v1, v2), Math.max(v1, v2)].join(',');
          edges.add(edgeKey);
        });
      }
    }

    // Find min and max depths for normalization
    const depths = projectedVertices.map((v) => v.depth);
    const minDepth = Math.min(...depths);
    const maxDepth = Math.max(...depths);
    console.log('Depth range:', { minDepth, maxDepth });

    // Generate SVG content with perspective-based depth shading
    const svgPaths = Array.from(edges).map((edge) => {
      const [v1, v2] = edge.split(',').map(Number);
      const pathData = `M ${projectedVertices[v1].x - minX + padding} ${projectedVertices[v1].y - minY + padding} L ${projectedVertices[v2].x - minX + padding} ${projectedVertices[v2].y - minY + padding}`;

      // Calculate average depth of the edge
      const avgDepth = (projectedVertices[v1].depth + projectedVertices[v2].depth) / 2;

      // Normalize depth to [0, 1] range and invert so closer objects are more opaque
      const normalizedDepth = (avgDepth - minDepth) / (maxDepth - minDepth);
      const opacity = 1 - normalizedDepth;

      // Ensure minimum visibility
      const finalOpacity = Math.max(0.1, Math.min(1, opacity));

      // Debug output for every 10th edge to avoid console spam
      if (Math.random() < 0.1) {
        console.log(`Edge ${edge} depth:`, {
          v1depth: projectedVertices[v1].depth,
          v2depth: projectedVertices[v2].depth,
          avgDepth,
          normalizedDepth,
          opacity: finalOpacity,
        });
      }

      return `<path d="${pathData}" stroke="white" stroke-width="1" fill="none" opacity="${finalOpacity.toFixed(3)}" />`;
    });

    // Add viewBox for better scaling
    const svgContent = `
      <svg
        width="${width + padding * 2}"
        height="${height + padding * 2}"
        viewBox="0 0 ${width + padding * 2} ${height + padding * 2}"
        xmlns="http://www.w3.org/2000/svg"
        style="background: black"
      >
        ${svgPaths.join('\n        ')}
      </svg>
    `;

    console.log('SVG content:', svgContent);

    // Create and trigger download
    try {
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `polyhedron-${params.sides}-faces.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error creating SVG file:', error);
    }
  };

  // Update handleSidesChange to use the new matching function
  const handleSidesChange = (newSides: number, targetStartColor?: string, targetEndColor?: string) => {
    // Update params state immediately for slider responsiveness
    setParams({ sides: newSides });

    // Generate target geometry
    const targetGeometry = generatePolyhedron({ sides: newSides });
    const currentGeometry = sceneRef.current.mesh?.geometry;
    const material = sceneRef.current.mesh?.material as THREE.ShaderMaterial;

    if (!currentGeometry || !sceneRef.current.mesh) {
      return;
    }

    // Capture current colors from the shader uniforms
    const currentStartColor = material?.uniforms.gradientStart.value.getHexString();
    const currentEndColor = material?.uniforms.gradientEnd.value.getHexString();

    // Create temporary meshes for sampling
    const currentMesh = new THREE.Mesh(currentGeometry);
    const targetMesh = new THREE.Mesh(targetGeometry);

    // Sample points from both meshes
    const sourcePoints = samplePointsFromMesh(currentMesh, params.sides);
    const targetPoints = samplePointsFromMesh(targetMesh, newSides);

    // Match points between shapes
    const [matchedSource, matchedTarget] = matchPoints(sourcePoints, targetPoints);

    // Set up morphing
    morphStateRef.current = {
      sourcePoints: matchedSource,
      targetPoints: matchedTarget,
      progress: 0,
      targetSides: newSides,
      originalGeometry: targetGeometry,
      phase: 'matching_faces',
      nextShowTarget:
        isShowMode || targetStartColor
          ? {
              sides: isShowMode ? Math.floor(4 + Math.random() * 97) : newSides,
              startColor:
                targetStartColor ||
                (isShowMode
                  ? `hsl(${Math.random() * 360}, ${30 + Math.random() * 40}%, ${30 + Math.random() * 40}%)`
                  : `#${currentStartColor}`),
              endColor:
                targetEndColor ||
                (isShowMode
                  ? `hsl(${Math.random() * 360}, ${30 + Math.random() * 40}%, ${30 + Math.random() * 40}%)`
                  : `#${currentEndColor}`),
            }
          : {
              sides: newSides,
              startColor: `#${currentStartColor}`,
              endColor: `#${currentEndColor}`,
            },
    };
    setMorphComplete(false);

    // Clean up temporary meshes
    currentMesh.geometry.dispose();
    targetMesh.geometry.dispose();
  };

  // Create wireframe with gradient shader
  const createGradientWireframe = (geometry: THREE.BufferGeometry) => {
    const wireframeGeometry = createWireframeFromGeometry(geometry);
    const gradientWireframeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        gradientStart: { value: new THREE.Color(gradientStart) },
        gradientEnd: { value: new THREE.Color(gradientEnd) },
        opacity: { value: isShaded ? 0.05 : 1.0 },
      },
      vertexShader: `
        varying vec3 vViewPosition;

        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 gradientStart;
        uniform vec3 gradientEnd;
        uniform float opacity;

        varying vec3 vViewPosition;

        void main() {
          vec3 viewDir = normalize(vViewPosition);
          float fresnel = pow(1.0 - abs(dot(vec3(0.0, 0.0, 1.0), viewDir)), 2.0);
          vec3 finalColor = mix(gradientEnd, gradientStart, fresnel);
          gl_FragColor = vec4(finalColor, opacity);
        }
      `,
      transparent: true,
      depthTest: true,
      depthWrite: true,
      side: THREE.DoubleSide,
    });

    return new THREE.LineSegments(wireframeGeometry, gradientWireframeMaterial);
  };

  // Update wireframe material when gradient colors change
  useEffect(() => {
    if (!sceneRef.current.wireframe) return;

    const material = sceneRef.current.wireframe.material as THREE.ShaderMaterial;
    if (material && material.uniforms) {
      material.uniforms.gradientStart.value.setStyle(gradientStart);
      material.uniforms.gradientEnd.value.setStyle(gradientEnd);
      material.uniforms.opacity.value = isShaded ? 0.05 : 1.0;
    }
  }, [gradientStart, gradientEnd, isShaded]);

  // Update the show mode effect
  useEffect(() => {
    if (!isShowMode) {
      // Clear next target when show mode is disabled
      if (morphStateRef.current) {
        morphStateRef.current.nextShowTarget = undefined;
      }
      return;
    }

    // Function to generate random parameters
    const generateRandomTarget = () => {
      const sides = Math.floor(4 + Math.random() * 97);
      const randomColor = () => {
        const hue = Math.random() * 360;
        const saturation = 30 + Math.random() * 40;
        const lightness = 30 + Math.random() * 40;
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      };
      return {
        sides,
        startColor: randomColor(),
        endColor: randomColor(),
      };
    };

    // Initial morph if not already morphing
    if (!morphStateRef.current) {
      const target = generateRandomTarget();
      handleSidesChange(target.sides, target.startColor, target.endColor);
    }
  }, [isShowMode]);

  // Add back the matchPoints function
  const matchPoints = (
    sourcePoints: THREE.Vector3[],
    targetPoints: THREE.Vector3[]
  ): [THREE.Vector3[], THREE.Vector3[]] => {
    // Ensure we have the same number of points
    const count = Math.min(sourcePoints.length, targetPoints.length);
    const finalSource = sourcePoints.slice(0, count);
    const finalTarget = targetPoints.slice(0, count);

    // Calculate centers and average scales
    const sourceCenter = new THREE.Vector3();
    const targetCenter = new THREE.Vector3();
    let sourceScale = 0;
    let targetScale = 0;

    finalSource.forEach((p) => {
      sourceCenter.add(p);
      sourceScale += p.length();
    });
    finalTarget.forEach((p) => {
      targetCenter.add(p);
      targetScale += p.length();
    });

    sourceCenter.divideScalar(count);
    targetCenter.divideScalar(count);
    sourceScale /= count;
    targetScale /= count;

    // Calculate scale ratio to maintain relative sizes
    const scaleRatio = targetScale / sourceScale;

    // Normalize points relative to their centers while preserving relative scale
    const normalizedSource = finalSource.map((p) => p.clone().sub(sourceCenter).multiplyScalar(scaleRatio));
    const normalizedTarget = finalTarget.map((p) => p.clone().sub(targetCenter));

    // Sort both sets by distance from their respective centers and angle
    const sortBySpherical = (points: THREE.Vector3[]) => {
      return points
        .map((p, i) => {
          const spherical = new THREE.Spherical().setFromVector3(p);
          return { point: p, spherical, index: i };
        })
        .sort((a, b) => {
          // Sort first by radius (distance from center)
          const radiusDiff = a.spherical.radius - b.spherical.radius;
          if (Math.abs(radiusDiff) > 0.001) return radiusDiff;
          // Then by phi (polar angle)
          const phiDiff = a.spherical.phi - b.spherical.phi;
          if (Math.abs(phiDiff) > 0.001) return phiDiff;
          // Finally by theta (azimuthal angle)
          return a.spherical.theta - b.spherical.theta;
        });
    };

    const sortedSource = sortBySpherical(normalizedSource);
    const sortedTarget = sortBySpherical(normalizedTarget);

    // Reconstruct the arrays in matched order
    return [sortedSource.map((s) => finalSource[s.index]), sortedTarget.map((t) => finalTarget[t.index])] as [
      THREE.Vector3[],
      THREE.Vector3[],
    ];
  };

  return (
    <div className="absolute inset-0 flex flex-col">
      <div ref={containerRef} className="flex-1 cursor-grab active:cursor-grabbing" />

      {/* Control Panel */}
      <div className="bg-zinc-900/20 border-t overflow-x-auto border-white/10 px-4 py-3 flex items-center gap-4 absolute bottom-0 left-0 right-0">
        {/* Sides Control */}
        <div className="flex items-center gap-2">
          <label className="text-white/80 text-sm font-medium min-w-[3rem]">Faces</label>
          <input
            type="range"
            min="1"
            max="100"
            step="1"
            value={params.sides}
            onChange={(e) => handleSidesChange(parseInt(e.target.value))}
            className="w-32 accent-white"
          />
          <span className="text-white/80 text-sm w-12 tabular-nums">{params.sides}</span>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-2">
          <div className="flex bg-white/10 rounded-md p-0.5">
            <button
              onClick={() => setIsShaded(true)}
              title="Solid view"
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                isShaded ? 'bg-white text-black' : 'text-white hover:text-white/80'
              }`}
            >
              <Cube className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsShaded(false)}
              title="Wireframe view"
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                !isShaded ? 'bg-white text-black' : 'text-white hover:text-white/80'
              }`}
            >
              <CubeTransparent className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={() => setIsColorPickerOpen(true)}
            title="Customize gradient colors"
            className="px-3 py-1 rounded text-sm font-medium bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            <Palette className="w-5 h-5" weight={isColorPickerOpen ? 'fill' : 'duotone'} />
          </button>
        </div>

        {/* Animation Controls */}
        <div className="flex items-center gap-2 ml-8">
          <button
            onClick={() => setIsRotating(!isRotating)}
            title={isRotating ? 'Stop auto-rotation' : 'Start auto-rotation'}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors cursor-pointer ${
              isRotating ? 'bg-white text-black hover:bg-white/90' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <ArrowsClockwise className="w-5 h-5" weight={isRotating ? 'fill' : 'duotone'} />
          </button>
          <button
            onClick={() => setIsShowMode(!isShowMode)}
            title={isShowMode ? 'Stop auto-morphing' : 'Start auto-morphing'}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors cursor-pointer ${
              isShowMode ? 'bg-white text-black hover:bg-white/90' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <SmileyMelting className="w-5 h-5" weight={isShowMode ? 'fill' : 'duotone'} />
          </button>
          <button
            onClick={() => {
              // Generate random gradient colors
              const randomColor = () => {
                const hue = Math.random() * 360;
                const saturation = 30 + Math.random() * 40;
                const lightness = 30 + Math.random() * 40;
                return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
              };

              // Generate random number of sides (4-100)
              const randomSides = Math.floor(4 + Math.random() * 97);
              const startColor = randomColor();
              const endColor = randomColor();

              // Only pass the colors to handleSidesChange, don't set them directly
              handleSidesChange(randomSides, startColor, endColor);
            }}
            title="Generate random shape and colors"
            className="px-3 py-1 rounded text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer"
          >
            <Shuffle className="w-5 h-5" weight="duotone" />
          </button>
        </div>

        {/* File Controls */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={convertToSVG}
            title="Export current view as SVG"
            className="px-3 py-1 rounded text-sm font-medium bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            Export
          </button>
          <button
            onClick={() => setIsSaveModalOpen(true)}
            title="Save current shape configuration"
            className="px-3 py-1 rounded text-sm font-medium bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            Save
          </button>
          <button
            onClick={() => setIsLoadModalOpen(true)}
            title="Load a saved shape configuration"
            className="px-3 py-1 rounded text-sm font-medium bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            Load
          </button>
        </div>
      </div>

      {/* Save Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-black border border-white/10 rounded-lg p-6 w-96">
            <h2 className="text-white text-lg font-medium mb-4">Save Shape</h2>
            <input
              type="text"
              value={shapeName}
              onChange={(e) => setShapeName(e.target.value)}
              placeholder="Enter shape name"
              className="w-full px-3 py-2 rounded bg-white/10 text-white placeholder-white/50 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="px-4 py-2 rounded text-sm font-medium bg-white/10 text-white hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveShape}
                className="px-4 py-2 rounded text-sm font-medium bg-white text-black hover:bg-white/90"
                disabled={!shapeName.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Modal */}
      {isLoadModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-black border border-white/10 rounded-lg p-6 w-96 max-h-[80vh] flex flex-col">
            <h2 className="text-white text-lg font-medium mb-4">Load Shape</h2>
            <div className="flex-1 overflow-y-auto">
              {savedShapes.length === 0 ? (
                <p className="text-white/50 text-center py-4">No saved shapes</p>
              ) : (
                <div className="space-y-2">
                  {savedShapes.map((shape) => (
                    <div
                      key={shape.id}
                      className="flex items-center justify-between p-3 rounded bg-white/5 hover:bg-white/10"
                    >
                      <div>
                        <div className="text-white font-medium">{shape.name}</div>
                        <div className="text-white/50 text-sm">{shape.params.sides} faces</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleLoadShape(shape)}
                          className="px-3 py-1 rounded text-sm font-medium bg-white/10 text-white hover:bg-white/20"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleDeleteShape(shape.id)}
                          className="px-3 py-1 rounded text-sm font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setIsLoadModalOpen(false)}
                className="px-4 py-2 rounded text-sm font-medium bg-white/10 text-white hover:bg-white/20"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Updated Color Picker Modal */}
      {isColorPickerOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-black border border-white/10 rounded-lg p-6 w-96">
            <h2 className="text-white text-lg font-medium mb-4">Color Scheme</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(COLOR_SCHEMES).map(([scheme, colors]) => (
                  <button
                    key={scheme}
                    onClick={() => setColorScheme(scheme as keyof typeof COLOR_SCHEMES)}
                    className={`p-3 rounded-lg border transition-all ${
                      colorScheme === scheme ? 'border-white scale-105' : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div
                      className="h-8 rounded-md mb-2"
                      style={{
                        background: `linear-gradient(to right, ${colors.start}, ${colors.end})`,
                      }}
                    />
                    <div className="text-white capitalize text-sm">{scheme}</div>
                  </button>
                ))}
              </div>

              <div className="pt-4 border-t border-white/10">
                <label className="block text-white/80 text-sm font-medium mb-2">Custom Colors</label>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={gradientStart}
                      onChange={(e) => setGradientStart(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={gradientStart}
                      onChange={(e) => setGradientStart(e.target.value)}
                      className="flex-1 px-3 py-2 rounded bg-white/10 text-white font-mono text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={gradientEnd}
                      onChange={(e) => setGradientEnd(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={gradientEnd}
                      onChange={(e) => setGradientEnd(e.target.value)}
                      className="flex-1 px-3 py-2 rounded bg-white/10 text-white font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              <div
                className="h-8 rounded overflow-hidden"
                style={{
                  background: `linear-gradient(to right, ${gradientStart}, ${gradientEnd})`,
                }}
              />
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setIsColorPickerOpen(false)}
                className="px-4 py-2 rounded text-sm font-medium bg-white text-black hover:bg-white/90"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
