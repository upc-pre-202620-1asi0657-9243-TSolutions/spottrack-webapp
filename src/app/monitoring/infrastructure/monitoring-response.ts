import { BaseResource } from '../../shared/infrastructure/base-response';

export interface CameraSensorResource extends BaseResource {
  id:              number;
  cameraSensorId:  string;
  equipmentId:     string;
  equipmentName:   string | null;
  equipmentModel:  string | null;
  equipmentStatus: string | null;
  registeredAt:    string;
}

export interface MotionSensorResource extends BaseResource {
  id:                 number;
  motionSensorId:     string;
  equipmentId:        string;
  equipmentName:      string | null;
  equipmentModel:     string | null;
  equipmentStatus:    string | null;
  registeredAt:       string;
  online:             boolean;
  lastStatusChangeAt: string;
}

export interface AnomalyResource extends BaseResource {
  id:                 number;
  anomalyId:          string;
  reservationId:      string;
  equipmentId:        string;
  zoneId:             string;
  anomalyDescription: string;
  emissionDate:       string;
}

/**
 * Shape returned by the get-all / verify / end / capture-motion / time session-tracker
 * endpoints (via SessionTrackerResourceFromEntity on the backend).
 * reservationId (and clientId/clientName, which are only resolvable from a
 * reservation) are null for walk-up usage (equipment used without a booked
 * reservation) — still real usage data worth tracking.
 * calculatedTrueActivity is only populated by the /time (calculate time)
 * endpoint — a read-only preview of current true activity that does NOT end
 * or delete the tracker.
 */
export interface SessionTrackerResource {
  sessionTrackerId:        string;
  equipmentId:             string;
  equipmentName:           string | null;
  reservationId:           string | null;
  clientId:                number | null;
  clientName:              string | null;
  continouosActivitiy:     string;
  seconds:                 string;
  sessionIsActive:         boolean;
  sessionIsInactive:       boolean;
  calculatedTrueActivity:  string | null;
}
