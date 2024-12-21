import { Component, onCleanup, onMount } from 'solid-js';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const GlassSphereScene: Component = () => {
  let containerRef: HTMLDivElement | undefined;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let controls: OrbitControls;
  let sphere: THREE.Mesh;
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };
  let clock = new THREE.Clock();
  let animationFrameId: number;

  // Physics state
  let sphereVelocity = new THREE.Vector3();
  const SPHERE_RADIUS = 1.0;
  const DRAG_SENSITIVITY = 0.015; // Increased drag sensitivity

  // Mouse/Touch state
  let raycaster = new THREE.Raycaster();
  let dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  let dragPoint = new THREE.Vector3();

  const init = () => {
    // Scene setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1, 2); // Moved much closer to sphere

    // Renderer setup with high precision
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      precision: 'highp',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef?.appendChild(renderer.domElement);

    // Controls setup
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1.2; // Allow closer zoom
    controls.maxDistance = 3; // Limit max distance
    controls.target.set(0, 0, 0);

    // Create render targets for background capture with improved settings
    const renderTargetParams = {
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      stencilBuffer: false,
      depthBuffer: true,
      generateMipmaps: true,
      anisotropy: renderer.capabilities.getMaxAnisotropy(),
    };
    let renderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth * window.devicePixelRatio,
      window.innerHeight * window.devicePixelRatio,
      renderTargetParams
    );

    // Create second render target for temporal smoothing
    let prevRenderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth * window.devicePixelRatio,
      window.innerHeight * window.devicePixelRatio,
      renderTargetParams
    );

    // Scene setup
    scene.background = new THREE.Color(0x1a0a00); // Dark reddish-brown background

    // Add ambient light with warm orange color
    const ambientLight = new THREE.AmbientLight(0xff4500, 0.3);
    scene.add(ambientLight);

    // Main light source with warm yellow-orange color
    const mainLight = new THREE.DirectionalLight(0xffa500, 8.0);
    mainLight.position.set(5, 3, 0);
    scene.add(mainLight);

    // Add spot light with warm red color
    const spotLight = new THREE.SpotLight(0xff6347, 16.0, 20, Math.PI / 6, 0.5, 1);
    spotLight.position.set(5, 3, 0);
    spotLight.target.position.set(0, 0, 0);
    scene.add(spotLight);
    scene.add(spotLight.target);

    // Create sphere with fisheye distortion
    const sphereGeometry = new THREE.SphereGeometry(SPHERE_RADIUS, 64, 64);
    const sphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: renderTarget.texture },
        tPrevious: { value: prevRenderTarget.texture },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        sphereRadius: { value: SPHERE_RADIUS },
        distortionStrength: { value: 5.0 },
        ior: { value: 1.5 },
        fresnelBias: { value: 0.1 },
        fresnelScale: { value: 1.0 },
        fresnelPower: { value: 2.0 },
        aberrationStrength: { value: 0.05 },
        modelViewMatrix: { value: new THREE.Matrix4() },
        projectionMatrix: { value: new THREE.Matrix4() },
        inverseProjectionMatrix: { value: new THREE.Matrix4() },
        blendFactor: { value: 0.9 }, // Temporal smoothing factor
        time: { value: 0 }, // Add time uniform
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        varying vec3 vViewPosition;
        varying vec3 vWorldPosition;
        varying vec3 vSphereCenter;

        void main() {
          vPosition = position;
          vNormal = normalMatrix * normal;
          vUv = uv;

          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;

          vSphereCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform sampler2D tPrevious;
        uniform vec2 resolution;
        uniform float sphereRadius;
        uniform float distortionStrength;
        uniform float ior;
        uniform float fresnelBias;
        uniform float fresnelScale;
        uniform float fresnelPower;
        uniform float aberrationStrength;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform mat4 inverseProjectionMatrix;
        uniform float blendFactor;
        uniform float time;

        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        varying vec3 vViewPosition;
        varying vec3 vWorldPosition;
        varying vec3 vSphereCenter;

        // Noise function for dithering
        float rand(vec2 co) {
          return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
        }

        vec2 rayPlaneIntersect(vec3 rayOrigin, vec3 rayDir, vec3 planeNormal, float planeHeight) {
          float denom = dot(planeNormal, rayDir);
          float epsilon = 0.0001;

          // Handle near-parallel rays more gracefully
          if (abs(denom) < epsilon) {
            vec3 perpDir = normalize(rayDir - dot(rayDir, planeNormal) * planeNormal);
            return (rayOrigin + perpDir * 0.1).xz;
          }

          float t = -(dot(planeNormal, rayOrigin) - planeHeight) / denom;
          t = clamp(t, 0.1, 100.0);
          vec3 intersection = rayOrigin + rayDir * t;
          return intersection.xz;
        }

        vec2 worldToScreen(vec3 worldPos) {
          vec4 clipPos = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
          vec3 ndc = clipPos.xyz / clipPos.w;
          vec2 jitter = vec2(rand(ndc.xy), rand(ndc.yx)) * 0.0005;
          return (ndc.xy + jitter) * 0.5 + 0.5;
        }

        vec4 sampleBackgroundAdaptive(vec2 uv, float angleFactor) {
          vec2 resolution = vec2(textureSize(tDiffuse, 0));
          vec2 texelSize = 1.0 / resolution;

          float samplingRadius = texelSize.x * (1.0 + angleFactor * 2.0);
          vec2 cUV = clamp(uv, samplingRadius, 1.0 - samplingRadius);

          vec4 accumColor = vec4(0.0);
          float totalWeight = 0.0;

          for(int i = -1; i <= 1; i++) {
            for(int j = -1; j <= 1; j++) {
              vec2 offset = vec2(float(i), float(j)) * samplingRadius;
              vec2 sampleUV = cUV + offset;

              float weight = 1.0 - length(vec2(i,j)) / (2.0 * sqrt(2.0));
              weight = max(0.0, weight);

              accumColor += texture2D(tDiffuse, sampleUV) * weight;
              totalWeight += weight;
            }
          }

          vec4 currentFrame = accumColor / totalWeight;
          vec4 previousFrame = texture2D(tPrevious, cUV);

          float adaptiveBlend = mix(blendFactor, 0.7, angleFactor);
          return mix(previousFrame, currentFrame, adaptiveBlend);
        }

        vec3 computeRefractedRay(vec3 viewDir, vec3 normal, float chromaticOffset) {
          float viewAngle = abs(dot(viewDir, normal));
          float iorAdjust = mix(1.0, 1.2, smoothstep(0.0, 1.0, viewAngle));
          float actualIor = ior * iorAdjust * (1.0 + chromaticOffset * aberrationStrength);

          vec3 refracted = refract(viewDir, normal, 1.0 / actualIor);
          refracted.y = min(refracted.y, -0.1);

          float noise = rand(refracted.xz) * 0.01 - 0.005;
          refracted.xz += noise;

          return normalize(refracted);
        }

        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);

          float viewAngle = abs(dot(viewDir, normal));
          float angleFactor = 1.0 - viewAngle;

          float fresnel = fresnelBias + fresnelScale * pow(1.0 + dot(viewDir, normal), fresnelPower);
          fresnel *= mix(1.0, 1.3, angleFactor);

          float aberration = aberrationStrength * (1.0 + angleFactor * 0.5);
          vec3 refractedR = computeRefractedRay(viewDir, normal, 1.0 * aberration);
          vec3 refractedG = computeRefractedRay(viewDir, normal, 0.0);
          vec3 refractedB = computeRefractedRay(viewDir, normal, -1.0 * aberration);

          vec2 groundPosR = rayPlaneIntersect(vWorldPosition, refractedR, vec3(0.0, 1.0, 0.0), 0.0);
          vec2 groundPosG = rayPlaneIntersect(vWorldPosition, refractedG, vec3(0.0, 1.0, 0.0), 0.0);
          vec2 groundPosB = rayPlaneIntersect(vWorldPosition, refractedB, vec3(0.0, 1.0, 0.0), 0.0);

          vec2 screenPosR = worldToScreen(vec3(groundPosR.x, 0.0, groundPosR.y));
          vec2 screenPosG = worldToScreen(vec3(groundPosG.x, 0.0, groundPosG.y));
          vec2 screenPosB = worldToScreen(vec3(groundPosB.x, 0.0, groundPosB.y));

          vec4 redChannel = sampleBackgroundAdaptive(screenPosR, angleFactor);
          vec4 greenChannel = sampleBackgroundAdaptive(screenPosG, angleFactor);
          vec4 blueChannel = sampleBackgroundAdaptive(screenPosB, angleFactor);

          vec4 refractionColor = vec4(
            mix(redChannel.r, greenChannel.r, 0.1 * angleFactor),
            greenChannel.g,
            mix(blueChannel.b, greenChannel.b, 0.1 * angleFactor),
            1.0
          );

          vec4 reflectionColor = vec4(1.0);
          vec4 finalColor = mix(refractionColor, reflectionColor, smoothstep(0.0, 1.0, fresnel * (0.2 + 0.2 * angleFactor)));

          float edgeFade = 1.0 - smoothstep(0.6, 0.9, length(vUv * 2.0 - 1.0));
          edgeFade = smoothstep(0.0, 0.2, edgeFade);
          edgeFade *= mix(1.0, 0.9, angleFactor);

          // Modify the fresnel effect to be more subtle and blend with refraction
          fresnel = fresnelBias + fresnelScale * pow(1.0 - abs(dot(viewDir, normal)), fresnelPower);
          fresnel *= mix(0.3, 0.6, angleFactor); // Reduced fresnel intensity

          // Remove the edge glow completely
          // float edgeFactor = pow(1.0 - abs(dot(normal, viewDir)), 2.0);
          // color += vec3(edgeFactor * 0.3);

          // Enhance the refraction at the edges
          float edgeEnhancement = smoothstep(0.2, 0.8, 1.0 - abs(dot(normal, viewDir)));
          refractionColor.rgb *= (1.0 + edgeEnhancement * 0.3);

          // Mix refraction and reflection with reduced reflection
          finalColor = mix(refractionColor, reflectionColor, fresnel * 0.3);

          // Make the edges more transparent
          float opacity = 0.8 - edgeEnhancement * 0.3;

          // Rotate hues over time
          float hueShift = time * 0.1; // Slow rotation
          vec3 warmShift = vec3(
            sin(hueShift) * 0.5 + 0.5,
            sin(hueShift + 2.094) * 0.5 + 0.5,
            sin(hueShift + 4.189) * 0.5 + 0.5
          );

          refractionColor.rgb *= warmShift;
          reflectionColor.rgb *= warmShift;

          gl_FragColor = vec4(finalColor.rgb, opacity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.rotation.x = Math.PI / 2; // Rotate 90 degrees around X axis
    sphere.position.set(0, SPHERE_RADIUS, 0);
    scene.add(sphere);

    // Ground plane
    const planeGeometry = new THREE.PlaneGeometry(20, 20, 256, 256); // Increased resolution
    const planeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        iGlobalTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        iMouse: { value: new THREE.Vector4(0, 0, 0, 0) },
        audio1: { value: 0.0 },
        time: { value: 0 }, // Add time uniform
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float iGlobalTime;
        uniform vec2 iResolution;
        uniform vec4 iMouse;
        uniform float audio1;
        uniform float time;

        #define t iGlobalTime

        varying vec2 vUv;
        varying vec3 vPosition;

        mat2 m(float a){
          float c=cos(a), s=sin(a);
          return mat2(c,-s,s,c);
        }

        float map(vec3 p){
          p.xz*= m(2.4);
          p.xy*= m(.4);
          vec3 q = p*3.+t;
          return p.x*p.y * length(p+vec3(sin(0.7)))*log(length(p)+1.) + sin(q.x+sin(q.z+sin(q.y)))*0.5 - 1.;
        }

        void main() {
          vec2 p = gl_FragCoord.xy/iResolution.y - vec2(.8,.5);

          vec3 cl = vec3(0.);
          float d = 2.5;

          for(int i=0; i<=5; i++) {
            vec3 p = vec3(0,-.2,6.) + normalize(vec3(p, -1.5))*d;
            float rz = map(p);
            float f = clamp((rz - map(p+.1))*0.5*cos(iGlobalTime*.1)*p.x, -.1, 1.);

            // Add time-based color rotation
            float hueShift = time * 0.1;
            vec3 baseColor = vec3(0.4, 0.2, 0.1);
            vec3 accentColor = vec3(3.0, 1.5, 0.5);

            vec3 shiftedBase = vec3(
              baseColor.r * sin(hueShift) * 0.5 + 0.5,
              baseColor.g * sin(hueShift + 2.094) * 0.5 + 0.5,
              baseColor.b * sin(hueShift + 4.189) * 0.5 + 0.5
            );

            vec3 shiftedAccent = vec3(
              accentColor.r * sin(hueShift) * 0.5 + 0.5,
              accentColor.g * sin(hueShift + 2.094) * 0.5 + 0.5,
              accentColor.b * sin(hueShift + 4.189) * 0.5 + 0.5
            );

            vec3 l = shiftedBase + shiftedAccent * f;
            cl = cl*l + (1.-smoothstep(0., 2.5, rz))*.7*l;
            d += min(rz, 1.0);
          }

          gl_FragColor = vec4(cl, 1.);
        }
      `,
      side: THREE.DoubleSide,
    });

    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0;
    scene.add(plane);

    // Update animation loop
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const time = clock.getElapsedTime();

      // Update controls
      controls.update();

      // Update sphere material uniforms
      if (sphere.material instanceof THREE.ShaderMaterial) {
        // Update matrices
        sphere.material.uniforms.modelViewMatrix.value.copy(camera.matrixWorldInverse.multiply(sphere.matrixWorld));
        sphere.material.uniforms.projectionMatrix.value.copy(camera.projectionMatrix);
        sphere.material.uniforms.inverseProjectionMatrix.value.copy(camera.projectionMatrix).invert();

        // Store current render target as previous
        const currentTarget = renderTarget;
        renderTarget.texture.generateMipmaps = true;

        // First render scene without sphere
        sphere.visible = false;
        renderer.setRenderTarget(renderTarget);
        renderer.render(scene, camera);

        // Update sphere textures
        sphere.material.uniforms.tPrevious.value = prevRenderTarget.texture;
        sphere.material.uniforms.tDiffuse.value = renderTarget.texture;

        // Render final scene with sphere
        sphere.visible = true;
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);

        // Swap render targets for next frame
        renderTarget = prevRenderTarget;
        prevRenderTarget = currentTarget;

        // Update time uniforms
        sphere.material.uniforms.time.value = time;
      }

      // Update liquid metal shader uniforms
      planeMaterial.uniforms.iGlobalTime.value = time;
      planeMaterial.uniforms.iResolution.value.set(window.innerWidth, window.innerHeight);
      planeMaterial.uniforms.time.value = time;
    };

    const getMousePosition = (event: MouseEvent | Touch, target: HTMLElement) => {
      const rect = target.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
      };
    };

    const onMouseDown = (event: MouseEvent) => {
      const mousePos = getMousePosition(event, renderer.domElement);
      raycaster.setFromCamera(mousePos, camera);

      const intersects = raycaster.intersectObject(sphere);
      if (intersects.length > 0) {
        isDragging = true;
        controls.enabled = false; // Disable OrbitControls when dragging ball
        previousMousePosition = mousePos;

        // Store the intersection point on the drag plane
        raycaster.ray.intersectPlane(dragPlane, dragPoint);

        event.stopPropagation(); // Prevent event from reaching OrbitControls
      }
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;

      const mousePos = getMousePosition(event, renderer.domElement);
      raycaster.setFromCamera(mousePos, camera);

      // Find the new intersection point
      if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
        const deltaMove = {
          x: mousePos.x - previousMousePosition.x,
          y: mousePos.y - previousMousePosition.y,
        };

        // Convert mouse movement to sphere velocity
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        const cameraAngle = Math.atan2(cameraDirection.x, cameraDirection.z);

        // Apply camera-relative movement with increased sensitivity
        sphereVelocity.x +=
          (deltaMove.x * Math.cos(cameraAngle) - deltaMove.y * Math.sin(cameraAngle)) * DRAG_SENSITIVITY;
        sphereVelocity.z +=
          (deltaMove.x * Math.sin(cameraAngle) + deltaMove.y * Math.cos(cameraAngle)) * DRAG_SENSITIVITY;

        // Limit maximum velocity
        const maxVelocity = 0.8; // Increased max velocity
        if (sphereVelocity.length() > maxVelocity) {
          sphereVelocity.normalize().multiplyScalar(maxVelocity);
        }

        previousMousePosition = mousePos;
      }
    };

    const onMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        controls.enabled = true; // Re-enable OrbitControls after dragging
      }
    };

    // Touch event handlers
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        const touch = event.touches[0];
        const mousePos = getMousePosition(touch, renderer.domElement);
        raycaster.setFromCamera(mousePos, camera);

        const intersects = raycaster.intersectObject(sphere);
        if (intersects.length > 0) {
          event.preventDefault();
          isDragging = true;
          controls.enabled = false; // Disable OrbitControls when dragging ball
          previousMousePosition = mousePos;

          // Store the intersection point on the drag plane
          raycaster.ray.intersectPlane(dragPlane, dragPoint);
        }
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        event.preventDefault();
        const touch = event.touches[0];
        onMouseMove(touch as unknown as MouseEvent);
      }
    };

    const onTouchEnd = () => {
      if (isDragging) {
        isDragging = false;
        controls.enabled = true; // Re-enable OrbitControls after dragging
      }
    };

    // Event listeners
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('touchstart', onTouchStart);
    renderer.domElement.addEventListener('touchmove', onTouchMove);
    renderer.domElement.addEventListener('touchend', onTouchEnd);

    animate();

    // Cleanup event listeners
    onCleanup(() => {
      // Stop animation loop
      cancelAnimationFrame(animationFrameId);

      // Remove event listeners
      renderer?.domElement.removeEventListener('mousedown', onMouseDown);
      renderer?.domElement.removeEventListener('mousemove', onMouseMove);
      renderer?.domElement.removeEventListener('mouseup', onMouseUp);
      renderer?.domElement.removeEventListener('touchstart', onTouchStart);
      renderer?.domElement.removeEventListener('touchmove', onTouchMove);
      renderer?.domElement.removeEventListener('touchend', onTouchEnd);

      // Dispose of THREE.js objects
      sphere?.geometry.dispose();
      if (sphere?.material instanceof THREE.ShaderMaterial) {
        sphere.material.dispose();
      }
      renderTarget?.dispose();
      prevRenderTarget?.dispose();

      // Dispose of controls
      controls?.dispose();

      // Dispose of renderer
      renderer?.dispose();
      
      // Remove canvas from DOM
      containerRef?.removeChild(renderer?.domElement);
    });
  };

  onMount(() => {
    init();
  });

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'black',
        'z-index': -1,
      }}
    />
  );
};

export default GlassSphereScene;
