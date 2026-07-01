import {
  apiMultipartRequest,
  apiRequest,
  getAiApiUrl,
  getInspectApiUrl,
  getRecognitionLogsApiUrl,
} from '@/services/apiClient';
import { resolveRemoteImageUri } from '@/utils/imageUri';
import { sanitizeTileDisplayLabel } from '@/utils/tileLabels';
import type {
  AiModelStatus,
  DetectedTileSummary,
  RecognitionLog,
  RecommendedTileMatch,
  TileInspectResponse,
  TileProduct,
  TileRecognitionResult,
  TopRecommendation,
  YoloDetectionResult,
} from '@/types';

export interface RecognizeTileOptions {
  saveLog?: boolean;
}

export async function fetchAiModelStatus(): Promise<AiModelStatus> {
  const result = await apiRequest<{
    success: boolean;
    model?: AiModelStatus;
  } & Partial<AiModelStatus>>(getAiApiUrl('/model'), {
    auth: true,
  });

  const status = result.model ?? result;

  return {
    configured: status.configured ?? true,
    provider: status.provider ?? 'yolov8-classification',
    modelPath: status.modelPath ?? '',
    modelLoaded: status.modelLoaded ?? false,
    modelExists: status.modelExists === true,
    classCount: status.classCount ?? 0,
    classNames: status.classNames ?? [],
    recognitionLogsDir: status.recognitionLogsDir ?? '',
    message: status.message,
    modelNeedsRetrain: status.modelNeedsRetrain,
  };
}

interface RecognizeApiResponse {
  success: boolean;
  detection?: YoloDetectionResult;
  recognition: TileRecognitionResult;
  alternatives: TileProduct[];
  log: RecognitionLog | null;
}

function mergeDetection(
  recognition: TileRecognitionResult,
  detection?: YoloDetectionResult,
  alternatives: TileProduct[] = [],
): TileRecognitionResult {
  if (!detection) {
    return { ...recognition, recommendations: alternatives };
  }

  const inventoryMatched =
    detection.inventory_matched ?? Boolean(detection.inventory_id);

  return {
    ...recognition,
    detectedClass: sanitizeTileDisplayLabel(
      detection.detected_class ?? recognition.detectedClass ?? detection.tile_name,
    ),
    productImage:
      recognition.productImage ??
      recognition.matchedTile?.imageUri ??
      undefined,
    recognizedName: recognition.recognizedName,
    tileType: detection.tile_type || recognition.tileType,
    confidenceScore: detection.confidence ?? recognition.confidenceScore,
    availableStock: detection.stock_quantity ?? recognition.availableStock,
    warehouseLocation: detection.warehouse_location,
    reorderLevel: detection.reorder_level,
    lowStock: detection.low_stock,
    stockStatus: detection.stock_status ?? recognition.stockStatus,
    annotatedImage: detection.annotated_image,
    boxes: detection.boxes,
    imageSize: detection.image_size ?? recognition.imageSize,
    inventoryMatched,
    modelNeedsRetrain: recognition.modelNeedsRetrain,
    recommendations: detection.recommendations?.length ? detection.recommendations : alternatives,
  };
}

interface InspectApiTile {
  tile_id: string;
  predicted_type: string;
  confidence: number;
  color: string;
  pattern: string;
  surface_finish: string;
  size_category: string;
  width_mm?: number;
  height_mm?: number;
  dimension_status: string;
  status: string;
  bounding_box_label?: string;
  sku_id?: string;
  inventory_id?: string;
}

interface InspectApiRecommendation {
  sku_id: string;
  tile_id?: string;
  tile_name: string;
  tile_type: string;
  match_percentage: number;
  image_url?: string;
  material?: string;
  surface_finish?: string;
  size_category?: string;
}

interface InspectApiResponse {
  success: boolean;
  image_url?: string;
  annotated_image_url?: string;
  detected_tiles: InspectApiTile[];
  recommended_tiles: InspectApiRecommendation[];
  top_recommendations: Array<{
    rank: number;
    sku_id: string;
    tile_name: string;
    match_percentage: number;
    tile_id?: string;
  }>;
  message: string;
  boxes?: TileInspectResponse['boxes'];
  image_size?: TileInspectResponse['imageSize'];
  log?: RecognitionLog | null;
}

function mapDetectedTile(tile: InspectApiTile): DetectedTileSummary {
  return {
    tileId: tile.tile_id,
    predictedType: sanitizeTileDisplayLabel(tile.predicted_type),
    confidence: tile.confidence,
    color: tile.color,
    pattern: tile.pattern,
    surfaceFinish: tile.surface_finish,
    sizeCategory: tile.size_category,
    widthMm: tile.width_mm,
    heightMm: tile.height_mm,
    dimensionStatus: tile.dimension_status,
    status: tile.status,
    boundingBoxLabel: tile.bounding_box_label,
    skuId: tile.sku_id,
    inventoryId: tile.inventory_id,
  };
}

function mapRecommendedTile(tile: InspectApiRecommendation): RecommendedTileMatch {
  return {
    skuId: tile.sku_id,
    tileId: tile.tile_id,
    tileName: tile.tile_name,
    tileType: tile.tile_type,
    matchPercentage: tile.match_percentage,
    imageUrl: resolveRemoteImageUri(tile.image_url),
    material: tile.material,
    surfaceFinish: tile.surface_finish,
    sizeCategory: tile.size_category,
  };
}

function mapTopRecommendation(item: InspectApiResponse['top_recommendations'][number]): TopRecommendation {
  return {
    rank: item.rank,
    skuId: item.sku_id,
    tileName: item.tile_name,
    matchPercentage: item.match_percentage,
    tileId: item.tile_id,
  };
}

export function inspectToRecognitionResult(inspect: TileInspectResponse): TileRecognitionResult {
  const primary = inspect.detectedTiles[0];
  const topMatch = inspect.recommendedTiles[0];

  return {
    recognizedName: topMatch?.tileName ?? primary?.predictedType ?? 'Ceramic Tile',
    detectedClass: primary?.predictedType,
    predictedCategory: primary?.predictedType,
    tileType: primary?.predictedType ?? topMatch?.tileType ?? 'Ceramic',
    confidenceScore: primary?.confidence ?? 0,
    imageSize: inspect.imageSize,
    matchedTile: null,
    availableStock: 0,
    stockStatus: primary?.status ?? 'Unknown',
    annotatedImage: inspect.annotatedImageUrl,
    boxes: inspect.boxes,
    inventoryMatched: Boolean(primary?.inventoryId),
    recommendations: [],
  };
}

export async function inspectTileImage(
  imageUri: string,
  options: RecognizeTileOptions = {},
): Promise<{
  inspect: TileInspectResponse;
  recognition: TileRecognitionResult;
  log: RecognitionLog | null;
}> {
  const saveLog = options.saveLog !== false;
  const endpoint = saveLog
    ? getInspectApiUrl()
    : `${getInspectApiUrl()}?saveLog=false`;

  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    name: 'tile.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  const result = await apiMultipartRequest<InspectApiResponse>(endpoint, {
    method: 'POST',
    body: formData,
    auth: true,
  });

  const inspect: TileInspectResponse = {
    imageUrl: resolveRemoteImageUri(result.image_url),
    annotatedImageUrl: resolveRemoteImageUri(result.annotated_image_url ?? result.image_url),
    detectedTiles: (result.detected_tiles ?? []).map(mapDetectedTile),
    recommendedTiles: (result.recommended_tiles ?? []).map(mapRecommendedTile),
    topRecommendations: (result.top_recommendations ?? []).map(mapTopRecommendation),
    message: result.message,
    boxes: result.boxes,
    imageSize: result.image_size,
    logId: result.log?.id,
  };

  return {
    inspect,
    recognition: inspectToRecognitionResult(inspect),
    log: result.log ?? null,
  };
}

export async function recognizeTileImage(
  imageUri: string,
  options: RecognizeTileOptions = {},
): Promise<{
  detection: YoloDetectionResult | null;
  recognition: TileRecognitionResult;
  alternatives: TileProduct[];
  log: RecognitionLog | null;
}> {
  const saveLog = options.saveLog !== false;
  const endpoint = saveLog
    ? getAiApiUrl('/recognize')
    : `${getAiApiUrl('/recognize')}?saveLog=false`;

  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    name: 'tile.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  const result = await apiMultipartRequest<RecognizeApiResponse>(endpoint, {
    method: 'POST',
    body: formData,
    auth: true,
  });

  const alternatives = result.detection?.recommendations ?? result.alternatives ?? [];
  const recognition = mergeDetection(
    {
      ...result.recognition,
      logId: result.log?.id,
    },
    result.detection,
    alternatives,
  );

  return {
    detection: result.detection ?? null,
    recognition,
    alternatives,
    log: result.log,
  };
}

export async function fetchRecognitionLogs(limit = 100): Promise<RecognitionLog[]> {
  const result = await apiRequest<{ success: boolean; logs: RecognitionLog[] }>(
    `${getRecognitionLogsApiUrl('')}?limit=${limit}`,
    { auth: true },
  );
  return result.logs.map((log) => ({
    ...log,
    imageUri: resolveRemoteImageUri(log.imageUri),
  }));
}
