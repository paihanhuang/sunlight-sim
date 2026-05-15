import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import {
  ArrowDown,
  ArrowUp,
  LocateFixed,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { MapMode, PropertyLocation, ShadowQuality } from "../types";

type CesiumSunViewerProps = {
  location: PropertyLocation;
  simulationDate: Date;
  shadowsEnabled: boolean;
  quality: ShadowQuality;
  onModeChange: (mode: MapMode) => void;
  onStatusChange: (status: string) => void;
};

type BuildingSpec = {
  east: number;
  north: number;
  width: number;
  depth: number;
  height: number;
  color: Cesium.Color;
};

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();

function translatedModelMatrix(
  origin: Cesium.Matrix4,
  east: number,
  north: number,
  up: number
): Cesium.Matrix4 {
  const result = new Cesium.Matrix4();
  const translation = new Cesium.Cartesian3(east, north, up);
  return Cesium.Matrix4.multiplyByTranslation(origin, translation, result);
}

function createBoxPrimitive(
  origin: Cesium.Matrix4,
  spec: BuildingSpec,
  shadows: Cesium.ShadowMode
): Cesium.Primitive {
  const geometry = Cesium.BoxGeometry.fromDimensions({
    dimensions: new Cesium.Cartesian3(spec.width, spec.depth, spec.height),
    vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
  });

  const instance = new Cesium.GeometryInstance({
    geometry,
    modelMatrix: translatedModelMatrix(origin, spec.east, spec.north, spec.height / 2),
    attributes: {
      color: Cesium.ColorGeometryInstanceAttribute.fromColor(spec.color),
    },
  });

  return new Cesium.Primitive({
    geometryInstances: instance,
    appearance: new Cesium.PerInstanceColorAppearance({
      flat: false,
      translucent: false,
    }),
    shadows,
  });
}

function addSyntheticPropertyScene(
  viewer: Cesium.Viewer,
  location: PropertyLocation
): Cesium.Primitive[] {
  const origin = Cesium.Transforms.eastNorthUpToFixedFrame(
    Cesium.Cartesian3.fromDegrees(location.longitude, location.latitude, 0)
  );

  const primitives: Cesium.Primitive[] = [];

  const ground = createBoxPrimitive(
    origin,
    {
      east: 0,
      north: 0,
      width: 360,
      depth: 260,
      height: 1,
      color: Cesium.Color.fromCssColorString("#4f7452"),
    },
    Cesium.ShadowMode.RECEIVE_ONLY
  );
  primitives.push(viewer.scene.primitives.add(ground));

  const driveway = createBoxPrimitive(
    origin,
    {
      east: -68,
      north: -32,
      width: 42,
      depth: 110,
      height: 1.4,
      color: Cesium.Color.fromCssColorString("#9ca3a7"),
    },
    Cesium.ShadowMode.RECEIVE_ONLY
  );
  primitives.push(viewer.scene.primitives.add(driveway));

  const patio = createBoxPrimitive(
    origin,
    {
      east: 48,
      north: 58,
      width: 96,
      depth: 48,
      height: 1.2,
      color: Cesium.Color.fromCssColorString("#c7aa7a"),
    },
    Cesium.ShadowMode.RECEIVE_ONLY
  );
  primitives.push(viewer.scene.primitives.add(patio));

  const buildings: BuildingSpec[] = [
    {
      east: 0,
      north: 0,
      width: 62,
      depth: 48,
      height: 24,
      color: Cesium.Color.fromCssColorString("#d7c4a1"),
    },
    {
      east: -92,
      north: 36,
      width: 48,
      depth: 54,
      height: 30,
      color: Cesium.Color.fromCssColorString("#b7c3cb"),
    },
    {
      east: 98,
      north: -12,
      width: 52,
      depth: 64,
      height: 34,
      color: Cesium.Color.fromCssColorString("#c9b5a1"),
    },
    {
      east: 35,
      north: 104,
      width: 72,
      depth: 34,
      height: 18,
      color: Cesium.Color.fromCssColorString("#a7b79d"),
    },
  ];

  for (const building of buildings) {
    primitives.push(
      viewer.scene.primitives.add(
        createBoxPrimitive(origin, building, Cesium.ShadowMode.ENABLED)
      )
    );
  }

  return primitives;
}

function setCamera(viewer: Cesium.Viewer, location: PropertyLocation, animate: boolean) {
  const target = Cesium.Cartesian3.fromDegrees(location.longitude, location.latitude, 18);
  const offset = new Cesium.HeadingPitchRange(
    Cesium.Math.toRadians(156),
    Cesium.Math.toRadians(-42),
    245
  );

  if (animate) {
    viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(target, 90), {
      offset,
      duration: 0.7,
    });
    return;
  }

  viewer.camera.lookAt(target, offset);
  viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
}

function applyShadowQuality(viewer: Cesium.Viewer, quality: ShadowQuality) {
  const shadowMap = viewer.scene.shadowMap;
  if (!shadowMap) {
    return;
  }

  if (quality === "high") {
    shadowMap.size = 4096;
    shadowMap.softShadows = true;
  } else if (quality === "battery") {
    shadowMap.size = 1024;
    shadowMap.softShadows = false;
  } else {
    shadowMap.size = 2048;
    shadowMap.softShadows = true;
  }
}

function getTarget(location: PropertyLocation): Cesium.Cartesian3 {
  return Cesium.Cartesian3.fromDegrees(location.longitude, location.latitude, 18);
}

export function CesiumSunViewer({
  location,
  simulationDate,
  shadowsEnabled,
  quality,
  onModeChange,
  onStatusChange,
}: CesiumSunViewerProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const locationRef = useRef<PropertyLocation>(location);
  const localPrimitivesRef = useRef<Cesium.Primitive[]>([]);
  const [canvasReady, setCanvasReady] = useState(false);
  const [cameraHeadingDeg, setCameraHeadingDeg] = useState(0);

  function updateCameraTelemetry(viewer: Cesium.Viewer) {
    const shell = shellRef.current;
    if (!shell) {
      return;
    }

    const target = getTarget(locationRef.current);
    const camera = viewer.camera;
    const range = Cesium.Cartesian3.distance(camera.positionWC, target);
    const viewVector = Cesium.Cartesian3.subtract(
      target,
      camera.positionWC,
      new Cesium.Cartesian3()
    );
    const centerDistance = Cesium.Cartesian3.dot(viewVector, camera.directionWC);

    const headingDeg = Cesium.Math.toDegrees(camera.heading);

    shell.dataset.cameraHeading = headingDeg.toFixed(3);
    shell.dataset.cameraPitch = Cesium.Math.toDegrees(camera.pitch).toFixed(3);
    shell.dataset.cameraRange = range.toFixed(3);
    shell.dataset.cameraX = camera.positionWC.x.toFixed(3);
    shell.dataset.cameraY = camera.positionWC.y.toFixed(3);
    shell.dataset.cameraZ = camera.positionWC.z.toFixed(3);
    shell.dataset.cameraCenterDistance = centerDistance.toFixed(3);
    shell.dataset.cameraDirectionX = camera.directionWC.x.toFixed(6);
    shell.dataset.cameraDirectionY = camera.directionWC.y.toFixed(6);
    shell.dataset.cameraDirectionZ = camera.directionWC.z.toFixed(6);
    shell.dataset.cameraUpdatedAt = Date.now().toString();
    setCameraHeadingDeg(headingDeg);
  }

  function zoomCurrentView(rangeMultiplier: number) {
    const viewer = viewerRef.current;
    if (!viewer) {
      return;
    }

    const camera = viewer.camera;
    const viewDistance = Number(shellRef.current?.dataset.cameraCenterDistance);
    const fallbackDistance = Cesium.Cartesian3.distance(
      camera.positionWC,
      getTarget(locationRef.current)
    );
    const moveAmount = Cesium.Math.clamp(
      Math.abs((Number.isFinite(viewDistance) ? viewDistance : fallbackDistance) * (1 - rangeMultiplier)),
      5,
      1800
    );

    if (rangeMultiplier < 1) {
      camera.moveForward(moveAmount);
    } else {
      camera.moveBackward(moveAmount);
    }

    updateCameraTelemetry(viewer);
    viewer.scene.requestRender();
  }

  function orbitCamera(
    headingDeltaDeg: number,
    pitchDeltaDeg: number,
    rangeMultiplier = 1
  ) {
    const viewer = viewerRef.current;
    if (!viewer) {
      return;
    }

    const camera = viewer.camera;
    const target = getTarget(locationRef.current);
    const currentRange = Cesium.Cartesian3.distance(camera.positionWC, target);
    const nextRange = Cesium.Math.clamp(currentRange * rangeMultiplier, 18, 5000);
    const nextPitch = Cesium.Math.clamp(
      camera.pitch + Cesium.Math.toRadians(pitchDeltaDeg),
      Cesium.Math.toRadians(-88),
      Cesium.Math.toRadians(-8)
    );
    const nextHeading = camera.heading + Cesium.Math.toRadians(headingDeltaDeg);

    camera.lookAt(
      target,
      new Cesium.HeadingPitchRange(nextHeading, nextPitch, nextRange)
    );
    camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    updateCameraTelemetry(viewer);
    viewer.scene.requestRender();
  }

  function resetCamera() {
    const viewer = viewerRef.current;
    if (!viewer) {
      return;
    }

    setCamera(viewer, locationRef.current, true);
    updateCameraTelemetry(viewer);
    viewer.scene.requestRender();
  }

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) {
      return;
    }

    const viewer = new Cesium.Viewer(containerRef.current, {
      animation: false,
      baseLayer: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      shadows: true,
      shouldAnimate: false,
      requestRenderMode: true,
      maximumRenderTimeChange: Number.POSITIVE_INFINITY,
    });

    viewerRef.current = viewer;
    const controller = viewer.scene.screenSpaceCameraController;
    controller.enableInputs = true;
    controller.enableRotate = true;
    controller.enableTranslate = true;
    controller.enableZoom = true;
    controller.enableTilt = true;
    controller.enableLook = true;
    controller.minimumZoomDistance = 8;
    controller.maximumZoomDistance = 20_000_000;
    controller.zoomFactor = 4;
    controller.rotateEventTypes = Cesium.CameraEventType.LEFT_DRAG;
    controller.zoomEventTypes = [
      Cesium.CameraEventType.WHEEL,
      Cesium.CameraEventType.RIGHT_DRAG,
      Cesium.CameraEventType.PINCH,
    ];
    controller.tiltEventTypes = [
      Cesium.CameraEventType.MIDDLE_DRAG,
      {
        eventType: Cesium.CameraEventType.LEFT_DRAG,
        modifier: Cesium.KeyboardEventModifier.SHIFT,
      },
      Cesium.CameraEventType.PINCH,
    ];
    viewer.scene.globe.show = false;
    if (viewer.scene.skyAtmosphere) {
      viewer.scene.skyAtmosphere.show = true;
    }
    viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#9ec0d3");
    viewer.scene.light = new Cesium.SunLight();
    if (viewer.scene.sun) {
      viewer.scene.sun.show = true;
    }
    if (viewer.scene.moon) {
      viewer.scene.moon.show = false;
    }
    viewer.scene.fog.enabled = false;
    viewer.clock.shouldAnimate = false;
    viewer.resolutionScale = window.devicePixelRatio > 1 ? 0.85 : 1;
    viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
    viewer.cesiumWidget.creditContainer.setAttribute("aria-label", "Cesium map credits");

    setCamera(viewer, location, false);
    updateCameraTelemetry(viewer);
    const cameraChangedRemove = viewer.camera.changed.addEventListener(() => {
      updateCameraTelemetry(viewer);
    });
    setCanvasReady(true);

    let cancelled = false;

    async function loadGoogleTiles() {
      if (!googleMapsApiKey || !viewerRef.current) {
        localPrimitivesRef.current = addSyntheticPropertyScene(viewer, location);
        onModeChange("local-simulation");
        onStatusChange("Local simulation scene active. Add VITE_GOOGLE_MAPS_API_KEY for Google 3D Tiles.");
        viewer.scene.requestRender();
        return;
      }

      try {
        onStatusChange("Loading Google Photorealistic 3D Tiles.");
        const tileset = await Cesium.Cesium3DTileset.fromUrl(
          `https://tile.googleapis.com/v1/3dtiles/root.json?key=${encodeURIComponent(
            googleMapsApiKey
          )}`,
          {
            showCreditsOnScreen: true,
            shadows: Cesium.ShadowMode.ENABLED,
            maximumScreenSpaceError: 16,
            enableCollision: true,
          }
        );

        if (cancelled || !viewerRef.current) {
          tileset.destroy();
          return;
        }

        viewer.scene.primitives.add(tileset);
        onModeChange("google-photorealistic");
        onStatusChange("Google Photorealistic 3D Tiles active.");
        viewer.scene.requestRender();
      } catch {
        localPrimitivesRef.current = addSyntheticPropertyScene(viewer, location);
        onModeChange("local-simulation");
        onStatusChange("Google 3D Tiles failed to load. Local simulation scene active.");
        viewer.scene.requestRender();
      }
    }

    void loadGoogleTiles();

    return () => {
      cancelled = true;
      cameraChangedRemove();
      viewerRef.current = null;
      viewer.destroy();
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) {
      return;
    }

    viewer.clock.currentTime = Cesium.JulianDate.fromDate(simulationDate);
    if (viewer.scene.shadowMap) {
      viewer.scene.shadowMap.enabled = shadowsEnabled;
    }
    viewer.shadows = shadowsEnabled;
    applyShadowQuality(viewer, quality);
    viewer.scene.requestRender();
  }, [quality, shadowsEnabled, simulationDate]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) {
      return;
    }

    locationRef.current = location;

    for (const primitive of localPrimitivesRef.current) {
      viewer.scene.primitives.remove(primitive);
    }
    localPrimitivesRef.current = [];

    if (!googleMapsApiKey) {
      localPrimitivesRef.current = addSyntheticPropertyScene(viewer, location);
    }

    setCamera(viewer, location, true);
    updateCameraTelemetry(viewer);
    viewer.scene.requestRender();
  }, [location]);

  return (
    <div ref={shellRef} className="viewer-shell" data-testid="cesium-viewer">
      <div ref={containerRef} className="cesium-container" />
      <div
        className="map-compass"
        data-testid="map-compass"
        data-compass-heading={cameraHeadingDeg.toFixed(1)}
        aria-label={`Map compass. Camera heading ${cameraHeadingDeg.toFixed(0)} degrees.`}
      >
        <div
          className="map-compass-rose"
          style={{ transform: `rotate(${-cameraHeadingDeg}deg)` }}
        >
          <span className="map-compass-north">N</span>
          <span className="map-compass-east">E</span>
          <span className="map-compass-south">S</span>
          <span className="map-compass-west">W</span>
          <span className="map-compass-arrow" />
        </div>
        <span className="map-compass-value">{cameraHeadingDeg.toFixed(0)}°</span>
      </div>
      <div className="camera-toolbar" aria-label="Camera controls">
        <button
          type="button"
          aria-label="Camera zoom in"
          title="Camera zoom in"
          onClick={() => zoomCurrentView(0.72)}
        >
          <ZoomIn aria-hidden="true" size={18} />
        </button>
        <button
          type="button"
          aria-label="Camera zoom out"
          title="Camera zoom out"
          onClick={() => zoomCurrentView(1.28)}
        >
          <ZoomOut aria-hidden="true" size={18} />
        </button>
        <button
          type="button"
          aria-label="Camera rotate left"
          title="Camera rotate left"
          onClick={() => orbitCamera(-18, 0)}
        >
          <RotateCcw aria-hidden="true" size={18} />
        </button>
        <button
          type="button"
          aria-label="Camera rotate right"
          title="Camera rotate right"
          onClick={() => orbitCamera(18, 0)}
        >
          <RotateCw aria-hidden="true" size={18} />
        </button>
        <button
          type="button"
          aria-label="Camera tilt up"
          title="Camera tilt up"
          onClick={() => orbitCamera(0, 10)}
        >
          <ArrowUp aria-hidden="true" size={18} />
        </button>
        <button
          type="button"
          aria-label="Camera tilt down"
          title="Camera tilt down"
          onClick={() => orbitCamera(0, -10)}
        >
          <ArrowDown aria-hidden="true" size={18} />
        </button>
        <button
          type="button"
          aria-label="Camera reset view"
          title="Camera reset view"
          onClick={resetCamera}
        >
          <LocateFixed aria-hidden="true" size={18} />
        </button>
      </div>
      {!canvasReady ? <div className="viewer-loading">Preparing 3D sunlight scene</div> : null}
    </div>
  );
}
