import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MonitoringStore } from '../../../application/monitoring.store';
import { EquipmentStore } from '../../../../gym/application/equipment.store';

@Component({
  selector: 'app-sensor-registration',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './sensor-registration.html',
  styleUrl: './sensor-registration.scss',
})
export class SensorRegistrationComponent {
  private readonly router = inject(Router);
  readonly store = inject(MonitoringStore);
  readonly equipmentStore = inject(EquipmentStore);

  readonly loading = this.store.actionLoading;
  readonly error = this.store.actionError;
  readonly cameraSensors = this.store.cameraSensors;
  readonly motionSensors = this.store.motionSensors;
  readonly equipment = this.equipmentStore.equipment;

  cameraEquipmentId: string | null = null;
  motionEquipmentId: string | null = null;

  constructor() {
    this.store.loadCameraSensors();
    this.store.loadMotionSensors();
  }

  submitCamera(): void {
    if (!this.cameraEquipmentId) return;
    this.store.registerCameraSensor(this.cameraEquipmentId);
    this.cameraEquipmentId = null;
  }

  submitMotion(): void {
    if (!this.motionEquipmentId) return;
    this.store.registerMotionSensor(this.motionEquipmentId);
    this.motionEquipmentId = null;
  }

  back(): void {
    this.router.navigate(['/monitoring']);
  }
}
