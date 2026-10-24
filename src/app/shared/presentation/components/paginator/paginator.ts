import { Component, computed, effect, input, model } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Compact pager for long lists and tables: a page-size dropdown, the visible
 * range ("1–5 of 206") and previous/next buttons. The parent owns the slicing;
 * use `paginate()` below to cut its rows with the same page/pageSize.
 */
@Component({
  selector: 'app-paginator',
  standalone: true,
  imports: [MatIconModule, TranslatePipe],
  templateUrl: './paginator.html',
  styleUrl: './paginator.css',
})
export class PaginatorComponent {
  readonly total           = input.required<number>();
  readonly pageSizeOptions = input<number[]>([5, 10, 20]);
  readonly page            = model(0);
  readonly pageSize        = model(5);

  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  readonly rangeStart = computed(() => (this.total() === 0 ? 0 : this.page() * this.pageSize() + 1));
  readonly rangeEnd   = computed(() => Math.min(this.total(), (this.page() + 1) * this.pageSize()));

  constructor() {
    // Data can shrink under the current page (a reload, a filter); fall back to the last page.
    effect(() => {
      if (this.page() > this.pageCount() - 1) this.page.set(this.pageCount() - 1);
    });
  }

  setPageSize(value: string): void {
    this.pageSize.set(Number(value));
    this.page.set(0);
  }

  previous(): void { if (this.page() > 0) this.page.update(p => p - 1); }
  next(): void     { if (this.page() < this.pageCount() - 1) this.page.update(p => p + 1); }
}

export function paginate<T>(rows: T[], page: number, pageSize: number): T[] {
  return rows.slice(page * pageSize, (page + 1) * pageSize);
}
