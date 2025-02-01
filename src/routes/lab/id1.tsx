import { onCleanup, onMount, createSignal } from "solid-js";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader";
import { WorkerTextureLoader } from "@/utils/textureLoader";

const GlassSphereScene = () => {
  let container: HTMLDivElement | undefined;
  let canvasRef: HTMLCanvasElement | undefined;
  const [loading, setLoading] = createSignal(true);
  const [loadingText, setLoadingText] = createSignal("Initializing scene...");
  const [loadedTextures, setLoadedTextures] = createSignal(0);
  const totalTextures = 6; // Total number of textures to load

  onMount(() => {
    if (!container) return;

    // Create Scene and Camera
    const elevationAngle = 15 * (Math.PI / 180);
    const baseDistance = 20; // Base distance for reference width
    const referenceWidth = 1920; // Reference screen width
    const distance =
      baseDistance * Math.max(1, Math.sqrt(referenceWidth / window.innerWidth));
    const height = distance * Math.sin(elevationAngle);
    const horizontalDist = distance * Math.cos(elevationAngle);
    const camera = new THREE.PerspectiveCamera(
      32,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    // Position camera at slate level (-1.5) and look up at sphere
    camera.position.set(horizontalDist * 0.7, -1.5, horizontalDist * 0.7);
    camera.lookAt(0, 0, 0); // Look at center of sphere for more upward angle

    const scene = new THREE.Scene();

    // Initialize renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: canvasRef,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Load skybox
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    const exrLoader = new EXRLoader();
    exrLoader.load("/images/skybox.exr", (texture) => {
      const envMap = pmremGenerator.fromEquirectangular(texture).texture;
      scene.environment = envMap;
      scene.background = envMap;

      // Update materials to use environment map
      const sphereMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.0,
        roughness: 0.0,
        transmission: 0.99,
        thickness: 2.0, // Increased for larger sphere
        envMapIntensity: 1.5,
        clearcoat: 1.0,
        clearcoatRoughness: 0.0,
        ior: 1.5,
        transparent: true,
        opacity: 0.98,
      });
      sphereMaterial.envMap = envMap;
      sphereMaterial.needsUpdate = true;

      texture.dispose();
      pmremGenerator.dispose();
    });

    // Ground Plane (Slate Column)
    const planeGeometry = new THREE.BoxGeometry(
      10, // width
      50, // height
      10, // depth
      512, // widthSegments - increased for smoother displacement
      512, // heightSegments - increased for edges
      512 // depthSegments - increased for smoother displacement
    );

    // Create spherical depression
    const vertices = planeGeometry.attributes.position.array;
    const sphereRadius = 4; // Match the glass sphere radius
    const cutDepth = 1.0; // Increased for larger sphere

    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const y = vertices[i + 1];
      const z = vertices[i + 2];

      // Calculate distance from center point on top surface
      const distFromCenter = Math.sqrt(x * x + z * z);

      if (distFromCenter < sphereRadius * 1.2 && y > 24) {
        // Only affect top portion
        // Slightly larger than sphere for smooth transition
        // Create spherical depression using spherical cap equation
        const normalizedDist = distFromCenter / (sphereRadius * 1.2);
        const depthAtPoint =
          cutDepth * Math.sqrt(1 - normalizedDist * normalizedDist);

        vertices[i + 1] -= depthAtPoint;
      }
    }

    planeGeometry.attributes.position.needsUpdate = true;
    planeGeometry.computeVertexNormals();

    const planeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      displacementScale: 0.15, // Reduced to minimize gaps
      displacementBias: -0.1, // Adjusted to keep overall depth
      roughness: 1.0, // Let roughness map control this
      metalness: 1.0, // Let metalness map control this
      side: THREE.DoubleSide,
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

    // Create loading overlay
    const loadingOverlay = document.createElement("div");
    loadingOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: rgba(0, 0, 0, 0.8);
      z-index: 1000;
      transition: opacity 0.5s ease-out;
    `;

    const flagLoader = document.createElement("div");
    flagLoader.style.cssText = `
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 4px;
      width: 40px;
      height: 40px;
    `;

    // Create squares
    const squares = Array.from({ length: 4 }, () => {
      const square = document.createElement("div");
      square.style.cssText = `
        background-color: #ffbf00;
        width: 100%;
        height: 100%;
        opacity: 0;
        transition: opacity 0.1s ease-in-out;
      `;
      return square;
    });

    squares.forEach((square) => flagLoader.appendChild(square));
    loadingOverlay.appendChild(flagLoader);
    document.body.appendChild(loadingOverlay);

    // Add blur filter to canvas
    canvasRef!.style.filter = "blur(10px)";
    canvasRef!.style.transition = "filter 0.5s ease-out";

    // Initial square state
    squares[0].style.opacity = "1";
    squares[3].style.opacity = "1";

    // Track if we're in the fade out phase
    let isFading = false;

    // Animate squares
    let animationFrame: number;
    const animateLoader = () => {
      if (loadingOverlay.parentNode === null) {
        cancelAnimationFrame(animationFrame);
        return;
      }

      const time = Date.now();
      const phase = Math.floor(time / 200) % 2; // Switch every 200ms

      if (phase === 0) {
        squares[0].style.opacity = "1";
        squares[1].style.opacity = "0";
        squares[2].style.opacity = "0";
        squares[3].style.opacity = "1";
      } else {
        squares[0].style.opacity = "0";
        squares[1].style.opacity = "1";
        squares[2].style.opacity = "1";
        squares[3].style.opacity = "0";
      }

      animationFrame = requestAnimationFrame(animateLoader);
    };
    animateLoader();

    // Function to update loading progress
    const updateLoadingProgress = (textureType: string) => {
      const current = loadedTextures() + 1;
      setLoadedTextures(current);

      if (current === totalTextures && !isFading) {
        isFading = true;
        setTimeout(() => {
          setLoading(false);
          loadingOverlay.style.opacity = "0";
          canvasRef!.style.filter = "blur(0)";
          setTimeout(() => loadingOverlay.remove(), 500);
        }, 500);
      }
    };

    // Load textures
    const textureLoader = new WorkerTextureLoader();

    // Helper function to load a texture and apply it to materials
    const loadAndApplyTexture = async (
      url: string,
      applyTexture: (
        texture: THREE.Texture,
        material: THREE.MeshStandardMaterial
      ) => void
    ) => {
      try {
        const texture = await textureLoader.loadTexture(url, { x: 1, y: 5 });
        materials.forEach((mat) => {
          applyTexture(texture, mat as THREE.MeshStandardMaterial);
          mat.needsUpdate = true;
        });
        updateLoadingProgress(url);
      } catch (error) {
        console.error(`Error loading texture ${url}:`, error);
      }
    };

    // Load all textures in parallel
    Promise.all([
      loadAndApplyTexture(
        "/images/slate2-tiled-albedo2.png",
        (texture, mat) => {
          if (mat === materials[2]) {
            // top face
            const topTexture = texture.clone();
            topTexture.repeat.set(1, 1);
            mat.map = topTexture;
          } else {
            // sides
            texture.repeat.set(1, 5);
            mat.map = texture;
          }
        }
      ),
      loadAndApplyTexture("/images/slate2-tiled-height.png", (texture, mat) => {
        if (mat === materials[2]) {
          // top face
          const topTexture = texture.clone();
          topTexture.repeat.set(1, 1);
          mat.displacementMap = topTexture;
        } else {
          // sides
          texture.repeat.set(1, 5);
          mat.displacementMap = texture;
        }
      }),
      loadAndApplyTexture(
        "/images/slate2-tiled-metalness.png",
        (texture, mat) => {
          if (mat === materials[2]) {
            // top face
            const topTexture = texture.clone();
            topTexture.repeat.set(1, 1);
            mat.metalnessMap = topTexture;
          } else {
            // sides
            texture.repeat.set(1, 5);
            mat.metalnessMap = texture;
          }
        }
      ),
      loadAndApplyTexture("/images/slate2-tiled-rough.png", (texture, mat) => {
        if (mat === materials[2]) {
          // top face
          const topTexture = texture.clone();
          topTexture.repeat.set(1, 1);
          mat.roughnessMap = topTexture;
        } else {
          // sides
          texture.repeat.set(1, 5);
          mat.roughnessMap = texture;
        }
      }),
      loadAndApplyTexture("/images/slate2-tiled-ao.png", (texture, mat) => {
        if (mat === materials[2]) {
          // top face
          const topTexture = texture.clone();
          topTexture.repeat.set(1, 1);
          mat.aoMap = topTexture;
        } else {
          // sides
          texture.repeat.set(1, 5);
          mat.aoMap = texture;
        }
        mat.aoMapIntensity = 1.0;
      }),
      loadAndApplyTexture("/images/slate2-tiled-ogl.png", (texture, mat) => {
        if (mat === materials[2]) {
          // top face
          const topTexture = texture.clone();
          topTexture.repeat.set(1, 1);
          mat.normalMap = topTexture;
        } else {
          // sides
          texture.repeat.set(1, 5);
          mat.normalMap = texture;
        }
        mat.normalScale.set(1, 1);
      }),
    ]).catch((error) => {
      console.error("Error loading textures:", error);
    });

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

    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);

    // OrbitControls for interactivity
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = distance;
    controls.maxDistance = distance;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.2;
    // Adjust vertical rotation limits for more dramatic upward angle
    controls.minPolarAngle = Math.PI / 2 - 1.0; // Allow even higher up view
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Keep camera looking up more
    controls.target.set(0, 0, 0); // Orbit around center of sphere

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      if (!loading()) {
        // Only rotate when loading is complete
        sphere.rotation.y += 0.005;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resizing
    const handleResize = () => {
      const newDistance =
        baseDistance *
        Math.max(1, Math.sqrt(referenceWidth / window.innerWidth));
      const newHorizontalDist = newDistance * Math.cos(elevationAngle);

      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      camera.position.setLength(newDistance);
      controls.minDistance = newDistance;
      controls.maxDistance = newDistance;

      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup animation on unmount
    onCleanup(() => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      renderer.dispose();
      textureLoader.dispose();
    });
  });

  return (
    <div
      ref={container}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        "z-index": -1,
      }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
};

export default function Page() {
  return <GlassSphereScene />;
}
