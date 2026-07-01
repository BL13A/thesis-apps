import type {
  InspectionRecord,
  InspectionResultType,
  InventoryStatus,
  QAStatus,
  SizeValidation,
  User,
} from '@/types';
import { BUSINESS_RULES } from '@/constants/businessRules';

export function computeInventoryStatus(
  result: InspectionResultType,
  defectType: string,
  confidenceScore: number,
  sizeValidation: SizeValidation,
): InventoryStatus {
  if (sizeValidation === 'Invalid') {
    return 'Rejected';
  }
  if (confidenceScore >= BUSINESS_RULES.AI_CONFIDENCE_THRESHOLD && result === 'Rejected') {
    return 'Rejected';
  }
  if (result === 'Manual') {
    return 'Pending';
  }
  if (result === 'Passed' && defectType === 'None' && sizeValidation === 'Valid') {
    return 'Available';
  }
  if (result === 'Rejected') {
    return 'Rejected';
  }
  return 'Pending';
}

export function computeQAStatus(result: InspectionResultType): QAStatus {
  if (result === 'Manual') return 'Pending';
  return 'None';
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatLastLogin(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  const datePart = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const timePart = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return `${datePart} · ${timePart}`;
}

export function formatConfidence(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export function filterInspectionsForUser(
  inspections: InspectionRecord[],
  user: User,
  viewAll: boolean,
): InspectionRecord[] {
  if (viewAll) return inspections;
  return inspections.filter((i) => String(i.inspectedBy) === String(user.id));
}

export type DateRangeFilter = 'today' | 'yesterday' | 'last30days' | 'all';

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function filterByDateRange<T extends { date: string }>(
  items: T[],
  filter: DateRangeFilter,
  reference = new Date(),
): T[] {
  if (filter === 'all') return items;

  const ref = new Date(reference);

  if (filter === 'last30days') {
    const cutoff = startOfDay(ref);
    cutoff.setDate(cutoff.getDate() - 30);
    return items.filter((item) => new Date(item.date) >= cutoff);
  }

  const compareDate = new Date(ref);
  if (filter === 'yesterday') {
    compareDate.setDate(compareDate.getDate() - 1);
  }

  return items.filter((item) => isSameCalendarDay(new Date(item.date), compareDate));
}
