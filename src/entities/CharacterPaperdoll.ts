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

  // Arm & Forearm Bones for Ready Combat Stance Posing
  private rightArmBone: THREE.Object3D | null = null;
  private rightForeArmBone: THREE.Object3D | null = null;
  private leftArmBone: THREE.Object3D | null = null;
  private leftForeArmBone: THREE.Object3D | null = null;

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

  private actions: Map<string, THREE.AnimationAction> = new Map();
  private currentActionName: string = '';

  private loadRiggedCharacterModel(): void {
    const loader = new GLTFLoader();

    loader.load(
      '/models/character.glb',
      (gltf) => {
        const model = gltf.scene;

        console.log('[CharacterPaperdoll] Character mannequin model loaded. Animations:', gltf.animations.map(a => a.name));

        // Compute exact bounding box of the loaded model to fit & center cleanly
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        // Target height of 1.65 units
        const targetHeight = 1.65;
        const maxDim = Math.max(size.x, size.y, size.z);
        const scaleFactor = targetHeight / (size.y > 0 ? size.y : (maxDim > 0 ? maxDim : 1));

        model.scale.set(scaleFactor, scaleFactor, scaleFactor);
        model.rotation.y = Math.PI;

        model.position.x = -center.x * scaleFactor;
        model.position.y = -center.y * scaleFactor - 0.08; // Align mannequin perfectly centered from head to boots
        model.position.z = -center.z * scaleFactor;

        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.frustumCulled = false;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            if (mesh.material) {
              const mat = mesh.material as THREE.MeshStandardMaterial;
              mat.roughness = 0.5;
              mat.metalness = 0.2;
              mat.side = THREE.DoubleSide;
            }
          }

          // Locate attach bones for gear (strictly match hand wrist bones, excluding fingers)
          const name = child.name.toLowerCase();
          if ((name.includes('head') || name.endsWith('head')) && !this.headBone) this.headBone = child;
          if ((name.includes('chest') || name.includes('spine') || name.includes('torso')) && !this.chestBone) this.chestBone = child;

          if (name === 'mixamorig:rightarm' || name.endsWith('rightarm')) this.rightArmBone = child;
          if (name === 'mixamorig:rightforearm' || name.endsWith('rightforearm')) this.rightForeArmBone = child;
          if (name === 'mixamorig:leftarm' || name.endsWith('leftarm')) this.leftArmBone = child;
          if (name === 'mixamorig:leftforearm' || name.endsWith('leftforearm')) this.leftForeArmBone = child;

          if (!this.handRBone && (name === 'mixamorig:righthand' || name.endsWith('righthand') || name.endsWith('hand_r') || name.endsWith('hand.r')) && !name.includes('pinky') && !name.includes('thumb') && !name.includes('index') && !name.includes('middle') && !name.includes('ring')) {
            this.handRBone = child;
            console.log('[CharacterPaperdoll] Matched Right Hand Bone:', child.name);
          }

          if (!this.handLBone && (name === 'mixamorig:lefthand' || name.endsWith('lefthand') || name.endsWith('hand_l') || name.endsWith('hand.l')) && !name.includes('pinky') && !name.includes('thumb') && !name.includes('index') && !name.includes('middle') && !name.includes('ring')) {
            this.handLBone = child;
            console.log('[CharacterPaperdoll] Matched Left Hand Bone:', child.name);
          }
        });

        // Set up skeletal animation mixer & store action clips
        if (gltf.animations && gltf.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(model);
          gltf.animations.forEach(clip => {
            const action = this.mixer!.clipAction(clip);
            this.actions.set(clip.name.toLowerCase(), action);
          });

          // Play default idle animation
          this.playAnimation('idle');
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

  public playAnimation(name: string): void {
    if (!this.mixer || this.actions.size === 0) return;
    const targetKey = name.toLowerCase();
    if (this.currentActionName === targetKey) return;

    // Find matching action clip (or fallback clip)
    let targetAction = this.actions.get(targetKey);
    if (!targetAction) {
      // Find clip containing key string (e.g. 'walk', 'run', 'idle')
      for (const [k, act] of this.actions.entries()) {
        if (k.includes(targetKey)) {
          targetAction = act;
          break;
        }
      }
    }

    if (!targetAction) {
      targetAction = Array.from(this.actions.values())[0];
    }

    if (this.currentActionName && this.actions.has(this.currentActionName)) {
      const prevAction = this.actions.get(this.currentActionName)!;
      prevAction.fadeOut(0.2);
    }

    targetAction.reset().fadeIn(0.2).play();
    this.currentActionName = targetKey;
  }

  private attachEquipmentToModel(): void {
    if (!this.loadedModelGroup) return;

    const parentHead = this.headBone || this.loadedModelGroup;
    const parentChest = this.chestBone || this.loadedModelGroup;
    const parentRightHand = this.handRBone || this.loadedModelGroup;

    parentHead.add(this.headArmorGroup);
    parentChest.add(this.chestArmorGroup);
    parentChest.add(this.legsArmorGroup);
    parentChest.add(this.bootsArmorGroup);
    parentRightHand.add(this.glovesArmorGroup);

    // Attach weapon & shield directly to main group so world position tracking is 100% accurate
    this.group.add(this.weaponGroup);
    this.group.add(this.shieldGroup);
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
    if (this.loadedModelGroup) {
      // Clean 3D GLTF Knight model - do not spawn geometric block primitives over the body
      this.headArmorGroup.clear();
      this.chestArmorGroup.clear();
      this.legsArmorGroup.clear();
      this.bootsArmorGroup.clear();
      this.glovesArmorGroup.clear();
      this.buildWeaponAndShield();
      return;
    }

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

    // Weapon in Right Hand (3D Falchion)
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

      const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(bladeShape, { depth: 0.012 }), bladeMat);
      blade.position.set(0, 0.02, -0.006);

      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.035, 0.045), guardMat);
      guard.position.set(0, 0.01, 0);

      const handleMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.9 });
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.18, 8), handleMat);
      handle.position.set(0, -0.1, 0);

      const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), guardMat);
      pommel.position.set(0, -0.2, 0);

      this.weaponGroup.add(blade, guard, handle, pommel);
      this.weaponGroup.scale.set(0.65, 0.65, 0.65);
    }

    // Heater Shield in Left Hand
    const shield = this.equipment.weapon2;
    if (shield) {
      const shieldShape = new THREE.Shape();
      const w = 0.2, h = 0.52;
      shieldShape.moveTo(-w, h * 0.5);
      shieldShape.lineTo(w, h * 0.5);
      shieldShape.quadraticCurveTo(w * 1.05, 0, 0, -h * 0.5);
      shieldShape.quadraticCurveTo(-w * 1.05, 0, -w, h * 0.5);

      const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2514, roughness: 0.65 });
      const rimMat = new THREE.MeshStandardMaterial({ color: 0xb8860b, metalness: 0.85, roughness: 0.25 });
      const bossMat = new THREE.MeshStandardMaterial({ color: 0xd4a846, metalness: 0.9, roughness: 0.2 });

      const shieldMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shieldShape, { depth: 0.03 }), woodMat);
      
      const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(shieldShape, { depth: 0.035 }), rimMat);
      rim.scale.set(1.05, 1.05, 1.0);
      rim.position.set(0, 0, -0.002);

      const bossGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16);
      const boss = new THREE.Mesh(bossGeo, bossMat);
      boss.rotation.x = Math.PI / 2;
      boss.position.set(0, 0.05, 0.04);

      this.shieldGroup.add(shieldMesh, rim, boss);
      this.shieldGroup.scale.set(0.6, 0.6, 0.6);
    }
  }

  public update(delta: number): void {
    if (this.mixer) {
      this.mixer.update(delta);
    }

    // Override arm bone rotations AFTER mixer update so arms hold sword & shield raised matching 1st person stance
    if (this.rightArmBone) {
      this.rightArmBone.rotation.set(-1.2, 0.4, 0.5, 'YXZ');
    }
    if (this.rightForeArmBone) {
      this.rightForeArmBone.rotation.set(0, 0.9, 0, 'YXZ');
    }

    if (this.leftArmBone) {
      this.leftArmBone.rotation.set(-1.1, -0.4, -0.4, 'YXZ');
    }
    if (this.leftForeArmBone) {
      this.leftForeArmBone.rotation.set(0, -0.9, 0, 'YXZ');
    }

    // Dynamic real-time hand bone tracking for 3D Falchion & Heater Shield
    if (this.handRBone && this.weaponGroup && this.weaponGroup.children.length > 0) {
      const v = new THREE.Vector3();
      const q = new THREE.Quaternion();
      this.handRBone.getWorldPosition(v);
      this.handRBone.getWorldQuaternion(q);

      this.group.worldToLocal(v);
      this.weaponGroup.position.copy(v);
      this.weaponGroup.quaternion.copy(q);
      this.weaponGroup.rotateX(Math.PI / 2);
    }

    if (this.handLBone && this.shieldGroup && this.shieldGroup.children.length > 0) {
      const v = new THREE.Vector3();
      const q = new THREE.Quaternion();
      this.handLBone.getWorldPosition(v);
      this.handLBone.getWorldQuaternion(q);

      this.group.worldToLocal(v);
      this.shieldGroup.position.copy(v);
      this.shieldGroup.quaternion.copy(q);
      this.shieldGroup.rotateY(Math.PI / 2);
    }
  }
}
