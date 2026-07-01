import { useState } from 'react';
import { Image, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { borderRadius, colors, spacing } from '@/constants/theme';
import type { AiAnalysisOverlay } from '@/types';

interface DefectOverlayImageProps {
  imageUri: string;
  overlay: AiAnalysisOverlay;
}

export function DefectOverlayImage({ imageUri, overlay }: DefectOverlayImageProps) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const aspectRatio =
    overlay.imageWidth > 0 ? overlay.imageWidth / overlay.imageHeight : 4 / 3;

  const onLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setLayout({ width, height: width / aspectRatio });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.canvas, { aspectRatio }]} onLayout={onLayout}>
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />

        {overlay.tileOutline && layout.width > 0 ? (
          <View
            pointerEvents="none"
            style={[
              styles.tileOutline,
              {
                left: overlay.tileOutline.left * layout.width,
                top: overlay.tileOutline.top * layout.height,
                width: overlay.tileOutline.width * layout.width,
                height: overlay.tileOutline.height * layout.height,
              },
            ]}
          />
        ) : null}

        {layout.width > 0
          ? overlay.defects.map((defect, index) => (
              <View
                key={`${defect.class}-${index}`}
                pointerEvents="none"
                style={[
                  styles.defectBox,
                  {
                    left: defect.left * layout.width,
                    top: defect.top * layout.height,
                    width: defect.width * layout.width,
                    height: defect.height * layout.height,
                  },
                ]}
              >
                <View style={styles.defectLabel}>
                  <Text style={styles.defectLabelText} numberOfLines={1}>
                    {defect.label} {Math.round(defect.confidence * 100)}%
                  </Text>
                </View>
              </View>
            ))
          : null}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.legendTile]} />
          <Text style={styles.legendText}>Detected tile outline (OpenCV)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.legendDefect]} />
          <Text style={styles.legendText}>YOLOv8 defect region</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  canvas: {
    width: '100%',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  tileOutline: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.primaryLight,
    borderStyle: 'dashed',
  },
  defectBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.reject,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  defectLabel: {
    position: 'absolute',
    top: -1,
    left: -1,
    backgroundColor: colors.reject,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderTopLeftRadius: 4,
    borderBottomRightRadius: 4,
    maxWidth: '100%',
  },
  defectLabelText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  legend: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  legendTile: {
    borderWidth: 2,
    borderColor: colors.primaryLight,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  legendDefect: {
    backgroundColor: 'rgba(239, 68, 68, 0.35)',
    borderWidth: 1,
    borderColor: colors.reject,
  },
  legendText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
