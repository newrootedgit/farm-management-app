import { useState } from 'react';
import { useFarmStore } from '@/stores/farm-store';
import { useTeam, useCreateEmployee, useUpdateEmployee, useDeleteEmployee, useSendEmployeeInvite, useUpdateOwner } from '@/lib/api-client';
import type { Employee, CreateEmployee, UpdateEmployee, EmployeePosition, EmployeeStatus, InviteStatus } from '@farm/shared';

// Position labels
const POSITION_LABELS: Record<EmployeePosition, string> = {
  ADMIN: 'Admin',
  FARM_MANAGER: 'Farm Manager',
  SALESPERSON: 'Salesperson',
  FARM_OPERATOR: 'Farm Operator',
  DRIVER: 'Driver',
};

const POSITION_COLORS: Record<EmployeePosition, string> = {
  ADMIN: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  FARM_MANAGER: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  SALESPERSON: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  FARM_OPERATOR: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  DRIVER: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
};

// Status labels
const STATUS_LABELS: Record<EmployeeStatus, string> = {
  ACTIVE: 'Active',
  ON_LEAVE: 'On Leave',
  TERMINATED: 'Terminated',
};

const STATUS_COLORS: Record<EmployeeStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  ON_LEAVE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  TERMINATED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

// Invite status labels and colors
const INVITE_LABELS: Record<InviteStatus, string> = {
  NOT_INVITED: 'Not Invited',
  PENDING: 'Invite Sent',
  ACCEPTED: 'Account Active',
  EXPIRED: 'Invite Expired',
  REVOKED: 'Invite Revoked',
};

const INVITE_COLORS: Record<InviteStatus, string> = {
  NOT_INVITED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  PENDING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  ACCEPTED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  EXPIRED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  REVOKED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: Employee | null;
  onSubmit: (data: CreateEmployee | UpdateEmployee, sendInvite?: boolean) => void;
  isSubmitting: boolean;
}

function EmployeeModal({ isOpen, onClose, employee, onSubmit, isSubmitting }: EmployeeModalProps) {
  const [formData, setFormData] = useState({
    firstName: employee?.firstName ?? '',
    lastName: employee?.lastName ?? '',
    email: employee?.email ?? '',
    phone: employee?.phone ?? '',
    position: (employee?.position as EmployeePosition) ?? 'FARM_OPERATOR',
    department: employee?.department ?? '',
    hireDate: employee?.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : '',
    hourlyRate: employee?.hourlyRate ?? '',
    status: (employee?.status as EmployeeStatus) ?? 'ACTIVE',
  });
  const [sendInvite, setSendInvite] = useState(!employee); // Default to true for new employees

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate email or phone required
    if (!formData.email && !formData.phone) {
      setErrors({ email: 'Either email or phone is required for password recovery' });
      return;
    }

    // If sending invite, email is required
    if (sendInvite && !formData.email) {
      setErrors({ email: 'Email is required to send an invite' });
      return;
    }

    const data: CreateEmployee | UpdateEmployee = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      position: formData.position as EmployeePosition,
      department: formData.department || undefined,
      hireDate: formData.hireDate || undefined,
      hourlyRate: formData.hourlyRate ? Number(formData.hourlyRate) : undefined,
      status: formData.status as EmployeeStatus,
    };

    onSubmit(data, sendInvite);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-semibold mb-4">
          {employee ? 'Edit Employee' : 'Add Employee'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name *</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name *</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Position *</label>
            <select
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value as EmployeePosition })}
              className="w-full px-3 py-2 border rounded-md"
              required
            >
              <option value="FARM_MANAGER">Farm Manager</option>
              <option value="SALESPERSON">Salesperson</option>
              <option value="FARM_OPERATOR">Farm Operator</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Email {!formData.phone && '*'}
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Phone {!formData.email && '*'}
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Either email or phone is required for password recovery
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Department</label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="e.g., Production, Sales"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Hire Date</label>
              <input
                type="date"
                value={formData.hireDate}
                onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hourly Rate ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.hourlyRate}
                onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="15.00"
              />
            </div>
          </div>

          {employee && (
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as EmployeeStatus })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="ACTIVE">Active</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="TERMINATED">Terminated</option>
              </select>
            </div>
          )}

          {/* Send invite checkbox for new employees */}
          {!employee && (
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <input
                type="checkbox"
                id="sendInvite"
                checked={sendInvite}
                onChange={(e) => setSendInvite(e.target.checked)}
                className="mt-1 h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <div>
                <label htmlFor="sendInvite" className="font-medium text-blue-900 dark:text-blue-100">
                  Send invite email
                </label>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  The employee will receive an email to create their account and set a password.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : employee ? 'Update' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Owner Modal Component
interface OwnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  owner: {
    user: {
      name: string | null;
      email: string;
    };
  };
  onSubmit: (data: { name?: string; email?: string }) => void;
  isSubmitting: boolean;
}

function OwnerModal({ isOpen, onClose, owner, onSubmit, isSubmitting }: OwnerModalProps) {
  const [formData, setFormData] = useState({
    name: owner?.user.name ?? '',
    email: owner?.user.email ?? '',
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: formData.name || undefined,
      email: formData.email || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background rounded-lg shadow-lg w-full max-w-md p-6">
        <h2 className="text-xl font-semibold mb-4">Edit Owner</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Owner name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const { currentFarmId } = useFarmStore();
  const { data: teamData, isLoading } = useTeam(currentFarmId ?? undefined);
  const createEmployee = useCreateEmployee(currentFarmId ?? '');
  const updateEmployee = useUpdateEmployee(currentFarmId ?? '');
  const deleteEmployee = useDeleteEmployee(currentFarmId ?? '');
  const sendInvite = useSendEmployeeInvite(currentFarmId ?? '');
  const updateOwner = useUpdateOwner(currentFarmId ?? '');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);

  // Extract owner and employees from team data
  const owner = teamData?.owner;
  const employees = teamData?.employees;

  if (!currentFarmId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Farm Selected</h2>
          <p className="text-muted-foreground">Select a farm from the sidebar to manage your team.</p>
        </div>
      </div>
    );
  }

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setIsModalOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
  };

  const handleSubmit = async (data: CreateEmployee | UpdateEmployee, shouldSendInvite?: boolean) => {
    try {
      if (editingEmployee) {
        await updateEmployee.mutateAsync({ employeeId: editingEmployee.id, data: data as UpdateEmployee });
      } else {
        const newEmployee = await createEmployee.mutateAsync(data as CreateEmployee);
        // Send invite after creation if requested
        if (shouldSendInvite && newEmployee?.id) {
          await sendInvite.mutateAsync(newEmployee.id);
        }
      }
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save employee:', error);
    }
  };

  const handleSendInvite = async (employee: Employee) => {
    if (!employee.email) {
      alert('Employee must have an email address to receive an invite.');
      return;
    }
    try {
      await sendInvite.mutateAsync(employee.id);
      alert(`Invite sent to ${employee.email}`);
    } catch (error) {
      console.error('Failed to send invite:', error);
      alert('Failed to send invite. Please try again.');
    }
  };

  const handleDeleteEmployee = async (employee: Employee) => {
    if (confirm(`Are you sure you want to terminate ${employee.firstName} ${employee.lastName}?`)) {
      try {
        await deleteEmployee.mutateAsync(employee.id);
      } catch (error) {
        console.error('Failed to delete employee:', error);
      }
    }
  };

  const handleUpdateOwner = async (data: { name?: string; email?: string }) => {
    try {
      await updateOwner.mutateAsync(data);
      setIsOwnerModalOpen(false);
    } catch (error) {
      console.error('Failed to update owner:', error);
    }
  };

  // Filter employees
  const filteredEmployees = employees?.filter((e) => {
    if (statusFilter && e.status !== statusFilter) return false;
    return true;
  }) ?? [];

  const activeCount = employees?.filter(e => e.status === 'ACTIVE').length ?? 0;
  const onLeaveCount = employees?.filter(e => e.status === 'ON_LEAVE').length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-muted-foreground">Manage your team members, schedules, and time tracking</p>
        </div>
        <button
          onClick={handleAddEmployee}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Add Team Member
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Team Members</p>
          <p className="text-2xl font-bold">{(owner ? 1 : 0) + activeCount}</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">On Leave</p>
          <p className="text-2xl font-bold">{onLeaveCount}</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Shifts This Week</p>
          <p className="text-2xl font-bold">0</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_LEAVE">On Leave</option>
          <option value="TERMINATED">Terminated</option>
        </select>
      </div>

      {/* Team list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Loading team...</div>
        </div>
      ) : (!owner && filteredEmployees.length === 0) ? (
        <div className="border rounded-lg p-12 text-center">
          <div className="text-4xl mb-4">👥</div>
          <h3 className="text-lg font-semibold">No Team Members Found</h3>
          <p className="text-muted-foreground mb-4">
            {employees?.length === 0
              ? 'Get started by adding your first team member.'
              : 'No team members match your current filter.'}
          </p>
          {employees?.length === 0 && (
            <button
              onClick={handleAddEmployee}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Add First Team Member
            </button>
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Position</th>
                <th className="text-left px-4 py-3 font-medium">Contact</th>
                <th className="text-left px-4 py-3 font-medium">Account</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {/* Owner row */}
              {owner && !statusFilter && (
                <tr className="bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-100/50 dark:hover:bg-amber-900/20">
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {owner.user.name || 'Farm Owner'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                      Owner
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      {owner.user.email}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex w-fit px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      Account Active
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      Active
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setIsOwnerModalOpen(true)}
                      className="text-sm text-primary hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              )}
              {filteredEmployees.map((employee) => {
                const inviteStatus = (employee.inviteStatus as InviteStatus) || 'NOT_INVITED';
                const canSendInvite = employee.email && (inviteStatus === 'NOT_INVITED' || inviteStatus === 'EXPIRED' || inviteStatus === 'REVOKED');
                const canResendInvite = employee.email && inviteStatus === 'PENDING';

                return (
                  <tr key={employee.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {employee.firstName} {employee.lastName}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {employee.position && (
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${POSITION_COLORS[employee.position as EmployeePosition] ?? 'bg-gray-100 text-gray-800'}`}>
                          {POSITION_LABELS[employee.position as EmployeePosition] ?? employee.position}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        {employee.email && <div>{employee.email}</div>}
                        {employee.phone && <div className="text-muted-foreground">{employee.phone}</div>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex w-fit px-2 py-1 text-xs font-medium rounded-full ${INVITE_COLORS[inviteStatus]}`}>
                          {INVITE_LABELS[inviteStatus]}
                        </span>
                        {canSendInvite && (
                          <button
                            onClick={() => handleSendInvite(employee)}
                            disabled={sendInvite.isPending}
                            className="text-xs text-primary hover:underline w-fit"
                          >
                            Send Invite
                          </button>
                        )}
                        {canResendInvite && (
                          <button
                            onClick={() => handleSendInvite(employee)}
                            disabled={sendInvite.isPending}
                            className="text-xs text-primary hover:underline w-fit"
                          >
                            Resend Invite
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[employee.status]}`}>
                        {STATUS_LABELS[employee.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleEditEmployee(employee)}
                        className="text-sm text-primary hover:underline mr-3"
                      >
                        Edit
                      </button>
                      {employee.status !== 'TERMINATED' && (
                        <button
                          onClick={() => handleDeleteEmployee(employee)}
                          className="text-sm text-red-600 hover:underline"
                        >
                          Terminate
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Employee Modal */}
      <EmployeeModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        employee={editingEmployee}
        onSubmit={handleSubmit}
        isSubmitting={createEmployee.isPending || updateEmployee.isPending}
      />

      {/* Owner Modal */}
      {owner && (
        <OwnerModal
          isOpen={isOwnerModalOpen}
          onClose={() => setIsOwnerModalOpen(false)}
          owner={owner}
          onSubmit={handleUpdateOwner}
          isSubmitting={updateOwner.isPending}
        />
      )}
    </div>
  );
}
