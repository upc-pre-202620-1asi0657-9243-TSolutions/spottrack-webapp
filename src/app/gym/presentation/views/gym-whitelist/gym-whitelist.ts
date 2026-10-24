import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { AdminGymStore } from '../../../application/admin-gym.store';
import { WhitelistStore } from '../../../application/whitelist.store';
import { WhitelistEntryResource } from '../../../infrastructure/whitelist-api';
import { PaginatorComponent, paginate } from '../../../../shared/presentation/components/paginator/paginator';

/** member: joined this gym · registered: has an account, hasn't joined · pending: nobody signed up with the DNI yet. */
export type WhitelistStatus = 'member' | 'registered' | 'pending';
type StatusFilter = 'all' | WhitelistStatus;

export interface WhitelistRow extends WhitelistEntryResource {
  status: WhitelistStatus;
  initials: string;
}

@Component({
  selector: 'app-gym-whitelist',
  standalone: true,
  imports: [FormsModule, TranslateModule, MatIconModule, PaginatorComponent],
  templateUrl: './gym-whitelist.html',
  styleUrl:    './gym-whitelist.scss',
})
export class GymWhitelistComponent {
  readonly adminGymStore  = inject(AdminGymStore);
  readonly whitelistStore = inject(WhitelistStore);

  dniInput = '';
  readonly dniFormatError = signal<string | null>(null);

  readonly search       = signal('');
  readonly statusFilter = signal<StatusFilter>('all');
  readonly page         = signal(0);
  readonly pageSize     = signal(10);

  readonly gymId = computed(() => this.adminGymStore.primaryGym()?.gymId ?? null);

  readonly rows = computed<WhitelistRow[]>(() =>
    this.whitelistStore.whitelist()
      .map(entry => ({
        ...entry,
        status: (entry.joined ? 'member' : entry.fullName ? 'registered' : 'pending') as WhitelistStatus,
        initials: initialsOf(entry.fullName),
      }))
      // Named members first, alphabetically; DNIs nobody claimed yet at the end.
      .sort((a, b) => (a.fullName ? 0 : 1) - (b.fullName ? 0 : 1)
        || (a.fullName ?? a.dni).localeCompare(b.fullName ?? b.dni))
  );

  readonly counts = computed(() => {
    const rows = this.rows();
    return {
      total:      rows.length,
      member:     rows.filter(r => r.status === 'member').length,
      registered: rows.filter(r => r.status === 'registered').length,
      pending:    rows.filter(r => r.status === 'pending').length,
    };
  });

  readonly filteredRows = computed(() => {
    const term   = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return this.rows().filter(r =>
      (status === 'all' || r.status === status) &&
      (!term || r.dni.includes(term)
        || (r.fullName ?? '').toLowerCase().includes(term)
        || (r.email ?? '').toLowerCase().includes(term))
    );
  });

  readonly pagedRows = computed(() => paginate(this.filteredRows(), this.page(), this.pageSize()));

  constructor() {
    this.adminGymStore.load();

    // Load whitelist as soon as the admin's gym resolves.
    effect(() => {
      const id = this.gymId();
      if (id) this.whitelistStore.load(id);
    });
  }

  setSearch(value: string): void {
    this.search.set(value);
    this.page.set(0);
  }

  setStatusFilter(value: StatusFilter): void {
    this.statusFilter.set(value);
    this.page.set(0);
  }

  addDni(): void {
    const dni = this.dniInput.trim();
    this.dniFormatError.set(null);
    this.whitelistStore.clearAddError();

    if (!/^[0-9]{8}$/.test(dni)) {
      this.dniFormatError.set('whitelist.error.invalidFormat');
      return;
    }

    const id = this.gymId();
    if (!id) return;

    this.dniInput = '';
    this.whitelistStore.addDni(id, dni);
  }

  removeDni(dni: string): void {
    const id = this.gymId();
    if (!id) return;
    this.whitelistStore.removeDni(id, dni);
  }

  onDniInputChange(): void {
    this.dniFormatError.set(null);
    this.whitelistStore.clearAddError();
  }
}

function initialsOf(fullName: string | null | undefined): string {
  if (!fullName) return '';
  return fullName.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
