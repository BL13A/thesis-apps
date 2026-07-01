import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyRound,
  LogOut,
  Pencil,
  X,
} from 'lucide-react-native';
import {
  AppHeader,
  GlassCard,
  InputField,
  PrimaryButton,
  ProfileInfoRow,
  ProfileMenuItem,
} from '@/components';
import { APP_COPYRIGHT, APP_NAME } from '@/constants/branding';
import { borderRadius, colors, spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { formatLastLogin } from '@/utils/inspection';

type ProfileModal = 'edit' | 'password' | null;

interface EditProfileForm {
  name: string;
  email: string;
  mobileNumber: string;
}

interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function ProfileScreen() {
  const { user, logout, updateProfile, changePassword } = useAuth();
  const [activeModal, setActiveModal] = useState<ProfileModal>(null);
  const [saving, setSaving] = useState(false);

  const editForm = useForm<EditProfileForm>({
    defaultValues: { name: '', email: '', mobileNumber: '' },
  });

  const passwordForm = useForm<ChangePasswordForm>({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (user && activeModal === 'edit') {
      editForm.reset({
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
      });
    }
  }, [user, activeModal, editForm]);

  const closeModal = () => {
    setActiveModal(null);
    passwordForm.reset();
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  const handleSaveProfile = editForm.handleSubmit(async (values) => {
    setSaving(true);
    const result = await updateProfile(values);
    setSaving(false);

    if (result.success) {
      Alert.alert('Profile Updated', 'Your employee information has been saved.');
      closeModal();
      return;
    }

    Alert.alert('Update Failed', result.error ?? 'Unable to save profile.');
  });

  const handleChangePassword = passwordForm.handleSubmit(async (values) => {
    if (values.newPassword !== values.confirmPassword) {
      passwordForm.setError('confirmPassword', {
        message: 'Passwords do not match.',
      });
      return;
    }

    setSaving(true);
    const result = await changePassword(values.currentPassword, values.newPassword);
    setSaving(false);

    if (result.success) {
      Alert.alert('Password Changed', 'Your password has been updated successfully.');
      closeModal();
      return;
    }

    Alert.alert('Password Change Failed', result.error ?? 'Unable to change password.');
  });

  if (!user) return null;

  return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <AppHeader title="Profile" subtitle="Employee account information" />

          <GlassCard style={styles.heroCard}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                <Text style={styles.initials}>{getInitials(user.name)}</Text>
              </View>
            </View>
            <View style={styles.heroIdentity}>
              <Text style={styles.fullName}>{user.name}</Text>
              <Text style={styles.employeeIdLabel}>Employee ID</Text>
              <Text style={styles.employeeId}>{user.employeeId}</Text>
              <View style={styles.lastLoginBlock}>
                <Text style={styles.lastLoginLabel}>Last Login</Text>
                <Text style={styles.lastLogin}>{formatLastLogin(user.lastLogin)}</Text>
              </View>
            </View>
          </GlassCard>

          <Text style={styles.sectionTitle}>Employee Information</Text>
          <GlassCard noPadding style={styles.infoCard}>
            <View style={styles.infoInner}>
              <ProfileInfoRow label="Full Name" value={user.name} />
              <ProfileInfoRow label="Employee ID" value={user.employeeId} />
              <ProfileInfoRow label="Email" value={user.email} />
              <ProfileInfoRow label="Department" value={user.department} />
              <ProfileInfoRow label="Role" value={user.role} isLast />
            </View>
          </GlassCard>

          <Text style={styles.sectionTitle}>Account Settings</Text>
          <GlassCard noPadding style={styles.menuCard}>
            <ProfileMenuItem
              icon={Pencil}
              label="Edit Profile"
              onPress={() => setActiveModal('edit')}
            />
            <ProfileMenuItem
              icon={KeyRound}
              label="Change Password"
              onPress={() => setActiveModal('password')}
              showDivider={false}
            />
          </GlassCard>

          <GlassCard noPadding style={styles.logoutCard}>
            <ProfileMenuItem
              icon={LogOut}
              label="Logout"
              onPress={handleLogout}
              destructive
              showDivider={false}
            />
          </GlassCard>

          <View style={styles.footer}>
            <Text style={styles.footerBrand}>{APP_NAME}</Text>
            <Text style={styles.footerCopyright}>{APP_COPYRIGHT}</Text>
          </View>
        </ScrollView>

        <ProfileModal
          visible={activeModal === 'edit'}
          title="Edit Profile"
          onClose={closeModal}
        >
          <Controller
            control={editForm.control}
            name="name"
            rules={{ required: 'Full name is required' }}
            render={({ field: { onChange, onBlur, value }, fieldState }) => (
              <InputField
                label="Full Name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={editForm.control}
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
                keyboardType="email-address"
                autoCapitalize="none"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={editForm.control}
            name="mobileNumber"
            rules={{ required: 'Mobile number is required' }}
            render={({ field: { onChange, onBlur, value }, fieldState }) => (
              <InputField
                label="Mobile Number"
                keyboardType="phone-pad"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <View style={styles.readOnlyBox}>
            <Text style={styles.readOnlyLabel}>Employee ID</Text>
            <Text style={styles.readOnlyValue}>{user.employeeId}</Text>
            <Text style={styles.readOnlyHint}>Managed by HR · cannot be edited</Text>
          </View>
          <PrimaryButton
            label="Save Changes"
            onPress={handleSaveProfile}
            loading={saving}
            style={styles.modalAction}
          />
          <PrimaryButton label="Cancel" variant="outline" onPress={closeModal} />
        </ProfileModal>

        <ProfileModal
          visible={activeModal === 'password'}
          title="Change Password"
          onClose={closeModal}
        >
          <Controller
            control={passwordForm.control}
            name="currentPassword"
            rules={{ required: 'Current password is required' }}
            render={({ field: { onChange, onBlur, value }, fieldState }) => (
              <InputField
                label="Current Password"
                isPassword
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={passwordForm.control}
            name="newPassword"
            rules={{
              required: 'New password is required',
              minLength: { value: 8, message: 'Minimum 8 characters' },
            }}
            render={({ field: { onChange, onBlur, value }, fieldState }) => (
              <InputField
                label="New Password"
                isPassword
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={passwordForm.control}
            name="confirmPassword"
            rules={{ required: 'Please confirm your new password' }}
            render={({ field: { onChange, onBlur, value }, fieldState }) => (
              <InputField
                label="Confirm New Password"
                isPassword
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <PrimaryButton
            label="Update Password"
            onPress={handleChangePassword}
            loading={saving}
            style={styles.modalAction}
          />
          <PrimaryButton label="Cancel" variant="outline" onPress={closeModal} />
        </ProfileModal>

      </SafeAreaView>
  );
}

function ProfileModal({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8} style={styles.modalClose}>
              <X size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  heroCard: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    paddingVertical: spacing.xxl,
  },
  avatarRing: {
    padding: 3,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primaryLight,
    letterSpacing: 1,
  },
  heroIdentity: {
    width: '100%',
    alignItems: 'center',
  },
  fullName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    textAlign: 'center',
    width: '100%',
  },
  employeeIdLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  employeeId: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.8,
    textAlign: 'center',
    width: '100%',
    marginBottom: spacing.lg,
  },
  lastLoginBlock: {
    width: '100%',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  lastLoginLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
    textAlign: 'center',
  },
  lastLogin: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.md,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
  },
  infoCard: {
    marginBottom: spacing.xxl,
  },
  infoInner: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  menuCard: {
    marginBottom: spacing.lg,
  },
  logoutCard: {
    marginBottom: spacing.xl,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  footerBrand: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textAlign: 'center',
  },
  footerCopyright: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  modalClose: {
    padding: spacing.xs,
  },
  modalAction: {
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  readOnlyBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  readOnlyLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  readOnlyValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  readOnlyHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 6,
  },
});
