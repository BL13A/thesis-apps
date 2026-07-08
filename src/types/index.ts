export type UserRole = 'Warehouse Personnel' | 'Quality Assurance Officer';



export type AccountStatus = 'Active' | 'Inactive' | 'Suspended';

export interface NotificationSettings {
  pushEnabled: boolean;
  inspectionUpdates: boolean;
  qaReviews: boolean;
  warehouseAlerts: boolean;
  systemAlerts: boolean;
  emailDigest: boolean;
}

export type NotificationType =
  | 'inspection'
  | 'qa'
  | 'system'
  | 'supplier'
  | 'inventory'
  | 'delivery';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  date: string;
  read: boolean;
  relatedId?: string;
}



export type InspectionResultType = 'Passed' | 'Rejected' | 'Manual';



export type InventoryStatus = 'Available' | 'Rejected' | 'Pending';



export type QAStatus = 'Pending' | 'Passed' | 'Rejected' | 'None';



export type SizeValidation = 'Valid' | 'Invalid';



export type Permission =

  | 'view_home'

  | 'start_inspection'

  | 'submit_inspection'

  | 'capture_images'

  | 'view_own_history'

  | 'view_own_results'

  | 'view_profile'

  | 'view_all_inspections'

  | 'review_manual_cases'

  | 'approve_inspection'

  | 'reject_inspection'

  | 'add_qa_remarks'

  | 'view_defect_summary';



export interface User {

  id: string;

  name: string;

  email: string;

  role: UserRole;

  employeeId: string;

  mobileNumber: string;

  department: string;

  lastLogin: string;

  accountStatus: AccountStatus;

}



export interface BatchDetails {

  batchId: string;

  supplierName: string;

  tileType: string;

  tileSize: string;

  quantity: string;

  expectedDimension: string;

}



export interface InspectionResult {

  result: InspectionResultType;

  defectType: string;

  confidenceScore: number;

  sizeValidation: SizeValidation;

  inventoryStatus: InventoryStatus;

}

export interface DefectOverlayBox {
  left: number;
  top: number;
  width: number;
  height: number;
  class: string;
  label: string;
  confidence: number;
}

export interface TileOutlineOverlay {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface AiAnalysisOverlay {
  imageWidth: number;
  imageHeight: number;
  defects: DefectOverlayBox[];
  tileOutline?: TileOutlineOverlay | null;
}

export interface SizeAnalysis {
  sizeValidation: SizeValidation;
  expectedWidthMm?: number | null;
  expectedHeightMm?: number | null;
  measuredWidthMm?: number | null;
  measuredHeightMm?: number | null;
  widthDeviationPercent?: number | null;
  heightDeviationPercent?: number | null;
  tolerancePercent: number;
  note?: string | null;
}

export interface TileAnalysisResult {
  inspectionResult: InspectionResult;
  overlay: AiAnalysisOverlay;
  sizeAnalysis: SizeAnalysis;
  predictions: Array<{ class: string; confidence: number; label?: string }>;
  provider?: string;
}



export interface InspectionRecord extends BatchDetails {

  id: string;

  date: string;

  imageUri?: string;

  result: InspectionResultType;

  defectType: string;

  confidenceScore: number;

  sizeValidation: SizeValidation;

  inventoryStatus: InventoryStatus;

  inspectedBy: string;

  inspectedByName: string;

  qaStatus: QAStatus;

  qaRemarks?: string;

  reviewedBy?: string;

  reviewedAt?: string;

}



export interface DashboardStats {

  todayInspections: number;

  passed: number;

  rejected: number;

  manualReview: number;

}



export interface QADashboardStats {

  pendingReviews: number;

  defectCasesToday: number;

  approvedCases: number;

  rejectedCases: number;

}

export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';

export type TileProductStatus = 'Active' | 'Inactive';

export interface TileProduct {
  id: string;
  name: string;
  tileType: string;
  size: string;
  color: string;
  finish: string;
  material: string;
  stockQuantity: number;
  lowStockThreshold: number;
  status: TileProductStatus;
  stockStatus?: StockStatus;
  imageUri?: string;
  productImage?: string;
  description?: string;
  sku?: string;
  productCode?: string;
  series?: string;
  warehouseLocation?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type StockTransactionType = 'In' | 'Out';

export interface StockMovement {
  id: string;
  tileId: string;
  transactionType: StockTransactionType;
  quantity: number;
  reason: string;
  transactionDate: string;
  handledBy: string;
  handledByName: string;
  createdAt: string;
}

export interface RecognitionLog {
  id: string;
  imageUri?: string;
  recognizedName: string;
  tileType: string;
  confidenceScore: number;
  matchedTileId?: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export type DeliveryStatus =
  | 'Pending'
  | 'Scheduled'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled';

export interface DeliveryItem {
  id?: string;
  deliveryId?: string;
  tileId: string;
  quantity: number;
  tileName?: string;
  tileType?: string;
  size?: string;
  color?: string;
}

export interface Delivery {
  id: string;
  customerName: string;
  contactNumber: string;
  address: string;
  deliveryDate: string;
  status: DeliveryStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  items: DeliveryItem[];
}

export interface TilePredictionOption {
  category: string;
  confidence: number;
  classId: number;
}

export interface YoloDetectionBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  confidence: number;
  label: string;
}

export interface ImageSize {
  width: number;
  height: number;
}

export interface YoloDetectionResult {
  detected_class?: string;
  tile_name: string;
  tile_type: string;
  confidence: number;
  annotated_image: string;
  inventory_id: string;
  inventory_matched?: boolean;
  stock_quantity: number;
  warehouse_location: string;
  reorder_level: number;
  low_stock: boolean;
  stock_status?: string;
  boxes: YoloDetectionBox[];
  image_size?: ImageSize;
  recommendations: TileProduct[];
}

export interface TileRecognitionResult {
  recognizedName: string;
  detectedClass?: string;
  predictedCategory?: string;
  tileType: string;
  confidenceScore: number;
  imageSize?: ImageSize;
  matchedTile: TileProduct | null;
  availableStock: number;
  stockStatus: StockStatus | string;
  warehouseLocation?: string;
  reorderLevel?: number;
  lowStock?: boolean;
  annotatedImage?: string;
  boxes?: YoloDetectionBox[];
  productImage?: string;
  provider?: string;
  modelPath?: string;
  topPredictions?: TilePredictionOption[];
  inventoryMatched?: boolean;
  modelNeedsRetrain?: boolean;
  logId?: string;
  recommendations?: TileProduct[];
}

export type WarehouseRecognitionStatus =
  | 'Available for Sale'
  | 'Matched'
  | 'For Manual Review'
  | 'Inventory Block';

export interface DetectedTileSummary {
  tileId: string;
  predictedType: string;
  confidence: number;
  color: string;
  pattern: string;
  surfaceFinish: string;
  sizeCategory: string;
  widthMm?: number;
  heightMm?: number;
  dimensionStatus: string;
  status: WarehouseRecognitionStatus | string;
  boundingBoxLabel?: string;
  skuId?: string;
  inventoryId?: string;
}

export interface RecommendedTileMatch {
  skuId: string;
  tileId?: string;
  tileName: string;
  tileType: string;
  matchPercentage: number;
  imageUrl?: string;
  material?: string;
  surfaceFinish?: string;
  sizeCategory?: string;
}

export interface TopRecommendation {
  rank: number;
  skuId: string;
  tileName: string;
  matchPercentage: number;
  tileId?: string;
}

export interface TileInspectResponse {
  imageUrl?: string;
  annotatedImageUrl?: string;
  detectedTiles: DetectedTileSummary[];
  recommendedTiles: RecommendedTileMatch[];
  topRecommendations: TopRecommendation[];
  message: string;
  boxes?: YoloDetectionBox[];
  imageSize?: ImageSize;
  defects?: {
    result?: string;
    defectType?: string;
    confidence?: number;
    boxes: YoloDetectionBox[];
    imageSize?: ImageSize;
  } | null;
  logId?: string;
}

export interface AiModelStatus {
  configured: boolean;
  provider: string;
  modelPath: string;
  modelLoaded: boolean;
  modelExists: boolean;
  classCount: number;
  classNames: string[];
  recognitionLogsDir: string;
  message?: string;
  modelNeedsRetrain?: boolean;
}

export interface DashboardSummary {
  totalProducts: number;
  lowStockCount: number;
  pendingDeliveries: number;
  recentRecognitionLogs: RecognitionLog[];
}

