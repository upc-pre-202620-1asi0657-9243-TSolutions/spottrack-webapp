import { AnalyticsStat } from '../domain/model/analytics-stat.entity';
import { EquipmentResource, ActivityReportResource } from './analytics-response';

/**
 * AnalyticsStat is a read-model joining two REST resources (activity reports +
 * equipments), so it can't implement the single-resource BaseAssembler
 * contract used elsewhere (e.g. gym/EquipmentAssembler). Reports without a
 * matching equipment are dropped rather than emitted with blank fields.
 */
export class AnalyticsAssembler {
  toEntitiesFromResources(
    reports: ActivityReportResource[],
    equipments: EquipmentResource[]
  ): AnalyticsStat[] {
    return reports
      .map(report => this.toEntityFromResources(report, equipments))
      .filter((stat): stat is AnalyticsStat => stat !== null);
  }

  private toEntityFromResources(
    report: ActivityReportResource,
    equipments: EquipmentResource[]
  ): AnalyticsStat | null {
    const equipment = equipments.find(e => e.equipmentId === report.equipmentId);
    if (!equipment) return null;

    return new AnalyticsStat({
      id:                   report.id,
      equipmentId:          report.equipmentId,
      equipmentName:        equipment.equipmentName,
      zoneId:               Number(equipment.zoneId) || 0,
      totalUsageHours:      report.totalUsageTime / 60,
      downtimeCost:         report.downtimeCost,
      percentageComparison: report.percentageComparison,
      status:               equipment.status,
    });
  }
}
