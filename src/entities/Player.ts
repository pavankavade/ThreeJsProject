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

  // Character Stats
  public vigor: number = 10;
  public agility: number = 8;
  public dexterity: number = 12;

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

  // Combo Attack System
  private isAttacking: boolean = false;
  private attackProgress: number = 0;
  private attackCooldown: number = 0;
  private comboStep: number = 0;           // 0=R→L, 1=L→R, 2=Up→Down

  // Block state
  private wasBlocking: boolean = false;

  // Consumable Action Timer
  public isUsingConsumable: boolean = false;
  public consumableProgress: number = 0;
  private readonly consumableDuration: number = 1.4;

  // Rest position for sword
  private readonly swordRestPos = new THREE.Vector3(0.35, -0.3, -0.5);
  private readonly swordRestRot = new THREE.Euler(0.2, -0.3, 0);

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
    // 1. Left Hand: Heater Shield (triangular/kite shape)
    this.shieldMesh = new THREE.Group();
    this.buildHeaterShield();
    this.shieldMesh.position.set(-0.4, -0.35, -0.45);
    this.shieldMesh.rotation.set(0.1, 0.4, -0.1);
    this.viewmodelGroup.add(this.shieldMesh);

    // 2. Right Hand: Sword Container (Falchion)
    this.swordMesh = new THREE.Group();
    this.swordMesh.position.copy(this.swordRestPos);
    this.swordMesh.rotation.copy(this.swordRestRot);
    this.viewmodelGroup.add(this.swordMesh);

    // 3. Right Hand: Potion / Bandage Container
    this.potionMesh = new THREE.Group();
    this.potionMesh.position.set(0.25, -0.35, -0.4);
    this.potionMesh.rotation.set(0.3, -0.2, 0);
    this.viewmodelGroup.add(this.potionMesh);

    this.updateActiveHandViewmodel();
  }

  /** Build a proper heater shield shape: flat top, tapers to a point at the bottom */
  private buildHeaterShield(): void {
    this.shieldMesh.clear();

    // Heater shield outline shape
    const shieldShape = new THREE.Shape();
    const w = 0.22;   // half-width
    const h = 0.6;    // total height
    // Start at top-left corner
    shieldShape.moveTo(-w, h * 0.5);
    // Flat top edge
    shieldShape.lineTo(w, h * 0.5);
    // Right side curves down to point
    shieldShape.quadraticCurveTo(w * 1.05, 0, 0, -h * 0.5);
    // Left side curves back up from point
    shieldShape.quadraticCurveTo(-w * 1.05, 0, -w, h * 0.5);

    const extrudeSettings = { depth: 0.04, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 2 };

    // Wood backing
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2514, roughness: 0.65, metalness: 0.1 });
    const shieldBody = new THREE.Mesh(new THREE.ExtrudeGeometry(shieldShape, extrudeSettings), woodMat);
    this.shieldMesh.add(shieldBody);

    // Metallic gold rim (slightly larger)
    const rimShape = new THREE.Shape();
    const rw = w + 0.015;
    const rh = h + 0.02;
    rimShape.moveTo(-rw, rh * 0.5);
    rimShape.lineTo(rw, rh * 0.5);
    rimShape.quadraticCurveTo(rw * 1.05, 0, 0, -rh * 0.5);
    rimShape.quadraticCurveTo(-rw * 1.05, 0, -rw, rh * 0.5);

    const rimSettings = { depth: 0.045, bevelEnabled: false };
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xb8860b, metalness: 0.85, roughness: 0.25 });
    const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(rimShape, rimSettings), rimMat);
    rim.position.set(0, 0, -0.003);
    this.shieldMesh.add(rim);

    // Central boss (circle emblem)
    const bossMat = new THREE.MeshStandardMaterial({ color: 0xd4a846, metalness: 0.9, roughness: 0.2 });
    const bossGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.025, 16);
    const boss = new THREE.Mesh(bossGeo, bossMat);
    boss.rotation.x = Math.PI / 2;
    boss.position.set(0, 0.05, 0.05);
    this.shieldMesh.add(boss);

    // Cross emblem on shield face (vertical bar + horizontal bar)
    const crossMat = new THREE.MeshStandardMaterial({ color: 0xd4a846, metalness: 0.85, roughness: 0.3 });
    const vertBar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.01), crossMat);
    vertBar.position.set(0, 0.05, 0.055);
    const horizBar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.01), crossMat);
    horizBar.position.set(0, 0.12, 0.055);
    this.shieldMesh.add(vertBar, horizBar);
  }

  /** Build a curved falchion blade using ExtrudeGeometry */
  private buildFalchionBlade(bladeMat: THREE.MeshStandardMaterial, guardMat: THREE.MeshStandardMaterial, scale: number = 1.0): void {
    this.swordMesh.clear();

    if (this.weaponGlowLight) {
      this.weaponGlowLight.dispose();
      this.weaponGlowLight = null;
    }

    // Falchion blade shape: narrow at hilt, widens toward tip, single curved edge
    const bladeShape = new THREE.Shape();
    const bLen = 0.8 * scale;  // blade length
    // Spine (back/straight edge) on the right, cutting edge (curved) on the left
    bladeShape.moveTo(0, 0);                              // base center
    bladeShape.lineTo(0.025 * scale, 0);                  // base right (spine side)
    bladeShape.lineTo(0.03 * scale, bLen * 0.7);          // spine stays relatively straight
    bladeShape.lineTo(0.02 * scale, bLen * 0.95);         // tip narrows slightly
    bladeShape.lineTo(0, bLen);                            // tip point
    bladeShape.lineTo(-0.02 * scale, bLen * 0.9);         // cutting edge widens near tip
    bladeShape.quadraticCurveTo(-0.045 * scale, bLen * 0.5, -0.025 * scale, 0); // curved cutting edge back to base

    const extrudeSettings = {
      depth: 0.012 * scale,
      bevelEnabled: true,
      bevelThickness: 0.003,
      bevelSize: 0.002,
      bevelSegments: 1
    };

    const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(bladeShape, extrudeSettings), bladeMat);
    blade.position.set(0, 0.02, -0.006 * scale); // position above guard
    this.swordMesh.add(blade);

    // Crossguard
    const guardGeo = new THREE.BoxGeometry(0.22 * scale, 0.035 * scale, 0.045 * scale);
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.position.set(0, 0.01, 0);
    this.swordMesh.add(guard);

    // Handle/grip (wrapped leather look)
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.9, metalness: 0.05 });
    const handleGeo = new THREE.CylinderGeometry(0.02 * scale, 0.022 * scale, 0.18 * scale, 8);
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0, -0.1, 0);
    this.swordMesh.add(handle);

    // Pommel (round end cap)
    const pommelGeo = new THREE.SphereGeometry(0.025 * scale, 8, 6);
    const pommel = new THREE.Mesh(pommelGeo, guardMat);
    pommel.position.set(0, -0.2, 0);
    this.swordMesh.add(pommel);
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
        this.equipWeaponMesh('Iron Falchion', 25);
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

    let bladeMat: THREE.MeshStandardMaterial;
    let guardMat: THREE.MeshStandardMaterial;
    let scale = 1.0;

    if (name.includes('Flame')) {
      bladeMat = new THREE.MeshStandardMaterial({ color: 0xff3300, roughness: 0.2, metalness: 0.9, emissive: 0xff2200, emissiveIntensity: 0.8 });
      guardMat = new THREE.MeshStandardMaterial({ color: 0x441100, metalness: 0.9 });
      scale = 1.15;

      this.buildFalchionBlade(bladeMat, guardMat, scale);

      this.weaponGlowLight = new THREE.PointLight(0xff4400, 1.5, 3);
      this.weaponGlowLight.position.set(0, 0.5, 0);
      this.swordMesh.add(this.weaponGlowLight);
    } else if (name.includes('Gold') || name.includes('Paladin')) {
      bladeMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.2, metalness: 0.9, emissive: 0xffaa00, emissiveIntensity: 0.4 });
      guardMat = new THREE.MeshStandardMaterial({ color: 0xb8860b, metalness: 0.9 });

      this.buildFalchionBlade(bladeMat, guardMat);

      this.weaponGlowLight = new THREE.PointLight(0xffdd22, 1.2, 3);
      this.weaponGlowLight.position.set(0, 0.5, 0);
      this.swordMesh.add(this.weaponGlowLight);
    } else if (name.includes('Elven') || name.includes('Mithril')) {
      bladeMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, roughness: 0.1, metalness: 0.95, emissive: 0x0088ff, emissiveIntensity: 0.6 });
      guardMat = new THREE.MeshStandardMaterial({ color: 0x004488, metalness: 0.9 });

      this.buildFalchionBlade(bladeMat, guardMat);

      this.weaponGlowLight = new THREE.PointLight(0x00e5ff, 1.2, 3);
      this.weaponGlowLight.position.set(0, 0.5, 0);
      this.swordMesh.add(this.weaponGlowLight);
    } else if (name.includes('Shadow') || name.includes('Dagger')) {
      bladeMat = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.2, metalness: 0.95, emissive: 0x8800ff, emissiveIntensity: 0.5 });
      guardMat = new THREE.MeshStandardMaterial({ color: 0x220044, metalness: 0.9 });
      scale = 0.7;

      this.buildFalchionBlade(bladeMat, guardMat, scale);

      this.weaponGlowLight = new THREE.PointLight(0xaa00ff, 1.0, 2);
      this.weaponGlowLight.position.set(0, 0.3, 0);
      this.swordMesh.add(this.weaponGlowLight);
    } else {
      // Default: Iron Falchion
      bladeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 });
      guardMat = new THREE.MeshStandardMaterial({ color: 0x442211, roughness: 0.7 });

      this.buildFalchionBlade(bladeMat, guardMat);
    }
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

  // Mouse steering accumulator for dynamic swing tracking
  private mouseSwingX: number = 0;
  private mouseSwingY: number = 0;

  private handleCombat(delta: number, enemies: CollisionTarget[]): void {
    if (this.equipment.activeSlot !== 1 && this.equipment.activeSlot !== 2) return;

    // Tick down attack recovery cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
    }

    // Accumulate & decay mouse movement steering during swings
    if (this.input.isPointerLocked()) {
      this.mouseSwingX = THREE.MathUtils.lerp(this.mouseSwingX, this.input.mouseDeltaX * 0.0015, delta * 12);
      this.mouseSwingY = THREE.MathUtils.lerp(this.mouseSwingY, this.input.mouseDeltaY * 0.0015, delta * 12);
    }

    // Start a new swing if not currently attacking and ready:
    // Triggers on click (attackRequested) OR continuous holding (isMouseDownLeft)
    const canStartSwing = !this.isAttacking && this.attackCooldown <= 0 && this.stamina >= 15;
    const wantsToStart = this.input.attackRequested || this.input.isMouseDownLeft;

    if (wantsToStart && canStartSwing) {
      this.isAttacking = true;
      this.attackProgress = 0;
      this.comboStep = 0; // Start at Swing 1 (R -> L)
      this.stamina = Math.max(0, this.stamina - 15);
      EventBus.emit('PLAYER_STAMINA_CHANGE', { current: this.stamina, max: this.maxStamina });
      EventBus.emit('PLAYER_ATTACK_SWING');

      // Hit detection at swing start
      const camDir = new THREE.Vector3();
      this.camera.getWorldDirection(camDir);
      const hitEnemies = this.collision.getEntitiesInArc(this.transform.position, camDir, 2.4, 80, enemies);
      hitEnemies.forEach((e) => e.takeDamage && e.takeDamage(this.attackPower));
    }

    // Animate the active swing
    if (this.isAttacking) {
      this.attackProgress += delta * 2.2; // Readable, fluid swing speed (~0.45s per swing)

      if (this.attackProgress >= 1.0) {
        // Active swing reached completion
        const nextStep = (this.comboStep + 1) % 3;

        // If player is HOLDING left click and has stamina, seamlessly continue to next swing!
        if (this.input.isMouseDownLeft && nextStep !== 0 && this.stamina >= 15) {
          this.comboStep = nextStep;
          this.attackProgress = 0;
          this.stamina = Math.max(0, this.stamina - 15);
          EventBus.emit('PLAYER_STAMINA_CHANGE', { current: this.stamina, max: this.maxStamina });
          EventBus.emit('PLAYER_ATTACK_SWING');

          // Hit detection for next swing in combo
          const camDir = new THREE.Vector3();
          this.camera.getWorldDirection(camDir);
          const hitEnemies = this.collision.getEntitiesInArc(this.transform.position, camDir, 2.4, 80, enemies);
          hitEnemies.forEach((e) => e.takeDamage && e.takeDamage(this.attackPower));
        } else {
          // Single click released OR full 3-hit combo completed!
          this.isAttacking = false;
          this.comboStep = 0;
          this.attackCooldown = 0.35; // Brief recovery period
          this.swordMesh.position.copy(this.swordRestPos);
          this.swordMesh.rotation.copy(this.swordRestRot);
        }
      } else {
        // Smooth interpolation parameter p (0 to 1)
        const p = Math.min(1.0, this.attackProgress);

        if (this.comboStep === 0) {
          // ── Swing 1: Right → Left horizontal slash ──
          this.swordMesh.position.x = 0.45 - p * 0.9 + this.mouseSwingX;
          this.swordMesh.position.y = -0.15 - Math.sin(p * Math.PI) * 0.12 + this.mouseSwingY;
          this.swordMesh.position.z = -0.4 + Math.sin(p * Math.PI) * 0.15;
          this.swordMesh.rotation.x = 0.2 - Math.sin(p * Math.PI) * 0.3;
          this.swordMesh.rotation.y = -0.8 + p * 1.6;
          this.swordMesh.rotation.z = -0.5 + p * 1.5;
        } else if (this.comboStep === 1) {
          // ── Swing 2: Left → Right horizontal backslash ──
          this.swordMesh.position.x = -0.45 + p * 0.9 + this.mouseSwingX;
          this.swordMesh.position.y = -0.15 - Math.sin(p * Math.PI) * 0.12 + this.mouseSwingY;
          this.swordMesh.position.z = -0.4 + Math.sin(p * Math.PI) * 0.15;
          this.swordMesh.rotation.x = 0.2 - Math.sin(p * Math.PI) * 0.3;
          this.swordMesh.rotation.y = 0.8 - p * 1.6;
          this.swordMesh.rotation.z = 0.8 - p * 1.6;
        } else {
          // ── Swing 3: Overhead vertical downward chop ──
          this.swordMesh.position.x = 0.15 - p * 0.15 + this.mouseSwingX;
          this.swordMesh.position.y = 0.3 - p * 0.75 + this.mouseSwingY;
          this.swordMesh.position.z = -0.35 + p * 0.1;
          this.swordMesh.rotation.x = 1.2 - p * 1.9;
          this.swordMesh.rotation.y = -0.15;
          this.swordMesh.rotation.z = 0.1 - p * 0.2;
        }
      }
    } else {
      // Not attacking: lerp sword smoothly back to rest position
      this.swordMesh.position.lerp(this.swordRestPos, delta * 8);
      this.swordMesh.rotation.x = THREE.MathUtils.lerp(this.swordMesh.rotation.x, this.swordRestRot.x, delta * 8);
      this.swordMesh.rotation.y = THREE.MathUtils.lerp(this.swordMesh.rotation.y, this.swordRestRot.y, delta * 8);
      this.swordMesh.rotation.z = THREE.MathUtils.lerp(this.swordMesh.rotation.z, this.swordRestRot.z, delta * 8);
    }

    // Shield blocking animation
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
