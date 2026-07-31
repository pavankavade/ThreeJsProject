import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { EquipmentSystem } from '../systems/EquipmentSystem';

export class CharacterPaperdoll {
  public group: THREE.Group;
  private equipment: EquipmentSystem;

  private loadedModelGroup: THREE.Group | null = null;
  private mixer: THREE.AnimationMixer | null = null;

  // Equipment Attach Points (Found or attached to model bones)
  private headBone: THREE.Object3D | null = null;
  private chestBone: THREE.Object3D | null = null;
  private handRBone: THREE.Object3D | null = null;
  private handLBone: THREE.Object3D | null = null;

  // Armor Overlay Container Groups
  private headArmorGroup: THREE.Group;
  private chestArmorGroup: THREE.Group;
  private legsArmorGroup: THREE.Group;
  private bootsArmorGroup: THREE.Group;
  private glovesArmorGroup: THREE.Group;
  private weaponGroup: THREE.Group;
  private shieldGroup: THREE.Group;

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

    this.loadRiggedCharacterModel();
  }

  private loadRiggedCharacterModel(): void {
    const loader = new GLTFLoader();

    loader.load(
      '/models/knight.glb',
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(0.8, 0.8, 0.8);
        model.position.set(0, -0.65, 0);

        // Enhance materials for dark fantasy aesthetic
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            if (mesh.material) {
              (mesh.material as THREE.MeshStandardMaterial).roughness = 0.6;
            }
          }

          // Locate attach bones for gear
          const name = child.name.toLowerCase();
          if (name.includes('head') && !this.headBone) this.headBone = child;
          if ((name.includes('chest') || name.includes('spine') || name.includes('torso')) && !this.chestBone) this.chestBone = child;
          if ((name.includes('righthand') || name.includes('hand_r') || name.includes('mixamorigrighthand')) && !this.handRBone) this.handRBone = child;
          if ((name.includes('lefthand') || name.includes('hand_l') || name.includes('mixamoriglefthand')) && !this.handLBone) this.handLBone = child;
        });

        // Set up skeletal animation mixer if clips exist
        if (gltf.animations && gltf.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(model);
          // Play Idle animation clip (usually index 0 or 1)
          const idleClip = gltf.animations.find(a => a.name.toLowerCase().includes('idle')) || gltf.animations[0];
          const action = this.mixer.clipAction(idleClip);
          action.play();
        }

        this.loadedModelGroup = model;
        this.group.add(model);

        // Attach equipment overlays
        this.attachEquipmentToModel();
        this.updateArmorVisuals();
      },
      undefined,
      (err) => {
        console.warn('Could not load 3D character GLTF model, falling back to procedural paperdoll:', err);
        this.buildProceduralFallback();
      }
    );
  }

  private attachEquipmentToModel(): void {
    if (!this.loadedModelGroup) return;

    const parentHead = this.headBone || this.loadedModelGroup;
    const parentChest = this.chestBone || this.loadedModelGroup;
    const parentRightHand = this.handRBone || this.loadedModelGroup;
    const parentLeftHand = this.handLBone || this.loadedModelGroup;

    parentHead.add(this.headArmorGroup);
    parentChest.add(this.chestArmorGroup);
    parentChest.add(this.legsArmorGroup);
    parentChest.add(this.bootsArmorGroup);
    parentRightHand.add(this.glovesArmorGroup);
    parentRightHand.add(this.weaponGroup);
    parentLeftHand.add(this.shieldGroup);
  }

  private buildProceduralFallback(): void {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd6a374, roughness: 0.65 });

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 14), skinMat);
    head.position.set(0, 1.55, 0);

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.65, 12), skinMat);
    torso.position.set(0, 1.05, 0);

    this.group.add(head, torso);
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
      const helmMat = new THREE.MeshStandardMaterial({ color: 0x777788, metalness: 0.85, roughness: 0.25 });
      const brassMat = new THREE.MeshStandardMaterial({ color: 0xc8963e, metalness: 0.9, roughness: 0.3 });
      const visorGlowMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

      const domeGeo = new THREE.CylinderGeometry(0.19, 0.2, 0.24, 14);
      const dome = new THREE.Mesh(domeGeo, helmMat);
      dome.position.set(0, 0.04, 0);

      const rimGeo = new THREE.CylinderGeometry(0.21, 0.215, 0.03, 14);
      const rim = new THREE.Mesh(rimGeo, brassMat);
      rim.position.set(0, -0.05, 0);

      const visorSlit = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.015, 0.01), visorGlowMat);
      visorSlit.position.set(0, 0.04, 0.195);

      this.headArmorGroup.add(dome, rim, visorSlit);
    } else {
      const clothMat = new THREE.MeshStandardMaterial({ color: 0x3a2c20, roughness: 0.9 });
      const hoodGeo = new THREE.SphereGeometry(0.195, 14, 12);
      const hood = new THREE.Mesh(hoodGeo, clothMat);
      hood.position.set(0, 0.02, -0.01);
      this.headArmorGroup.add(hood);
    }
  }

  private buildChestArmor(): void {
    this.chestArmorGroup.clear();
    const item = this.equipment.chestSlot;
    if (!item) return;

    if (item.name.includes('Plate') || item.name.includes('Steel')) {
      const steelMat = new THREE.MeshStandardMaterial({ color: 0x9999aa, metalness: 0.9, roughness: 0.2 });
      const breastplateGeo = new THREE.BoxGeometry(0.46, 0.55, 0.26);
      const breastplate = new THREE.Mesh(breastplateGeo, steelMat);
      breastplate.position.set(0, 0.05, 0);
      this.chestArmorGroup.add(breastplate);
    } else {
      const tunicMat = new THREE.MeshStandardMaterial({ color: 0x243242, roughness: 0.8 });
      const tunicGeo = new THREE.CylinderGeometry(0.23, 0.19, 0.55, 12);
      const tunic = new THREE.Mesh(tunicGeo, tunicMat);
      tunic.position.set(0, 0.05, 0);
      this.chestArmorGroup.add(tunic);
    }
  }

  private buildLegsArmor(): void {
    this.legsArmorGroup.clear();
    const item = this.equipment.legsSlot;
    if (!item) return;

    const clothMat = new THREE.MeshStandardMaterial({ color: 0x1a212d, roughness: 0.85 });
    const skirtGeo = new THREE.CylinderGeometry(0.21, 0.23, 0.26, 12);
    const skirt = new THREE.Mesh(skirtGeo, clothMat);
    skirt.position.set(0, -0.15, 0);
    this.legsArmorGroup.add(skirt);
  }

  private buildBootsArmor(): void {
    this.bootsArmorGroup.clear();
    const item = this.equipment.bootsSlot;
    if (!item) return;

    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x382213, roughness: 0.7 });
    const bootGeo = new THREE.BoxGeometry(0.14, 0.2, 0.24);
    const boot = new THREE.Mesh(bootGeo, leatherMat);
    boot.position.set(0, -0.4, 0.04);
    this.bootsArmorGroup.add(boot);
  }

  private buildGlovesArmor(): void {
    this.glovesArmorGroup.clear();
    const item = this.equipment.glovesSlot;
    if (!item) return;

    const gloveMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.7 });
    const gloveGeo = new THREE.CylinderGeometry(0.065, 0.06, 0.18, 10);
    const glove = new THREE.Mesh(gloveGeo, gloveMat);
    glove.position.set(0, -0.06, 0);
    this.glovesArmorGroup.add(glove);
  }

  private buildWeaponAndShield(): void {
    this.weaponGroup.clear();
    this.shieldGroup.clear();

    // Weapon in Right Hand
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

      const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(bladeShape, { depth: 0.01 }), bladeMat);
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
      const shieldMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shieldShape, { depth: 0.03 }), woodMat);
      shieldMesh.position.set(0, 0, 0.08);
      shieldMesh.rotation.y = Math.PI / 2;

      this.shieldGroup.add(shieldMesh);
    }
  }

  public update(delta: number): void {
    if (this.mixer) {
      this.mixer.update(delta);
    }
  }
}
