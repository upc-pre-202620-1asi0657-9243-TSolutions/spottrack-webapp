export type MembershipTier = 'BASIC' | 'MID' | 'PLATINUM';

export const PLAN_FEATURES: Record<MembershipTier, string[]> = {
  BASIC:    ['plan20Equipment', 'planRealtimeMonitoring', 'planMaintenanceAlerts', 'planEmailSupport'],
  MID:      ['plan60Equipment', 'planRealtimeMonitoring', 'planAdvancedAlerts', 'planPrioritySupport', 'planAnalytics'],
  PLATINUM: ['planUnlimitedEquipment', 'planRealtimeMonitoring', 'planCustomReports', 'plan24Support', 'planFullAnalytics'],
};

/** Monthly price in USD and limits per plan; they mirror MembershipTier in the backend. */
export const PLAN_PRICES: Record<MembershipTier, number> = { BASIC: 69, MID: 109, PLATINUM: 189 };
export const PLAN_LIMITS: Record<MembershipTier, { branches: number | null; equipment: number | null }> = {
  BASIC:    { branches: 1, equipment: 20 },
  MID:      { branches: 3, equipment: 60 },
  PLATINUM: { branches: null, equipment: null },
};
