import { Directive, HostListener, Input, inject } from '@angular/core';
import { ContextMenuService, ContextMenuItem } from '../../application/context-menu.service';

@Directive({
  selector: '[appContextMenu]',
  standalone: true,
})
export class ContextMenuDirective {
  @Input('appContextMenu') items: ContextMenuItem[] = [];
  private svc = inject(ContextMenuService);

  @HostListener('contextmenu', ['$event'])
  onRightClick(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    if (this.items?.length) {
      this.svc.show(this.items, e.clientX, e.clientY);
    }
  }
}
