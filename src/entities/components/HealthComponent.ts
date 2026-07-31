export class HealthComponent {
  public current: number;
  public max: number;
  public isDead: boolean = false;
  public invulnerableTimer: number = 0;

  constructor(maxHealth: number) {
    this.max = maxHealth;
    this.current = maxHealth;
  }

  public takeDamage(amount: number): boolean {
    if (this.isDead || this.invulnerableTimer > 0) return false;
    this.current = Math.max(0, this.current - amount);
    if (this.current <= 0) {
      this.isDead = true;
    }
    return true;
  }

  public heal(amount: number): void {
    if (this.isDead) return;
    this.current = Math.min(this.max, this.current + amount);
  }

  public update(delta: number): void {
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer = Math.max(0, this.invulnerableTimer - delta);
    }
  }
}
