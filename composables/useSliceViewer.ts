// src/composables/useSliceViewer.ts
import { ref, markRaw } from 'vue';
import * as THREE from 'three';

export const useSliceViewer = () => {
    const error = ref<string>('');
    const slices = ref<THREE.LineSegments[]>([]);

    /**
     * Predefined color palette for slices.
     */
    const colorPalette = [
        0xff0000, // Red
        0x00ff00, // Green
        0x0000ff, // Blue
        0xffff00, // Yellow
        0xff00ff, // Magenta
        0x00ffff, // Cyan
        0xffffff, // White
        0x000000, // Black
        0x800000, // Maroon
        0x808000, // Olive
        // Add more colors if needed
    ];

    /**
     * Generates a color for a slice based on its index.
     * @param index - The index of the slice.
     * @returns A hexadecimal color value.
     */
    const getSliceColor = (index: number): number => {
        return colorPalette[index % colorPalette.length];
    };

    /**
     * Slices the given mesh into layers based on the specified layer height.
     * Each slice is an exact cross-section represented by THREE.LineSegments.
     * @param mesh - The THREE.Mesh object to slice.
     * @param layerHeight - The height of each slicing layer.
     */
    // const sliceModel = (mesh: THREE.Mesh, layerHeight: number): void => {
    async function sliceModel(mesh: THREE.Mesh, layerHeight: number) {
        // Clear previous slices
        slices.value.forEach(slice => {
            if (slice.geometry) slice.geometry.dispose();
        });
        slices.value = [];
        error.value = '';
    
        // Update mesh world matrix
        mesh.updateMatrixWorld(true);
        const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    
        // Retrieve the position attribute
        const positionAttribute = geometry.getAttribute('position');
    
        if (!(positionAttribute instanceof THREE.BufferAttribute)) {
            error.value = 'Position attribute is not a BufferAttribute';
            return;
        }
    
        // Calculate bounding box
        const boundingBox = new THREE.Box3().setFromBufferAttribute(positionAttribute);
        const minZ = boundingBox.min.z;
        const maxZ = boundingBox.max.z;
    
        const totalSlices = Math.ceil((maxZ - minZ) / layerHeight);
        let sliceIndex = 0;
    
        // Process each slice in an async way
        const processNextSlice = () => {
            if (sliceIndex >= totalSlices) {
                // Done
                return;
            }
    
            const z = minZ + sliceIndex * layerHeight;
            const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -z);
            const intersections: THREE.Vector3[] = [];
    
            const index = geometry.index ? Array.from(geometry.index.array) : Array.from({ length: positionAttribute.count }, (_, i) => i);
    
            for (let i = 0; i < index.length; i += 3) {
                const a = new THREE.Vector3().fromBufferAttribute(positionAttribute, index[i]);
                const b = new THREE.Vector3().fromBufferAttribute(positionAttribute, index[i + 1]);
                const c = new THREE.Vector3().fromBufferAttribute(positionAttribute, index[i + 2]);
    
                const points = [a, b, c];
                const distances = points.map(p => plane.distanceToPoint(p));
                const signs = distances.map(d => Math.sign(d));
    
                // Check if the triangle intersects the plane
                const hasIntersection = (signs[0] !== signs[1] || signs[1] !== signs[2] || signs[0] !== signs[2]);
    
                if (hasIntersection) {
                    const intersectPoints: THREE.Vector3[] = [];
    
                    for (let j = 0; j < 3; j++) {
                        const j1 = j;
                        const j2 = (j + 1) % 3;
                        if (distances[j1] * distances[j2] < 0) {
                            const t = distances[j1] / (distances[j1] - distances[j2]);
                            const intersect = points[j1].clone().lerp(points[j2], t);
                            intersect.z = z; // Ensure it lies on the slice plane
                            intersectPoints.push(intersect);
                        }
                    }
    
                    if (intersectPoints.length === 2) {
                        intersections.push(intersectPoints[0], intersectPoints[1]);
                    }
                }
            }
    
            if (intersections.length >= 2) {
                const sliceGeometry = new THREE.BufferGeometry().setFromPoints(intersections);
                const color = getSliceColor(sliceIndex);
                const material = new THREE.LineBasicMaterial({ color });
                const lines = markRaw(new THREE.LineSegments(sliceGeometry, material));
                slices.value.push(lines);
            }
    
            sliceIndex++;
    
            // Schedule the next slice to process asynchronously
            requestAnimationFrame(processNextSlice);
        };
    
        // Start slicing process
        requestAnimationFrame(processNextSlice);
    }
        

    return {
        slices,
        error,
        sliceModel,
    };
};
