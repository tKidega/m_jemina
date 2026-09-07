import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { apiResendTwoFactorCode } from '../data/api';
import { subscribeToSecurityCode } from '../lib/notifications';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 1) {
    return email;
  }
  return email[0] + '***' + email.slice(at);
}

export function TwoFactorScreen() {
  const { completeTwoFactorLogin } = useAuth();
  const { params, goBack } = useNavigation();
  const email = String(params?.email ?? '');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(Math.max(0, Number(params?.resendAfter ?? 0)));
  const [resending, setResending] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToSecurityCode(pushCode => {
      setCode(pushCode.replace(/[^0-9]/g, '').slice(0, 6));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }
    const timer = setInterval(() => {
      setResendCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerify = async () => {
    setError(null);
    if (code.trim().length !== 6) {
      setError('Enter the 6-digit code sent to your email.');
      return;
    }
    setLoading(true);
    try {
      await completeTwoFactorLogin(email, code);
      goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setResending(true);
    try {
      const wait = await apiResendTwoFactorCode(email);
      setResendCooldown(Math.max(0, Number(wait) || 30));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resend the code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.root}>
      <AppHeader showBack onBack={goBack} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.logoBadge}>
              <Icon name="lock" size={48} color={colors.secondary} />
            </View>
            <Text style={styles.title}>Two-factor verification</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to {email ? maskEmail(email) : 'your email'}.
            </Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Icon name="info" size={18} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <Text style={styles.label}>Verification Code</Text>
            <TextInput
              ref={inputRef}
              style={[styles.codeInput, code.length === 6 && styles.codeInputFilled]}
              value={code}
              onChangeText={text => setCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="000000"
              placeholderTextColor={colors.outline}
              keyboardType="number-pad"
              autoCorrect={false}
              maxLength={6}
            />

            <Button
              label={loading ? 'Verifying...' : 'Verify & Sign In'}
              variant="primary"
              fullWidth
              onPress={handleVerify}
              style={styles.submitBtn}
            />

            <View style={styles.resendRow}>
              <Text style={styles.resendHint}>Didn't receive it?</Text>
              {resendCooldown > 0 ? (
                <Text style={styles.resendCountdown}>Resend code in {resendCooldown}s</Text>
              ) : (
                <Button
                  label={resending ? 'Sending...' : 'Resend code'}
                  variant="ghost"
                  onPress={handleResend}
                  disabled={resending}
                />
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  hero: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  logoBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.displayLgMobile,
    color: colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorContainer,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.onErrorContainer,
    flex: 1,
  },
  form: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  label: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  codeInput: {
    ...typography.displayLgMobile,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    textAlign: 'center',
    letterSpacing: 10,
    marginBottom: spacing.lg,
  },
  codeInputFilled: {
    borderColor: colors.secondary,
  },
  submitBtn: {
    paddingVertical: spacing.lg,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  resendHint: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  resendCountdown: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
});