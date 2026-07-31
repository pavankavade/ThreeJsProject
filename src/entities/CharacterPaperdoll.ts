import * as THREE from 'three';
import type { EquipmentSystem } from '../systems/EquipmentSystem';

export class CharacterPaperdoll {
  public group: THREE.Group;
  private equipment: EquipmentSystem;
  
  // Body Mesh References
  private headMesh!: THREE.Mesh;
  private torsoMesh!: THREE.Mesh;
  private leftArmMesh!: THREE.Mesh;
  private rightArmMesh!: THREE.Mesh;
  private leftLegMesh!: THREE.Mesh;
  private rightLegMesh!: THREE.Mesh;

  // Armor Mesh Layers
  private headArmorGroup: THREE.Group;
  private chestArmorGroup: THREE.Group;
  private legsArmorGroup: THREE.Group;
  private bootsArmorGroup: THREE.Group;
  private glovesArmorGroup: THREE.Group;
  private weaponGroup: THREE.Group;
  private shieldGroup: THREE.Group;

  private breathingTime: number = 0;

  constructor(equipment: EquipmentSystem) {
    this.equipment = equipment;
    this.group = new THREE.Group();

    this.headArmorGroup = new THREE.Group();
    this.chestArmorGroup = new THREE.Group();
    this.legsArmorGroup = new THREE.Group();
    this.bootsArmorGroup = new THREE.Group();
    this.glovesArmorGroup = new THREE.Group();
    this.weaponGroup = new THREE.Group();
    this.shieldGroup = new THREE.Group();

    this.buildBodyBase();
    this.attachArmorGroups();
    this.updateArmorVisuals();
  }

  private buildBodyBase(): void {
    // Humanoid skin material
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd2a679, roughness: 0.7 });

    // Head
    const headGeo = new THREE.SphereGeometry(0.18, 16, 14);
    this.headMesh = new THREE.Mesh(headGeo, skinMat);
    this.headMesh.position.set(0, 1.55, 0);
    this.group.add(this.headMesh);

    // Torso (Upper body)
    const torsoGeo = new THREE.CylinderGeometry(0.24, 0.2, 0.65, 12);
    this.torsoMesh = new THREE.Mesh(torsoGeo, skinMat);
    this.torsoMesh.position.set(0, 1.05, 0);
    this.group.add(this.torsoMesh);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.55, 10);
    this.leftArmMesh = new THREE.Mesh(armGeo, skinMat);
    this.leftArmMesh.position.set(-0.32, 1.05, 0);
    this.leftArmMesh.rotation.z = 0.15;
    this.group.add(this.leftArmMesh);

    this.rightArmMesh = new THREE.Mesh(armGeo, skinMat);
    this.rightArmMesh.position.set(0.32, 1.05, 0);
    this.rightArmMesh.rotation.z = -0.15;
    this.group.add(this.rightArmMesh);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.09, 0.075, 0.7, 10);
    this.leftLegMesh = new THREE.Mesh(legGeo, skinMat);
    this.leftLegMesh.position.set(-0.13, 0.38, 0);
    this.group.add(this.leftLegMesh);

    this.rightLegMesh = new THREE.Mesh(legGeo, skinMat);
    this.rightLegMesh.position.set(0.13, 0.38, 0);
    this.group.add(this.rightLegMesh);
  }

  private attachArmorGroups(): void {
    this.headMesh.add(this.headArmorGroup);
    this.torsoMesh.add(this.chestArmorGroup);
    this.leftLegMesh.add(this.legsArmorGroup);
    this.rightLegMesh.add(this.legsArmorGroup.clone());
    this.leftLegMesh.add(this.bootsArmorGroup);
    this.rightArmMesh.add(this.glovesArmorGroup);
    this.rightArmMesh.add(this.weaponGroup);
    this.leftArmMesh.add(this.shieldGroup);
  }

  public updateArmorVisuals(): void {
    this.buildHeadArmor();
    this.buildChestArmor();
    this.buildLegsArmor();
    this.buildBootsArmor();
    this.buildGlovesArmor();
    this.buildWeaponAndShield();
  }

  private buildHeadArmor(): void {
    this.headArmorGroup.clear();
    const item = this.equipment.headSlot;
    if (!item) return;

    if (item.name.includes('Helm') || item.name.includes('Iron') || item.name.includes('Steel')) {
      const helmMat = new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.85, roughness: 0.25 });
      const helmGeo = new THREE.CylinderGeometry(0.2, 0.21, 0.25, 14);
      const helm = new THREE.Mesh(helmGeo, helmMat);
      helm.position.set(0, 0.04, 0);
      this.headArmorGroup.add(helm);
    } else {
      // Adventurer Cloth Hood
      const clothMat = new THREE.MeshStandardMaterial({ color: 0x3d3126, roughness: 0.9 });
      const hoodGeo = new THREE.SphereGeometry(0.205, 14, 12);
      const hood = new THREE.Mesh(hoodGeo, clothMat);
      hood.position.set(0, 0.02, -0.01);
      this.headArmorGroup.add(hood);
    }
  }

  private buildChestArmor(): void {
    this.chestArmorGroup.clear();
    const item = this.equipment.chestSlot;
    if (!item) return;

    if (item.name.includes('Doublet') || item.name.includes('Leather')) {
      const leatherMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.6 });
      const tunicGeo = new THREE.CylinderGeometry(0.255, 0.22, 0.67, 12);
      const tunic = new THREE.Mesh(tunicGeo, leatherMat);
      this.chestArmorGroup.add(tunic);
    } else if (item.name.includes('Plate') || item.name.includes('Steel')) {
      const steelMat = new THREE.MeshStandardMaterial({ color: 0x9999aa, metalness: 0.9, roughness: 0.2 });
      const cuirassGeo = new THREE.BoxGeometry(0.5, 0.65, 0.3);
      const cuirass = new THREE.Mesh(cuirassGeo, steelMat);
      this.chestArmorGroup.add(cuirass);
    } else {
      // Default Adventurer Cloth Tunic
      const tunicMat = new THREE.MeshStandardMaterial({ color: 0x2b3846, roughness: 0.8 });
      const tunicGeo = new THREE.CylinderGeometry(0.25, 0.21, 0.66, 12);
      const tunic = new THREE.Mesh(tunicGeo, tunicMat);

      const beltMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.5 });
      const beltGeo = new THREE.CylinderGeometry(0.23, 0.23, 0.06, 12);
      const belt = new THREE.Mesh(beltGeo, beltMat);
      belt.position.set(0, -0.15, 0);

      this.chestArmorGroup.add(tunic, belt);
    }
  }

  private buildLegsArmor(): void {
    this.legsArmorGroup.clear();
    const item = this.equipment.legsSlot;
    if (!item) return;

    const clothMat = new THREE.MeshStandardMaterial({ color: 0x1f2430, roughness: 0.85 });
    const legWrapGeo = new THREE.CylinderGeometry(0.098, 0.082, 0.5, 10);
    const legWrap = new THREE.Mesh(legWrapGeo, clothMat);
    legWrap.position.set(0, 0.05, 0);
    this.legsArmorGroup.add(legWrap);
  }

  private buildBootsArmor(): void {
    this.bootsArmorGroup.clear();
    const item = this.equipment.bootsSlot;
    if (!item) return;

    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x3b2416, roughness: 0.7 });
    const bootGeo = new THREE.BoxGeometry(0.18, 0.2, 0.28);
    const boot = new THREE.Mesh(bootGeo, leatherMat);
    boot.position.set(0, -0.3, 0.04);
    this.bootsArmorGroup.add(boot);
  }

  private buildGlovesArmor(): void {
    this.glovesArmorGroup.clear();
    const item = this.equipment.glovesSlot;
    if (!item) return;

    const gloveMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.7 });
    const gloveGeo = new THREE.CylinderGeometry(0.075, 0.07, 0.25, 10);
    const glove = new THREE.Mesh(gloveGeo, gloveMat);
    glove.position.set(0, -0.15, 0);
    this.glovesArmorGroup.add(glove);
  }

  private buildWeaponAndShield(): void {
    this.weaponGroup.clear();
    this.shieldGroup.clear();

    // Weapon in right hand
    const weapon = this.equipment.weapon1;
    if (weapon) {
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 });
      const bladeGeo = new THREE.BoxGeometry(0.05, 0.7, 0.02);
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.set(0, -0.3, 0.2);
      blade.rotation.x = Math.PI / 4;
      this.weaponGroup.add(blade);
    }

    // Shield in left hand
    const shield = this.equipment.weapon2;
    if (shield) {
      const shieldMat = new THREE.MeshStandardMaterial({ color: 0x3d2514, roughness: 0.6 });
      const shieldGeo = new THREE.BoxGeometry(0.35, 0.45, 0.04);
      const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
      shieldMesh.position.set(0, -0.1, 0.15);
      this.shieldGroup.add(shieldMesh);
    }
  }

  public update(delta: number): void {
    this.breathingTime += delta * 2.0;
    const breath = Math.sin(this.breathingTime) * 0.015;
    this.torsoMesh.position.y = 1.05 + breath;
    this.headMesh.position.y = 1.55 + breath;
    this.leftArmMesh.position.y = 1.05 + breath;
    this.rightArmMesh.position.y = 1.05 + breath;

    // Rotate paperdoll model slowly for full 3D preview
    this.group.rotation.y += delta * 0.4;
  }
}
