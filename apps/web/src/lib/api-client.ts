import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Farm, CreateFarm, UpdateFarm,
  Zone, CreateZone, UpdateZone,
  Product, CreateProduct, UpdateProduct,
  Employee, CreateEmployee, UpdateEmployee,
  LayoutElement, CreateLayoutElement, UpdateLayoutElement,
  ElementPreset, CreateElementPreset, UpdateElementPreset,
  UserPreference, UpdateUserPreference,
  Order, CreateOrder, UpdateOrder,
  OrderItem, UpdateOrderItem,
  Task, UpdateTask,
  Sku, CreateSku, UpdateSku,
  Customer, CreateCustomer, UpdateCustomer,
  CustomerTag, CreateCustomerTag, UpdateCustomerTag,
  RecurringOrderSchedule, CreateRecurringOrderSchedule, UpdateRecurringOrderSchedule,
  Blend, CreateBlend, UpdateBlend,
  BlendProductionSchedule,
  DeliveryRoute, CreateDeliveryRoute, UpdateDeliveryRoute,
  DeliverySignature, CaptureSignature,
  FulfillmentStatus, FulfillmentMethod, PaymentType, RouteStatus,
  DocumentType, GeneratedDocument, GenerateDocument, SendDocumentEmail,
  CsaProgram, CreateCsaProgram, UpdateCsaProgram, CsaProgramWithRelations,
  CsaShareType, CreateCsaShareType, UpdateCsaShareType,
  CsaMember, EnrollCsaMember, UpdateCsaMember, RecordCsaPayment, CsaMemberWithRelations,
  SetMemberPreference, CsaMemberPreference,
  CsaPickupLocation, CreateCsaPickupLocation, UpdateCsaPickupLocation,
  CsaWeek, UpdateCsaWeek, CsaWeekWithRelations,
  SetWeekAllocation, CsaMemberSkip, SkipWeek,
  PackageType, CreatePackageType, UpdatePackageType,
  SupplyCategory, CreateSupplyCategory, UpdateSupplyCategory,
  Supply, CreateSupply, UpdateSupply,
  SupplyPurchase, CreateSupplyPurchase, UpdateSupplyPurchase,
  SupplyUsage, CreateSupplyUsage, InventoryCheck,
} from '@farm/shared';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Generic fetch wrapper
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  // Only set Content-Type for requests with a body
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };
  if (options?.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.error?.message || error.message || 'Request failed');
  }

  const data = await response.json();
  return data.data ?? data;
}

// ============================================================================
// FARMS
// ============================================================================

export function useFarms() {
  return useQuery({
    queryKey: ['farms'],
    queryFn: () => fetchApi<Farm[]>('/api/v1/farms'),
  });
}

export function useFarm(farmId: string | undefined) {
  return useQuery({
    queryKey: ['farms', farmId],
    queryFn: () => fetchApi<Farm & { role: string }>(`/api/v1/farms/${farmId}`),
    enabled: !!farmId,
  });
}

export function useCreateFarm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFarm) =>
      fetchApi<Farm>('/api/v1/farms', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms'] });
    },
  });
}

export function useUpdateFarm(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateFarm) =>
      fetchApi<Farm>(`/api/v1/farms/${farmId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms'] });
      queryClient.invalidateQueries({ queryKey: ['farms', farmId] });
    },
  });
}

export function useDeleteFarm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (farmId: string) =>
      fetchApi(`/api/v1/farms/${farmId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms'] });
    },
  });
}

export function useUploadLogo(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/api/v1/farms/${farmId}/logo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer dev-token`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to upload logo');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId] });
    },
  });
}

export function useDeleteLogo(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      fetchApi(`/api/v1/farms/${farmId}/logo`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId] });
    },
  });
}

// ============================================================================
// FARM LAYOUT
// ============================================================================

interface FarmLayout {
  id: string;
  farmId: string;
  canvasData: {
    width: number;
    height: number;
    backgroundColor?: string;
    gridSize?: number;
    zoom?: number;
    offsetX?: number;
    offsetY?: number;
  };
}

export function useFarmLayout(farmId: string | undefined) {
  return useQuery({
    queryKey: ['farms', farmId, 'layout'],
    queryFn: () => fetchApi<FarmLayout>(`/api/v1/farms/${farmId}/layout`),
    enabled: !!farmId,
  });
}

export function useUpdateFarmLayout(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (canvasData: FarmLayout['canvasData']) =>
      fetchApi<FarmLayout>(`/api/v1/farms/${farmId}/layout`, {
        method: 'PUT',
        body: JSON.stringify({ canvasData }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'layout'] });
    },
  });
}

// ============================================================================
// ZONES
// ============================================================================

export function useZones(farmId: string | undefined) {
  return useQuery({
    queryKey: ['farms', farmId, 'zones'],
    queryFn: () => fetchApi<Zone[]>(`/api/v1/farms/${farmId}/zones`),
    enabled: !!farmId,
  });
}

export function useZone(farmId: string, zoneId: string) {
  return useQuery({
    queryKey: ['farms', farmId, 'zones', zoneId],
    queryFn: () => fetchApi<Zone>(`/api/v1/farms/${farmId}/zones/${zoneId}`),
    enabled: !!farmId && !!zoneId,
  });
}

export function useCreateZone(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateZone) =>
      fetchApi<Zone>(`/api/v1/farms/${farmId}/zones`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'zones'] });
    },
  });
}

export function useUpdateZone(farmId: string, zoneId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateZone) =>
      fetchApi<Zone>(`/api/v1/farms/${farmId}/zones/${zoneId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'zones'] });
    },
  });
}

export function useDeleteZone(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (zoneId: string) =>
      fetchApi(`/api/v1/farms/${farmId}/zones/${zoneId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'zones'] });
    },
  });
}

// ============================================================================
// PRODUCTS (Microgreen Varieties)
// ============================================================================

export function useProducts(farmId: string | undefined) {
  return useQuery({
    queryKey: ['farms', farmId, 'products'],
    queryFn: () => fetchApi<Product[]>(`/api/v1/farms/${farmId}/products`),
    enabled: !!farmId,
  });
}

export function useProduct(farmId: string, productId: string) {
  return useQuery({
    queryKey: ['farms', farmId, 'products', productId],
    queryFn: () => fetchApi<Product>(`/api/v1/farms/${farmId}/products/${productId}`),
    enabled: !!farmId && !!productId,
  });
}

export function useCreateProduct(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProduct) =>
      fetchApi<Product>(`/api/v1/farms/${farmId}/products`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'products'] });
    },
  });
}

export function useUpdateProduct(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: UpdateProduct }) =>
      fetchApi<Product>(`/api/v1/farms/${farmId}/products/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'products'] });
    },
  });
}

export function useDeleteProduct(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) =>
      fetchApi(`/api/v1/farms/${farmId}/products/${productId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'products'] });
    },
  });
}

// ============================================================================
// TEAM (Owner + Employees)
// ============================================================================

interface TeamOwner {
  id: string;
  role: string;
  userId: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

interface TeamData {
  owner: TeamOwner | null;
  employees: Employee[];
}

export function useTeam(farmId: string | undefined) {
  return useQuery({
    queryKey: ['farms', farmId, 'team'],
    queryFn: () => fetchApi<TeamData>(`/api/v1/farms/${farmId}/team`),
    enabled: !!farmId,
  });
}

export function useUpdateOwner(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name?: string; email?: string }) =>
      fetchApi<TeamOwner>(`/api/v1/farms/${farmId}/team/owner`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'team'] });
    },
  });
}

// ============================================================================
// EMPLOYEES
// ============================================================================

export function useEmployees(farmId: string | undefined) {
  return useQuery({
    queryKey: ['farms', farmId, 'employees'],
    queryFn: () => fetchApi<Employee[]>(`/api/v1/farms/${farmId}/employees`),
    enabled: !!farmId,
  });
}

export function useCreateEmployee(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEmployee) =>
      fetchApi<Employee>(`/api/v1/farms/${farmId}/employees`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'employees'] });
    },
  });
}

export function useUpdateEmployee(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ employeeId, data }: { employeeId: string; data: UpdateEmployee }) =>
      fetchApi<Employee>(`/api/v1/farms/${farmId}/employees/${employeeId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'employees'] });
    },
  });
}

export function useDeleteEmployee(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (employeeId: string) =>
      fetchApi<Employee>(`/api/v1/farms/${farmId}/employees/${employeeId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'employees'] });
    },
  });
}

export function useSendEmployeeInvite(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (employeeId: string) =>
      fetchApi<Employee>(`/api/v1/farms/${farmId}/employees/${employeeId}/invite`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'employees'] });
    },
  });
}

// ============================================================================
// LAYOUT ELEMENTS
// ============================================================================

export function useLayoutElements(farmId: string | undefined) {
  return useQuery({
    queryKey: ['farms', farmId, 'layout', 'elements'],
    queryFn: () => fetchApi<LayoutElement[]>(`/api/v1/farms/${farmId}/layout/elements`),
    enabled: !!farmId,
  });
}

export function useCreateLayoutElement(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLayoutElement) =>
      fetchApi<LayoutElement>(`/api/v1/farms/${farmId}/layout/elements`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'layout', 'elements'] });
    },
  });
}

export function useUpdateLayoutElement(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ elementId, data }: { elementId: string; data: UpdateLayoutElement }) =>
      fetchApi<LayoutElement>(`/api/v1/farms/${farmId}/layout/elements/${elementId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'layout', 'elements'] });
    },
  });
}

export function useDeleteLayoutElement(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (elementId: string) =>
      fetchApi(`/api/v1/farms/${farmId}/layout/elements/${elementId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'layout', 'elements'] });
    },
  });
}

export function useBulkUpdateLayoutElements(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (elements: Array<{ id: string; updates: UpdateLayoutElement }>) =>
      fetchApi(`/api/v1/farms/${farmId}/layout/elements/bulk`, {
        method: 'PUT',
        body: JSON.stringify({ elements }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'layout', 'elements'] });
    },
  });
}

// ============================================================================
// ELEMENT PRESETS
// ============================================================================

export function useElementPresets(farmId: string | undefined) {
  return useQuery({
    queryKey: ['farms', farmId, 'layout', 'presets'],
    queryFn: () => fetchApi<ElementPreset[]>(`/api/v1/farms/${farmId}/layout/presets`),
    enabled: !!farmId,
  });
}

export function useCreateElementPreset(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateElementPreset) =>
      fetchApi<ElementPreset>(`/api/v1/farms/${farmId}/layout/presets`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'layout', 'presets'] });
    },
  });
}

export function useUpdateElementPreset(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ presetId, data }: { presetId: string; data: UpdateElementPreset }) =>
      fetchApi<ElementPreset>(`/api/v1/farms/${farmId}/layout/presets/${presetId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'layout', 'presets'] });
    },
  });
}

export function useDeleteElementPreset(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (presetId: string) =>
      fetchApi(`/api/v1/farms/${farmId}/layout/presets/${presetId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'layout', 'presets'] });
    },
  });
}

// ============================================================================
// RACK ASSIGNMENTS (Production Tracking)
// ============================================================================

export interface RackAssignment {
  id: string;
  farmId: string;
  rackElementId: string;
  level: number;
  orderItemId: string;
  trayCount: number;
  assignedAt: string;
  assignedBy: string | null;
  taskId: string | null;
  isActive: boolean;
  removedAt: string | null;
  createdAt: string;
  updatedAt: string;
  rackElement: {
    id: string;
    name: string;
    metadata: unknown;
  };
  orderItem: {
    id: string;
    quantityOz: number;
    traysNeeded: number;
    harvestDate: string;
    product: {
      id: string;
      name: string;
    };
    order: {
      id: string;
      orderNumber: string;
      customerName: string | null;
    };
  };
}

export interface CreateRackAssignment {
  rackElementId: string;
  level: number;
  orderItemId: string;
  trayCount: number;
  taskId?: string;
  assignedBy?: string;
}

export function useRackAssignments(farmId: string | undefined) {
  return useQuery({
    queryKey: ['farms', farmId, 'rack-assignments'],
    queryFn: () => fetchApi<RackAssignment[]>(`/api/v1/farms/${farmId}/rack-assignments`),
    enabled: !!farmId,
  });
}

export function useRackAssignmentsByRack(farmId: string | undefined, rackId: string | undefined) {
  return useQuery({
    queryKey: ['farms', farmId, 'rack-assignments', 'by-rack', rackId],
    queryFn: () => fetchApi<RackAssignment[]>(`/api/v1/farms/${farmId}/rack-assignments/by-rack/${rackId}`),
    enabled: !!farmId && !!rackId,
  });
}

export function useCreateRackAssignment(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRackAssignment) =>
      fetchApi<RackAssignment>(`/api/v1/farms/${farmId}/rack-assignments`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'rack-assignments'] });
    },
  });
}

export function useRemoveRackAssignment(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assignmentId: string) =>
      fetchApi(`/api/v1/farms/${farmId}/rack-assignments/${assignmentId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'rack-assignments'] });
    },
  });
}

// ============================================================================
// USER PREFERENCES
// ============================================================================

export function useUserPreferences(farmId: string | undefined) {
  return useQuery({
    queryKey: ['farms', farmId, 'preferences'],
    queryFn: () => fetchApi<UserPreference>(`/api/v1/farms/${farmId}/preferences`),
    enabled: !!farmId,
  });
}

export function useUpdateUserPreferences(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserPreference) =>
      fetchApi<UserPreference>(`/api/v1/farms/${farmId}/preferences`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'preferences'] });
    },
  });
}

// ============================================================================
// ORDERS
// ============================================================================

interface OrderWithItems extends Order {
  items: Array<OrderItem & { product: Product }>;
}

export function useOrders(farmId: string | undefined, filters?: { status?: string; customer?: string }) {
  return useQuery({
    queryKey: ['farms', farmId, 'orders', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.customer) params.set('customer', filters.customer);
      const query = params.toString();
      return fetchApi<OrderWithItems[]>(`/api/v1/farms/${farmId}/orders${query ? `?${query}` : ''}`);
    },
    enabled: !!farmId,
  });
}

export function useOrder(farmId: string, orderId: string) {
  return useQuery({
    queryKey: ['farms', farmId, 'orders', orderId],
    queryFn: () => fetchApi<OrderWithItems>(`/api/v1/farms/${farmId}/orders/${orderId}`),
    enabled: !!farmId && !!orderId,
  });
}

export function useCreateOrder(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrder) =>
      fetchApi<OrderWithItems>(`/api/v1/farms/${farmId}/orders`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'tasks'] });
    },
  });
}

export function useUpdateOrder(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: UpdateOrder }) =>
      fetchApi<Order>(`/api/v1/farms/${farmId}/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'orders'] });
    },
  });
}

export function useDeleteOrder(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) =>
      fetchApi(`/api/v1/farms/${farmId}/orders/${orderId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'tasks'] });
    },
  });
}

export function useCloneOrder(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, harvestDateOffset }: { orderId: string; harvestDateOffset?: number }) =>
      fetchApi<OrderWithItems>(`/api/v1/farms/${farmId}/orders/${orderId}/clone`, {
        method: 'POST',
        body: JSON.stringify({ harvestDateOffset }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'tasks'] });
    },
  });
}

export function useUpdateOrderItem(farmId: string, orderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: UpdateOrderItem }) =>
      fetchApi<OrderItem>(`/api/v1/farms/${farmId}/orders/${orderId}/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'tasks'] });
    },
  });
}

// ============================================================================
// TASKS
// ============================================================================

interface TaskWithRelations extends Omit<Task, 'orderItem'> {
  orderItem?: {
    id: string;
    quantityOz: number;
    traysNeeded: number;
    harvestDate: Date;
    seedLot?: string | null;
    product: Product;
    order: Order;
  } | null;
}

export function useTasks(
  farmId: string | undefined,
  filters?: { status?: string; type?: string; fromDate?: string; toDate?: string }
) {
  return useQuery({
    queryKey: ['farms', farmId, 'tasks', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.type) params.set('type', filters.type);
      if (filters?.fromDate) params.set('fromDate', filters.fromDate);
      if (filters?.toDate) params.set('toDate', filters.toDate);
      const query = params.toString();
      return fetchApi<TaskWithRelations[]>(`/api/v1/farms/${farmId}/tasks${query ? `?${query}` : ''}`);
    },
    enabled: !!farmId,
  });
}

export function useCalendarTasks(farmId: string | undefined, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['farms', farmId, 'tasks', 'calendar', startDate, endDate],
    queryFn: () =>
      fetchApi<TaskWithRelations[]>(
        `/api/v1/farms/${farmId}/tasks/calendar?startDate=${startDate}&endDate=${endDate}`
      ),
    enabled: !!farmId && !!startDate && !!endDate,
  });
}

export function useUpdateTask(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: UpdateTask }) =>
      fetchApi<Task>(`/api/v1/farms/${farmId}/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'orders'] });
    },
  });
}

export function useCompleteTask(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: {
      completedBy: string;
      completionNotes?: string;
      actualTrays?: number;
      actualYieldOz?: number;
      seedLot?: string;
      completedAt?: string;
    }}) =>
      fetchApi<Task>(`/api/v1/farms/${farmId}/tasks/${taskId}/complete`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'orders'] });
    },
  });
}

// ============================================================================
// PAYMENTS
// ============================================================================

interface PaymentSettings {
  id: string;
  farmId: string;
  stripeAccountId: string | null;
  stripeAccountStatus: string;
  stripeOnboardingComplete: boolean;
  paypalMerchantId: string | null;
  paypalClientId: string | null;
  paypalAccountStatus: string;
  preferredProcessor: string;
  paymentTiming: string;
  platformFeePercent: number;
  applicationFeePercent?: number;
  isConnected: boolean;
  canAcceptPayments: boolean;
}

interface Payment {
  id: string;
  farmId: string;
  orderId: string | null;
  amount: number;
  currency: string;
  status: string;
  processor: string;
  platformFee: number | null;
  stripePaymentIntentId: string | null;
  paymentLinkId: string | null;
  paymentLinkUrl: string | null;
  paymentLinkExpiresAt: string | null;
  customerEmail: string | null;
  customerName: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface PaymentLinkDetails {
  id: string;
  orderNumber: string;
  farmName: string;
  farmId: string;
  amount: number;
  currency: string;
  customerEmail: string | null;
  customerName: string | null;
  status: string;
  expiresAt: string | null;
  items: Array<{
    productName: string;
    quantityOz: number;
    lineTotal: number | null;
  }>;
}

interface StripeStatus {
  status: string;
  accountId?: string;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirements?: unknown;
}

export function usePaymentSettings(farmId: string | undefined) {
  return useQuery({
    queryKey: ['farms', farmId, 'payments', 'settings'],
    queryFn: () => fetchApi<PaymentSettings>(`/api/v1/farms/${farmId}/payments/settings`),
    enabled: !!farmId,
  });
}

export function useUpdatePaymentSettings(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Pick<PaymentSettings, 'paymentTiming' | 'preferredProcessor'>>) =>
      fetchApi<PaymentSettings>(`/api/v1/farms/${farmId}/payments/settings`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'payments', 'settings'] });
    },
  });
}

export function useStripeConnect(farmId: string) {
  return useMutation({
    mutationFn: () =>
      fetchApi<{ url: string }>(`/api/v1/farms/${farmId}/payments/stripe/connect`, {
        method: 'POST',
      }),
  });
}

export function useStripeRefresh(farmId: string) {
  return useMutation({
    mutationFn: () =>
      fetchApi<{ url: string }>(`/api/v1/farms/${farmId}/payments/stripe/refresh`, {
        method: 'POST',
      }),
  });
}

export function useStripeStatus(farmId: string | undefined) {
  return useQuery({
    queryKey: ['farms', farmId, 'payments', 'stripe', 'status'],
    queryFn: () => fetchApi<StripeStatus>(`/api/v1/farms/${farmId}/payments/stripe/status`),
    enabled: !!farmId,
  });
}

export function useStripeDisconnect(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      fetchApi(`/api/v1/farms/${farmId}/payments/stripe/disconnect`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'payments'] });
    },
  });
}

export function useOrderPayments(farmId: string, orderId: string | undefined) {
  return useQuery({
    queryKey: ['farms', farmId, 'orders', orderId, 'payments'],
    queryFn: () => fetchApi<Payment[]>(`/api/v1/farms/${farmId}/orders/${orderId}/payments`),
    enabled: !!farmId && !!orderId,
  });
}

export function useCreatePaymentIntent(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: { amount: number; customerEmail?: string; customerName?: string } }) =>
      fetchApi<{ paymentId: string; clientSecret: string; amount: number }>(`/api/v1/farms/${farmId}/orders/${orderId}/payment-intent`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'orders', variables.orderId, 'payments'] });
    },
  });
}

export function useCreatePaymentLink(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: { amount: number; customerEmail?: string; customerName?: string; expiresInHours?: number } }) =>
      fetchApi<{ paymentId: string; paymentLinkId: string; url: string; expiresAt: string }>(`/api/v1/farms/${farmId}/orders/${orderId}/payment-link`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'orders', variables.orderId, 'payments'] });
    },
  });
}

export function useProcessRefund(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ paymentId, amount, reason }: { paymentId: string; amount?: number; reason?: string }) =>
      fetchApi<{ refundId: string; amount: number; status: string }>(`/api/v1/farms/${farmId}/payments/${paymentId}/refund`, {
        method: 'POST',
        body: JSON.stringify({ amount, reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId] });
    },
  });
}

// ============================================================================
// PUBLIC PAYMENT LINK (No auth required)
// ============================================================================

export function usePaymentLinkDetails(linkId: string | undefined) {
  return useQuery({
    queryKey: ['payment-link', linkId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/v1/payment-link/${linkId}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.error?.message || error.message || 'Request failed');
      }
      const data = await response.json();
      // Handle already paid or expired cases
      if (!data.success && data.expired) {
        throw new Error('Payment link has expired');
      }
      if (data.data?.status === 'ALREADY_PAID') {
        return { ...data.data, alreadyPaid: true };
      }
      return data.data as PaymentLinkDetails;
    },
    enabled: !!linkId,
    retry: false,
  });
}

export function usePaymentLinkPay(linkId: string) {
  return useMutation({
    mutationFn: () =>
      fetch(`${API_BASE}/api/v1/payment-link/${linkId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).then(async (response) => {
        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: 'Request failed' }));
          throw new Error(error.error?.message || error.message || 'Request failed');
        }
        const data = await response.json();
        return data.data as { clientSecret: string; stripeAccountId: string };
      }),
  });
}

// ============================================================================
// PAYPAL PAYMENT LINK
// ============================================================================

export function usePayPalConfig(linkId: string | undefined) {
  return useQuery({
    queryKey: ['payment-link', linkId, 'paypal', 'config'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/v1/payment-link/${linkId}/paypal/config`);
      if (!response.ok) {
        throw new Error('Failed to get PayPal config');
      }
      const data = await response.json();
      return data.data as { clientId: string | null; isConfigured: boolean };
    },
    enabled: !!linkId,
  });
}

export function usePayPalCreateOrder(linkId: string) {
  return useMutation({
    mutationFn: () =>
      fetch(`${API_BASE}/api/v1/payment-link/${linkId}/paypal/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).then(async (response) => {
        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: 'Request failed' }));
          throw new Error(error.error?.message || error.message || 'Request failed');
        }
        const data = await response.json();
        return data.data as { orderId: string };
      }),
  });
}

export function usePayPalCaptureOrder(linkId: string) {
  return useMutation({
    mutationFn: (orderId: string) =>
      fetch(`${API_BASE}/api/v1/payment-link/${linkId}/paypal/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      }).then(async (response) => {
        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: 'Request failed' }));
          throw new Error(error.error?.message || error.message || 'Request failed');
        }
        const data = await response.json();
        return data.data as { status: string; captureId: string };
      }),
  });
}

// ============================================================================
// SKUS
// ============================================================================

export function useSkus(farmId: string | undefined, productId?: string) {
  return useQuery({
    queryKey: productId ? ['skus', farmId, productId] : ['skus', farmId],
    queryFn: () => {
      const endpoint = productId
        ? `/api/v1/farms/${farmId}/products/${productId}/skus`
        : `/api/v1/farms/${farmId}/skus`;
      return fetchApi<(Sku & { product?: { id: string; name: string; categoryId: string | null } })[]>(endpoint);
    },
    enabled: !!farmId,
  });
}

export function useSku(farmId: string | undefined, productId: string | undefined, skuId: string | undefined) {
  return useQuery({
    queryKey: ['skus', farmId, productId, skuId],
    queryFn: () => fetchApi<Sku>(`/api/v1/farms/${farmId}/products/${productId}/skus/${skuId}`),
    enabled: !!farmId && !!productId && !!skuId,
  });
}

export function useCreateSku(farmId: string, productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSku) =>
      fetchApi<Sku>(`/api/v1/farms/${farmId}/products/${productId}/skus`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skus', farmId] });
      queryClient.invalidateQueries({ queryKey: ['skus', farmId, productId] });
    },
  });
}

export function useUpdateSku(farmId: string, productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ skuId, data }: { skuId: string; data: UpdateSku }) =>
      fetchApi<Sku>(`/api/v1/farms/${farmId}/products/${productId}/skus/${skuId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skus', farmId] });
      queryClient.invalidateQueries({ queryKey: ['skus', farmId, productId] });
    },
  });
}

// Version that accepts productId in the mutation call (for Store page where we edit SKUs from different products)
export function useUpdateSkuDynamic(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, skuId, data }: { productId: string; skuId: string; data: UpdateSku }) =>
      fetchApi<Sku>(`/api/v1/farms/${farmId}/products/${productId}/skus/${skuId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skus', farmId] });
    },
  });
}

export function useDeleteSku(farmId: string, productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (skuId: string) =>
      fetchApi(`/api/v1/farms/${farmId}/products/${productId}/skus/${skuId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skus', farmId] });
      queryClient.invalidateQueries({ queryKey: ['skus', farmId, productId] });
    },
  });
}

export function useDeleteSkuDynamic(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, skuId }: { productId: string; skuId: string }) =>
      fetchApi(`/api/v1/farms/${farmId}/products/${productId}/skus/${skuId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skus', farmId] });
    },
  });
}

export function useUploadSkuImage(farmId: string, productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ skuId, file }: { skuId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/api/v1/farms/${farmId}/products/${productId}/skus/${skuId}/image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer dev-token`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to upload image');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skus', farmId] });
      queryClient.invalidateQueries({ queryKey: ['skus', farmId, productId] });
    },
  });
}

export function useDeleteSkuImage(farmId: string, productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (skuId: string) =>
      fetchApi(`/api/v1/farms/${farmId}/products/${productId}/skus/${skuId}/image`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skus', farmId] });
      queryClient.invalidateQueries({ queryKey: ['skus', farmId, productId] });
    },
  });
}

// ============================================================================
// CUSTOMERS
// ============================================================================

export function useCustomers(farmId: string | undefined, filters?: {
  search?: string;
  customerType?: string;
  isActive?: boolean;
  tagId?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.customerType) params.set('customerType', filters.customerType);
  if (filters?.isActive !== undefined) params.set('isActive', String(filters.isActive));
  if (filters?.tagId) params.set('tagId', filters.tagId);
  const queryString = params.toString();

  return useQuery({
    queryKey: ['customers', farmId, filters],
    queryFn: () =>
      fetchApi<(Customer & { tags: CustomerTag[]; _count: { orders: number } })[]>(
        `/api/v1/farms/${farmId}/customers${queryString ? `?${queryString}` : ''}`
      ),
    enabled: !!farmId,
  });
}

export function useCustomer(farmId: string | undefined, customerId: string | undefined) {
  return useQuery({
    queryKey: ['customers', farmId, customerId],
    queryFn: () =>
      fetchApi<Customer & { tags: CustomerTag[]; _count: { orders: number } }>(
        `/api/v1/farms/${farmId}/customers/${customerId}`
      ),
    enabled: !!farmId && !!customerId,
  });
}

export function useCreateCustomer(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomer) =>
      fetchApi<Customer>(`/api/v1/farms/${farmId}/customers`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', farmId] });
    },
  });
}

export function useUpdateCustomer(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerId, data }: { customerId: string; data: UpdateCustomer }) =>
      fetchApi<Customer>(`/api/v1/farms/${farmId}/customers/${customerId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: ['customers', farmId] });
      queryClient.invalidateQueries({ queryKey: ['customers', farmId, customerId] });
    },
  });
}

export function useDeleteCustomer(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (customerId: string) =>
      fetchApi(`/api/v1/farms/${farmId}/customers/${customerId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', farmId] });
    },
  });
}

export function useCustomerOrders(farmId: string | undefined, customerId: string | undefined) {
  return useQuery({
    queryKey: ['customers', farmId, customerId, 'orders'],
    queryFn: () => fetchApi<Order[]>(`/api/v1/farms/${farmId}/customers/${customerId}/orders`),
    enabled: !!farmId && !!customerId,
  });
}

// ============================================================================
// CUSTOMER TAGS
// ============================================================================

export function useCustomerTags(farmId: string | undefined) {
  return useQuery({
    queryKey: ['customer-tags', farmId],
    queryFn: () =>
      fetchApi<(CustomerTag & { _count: { customers: number } })[]>(
        `/api/v1/farms/${farmId}/customer-tags`
      ),
    enabled: !!farmId,
  });
}

export function useCreateCustomerTag(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerTag) =>
      fetchApi<CustomerTag>(`/api/v1/farms/${farmId}/customer-tags`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-tags', farmId] });
    },
  });
}

export function useUpdateCustomerTag(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tagId, data }: { tagId: string; data: UpdateCustomerTag }) =>
      fetchApi<CustomerTag>(`/api/v1/farms/${farmId}/customer-tags/${tagId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-tags', farmId] });
    },
  });
}

export function useDeleteCustomerTag(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tagId: string) =>
      fetchApi(`/api/v1/farms/${farmId}/customer-tags/${tagId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-tags', farmId] });
    },
  });
}

// ============================================================================
// RECURRING ORDER SCHEDULES
// ============================================================================

interface RecurringScheduleWithMeta extends RecurringOrderSchedule {
  nextHarvestDate: Date | null;
  scheduleDescription: string;
  items: Array<{
    id: string;
    productId: string;
    quantityOz: number;
    overagePercent: number;
    product: {
      id: string;
      name: string;
      avgYieldPerTray: number | null;
      daysSoaking: number | null;
      daysGermination: number | null;
      daysLight: number | null;
    };
  }>;
  customer?: { id: string; name: string } | null;
  skippedDates: Array<{ id: string; skipDate: Date; reason: string | null }>;
  _count: { generatedOrders: number };
}

export function useRecurringSchedules(farmId: string | undefined) {
  return useQuery({
    queryKey: ['recurring-schedules', farmId],
    queryFn: () => fetchApi<RecurringScheduleWithMeta[]>(`/api/v1/farms/${farmId}/recurring-schedules`),
    enabled: !!farmId,
  });
}

export function useRecurringSchedule(farmId: string | undefined, scheduleId: string | undefined) {
  return useQuery({
    queryKey: ['recurring-schedules', farmId, scheduleId],
    queryFn: () => fetchApi<RecurringScheduleWithMeta & { upcomingHarvestDates: Date[] }>(
      `/api/v1/farms/${farmId}/recurring-schedules/${scheduleId}`
    ),
    enabled: !!farmId && !!scheduleId,
  });
}

export function useCreateRecurringSchedule(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRecurringOrderSchedule) =>
      fetchApi<RecurringOrderSchedule>(`/api/v1/farms/${farmId}/recurring-schedules`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-schedules', farmId] });
    },
  });
}

export function useUpdateRecurringSchedule(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scheduleId, data }: { scheduleId: string; data: UpdateRecurringOrderSchedule }) =>
      fetchApi<RecurringOrderSchedule>(`/api/v1/farms/${farmId}/recurring-schedules/${scheduleId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { scheduleId }) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-schedules', farmId] });
      queryClient.invalidateQueries({ queryKey: ['recurring-schedules', farmId, scheduleId] });
    },
  });
}

export function useDeleteRecurringSchedule(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scheduleId: string) =>
      fetchApi(`/api/v1/farms/${farmId}/recurring-schedules/${scheduleId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-schedules', farmId] });
    },
  });
}

export function useAddSkipDate(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scheduleId, skipDate, reason }: { scheduleId: string; skipDate: Date; reason?: string }) =>
      fetchApi(`/api/v1/farms/${farmId}/recurring-schedules/${scheduleId}/skip`, {
        method: 'POST',
        body: JSON.stringify({ skipDate, reason }),
      }),
    onSuccess: (_, { scheduleId }) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-schedules', farmId] });
      queryClient.invalidateQueries({ queryKey: ['recurring-schedules', farmId, scheduleId] });
    },
  });
}

export function useRemoveSkipDate(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scheduleId, skipId }: { scheduleId: string; skipId: string }) =>
      fetchApi(`/api/v1/farms/${farmId}/recurring-schedules/${scheduleId}/skip/${skipId}`, { method: 'DELETE' }),
    onSuccess: (_, { scheduleId }) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-schedules', farmId] });
      queryClient.invalidateQueries({ queryKey: ['recurring-schedules', farmId, scheduleId] });
    },
  });
}

export function useGenerateRecurringOrder(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scheduleId, harvestDate }: { scheduleId: string; harvestDate?: string }) =>
      fetchApi<Order>(`/api/v1/farms/${farmId}/recurring-schedules/${scheduleId}/generate`, {
        method: 'POST',
        body: JSON.stringify({ harvestDate }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-schedules', farmId] });
      queryClient.invalidateQueries({ queryKey: ['orders', farmId] });
    },
  });
}

// ============================================================================
// BLENDS
// ============================================================================

export interface BlendWithIngredients extends Blend {
  product: { id: string; name: string; sku: string | null };
  ingredients: Array<{
    id: string;
    blendId: string;
    productId: string;
    ratioPercent: number;
    overrideDaysSoaking: number | null;
    overrideDaysGermination: number | null;
    overrideDaysLight: number | null;
    displayOrder: number;
    product: {
      id: string;
      name: string;
      avgYieldPerTray: number | null;
      daysSoaking: number | null;
      daysGermination: number | null;
      daysLight: number | null;
    };
  }>;
  maxGrowthDays: number;
  ingredientSummary: string;
  ingredientCount: number;
}

export function useBlends(farmId: string | undefined) {
  return useQuery({
    queryKey: ['blends', farmId],
    queryFn: () => fetchApi<BlendWithIngredients[]>(`/api/v1/farms/${farmId}/blends`),
    enabled: !!farmId,
  });
}

export function useBlend(farmId: string | undefined, blendId: string | undefined) {
  return useQuery({
    queryKey: ['blends', farmId, blendId],
    queryFn: () => fetchApi<BlendWithIngredients>(`/api/v1/farms/${farmId}/blends/${blendId}`),
    enabled: !!farmId && !!blendId,
  });
}

export function useCreateBlend(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBlend) =>
      fetchApi<Blend>(`/api/v1/farms/${farmId}/blends`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blends', farmId] });
      queryClient.invalidateQueries({ queryKey: ['products', farmId] });
    },
  });
}

export function useUpdateBlend(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ blendId, data }: { blendId: string; data: UpdateBlend }) =>
      fetchApi<Blend>(`/api/v1/farms/${farmId}/blends/${blendId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { blendId }) => {
      queryClient.invalidateQueries({ queryKey: ['blends', farmId] });
      queryClient.invalidateQueries({ queryKey: ['blends', farmId, blendId] });
      queryClient.invalidateQueries({ queryKey: ['products', farmId] });
    },
  });
}

export function useDeleteBlend(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (blendId: string) =>
      fetchApi(`/api/v1/farms/${farmId}/blends/${blendId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blends', farmId] });
      queryClient.invalidateQueries({ queryKey: ['products', farmId] });
    },
  });
}

export function usePreviewBlendSchedule(farmId: string) {
  return useMutation({
    mutationFn: ({
      blendId,
      quantityOz,
      harvestDate,
      overagePercent,
    }: {
      blendId: string;
      quantityOz: number;
      harvestDate: string;
      overagePercent?: number;
    }) =>
      fetchApi<BlendProductionSchedule>(
        `/api/v1/farms/${farmId}/blends/${blendId}/preview-schedule`,
        {
          method: 'POST',
          body: JSON.stringify({ quantityOz, harvestDate, overagePercent }),
        }
      ),
  });
}

// ============================================================================
// DELIVERY ROUTES
// ============================================================================

interface DeliveryRouteWithOrders extends DeliveryRoute {
  driver?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
  } | null;
  orders: Array<{
    id: string;
    orderNumber: string;
    customerName: string | null;
    deliveryAddress: string | null;
    deliveryStopOrder: number | null;
    deliveryNotes?: string | null;
    fulfillmentStatus: FulfillmentStatus;
    paymentType?: PaymentType;
    totalCents?: number;
    customer?: {
      id: string;
      name: string;
      phone: string | null;
    };
  }>;
  _count?: {
    orders: number;
  };
}

interface DriverInfo {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
}

export function useDeliveryRoutes(farmId: string | undefined, filters?: {
  date?: string;
  status?: RouteStatus;
  driverId?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.date) params.set('date', filters.date);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.driverId) params.set('driverId', filters.driverId);
  const queryString = params.toString();

  return useQuery({
    queryKey: ['delivery-routes', farmId, filters],
    queryFn: () =>
      fetchApi<DeliveryRouteWithOrders[]>(
        `/api/v1/farms/${farmId}/delivery-routes${queryString ? `?${queryString}` : ''}`
      ),
    enabled: !!farmId,
  });
}

export function useDeliveryRoute(farmId: string | undefined, routeId: string | undefined) {
  return useQuery({
    queryKey: ['delivery-routes', farmId, routeId],
    queryFn: () =>
      fetchApi<DeliveryRouteWithOrders>(`/api/v1/farms/${farmId}/delivery-routes/${routeId}`),
    enabled: !!farmId && !!routeId,
  });
}

export function useCreateDeliveryRoute(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDeliveryRoute & { orderIds?: string[] }) =>
      fetchApi<DeliveryRoute>(`/api/v1/farms/${farmId}/delivery-routes`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-routes', farmId] });
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'orders'] });
    },
  });
}

export function useUpdateDeliveryRoute(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ routeId, data }: { routeId: string; data: UpdateDeliveryRoute }) =>
      fetchApi<DeliveryRoute>(`/api/v1/farms/${farmId}/delivery-routes/${routeId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { routeId }) => {
      queryClient.invalidateQueries({ queryKey: ['delivery-routes', farmId] });
      queryClient.invalidateQueries({ queryKey: ['delivery-routes', farmId, routeId] });
    },
  });
}

export function useDeleteDeliveryRoute(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (routeId: string) =>
      fetchApi(`/api/v1/farms/${farmId}/delivery-routes/${routeId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-routes', farmId] });
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'orders'] });
    },
  });
}

export function useAddOrderToRoute(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ routeId, orderId, stopOrder }: { routeId: string; orderId: string; stopOrder?: number }) =>
      fetchApi(`/api/v1/farms/${farmId}/delivery-routes/${routeId}/orders`, {
        method: 'POST',
        body: JSON.stringify({ orderId, stopOrder }),
      }),
    onSuccess: (_, { routeId }) => {
      queryClient.invalidateQueries({ queryKey: ['delivery-routes', farmId] });
      queryClient.invalidateQueries({ queryKey: ['delivery-routes', farmId, routeId] });
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['ready-for-delivery', farmId] });
    },
  });
}

export function useRemoveOrderFromRoute(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ routeId, orderId }: { routeId: string; orderId: string }) =>
      fetchApi(`/api/v1/farms/${farmId}/delivery-routes/${routeId}/orders/${orderId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, { routeId }) => {
      queryClient.invalidateQueries({ queryKey: ['delivery-routes', farmId] });
      queryClient.invalidateQueries({ queryKey: ['delivery-routes', farmId, routeId] });
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['ready-for-delivery', farmId] });
    },
  });
}

export function useReorderRouteStops(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ routeId, orderIds }: { routeId: string; orderIds: string[] }) =>
      fetchApi(`/api/v1/farms/${farmId}/delivery-routes/${routeId}/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ orderIds }),
      }),
    onSuccess: (_, { routeId }) => {
      queryClient.invalidateQueries({ queryKey: ['delivery-routes', farmId, routeId] });
    },
  });
}

export function useStartRoute(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (routeId: string) =>
      fetchApi<DeliveryRoute>(`/api/v1/farms/${farmId}/delivery-routes/${routeId}/start`, {
        method: 'POST',
      }),
    onSuccess: (_, routeId) => {
      queryClient.invalidateQueries({ queryKey: ['delivery-routes', farmId] });
      queryClient.invalidateQueries({ queryKey: ['delivery-routes', farmId, routeId] });
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'orders'] });
    },
  });
}

export function useCompleteRoute(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ routeId, actualDuration, actualMiles }: { routeId: string; actualDuration?: number; actualMiles?: number }) =>
      fetchApi<DeliveryRoute>(`/api/v1/farms/${farmId}/delivery-routes/${routeId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ actualDuration, actualMiles }),
      }),
    onSuccess: (_, { routeId }) => {
      queryClient.invalidateQueries({ queryKey: ['delivery-routes', farmId] });
      queryClient.invalidateQueries({ queryKey: ['delivery-routes', farmId, routeId] });
    },
  });
}

// ============================================================================
// ORDER FULFILLMENT
// ============================================================================

export function useUpdateOrderFulfillment(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, data }: {
      orderId: string;
      data: {
        fulfillmentMethod?: FulfillmentMethod;
        fulfillmentStatus?: FulfillmentStatus;
        paymentType?: PaymentType;
        deliveryDate?: string;
        deliveryTimeSlot?: string;
        deliveryAddress?: string;
        deliveryNotes?: string;
        distributorName?: string;
        distributorContact?: string;
      }
    }) =>
      fetchApi(`/api/v1/farms/${farmId}/orders/${orderId}/fulfillment`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-routes', farmId] });
    },
  });
}

export function useMarkOrderReady(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) =>
      fetchApi(`/api/v1/farms/${farmId}/orders/${orderId}/ready`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['ready-for-delivery', farmId] });
    },
  });
}

export function useMarkOrderDelivered(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) =>
      fetchApi(`/api/v1/farms/${farmId}/orders/${orderId}/deliver`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-routes', farmId] });
    },
  });
}

export function useMarkOrderPickedUp(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) =>
      fetchApi(`/api/v1/farms/${farmId}/orders/${orderId}/pickup`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'orders'] });
    },
  });
}

// ============================================================================
// DELIVERY SIGNATURES
// ============================================================================

export function useCaptureSignature(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: CaptureSignature }) =>
      fetchApi<DeliverySignature>(`/api/v1/farms/${farmId}/orders/${orderId}/signature`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-routes', farmId] });
    },
  });
}

export function useOrderSignature(farmId: string | undefined, orderId: string | undefined) {
  return useQuery({
    queryKey: ['signatures', farmId, orderId],
    queryFn: () => fetchApi<DeliverySignature | null>(`/api/v1/farms/${farmId}/orders/${orderId}/signature`),
    enabled: !!farmId && !!orderId,
  });
}

// ============================================================================
// DRIVERS
// ============================================================================

export function useDrivers(farmId: string | undefined) {
  return useQuery({
    queryKey: ['drivers', farmId],
    queryFn: () => fetchApi<DriverInfo[]>(`/api/v1/farms/${farmId}/drivers`),
    enabled: !!farmId,
  });
}

export function useDriverRoutes(farmId: string | undefined, driverId: string | undefined, date?: string) {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  const queryString = params.toString();

  return useQuery({
    queryKey: ['driver-routes', farmId, driverId, date],
    queryFn: () =>
      fetchApi<DeliveryRouteWithOrders[]>(
        `/api/v1/farms/${farmId}/drivers/${driverId}/routes${queryString ? `?${queryString}` : ''}`
      ),
    enabled: !!farmId && !!driverId,
  });
}

export function useOrdersReadyForDelivery(farmId: string | undefined) {
  return useQuery({
    queryKey: ['ready-for-delivery', farmId],
    queryFn: () =>
      fetchApi<Array<{
        id: string;
        orderNumber: string;
        customerName: string | null;
        deliveryAddress: string | null;
        deliveryDate: string | null;
        deliveryNotes: string | null;
        totalCents: number;
        paymentType: PaymentType;
        customer: {
          id: string;
          name: string;
          phone: string | null;
          addressLine1: string | null;
          city: string | null;
          state: string | null;
          postalCode: string | null;
        } | null;
      }>>(`/api/v1/farms/${farmId}/orders/ready-for-delivery`),
    enabled: !!farmId,
  });
}

// ============================================================================
// DOCUMENTS (PDF Generation)
// ============================================================================

interface GeneratedDocumentWithOrder extends GeneratedDocument {
  order?: {
    id: string;
    orderNumber: string;
    customerName: string | null;
  } | null;
}

export function useOrderDocuments(farmId: string | undefined, orderId: string | undefined) {
  return useQuery({
    queryKey: ['documents', farmId, 'order', orderId],
    queryFn: () =>
      fetchApi<GeneratedDocument[]>(`/api/v1/farms/${farmId}/orders/${orderId}/documents`),
    enabled: !!farmId && !!orderId,
  });
}

export function useFarmDocuments(farmId: string | undefined, filters?: {
  type?: DocumentType;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.type) params.set('type', filters.type);
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);
  if (filters?.limit) params.set('limit', String(filters.limit));
  if (filters?.offset) params.set('offset', String(filters.offset));
  const queryString = params.toString();

  return useQuery({
    queryKey: ['documents', farmId, filters],
    queryFn: () =>
      fetchApi<{
        data: GeneratedDocumentWithOrder[];
        meta: { total: number; limit: number; offset: number };
      }>(`/api/v1/farms/${farmId}/documents${queryString ? `?${queryString}` : ''}`),
    enabled: !!farmId,
  });
}

export function useGenerateDocument(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: GenerateDocument }) =>
      fetchApi<GeneratedDocument>(`/api/v1/farms/${farmId}/orders/${orderId}/documents`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['documents', farmId] });
      queryClient.invalidateQueries({ queryKey: ['documents', farmId, 'order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'orders', orderId] });
    },
  });
}

export function usePreviewDocument(farmId: string) {
  return useMutation({
    mutationFn: async ({ orderId, type }: { orderId: string; type: DocumentType }) => {
      const response = await fetch(
        `${API_BASE}/api/v1/farms/${farmId}/orders/${orderId}/documents/preview`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type }),
        }
      );
      if (!response.ok) {
        throw new Error('Failed to generate preview');
      }
      // Return blob for preview
      return response.blob();
    },
  });
}

export function useDownloadDocument(farmId: string) {
  return useMutation({
    mutationFn: async (documentId: string) => {
      const response = await fetch(
        `${API_BASE}/api/v1/farms/${farmId}/documents/${documentId}/download`
      );
      if (!response.ok) {
        throw new Error('Failed to download document');
      }
      const blob = await response.blob();
      // Get filename from content-disposition header or use default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'document.pdf';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return { success: true };
    },
  });
}

export function useViewDocument(farmId: string) {
  return useMutation({
    mutationFn: async (documentId: string) => {
      // Open document preview in new tab
      const url = `${API_BASE}/api/v1/farms/${farmId}/documents/${documentId}/preview`;
      window.open(url, '_blank');
      return { success: true };
    },
  });
}

export function useSendDocument(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, data }: { documentId: string; data: SendDocumentEmail }) =>
      fetchApi<GeneratedDocument>(`/api/v1/farms/${farmId}/documents/${documentId}/send`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', farmId] });
    },
  });
}

export function useDeleteDocument(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) =>
      fetchApi(`/api/v1/farms/${farmId}/documents/${documentId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', farmId] });
    },
  });
}

// ============================================================================
// CSA PROGRAMS
// ============================================================================

export function useCsaPrograms(farmId: string | undefined, filters?: { status?: string; includeStats?: boolean }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.includeStats) params.set('includeStats', 'true');
  const queryString = params.toString();

  return useQuery({
    queryKey: ['csa-programs', farmId, filters],
    queryFn: () =>
      fetchApi<Array<CsaProgram & { shareTypes: CsaShareType[]; pickupLocations: CsaPickupLocation[]; _count?: { members: number; weeks: number } }>>(
        `/api/v1/farms/${farmId}/csa/programs${queryString ? `?${queryString}` : ''}`
      ),
    enabled: !!farmId,
  });
}

export function useCsaProgram(farmId: string | undefined, programId: string | undefined) {
  return useQuery({
    queryKey: ['csa-programs', farmId, programId],
    queryFn: () => fetchApi<CsaProgramWithRelations>(`/api/v1/farms/${farmId}/csa/programs/${programId}`),
    enabled: !!farmId && !!programId,
  });
}

export function useCreateCsaProgram(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCsaProgram) =>
      fetchApi<CsaProgram>(`/api/v1/farms/${farmId}/csa/programs`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csa-programs', farmId] });
    },
  });
}

export function useUpdateCsaProgram(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ programId, data }: { programId: string; data: UpdateCsaProgram }) =>
      fetchApi<CsaProgram>(`/api/v1/farms/${farmId}/csa/programs/${programId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { programId }) => {
      queryClient.invalidateQueries({ queryKey: ['csa-programs', farmId] });
      queryClient.invalidateQueries({ queryKey: ['csa-programs', farmId, programId] });
    },
  });
}

export function useDeleteCsaProgram(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (programId: string) =>
      fetchApi(`/api/v1/farms/${farmId}/csa/programs/${programId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csa-programs', farmId] });
    },
  });
}

export function useGenerateCsaWeeks(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (programId: string) =>
      fetchApi<CsaWeek[]>(`/api/v1/farms/${farmId}/csa/programs/${programId}/generate-weeks`, {
        method: 'POST',
      }),
    onSuccess: (_, programId) => {
      queryClient.invalidateQueries({ queryKey: ['csa-programs', farmId, programId] });
      queryClient.invalidateQueries({ queryKey: ['csa-weeks', farmId, programId] });
    },
  });
}

// ============================================================================
// CSA SHARE TYPES
// ============================================================================

export function useCreateCsaShareType(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ programId, data }: { programId: string; data: CreateCsaShareType }) =>
      fetchApi<CsaShareType>(`/api/v1/farms/${farmId}/csa/programs/${programId}/share-types`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { programId }) => {
      queryClient.invalidateQueries({ queryKey: ['csa-programs', farmId, programId] });
    },
  });
}

export function useUpdateCsaShareType(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shareTypeId, data }: { shareTypeId: string; data: UpdateCsaShareType }) =>
      fetchApi<CsaShareType>(`/api/v1/farms/${farmId}/csa/share-types/${shareTypeId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csa-programs', farmId] });
    },
  });
}

export function useDeleteCsaShareType(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shareTypeId: string) =>
      fetchApi(`/api/v1/farms/${farmId}/csa/share-types/${shareTypeId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csa-programs', farmId] });
    },
  });
}

// ============================================================================
// CSA MEMBERS
// ============================================================================

export function useCsaMembers(farmId: string | undefined, programId: string | undefined, filters?: { status?: string; shareTypeId?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.shareTypeId) params.set('shareTypeId', filters.shareTypeId);
  const queryString = params.toString();

  return useQuery({
    queryKey: ['csa-members', farmId, programId, filters],
    queryFn: () =>
      fetchApi<CsaMemberWithRelations[]>(
        `/api/v1/farms/${farmId}/csa/programs/${programId}/members${queryString ? `?${queryString}` : ''}`
      ),
    enabled: !!farmId && !!programId,
  });
}

export function useCsaMember(farmId: string | undefined, memberId: string | undefined) {
  return useQuery({
    queryKey: ['csa-members', farmId, memberId],
    queryFn: () => fetchApi<CsaMemberWithRelations>(`/api/v1/farms/${farmId}/csa/members/${memberId}`),
    enabled: !!farmId && !!memberId,
  });
}

export function useEnrollCsaMember(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ programId, data }: { programId: string; data: EnrollCsaMember }) =>
      fetchApi<CsaMember>(`/api/v1/farms/${farmId}/csa/programs/${programId}/members`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { programId }) => {
      queryClient.invalidateQueries({ queryKey: ['csa-members', farmId, programId] });
      queryClient.invalidateQueries({ queryKey: ['csa-programs', farmId, programId] });
    },
  });
}

export function useUpdateCsaMember(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: UpdateCsaMember }) =>
      fetchApi<CsaMember>(`/api/v1/farms/${farmId}/csa/members/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { memberId }) => {
      queryClient.invalidateQueries({ queryKey: ['csa-members', farmId] });
      queryClient.invalidateQueries({ queryKey: ['csa-members', farmId, memberId] });
    },
  });
}

export function useRecordCsaPayment(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: RecordCsaPayment }) =>
      fetchApi<CsaMember>(`/api/v1/farms/${farmId}/csa/members/${memberId}/payment`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { memberId }) => {
      queryClient.invalidateQueries({ queryKey: ['csa-members', farmId] });
      queryClient.invalidateQueries({ queryKey: ['csa-members', farmId, memberId] });
    },
  });
}

export function useSetMemberPreference(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: SetMemberPreference }) =>
      fetchApi<CsaMemberPreference>(`/api/v1/farms/${farmId}/csa/members/${memberId}/preferences`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { memberId }) => {
      queryClient.invalidateQueries({ queryKey: ['csa-members', farmId, memberId] });
    },
  });
}

export function useSkipCsaWeek(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, weekId, data }: { memberId: string; weekId: string; data?: SkipWeek }) =>
      fetchApi<CsaMemberSkip>(`/api/v1/farms/${farmId}/csa/members/${memberId}/skip/${weekId}`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }),
    onSuccess: (_, { memberId }) => {
      queryClient.invalidateQueries({ queryKey: ['csa-members', farmId, memberId] });
      queryClient.invalidateQueries({ queryKey: ['csa-weeks', farmId] });
    },
  });
}

export function useCancelCsaSkip(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, weekId }: { memberId: string; weekId: string }) =>
      fetchApi(`/api/v1/farms/${farmId}/csa/members/${memberId}/skip/${weekId}`, { method: 'DELETE' }),
    onSuccess: (_, { memberId }) => {
      queryClient.invalidateQueries({ queryKey: ['csa-members', farmId, memberId] });
      queryClient.invalidateQueries({ queryKey: ['csa-weeks', farmId] });
    },
  });
}

// ============================================================================
// CSA PICKUP LOCATIONS
// ============================================================================

export function useCreateCsaPickupLocation(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ programId, data }: { programId: string; data: CreateCsaPickupLocation }) =>
      fetchApi<CsaPickupLocation>(`/api/v1/farms/${farmId}/csa/programs/${programId}/locations`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { programId }) => {
      queryClient.invalidateQueries({ queryKey: ['csa-programs', farmId, programId] });
    },
  });
}

export function useUpdateCsaPickupLocation(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ locationId, data }: { locationId: string; data: UpdateCsaPickupLocation }) =>
      fetchApi<CsaPickupLocation>(`/api/v1/farms/${farmId}/csa/locations/${locationId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csa-programs', farmId] });
    },
  });
}

export function useDeleteCsaPickupLocation(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (locationId: string) =>
      fetchApi(`/api/v1/farms/${farmId}/csa/locations/${locationId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csa-programs', farmId] });
    },
  });
}

// ============================================================================
// CSA WEEKS
// ============================================================================

export function useCsaWeeks(farmId: string | undefined, programId: string | undefined, filters?: { status?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  const queryString = params.toString();

  return useQuery({
    queryKey: ['csa-weeks', farmId, programId, filters],
    queryFn: () =>
      fetchApi<Array<CsaWeek & { _count: { allocations: number; skipRequests: number } }>>(
        `/api/v1/farms/${farmId}/csa/programs/${programId}/weeks${queryString ? `?${queryString}` : ''}`
      ),
    enabled: !!farmId && !!programId,
  });
}

export function useCsaWeek(farmId: string | undefined, weekId: string | undefined) {
  return useQuery({
    queryKey: ['csa-weeks', farmId, weekId],
    queryFn: () => fetchApi<CsaWeekWithRelations>(`/api/v1/farms/${farmId}/csa/weeks/${weekId}`),
    enabled: !!farmId && !!weekId,
  });
}

export function useUpdateCsaWeek(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ weekId, data }: { weekId: string; data: UpdateCsaWeek }) =>
      fetchApi<CsaWeek>(`/api/v1/farms/${farmId}/csa/weeks/${weekId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { weekId }) => {
      queryClient.invalidateQueries({ queryKey: ['csa-weeks', farmId] });
      queryClient.invalidateQueries({ queryKey: ['csa-weeks', farmId, weekId] });
    },
  });
}

export function useSetCsaWeekAllocations(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ weekId, allocations }: { weekId: string; allocations: SetWeekAllocation[] }) =>
      fetchApi<CsaWeekWithRelations>(`/api/v1/farms/${farmId}/csa/weeks/${weekId}/allocations`, {
        method: 'POST',
        body: JSON.stringify({ allocations }),
      }),
    onSuccess: (_, { weekId }) => {
      queryClient.invalidateQueries({ queryKey: ['csa-weeks', farmId, weekId] });
    },
  });
}

export function useFinalizeCsaWeek(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (weekId: string) =>
      fetchApi<CsaWeek>(`/api/v1/farms/${farmId}/csa/weeks/${weekId}/finalize`, {
        method: 'POST',
      }),
    onSuccess: (_, weekId) => {
      queryClient.invalidateQueries({ queryKey: ['csa-weeks', farmId] });
      queryClient.invalidateQueries({ queryKey: ['csa-weeks', farmId, weekId] });
    },
  });
}

export function useGenerateCsaOrders(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (weekId: string) =>
      fetchApi<{ ordersCreated: number; orders: Order[] }>(
        `/api/v1/farms/${farmId}/csa/weeks/${weekId}/generate-orders`,
        { method: 'POST' }
      ),
    onSuccess: (_, weekId) => {
      queryClient.invalidateQueries({ queryKey: ['csa-weeks', farmId] });
      queryClient.invalidateQueries({ queryKey: ['csa-weeks', farmId, weekId] });
      queryClient.invalidateQueries({ queryKey: ['farms', farmId, 'orders'] });
    },
  });
}

// ============================================================================
// PACKAGE TYPES
// ============================================================================

export function usePackageTypes(farmId: string | undefined) {
  return useQuery({
    queryKey: ['package-types', farmId],
    queryFn: () => fetchApi<PackageType[]>(`/api/v1/farms/${farmId}/package-types`),
    enabled: !!farmId,
  });
}

export function useCreatePackageType(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePackageType) =>
      fetchApi<PackageType>(`/api/v1/farms/${farmId}/package-types`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['package-types', farmId] });
    },
  });
}

export function useUpdatePackageType(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePackageType }) =>
      fetchApi<PackageType>(`/api/v1/farms/${farmId}/package-types/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['package-types', farmId] });
    },
  });
}

export function useDeletePackageType(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<{ success: boolean }>(`/api/v1/farms/${farmId}/package-types/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['package-types', farmId] });
    },
  });
}

export function useSeedDefaultPackageTypes(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      fetchApi<{ created: PackageType[]; message: string }>(
        `/api/v1/farms/${farmId}/package-types/seed-defaults`,
        { method: 'POST' }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['package-types', farmId] });
    },
  });
}

// ============================================================================
// SUPPLIES INVENTORY
// ============================================================================

// Extended interfaces for API responses
export interface SupplyCategoryWithCount extends SupplyCategory {
  _count: { supplies: number };
}

export interface SupplyWithRelations extends Supply {
  category: SupplyCategory;
  product?: { id: string; name: string } | null;
  _count?: { purchases: number; usageLogs: number };
}

export interface SupplyPurchaseLot {
  id: string;
  lotNumber: string | null;
  quantity: number;
  purchaseDate: string;
  expiryDate: string | null;
  supplier: string | null;
}

// Supply Categories
export function useSupplyCategories(farmId: string | null) {
  return useQuery({
    queryKey: ['supply-categories', farmId],
    queryFn: () => fetchApi<SupplyCategoryWithCount[]>(`/api/v1/farms/${farmId}/supply-categories`),
    enabled: !!farmId,
  });
}

export function useCreateSupplyCategory(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSupplyCategory) =>
      fetchApi<SupplyCategory>(`/api/v1/farms/${farmId}/supply-categories`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-categories', farmId] });
    },
  });
}

export function useUpdateSupplyCategory(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplyCategory }) =>
      fetchApi<SupplyCategory>(`/api/v1/farms/${farmId}/supply-categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-categories', farmId] });
    },
  });
}

export function useDeleteSupplyCategory(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<{ success: boolean }>(`/api/v1/farms/${farmId}/supply-categories/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-categories', farmId] });
    },
  });
}

export function useSeedDefaultSupplyCategories(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      fetchApi<{ created: SupplyCategory[]; message: string }>(
        `/api/v1/farms/${farmId}/supply-categories/seed-defaults`,
        { method: 'POST' }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-categories', farmId] });
    },
  });
}

// Supplies
export function useSupplies(farmId: string | null, categoryId?: string) {
  const params = categoryId ? `?categoryId=${categoryId}` : '';
  return useQuery({
    queryKey: ['supplies', farmId, categoryId],
    queryFn: () => fetchApi<SupplyWithRelations[]>(`/api/v1/farms/${farmId}/supplies${params}`),
    enabled: !!farmId,
  });
}

export function useSupply(farmId: string | null, supplyId: string | undefined) {
  return useQuery({
    queryKey: ['supplies', farmId, supplyId],
    queryFn: () => fetchApi<SupplyWithRelations>(`/api/v1/farms/${farmId}/supplies/${supplyId}`),
    enabled: !!farmId && !!supplyId,
  });
}

export function useLowStockSupplies(farmId: string | null) {
  return useQuery({
    queryKey: ['supplies', farmId, 'low-stock'],
    queryFn: () => fetchApi<SupplyWithRelations[]>(`/api/v1/farms/${farmId}/supplies/low-stock`),
    enabled: !!farmId,
  });
}

export function useCreateSupply(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSupply) =>
      fetchApi<SupplyWithRelations>(`/api/v1/farms/${farmId}/supplies`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplies', farmId] });
    },
  });
}

export function useUpdateSupply(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupply }) =>
      fetchApi<SupplyWithRelations>(`/api/v1/farms/${farmId}/supplies/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplies', farmId] });
    },
  });
}

export function useDeleteSupply(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<{ success: boolean }>(`/api/v1/farms/${farmId}/supplies/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplies', farmId] });
    },
  });
}

// Supply Purchases
export type SupplyPurchaseWithSupply = SupplyPurchase & {
  supply: {
    id: string;
    name: string;
    category: { id: string; name: string };
  };
};

// Get ALL purchases for a farm (with optional filters)
export function useAllSupplyPurchases(
  farmId: string | null,
  filters?: { supplyId?: string; categoryId?: string; supplier?: string }
) {
  const params = new URLSearchParams();
  if (filters?.supplyId) params.set('supplyId', filters.supplyId);
  if (filters?.categoryId) params.set('categoryId', filters.categoryId);
  if (filters?.supplier) params.set('supplier', filters.supplier);
  const queryString = params.toString();

  return useQuery({
    queryKey: ['all-purchases', farmId, filters],
    queryFn: () =>
      fetchApi<SupplyPurchaseWithSupply[]>(
        `/api/v1/farms/${farmId}/purchases${queryString ? `?${queryString}` : ''}`
      ),
    enabled: !!farmId,
  });
}

// Get purchases for a specific supply
export function useSupplyPurchases(farmId: string | null, supplyId: string | undefined) {
  return useQuery({
    queryKey: ['supply-purchases', farmId, supplyId],
    queryFn: () => fetchApi<SupplyPurchase[]>(`/api/v1/farms/${farmId}/supplies/${supplyId}/purchases`),
    enabled: !!farmId && !!supplyId,
  });
}

export function useCreateSupplyPurchase(farmId: string, supplyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSupplyPurchase) =>
      fetchApi<SupplyPurchase>(`/api/v1/farms/${farmId}/supplies/${supplyId}/purchases`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-purchases', farmId, supplyId] });
      queryClient.invalidateQueries({ queryKey: ['all-purchases', farmId] });
      queryClient.invalidateQueries({ queryKey: ['supplies', farmId] });
    },
  });
}

export function useUpdateSupplyPurchase(farmId: string, supplyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplyPurchase }) =>
      fetchApi<SupplyPurchase>(`/api/v1/farms/${farmId}/supplies/${supplyId}/purchases/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-purchases', farmId, supplyId] });
      queryClient.invalidateQueries({ queryKey: ['supplies', farmId] });
    },
  });
}

export function useDeleteSupplyPurchase(farmId: string, supplyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<{ success: boolean }>(`/api/v1/farms/${farmId}/supplies/${supplyId}/purchases/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-purchases', farmId, supplyId] });
      queryClient.invalidateQueries({ queryKey: ['all-purchases', farmId] });
      queryClient.invalidateQueries({ queryKey: ['supplies', farmId] });
    },
  });
}

// Supply Usage
export function useSupplyUsage(farmId: string | null, supplyId: string | undefined) {
  return useQuery({
    queryKey: ['supply-usage', farmId, supplyId],
    queryFn: () => fetchApi<SupplyUsage[]>(`/api/v1/farms/${farmId}/supplies/${supplyId}/usage`),
    enabled: !!farmId && !!supplyId,
  });
}

export function useCreateSupplyUsage(farmId: string, supplyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSupplyUsage) =>
      fetchApi<SupplyUsage>(`/api/v1/farms/${farmId}/supplies/${supplyId}/usage`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-usage', farmId, supplyId] });
      queryClient.invalidateQueries({ queryKey: ['supplies', farmId] });
    },
  });
}

// Inventory Check
export interface InventoryCheckResponse {
  supply: SupplyWithRelations;
  adjustment: {
    previousStock: number;
    newStock: number;
    difference: number;
  };
  usageRecord: SupplyUsage;
}

export function useInventoryCheck(farmId: string, supplyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InventoryCheck) =>
      fetchApi<InventoryCheckResponse>(`/api/v1/farms/${farmId}/supplies/${supplyId}/inventory-check`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplies', farmId] });
      queryClient.invalidateQueries({ queryKey: ['supply-usage', farmId, supplyId] });
      queryClient.invalidateQueries({ queryKey: ['all-purchases', farmId] });
    },
  });
}

// Recalculate inventory for all supplies (fixes stock levels based on actual records)
interface RecalculateInventoryResult {
  id: string;
  name: string;
  previousStock: number;
  newStock: number;
  totalPurchased: number;
  totalUsed: number;
  unit: string | null;
}

interface RecalculateInventoryResponse {
  message: string;
  results: RecalculateInventoryResult[];
}

export function useRecalculateInventory(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      fetchApi<RecalculateInventoryResponse>(`/api/v1/farms/${farmId}/supplies/recalculate-inventory`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplies', farmId] });
      queryClient.invalidateQueries({ queryKey: ['all-purchases', farmId] });
    },
  });
}

// Supply Lot Numbers
export function useSupplyLots(farmId: string | null, supplyId: string | undefined) {
  return useQuery({
    queryKey: ['supply-lots', farmId, supplyId],
    queryFn: () => fetchApi<SupplyPurchaseLot[]>(`/api/v1/farms/${farmId}/supplies/${supplyId}/lots`),
    enabled: !!farmId && !!supplyId,
  });
}

// Product Seed Supply - for SeedLotSelector
export interface SeedLotWithRemaining {
  id: string;
  lotNumber: string | null;
  quantity: number;
  remainingQuantity: number;
  unit: string | null;
  purchaseDate: string | null;
  expiryDate: string | null;
  supplier: string | null;
}

export interface ProductSeedSupplyResponse {
  supply: {
    id: string;
    name: string;
    currentStock: number;
    unit: string | null;
    category: { id: string; name: string };
  } | null;
  lots: SeedLotWithRemaining[];
}

export function useProductSeedSupply(farmId: string | null, productId: string | undefined) {
  return useQuery({
    queryKey: ['product-seed-supply', farmId, productId],
    queryFn: () => fetchApi<ProductSeedSupplyResponse>(`/api/v1/farms/${farmId}/products/${productId}/seed-supply`),
    enabled: !!farmId && !!productId,
  });
}
