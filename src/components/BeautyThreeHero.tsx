import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RotateCcw } from 'lucide-react';

interface ShadeOption {
  id: string;
  name: string;
  hex: string;
  lipstickHex: string;
}

const SHADES: ShadeOption[] = [
  { id: 'cereja', name: 'Cereja Glow', hex: '#FF2D6F', lipstickHex: '#D81B5A' },
  { id: 'pink', name: 'Pink Chiclete', hex: '#FF5C93', lipstickHex: '#E8437A' },
  { id: 'morango', name: 'Morango Fizz', hex: '#E11D48', lipstickHex: '#B91C47' },
  { id: 'malva', name: 'Malva Rosé', hex: '#C05A7A', lipstickHex: '#9E4361' },
];

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createMarbleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#fdf4f7';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(218, 175, 189, 0.35)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (i * 22) % 256);
      ctx.bezierCurveTo(80, (i * 31) % 256, 170, (i * 19 + 40) % 256, 256, (i * 27) % 256);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function BeautyThreeHero() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [activeShade, setActiveShade] = useState<ShadeOption>(SHADES[0]);
  const [dockCollapsed, setDockCollapsed] = useState(false);

  const targetColorRef = useRef(new THREE.Color(SHADES[0].hex));
  const targetLipstickColorRef = useRef(new THREE.Color(SHADES[0].lipstickHex));
  const targetRotYRef = useRef(0.32);
  const targetRotXRef = useRef(0.08);
  const requestRenderRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    targetColorRef.current.set(activeShade.hex);
    targetLipstickColorRef.current.set(activeShade.lipstickHex);
    requestRenderRef.current?.();
  }, [activeShade]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const width = container.clientWidth || 520;
    const height = container.clientHeight || 440;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      preserveDrawingBuffer: isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#fff5f8');
    scene.fog = new THREE.Fog('#fff5f8', 7, 16);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 40);
    camera.position.set(0, 1.4, 5.7);
    camera.lookAt(0, 0.15, 0);

    // 3-point warm/cool studio lighting
    const hemi = new THREE.HemisphereLight('#fff8fb', '#e7c6d4', 0.85);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight('#fff5ea', 2.2);
    keyLight.position.set(3.5, 5, 4);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -2.5;
    keyLight.shadow.camera.right = 2.5;
    keyLight.shadow.camera.top = 2.5;
    keyLight.shadow.camera.bottom = -2.5;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#ffd1e3', 1.2);
    rimLight.position.set(-4, 3, -3);
    scene.add(rimLight);

    // Track disposables
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];

    const marbleTex = createMarbleTexture();
    marbleTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    textures.push(marbleTex);

    // Shared materials
    const goldMat = new THREE.MeshPhysicalMaterial({
      color: '#e5be73',
      metalness: 0.92,
      roughness: 0.18,
      anisotropy: 0.8,
      clearcoat: 0.4,
    });
    const marbleMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: marbleTex,
      roughness: 0.42,
      metalness: 0.05,
    });
    const blushCapMat = new THREE.MeshPhysicalMaterial({
      color: '#f9c2d6',
      roughness: 0.28,
      metalness: 0.05,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      metalness: 0.0,
      roughness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      transmission: isSoftwareGl ? 0 : 0.86,
      transparent: true,
      opacity: isSoftwareGl ? 0.36 : 1,
      ior: 1.52,
      thickness: 0.4,
      depthWrite: false,
    });
    const glossCoreMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(SHADES[0].hex),
      roughness: 0.12,
      metalness: 0.02,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    });
    const lipstickMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(SHADES[0].lipstickHex),
      roughness: 0.58,
      metalness: 0.04,
    });
    const cherryMat = new THREE.MeshPhysicalMaterial({
      color: '#d9043d',
      roughness: 0.12,
      metalness: 0.05,
      clearcoat: 1.0,
    });
    const leafMat = new THREE.MeshStandardMaterial({
      color: '#2d9d62',
      roughness: 0.45,
      metalness: 0.1,
    });
    const shadowMat = new THREE.MeshBasicMaterial({
      color: '#d8a7b8',
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    materials.push(
      goldMat,
      marbleMat,
      blushCapMat,
      glassMat,
      glossCoreMat,
      lipstickMat,
      cherryMat,
      leafMat,
      shadowMat
    );

    const stageGroup = new THREE.Group();
    stageGroup.position.y = 0.22;
    scene.add(stageGroup);

    // 1. Marble Pedestal + Gold Rim
    const plinthGeo = new THREE.CylinderGeometry(1.55, 1.62, 0.28, 48);
    const rimGeo = new THREE.TorusGeometry(1.56, 0.022, 16, 64);
    const contactGeo = new THREE.CircleGeometry(1.75, 48);
    geometries.push(plinthGeo, rimGeo, contactGeo);

    const plinthMesh = new THREE.Mesh(plinthGeo, marbleMat);
    plinthMesh.position.y = -0.82;
    plinthMesh.receiveShadow = true;
    stageGroup.add(plinthMesh);

    const rimMesh = new THREE.Mesh(rimGeo, goldMat);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.y = -0.685;
    stageGroup.add(rimMesh);

    const contactDisc = new THREE.Mesh(contactGeo, shadowMat);
    contactDisc.rotation.x = -Math.PI / 2;
    contactDisc.position.y = -0.665;
    stageGroup.add(contactDisc);

    // 2. Hero Lip Gloss Vial + Gold Collar + Cap + Cherry Charm (Composite Group)
    const glossGroup = new THREE.Group();
    glossGroup.position.set(-0.36, -0.68, 0.12);
    stageGroup.add(glossGroup);

    const vialPoints = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.3, 0.0),
      new THREE.Vector2(0.34, 0.05),
      new THREE.Vector2(0.34, 1.32),
      new THREE.Vector2(0.28, 1.4),
      new THREE.Vector2(0.26, 1.48),
    ];
    const vialGeo = new THREE.LatheGeometry(vialPoints, 36);
    const coreGeo = new THREE.CylinderGeometry(0.265, 0.265, 1.24, 32);
    const collarGeo = new THREE.CylinderGeometry(0.295, 0.295, 0.18, 36);
    const capGeo = new THREE.CylinderGeometry(0.31, 0.31, 0.56, 36);
    const capTopGeo = new THREE.SphereGeometry(0.31, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    geometries.push(vialGeo, coreGeo, collarGeo, capGeo, capTopGeo);

    const coreMesh = new THREE.Mesh(coreGeo, glossCoreMat);
    coreMesh.position.y = 0.72;
    glossGroup.add(coreMesh);

    const vialMesh = new THREE.Mesh(vialGeo, glassMat);
    vialMesh.renderOrder = 2;
    vialMesh.castShadow = !isSoftwareGl;
    glossGroup.add(vialMesh);

    const collarMesh = new THREE.Mesh(collarGeo, goldMat);
    collarMesh.position.y = 1.49;
    glossGroup.add(collarMesh);

    const capMesh = new THREE.Mesh(capGeo, blushCapMat);
    capMesh.position.y = 1.86;
    capMesh.castShadow = !isSoftwareGl;
    glossGroup.add(capMesh);

    const capTopMesh = new THREE.Mesh(capTopGeo, blushCapMat);
    capTopMesh.position.y = 2.14;
    capTopMesh.scale.y = 0.28;
    glossGroup.add(capTopMesh);

    // Charm Clasp & Hanging Cherries
    const claspGeo = new THREE.TorusGeometry(0.09, 0.018, 12, 24);
    const chainGeo = new THREE.TorusGeometry(0.045, 0.011, 10, 18);
    const cherryGeo = new THREE.SphereGeometry(0.11, 24, 24);
    const stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.03, 0.18, 0),
      new THREE.Vector3(0.08, 0.32, 0),
    ]);
    const stemGeo = new THREE.TubeGeometry(stemCurve, 12, 0.012, 8, false);

    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, 0);
    leafShape.quadraticCurveTo(0.09, 0.06, 0.14, 0);
    leafShape.quadraticCurveTo(0.09, -0.06, 0, 0);
    const leafGeo = new THREE.ExtrudeGeometry(leafShape, {
      depth: 0.018,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 2,
    });
    geometries.push(claspGeo, chainGeo, cherryGeo, stemGeo, leafGeo);

    const charmGroup = new THREE.Group();
    charmGroup.position.set(0.33, 1.56, 0.04);
    charmGroup.rotation.z = -0.1;
    glossGroup.add(charmGroup);

    const claspMesh = new THREE.Mesh(claspGeo, goldMat);
    charmGroup.add(claspMesh);

    for (let i = 0; i < 3; i++) {
      const link = new THREE.Mesh(chainGeo, goldMat);
      link.position.set(0.05, -0.11 - i * 0.075, 0);
      link.rotation.y = i % 2 === 0 ? 0 : Math.PI / 2;
      charmGroup.add(link);
    }

    const cherryA = new THREE.Mesh(cherryGeo, cherryMat);
    cherryA.position.set(-0.04, -0.62, 0.03);
    const cherryB = new THREE.Mesh(cherryGeo, cherryMat);
    cherryB.position.set(0.14, -0.58, -0.03);
    const stemA = new THREE.Mesh(stemGeo, goldMat);
    stemA.position.set(-0.04, -0.53, 0.03);
    const stemB = new THREE.Mesh(stemGeo, goldMat);
    stemB.position.set(0.14, -0.5, -0.03);
    stemB.rotation.z = 0.35;
    const leafMesh = new THREE.Mesh(leafGeo, leafMat);
    leafMesh.position.set(0.04, -0.25, 0);
    leafMesh.rotation.z = 0.45;
    charmGroup.add(cherryA, cherryB, stemA, stemB, leafMesh);

    // 3. Satin Lipstick Tube + Angled Bullet (Composite Group)
    const lipstickGroup = new THREE.Group();
    lipstickGroup.position.set(0.62, -0.68, -0.1);
    lipstickGroup.rotation.y = -0.4;
    stageGroup.add(lipstickGroup);

    const lipBaseGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.85, 32);
    const lipGoldGeo = new THREE.CylinderGeometry(0.225, 0.225, 0.32, 32);
    const lipBulletGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.56, 32);
    geometries.push(lipBaseGeo, lipGoldGeo, lipBulletGeo);

    const lipBaseMesh = new THREE.Mesh(lipBaseGeo, blushCapMat);
    lipBaseMesh.position.y = 0.425;
    lipBaseMesh.castShadow = !isSoftwareGl;
    lipstickGroup.add(lipBaseMesh);

    const lipGoldMesh = new THREE.Mesh(lipGoldGeo, goldMat);
    lipGoldMesh.position.y = 0.99;
    lipstickGroup.add(lipGoldMesh);

    const lipBulletMesh = new THREE.Mesh(lipBulletGeo, lipstickMat);
    lipBulletMesh.position.y = 1.4;
    lipBulletMesh.castShadow = !isSoftwareGl;
    lipstickGroup.add(lipBulletMesh);

    // Beveled angled lipstick tip
    const tipGeo = new THREE.CylinderGeometry(0.02, 0.16, 0.24, 32);
    geometries.push(tipGeo);
    const tipMesh = new THREE.Mesh(tipGeo, lipstickMat);
    tipMesh.position.set(0, 1.78, 0.015);
    tipMesh.rotation.x = 0.22;
    lipstickGroup.add(tipMesh);

    // Pointer drag interaction
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      targetRotYRef.current += dx * 0.01;
      targetRotXRef.current = THREE.MathUtils.clamp(
        targetRotXRef.current + dy * 0.005,
        -0.2,
        0.35
      );
      requestRenderRef.current?.();
    };
    const onPointerUp = () => {
      dragging = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    let frameId = 0;
    let disposed = false;
    let renderBusy = false;
    let renderDirty = false;
    const startMs = performance.now();
    let prevMs = startMs;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || !gl.fenceSync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function applyStep(dt: number, elapsed: number) {
      glossCoreMat.color.lerp(targetColorRef.current, Math.min(1, dt * 8));
      lipstickMat.color.lerp(targetLipstickColorRef.current, Math.min(1, dt * 8));
      const idleSway = isSoftwareGl ? 0 : Math.sin(elapsed * 0.8) * 0.08;
      stageGroup.rotation.y = THREE.MathUtils.damp(
        stageGroup.rotation.y,
        targetRotYRef.current + idleSway,
        6,
        dt
      );
      stageGroup.rotation.x = THREE.MathUtils.damp(
        stageGroup.rotation.x,
        targetRotXRef.current,
        6,
        dt
      );
      charmGroup.rotation.z = -0.1 + Math.sin(elapsed * 1.4) * 0.04;
    }

    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        const now = performance.now();
        // On software WebGL, snap immediately so color & rotation match target cleanly
        if (isSoftwareGl) {
          glossCoreMat.color.copy(targetColorRef.current);
          lipstickMat.color.copy(targetLipstickColorRef.current);
          stageGroup.rotation.y = targetRotYRef.current;
          stageGroup.rotation.x = targetRotXRef.current;
        } else {
          applyStep(0.016, (now - startMs) / 1000);
        }
        renderer.render(scene, camera);
        const done = () => {
          renderBusy = false;
          if (renderDirty && !disposed) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }
    requestRenderRef.current = requestRender;

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
      const tick = () => {
        if (disposed) return;
        const now = performance.now();
        const dt = Math.min(0.05, (now - prevMs) / 1000);
        prevMs = now;
        applyStep(dt, (now - startMs) / 1000);
        renderer.render(scene, camera);
        frameId = requestAnimationFrame(tick);
      };
      frameId = requestAnimationFrame(tick);
    } else {
      glossCoreMat.color.copy(targetColorRef.current);
      lipstickMat.color.copy(targetLipstickColorRef.current);
      stageGroup.rotation.y = targetRotYRef.current;
      stageGroup.rotation.x = targetRotXRef.current;
      renderer.render(scene, camera);
    }

    const handleResize = () => {
      if (!container || disposed) return;
      const w = container.clientWidth || 520;
      const h = container.clientHeight || 440;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', handleResize);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      envRT.dispose();
      renderer.dispose();
    };
  }, []);

  const handleResetView = () => {
    targetRotYRef.current = 0.32;
    targetRotXRef.current = 0.08;
    requestRenderRef.current?.();
  };

  return (
    <div
      className="relative w-full h-[380px] lg:h-full min-h-[380px] rounded-2xl overflow-hidden border border-[#F1DCE4] bg-[#FFF5F8]"
      data-testid="threejs-beauty-stage"
    >
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        aria-label="Visualizador 3D interativo do Gloss com Charm e Batom Velvet Bella Menina"
      />

      {/* Minimal top-left studio label */}
      <div className="pointer-events-none absolute top-4 left-4 text-xs text-[#6B545E] tracking-wide">
        Estúdio 3D Interativo · Arraste para girar
      </div>

      {/* Collapsible Bottom Control Dock (no backdrop-filter over WebGL) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 max-w-[92%]">
        <button
          type="button"
          onClick={() => setDockCollapsed((v) => !v)}
          className="px-3 py-1 text-[11px] font-medium text-[#6B545E] bg-[#FFFFFF] border border-[#F1DCE4] rounded-md shadow-xs hover:text-[#1A1216] transition-colors whitespace-nowrap"
        >
          {dockCollapsed ? '▴ Mostrar Tons' : '▾ Ocultar Controles'}
        </button>

        {!dockCollapsed && (
          <div className="flex items-center gap-3 px-4 py-2 bg-[#FFFFFF] border border-[#F1DCE4] rounded-xl shadow-sm">
            <div className="flex items-center gap-2">
              {SHADES.map((shade) => {
                const selected = shade.id === activeShade.id;
                return (
                  <button
                    key={shade.id}
                    type="button"
                    onClick={() => setActiveShade(shade)}
                    aria-label={`Selecionar tom ${shade.name}`}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      selected
                        ? 'border-[#1A1216] scale-110'
                        : 'border-white ring-1 ring-[#E6CFD8] hover:scale-105'
                    }`}
                    style={{ backgroundColor: shade.hex }}
                  />
                );
              })}
            </div>
            <span className="text-xs font-medium text-[#1A1216] whitespace-nowrap">
              {activeShade.name}
            </span>
            <button
              type="button"
              onClick={handleResetView}
              aria-label="Resetar ângulo 3D"
              className="p-1.5 rounded-lg text-[#6B545E] hover:text-[#FF2D6F] hover:bg-[#FFF5F8] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
