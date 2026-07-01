import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyRound, ScanEye } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard, InputField, PrimaryButton } from '@/components';
import { APP_NAME } from '@/constants/branding';
import { borderRadius, colors, screenBackground, spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { validateResetTokenWithApi } from '@/services/authService';

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { confirmPasswordReset } = useAuth();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const resetToken = typeof token === 'string' ? token.trim() : '';
    if (!resetToken) {
      setIsValidating(false);
      setIsValid(false);
      setError('Invalid reset link. Request a new password reset email.');
      return;
    }

    validateResetTokenWithApi(resetToken)
      .then((result) => {
        setIsValid(result.valid);
        if (!result.valid) {
          setError('This reset link is invalid or has expired.');
        }
      })
      .finally(() => setIsValidating(false));
  }, [token]);

  const handleSubmit = async () => {
    const resetToken = typeof token === 'string' ? token.trim() : '';
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      setMessage('');
      return;
    }

    setError('');
    setMessage('');
    setLoading(true);
    const result = await confirmPasswordReset(resetToken, newPassword);
    setLoading(false);

    if (result.success) {
      setMessage(result.message ?? 'Password updated. You can sign in now.');
    } else {
      setError(result.error ?? 'Unable to reset password.');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[...screenBackground.gradientColors]}
        locations={[...screenBackground.gradientLocations]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.brandSection}>
              <View style={styles.logoContainer}>
                <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.logoGradient}>
                  <ScanEye size={32} color={colors.white} strokeWidth={1.8} />
                </LinearGradient>
              </View>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>Choose a new password for your {APP_NAME} account</Text>
            </View>

            <GlassCard style={styles.card}>
              {isValidating ? (
                <Text style={styles.muted}>Validating reset link...</Text>
              ) : isValid ? (
                <>
                  <View style={styles.cardHeader}>
                    <KeyRound size={20} color={colors.primaryLight} />
                    <Text style={styles.cardTitle}>New Password</Text>
                  </View>
                  <InputField
                    label="New Password"
                    placeholder="At least 8 characters"
                    isPassword
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                  <InputField
                    label="Confirm Password"
                    placeholder="Re-enter new password"
                    isPassword
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                  {error ? <Text style={styles.error}>{error}</Text> : null}
                  {message ? <Text style={styles.success}>{message}</Text> : null}
                  <PrimaryButton
                    label="Update Password"
                    onPress={handleSubmit}
                    loading={loading}
                    disabled={!!message}
                    style={styles.action}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.error}>{error}</Text>
                  <PrimaryButton
                    label="Back to Sign In"
                    variant="outline"
                    onPress={() => router.replace('/login')}
                    style={styles.action}
                  />
                </>
              )}

              {!message ? (
                <PrimaryButton
                  label="Back to Sign In"
                  variant="outline"
                  onPress={() => router.replace('/login')}
                  disabled={loading}
                />
              ) : (
                <PrimaryButton label="Sign In" onPress={() => router.replace('/login')} style={styles.action} />
              )}
            </GlassCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  brandSection: { alignItems: 'center', marginBottom: spacing.xl },
  logoContainer: { marginBottom: spacing.md },
  logoGradient: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  subtitle: { marginTop: spacing.xs, color: colors.textMuted, textAlign: 'center' },
  card: { padding: spacing.lg },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  cardTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  muted: { color: colors.textMuted, textAlign: 'center' },
  error: { color: colors.reject, marginBottom: spacing.sm },
  success: { color: colors.pass, marginBottom: spacing.sm },
  action: { marginTop: spacing.sm, marginBottom: spacing.sm },
});
