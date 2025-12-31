import type { UnitSystem } from '@farm/shared';

// ============================================================================
// CONVERSION CONSTANTS
// ============================================================================

// Base unit is centimeters (cm)
const CM_PER_FOOT = 30.48;
const CM_PER_METER = 100;

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert a value from the user's unit system to the base unit (cm)
 */
export function toBaseUnit(value: number, unit: UnitSystem): number {
  switch (unit) {
    case 'FEET':
      return value * CM_PER_FOOT;
    case 'METERS':
      return value * CM_PER_METER;
    default:
      return value;
  }
}

/**
 * Convert a value from base unit (cm) to the user's unit system
 */
export function fromBaseUnit(cm: number, unit: UnitSystem): number {
  switch (unit) {
    case 'FEET':
      return cm / CM_PER_FOOT;
    case 'METERS':
      return cm / CM_PER_METER;
    default:
      return cm;
  }
}

/**
 * Format a value (in cm) with the user's preferred unit
 */
export function formatWithUnit(cm: number, unit: UnitSystem, decimals: number = 1): string {
  const converted = fromBaseUnit(cm, unit);
  const label = getUnitLabel(unit);
  return `${converted.toFixed(decimals)} ${label}`;
}

/**
 * Get the display label for a unit system
 */
export function getUnitLabel(unit: UnitSystem): string {
  switch (unit) {
    case 'FEET':
      return 'ft';
    case 'METERS':
      return 'm';
    default:
      return 'cm';
  }
}

/**
 * Get the full name of a unit system
 */
export function getUnitName(unit: UnitSystem): string {
  switch (unit) {
    case 'FEET':
      return 'Feet';
    case 'METERS':
      return 'Meters';
    default:
      return 'Centimeters';
  }
}

/**
 * Parse a user input string with optional unit suffix
 * Returns value in base unit (cm)
 */
export function parseWithUnit(input: string, defaultUnit: UnitSystem): number | null {
  const trimmed = input.trim().toLowerCase();

  // Try to extract number and optional unit
  const match = trimmed.match(/^([\d.]+)\s*(ft|feet|m|meters?|cm)?$/);
  if (!match) return null;

  const value = parseFloat(match[1]);
  if (isNaN(value)) return null;

  const unitStr = match[2];

  // Determine unit from suffix or use default
  let unit: UnitSystem = defaultUnit;
  if (unitStr === 'ft' || unitStr === 'feet') {
    unit = 'FEET';
  } else if (unitStr === 'm' || unitStr === 'meter' || unitStr === 'meters') {
    unit = 'METERS';
  } else if (unitStr === 'cm') {
    // Direct cm input, no conversion
    return value;
  }

  return toBaseUnit(value, unit);
}

/**
 * Calculate the length of a line segment in base units (cm)
 */
export function calculateLength(
  startX: number,
  startY: number,
  endX: number,
  endY: number
): number {
  const dx = endX - startX;
  const dy = endY - startY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate the angle of a line segment in degrees (0 = East, 90 = South)
 */
export function calculateAngle(
  startX: number,
  startY: number,
  endX: number,
  endY: number
): number {
  const dx = endX - startX;
  const dy = endY - startY;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/**
 * Calculate endpoint given start point, angle, and length
 */
export function calculateEndpoint(
  startX: number,
  startY: number,
  angleDegrees: number,
  length: number
): { x: number; y: number } {
  const angleRadians = (angleDegrees * Math.PI) / 180;
  return {
    x: startX + length * Math.cos(angleRadians),
    y: startY + length * Math.sin(angleRadians),
  };
}

/**
 * Get angle for cardinal direction
 */
export function getDirectionAngle(direction: 'N' | 'S' | 'E' | 'W'): number {
  switch (direction) {
    case 'N':
      return -90; // Up
    case 'S':
      return 90; // Down
    case 'E':
      return 0; // Right
    case 'W':
      return 180; // Left
  }
}

/**
 * Get the grid size in base units (cm) for a unit system
 * Each grid square represents 1 unit (1 ft or 1 m)
 */
export function getGridSizeForUnit(unit: UnitSystem): number {
  switch (unit) {
    case 'FEET':
      return CM_PER_FOOT; // 1 foot = 30.48 cm
    case 'METERS':
      return CM_PER_METER; // 1 meter = 100 cm
    default:
      return 10; // 10 cm default
  }
}
