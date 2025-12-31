/**
 * Microgreen Production Calculator
 *
 * Calculates tray requirements and backward-schedules production dates
 * from a target harvest date.
 */

export interface ProductionParams {
  quantityOz: number;
  avgYieldPerTray: number; // oz per tray
  overagePercent: number; // e.g., 10 for 10%
  harvestDate: Date;
  daysSoaking: number | null | undefined; // null/0 means no soaking needed
  daysGermination: number;
  daysLight: number;
}

export interface ProductionSchedule {
  traysNeeded: number;
  totalQuantityOz: number; // quantity with overage
  requiresSoaking: boolean; // whether this variety needs soaking
  soakDate: Date; // same as seedDate if no soaking
  seedDate: Date;
  moveToLightDate: Date;
  harvestDate: Date;
  totalGrowthDays: number;
}

/**
 * Calculate the number of trays needed for an order
 */
export function calculateTraysNeeded(
  quantityOz: number,
  avgYieldPerTray: number,
  overagePercent: number
): number {
  if (avgYieldPerTray <= 0) {
    throw new Error('Average yield per tray must be positive');
  }

  const totalQuantityNeeded = quantityOz * (1 + overagePercent / 100);
  return Math.ceil(totalQuantityNeeded / avgYieldPerTray);
}

/**
 * Calculate all production dates by working backwards from harvest date
 */
export function calculateProductionSchedule(
  params: ProductionParams
): ProductionSchedule {
  const {
    quantityOz,
    avgYieldPerTray,
    overagePercent,
    harvestDate,
    daysSoaking,
    daysGermination,
    daysLight,
  } = params;

  const traysNeeded = calculateTraysNeeded(
    quantityOz,
    avgYieldPerTray,
    overagePercent
  );
  const totalQuantityOz = quantityOz * (1 + overagePercent / 100);

  // Soaking is optional - treat null/undefined/0 as no soaking
  const requiresSoaking = daysSoaking != null && daysSoaking > 0;
  const effectiveSoakDays = requiresSoaking ? daysSoaking : 0;
  const totalGrowthDays = effectiveSoakDays + daysGermination + daysLight;

  // Work backwards from harvest date
  const harvest = new Date(harvestDate);
  harvest.setHours(0, 0, 0, 0); // Normalize to start of day

  const moveToLightDate = new Date(harvest);
  moveToLightDate.setDate(moveToLightDate.getDate() - daysLight);

  const seedDate = new Date(moveToLightDate);
  seedDate.setDate(seedDate.getDate() - daysGermination);

  // If no soaking, soakDate equals seedDate (no separate step)
  const soakDate = new Date(seedDate);
  if (requiresSoaking) {
    soakDate.setDate(soakDate.getDate() - effectiveSoakDays);
  }

  return {
    traysNeeded,
    totalQuantityOz,
    requiresSoaking,
    soakDate,
    seedDate,
    moveToLightDate,
    harvestDate: harvest,
    totalGrowthDays,
  };
}

/**
 * Generate order number in format ORD-YYYY-NNN
 */
export function generateOrderNumber(sequence: number): string {
  const year = new Date().getFullYear();
  const seq = String(sequence).padStart(3, '0');
  return `ORD-${year}-${seq}`;
}

/**
 * Validate that a product has all required microgreen production fields
 * Note: daysSoaking is optional - some seeds don't need soaking
 */
export function validateMicrogreenProduct(product: {
  daysSoaking?: number | null;
  daysGermination?: number | null;
  daysLight?: number | null;
  avgYieldPerTray?: number | null;
}): {
  valid: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  // daysSoaking is optional - some seeds don't need soaking
  if (product.daysGermination == null) missing.push('Days Germination');
  if (product.daysLight == null) missing.push('Days Light');
  if (product.avgYieldPerTray == null) missing.push('Avg Yield per Tray');

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get a human-readable status label for order item status
 */
export function getOrderItemStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Pending',
    SOAKING: 'Soaking',
    GERMINATING: 'Germinating',
    GROWING: 'Growing',
    HARVESTED: 'Harvested',
    CANCELLED: 'Cancelled',
  };
  return labels[status] || status;
}

/**
 * Get a human-readable status label for order status
 */
export function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Pending',
    IN_PROGRESS: 'In Progress',
    READY: 'Ready',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
  };
  return labels[status] || status;
}

/**
 * Format a date as a short string (e.g., "Jan 15")
 */
export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

/**
 * Calculate days until a date
 */
export function daysUntil(date: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
