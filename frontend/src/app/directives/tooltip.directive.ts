import { Directive, Input, HostListener, OnDestroy, ElementRef, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appTooltip]',
  standalone: true
})
export class TooltipDirective implements OnDestroy {
  @Input('appTooltip') tooltipText: string = '';
  @Input() tooltipEnabled: boolean = true;

  private tooltipEl: HTMLElement | null = null;
  private touchTimer: any;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  // --- Mouse Events ---
  @HostListener('mouseenter')
  onMouseEnter() {
    if (!this.tooltipEnabled || !this.tooltipText) return;
    this.show();
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    this.hide();
  }

  // --- Touch Events (Mobile/Tablet Support) ---
  @HostListener('touchstart', ['$event'])
  onTouchStart(e: TouchEvent) {
    if (!this.tooltipEnabled || !this.tooltipText) return;
    
    // Clear any existing timer
    if (this.touchTimer) clearTimeout(this.touchTimer);

    // Start a long-press timer (600ms)
    this.touchTimer = setTimeout(() => {
      this.show();
      // Optional: Gentle haptic feedback if supported
      if ('vibrate' in navigator) navigator.vibrate(25);
    }, 600);
  }

  @HostListener('touchend')
  @HostListener('touchmove')
  @HostListener('touchcancel')
  onTouchEnd() {
    if (this.touchTimer) clearTimeout(this.touchTimer);
    // Hide after 3 seconds on mobile to give user time to read
    setTimeout(() => this.hide(), 3000);
  }

  @HostListener('click')
  onClick() {
    this.hide();
  }

  private show() {
    this.hide(); 

    const rect = this.el.nativeElement.getBoundingClientRect();

    this.tooltipEl = this.renderer.createElement('div');
    this.renderer.addClass(this.tooltipEl, 'app-tooltip-popup');
    this.renderer.setProperty(this.tooltipEl, 'innerText', this.tooltipText);

    // Initial styles to measure size
    this.renderer.setStyle(this.tooltipEl, 'position', 'fixed');
    this.renderer.setStyle(this.tooltipEl, 'visibility', 'hidden');
    this.renderer.setStyle(this.tooltipEl, 'white-space', 'nowrap');
    this.renderer.setStyle(this.tooltipEl, 'padding', '8px 14px');
    this.renderer.setStyle(this.tooltipEl, 'font-size', '0.75rem');
    this.renderer.setStyle(this.tooltipEl, 'z-index', '99999');
    
    this.renderer.appendChild(document.body, this.tooltipEl);

    // Measure the tooltip
    const tooltipRect = this.tooltipEl!.getBoundingClientRect();
    const margin = 12;
    const viewportWidth = window.innerWidth;

    // Logic: Default to RIGHT, but flip to LEFT if overflows
    let left = rect.right + margin;
    let isFlipped = false;

    if (left + tooltipRect.width > viewportWidth - 10) {
      left = rect.left - tooltipRect.width - margin;
      isFlipped = true;
    }

    // Apply Final Styles
    const finalStyle = `
      position: fixed;
      left: ${left}px;
      top: ${rect.top + rect.height / 2}px;
      transform: translateY(-50%);
      background: rgba(15, 23, 42, 0.98);
      color: #f8fafc;
      font-size: 0.75rem;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      padding: 8px 14px;
      border-radius: 8px;
      white-space: nowrap;
      pointer-events: none;
      z-index: 99999;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.4), 0 4px 10px -2px rgba(0,0,0,0.2);
      backdrop-filter: blur(12px);
      animation: tooltipFadeIn 0.15s ease-out forwards;
      visibility: visible;
    `;
    this.renderer.setAttribute(this.tooltipEl, 'style', finalStyle);

    // Add Arrow based on flip state
    const arrow = this.renderer.createElement('span');
    const arrowStyle = isFlipped 
      ? `
        position: absolute;
        right: -5px;
        top: 50%;
        transform: translateY(-50%);
        border: 5px solid transparent;
        border-left-color: rgba(15, 23, 42, 0.98);
        border-right: none;
      `
      : `
        position: absolute;
        left: -5px;
        top: 50%;
        transform: translateY(-50%);
        border: 5px solid transparent;
        border-right-color: rgba(15, 23, 42, 0.98);
        border-left: none;
      `;
    this.renderer.setAttribute(arrow, 'style', arrowStyle);
    this.renderer.appendChild(this.tooltipEl, arrow);
  }

  private hide() {
    if (this.tooltipEl) {
      this.renderer.removeChild(document.body, this.tooltipEl);
      this.tooltipEl = null;
    }
  }

  ngOnDestroy() {
    this.hide();
  }
}
