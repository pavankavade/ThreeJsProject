import * as THREE from 'three';

export class ProceduralTextures {
  public static createStoneWallTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base dark granite crypt mortar background
    ctx.fillStyle = '#0f1115';
    ctx.fillRect(0, 0, 512, 512);

    // Weathered Crypt Stone Blocks
    const rows = 14;
    const cols = 6;
    const brickH = 512 / rows;
    const brickW = 512 / cols;

    for (let r = 0; r < rows; r++) {
      const offsetX = (r % 2 === 0) ? 0 : brickW / 2;
      for (let c = -1; c <= cols; c++) {
        const x = c * brickW + offsetX;
        const y = r * brickH;

        // Aged crypt granite color variation
        const baseShade = 24 + Math.floor(Math.random() * 22);
        const rColor = baseShade + Math.floor(Math.random() * 6);
        const gColor = baseShade + 4 + Math.floor(Math.random() * 8);
        const bColor = baseShade + 10 + Math.floor(Math.random() * 10);
        ctx.fillStyle = `rgb(${rColor}, ${gColor}, ${bColor})`;
        ctx.fillRect(x + 3, y + 3, brickW - 6, brickH - 6);

        // Bevel highlight top & left edge
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.fillRect(x + 3, y + 3, brickW - 6, 2);
        ctx.fillRect(x + 3, y + 3, 2, brickH - 6);

        // Dark ambient occlusion shadow on bottom & right mortar seams
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(x + 3, y + brickH - 5, brickW - 6, 2);
        ctx.fillRect(x + brickW - 5, y + 3, 2, brickH - 6);

        // Stone grain & micro cracks
        for (let n = 0; n < 35; n++) {
          const nx = x + 3 + Math.random() * (brickW - 6);
          const ny = y + 3 + Math.random() * (brickH - 6);
          const noise = Math.floor(Math.random() * 40);
          ctx.fillStyle = `rgba(${noise}, ${noise + 6}, ${noise + 12}, 0.25)`;
          ctx.fillRect(nx, ny, 2, 2);
        }

        // Damp catacomb moss & lichen patches on bottom blocks
        if (r > 6 && Math.random() > 0.4) {
          ctx.fillStyle = 'rgba(18, 48, 25, 0.4)';
          ctx.beginPath();
          ctx.arc(x + 10 + Math.random() * (brickW - 20), y + brickH - 8, 6 + Math.random() * 10, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  public static createFloorTileTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Dark catacomb earth base
    ctx.fillStyle = '#0a0c10';
    ctx.fillRect(0, 0, 512, 512);

    const tileSize = 128;
    for (let x = 0; x < 512; x += tileSize) {
      for (let y = 0; y < 512; y += tileSize) {
        const alt = (x / tileSize + y / tileSize) % 2 === 0;
        ctx.fillStyle = alt ? '#14171f' : '#11131a';
        ctx.fillRect(x + 4, y + 4, tileSize - 8, tileSize - 8);

        // Flagstone inner border mortar
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 4, y + 4, tileSize - 8, tileSize - 8);

        // Ancient floor stone cracks & fractures
        if (Math.random() > 0.25) {
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x + 15, y + 15);
          ctx.lineTo(x + 45 + Math.random() * 40, y + 35 + Math.random() * 40);
          ctx.lineTo(x + 75 + Math.random() * 30, y + 85 + Math.random() * 20);
          ctx.stroke();
        }

        // Moisture stains & catacomb dampness
        if (Math.random() > 0.35) {
          ctx.fillStyle = 'rgba(15, 38, 22, 0.35)';
          ctx.beginPath();
          ctx.arc(x + 30 + Math.random() * 60, y + 30 + Math.random() * 60, 16 + Math.random() * 24, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  public static createWoodTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#3a220d';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#221306';
    ctx.lineWidth = 2;
    for (let i = 0; i < 256; i += 6) {
      ctx.beginPath();
      ctx.moveTo(0, i + (Math.random() * 4 - 2));
      ctx.bezierCurveTo(80, i + 10, 160, i - 10, 256, i + (Math.random() * 4 - 2));
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }
}
