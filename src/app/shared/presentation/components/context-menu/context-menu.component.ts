import { Component, HostListener, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ContextMenuService } from '../../../application/context-menu.service';

@Component({
  selector: 'app-context-menu',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './context-menu.component.html',
  styleUrl: './context-menu.component.css',
})
export class ContextMenuComponent {
  readonly svc = inject(ContextMenuService);

  @HostListener('document:click')
  onDocumentClick(): void { this.svc.hide(); }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.svc.hide(); }

  run(action: () => void, e: MouseEvent): void {
    e.stopPropagation();
    action();
    this.svc.hide();
  }
}
