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
  private canvasSize: number = 600;

  constructor(parent: HTMLElement) {
    this.parent = parent;
    
    this.modalOverlay = document.createElement('div');
    this.modalOverlay.className = 'hud-fullmap-modal hidden';

    const card = document.createElement('div');
    card.className = 'hud-fullmap-card';

    const header = document.createElement('div');
    header.className = 'hud-fullmap-header';
    header.textContent = 'DUNGEON MAP & TACTICAL OVERVIEW';

    // Canvas with High-DPI support
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvasSize * dpr;
    this.canvas.height = this.canvasSize * dpr;
    this.canvas.style.width = `${this.canvasSize}px`;
    this.canvas.style.height = `${this.canvasSize}px`;
    this.canvas.className = 'hud-fullmap-canvas';

    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.scale(dpr, dpr);

    const legend = document.createElement('div');
    legend.className = 'hud-fullmap-legend';
    legend.innerHTML = `
      <span><i style="background:#38bdf8"></i> Player</span>
      <span><i style="background:#00f0ff"></i> Exit Portal</span>
      <span><i style="background:#ecc94b"></i> Chest</span>
      <span><i style="background:#e53e3e"></i> Skeleton</span>
    `;

    const hint = document.createElement('div');
    hint.className = 'hud-fullmap-hint';
    hint.textContent = 'Press M to close map';

    card.appendChild(header);
    card.appendChild(this.canvas);
    card.appendChild(legend);
    card.appendChild(hint);

    this.modalOverlay.appendChild(card);
    this.parent.appendChild(this.modalOverlay);
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

    // Map Background (Dark parchment tone)
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, this.canvasSize, this.canvasSize);

    const padding = 30;
    const availableSize = this.canvasSize - padding * 2;
    const maxGridDim = Math.max(map.gridWidth, map.gridHeight);
    const tileSizePx = availableSize / maxGridDim;

    // 1. Draw Dungeon Corridors & Rooms
    for (let r = 0; r < map.gridHeight; r++) {
      for (let c = 0; c < map.gridWidth; c++) {
        const x = padding + c * tileSizePx;
        const y = padding + r * tileSizePx;
        const char = map.grid[r][c];

        if (char === 'W') {
          // Solid Wall
          ctx.fillStyle = '#1c2333';
          ctx.fillRect(x, y, tileSizePx, tileSizePx);

          // Wall bevel border
          ctx.strokeStyle = '#2d384e';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, tileSizePx, tileSizePx);
        } else {
          // Walkable Floor
          ctx.fillStyle = '#0f141e';
          ctx.fillRect(x, y, tileSizePx, tileSizePx);

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, tileSizePx, tileSizePx);
        }
      }
    }

    // 2. Draw Exit Portal (Prominent Cyan Badge with "EXIT" Text)
    if (map.exitPosition) {
      const exitC = Math.round(map.exitPosition.x / DungeonMap.TILE_SIZE);
      const exitR = Math.round(map.exitPosition.z / DungeonMap.TILE_SIZE);

      const x = padding + exitC * tileSizePx + tileSizePx / 2;
      const y = padding + exitR * tileSizePx + tileSizePx / 2;

      ctx.save();
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 15;

      // Outer Pulsing Circle
      ctx.fillStyle = 'rgba(0, 240, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(x, y, tileSizePx * 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Cyan Badge Box
      const badgeW = 42;
      const badgeH = 20;
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(x - badgeW / 2, y - badgeH / 2, badgeW, badgeH);

      ctx.fillStyle = '#06121e';
      ctx.fillRect(x - badgeW / 2 + 2, y - badgeH / 2 + 2, badgeW - 4, badgeH - 4);

      // Label Text "EXIT"
      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 11px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('EXIT', x, y);

      ctx.restore();
    }

    // 3. Draw Chest Icons
    chests.forEach((chest) => {
      const c = Math.round(chest.transform.position.x / DungeonMap.TILE_SIZE);
      const r = Math.round(chest.transform.position.z / DungeonMap.TILE_SIZE);

      const x = padding + c * tileSizePx + tileSizePx / 2;
      const y = padding + r * tileSizePx + tileSizePx / 2;

      ctx.save();
      if (!chest.isOpen) {
        ctx.shadowColor = '#ecc94b';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ecc94b';
      } else {
        ctx.fillStyle = '#4a5568';
      }
      ctx.fillRect(x - 5, y - 5, 10, 10);
      ctx.restore();
    });

    // 4. Draw Skeleton Enemy Markers
    skeletons.forEach((skeleton) => {
      if (skeleton.state === 5 /* DEAD */) return;
      const c = Math.round(skeleton.transform.position.x / DungeonMap.TILE_SIZE);
      const r = Math.round(skeleton.transform.position.z / DungeonMap.TILE_SIZE);

      const x = padding + c * tileSizePx + tileSizePx / 2;
      const y = padding + r * tileSizePx + tileSizePx / 2;

      ctx.save();
      ctx.shadowColor = '#e53e3e';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#e53e3e';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 5. Draw Player Position & Yaw Angle Arrow
    const playerC = playerPos.x / DungeonMap.TILE_SIZE;
    const playerR = playerPos.z / DungeonMap.TILE_SIZE;

    const px = padding + playerC * tileSizePx + tileSizePx / 2;
    const py = padding + playerR * tileSizePx + tileSizePx / 2;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-playerYaw);

    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 12;

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(8, 8);
    ctx.lineTo(0, 4);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
