import { BUSINESS_RULES } from '@/constants/businessRules';
import type {
  InspectionResultType,
  InventoryStatus,
  QAStatus,
  SizeValidation,
} from '@/types';

const PASS_VALUES = new Set([
  'Passed',
  'PASS',
  'Pass',
  'Available',
  'Available for Sale',
  'Matched',
  'Approved',
]);

const REJECT_VALUES = new Set([
  'Rejected',
  'REJECT',
  'Reject',
  'Blocked',
  'Block',
  'Inventory Block',
  'Size Out of Specification',
]);

const PENDING_VALUES = new Set([
  'Pending',
  'Manual',
  'MANUAL',
  'MANUAL REVIEW',
  'Manual Review',
  'For Manual Review',
  'Pending Review',
]);

export type StatusTone = 'passed' | 'rejected' | 'pending' | 'neutral';

export function getStatusTone(value: string): StatusTone {
  if (value === 'In Stock' || value === 'Delivered') return 'passed';
  if (value === 'Out of Stock' || value === 'Cancelled') return 'rejected';
  if (
    value === 'Low Stock' ||
    value === 'Pending' ||
    value === 'Scheduled' ||
    value === 'Out for Delivery'
  ) {
    return 'pending';
  }
  if (PASS_VALUES.has(value) || value === 'Active') return 'passed';
  if (
    REJECT_VALUES.has(value) ||
    value === 'Inactive' ||
    value === 'Suspended' ||
    value === 'Invalid'
  ) {
    return 'rejected';
  }
  if (PENDING_VALUES.has(value)) return 'pending';
  return 'neutral';
}

export function normalizeInspectionResult(value: string): InspectionResultType {
  if (PASS_VALUES.has(value)) return 'Passed';
  if (REJECT_VALUES.has(value)) return 'Rejected';
  if (PENDING_VALUES.has(value)) return 'Manual';
  return 'Manual';
}

export function normalizeInventoryStatus(value: string): InventoryStatus {
  if (PASS_VALUES.has(value)) return 'Available';
  if (REJECT_VALUES.has(value)) return 'Rejected';
  if (PENDING_VALUES.has(value)) return 'Pending';
  return 'Pending';
}

export function normalizeQAStatus(value: string): QAStatus {
  if (value === 'None') return 'None';
  if (PASS_VALUES.has(value)) return 'Passed';
  if (REJECT_VALUES.has(value)) return 'Rejected';
  if (PENDING_VALUES.has(value)) return 'Pending';
  return 'None';
}

const INVENTORY_DISPLAY_LABELS: Record<InventoryStatus, string> = {
  Available: 'Available for Sale',
  Rejected: 'Inventory Block',
  Pending: 'Pending',
};

export function getInventoryStatusLabel(status: InventoryStatus | string): string {
  if (status in INVENTORY_DISPLAY_LABELS) {
    return INVENTORY_DISPLAY_LABELS[status as InventoryStatus];
  }
  return status;
}

export function getSizeValidationLabel(status: SizeValidation | string): string {
  if (status === 'Invalid') return 'Size Out of Specification';
  return status;
}

export function getInspectionClassificationNote(
  result: InspectionResultType,
  confidenceScore: number,
  sizeValidation: SizeValidation,
): string {
  if (sizeValidation === 'Invalid') {
    return 'Size Out of Specification — assigned Inventory Block per dimensional validation rule.';
  }
  if (result === 'Manual') {
    return `AI confidence below ${Math.round(BUSINESS_RULES.AI_CONFIDENCE_THRESHOLD * 100)}% — flagged for manual QA verification.`;
  }
  if (result === 'Rejected') {
    return 'Classified as Defective — assigned Inventory Block per defect detection rule.';
  }
  if (result === 'Passed') {
    return 'No defects detected within tolerance — status Available for Sale.';
  }
  if (confidenceScore < 0.85) {
    return 'Below confidence threshold — pending QA verification.';
  }
  return '';
}
