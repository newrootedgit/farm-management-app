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

// ============================================================================
// RECURRING ORDER CALCULATIONS
// ============================================================================

export interface RecurringScheduleParams {
  scheduleType: 'FIXED_DAY' | 'INTERVAL';
  daysOfWeek?: number[];   // For FIXED_DAY: 0=Sun, 1=Mon, etc.
  intervalDays?: number;    // For INTERVAL: e.g., 7 for weekly
  startDate: Date;
  endDate?: Date | null;
  leadTimeDays: number;     // How far ahead to generate (default 28)
}

/**
 * Calculate upcoming harvest dates for a recurring schedule.
 * Used to determine when to generate new orders.
 */
export function calculateRecurringHarvestDates(
  schedule: RecurringScheduleParams,
  skippedDates: Date[] = [],
  fromDate?: Date
): Date[] {
  const dates: Date[] = [];
  const today = fromDate ? new Date(fromDate) : new Date();
  today.setHours(0, 0, 0, 0);

  const endLimit = new Date(today);
  endLimit.setDate(endLimit.getDate() + schedule.leadTimeDays);

  const scheduleEnd = schedule.endDate
    ? new Date(Math.min(new Date(schedule.endDate).getTime(), endLimit.getTime()))
    : endLimit;

  const skippedSet = new Set(
    skippedDates.map((d) => {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    })
  );

  const scheduleStart = new Date(schedule.startDate);
  scheduleStart.setHours(0, 0, 0, 0);

  if (schedule.scheduleType === 'FIXED_DAY' && schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
    // Find all matching days of week within the range
    let current = new Date(Math.max(scheduleStart.getTime(), today.getTime()));

    while (current <= scheduleEnd) {
      if (schedule.daysOfWeek.includes(current.getDay())) {
        const dateKey = current.getTime();
        if (!skippedSet.has(dateKey)) {
          dates.push(new Date(current));
        }
      }
      current.setDate(current.getDate() + 1);
    }
  } else if (schedule.scheduleType === 'INTERVAL' && schedule.intervalDays && schedule.intervalDays > 0) {
    // Start from startDate, advance by interval
    let current = new Date(scheduleStart);

    // Fast-forward to today if needed
    while (current < today) {
      current.setDate(current.getDate() + schedule.intervalDays);
    }

    while (current <= scheduleEnd) {
      const dateKey = current.getTime();
      if (!skippedSet.has(dateKey)) {
        dates.push(new Date(current));
      }
      current.setDate(current.getDate() + schedule.intervalDays);
    }
  }

  return dates;
}

/**
 * Get the next scheduled harvest date
 */
export function getNextRecurringDate(
  schedule: RecurringScheduleParams,
  skippedDates: Date[] = []
): Date | null {
  const dates = calculateRecurringHarvestDates(schedule, skippedDates);
  return dates.length > 0 ? dates[0] : null;
}

/**
 * Get day name from day number
 */
export function getDayName(dayNumber: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNumber] || '';
}

/**
 * Get short day name from day number
 */
export function getShortDayName(dayNumber: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayNumber] || '';
}

// ============================================================================
// BLEND PRODUCTION CALCULATIONS (STAGGERED STARTS)
// ============================================================================

export interface BlendIngredientParams {
  productId: string;
  productName: string;
  ratioPercent: number;
  avgYieldPerTray: number;
  daysSoaking: number | null;
  daysGermination: number;
  daysLight: number;
}

export interface BlendProductionSchedule {
  blendHarvestDate: Date;
  totalQuantityOz: number;
  earliestStartDate: Date;
  ingredients: Array<{
    productId: string;
    productName: string;
    ratioPercent: number;
    targetOz: number;
    traysNeeded: number;
    requiresSoaking: boolean;
    soakDate: Date;
    seedDate: Date;
    moveToLightDate: Date;
    harvestDate: Date;
    totalGrowthDays: number;
  }>;
}

/**
 * Calculate production schedule for a blend with STAGGERED STARTS.
 * Each ingredient is scheduled independently so all finish on the same harvest date.
 * Slower-growing ingredients start earlier.
 */
export function calculateBlendProductionSchedule(params: {
  quantityOz: number;
  overagePercent: number;
  harvestDate: Date;
  ingredients: BlendIngredientParams[];
}): BlendProductionSchedule {
  const { quantityOz, overagePercent, harvestDate, ingredients } = params;

  const totalWithOverage = quantityOz * (1 + overagePercent / 100);
  const harvest = new Date(harvestDate);
  harvest.setHours(0, 0, 0, 0);

  let earliestStart = harvest;

  const ingredientSchedules = ingredients.map((ingredient) => {
    // Calculate this ingredient's portion based on ratio
    const targetOz = totalWithOverage * (ingredient.ratioPercent / 100);
    const traysNeeded = Math.ceil(targetOz / ingredient.avgYieldPerTray);

    // Calculate staggered dates - all finish on same harvest date
    const requiresSoaking = ingredient.daysSoaking != null && ingredient.daysSoaking > 0;
    const effectiveSoakDays = requiresSoaking ? ingredient.daysSoaking! : 0;
    const totalGrowthDays = effectiveSoakDays + ingredient.daysGermination + ingredient.daysLight;

    // Work backwards from harvest
    const moveToLightDate = new Date(harvest);
    moveToLightDate.setDate(moveToLightDate.getDate() - ingredient.daysLight);

    const seedDate = new Date(moveToLightDate);
    seedDate.setDate(seedDate.getDate() - ingredient.daysGermination);

    const soakDate = new Date(seedDate);
    if (requiresSoaking) {
      soakDate.setDate(soakDate.getDate() - effectiveSoakDays);
    }

    // Track earliest start date across all ingredients
    const startDate = requiresSoaking ? soakDate : seedDate;
    if (startDate < earliestStart) {
      earliestStart = new Date(startDate);
    }

    return {
      productId: ingredient.productId,
      productName: ingredient.productName,
      ratioPercent: ingredient.ratioPercent,
      targetOz,
      traysNeeded,
      requiresSoaking,
      soakDate,
      seedDate,
      moveToLightDate,
      harvestDate: new Date(harvest),
      totalGrowthDays,
    };
  });

  return {
    blendHarvestDate: harvest,
    totalQuantityOz: totalWithOverage,
    ingredients: ingredientSchedules,
    earliestStartDate: earliestStart,
  };
}

/**
 * Get the longest growth time from blend ingredients.
 * Useful for planning and displaying blend info.
 */
export function getBlendMaxGrowthDays(ingredients: BlendIngredientParams[]): number {
  return ingredients.reduce((max, ing) => {
    const soakDays = ing.daysSoaking ?? 0;
    const totalDays = soakDays + ing.daysGermination + ing.daysLight;
    return Math.max(max, totalDays);
  }, 0);
}
