import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import { NDimensionalParams, SavedShape } from './types';
import { generatePolyhedron, getCurrentRandomParams, setCurrentRandomParams } from './geometries';
import { ArrowsCounterClockwise, Palette, ArrowsClockwise, Shuffle, SmileyMelting, SmileySad } from '@phosphor-icons/react';

const STORAGE_KEY = 'polyhedron-simulator-settings';
const CAMERA_STORAGE_KEY = 'polyhedron-simulator-camera';
const SAVED_SHAPES_KEY = 'polyhedron-simulator-saved-shapes';

interface CameraState {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  quaternion: { x: number; y: number; z: number; w: number };
  zoom: number;
  rootRotation: { x: number; y: number; z: number; w: number };
}

const DEFAULT_CAMERA_STATE: CameraState = {
  position: { x: 0, y: 0, z: 3 },
  target: { x: 0, y: 0, z: 0 },
  quaternion: { x: 0, y: 0, z: 0, w: 1 },
  zoom: 1,
  rootRotation: { x: 0, y: 0, z: 0, w: 1 }
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
      [[a, b], [b, c], [c, a]].forEach(([v1, v2]) => {
        const edgeKey = [Math.min(v1, v2), Math.max(v1, v2)].join(',');
        if (!edges.has(edgeKey)) {
          edges.add(edgeKey);
          // Add both vertices of the edge
          vertices.push(
            position.getX(v1), position.getY(v1), position.getZ(v1),
            position.getX(v2), position.getY(v2), position.getZ(v2)
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
          position.getX(v1), position.getY(v1), position.getZ(v1),
          position.getX(v2), position.getY(v2), position.getZ(v2)
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

export default function NDimensionalGeometrySimulator() {
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
    ocean: { start: '#4facfe', end: '#00f2fe' }
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
      createdAt: Date.now()
    };

    setSavedShapes(prev => [...prev, newShape]);
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

    // Create solid mesh with phong material
    const meshMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0xffffff) },
        gradientStart: { value: new THREE.Color(gradientStart) },
        gradientEnd: { value: new THREE.Color(gradientEnd) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform vec3 gradientStart;
        uniform vec3 gradientEnd;

        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);
          float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 2.0);
          vec3 finalColor = mix(gradientEnd, gradientStart, fresnel);

          // Add basic lighting
          vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
          float diffuse = max(dot(normal, lightDir), 0.2);

          gl_FragColor = vec4(finalColor * diffuse, 1.0);
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
      group
    };
  };

  const handleDeleteShape = (id: string) => {
    setSavedShapes(prev => prev.filter(shape => shape.id !== id));
  };

  // Load saved settings after mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const savedParams = JSON.parse(saved);
        setParams(savedParams);
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
          z: camera.position.z || 0
        },
        target: {
          x: controls.target.x || 0,
          y: controls.target.y || 0,
          z: controls.target.z || 0
        },
        quaternion: {
          x: camera.quaternion.x || 0,
          y: camera.quaternion.y || 0,
          z: camera.quaternion.z || 0,
          w: camera.quaternion.w || 1
        },
        zoom: camera.zoom || 1,
        rootRotation: {
          x: rootGroup.quaternion.x || 0,
          y: rootGroup.quaternion.y || 0,
          z: rootGroup.quaternion.z || 0,
          w: rootGroup.quaternion.w || 1
        }
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
    // Use 3 points per face as a baseline (since each face is a triangle)
    // with a minimum of 12 points (enough for a tetrahedron)
    // and maximum of 100 points to prevent over-detailing
    const numPoints = Math.min(Math.max(targetFaces * 3, 12), 100);

    const sampler = new MeshSurfaceSampler(mesh).build();
    const points: THREE.Vector3[] = [];
    const tempPosition = new THREE.Vector3();

    for (let i = 0; i < numPoints; i++) {
      sampler.sample(tempPosition);
      points.push(tempPosition.clone());
    }

    return points;
  };

  // Update point cloud to mesh conversion
  const createMeshFromPoints = (points: THREE.Vector3[]): THREE.BufferGeometry => {
    // Create a convex hull from the points
    return new ConvexGeometry(points);
  };

  // Add easing functions
  const easeOutElastic = (x: number): number => {
    const c4 = (2 * Math.PI) / 3;
    return x === 0
      ? 0
      : x === 1
      ? 1
      : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
  };

  const easeOutBack = (x: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
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
    scene.background = new THREE.Color(0x000000);

    // Add cursor state handling for OrbitControls
    const container = containerRef.current;
    const handleMouseDown = () => {
      container.style.cursor = 'grabbing';
    };
    const handleMouseUp = () => {
      container.style.cursor = 'grab';
    };
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mouseleave', handleMouseUp);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    // Create directional light that will follow the camera
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(0, 0, 1); // Start at camera position
    scene.add(directionalLight);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.01,
      10000
    );
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
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
    camera.quaternion.set(
      quaternion.x ?? 0,
      quaternion.y ?? 0,
      quaternion.z ?? 0,
      quaternion.w ?? 1
    );

    // Set camera zoom
    camera.zoom = savedCamera.zoom ?? DEFAULT_CAMERA_STATE.zoom;
    camera.updateProjectionMatrix();

    // Set initial target with fallbacks
    const target = savedCamera.target ?? DEFAULT_CAMERA_STATE.target;
    camera.lookAt(target.x ?? 0, target.y ?? 0, target.z ?? 0);

    // Controls setup
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;
    orbitControls.rotateSpeed = 0.5;
    orbitControls.zoomSpeed = 1.2;
    orbitControls.panSpeed = 0.8;
    orbitControls.minDistance = 0.1;
    orbitControls.maxDistance = 1000;
    orbitControls.enableZoom = true;
    orbitControls.enablePan = true;
    orbitControls.screenSpacePanning = true;
    orbitControls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };

    // Set orbit controls target with fallbacks
    orbitControls.target.set(
      target.x ?? 0,
      target.y ?? 0,
      target.z ?? 0
    );

    // Create a parent group for all objects
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Restore root group rotation
    const rootRotation = savedCamera.rootRotation ?? DEFAULT_CAMERA_STATE.rootRotation;
    rootGroup.quaternion.set(
      rootRotation.x ?? 0,
      rootRotation.y ?? 0,
      rootRotation.z ?? 0,
      rootRotation.w ?? 1
    );

    // Group for geometry
    const geometryGroup = new THREE.Group();
    rootGroup.add(geometryGroup);

    // Transform controls setup
    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.setMode('rotate');
    transformControls.setSize(1.2);
    transformControls.attach(rootGroup);

    transformControls.addEventListener('dragging-changed', (event) => {
      orbitControls.enabled = !event.value;
    });

    // Save state when transform controls change
    transformControls.addEventListener('objectChange', () => {
      requestAnimationFrame(() => {
        const camera = sceneRef.current.camera;
        const controls = sceneRef.current.controls;
        if (camera && controls) {
          saveCameraState();
        }
      });
    });

    orbitControls.update();

    // Initial geometry update
    const geometry = generatePolyhedron(params);

    // Create solid mesh with phong material for better lighting
    const meshMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0xffffff) },
        gradientStart: { value: new THREE.Color(gradientStart) },
        gradientEnd: { value: new THREE.Color(gradientEnd) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform vec3 gradientStart;
        uniform vec3 gradientEnd;

        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);
          float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 2.0);
          vec3 finalColor = mix(gradientEnd, gradientStart, fresnel);

          // Add basic lighting
          vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
          float diffuse = max(dot(normal, lightDir), 0.2);

          gl_FragColor = vec4(finalColor * diffuse, 1.0);
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
      group: geometryGroup
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
        const rawProgress = morphStateRef.current.progress;
        const eased = smoothBlend(rawProgress);

        // Always interpolate colors during morphing
        const material = sceneRef.current.mesh.material as THREE.ShaderMaterial;
        if (material && material.uniforms) {
          // Parse current colors from the shader uniforms
          const currentStart = material.uniforms.gradientStart.value;
          const currentEnd = material.uniforms.gradientEnd.value;

          // Get target colors (either from nextShowTarget or use current colors)
          const targetStart = morphStateRef.current.nextShowTarget
            ? new THREE.Color(morphStateRef.current.nextShowTarget.startColor)
            : currentStart.clone();
          const targetEnd = morphStateRef.current.nextShowTarget
            ? new THREE.Color(morphStateRef.current.nextShowTarget.endColor)
            : currentEnd.clone();

          // Interpolate colors
          const lerpedStart = currentStart.clone().lerp(targetStart, eased);
          const lerpedEnd = currentEnd.clone().lerp(targetEnd, eased);

          // Update shader uniforms
          material.uniforms.gradientStart.value.copy(lerpedStart);
          material.uniforms.gradientEnd.value.copy(lerpedEnd);

          // Update wireframe colors if needed
          if (sceneRef.current.wireframe) {
            const wireframeMaterial = sceneRef.current.wireframe.material as THREE.LineBasicMaterial;
            if (wireframeMaterial) {
              wireframeMaterial.color.copy(isShaded ? new THREE.Color(0x444444) : lerpedStart);
            }
          }
        }

        if (morphStateRef.current.phase === 'matching_faces') {
          // First phase: morph to intermediate shape with correct face count
          const morphedPoints = morphStateRef.current.sourcePoints.map((sourcePoint, i) => {
            const targetPoint = morphStateRef.current!.targetPoints[i];
            return new THREE.Vector3(
              sourcePoint.x + (targetPoint.x - sourcePoint.x) * eased,
              sourcePoint.y + (targetPoint.y - sourcePoint.y) * eased,
              sourcePoint.z + (targetPoint.z - sourcePoint.z) * eased
            );
          });

          try {
            const morphedGeometry = createMeshFromPoints(morphedPoints);
            sceneRef.current.mesh.geometry.dispose();
            sceneRef.current.mesh.geometry = morphedGeometry;

            if (sceneRef.current.wireframe) {
              const wireframeGeometry = createWireframeFromGeometry(morphedGeometry);
              sceneRef.current.wireframe.geometry.dispose();
              sceneRef.current.wireframe.geometry = wireframeGeometry;
            }

            if (rawProgress >= 1) {
              // Start second phase
              morphStateRef.current = {
                sourcePoints: morphedPoints,
                targetPoints: Array.from(morphStateRef.current.originalGeometry!.getAttribute('position').array)
                  .reduce((acc: THREE.Vector3[], _, i) => {
                    if (i % 3 === 0) {
                      acc.push(new THREE.Vector3(
                        morphStateRef.current!.originalGeometry!.getAttribute('position').array[i],
                        morphStateRef.current!.originalGeometry!.getAttribute('position').array[i + 1],
                        morphStateRef.current!.originalGeometry!.getAttribute('position').array[i + 2]
                      ));
                    }
                    return acc;
                  }, []),
                progress: 0,
                targetSides: morphStateRef.current.targetSides,
                originalGeometry: morphStateRef.current.originalGeometry,
                phase: 'final_shape',
                nextShowTarget: isShowMode ? {
                  sides: Math.floor(4 + Math.random() * 97),
                  startColor: `hsl(${Math.random() * 360}, ${30 + Math.random() * 40}%, ${30 + Math.random() * 40}%)`,
                  endColor: `hsl(${Math.random() * 360}, ${30 + Math.random() * 40}%, ${30 + Math.random() * 40}%)`
                } : undefined
              };
            }
          } catch (error) {
            console.warn('Error in face-matching phase:', error);
            morphStateRef.current = null;
            setMorphComplete(true);
          }
        } else {
          // Second phase: interpolate to final shape
          try {
            sceneRef.current.mesh.geometry = morphStateRef.current.originalGeometry!;
            if (sceneRef.current.wireframe) {
              const wireframeGeometry = createWireframeFromGeometry(morphStateRef.current.originalGeometry!);
              sceneRef.current.wireframe.geometry = wireframeGeometry;
            }

            if (rawProgress >= 1) {
              setParams({ sides: morphStateRef.current.targetSides });

              // If in show mode or we have a next target, start the next morph
              if (morphStateRef.current.nextShowTarget) {
                const nextTarget = morphStateRef.current.nextShowTarget;
                // Only update the gradient colors after the morph is complete
                setGradientStart(nextTarget.startColor);
                setGradientEnd(nextTarget.endColor);
                handleSidesChange(nextTarget.sides);
              } else {
                morphStateRef.current = null;
                setMorphComplete(true);
              }
            }
          } catch (error) {
            console.warn('Error in final shape phase:', error);
            morphStateRef.current = null;
            setMorphComplete(true);
          }
        }

        // Update progress with slower speed for show mode
        const progressSpeed = isShowMode ? 0.4 : 0.8;
        if (morphStateRef.current) {
          const newProgress = Math.min(1, morphStateRef.current.progress + deltaTime * progressSpeed);
          morphStateRef.current.progress = newProgress;
        }
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
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseleave', handleMouseUp);

      if (sceneRef.current.wireframe) {
        scene.remove(sceneRef.current.wireframe);
        sceneRef.current.geometry?.dispose();
        sceneRef.current.material?.dispose();
      }

      transformControls.dispose();
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
          varying vec3 vNormal;
          varying vec3 vViewPosition;

          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vViewPosition = -mvPosition.xyz;
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 color;
          uniform vec3 gradientStart;
          uniform vec3 gradientEnd;

          varying vec3 vNormal;
          varying vec3 vViewPosition;

          void main() {
            vec3 normal = normalize(vNormal);
            vec3 viewDir = normalize(vViewPosition);
            float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 2.0);
            vec3 finalColor = mix(gradientEnd, gradientStart, fresnel);

            // Add basic lighting
            vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
            float diffuse = max(dot(normal, lightDir), 0.2);

            gl_FragColor = vec4(finalColor * diffuse, 1.0);
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
        group
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
      camera: camera
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
      const vertex = new THREE.Vector3(
        position.getX(i),
        position.getY(i),
        position.getZ(i)
      );
      // Apply the full transformation chain
      vertex.applyMatrix4(mesh.matrixWorld);
      vertices.push(vertex);
    }

    console.log('Original vertices:', vertices);

    // Project vertices to 2D and calculate depth
    const projectedVertices = vertices.map(vertex => {
      const v = vertex.clone();

      // Transform vertex to view space (camera space)
      v.applyMatrix4(camera.matrixWorldInverse);

      // Use negative Z in view space for depth (negative because view space Z points backwards)
      const depth = -v.z;

      // Project to screen space for 2D coordinates
      v.project(camera);

      return {
        x: (v.x + 1) * window.innerWidth / 2,
        y: (-v.y + 1) * window.innerHeight / 2,
        depth
      };
    });

    console.log('Projected vertices with depths:', projectedVertices);

    // Create SVG content
    const minX = Math.min(...projectedVertices.map(v => v.x));
    const maxX = Math.max(...projectedVertices.map(v => v.x));
    const minY = Math.min(...projectedVertices.map(v => v.y));
    const maxY = Math.max(...projectedVertices.map(v => v.y));
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
            [c, a]
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
          [c, a]
        ].forEach(([v1, v2]) => {
          const edgeKey = [Math.min(v1, v2), Math.max(v1, v2)].join(',');
          edges.add(edgeKey);
        });
      }
    }

    // Find min and max depths for normalization
    const depths = projectedVertices.map(v => v.depth);
    const minDepth = Math.min(...depths);
    const maxDepth = Math.max(...depths);
    console.log('Depth range:', { minDepth, maxDepth });

    // Generate SVG content with perspective-based depth shading
    const svgPaths = Array.from(edges).map(edge => {
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
          opacity: finalOpacity
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

  // Modify the sides slider to use morphing
  const handleSidesChange = (newSides: number, targetStartColor?: string, targetEndColor?: string) => {
    // Generate target geometry
    const targetGeometry = generatePolyhedron({ sides: newSides });
    const currentGeometry = sceneRef.current.mesh?.geometry;
    const material = sceneRef.current.mesh?.material as THREE.ShaderMaterial;

    if (!currentGeometry || !sceneRef.current.mesh) {
      // If no current geometry, just set the target directly
      if (sceneRef.current.mesh) {
        sceneRef.current.mesh.geometry = targetGeometry;
      }
      setParams({ sides: newSides });
      return;
    }

    // Capture current colors from the shader uniforms
    const currentStartColor = material?.uniforms.gradientStart.value.getHexString();
    const currentEndColor = material?.uniforms.gradientEnd.value.getHexString();

    // First create an intermediate geometry with the target number of faces
    // but maintaining proportions similar to our current shape
    const intermediateGeometry = generatePolyhedron({ sides: newSides }, true);

    // Create temporary meshes for sampling
    const currentMesh = new THREE.Mesh(currentGeometry);
    const intermediateMesh = new THREE.Mesh(intermediateGeometry);

    // Sample points for the first phase (matching face count)
    const sourcePoints = samplePointsFromMesh(currentMesh, Math.max(params.sides, newSides));
    const targetPoints = samplePointsFromMesh(intermediateMesh, Math.max(params.sides, newSides));

    // Ensure arrays have the same length
    const minLength = Math.min(sourcePoints.length, targetPoints.length);
    const finalSourcePoints = sourcePoints.slice(0, minLength);
    const finalTargetPoints = targetPoints.slice(0, minLength);

    // Set up first phase of morphing
    morphStateRef.current = {
      sourcePoints: finalSourcePoints,
      targetPoints: finalTargetPoints,
      progress: 0,
      targetSides: newSides,
      originalGeometry: targetGeometry,
      phase: 'matching_faces',
      intermediateGeometry,
      nextShowTarget: isShowMode || targetStartColor ? {
        sides: isShowMode ? Math.floor(4 + Math.random() * 97) : newSides,
        startColor: targetStartColor || (isShowMode ? `hsl(${Math.random() * 360}, ${30 + Math.random() * 40}%, ${30 + Math.random() * 40}%)` : `#${currentStartColor}`),
        endColor: targetEndColor || (isShowMode ? `hsl(${Math.random() * 360}, ${30 + Math.random() * 40}%, ${30 + Math.random() * 40}%)` : `#${currentEndColor}`)
      } : {
        sides: newSides,
        startColor: `#${currentStartColor}`,
        endColor: `#${currentEndColor}`
      }
    };
    setMorphComplete(false);

    // Clean up temporary meshes
    currentMesh.geometry.dispose();
    intermediateMesh.geometry.dispose();
  };

  // Create wireframe with gradient shader
  const createGradientWireframe = (geometry: THREE.BufferGeometry) => {
    const wireframeGeometry = createWireframeFromGeometry(geometry);
    const gradientWireframeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        gradientStart: { value: new THREE.Color(gradientStart) },
        gradientEnd: { value: new THREE.Color(gradientEnd) },
        opacity: { value: isShaded ? 0.05 : 1.0 }
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
      side: THREE.DoubleSide
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
        endColor: randomColor()
      };
    };

    // Initial morph if not already morphing
    if (!morphStateRef.current || morphStateRef.current.progress >= 1) {
      const target = generateRandomTarget();
      handleSidesChange(target.sides, target.startColor, target.endColor);
    }
  }, [isShowMode, morphStateRef.current?.progress]);

  return (
    <div className="absolute inset-0 flex flex-col">
      <div ref={containerRef} className="flex-1 cursor-grab active:cursor-grabbing" />

      {/* Control Panel */}
      <div className="bg-black/80 backdrop-blur-xl border-t border-white/10 px-4 py-3 flex items-center gap-4 absolute bottom-0 left-0 right-0">
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
          <button
            onClick={() => setIsShaded(!isShaded)}
            title={isShaded ? "Switch to wireframe view" : "Switch to solid view"}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors cursor-pointer ${
              isShaded
                ? 'bg-white/20 text-white hover:bg-white/30'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {isShaded ? 'Solid' : 'Wireframe'}
          </button>
          <button
            onClick={() => setIsColorPickerOpen(true)}
            title="Customize gradient colors"
            className="px-3 py-1 rounded text-sm font-medium bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            <Palette className="w-5 h-5" weight={isColorPickerOpen ? "fill" : "duotone"} />
          </button>
        </div>

        {/* Animation Controls */}
        <div className="flex items-center gap-2 ml-8">
          <button
            onClick={() => setIsRotating(!isRotating)}
            title={isRotating ? "Stop auto-rotation" : "Start auto-rotation"}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors cursor-pointer ${
              isRotating
                ? 'bg-white text-black hover:bg-white/90'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <ArrowsClockwise className="w-5 h-5" weight={isRotating ? "fill" : "duotone"} />
          </button>
          <button
            onClick={() => setIsShowMode(!isShowMode)}
            title={isShowMode ? "Stop auto-morphing" : "Start auto-morphing"}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors cursor-pointer ${
              isShowMode
                ? 'bg-white text-black hover:bg-white/90'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <SmileyMelting className="w-5 h-5" weight={isShowMode ? "fill" : "duotone"} />
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
                      colorScheme === scheme
                        ? 'border-white scale-105'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="h-8 rounded-md mb-2" style={{
                      background: `linear-gradient(to right, ${colors.start}, ${colors.end})`
                    }} />
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

              <div className="h-8 rounded overflow-hidden" style={{
                background: `linear-gradient(to right, ${gradientStart}, ${gradientEnd})`
              }} />
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