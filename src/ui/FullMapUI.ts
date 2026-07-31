import * as THREE from 'three';
import { DungeonMap } from '../systems/DungeonMap';
import { Skeleton } from '../entities/Skeleton';
import { Chest } from '../entities/Chest';

export class FullMapUI {
  private parent: HTMLElement;
  private modalOverlay!: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public isOpen: boolean = false;
  private canvasSize: number = 560;

  constructor(parent: HTMLElement) {
    this.parent = parent;
    
    this.modalOverlay = document.createElement('div');
    this.modalOverlay.className = 'hud-fullmap-modal hidden';

    const card = document.createElement('div');
    card.className = 'hud-fullmap-card';

    const header = document.createElement('div');
    header.className = 'hud-fullmap-header';
    header.textContent = 'DUNGEON MAP';

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvasSize;
    this.canvas.height = this.canvasSize;
    this.canvas.className = 'hud-fullmap-canvas';

    const hint = document.createElement('div');
    hint.className = 'hud-fullmap-hint';
    hint.textContent = 'Press M to Close | 🌀 Reach EXIT to clear dungeon';

    card.appendChild(header);
    card.appendChild(this.canvas);
    card.appendChild(hint);

    this.modalOverlay.appendChild(card);
    this.parent.appendChild(this.modalOverlay);

    this.ctx = this.canvas.getContext('2d')!;
  }

  public toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.modalOverlay.classList.remove('hidden');
    } else {
      this.modalOverlay.classList.add('hidden');
    }
  }

  public render(
    map: DungeonMap,
    playerPos: THREE.Vector3,
    playerYaw: number,
    skeletons: Skeleton[],
    chests: Chest[]
  ): void {
    if (!this.isOpen) return;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvasSize, this.canvasSize);

    // Dark Map Background
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, this.canvasSize, this.canvasSize);

    const padding = 24;
    const availableSize = this.canvasSize - padding * 2;
    const maxGridDim = Math.max(map.gridWidth, map.gridHeight);
    const tileSizePx = availableSize / maxGridDim;

    ctx.shadowBlur = 0;

    // 1. Draw Walls & Floor Corridors
    for (let r = 0; r < map.gridHeight; r++) {
      for (let c = 0; c < map.gridWidth; c++) {
        const x = padding + c * tileSizePx;
        const y = padding + r * tileSizePx;
        const char = map.grid[r][c];

        if (char === 'W') {
          // Wall
          ctx.fillStyle = '#1e2636';
          ctx.fillRect(x, y, tileSizePx - 1, tileSizePx - 1);
        } else {
          // Floor / Corridor
          ctx.fillStyle = '#10141e';
          ctx.fillRect(x, y, tileSizePx - 1, tileSizePx - 1);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, tileSizePx - 1, tileSizePx - 1);
        }
      }
    }

    // 2. Draw Exit Portal (Prominent Glowing Cyan Box with word "EXIT")
    if (map.exitPosition) {
      const exitC = Math.round(map.exitPosition.x / DungeonMap.TILE_SIZE);
      const exitR = Math.round(map.exitPosition.z / DungeonMap.TILE_SIZE);

      const x = padding + exitC * tileSizePx;
      const y = padding + exitR * tileSizePx;

      ctx.save();
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;

      // Cyan Portal Background Box
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(x - 6, y - 4, tileSizePx + 12, tileSizePx + 8);

      ctx.fillStyle = '#06131c';
      ctx.fillRect(x - 4, y - 2, tileSizePx + 8, tileSizePx + 4);

      ctx.fillStyle = '#00f0ff';
      ctx.font = '900 13px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('EXIT', x + tileSizePx / 2, y + tileSizePx / 2);

      ctx.restore();
    }

    // 3. Draw Chest Icons (Gold)
    chests.forEach((chest) => {
      const c = Math.round(chest.transform.position.x / DungeonMap.TILE_SIZE);
      const r = Math.round(chest.transform.position.z / DungeonMap.TILE_SIZE);

      const x = padding + c * tileSizePx + tileSizePx / 2;
      const y = padding + r * tileSizePx + tileSizePx / 2;

      ctx.save();
      ctx.shadowColor = chest.isOpen ? '#718096' : '#ecc94b';
      ctx.shadowBlur = chest.isOpen ? 0 : 8;

      ctx.fillStyle = chest.isOpen ? '#4a5568' : '#ecc94b';
      ctx.fillRect(x - 6, y - 6, 12, 12);
      ctx.restore();
    });

    // 4. Draw Skeleton Enemy Markers (Red)
    skeletons.forEach((skeleton) => {
      if (skeleton.state === 5 /* DEAD */) return;
      const c = Math.round(skeleton.transform.position.x / DungeonMap.TILE_SIZE);
      const r = Math.round(skeleton.transform.position.z / DungeonMap.TILE_SIZE);

      const x = padding + c * tileSizePx + tileSizePx / 2;
      const y = padding + r * tileSizePx + tileSizePx / 2;

      ctx.save();
      ctx.shadowColor = '#e53e3e';
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#e53e3e';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 5. Draw Player Marker (Bright Cyan Arrow aligned with camera yaw)
    const playerC = playerPos.x / DungeonMap.TILE_SIZE;
    const playerR = playerPos.z / DungeonMap.TILE_SIZE;

    const px = padding + playerC * tileSizePx + tileSizePx / 2;
    const py = padding + playerR * tileSizePx + tileSizePx / 2;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-playerYaw);

    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(8, 8);
    ctx.lineTo(0, 4);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
