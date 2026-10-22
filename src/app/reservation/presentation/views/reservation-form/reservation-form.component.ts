import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import { ReservationStore } from '../../../application/reservation.store';

@Component({
  selector: 'app-reservation-form',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatSelectModule, TranslateModule],
  templateUrl: './reservation-form.component.html',
  styleUrl: './reservation-form.component.css',
})
export class ReservationFormComponent {
  readonly store = inject(ReservationStore);

  readonly reserved = output<void>();
  readonly cancelled = output<void>();

  readonly availableEquipment = this.store.availableEquipment;

  durations = [
    { seconds: 10,        labelKey: 'reservation.modal.option10s' },
    { seconds: 10 * 60,   labelKey: 'reservation.modal.option10m' },
    { seconds: 15 * 60,   labelKey: 'reservation.modal.option15m' },
    { seconds: 20 * 60,   labelKey: 'reservation.modal.option20m' },
  ];

  selectedMachineId: string | null = null;
  selectedDurationSeconds = 15 * 60;

  submit(): void {
    if (!this.selectedMachineId) return;
    this.store.createReservation(this.selectedMachineId, this.selectedDurationSeconds);
    this.reserved.emit();
  }

  cancel(): void { this.cancelled.emit(); }
}
