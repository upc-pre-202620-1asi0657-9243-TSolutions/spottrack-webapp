import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MaintenanceStore } from '../../../application/maintenance.store';
import { EquipmentStore } from '../../../../gym/application/equipment.store';
import { AuthStore } from '../../../../auth/application/auth.store';
import { TicketPriority, TicketType } from '../../../domain/model/maintenance-ticket.entity';

interface NewTicketForm {
  equipmentId:     string | null;
  description:     string;
  priority:        TicketPriority | '';
  type:            TicketType | '';
  date:            string;
  time:            string;
}

@Component({
  selector: 'app-new-ticket',
  standalone: true,
  imports: [FormsModule, TranslateModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './new-ticket.html',
  styleUrl:    './new-ticket.scss',
})
export class NewTicketComponent {
  private readonly router     = inject(Router);
  private readonly authStore  = inject(AuthStore);
  readonly store          = inject(MaintenanceStore);
  readonly equipmentStore = inject(EquipmentStore);

  readonly priorities = Object.values(TicketPriority);
  readonly types      = Object.values(TicketType);
  readonly today      = new Date().toISOString().split('T')[0];

  selectedTime = signal('');
  readonly isPeak    = computed(() => this.store.isPeakHour(this.selectedTime()));
  readonly isOffPeak = computed(() => !!this.selectedTime() && !this.isPeak());

  form: NewTicketForm = {
    equipmentId: null,
    description: '',
    priority:    TicketPriority.MEDIUM,
    type:        TicketType.CORRECTIVE,
    date:        this.today,
    time:        '',
  };

  get selectedEquipmentId(): string {
    return this.form.equipmentId ?? '';
  }

  onTimeChange(): void { this.selectedTime.set(this.form.time); }

  applySuggestion(t: string): void { this.form.time = t; this.selectedTime.set(t); }

  submit(): void {
    if (!this.form.equipmentId || !this.form.description || !this.form.priority || !this.form.type) return;
    const requestedBy = this.authStore.currentUser()?.email ?? '';
    this.store.createTicket(
      this.form.equipmentId,
      requestedBy,
      this.form.description,
      this.form.priority as TicketPriority,
      this.form.type     as TicketType,
    );
    this.router.navigate(['/maintenance']);
  }

  cancel(): void { this.router.navigate(['/maintenance']); }
}
