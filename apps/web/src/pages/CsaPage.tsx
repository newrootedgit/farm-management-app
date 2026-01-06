import { useState } from 'react';
import { useFarm } from '../lib/api-client';
import {
  useCsaPrograms,
  useCsaProgram,
  useCreateCsaProgram,
  useUpdateCsaProgram,
  useGenerateCsaWeeks,
  useCreateCsaShareType,
  useDeleteCsaShareType,
  useCsaMembers,
  useEnrollCsaMember,
  useRecordCsaPayment,
  useCsaWeeks,
  useCsaWeek,
  useFinalizeCsaWeek,
  useGenerateCsaOrders,
  useCustomers,
  useProducts,
  useSetCsaWeekAllocations,
  useCreateCsaPickupLocation,
  useUpdateCsaPickupLocation,
  useDeleteCsaPickupLocation,
} from '../lib/api-client';
import {
  PlusIcon,
  TrashIcon,
  UserGroupIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  XMarkIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { WeekAllocationGrid, PickupLocationManager } from '../components/csa';
import type { CsaProgramStatus, CsaWeekStatus, CsaMemberStatus, CsaPaymentStatus, SetWeekAllocation } from '@farm/shared';

const STATUS_STYLES: Record<CsaProgramStatus, { bg: string; text: string }> = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700' },
  OPEN_ENROLLMENT: { bg: 'bg-blue-100', text: 'text-blue-700' },
  ACTIVE: { bg: 'bg-green-100', text: 'text-green-700' },
  COMPLETED: { bg: 'bg-purple-100', text: 'text-purple-700' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-700' },
};

const WEEK_STATUS_STYLES: Record<CsaWeekStatus, { bg: string; text: string }> = {
  PLANNING: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  FINALIZED: { bg: 'bg-blue-100', text: 'text-blue-700' },
  DISTRIBUTED: { bg: 'bg-green-100', text: 'text-green-700' },
};

const MEMBER_STATUS_STYLES: Record<CsaMemberStatus, { bg: string; text: string }> = {
  ACTIVE: { bg: 'bg-green-100', text: 'text-green-700' },
  PAUSED: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-700' },
};

const PAYMENT_STATUS_STYLES: Record<CsaPaymentStatus, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-gray-100', text: 'text-gray-700' },
  PARTIAL: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  PAID: { bg: 'bg-green-100', text: 'text-green-700' },
  REFUNDED: { bg: 'bg-red-100', text: 'text-red-700' },
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function CsaPage() {
  const { data: farm } = useFarm(localStorage.getItem('selectedFarmId') || undefined);
  const farmId = farm?.id || '';

  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'programs' | 'members' | 'weeks'>('programs');
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [showShareTypeForm, setShowShareTypeForm] = useState(false);
  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [showWeekDetail, setShowWeekDetail] = useState<string | null>(null);

  const { data: programs, isLoading: programsLoading } = useCsaPrograms(farmId, { includeStats: true });
  const { data: selectedProgram } = useCsaProgram(farmId, selectedProgramId || undefined);
  const { data: members } = useCsaMembers(farmId, selectedProgramId || undefined);
  const { data: weeks } = useCsaWeeks(farmId, selectedProgramId || undefined);
  const { data: selectedWeek, isLoading: weekLoading } = useCsaWeek(farmId, showWeekDetail || undefined);
  const { data: customers } = useCustomers(farmId);
  const { data: products } = useProducts(farmId);

  const createProgram = useCreateCsaProgram(farmId);
  const updateProgram = useUpdateCsaProgram(farmId);
  const generateWeeks = useGenerateCsaWeeks(farmId);
  const createShareType = useCreateCsaShareType(farmId);
  const deleteShareType = useDeleteCsaShareType(farmId);
  const enrollMember = useEnrollCsaMember(farmId);
  const recordPayment = useRecordCsaPayment(farmId);
  const finalizeWeek = useFinalizeCsaWeek(farmId);
  const generateOrders = useGenerateCsaOrders(farmId);
  const setAllocations = useSetCsaWeekAllocations(farmId);
  const createPickupLocation = useCreateCsaPickupLocation(farmId);
  const updatePickupLocation = useUpdateCsaPickupLocation(farmId);
  const deletePickupLocation = useDeleteCsaPickupLocation(farmId);

  // Form state
  const [programForm, setProgramForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    pickupDay: '',
    pickupTimeStart: '',
    pickupTimeEnd: '',
  });

  const [shareTypeForm, setShareTypeForm] = useState({
    name: '',
    description: '',
    price: '',
    maxMembers: '',
  });

  const [enrollForm, setEnrollForm] = useState<{
    customerId: string;
    shareTypeId: string;
    fulfillmentMethod: 'CSA_PICKUP' | 'CSA_DELIVERY';
    notes: string;
  }>({
    customerId: '',
    shareTypeId: '',
    fulfillmentMethod: 'CSA_PICKUP',
    notes: '',
  });

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const program = await createProgram.mutateAsync({
        name: programForm.name,
        description: programForm.description || undefined,
        startDate: new Date(programForm.startDate),
        endDate: new Date(programForm.endDate),
        pickupDay: programForm.pickupDay ? parseInt(programForm.pickupDay) : undefined,
        pickupTimeStart: programForm.pickupTimeStart || undefined,
        pickupTimeEnd: programForm.pickupTimeEnd || undefined,
      });
      setSelectedProgramId(program.id);
      setShowProgramForm(false);
      setProgramForm({ name: '', description: '', startDate: '', endDate: '', pickupDay: '', pickupTimeStart: '', pickupTimeEnd: '' });
    } catch (error) {
      console.error('Failed to create program:', error);
    }
  };

  const handleCreateShareType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgramId) return;
    try {
      await createShareType.mutateAsync({
        programId: selectedProgramId,
        data: {
          name: shareTypeForm.name,
          description: shareTypeForm.description || undefined,
          price: parseInt(shareTypeForm.price) * 100, // Convert to cents
          maxMembers: shareTypeForm.maxMembers ? parseInt(shareTypeForm.maxMembers) : undefined,
        },
      });
      setShowShareTypeForm(false);
      setShareTypeForm({ name: '', description: '', price: '', maxMembers: '' });
    } catch (error) {
      console.error('Failed to create share type:', error);
    }
  };

  const handleEnrollMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgramId) return;
    try {
      await enrollMember.mutateAsync({
        programId: selectedProgramId,
        data: {
          customerId: enrollForm.customerId,
          shareTypeId: enrollForm.shareTypeId,
          fulfillmentMethod: enrollForm.fulfillmentMethod,
          notes: enrollForm.notes || undefined,
        },
      });
      setShowEnrollForm(false);
      setEnrollForm({ customerId: '', shareTypeId: '', fulfillmentMethod: 'CSA_PICKUP', notes: '' });
    } catch (error) {
      console.error('Failed to enroll member:', error);
    }
  };

  const handleGenerateWeeks = async () => {
    if (!selectedProgramId) return;
    try {
      await generateWeeks.mutateAsync(selectedProgramId);
    } catch (error) {
      console.error('Failed to generate weeks:', error);
    }
  };

  const handleFinalizeWeek = async (weekId: string) => {
    try {
      await finalizeWeek.mutateAsync(weekId);
    } catch (error) {
      console.error('Failed to finalize week:', error);
    }
  };

  const handleGenerateOrders = async (weekId: string) => {
    try {
      const result = await generateOrders.mutateAsync(weekId);
      alert(`Created ${result.ordersCreated} orders`);
    } catch (error) {
      console.error('Failed to generate orders:', error);
    }
  };

  const handleSaveAllocations = async (weekId: string, allocations: SetWeekAllocation[]) => {
    try {
      await setAllocations.mutateAsync({ weekId, allocations });
    } catch (error) {
      console.error('Failed to save allocations:', error);
    }
  };

  const handleAddPickupLocation = async (data: {
    name: string;
    address: string;
    pickupDay: number | null;
    pickupTimeStart: string | null;
    pickupTimeEnd: string | null;
    contactName: string | null;
    contactPhone: string | null;
    notes: string | null;
    isActive: boolean;
  }) => {
    if (!selectedProgramId) return;
    await createPickupLocation.mutateAsync({
      programId: selectedProgramId,
      data: {
        name: data.name,
        address: data.address,
        pickupDay: data.pickupDay ?? undefined,
        pickupTimeStart: data.pickupTimeStart ?? undefined,
        pickupTimeEnd: data.pickupTimeEnd ?? undefined,
        contactName: data.contactName ?? undefined,
        contactPhone: data.contactPhone ?? undefined,
        notes: data.notes ?? undefined,
      },
    });
  };

  const handleUpdatePickupLocation = async (id: string, data: Partial<{
    name: string;
    address: string;
    pickupDay: number | null;
    pickupTimeStart: string | null;
    pickupTimeEnd: string | null;
    contactName: string | null;
    contactPhone: string | null;
    notes: string | null;
    isActive: boolean;
  }>) => {
    await updatePickupLocation.mutateAsync({
      locationId: id,
      data: {
        name: data.name,
        address: data.address,
        pickupDay: data.pickupDay ?? undefined,
        pickupTimeStart: data.pickupTimeStart ?? undefined,
        pickupTimeEnd: data.pickupTimeEnd ?? undefined,
        contactName: data.contactName ?? undefined,
        contactPhone: data.contactPhone ?? undefined,
        notes: data.notes ?? undefined,
        isActive: data.isActive,
      },
    });
  };

  const handleDeletePickupLocation = async (id: string) => {
    await deletePickupLocation.mutateAsync(id);
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (!farmId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please select a farm first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CSA Programs</h1>
          <p className="text-gray-500">Manage Community Supported Agriculture subscriptions</p>
        </div>
        <button
          onClick={() => setShowProgramForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <PlusIcon className="h-5 w-5" />
          New Program
        </button>
      </div>

      {/* Program Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Programs</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {programsLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto" />
            </div>
          ) : programs && programs.length > 0 ? (
            programs.map((program) => (
              <button
                key={program.id}
                onClick={() => setSelectedProgramId(program.id)}
                className={`w-full p-4 text-left hover:bg-gray-50 flex items-center justify-between ${
                  selectedProgramId === program.id ? 'bg-green-50' : ''
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{program.name}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLES[program.status].bg} ${STATUS_STYLES[program.status].text}`}>
                      {program.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span>{formatDate(program.startDate)} - {formatDate(program.endDate)}</span>
                    <span className="flex items-center gap-1">
                      <UserGroupIcon className="h-4 w-4" />
                      {program._count?.members || 0} members
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      {program._count?.weeks || 0} weeks
                    </span>
                  </div>
                </div>
                <ChevronRightIcon className={`h-5 w-5 text-gray-400 ${selectedProgramId === program.id ? 'text-green-600' : ''}`} />
              </button>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              No programs yet. Create your first CSA program!
            </div>
          )}
        </div>
      </div>

      {/* Selected Program Details */}
      {selectedProgram && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Program Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{selectedProgram.name}</h2>
              <p className="text-sm text-gray-500">{selectedProgram.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedProgram.status}
                onChange={(e) => updateProgram.mutate({ programId: selectedProgram.id, data: { status: e.target.value as CsaProgramStatus } })}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              >
                <option value="DRAFT">Draft</option>
                <option value="OPEN_ENROLLMENT">Open Enrollment</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {(['programs', 'members', 'weeks'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    activeTab === tab
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab === 'programs' ? 'Share Types' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {/* Share Types Tab */}
            {activeTab === 'programs' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Share Types</h3>
                  <button
                    onClick={() => setShowShareTypeForm(true)}
                    className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add Share Type
                  </button>
                </div>
                {selectedProgram.shareTypes.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {selectedProgram.shareTypes.map((shareType) => (
                      <div key={shareType.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{shareType.name}</h4>
                            <p className="text-sm text-gray-500">{shareType.description}</p>
                          </div>
                          <button
                            onClick={() => deleteShareType.mutate(shareType.id)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-lg font-semibold text-green-600">{formatCurrency(shareType.price)}</span>
                          {shareType.maxMembers && (
                            <span className="text-sm text-gray-500">Max: {shareType.maxMembers}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No share types yet. Add one to get started.</p>
                )}

                {/* Pickup Locations */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <PickupLocationManager
                    locations={selectedProgram.pickupLocations}
                    onAdd={handleAddPickupLocation}
                    onUpdate={handleUpdatePickupLocation}
                    onDelete={handleDeletePickupLocation}
                    isLoading={createPickupLocation.isPending || updatePickupLocation.isPending || deletePickupLocation.isPending}
                  />
                </div>
              </div>
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Members ({members?.length || 0})</h3>
                  <button
                    onClick={() => setShowEnrollForm(true)}
                    className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Enroll Member
                  </button>
                </div>
                {members && members.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Share Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fulfillment</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {members.map((member) => (
                          <tr key={member.id}>
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-gray-900">{member.customer.name}</p>
                                <p className="text-sm text-gray-500">{member.customer.email}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{member.shareType.name}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${MEMBER_STATUS_STYLES[member.status].bg} ${MEMBER_STATUS_STYLES[member.status].text}`}>
                                {member.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${PAYMENT_STATUS_STYLES[member.paymentStatus].bg} ${PAYMENT_STATUS_STYLES[member.paymentStatus].text}`}>
                                  {member.paymentStatus}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {formatCurrency(member.paidAmount)} / {formatCurrency(member.shareType.price)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {member.fulfillmentMethod.replace('_', ' ')}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => {
                                  const amount = prompt('Enter payment amount ($):');
                                  if (amount) {
                                    recordPayment.mutate({
                                      memberId: member.id,
                                      data: { amount: parseInt(amount) * 100 },
                                    });
                                  }
                                }}
                                className="text-sm text-green-600 hover:text-green-700"
                              >
                                <CurrencyDollarIcon className="h-5 w-5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No members enrolled yet.</p>
                )}
              </div>
            )}

            {/* Weeks Tab */}
            {activeTab === 'weeks' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Weeks ({weeks?.length || 0})</h3>
                  {(!weeks || weeks.length === 0) && (
                    <button
                      onClick={handleGenerateWeeks}
                      disabled={generateWeeks.isPending}
                      className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 disabled:opacity-50"
                    >
                      <CalendarIcon className="h-4 w-4" />
                      {generateWeeks.isPending ? 'Generating...' : 'Generate Weeks'}
                    </button>
                  )}
                </div>
                {weeks && weeks.length > 0 ? (
                  <div className="space-y-2">
                    {weeks.map((week) => (
                      <div
                        key={week.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                        onClick={() => setShowWeekDetail(week.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <span className="text-lg font-bold text-green-600">{week.weekNumber}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">Week {week.weekNumber}</p>
                            <p className="text-sm text-gray-500">{formatDate(week.weekDate)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${WEEK_STATUS_STYLES[week.status].bg} ${WEEK_STATUS_STYLES[week.status].text}`}>
                            {week.status}
                          </span>
                          <div className="text-sm text-gray-500">
                            {week._count.allocations} items • {week._count.skipRequests} skips
                          </div>
                          {week.status === 'PLANNING' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFinalizeWeek(week.id);
                              }}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Finalize
                            </button>
                          )}
                          {week.status === 'FINALIZED' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateOrders(week.id);
                              }}
                              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Generate Orders
                            </button>
                          )}
                          <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No weeks generated yet. Click "Generate Weeks" to create the schedule.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Program Modal */}
      {showProgramForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowProgramForm(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold">Create CSA Program</h2>
                <button onClick={() => setShowProgramForm(false)} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleCreateProgram} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Program Name</label>
                  <input
                    type="text"
                    required
                    value={programForm.name}
                    onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                    placeholder="Summer 2025 CSA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={programForm.description}
                    onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={programForm.startDate}
                      onChange={(e) => setProgramForm({ ...programForm, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      required
                      value={programForm.endDate}
                      onChange={(e) => setProgramForm({ ...programForm, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Pickup Day</label>
                  <select
                    value={programForm.pickupDay}
                    onChange={(e) => setProgramForm({ ...programForm, pickupDay: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Select day...</option>
                    {DAY_NAMES.map((day, index) => (
                      <option key={index} value={index}>{day}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowProgramForm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createProgram.isPending}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {createProgram.isPending ? 'Creating...' : 'Create Program'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Share Type Modal */}
      {showShareTypeForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowShareTypeForm(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold">Add Share Type</h2>
                <button onClick={() => setShowShareTypeForm(false)} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleCreateShareType} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={shareTypeForm.name}
                    onChange={(e) => setShareTypeForm({ ...shareTypeForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Full Share"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={shareTypeForm.description}
                    onChange={(e) => setShareTypeForm({ ...shareTypeForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={shareTypeForm.price}
                      onChange={(e) => setShareTypeForm({ ...shareTypeForm, price: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Members</label>
                    <input
                      type="number"
                      min="1"
                      value={shareTypeForm.maxMembers}
                      onChange={(e) => setShareTypeForm({ ...shareTypeForm, maxMembers: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="20"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowShareTypeForm(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={createShareType.isPending} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                    {createShareType.isPending ? 'Adding...' : 'Add Share Type'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Enroll Member Modal */}
      {showEnrollForm && selectedProgram && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowEnrollForm(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold">Enroll Member</h2>
                <button onClick={() => setShowEnrollForm(false)} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleEnrollMember} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                  <select
                    required
                    value={enrollForm.customerId}
                    onChange={(e) => setEnrollForm({ ...enrollForm, customerId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select customer...</option>
                    {customers?.map((customer) => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Share Type</label>
                  <select
                    required
                    value={enrollForm.shareTypeId}
                    onChange={(e) => setEnrollForm({ ...enrollForm, shareTypeId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select share type...</option>
                    {selectedProgram.shareTypes.map((shareType) => (
                      <option key={shareType.id} value={shareType.id}>
                        {shareType.name} - {formatCurrency(shareType.price)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fulfillment Method</label>
                  <select
                    value={enrollForm.fulfillmentMethod}
                    onChange={(e) => setEnrollForm({ ...enrollForm, fulfillmentMethod: e.target.value as 'CSA_PICKUP' | 'CSA_DELIVERY' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="CSA_PICKUP">Pickup</option>
                    <option value="CSA_DELIVERY">Home Delivery</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={enrollForm.notes}
                    onChange={(e) => setEnrollForm({ ...enrollForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={2}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowEnrollForm(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={enrollMember.isPending} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                    {enrollMember.isPending ? 'Enrolling...' : 'Enroll Member'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Week Detail Modal */}
      {showWeekDetail && selectedWeek && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowWeekDetail(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white flex items-center justify-between border-b border-gray-200 px-6 py-4 z-10">
                <div>
                  <h2 className="text-lg font-semibold">
                    Week {selectedWeek.weekNumber} - {formatDate(selectedWeek.weekDate)}
                  </h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${WEEK_STATUS_STYLES[selectedWeek.status].bg} ${WEEK_STATUS_STYLES[selectedWeek.status].text}`}>
                      {selectedWeek.status}
                    </span>
                    {selectedWeek.notes && (
                      <span className="text-sm text-gray-500">{selectedWeek.notes}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedWeek.status === 'PLANNING' && (
                    <button
                      onClick={() => handleFinalizeWeek(selectedWeek.id)}
                      disabled={finalizeWeek.isPending}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {finalizeWeek.isPending ? 'Finalizing...' : 'Finalize Week'}
                    </button>
                  )}
                  {selectedWeek.status === 'FINALIZED' && (
                    <button
                      onClick={() => handleGenerateOrders(selectedWeek.id)}
                      disabled={generateOrders.isPending}
                      className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {generateOrders.isPending ? 'Generating...' : 'Generate Orders'}
                    </button>
                  )}
                  <button onClick={() => setShowWeekDetail(null)} className="text-gray-400 hover:text-gray-600">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                {weekLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Allocation Grid */}
                    {selectedProgram && products && (
                      <WeekAllocationGrid
                        week={selectedWeek}
                        shareTypes={selectedProgram.shareTypes}
                        products={products.map((p) => ({ id: p.id, name: p.name }))}
                        onSave={(allocations) => handleSaveAllocations(selectedWeek.id, allocations)}
                        isLoading={setAllocations.isPending}
                        disabled={selectedWeek.status !== 'PLANNING'}
                      />
                    )}

                    {/* Skip Requests */}
                    {selectedWeek.skipRequests && selectedWeek.skipRequests.length > 0 && (
                      <div className="border-t border-gray-200 pt-6">
                        <h3 className="font-medium text-gray-900 mb-3">
                          Skip Requests ({selectedWeek.skipRequests.length})
                        </h3>
                        <div className="space-y-2">
                          {selectedWeek.skipRequests.map((skip) => (
                            <div
                              key={skip.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div>
                                <p className="font-medium text-gray-900">
                                  {skip.member?.customer?.name || 'Unknown member'}
                                </p>
                                {skip.reason && (
                                  <p className="text-sm text-gray-500">{skip.reason}</p>
                                )}
                              </div>
                              <span className="text-sm text-gray-500">
                                {skip.member?.shareType?.name || 'Unknown share'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
