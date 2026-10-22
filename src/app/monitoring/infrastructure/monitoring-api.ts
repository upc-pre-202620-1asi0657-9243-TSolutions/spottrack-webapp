import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CameraSensorResource,
  MotionSensorResource,
  AnomalyResource,
  SessionTrackerResource,
} from './monitoring-response';
import {
  RegisterCameraSensorRequest,
  RegisterMotionSensorRequest,
  CaptureCameraMotionRequest,
  CaptureMotionSensorReadingRequest,
  ReportAnomalyRequest,
} from './monitoring-request';

@Injectable({ providedIn: 'root' })
export class MonitoringApi {
  private readonly cameraSensorsUrl  = `${environment.apiBase}/monitoring/camera-sensors`;
  private readonly motionSensorsUrl  = `${environment.apiBase}/monitoring/motion-sensors`;
  private readonly anomaliesUrl      = `${environment.apiBase}/anomalies`;
  private readonly sessionTrackerUrl = `${environment.apiBase}/monitoring/session-trackers`;

  constructor(private readonly http: HttpClient) {}

  getAllCameraSensors(): Observable<CameraSensorResource[]> {
    return this.http.get<CameraSensorResource[]>(`${this.cameraSensorsUrl}/me`);
  }

  getAllMotionSensors(): Observable<MotionSensorResource[]> {
    return this.http.get<MotionSensorResource[]>(`${this.motionSensorsUrl}/me`);
  }

  registerCameraSensor(body: RegisterCameraSensorRequest): Observable<CameraSensorResource> {
    return this.http.post<CameraSensorResource>(this.cameraSensorsUrl, body);
  }

  registerMotionSensor(body: RegisterMotionSensorRequest): Observable<MotionSensorResource> {
    return this.http.post<MotionSensorResource>(this.motionSensorsUrl, body);
  }

  captureCameraMotion(body: CaptureCameraMotionRequest): Observable<SessionTrackerResource> {
    return this.http.post<SessionTrackerResource>(`${this.cameraSensorsUrl}/capture-motion`, body);
  }

  captureMotionSensorReading(body: CaptureMotionSensorReadingRequest): Observable<SessionTrackerResource> {
    return this.http.post<SessionTrackerResource>(`${this.motionSensorsUrl}/capture-motion`, body);
  }

  reportAnomaly(body: ReportAnomalyRequest): Observable<AnomalyResource> {
    return this.http.post<AnomalyResource>(this.anomaliesUrl, body);
  }

  getAllSessionTrackers(): Observable<SessionTrackerResource[]> {
    return this.http.get<SessionTrackerResource[]>(`${this.sessionTrackerUrl}/me`);
  }

  verifySessionUsage(sessionTrackerId: string): Observable<SessionTrackerResource> {
    return this.http.get<SessionTrackerResource>(`${this.sessionTrackerUrl}/${sessionTrackerId}/verify`);
  }

  endUsageSession(sessionTrackerId: string): Observable<SessionTrackerResource> {
    return this.http.patch<SessionTrackerResource>(`${this.sessionTrackerUrl}/${sessionTrackerId}/end`, {});
  }

  calculateSessionTime(sessionTrackerId: string): Observable<SessionTrackerResource> {
    return this.http.get<SessionTrackerResource>(`${this.sessionTrackerUrl}/${sessionTrackerId}/time`);
  }
}
