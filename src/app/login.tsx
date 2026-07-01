import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { KeyRound, Mail, ScanEye, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard, InputField, PrimaryButton } from '@/components';
import {
  APP_LOGIN_CARD_HINT,
  APP_LOGIN_SUBTITLE,
  APP_NAME,
} from '@/constants/branding';
import { borderRadius, colors, screenBackground, spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginScreen() {
  const { login, requestPasswordReset } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotVisible, setForgotVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

  const { control, handleSubmit, watch } = useForm<LoginForm>({
    defaultValues: { email: '', password: '' },
  });

  const emailValue = watch('email');

  const onSubmit = async (data: LoginForm) => {
    setError('');
    setLoading(true);
    const result = await login(data.email, data.password);
    setLoading(false);

    if (result.success) {
      router.replace('/(tabs)/home');
    } else {
      setError(result.error ?? 'Login failed');
    }
  };

  const openForgotPassword = () => {
    setResetEmail(emailValue.trim());
    setResetMessage('');
    setResetError('');
    setForgotVisible(true);
  };

  const handleSendResetLink = async () => {
    const email = resetEmail.trim().toLowerCase();
    if (!email) {
      setResetError('Enter your email address first.');
      setResetMessage('');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setResetError('Enter a valid email address.');
      setResetMessage('');
      return;
    }

    setResetError('');
    setResetMessage('');
    setResetLoading(true);
    const result = await requestPasswordReset(email);
    setResetLoading(false);

    if (result.success) {
      setResetMessage(
        result.message ?? 'Check your email for a password reset link.',
      );
    } else {
      setResetError(result.error ?? 'Unable to send reset link.');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[...screenBackground.gradientColors]}
        locations={[...screenBackground.gradientLocations]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowBlue} />
      <View style={styles.glowYellow} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.brandSection}>
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.logoGradient}
                >
                  <ScanEye size={36} color={colors.white} strokeWidth={1.8} />
                </LinearGradient>
              </View>
              <Text style={styles.title}>{APP_NAME}</Text>
              <Text style={styles.subtitle}>{APP_LOGIN_SUBTITLE}</Text>
            </View>

            <GlassCard style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Sign In</Text>
                <Text style={styles.cardSubtitle}>{APP_LOGIN_CARD_HINT}</Text>
              </View>

              <Controller
                control={control}
                name="email"
                rules={{
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Enter a valid email address',
                  },
                }}
                render={({ field: { onChange, onBlur, value }, fieldState }) => (
                  <InputField
                    label="Email Address"
                    placeholder="you@tilevision.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={fieldState.error?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                rules={{ required: 'Password is required' }}
                render={({ field: { onChange, onBlur, value }, fieldState }) => (
                  <View>
                    <InputField
                      label="Password"
                      placeholder="Enter your password"
                      isPassword
                      autoComplete="password"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={fieldState.error?.message}
                    />
                    <Pressable onPress={openForgotPassword} style={styles.forgotLink} hitSlop={8}>
                      <Text style={styles.forgotLinkText}>Forgot password?</Text>
                    </Pressable>
                  </View>
                )}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <PrimaryButton
                label="Sign In"
                onPress={handleSubmit(onSubmit)}
                loading={loading}
                style={styles.loginButton}
              />
            </GlassCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal visible={forgotVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <KeyRound size={20} color={colors.primaryLight} />
                <Text style={styles.modalTitle}>Reset Password</Text>
              </View>
              <Pressable
                onPress={() => setForgotVisible(false)}
                hitSlop={12}
                style={styles.modalClose}
              >
                <X size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <Text style={styles.modalDescription}>
              Enter your registered email. We will send a secure link to reset your password on a
              separate page.
            </Text>

            <InputField
              label="Email Address"
              placeholder="you@tilevision.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={resetEmail}
              onChangeText={setResetEmail}
              editable={!resetMessage}
            />

            {resetError ? <Text style={styles.error}>{resetError}</Text> : null}
            {resetMessage ? <Text style={styles.success}>{resetMessage}</Text> : null}

            <PrimaryButton
              label={resetMessage ? 'Email Sent' : 'Send Reset Link'}
              icon={Mail}
              onPress={handleSendResetLink}
              loading={resetLoading}
              disabled={!!resetMessage}
              style={styles.modalAction}
            />
            <PrimaryButton
              label="Back to Sign In"
              variant="outline"
              onPress={() => setForgotVisible(false)}
              disabled={resetLoading}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  glowBlue: {
    position: 'absolute',
    top: screenBackground.glowBlue.top,
    right: screenBackground.glowBlue.right,
    width: screenBackground.glowBlue.size,
    height: screenBackground.glowBlue.size,
    borderRadius: screenBackground.glowBlue.size / 2,
    backgroundColor: screenBackground.glowBlue.color,
  },
  glowYellow: {
    position: 'absolute',
    bottom: screenBackground.glowYellow.bottom,
    left: screenBackground.glowYellow.left,
    width: screenBackground.glowYellow.size,
    height: screenBackground.glowYellow.size,
    borderRadius: screenBackground.glowYellow.size / 2,
    backgroundColor: screenBackground.glowYellow.color,
  },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  brandSection: { alignItems: 'center', marginBottom: spacing.xxl },
  logoContainer: { marginBottom: spacing.lg },
  logoGradient: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
  },
  card: { marginTop: spacing.sm },
  cardHeader: { marginBottom: spacing.lg },
  cardTitle: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: colors.textSecondary },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: spacing.sm,
  },
  forgotLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  error: {
    color: colors.reject,
    fontSize: 13,
    marginBottom: spacing.md,
    textAlign: 'center',
    lineHeight: 18,
  },
  success: {
    color: colors.pass,
    fontSize: 13,
    marginBottom: spacing.md,
    textAlign: 'center',
    lineHeight: 18,
  },
  loginButton: { marginTop: spacing.sm },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  modalClose: { padding: 4 },
  modalDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  modalAction: { marginBottom: spacing.md },
});
