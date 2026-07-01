import type { BatchDetails, InspectionRecord, TileAnalysisResult } from '@/types';
import {
  apiMultipartRequest,
  apiRequest,
  getAiApiUrl,
  getInspectionsApiUrl,
} from '@/services/apiClient';

interface InspectionsListResponse {
  success: boolean;
  inspections?: InspectionRecord[];
  error?: string;
}

interface InspectionResponse {
  success: boolean;
  inspection?: InspectionRecord;
  error?: string;
}

interface AnalyzeTileResponse extends TileAnalysisResult {
  success: boolean;
  error?: string;
}

export interface BatchSummary {
  batchId: string;
  supplierName: string;
  tileType: string;
  tileSize: string;
  quantity: string;
  latestDate: string;
  inspectionCount: number;
}

function appendImageToFormData(formData: FormData, imageUri: string): void {
  formData.append('image', {
    uri: imageUri,
    name: 'tile.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);
}

export async function fetchInspections(): Promise<InspectionRecord[]> {
  const result = await apiRequest<InspectionsListResponse>(getInspectionsApiUrl(), {
    auth: true,
  });

  if (!result.success || !result.inspections) {
    throw new Error(result.error ?? 'Unable to load inspections.');
  }

  return result.inspections;
}

export function extractBatchSummaries(inspections: InspectionRecord[]): BatchSummary[] {
  const batches = new Map<string, BatchSummary>();

  for (const inspection of inspections) {
    const existing = batches.get(inspection.batchId);
    if (!existing) {
      batches.set(inspection.batchId, {
        batchId: inspection.batchId,
        supplierName: inspection.supplierName,
        tileType: inspection.tileType,
        tileSize: inspection.tileSize,
        quantity: inspection.quantity,
        latestDate: inspection.date,
        inspectionCount: 1,
      });
      continue;
    }

    existing.inspectionCount += 1;
    if (new Date(inspection.date).getTime() > new Date(existing.latestDate).getTime()) {
      existing.latestDate = inspection.date;
      existing.supplierName = inspection.supplierName;
      existing.tileType = inspection.tileType;
      existing.tileSize = inspection.tileSize;
      existing.quantity = inspection.quantity;
    }
  }

  return Array.from(batches.values()).sort(
    (a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime(),
  );
}

export async function createInspection(
  batch: BatchDetails,
  analysis: TileAnalysisResult['inspectionResult'],
  imageUri: string,
  user: { id: string; name: string },
): Promise<InspectionRecord> {
  const formData = new FormData();
  appendImageToFormData(formData, imageUri);

  formData.append('batchId', batch.batchId);
  formData.append('supplierName', batch.supplierName);
  formData.append('tileType', batch.tileType);
  formData.append('tileSize', batch.tileSize);
  formData.append('quantity', batch.quantity);
  formData.append('expectedDimension', batch.expectedDimension);
  formData.append('result', analysis.result);
  formData.append('defectType', analysis.defectType);
  formData.append('confidenceScore', String(analysis.confidenceScore));
  formData.append('sizeValidation', analysis.sizeValidation);
  formData.append('inventoryStatus', analysis.inventoryStatus);
  formData.append('inspectedBy', user.id);
  formData.append('inspectedByName', user.name);
  formData.append('qaStatus', analysis.result === 'Manual' ? 'Pending' : 'None');
  formData.append('date', new Date().toISOString());

  const result = await apiMultipartRequest<InspectionResponse>(getInspectionsApiUrl(), {
    method: 'POST',
    auth: true,
    body: formData,
  });

  if (!result.success || !result.inspection) {
    throw new Error(result.error ?? 'Unable to save inspection.');
  }

  return result.inspection;
}

export async function analyzeTileImage(
  imageUri: string,
  expectedDimension: string,
): Promise<TileAnalysisResult> {
  const formData = new FormData();
  appendImageToFormData(formData, imageUri);
  formData.append('expectedDimension', expectedDimension);
  formData.append('mimeType', 'image/jpeg');

  const result = await apiMultipartRequest<AnalyzeTileResponse>(getAiApiUrl('/analyze-tile'), {
    method: 'POST',
    auth: true,
    body: formData,
  });

  if (!result.success || !result.inspectionResult) {
    throw new Error(result.error ?? 'AI inspection failed.');
  }

  return {
    inspectionResult: result.inspectionResult,
    overlay: result.overlay ?? {
      imageWidth: 1,
      imageHeight: 1,
      defects: [],
      tileOutline: null,
    },
    sizeAnalysis: result.sizeAnalysis ?? {
      sizeValidation: result.inspectionResult.sizeValidation,
      tolerancePercent: 5,
    },
    predictions: result.predictions ?? [],
    provider: result.provider,
  };
}
