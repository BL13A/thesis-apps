import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  createInspection as createInspectionOnApi,
  extractBatchSummaries,
  fetchInspections,
  type BatchSummary,
} from '@/services/inspectionService';
import { submitQaReview } from '@/services/qaService';
import type { BatchDetails, InspectionRecord, InspectionResult, QAStatus } from '@/types';
import { filterInspectionsForUser } from '@/utils/inspection';
import { hasPermission } from '@/utils/permissions';

interface InspectionsContextValue {
  inspections: InspectionRecord[];
  visibleInspections: InspectionRecord[];
  batchSummaries: BatchSummary[];
  isLoading: boolean;
  error: string | null;
  pendingReviews: InspectionRecord[];
  addInspection: (
    batch: BatchDetails,
    analysis: InspectionResult,
    imageUri: string,
  ) => Promise<void>;
  updateQAReview: (
    id: string,
    qaStatus: QAStatus,
    remarks: string,
    reviewerName: string,
  ) => Promise<void>;
  refreshInspections: (options?: { silent?: boolean }) => Promise<void>;
}

const InspectionsContext = createContext<InspectionsContextValue | undefined>(undefined);

export function InspectionsProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshGenerationRef = useRef(0);

  const refreshInspections = useCallback(async (options?: { silent?: boolean }) => {
    if (!isAuthenticated) {
      setInspections([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const generation = ++refreshGenerationRef.current;
    if (!options?.silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const records = await fetchInspections();
      if (generation !== refreshGenerationRef.current) {
        return;
      }
      setInspections(records);
      setError(null);
    } catch (err) {
      if (generation !== refreshGenerationRef.current) {
        return;
      }
      const message =
        err instanceof Error ? err.message : 'Unable to load inspections from API.';
      setError(message);
      setInspections([]);
    } finally {
      if (generation === refreshGenerationRef.current) {
        setIsLoading(false);
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshInspections();
  }, [refreshInspections, user?.id]);

  const visibleInspections = useMemo(() => {
    if (!user) return [];
    const viewAll = hasPermission(user, 'view_all_inspections');
    return filterInspectionsForUser(inspections, user, viewAll);
  }, [inspections, user]);

  const batchSummaries = useMemo(
    () => extractBatchSummaries(visibleInspections),
    [visibleInspections],
  );

  const pendingReviews = useMemo(
    () => visibleInspections.filter((record) => record.qaStatus === 'Pending'),
    [visibleInspections],
  );

  const addInspection = useCallback(
    async (batch: BatchDetails, analysis: InspectionResult, imageUri: string) => {
      if (!user) {
        throw new Error('You must be signed in to submit an inspection.');
      }

      refreshGenerationRef.current += 1;
      const saved = await createInspectionOnApi(batch, analysis, imageUri, {
        id: user.id,
        name: user.name,
      });

      setInspections((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setError(null);

      try {
        await refreshInspections({ silent: true });
      } catch {
        // Keep saved record visible when background refresh fails.
      }
    },
    [user, refreshInspections],
  );

  const updateQAReview = useCallback(
    async (id: string, qaStatus: QAStatus, remarks: string, reviewerName: string) => {
      refreshGenerationRef.current += 1;
      const saved = await submitQaReview(id, qaStatus, remarks, reviewerName);
      setInspections((current) => current.map((item) => (item.id === id ? saved : item)));
      setError(null);

      try {
        await refreshInspections({ silent: true });
      } catch {
        // Keep saved review visible when background refresh fails.
      }
    },
    [refreshInspections],
  );

  const value = useMemo(
    () => ({
      inspections,
      visibleInspections,
      batchSummaries,
      isLoading,
      error,
      pendingReviews,
      addInspection,
      updateQAReview,
      refreshInspections,
    }),
    [
      inspections,
      visibleInspections,
      batchSummaries,
      isLoading,
      error,
      pendingReviews,
      addInspection,
      updateQAReview,
      refreshInspections,
    ],
  );

  return (
    <InspectionsContext.Provider value={value}>{children}</InspectionsContext.Provider>
  );
}

export function useInspections() {
  const context = useContext(InspectionsContext);
  if (!context) {
    throw new Error('useInspections must be used within InspectionsProvider');
  }
  return context;
}
