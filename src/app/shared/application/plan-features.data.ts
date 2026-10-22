export type MembershipTier = 'BASIC' | 'MID' | 'PLATINUM';

export const PLAN_FEATURES: Record<MembershipTier, string[]> = {
  BASIC:    ['plan20Equipment', 'planRealtimeMonitoring', 'planMaintenanceAlerts', 'planEmailSupport'],
  MID:      ['plan60Equipment', 'planRealtimeMonitoring', 'planAdvancedAlerts', 'planPrioritySupport', 'planAnalytics'],
  PLATINUM: ['planUnlimitedEquipment', 'planRealtimeMonitoring', 'planCustomReports', 'plan24Support', 'planFullAnalytics'],
};
