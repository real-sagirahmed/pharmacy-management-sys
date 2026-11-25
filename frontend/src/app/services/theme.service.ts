import { Injectable, signal, effect } from '@angular/core';

export type S7Theme = 's7-light' | 's7-dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 's7-theme';
  public readonly theme = signal<S7Theme>('s7-light');

  constructor() {
    this.initTheme();
  }

  private initTheme(): void {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem(this.STORAGE_KEY) as S7Theme | null;
      const initialTheme: S7Theme = savedTheme === 's7-dark' ? 's7-dark' : 's7-light';
      this.setTheme(initialTheme);
    }
  }

  public toggleTheme(): void {
    const nextTheme: S7Theme = this.theme() === 's7-light' ? 's7-dark' : 's7-light';
    this.setTheme(nextTheme);
  }

  public setTheme(newTheme: S7Theme): void {
    this.theme.set(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    }
  }

  public isDark(): boolean {
    return this.theme() === 's7-dark';
  }
}
