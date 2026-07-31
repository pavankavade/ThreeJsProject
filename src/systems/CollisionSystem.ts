import * as THREE from 'three';
import { DungeonMap } from './DungeonMap';

export interface CollisionTarget {
  id: number;
  position: THREE.Vector3;
  radius: number;
  takeDamage?: (amount: number) => boolean;
}

export class CollisionSystem {
  private map: DungeonMap;

  constructor(map: DungeonMap) {
    this.map = map;
  }

  public resolveWallCollision(position: THREE.Vector3, radius = 0.4): void {
    // Sliding collision along X and Z axes independently
    if (this.map.isWallAtWorld(position.x, position.z, radius)) {
      // Test X slide
      if (!this.map.isWallAtWorld(position.x, position.z - radius, radius)) {
        // Position fine
      } else {
        // Push back
      }
    }

    // Direct grid resolution
    const tileX = Math.floor((position.x + DungeonMap.TILE_SIZE / 2) / DungeonMap.TILE_SIZE);
    const tileZ = Math.floor((position.z + DungeonMap.TILE_SIZE / 2) / DungeonMap.TILE_SIZE);

    for (let r = tileZ - 1; r <= tileZ + 1; r++) {
      for (let c = tileX - 1; c <= tileX + 1; c++) {
        if (r < 0 || r >= this.map.gridHeight || c < 0 || c >= this.map.gridWidth) continue;
        if (this.map.grid[r][c] === 'W') {
          const wallMinX = c * DungeonMap.TILE_SIZE - DungeonMap.TILE_SIZE / 2;
          const wallMaxX = c * DungeonMap.TILE_SIZE + DungeonMap.TILE_SIZE / 2;
          const wallMinZ = r * DungeonMap.TILE_SIZE - DungeonMap.TILE_SIZE / 2;
          const wallMaxZ = r * DungeonMap.TILE_SIZE + DungeonMap.TILE_SIZE / 2;

          const closestX = Math.max(wallMinX, Math.min(position.x, wallMaxX));
          const closestZ = Math.max(wallMinZ, Math.min(position.z, wallMaxZ));

          const distX = position.x - closestX;
          const distZ = position.z - closestZ;
          const distanceSq = distX * distX + distZ * distZ;

          if (distanceSq < radius * radius && distanceSq > 0.0001) {
            const distance = Math.sqrt(distanceSq);
            const overlap = radius - distance;
            position.x += (distX / distance) * overlap;
            position.z += (distZ / distance) * overlap;
          }
        }
      }
    }
  }

  public raycastWallDistance(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number): number {
    const step = 0.15;
    const halfTile = DungeonMap.TILE_SIZE / 2;
    for (let d = 0.4; d <= maxDist; d += step) {
      const testX = origin.x + dir.x * d;
      const testZ = origin.z + dir.z * d;

      const col = Math.floor((testX + halfTile) / DungeonMap.TILE_SIZE);
      const row = Math.floor((testZ + halfTile) / DungeonMap.TILE_SIZE);

      if (row >= 0 && row < this.map.gridHeight && col >= 0 && col < this.map.gridWidth) {
        if (this.map.grid[row][col] === 'W') {
          return Math.max(0.5, d - 0.2);
        }
      } else {
        return Math.max(0.5, d - 0.2);
      }
    }
    return maxDist;
  }

  public getEntitiesInArc(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
    angleDegrees: number,
    targets: CollisionTarget[]
  ): CollisionTarget[] {
    const hitList: CollisionTarget[] = [];
    const normDir = direction.clone().setY(0).normalize();
    const halfAngleRad = (angleDegrees * Math.PI / 180) / 2;

    for (const target of targets) {
      const toTarget = target.position.clone().sub(origin);
      toTarget.y = 0;
      const dist = toTarget.length();

      if (dist <= maxDistance + target.radius) {
        toTarget.normalize();
        const dot = normDir.dot(toTarget);
        const angle = Math.acos(Math.min(1, Math.max(-1, dot)));

        if (angle <= halfAngleRad) {
          hitList.push(target);
        }
      }
    }

    return hitList;
  }
}
