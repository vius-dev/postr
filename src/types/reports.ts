
export type ReportableEntityType = 'POST' | 'USER' | 'MEDIA';

export type ReportType =
  | 'SPAM'
  | 'HARASSMENT'
  | 'HATE'
  | 'MISINFORMATION'
  | 'VIOLENCE'
  | 'SELF_HARM'
  | 'OTHER';

export interface Report {
  id: string;
  entityType: ReportableEntityType;
  entityId: string;
  reportType: ReportType;
  reporterId: string; // The user who is reporting
  createdAt: string;
  reason?: string; // Optional field for 'Other'
}
