import { Fragment } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import type { YoloDetectionBox } from '@/types';
import { sanitizeTileDisplayLabel } from '@/utils/tileLabels';

interface Size {
  width: number;
  height: number;
}

interface DetectionBoxOverlayProps {
  boxes: YoloDetectionBox[];
  imageSize: Size;
  layoutSize: Size;
  fallbackLabel?: string;
  fallbackConfidence?: number;
  color?: string;
  fillColor?: string;
}

export function DetectionBoxOverlay({
  boxes,
  imageSize,
  layoutSize,
  fallbackLabel,
  fallbackConfidence,
  color = '#22c55e',
  fillColor = 'rgba(34, 197, 94, 0.12)',
}: DetectionBoxOverlayProps) {
  if (!layoutSize.width || !imageSize.width) {
    return null;
  }

  const scaleX = layoutSize.width / imageSize.width;
  const scaleY = layoutSize.height / imageSize.height;

  const renderBoxes =
    boxes.length > 0
      ? boxes.slice(0, 1)
      : fallbackLabel
        ? [
            {
              x1: imageSize.width * 0.08,
              y1: imageSize.height * 0.12,
              x2: imageSize.width * 0.92,
              y2: imageSize.height * 0.88,
              confidence: fallbackConfidence ?? 0,
              label: fallbackLabel,
            },
          ]
        : [];

  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width={layoutSize.width}
      height={layoutSize.height}
      pointerEvents="none"
    >
      {renderBoxes.map((box, index) => {
        const x = box.x1 * scaleX;
        const y = box.y1 * scaleY;
        const width = (box.x2 - box.x1) * scaleX;
        const height = (box.y2 - box.y1) * scaleY;
        const label = sanitizeTileDisplayLabel(box.label || fallbackLabel || '');
        const confidence = box.confidence ?? fallbackConfidence ?? 0;

        return (
          <Fragment key={`box-${index}`}>
            <Rect
              x={x}
              y={y}
              width={width}
              height={height}
              stroke={color}
              strokeWidth={2}
              fill={fillColor}
            />
            {label ? (
              <SvgText
                x={x + 4}
                y={Math.max(y - 6, 14)}
                fill={color}
                fontSize={12}
                fontWeight="bold"
              >
                {`${label} ${(confidence * 100).toFixed(0)}%`}
              </SvgText>
            ) : null}
          </Fragment>
        );
      })}
    </Svg>
  );
}
