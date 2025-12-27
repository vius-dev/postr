
import { supabase } from './supabase';
import { Report, ReportableEntityType, ReportType } from '@/types/reports';

/**
 * Creates a report in the Supabase database.
 */
export const createReport = async (
  entityType: ReportableEntityType,
  entityId: string,
  reportType: ReportType,
  reporterId: string,
  reason?: string
): Promise<Report> => {
  const { data, error } = await supabase
    .from('reports')
    .insert({
      reporter_id: reporterId,
      target_id: entityId,
      target_type: entityType,
      report_type: reportType,
      reason: reason,
      status: 'OPEN'
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    entityType: data.target_type as ReportableEntityType,
    entityId: data.target_id,
    reportType: data.report_type as ReportType,
    reporterId: data.reporter_id,
    createdAt: data.created_at,
    reason: data.reason,
    status: data.status
  } as Report;
};
