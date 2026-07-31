import * as THREE from 'three';
import { Entity } from './Entity';
import { HealthComponent } from './components/HealthComponent';
import { InputManager } from '../core/Input';
import { EventBus } from '../core/EventBus';
import { CollisionSystem } from '../systems/CollisionSystem';
import type { CollisionTarget } from '../systems/CollisionSystem';
import { EquipmentSystem } from '../systems/EquipmentSystem';
import { CharacterPaperdoll } from './CharacterPaperdoll';
import { WeaponFactory } from '../factories/WeaponFactory';

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

  // Perspective Mode (1st vs 3rd Person)
  public isThirdPerson: boolean = false;
  public worldCharacter: CharacterPaperdoll;

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

  // Rest position for sword (brings hand & Falchion into clear view)
  private readonly swordRestPos = new THREE.Vector3(0.25, -0.22, -0.4);
  private readonly swordRestRot = new THREE.Euler(0.25, -0.45, 0.15);

  constructor(camera: THREE.PerspectiveCamera, input: InputManager, collision: CollisionSystem) {
    super('Player');
    this.camera = camera;
    this.input = input;
    this.collision = collision;

    this.health = new HealthComponent(100);
    this.equipment = new EquipmentSystem();
    this.transform.position.set(0, this.defaultEyeHeight, 0);

    // 1st Person Viewmodels Container
    this.viewmodelGroup = new THREE.Group();
    this.camera.add(this.viewmodelGroup);

    // 3D World Character Mesh Container (for 3rd Person View)
    this.mesh = new THREE.Group();
    this.worldCharacter = new CharacterPaperdoll(this.equipment);
    this.worldCharacter.group.position.set(0, -this.defaultEyeHeight + 0.82, 0);
    this.mesh.add(this.worldCharacter.group);
    this.worldCharacter.group.visible = false; // Hidden in 1st person mode

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
    const shieldGroup = WeaponFactory.buildHeaterShieldMesh(true);
    this.shieldMesh.add(shieldGroup);
  }

  /** Build a curved falchion blade using ExtrudeGeometry */
  private buildFalchionBlade(bladeMat: THREE.MeshStandardMaterial, guardMat: THREE.MeshStandardMaterial, scale: number = 1.0): void {
    this.swordMesh.clear();
    const falchionGroup = WeaponFactory.buildFalchionMesh(bladeMat, guardMat, scale, true);
    this.swordMesh.add(falchionGroup);
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
    if (this.input.viewToggleRequested) {
      this.isThirdPerson = !this.isThirdPerson;
    }

    // Always synchronize 1st-person viewmodels vs 3rd-person world character model visibility
    this.viewmodelGroup.visible = !this.isThirdPerson;
    this.worldCharacter.group.visible = this.isThirdPerson;

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

    // Update 3D character motion animations (walk, run, idle, airborne)
    if (!this.isGrounded) {
      this.worldCharacter.playAnimation('sad_pose');
    } else if (moveDir.lengthSq() > 0) {
      if (this.input.isKeyDown('ShiftLeft')) {
        this.worldCharacter.playAnimation('run');
      } else {
        this.worldCharacter.playAnimation('walk');
      }
    } else {
      this.worldCharacter.playAnimation('idle');
    }

    // Camera positioning based on view mode (1st Person vs 3rd Person)
    if (this.isThirdPerson) {
      // Sekiro over-the-right-shoulder 3rd Person camera offset (X = +0.75 for clear right arm & weapon view)
      const smoothPitch = Math.max(-0.2, Math.min(0.4, this.pitch * 0.4));
      const desiredDist = 2.6;
      const rawOffset = new THREE.Vector3(0.75, 0.75, desiredDist);
      rawOffset.applyEuler(new THREE.Euler(smoothPitch, this.yaw, 0, 'YXZ'));

      const headPos = this.transform.position.clone();
      const rayDir = rawOffset.clone().normalize();
      const maxDist = rawOffset.length();

      // Wall collision raycasting
      const hitDist = this.collision.raycastWallDistance(headPos, rayDir, maxDist);
      const safeDist = Math.max(0.7, hitDist - 0.25);

      const safeOffset = rayDir.multiplyScalar(safeDist);
      this.camera.position.copy(headPos).add(safeOffset);

      // Target lookAt point: upper chest / horizon target
      const lookTarget = this.transform.position.clone().add(new THREE.Vector3(0, 0.35, 0));
      this.camera.lookAt(lookTarget);

      // Position & rotate 3D world character mesh to face movement direction
      if (this.mesh) {
        this.mesh.position.copy(this.transform.position);
        this.mesh.rotation.y = this.yaw;
      }
    } else {
      // 1st Person View: position camera at eye level
      this.camera.position.copy(this.transform.position);
      this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');

      if (this.mesh) {
        this.mesh.position.copy(this.transform.position);
        this.mesh.rotation.y = this.yaw;
      }
    }

    // Update 3D world character animations & model transforms
    this.worldCharacter.update(delta);
  }

  // Mouse steering accumulator for dynamic swing tracking
  private mouseSwingX: number = 0;
  private mouseSwingY: number = 0;

  private handleCombat(delta: number, enemies: CollisionTarget[]): void {
    if (this.equipment.activeSlot !== 1 && this.equipment.activeSlot !== 2) return;

    // Synchronize 3D attack & shield blocking actions to 3rd-person character model
    this.worldCharacter.isAttacking = this.isAttacking;
    this.worldCharacter.attackProgress = this.attackProgress;
    this.worldCharacter.comboStep = this.comboStep;
    this.worldCharacter.isBlocking = this.input.isBlocking;

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
        // Smooth interpolation parameter p (0 to 1) and forward thrust factor
        const p = Math.min(1.0, this.attackProgress);
        const thrust = Math.sin(p * Math.PI); // Peak forward extension at mid-swing

        if (this.comboStep === 0) {
          // ── Swing 1: 3D Diagonal Slash (Right → Left with Forward Z-Thrust) ──
          // Winds back right (p=0), drives deep forward in Z (-0.70!), follows through left (p=1.0)
          this.swordMesh.position.x = 0.48 - p * 0.95 + this.mouseSwingX;
          this.swordMesh.position.y = -0.12 - thrust * 0.18 + this.mouseSwingY;
          this.swordMesh.position.z = -0.38 - thrust * 0.32; // Deep 3D forward extension

          // Blade rotational leaning forward & across 3D space
          this.swordMesh.rotation.x = 0.5 - thrust * 0.95; // Leans blade forward into depth
          this.swordMesh.rotation.y = -1.1 + p * 2.0;       // Rotates blade across 3D view
          this.swordMesh.rotation.z = -0.6 + p * 1.8;
        } else if (this.comboStep === 1) {
          // ── Swing 2: 3D Backslash (Left → Right with Forward Z-Thrust) ──
          // Winds back left (p=0), drives deep forward in Z (-0.70!), follows through right (p=1.0)
          this.swordMesh.position.x = -0.45 + p * 0.95 + this.mouseSwingX;
          this.swordMesh.position.y = -0.12 - thrust * 0.18 + this.mouseSwingY;
          this.swordMesh.position.z = -0.38 - thrust * 0.32; // Deep 3D forward extension

          this.swordMesh.rotation.x = 0.5 - thrust * 0.95; // Leans blade forward into depth
          this.swordMesh.rotation.y = 0.9 - p * 2.0;        // Rotates back across 3D view
          this.swordMesh.rotation.z = 0.7 - p * 1.8;
        } else {
          // ── Swing 3: 3D Heavy Overhead Downward Chop (Thrusting Forward & Down) ──
          // Raised high (p=0), chops straight down & forward into Z space (-0.72!)
          this.swordMesh.position.x = 0.12 - p * 0.12 + this.mouseSwingX;
          this.swordMesh.position.y = 0.32 - p * 0.8 + this.mouseSwingY;
          this.swordMesh.position.z = -0.32 - thrust * 0.40; // Drives forward toward crosshair

          this.swordMesh.rotation.x = 1.3 - p * 2.2; // Slams blade down & leaning forward
          this.swordMesh.rotation.y = -0.15;
          this.swordMesh.rotation.z = 0.15 - p * 0.3;
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
