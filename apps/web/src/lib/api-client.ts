import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Farm, CreateFarm, UpdateFarm,
  Zone, CreateZone, UpdateZone,
  Product, CreateProduct,
  Employee, CreateEmployee,
  ApiResponse, PaginatedResponse
} from '@farm/shared';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Generic fetch wrapper
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
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
// PRODUCTS
// ============================================================================

export function useProducts(farmId: string | undefined) {
  return useQuery({
    queryKey: ['farms', farmId, 'products'],
    queryFn: () => fetchApi<Product[]>(`/api/v1/farms/${farmId}/products`),
    enabled: !!farmId,
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
