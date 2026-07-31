import * as THREE from 'three';
import { InputManager } from './Input';
import { EventBus } from './EventBus';
import { DungeonMap } from '../systems/DungeonMap';
import { CollisionSystem } from '../systems/CollisionSystem';
import type { CollisionTarget } from '../systems/CollisionSystem';
import { ParticleSystem } from '../systems/ParticleSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { Player } from '../entities/Player';
import { Skeleton } from '../entities/Skeleton';
import { Chest } from '../entities/Chest';
import { HUD } from '../ui/HUD';

export class Engine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  private input!: InputManager;
  public audio!: AudioSystem;
  private map!: DungeonMap;
  private collision!: CollisionSystem;
  private particles!: ParticleSystem;
  public hud!: HUD;

  private player!: Player;
  private skeletons: Skeleton[] = [];
  private chests: Chest[] = [];

  private isRunning: boolean = false;
  private isDungeonCleared: boolean = false;
  private targetedChest: Chest | null = null;
  private raycaster: THREE.Raycaster;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();

    this.initRenderer();
    this.initScene();
    this.initSystems();
    this.spawnWorldEntities();

    (window as any).gameEngine = this;
    (window as any).player = this.player;

    window.addEventListener('resize', () => this.onWindowResize());
  }

  private initRenderer(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.container.appendChild(this.renderer.domElement);
  }

  private initScene(): void {
    this.scene.background = new THREE.Color(0x1a1d26);
    this.scene.fog = new THREE.FogExp2(0x1a1d26, 0.03);

    const ambientLight = new THREE.AmbientLight(0x667799, 2.2);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x8899bb, 1.5);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);

    this.scene.add(this.camera);
  }

  private initSystems(): void {
    this.input = new InputManager(this.renderer.domElement);
    this.audio = new AudioSystem();
    this.map = new DungeonMap(this.scene);
    this.collision = new CollisionSystem(this.map);
    this.particles = new ParticleSystem(this.scene);
  }

  private spawnWorldEntities(): void {
    this.player = new Player(this.camera, this.input, this.collision);
    if (this.player.mesh) {
      this.scene.add(this.player.mesh);
    }
    this.hud = new HUD(this.player.equipment);

    // Link player stats to equipment UI for Tab menu display
    this.hud.equipUI.setPlayerStats(this.player);

    // Register particle and event handlers
    EventBus.on('ENEMY_HIT', (data: { position: THREE.Vector3 }) => {
      if (data && data.position) {
        this.particles.spawnSparks(data.position, 15, 0xee4422);
      }
    });

    EventBus.on('CHEST_OPENED', () => {
      if (this.targetedChest) {
        this.particles.spawnLootBurst(this.targetedChest.transform.position);
      }
    });

    EventBus.on('GAME_OVER', () => {
      this.input.exitPointerLock();
    });

    EventBus.on('GAME_START', () => {
      this.input.requestPointerLock();
      this.isRunning = true;
    });

    // Spawn entities based on DungeonMap layout
    this.map.spawnPoints.forEach((sp) => {
      if (sp.type === 'PLAYER') {
        this.player.transform.position.set(sp.x, 1.6, sp.z);
      } else if (sp.type === 'SKELETON') {
        const skeleton = new Skeleton(sp.x, sp.z);
        this.scene.add(skeleton.mesh!);
        this.skeletons.push(skeleton);
      } else if (sp.type === 'CHEST') {
        const chest = new Chest(sp.x, sp.z);
        this.scene.add(chest.mesh!);
        this.chests.push(chest);
      }
    });

    if (this.map.spawnPoints.filter(s => s.type === 'PLAYER').length === 0) {
      this.player.transform.position.set(3, 1.6, 3);
    }
  }

  public start(): void {
    this.clock.start();
    this.animate();
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const delta = Math.min(0.05, this.clock.getDelta());
    const elapsedTime = this.clock.getElapsedTime();

    if (this.isRunning) {
      this.updateGame(delta, elapsedTime);
    }

    this.renderer.render(this.scene, this.camera);
    this.input.resetFrameDeltas();
  };

  private updateGame(delta: number, elapsedTime: number): void {
    // Slot Selection (Keys 1, 2, 3, 4)
    if (this.input.slotKey1Pressed) this.player.equipment.selectSlot(1);
    if (this.input.slotKey2Pressed) this.player.equipment.selectSlot(2);
    if (this.input.slotKey3Pressed) this.player.equipment.selectSlot(3);
    if (this.input.slotKey4Pressed) this.player.equipment.selectSlot(4);

    // Handle Full Map Toggle (KeyM)
    if (this.input.mapToggleRequested) {
      this.hud.fullMapUI.toggle();
      if (this.hud.fullMapUI.isOpen) {
        this.input.exitPointerLock();
      } else {
        this.input.requestPointerLock();
      }
    }

    // Handle Inventory Toggle (Tab Key)
    if (this.input.inventoryToggleRequested) {
      this.hud.equipUI.toggle();
      if (this.hud.equipUI.isOpen) {
        this.input.exitPointerLock();
      } else {
        this.input.requestPointerLock();
      }
    }

    // Update Action Progress Bar when drinking potion / bandaging
    if (this.player.isUsingConsumable) {
      this.hud.equipUI.showProgress(this.player.consumableProgress / 1.4);
    } else {
      this.hud.equipUI.showProgress(0);
    }

    // Pause player movement & combat updates while Full Map, Equipment Modal, Victory, or Death is active!
    const isUIModalOpen =
      this.hud.fullMapUI.isOpen ||
      this.hud.equipUI.isOpen ||
      this.isDungeonCleared ||
      this.player.health.isDead;

    if (!isUIModalOpen) {
      const enemyTargets: CollisionTarget[] = this.skeletons
        .filter((s) => s.state !== 5 /* SkeletonAIState.DEAD */)
        .map((s) => ({
          id: s.id,
          position: s.transform.position,
          radius: s.collider.radius,
          takeDamage: (amt) => s.takeDamage(amt)
        }));

      this.player.updatePlayer(delta, enemyTargets);

      this.skeletons.forEach((skeleton) => {
        skeleton.updateAI(delta, this.player.transform.position, this.collision, (dmg) => {
          this.player.damagePlayer(dmg);
        });
      });

      this.updateChestInteraction();

      if (this.map.exitPosition && !this.isDungeonCleared) {
        const distToExit = this.player.transform.position.distanceTo(this.map.exitPosition);
        if (distToExit < 2.0) {
          this.isDungeonCleared = true;
          this.input.exitPointerLock();
          EventBus.emit('DUNGEON_CLEARED');
        }
      }
    }

    this.chests.forEach((c) => c.update(delta));

    this.particles.update(delta);
    this.map.updateTorches(elapsedTime);

    this.hud.minimap.render(
      this.map,
      this.player.transform.position,
      this.player.transform.rotation.y,
      this.skeletons,
      this.chests
    );

    if (this.hud.fullMapUI.isOpen) {
      this.hud.fullMapUI.render(
        this.map,
        this.player.transform.position,
        this.player.transform.rotation.y,
        this.skeletons,
        this.chests
      );
    }
  }

  private updateChestInteraction(): void {
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    this.raycaster.set(this.player.transform.position, camDir);

    const chestMeshes = this.chests.filter((c) => !c.isOpen).map((c) => c.mesh!);
    const intersects = this.raycaster.intersectObjects(chestMeshes, true);

    if (intersects.length > 0 && intersects[0].distance < 3.0) {
      let hitMesh: THREE.Object3D | null = intersects[0].object;
      while (hitMesh && !(hitMesh.parent instanceof THREE.Scene)) {
        if (hitMesh.userData.entityRef) break;
        hitMesh = hitMesh.parent;
      }

      const chest = this.chests.find((c) => c.mesh === hitMesh || c.mesh === intersects[0].object.parent?.parent);

      if (chest && !chest.isOpen) {
        if (this.targetedChest !== chest) {
          this.targetedChest = chest;
          EventBus.emit('CHEST_TARGETED', true);
        }

        if (this.input.interactRequested) {
          chest.open();
          EventBus.emit('CHEST_TARGETED', false);
          this.targetedChest = null;
        }
        return;
      }
    }

    if (this.targetedChest) {
      this.targetedChest = null;
      EventBus.emit('CHEST_TARGETED', false);
    }
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
