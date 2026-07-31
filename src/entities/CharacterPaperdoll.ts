import * as THREE from 'three';
import type { EquipmentSystem } from '../systems/EquipmentSystem';

export class CharacterPaperdoll {
  public group: THREE.Group;
  private equipment: EquipmentSystem;

  // Skeletal Rigging Bones
  private rootBone!: THREE.Bone;
  private hipBone!: THREE.Bone;
  private spineBone!: THREE.Bone;
  private chestBone!: THREE.Bone;
  private headBone!: THREE.Bone;

  private shoulderLBone!: THREE.Bone;
  private armLBone!: THREE.Bone;
  private forearmLBone!: THREE.Bone;
  private handLBone!: THREE.Bone;

  private shoulderRBone!: THREE.Bone;
  private armRBone!: THREE.Bone;
  private forearmRBone!: THREE.Bone;
  private handRBone!: THREE.Bone;

  private thighLBone!: THREE.Bone;
  private shinLBone!: THREE.Bone;
  private footLBone!: THREE.Bone;

  private thighRBone!: THREE.Bone;
  private shinRBone!: THREE.Bone;
  private footRBone!: THREE.Bone;

  // Armor & Equipment Slot Container Groups (Attached to Bones)
  private headArmorGroup: THREE.Group;
  private chestArmorGroup: THREE.Group;
  private pauldronsGroup: THREE.Group;
  private legsArmorGroup: THREE.Group;
  private bootsArmorGroup: THREE.Group;
  private glovesArmorGroup: THREE.Group;
  private weaponGroup: THREE.Group;
  private shieldGroup: THREE.Group;

  private animationTime: number = 0;

  constructor(equipment: EquipmentSystem) {
    this.equipment = equipment;
    this.group = new THREE.Group();

    this.headArmorGroup = new THREE.Group();
    this.chestArmorGroup = new THREE.Group();
    this.pauldronsGroup = new THREE.Group();
    this.legsArmorGroup = new THREE.Group();
    this.bootsArmorGroup = new THREE.Group();
    this.glovesArmorGroup = new THREE.Group();
    this.weaponGroup = new THREE.Group();
    this.shieldGroup = new THREE.Group();

    this.initSkeletonRig();
    this.buildRiggedBodyMesh();
    this.attachArmorToBones();
    this.updateArmorVisuals();
  }

  /** Build humanoid bone hierarchy */
  private initSkeletonRig(): void {
    this.rootBone = new THREE.Bone();
    this.rootBone.position.set(0, 0, 0);

    this.hipBone = new THREE.Bone();
    this.hipBone.position.set(0, 0.9, 0);
    this.rootBone.add(this.hipBone);

    // Spine -> Chest -> Head
    this.spineBone = new THREE.Bone();
    this.spineBone.position.set(0, 0.25, 0);
    this.hipBone.add(this.spineBone);

    this.chestBone = new THREE.Bone();
    this.chestBone.position.set(0, 0.3, 0);
    this.spineBone.add(this.chestBone);

    this.headBone = new THREE.Bone();
    this.headBone.position.set(0, 0.3, 0);
    this.chestBone.add(this.headBone);

    // Left Arm (Shield Arm)
    this.shoulderLBone = new THREE.Bone();
    this.shoulderLBone.position.set(-0.24, 0.25, 0);
    this.chestBone.add(this.shoulderLBone);

    this.armLBone = new THREE.Bone();
    this.armLBone.position.set(-0.1, -0.05, 0);
    this.shoulderLBone.add(this.armLBone);

    this.forearmLBone = new THREE.Bone();
    this.forearmLBone.position.set(0, -0.28, 0);
    this.armLBone.add(this.forearmLBone);

    this.handLBone = new THREE.Bone();
    this.handLBone.position.set(0, -0.24, 0);
    this.forearmLBone.add(this.handLBone);

    // Right Arm (Weapon Arm)
    this.shoulderRBone = new THREE.Bone();
    this.shoulderRBone.position.set(0.24, 0.25, 0);
    this.chestBone.add(this.shoulderRBone);

    this.armRBone = new THREE.Bone();
    this.armRBone.position.set(0.1, -0.05, 0);
    this.shoulderRBone.add(this.armRBone);

    this.forearmRBone = new THREE.Bone();
    this.forearmRBone.position.set(0, -0.28, 0);
    this.armRBone.add(this.forearmRBone);

    this.handRBone = new THREE.Bone();
    this.handRBone.position.set(0, -0.24, 0);
    this.forearmRBone.add(this.handRBone);

    // Left Leg
    this.thighLBone = new THREE.Bone();
    this.thighLBone.position.set(-0.13, -0.05, 0);
    this.hipBone.add(this.thighLBone);

    this.shinLBone = new THREE.Bone();
    this.shinLBone.position.set(0, -0.4, 0);
    this.thighLBone.add(this.shinLBone);

    this.footLBone = new THREE.Bone();
    this.footLBone.position.set(0, -0.4, 0.05);
    this.shinLBone.add(this.footLBone);

    // Right Leg
    this.thighRBone = new THREE.Bone();
    this.thighRBone.position.set(0.13, -0.05, 0);
    this.hipBone.add(this.thighRBone);

    this.shinRBone = new THREE.Bone();
    this.shinRBone.position.set(0, -0.4, 0);
    this.thighRBone.add(this.shinRBone);

    this.footRBone = new THREE.Bone();
    this.footRBone.position.set(0, -0.4, 0.05);
    this.shinRBone.add(this.footRBone);

    // Set initial natural hero idle stance
    this.armLBone.rotation.z = 0.35;
    this.armLBone.rotation.x = 0.15;
    this.forearmLBone.rotation.x = -0.4; // Hand held forward holding shield

    this.armRBone.rotation.z = -0.35;
    this.armRBone.rotation.x = 0.1;
    this.forearmRBone.rotation.x = -0.3; // Hand holding falchion weapon

    this.thighLBone.rotation.z = 0.08;
    this.thighRBone.rotation.z = -0.08;

    this.group.add(this.rootBone);
  }

  /** Build stylized low-poly body geometry attached to bones */
  private buildRiggedBodyMesh(): void {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd6a374, roughness: 0.65 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x3a281c, roughness: 0.9 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111118 });

    // Head
    const headGeo = new THREE.SphereGeometry(0.16, 16, 14);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    this.headBone.add(headMesh);

    // Stylized Hair
    const hairGeo = new THREE.SphereGeometry(0.168, 12, 10);
    const hairMesh = new THREE.Mesh(hairGeo, hairMat);
    hairMesh.position.set(0, 0.03, -0.01);
    this.headBone.add(hairMesh);

    // Eyes & Face details
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.02, 0.01), eyeMat);
    eyeL.position.set(-0.055, 0.02, 0.15);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.02, 0.01), eyeMat);
    eyeR.position.set(0.055, 0.02, 0.15);
    this.headBone.add(eyeL, eyeR);

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.075, 0.085, 0.12, 10);
    const neckMesh = new THREE.Mesh(neckGeo, skinMat);
    neckMesh.position.set(0, -0.1, 0);
    this.headBone.add(neckMesh);

    // Torso Base Body
    const torsoGeo = new THREE.CylinderGeometry(0.23, 0.18, 0.55, 12);
    const torsoMesh = new THREE.Mesh(torsoGeo, skinMat);
    torsoMesh.position.set(0, -0.15, 0);
    this.chestBone.add(torsoMesh);

    // Upper Arms
    const upperArmGeo = new THREE.CylinderGeometry(0.068, 0.058, 0.28, 10);
    const armLMesh = new THREE.Mesh(upperArmGeo, skinMat);
    armLMesh.position.set(0, -0.14, 0);
    this.armLBone.add(armLMesh);

    const armRMesh = new THREE.Mesh(upperArmGeo, skinMat);
    armRMesh.position.set(0, -0.14, 0);
    this.armRBone.add(armRMesh);

    // Forearms
    const forearmGeo = new THREE.CylinderGeometry(0.058, 0.048, 0.24, 10);
    const forearmLMesh = new THREE.Mesh(forearmGeo, skinMat);
    forearmLMesh.position.set(0, -0.12, 0);
    this.forearmLBone.add(forearmLMesh);

    const forearmRMesh = new THREE.Mesh(forearmGeo, skinMat);
    forearmRMesh.position.set(0, -0.12, 0);
    this.forearmRBone.add(forearmRMesh);

    // Thighs
    const thighGeo = new THREE.CylinderGeometry(0.09, 0.072, 0.38, 10);
    const thighLMesh = new THREE.Mesh(thighGeo, skinMat);
    thighLMesh.position.set(0, -0.19, 0);
    this.thighLBone.add(thighLMesh);

    const thighRMesh = new THREE.Mesh(thighGeo, skinMat);
    thighRMesh.position.set(0, -0.19, 0);
    this.thighRBone.add(thighRMesh);

    // Shins
    const shinGeo = new THREE.CylinderGeometry(0.072, 0.058, 0.38, 10);
    const shinLMesh = new THREE.Mesh(shinGeo, skinMat);
    shinLMesh.position.set(0, -0.19, 0);
    this.shinLBone.add(shinLMesh);

    const shinRMesh = new THREE.Mesh(shinGeo, skinMat);
    shinRMesh.position.set(0, -0.19, 0);
    this.shinRBone.add(shinRMesh);
  }

  private attachArmorToBones(): void {
    this.headBone.add(this.headArmorGroup);
    this.chestBone.add(this.chestArmorGroup);
    this.chestBone.add(this.pauldronsGroup);
    this.hipBone.add(this.legsArmorGroup);
    this.shinLBone.add(this.bootsArmorGroup);
    this.shinRBone.add(this.bootsArmorGroup.clone());
    this.forearmLBone.add(this.glovesArmorGroup);
    this.forearmRBone.add(this.glovesArmorGroup.clone());
    this.handRBone.add(this.weaponGroup);
    this.handLBone.add(this.shieldGroup);
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
      // Iron Kettle Helm with glowing visor slit
      const helmMat = new THREE.MeshStandardMaterial({ color: 0x777788, metalness: 0.85, roughness: 0.25 });
      const brassMat = new THREE.MeshStandardMaterial({ color: 0xc8963e, metalness: 0.9, roughness: 0.3 });
      const visorGlowMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

      const domeGeo = new THREE.CylinderGeometry(0.18, 0.195, 0.24, 14);
      const dome = new THREE.Mesh(domeGeo, helmMat);
      dome.position.set(0, 0.04, 0);

      const rimGeo = new THREE.CylinderGeometry(0.205, 0.21, 0.03, 14);
      const rim = new THREE.Mesh(rimGeo, brassMat);
      rim.position.set(0, -0.05, 0);

      const noseGuard = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.02), brassMat);
      noseGuard.position.set(0, 0.02, 0.19);

      const visorSlit = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.015, 0.01), visorGlowMat);
      visorSlit.position.set(0, 0.04, 0.192);

      this.headArmorGroup.add(dome, rim, noseGuard, visorSlit);
    } else {
      // Adventurer Cloth Hood & Cowl
      const clothMat = new THREE.MeshStandardMaterial({ color: 0x3a2c20, roughness: 0.9 });
      const hoodGeo = new THREE.SphereGeometry(0.195, 14, 12);
      const hood = new THREE.Mesh(hoodGeo, clothMat);
      hood.position.set(0, 0.02, -0.01);

      const cowlGeo = new THREE.CylinderGeometry(0.21, 0.23, 0.12, 12);
      const cowl = new THREE.Mesh(cowlGeo, clothMat);
      cowl.position.set(0, -0.09, 0);

      this.headArmorGroup.add(hood, cowl);
    }
  }

  private buildChestArmor(): void {
    this.chestArmorGroup.clear();
    this.pauldronsGroup.clear();
    const item = this.equipment.chestSlot;
    if (!item) return;

    if (item.name.includes('Doublet') || item.name.includes('Leather')) {
      const leatherMat = new THREE.MeshStandardMaterial({ color: 0x5a381e, roughness: 0.6 });
      const tunicGeo = new THREE.CylinderGeometry(0.245, 0.20, 0.58, 12);
      const tunic = new THREE.Mesh(tunicGeo, leatherMat);
      tunic.position.set(0, -0.15, 0);
      this.chestArmorGroup.add(tunic);
    } else if (item.name.includes('Plate') || item.name.includes('Steel')) {
      const steelMat = new THREE.MeshStandardMaterial({ color: 0x9999aa, metalness: 0.9, roughness: 0.2 });
      const brassMat = new THREE.MeshStandardMaterial({ color: 0xc8963e, metalness: 0.9, roughness: 0.3 });

      const breastplateGeo = new THREE.BoxGeometry(0.48, 0.58, 0.28);
      const breastplate = new THREE.Mesh(breastplateGeo, steelMat);
      breastplate.position.set(0, -0.15, 0);

      // Steel Shoulder Pauldrons
      const pauldronGeo = new THREE.SphereGeometry(0.14, 10, 8);
      const pauldronL = new THREE.Mesh(pauldronGeo, steelMat);
      pauldronL.position.set(-0.28, 0.15, 0);
      const pauldronR = new THREE.Mesh(pauldronGeo, steelMat);
      pauldronR.position.set(0.28, 0.15, 0);
      this.pauldronsGroup.add(pauldronL, pauldronR);

      const emblem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 10), brassMat);
      emblem.rotation.x = Math.PI / 2;
      emblem.position.set(0, 0.02, 0.145);

      this.chestArmorGroup.add(breastplate, emblem);
    } else {
      // Default Adventurer Cloth Tunic
      const tunicMat = new THREE.MeshStandardMaterial({ color: 0x243242, roughness: 0.8 });
      const tunicGeo = new THREE.CylinderGeometry(0.24, 0.19, 0.58, 12);
      const tunic = new THREE.Mesh(tunicGeo, tunicMat);
      tunic.position.set(0, -0.15, 0);

      const beltMat = new THREE.MeshStandardMaterial({ color: 0x422a16, roughness: 0.5 });
      const beltGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.06, 12);
      const belt = new THREE.Mesh(beltGeo, beltMat);
      belt.position.set(0, -0.28, 0);

      const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.02), new THREE.MeshStandardMaterial({ color: 0xc8963e, metalness: 0.9 }));
      buckle.position.set(0, -0.28, 0.21);

      this.chestArmorGroup.add(tunic, belt, buckle);
    }
  }

  private buildLegsArmor(): void {
    this.legsArmorGroup.clear();
    const item = this.equipment.legsSlot;
    if (!item) return;

    const clothMat = new THREE.MeshStandardMaterial({ color: 0x1a212d, roughness: 0.85 });
    const skirtGeo = new THREE.CylinderGeometry(0.21, 0.24, 0.28, 12);
    const skirt = new THREE.Mesh(skirtGeo, clothMat);
    skirt.position.set(0, -0.1, 0);
    this.legsArmorGroup.add(skirt);
  }

  private buildBootsArmor(): void {
    this.bootsArmorGroup.clear();
    const item = this.equipment.bootsSlot;
    if (!item) return;

    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x382213, roughness: 0.7 });
    const bootGeo = new THREE.BoxGeometry(0.14, 0.22, 0.24);
    const boot = new THREE.Mesh(bootGeo, leatherMat);
    boot.position.set(0, -0.12, 0.04);
    this.bootsArmorGroup.add(boot);
  }

  private buildGlovesArmor(): void {
    this.glovesArmorGroup.clear();
    const item = this.equipment.glovesSlot;
    if (!item) return;

    const gloveMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.7 });
    const gloveGeo = new THREE.CylinderGeometry(0.065, 0.06, 0.2, 10);
    const glove = new THREE.Mesh(gloveGeo, gloveMat);
    glove.position.set(0, -0.08, 0);
    this.glovesArmorGroup.add(glove);
  }

  private buildWeaponAndShield(): void {
    this.weaponGroup.clear();
    this.shieldGroup.clear();

    // Falchion Curved Blade in Right Hand
    const weapon = this.equipment.weapon1;
    if (weapon) {
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0xddddee, metalness: 0.92, roughness: 0.2 });
      const guardMat = new THREE.MeshStandardMaterial({ color: 0x442211, roughness: 0.7 });

      const bladeShape = new THREE.Shape();
      bladeShape.moveTo(0, 0);
      bladeShape.lineTo(0.025, 0);
      bladeShape.lineTo(0.03, 0.55);
      bladeShape.lineTo(0, 0.6);
      bladeShape.lineTo(-0.035, 0.4);
      bladeShape.quadraticCurveTo(-0.03, 0.2, -0.025, 0);

      const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(bladeShape, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.002 }), bladeMat);
      blade.position.set(0, 0, 0);
      blade.rotation.x = -Math.PI / 2;

      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.04), guardMat);
      guard.position.set(0, 0, 0);

      this.weaponGroup.add(blade, guard);
    }

    // Heater Shield in Left Hand
    const shield = this.equipment.weapon2;
    if (shield) {
      const shieldShape = new THREE.Shape();
      const w = 0.18, h = 0.45;
      shieldShape.moveTo(-w, h * 0.5);
      shieldShape.lineTo(w, h * 0.5);
      shieldShape.quadraticCurveTo(w * 1.05, 0, 0, -h * 0.5);
      shieldShape.quadraticCurveTo(-w * 1.05, 0, -w, h * 0.5);

      const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2514, roughness: 0.65 });
      const rimMat = new THREE.MeshStandardMaterial({ color: 0xb8860b, metalness: 0.85 });

      const shieldMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shieldShape, { depth: 0.03 }), woodMat);
      shieldMesh.position.set(0, 0, 0.08);
      shieldMesh.rotation.y = Math.PI / 2;

      const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 12), rimMat);
      boss.rotation.z = Math.PI / 2;
      boss.position.set(0.04, 0, 0.08);

      this.shieldGroup.add(shieldMesh, boss);
    }
  }

  /** Animate skeletal idle breathing & slow rotation */
  public update(delta: number): void {
    this.animationTime += delta * 2.2;
    const breath = Math.sin(this.animationTime) * 0.012;
    const sway = Math.cos(this.animationTime * 0.5) * 0.02;

    // Bone idle motion
    this.chestBone.position.y = 0.3 + breath;
    this.headBone.position.y = 0.3 + breath * 0.5;
    this.spineBone.rotation.z = sway;

    // Arm idle sway
    this.armLBone.rotation.x = 0.15 + Math.sin(this.animationTime * 0.8) * 0.03;
    this.armRBone.rotation.x = 0.1 + Math.cos(this.animationTime * 0.8) * 0.03;

    // Slow rotation of entire model for 360° view
    this.group.rotation.y += delta * 0.45;
  }
}
