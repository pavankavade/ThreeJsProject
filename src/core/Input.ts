export class InputManager {
  private keys: Map<string, boolean> = new Map();
  private pointerLocked: boolean = false;
  
  public mouseDeltaX: number = 0;
  public mouseDeltaY: number = 0;
  public isMouseDownLeft: boolean = false;
  public attackRequested: boolean = false;
  public interactRequested: boolean = false;
  public jumpRequested: boolean = false;
  public inventoryToggleRequested: boolean = false;
  public mapToggleRequested: boolean = false;
  public viewToggleRequested: boolean = false;
  public isBlocking: boolean = false;

  public slotKey1Pressed: boolean = false;
  public slotKey2Pressed: boolean = false;
  public slotKey3Pressed: boolean = false;
  public slotKey4Pressed: boolean = false;

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
        e.preventDefault();
        this.inventoryToggleRequested = true;
      }
      if (e.code === 'KeyM') {
        this.mapToggleRequested = true;
      }
      if (e.code === 'KeyV') {
        this.viewToggleRequested = true;
      }

      // Slot Keys 1, 2, 3, 4
      if (e.code === 'Digit1') this.slotKey1Pressed = true;
      if (e.code === 'Digit2') this.slotKey2Pressed = true;
      if (e.code === 'Digit3') this.slotKey3Pressed = true;
      if (e.code === 'Digit4') this.slotKey4Pressed = true;
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

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Left click down
        this.isMouseDownLeft = true;
        if (this.pointerLocked) {
          this.attackRequested = true;
        }
      } else if (e.button === 2 && this.pointerLocked) { // Right click
        this.isBlocking = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) { // Left click up
        this.isMouseDownLeft = false;
      } else if (e.button === 2) {
        this.isBlocking = false;
      }
    });

    this.domElement.addEventListener('click', () => {
      if (!this.pointerLocked) {
        this.requestPointerLock();
      }
    });

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
    this.viewToggleRequested = false;
    this.slotKey1Pressed = false;
    this.slotKey2Pressed = false;
    this.slotKey3Pressed = false;
    this.slotKey4Pressed = false;
  }
}
