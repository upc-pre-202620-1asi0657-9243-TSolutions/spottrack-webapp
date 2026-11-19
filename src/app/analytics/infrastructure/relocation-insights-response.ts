/** Shape returned by GET /usage-analytics/gyms/{gymId}/relocation-insights. Rates are percentages (0-100). */
export interface BranchDemandResource {
  branchId:          string;
  name:              string;
  equipmentCount:    number;
  totalUsageMinutes: number;
  utilizationRate:   number;
  classification:    'LOW_DEMAND' | 'BALANCED' | 'SATURATED';
}

export interface RelocationSuggestionResource {
  equipmentId:               string;
  equipmentName:             string;
  fromBranchId:              string;
  fromBranchName:            string;
  fromBranchUtilizationRate: number;
  toBranchId:                string;
  toBranchName:              string;
  toBranchUtilizationRate:   number;
  equipmentUtilizationRate:  number;
  equipmentUsageMinutes:     number;
  reason:                    string;
}

export interface RelocationInsightsResource {
  gymId:       string;
  gymName:     string | null;
  from:        string;
  to:          string;
  thresholds:  { lowDemandRate: number; saturatedRate: number };
  branches:    BranchDemandResource[];
  suggestions: RelocationSuggestionResource[];
}
