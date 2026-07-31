import * as THREE from 'three';
import { DungeonMap } from '../systems/DungeonMap';
import { Skeleton } from '../entities/Skeleton';
import { Chest } from '../entities/Chest';

export class Minimap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private size: number = 160;

  constructor(parent: HTMLElement) {
    const container = document.createElement('div');
    container.className = 'hud-minimap-card';

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.canvas.className = 'hud-minimap-canvas';

    container.appendChild(this.canvas);
    parent.appendChild(container);

    this.ctx = this.canvas.getContext('2d')!;
  }

  public render(
    map: DungeonMap,
    playerPos: THREE.Vector3,
    playerYaw: number,
    skeletons: Skeleton[],
    chests: Chest[]
  ): void {
    const ctx = this.ctx;
    const center = this.size / 2;
    const scale = 4.5; // pixels per world meter

    // Clear background
    ctx.clearRect(0, 0, this.size, this.size);

    // Save clip for circular radar frame
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, center - 4, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = '#0b0d12';
    ctx.fillRect(0, 0, this.size, this.size);

    // Draw Dungeon Grid
    const tileSizePx = DungeonMap.TILE_SIZE * scale;

    for (let r = 0; r < map.gridHeight; r++) {
      for (let c = 0; c < map.gridWidth; c++) {
        const worldX = c * DungeonMap.TILE_SIZE;
        const worldZ = r * DungeonMap.TILE_SIZE;

        const screenX = center + (worldX - playerPos.x) * scale;
        const screenY = center + (worldZ - playerPos.z) * scale;

        // Skip rendering if outside canvas bounds
        if (
          screenX + tileSizePx < 0 ||
          screenX > this.size ||
          screenY + tileSizePx < 0 ||
          screenY > this.size
        ) {
          continue;
        }

        const char = map.grid[r][c];
        if (char === 'W') {
          ctx.fillStyle = '#262a34';
          ctx.fillRect(screenX - tileSizePx / 2, screenY - tileSizePx / 2, tileSizePx, tileSizePx);
          ctx.strokeStyle = '#181a20';
          ctx.lineWidth = 1;
          ctx.strokeRect(screenX - tileSizePx / 2, screenY - tileSizePx / 2, tileSizePx, tileSizePx);
        } else {
          ctx.fillStyle = '#12151c';
          ctx.fillRect(screenX - tileSizePx / 2, screenY - tileSizePx / 2, tileSizePx, tileSizePx);
        }
      }
    }

    // Draw Exit Portal Marker (Cyan badge with word EXIT)
    if (map.exitPosition) {
      const screenX = center + (map.exitPosition.x - playerPos.x) * scale;
      const screenY = center + (map.exitPosition.z - playerPos.z) * scale;

      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(screenX - 16, screenY - 8, 32, 16);

      ctx.fillStyle = '#06131c';
      ctx.fillRect(screenX - 14, screenY - 6, 28, 12);

      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('EXIT', screenX, screenY);
    }

    // Draw Chests
    chests.forEach((chest) => {
      const screenX = center + (chest.transform.position.x - playerPos.x) * scale;
      const screenY = center + (chest.transform.position.z - playerPos.z) * scale;

      ctx.fillStyle = chest.isOpen ? '#718096' : '#ecc94b';
      ctx.fillRect(screenX - 4, screenY - 4, 8, 8);
    });

    // Draw Skeletons
    skeletons.forEach((skeleton) => {
      if (skeleton.state === 5 /* DEAD */) return;
      const screenX = center + (skeleton.transform.position.x - playerPos.x) * scale;
      const screenY = center + (skeleton.transform.position.z - playerPos.z) * scale;

      ctx.fillStyle = '#e53e3e';
      ctx.beginPath();
      ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Player Arrow in center
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(-playerYaw); // Map rotation

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore(); // Restore clip

    // Circular Border Rim
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(center, center, center - 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}
