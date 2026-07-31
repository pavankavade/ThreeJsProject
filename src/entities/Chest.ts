import * as THREE from 'three';
import { Entity } from './Entity';
import { EventBus } from '../core/EventBus';
import { ProceduralTextures } from '../utils/ProceduralTextures';

export interface LootItem {
  name: string;
  type: 'HEALTH' | 'WEAPON' | 'GOLD' | 'BUFF';
  description: string;
  value: number;
}

export class Chest extends Entity {
  public isOpen: boolean = false;
  private lidMesh!: THREE.Mesh;
  private glowLight!: THREE.PointLight;
  private targetLidRotation: number = 0;
  private currentLidRotation: number = 0;

  private lootPool: LootItem[] = [
    { name: "Paladin's Gold Sword", type: 'WEAPON', description: "Enchanted Golden Blade (+45 ATK)", value: 45 },
    { name: "Flame Broadsword", type: 'WEAPON', description: "Fiery Crimson Blade (+55 ATK)", value: 55 },
    { name: "Elven Mithril Blade", type: 'WEAPON', description: "Lightweight Glowing Sword (+35 ATK)", value: 35 },
    { name: "Shadow Dagger", type: 'WEAPON', description: "Dark Obsidian Dagger (+30 ATK)", value: 30 },
    { name: "Health Elixir", type: 'HEALTH', description: "Restores 50 HP", value: 50 },
    { name: "Greater Healing Potion", type: 'HEALTH', description: "Restores Full HP (100 HP)", value: 100 },
    { name: "Chest of Gold", type: 'GOLD', description: "Acquired +150 Gold Coins!", value: 150 },
    { name: "Ring of Endurance", type: 'BUFF', description: "Increases Max Stamina by +20", value: 20 }
  ];

  constructor(x: number, z: number) {
    super('Chest');
    this.transform.position.set(x, 0.4, z);
    this.createChestMesh();
  }

  private createChestMesh(): void {
    const chestGroup = new THREE.Group();
    const woodTex = ProceduralTextures.createWoodTexture();
    const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.6 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x333338, metalness: 0.8, roughness: 0.3 });

    // Base Box
    const baseGeo = new THREE.BoxGeometry(1.0, 0.6, 0.7);
    const baseMesh = new THREE.Mesh(baseGeo, woodMat);
    baseMesh.position.set(0, 0, 0);
    chestGroup.add(baseMesh);

    // Metal Trim Straps
    const bandGeo = new THREE.BoxGeometry(1.02, 0.62, 0.1);
    const band1 = new THREE.Mesh(bandGeo, metalMat);
    band1.position.set(0, 0, -0.25);
    const band2 = new THREE.Mesh(bandGeo, metalMat);
    band2.position.set(0, 0, 0.25);
    chestGroup.add(band1);
    chestGroup.add(band2);

    // Lid Pivot Group (Pivot at back edge of chest)
    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 0.3, -0.35);

    const lidGeo = new THREE.BoxGeometry(1.0, 0.25, 0.7);
    this.lidMesh = new THREE.Mesh(lidGeo, woodMat);
    this.lidMesh.position.set(0, 0.125, 0.35); // Offset so pivot is at rear
    lidPivot.add(this.lidMesh);

    // Lock latch
    const lockGeo = new THREE.BoxGeometry(0.12, 0.15, 0.08);
    const lockMesh = new THREE.Mesh(lockGeo, metalMat);
    lockMesh.position.set(0, 0.05, 0.72);
    lidPivot.add(lockMesh);

    chestGroup.add(lidPivot);
    this.lidMesh = lidPivot as any; // Animate lidPivot rotation

    // Internal golden glow light
    this.glowLight = new THREE.PointLight(0xffaa11, 0, 4);
    this.glowLight.position.set(0, 0.4, 0);
    chestGroup.add(this.glowLight);

    chestGroup.position.copy(this.transform.position);
    this.mesh = chestGroup;
  }

  public open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.targetLidRotation = -Math.PI * 0.45; // Open lid back 80 degrees
    this.glowLight.intensity = 2.5;

    // Pick random loot item
    const loot = this.lootPool[Math.floor(Math.random() * this.lootPool.length)];

    EventBus.emit('CHEST_OPENED');
    EventBus.emit('LOOT_ACQUIRED', loot);
  }

  public override update(delta: number): void {
    super.update(delta);

    // Animate Lid opening smoothly
    if (this.currentLidRotation !== this.targetLidRotation) {
      this.currentLidRotation = THREE.MathUtils.lerp(this.currentLidRotation, this.targetLidRotation, delta * 6);
      this.lidMesh.rotation.x = this.currentLidRotation;
    }
  }
}
