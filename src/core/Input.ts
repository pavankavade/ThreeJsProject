export class InputManager {
  private keys: Map<string, boolean> = new Map();
  private pointerLocked: boolean = false;
  
  public mouseDeltaX: number = 0;
  public mouseDeltaY: number = 0;
  public attackRequested: boolean = false;
  public interactRequested: boolean = false;
  public jumpRequested: boolean = false;
  public inventoryToggleRequested: boolean = false;
  public mapToggleRequested: boolean = false;
  public isBlocking: boolean = false;
  public selectedHotbarDigit: number | null = null;
  public wheelScrollDelta: number = 0;

  private domElement: HTMLElement;

  constructor(domElement: HTMLElement) {
    this.domElement = domElement;
    this.initListeners();
  }

  private initListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.set(e.code, true);
      if (e.code === 'KeyE') {
        this.interactRequested = true;
      }
      if (e.code === 'Space') {
        this.jumpRequested = true;
      }
      if (e.code === 'Tab' || e.code === 'KeyI') {
        e.preventDefault(); // Prevent tab focus shifting
        this.inventoryToggleRequested = true;
      }
      if (e.code === 'KeyM') {
        this.mapToggleRequested = true;
      }

      // Hotbar selection 1-9
      if (e.code.startsWith('Digit')) {
        const num = parseInt(e.code.replace('Digit', ''), 10);
        if (num >= 1 && num <= 9) {
          this.selectedHotbarDigit = num - 1; // 0-based index
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.set(e.code, false);
    });

    window.addEventListener('mousemove', (e) => {
      if (this.pointerLocked) {
        this.mouseDeltaX += e.movementX;
        this.mouseDeltaY += e.movementY;
      }
    });

    window.addEventListener('wheel', (e) => {
      if (this.pointerLocked) {
        this.wheelScrollDelta += Math.sign(e.deltaY);
      }
    });

    window.addEventListener('mousedown', (e) => {
      if (!this.pointerLocked) return;
      if (e.button === 0) { // Left click
        this.attackRequested = true;
      } else if (e.button === 2) { // Right click
        this.isBlocking = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) {
        this.isBlocking = false;
      }
    });

    // Prevent context menu on right click
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.domElement;
    });
  }

  public requestPointerLock(): void {
    this.domElement.requestPointerLock();
  }

  public exitPointerLock(): void {
    document.exitPointerLock();
  }

  public isPointerLocked(): boolean {
    return this.pointerLocked;
  }

  public isKeyDown(code: string): boolean {
    return !!this.keys.get(code);
  }

  public resetFrameDeltas(): void {
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.attackRequested = false;
    this.interactRequested = false;
    this.jumpRequested = false;
    this.inventoryToggleRequested = false;
    this.mapToggleRequested = false;
    this.selectedHotbarDigit = null;
    this.wheelScrollDelta = 0;
  }
}
