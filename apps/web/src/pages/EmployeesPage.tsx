import { useState } from 'react';
import { useFarmStore } from '@/stores/farm-store';
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee } from '@/lib/api-client';
import type { Employee, CreateEmployee, UpdateEmployee, EmployeePosition, EmployeeStatus } from '@farm/shared';

// Position labels
const POSITION_LABELS: Record<EmployeePosition, string> = {
  FARM_MANAGER: 'Farm Manager',
  SALESPERSON: 'Salesperson',
  FARM_OPERATOR: 'Farm Operator',
};

const POSITION_COLORS: Record<EmployeePosition, string> = {
  FARM_MANAGER: 'bg-purple-100 text-purple-800',
  SALESPERSON: 'bg-blue-100 text-blue-800',
  FARM_OPERATOR: 'bg-green-100 text-green-800',
};

// Status labels
const STATUS_LABELS: Record<EmployeeStatus, string> = {
  ACTIVE: 'Active',
  ON_LEAVE: 'On Leave',
  TERMINATED: 'Terminated',
};

const STATUS_COLORS: Record<EmployeeStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  ON_LEAVE: 'bg-yellow-100 text-yellow-800',
  TERMINATED: 'bg-red-100 text-red-800',
};

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: Employee | null;
  onSubmit: (data: CreateEmployee | UpdateEmployee) => void;
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

    onSubmit(data);
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

export default function EmployeesPage() {
  const { currentFarmId } = useFarmStore();
  const { data: employees, isLoading } = useEmployees(currentFarmId ?? undefined);
  const createEmployee = useCreateEmployee(currentFarmId ?? '');
  const updateEmployee = useUpdateEmployee(currentFarmId ?? '');
  const deleteEmployee = useDeleteEmployee(currentFarmId ?? '');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  if (!currentFarmId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Farm Selected</h2>
          <p className="text-muted-foreground">Select a farm from the sidebar to manage employees.</p>
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

  const handleSubmit = async (data: CreateEmployee | UpdateEmployee) => {
    try {
      if (editingEmployee) {
        await updateEmployee.mutateAsync({ employeeId: editingEmployee.id, data: data as UpdateEmployee });
      } else {
        await createEmployee.mutateAsync(data as CreateEmployee);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save employee:', error);
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
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Manage staff, schedules, and time tracking</p>
        </div>
        <button
          onClick={handleAddEmployee}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Add Employee
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Active Employees</p>
          <p className="text-2xl font-bold">{activeCount}</p>
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

      {/* Employee list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Loading employees...</div>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <div className="text-4xl mb-4">👥</div>
          <h3 className="text-lg font-semibold">No Employees Found</h3>
          <p className="text-muted-foreground mb-4">
            {employees?.length === 0
              ? 'Get started by adding your first employee.'
              : 'No employees match your current filter.'}
          </p>
          {employees?.length === 0 && (
            <button
              onClick={handleAddEmployee}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Add First Employee
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
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {employee.firstName} {employee.lastName}
                    </div>
                    {employee.department && (
                      <div className="text-sm text-muted-foreground">{employee.department}</div>
                    )}
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <EmployeeModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        employee={editingEmployee}
        onSubmit={handleSubmit}
        isSubmitting={createEmployee.isPending || updateEmployee.isPending}
      />
    </div>
  );
}
