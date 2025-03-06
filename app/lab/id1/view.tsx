'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/controls/OrbitControls.js';
import { EXRLoader as EXRLoaderImpl } from 'three/examples/jsm/loaders/EXRLoader.js';

export function ID1() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const totalTextures = 7; // 6 textures + 1 skybox

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    // Reset loading state on hot reload
    setLoading(true);
    setLoadingProgress(0);

    // Create Scene and Camera
    const elevationAngle = 15 * (Math.PI / 180);
    const baseDistance = 20; // Base distance for reference width
    const referenceWidth = 1920; // Reference screen width
    const distance = baseDistance * Math.max(1, Math.sqrt(referenceWidth / window.innerWidth));
    const height = distance * Math.sin(elevationAngle);
    const horizontalDist = distance * Math.cos(elevationAngle);
    const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Position camera at slate level (-1.5) and look up at sphere
    camera.position.set(horizontalDist * 0.7, -1.5, horizontalDist * 0.7);
    camera.lookAt(0, 0, 0); // Look at center of sphere for more upward angle

    const scene = new THREE.Scene();

    // Variables we'll need access to in the cleanup function
    let renderer: THREE.WebGLRenderer;
    let controls: OrbitControlsImpl;
    let animationFrameId: number;
    let handleResize: () => void;

    // Function to initialize renderer on next frame to ensure DOM is ready
    const initRenderer = () => {
      try {
        if (!canvasRef.current) {
          // If canvas isn't available yet, try again next frame
          animationFrameId = requestAnimationFrame(initRenderer);
          return;
        }

        // Initialize renderer
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          canvas: canvasRef.current,
          powerPreference: 'high-performance',
        });

        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        // Initialize orbit controls
        controls = new OrbitControlsImpl(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 5;
        controls.maxDistance = 50;
        controls.enablePan = false;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.5;

        // Initialize texture loaders
        const textureLoader = new THREE.TextureLoader();
        const exrLoader = new EXRLoaderImpl();

        // Load all textures and skybox in parallel
        const textureUrls = [
          '/images/slate2-tiled-albedo2.png',
          '/images/slate2-tiled-height.png',
          '/images/slate2-tiled-metalness.png',
          '/images/slate2-tiled-rough.png',
          '/images/slate2-tiled-ao.png',
          '/images/slate2-tiled-ogl.png',
        ];

        const applyTexture = (texture: THREE.Texture, material: THREE.MeshStandardMaterial, type: string) => {
          const shouldCloneForTop = material === materials[2];
          const finalTexture = shouldCloneForTop ? texture.clone() : texture;

          // Set up texture parameters
          finalTexture.wrapS = finalTexture.wrapT = THREE.RepeatWrapping;

          if (shouldCloneForTop) {
            finalTexture.repeat.set(2, 2); // Top face needs different repeat
          } else {
            finalTexture.repeat.set(2, 10); // Sides need more vertical repeat
          }

          switch (type) {
            case 'albedo':
              material.map = finalTexture;
              break;
            case 'height':
              material.displacementMap = finalTexture;
              material.displacementScale = 0.05; // Reduced displacement
              material.displacementBias = -0.025;
              break;
            case 'metalness':
              material.metalnessMap = finalTexture;
              break;
            case 'rough':
              material.roughnessMap = finalTexture;
              break;
            case 'ao':
              material.aoMap = finalTexture;
              material.aoMapIntensity = 1.0;
              break;
            case 'normal':
              material.normalMap = finalTexture;
              material.normalScale.set(0.5, 0.5); // Reduced normal intensity
              break;
          }
          material.needsUpdate = true;
        };

        const textureTypes = ['albedo', 'height', 'metalness', 'rough', 'ao', 'normal'];

        // Ground Plane (Slate Column)
        const planeGeometry = new THREE.BoxGeometry(
          10, // width
          50, // height
          10, // depth
          64, // widthSegments - increased for smoother edges
          128, // heightSegments - increased for better vertical detail
          64 // depthSegments
        );

        // Create spherical depression
        const vertices = planeGeometry.attributes.position.array;
        const sphereRadius = 4; // Match the glass sphere radius
        const cutDepth = 0.75; // Reduced depth for smoother transition

        for (let i = 0; i < vertices.length; i += 3) {
          const x = vertices[i];
          const y = vertices[i + 1];
          const z = vertices[i + 2];

          // Calculate distance from center point on top surface
          const distFromCenter = Math.sqrt(x * x + z * z);

          // Spherical depression on top
          if (distFromCenter < sphereRadius * 1.2 && y > 24) {
            const normalizedDist = distFromCenter / (sphereRadius * 1.2);
            const depthAtPoint = cutDepth * Math.sqrt(1 - normalizedDist * normalizedDist);
            vertices[i + 1] -= depthAtPoint;
          }
        }

        planeGeometry.attributes.position.needsUpdate = true;
        planeGeometry.computeVertexNormals();

        const planeMaterial = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          displacementScale: 0.05,
          displacementBias: -0.025,
          roughness: 1.0,
          metalness: 1.0,
          side: THREE.FrontSide,
          envMapIntensity: 1.0,
        });

        // Create materials for each face
        const materials = [
          planeMaterial.clone(), // right
          planeMaterial.clone(), // left
          planeMaterial.clone(), // top - needs different repeat
          planeMaterial.clone(), // bottom
          planeMaterial.clone(), // front
          planeMaterial.clone(), // back
        ];

        // Create and add mesh immediately
        const plane = new THREE.Mesh(planeGeometry, materials);
        plane.position.y = -26.5;
        scene.add(plane);

        // Function to update loading progress
        let loadedCount = 0;
        const updateLoadingProgress = () => {
          loadedCount++;
          const percentage = Math.round((loadedCount / totalTextures) * 100);
          setLoadingProgress(percentage);

          if (loadedCount === totalTextures) {
            setTimeout(() => setLoading(false), 500);
          }
        };

        // Glass Sphere
        const sphereGeometry = new THREE.SphereGeometry(4, 64, 64);
        const sphereMaterial = new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          metalness: 0.0,
          roughness: 0.0,
          transmission: 0.99,
          thickness: 2.75, // Reduced from 3.5
          envMapIntensity: 1.75, // Reduced from 2.0
          clearcoat: 1.0,
          clearcoatRoughness: 0.0,
          ior: 1.75, // Reduced from 2.0
          transparent: true,
          opacity: 0.98,
          attenuationColor: new THREE.Color(0.97, 0.97, 1.0), // More subtle blue tint
          attenuationDistance: 6.0, // Increased for less color absorption
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.y = 0; // Adjusted position for larger sphere
        scene.add(sphere);

        // Load textures and skybox
        Promise.all([
          // Load regular textures
          ...textureUrls.map(
            (url, index) =>
              new Promise<void>((resolve, reject) => {
                textureLoader.load(
                  url,
                  (texture) => {
                    materials.forEach((mat) => {
                      applyTexture(texture, mat as THREE.MeshStandardMaterial, textureTypes[index]);
                    });
                    updateLoadingProgress();
                    resolve();
                  },
                  undefined,
                  reject
                );
              })
          ),
          // Load skybox
          new Promise<void>((resolve, reject) => {
            exrLoader.load(
              '/images/skybox.exr',
              (texture) => {
                const pmremGenerator = new THREE.PMREMGenerator(renderer);
                pmremGenerator.compileEquirectangularShader();

                const envMap = pmremGenerator.fromEquirectangular(texture).texture;
                scene.environment = envMap;
                scene.background = envMap;

                // Update materials to use environment map
                sphereMaterial.envMap = envMap;
                sphereMaterial.needsUpdate = true;

                texture.dispose();
                pmremGenerator.dispose();

                updateLoadingProgress();
                resolve();
              },
              undefined,
              reject
            );
          }),
        ]).catch((error) => {
          console.error('Error loading textures:', error);
        });

        // Animation function
        const animate = () => {
          animationFrameId = requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        };

        // Handle window resize
        handleResize = () => {
          const width = window.innerWidth;
          const height = window.innerHeight;

          // Recalculate distance based on new screen width
          const newDistance = baseDistance * Math.max(1, Math.sqrt(referenceWidth / width));
          const newHeight = newDistance * Math.sin(elevationAngle);
          const newHorizontalDist = newDistance * Math.cos(elevationAngle);

          camera.position.set(newHorizontalDist * 0.7, -1.5, newHorizontalDist * 0.7);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();

          renderer.setSize(width, height);
        };

        window.addEventListener('resize', handleResize);
        animate();
      } catch (error) {
        console.error('Error initializing WebGL renderer:', error);
        // Attempt to initialize again on the next frame if it failed
        animationFrameId = requestAnimationFrame(initRenderer);
      }
    };

    // Start renderer initialization on the next frame
    animationFrameId = requestAnimationFrame(initRenderer);

    // Cleanup function for the main useEffect
    return () => {
      // Cancel any pending initialization or animation frames
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      // If renderer was successfully created, clean it up
      if (renderer) {
        // Remove event listeners
        window.removeEventListener('resize', handleResize);

        // Dispose of controls if they were created
        if (controls) {
          controls.dispose();
        }

        // Dispose of renderer
        renderer.dispose();

        // Clean up WebGL context
        const gl = renderer.getContext();
        gl?.getExtension('WEBGL_lose_context')?.loseContext();

        // Dispose of all scene resources
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });

        // Clear scene
        while (scene.children.length > 0) {
          scene.remove(scene.children[0]);
        }
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 w-screen h-screen overflow-hidden">
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/75 z-10">
          <div className="text-center text-amber-400">
            <div className="text-2xl mb-4">Loading...</div>
            <div className="text-xl">{loadingProgress}%</div>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
