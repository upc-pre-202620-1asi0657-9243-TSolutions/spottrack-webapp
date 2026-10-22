export type { EquipmentResource, EquipmentResponse } from '../../gym/infrastructure/equipment-response';

/**
 * Shape returned by GET /activity-reports (analytics bounded context).
 * equipmentId is a string UUID, matching EquipmentResource.equipmentId —
 * equipment has no numeric id on the wire, only that UUID.
 * totalUsageTime is in minutes (backend field); converted to hours on assembly.
 */
export interface ActivityReportResource {
  id:                   number;
  activityReportId:     number;
  equipmentId:          string;
  totalUsageTime:       number;
  downtimeCost:         number;
  percentageComparison: number;
}

export type ActivityReportResponse = ActivityReportResource[];
