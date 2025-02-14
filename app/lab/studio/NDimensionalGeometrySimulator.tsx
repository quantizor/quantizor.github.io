import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { NDimensionalParams } from './types';
import { generatePolyhedron } from './geometries';

const STORAGE_KEY = 'polyhedron-simulator-settings';
const CAMERA_STORAGE_KEY = 'polyhedron-simulator-camera';

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
  const [isShaded, setIsShaded] = useState(false);
  const [params, setParams] = useState<NDimensionalParams>(DEFAULT_PARAMS);

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

  // Update geometry when shading changes
  useEffect(() => {
    if (!sceneRef.current.mesh || !sceneRef.current.wireframe) return;

    sceneRef.current.mesh.visible = isShaded;
    sceneRef.current.wireframe.visible = true; // Always show wireframe
  }, [isShaded]);

  // Save camera position periodically
  useEffect(() => {
    const handleControlChange = () => {
      requestAnimationFrame(saveCameraState);
    };

    const controls = sceneRef.current.controls;
    if (controls) {
      controls.addEventListener('change', handleControlChange);
      controls.addEventListener('end', handleControlChange);
    }

    // Cleanup
    return () => {
      if (controls) {
        controls.removeEventListener('change', handleControlChange);
        controls.removeEventListener('end', handleControlChange);
      }
    };
  }, []);

  // Save settings whenever they change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
    } catch (error) {
      console.warn('Failed to save settings:', error);
    }
  }, [params]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

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

    // Animation loop setup with light position update
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

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

    // Store scene objects in ref for updates
    sceneRef.current = {
      geometry: undefined,
      material: undefined,
      mesh: undefined,
      wireframe: undefined,
      camera,
      controls: orbitControls,
      group: geometryGroup
    };

    // Initial geometry update
    const geometry = generatePolyhedron(params);

    // Create solid mesh with phong material for better lighting
    const meshMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: false,
      opacity: 1,
      depthTest: true,
      flatShading: true,
      shininess: 0, // Matte finish
    });
    const mesh = new THREE.Mesh(geometry, meshMaterial);
    mesh.visible = isShaded;

    // Create wireframe
    const wireframeMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff, // White edges
      transparent: false,
      opacity: 1.0,
      depthTest: true,
    });
    const wireframe = new THREE.LineSegments(
      new THREE.WireframeGeometry(geometry),
      wireframeMaterial
    );
    wireframe.visible = true; // Always visible

    geometryGroup.add(mesh);
    geometryGroup.add(wireframe);

    sceneRef.current = {
      ...sceneRef.current,
      geometry,
      material: meshMaterial,
      mesh,
      wireframe,
      group: geometryGroup
    };

    // Cleanup function
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);

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
  }, []); // Empty dependency array for setup

  // Update the geometry update effect
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

      // Create solid mesh with phong material
      const meshMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: false,
        opacity: 1,
        depthTest: true,
        flatShading: true,
        shininess: 0, // Matte finish
      });
      const mesh = new THREE.Mesh(geometry, meshMaterial);
      mesh.visible = isShaded;

      // Create wireframe
      const wireframeMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff, // White edges
        transparent: false,
        opacity: 1.0,
        depthTest: true,
      });
      const wireframe = new THREE.LineSegments(
        new THREE.WireframeGeometry(geometry),
        wireframeMaterial
      );
      wireframe.visible = true; // Always visible

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
  }, [params, isShaded]);

  return (
    <div className="absolute inset-0 flex flex-col">
      <div ref={containerRef} className="flex-1" />

      {/* Control Panel */}
      <div className="bg-black/80 backdrop-blur-xl border-t border-white/10 px-4 py-3 flex items-center gap-4 absolute bottom-0 left-0 right-0">
        {/* Sides Control */}
        <div className="flex items-center gap-2">
          <label className="text-white/80 text-sm font-medium min-w-[3rem]">Sides</label>
          <input
            type="range"
            min="1"
            max="20"
            step="1"
            value={params.sides}
            onChange={(e) => setParams({ sides: parseInt(e.target.value) })}
            className="w-32 accent-white"
          />
          <span className="text-white/80 text-sm w-8 tabular-nums">{params.sides}</span>
        </div>

        {/* Shading Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsShaded(!isShaded)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              isShaded
                ? 'bg-white text-black hover:bg-white/90'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {isShaded ? 'Solid' : 'Wireframe'}
          </button>
        </div>
      </div>
    </div>
  );
}