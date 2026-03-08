/**
 * TutorialSystem — Interactive overlay guiding new players through first 5 minutes.
 */

export interface TutorialStep {
  id: string;
  text: string;
  icon: string;
  condition: () => boolean;
}

export class TutorialSystem {
  private overlay: HTMLDivElement;
  private stepEl: HTMLDivElement;
  private steps: TutorialStep[];
  private currentIdx = 0;
  private completed = false;
  private visible = true;

  constructor() {
    this.steps = [];
    this.overlay = document.createElement('div');
    this.overlay.id = 'tutorial';
    this.overlay.style.cssText = 'position:fixed;bottom:120px;left:50%;transform:translateX(-50%);z-index:180;pointer-events:none;text-align:center;font-family:monospace;';

    this.stepEl = document.createElement('div');
    this.stepEl.style.cssText = 'background:rgba(0,0,0,0.75);color:#fff;padding:12px 24px;border-radius:8px;font-size:16px;border:1px solid rgba(241,196,15,0.4);transition:opacity 0.5s;max-width:400px;';
    this.overlay.appendChild(this.stepEl);
    document.body.appendChild(this.overlay);
  }

  /** Define tutorial steps with condition checks. */
  setSteps(steps: TutorialStep[]): void {
    this.steps = steps;
    this.currentIdx = 0;
    this.completed = false;
    this.showCurrent();
  }

  update(): void {
    if (this.completed || !this.visible || this.steps.length === 0) return;

    const step = this.steps[this.currentIdx];
    if (step.condition()) {
      this.currentIdx++;
      if (this.currentIdx >= this.steps.length) {
        this.complete();
      } else {
        this.showCurrent();
      }
    }
  }

  private showCurrent(): void {
    const step = this.steps[this.currentIdx];
    this.stepEl.innerHTML = `<span style="font-size:24px;">${step.icon}</span><br><span>${step.text}</span>`;
    this.stepEl.style.opacity = '1';
  }

  private complete(): void {
    this.completed = true;
    this.stepEl.innerHTML = '🎉 Tutorial complete! You\'re ready to explore!';
    setTimeout(() => { this.overlay.style.display = 'none'; }, 4000);
  }

  dismiss(): void {
    this.completed = true;
    this.overlay.style.display = 'none';
  }

  get isComplete(): boolean { return this.completed; }
  destroy(): void { this.overlay.remove(); }
}
