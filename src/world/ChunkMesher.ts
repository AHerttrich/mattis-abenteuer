/**
 * ChunkMesher — Generates Three.js geometry from chunk block data.
 *
 * Uses visible-face culling: only generate faces where a solid block
 * is adjacent to air/transparent. Now includes UV mapping from TextureAtlas
 * and per-vertex ambient occlusion.
 */

import * as THREE from 'three';
import { CHUNK_SIZE, CHUNK_HEIGHT } from '../utils/constants';
import { BlockType, getBlockColor, getBlockProperties, isBlockTransparent } from './BlockType';
import type { Chunk } from './Chunk';
import type { TextureAtlas } from './TextureAtlas';
import type { WorldGenerator } from './WorldGenerator';

/** Biome color tint multipliers: [r, g, b] */
const BIOME_TINTS: Record<string, [number, number, number]> = {
  forest:   [0.85, 1.1, 0.85],  // deep rich green
  plains:   [1.1, 1.1, 0.8],   // golden-green
  desert:   [1.1, 1.05, 0.9],  // warm sandy
  tundra:   [0.9, 0.95, 1.1],  // cool blue
  swamp:    [0.8, 0.95, 0.7],  // murky brownish
  mountain: [0.95, 0.95, 1.0], // neutral cool
};

/** Block types affected by biome tinting */
function isBiomeTinted(block: BlockType): boolean {
  return block === BlockType.GRASS || block === BlockType.DIRT ||
    block === BlockType.LEAVES_OAK || block === BlockType.LEAVES_BIRCH ||
    block === BlockType.CLAY;
}

/** Face directions for neighbor checks */
const FACES = [
  { dir: [1, 0, 0], vertices: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]], normal: [1,0,0] },   // +X (right)
  { dir: [-1, 0, 0], vertices: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]], normal: [-1,0,0] },  // -X (left)
  { dir: [0, 1, 0], vertices: [[0,1,0],[0,1,1],[1,1,1],[1,1,0]], normal: [0,1,0] },    // +Y (top)
  { dir: [0, -1, 0], vertices: [[0,0,1],[0,0,0],[1,0,0],[1,0,1]], normal: [0,-1,0] },  // -Y (bottom)
  { dir: [0, 0, 1], vertices: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]], normal: [0,0,1] },    // +Z (front)
  { dir: [0, 0, -1], vertices: [[1,0,0],[0,0,0],[0,1,0],[1,1,0]], normal: [0,0,-1] },  // -Z (back)
];

/** UV corners for face vertices (maps to 4 corners of the texture tile) */
const FACE_UVS = [
  [0, 0],  // bottom-left
  [0, 1],  // top-left
  [1, 1],  // top-right
  [1, 0],  // bottom-right
];

/**
 * Get the block at a position, checking neighbor chunks if needed.
 */
function getBlockAt(
  chunk: Chunk,
  neighbors: Map<string, Chunk>,
  x: number, y: number, z: number,
): BlockType {
  if (y < 0 || y >= CHUNK_HEIGHT) return BlockType.AIR;

  if (x >= 0 && x < CHUNK_SIZE && z >= 0 && z < CHUNK_SIZE) {
    return chunk.getBlock(x, y, z);
  }

  // Check neighbor chunk
  let ncx = chunk.cx;
  let ncz = chunk.cz;
  let lx = x;
  let lz = z;

  if (x < 0) { ncx -= 1; lx = x + CHUNK_SIZE; }
  else if (x >= CHUNK_SIZE) { ncx += 1; lx = x - CHUNK_SIZE; }
  if (z < 0) { ncz -= 1; lz = z + CHUNK_SIZE; }
  else if (z >= CHUNK_SIZE) { ncz += 1; lz = z - CHUNK_SIZE; }

  const neighborKey = `${ncx},${ncz}`;
  const neighbor = neighbors.get(neighborKey);
  if (!neighbor) return BlockType.AIR;

  return neighbor.getBlock(lx, y, lz);
}

/**
 * Per-vertex ambient occlusion.
 * Checks 3 neighbors at each vertex corner to determine occlusion level (0-3).
 * Returns a shade multiplier (1.0 = fully lit, 0.4 = fully occluded).
 */
function vertexAO(side1: boolean, side2: boolean, corner: boolean): number {
  // side1 and side2 are the two adjacent face neighbors, corner is the diagonal
  if (side1 && side2) return 0.4;  // Both sides blocked → max occlusion
  const occluded = (side1 ? 1 : 0) + (side2 ? 1 : 0) + (corner ? 1 : 0);
  return 1.0 - occluded * 0.2;  // 0 → 1.0, 1 → 0.8, 2 → 0.6, 3 → 0.4
}

/**
 * Check if a block is solid (non-transparent) for AO purposes.
 */
function isSolid(chunk: Chunk, neighbors: Map<string, Chunk>, x: number, y: number, z: number): boolean {
  const block = getBlockAt(chunk, neighbors, x, y, z);
  return !isBlockTransparent(block);
}

/**
 * Calculate AO values for the 4 vertices of a face.
 * Returns array of 4 shade multipliers.
 */
function calculateFaceAO(
  chunk: Chunk, neighbors: Map<string, Chunk>,
  x: number, y: number, z: number,
  faceDir: number[],
): number[] {
  const [dx, dy, dz] = faceDir;

  // Determine the two tangent axes for this face
  let t1: number[], t2: number[];
  if (dy !== 0) {
    // Top/bottom face — tangents are X and Z
    t1 = [1, 0, 0]; t2 = [0, 0, 1];
  } else if (dx !== 0) {
    // Left/right face — tangents are Z and Y
    t1 = [0, 0, 1]; t2 = [0, 1, 0];
  } else {
    // Front/back face — tangents are X and Y
    t1 = [1, 0, 0]; t2 = [0, 1, 0];
  }

  // Neighbor position on the face
  const nx = x + dx, ny = y + dy, nz = z + dz;

  // Check 8 neighbors around the face normal
  const s00 = isSolid(chunk, neighbors, nx - t1[0] - t2[0], ny - t1[1] - t2[1], nz - t1[2] - t2[2]);
  const s10 = isSolid(chunk, neighbors, nx - t2[0], ny - t2[1], nz - t2[2]);
  const s20 = isSolid(chunk, neighbors, nx + t1[0] - t2[0], ny + t1[1] - t2[1], nz + t1[2] - t2[2]);
  const s01 = isSolid(chunk, neighbors, nx - t1[0], ny - t1[1], nz - t1[2]);
  const s21 = isSolid(chunk, neighbors, nx + t1[0], ny + t1[1], nz + t1[2]);
  const s02 = isSolid(chunk, neighbors, nx - t1[0] + t2[0], ny - t1[1] + t2[1], nz - t1[2] + t2[2]);
  const s12 = isSolid(chunk, neighbors, nx + t2[0], ny + t2[1], nz + t2[2]);
  const s22 = isSolid(chunk, neighbors, nx + t1[0] + t2[0], ny + t1[1] + t2[1], nz + t1[2] + t2[2]);

  // AO for 4 corners: (−t1,−t2), (−t1,+t2), (+t1,+t2), (+t1,−t2)
  const ao0 = vertexAO(s01, s10, s00);
  const ao1 = vertexAO(s01, s12, s02);
  const ao2 = vertexAO(s21, s12, s22);
  const ao3 = vertexAO(s21, s10, s20);

  return [ao0, ao1, ao2, ao3];
}

/**
 * Build a mesh for a chunk with texture atlas UV mapping and per-vertex AO.
 */
export function buildChunkMesh(
  chunk: Chunk,
  neighbors: Map<string, Chunk>,
  atlas?: TextureAtlas,
  worldGen?: WorldGenerator,
): THREE.Mesh | null {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const emissiveStrengths: number[] = [];
  const indices: number[] = [];
  let vertexCount = 0;

  const color = new THREE.Color();

  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const blockType = chunk.getBlock(x, y, z);
        if (blockType === BlockType.AIR) continue;

        const blockColor = getBlockColor(blockType);
        const blockProps = getBlockProperties(blockType);
        const emissive = blockProps.lightLevel > 0 ? Math.min(1.0, blockProps.lightLevel / 15) : 0;

        for (let fi = 0; fi < FACES.length; fi++) {
          const face = FACES[fi];
          const nx = x + face.dir[0];
          const ny = y + face.dir[1];
          const nz = z + face.dir[2];

          const neighborBlock = getBlockAt(chunk, neighbors, nx, ny, nz);

          // Only render face if neighbor is transparent
          if (!isBlockTransparent(neighborBlock)) continue;
          // Don't render face between two same liquid blocks
          if (neighborBlock === blockType) continue;

          // Calculate per-vertex AO
          const aoValues = calculateFaceAO(chunk, neighbors, x, y, z, face.dir);

          // Get UV tile from atlas
          const tileUVs = atlas?.getUVs(blockType);

          // Add 4 vertices for this face
          for (let vi = 0; vi < face.vertices.length; vi++) {
            const vertex = face.vertices[vi];
            positions.push(x + vertex[0], y + vertex[1], z + vertex[2]);
            normals.push(face.normal[0], face.normal[1], face.normal[2]);

            color.setHex(blockColor);

            // Biome tint for vegetation blocks
            if (worldGen && isBiomeTinted(blockType)) {
              const wx = chunk.worldX + x;
              const wz = chunk.worldZ + z;
              const biome = worldGen.getBiome(wx, wz);
              const tint = BIOME_TINTS[biome] ?? [1, 1, 1];
              color.r *= tint[0];
              color.g *= tint[1];
              color.b *= tint[2];
            }

            // Face-direction shading (subtle base, AO provides the depth)
            const dirShade = face.normal[1] === -1 ? 0.75 :
                              face.normal[1] === 1 ? 1.0 :
                              face.normal[0] !== 0 ? 0.88 : 0.92;

            // Combine direction shade with per-vertex AO
            const shade = dirShade * aoValues[vi];

            colors.push(color.r * shade, color.g * shade, color.b * shade);

            // Emissive strength for glowing blocks
            emissiveStrengths.push(emissive);

            // UV coordinates
            if (tileUVs) {
              const uv = FACE_UVS[vi];
              const u = tileUVs.u0 + uv[0] * (tileUVs.u1 - tileUVs.u0);
              const v = tileUVs.v0 + uv[1] * (tileUVs.v1 - tileUVs.v0);
              uvs.push(u, v);
            } else {
              uvs.push(FACE_UVS[vi][0], FACE_UVS[vi][1]);
            }
          }

          // Flip quad triangulation if AO is anisotropic to prevent lighting artifacts
          if (aoValues[0] + aoValues[2] > aoValues[1] + aoValues[3]) {
            // Standard triangulation
            indices.push(
              vertexCount, vertexCount + 1, vertexCount + 2,
              vertexCount, vertexCount + 2, vertexCount + 3,
            );
          } else {
            // Flipped triangulation
            indices.push(
              vertexCount + 1, vertexCount + 2, vertexCount + 3,
              vertexCount + 1, vertexCount + 3, vertexCount,
            );
          }
          vertexCount += 4;
        }
      }
    }
  }

  if (positions.length === 0) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('aEmissiveStrength', new THREE.Float32BufferAttribute(emissiveStrengths, 1));
  geometry.setIndex(indices);

  const material = new THREE.MeshStandardMaterial({
    map: atlas?.texture ?? null,
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.05,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 1.0,
  });

  // WS5: Vegetation wind animation via shader injection
  // Adds subtle sinusoidal sway to vertices with high green channel (leaves/grass)
  const windTimeUniform = { value: 0 };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = windTimeUniform;
    // Add attribute + uniform declarations
    shader.vertexShader = 'attribute float aEmissiveStrength;\nvarying float vEmissiveStrength;\nuniform float uWindTime;\n' + shader.vertexShader;
    // Pass emissive strength to fragment shader
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vEmissiveStrength = aEmissiveStrength;
      // Wind animation for vegetation (green-tinted blocks)
      float isVegetation = step(0.45, vColor.g) * step(vColor.r, 0.5);
      float windStrength = isVegetation * 0.08;
      vec3 worldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      float wave = sin(uWindTime * 1.8 + worldPos.x * 2.0 + worldPos.z * 1.5) * windStrength;
      float wave2 = cos(uWindTime * 1.3 + worldPos.z * 2.5 + worldPos.x * 0.8) * windStrength * 0.6;
      transformed.x += wave;
      transformed.z += wave2;
      `
    );
    // In fragment shader, scale emissive by per-vertex strength
    shader.fragmentShader = 'varying float vEmissiveStrength;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      totalEmissiveRadiance *= vEmissiveStrength;
      `
    );
  };

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(chunk.worldX, 0, chunk.worldZ);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Store wind time uniform on mesh userData for updates
  mesh.userData.windTimeUniform = windTimeUniform;

  return mesh;
}
