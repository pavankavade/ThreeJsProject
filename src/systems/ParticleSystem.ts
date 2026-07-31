import * as THREE from 'three';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private sharedGeometry: THREE.BoxGeometry;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.sharedGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.08);
  }

  public spawnSparks(position: THREE.Vector3, count = 12, colorHex = 0xffcc44): void {
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.sharedGeometry, mat);
      mesh.position.copy(position);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 4
      );

      const maxLife = 0.3 + Math.random() * 0.3;

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: vel,
        life: maxLife,
        maxLife
      });
    }
  }

  public spawnLootBurst(position: THREE.Vector3): void {
    this.spawnSparks(position, 25, 0xffdd22);
  }

  public update(delta: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }

      // Physics integration
      p.velocity.y -= 9.8 * delta; // Gravity
      p.mesh.position.addScaledVector(p.velocity, delta);

      // Fade & scale out
      const scale = p.life / p.maxLife;
      p.mesh.scale.setScalar(scale);
    }
  }
}
