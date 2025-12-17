
export type Report = {
    id: string;
    entityType: 'POST' | 'USER' | 'COMMENT';
    entityId: string;
    reportType: 'SPAM' | 'HARASSMENT' | 'HATE_SPEECH' | 'OTHER';
    reporterId: string;
    createdAt: string;
    reason: string;
  };