const DEFECT_LABELS = new Set([
  'intact',
  'defect',
  'defective',
  'damaged',
  'broken',
  'cracked',
  'crack',
  'chip',
  'reject',
]);

const TILE_TYPE_LABELS: Record<string, string> = {
  ceramictile: 'Ceramic',
  ceramic: 'Ceramic',
  decor: 'Decor',
  decorativetile: 'Decor',
  glazedpolishedporcelain: 'Glazed Polished Porcelain',
  glazedpolished: 'Glazed Polished Porcelain',
  porcelain: 'Porcelain',
  porcelaintile: 'Porcelain',
};

const DISPLAY_TILE_TYPES = new Set([
  'Ceramic',
  'Decor',
  'Glazed Polished Porcelain',
  'Porcelain',
]);

function normalizeLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function sanitizeTileDisplayLabel(label?: string | null): string {
  if (!label?.trim()) {
    return 'Ceramic';
  }

  const trimmed = label.trim();
  if (DISPLAY_TILE_TYPES.has(trimmed)) {
    return trimmed;
  }

  const normalized = normalizeLabel(trimmed);
  if (DEFECT_LABELS.has(normalized)) {
    return 'Ceramic';
  }
  if (
    normalized.includes('defect') ||
    normalized.includes('crack') ||
    normalized.includes('damage')
  ) {
    return 'Ceramic';
  }

  if (TILE_TYPE_LABELS[normalized]) {
    return TILE_TYPE_LABELS[normalized];
  }

  if (trimmed.toLowerCase().endsWith(' tile')) {
    return trimmed
      .slice(0, -5)
      .split(/[_\s]+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  if (trimmed.includes('_')) {
    return trimmed
      .split(/[_\s]+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  return trimmed;
}
