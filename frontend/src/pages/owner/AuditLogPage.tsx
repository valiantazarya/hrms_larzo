import { useState, useEffect, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '../../hooks/useToast';
import { auditService, AuditLog } from '../../services/api/auditService';
import { ToastContainer } from '../../components/common/Toast';
import { DateTime } from 'luxon';

export default function AuditLogPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Set default dates: today at 00:00 and tomorrow at 00:00
  const today = DateTime.now().setZone('Asia/Jakarta').startOf('day');
  const tomorrow = today.plus({ days: 1 });
  
  const [filters, setFilters] = useState({
    entityType: '',
    action: '',
    startDate: today.toISODate() || '',
    endDate: tomorrow.toISODate() || '',
  });

  const toggleRow = (logId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedRows(newExpanded);
  };

  const { data: logs = [], isLoading, error } = useQuery<AuditLog[]>({
    queryKey: ['auditLogs', filters],
    queryFn: () => auditService.getLogs({
      ...(filters.entityType && { entityType: filters.entityType }),
      ...(filters.action && { action: filters.action }),
      ...(filters.startDate && { startDate: filters.startDate }),
      ...(filters.endDate && { endDate: filters.endDate }),
    }),
  });

  useEffect(() => {
    if (error) {
      const errorMessage = (error as any).response?.data?.message || (error as any).message || t('audit.loadError');
      toast.showToast(errorMessage, 'error', 5000);
    }
  }, [error, toast, t]);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      case 'APPROVE':
        return 'bg-green-100 text-green-800';
      case 'REJECT':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">{t('audit.title')}</h2>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('audit.entityType')}</label>
            <select
              value={filters.entityType}
              onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
              className="w-full p-2 border rounded-md"
            >
              <option value="">{t('common.all')}</option>
              <option value="Employee">Employee</option>
              <option value="Attendance">Attendance</option>
              <option value="LeaveRequest">LeaveRequest</option>
              <option value="OvertimeRequest">OvertimeRequest</option>
              <option value="PayrollRun">PayrollRun</option>
              <option value="Policy">Policy</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('audit.action')}</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="w-full p-2 border rounded-md"
            >
              <option value="">{t('common.all')}</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="APPROVE">APPROVE</option>
              <option value="REJECT">REJECT</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('audit.startDate')}</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('audit.endDate')}</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12"></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('audit.timestamp')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('audit.actor')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('audit.action')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('audit.entityType')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('audit.reason')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    {t('audit.noLogs')}
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedRows.has(log.id);
                  const before = log.before ? (typeof log.before === 'string' ? JSON.parse(log.before) : log.before) : null;
                  const after = log.after ? (typeof log.after === 'string' ? JSON.parse(log.after) : log.after) : null;
                  const hasDetails = before || after || log.ipAddress || log.userAgent;

                  return (
                    <Fragment key={log.id}>
                      <tr 
                        className={`hover:bg-gray-50 ${hasDetails ? 'cursor-pointer' : ''}`}
                        onClick={() => hasDetails && toggleRow(log.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          {hasDetails && (
                            <button
                              className="text-gray-400 hover:text-gray-600 focus:outline-none"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRow(log.id);
                              }}
                            >
                              {isExpanded ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              )}
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {new Date(log.createdAt).toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div>
                            {log.actor?.employee
                              ? `${log.actor.employee.firstName} ${log.actor.employee.lastName}`
                              : log.actor?.email || '-'}
                          </div>
                          <div className="text-xs text-gray-500">{log.actor?.role}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-xs ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{log.entityType}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {log.reason || '-'}
                        </td>
                      </tr>
                      {isExpanded && hasDetails && (
                        <tr className="bg-gray-50">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {before && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Before</h4>
                                  <pre className="bg-white p-3 rounded border text-xs overflow-x-auto">
                                    {JSON.stringify(before, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {after && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 mb-2">After</h4>
                                  <pre className="bg-white p-3 rounded border text-xs overflow-x-auto">
                                    {JSON.stringify(after, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {(log.ipAddress || log.userAgent) && (
                                <div className="md:col-span-2">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Request Details</h4>
                                  <div className="bg-white p-3 rounded border text-xs space-y-1">
                                    {log.ipAddress && (
                                      <div><span className="font-medium">IP Address:</span> {log.ipAddress}</div>
                                    )}
                                    {log.userAgent && (
                                      <div><span className="font-medium">User Agent:</span> {log.userAgent}</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}

