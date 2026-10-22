import { FinancialStat } from '../domain/model/financial-impact.entity';
import { EquipmentResource, ActivityReportResource } from './financial-impact-response';

/**
 * FinancialStat joins equipments with their (optional) activity report, so it
 * can't implement the single-resource BaseAssembler contract used elsewhere.
 * Unlike AnalyticsAssembler, every equipment is kept even without a matching
 * report — FinancialImpactStore needs all equipment to compute
 * maintenance-related losses, not just the ones with a report.
 */
export class FinancialImpactAssembler {
  toEntitiesFromResources(
    equipments: EquipmentResource[],
    reports: ActivityReportResource[]
  ): FinancialStat[] {
    return equipments.map(equipment => this.toEntityFromResources(equipment, reports));
  }

  private toEntityFromResources(
    equipment: EquipmentResource,
    reports: ActivityReportResource[]
  ): FinancialStat {
    const report = reports.find(r => r.equipmentId === equipment.equipmentId);

    return new FinancialStat({
      id:              equipment.equipmentId,
      equipmentId:     equipment.equipmentId,
      equipmentName:   equipment.equipmentName,
      status:          equipment.status,
      purchasePrice:   equipment.purchaseAmount,
      totalUsageHours: (report?.totalUsageTime ?? 0) / 60,
      downtimeCost:    report?.downtimeCost ?? 0,
    });
  }
}
