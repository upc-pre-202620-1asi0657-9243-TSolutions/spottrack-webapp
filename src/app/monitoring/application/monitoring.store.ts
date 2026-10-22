import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MonitoringApi } from '../infrastructure/monitoring-api';
import {
  CameraSensorResource,
  MotionSensorResource,
  AnomalyResource,
  SessionTrackerResource,
} from '../infrastructure/monitoring-response';
import {
  ReportAnomalyRequest,
} from '../infrastructure/monitoring-request';

@Injectable({ providedIn: 'root' })
export class MonitoringStore {

  private readonly api        = inject(MonitoringApi);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _actionLoading = signal(false);
  private readonly _actionError   = signal<string | null>(null);

  readonly actionLoading = this._actionLoading.asReadonly();
  readonly actionError   = this._actionError.asReadonly();

  private readonly _cameraSensors  = signal<CameraSensorResource[]>([]);
  private readonly _motionSensors  = signal<MotionSensorResource[]>([]);
  private readonly _anomalyReports = signal<AnomalyResource[]>([]);
  private readonly _trackedSessions = signal<SessionTrackerResource[]>([]);
  private readonly _lastCalculatedTime = signal<string | null>(null);

  readonly cameraSensors   = this._cameraSensors.asReadonly();
  readonly motionSensors   = this._motionSensors.asReadonly();
  readonly anomalyReports  = this._anomalyReports.asReadonly();
  readonly trackedSessions = this._trackedSessions.asReadonly();
  /** Result of the last "calculate time" peek — read-only, doesn't affect the tracker. */
  readonly lastCalculatedTime = this._lastCalculatedTime.asReadonly();

  private static readonly POLL_INTERVAL_MS = 15000;

  constructor() {
    setInterval(() => this.refreshSessionTrackers(), MonitoringStore.POLL_INTERVAL_MS);
  }

  loadCameraSensors(): void {
    this._actionLoading.set(true);
    this._actionError.set(null);
    this.api.getAllCameraSensors()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: sensors => {
          this._cameraSensors.set(sensors);
          this._actionLoading.set(false);
        },
        error: err => {
          this._actionError.set(this.formatError(err, 'No se pudieron cargar las cámaras registradas'));
          this._actionLoading.set(false);
        },
      });
  }

  loadMotionSensors(): void {
    this._actionLoading.set(true);
    this._actionError.set(null);
    this.api.getAllMotionSensors()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: sensors => {
          this._motionSensors.set(sensors);
          this._actionLoading.set(false);
        },
        error: err => {
          this._actionError.set(this.formatError(err, 'No se pudieron cargar los sensores de movimiento registrados'));
          this._actionLoading.set(false);
        },
      });
  }

  registerCameraSensor(equipmentId: string): void {
    this._actionLoading.set(true);
    this._actionError.set(null);
    this.api.registerCameraSensor({ equipmentId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: sensor => {
          this._cameraSensors.update(list => [sensor, ...list]);
          this._actionLoading.set(false);
        },
        error: err => {
          this._actionError.set(this.formatError(err, 'No se pudo registrar la cámara'));
          this._actionLoading.set(false);
        },
      });
  }

  registerMotionSensor(equipmentId: string): void {
    this._actionLoading.set(true);
    this._actionError.set(null);
    this.api.registerMotionSensor({ equipmentId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: sensor => {
          this._motionSensors.update(list => [sensor, ...list]);
          this._actionLoading.set(false);
        },
        error: err => {
          this._actionError.set(this.formatError(err, 'No se pudo registrar el sensor de movimiento'));
          this._actionLoading.set(false);
        },
      });
  }

  captureCameraMotion(equipmentId: string, movementDetectedViaVideo: boolean): void {
    this._actionLoading.set(true);
    this._actionError.set(null);
    this.api.captureCameraMotion({ equipmentId, movementDetectedViaVideo })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: session => {
          this.upsertTrackedSession(session);
          this._actionLoading.set(false);
        },
        error: err => {
          this._actionError.set(this.formatError(err, 'No se pudo registrar la lectura de la cámara'));
          this._actionLoading.set(false);
        },
      });
  }

  captureMotionSensorReading(equipmentId: string, movementDetectedViaSensor: boolean): void {
    this._actionLoading.set(true);
    this._actionError.set(null);
    this.api.captureMotionSensorReading({ equipmentId, movementDetectedViaSensor })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: session => {
          this.upsertTrackedSession(session);
          this._actionLoading.set(false);
        },
        error: err => {
          this._actionError.set(this.formatError(err, 'No se pudo registrar la lectura del sensor de movimiento'));
          this._actionLoading.set(false);
        },
      });
  }

  reportAnomaly(request: ReportAnomalyRequest): void {
    this._actionLoading.set(true);
    this._actionError.set(null);
    this.api.reportAnomaly(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: anomaly => {
          this._anomalyReports.update(list => [anomaly, ...list]);
          this._actionLoading.set(false);
        },
        error: err => {
          this._actionError.set(this.formatError(err, 'No se pudo reportar la anomalía'));
          this._actionLoading.set(false);
        },
      });
  }

  loadSessionTrackers(): void {
    this._actionLoading.set(true);
    this._actionError.set(null);
    this.api.getAllSessionTrackers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: sessions => {
          this._trackedSessions.set(sessions);
          this._actionLoading.set(false);
        },
        error: err => {
          this._actionError.set(this.formatError(err, 'No se pudieron cargar las sesiones rastreadas'));
          this._actionLoading.set(false);
        },
      });
  }

  verifySessionUsage(sessionTrackerId: string): void {
    this._actionLoading.set(true);
    this._actionError.set(null);
    this.api.verifySessionUsage(sessionTrackerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: session => {
          this.upsertTrackedSession(session);
          this._actionLoading.set(false);
        },
        error: err => {
          this._actionError.set(this.formatError(err, 'No se pudo verificar el uso de la sesión'));
          this._actionLoading.set(false);
        },
      });
  }

  /**
   * Ending a session cascades server-side to calculating its final activity
   * and deleting the tracker once that's reported to analytics, so the list
   * is reloaded afterward rather than just patching this one row in place.
   */
  endUsageSession(sessionTrackerId: string): void {
    this._actionLoading.set(true);
    this._actionError.set(null);
    this.api.endUsageSession(sessionTrackerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadSessionTrackers();
        },
        error: err => {
          this._actionError.set(this.formatError(err, 'No se pudo finalizar la sesión'));
          this._actionLoading.set(false);
        },
      });
  }

  /**
   * Calculating time also deletes the tracker once reported (see endUsageSession).
   */
  /**
   * Read-only preview of the session's current true activity — does NOT end
   * or delete the tracker, safe to call on a still-active session.
   */
  calculateSessionTime(sessionTrackerId: string): void {
    this._actionLoading.set(true);
    this._actionError.set(null);
    this.api.calculateSessionTime(sessionTrackerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: session => {
          this._lastCalculatedTime.set(session.calculatedTrueActivity);
          this.upsertTrackedSession(session);
          this._actionLoading.set(false);
        },
        error: err => {
          this._actionError.set(this.formatError(err, 'No se pudo calcular el tiempo de sesión'));
          this._actionLoading.set(false);
        },
      });
  }

  clearLastCalculatedTime(): void { this._lastCalculatedTime.set(null); }

  /**
   * Silent background refresh — no loading/error signal churn, so the
   * Active/Inactive badges reflect the backend's inactivity scheduler
   * (SessionTrackerScheduler, every 60s) without the user having to click
   * "Verify" or "Refresh" themselves.
   */
  private refreshSessionTrackers(): void {
    this.api.getAllSessionTrackers().subscribe({
      next: sessions => this._trackedSessions.set(sessions),
      error: () => {},
    });
  }

  private upsertTrackedSession(session: SessionTrackerResource): void {
    this._trackedSessions.update(list => {
      const idx = list.findIndex(s => s.sessionTrackerId === session.sessionTrackerId);
      if (idx === -1) return [session, ...list];
      const copy = [...list];
      copy[idx] = session;
      return copy;
    });
  }

  private formatError(error: unknown, fallback: string): string {
    if (error instanceof Error) return error.message || fallback;
    return fallback;
  }
}
