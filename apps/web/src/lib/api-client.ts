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
  ApiResponse, PaginatedResponse
} from '@farm/shared';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Generic fetch wrapper
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  // Only set Content-Type for requests with a body
  const headers: HeadersInit = {
    ...options?.headers,
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

interface TaskWithRelations extends Task {
  orderItem?: {
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
