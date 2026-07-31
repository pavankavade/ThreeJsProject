import * as THREE from 'three';
import { Entity } from './Entity';
import { HealthComponent } from './components/HealthComponent';
import { InputManager } from '../core/Input';
import { EventBus } from '../core/EventBus';
import { CollisionSystem } from '../systems/CollisionSystem';
import type { CollisionTarget } from '../systems/CollisionSystem';
import { EquipmentSystem } from '../systems/EquipmentSystem';

export class Player extends Entity {
  public camera: THREE.PerspectiveCamera;
  public health: HealthComponent;
  public stamina: number = 100;
  public maxStamina: number = 100;
  public attackPower: number = 25;

  public equipment: EquipmentSystem;

  private input: InputManager;
  private collision: CollisionSystem;

  private pitch: number = 0;
  private yaw: number = 0;
  private headBobTimer: number = 0;

  // Vertical physics & Jump
  private velocityY: number = 0;
  private isGrounded: boolean = true;
  private readonly defaultEyeHeight: number = 1.6;
  private readonly gravity: number = -16.0;
  private readonly jumpForce: number = 5.5;

  // Viewmodel arms & weapons
  private viewmodelGroup: THREE.Group;
  private swordMesh!: THREE.Group;
  private shieldMesh!: THREE.Group;
  private potionMesh!: THREE.Group;
  private weaponGlowLight: THREE.PointLight | null = null;

  // Attack, Block & Consumable states
  private isAttacking: boolean = false;
  private attackProgress: number = 0;
  private attackCooldown: number = 0;
  private wasBlocking: boolean = false;

  // Consumable Action Timer
  public isUsingConsumable: boolean = false;
  public consumableProgress: number = 0; // 0 to 1.4s
  private readonly consumableDuration: number = 1.4;

  constructor(camera: THREE.PerspectiveCamera, input: InputManager, collision: CollisionSystem) {
    super('Player');
    this.camera = camera;
    this.input = input;
    this.collision = collision;

    this.health = new HealthComponent(100);
    this.equipment = new EquipmentSystem();
    this.transform.position.set(0, this.defaultEyeHeight, 0);

    this.viewmodelGroup = new THREE.Group();
    this.camera.add(this.viewmodelGroup);

    this.createViewmodels();
    this.registerEquipmentEvents();
  }

  private createViewmodels(): void {
    // 1. Left Hand: Heater Shield
    const shieldWoodMat = new THREE.MeshStandardMaterial({ color: 0x3d2514, roughness: 0.6 });
    const shieldRimMat = new THREE.MeshStandardMaterial({ color: 0xb8860b, metalness: 0.8, roughness: 0.3 });

    this.shieldMesh = new THREE.Group();
    const shieldGeo = new THREE.BoxGeometry(0.45, 0.6, 0.05);
    const shieldBase = new THREE.Mesh(shieldGeo, shieldWoodMat);

    const rimGeo = new THREE.BoxGeometry(0.48, 0.63, 0.06);
    const shieldRim = new THREE.Mesh(rimGeo, shieldRimMat);
    shieldRim.position.set(0, 0, -0.005);
    this.shieldMesh.add(shieldBase, shieldRim);

    this.shieldMesh.position.set(-0.4, -0.35, -0.45);
    this.shieldMesh.rotation.set(0.1, 0.4, -0.1);
    this.viewmodelGroup.add(this.shieldMesh);

    // 2. Right Hand: Sword Container
    this.swordMesh = new THREE.Group();
    this.swordMesh.position.set(0.35, -0.3, -0.5);
    this.swordMesh.rotation.set(0.2, -0.3, 0);
    this.viewmodelGroup.add(this.swordMesh);

    // 3. Right Hand: Potion / Bandage Container
    this.potionMesh = new THREE.Group();
    this.potionMesh.position.set(0.25, -0.35, -0.4);
    this.potionMesh.rotation.set(0.3, -0.2, 0);
    this.viewmodelGroup.add(this.potionMesh);

    this.updateActiveHandViewmodel();
  }

  private registerEquipmentEvents(): void {
    EventBus.on('EQUIPMENT_CHANGED', () => {
      this.updateActiveHandViewmodel();
    });
  }

  public updateActiveHandViewmodel(): void {
    const activeItem = this.equipment.getActiveHandItem();

    if (this.equipment.activeSlot === 1 || this.equipment.activeSlot === 2) {
      // Weapon or Shield mode
      this.potionMesh.visible = false;
      this.swordMesh.visible = true;
      this.shieldMesh.visible = (this.equipment.activeSlot === 2 || !!this.equipment.weapon2);

      if (activeItem && activeItem.type === 'WEAPON') {
        this.equipWeaponMesh(activeItem.name, activeItem.value);
      } else {
        this.equipWeaponMesh('Iron Longsword', 25);
      }
    } else {
      // Slot 3 or 4: Consumable mode (Potion or Bandage)
      this.swordMesh.visible = false;
      this.potionMesh.visible = true;
      this.potionMesh.clear();

      if (activeItem) {
        if (activeItem.name.includes('Bandage')) {
          const clothMat = new THREE.MeshStandardMaterial({ color: 0xdedeeb, roughness: 0.8 });
          const rollGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.15, 12);
          const roll = new THREE.Mesh(rollGeo, clothMat);
          roll.rotation.z = Math.PI / 2;
          this.potionMesh.add(roll);
        } else {
          const glassMat = new THREE.MeshStandardMaterial({ color: 0x2288ff, roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.8 });
          const fluidMat = new THREE.MeshBasicMaterial({ color: 0xee2200 });

          const flaskGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.2, 10);
          const flask = new THREE.Mesh(flaskGeo, glassMat);

          const fluidGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.12, 10);
          const fluid = new THREE.Mesh(fluidGeo, fluidMat);
          fluid.position.set(0, -0.03, 0);

          const corkMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.9 });
          const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05), corkMat);
          cork.position.set(0, 0.11, 0);

          this.potionMesh.add(flask, fluid, cork);
        }
      }
    }
  }

  private equipWeaponMesh(name: string, atkPower: number): void {
    this.attackPower = atkPower;
    this.swordMesh.clear();

    if (this.weaponGlowLight) {
      this.weaponGlowLight.dispose();
      this.weaponGlowLight = null;
    }

    let bladeMat: THREE.MeshStandardMaterial;
    let guardMat: THREE.MeshStandardMaterial;
    let bladeGeo = new THREE.BoxGeometry(0.06, 0.85, 0.02);

    if (name.includes('Flame')) {
      bladeMat = new THREE.MeshStandardMaterial({ color: 0xff3300, roughness: 0.2, metalness: 0.9, emissive: 0xff2200, emissiveIntensity: 0.8 });
      guardMat = new THREE.MeshStandardMaterial({ color: 0x441100, metalness: 0.9 });
      bladeGeo = new THREE.BoxGeometry(0.09, 0.95, 0.025);

      this.weaponGlowLight = new THREE.PointLight(0xff4400, 1.5, 3);
      this.weaponGlowLight.position.set(0, 0.5, 0);
      this.swordMesh.add(this.weaponGlowLight);
    } else if (name.includes('Gold') || name.includes('Paladin')) {
      bladeMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.2, metalness: 0.9, emissive: 0xffaa00, emissiveIntensity: 0.4 });
      guardMat = new THREE.MeshStandardMaterial({ color: 0xb8860b, metalness: 0.9 });

      this.weaponGlowLight = new THREE.PointLight(0xffdd22, 1.2, 3);
      this.weaponGlowLight.position.set(0, 0.5, 0);
      this.swordMesh.add(this.weaponGlowLight);
    } else if (name.includes('Elven') || name.includes('Mithril')) {
      bladeMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, roughness: 0.1, metalness: 0.95, emissive: 0x0088ff, emissiveIntensity: 0.6 });
      guardMat = new THREE.MeshStandardMaterial({ color: 0x004488, metalness: 0.9 });

      this.weaponGlowLight = new THREE.PointLight(0x00e5ff, 1.2, 3);
      this.weaponGlowLight.position.set(0, 0.5, 0);
      this.swordMesh.add(this.weaponGlowLight);
    } else if (name.includes('Shadow') || name.includes('Dagger')) {
      bladeMat = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.2, metalness: 0.95, emissive: 0x8800ff, emissiveIntensity: 0.5 });
      guardMat = new THREE.MeshStandardMaterial({ color: 0x220044, metalness: 0.9 });
      bladeGeo = new THREE.BoxGeometry(0.04, 0.55, 0.015);

      this.weaponGlowLight = new THREE.PointLight(0xaa00ff, 1.0, 2);
      this.weaponGlowLight.position.set(0, 0.3, 0);
      this.swordMesh.add(this.weaponGlowLight);
    } else {
      bladeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 });
      guardMat = new THREE.MeshStandardMaterial({ color: 0x442211, roughness: 0.7 });
    }

    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.set(0, 0.425, 0);

    const guardGeo = new THREE.BoxGeometry(0.25, 0.04, 0.06);
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.position.set(0, 0, 0);

    const handleGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.2);
    const handle = new THREE.Mesh(handleGeo, guardMat);
    handle.position.set(0, -0.1, 0);

    this.swordMesh.add(blade, guard, handle);
  }

  public updatePlayer(delta: number, enemies: CollisionTarget[]): void {
    this.health.update(delta);
    this.handleMouseLook();
    this.handleMovement(delta);
    this.handleCombat(delta, enemies);
    this.handleConsumables(delta);
    this.updateStamina(delta);
  }

  private handleMouseLook(): void {
    if (!this.input.isPointerLocked()) return;

    const sensitivity = 0.002;
    this.yaw -= this.input.mouseDeltaX * sensitivity;
    this.pitch -= this.input.mouseDeltaY * sensitivity;

    this.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitch));

    this.transform.rotation.y = this.yaw;
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  private handleMovement(delta: number): void {
    if (!this.input.isPointerLocked()) return;

    const speed = this.input.isKeyDown('ShiftLeft') ? 4.5 : 3.0;
    const moveDir = new THREE.Vector3();

    if (this.input.isKeyDown('KeyW')) moveDir.z -= 1;
    if (this.input.isKeyDown('KeyS')) moveDir.z += 1;
    if (this.input.isKeyDown('KeyA')) moveDir.x -= 1;
    if (this.input.isKeyDown('KeyD')) moveDir.x += 1;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

      this.transform.position.x += moveDir.x * speed * delta;
      this.transform.position.z += moveDir.z * speed * delta;

      this.collision.resolveWallCollision(this.transform.position, 0.4);
    }

    if (this.input.jumpRequested && this.isGrounded && this.stamina >= 10) {
      this.velocityY = this.jumpForce;
      this.isGrounded = false;
      this.stamina -= 10;
      EventBus.emit('PLAYER_STAMINA_CHANGE', { current: this.stamina, max: this.maxStamina });
    }

    if (!this.isGrounded) {
      this.velocityY += this.gravity * delta;
      this.transform.position.y += this.velocityY * delta;

      if (this.transform.position.y <= this.defaultEyeHeight) {
        this.transform.position.y = this.defaultEyeHeight;
        this.velocityY = 0;
        this.isGrounded = true;
      }
    } else {
      if (moveDir.lengthSq() > 0) {
        this.headBobTimer += delta * speed * 3.0;
        this.transform.position.y = this.defaultEyeHeight + Math.sin(this.headBobTimer) * 0.05;
      } else {
        this.transform.position.y = THREE.MathUtils.lerp(this.transform.position.y, this.defaultEyeHeight, delta * 5);
      }
    }

    this.camera.position.copy(this.transform.position);
  }

  private handleCombat(delta: number, enemies: CollisionTarget[]): void {
    if (this.equipment.activeSlot !== 1 && this.equipment.activeSlot !== 2) return;

    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
    }

    if (this.input.attackRequested && !this.isAttacking && this.attackCooldown <= 0 && this.stamina >= 15) {
      this.isAttacking = true;
      this.attackProgress = 0;
      this.attackCooldown = 0.55;
      this.stamina -= 15;
      EventBus.emit('PLAYER_STAMINA_CHANGE', { current: this.stamina, max: this.maxStamina });
      EventBus.emit('PLAYER_ATTACK_SWING');

      const camDir = new THREE.Vector3();
      this.camera.getWorldDirection(camDir);
      const hitEnemies = this.collision.getEntitiesInArc(this.transform.position, camDir, 2.4, 80, enemies);

      hitEnemies.forEach((e) => {
        if (e.takeDamage) {
          e.takeDamage(this.attackPower);
        }
      });
    }

    if (this.isAttacking) {
      this.attackProgress += delta * 4.0;
      if (this.attackProgress >= 1.0) {
        this.isAttacking = false;
        this.swordMesh.position.set(0.35, -0.3, -0.5);
        this.swordMesh.rotation.set(0.2, -0.3, 0);
      } else {
        const swing = Math.sin(this.attackProgress * Math.PI);
        this.swordMesh.position.x = 0.35 - swing * 0.5;
        this.swordMesh.position.z = -0.5 + swing * 0.2;
        this.swordMesh.rotation.z = -swing * 1.5;
        this.swordMesh.rotation.y = -0.3 - swing * 0.8;
      }
    }

    const targetShieldPos = this.input.isBlocking
      ? new THREE.Vector3(-0.1, -0.2, -0.35)
      : new THREE.Vector3(-0.4, -0.35, -0.45);
    const targetShieldRot = this.input.isBlocking
      ? new THREE.Euler(0.2, 0.1, 0)
      : new THREE.Euler(0.1, 0.4, -0.1);

    this.shieldMesh.position.lerp(targetShieldPos, delta * 10);
    this.shieldMesh.rotation.x = THREE.MathUtils.lerp(this.shieldMesh.rotation.x, targetShieldRot.x, delta * 10);
    this.shieldMesh.rotation.y = THREE.MathUtils.lerp(this.shieldMesh.rotation.y, targetShieldRot.y, delta * 10);

    if (this.input.isBlocking !== this.wasBlocking) {
      this.wasBlocking = this.input.isBlocking;
      EventBus.emit('PLAYER_BLOCK_TOGGLE', this.input.isBlocking);
    }
  }

  private handleConsumables(delta: number): void {
    if (this.equipment.activeSlot !== 3 && this.equipment.activeSlot !== 4) {
      this.isUsingConsumable = false;
      this.consumableProgress = 0;
      return;
    }

    const activeItem = this.equipment.getActiveHandItem();
    if (!activeItem) {
      this.isUsingConsumable = false;
      this.consumableProgress = 0;
      return;
    }

    // Check continuous left click hold state!
    if (this.input.isMouseDownLeft || this.input.attackRequested) {
      this.isUsingConsumable = true;
      this.consumableProgress += delta;

      const tilt = Math.sin((this.consumableProgress / this.consumableDuration) * Math.PI);
      this.potionMesh.position.y = -0.35 + tilt * 0.15;
      this.potionMesh.rotation.x = 0.3 + tilt * 0.4;

      if (this.consumableProgress >= this.consumableDuration) {
        this.isUsingConsumable = false;
        this.consumableProgress = 0;

        if (activeItem.name.includes('Bandage')) {
          EventBus.emit('APPLY_BANDAGE');
          this.health.heal(activeItem.value);
        } else {
          EventBus.emit('DRINK_POTION');
          this.health.heal(activeItem.value);
        }

        EventBus.emit('PLAYER_HEALTH_CHANGE', { current: this.health.current, max: this.health.max });
        this.equipment.consumeActiveConsumable();
        this.updateActiveHandViewmodel();
      }
    } else {
      this.isUsingConsumable = false;
      this.consumableProgress = 0;
      this.potionMesh.position.y = THREE.MathUtils.lerp(this.potionMesh.position.y, -0.35, delta * 10);
      this.potionMesh.rotation.x = THREE.MathUtils.lerp(this.potionMesh.rotation.x, 0.3, delta * 10);
    }
  }

  public damagePlayer(rawAmount: number): void {
    if (this.health.isDead) return;

    let finalDamage = rawAmount;

    if (this.input.isBlocking && this.stamina >= 10 && this.equipment.activeSlot <= 2) {
      finalDamage = Math.floor(rawAmount * 0.15);
      this.stamina = Math.max(0, this.stamina - 15);
      EventBus.emit('PLAYER_STAMINA_CHANGE', { current: this.stamina, max: this.maxStamina });
    }

    const wasHurt = this.health.takeDamage(finalDamage);
    if (wasHurt) {
      EventBus.emit('PLAYER_HIT', { hp: this.health.current, max: this.health.max });
      EventBus.emit('PLAYER_HEALTH_CHANGE', { current: this.health.current, max: this.health.max });

      if (this.health.isDead) {
        EventBus.emit('GAME_OVER');
      }
    }
  }

  private updateStamina(delta: number): void {
    if (!this.isAttacking && !this.input.isBlocking && this.stamina < this.maxStamina) {
      this.stamina = Math.min(this.maxStamina, this.stamina + delta * 20);
      EventBus.emit('PLAYER_STAMINA_CHANGE', { current: this.stamina, max: this.maxStamina });
    }
  }
}
