import * as THREE from 'three';

export class TransformComponent {
  public position: THREE.Vector3 = new THREE.Vector3();
  public rotation: THREE.Euler = new THREE.Euler(0, 0, 0, 'YXZ');
  public scale: THREE.Vector3 = new THREE.Vector3(1, 1, 1);
  public velocity: THREE.Vector3 = new THREE.Vector3();

  constructor(x = 0, y = 0, z = 0) {
    this.position.set(x, y, z);
  }
}
