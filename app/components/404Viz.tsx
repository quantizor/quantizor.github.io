import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export default function Visualization() {
  const containerRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const canvas = containerRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);

    // Calculate initial camera distance
    function getResponsiveCameraDistance() {
        // Increased minimum distance and reduced scaling factor
        return Math.max(60, Math.min(window.innerWidth, 1600) * 0.02);
    }
    camera.position.set(0, 0, getResponsiveCameraDistance());

    // Add orbit controls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.rotateSpeed = 1;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.33;
    controls.listenToKeyEvents(window); // bind keyboard controls
    controls.minDistance = 50;  // Increased minimum distance
    controls.maxDistance = 100; // Prevent getting too far

    // Create container for the shape
    const container = new THREE.Group();
    container.position.y = 8; // Move up in viewport
    scene.add(container);

    // Calculate responsive size based on screen width
    function getResponsiveRadius() {
        // Reduced scale factor and max width
        return Math.min(window.innerWidth, 1000) * 0.003 * 8.4;
    }

    function updateShapeSize() {
        const radius = getResponsiveRadius();
        const scale = radius / Math.sqrt(phi * phi + 1);

        // Update vertices positions
        vertices.forEach((vertex, i) => {
            const normalizedPos = vertex.clone().normalize();
            points[i].position.copy(normalizedPos.multiplyScalar(scale));
        });

        // Update lines
        edges.forEach(([startIdx, endIdx], i) => {
            const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                points[startIdx].position,
                points[endIdx].position
            ]);
            lines[i].geometry.dispose();
            lines[i].geometry = lineGeometry;
        });

        // Update camera position
        camera.position.setZ(getResponsiveCameraDistance());
    }

    // Create icosahedron
    const vertices: THREE.Vector3[] = [];
    const edges: [number, number][] = [];
    const points: THREE.Mesh[] = [];
    const lines: THREE.Line[] = [];

    const phi = (1 + Math.sqrt(5)) / 2;
    const radius = getResponsiveRadius();
    const scale = radius / Math.sqrt(phi * phi + 1);

    // Create vertices
    for(let i = -1; i <= 1; i += 2) {
        for(let j = -1; j <= 1; j += 2) {
            vertices.push(
                new THREE.Vector3(0, i * scale, j * phi * scale),
                new THREE.Vector3(j * phi * scale, 0, i * scale),
                new THREE.Vector3(i * scale, j * phi * scale, 0)
            );
        }
    }

    // Find edges by connecting nearest neighbors
    for(let i = 0; i < 12; i++) {
        for(let j = i + 1; j < 12; j++) {
            const dist = vertices[i].distanceTo(vertices[j]);
            if (Math.abs(dist - (2.0 * scale)) < 0.1) {
                edges.push([i, j]);
            }
        }
    }

    // Create points
    const pointGeometry = new THREE.SphereGeometry(0.01);
    const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    vertices.forEach(position => {
        const point = new THREE.Mesh(pointGeometry, pointMaterial);
        point.position.copy(position);
        container.add(point);
        points.push(point);
    });

    // Create lines
    edges.forEach(([startIdx, endIdx]) => {
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            vertices[startIdx],
            vertices[endIdx]
        ]);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        container.add(line);
        lines.push(line);
    });

    // Add mouse event listeners
    const handlePointerDown = () => {
        controls.autoRotate = false;
    };

    const handlePointerUp = () => {
        controls.autoRotate = true;
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('pointerleave', handlePointerUp);

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }

    function handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        updateShapeSize();
    }

    window.addEventListener('resize', handleResize);
    animate();

    // Call handleResize immediately to ensure correct initial size
    handleResize();

    return () => {
        window.removeEventListener('resize', handleResize);
        renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
        renderer.domElement.removeEventListener('pointerup', handlePointerUp);
        renderer.domElement.removeEventListener('pointerleave', handlePointerUp);
        renderer.dispose();
        scene.clear();
    };
  }, []);

  return (
    <canvas
      ref={containerRef}
      className="fixed inset-0 w-screen h-screen cursor-grab active:cursor-grabbing"
      style={{ touchAction: 'none', zIndex: 0 }}
    />
  );
}