<!-- src/components/STLSlicer.vue -->
<template>
    <div class="stl-slicer">
        <!-- Drag-and-Drop Overlay -->
        <div v-if="!fileLoaded" class="dropzone" @dragover.prevent @drop.prevent="handleDrop">
            <p>Drag and drop an STL file here</p>
        </div>

        <!-- Slicing Controls -->
        <div v-if="fileLoaded" class="controls">
            <label for="layerHeight">Layer Height (mm):</label>
            <input
                id="layerHeight"
                v-model.number="layerHeight"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g., 0.5"
            />
            <button @click="startSlicingHandler">Start Slicing</button>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="error">{{ errorMessage }}</div>

        <!-- 3D Viewer -->
        <div class="viewer-container">
            <canvas ref="canvasRef"></canvas>
        </div>

        <!-- Slice Navigation Instructions -->
        <div v-if="fileLoaded && slices.length > 0" class="navigation-instructions">
            <p>Use Up/Down arrow keys to navigate slices.</p>
            <p>Hold Space Bar to isolate the selected slice.</p>
            <p>Current Slice: {{ currentSliceIndex + 1 }} / {{ slices.length }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { useSliceViewer } from '@/composables/useSliceViewerW';
import { markRaw } from 'vue';

// Reactive Variables
const fileLoaded = ref(false);
const layerHeight = ref(0.5); // Default layer height
const errorMessage = ref('');
const currentSliceIndex = ref(0);
const isSpaceBarHeld = ref(false);
const showMainMesh = ref(true);
// Three.js Objects
let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let controls: OrbitControls;
const canvasRef = ref<HTMLCanvasElement | null>(null);

// Slice Viewer Composable
const { slices, error, sliceModel } = useSliceViewer();

// Mesh Reference
const modelMesh = ref<THREE.LineSegments | null>(null);

/**
 * Initializes the Three.js scene, camera, renderer, and controls.
 */
const initScene = () => {
    if (!canvasRef.value) {
        console.error("Canvas reference is null. Cannot initialize renderer.");
        return;
    }

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: canvasRef.value, antialias: true });
    renderer.setSize(window.innerWidth/1.5, window.innerHeight-110);
    renderer.setPixelRatio(window.devicePixelRatio);
    // renderer.setClearColor(0xf0f0f0, 1);
    // dark:
    renderer.setClearColor(0x111111, 1);

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(
        75,
        (window.innerWidth/1.5) / (window.innerHeight-110),
        0.1,
        1000
    );
    camera.position.set(0, 0, 40);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(ambientLight, directionalLight);

    // Start Rendering
    animate();
};

/**
 * Animation loop for rendering the scene.
 */
const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
};


/**
 * Handles the drop event for drag-and-drop STL file loading.
 * @param event - The drag event.
 */
const handleDrop = async (event: DragEvent) => {
    const files = event.dataTransfer?.files;
    if (files && files[0]) {
        const file = files[0];
        errorMessage.value = '';

        try {
            const loader = new STLLoader();
            const buffer = await file.arrayBuffer();
            const geometry = loader.parse(buffer);
            // white color 
            const material = new THREE.LineBasicMaterial({ color: 0xffffff ,
                // side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.1,
                depthTest: false,
                depthWrite: false,
            });

            const solidMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xffffff,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 1.0, // Fully opaque for solid appearance
            });

            const solidMesh = new THREE.Mesh(geometry, solidMaterial);
            solidMesh.geometry.center();
            solidMesh.geometry.computeBoundingBox();
            solidMesh.geometry.computeVertexNormals();

            // modelMesh.value = markRaw(solidMesh); // Ensure Vue doesn't make it reactive

               
            const lines = new THREE.LineSegments(geometry, material);
            lines.geometry.center();
            lines.geometry.computeBoundingBox();
            lines.geometry.computeVertexNormals();

            modelMesh.value = markRaw(lines);
            fileLoaded.value = true;
            addModelToScene();
        } catch (err) {
            errorMessage.value = "Failed to load STL file.";
            console.error(err);
        }
    } else {
        errorMessage.value = "No file detected.";
    }
};

/**
 * Adds the loaded model to the scene.
 */
const addModelToScene = () => {
    if (!scene || !modelMesh.value) return;

    // Clear existing objects except lights
    scene.children.forEach(child => {
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

    // Add the loaded mesh
    scene.add(modelMesh.value);
};

/**
 * Initiates the slicing process.
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

/**
 * Displays the slice at the specified index and hides others.
 * @param index - The index of the slice to display.
 */
 const showSlice = (index: number) => {
    // Hide all slices

    slices.value.forEach((slice, i) => {
        if (scene.children.includes(slice)) {
            scene.remove(slice);
        }
    });

    // Show the selected slice
    if (slices.value[index]) {
        scene.add(slices.value[index]);
        renderer.render(scene, camera);
    }
};

/**
 * Handles keyboard events for slice isolation and navigation.
 * @param event - The keyboard event.
 */
 const handleKeyDown = (event: KeyboardEvent) => {
    console.log(event.code)
    if (!fileLoaded.value || slices.value.length === 0) return;

    if (event.code === 'ArrowDown') {
        // Navigate to the previous slice
        if (currentSliceIndex.value > 0) {
            currentSliceIndex.value--;
            showSlice(currentSliceIndex.value);
            // scene.add(modelMesh.value);
        }
    } else if (event.code === 'ArrowUp') {
        // Navigate to the next slice
        if (currentSliceIndex.value < slices.value.length - 1) {
            currentSliceIndex.value++;
            showSlice(currentSliceIndex.value);
            // scene.add(modelMesh.value);
        }
    } else if (event.code === 'Space' && event.type === 'keydown') {
        // Space bar pressed: isolate the current slice
        isSpaceBarHeld.value = true;

        // Hide all slices except the current one
        slices.value.forEach((slice, i) => {
            if (i === currentSliceIndex.value) {
                scene.add(slice);
            } else if (scene.children.includes(slice)) {
                scene.remove(slice);
            }
        });

        // Remove the model from the scene
        if (modelMesh.value && scene.children.includes(modelMesh.value)) {
            scene.remove(modelMesh.value);
        }

        // make scene background dark and gradient ambient lights
        scene.background = new THREE.Color(0x000000);
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);
        directionalLight.position.normalize();

        renderer.render(scene, camera);
    } else if (event.code === 'ShiftLeft'){
        // hide/show the mesh model
        showMainMesh.value = !showMainMesh.value;
        if (showMainMesh.value) {
            scene.add(modelMesh.value);
        } else {
            scene.remove(modelMesh.value);
        }
        renderer.render(scene, camera);
    } 
};

/**
 * Handles the release of the space bar to restore visibility.
 * @param event - The keyboard event.
 */
const handleKeyUp = (event: KeyboardEvent) => {
    if (event.code === 'Space') {
        // Space bar released: restore all slices and the model
        isSpaceBarHeld.value = false;

        if (showMainMesh.value){
            scene.add(modelMesh.value);
        }
        // Add all slices back to the scene
        slices.value.forEach(slice => {
            if (!scene.children.includes(slice)) {
                scene.add(slice);
            }
        });

        renderer.render(scene, camera);
    }
};

/**
 * Isolates or restores slices based on the current state.
 * @param index - The index of the slice to isolate.
 * @param isolate - Whether to isolate (true) or restore (false) the slice.
 */
 const isolateSlice = (index: number, isolate: boolean) => {
    slices.value.forEach((slice, i) => {
        if (isolate) {
            // Show only the selected slice
            if (i === index && !scene.children.includes(slice)) {
                scene.add(slice);
            } else if (i !== index && scene.children.includes(slice)) {
                scene.remove(slice);
            }
        } else {
            // Restore all slices
            if (!scene.children.includes(slice)) {
                scene.add(slice);
            }
        }
    });
    renderer.render(scene, camera);
};

/**
 * Handles window resize events to adjust camera and renderer.
 */
const onWindowResize = () => {
    if (!renderer || !camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
};

// Watch for errors from the composable and display them
watch(error, (newError) => {
    if (newError) {
        errorMessage.value = newError;
    }
});

// Lifecycle Hooks
onMounted(() => {
    initScene();
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', onWindowResize);
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    window.removeEventListener('resize', onWindowResize);
    renderer.dispose();
    controls.dispose();
    scene = null;
    camera = null;
    controls = null;
});
</script>

<style scoped>
/* Reset margin and padding */
body, html, #app {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden; /* Prevent scroll */
    font-family: Arial, sans-serif;
}

.stl-slicer {
    /* position: fixed; */
    width: 100%;
    height: 100%;
    z-index: 0;
}

/* Drag-and-Drop Overlay */
.dropzone {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(74, 144, 226, 0.2);
    display: flex;
    justify-content: center;
    align-items: center;
    color: #4a90e2;
    font-size: 24px;
    /* z-index: 10; */
    transition: background-color 0.3s;
}

.dropzone:hover {
    background-color: rgba(74, 144, 226, 0.4);
}

/* Slicing Controls */
.controls {
    position: absolute;
    top: 20px;
    left: 20px;
    background-color: rgba(255, 255, 255, 0.9);
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
    z-index: 5;
}

.controls label {
    display: block;
    margin-bottom: 8px;
    font-weight: bold;
    color: #333;
}

.controls input {
    width: 100px;
    padding: 5px;
    margin-bottom: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.controls button {
    width: 100%;
    background-color: #4a90e2;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 10px;
    cursor: pointer;
    font-size: 16px;
    transition: background-color 0.3s;
}

.controls button:hover {
    background-color: #357abd;
}

.controls button:disabled {
    background-color: #a0c4e3;
    cursor: not-allowed;
}

/* Error Message */
.error {
    position: absolute;
    top: 20px;
    right: 20px;
    background-color: rgba(255, 0, 0, 0.8);
    color: white;
    padding: 10px 15px;
    border-radius: 4px;
    z-index: 5;
    font-weight: bold;
}

/* 3D Viewer */
.viewer-container {
    width: 100%;
    height: 100%;
}

/* Navigation Instructions */
.navigation-instructions {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(255, 255, 255, 0.9);
    padding: 10px 15px;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
    z-index: 5;
    color: #333;
    font-weight: bold;
    text-align: center;
}
</style>
