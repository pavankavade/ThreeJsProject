import * as THREE from 'three';
import { ProceduralTextures } from '../utils/ProceduralTextures';

export interface MapSpawnPoint {
  x: number;
  z: number;
  type: 'PLAYER' | 'SKELETON' | 'CHEST' | 'EXIT';
}

export interface TorchLight {
  light: THREE.PointLight;
  flameMesh: THREE.Mesh;
  baseIntensity: number;
  flickerSpeed: number;
  timeOffset: number;
}

export class DungeonMap {
  public static readonly TILE_SIZE = 3;
  public static readonly WALL_HEIGHT = 6; // 6m high vaulted crypt ceilings

  public gridWidth: number = 0;
  public gridHeight: number = 0;
  public grid: string[][] = [];
  public spawnPoints: MapSpawnPoint[] = [];
  public exitPosition: THREE.Vector3 | null = null;
  private exitVortexMesh: THREE.Mesh | null = null;

  private scene: THREE.Scene;
  private wallInstancedMesh!: THREE.InstancedMesh;
  private floorInstancedMesh!: THREE.InstancedMesh;
  private ceilingInstancedMesh!: THREE.InstancedMesh;
  private torches: TorchLight[] = [];

  // Artistic Interconnected 2x2 Modular Crypt Layout (48m x 48m)
  // Features: Octagonal chamber cutouts, central crypt rotunda hub, 4-way interconnected corridors, alcove nooks!
  private defaultMapLayout = [
    "WWWWWWWWWWWWWWWW",
    "WWW.P....W.C.WWW",
    "WW.......W....WW",
    "W..W...W...W...W",
    "W......S.......W",
    "W..W...W...W...W",
    "WW...WW.WW...WWW",
    "W..............W",
    "W..............W",
    "WW...WW.WW...WWW",
    "W..W...W...W...W",
    "W..S.......S...W",
    "W..W...W...W...W",
    "WW....WW......WW",
    "WWW.C....W...XWWW",
    "WWWWWWWWWWWWWWWW"
  ];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.buildMapFromLayout(this.defaultMapLayout);
  }

  private buildMapFromLayout(layout: string[]): void {
    this.gridHeight = layout.length;
    this.gridWidth = layout[0].length;
    this.grid = [];

    let wallCount = 0;
    let floorCount = 0;

    for (let r = 0; r < this.gridHeight; r++) {
      const rowChars = layout[r].split('');
      this.grid.push(rowChars);

      for (let c = 0; c < this.gridWidth; c++) {
        const char = rowChars[c];
        const worldX = c * DungeonMap.TILE_SIZE;
        const worldZ = r * DungeonMap.TILE_SIZE;

        if (char === 'W') {
          wallCount++;
        } else {
          floorCount++;
          if (char === 'P') {
            this.spawnPoints.push({ x: worldX, z: worldZ, type: 'PLAYER' });
          } else if (char === 'S') {
            this.spawnPoints.push({ x: worldX, z: worldZ, type: 'SKELETON' });
          } else if (char === 'C') {
            this.spawnPoints.push({ x: worldX, z: worldZ, type: 'CHEST' });
          } else if (char === 'X') {
            this.exitPosition = new THREE.Vector3(worldX, 0.1, worldZ);
            this.spawnPoints.push({ x: worldX, z: worldZ, type: 'EXIT' });
          }
        }
      }
    }

    this.createInstancedMeshes(wallCount, floorCount);
    this.spawnWallTorches();
    this.spawnCeilingLights();
    this.spawnCryptProps();
    this.spawnCentralRotunda();
    this.spawnExitPortal();
  }

  private createInstancedMeshes(wallCount: number, floorCount: number): void {
    const wallGeo = new THREE.BoxGeometry(DungeonMap.TILE_SIZE, DungeonMap.WALL_HEIGHT, DungeonMap.TILE_SIZE);
    const wallTex = ProceduralTextures.createStoneWallTexture();
    wallTex.repeat.set(1, 1);
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.75,
      metalness: 0.15
    });

    const floorGeo = new THREE.PlaneGeometry(DungeonMap.TILE_SIZE, DungeonMap.TILE_SIZE);
    const floorTex = ProceduralTextures.createFloorTileTexture();
    floorTex.repeat.set(1, 1);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.55,
      metalness: 0.2
    });

    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0x222630,
      roughness: 0.8
    });

    this.wallInstancedMesh = new THREE.InstancedMesh(wallGeo, wallMat, wallCount);
    this.floorInstancedMesh = new THREE.InstancedMesh(floorGeo, floorMat, floorCount);
    this.ceilingInstancedMesh = new THREE.InstancedMesh(floorGeo, ceilingMat, floorCount);

    const dummy = new THREE.Object3D();
    let wallIndex = 0;
    let floorIndex = 0;

    for (let r = 0; r < this.gridHeight; r++) {
      for (let c = 0; c < this.gridWidth; c++) {
        const char = this.grid[r][c];
        const x = c * DungeonMap.TILE_SIZE;
        const z = r * DungeonMap.TILE_SIZE;

        if (char === 'W') {
          dummy.position.set(x, DungeonMap.WALL_HEIGHT / 2, z);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          this.wallInstancedMesh.setMatrixAt(wallIndex++, dummy.matrix);
        } else {
          // Floor
          dummy.position.set(x, 0, z);
          dummy.rotation.set(-Math.PI / 2, 0, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          this.floorInstancedMesh.setMatrixAt(floorIndex, dummy.matrix);

          // Vaulted Ceiling
          dummy.position.set(x, DungeonMap.WALL_HEIGHT, z);
          dummy.rotation.set(Math.PI / 2, 0, 0);
          dummy.updateMatrix();
          this.ceilingInstancedMesh.setMatrixAt(floorIndex, dummy.matrix);

          floorIndex++;
        }
      }
    }

    this.wallInstancedMesh.instanceMatrix.needsUpdate = true;
    this.floorInstancedMesh.instanceMatrix.needsUpdate = true;
    this.ceilingInstancedMesh.instanceMatrix.needsUpdate = true;

    this.scene.add(this.wallInstancedMesh);
    this.scene.add(this.floorInstancedMesh);
    this.scene.add(this.ceilingInstancedMesh);
  }

  private spawnCentralRotunda(): void {
    // Grand Central Crypt Rotunda Hub centered at (22.5m, 22.5m)
    const rotundaGroup = new THREE.Group();
    rotundaGroup.position.set(22.5, 0, 22.5);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x2b2f38, roughness: 0.75, metalness: 0.25 });
    const poolMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.7 });
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xddccaa, roughness: 0.65 });

    // Octagonal Basin Pedestal
    const basinBase = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.7, 0.4, 8), stoneMat);
    basinBase.position.set(0, 0.2, 0);

    // Glowing Ethereal Water Pool
    const poolMesh = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.1, 16), poolMat);
    poolMesh.position.set(0, 0.38, 0);

    // Central Pillar Obelisk
    const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 3.8, 8), stoneMat);
    obelisk.position.set(0, 2.1, 0);

    // Floating Skull Orbs
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), boneMat);
      skull.position.set(Math.cos(angle) * 1.5, 1.2, Math.sin(angle) * 1.5);
      rotundaGroup.add(skull);
    }

    rotundaGroup.add(basinBase, poolMesh, obelisk);
    this.scene.add(rotundaGroup);

    // Glowing Blue Ethereal Light
    const rotundaLight = new THREE.PointLight(0x00d9ff, 5.0, 22, 1.1);
    rotundaLight.position.set(22.5, 2.5, 22.5);
    this.scene.add(rotundaLight);
  }

  private spawnExitPortal(): void {
    if (!this.exitPosition) return;

    const portalGroup = new THREE.Group();
    portalGroup.position.copy(this.exitPosition);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x232730, roughness: 0.7, metalness: 0.3 });
    const vortexMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

    // Grand Archway Pillars
    const pillarGeo = new THREE.BoxGeometry(0.5, 4.2, 0.5);
    const pillarL = new THREE.Mesh(pillarGeo, stoneMat);
    pillarL.position.set(-1.4, 2.1, 0);
    const pillarR = new THREE.Mesh(pillarGeo, stoneMat);
    pillarR.position.set(1.4, 2.1, 0);

    const lintelGeo = new THREE.BoxGeometry(3.3, 0.5, 0.6);
    const lintel = new THREE.Mesh(lintelGeo, stoneMat);
    lintel.position.set(0, 4.2, 0);

    portalGroup.add(pillarL, pillarR, lintel);

    // Swirling Magical Vortex Disk
    const vortexGeo = new THREE.CircleGeometry(1.3, 24);
    this.exitVortexMesh = new THREE.Mesh(vortexGeo, vortexMat);
    this.exitVortexMesh.position.set(0, 2.1, 0);
    portalGroup.add(this.exitVortexMesh);

    // Glowing Exit Beacon Point Light
    const exitLight = new THREE.PointLight(0x00f0ff, 5.0, 18, 1.2);
    exitLight.position.set(0, 2.1, 0.2);
    portalGroup.add(exitLight);

    this.scene.add(portalGroup);
  }

  private spawnWallTorches(): void {
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x333338, metalness: 0.8, roughness: 0.3 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a2c11, roughness: 0.7 });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffbb22 });

    for (let r = 1; r < this.gridHeight - 1; r += 2) {
      for (let c = 1; c < this.gridWidth - 1; c += 2) {
        if (this.grid[r][c] !== 'W') {
          let torchPos: THREE.Vector3 | null = null;
          let normalRotY = 0;

          if (this.grid[r - 1][c] === 'W') {
            torchPos = new THREE.Vector3(c * DungeonMap.TILE_SIZE, 3.2, r * DungeonMap.TILE_SIZE - DungeonMap.TILE_SIZE / 2 + 0.15);
            normalRotY = 0;
          } else if (this.grid[r + 1][c] === 'W') {
            torchPos = new THREE.Vector3(c * DungeonMap.TILE_SIZE, 3.2, r * DungeonMap.TILE_SIZE + DungeonMap.TILE_SIZE / 2 - 0.15);
            normalRotY = Math.PI;
          } else if (this.grid[r][c - 1] === 'W') {
            torchPos = new THREE.Vector3(c * DungeonMap.TILE_SIZE - DungeonMap.TILE_SIZE / 2 + 0.15, 3.2, r * DungeonMap.TILE_SIZE);
            normalRotY = -Math.PI / 2;
          } else if (this.grid[r][c + 1] === 'W') {
            torchPos = new THREE.Vector3(c * DungeonMap.TILE_SIZE + DungeonMap.TILE_SIZE / 2 - 0.15, 3.2, r * DungeonMap.TILE_SIZE);
            normalRotY = Math.PI / 2;
          }

          if (torchPos) {
            const torchGroup = new THREE.Group();

            const mountPlate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.05), ironMat);
            const sconceArm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3), ironMat);
            sconceArm.rotation.x = Math.PI / 3;
            sconceArm.position.set(0, -0.05, 0.12);

            const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.45), woodMat);
            handle.position.set(0, 0.1, 0.22);

            const flameGeo = new THREE.ConeGeometry(0.1, 0.25, 6);
            const flameMesh = new THREE.Mesh(flameGeo, flameMat);
            flameMesh.position.set(0, 0.35, 0.22);
            flameMesh.rotation.x = Math.PI;

            torchGroup.add(mountPlate, sconceArm, handle, flameMesh);
            torchGroup.position.copy(torchPos);
            torchGroup.rotation.y = normalRotY;

            this.scene.add(torchGroup);

            const baseIntensity = 4.0;
            const torchLight = new THREE.PointLight(0xffaa33, baseIntensity, 16, 1.4);
            torchLight.position.set(torchPos.x, torchPos.y + 0.35, torchPos.z);
            this.scene.add(torchLight);

            this.torches.push({
              light: torchLight,
              flameMesh,
              baseIntensity,
              flickerSpeed: 10 + Math.random() * 10,
              timeOffset: Math.random() * 100
            });
          }
        }
      }
    }
  }

  private spawnCeilingLights(): void {
    const chainMat = new THREE.MeshStandardMaterial({ color: 0x222226, metalness: 0.8, roughness: 0.3 });
    const lanternMat = new THREE.MeshStandardMaterial({ color: 0x443322, metalness: 0.7, roughness: 0.4 });
    const crystalMat = new THREE.MeshBasicMaterial({ color: 0xffee99 });

    for (let r = 2; r < this.gridHeight - 2; r += 4) {
      for (let c = 2; c < this.gridWidth - 2; c += 4) {
        if (this.grid[r][c] !== 'W') {
          const x = c * DungeonMap.TILE_SIZE;
          const z = r * DungeonMap.TILE_SIZE;

          const lanternGroup = new THREE.Group();
          lanternGroup.position.set(x, DungeonMap.WALL_HEIGHT, z);

          const chainGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.4);
          const chain = new THREE.Mesh(chainGeo, chainMat);
          chain.position.set(0, -0.7, 0);
          lanternGroup.add(chain);

          const lanternGeo = new THREE.CylinderGeometry(0.22, 0.16, 0.4, 8);
          const lanternFrame = new THREE.Mesh(lanternGeo, lanternMat);
          lanternFrame.position.set(0, -1.6, 0);
          lanternGroup.add(lanternFrame);

          const crystalGeo = new THREE.OctahedronGeometry(0.12);
          const crystal = new THREE.Mesh(crystalGeo, crystalMat);
          crystal.position.set(0, -1.6, 0);
          lanternGroup.add(crystal);

          this.scene.add(lanternGroup);

          const ceilingLight = new THREE.PointLight(0xffe099, 4.5, 18, 1.2);
          ceilingLight.position.set(x, DungeonMap.WALL_HEIGHT - 1.6, z);
          this.scene.add(ceilingLight);
        }
      }
    }
  }

  private spawnCryptProps(): void {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x2e323b, roughness: 0.8, metalness: 0.2 });
    const lidMat = new THREE.MeshStandardMaterial({ color: 0x3d424e, roughness: 0.7, metalness: 0.25 });
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xddccaa, roughness: 0.65, metalness: 0.05 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x22242b, metalness: 0.85, roughness: 0.3 });

    for (let r = 1; r < this.gridHeight - 1; r++) {
      for (let c = 1; c < this.gridWidth - 1; c++) {
        if (this.grid[r][c] !== 'W') {
          const x = c * DungeonMap.TILE_SIZE;
          const z = r * DungeonMap.TILE_SIZE;

          // 1. Spawn Ancient Stone Sarcophagi along alcoves
          if (r % 3 === 0 && c % 3 === 0) {
            let alignRot = 0;
            let offset = new THREE.Vector3(0, 0, 0);
            let hasWall = false;

            if (this.grid[r - 1][c] === 'W') { alignRot = 0; offset.set(0, 0, -0.9); hasWall = true; }
            else if (this.grid[r + 1][c] === 'W') { alignRot = Math.PI; offset.set(0, 0, 0.9); hasWall = true; }
            else if (this.grid[r][c - 1] === 'W') { alignRot = Math.PI / 2; offset.set(-0.9, 0, 0); hasWall = true; }
            else if (this.grid[r][c + 1] === 'W') { alignRot = -Math.PI / 2; offset.set(0.9, 0, 0); hasWall = true; }

            if (hasWall) {
              const sarcGroup = new THREE.Group();
              sarcGroup.position.set(x + offset.x, 0, z + offset.z);
              sarcGroup.rotation.y = alignRot;

              const baseBox = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 1.7), stoneMat);
              baseBox.position.set(0, 0.275, 0);
              baseBox.castShadow = true;

              const lidBox = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.14, 1.8), lidMat);
              lidBox.position.set(0, 0.62, 0);
              lidBox.rotation.z = Math.random() > 0.5 ? 0.04 : 0;
              lidBox.castShadow = true;

              const crossMat = new THREE.MeshStandardMaterial({ color: 0x555b6a, metalness: 0.5, roughness: 0.5 });
              const vRelief = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.9), crossMat);
              vRelief.position.set(0, 0.70, 0);
              const hRelief = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.03, 0.08), crossMat);
              hRelief.position.set(0, 0.70, 0.2);

              sarcGroup.add(baseBox, lidBox, vRelief, hRelief);
              this.scene.add(sarcGroup);
            }
          }

          // 2. Spawn Catacomb Skulls & Ribcages in floor corners
          if ((r + c) % 5 === 0 && Math.random() > 0.3) {
            const boneGroup = new THREE.Group();
            boneGroup.position.set(x + (Math.random() - 0.5) * 1.2, 0, z + (Math.random() - 0.5) * 1.2);

            const skullHead = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), boneMat);
            skullHead.position.set(0, 0.09, 0);
            const skullJaw = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.07), boneMat);
            skullJaw.position.set(0, 0.04, 0.03);
            boneGroup.add(skullHead, skullJaw);

            for (let b = 0; b < 3; b++) {
              const boneMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), boneMat);
              boneMesh.position.set((Math.random() - 0.5) * 0.3, 0.02, (Math.random() - 0.5) * 0.3);
              boneMesh.rotation.set(Math.PI / 2, Math.random() * Math.PI, Math.random() * Math.PI);
              boneGroup.add(boneMesh);
            }

            this.scene.add(boneGroup);
          }

          // 3. Spawn Fluted Crypt Pillars at section centers & corners
          if (r % 4 === 0 && c % 4 === 0) {
            const pillarGroup = new THREE.Group();
            pillarGroup.position.set(x, 0, z);

            const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.7), stoneMat);
            basePlinth.position.set(0, 0.175, 0);

            const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, DungeonMap.WALL_HEIGHT - 0.7, 12), stoneMat);
            shaft.position.set(0, DungeonMap.WALL_HEIGHT / 2, 0);

            const capitalTop = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.7), stoneMat);
            capitalTop.position.set(0, DungeonMap.WALL_HEIGHT - 0.175, 0);

            pillarGroup.add(basePlinth, shaft, capitalTop);
            this.scene.add(pillarGroup);
          }

          // 4. Spawn Hanging Spiked Cages from Vaulted Ceiling
          if (r % 7 === 0 && c % 7 === 0) {
            const cageGroup = new THREE.Group();
            cageGroup.position.set(x, DungeonMap.WALL_HEIGHT, z);

            const chainMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.8, 6), ironMat);
            chainMesh.position.set(0, -0.9, 0);

            const cageBody = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.95, 8, 1, true), ironMat);
            cageBody.position.set(0, -2.2, 0);

            cageGroup.add(chainMesh, cageBody);
            this.scene.add(cageGroup);
          }
        }
      }
    }
  }

  public updateTorches(time: number): void {
    this.torches.forEach((t) => {
      const noise = Math.sin(time * t.flickerSpeed + t.timeOffset) * 0.35 + Math.cos(time * t.flickerSpeed * 2.1) * 0.18;
      t.light.intensity = t.baseIntensity + noise;
      t.flameMesh.scale.set(1 + noise * 0.2, 1 + noise * 0.3, 1 + noise * 0.2);
    });

    if (this.exitVortexMesh) {
      this.exitVortexMesh.rotation.z = time * 1.5;
    }
  }

  public isWallAtWorld(x: number, z: number, padding = 0.4): boolean {
    const minC = Math.floor((x - padding) / DungeonMap.TILE_SIZE);
    const maxC = Math.floor((x + padding) / DungeonMap.TILE_SIZE);
    const minR = Math.floor((z - padding) / DungeonMap.TILE_SIZE);
    const maxR = Math.floor((z + padding) / DungeonMap.TILE_SIZE);

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (r < 0 || r >= this.gridHeight || c < 0 || c >= this.gridWidth) {
          return true;
        }
        if (this.grid[r][c] === 'W') {
          return true;
        }
      }
    }
    return false;
  }
}
