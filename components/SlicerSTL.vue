<!-- src/components/STLSlicer.vue -->
<template>
  <div class="stl-slicer h-[85vh] relative">

    <div id="preview-window">
      <canvas id="preview-canvas"></canvas>
    </div>

    <!-- Drag-and-Drop Overlay -->
    <div
      v-if="!fileLoaded"
      class="absolute dropzone inset-0 bg-blue-200 bg-opacity-20 flex justify-center items-center z-50 hover:bg-blue-200 hover:bg-opacity-40 transition h-screen"
      @dragover.prevent
      @drop.prevent="handleDrop"
    >
    <p class="cursor-pointer absolute text-lime bg-gray/50 rounded-lg p-2 text-2xl transform transition-transform duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] hover:scale-[1.2] hover:shadow-2xl">
        Drag and drop an STL file here
      </p>
    </div>

    <!-- Slicing Controls -->
    <div
      v-if="fileLoaded"
      class="controls absolute top-5 left-5 bg-white bg-opacity-90 p-4 rounded-lg shadow-md z-40 space-y-3"
    >
      <label for="layerHeight" class="block mb-2 text-gray-700 font-semibold">
        Layer Height (mm):
      </label>
      <input
        id="layerHeight"
        v-model.number="layerHeight"
        type="number"
        step="0.01"
        min="0.01"
        placeholder="e.g., 0.5"
        class="w-24 p-1 mb-3 border border-gray-300 rounded"
      />

      <!-- Opacity controls -->
      <label for="materialOpacity" class="block mb-2 text-gray-700 font-semibold">
        Material Opacity: {{materialOpacity}}
      </label>
      <input
        id="materialOpacity"
        v-model.number="materialOpacity"
        type="range"
        min="0"
        max="0.5"
        step="0.01"
        class="w-full mb-3"
      />

      <label for="matOpacity" class="block mb-2 text-gray-700 font-semibold">
        Material Opacity: {{matOpacity}}
      </label>
      <input
        id="matOpacity"
        v-model.number="matOpacity"
        type="range"
        min="0"
        max="1"
        step="0.01"
        class="w-full mb-3"
      />

      <button
        @click="startSlicingHandler"
        class="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition"
      >
        Start Slicing
      </button>

      <button
        v-if="slices.length > 0"
        @click="saveAllSlices"
        class="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 transition mt-2"
      >
        Save Slices (8K PNG)
      </button>
    </div>

    <!-- Error Message -->
    <div
      v-if="errorMessage"
      class="error absolute top-5 right-5 bg-red-600 text-white p-3 rounded shadow z-40 font-bold"
    >
      {{ errorMessage }}
    </div>

    <!-- 3D Viewer -->
    <div class="viewer-container w-full h-full">
      <canvas ref="canvasRef" class="w-full h-full"></canvas>
    </div>

    <!-- Slice Navigation Instructions -->
    <div
      v-if="fileLoaded && slices.length > 0"
      class="navigation-instructions absolute bottom-5 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-90 p-3 rounded shadow text-gray-800 font-semibold z-40 text-center"
    >
      <p>Use Up/Down arrow keys to navigate slices.</p>
      <p>Hold Space Bar to isolate the selected slice.</p>
      <p>
        Current Slice:
        {{ currentSliceIndex + 1 }} / {{ slices.length }}
      </p>
    </div>

    <!-- Mini Cube Guide and View Switcher -->
<div class="fixed bottom-4 left-4 z-50">
  <canvas ref="miniCubeCanvas" class="w-32 h-32 border border-gray-500 rounded"></canvas>
  <div class="flex gap-2 mt-2">
    <button @click="setTopView" class="bg-blue-500 text-white px-2 py-1 rounded">Top</button>
    <button @click="setFrontView" class="bg-blue-500 text-white px-2 py-1 rounded">Front</button>
    <button @click="setSideView" class="bg-blue-500 text-white px-2 py-1 rounded">Side</button>
  </div>
</div>




  <!-- Improved Vertical Slider -->
<div
  v-if="slices.length > 0"
  class="fixed right-4 top-1/2 transform -translate-y-1/2 z-50"
>
  <div class="flex flex-col items-center bg-gray-800 bg-opacity-90 p-4 rounded-lg shadow-xl">
    <span class="text-white text-sm mb-2">
      Layer {{ currentSliceIndex + 1 }} / {{ slices.length }}
    </span>
    <input
      type="range"
      min="0"
      :max="slices.length - 1"
      v-model.number="currentSliceIndex"
      @input="onSliderChange"
      class="slider-range"
    />
  </div>
</div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { useSliceViewer } from '@/composables/useSliceViewer';
import { markRaw } from 'vue';

// Reactive Variables
const fileLoaded = ref(false);
const layerHeight = ref(0.5);
const errorMessage = ref('');
const currentSliceIndex = ref(0);
const isSpaceBarHeld = ref(false);
const showMainMesh = ref(true);
const materialOpacity = ref(0.1);
const matOpacity = ref(0.5);

// Three.js objects
let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let controls: OrbitControls;
const canvasRef = ref<HTMLCanvasElement | null>(null);

// Slice Viewer Composable
const { slices, error, sliceModel } = useSliceViewer();
const miniCubeCanvas = ref<HTMLCanvasElement | null>(null);
let miniCubeRenderer: THREE.WebGLRenderer;
let miniCubeScene: THREE.Scene;
let miniCubeCamera: THREE.PerspectiveCamera;

// Mesh Reference
const modelMesh = ref<THREE.LineSegments | null>(null);

/* ------------------ Helper Functions for Thick Slice Rendering ------------------ */

/**
 * Create a cylinder connecting two points.
 */
function createCylinderBetweenPoints(
  start: THREE.Vector3,
  end: THREE.Vector3,
  thickness: number,
  color: THREE.Color
): THREE.Mesh {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

  // CylinderGeometry is by default aligned along the Y-axis.
  const geometry = new THREE.CylinderGeometry(thickness, thickness, length, 8, 1, true);
  const material = new THREE.MeshBasicMaterial({ color });
  const cylinder = new THREE.Mesh(geometry, material);

  // Position cylinder at midpoint.
  cylinder.position.copy(midpoint);

  // Compute orientation from Y-axis to desired direction.
  const axis = new THREE.Vector3(0, 1, 0);
  cylinder.quaternion.setFromUnitVectors(axis, direction.normalize());

  return cylinder;
}

/**
 * Given an array of segments (each with two endpoints as THREE.Vector2),
 * group them into closed polygons.
 */
 function buildPolygonsFromSegments(
  segments: { a: THREE.Vector2; b: THREE.Vector2 }[]
): THREE.Vector2[][] {
  const tol = 1e-6;
  const segs = segments.slice();
  const polygons: THREE.Vector2[][] = [];

  while (segs.length > 0) {
    const currentSeg = segs.shift()!;
    const poly: THREE.Vector2[] = [currentSeg.a.clone(), currentSeg.b.clone()];
    let extended = true;
    while (extended) {
      extended = false;
      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i];
        // Try to attach at the end of the current polygon.
        if (poly[poly.length - 1].distanceTo(seg.a) < tol) {
          poly.push(seg.b.clone());
          segs.splice(i, 1);
          extended = true;
          break;
        } else if (poly[poly.length - 1].distanceTo(seg.b) < tol) {
          poly.push(seg.a.clone());
          segs.splice(i, 1);
          extended = true;
          break;
        }
        // Or at the beginning.
        else if (poly[0].distanceTo(seg.a) < tol) {
          poly.unshift(seg.b.clone());
          segs.splice(i, 1);
          extended = true;
          break;
        } else if (poly[0].distanceTo(seg.b) < tol) {
          poly.unshift(seg.a.clone());
          segs.splice(i, 1);
          extended = true;
          break;
        }
      }
    }
    // If the polygon’s endpoints nearly match, close it.
    if (poly[0].distanceTo(poly[poly.length - 1]) < tol) {
      poly.pop(); // remove duplicate
    }
    polygons.push(poly);
  }
  return polygons;
}


function exportSliceToCanvasPreview(
  slice: THREE.LineSegments
): { canvas: HTMLCanvasElement; bbox2D: { minX: number; minY: number; width: number; height: number } } {
  const positions = slice.geometry.getAttribute('position');
  const segments: { a: THREE.Vector2; b: THREE.Vector2 }[] = [];
  for (let i = 0; i < positions.count; i += 2) {
    const a = new THREE.Vector2(positions.getX(i), positions.getY(i));
    const b = new THREE.Vector2(positions.getX(i + 1), positions.getY(i + 1));
    segments.push({ a, b });
  }
  const polygons = buildPolygonsFromSegments(segments);
  
  if (polygons.length === 0) {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    return { canvas, bbox2D: { minX: 0, minY: 0, width: 100, height: 100 } };
  }
  
  // Compute 2D bounding box from polygons.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const poly of polygons) {
    for (const pt of poly) {
      minX = Math.min(minX, pt.x);
      minY = Math.min(minY, pt.y);
      maxX = Math.max(maxX, pt.x);
      maxY = Math.max(maxY, pt.y);
    }
  }
  const margin = 5;
  minX -= margin;
  minY -= margin;
  maxX += margin;
  maxY += margin;
  const polyWidth = maxX - minX;
  const polyHeight = maxY - minY;
  
  // Set a scale factor for high resolution.
  const scaleFactor = 100;
  const canvas = document.createElement('canvas');
  canvas.width = polyWidth * scaleFactor;
  canvas.height = polyHeight * scaleFactor;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { canvas, bbox2D: { minX, minY, width: polyWidth, height: polyHeight } };
  
  // Transparent background.
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw filled polygons (in black) with coordinates remapped to the cropped area.
  ctx.fillStyle = 'pink';
  ctx.beginPath();
  for (const poly of polygons) {
    if (poly.length === 0) continue;
    ctx.moveTo((poly[0].x - minX) * scaleFactor, (poly[0].y - minY) * scaleFactor);
    for (let i = 1; i < poly.length; i++) {
      ctx.lineTo((poly[i].x - minX) * scaleFactor, (poly[i].y - minY) * scaleFactor);
    }
    ctx.closePath();
  }
  ctx.fill('evenodd');
  
  return { canvas, bbox2D: { minX, minY, width: polyWidth, height: polyHeight } };
}


/**
 * Convert a given slice (THREE.LineSegments) into a filled 2D black-and-white image,
 * optimized for resin printers. The output is rendered on an offscreen canvas at 8K resolution.
 */
function exportSliceToCanvasPrev(slice: THREE.LineSegments): HTMLCanvasElement {
  const positions = slice.geometry.getAttribute('position');
  const segments: { a: THREE.Vector2; b: THREE.Vector2 }[] = [];
  // Build segments from each pair of points.
  for (let i = 0; i < positions.count; i += 2) {
    const a = new THREE.Vector2(positions.getX(i), positions.getY(i));
    const b = new THREE.Vector2(positions.getX(i + 1), positions.getY(i + 1));
    segments.push({ a, b });
  }
  const polygons = buildPolygonsFromSegments(segments);

  // Create an offscreen canvas at 8K resolution.
  const canvas = document.createElement('canvas');
  canvas.width = 7680;
  canvas.height = 4320;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Disable image smoothing for a crisp, pixel–perfect output.
  ctx.imageSmoothingEnabled = false;

  // Fill background with white.
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Compute the bounding box for all polygons.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const poly of polygons) {
    for (const pt of poly) {
      if (pt.x < minX) minX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y > maxY) maxY = pt.y;
    }
  }
  // Define a margin (in pixels) around the drawing.
  const margin = 20;
  const polyWidth = maxX - minX;
  const polyHeight = maxY - minY;
  const scale = Math.min(
    (canvas.width - 2 * margin) / polyWidth,
    (canvas.height - 2 * margin) / polyHeight
  );

  // Draw and fill all polygons.
  ctx.fillStyle = 'black';
  ctx.beginPath();
  for (const poly of polygons) {
    if (poly.length === 0) continue;
    ctx.moveTo((poly[0].x - minX) * scale + margin, (poly[0].y - minY) * scale + margin);
    for (let i = 1; i < poly.length; i++) {
      ctx.lineTo((poly[i].x - minX) * scale + margin, (poly[i].y - minY) * scale + margin);
    }
    ctx.closePath();
  }
  // Use the even–odd rule so that holes are left unfilled.
  ctx.fill('evenodd');
  return canvas;
}

/**
 * Given a slice (THREE.LineSegments), create a group of cylinders that represent a thick tube.
 */
function createThickSlice(
  slice: THREE.LineSegments,
  thickness: number,
  color: THREE.Color
): THREE.Group {
  const group = new THREE.Group();
  const positions = slice.geometry.getAttribute('position');
  const numPoints = positions.count;
  for (let i = 0; i < numPoints; i += 2) {
    const start = new THREE.Vector3().fromBufferAttribute(positions, i);
    const end = new THREE.Vector3().fromBufferAttribute(positions, i + 1);
    const cylinder = createCylinderBetweenPoints(start, end, thickness, color);
    group.add(cylinder);
  }
  return group;
}

/**
 * Glow animation for a (group of) mesh(es).
 */
function startGlowAnimation(object: THREE.Object3D) {
  let glowFactor = 1.0;
  let increasing = true;
  object.userData.glowAnimating = true;

  const animateGlow = () => {
    if (!object.userData.glowAnimating) return;

    glowFactor = increasing ? glowFactor + 0.02 : glowFactor - 0.02;
    if (glowFactor >= 1.5) increasing = false;
    if (glowFactor <= 1.0) increasing = true;

    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (!child.userData.originalColor) {
          child.userData.originalColor = child.material.color.clone();
        }
        child.material.color.copy(child.userData.originalColor).multiplyScalar(glowFactor);
        child.material.needsUpdate = true;
      }
    });

    requestAnimationFrame(animateGlow);
  };

  animateGlow();
}

/* ------------------ Three.js Scene Setup ------------------ */

const initScene = () => {
  if (!canvasRef.value) {
    console.error('[STLSlicer] Canvas reference is null.');
    return;
  }
  renderer = new THREE.WebGLRenderer({ canvas: canvasRef.value, antialias: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x111111, 1);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 40);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  controls.enableZoom = true;

  // Basic lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 7.5);
  scene.add(ambientLight, directionalLight);

  animate();
};

const animate = () => {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
};

/* ------------------ Model Loading and Slicing ------------------ */

const handleDrop = async (event: DragEvent) => {
  const files = event.dataTransfer?.files;
  if (files && files[0]) {
    const file = files[0];
    errorMessage.value = '';
    try {
      const loader = new STLLoader();
      const buffer = await file.arrayBuffer();
      const geometry = loader.parse(buffer);

      // Create a line-based material.
      const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: materialOpacity.value,
        depthTest: false,
        depthWrite: false,
      });

      const lines = new THREE.LineSegments(geometry, material);
      lines.geometry.center();
      lines.geometry.computeBoundingBox();
      lines.geometry.computeVertexNormals();

      modelMesh.value = markRaw(lines);
      fileLoaded.value = true;
      addModelToScene();
    } catch (err) {
      errorMessage.value = "Failed to load STL file.";
      console.error('[STLSlicer] Error loading STL file:', err);
    }
  } else {
    errorMessage.value = "No file detected.";
  }
};

const addModelToScene = () => {
  if (!scene || !modelMesh.value) return;
  // Remove all objects except lights.
  scene.children.slice().forEach((child) => {
    if (!(child instanceof THREE.Light)) {
      scene.remove(child);
      if (child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    }
  });
  scene.add(modelMesh.value);
};

/**
 * When slicing is started, call the composable’s sliceModel function.
 * (Once slices are generated, the first one is automatically shown.)
 */
const startSlicingHandler = () => {
  if (!modelMesh.value) {
    errorMessage.value = "No model loaded.";
    return;
  }
  errorMessage.value = '';
  sliceModel(modelMesh.value, layerHeight.value);
  if (error.value) {
    errorMessage.value = error.value;
    return;
  }
  if (slices.value.length === 0) {
    errorMessage.value = "No slices generated.";
    return;
  }
  currentSliceIndex.value = 0;
  showSlice(currentSliceIndex.value);
};

/* ------------------ Updating Slice Display ------------------ */

/**
 * Show the slice at the specified index.
 *
 * Here we remove the original (thin) line object for the selected slice and add a
 * "thick" version (i.e. a group of cylinders) to simulate a bold tube.
 */
const showSliceOriginal = (index: number) => {
  slices.value.forEach((slice, i) => {
    // For the selected slice:
    if (i === index) {
      // If a thick version hasn’t been created yet, build one.
      if (!slice.userData.thickVersion) {
        // You can adjust the "thickness" value (here 0.2) as desired.
        const color = new THREE.Color((slice.material as THREE.LineBasicMaterial).color.getHex());
        slice.userData.thickVersion = createThickSlice(slice, 0.2, color);
      }
      // Remove the thin line if present.
      if (scene.children.includes(slice)) {
        scene.remove(slice);
      }
      // Add the thick version if not already in the scene.
      if (!scene.children.includes(slice.userData.thickVersion)) {
        scene.add(slice.userData.thickVersion);
        // Optionally start a glow animation on the thick version.
        startGlowAnimation(slice.userData.thickVersion);
      }
    } else {
      // For non-selected slices, ensure the thin line is shown.
      if (!scene.children.includes(slice)) {
        scene.add(slice);
      }
      // And remove any thick version that might be lingering.
      if (slice.userData.thickVersion && scene.children.includes(slice.userData.thickVersion)) {
        scene.remove(slice.userData.thickVersion);
      }
      // Adjust opacity for non-selected slices.
      (slice.material as THREE.LineBasicMaterial).opacity = matOpacity.value;
      (slice.material as THREE.LineBasicMaterial).needsUpdate = true;
    }
  });
  renderer.render(scene, camera);
};


const showSliceSimpleWorking = (index: number) => {
  slices.value.forEach((slice, i) => {
    if (i === index) {
      if (!scene.children.includes(slice)) {
        scene.add(slice);
      }
    } else {
      if (scene.children.includes(slice)) {
        scene.remove(slice);
      }
    }
  });
  renderer.render(scene, camera);
};








const showSliceNice = (index: number) => {
  // Remove any previous preview plane.
  if (currentPreviewPlane && scene.children.includes(currentPreviewPlane)) {
    scene.remove(currentPreviewPlane);
    currentPreviewPlane.geometry.dispose();
    if (Array.isArray(currentPreviewPlane.material)) {
      currentPreviewPlane.material.forEach((mat) => mat.dispose());
    } else {
      currentPreviewPlane.material.dispose();
    }
    currentPreviewPlane = null;
  }
  
  const slice = slices.value[index];
  // Get the filled preview canvas and 2D bounding box.
  const { canvas, bbox2D } = exportSliceToCanvasPreview(slice);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  
  // Create a plane that matches the 2D bounding box dimensions.
  const planeGeometry = new THREE.PlaneGeometry(bbox2D.width, bbox2D.height);
  const planeMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  currentPreviewPlane = new THREE.Mesh(planeGeometry, planeMaterial);
  
  // Compute the center of the 2D bounding box (in slice local coordinates).
  const center2D = new THREE.Vector3(bbox2D.minX + bbox2D.width / 2, bbox2D.minY + bbox2D.height / 2, 0);
  // Convert to world coordinates.
  slice.localToWorld(center2D);
  currentPreviewPlane.position.copy(center2D);
  
  // Align the preview plane with the slice’s orientation.
  currentPreviewPlane.rotation.copy(slice.rotation);
  
  scene.add(currentPreviewPlane);
  renderer.render(scene, camera);
};

const showSlice = (index: number) => {
  // Remove any previous preview plane in the 3D scene
  if (currentPreviewPlane && scene.children.includes(currentPreviewPlane)) {
    scene.remove(currentPreviewPlane);
    currentPreviewPlane.geometry.dispose();
    if (Array.isArray(currentPreviewPlane.material)) {
      currentPreviewPlane.material.forEach((mat) => mat.dispose());
    } else {
      currentPreviewPlane.material.dispose();
    }
    currentPreviewPlane = null;
  }

  const slice = slices.value[index];

  // Use the export function that applies fixed scale & centering based on actual object size.
  const canvas = exportSliceToCanvas(slice);

  // Get the preview canvas (ensure this element exists in your DOM)
  const previewCanvas = document.getElementById("preview-canvas") as HTMLCanvasElement;
  if (!previewCanvas) {
    console.error("preview-canvas element not found");
    return;
  }
  const previewContext = previewCanvas.getContext("2d");

  // Set a high-resolution canvas (4x the CSS size for sharper rendering)
  const scaleFactor = 4;
  previewCanvas.width = previewCanvas.clientWidth * scaleFactor;
  previewCanvas.height = previewCanvas.clientHeight * scaleFactor;

  if (previewContext) {
    // Clear previous content
    previewContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    // Calculate source coordinates for an 8x zoom toward the center:
    // Taking the central 1/8th of the original canvas dimensions.
    // Define desired zoom level (e.g., 5x, 8x, etc.)
    const zoomFactor = 4; // Change dynamically as needed

    // Calculate source coordinates dynamically based on zoomFactor
    const srcX = (canvas.width * (zoomFactor - 1)) / (2 * zoomFactor);
    const srcY = (canvas.height * (zoomFactor - 1)) / (2 * zoomFactor);
    const srcWidth = canvas.width / zoomFactor;
    const srcHeight = canvas.height / zoomFactor;



    // Enable high-quality scaling
    previewContext.imageSmoothingEnabled = true;
    previewContext.imageSmoothingQuality = "high";

    // Draw the vector content directly from the canvas,
    // zooming in by scaling the central portion to fill the preview canvas.
    previewContext.drawImage(
      canvas,
      srcX,
      srcY,
      srcWidth,
      srcHeight,
      0,
      0,
      previewCanvas.width,
      previewCanvas.height
    );

    // Optionally downscale to match the display size for crisp rendering
    previewCanvas.style.width = `${previewCanvas.clientWidth}px`;
    previewCanvas.style.height = `${previewCanvas.clientHeight}px`;
  }
};



// Declare a global variable (at module level) for the preview plane.
let currentPreviewPlane: THREE.Mesh | null = null;

/**
 * Helper: Create a THREE.Texture from the slice’s final export.
 */
function createSlicePreviewTexture(slice: THREE.LineSegments): THREE.Texture {
  // exportSliceToCanvas is your existing function that produces a 2D canvas.
  const canvas = exportSliceToCanvas(slice);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

function exportSliceToCanvas(slice: THREE.LineSegments): HTMLCanvasElement {
  const positions = slice.geometry.getAttribute('position');
  const segments: { a: THREE.Vector2; b: THREE.Vector2 }[] = [];
  for (let i = 0; i < positions.count; i += 2) {
    const a = new THREE.Vector2(positions.getX(i), positions.getY(i));
    const b = new THREE.Vector2(positions.getX(i + 1), positions.getY(i + 1));
    segments.push({ a, b });
  }
  const polygons = buildPolygonsFromSegments(segments);

  // Create an offscreen canvas at 8K resolution (7680x4320)
  const canvas = document.createElement('canvas');
  canvas.width = 7680;
  canvas.height = 4320;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = false;

  // Fill background with black.
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Fixed conversion: use the actual object size
  // 218.880 mm maps to 7680 px, so:
  const scale = 7680 / 218.88; // ≈35.09 px per mm

  // Compute polygon bounding box in mm.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const poly of polygons) {
    for (const pt of poly) {
      minX = Math.min(minX, pt.x);
      minY = Math.min(minY, pt.y);
      maxX = Math.max(maxX, pt.x);
      maxY = Math.max(maxY, pt.y);
    }
  }
  // Determine the polygon's center (in mm).
  const polyCenterX = (minX + maxX) / 2;
  const polyCenterY = (minY + maxY) / 2;
  // Convert the polygon center to pixel coordinates.
  const polyCenterPxX = polyCenterX * scale;
  const polyCenterPxY = polyCenterY * scale;
  // Canvas center is (3840, 2160)
  const offsetX = 3840 - polyCenterPxX;
  const offsetY = 2160 - polyCenterPxY;

  // Draw and fill all polygons in white using the fixed scale and centering offset.
  ctx.fillStyle = 'white';
  ctx.beginPath();
  for (const poly of polygons) {
    if (poly.length === 0) continue;
    ctx.moveTo(poly[0].x * scale + offsetX, poly[0].y * scale + offsetY);
    for (let i = 1; i < poly.length; i++) {
      ctx.lineTo(poly[i].x * scale + offsetX, poly[i].y * scale + offsetY);
    }
    ctx.closePath();
  }
  ctx.fill('evenodd');

  // Binarize so that background remains pure black and slices pure white.
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const value = brightness < 128 ? 0 : 255;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

/**
 * New showSlice: Always display the exact final (2D export) preview.
 */
const showSlicePrev = (index: number) => {
  // Remove previous preview plane.
  if (currentPreviewPlane && scene.children.includes(currentPreviewPlane)) {
    scene.remove(currentPreviewPlane);
    currentPreviewPlane.geometry.dispose();
    if (Array.isArray(currentPreviewPlane.material)) {
      currentPreviewPlane.material.forEach(mat => mat.dispose());
    } else {
      currentPreviewPlane.material.dispose();
    }
    currentPreviewPlane = null;
  }
  // Create a texture from the selected slice.
  const texture = createSlicePreviewTexture(slices.value[index]);
  // Use a plane geometry that roughly matches the export’s aspect ratio (16:9 in this example).
  const planeGeometry = new THREE.PlaneGeometry(16, 9);
  const planeMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: false });
  currentPreviewPlane = new THREE.Mesh(planeGeometry, planeMaterial);
  // Position the preview plane at the center.
  currentPreviewPlane.position.set(0, 0, 0);
  scene.add(currentPreviewPlane);
  renderer.render(scene, camera);
};


/**
 * Set camera to Top View.
 */
 function setTopView() {
  camera.position.set(0, 50, 0);
  camera.up.set(0, 0, -1); // Adjust the up vector as needed.
  camera.lookAt(0, 0, 0);
}

/**
 * Set camera to Front View.
 */
function setFrontView() {
  camera.position.set(0, 0, 50);
  camera.up.set(0, 1, 0);
  camera.lookAt(0, 0, 0);
}

/**
 * Set camera to Side View.
 */
function setSideView() {
  camera.position.set(50, 0, 0);
  camera.up.set(0, 1, 0);
  camera.lookAt(0, 0, 0);
}

/**
 * Called when the vertical slider is moved.
 */
const onSliderChange = () => {
  showSlice(currentSliceIndex.value);
};

/* ------------------ Keyboard, Resize, and Save Handlers ------------------ */

const handleKeyDown = (event: KeyboardEvent) => {
  if (!fileLoaded.value || slices.value.length === 0) return;
  if (event.code === 'ArrowDown') {
    if (currentSliceIndex.value > 0) {
      currentSliceIndex.value--;
      showSlice(currentSliceIndex.value);
      showSliceSimpleWorking(currentSliceIndex.value);

    }
  } else if (event.code === 'ArrowUp') {
    if (currentSliceIndex.value < slices.value.length - 1) {
      currentSliceIndex.value++;
      showSlice(currentSliceIndex.value);
      showSliceSimpleWorking(currentSliceIndex.value);

    }
  } else if (event.code === 'Space' && event.type === 'keydown') {
    isSpaceBarHeld.value = true;
    // Isolate current slice.
    slices.value.forEach((slice, i) => {
      if (i === currentSliceIndex.value) {
        scene.add(slice);
      } else if (scene.children.includes(slice)) {
        scene.remove(slice);
      }
    });
    if (modelMesh.value && scene.children.includes(modelMesh.value)) {
      scene.remove(modelMesh.value);
    }
    scene.background = new THREE.Color(0x000000);
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);
    renderer.render(scene, camera);
  } else if (event.code === 'ShiftLeft') {
    showMainMesh.value = !showMainMesh.value;
    if (showMainMesh.value) {
      scene.add(modelMesh.value);
    } else {
      scene.remove(modelMesh.value);
    }
    renderer.render(scene, camera);
  }
};

const handleKeyUp = (event: KeyboardEvent) => {
  if (event.code === 'Space') {
    isSpaceBarHeld.value = false;
    if (showMainMesh.value && modelMesh.value) {
      scene.add(modelMesh.value);
    }
    slices.value.forEach((slice) => {
      if (!scene.children.includes(slice)) {
        scene.add(slice);
      }
    });
    renderer.render(scene, camera);
  }
};

const onWindowResize = () => {
  if (!renderer || !camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};



// Helper function to wrap canvas.toBlob in a Promise
function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to convert canvas to blob."));
    }, 'image/png');
  });
}

// Replace saveAllSlices with this updated version:
async function saveAllSlices() {
  for (let i = 0; i < slices.value.length; i++) {
    console.log(`Saving slice ${i + 1} of ${slices.value.length}...`);
    
    // Generate high-resolution slice canvas
    const canvas = exportSliceToCanvas(slices.value[i]);

    try {
      // Convert canvas to PNG Blob
      const blob = await canvasToBlob(canvas);

      // Embed 96 DPI metadata
      const finalBlob = await setPNG96DPI(blob);

      // Create download link
      const link = document.createElement('a');
      link.href = URL.createObjectURL(finalBlob);
      link.download = `slice_${(i + 1).toString().padStart(3, '0')}.png`;
      link.click();
      
      console.log(`Saved slice ${i + 1}`);
    } catch (err) {
      console.error(`Error saving slice ${i + 1}:`, err);
    }
  }
  console.log("All slices saved.");
}

/**
 * Save all slices as separate 8K PNG files.
 * For each slice, we create an offscreen scene using its thick version and render it.
 */

 const saveAllSlicesPrev = () => {
  slices.value.forEach((slice, index) => {
    const canvas = exportSliceToCanvas(slice);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      // Naming convention: slice_001.png, slice_002.png, etc.
      link.download = `slice_${(index + 1).toString().padStart(3, '0')}.png`;
      link.click();
    }, 'image/png');
  });
};

/* ------------------ Watchers and Lifecycle ------------------ */

watch(materialOpacity, (newOpacity) => {
  if (modelMesh.value) {
    const material = modelMesh.value.material as THREE.LineBasicMaterial;
    material.opacity = newOpacity;
    material.needsUpdate = true;
    renderer.render(scene, camera);
  }
});

watch(matOpacity, (newOpacity) => {
  if (modelMesh.value) {
    const material = modelMesh.value.material as THREE.LineBasicMaterial;
    material.opacity = newOpacity;
    material.needsUpdate = true;
    renderer.render(scene, camera);
  }
});

watch(error, (newError) => {
  if (newError) {
    errorMessage.value = newError;
    console.error('[STLSlicer] Error from slice viewer:', newError);
  }
});

onMounted(() => {
  initScene();
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('resize', onWindowResize);


  if (miniCubeCanvas.value) {
  miniCubeRenderer = new THREE.WebGLRenderer({ canvas: miniCubeCanvas.value, antialias: true });
  miniCubeRenderer.setSize(128, 128);
  miniCubeScene = new THREE.Scene();
  miniCubeCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
  miniCubeCamera.position.set(2, 2, 2);
  miniCubeCamera.lookAt(0, 0, 0);
  
  // Create a rotating cube.
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshNormalMaterial()
  );
  miniCubeScene.add(cube);
  
  const animateMiniCube = () => {
    requestAnimationFrame(animateMiniCube);
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    miniCubeRenderer.render(miniCubeScene, miniCubeCamera);
  };
  animateMiniCube();
}

});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  window.removeEventListener('resize', onWindowResize);
  renderer.dispose();
  controls.dispose();
  scene = null as unknown as THREE.Scene;
  camera = null as unknown as THREE.PerspectiveCamera;
  controls = null as unknown as OrbitControls;
});
</script>

<style scoped>
.slider-range {
  -webkit-appearance: none;
  appearance: none;
  width: 220px;
  height: 12px;
  transform: rotate(-90deg);
  background: transparent;
  margin: 0;
}

/* WebKit Thumb */
.slider-range::-webkit-slider-thumb {
  margin-top: -7px;
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: #f56565;
  border: 2px solid #c53030;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s ease;
}
.slider-range::-webkit-slider-thumb:hover {
  background: #e53e3e;
}

/* WebKit Track */
.slider-range::-webkit-slider-runnable-track {
  width: 100%;
  height: 6px;
  background: #a0aec0;
  border-radius: 3px;
}

/* Firefox Thumb */
.slider-range::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: #f56565;
  border: 2px solid #c53030;
  border-radius: 50%;
  cursor: pointer;
}

/* Firefox Track */
.slider-range::-moz-range-track {
  width: 100%;
  height: 6px;
  background: #a0aec0;
  border-radius: 3px;
}
#preview-window {
  position: fixed;
  bottom: 10px; /* Adjust spacing */
  right: 10px;
  width: 500px;
  height: 282px;
  background-color: rgba(0, 0, 0, 0.8);
  border: 1px solid #fff;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

#preview-canvas {
  width: 100%;
  height: 100%;
}

</style>
