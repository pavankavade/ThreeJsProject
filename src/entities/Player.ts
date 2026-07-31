import * as THREE from 'three';
import { Entity } from './Entity';
import { HealthComponent } from './components/HealthComponent';
import { InputManager } from '../core/Input';
import { EventBus } from '../core/EventBus';
import { CollisionSystem } from '../systems/CollisionSystem';
import type { CollisionTarget } from '../systems/CollisionSystem';

export class Player extends Entity {
  public camera: THREE.PerspectiveCamera;
  public health: HealthComponent;
  public stamina: number = 100;
  public maxStamina: number = 100;
  public attackPower: number = 25;
  public currentWeaponName: string = 'Iron Longsword';

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

  // Viewmodel arms
  private viewmodelGroup: THREE.Group;
  private swordMesh!: THREE.Group;
  private shieldMesh!: THREE.Group;
  private weaponGlowLight: THREE.PointLight | null = null;

  // Attack & Block states
  private isAttacking: boolean = false;
  private attackProgress: number = 0;
  private attackCooldown: number = 0;
  private wasBlocking: boolean = false;

  constructor(camera: THREE.PerspectiveCamera, input: InputManager, collision: CollisionSystem) {
    super('Player');
    this.camera = camera;
    this.input = input;
    this.collision = collision;

    this.health = new HealthComponent(100);
    this.transform.position.set(0, this.defaultEyeHeight, 0);

    this.viewmodelGroup = new THREE.Group();
    this.camera.add(this.viewmodelGroup);

    this.createViewmodel();
  }

  private createViewmodel(): void {
    // Left Hand: Heater Shield
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

    // Right Hand: Sword Container
    this.swordMesh = new THREE.Group();
    this.swordMesh.position.set(0.35, -0.3, -0.5);
    this.swordMesh.rotation.set(0.2, -0.3, 0);
    this.viewmodelGroup.add(this.swordMesh);

    // Default weapon mesh
    this.equipWeapon('Iron Longsword', 25);
  }

  public equipWeapon(name: string, atkPower: number): void {
    this.currentWeaponName = name;
    this.attackPower = atkPower;

    // Clear old weapon geometry
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
      bladeGeo = new THREE.BoxGeometry(0.09, 0.95, 0.025); // Broad blade

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
      bladeGeo = new THREE.BoxGeometry(0.04, 0.55, 0.015); // Dagger

      this.weaponGlowLight = new THREE.PointLight(0xaa00ff, 1.0, 2);
      this.weaponGlowLight.position.set(0, 0.3, 0);
      this.swordMesh.add(this.weaponGlowLight);
    } else {
      // Default Iron Longsword
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

      // Wall collision resolution
      this.collision.resolveWallCollision(this.transform.position, 0.4);
    }

    // Jump logic
    if (this.input.jumpRequested && this.isGrounded && this.stamina >= 10) {
      this.velocityY = this.jumpForce;
      this.isGrounded = false;
      this.stamina -= 10;
      EventBus.emit('PLAYER_STAMINA_CHANGE', { current: this.stamina, max: this.maxStamina });
    }

    // Apply gravity
    if (!this.isGrounded) {
      this.velocityY += this.gravity * delta;
      this.transform.position.y += this.velocityY * delta;

      if (this.transform.position.y <= this.defaultEyeHeight) {
        this.transform.position.y = this.defaultEyeHeight;
        this.velocityY = 0;
        this.isGrounded = true;
      }
    } else {
      // Head bobbing when grounded
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
    // Attack Cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
    }

    // Trigger Attack
    if (this.input.attackRequested && !this.isAttacking && this.attackCooldown <= 0 && this.stamina >= 15) {
      this.isAttacking = true;
      this.attackProgress = 0;
      this.attackCooldown = 0.55;
      this.stamina -= 15;
      EventBus.emit('PLAYER_STAMINA_CHANGE', { current: this.stamina, max: this.maxStamina });
      EventBus.emit('PLAYER_ATTACK_SWING');

      // Check hit enemies in arc
      const camDir = new THREE.Vector3();
      this.camera.getWorldDirection(camDir);
      const hitEnemies = this.collision.getEntitiesInArc(this.transform.position, camDir, 2.4, 80, enemies);

      hitEnemies.forEach((e) => {
        if (e.takeDamage) {
          e.takeDamage(this.attackPower);
        }
      });
    }

    // Animate Sword Swing
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

    // Animate Shield Blocking
    const targetShieldPos = this.input.isBlocking
      ? new THREE.Vector3(-0.1, -0.2, -0.35)
      : new THREE.Vector3(-0.4, -0.35, -0.45);
    const targetShieldRot = this.input.isBlocking
      ? new THREE.Euler(0.2, 0.1, 0)
      : new THREE.Euler(0.1, 0.4, -0.1);

    this.shieldMesh.position.lerp(targetShieldPos, delta * 10);
    this.shieldMesh.rotation.x = THREE.MathUtils.lerp(this.shieldMesh.rotation.x, targetShieldRot.x, delta * 10);
    this.shieldMesh.rotation.y = THREE.MathUtils.lerp(this.shieldMesh.rotation.y, targetShieldRot.y, delta * 10);

    // Emit block event ONLY on state change (prevents 60Hz sound repetition while holding RMB)
    if (this.input.isBlocking !== this.wasBlocking) {
      this.wasBlocking = this.input.isBlocking;
      EventBus.emit('PLAYER_BLOCK_TOGGLE', this.input.isBlocking);
    }
  }

  public damagePlayer(rawAmount: number): void {
    if (this.health.isDead) return;

    let finalDamage = rawAmount;

    // Shield mitigation
    if (this.input.isBlocking && this.stamina >= 10) {
      finalDamage = Math.floor(rawAmount * 0.15); // 85% block reduction
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
