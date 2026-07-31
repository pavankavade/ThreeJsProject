import * as THREE from 'three';

export class ProceduralTextures {
  public static createStoneWallTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base dark granite background
    ctx.fillStyle = '#1c1e24';
    ctx.fillRect(0, 0, 512, 512);

    // Brick / Stone Block grid
    const rows = 12;
    const cols = 6;
    const brickH = 512 / rows;
    const brickW = 512 / cols;

    for (let r = 0; r < rows; r++) {
      const offsetX = (r % 2 === 0) ? 0 : brickW / 2;
      for (let c = -1; c <= cols; c++) {
        const x = c * brickW + offsetX;
        const y = r * brickH;

        // Block color variation (slate, charcoal, dark moss)
        const baseShade = 35 + Math.floor(Math.random() * 25);
        ctx.fillStyle = `rgb(${baseShade}, ${baseShade + 5}, ${baseShade + 12})`;
        ctx.fillRect(x + 3, y + 3, brickW - 6, brickH - 6);

        // Bevel highlight top & left edge
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(x + 3, y + 3, brickW - 6, 2);
        ctx.fillRect(x + 3, y + 3, 2, brickH - 6);

        // Shadow bottom & right edge
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(x + 3, y + brickH - 5, brickW - 6, 2);
        ctx.fillRect(x + brickW - 5, y + 3, 2, brickH - 6);

        // Texture noise / stone pitting
        for (let n = 0; n < 30; n++) {
          const nx = x + 3 + Math.random() * (brickW - 6);
          const ny = y + 3 + Math.random() * (brickH - 6);
          const noise = Math.floor(Math.random() * 50);
          ctx.fillStyle = `rgba(${noise}, ${noise + 10}, ${noise + 20}, 0.2)`;
          ctx.fillRect(nx, ny, 2, 2);
        }

        // Moss green patches at bottom bricks
        if (r > 8 && Math.random() > 0.5) {
          ctx.fillStyle = 'rgba(25, 55, 30, 0.35)';
          ctx.fillRect(x + 3, y + brickH - 12, brickW - 6, 9);
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

    ctx.fillStyle = '#121418';
    ctx.fillRect(0, 0, 512, 512);

    const tileSize = 128;
    for (let x = 0; x < 512; x += tileSize) {
      for (let y = 0; y < 512; y += tileSize) {
        ctx.fillStyle = (x / tileSize + y / tileSize) % 2 === 0 ? '#1a1d24' : '#15171e';
        ctx.fillRect(x + 4, y + 4, tileSize - 8, tileSize - 8);

        // Flagstone inner border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 4, y + 4, tileSize - 8, tileSize - 8);

        // Cracks & weathering
        if (Math.random() > 0.3) {
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + 20, y + 20);
          ctx.lineTo(x + 50 + Math.random() * 30, y + 40 + Math.random() * 30);
          ctx.stroke();
        }

        // Moss / puddle stains
        if (Math.random() > 0.4) {
          ctx.fillStyle = 'rgba(20, 45, 25, 0.3)';
          ctx.beginPath();
          ctx.arc(x + 40 + Math.random() * 40, y + 40 + Math.random() * 40, 18 + Math.random() * 20, 0, Math.PI * 2);
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

    ctx.fillStyle = '#4a2c11';
    ctx.fillRect(0, 0, 256, 256);

    // Wood grain lines
    ctx.strokeStyle = '#321b07';
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
