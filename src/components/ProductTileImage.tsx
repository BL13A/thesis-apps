import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Package } from 'lucide-react-native';
import { borderRadius, colors } from '@/constants/theme';
import { loadCachedProductImageUri } from '@/services/productImageService';

interface ProductTileImageProps {
  imageUri?: string | null;
  productCode?: string | null;
  style?: StyleProp<ImageStyle>;
  placeholderStyle?: StyleProp<ViewStyle>;
  iconSize?: number;
}

function resolveProductImagePath(imageUri?: string | null, productCode?: string | null): string | null {
  if (imageUri?.trim()) {
    return imageUri.trim();
  }
  const code = productCode?.trim().toUpperCase();
  if (code && /^[CSWH]\d{5}$/.test(code)) {
    return `/api/tiles/product-images/${code}.jpg`;
  }
  return null;
}

export function ProductTileImage({
  imageUri,
  productCode,
  style,
  placeholderStyle,
  iconSize = 22,
}: ProductTileImageProps) {
  const sourcePath = resolveProductImagePath(imageUri, productCode);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(sourcePath));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!sourcePath) {
      setLocalUri(null);
      setLoading(false);
      setFailed(false);
      return undefined;
    }

    if (sourcePath.startsWith('data:') || sourcePath.startsWith('file://')) {
      setLocalUri(sourcePath);
      setLoading(false);
      setFailed(false);
      return undefined;
    }

    setLoading(true);
    setFailed(false);
    setLocalUri(null);

    void loadCachedProductImageUri(sourcePath)
      .then((uri) => {
        if (cancelled) return;
        if (uri) {
          setLocalUri(uri);
          setFailed(false);
        } else {
          setFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sourcePath]);

  if (loading) {
    return (
      <View style={[styles.placeholder, placeholderStyle, style]}>
        <ActivityIndicator size="small" color={colors.primaryLight} />
      </View>
    );
  }

  if (!localUri || failed) {
    return (
      <View style={[styles.placeholder, placeholderStyle, style]}>
        <Package size={iconSize} color={colors.primaryLight} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: localUri }}
      style={[styles.image, style]}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.surface,
  },
  placeholder: {
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
