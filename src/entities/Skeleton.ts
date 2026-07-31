import * as THREE from 'three';
import { Entity } from './Entity';
import { HealthComponent } from './components/HealthComponent';
import { ColliderComponent, CollisionLayer } from './components/ColliderComponent';
import { EventBus } from '../core/EventBus';
import { CollisionSystem } from '../systems/CollisionSystem';

export const SkeletonAIState = {
  IDLE: 0,
  CHASE: 1,
  TELEGRAPH: 2,
  ATTACK: 3,
  STAGGER: 4,
  DEAD: 5
} as const;

export type SkeletonAIStateType = typeof SkeletonAIState[keyof typeof SkeletonAIState];

export class Skeleton extends Entity {
  public health: HealthComponent;
  public collider: ColliderComponent;
  public state: SkeletonAIStateType = SkeletonAIState.IDLE;

  private moveSpeed: number = 2.0;
  private attackRadius: number = 1.8;
  private stateTimer: number = 0;
  private rightArmPivot!: THREE.Group;
  private leftArmPivot!: THREE.Group;
  private bodyGroup!: THREE.Group;

  constructor(x: number, z: number) {
    super('Skeleton');
    this.transform.position.set(x, 0.9, z);
    this.health = new HealthComponent(60);
    this.collider = new ColliderComponent(0.45, 1.8, CollisionLayer.ENEMY);
    this.createSkeletonMesh();
  }

  private createSkeletonMesh(): void {
    this.bodyGroup = new THREE.Group();

    // Weathered bone materials
    const boneMat = new THREE.MeshStandardMaterial({
      color: 0xded6c5,
      roughness: 0.65,
      metalness: 0.05
    });
    const darkSocketMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
    const redEyeMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });
    const rustedIronMat = new THREE.MeshStandardMaterial({
      color: 0x5a483c,
      metalness: 0.7,
      roughness: 0.5
    });
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x8a9ba8,
      metalness: 0.85,
      roughness: 0.25
    });

    // ================= SKULL =================
    const skullGroup = new THREE.Group();
    skullGroup.position.set(0, 0.72, 0);

    // Cranium
    const craniumGeo = new THREE.SphereGeometry(0.18, 12, 10);
    craniumGeo.scale(1, 1.1, 1.05);
    const cranium = new THREE.Mesh(craniumGeo, boneMat);
    skullGroup.add(cranium);

    // Jaw / Mandible
    const jawGeo = new THREE.BoxGeometry(0.16, 0.1, 0.18);
    const jaw = new THREE.Mesh(jawGeo, boneMat);
    jaw.position.set(0, -0.12, 0.04);
    skullGroup.add(jaw);

    // Eye Sockets (Deep black insets)
    const socketGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const socketL = new THREE.Mesh(socketGeo, darkSocketMat);
    socketL.position.set(-0.07, 0.02, 0.14);
    const socketR = new THREE.Mesh(socketGeo, darkSocketMat);
    socketR.position.set(0.07, 0.02, 0.14);
    skullGroup.add(socketL, socketR);

    // Glowing Red Eyes deep inside sockets
    const eyeEmbers = new THREE.SphereGeometry(0.02, 6, 6);
    const emberL = new THREE.Mesh(eyeEmbers, redEyeMat);
    emberL.position.set(-0.07, 0.02, 0.16);
    const emberR = new THREE.Mesh(eyeEmbers, redEyeMat);
    emberR.position.set(0.07, 0.02, 0.16);
    skullGroup.add(emberL, emberR);

    // Nose Cavity
    const noseGeo = new THREE.ConeGeometry(0.03, 0.06, 3);
    const nose = new THREE.Mesh(noseGeo, darkSocketMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, -0.04, 0.17);
    skullGroup.add(nose);

    this.bodyGroup.add(skullGroup);

    // ================= TORSO & SPINE =================
    // Vertebral Column (6 stacked vertebrae)
    for (let i = 0; i < 6; i++) {
      const vertGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.06, 8);
      const vert = new THREE.Mesh(vertGeo, boneMat);
      vert.position.set(0, 0.5 - i * 0.08, -0.02);
      this.bodyGroup.add(vert);
    }

    // Ribcage (5 curved rib loops forming hollow chest cavity)
    for (let i = 0; i < 5; i++) {
      const ribGeo = new THREE.TorusGeometry(0.18 - i * 0.01, 0.02, 6, 12, Math.PI * 1.3);
      const rib = new THREE.Mesh(ribGeo, boneMat);
      rib.rotation.x = Math.PI / 2;
      rib.rotation.z = -Math.PI * 0.15;
      rib.position.set(0, 0.48 - i * 0.07, 0.02);
      this.bodyGroup.add(rib);
    }

    // Sternum (Chest Plate Bone)
    const sternumGeo = new THREE.BoxGeometry(0.04, 0.3, 0.02);
    const sternum = new THREE.Mesh(sternumGeo, boneMat);
    sternum.position.set(0, 0.35, 0.16);
    this.bodyGroup.add(sternum);

    // Collarbones (Clavicle)
    const clavicleGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.45);
    const clavicle = new THREE.Mesh(clavicleGeo, boneMat);
    clavicle.rotation.z = Math.PI / 2;
    clavicle.position.set(0, 0.54, 0.04);
    this.bodyGroup.add(clavicle);

    // Pelvis Basin Bone
    const pelvisGeo = new THREE.TorusGeometry(0.16, 0.04, 6, 12, Math.PI);
    const pelvis = new THREE.Mesh(pelvisGeo, boneMat);
    pelvis.rotation.x = -Math.PI / 2;
    pelvis.position.set(0, 0.02, 0);
    this.bodyGroup.add(pelvis);

    // ================= LEGS =================
    for (const side of [-1, 1]) {
      const legGroup = new THREE.Group();
      legGroup.position.set(side * 0.14, 0.0, 0);

      // Femur (Upper Leg)
      const femurGeo = new THREE.CylinderGeometry(0.035, 0.03, 0.42);
      const femur = new THREE.Mesh(femurGeo, boneMat);
      femur.position.set(0, -0.21, 0);
      legGroup.add(femur);

      // Knee Joint
      const kneeGeo = new THREE.SphereGeometry(0.045, 8, 8);
      const knee = new THREE.Mesh(kneeGeo, boneMat);
      knee.position.set(0, -0.42, 0);
      legGroup.add(knee);

      // Tibia & Fibula (Lower Leg)
      const tibiaGeo = new THREE.CylinderGeometry(0.03, 0.025, 0.42);
      const tibia = new THREE.Mesh(tibiaGeo, boneMat);
      tibia.position.set(0, -0.63, 0);
      legGroup.add(tibia);

      this.bodyGroup.add(legGroup);
    }

    // ================= ARMS & WEAPONS =================
    // Right Arm Pivot (Holding Rusty Broadsword)
    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.26, 0.52, 0);

    const shoulderR = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), boneMat);
    this.rightArmPivot.add(shoulderR);

    // Rusted Pauldron (Armor guard)
    const pauldronR = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2), rustedIronMat);
    pauldronR.position.set(0, 0.02, 0);
    this.rightArmPivot.add(pauldronR);

    const humerusR = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.35), boneMat);
    humerusR.position.set(0, -0.18, 0);
    this.rightArmPivot.add(humerusR);

    const forearmR = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.35), boneMat);
    forearmR.position.set(0, -0.38, 0.1);
    forearmR.rotation.x = Math.PI / 4;
    this.rightArmPivot.add(forearmR);

    // Rusty Broadsword
    const hiltR = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15), rustedIronMat);
    hiltR.position.set(0, -0.48, 0.22);
    hiltR.rotation.x = Math.PI / 4;

    const crossguardR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.04), rustedIronMat);
    crossguardR.position.set(0, -0.45, 0.27);
    crossguardR.rotation.x = Math.PI / 4;

    const swordBlade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 0.015), bladeMat);
    swordBlade.position.set(0, -0.85, 0.65);
    swordBlade.rotation.x = Math.PI / 4;

    this.rightArmPivot.add(hiltR, crossguardR, swordBlade);
    this.bodyGroup.add(this.rightArmPivot);

    // Left Arm Pivot (Holding Tattered Skeleton Shield)
    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.26, 0.52, 0);

    const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), boneMat);
    this.leftArmPivot.add(shoulderL);

    const humerusL = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.35), boneMat);
    humerusL.position.set(0, -0.18, 0);
    this.leftArmPivot.add(humerusL);

    const forearmL = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.35), boneMat);
    forearmL.position.set(0, -0.35, 0.12);
    forearmL.rotation.x = Math.PI / 3;
    this.leftArmPivot.add(forearmL);

    // Tattered Round Iron Shield
    const shieldGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.03, 12);
    const roundShield = new THREE.Mesh(shieldGeo, rustedIronMat);
    roundShield.rotation.x = Math.PI / 2;
    roundShield.position.set(-0.05, -0.38, 0.25);
    this.leftArmPivot.add(roundShield);

    this.bodyGroup.add(this.leftArmPivot);

    this.bodyGroup.position.copy(this.transform.position);
    this.mesh = this.bodyGroup;
  }

  public takeDamage(amount: number): boolean {
    const wasHit = this.health.takeDamage(amount);
    if (wasHit) {
      EventBus.emit('ENEMY_HIT', { position: this.transform.position.clone() });
      if (this.health.isDead) {
        this.state = SkeletonAIState.DEAD;
        EventBus.emit('ENEMY_DIED', { position: this.transform.position.clone() });
      } else {
        this.state = SkeletonAIState.STAGGER;
        this.stateTimer = 0.3;
      }
    }
    return wasHit;
  }

  public updateAI(
    delta: number,
    playerPos: THREE.Vector3,
    collision: CollisionSystem,
    onAttackPlayer: (dmg: number) => void
  ): void {
    if (this.state === SkeletonAIState.DEAD) {
      if (this.mesh) {
        this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, -Math.PI / 2, delta * 6);
        this.mesh.position.y = THREE.MathUtils.lerp(this.mesh.position.y, 0.1, delta * 6);
      }
      return;
    }

    this.health.update(delta);
    const distToPlayer = this.transform.position.distanceTo(playerPos);

    // Rotate body towards player if active
    if (this.state !== SkeletonAIState.STAGGER) {
      const angle = Math.atan2(playerPos.x - this.transform.position.x, playerPos.z - this.transform.position.z);
      this.transform.rotation.y = angle;
    }

    switch (this.state) {
      case SkeletonAIState.IDLE:
        if (distToPlayer < 9.0) {
          this.state = SkeletonAIState.CHASE;
        }
        break;

      case SkeletonAIState.CHASE:
        if (distToPlayer <= this.attackRadius) {
          this.state = SkeletonAIState.TELEGRAPH;
          this.stateTimer = 0.5; // Windup duration
        } else {
          // Move towards player with wall sliding collision
          const dir = playerPos.clone().sub(this.transform.position);
          dir.y = 0;
          dir.normalize();

          // Move step
          this.transform.position.addScaledVector(dir, this.moveSpeed * delta);

          // Resolve wall collision to ensure skeleton NEVER phases through walls
          collision.resolveWallCollision(this.transform.position, this.collider.radius);
        }
        break;

      case SkeletonAIState.TELEGRAPH:
        this.stateTimer -= delta;
        // Raise arm back to telegraph
        this.rightArmPivot.rotation.x = THREE.MathUtils.lerp(this.rightArmPivot.rotation.x, -Math.PI * 0.7, delta * 10);
        if (this.stateTimer <= 0) {
          this.state = SkeletonAIState.ATTACK;
          this.stateTimer = 0.25; // Attack swing duration
          if (distToPlayer <= this.attackRadius + 0.5) {
            onAttackPlayer(20);
          }
        }
        break;

      case SkeletonAIState.ATTACK:
        this.stateTimer -= delta;
        // Slash arm forward
        this.rightArmPivot.rotation.x = THREE.MathUtils.lerp(this.rightArmPivot.rotation.x, Math.PI * 0.4, delta * 15);
        if (this.stateTimer <= 0) {
          this.state = SkeletonAIState.CHASE;
        }
        break;

      case SkeletonAIState.STAGGER:
        this.stateTimer -= delta;
        this.rightArmPivot.rotation.x = -Math.PI * 0.2;
        if (this.stateTimer <= 0) {
          this.state = SkeletonAIState.CHASE;
        }
        break;
    }

    this.update(delta);
  }
}
