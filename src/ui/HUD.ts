import { EventBus } from '../core/EventBus';
import type { LootItem } from '../entities/Chest';
import { Minimap } from './Minimap';
import { FullMapUI } from './FullMapUI';
import { DarkAndDarkerEquipment } from '../systems/DarkAndDarkerEquipment';
import { DarkAndDarkerUI } from './DarkAndDarkerUI';

export class HUD {
  private container: HTMLElement;
  private healthBarFill!: HTMLElement;
  private healthText!: HTMLElement;
  private staminaBarFill!: HTMLElement;
  private crosshair!: HTMLElement;
  private interactPrompt!: HTMLElement;
  private lootNotification!: HTMLElement;
  private damageFlashOverlay!: HTMLElement;
  private gameOverOverlay!: HTMLElement;
  private gameStartOverlay!: HTMLElement;
  private gameClearedOverlay!: HTMLElement;

  public minimap!: Minimap;
  public fullMapUI!: FullMapUI;
  public dadUI!: DarkAndDarkerUI;

  constructor(equipment: DarkAndDarkerEquipment) {
    this.container = document.body;
    this.buildUI(equipment);
    this.registerEvents();
  }

  private buildUI(equipment: DarkAndDarkerEquipment): void {
    // --- HUD Root Wrapper ---
    const hudRoot = document.createElement('div');
    hudRoot.className = 'hud-root';

    // --- Dynamic Crosshair ---
    this.crosshair = document.createElement('div');
    this.crosshair.className = 'hud-crosshair';
    hudRoot.appendChild(this.crosshair);

    // --- Interaction Prompt ("Press E to Loot") ---
    this.interactPrompt = document.createElement('div');
    this.interactPrompt.className = 'hud-interact-prompt hidden';
    this.interactPrompt.textContent = '[E] Open Chest';
    hudRoot.appendChild(this.interactPrompt);

    // --- Top Left Stats Container (Health & Stamina) ---
    const statsContainer = document.createElement('div');
    statsContainer.className = 'hud-stats-card';

    // Health Row
    const healthLabel = document.createElement('div');
    healthLabel.className = 'hud-stat-label';
    healthLabel.textContent = 'HEALTH';
    statsContainer.appendChild(healthLabel);

    const healthTrack = document.createElement('div');
    healthTrack.className = 'hud-bar-track health';
    this.healthBarFill = document.createElement('div');
    this.healthBarFill.className = 'hud-bar-fill health';
    this.healthBarFill.style.width = '100%';
    healthTrack.appendChild(this.healthBarFill);
    statsContainer.appendChild(healthTrack);

    this.healthText = document.createElement('div');
    this.healthText.className = 'hud-stat-text';
    this.healthText.textContent = '100 / 100';
    statsContainer.appendChild(this.healthText);

    // Stamina Row
    const staminaLabel = document.createElement('div');
    staminaLabel.className = 'hud-stat-label';
    staminaLabel.textContent = 'STAMINA';
    statsContainer.appendChild(staminaLabel);

    const staminaTrack = document.createElement('div');
    staminaTrack.className = 'hud-bar-track stamina';
    this.staminaBarFill = document.createElement('div');
    this.staminaBarFill.className = 'hud-bar-fill stamina';
    this.staminaBarFill.style.width = '100%';
    staminaTrack.appendChild(this.staminaBarFill);
    statsContainer.appendChild(staminaTrack);

    hudRoot.appendChild(statsContainer);

    // --- Top Right Minimap Container ---
    this.minimap = new Minimap(hudRoot);

    // --- Full Map Overlay Modal ---
    this.fullMapUI = new FullMapUI(hudRoot);

    // --- Dark and Darker Equipment & Belt UI ---
    this.dadUI = new DarkAndDarkerUI(hudRoot, equipment);

    // --- Loot Notification Banner ---
    this.lootNotification = document.createElement('div');
    this.lootNotification.className = 'hud-loot-banner hidden';
    hudRoot.appendChild(this.lootNotification);

    // --- Screen Red Vignette Damage Flash ---
    this.damageFlashOverlay = document.createElement('div');
    this.damageFlashOverlay.className = 'hud-damage-overlay';
    hudRoot.appendChild(this.damageFlashOverlay);

    // --- Game Start Overlay ---
    this.gameStartOverlay = document.createElement('div');
    this.gameStartOverlay.className = 'hud-modal-overlay';

    const startCard = document.createElement('div');
    startCard.className = 'hud-modal-card';

    const title = document.createElement('h1');
    title.textContent = 'DUNGEON CRAWLER 3D';
    startCard.appendChild(title);

    const desc = document.createElement('p');
    desc.textContent = 'Dark and Darker style combat. Equip weapons, cycle potions/bandages on your belt, and escape!';
    startCard.appendChild(desc);

    const controls = document.createElement('div');
    controls.className = 'hud-controls-list';
    
    const c1 = document.createElement('div'); c1.textContent = 'WASD / Shift : Move & Sprint';
    const c2 = document.createElement('div'); c2.textContent = 'Space : Jump';
    const c3 = document.createElement('div'); c3.textContent = '1 : Primary Weapon | 2 : Offhand Shield';
    const c4 = document.createElement('div'); c4.textContent = '3 : Cycle & Equip Potions | 4 : Cycle Bandages';
    const c5 = document.createElement('div'); c5.textContent = 'Left Click : Attack / Hold to Drink & Bandage';
    const c6 = document.createElement('div'); c6.textContent = 'Right Click : Shield Block';
    const c7 = document.createElement('div'); c7.textContent = 'M : Full Map | TAB : Equipment & Stash';
    controls.appendChild(c1); controls.appendChild(c2); controls.appendChild(c3); controls.appendChild(c4); controls.appendChild(c5); controls.appendChild(c6); controls.appendChild(c7);
    startCard.appendChild(controls);

    const startBtn = document.createElement('button');
    startBtn.className = 'hud-btn-primary';
    startBtn.textContent = 'ENTER DUNGEON';
    startBtn.addEventListener('click', () => {
      EventBus.emit('GAME_START');
      this.gameStartOverlay.classList.add('hidden');
    });
    startCard.appendChild(startBtn);
    this.gameStartOverlay.appendChild(startCard);

    hudRoot.appendChild(this.gameStartOverlay);

    // --- Game Cleared Victory Modal ---
    this.gameClearedOverlay = document.createElement('div');
    this.gameClearedOverlay.className = 'hud-modal-overlay hidden';

    const victoryCard = document.createElement('div');
    victoryCard.className = 'hud-modal-card victory';

    const vicTitle = document.createElement('h1');
    vicTitle.textContent = 'DUNGEON CLEARED!';
    victoryCard.appendChild(vicTitle);

    const vicDesc = document.createElement('p');
    vicDesc.textContent = 'You reached the magical exit portal and escaped Floor 1 alive!';
    victoryCard.appendChild(vicDesc);

    const restartBtnVic = document.createElement('button');
    restartBtnVic.className = 'hud-btn-primary';
    restartBtnVic.textContent = 'ENTER FLOOR 2';
    restartBtnVic.addEventListener('click', () => {
      window.location.reload();
    });
    victoryCard.appendChild(restartBtnVic);

    this.gameClearedOverlay.appendChild(victoryCard);
    hudRoot.appendChild(this.gameClearedOverlay);

    // --- Game Over Modal ---
    this.gameOverOverlay = document.createElement('div');
    this.gameOverOverlay.className = 'hud-modal-overlay hidden';

    const deathCard = document.createElement('div');
    deathCard.className = 'hud-modal-card death';

    const deathTitle = document.createElement('h1');
    deathTitle.textContent = 'YOU DIED';
    deathCard.appendChild(deathTitle);

    const deathDesc = document.createElement('p');
    deathDesc.textContent = 'The skeletons claimed your soul in the dark depths.';
    deathCard.appendChild(deathDesc);

    const restartBtn = document.createElement('button');
    restartBtn.className = 'hud-btn-primary';
    restartBtn.textContent = 'TRY AGAIN';
    restartBtn.addEventListener('click', () => {
      window.location.reload();
    });
    deathCard.appendChild(restartBtn);

    this.gameOverOverlay.appendChild(deathCard);
    hudRoot.appendChild(this.gameOverOverlay);

    this.container.appendChild(hudRoot);
  }

  private registerEvents(): void {
    EventBus.on('PLAYER_HEALTH_CHANGE', (data: { current: number; max: number }) => {
      const pct = Math.max(0, Math.min(100, (data.current / data.max) * 100));
      this.healthBarFill.style.width = `${pct}%`;
      this.healthText.textContent = `${Math.ceil(data.current)} / ${data.max}`;
    });

    EventBus.on('PLAYER_STAMINA_CHANGE', (data: { current: number; max: number }) => {
      const pct = Math.max(0, Math.min(100, (data.current / data.max) * 100));
      this.staminaBarFill.style.width = `${pct}%`;
    });

    EventBus.on('PLAYER_HIT', () => {
      this.damageFlashOverlay.classList.add('flash');
      setTimeout(() => this.damageFlashOverlay.classList.remove('flash'), 300);
    });

    EventBus.on('CHEST_TARGETED', (targeted: boolean) => {
      if (targeted) {
        this.interactPrompt.classList.remove('hidden');
        this.crosshair.classList.add('active');
      } else {
        this.interactPrompt.classList.add('hidden');
        this.crosshair.classList.remove('active');
      }
    });

    EventBus.on('LOOT_ACQUIRED', (item: LootItem) => {
      this.lootNotification.replaceChildren();
      
      const title = document.createElement('div');
      title.className = 'hud-loot-title';
      title.textContent = `LOOTED: ${item.name}`;

      const desc = document.createElement('div');
      desc.className = 'hud-loot-desc';
      desc.textContent = item.description;

      this.lootNotification.appendChild(title);
      this.lootNotification.appendChild(desc);

      this.lootNotification.classList.remove('hidden');
      setTimeout(() => {
        this.lootNotification.classList.add('hidden');
      }, 3500);
    });

    EventBus.on('DUNGEON_CLEARED', () => {
      this.gameClearedOverlay.classList.remove('hidden');
    });

    EventBus.on('GAME_OVER', () => {
      this.gameOverOverlay.classList.remove('hidden');
    });
  }
}
