
import { Report, ReportableEntityType, ReportType } from '@/types/reports';

const mockReports: Report[] = [];

// A mock function to simulate creating a report
export const createReport = async (
  entityType: ReportableEntityType,
  entityId: string,
  reportType: ReportType,
  reporterId: string,
  reason?: string
): Promise<Report> => {
  const newReport: Report = {
    id: `report-${Date.now()}`,
    entityType,
    entityId,
    reportType,
    reporterId,
    createdAt: new Date().toISOString(),
    reason,
  };

  mockReports.push(newReport);
  console.log('New report created:', newReport);

  return newReport;
};
