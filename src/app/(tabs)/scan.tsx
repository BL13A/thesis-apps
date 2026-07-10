import { useCallback, useRef, useState } from 'react';

import { useFocusEffect } from 'expo-router';

import {

  ActivityIndicator,

  Alert,

  LayoutChangeEvent,

  ScrollView,

  StyleSheet,

  Text,

  View,

} from 'react-native';

import { CameraView, useCameraPermissions } from 'expo-camera';

import * as ImagePicker from 'expo-image-picker';

import { SafeAreaView } from 'react-native-safe-area-context';

import { Camera, CheckCircle, Pause, Play, Upload } from 'lucide-react-native';

import {

  AlertCard,

  AppHeader,

  GlassCard,

  PrimaryButton,

  ScanRecognitionResult,

} from '@/components';

import { DetectionBoxOverlay } from '@/components/DetectionBoxOverlay';

import { borderRadius, colors, spacing } from '@/constants/theme';

import { fetchAiModelStatus, inspectTileImage } from '@/services/recognitionService';

import type { AiModelStatus, ImageSize, TileInspectResponse, TileRecognitionResult } from '@/types';

import { formatConfidence } from '@/utils/inventory';

import { useWarehouse } from '@/hooks/useWarehouse';

import { sanitizeTileDisplayLabel } from '@/utils/tileLabels';



const SCAN_INTERVAL_MS = 900;



export default function ScanScreen() {

  const { refreshRecognitionLogs, refreshDashboard } = useWarehouse();

  const cameraRef = useRef<CameraView>(null);

  const processingRef = useRef(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const [facing, setFacing] = useState<'back' | 'front'>('back');

  const [isScanning, setIsScanning] = useState(true);

  const scanningRef = useRef(true);
  const [cameraReady, setCameraReady] = useState(false);

  const [frameProcessing, setFrameProcessing] = useState(false);

  const [saving, setSaving] = useState(false);

  const [result, setResult] = useState<TileRecognitionResult | null>(null);

  const [inspectResult, setInspectResult] = useState<TileInspectResponse | null>(null);

  const [frameSize, setFrameSize] = useState<ImageSize>({ width: 0, height: 0 });

  const [previewLayout, setPreviewLayout] = useState<ImageSize>({ width: 0, height: 0 });

  const [error, setError] = useState<string | null>(null);

  const [modelStatus, setModelStatus] = useState<AiModelStatus | null>(null);



  useFocusEffect(

    useCallback(() => {

      void fetchAiModelStatus()

        .then(setModelStatus)

        .catch(() => setModelStatus(null));

    }, []),

  );



  const ensureCameraPermission = async () => {

    if (cameraPermission?.granted) return true;

    const response = await requestCameraPermission();

    if (!response.granted) {

      Alert.alert('Camera Permission', 'Allow camera access to scan tiles.');

      return false;

    }

    return true;

  };



  const applyInspect = useCallback(

    (

      inspect: TileInspectResponse,

      recognition: TileRecognitionResult,

      captureSize?: ImageSize,

    ) => {

      setInspectResult(inspect);

      setResult(recognition);



      const resolvedSize =

        captureSize?.width && captureSize?.height

          ? captureSize

          : inspect.imageSize ?? recognition.imageSize;



      if (resolvedSize?.width && resolvedSize?.height) {

        setFrameSize(resolvedSize);

      }

    },

    [],

  );



  const processLiveFrame = useCallback(async () => {

    if (processingRef.current || !cameraRef.current || !cameraReady || !scanningRef.current) {

      return;

    }



    processingRef.current = true;

    setFrameProcessing(true);



    try {

      const photo = await cameraRef.current.takePictureAsync({

        quality: 0.3,

        skipProcessing: false,

      });



      if (!photo?.uri) {

        return;

      }



      const captureSize: ImageSize = {

        width: photo.width ?? 0,

        height: photo.height ?? 0,

      };



      if (!scanningRef.current) return;

      const response = await inspectTileImage(photo.uri, { saveLog: false });

      if (!scanningRef.current) return;

      applyInspect(response.inspect, response.recognition, captureSize);

      setError(null);

    } catch (err) {

      const message = err instanceof Error ? err.message : 'Recognition failed.';

      setError(message);

    } finally {

      processingRef.current = false;

      setFrameProcessing(false);

    }

  }, [applyInspect, isScanning]);



  useFocusEffect(

    useCallback(() => {

      if (!isScanning || !cameraReady || !cameraPermission?.granted || modelStatus?.modelExists === false) {

        return undefined;

      }



      const intervalId = setInterval(() => {

        void processLiveFrame();

      }, SCAN_INTERVAL_MS);



      void processLiveFrame();



      return () => clearInterval(intervalId);

    }, [isScanning, cameraReady, cameraPermission?.granted, modelStatus?.modelExists, processLiveFrame]),

  );



  const saveCurrentScan = async () => {

    const allowed = await ensureCameraPermission();

    if (!allowed || !cameraRef.current || !cameraReady) return;



    setSaving(true);

    setError(null);



    try {

      const photo = await cameraRef.current.takePictureAsync({

        quality: 0.6,

        skipProcessing: false,

      });



      if (!photo?.uri) {

        Alert.alert('Capture Failed', 'Unable to capture image from camera.');

        return;

      }



      const response = await inspectTileImage(photo.uri, { saveLog: true });

      applyInspect(

        response.inspect,

        response.recognition,

        {

          width: photo.width ?? 0,

          height: photo.height ?? 0,

        },

      );



      Alert.alert('Scan Confirmed', 'Recognition result saved to warehouse history.');



      void refreshRecognitionLogs({ silent: true });

      void refreshDashboard({ silent: true });

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Failed to save scan.');

    } finally {

      setSaving(false);

    }

  };



  const pickFromGallery = async () => {

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {

      Alert.alert('Permission Required', 'Please allow photo library access.');

      return;

    }



    const pickerResult = await ImagePicker.launchImageLibraryAsync({

      mediaTypes: ['images'],

      allowsEditing: true,

      aspect: [4, 3],

      quality: 0.85,

    });



    if (pickerResult.canceled || !pickerResult.assets[0]) {
      return;
    }

    {
      const asset = pickerResult.assets[0];

      setIsScanning(false);

      setFrameProcessing(true);

      setError(null);



      try {

        const response = await inspectTileImage(asset.uri, { saveLog: true });

        applyInspect(

          response.inspect,

          response.recognition,

          {

            width: asset.width ?? 0,

            height: asset.height ?? 0,

          },

        );

        await Promise.all([

          refreshRecognitionLogs({ silent: true }),

          refreshDashboard({ silent: true }),

        ]);

      } catch (err) {

        setError(err instanceof Error ? err.message : 'Recognition failed.');

      } finally {

        setFrameProcessing(false);

      }

    }

  };



  const onPreviewLayout = (event: LayoutChangeEvent) => {

    const { width, height } = event.nativeEvent.layout;

    setPreviewLayout({ width, height });

  };



  const primaryDetection = inspectResult?.detectedTiles[0];

  const detectedClass = primaryDetection?.predictedType

    ? sanitizeTileDisplayLabel(primaryDetection.predictedType)

    : result?.detectedClass

      ? sanitizeTileDisplayLabel(result.detectedClass)

      : '—';

  const overlayImageSize =

    frameSize.width > 0 ? frameSize : inspectResult?.imageSize ?? result?.imageSize ?? { width: 0, height: 0 };

  const overlayBoxes = inspectResult?.boxes ?? result?.boxes ?? [];

  const overlayConfidence = primaryDetection?.confidence ?? result?.confidenceScore ?? 0;

  const canScan =

    cameraPermission?.granted && modelStatus?.modelExists !== false;



  return (

    <SafeAreaView style={styles.safeArea} edges={['top']}>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <AppHeader

          title="AI Tile Scanner"

          subtitle="YOLOv8 detection + OpenCV dimension validation"

          compact

        />



        {modelStatus?.modelExists === false ? (

          <AlertCard

            title="Tile recognition model not trained yet"

            message={

              modelStatus.message ??

              'Run npm run ai:bootstrap, add photos to category folders, then npm run ai:prepare && npm run ai:train'

            }

            variant="info"

          />

        ) : null}



        {modelStatus?.modelNeedsRetrain || result?.modelNeedsRetrain ? (

          <AlertCard

            title="Model needs retraining"

            message={

              modelStatus?.message ??

              'Run npm run ai:prepare && npm run ai:train with Ceramic Tile images in tile_dataset/labeled/ceramic_tile/, then restart the API.'

            }

            variant="warning"

          />

        ) : null}



        {error ? <AlertCard title="Recognition Error" message={error} variant="warning" /> : null}



        <GlassCard style={styles.card}>

          {!cameraPermission?.granted ? (

            <View style={styles.permissionBox}>

              <Camera size={40} color={colors.primaryLight} />

              <Text style={styles.permissionText}>Camera access is required for live tile scanning.</Text>

              <PrimaryButton label="Enable Camera" onPress={() => void ensureCameraPermission()} />

            </View>

          ) : (

            <View style={styles.cameraWrap} onLayout={onPreviewLayout}>

              <CameraView ref={cameraRef} style={styles.camera} facing={facing} onCameraReady={() => setCameraReady(true)} />

              {overlayBoxes.length > 0 && overlayImageSize.width > 0 ? (

                <DetectionBoxOverlay

                  boxes={overlayBoxes}

                  imageSize={overlayImageSize}

                  layoutSize={previewLayout}

                  fallbackLabel={detectedClass}

                  fallbackConfidence={overlayConfidence}

                />

              ) : null}

              {inspectResult?.defects?.boxes?.length && inspectResult.defects.imageSize?.width ? (

                <DetectionBoxOverlay

                  boxes={inspectResult.defects.boxes}

                  imageSize={inspectResult.defects.imageSize}

                  layoutSize={previewLayout}

                  color={"#ef4444"}

                  fillColor={"rgba(239, 68, 68, 0.15)"}

                />

              ) : null}

              {frameProcessing ? (

                <View style={styles.processingBadge}>

                  <ActivityIndicator size="small" color="#fff" />

                  <Text style={styles.processingText}>Detecting...</Text>

                </View>

              ) : null}

              {primaryDetection || result ? (

                <View style={styles.liveLabel}>

                  <Text style={styles.liveLabelTitle}>{detectedClass}</Text>

                  <Text style={styles.liveLabelMeta}>

                    {formatConfidence(overlayConfidence)} confidence

                  </Text>

                </View>

              ) : null}

            </View>

          )}



          <View style={styles.cameraActions}>

            <View style={styles.primaryActions}>

              <PrimaryButton

                label={isScanning ? 'Pause' : 'Resume'}

                icon={isScanning ? Pause : Play}

                variant="secondary"

                onPress={() => setIsScanning((current) => { const next = !current; scanningRef.current = next; if (!next) setFrameProcessing(false); return next; })}

                style={styles.actionButton}

                disabled={!canScan || saving}

              />

              <PrimaryButton

                label={saving ? 'Confirming...' : 'Confirm'}

                icon={CheckCircle}

                variant="secondary"

                onPress={() => void saveCurrentScan()}

                style={styles.actionButton}

                loading={saving}

                disabled={!canScan || saving || !inspectResult}

              />

            </View>

            <PrimaryButton

              label="Upload"

              icon={Upload}

              variant="outline"

              onPress={() => void pickFromGallery()}

              disabled={frameProcessing || saving}

            />

          </View>

        </GlassCard>



        {inspectResult ? (

          <ScanRecognitionResult inspect={inspectResult} />

        ) : canScan && isScanning ? (

          <GlassCard style={styles.card}>

            <Text style={styles.waitingText}>

              Point the camera at a tile. Detection runs every {SCAN_INTERVAL_MS / 1000}s.

            </Text>

          </GlassCard>

        ) : null}

      </ScrollView>

    </SafeAreaView>

  );

}



const styles = StyleSheet.create({

  safeArea: { flex: 1 },

  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },

  card: { marginBottom: spacing.xl },

  cameraWrap: {

    height: 360,

    borderRadius: borderRadius.md,

    overflow: 'hidden',

    marginBottom: spacing.lg,

    backgroundColor: colors.surface,

  },

  camera: { flex: 1 },

  processingBadge: {

    position: 'absolute',

    top: spacing.md,

    right: spacing.md,

    flexDirection: 'row',

    alignItems: 'center',

    gap: spacing.xs,

    backgroundColor: 'rgba(0,0,0,0.55)',

    paddingHorizontal: spacing.sm,

    paddingVertical: spacing.xs,

    borderRadius: borderRadius.sm,

  },

  processingText: {

    color: '#fff',

    fontSize: 12,

    fontWeight: '600',

  },

  liveLabel: {

    position: 'absolute',

    left: spacing.md,

    right: spacing.md,

    bottom: spacing.md,

    backgroundColor: 'rgba(0,0,0,0.65)',

    borderRadius: borderRadius.sm,

    paddingHorizontal: spacing.md,

    paddingVertical: spacing.sm,

  },

  liveLabelTitle: {

    color: '#fff',

    fontSize: 16,

    fontWeight: '700',

  },

  liveLabelMeta: {

    color: 'rgba(255,255,255,0.85)',

    fontSize: 13,

    marginTop: 2,

  },

  cameraActions: { gap: spacing.md },

  primaryActions: { flexDirection: 'row', gap: spacing.md, width: '100%' },

  actionButton: { flex: 1, minWidth: 0 },

  permissionBox: {

    height: 280,

    alignItems: 'center',

    justifyContent: 'center',

    gap: spacing.md,

    paddingHorizontal: spacing.lg,

  },

  permissionText: {

    color: colors.textSecondary,

    textAlign: 'center',

    fontSize: 14,

  },

  waitingText: {

    color: colors.textSecondary,

    fontSize: 14,

    textAlign: 'center',

  },

});


