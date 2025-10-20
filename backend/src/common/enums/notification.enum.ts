export enum NotificationType {
  ORDER_CREATED = 'order_created',
  ORDER_UPDATED = 'order_updated',
  SAMPLE_SUBMITTED = 'sample_submitted',
  SAMPLE_APPROVED = 'sample_approved',
  SAMPLE_REJECTED = 'sample_rejected',
  PI_SENT = 'pi_sent',
  PI_CONFIRMED = 'pi_confirmed',
  LC_RECEIVED = 'lc_received',
  LC_EXPIRING = 'lc_expiring',
  INCIDENT_CREATED = 'incident_created',
  INCIDENT_RESOLVED = 'incident_resolved',
  SHIPMENT_DISPATCHED = 'shipment_dispatched',
  SHIPMENT_DELIVERED = 'shipment_delivered',
  TASK_OVERDUE = 'task_overdue',
  REMINDER = 'reminder',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}
