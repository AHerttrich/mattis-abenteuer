/**
 * InputManager — Tracks keyboard and mouse state.
 */

export class InputManager {
  private keys = new Set<string>();
  private mouseButtons = new Set<number>();
  private _mouseDX = 0;
  private _mouseDY = 0;
  private _isPointerLocked = false;
  private canvas: HTMLElement | null = null;

  constructor() {
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onPointerLockChange = this.onPointerLockChange.bind(this);
  }

  init(canvas: HTMLElement): void {
    this.canvas = canvas;
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    canvas.addEventListener('click', () => {
      if (!this._isPointerLocked) canvas.requestPointerLock();
    });
  }

  isKeyDown(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }
  isMouseDown(button: number): boolean {
    return this.mouseButtons.has(button);
  }
  get mouseDX(): number {
    return this._mouseDX;
  }
  get mouseDY(): number {
    return this._mouseDY;
  }
  get isPointerLocked(): boolean {
    return this._isPointerLocked;
  }

  /** Call at end of frame to reset deltas */
  resetDeltas(): void {
    this._mouseDX = 0;
    this._mouseDY = 0;
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.key.toLowerCase());
  }
  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.key.toLowerCase());
  }
  private onMouseDown(e: MouseEvent): void {
    this.mouseButtons.add(e.button);
  }
  private onMouseUp(e: MouseEvent): void {
    this.mouseButtons.delete(e.button);
  }
  private onMouseMove(e: MouseEvent): void {
    if (!this._isPointerLocked) return;
    this._mouseDX += e.movementX;
    this._mouseDY += e.movementY;
  }
  private onPointerLockChange(): void {
    this._isPointerLocked = document.pointerLockElement === this.canvas;
  }

  destroy(): void {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
  }
}
