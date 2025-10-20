export enum IncidentType {
  QUALITY_REJECTION = 'quality_rejection',
  DELAY = 'delay',
  MILL_BREAKDOWN = 'mill_breakdown',
  SHORT_SHIPMENT = 'short_shipment',
  OTHER = 'other',
}

export enum IncidentStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum IncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}
