import { Equipment, EquipmentStatus } from '../domain/model/equipment.entity';
import { EquipmentResource, EquipmentResponse } from './equipment-response';

export class EquipmentAssembler {
  toEntitiesFromResponse(response: EquipmentResponse): Equipment[] {
    return response.map(r => this.toEntityFromResource(r));
  }

  toEntityFromResource(r: EquipmentResource): Equipment {
    return new Equipment({
      uuid:                 r.equipmentId ?? '',
      zoneId:               r.zoneId ?? '',
      name:                 r.equipmentName ?? '',
      brand:                r.manufacturerId ?? '',
      model:                r.model ?? '',
      purchaseAmount:       r.purchaseAmount ?? 0,
      purchaseCurrency:     r.purchaseCurrency ?? 'USD',
      status:               (r.status as EquipmentStatus) ?? EquipmentStatus.AVAILABLE,
      maintenanceThreshold: r.maintenanceThreshold ?? null,
    });
  }

  toResourceFromEntity(e: Equipment): EquipmentResource {
    return {
      equipmentId:      e.uuid,
      equipmentName:    e.name,
      model:            e.model,
      status:           e.status,
      zoneId:           e.zoneId,
      manufacturerId:   e.brand,
      purchaseCurrency: e.purchaseCurrency,
      purchaseAmount:   e.purchaseAmount,
      maintenanceThreshold: e.maintenanceThreshold ?? undefined,
    };
  }
}
