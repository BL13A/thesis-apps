/** Thesis-aligned operational parameters (TileVision Ch. 1.7–1.8). */
export const BUSINESS_RULES = {
  AI_CONFIDENCE_THRESHOLD: 0.85,
  SIZE_TOLERANCE_PERCENT: 5,
  SUPPLIER_DEFECT_ALERT_PERCENT: 10,
  SAFETY_STOCK_PERCENT: 20,
  SUPPLIER_LEAD_TIME_DAYS: { min: 14, max: 21 },
} as const;

export function formatConfidenceThreshold(): string {
  return `${Math.round(BUSINESS_RULES.AI_CONFIDENCE_THRESHOLD * 100)}%`;
}

export function formatSizeTolerance(): string {
  return `±${BUSINESS_RULES.SIZE_TOLERANCE_PERCENT}%`;
}
