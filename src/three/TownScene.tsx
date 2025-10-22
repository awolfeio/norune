import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'stats.js';
import GUI from 'lil-gui';

import type { ExperienceMode } from '@state/sessionStore';

const PLAYABLE_SIZE = 512;
const OUTSKIRTS_MARGIN = 256;
const TOTAL_SIZE = PLAYABLE_SIZE + OUTSKIRTS_MARGIN * 2;
const HALF_PLAYABLE = PLAYABLE_SIZE / 2;
const GRID_CELL_SIZE = 16;
const SUBDIVISIONS_PER_CELL = 2;
const CELLS_PER_SIDE = TOTAL_SIZE / GRID_CELL_SIZE;
const SEGMENTS_PER_SIDE = CELLS_PER_SIDE * SUBDIVISIONS_PER_CELL;
const SUN_DISTANCE = 620;
const DEFAULT_GRID_OPACITY = 0.2;

const ENVIRONMENT_MAP = new URL(
  '../assets/fantasy-env-map.jpg',
  import.meta.url
).href;
const GRASS_TEXTURE = new URL(
  '../assets/grass-texture-seamless.jpg',
  import.meta.url
).href;
const ENVIRONMENT_PRESETS = {
  Fantasy: ENVIRONMENT_MAP
} as const;
type EnvironmentPreset = keyof typeof ENVIRONMENT_PRESETS;

export function TownScene({ mode }: { mode: ExperienceMode }) {
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const avatarRef = useRef<THREE.Mesh | null>(null);
  const modeRef = useRef<ExperienceMode>(mode);
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const statsRef = useRef<Stats | null>(null);
  const guiRef = useRef<InstanceType<typeof GUI> | null>(null);
  const guiWrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    if (mode !== 'avatar') {
      pressedKeysRef.current.clear();
      return;
    }

    const keySet = pressedKeysRef.current;
    const handleKeyDown = (event: KeyboardEvent) => {
      keySet.add(event.code);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keySet.delete(event.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      keySet.clear();
    };
  }, [mode]);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) {
      return;
    }

    let disposed = false;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    const stats = new Stats();
    stats.showPanel(0);
    stats.dom.style.position = 'absolute';
    stats.dom.style.top = '8px';
    stats.dom.style.right = '8px';
    stats.dom.style.left = 'auto';
    stats.dom.style.opacity = '0.85';
    stats.dom.style.pointerEvents = 'none';
    container.appendChild(stats.dom);
    statsRef.current = stats;

    const guiWrapper = document.createElement('div');
    guiWrapper.style.position = 'absolute';
    guiWrapper.style.top = '8px';
    guiWrapper.style.left = '8px';
    guiWrapper.style.zIndex = '10';
    guiWrapper.style.pointerEvents = 'auto';
    guiWrapperRef.current = guiWrapper;
    container.appendChild(guiWrapper);

    const gui = new GUI();
    gui.domElement.style.width = '260px';
    gui.domElement.classList.add('norune-gui');
    if (gui.domElement.parentElement) {
      gui.domElement.parentElement.removeChild(gui.domElement);
    }
    guiWrapper.appendChild(gui.domElement);
    guiRef.current = gui;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b0b1a');

    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      5000
    );
    camera.position.set(480, 420, 480);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 160;
    controls.maxDistance = 880;
    controls.minPolarAngle = Math.PI / 6;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    const setRendererSize = (width: number, height: number) => {
      if (width <= 0 || height <= 0) {
        console.warn(
          `[TownScene] Skipping size update due to invalid dimensions: ${width}x${height}`
        );
        return;
      }
      const safeWidth = Math.max(1, Math.floor(width));
      const safeHeight = Math.max(1, Math.floor(height));
      renderer.setSize(safeWidth, safeHeight, false);
      camera.aspect = safeWidth / safeHeight;
      camera.updateProjectionMatrix();
    };

    const initialRect = container.getBoundingClientRect();
    if (initialRect.width <= 0 || initialRect.height <= 0) {
      console.warn(
        `[TownScene] Container has zero dimensions on mount: ${initialRect.width}x${initialRect.height}`
      );
    } else {
      console.info(
        `[TownScene] Renderer initialized: ${Math.round(initialRect.width)}x${Math.round(
          initialRect.height
        )}`
      );
    }
    setRendererSize(
      Math.max(1, Math.floor(initialRect.width)),
      Math.max(1, Math.floor(initialRect.height))
    );

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(
      0xb1e1ff,
      0x1b4212,
      0.6
    );
    hemisphereLight.position.set(0, 1, 0);
    scene.add(hemisphereLight);

    const directionalLight = new THREE.DirectionalLight(0xfff2c5, 0.6);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.set(2048, 2048);
    directionalLight.shadow.camera.near = 50;
    directionalLight.shadow.camera.far = 1200;
    directionalLight.shadow.camera.left = -400;
    directionalLight.shadow.camera.right = 400;
    directionalLight.shadow.camera.top = 400;
    directionalLight.shadow.camera.bottom = -400;
    scene.add(directionalLight);

    const sunTarget = new THREE.Object3D();
    sunTarget.position.set(0, 0, 0);
    scene.add(sunTarget);
    directionalLight.target = sunTarget;

    const sunHelper = new THREE.DirectionalLightHelper(directionalLight, 30);
    sunHelper.visible = false;
    scene.add(sunHelper);

    const environmentState = { current: null as THREE.Texture | null };
    const envConfig = {
      environment: 'Fantasy' as EnvironmentPreset,
      showBackground: true
    };

    const loadEnvironment = (preset: EnvironmentPreset) => {
      const mapUrl = ENVIRONMENT_PRESETS[preset] ?? ENVIRONMENT_MAP;
      const loader = new THREE.TextureLoader();
      loader.load(
        mapUrl,
        (texture) => {
          if (disposed) {
            texture.dispose();
            return;
          }
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.mapping = THREE.EquirectangularReflectionMapping;
          if (environmentState.current) {
            environmentState.current.dispose();
          }
          environmentState.current = texture;
          scene.environment = texture;
          scene.background = envConfig.showBackground
            ? texture
            : new THREE.Color('#0b0b1a');
        },
        undefined,
        (error) => {
          console.warn('Failed to load environment texture', error);
        }
      );
    };

    const terrainConfig = {
      showTriangleOutline: false
    };
    const lightingConfig = {
      sunIntensity: directionalLight.intensity,
      sunElevation: 24,
      sunAzimuth: 135,
      ambientIntensity: ambientLight.intensity,
      hemisphereIntensity: hemisphereLight.intensity,
      showSunHelper: false,
      showGrid: true,
      buildMode: false,
      gridOpacity: DEFAULT_GRID_OPACITY
    };

    const updateSunPosition = () => {
      const phi = THREE.MathUtils.degToRad(90 - lightingConfig.sunElevation);
      const theta = THREE.MathUtils.degToRad(lightingConfig.sunAzimuth);
      directionalLight.position.setFromSphericalCoords(
        SUN_DISTANCE,
        phi,
        theta
      );
      directionalLight.target.position.set(0, 0, 0);
      sunHelper.update();
    };

    updateSunPosition();

    gui
      .add(envConfig, 'showBackground')
      .name('Show Environment')
      .onChange((value: boolean) => {
        if (environmentState.current) {
          scene.background = value
            ? environmentState.current
            : new THREE.Color('#0b0b1a');
        }
      });

    gui
      .add(envConfig, 'environment', Object.keys(ENVIRONMENT_PRESETS))
      .name('Environment Map')
      .onChange(() => {
        loadEnvironment(envConfig.environment);
      });

    gui.add(lightingConfig, 'sunIntensity', 0, 3, 0.05)
      .name('Sun Intensity')
      .onChange((value: number) => {
        directionalLight.intensity = value;
      });

    gui.add(lightingConfig, 'sunElevation', 5, 85, 1)
      .name('Sun Elevation')
      .onChange(() => updateSunPosition());

    gui.add(lightingConfig, 'sunAzimuth', 0, 360, 1)
      .name('Sun Azimuth')
      .onChange(() => updateSunPosition());

    gui.add(lightingConfig, 'ambientIntensity', 0, 2, 0.05)
      .name('Ambient Intensity')
      .onChange((value: number) => {
        ambientLight.intensity = value;
      });

    gui.add(lightingConfig, 'hemisphereIntensity', 0, 2, 0.05)
      .name('Hemisphere Intensity')
      .onChange((value: number) => {
        hemisphereLight.intensity = value;
      });

    gui.add(lightingConfig, 'showSunHelper')
      .name('Show Sun Helper')
      .onChange((value: boolean) => {
        sunHelper.visible = value;
      });

    const baseGridColor = new THREE.Color('#7c75ff');
    const buildModeGridColor = new THREE.Color('#8af7c0');
    const buildModeOpacity = 0.55;
    const outskirtsGridColor = new THREE.Color('#aeb4ff');
    const outskirtsGridOpacity = 0.12;

    const playableGrid = new THREE.GridHelper(
      PLAYABLE_SIZE,
      PLAYABLE_SIZE / GRID_CELL_SIZE,
      baseGridColor,
      new THREE.Color('#2b275b')
    );
    playableGrid.position.y = 0.06;
    scene.add(playableGrid);

    const outskirtsGrid = createOutskirtsGrid({
      totalSize: TOTAL_SIZE,
      playableSize: PLAYABLE_SIZE,
      cellSize: GRID_CELL_SIZE,
      color: outskirtsGridColor,
      opacity: outskirtsGridOpacity
    });
    outskirtsGrid.position.y = 0.03;
    scene.add(outskirtsGrid);

    const applyGridStyle = () => {
      const targetColor = lightingConfig.buildMode
        ? buildModeGridColor
        : baseGridColor;
      const targetOpacity = lightingConfig.buildMode
        ? buildModeOpacity
        : lightingConfig.gridOpacity;

      updateLineMaterial(playableGrid, targetColor, targetOpacity);
      updateLineMaterial(outskirtsGrid, outskirtsGridColor, outskirtsGridOpacity);
    };

    applyGridStyle();

    gui
      .add(lightingConfig, 'showGrid')
      .name('Show Grid Overlay')
      .onChange((value: boolean) => {
        playableGrid.visible = value;
        outskirtsGrid.visible = value;
        applyGridStyle();
      });

    gui
      .add(lightingConfig, 'gridOpacity', 0, 1, 0.05)
      .name('Grid Opacity')
      .onChange(() => {
        if (!lightingConfig.buildMode) {
          applyGridStyle();
        }
      });

    gui
      .add(lightingConfig, 'buildMode')
      .name('Build Mode')
      .onChange(() => {
        applyGridStyle();
      });

    loadEnvironment(envConfig.environment);

    const terrainGeometry = buildTerrainGeometry();
    const terrainTexture = new THREE.TextureLoader().load(GRASS_TEXTURE);
    terrainTexture.colorSpace = THREE.SRGBColorSpace;
    terrainTexture.wrapS = THREE.RepeatWrapping;
    terrainTexture.wrapT = THREE.RepeatWrapping;
    terrainTexture.repeat.set(CELLS_PER_SIDE, CELLS_PER_SIDE);
    terrainTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const terrainMaterial = new THREE.MeshStandardMaterial({
      map: terrainTexture,
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.85
    });
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    terrain.name = 'terrain-plane';
    scene.add(terrain);

    const triangleOutlineMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color('#ff4fd8'),
      transparent: true,
      opacity: 0.75
    });
    triangleOutlineMaterial.depthTest = false;
    triangleOutlineMaterial.depthWrite = false;
    const triangleOutline = new THREE.LineSegments(
      new THREE.WireframeGeometry(terrainGeometry),
      triangleOutlineMaterial
    );
    triangleOutline.rotation.x = -Math.PI / 2;
    triangleOutline.renderOrder = 2;
    triangleOutline.visible = terrainConfig.showTriangleOutline;
    scene.add(triangleOutline);
    gui
      .add(terrainConfig, 'showTriangleOutline')
      .name('Show Triangle Mesh')
      .onChange((value: boolean) => {
        triangleOutline.visible = value;
      });

    const avatarGeometry = new THREE.SphereGeometry(8, 32, 32);
    const avatarMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#f7a3ff'),
      emissive: new THREE.Color('#5b2d93'),
      emissiveIntensity: 0.6,
      metalness: 0.2,
      roughness: 0.5
    });
    const avatar = new THREE.Mesh(avatarGeometry, avatarMaterial);
    avatar.position.set(0, 8, 0);
    avatar.castShadow = true;
    avatar.visible = modeRef.current === 'avatar';
    scene.add(avatar);
    avatarRef.current = avatar;

    const clock = new THREE.Clock();
    const cameraTarget = new THREE.Vector3();
    const avatarLookAt = new THREE.Vector3();
    const frameId = { current: 0 };
    const handleResize = () => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        console.warn(
          `[TownScene] Window resize detected zero dimensions: ${rect.width}x${rect.height}`
        );
        return;
      }
      setRendererSize(rect.width, rect.height);
    };

    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (!width || !height) {
          console.warn(
            `[TownScene] ResizeObserver reported zero dimensions: ${width}x${height}`
          );
          continue;
        }
        setRendererSize(width, height);
      }
    });
    resizeObserver.observe(container);

    const animate = () => {
      stats.begin();

      const delta = clock.getDelta();
      const keys = pressedKeysRef.current;

      if (modeRef.current === 'orbit') {
        controls.update();
      } else {
        directionalLight.position.x = avatar.position.x + 120;
        directionalLight.position.z = avatar.position.z + 120;

        updateAvatarMovement(avatar, keys, delta);
        lockAvatarToPlotBounds(avatar);
        cameraTarget.set(
          avatar.position.x + 70,
          avatar.position.y + 45,
          avatar.position.z + 70
        );
        camera.position.lerp(cameraTarget, 0.08);
        avatarLookAt.set(
          avatar.position.x,
          avatar.position.y + 6,
          avatar.position.z
        );
        camera.lookAt(avatarLookAt);
      }

      renderer.render(scene, camera);
      stats.end();

      frameId.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId.current);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      terrainGeometry.dispose();
      terrainMaterial.dispose();
      terrainTexture.dispose();
      avatarGeometry.dispose();
      avatarMaterial.dispose();
      disposeLineObject(playableGrid);
      disposeLineObject(outskirtsGrid);
      triangleOutline.geometry.dispose();
      (triangleOutline.material as THREE.LineBasicMaterial).dispose();
      scene.clear();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      if (statsRef.current?.dom.parentNode) {
        statsRef.current.dom.parentNode.removeChild(statsRef.current.dom);
      }
      statsRef.current = null;
      if (environmentState.current) {
        environmentState.current.dispose();
        environmentState.current = null;
      }
      gui.destroy();
      guiRef.current = null;
      if (guiWrapperRef.current && guiWrapperRef.current.parentNode) {
        guiWrapperRef.current.parentNode.removeChild(guiWrapperRef.current);
      }
      guiWrapperRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;
    const orbitEnabled = mode === 'orbit';
    controls.enabled = orbitEnabled;
    controls.enableZoom = orbitEnabled;
    if (orbitEnabled) {
      controls.update();
    }
    if (avatarRef.current) {
      avatarRef.current.visible = mode === 'avatar';
    }
  }, [mode]);

  return (
    <div
      ref={canvasContainerRef}
      className="relative h-full w-full rounded-2xl border border-white/10 bg-black/40"
    >
      {mode === 'avatar' ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-2xl bg-black/30 backdrop-blur-sm">
          <div className="pointer-events-auto max-w-md rounded-xl border border-white/10 bg-black/70 px-6 py-4 text-center shadow-lg">
            <p className="text-xs uppercase tracking-[0.3em] text-purple-200">
              Avatar Mode
            </p>
            <p className="mt-2 text-sm text-white/70">
              WASD / arrow keys to move, Shift to sprint, Space to interact. Use the mode switcher to return to orbit view.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function buildTerrainGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(
    TOTAL_SIZE,
    TOTAL_SIZE,
    SEGMENTS_PER_SIDE,
    SEGMENTS_PER_SIDE
  );
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
type GridLikeObject = THREE.Object3D & {
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
};

type OutskirtsGridOptions = {
  totalSize: number;
  playableSize: number;
  cellSize: number;
  color: THREE.Color;
  opacity: number;
};

function updateLineMaterial(
  object: GridLikeObject,
  color: THREE.Color,
  opacity: number
) {
  const materials = Array.isArray(object.material)
    ? object.material
    : [object.material];

  for (const mat of materials) {
    const lineMaterial = mat as THREE.LineBasicMaterial;
    lineMaterial.transparent = true;
    lineMaterial.depthWrite = false;
    lineMaterial.depthTest = false;
    lineMaterial.color.copy(color);
    lineMaterial.opacity = opacity;
    lineMaterial.needsUpdate = true;
  }
}

function createOutskirtsGrid({
  totalSize,
  playableSize,
  cellSize,
  color,
  opacity,
}: OutskirtsGridOptions) {
  const positions: number[] = [];
  const halfTotal = totalSize / 2;
  const halfPlayable = playableSize / 2;

  for (let x = -halfTotal; x <= halfTotal + 0.001; x += cellSize) {
    positions.push(
      x,
      0,
      -halfTotal,
      x,
      0,
      -halfPlayable
    );
    positions.push(
      x,
      0,
      halfPlayable,
      x,
      0,
      halfTotal
    );
  }

  for (let z = -halfTotal; z <= halfTotal + 0.001; z += cellSize) {
    positions.push(
      -halfTotal,
      0,
      z,
      -halfPlayable,
      0,
      z
    );
    positions.push(
      halfPlayable,
      0,
      z,
      halfTotal,
      0,
      z
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );

  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: false
  });

  return new THREE.LineSegments(geometry, material);
}

function disposeLineObject(object: GridLikeObject) {
  object.geometry.dispose();
  const materials = Array.isArray(object.material)
    ? object.material
    : [object.material];
  for (const mat of materials) {
    mat.dispose();
  }
}

function updateAvatarMovement(
  avatar: THREE.Mesh,
  keys: Set<string>,
  delta: number
) {
  const moveVector = new THREE.Vector3();
  const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 160 : 90;

  if (keys.has('KeyW') || keys.has('ArrowUp')) {
    moveVector.z -= 1;
  }
  if (keys.has('KeyS') || keys.has('ArrowDown')) {
    moveVector.z += 1;
  }
  if (keys.has('KeyA') || keys.has('ArrowLeft')) {
    moveVector.x -= 1;
  }
  if (keys.has('KeyD') || keys.has('ArrowRight')) {
    moveVector.x += 1;
  }

  if (moveVector.lengthSq() > 0) {
    moveVector.normalize().multiplyScalar(speed * delta);
    avatar.position.add(moveVector);
  }
}

function lockAvatarToPlotBounds(avatar: THREE.Mesh) {
  const margin = 12;
  avatar.position.x = THREE.MathUtils.clamp(
    avatar.position.x,
    -HALF_PLAYABLE + margin,
    HALF_PLAYABLE - margin
  );
  avatar.position.z = THREE.MathUtils.clamp(
    avatar.position.z,
    -HALF_PLAYABLE + margin,
    HALF_PLAYABLE - margin
  );
}






