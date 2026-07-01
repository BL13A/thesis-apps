import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { fetchDashboardSummary } from '@/services/dashboardService';
import { fetchDeliveries } from '@/services/deliveryService';
import { fetchRecognitionLogs } from '@/services/recognitionService';
import { fetchTiles } from '@/services/tileService';
import type { DashboardSummary, Delivery, RecognitionLog, TileProduct } from '@/types';

interface WarehouseContextValue {
  tiles: TileProduct[];
  deliveries: Delivery[];
  recognitionLogs: RecognitionLog[];
  dashboard: DashboardSummary | null;
  isLoading: boolean;
  error: string | null;
  refreshAll: (options?: { silent?: boolean }) => Promise<void>;
  refreshTiles: (options?: { silent?: boolean }) => Promise<void>;
  refreshDeliveries: (options?: { silent?: boolean }) => Promise<void>;
  refreshRecognitionLogs: (options?: { silent?: boolean }) => Promise<void>;
  refreshDashboard: (options?: { silent?: boolean }) => Promise<void>;
  setTiles: React.Dispatch<React.SetStateAction<TileProduct[]>>;
  setDeliveries: React.Dispatch<React.SetStateAction<Delivery[]>>;
  setRecognitionLogs: React.Dispatch<React.SetStateAction<RecognitionLog[]>>;
}

const WarehouseContext = createContext<WarehouseContextValue | undefined>(undefined);

export function WarehouseProvider({ children }: { children: React.ReactNode }) {
  const [tiles, setTiles] = useState<TileProduct[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [recognitionLogs, setRecognitionLogs] = useState<RecognitionLog[]>([]);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshGeneration = useRef(0);

  const runRefresh = useCallback(
    async (silent: boolean, task: () => Promise<void>) => {
      const generation = ++refreshGeneration.current;
      if (!silent) {
        setIsLoading(true);
      }
      try {
        await task();
        if (generation === refreshGeneration.current) {
          setError(null);
        }
      } catch (err) {
        if (generation === refreshGeneration.current) {
          setError(err instanceof Error ? err.message : 'Failed to load warehouse data.');
        }
      } finally {
        if (!silent && generation === refreshGeneration.current) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  const refreshTiles = useCallback(
    async (options?: { silent?: boolean }) => {
      await runRefresh(!!options?.silent, async () => {
        const data = await fetchTiles();
        setTiles(data);
      });
    },
    [runRefresh],
  );

  const refreshDeliveries = useCallback(
    async (options?: { silent?: boolean }) => {
      await runRefresh(!!options?.silent, async () => {
        const data = await fetchDeliveries();
        setDeliveries(data);
      });
    },
    [runRefresh],
  );

  const refreshRecognitionLogs = useCallback(
    async (options?: { silent?: boolean }) => {
      await runRefresh(!!options?.silent, async () => {
        const data = await fetchRecognitionLogs();
        setRecognitionLogs(data);
      });
    },
    [runRefresh],
  );

  const refreshDashboard = useCallback(
    async (options?: { silent?: boolean }) => {
      await runRefresh(!!options?.silent, async () => {
        const data = await fetchDashboardSummary();
        setDashboard(data);
        setRecognitionLogs(data.recentRecognitionLogs);
      });
    },
    [runRefresh],
  );

  const refreshAll = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = !!options?.silent;
      const generation = ++refreshGeneration.current;
      if (!silent) {
        setIsLoading(true);
      }
      try {
        const [tileData, deliveryData, summary] = await Promise.all([
          fetchTiles(),
          fetchDeliveries(),
          fetchDashboardSummary(),
        ]);
        if (generation !== refreshGeneration.current) {
          return;
        }
        setTiles(tileData);
        setDeliveries(deliveryData);
        setDashboard(summary);
        setRecognitionLogs(summary.recentRecognitionLogs);
        setError(null);
      } catch (err) {
        if (generation === refreshGeneration.current) {
          setError(err instanceof Error ? err.message : 'Failed to load warehouse data.');
        }
      } finally {
        if (!silent && generation === refreshGeneration.current) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  const value = useMemo(
    () => ({
      tiles,
      deliveries,
      recognitionLogs,
      dashboard,
      isLoading,
      error,
      refreshAll,
      refreshTiles,
      refreshDeliveries,
      refreshRecognitionLogs,
      refreshDashboard,
      setTiles,
      setDeliveries,
      setRecognitionLogs,
    }),
    [
      tiles,
      deliveries,
      recognitionLogs,
      dashboard,
      isLoading,
      error,
      refreshAll,
      refreshTiles,
      refreshDeliveries,
      refreshRecognitionLogs,
      refreshDashboard,
    ],
  );

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  return <WarehouseContext.Provider value={value}>{children}</WarehouseContext.Provider>;
}

export function useWarehouse() {
  const context = useContext(WarehouseContext);
  if (!context) {
    throw new Error('useWarehouse must be used within WarehouseProvider');
  }
  return context;
}
