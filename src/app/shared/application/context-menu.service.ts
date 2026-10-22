import { Injectable, signal } from '@angular/core';

export interface ContextMenuItem {
  label: string;
  icon: string;
  action: () => void;
  separator?: boolean;
}

interface MenuState {
  items: ContextMenuItem[];
  x: number;
  y: number;
}

@Injectable({ providedIn: 'root' })
export class ContextMenuService {
  private _state = signal<MenuState | null>(null);
  readonly state = this._state.asReadonly();

  show(items: ContextMenuItem[], x: number, y: number): void {
    const menuW = 195;
    const itemH = 36;
    const sepH  = 9;
    const menuH = items.reduce((h, i) => h + (i.separator ? sepH : itemH), 8);
    const safeX = Math.max(4, Math.min(x, window.innerWidth  - menuW - 8));
    const safeY = Math.max(4, Math.min(y, window.innerHeight - menuH - 8));
    this._state.set({ items, x: safeX, y: safeY });
  }

  hide(): void {
    this._state.set(null);
  }
}
