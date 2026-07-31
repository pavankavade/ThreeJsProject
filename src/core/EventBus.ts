export type GameEventType =
  | 'PLAYER_HEALTH_CHANGE'
  | 'PLAYER_STAMINA_CHANGE'
  | 'PLAYER_ATTACK_SWING'
  | 'PLAYER_BLOCK_TOGGLE'
  | 'PLAYER_HIT'
  | 'ENEMY_HIT'
  | 'ENEMY_DIED'
  | 'CHEST_TARGETED'
  | 'CHEST_OPENED'
  | 'LOOT_ACQUIRED'
  | 'INVENTORY_UPDATED'
  | 'HOTBAR_SLOT_CHANGED'
  | 'DUNGEON_CLEARED'
  | 'SCREEN_SHAKE'
  | 'GAME_START'
  | 'GAME_OVER'
  | 'GAME_RESTART';

export type EventCallback<T = any> = (data: T) => void;

class EventBusService {
  private listeners: Map<GameEventType, Set<EventCallback>> = new Map();

  public on<T = any>(event: GameEventType, callback: EventCallback<T>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public off<T = any>(event: GameEventType, callback: EventCallback<T>): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  public emit<T = any>(event: GameEventType, data?: T): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error handling event ${event}:`, err);
        }
      });
    }
  }
}

export const EventBus = new EventBusService();
