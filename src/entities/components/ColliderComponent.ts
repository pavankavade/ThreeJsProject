export const CollisionLayer = {
  NONE: 0,
  PLAYER: 1 << 0,
  ENEMY: 1 << 1,
  WALL: 1 << 2,
  INTERACTABLE: 1 << 3
} as const;

export type CollisionLayerType = typeof CollisionLayer[keyof typeof CollisionLayer];

export class ColliderComponent {
  public radius: number;
  public height: number;
  public layer: CollisionLayerType;

  constructor(radius = 0.5, height = 1.8, layer: CollisionLayerType = CollisionLayer.NONE) {
    this.radius = radius;
    this.height = height;
    this.layer = layer;
  }
}
