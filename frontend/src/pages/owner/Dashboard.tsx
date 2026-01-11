import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../hooks/useToast';
import { companyService, Company } from '../../services/api/companyService';
import { policyService, Policy } from '../../services/api/policyService';
import { employeeService, Employee } from '../../services/api/employeeService';
import { attendanceService, AttendanceAdjustment } from '../../services/api/attendanceService';
import { leaveService, LeaveRequest, LeaveType } from '../../services/api/leaveService';
import { overtimeService, OvertimeRequest } from '../../services/api/overtimeService';
import { Button } from '../../components/common/Button';
import { ToastContainer } from '../../components/common/Toast';
import { Pagination } from '../../components/common/Pagination';
import { Modal } from '../../components/common/Modal';
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher';
import PayrollPage from './PayrollPage';
import ReportingPage from './ReportingPage';
import AuditLogPage from './AuditLogPage';
import ShiftSchedulePage from './ShiftSchedulePage';
import ProfilePage from './ProfilePage';

function CompanySettings() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    npwp: '',
    geofencingEnabled: false,
    geofencingLatitude: '',
    geofencingLongitude: '',
    geofencingRadius: '',
  });

  const { data: company, isError: isCompanyError, error: companyError } = useQuery<Company>({
    queryKey: ['company'],
    queryFn: () => companyService.get(),
    retry: (failureCount, error: any) => {
      // Don't retry on 401 errors - token refresh will handle it
      if (error?.response?.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Handle data update when company data is fetched (React Query v5: use useEffect instead of onSuccess)
  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        address: company.address || '',
        phone: company.phone || '',
        email: company.email || '',
        npwp: company.npwp || '',
        geofencingEnabled: company.geofencingEnabled || false,
        geofencingLatitude: company.geofencingLatitude?.toString() || '',
        geofencingLongitude: company.geofencingLongitude?.toString() || '',
        geofencingRadius: company.geofencingRadius?.toString() || '',
      });
    }
  }, [company]);

  // Handle errors (React Query v5: use useEffect instead of onError)
  useEffect(() => {
    if (isCompanyError && companyError) {
      // Only show error if it's not a 401 (401 is handled by apiClient interceptor)
      if ((companyError as any)?.response?.status !== 401) {
        toast.showToast((companyError as any).response?.data?.message || t('common.error'), 'error');
      }
    }
  }, [isCompanyError, companyError, toast, t]);

  const updateMutation = useMutation({
    mutationFn: companyService.update,
    onSuccess: () => {
      toast.showToast(t('owner.companyUpdated'), 'success');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['company'] });
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.showToast('Geolocation is not supported by your browser', 'error');
      return;
    }

    toast.showToast('Getting your location...', 'info');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          geofencingLatitude: position.coords.latitude.toString(),
          geofencingLongitude: position.coords.longitude.toString(),
        });
        toast.showToast('Location retrieved successfully', 'success');
      },
      (error) => {
        toast.showToast('Failed to get location: ' + error.message, 'error');
      },
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData: any = {
      name: formData.name,
      address: formData.address || undefined,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      npwp: formData.npwp || undefined,
      geofencingEnabled: formData.geofencingEnabled,
    };

    if (formData.geofencingEnabled) {
      if (!formData.geofencingLatitude || !formData.geofencingLongitude || !formData.geofencingRadius) {
        toast.showToast('Please provide latitude, longitude, and radius when geofencing is enabled', 'error');
        return;
      }
      submitData.geofencingLatitude = parseFloat(formData.geofencingLatitude);
      submitData.geofencingLongitude = parseFloat(formData.geofencingLongitude);
      submitData.geofencingRadius = parseFloat(formData.geofencingRadius);
    } else {
      submitData.geofencingLatitude = undefined;
      submitData.geofencingLongitude = undefined;
      submitData.geofencingRadius = undefined;
    }

    updateMutation.mutate(submitData);
  };

  if (!company) return <div className="p-6">{t('common.loading')}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{t('owner.companySettings')}</h2>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)}>{t('common.edit')}</Button>
        )}
      </div>

      {/* Edit Company Settings Modal */}
      <Modal
        isOpen={isEditing}
        onClose={() => {
          setIsEditing(false);
          if (company) {
            setFormData({
              name: company.name || '',
              address: company.address || '',
              phone: company.phone || '',
              email: company.email || '',
              npwp: company.npwp || '',
              geofencingEnabled: company.geofencingEnabled || false,
              geofencingLatitude: company.geofencingLatitude?.toString() || '',
              geofencingLongitude: company.geofencingLongitude?.toString() || '',
              geofencingRadius: company.geofencingRadius?.toString() || '',
            });
          }
        }}
        title={t('owner.companySettings')}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('owner.companyName')}</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2 border rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('owner.address')}</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full p-2 border rounded-md"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('owner.phone')}</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('owner.email')}</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('owner.npwp')}</label>
            <input
              type="text"
              value={formData.npwp}
              onChange={(e) => setFormData({ ...formData, npwp: e.target.value })}
              className="w-full p-2 border rounded-md"
            />
          </div>

          {/* Geofencing Settings */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-lg font-semibold mb-4">{t('owner.geofencingSettings')}</h3>
            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.geofencingEnabled}
                  onChange={(e) => setFormData({ ...formData, geofencingEnabled: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm font-medium">{t('owner.enableGeofencing')}</span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                {t('owner.geofencingDescription')}
              </p>
            </div>

            {formData.geofencingEnabled && (
              <div className="space-y-4 ml-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('owner.latitude')}</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.geofencingLatitude}
                      onChange={(e) => setFormData({ ...formData, geofencingLatitude: e.target.value })}
                      className="w-full p-2 border rounded-md"
                      placeholder="-6.2088"
                      required={formData.geofencingEnabled}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('owner.longitude')}</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.geofencingLongitude}
                      onChange={(e) => setFormData({ ...formData, geofencingLongitude: e.target.value })}
                      className="w-full p-2 border rounded-md"
                      placeholder="106.8456"
                      required={formData.geofencingEnabled}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-medium">{t('owner.radius')} (meters)</label>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleGetCurrentLocation}
                    >
                      {t('owner.useCurrentLocation')}
                    </Button>
                  </div>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.geofencingRadius}
                    onChange={(e) => setFormData({ ...formData, geofencingRadius: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    placeholder="100"
                    required={formData.geofencingEnabled}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('owner.radiusDescription')}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? t('common.saving') : t('common.save')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsEditing(false);
                if (company) {
                  setFormData({
                    name: company.name || '',
                    address: company.address || '',
                    phone: company.phone || '',
                    email: company.email || '',
                    npwp: company.npwp || '',
                    geofencingEnabled: company.geofencingEnabled || false,
                    geofencingLatitude: company.geofencingLatitude?.toString() || '',
                    geofencingLongitude: company.geofencingLongitude?.toString() || '',
                    geofencingRadius: company.geofencingRadius?.toString() || '',
                  });
                }
              }}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </Modal>

      {!isEditing && (
        <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
          <div>
            <label className="text-sm text-gray-600">{t('owner.companyName')}</label>
            <div className="font-semibold">{company.name}</div>
          </div>
          {company.address && (
            <div>
              <label className="text-sm text-gray-600">{t('owner.address')}</label>
              <div>{company.address}</div>
            </div>
          )}
          {company.phone && (
            <div>
              <label className="text-sm text-gray-600">{t('owner.phone')}</label>
              <div>{company.phone}</div>
            </div>
          )}
          {company.email && (
            <div>
              <label className="text-sm text-gray-600">{t('owner.email')}</label>
              <div>{company.email}</div>
            </div>
          )}
          {company.npwp && (
            <div>
              <label className="text-sm text-gray-600">{t('owner.npwp')}</label>
              <div>{company.npwp}</div>
            </div>
          )}

          {/* Geofencing Settings Display */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-lg font-semibold mb-4">{t('owner.geofencingSettings')}</h3>
            <div>
              <label className="text-sm text-gray-600">{t('owner.geofencingStatus')}</label>
              <div className="font-semibold">
                {company.geofencingEnabled ? (
                  <span className="text-green-600">{t('owner.enabled')}</span>
                ) : (
                  <span className="text-gray-500">{t('owner.disabled')}</span>
                )}
              </div>
            </div>
            {company.geofencingEnabled && company.geofencingLatitude && company.geofencingLongitude && company.geofencingRadius && (
              <div className="mt-4 space-y-2">
                <div>
                  <label className="text-sm text-gray-600">{t('owner.location')}</label>
                  <div>
                    {Number(company.geofencingLatitude).toFixed(6)}, {Number(company.geofencingLongitude).toFixed(6)}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-600">{t('owner.radius')}</label>
                  <div>{Number(company.geofencingRadius).toLocaleString()} {t('owner.meters')}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PolicyManagement() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selectedPolicyType, setSelectedPolicyType] = useState<string | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [configText, setConfigText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [createAsNewVersion, setCreateAsNewVersion] = useState(false);

  const { data: policies = [] } = useQuery<Policy[]>({
    queryKey: ['policies'],
    queryFn: () => policyService.getAll(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => policyService.update(id, data),
    onSuccess: () => {
      toast.showToast(t('owner.policyUpdated'), 'success');
      setIsEditing(false);
      setJsonError(null);
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      // Also invalidate specific policy queries so employee pages refresh
      queryClient.invalidateQueries({ queryKey: ['leavePolicy'] });
      queryClient.invalidateQueries({ queryKey: ['attendancePolicy'] });
      queryClient.invalidateQueries({ queryKey: ['overtimePolicy'] });
      queryClient.invalidateQueries({ queryKey: ['payrollConfig'] });
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { type: string; config: Record<string, any>; isActive?: boolean }) =>
      policyService.create(data),
    onSuccess: () => {
      toast.showToast(t('owner.policyCreated'), 'success');
      setIsCreating(false);
      setSelectedPolicyType(null);
      setJsonError(null);
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      // Also invalidate specific policy queries so employee pages refresh
      queryClient.invalidateQueries({ queryKey: ['leavePolicy'] });
      queryClient.invalidateQueries({ queryKey: ['attendancePolicy'] });
      queryClient.invalidateQueries({ queryKey: ['overtimePolicy'] });
      queryClient.invalidateQueries({ queryKey: ['payrollConfig'] });
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  const policyTypes = [
    { value: 'ATTENDANCE_RULES', label: t('owner.attendanceRules') },
    { value: 'OVERTIME_POLICY', label: t('owner.overtimePolicy') },
    { value: 'LEAVE_POLICY', label: t('owner.leavePolicy') },
    { value: 'PAYROLL_CONFIG', label: t('owner.payrollConfig') },
  ];

  const handleSelectPolicy = (type: string) => {
    setSelectedPolicyType(type);
    const policy = policies.find(p => p.type === type && p.isActive);
    if (policy) {
      setSelectedPolicy(policy);
      setConfigText(JSON.stringify(policy.config, null, 2));
      setIsCreating(false);
      setIsEditing(false);
    } else {
      setSelectedPolicy(null);
      setConfigText('{}');
      setIsCreating(true);
      setIsEditing(true);
    }
    setJsonError(null);
  };

  const handleConfigChange = (value: string) => {
    setConfigText(value);
    try {
      const parsed = JSON.parse(value);
      setJsonError(null);
      if (selectedPolicy) {
        setSelectedPolicy({ ...selectedPolicy, config: parsed });
      }
    } catch (error: any) {
      setJsonError(error.message || t('owner.invalidJson'));
    }
  };

  const handleSave = () => {
    if (jsonError) {
      toast.showToast(t('owner.invalidJson'), 'error');
      return;
    }

    try {
      const config = JSON.parse(configText);
      
      if (isCreating || createAsNewVersion) {
        // Create new policy or new version
        createMutation.mutate({
          type: selectedPolicyType!,
          config,
          isActive: true,
        });
      } else if (selectedPolicy) {
        // Update existing policy
        updateMutation.mutate({
          id: selectedPolicy.id,
          data: { config },
        });
      }
    } catch (error) {
      toast.showToast(t('owner.invalidJson'), 'error');
    }
  };

  const getDefaultConfig = (type: string): Record<string, any> => {
    switch (type) {
      case 'ATTENDANCE_RULES':
        return {
          gracePeriodMinutes: 15,
          roundingEnabled: true,
          roundingInterval: 15,
          minimumWorkHours: 8,
        };
      case 'OVERTIME_POLICY':
        return {
          rules: {
            WEEKDAY: {
              enabled: true,
              maxHours: null,
              minimumPayment: 1.5,
            },
            WEEKEND: {
              enabled: true,
              maxHours: null,
              minimumPayment: 2.0,
            },
            HOLIDAY: {
              enabled: true,
              maxHours: null,
              minimumPayment: 3.0,
            },
          },
        };
      case 'LEAVE_POLICY':
        return {
          maxCarryoverDays: 5,
          requireApproval: true,
          allowOverlapping: false,
        };
      case 'PAYROLL_CONFIG':
        return {
          payday: 25,
          bpjsKesehatan: {
            type: 'percentage',
            value: 5,
          },
          bpjsKetenagakerjaan: {
            type: 'percentage',
            value: 2,
          },
          pph21Rate: 0.05,
        };
      default:
        return {};
    }
  };

  const handleCreateNew = () => {
    if (!selectedPolicyType) return;
    const defaultConfig = getDefaultConfig(selectedPolicyType);
    setConfigText(JSON.stringify(defaultConfig, null, 2));
    setCreateAsNewVersion(true);
    setIsEditing(true);
    setJsonError(null);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">{t('owner.policyManagement')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {policyTypes.map((type) => {
          const policy = policies.find(p => p.type === type.value && p.isActive);
          return (
            <div
              key={type.value}
              className={`bg-white p-4 rounded-lg shadow-sm border cursor-pointer hover:shadow-md ${
                selectedPolicyType === type.value ? 'ring-2 ring-indigo-500' : ''
              }`}
              onClick={() => handleSelectPolicy(type.value)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">{type.label}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {policy ? `v${policy.version}` : t('owner.noPolicy')}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {policy?.isActive ? t('owner.active') : t('owner.inactive')}
                  </div>
                </div>
                {policy && (
                  <span className="text-xs text-gray-400">
                    {new Date(policy.updatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedPolicyType && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold">
                {policyTypes.find(t => t.value === selectedPolicyType)?.label}
              </h3>
              {selectedPolicy && (
                <div className="text-sm text-gray-500 mt-1">
                  {t('owner.version')} {selectedPolicy.version} • {t('owner.created')}: {new Date(selectedPolicy.createdAt).toLocaleDateString()}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {selectedPolicy && !isEditing && (
                <Button
                  variant="secondary"
                  onClick={handleCreateNew}
                >
                  {t('owner.createNewVersion')}
                </Button>
              )}
              {selectedPolicy && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsEditing(!isEditing);
                    if (!isEditing) {
                      setConfigText(JSON.stringify(selectedPolicy.config, null, 2));
                    }
                    setJsonError(null);
                    setCreateAsNewVersion(false);
                  }}
                >
                  {isEditing ? t('common.cancel') : t('common.edit')}
                </Button>
              )}
            </div>
          </div>

          {/* Policy Edit/Create Modal */}
          <Modal
            isOpen={isEditing || isCreating}
            onClose={() => {
              setIsEditing(false);
              setIsCreating(false);
              setCreateAsNewVersion(false);
              setJsonError(null);
              if (selectedPolicy) {
                setConfigText(JSON.stringify(selectedPolicy.config, null, 2));
              }
            }}
            title={
              isCreating || createAsNewVersion
                ? t('owner.createPolicy')
                : t('owner.editPolicy')
            }
            size="lg"
          >
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium">{t('owner.config')}</label>
                  {!selectedPolicy && (
                    <button
                      type="button"
                      onClick={() => {
                        const defaultConfig = getDefaultConfig(selectedPolicyType);
                        setConfigText(JSON.stringify(defaultConfig, null, 2));
                        setJsonError(null);
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      {t('owner.loadDefault')}
                    </button>
                  )}
                </div>
                <textarea
                  value={configText}
                  onChange={(e) => handleConfigChange(e.target.value)}
                  className={`w-full p-2 border rounded-md font-mono text-sm ${
                    jsonError ? 'border-red-500' : 'border-gray-300'
                  }`}
                  rows={15}
                  placeholder="{}"
                />
                {jsonError && (
                  <div className="text-sm text-red-600 mt-1">
                    {t('owner.jsonError')}: {jsonError}
                  </div>
                )}
                {!jsonError && configText.trim() && (
                  <div className="text-sm text-green-600 mt-1">
                    {t('owner.validJson')}
                  </div>
                )}
              </div>
              {createAsNewVersion && (
                <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
                  {t('owner.newVersionNote')}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={updateMutation.isPending || createMutation.isPending || !!jsonError || !configText.trim()}
                >
                  {updateMutation.isPending || createMutation.isPending
                    ? t('common.saving')
                    : isCreating || createAsNewVersion
                    ? t('owner.createPolicy')
                    : t('common.save')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setIsCreating(false);
                    setCreateAsNewVersion(false);
                    setJsonError(null);
                    if (selectedPolicy) {
                      setConfigText(JSON.stringify(selectedPolicy.config, null, 2));
                    }
                  }}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          </Modal>

          {!isEditing && !isCreating && selectedPolicy ? (
            <div>
              <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto border">
                {JSON.stringify(selectedPolicy.config, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-4">{t('owner.noPolicyForType')}</p>
              <Button onClick={() => {
                setIsCreating(true);
                setIsEditing(true);
                const defaultConfig = getDefaultConfig(selectedPolicyType);
                setConfigText(JSON.stringify(defaultConfig, null, 2));
              }}>
                {t('owner.createPolicy')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmployeeManagement({ toast }: { toast: ReturnType<typeof useToast> }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showEmploymentForm, setShowEmploymentForm] = useState(false);
  const [selectedEmployeeForManager, setSelectedEmployeeForManager] = useState<Employee | null>(null);
  const [showManagerForm, setShowManagerForm] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedEmployeeForEdit, setSelectedEmployeeForEdit] = useState<Employee | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    nik: '',
    phone: '',
    address: '',
    division: '',
    employeeCode: '',
    joinDate: '',
    email: '',
    status: 'ACTIVE',
    role: 'EMPLOYEE',
  });
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'EMPLOYEE',
    employeeCode: '',
    firstName: '',
    lastName: '',
    nik: '',
    phone: '',
    address: '',
    division: '',
    joinDate: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
  });
  const [employmentData, setEmploymentData] = useState({
    type: '',
    baseSalary: '',
    hourlyRate: '',
    dailyRate: '',
    bankName: '',
    bankAccount: '',
    bankAccountName: '',
    npwp: '',
    bpjsKesehatan: '',
    bpjsKetenagakerjaan: '',
    hasBPJS: false,
    transportBonus: '',
    lunchBonus: '',
    thr: '',
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => employeeService.getAll(),
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  // Sorting state
  const [sortField, setSortField] = useState<'name' | 'employeeCode' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Sorted employees
  const sortedEmployees = useMemo(() => {
    if (!sortField) return employees;

    return [...employees].sort((a, b) => {
      let aValue: string;
      let bValue: string;

      if (sortField === 'name') {
        aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
        bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
      } else if (sortField === 'employeeCode') {
        aValue = a.employeeCode.toLowerCase();
        bValue = b.employeeCode.toLowerCase();
      } else {
        return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [employees, sortField, sortDirection]);

  const handleSort = (field: 'name' | 'employeeCode') => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const { data: selectedEmployeeData } = useQuery<Employee>({
    queryKey: ['employee', selectedEmployee?.id],
    queryFn: () => employeeService.getOne(selectedEmployee!.id),
    enabled: !!selectedEmployee && showEmploymentForm,
  });

  // Handle employment data update when employee data is fetched (React Query v5: use useEffect instead of onSuccess)
  useEffect(() => {
    if (selectedEmployeeData) {
      if (selectedEmployeeData.employment) {
        setEmploymentData({
          type: selectedEmployeeData.employment.type || '',
          baseSalary: selectedEmployeeData.employment.baseSalary?.toString() || '',
          hourlyRate: selectedEmployeeData.employment.hourlyRate?.toString() || '',
          dailyRate: selectedEmployeeData.employment.dailyRate?.toString() || '',
          bankName: selectedEmployeeData.employment.bankName || '',
          bankAccount: selectedEmployeeData.employment.bankAccount || '',
          bankAccountName: selectedEmployeeData.employment.bankAccountName || '',
          npwp: selectedEmployeeData.employment.npwp || '',
          bpjsKesehatan: selectedEmployeeData.employment.bpjsKesehatan || '',
          bpjsKetenagakerjaan: selectedEmployeeData.employment.bpjsKetenagakerjaan || '',
          hasBPJS: selectedEmployeeData.employment.hasBPJS || false,
          transportBonus: selectedEmployeeData.employment.transportBonus?.toString() || '',
          lunchBonus: selectedEmployeeData.employment.lunchBonus?.toString() || '',
          thr: selectedEmployeeData.employment.thr?.toString() || '',
        });
          } else {
            setEmploymentData({
              type: '',
              thr: '',
          baseSalary: '',
          hourlyRate: '',
          dailyRate: '',
          bankName: '',
          bankAccount: '',
          bankAccountName: '',
          npwp: '',
          bpjsKesehatan: '',
          bpjsKetenagakerjaan: '',
          hasBPJS: false,
          transportBonus: '',
          lunchBonus: '',
        });
      }
    }
  }, [selectedEmployeeData]);

  const createMutation = useMutation({
    mutationFn: employeeService.create,
    onSuccess: async () => {
      toast.showToast(t('owner.employeeCreated'), 'success');
      setShowCreateForm(false);
      setFormData({
        email: '',
        password: '',
        role: 'EMPLOYEE',
        employeeCode: '',
        firstName: '',
        lastName: '',
        nik: '',
        phone: '',
        address: '',
        division: '',
        joinDate: new Date().toISOString().split('T')[0],
        status: 'ACTIVE',
      });
      // Invalidate and refetch to ensure data is updated immediately
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      await queryClient.refetchQueries({ queryKey: ['employees'], type: 'active' });
    },
    onError: (error: any) => {
      // Extract error message
      const errorData = error.response?.data;
      let errorMessage = errorData?.message || t('common.error');
      
      // Handle validation errors - format them nicely
      if (errorData?.errors && typeof errorData.errors === 'object') {
        const validationErrors = Object.entries(errorData.errors)
          .map(([field, messages]: [string, any]) => {
            const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
            const messagesList = Array.isArray(messages) ? messages.join(', ') : messages;
            return `${fieldName}: ${messagesList}`;
          })
          .join('; ');
        
        if (validationErrors) {
          errorMessage = validationErrors;
        }
      }
      
      toast.showToast(errorMessage, 'error', 5000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Convert empty strings to undefined for optional fields
    const submitData = {
      ...formData,
      nik: formData.nik || undefined,
      phone: formData.phone || undefined,
      address: formData.address || undefined,
      division: formData.division || undefined,
    };
    createMutation.mutate(submitData);
  };

  const employmentMutation = useMutation({
    mutationFn: (data: typeof employmentData) => {
      if (!selectedEmployee) throw new Error('No employee selected');
      return employeeService.updateEmployment(selectedEmployee.id, {
        type: (data.type && data.type.trim() !== '') ? data.type as any : undefined,
        baseSalary: data.baseSalary ? parseFloat(data.baseSalary) : undefined,
        hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : undefined,
        dailyRate: data.dailyRate ? parseFloat(data.dailyRate) : undefined,
        bankName: data.bankName || undefined,
        bankAccount: data.bankAccount || undefined,
        bankAccountName: data.bankAccountName || undefined,
        npwp: data.npwp || undefined,
        bpjsKesehatan: data.bpjsKesehatan || undefined,
        bpjsKetenagakerjaan: data.bpjsKetenagakerjaan || undefined,
        hasBPJS: data.hasBPJS,
        transportBonus: data.transportBonus ? parseFloat(data.transportBonus) : undefined,
        lunchBonus: data.lunchBonus ? parseFloat(data.lunchBonus) : undefined,
        thr: data.thr ? parseFloat(data.thr) : undefined,
      });
    },
    onSuccess: async () => {
      toast.showToast(t('owner.employmentUpdated'), 'success');
      setShowEmploymentForm(false);
      setSelectedEmployee(null);
      // Invalidate and refetch to ensure data is updated immediately
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      await queryClient.invalidateQueries({ queryKey: ['employee'] });
      await queryClient.refetchQueries({ queryKey: ['employees'] });
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  const handleEmploymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    employmentMutation.mutate(employmentData);
  };

  const handleOpenEmploymentForm = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowEmploymentForm(true);
  };

  const handleOpenManagerForm = (employee: Employee) => {
    setSelectedEmployeeForManager(employee);
    setSelectedManagerId(employee.managerId || '');
    setShowManagerForm(true);
  };

  const updateManagerMutation = useMutation({
    mutationFn: ({ id, managerId }: { id: string; managerId: string | null }) =>
      employeeService.update(id, { managerId: managerId === '' ? null : managerId }),
    onSuccess: async () => {
      toast.showToast(t('owner.managerUpdated'), 'success');
      setShowManagerForm(false);
      setSelectedEmployeeForManager(null);
      // Invalidate and refetch to ensure data is updated immediately
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      await queryClient.refetchQueries({ queryKey: ['employees'] });
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  const handleManagerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeForManager) return;
    updateManagerMutation.mutate({
      id: selectedEmployeeForManager.id,
      managerId: selectedManagerId || null,
    });
  };

  const handleOpenEditForm = (employee: Employee) => {
    setSelectedEmployeeForEdit(employee);
    const joinDateStr = employee.joinDate 
      ? new Date(employee.joinDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    setEditFormData({
      firstName: employee.firstName,
      lastName: employee.lastName,
      nik: employee.nik || '',
      phone: employee.phone || '',
      address: employee.address || '',
      division: employee.division || '',
      employeeCode: employee.employeeCode,
      joinDate: joinDateStr,
      email: employee.user?.email || '',
      status: employee.status,
      role: employee.user?.role || 'EMPLOYEE',
    });
    setShowEditForm(true);
  };

  const updateEmployeeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof editFormData }) =>
      employeeService.update(id, {
        firstName: data.firstName,
        lastName: data.lastName,
        nik: data.nik || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        division: data.division || undefined,
        employeeCode: data.employeeCode,
        joinDate: data.joinDate,
        email: data.email,
        status: data.status as any,
        role: data.role as any,
        // Clear managerId if role is MANAGER (managers can't have managers)
        // Stock managers can have managers
        // Note: managerId is managed separately via the Change Manager button
        // But we need to clear it when role changes to MANAGER
        managerId: (data.role === 'MANAGER') ? null : undefined,
      }),
    onSuccess: async () => {
      toast.showToast(t('owner.employeeUpdated'), 'success');
      setShowEditForm(false);
      setSelectedEmployeeForEdit(null);
      // Invalidate and refetch to ensure data is updated immediately
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      await queryClient.refetchQueries({ queryKey: ['employees'], type: 'active' });
    },
    onError: (error: any) => {
      const errorData = error.response?.data;
      let errorMessage = errorData?.message || t('common.error');
      
      if (errorData?.errors && typeof errorData.errors === 'object') {
        const validationErrors = Object.entries(errorData.errors)
          .map(([field, messages]: [string, any]) => {
            const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
            const messagesList = Array.isArray(messages) ? messages.join(', ') : messages;
            return `${fieldName}: ${messagesList}`;
          })
          .join('; ');
        
        if (validationErrors) {
          errorMessage = validationErrors;
        }
      }
      
      toast.showToast(errorMessage, 'error', 5000);
    },
  });

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeForEdit) return;
    updateEmployeeMutation.mutate({
      id: selectedEmployeeForEdit.id,
      data: editFormData,
    });
  };

  const handleOpenDeleteConfirm = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setShowDeleteConfirm(true);
  };

  const deleteEmployeeMutation = useMutation({
    mutationFn: (id: string) => employeeService.delete(id),
    onSuccess: async () => {
      toast.showToast(t('owner.employeeDeleted'), 'success');
      setShowDeleteConfirm(false);
      setEmployeeToDelete(null);
      // Invalidate and refetch to ensure data is updated immediately
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      await queryClient.refetchQueries({ queryKey: ['employees'], type: 'active' });
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  const handleConfirmDelete = () => {
    if (!employeeToDelete) return;
    deleteEmployeeMutation.mutate(employeeToDelete.id);
  };

  const reactivateEmployeeMutation = useMutation({
    mutationFn: (id: string) => employeeService.update(id, { status: 'ACTIVE' as any }),
    onSuccess: async () => {
      toast.showToast(t('owner.employeeReactivated'), 'success');
      // Invalidate and refetch to ensure data is updated immediately
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      await queryClient.refetchQueries({ queryKey: ['employees'], type: 'active' });
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  const handleReactivateEmployee = (employee: Employee) => {
    reactivateEmployeeMutation.mutate(employee.id);
  };

  // Get list of managers (employees with MANAGER role)
  const managers = employees.filter(emp => emp.user?.role === 'MANAGER' || emp.user?.role === 'STOCK_MANAGER');

  const getManagerName = (managerId: string | null) => {
    if (!managerId) return '-';
    const manager = employees.find(e => e.id === managerId);
    return manager ? `${manager.firstName} ${manager.lastName}` : managerId;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{t('owner.employeeManagement')}</h2>
        <Button onClick={() => setShowCreateForm(true)}>{t('owner.createEmployee')}</Button>
      </div>

      {/* Create Employee Modal */}
      <Modal
        isOpen={showCreateForm}
        onClose={() => {
          setShowCreateForm(false);
          setFormData({
            email: '',
            password: '',
            role: 'EMPLOYEE',
            employeeCode: '',
            firstName: '',
            lastName: '',
            nik: '',
            phone: '',
            address: '',
            division: '',
            joinDate: new Date().toISOString().split('T')[0],
            status: 'ACTIVE',
          });
        }}
        title={t('owner.createEmployee')}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('owner.email')}</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('owner.password')}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  required
                  minLength={8}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('owner.employeeCode')}</label>
                <input
                  type="text"
                  value={formData.employeeCode}
                  onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('owner.role')}</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="EMPLOYEE">{t('owner.employee')}</option>
                  <option value="SUPERVISOR">{t('owner.supervisor')}</option>
                  <option value="STOCK_MANAGER">{t('owner.stockManager')}</option>
                  <option value="MANAGER">{t('owner.manager')}</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('owner.firstName')}</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('owner.lastName')}</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('owner.nik')}</label>
                <input
                  type="text"
                  value={formData.nik}
                  onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('owner.phone')}</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-2 border rounded-md"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('owner.address')}</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full p-2 border rounded-md"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('owner.division')}</label>
                <input
                  type="text"
                  value={formData.division}
                  onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  placeholder={t('owner.divisionPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('owner.joinDate')}</label>
                <input
                  type="date"
                  value={formData.joinDate}
                  onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? t('common.creating') : t('common.create')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowCreateForm(false);
                  setFormData({
                    email: '',
                    password: '',
                    role: 'EMPLOYEE',
                    employeeCode: '',
                    firstName: '',
                    lastName: '',
                    nik: '',
                    phone: '',
                    address: '',
                    division: '',
                    joinDate: new Date().toISOString().split('T')[0],
                    status: 'ACTIVE',
                  });
                }}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
      </Modal>

      <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={() => handleSort('employeeCode')}
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  {t('owner.employeeCode')}
                  {sortField === 'employeeCode' && (
                    <span className="text-indigo-600">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  {t('owner.name')}
                  {sortField === 'name' && (
                    <span className="text-indigo-600">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t('owner.email')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t('owner.division')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t('owner.role')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t('owner.status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t('owner.manager')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t('owner.employment')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t('owner.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedEmployees.map((emp) => (
              <tr key={emp.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{emp.employeeCode}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {emp.firstName} {emp.lastName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{emp.user?.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{emp.division || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{emp.user?.role}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      emp.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {emp.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-2">
                    <span>{getManagerName(emp.managerId)}</span>
                    {emp.user?.role !== 'OWNER' && emp.user?.role !== 'MANAGER' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenManagerForm(emp)}
                        className="text-xs"
                      >
                        {emp.managerId ? t('owner.changeManager') : t('owner.assignManager')}
                      </Button>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {emp.employment ? (
                    <span className="text-green-600">{t('owner.configured')}</span>
                  ) : (
                    <span className="text-red-600">{t('owner.notConfigured')}</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex gap-2">
                    {emp.user?.role !== 'OWNER' && (
                      <Button
                        variant="secondary"
                        onClick={() => handleOpenEmploymentForm(emp)}
                        className="text-xs"
                      >
                        {emp.employment ? t('owner.editEmployment') : t('owner.setupEmployment')}
                      </Button>
                    )}
                    {emp.user?.role !== 'OWNER' && (
                      <>
                        {emp.status === 'ACTIVE' ? (
                          <>
                            <Button
                              variant="secondary"
                              onClick={() => handleOpenEditForm(emp)}
                              className="text-xs"
                            >
                              {t('common.edit')}
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleOpenDeleteConfirm(emp)}
                              className="text-xs"
                            >
                              {t('common.delete')}
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="success"
                            onClick={() => handleReactivateEmployee(emp)}
                            className="text-xs"
                            disabled={reactivateEmployeeMutation.isPending}
                          >
                            {reactivateEmployeeMutation.isPending ? t('common.reactivating') : t('owner.reactivate')}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Employment Details Modal */}
      {showEmploymentForm && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {t('owner.employmentDetails')} - {selectedEmployee.firstName} {selectedEmployee.lastName}
              </h3>
              <button
                onClick={() => {
                  setShowEmploymentForm(false);
                  setSelectedEmployee(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEmploymentSubmit} className="space-y-4">
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  {t('owner.employmentOptionalNote')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('owner.employmentType')}</label>
                <select
                  value={employmentData.type}
                  onChange={(e) => setEmploymentData({ ...employmentData, type: e.target.value })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">{t('owner.selectEmploymentType')}</option>
                  <option value="MONTHLY">{t('owner.monthly')}</option>
                  <option value="HOURLY">{t('owner.hourly')}</option>
                  <option value="DAILY">{t('owner.daily')}</option>
                </select>
              </div>

              {employmentData.type === 'MONTHLY' && (
                <div>
                  <label className="block text-sm font-medium mb-1">{t('owner.baseSalary')}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={employmentData.baseSalary}
                    onChange={(e) => setEmploymentData({ ...employmentData, baseSalary: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    placeholder="0.00"
                  />
                </div>
              )}

              {employmentData.type === 'HOURLY' && (
                <div>
                  <label className="block text-sm font-medium mb-1">{t('owner.hourlyRate')}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={employmentData.hourlyRate}
                    onChange={(e) => setEmploymentData({ ...employmentData, hourlyRate: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    placeholder="0.00"
                  />
                </div>
              )}

              {employmentData.type === 'DAILY' && (
                <div>
                  <label className="block text-sm font-medium mb-1">{t('owner.dailyRate')}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={employmentData.dailyRate}
                    onChange={(e) => setEmploymentData({ ...employmentData, dailyRate: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    placeholder="0.00"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('owner.bankName')}</label>
                  <input
                    type="text"
                    value={employmentData.bankName}
                    onChange={(e) => setEmploymentData({ ...employmentData, bankName: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('owner.bankAccount')}</label>
                  <input
                    type="text"
                    value={employmentData.bankAccount}
                    onChange={(e) => setEmploymentData({ ...employmentData, bankAccount: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('owner.bankAccountName')}</label>
                <input
                  type="text"
                  value={employmentData.bankAccountName}
                  onChange={(e) => setEmploymentData({ ...employmentData, bankAccountName: e.target.value })}
                  className="w-full p-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('owner.npwp')}</label>
                <input
                  type="text"
                  value={employmentData.npwp}
                  onChange={(e) => setEmploymentData({ ...employmentData, npwp: e.target.value })}
                  className="w-full p-2 border rounded-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('owner.bpjsKesehatan')}</label>
                  <input
                    type="text"
                    value={employmentData.bpjsKesehatan}
                    onChange={(e) => setEmploymentData({ ...employmentData, bpjsKesehatan: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('owner.bpjsKetenagakerjaan')}</label>
                  <input
                    type="text"
                    value={employmentData.bpjsKetenagakerjaan}
                    onChange={(e) => setEmploymentData({ ...employmentData, bpjsKetenagakerjaan: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={employmentData.hasBPJS}
                    onChange={(e) => setEmploymentData({ ...employmentData, hasBPJS: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">{t('owner.hasBPJS')}</span>
                </label>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('owner.transportBonus')}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={employmentData.transportBonus}
                    onChange={(e) => setEmploymentData({ ...employmentData, transportBonus: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('owner.lunchBonus')}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={employmentData.lunchBonus}
                    onChange={(e) => setEmploymentData({ ...employmentData, lunchBonus: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('owner.thr')}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={employmentData.thr}
                    onChange={(e) => setEmploymentData({ ...employmentData, thr: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowEmploymentForm(false);
                    setSelectedEmployee(null);
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={employmentMutation.isPending}>
                  {employmentMutation.isPending ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditForm && selectedEmployeeForEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {t('owner.editEmployee')} - {selectedEmployeeForEdit.firstName} {selectedEmployeeForEdit.lastName}
              </h3>
              <button
                onClick={() => {
                  setShowEditForm(false);
                  setSelectedEmployeeForEdit(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('owner.employeeCode')}</label>
                  <input
                    type="text"
                    value={editFormData.employeeCode}
                    onChange={(e) => setEditFormData({ ...editFormData, employeeCode: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('owner.email')}</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('owner.firstName')}</label>
                  <input
                    type="text"
                    value={editFormData.firstName}
                    onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('owner.lastName')}</label>
                  <input
                    type="text"
                    value={editFormData.lastName}
                    onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('owner.joinDate')}</label>
                  <input
                    type="date"
                    value={editFormData.joinDate}
                    onChange={(e) => setEditFormData({ ...editFormData, joinDate: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('owner.division')}</label>
                  <input
                    type="text"
                    value={editFormData.division}
                    onChange={(e) => setEditFormData({ ...editFormData, division: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    placeholder={t('owner.divisionPlaceholder')}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('owner.nik')}</label>
                  <input
                    type="text"
                    value={editFormData.nik}
                    onChange={(e) => setEditFormData({ ...editFormData, nik: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('owner.phone')}</label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('owner.address')}</label>
                <textarea
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('owner.role')}</label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      setEditFormData({ 
                        ...editFormData, 
                        role: newRole,
                      });
                    }}
                    className="w-full p-2 border rounded-md"
                    required
                    disabled={selectedEmployeeForEdit.user?.role === 'OWNER'}
                  >
                    <option value="EMPLOYEE">{t('owner.employee')}</option>
                    <option value="SUPERVISOR">{t('owner.supervisor')}</option>
                    <option value="STOCK_MANAGER">{t('owner.stockManager')}</option>
                    <option value="MANAGER">{t('owner.manager')}</option>
                    {selectedEmployeeForEdit.user?.role === 'OWNER' && (
                      <option value="OWNER">{t('owner.owner')}</option>
                    )}
                  </select>
                  {selectedEmployeeForEdit.user?.role === 'OWNER' && (
                    <p className="text-xs text-gray-500 mt-1">
                      {t('owner.cannotChangeOwnerRole')}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('owner.status')}</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    <option value="ACTIVE">{t('owner.active')}</option>
                    <option value="INACTIVE">{t('owner.inactive')}</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowEditForm(false);
                    setSelectedEmployeeForEdit(null);
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={updateEmployeeMutation.isPending}>
                  {updateEmployeeMutation.isPending ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && employeeToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">{t('owner.deleteEmployee')}</h3>
            <p className="text-gray-600 mb-6">
              {t('owner.deleteEmployeeConfirm', { name: `${employeeToDelete.firstName} ${employeeToDelete.lastName}` })}
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setEmployeeToDelete(null);
                }}
                disabled={deleteEmployeeMutation.isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDelete}
                disabled={deleteEmployeeMutation.isPending}
              >
                {deleteEmployeeMutation.isPending ? t('common.deleting') : t('common.delete')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Manager Assignment Modal */}
      {showManagerForm && selectedEmployeeForManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {t('owner.assignManager')} - {selectedEmployeeForManager.firstName} {selectedEmployeeForManager.lastName}
              </h3>
              <button
                onClick={() => {
                  setShowManagerForm(false);
                  setSelectedEmployeeForManager(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleManagerSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('owner.selectManager')}</label>
                <select
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">{t('owner.noManager')}</option>
                  {managers
                    .filter(m => m.id !== selectedEmployeeForManager.id) // Can't assign self as manager
                    .map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.firstName} {manager.lastName} ({manager.employeeCode}) - {manager.user?.role}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {t('owner.managerHelpText')}
                </p>
              </div>

              {selectedManagerId && (
                <div className="bg-blue-50 p-3 rounded text-sm">
                  <div className="font-medium">{t('owner.currentSelection')}:</div>
                  <div className="mt-1">
                    {getManagerName(selectedManagerId)}
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowManagerForm(false);
                    setSelectedEmployeeForManager(null);
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={updateManagerMutation.isPending}>
                  {updateManagerMutation.isPending ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Approval Inbox Component for Owner (can see all employees)
function OwnerApprovalInbox() {
  const { t, i18n } = useTranslation();
  
  // Helper function to get translated leave type name
  const getLeaveTypeName = (leaveType?: { name?: string; nameId?: string }): string => {
    if (!leaveType) return 'N/A';
    const currentLang = i18n.language;
    if (currentLang === 'id' && leaveType.nameId) {
      return leaveType.nameId;
    }
    return leaveType.name || 'N/A';
  };
  const toast = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'attendance' | 'leave' | 'overtime'>('leave');
  const [rejectReason, setRejectReason] = useState<{ id: string; type: string } | null>(null);

  // Fetch all employees (owners can see all)
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => employeeService.getAll(),
  });

  // Get all pending requests from all employees
  const { data: attendanceAdjustments = [] } = useQuery<AttendanceAdjustment[]>({
    queryKey: ['attendanceAdjustments', 'pending', 'owner'],
    queryFn: async () => {
      if (employees.length === 0) return [];
      const allAdjustments: AttendanceAdjustment[] = [];
      for (const emp of employees) {
        try {
          const adjustments = await attendanceService.getAdjustments(emp.id);
          allAdjustments.push(...adjustments.filter(a => a.status === 'PENDING'));
        } catch (error) {
          // Skip if no access
        }
      }
      return allAdjustments;
    },
    enabled: employees.length > 0,
  });

  const { data: leaveRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ['leaveRequests', 'pending', 'owner'],
    queryFn: async () => {
      if (employees.length === 0) return [];
      const allRequests: LeaveRequest[] = [];
      for (const emp of employees) {
        try {
          const requests = await leaveService.getRequests(emp.id);
          allRequests.push(...requests.filter(r => r.status === 'PENDING'));
        } catch (error) {
          // Skip if no access
        }
      }
      return allRequests;
    },
    enabled: employees.length > 0,
  });

  const { data: overtimeRequests = [] } = useQuery<OvertimeRequest[]>({
    queryKey: ['overtimeRequests', 'pending', 'owner'],
    queryFn: async () => {
      if (employees.length === 0) return [];
      const allRequests: OvertimeRequest[] = [];
      for (const emp of employees) {
        try {
          const requests = await overtimeService.getRequests(emp.id);
          allRequests.push(...requests.filter(r => r.status === 'PENDING'));
        } catch (error) {
          // Skip if no access
        }
      }
      return allRequests;
    },
    enabled: employees.length > 0,
  });

  const approveAttendanceMutation = useMutation({
    mutationFn: attendanceService.approveAdjustment,
    onSuccess: async () => {
      toast.showToast(t('manager.approved'), 'success');
      await queryClient.invalidateQueries({ queryKey: ['attendanceAdjustments'] });
      await queryClient.invalidateQueries({ queryKey: ['pendingApprovalsCount'] });
      await queryClient.refetchQueries({ queryKey: ['attendanceAdjustments', 'pending', 'owner'] });
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  const rejectAttendanceMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      attendanceService.rejectAdjustment(id, reason),
    onSuccess: async () => {
      toast.showToast(t('manager.rejected'), 'success');
      await queryClient.invalidateQueries({ queryKey: ['attendanceAdjustments'] });
      await queryClient.invalidateQueries({ queryKey: ['pendingApprovalsCount'] });
      await queryClient.refetchQueries({ queryKey: ['attendanceAdjustments', 'pending', 'owner'] });
      setRejectReason(null);
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  const approveLeaveMutation = useMutation({
    mutationFn: leaveService.approveRequest,
    onSuccess: async () => {
      toast.showToast(t('manager.approved'), 'success');
      // Invalidate and refetch all related queries
      await queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      await queryClient.invalidateQueries({ queryKey: ['leaveBalances'] });
      await queryClient.invalidateQueries({ queryKey: ['pendingApprovalsCount'] });
      // Refetch the pending leave requests to update the list immediately
      await queryClient.refetchQueries({ queryKey: ['leaveRequests', 'pending', 'owner'] });
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  const rejectLeaveMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      leaveService.rejectRequest(id, reason),
    onSuccess: async () => {
      toast.showToast(t('manager.rejected'), 'success');
      // Invalidate and refetch all related queries
      await queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      await queryClient.invalidateQueries({ queryKey: ['pendingApprovalsCount'] });
      // Refetch the pending leave requests to update the list immediately
      await queryClient.refetchQueries({ queryKey: ['leaveRequests', 'pending', 'owner'] });
      setRejectReason(null);
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  const approveOvertimeMutation = useMutation({
    mutationFn: overtimeService.approveRequest,
    onSuccess: async () => {
      toast.showToast(t('manager.approved'), 'success');
      await queryClient.invalidateQueries({ queryKey: ['overtimeRequests'] });
      await queryClient.invalidateQueries({ queryKey: ['pendingApprovalsCount'] });
      await queryClient.refetchQueries({ queryKey: ['overtimeRequests', 'pending', 'owner'] });
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  const rejectOvertimeMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      overtimeService.rejectRequest(id, reason),
    onSuccess: async () => {
      toast.showToast(t('manager.rejected'), 'success');
      await queryClient.invalidateQueries({ queryKey: ['overtimeRequests'] });
      await queryClient.invalidateQueries({ queryKey: ['pendingApprovalsCount'] });
      await queryClient.refetchQueries({ queryKey: ['overtimeRequests', 'pending', 'owner'] });
      setRejectReason(null);
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  const getEmployeeName = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp ? `${emp.firstName} ${emp.lastName}` : employeeId;
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">{t('owner.approvalInbox')}</h2>

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
          {t('manager.attendanceAdjustments')} ({attendanceAdjustments.length})
        </button>
        <button
          onClick={() => setActiveTab('leave')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'leave'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-600'
          }`}
        >
          {t('manager.leaveRequests')} ({leaveRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('overtime')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'overtime'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-600'
          }`}
        >
          {t('manager.overtimeRequests')} ({overtimeRequests.length})
        </button>
      </div>

      {/* Attendance Adjustments */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          {attendanceAdjustments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('manager.noPendingRequests')}
            </div>
          ) : (
            attendanceAdjustments.map((adj) => (
              <div key={adj.id} className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="font-semibold">{getEmployeeName(adj.employeeId)}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {t('manager.requestedOn')}: {new Date(adj.requestedAt).toLocaleDateString()}
                      {adj.requester && (
                        <span className="ml-2">
                          ({t('manager.requestedBy')}: {adj.requester.name} - {adj.requester.role === 'MANAGER' ? t('manager.manager') : t('manager.employee')})
                        </span>
                      )}
                    </div>
                    {(adj.clockIn || adj.clockOut) && (
                      <div className="mt-2 text-sm">
                        <div className="font-medium mb-1">{t('manager.adjustmentDetails')}:</div>
                        {adj.clockIn && (
                          <div className="text-gray-600">
                            {t('attendance.clockIn')}: {new Date(adj.clockIn).toLocaleString()}
                          </div>
                        )}
                        {adj.clockOut && (
                          <div className="text-gray-600">
                            {t('attendance.clockOut')}: {new Date(adj.clockOut).toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="text-sm mt-2">
                      <span className="font-medium">{t('manager.reason')}:</span> {adj.reason}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => approveAttendanceMutation.mutate(adj.id)}
                    disabled={approveAttendanceMutation.isPending}
                  >
                    {approveAttendanceMutation.isPending ? t('common.loading') : t('common.approve')}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setRejectReason({ id: adj.id, type: 'attendance' })}
                    disabled={rejectAttendanceMutation.isPending}
                  >
                    {t('common.reject')}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Leave Requests */}
      {activeTab === 'leave' && (
        <div className="space-y-4">
          {leaveRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('manager.noPendingRequests')}
            </div>
          ) : (
            leaveRequests.map((request) => (
              <div key={request.id} className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-semibold">{getEmployeeName(request.employeeId)}</div>
                    <div className="text-sm text-gray-600">
                      {getLeaveTypeName(request.leaveType)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(request.startDate).toLocaleDateString()} -{' '}
                      {new Date(request.endDate).toLocaleDateString()} ({request.days} {t('leave.days')})
                    </div>
                    {request.reason && (
                      <div className="text-sm mt-2">{request.reason}</div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => approveLeaveMutation.mutate(request.id)}
                    disabled={approveLeaveMutation.isPending}
                  >
                    {t('common.approve')}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setRejectReason({ id: request.id, type: 'leave' })}
                    disabled={rejectLeaveMutation.isPending}
                  >
                    {t('common.reject')}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Overtime Requests */}
      {activeTab === 'overtime' && (
        <div className="space-y-4">
          {overtimeRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('manager.noPendingRequests')}
            </div>
          ) : (
            overtimeRequests.map((request) => (
              <div key={request.id} className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-semibold">{getEmployeeName(request.employeeId)}</div>
                    <div className="text-sm text-gray-600">
                      {new Date(request.date).toLocaleDateString()} - {request.duration} {t('overtime.minutes')}
                    </div>
                    {(request.calculatedAmount || request.calculatedPay) && (
                      <div className="text-sm text-green-600 font-medium mt-1">
                        {new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                        }).format(request.calculatedAmount || request.calculatedPay || 0)}
                      </div>
                    )}
                    <div className="text-sm mt-2">{request.reason}</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => approveOvertimeMutation.mutate(request.id)}
                    disabled={approveOvertimeMutation.isPending}
                  >
                    {t('common.approve')}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setRejectReason({ id: request.id, type: 'overtime' })}
                    disabled={rejectOvertimeMutation.isPending}
                  >
                    {t('common.reject')}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectReason && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">{t('manager.rejectionReason')}</h3>
            <textarea
              id="rejection-reason"
              className="w-full p-2 border rounded-md mb-4"
              rows={4}
              placeholder={t('manager.rejectionReason')}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => setRejectReason(null)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  const reason = (document.getElementById('rejection-reason') as HTMLTextAreaElement)?.value;
                  if (reason && reason.trim()) {
                    if (rejectReason.type === 'attendance') {
                      rejectAttendanceMutation.mutate({ id: rejectReason.id, reason: reason.trim() });
                    } else if (rejectReason.type === 'leave') {
                      rejectLeaveMutation.mutate({ id: rejectReason.id, reason: reason.trim() });
                    } else if (rejectReason.type === 'overtime') {
                      rejectOvertimeMutation.mutate({ id: rejectReason.id, reason: reason.trim() });
                    }
                  } else {
                    toast.showToast(t('manager.rejectionReasonRequired'), 'error');
                  }
                }}
                disabled={
                  rejectAttendanceMutation.isPending ||
                  rejectLeaveMutation.isPending ||
                  rejectOvertimeMutation.isPending
                }
              >
                {t('common.reject')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Approval History Component for Owner
function OwnerApprovalHistory() {
  const { t, i18n } = useTranslation();
  
  // Helper function to get translated leave type name
  const getLeaveTypeName = (leaveType?: { name?: string; nameId?: string }): string => {
    if (!leaveType) return 'N/A';
    const currentLang = i18n.language;
    if (currentLang === 'id' && leaveType.nameId) {
      return leaveType.nameId;
    }
    return leaveType.name || 'N/A';
  };
  const [activeTab, setActiveTab] = useState<'attendance' | 'leave' | 'overtime'>('leave');
  const [attendanceHistoryPage, setAttendanceHistoryPage] = useState(1);
  const [leaveHistoryPage, setLeaveHistoryPage] = useState(1);
  const [overtimeHistoryPage, setOvertimeHistoryPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch all employees
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => employeeService.getAll(),
  });

  // Get all processed requests from all employees
  const { data: attendanceAdjustments = [] } = useQuery<AttendanceAdjustment[]>({
    queryKey: ['attendanceAdjustments', 'history', 'owner'],
    queryFn: async () => {
      if (employees.length === 0) return [];
      const allAdjustments: AttendanceAdjustment[] = [];
      for (const emp of employees) {
        try {
          const adjustments = await attendanceService.getAdjustments(emp.id);
          allAdjustments.push(...adjustments.filter(a => a.status !== 'PENDING'));
        } catch (error) {
          // Skip if no access
        }
      }
      return allAdjustments.sort((a, b) => 
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      );
    },
    enabled: employees.length > 0,
  });

  const { data: leaveRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ['leaveRequests', 'history', 'owner'],
    queryFn: async () => {
      if (employees.length === 0) return [];
      const allRequests: LeaveRequest[] = [];
      for (const emp of employees) {
        try {
          const requests = await leaveService.getRequests(emp.id);
          allRequests.push(...requests.filter(r => r.status !== 'PENDING'));
        } catch (error) {
          // Skip if no access
        }
      }
      return allRequests.sort((a, b) => 
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      );
    },
    enabled: employees.length > 0,
  });

  const { data: overtimeRequests = [] } = useQuery<OvertimeRequest[]>({
    queryKey: ['overtimeRequests', 'history', 'owner'],
    queryFn: async () => {
      if (employees.length === 0) return [];
      const allRequests: OvertimeRequest[] = [];
      for (const emp of employees) {
        try {
          const requests = await overtimeService.getRequests(emp.id);
          allRequests.push(...requests.filter(r => r.status !== 'PENDING'));
        } catch (error) {
          // Skip if no access
        }
      }
      return allRequests.sort((a, b) => 
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      );
    },
    enabled: employees.length > 0,
  });

  const getEmployeeName = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp ? `${emp.firstName} ${emp.lastName}` : employeeId;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'APPROVED') {
      return <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">{t('manager.approved')}</span>;
    } else if (status === 'REJECTED') {
      return <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">{t('manager.rejected')}</span>;
    }
    return <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">{status}</span>;
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">{t('owner.approvalHistory')}</h2>

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
          {t('manager.attendanceAdjustments')} ({attendanceAdjustments.length})
        </button>
        <button
          onClick={() => setActiveTab('leave')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'leave'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-600'
          }`}
        >
          {t('manager.leaveRequests')} ({leaveRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('overtime')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'overtime'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-600'
          }`}
        >
          {t('manager.overtimeRequests')} ({overtimeRequests.length})
        </button>
      </div>

      {/* Attendance Adjustments History */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          {attendanceAdjustments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('manager.noHistory')}
            </div>
          ) : (() => {
            const totalPages = Math.ceil(attendanceAdjustments.length / itemsPerPage);
            const startIndex = (attendanceHistoryPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const paginatedAdjustments = attendanceAdjustments.slice(startIndex, endIndex);

            return (
              <>
                <div className="space-y-4">
                  {paginatedAdjustments.map((adj) => (
              <div key={adj.id} className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="font-semibold">{getEmployeeName(adj.employeeId)}</div>
                      {getStatusBadge(adj.status)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {t('manager.requestedOn')}: {new Date(adj.requestedAt).toLocaleDateString()} {new Date(adj.requestedAt).toLocaleTimeString()}
                    </div>
                    {(adj.clockIn || adj.clockOut) && (
                      <div className="mt-2 text-sm">
                        <div className="font-medium mb-1">{t('manager.adjustmentDetails')}:</div>
                        {adj.clockIn && (
                          <div className="text-gray-600">
                            {t('attendance.clockIn')}: {new Date(adj.clockIn).toLocaleString()}
                          </div>
                        )}
                        {adj.clockOut && (
                          <div className="text-gray-600">
                            {t('attendance.clockOut')}: {new Date(adj.clockOut).toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="text-sm mt-2">
                      <span className="font-medium">{t('manager.reason')}:</span> {adj.reason}
                    </div>
                    {adj.approvedAt && (
                      <div className="text-sm text-gray-600 mt-1">
                        {adj.status === 'APPROVED' ? t('manager.approvedOn') : t('manager.rejectedOn')}: {new Date(adj.approvedAt).toLocaleDateString()} {new Date(adj.approvedAt).toLocaleTimeString()}
                        {adj.approver && (
                          <span className="ml-2">
                            ({adj.status === 'APPROVED' ? t('manager.approvedBy') : t('manager.rejectedBy')}: {adj.approver.name} - {adj.approver.role === 'MANAGER' ? t('manager.manager') : t('manager.owner')})
                          </span>
                        )}
                      </div>
                    )}
                    {adj.rejectedReason && (
                      <div className="text-sm mt-2 text-red-600">
                        <span className="font-medium">{t('manager.rejectionReason')}:</span> {adj.rejectedReason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
                  ))}
                </div>
                <div className="bg-white rounded-lg shadow-sm border">
                  <Pagination
                    currentPage={attendanceHistoryPage}
                    totalPages={totalPages}
                    onPageChange={setAttendanceHistoryPage}
                    totalItems={attendanceAdjustments.length}
                    itemsPerPage={itemsPerPage}
                  />
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Leave Requests History */}
      {activeTab === 'leave' && (
        <div className="space-y-4">
          {leaveRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('manager.noHistory')}
            </div>
          ) : (() => {
            const totalPages = Math.ceil(leaveRequests.length / itemsPerPage);
            const startIndex = (leaveHistoryPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const paginatedRequests = leaveRequests.slice(startIndex, endIndex);

            return (
              <>
                <div className="space-y-4">
                  {paginatedRequests.map((request) => (
              <div key={request.id} className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="font-semibold">{getEmployeeName(request.employeeId)}</div>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {getLeaveTypeName(request.leaveType)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(request.startDate).toLocaleDateString()} -{' '}
                      {new Date(request.endDate).toLocaleDateString()} ({request.days} {t('leave.days')})
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {t('manager.requestedOn')}: {new Date(request.requestedAt).toLocaleDateString()} {new Date(request.requestedAt).toLocaleTimeString()}
                    </div>
                    {request.approvedAt && (
                      <div className="text-sm text-gray-600 mt-1">
                        {request.status === 'APPROVED' ? t('manager.approvedOn') : t('manager.rejectedOn')}: {new Date(request.approvedAt).toLocaleDateString()} {new Date(request.approvedAt).toLocaleTimeString()}
                        {request.approver && (
                          <span className="ml-2">
                            ({request.status === 'APPROVED' ? t('manager.approvedBy') : t('manager.rejectedBy')}: {request.approver.name} - {request.approver.role === 'MANAGER' ? t('manager.manager') : t('manager.owner')})
                          </span>
                        )}
                      </div>
                    )}
                    {request.reason && (
                      <div className="text-sm mt-2">
                        <span className="font-medium">{t('manager.reason')}:</span> {request.reason}
                      </div>
                    )}
                    {request.rejectedReason && (
                      <div className="text-sm mt-2 text-red-600">
                        <span className="font-medium">{t('manager.rejectionReason')}:</span> {request.rejectedReason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
                  ))}
                </div>
                <div className="bg-white rounded-lg shadow-sm border">
                  <Pagination
                    currentPage={leaveHistoryPage}
                    totalPages={totalPages}
                    onPageChange={setLeaveHistoryPage}
                    totalItems={leaveRequests.length}
                    itemsPerPage={itemsPerPage}
                  />
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Overtime Requests History */}
      {activeTab === 'overtime' && (
        <div className="space-y-4">
          {overtimeRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('manager.noHistory')}
            </div>
          ) : (() => {
            const totalPages = Math.ceil(overtimeRequests.length / itemsPerPage);
            const startIndex = (overtimeHistoryPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const paginatedRequests = overtimeRequests.slice(startIndex, endIndex);

            return (
              <>
                <div className="space-y-4">
                  {paginatedRequests.map((request) => (
              <div key={request.id} className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="font-semibold">{getEmployeeName(request.employeeId)}</div>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(request.date).toLocaleDateString()} - {request.duration} {t('overtime.minutes')}
                    </div>
                    {(request.calculatedAmount || request.calculatedPay) && (
                      <div className="text-sm text-green-600 font-medium mt-1">
                        {new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                        }).format(request.calculatedAmount || request.calculatedPay || 0)}
                      </div>
                    )}
                    <div className="text-sm text-gray-600 mt-1">
                      {t('manager.requestedOn')}: {new Date(request.requestedAt).toLocaleDateString()} {new Date(request.requestedAt).toLocaleTimeString()}
                    </div>
                    {request.approvedAt && (
                      <div className="text-sm text-gray-600 mt-1">
                        {request.status === 'APPROVED' ? t('manager.approvedOn') : t('manager.rejectedOn')}: {new Date(request.approvedAt).toLocaleDateString()} {new Date(request.approvedAt).toLocaleTimeString()}
                        {request.approver && (
                          <span className="ml-2">
                            ({request.status === 'APPROVED' ? t('manager.approvedBy') : t('manager.rejectedBy')}: {request.approver.name} - {request.approver.role === 'MANAGER' ? t('manager.manager') : t('manager.owner')})
                          </span>
                        )}
                      </div>
                    )}
                    <div className="text-sm mt-2">
                      <span className="font-medium">{t('manager.reason')}:</span> {request.reason}
                    </div>
                    {request.rejectedReason && (
                      <div className="text-sm mt-2 text-red-600">
                        <span className="font-medium">{t('manager.rejectionReason')}:</span> {request.rejectedReason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
                  ))}
                </div>
                <div className="bg-white rounded-lg shadow-sm border">
                  <Pagination
                    currentPage={overtimeHistoryPage}
                    totalPages={totalPages}
                    onPageChange={setOvertimeHistoryPage}
                    totalItems={overtimeRequests.length}
                    itemsPerPage={itemsPerPage}
                  />
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// Leave Type Management Component
function LeaveTypeManagement() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editingType, setEditingType] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    maxBalance: number | null;
    accrualRate: number | null;
    carryoverAllowed: boolean;
    carryoverMax: number | null;
    expiresAfterMonths: number | null;
  }>({
    maxBalance: null,
    accrualRate: null,
    carryoverAllowed: false,
    carryoverMax: null,
    expiresAfterMonths: null,
  });

  // Fetch leave policy
  const { data: leavePolicy } = useQuery<Policy>({
    queryKey: ['leavePolicy'],
    queryFn: () => policyService.getByType('LEAVE_POLICY'),
    retry: false, // Don't retry if policy doesn't exist
  });

  // Extract policy settings
  const policyConfig = leavePolicy?.config || {};
  const accrualMethod = policyConfig.accrualMethod || null;
  const hasAccrual = accrualMethod && accrualMethod !== 'NONE';
  const carryoverAllowed = policyConfig.carryoverAllowed ?? true;

  // Helper function to get translated leave type name
  const getLeaveTypeName = (type: LeaveType): string => {
    const currentLang = i18n.language;
    if (currentLang === 'id' && type.nameId) {
      return type.nameId;
    }
    return type.name;
  };

  const { data: leaveTypes = [], isLoading } = useQuery<LeaveType[]>({
    queryKey: ['leaveTypes', 'all'],
    queryFn: () => leaveService.getLeaveTypes(true), // Include inactive
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      leaveService.updateLeaveType(id, data),
    onSuccess: () => {
      toast.showToast(t('owner.leaveTypeUpdated'), 'success');
      setEditingType(null);
      queryClient.invalidateQueries({ queryKey: ['leaveTypes'] });
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  const handleEdit = (leaveType: LeaveType) => {
    setEditingType(leaveType.id);
    setFormData({
      maxBalance: leaveType.maxBalance,
      accrualRate: typeof leaveType.accrualRate === 'string' 
        ? parseFloat(leaveType.accrualRate) 
        : leaveType.accrualRate,
      carryoverAllowed: leaveType.carryoverAllowed,
      carryoverMax: leaveType.carryoverMax,
      expiresAfterMonths: leaveType.expiresAfterMonths,
    });
  };

  const handleSave = (id: string) => {
    updateMutation.mutate({
      id,
      data: {
        maxBalance: formData.maxBalance || null,
        // Only set accrualRate if accrual is enabled by policy
        accrualRate: hasAccrual ? (formData.accrualRate || null) : null,
        // Only set carryover if allowed by policy
        carryoverAllowed: carryoverAllowed ? formData.carryoverAllowed : false,
        carryoverMax: carryoverAllowed ? (formData.carryoverMax || null) : null,
        expiresAfterMonths: formData.expiresAfterMonths || null,
      },
    });
  };

  const handleCancel = () => {
    setEditingType(null);
    setFormData({
      maxBalance: null,
      accrualRate: null,
      carryoverAllowed: false,
      carryoverMax: null,
      expiresAfterMonths: null,
    });
  };

  // Map common leave type codes to display names (fallback if nameId not available)
  const getLeaveTypeDisplayName = (type: LeaveType) => {
    // First try to use translation helper
    const translatedName = getLeaveTypeName(type);
    if (translatedName !== type.name) {
      return translatedName; // nameId was used
    }
    // Fallback to code-based translation
    const codeMap: Record<string, string> = {
      'ANNUAL': t('owner.annualLeave'),
      'MATERNITY': t('owner.maternityLeave'),
      'SICK': t('owner.sickLeave'),
      'PERMISSION': t('owner.permissionLeave'),
      'PATERNITY': t('owner.paternityLeave'),
      'UNPAID': t('owner.unpaidLeave'),
    };
    return codeMap[type.code] || type.name;
  };

  if (isLoading) {
    return <div className="p-6">{t('common.loading')}</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{t('owner.leaveQuotaManagement')}</h2>
        <p className="text-gray-600 mt-2">{t('owner.leaveQuotaDescription')}</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('owner.leaveType')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('owner.maxBalance')} ({t('owner.days')})
                </th>
                {hasAccrual && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('owner.accrualRate')} ({t('owner.daysPerMonth')})
                  </th>
                )}
                {carryoverAllowed && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('owner.carryoverAllowed')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('owner.carryoverMax')} ({t('owner.days')})
                    </th>
                  </>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('owner.expiresAfter')} ({t('owner.months')})
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leaveTypes.map((type) => (
                <tr key={type.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">
                      {getLeaveTypeDisplayName(type)}
                    </div>
                    <div className="text-sm text-gray-500">{type.code}</div>
                  </td>
                  {editingType === type.id ? (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          value={formData.maxBalance ?? ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              maxBalance: e.target.value ? parseInt(e.target.value) : null,
                            })
                          }
                          className="w-20 p-1 border rounded text-sm"
                          placeholder="-"
                        />
                      </td>
                      {hasAccrual && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.accrualRate ?? ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                accrualRate: e.target.value ? parseFloat(e.target.value) : null,
                              })
                            }
                            className="w-20 p-1 border rounded text-sm"
                            placeholder="-"
                          />
                        </td>
                      )}
                      {carryoverAllowed && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={formData.carryoverAllowed}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  carryoverAllowed: e.target.checked,
                                })
                              }
                              className="rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="number"
                              min="0"
                              value={formData.carryoverMax ?? ''}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  carryoverMax: e.target.value ? parseInt(e.target.value) : null,
                                })
                              }
                              className="w-20 p-1 border rounded text-sm"
                              placeholder="-"
                              disabled={!formData.carryoverAllowed}
                            />
                          </td>
                        </>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          value={formData.expiresAfterMonths ?? ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              expiresAfterMonths: e.target.value ? parseInt(e.target.value) : null,
                            })
                          }
                          className="w-20 p-1 border rounded text-sm"
                          placeholder="-"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSave(type.id)}
                            disabled={updateMutation.isPending}
                          >
                            {t('common.save')}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={handleCancel}
                            disabled={updateMutation.isPending}
                          >
                            {t('common.cancel')}
                          </Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {type.maxBalance ?? '-'}
                      </td>
                      {hasAccrual && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {type.accrualRate ? Number(type.accrualRate).toFixed(2) : '-'}
                        </td>
                      )}
                      {carryoverAllowed && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {type.carryoverAllowed ? t('common.yes') : t('common.no')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {type.carryoverMax ?? '-'}
                          </td>
                        </>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {type.expiresAfterMonths ?? '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button size="sm" onClick={() => handleEdit(type)}>
                          {t('common.edit')}
                        </Button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function OwnerDashboard() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get initial view from URL or default to 'company'
  const getInitialView = (): 'company' | 'policy' | 'employees' | 'payroll' | 'shiftSchedule' | 'reports' | 'audit' | 'approvals' | 'approvalHistory' | 'leaveQuota' | 'profile' => {
    const tab = searchParams.get('tab');
    const validViews = ['company', 'policy', 'employees', 'payroll', 'shiftSchedule', 'reports', 'audit', 'approvals', 'approvalHistory', 'leaveQuota', 'profile'];
    return (tab && validViews.includes(tab)) ? tab as any : 'company';
  };
  
  const [activeView, setActiveView] = useState<'company' | 'policy' | 'employees' | 'payroll' | 'shiftSchedule' | 'reports' | 'audit' | 'approvals' | 'approvalHistory' | 'leaveQuota' | 'profile'>(getInitialView());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const isInitialMount = useRef(true);

  // Fetch all employees for counting pending approvals
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => employeeService.getAll(),
  });

  // Count pending approvals
  const { data: pendingApprovalsCount = 0 } = useQuery<number>({
    queryKey: ['pendingApprovalsCount', 'owner'],
    queryFn: async () => {
      if (employees.length === 0) return 0;
      let count = 0;
      
      // Count pending attendance adjustments
      for (const emp of employees) {
        try {
          const adjustments = await attendanceService.getAdjustments(emp.id);
          count += adjustments.filter(a => a.status === 'PENDING').length;
        } catch (error) {
          // Skip if no access
        }
      }
      
      // Count pending leave requests
      for (const emp of employees) {
        try {
          const requests = await leaveService.getRequests(emp.id);
          count += requests.filter(r => r.status === 'PENDING').length;
        } catch (error) {
          // Skip if no access
        }
      }
      
      // Count pending overtime requests
      for (const emp of employees) {
        try {
          const requests = await overtimeService.getRequests(emp.id);
          count += requests.filter(r => r.status === 'PENDING').length;
        } catch (error) {
          // Skip if no access
        }
      }
      
      return count;
    },
    enabled: employees.length > 0,
    refetchInterval: 30000, // Refetch every 30 seconds to keep count updated
  });

  // Update URL when activeView changes
  const handleViewChange = (view: 'company' | 'policy' | 'employees' | 'payroll' | 'shiftSchedule' | 'reports' | 'audit' | 'approvals' | 'approvalHistory' | 'leaveQuota' | 'profile') => {
    setActiveView(view);
    setSearchParams({ tab: view }, { replace: true });
  };

  // Sync with URL on mount and when URL changes (e.g., browser back/forward)
  useEffect(() => {
    const tab = searchParams.get('tab');
    const validViews = ['company', 'policy', 'employees', 'payroll', 'shiftSchedule', 'reports', 'audit', 'approvals', 'approvalHistory', 'leaveQuota', 'profile'];
    
    if (isInitialMount.current) {
      // On initial mount, ensure URL has a tab parameter
      if (!tab) {
        setSearchParams({ tab: activeView }, { replace: true });
      }
      isInitialMount.current = false;
      return;
    }
    
    // After initial mount, sync state to URL changes (e.g., browser back/forward)
    if (tab && validViews.includes(tab) && tab !== activeView) {
      setActiveView(tab as any);
    }
  }, [searchParams, activeView, setSearchParams]);

  // Primary navigation items (most frequently used)
  const primaryNavItems = [
    { key: 'company', label: t('owner.companySettings') },
    { key: 'employees', label: t('owner.employeeManagement') },
    { key: 'payroll', label: t('owner.payroll') },
  ];

  // Secondary navigation items (grouped in "More" menu)
  const secondaryNavItems = [
    { key: 'profile', label: t('profile.profile') },
    { key: 'policy', label: t('owner.policyManagement') },
    { key: 'shiftSchedule', label: t('shiftSchedule.title') },
    { key: 'reports', label: t('owner.reports') },
    { key: 'approvals', label: t('owner.approvalInbox') },
    { key: 'approvalHistory', label: t('owner.approvalHistory') },
    { key: 'leaveQuota', label: t('owner.leaveQuotaManagement') },
    { key: 'audit', label: t('owner.auditLogs') },
  ];

  // All navigation items for mobile menu
  const allNavItems = [...primaryNavItems, ...secondaryNavItems];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Mobile menu button */}
            <div className="flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                aria-label="Toggle menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
              <h1 className="text-xl font-semibold ml-2 md:ml-0">{t('dashboard.owner')}</h1>
            </div>

            {/* Desktop navigation */}
            <div className="hidden md:flex items-center space-x-4 flex-1 justify-center">
              {/* Primary nav items */}
              <div className="flex space-x-2">
                {primaryNavItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleViewChange(item.key as any)}
                    className={`px-3 py-2 text-sm font-medium whitespace-nowrap ${
                      activeView === item.key
                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* More menu dropdown */}
              <div className="relative">
                <button
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  className={`px-3 py-2 text-sm font-medium flex items-center space-x-1 ${
                    secondaryNavItems.some(item => activeView === item.key)
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <span>{t('common.more')}</span>
                  <svg
                    className={`h-4 w-4 transition-transform ${moreMenuOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown menu */}
                {moreMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMoreMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                      <div className="py-1">
                        {secondaryNavItems.map((item) => (
                          <button
                            key={item.key}
                            onClick={() => {
                              handleViewChange(item.key as any);
                              setMoreMenuOpen(false);
                            }}
                            className={`block w-full text-left px-4 py-2 text-sm relative ${
                              activeView === item.key
                                ? 'bg-indigo-50 text-indigo-600'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <span className="flex items-center justify-between">
                              <span>{item.label}</span>
                              {item.key === 'approvals' && pendingApprovalsCount > 0 && (
                                <span className="ml-2 h-2 w-2 bg-red-500 rounded-full"></span>
                              )}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* User info, language switcher, and logout */}
            <div className="flex items-center space-x-2 md:space-x-4">
              <span className="hidden sm:inline text-sm text-gray-600">{user?.email}</span>
              <LanguageSwitcher />
              <button
                onClick={logout}
                className="px-3 md:px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                {t('common.logout')}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200">
              <div className="px-2 pt-2 pb-3 space-y-1">
                {allNavItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      handleViewChange(item.key as any);
                      setMobileMenuOpen(false);
                    }}
                    className={`block w-full text-left px-3 py-2 text-base font-medium rounded-md relative ${
                      activeView === item.key
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="flex items-center justify-between">
                      <span>{item.label}</span>
                      {item.key === 'approvals' && pendingApprovalsCount > 0 && (
                        <span className="ml-2 h-2 w-2 bg-red-500 rounded-full"></span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6">
        {activeView === 'company' && <CompanySettings />}
        {activeView === 'policy' && <PolicyManagement />}
        {activeView === 'employees' && <EmployeeManagement toast={toast} />}
        {activeView === 'payroll' && <PayrollPage />}
        {activeView === 'shiftSchedule' && <ShiftSchedulePage />}
        {activeView === 'reports' && <ReportingPage />}
        {activeView === 'audit' && <AuditLogPage />}
        {activeView === 'approvals' && <OwnerApprovalInbox />}
        {activeView === 'approvalHistory' && <OwnerApprovalHistory />}
        {activeView === 'leaveQuota' && <LeaveTypeManagement />}
        {activeView === 'profile' && <ProfilePage />}
      </main>

      {/* Toast Container */}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}
