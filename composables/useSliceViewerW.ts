// src/composables/useSliceViewer.ts
import { ref, markRaw } from 'vue';
import * as THREE from 'three';

/**
 * This composable produces "full flesh" slices of a mesh between
 * z = (minZ + n * layerHeight) and z + layerHeight.
 * Each slice is stored as a separate mesh in `slices.value`.
 *
 * Slicing is performed in small batches so the main thread is not blocked.
 *
 * Usage:
 * const { slices, error, sliceModel, isSlicing, progress } = useSliceViewer();
 *
 * sliceModel(mesh, layerHeight);
 */

export function useSliceViewer() {
  const slices = ref<THREE.Mesh[]>([]);
  const error = ref('');
  const isSlicing = ref(false);
  const progress = ref(0);

  // Color palette
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
    // ... add more if you like
  ];

  /**
   * Returns a color from the palette based on index.
   */
  function getSliceColor(i: number) {
    return colorPalette[i % colorPalette.length];
  }

  /**
   * Clips a polygon (array of Vector3) against the plane z >= clipZ or z <= clipZ.
   *  - keepAbove = true => keep the region where z >= clipZ
   *  - keepAbove = false => keep the region where z <= clipZ
   * Returns the new polygon array after clipping.
   * Potentially returns 0 to up to polygon.length+1 vertices.
   */
  function clipPolygonZ(
    polygon: THREE.Vector3[],
    clipZ: number,
    keepAbove: boolean
  ): THREE.Vector3[] {
    const clipped: THREE.Vector3[] = [];
    for (let i = 0; i < polygon.length; i++) {
      const current = polygon[i];
      const next = polygon[(i + 1) % polygon.length];

      const currentInside = keepAbove
        ? current.z >= clipZ
        : current.z <= clipZ;
      const nextInside = keepAbove ? next.z >= clipZ : next.z <= clipZ;

      // If current is inside, keep it
      if (currentInside) {
        clipped.push(current.clone());
      }

      // Check for edge intersection
      if (currentInside !== nextInside) {
        // Edge crosses boundary => find intersection
        const t = (clipZ - current.z) / (next.z - current.z);
        const intersect = current.clone().lerp(next, t);
        intersect.z = clipZ; // ensure exact clip
        clipped.push(intersect);
      }
    }
    return clipped;
  }

  /**
   * Given a single triangle ABC, clip it to the region zMin <= z <= zMax,
   * returns zero or more triangles (in a flat array of Vector3 triplets).
   *
   * Steps:
   * 1) Start with polygon = [A, B, C].
   * 2) Clip polygon with plane z >= zMin.
   * 3) Clip result with plane z <= zMax.
   * 4) Triangulate final polygon if it has 3+ points.
   */
  function clipTriangle(
    a: THREE.Vector3,
    b: THREE.Vector3,
    c: THREE.Vector3,
    zMin: number,
    zMax: number
  ): THREE.Vector3[] {
    // Polygon start
    let poly = [a, b, c];

    // Clip with plane z >= zMin
    poly = clipPolygonZ(poly, zMin, true);
    if (poly.length < 3) return [];

    // Clip with plane z <= zMax
    poly = clipPolygonZ(poly, zMax, false);
    if (poly.length < 3) return [];

    // Triangulate the final polygon (fan triangulation)
    const result: THREE.Vector3[] = [];
    for (let i = 1; i < poly.length - 1; i++) {
      result.push(poly[0].clone(), poly[i].clone(), poly[i + 1].clone());
    }
    return result; // each triple is a triangle
  }

  /**
   * Slices the given mesh into full-volume slices, each a separate Mesh.
   * @param mesh - The input mesh (THREE.Mesh).
   * @param layerHeight - Slice thickness.
   */
  async function sliceModel(mesh: THREE.Mesh, layerHeight: number) {
    // Clear any previous slices
    slices.value.forEach((slice) => {
      slice.geometry.dispose();
      if (Array.isArray(slice.material)) {
        slice.material.forEach((mat) => mat.dispose());
      } else {
        slice.material.dispose();
      }
    });
    slices.value = [];
    error.value = '';
    progress.value = 0;
    isSlicing.value = true;

    try {
      // Update mesh in world coordinates
      mesh.updateMatrixWorld(true);
      const clonedGeom = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);

      // Position attribute
      const posAttr = clonedGeom.getAttribute('position') as THREE.BufferAttribute;
      if (!posAttr) {
        throw new Error('Position attribute is not available.');
      }

      // Bounding box
      const bbox = new THREE.Box3().setFromBufferAttribute(posAttr);
      const minZ = bbox.min.z;
      const maxZ = bbox.max.z;
      const totalSlices = Math.ceil((maxZ - minZ) / layerHeight);

      // Indices
      let indices: number[];
      if (clonedGeom.index) {
        indices = Array.from(clonedGeom.index.array);
      } else {
        indices = Array.from({ length: posAttr.count }, (_, i) => i);
      }

      let sliceIndex = 0;

      // Process each slice in small asynchronous batches
      const processNextSlice = () => {
        if (sliceIndex >= totalSlices) {
          // done
          isSlicing.value = false;
          progress.value = 1;
          return;
        }

        const z0 = minZ + sliceIndex * layerHeight;
        const z1 = z0 + layerHeight;

        // collect clipped triangles
        const vertices: number[] = [];
        for (let i = 0; i < indices.length; i += 3) {
          const iA = indices[i];
          const iB = indices[i + 1];
          const iC = indices[i + 2];

          const A = new THREE.Vector3().fromBufferAttribute(posAttr, iA);
          const B = new THREE.Vector3().fromBufferAttribute(posAttr, iB);
          const C = new THREE.Vector3().fromBufferAttribute(posAttr, iC);

          const clippedTris = clipTriangle(A, B, C, z0, z1);
          // each 3 Vector3 is a triangle
          for (const v of clippedTris) {
            vertices.push(v.x, v.y, v.z);
          }
        }

        // If we got any geometry for this slice, build a Mesh
        if (vertices.length > 0) {
          const sliceGeom = new THREE.BufferGeometry();
          const posBuf = new Float32Array(vertices);
          sliceGeom.setAttribute('position', new THREE.BufferAttribute(posBuf, 3));
          sliceGeom.computeVertexNormals();

          const matColor = getSliceColor(sliceIndex);
          const sliceMat = new THREE.MeshStandardMaterial({
            color: matColor,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85,
          });

          const sliceMesh = new THREE.Mesh(sliceGeom, sliceMat);
          slices.value.push(markRaw(sliceMesh));

        //   slices.value.push(sliceMesh);
        }

        sliceIndex++;
        progress.value = sliceIndex / totalSlices;

        // Schedule next step
        requestAnimationFrame(processNextSlice);
      };

      // Start
      requestAnimationFrame(processNextSlice);
    } catch (err: any) {
      error.value = err.message || 'Unknown slicing error';
      isSlicing.value = false;
    }
  }

  return {
    slices,
    error,
    isSlicing,
    progress,
    sliceModel,
  };
}
