import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { ThemeService } from '../../../application/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [MatIconModule, TranslatePipe],
  template: `
    <button type="button" class="theme-toggle" (click)="theme.toggle()"
            [attr.aria-label]="(theme.theme() === 'dark' ? 'shared.theme.toLight' : 'shared.theme.toDark') | translate"
            [title]="(theme.theme() === 'dark' ? 'shared.theme.toLight' : 'shared.theme.toDark') | translate">
      <mat-icon>{{ theme.theme() === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
    </button>
  `,
  styles: `
    .theme-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      padding: 0;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      color: var(--text-muted);
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .theme-toggle:hover {
      background: var(--surface-hover);
      color: var(--text);
    }
    .theme-toggle:focus-visible {
      outline: none;
      box-shadow: var(--focus-ring);
    }
    mat-icon { font-size: 20px; width: 20px; height: 20px; }
  `,
})
export class ThemeToggle {
  readonly theme = inject(ThemeService);
}
