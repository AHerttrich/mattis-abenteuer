/**
 * PathFinder — A* pathfinding on the voxel grid.
 */

import { PATHFINDING_MAX_NODES } from '../utils/constants';

interface PathNode {
  x: number;
  y: number;
  z: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

type IsSolidFn = (x: number, y: number, z: number) => boolean;

export class PathFinder {
  private isSolid: IsSolidFn;

  constructor(isSolid: IsSolidFn) {
    this.isSolid = isSolid;
  }

  /** Find path from start to goal. Returns list of positions or null. */
  findPath(
    sx: number,
    sy: number,
    sz: number,
    gx: number,
    gy: number,
    gz: number,
  ): { x: number; y: number; z: number }[] | null {
    sx = Math.floor(sx);
    sy = Math.floor(sy);
    sz = Math.floor(sz);
    gx = Math.floor(gx);
    gy = Math.floor(gy);
    gz = Math.floor(gz);

    const open: PathNode[] = [];
    const closed = new Set<string>();
    const key = (x: number, y: number, z: number): string => `${x},${y},${z}`;

    const start: PathNode = {
      x: sx,
      y: sy,
      z: sz,
      g: 0,
      h: this.heuristic(sx, sy, sz, gx, gy, gz),
      f: 0,
      parent: null,
    };
    start.f = start.g + start.h;
    open.push(start);

    let iterations = 0;

    while (open.length > 0 && iterations < PATHFINDING_MAX_NODES) {
      iterations++;
      // Find node with lowest f
      open.sort((a, b) => a.f - b.f);
      const current = open.shift()!;
      const ck = key(current.x, current.y, current.z);

      if (current.x === gx && current.y === gy && current.z === gz) {
        return this.reconstructPath(current);
      }

      closed.add(ck);

      // Check 4 horizontal neighbors + step up/down
      const neighbors = this.getNeighbors(current.x, current.y, current.z);
      for (const n of neighbors) {
        const nk = key(n.x, n.y, n.z);
        if (closed.has(nk)) continue;

        const g = current.g + n.cost;
        const existing = open.find((o) => o.x === n.x && o.y === n.y && o.z === n.z);

        if (!existing) {
          const h = this.heuristic(n.x, n.y, n.z, gx, gy, gz);
          open.push({ x: n.x, y: n.y, z: n.z, g, h, f: g + h, parent: current });
        } else if (g < existing.g) {
          existing.g = g;
          existing.f = g + existing.h;
          existing.parent = current;
        }
      }
    }
    return null; // No path found
  }

  private getNeighbors(
    x: number,
    y: number,
    z: number,
  ): { x: number; y: number; z: number; cost: number }[] {
    const result: { x: number; y: number; z: number; cost: number }[] = [];
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    for (const [dx, dz] of dirs) {
      const nx = x + dx,
        nz = z + dz;

      // Walk on same level — feet clear, head clear, ground exists
      if (!this.isSolid(nx, y, nz) && !this.isSolid(nx, y + 1, nz) && this.isSolid(nx, y - 1, nz)) {
        result.push({ x: nx, y, z: nz, cost: 1 });
        continue;
      }
      // Step up (1 block) — need clearance above for 2-tall entity
      if (
        this.isSolid(nx, y, nz) &&
        !this.isSolid(nx, y + 1, nz) &&
        !this.isSolid(nx, y + 2, nz) &&
        !this.isSolid(x, y + 2, z)
      ) {
        // also check headroom at current pos
        result.push({ x: nx, y: y + 1, z: nz, cost: 2 });
        continue;
      }
      // Step down (1 block)
      if (!this.isSolid(nx, y, nz) && !this.isSolid(nx, y - 1, nz) && this.isSolid(nx, y - 2, nz)) {
        result.push({ x: nx, y: y - 1, z: nz, cost: 1.5 });
        continue;
      }
      // Step down (2 blocks) — for descending slopes
      if (
        !this.isSolid(nx, y, nz) &&
        !this.isSolid(nx, y - 1, nz) &&
        !this.isSolid(nx, y - 2, nz) &&
        this.isSolid(nx, y - 3, nz)
      ) {
        result.push({ x: nx, y: y - 2, z: nz, cost: 2.5 });
      }
    }
    return result;
  }

  private heuristic(
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
  ): number {
    return Math.abs(ax - bx) + Math.abs(ay - by) + Math.abs(az - bz);
  }

  private reconstructPath(node: PathNode): { x: number; y: number; z: number }[] {
    const path: { x: number; y: number; z: number }[] = [];
    let current: PathNode | null = node;
    while (current) {
      path.unshift({ x: current.x, y: current.y, z: current.z });
      current = current.parent;
    }
    return path;
  }
}
