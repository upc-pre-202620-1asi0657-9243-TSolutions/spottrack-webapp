export interface EquipmentResource {
  equipmentId:           string;
  equipmentName:         string;
  status:                string;
  model:                 string;
  manufacturerId:        string;
  zoneId:                string;
  purchaseCurrency:      string;
  purchaseAmount:        number;
  maintenanceThreshold?: string;
}

export type EquipmentResponse = EquipmentResource[];
