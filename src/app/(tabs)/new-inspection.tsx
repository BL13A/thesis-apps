import { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera as CameraIcon, CheckCircle, Upload } from 'lucide-react-native';
import {
  AlertCard,
  AppHeader,
  GlassCard,
  InputField,
  PrimaryButton,
  StatusBadge,
} from '@/components';
import { borderRadius, colors, spacing } from '@/constants/theme';
import { useInspections } from '@/hooks/useInspections';
import { analyzeTileImage } from '@/services/inspectionService';
import type { BatchDetails, TileAnalysisResult } from '@/types';
import { formatConfidence } from '@/utils/inventory';

const EMPTY_BATCH: BatchDetails = {
  batchId: '',
  supplierName: '',
  tileType: '',
  tileSize: '',
  quantity: '',
  expectedDimension: '',
};

export default function NewInspectionScreen() {
  const { addInspection } = useInspections();
  const [batch, setBatch] = useState<BatchDetails>(EMPTY_BATCH);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<TileAnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (field: keyof BatchDetails) => (value: string) =>
    setBatch((current) => ({ ...current, [field]: value }));

  const batchIsComplete = Boolean(
    batch.supplierName.trim() &&
      batch.tileType.trim() &&
      batch.tileSize.trim() &&
      batch.quantity.trim() &&
      batch.expectedDimension.trim(),
  );

  const runAnalysis = async (uri: string) => {
    setAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeTileImage(uri, batch.expectedDimension);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI inspection failed.');
      setAnalysis(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const captureFromCamera = async () => {
    if (!batchIsComplete) {
      Alert.alert('Batch Details Required', 'Fill in the batch details before capturing a photo.');
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera Permission', 'Allow camera access to photograph the tile.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false });
    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    setImageUri(uri);
    setAnalysis(null);
    await runAnalysis(uri);
  };

  const pickFromGallery = async () => {
    if (!batchIsComplete) {
      Alert.alert('Batch Details Required', 'Fill in the batch details before uploading a photo.');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow photo library access.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    setImageUri(uri);
    setAnalysis(null);
    await runAnalysis(uri);
  };

  const submit = async () => {
    if (!imageUri || !analysis) return;

    setSubmitting(true);
    setError(null);

    try {
      await addInspection(batch, analysis.inspectionResult, imageUri);
      Alert.alert('Inspection Saved', 'The inspection was recorded successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save inspection.');
    } finally {
      setSubmitting(false);
    }
  };

  const inspectionResult = analysis?.inspectionResult;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <AppHeader title="New Inspection" subtitle="Real AI defect detection via Roboflow" compact />

        {error ? <AlertCard title="Error" message={error} variant="warning" /> : null}

        <GlassCard style={styles.card}>
          <Text style={styles.sectionTitle}>Batch Details</Text>
          <InputField
            label="Supplier Name"
            value={batch.supplierName}
            onChangeText={updateField('supplierName')}
            placeholder="e.g. Manila Ceramics Co."
          />
          <InputField
            label="Tile Type"
            value={batch.tileType}
            onChangeText={updateField('tileType')}
            placeholder="e.g. Ceramic Glazed Polished"
          />
          <InputField
            label="Tile Size"
            value={batch.tileSize}
            onChangeText={updateField('tileSize')}
            placeholder="e.g. 600x600mm"
          />
          <InputField
            label="Quantity"
            value={batch.quantity}
            onChangeText={updateField('quantity')}
            placeholder="e.g. 500"
            keyboardType="numeric"
          />
          <InputField
            label="Expected Dimension (mm)"
            value={batch.expectedDimension}
            onChangeText={updateField('expectedDimension')}
            placeholder="e.g. 600"
            keyboardType="numeric"
          />
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={styles.sectionTitle}>Tile Photo</Text>

          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
          ) : (
            <View style={styles.placeholder}>
              <CameraIcon size={40} color={colors.primaryLight} />
              <Text style={styles.placeholderText}>
                {batchIsComplete
                  ? 'Take or upload a photo to run AI defect analysis.'
                  : 'Fill in batch details above to enable photo capture.'}
              </Text>
            </View>
          )}

          {analyzing ? (
            <View style={styles.analyzingRow}>
              <Text style={styles.analyzingText}>Running AI defect analysis...</Text>
            </View>
          ) : null}

          <View style={styles.photoActions}>
            <PrimaryButton
              label="Take Photo"
              icon={CameraIcon}
              variant="secondary"
              onPress={() => void captureFromCamera()}
              style={styles.actionButton}
              disabled={!batchIsComplete || analyzing || submitting}
            />
            <PrimaryButton
              label="Upload"
              icon={Upload}
              variant="outline"
              onPress={() => void pickFromGallery()}
              style={styles.actionButton}
              disabled={!batchIsComplete || analyzing || submitting}
            />
          </View>
        </GlassCard>

        {inspectionResult ? (
          <GlassCard style={styles.card}>
            <Text style={styles.sectionTitle}>AI Analysis Result</Text>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Result</Text>
              <StatusBadge label={inspectionResult.result} variant={inspectionResult.result} />
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Defect Type</Text>
              <Text style={styles.resultValue}>{inspectionResult.defectType}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Confidence</Text>
              <Text style={styles.resultValue}>
                {formatConfidence(inspectionResult.confidenceScore)}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Size Validation</Text>
              <Text style={styles.resultValue}>{inspectionResult.sizeValidation}</Text>
            </View>
          </GlassCard>
        ) : null}

        <PrimaryButton
          label={submitting ? 'Saving...' : 'Submit Inspection'}
          icon={CheckCircle}
          onPress={() => void submit()}
          loading={submitting}
          disabled={!inspectionResult || submitting}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  card: { marginBottom: spacing.xl },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  placeholder: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  placeholderText: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 14,
  },
  analyzingRow: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  analyzingText: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: '600',
  },
  photoActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: { flex: 1, minWidth: 0 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  resultLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});
