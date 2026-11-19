/**
 * Shape returned by GET /usage-analytics/gyms/{gymId} and /branches/{branchId}.
 * Rates are percentages (0-100); heat is relative to the busiest equipment (0-1).
 */
export interface HourlyOccupancyResource {
  hour:          number;
  occupancyRate: number;
}

export interface EquipmentUsageResource {
  equipmentId:     string;
  zoneId:          string | null;
  activeMinutes:   number;
  sessionCount:    number;
  utilizationRate: number;
  heat:            number;
}

/** Minutes of use on one weekday, added up across the window (and the window right before it). */
export interface DailyUsageResource {
  dayOfWeek:             'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  activeMinutes:         number;
  previousActiveMinutes: number;
}

export interface UsageHeatmapResource {
  from:                  string;
  to:                    string;
  openingHour:           number;
  closingHour:           number;
  equipmentCount:        number;
  occupancyRate:         number;
  previousOccupancyRate: number;
  peakHour:              number | null;
  peakOccupancyRate:     number;
  hourly:                HourlyOccupancyResource[];
  equipment:             EquipmentUsageResource[];
  daily:                 DailyUsageResource[];
  /** Equipment with no use at all in the window / in the window right before it. */
  inactiveEquipmentCount:         number;
  previousInactiveEquipmentCount: number;
}
