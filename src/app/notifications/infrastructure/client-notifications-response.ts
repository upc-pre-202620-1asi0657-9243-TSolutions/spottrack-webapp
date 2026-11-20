export type ClientNotificationType =
  | 'EQUIPMENT_AVAILABLE'
  | 'EQUIPMENT_RESTORED'
  | 'EQUIPMENT_OCCUPIED_AGAIN';

/** Item of GET /notifications. */
export interface ClientNotificationResource {
  id:          number;
  equipmentId: string;
  type:        ClientNotificationType;
  message:     string;
  read:        boolean;
  readAt:      string | null;
  createdAt:   string;
}

/** Payload pushed to /user/queue/notifications when a notification is created. */
export interface ClientNotificationMessage {
  id:          number;
  equipmentId: string;
  type:        ClientNotificationType;
  message:     string;
  createdAt:   string;
}

/** Item of GET /equipment-watches. */
export interface EquipmentWatchResource {
  id:          number;
  equipmentId: string;
  status:      'ACTIVE' | 'NOTIFIED' | 'CLOSED';
  createdAt:   string;
}
