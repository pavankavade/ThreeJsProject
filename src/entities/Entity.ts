import * as THREE from 'three';
import { TransformComponent } from './components/TransformComponent';

let nextEntityId = 1;

export class Entity {
  public id: number;
  public name: string;
  public transform: TransformComponent;
  public mesh: THREE.Object3D | null = null;
  public active: boolean = true;

  constructor(name = 'Entity') {
    this.id = nextEntityId++;
    this.name = name;
    this.transform = new TransformComponent();
  }

  public update(_delta: number): void {
    if (this.mesh) {
      this.mesh.position.copy(this.transform.position);
      this.mesh.rotation.copy(this.transform.rotation);
    }
  }

  public destroy(): void {
    this.active = false;
    if (this.mesh && this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
  }
}
