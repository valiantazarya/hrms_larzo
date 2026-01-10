import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '../../hooks/useToast';
import { reportingService, AttendanceSummary, LeaveUsage, OvertimeCost, PayrollTotals } from '../../services/api/reportingService';
import { ToastContainer } from '../../components/common/Toast';
import { Pagination } from '../../components/common/Pagination';

export default function ReportingPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'attendance' | 'leave' | 'overtime' | 'payroll'>('attendance');
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  );

  // Pagination states for each table
  const [attendancePage, setAttendancePage] = useState(1);
  const [leavePage, setLeavePage] = useState(1);
  const [overtimePage, setOvertimePage] = useState(1);
  const itemsPerPage = 10;

  const { data: attendanceSummary, error: attendanceError } = useQuery<AttendanceSummary>({
    queryKey: ['attendanceSummary', startDate, endDate],
    queryFn: () => reportingService.getAttendanceSummary(startDate, endDate),
    enabled: activeTab === 'attendance',
  });

  const { data: leaveUsage, error: leaveError } = useQuery<LeaveUsage>({
    queryKey: ['leaveUsage', startDate, endDate],
    queryFn: () => reportingService.getLeaveUsage(startDate, endDate),
    enabled: activeTab === 'leave',
  });

  const { data: overtimeCost, error: overtimeError } = useQuery<OvertimeCost>({
    queryKey: ['overtimeCost', startDate, endDate],
    queryFn: () => reportingService.getOvertimeCost(startDate, endDate),
    enabled: activeTab === 'overtime',
  });

  const { data: payrollTotals, error: payrollError } = useQuery<PayrollTotals>({
    queryKey: ['payrollTotals'],
    queryFn: () => reportingService.getPayrollTotals(),
    enabled: activeTab === 'payroll',
  });

  useEffect(() => {
    if (attendanceError) {
      const errorMessage = (attendanceError as any).response?.data?.message || (attendanceError as any).message || t('reporting.loadError', { query: 'attendance' });
      toast.showToast(errorMessage, 'error', 5000);
    }
  }, [attendanceError, toast, t]);

  useEffect(() => {
    if (leaveError) {
      const errorMessage = (leaveError as any).response?.data?.message || (leaveError as any).message || t('reporting.loadError', { query: 'leave' });
      toast.showToast(errorMessage, 'error', 5000);
    }
  }, [leaveError, toast, t]);

  useEffect(() => {
    if (overtimeError) {
      const errorMessage = (overtimeError as any).response?.data?.message || (overtimeError as any).message || t('reporting.loadError', { query: 'overtime' });
      toast.showToast(errorMessage, 'error', 5000);
    }
  }, [overtimeError, toast, t]);

  useEffect(() => {
    if (payrollError) {
      const errorMessage = (payrollError as any).response?.data?.message || (payrollError as any).message || t('reporting.loadError', { query: 'payroll' });
      toast.showToast(errorMessage, 'error', 5000);
    }
  }, [payrollError, toast, t]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">{t('reporting.title')}</h2>

      {/* Date Range Selector */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('reporting.startDate')}</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('reporting.endDate')}</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'attendance'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-600'
          }`}
        >
          {t('reporting.attendance')}
        </button>
        <button
          onClick={() => setActiveTab('leave')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'leave'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-600'
          }`}
        >
          {t('reporting.leave')}
        </button>
        <button
          onClick={() => setActiveTab('overtime')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'overtime'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-600'
          }`}
        >
          {t('reporting.overtime')}
        </button>
        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'payroll'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-600'
          }`}
        >
          {t('reporting.payroll')}
        </button>
      </div>

      {/* Attendance Summary */}
      {activeTab === 'attendance' && attendanceSummary && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">{t('reporting.attendanceSummary')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded">
                <div className="text-sm text-gray-600">{t('reporting.totalDays')}</div>
                <div className="text-2xl font-bold">{attendanceSummary.totalDays}</div>
              </div>
              <div className="bg-green-50 p-4 rounded">
                <div className="text-sm text-gray-600">{t('reporting.presentDays')}</div>
                <div className="text-2xl font-bold">{attendanceSummary.presentDays}</div>
              </div>
              <div className="bg-red-50 p-4 rounded">
                <div className="text-sm text-gray-600">{t('reporting.absentDays')}</div>
                <div className="text-2xl font-bold">{attendanceSummary.absentDays}</div>
              </div>
              <div className="bg-orange-50 p-4 rounded">
                <div className="text-sm text-gray-600">{t('reporting.lateDays')}</div>
                <div className="text-2xl font-bold">{attendanceSummary.lateDays || 0}</div>
              </div>
              <div className="bg-purple-50 p-4 rounded">
                <div className="text-sm text-gray-600">{t('reporting.onLeaveDays')}</div>
                <div className="text-2xl font-bold">{attendanceSummary.onLeaveDays || 0}</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded">
                <div className="text-sm text-gray-600">{t('reporting.totalHours')}</div>
                <div className="text-2xl font-bold">{attendanceSummary.totalHours.toFixed(1)}</div>
              </div>
            </div>
          </div>

          {/* Employee Breakdown */}
          {attendanceSummary.attendances && attendanceSummary.attendances.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-4">{t('reporting.employeeBreakdown')}</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.employee')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.presentDays')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.absentDays')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.lateDays')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.totalHours')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.attendanceRate')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(
                      attendanceSummary.attendances.reduce((acc: any, att: any) => {
                        const empId = att.employee.id;
                        if (!acc[empId]) {
                          acc[empId] = {
                            employee: att.employee,
                            present: 0,
                            absent: 0,
                            late: 0,
                            onLeave: 0,
                            totalHours: 0,
                            totalDays: 0,
                          };
                        }
                        acc[empId].totalDays += 1;
                        if (att.status === 'PRESENT') acc[empId].present += 1;
                        if (att.status === 'ABSENT') acc[empId].absent += 1;
                        if (att.status === 'LATE') acc[empId].late += 1;
                        if (att.status === 'ON_LEAVE') acc[empId].onLeave += 1;
                        acc[empId].totalHours += (att.workDuration || 0) / 60;
                        return acc;
                      }, {})
                    ).map(([empId, data]: [string, any]) => {
                      const attendanceRate = data.totalDays > 0 
                        ? ((data.present / data.totalDays) * 100).toFixed(1) 
                        : '0.0';
                      return (
                        <tr key={empId}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {data.employee.firstName} {data.employee.lastName}
                            <div className="text-xs text-gray-500">{data.employee.employeeCode}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{data.present}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{data.absent}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{data.late}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{data.totalHours.toFixed(1)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{attendanceRate}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detailed Attendance Records */}
          {attendanceSummary.attendances && attendanceSummary.attendances.length > 0 && (() => {
            const totalPages = Math.ceil(attendanceSummary.attendances.length / itemsPerPage);
            const startIndex = (attendancePage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const paginatedAttendances = attendanceSummary.attendances.slice(startIndex, endIndex);

            return (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4">{t('reporting.detailedRecords')}</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.date')}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.employee')}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.status')}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.clockIn')}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.clockOut')}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.workDuration')}</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedAttendances.map((att: any) => (
                          <tr key={att.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {new Date(att.date).toLocaleDateString('id-ID')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {att.employee.firstName} {att.employee.lastName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`px-2 py-1 rounded text-xs ${
                                att.status === 'PRESENT' ? 'bg-green-100 text-green-800' :
                                att.status === 'ABSENT' ? 'bg-red-100 text-red-800' :
                                att.status === 'LATE' ? 'bg-orange-100 text-orange-800' :
                                'bg-purple-100 text-purple-800'
                              }`}>
                                {att.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {att.clockIn ? new Date(att.clockIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {att.clockOut ? new Date(att.clockOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {att.workDuration ? `${(att.workDuration / 60).toFixed(1)}h` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <Pagination
                  currentPage={attendancePage}
                  totalPages={totalPages}
                  onPageChange={setAttendancePage}
                  totalItems={attendanceSummary.attendances.length}
                  itemsPerPage={itemsPerPage}
                />
              </div>
            );
          })()}
        </div>
      )}

      {/* Leave Usage */}
      {activeTab === 'leave' && leaveUsage && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">{t('reporting.leaveUsage')}</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded">
                <div className="text-sm text-gray-600">{t('reporting.totalRequests')}</div>
                <div className="text-2xl font-bold">{leaveUsage.totalRequests}</div>
              </div>
              <div className="bg-green-50 p-4 rounded">
                <div className="text-sm text-gray-600">{t('reporting.totalDays')}</div>
                <div className="text-2xl font-bold">{leaveUsage.totalDays}</div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">{t('reporting.byLeaveType')}</h4>
              {Object.entries(leaveUsage.byLeaveType).map(([type, data]) => (
                <div key={type} className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>{type}</span>
                  <span className="font-medium">{data.days} {t('leave.days')} ({data.count} {t('reporting.requests')})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Employee Breakdown */}
          {leaveUsage.leaveRequests && leaveUsage.leaveRequests.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-4">{t('reporting.employeeBreakdown')}</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.employee')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.leaveType')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.totalRequests')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.totalDays')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(
                      leaveUsage.leaveRequests.reduce((acc: any, lr: any) => {
                        const key = `${lr.employee.id}_${lr.leaveType.id}`;
                        if (!acc[key]) {
                          acc[key] = {
                            employee: lr.employee,
                            leaveType: lr.leaveType.name,
                            count: 0,
                            days: 0,
                          };
                        }
                        acc[key].count += 1;
                        acc[key].days += Number(lr.days);
                        return acc;
                      }, {})
                    ).map(([key, data]: [string, any]) => (
                      <tr key={key}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {data.employee.firstName} {data.employee.lastName}
                          <div className="text-xs text-gray-500">{data.employee.employeeCode}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{data.leaveType}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{data.count}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{data.days}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detailed Leave Requests */}
          {leaveUsage.leaveRequests && leaveUsage.leaveRequests.length > 0 && (() => {
            const totalPages = Math.ceil(leaveUsage.leaveRequests.length / itemsPerPage);
            const startIndex = (leavePage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const paginatedRequests = leaveUsage.leaveRequests.slice(startIndex, endIndex);

            return (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4">{t('reporting.detailedRecords')}</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.employee')}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.leaveType')}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.startDate')}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.endDate')}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.days')}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.status')}</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedRequests.map((lr: any) => (
                          <tr key={lr.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {lr.employee.firstName} {lr.employee.lastName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{lr.leaveType.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {new Date(lr.startDate).toLocaleDateString('id-ID')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {new Date(lr.endDate).toLocaleDateString('id-ID')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{Number(lr.days)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`px-2 py-1 rounded text-xs ${
                                lr.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                lr.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {lr.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <Pagination
                  currentPage={leavePage}
                  totalPages={totalPages}
                  onPageChange={setLeavePage}
                  totalItems={leaveUsage.leaveRequests.length}
                  itemsPerPage={itemsPerPage}
                />
              </div>
            );
          })()}
        </div>
      )}

      {/* Overtime Cost */}
      {activeTab === 'overtime' && overtimeCost && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">{t('reporting.overtimeCost')}</h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded">
                <div className="text-sm text-gray-600">{t('reporting.totalRequests')}</div>
                <div className="text-2xl font-bold">{overtimeCost.totalRequests}</div>
              </div>
              <div className="bg-green-50 p-4 rounded">
                <div className="text-sm text-gray-600">{t('reporting.totalHours')}</div>
                <div className="text-2xl font-bold">{overtimeCost.totalHours.toFixed(1)}</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded">
                <div className="text-sm text-gray-600">{t('reporting.totalCost')}</div>
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                  }).format(overtimeCost.totalCost)}
                </div>
              </div>
            </div>
          </div>

          {/* Employee Breakdown */}
          {overtimeCost.overtimeRequests && overtimeCost.overtimeRequests.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-4">{t('reporting.employeeBreakdown')}</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.employee')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.totalRequests')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.totalHours')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.totalCost')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.averageCost')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(
                      overtimeCost.overtimeRequests.reduce((acc: any, ot: any) => {
                        const empId = ot.employee.id;
                        if (!acc[empId]) {
                          acc[empId] = {
                            employee: ot.employee,
                            count: 0,
                            hours: 0,
                            cost: 0,
                          };
                        }
                        acc[empId].count += 1;
                        acc[empId].hours += ot.duration / 60;
                        acc[empId].cost += Number(ot.calculatedAmount || 0);
                        return acc;
                      }, {})
                    ).map(([empId, data]: [string, any]) => (
                      <tr key={empId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {data.employee.firstName} {data.employee.lastName}
                          <div className="text-xs text-gray-500">{data.employee.employeeCode}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{data.count}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{data.hours.toFixed(1)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                          }).format(data.cost)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                          }).format(data.count > 0 ? data.cost / data.count : 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detailed Overtime Requests */}
          {overtimeCost.overtimeRequests && overtimeCost.overtimeRequests.length > 0 && (() => {
            const totalPages = Math.ceil(overtimeCost.overtimeRequests.length / itemsPerPage);
            const startIndex = (overtimePage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const paginatedRequests = overtimeCost.overtimeRequests.slice(startIndex, endIndex);

            return (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4">{t('reporting.detailedRecords')}</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.date')}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.employee')}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.duration')}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.hours')}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.amount')}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.status')}</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedRequests.map((ot: any) => (
                          <tr key={ot.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {new Date(ot.date).toLocaleDateString('id-ID')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {ot.employee.firstName} {ot.employee.lastName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{ot.duration} {t('overtime.minutes')}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{(ot.duration / 60).toFixed(1)}h</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {new Intl.NumberFormat('id-ID', {
                                style: 'currency',
                                currency: 'IDR',
                              }).format(Number(ot.calculatedAmount || 0))}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`px-2 py-1 rounded text-xs ${
                                ot.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                ot.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {ot.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <Pagination
                  currentPage={overtimePage}
                  totalPages={totalPages}
                  onPageChange={setOvertimePage}
                  totalItems={overtimeCost.overtimeRequests.length}
                  itemsPerPage={itemsPerPage}
                />
              </div>
            );
          })()}
        </div>
      )}

      {/* Payroll Totals */}
      {activeTab === 'payroll' && payrollTotals && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">{t('reporting.payrollTotals')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded">
                <div className="text-sm text-gray-600">{t('reporting.grossPay')}</div>
                <div className="text-xl font-bold">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                  }).format(payrollTotals.totals.grossPay)}
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded">
                <div className="text-sm text-gray-600">{t('reporting.netPay')}</div>
                <div className="text-xl font-bold">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                  }).format(payrollTotals.totals.netPay)}
                </div>
              </div>
              <div className="bg-yellow-50 p-4 rounded">
                <div className="text-sm text-gray-600">{t('reporting.bpjsEmployee')}</div>
                <div className="text-xl font-bold">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                  }).format(payrollTotals.totals.bpjsEmployee)}
                </div>
              </div>
              <div className="bg-orange-50 p-4 rounded">
                <div className="text-sm text-gray-600">{t('reporting.bpjsEmployer')}</div>
                <div className="text-xl font-bold">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                  }).format(payrollTotals.totals.bpjsEmployer)}
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded">
                <div className="text-sm text-gray-600">{t('reporting.pph21')}</div>
                <div className="text-xl font-bold">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                  }).format(payrollTotals.totals.pph21)}
                </div>
              </div>
            </div>
          </div>

          {/* Employee Breakdown */}
          {payrollTotals.items && payrollTotals.items.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-4">{t('reporting.employeeBreakdown')}</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.employee')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.period')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('payroll.basePay')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('payroll.overtime')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('payroll.allowances')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('payroll.bonuses')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('payroll.grossPay')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('payroll.netPay')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(
                      payrollTotals.items.reduce((acc: any, item: any) => {
                        const key = `${item.employeeId}_${item.periodYear}_${item.periodMonth}`;
                        if (!acc[key]) {
                          acc[key] = {
                            employee: item.employee,
                            periodYear: item.periodYear,
                            periodMonth: item.periodMonth,
                            basePay: 0,
                            overtimePay: 0,
                            allowances: 0,
                            bonuses: 0,
                            grossPay: 0,
                            netPay: 0,
                          };
                        }
                        acc[key].basePay += Number(item.basePay || 0);
                        acc[key].overtimePay += Number(item.overtimePay || 0);
                        acc[key].allowances += Number(item.allowances || 0);
                        acc[key].bonuses += Number(item.bonuses || 0);
                        acc[key].grossPay += Number(item.grossPay || 0);
                        acc[key].netPay += Number(item.netPay || 0);
                        return acc;
                      }, {})
                    ).map(([key, data]: [string, any]) => {
                      const monthNames = [
                        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
                      ];
                      return (
                        <tr key={key}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {data.employee?.firstName} {data.employee?.lastName}
                            <div className="text-xs text-gray-500">{data.employee?.employeeCode}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {monthNames[data.periodMonth - 1]} {data.periodYear}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {new Intl.NumberFormat('id-ID', {
                              style: 'currency',
                              currency: 'IDR',
                            }).format(data.basePay)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {new Intl.NumberFormat('id-ID', {
                              style: 'currency',
                              currency: 'IDR',
                            }).format(data.overtimePay)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {new Intl.NumberFormat('id-ID', {
                              style: 'currency',
                              currency: 'IDR',
                            }).format(data.allowances)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                            {new Intl.NumberFormat('id-ID', {
                              style: 'currency',
                              currency: 'IDR',
                            }).format(data.bonuses)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {new Intl.NumberFormat('id-ID', {
                              style: 'currency',
                              currency: 'IDR',
                            }).format(data.grossPay)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                            {new Intl.NumberFormat('id-ID', {
                              style: 'currency',
                              currency: 'IDR',
                            }).format(data.netPay)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payroll Runs Breakdown */}
          {payrollTotals.payrollRuns && payrollTotals.payrollRuns.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-4">{t('reporting.payrollRuns')}</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.period')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.status')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.employees')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reporting.totalAmount')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payrollTotals.payrollRuns.map((run: any) => {
                      const monthNames = [
                        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
                      ];
                      return (
                        <tr key={run.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {monthNames[run.periodMonth - 1]} {run.periodYear}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded text-xs ${
                              run.status === 'LOCKED' || run.status === 'PAID' ? 'bg-green-100 text-green-800' :
                              run.status === 'PROCESSING' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {run.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{run.itemCount}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {run.totalAmount ? new Intl.NumberFormat('id-ID', {
                              style: 'currency',
                              currency: 'IDR',
                            }).format(run.totalAmount) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}

