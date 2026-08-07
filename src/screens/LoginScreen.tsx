import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

export function LoginScreen() {
  const { login, loginWithGoogle } = useAuth();
  const { goBack, navigate } = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
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
              <Icon name="account-circle" size={56} color={colors.secondary} />
            </View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to your account to continue shopping.</Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Icon name="info" size={18} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWrap}>
              <Icon name="email" size={20} color={colors.outline} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.outline}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <Icon name="lock" size={20} color={colors.outline} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={colors.outline}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable onPress={() => setShowPassword(s => !s)} hitSlop={8}>
                <Icon name={showPassword ? 'visibility-off' : 'visibility'} size={20} color={colors.outline} />
              </Pressable>
            </View>

            <Pressable style={styles.forgotRow}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </Pressable>

            <Button
              label={loading ? 'Signing in...' : 'Sign In'}
              variant="primary"
              fullWidth
              onPress={handleLogin}
              style={styles.submitBtn}
            />

            <View style={styles.demoBox}>
              <Text style={styles.demoText}>Continue with Google to sign in as the Demo Account</Text>
              <Text style={styles.demoSubtext}>No Google account needed — instant demo access</Text>
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerLabel}>OR CONTINUE WITH</Text>
              <View style={styles.divider} />
            </View>

            <Pressable
              style={({ pressed }) => [styles.googleBtn, pressed && styles.googleBtnPressed]}
              onPress={handleGoogleLogin}
              disabled={googleLoading}
            >
              <GoogleMark />
              <Text style={styles.googleLabel}>
                {googleLoading ? 'Signing in with Google...' : 'Continue with Google'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Pressable onPress={() => navigate('Register')}>
              <Text style={styles.footerLink}>Create one</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function GoogleMark() {
  return (
    <View style={styles.googleMark}>
      <Text style={[styles.googleMarkLetter, styles.googleBlue]}>G</Text>
      <Text style={[styles.googleMarkLetter, styles.googleRed]}>o</Text>
      <Text style={[styles.googleMarkLetter, styles.googleYellow]}>o</Text>
      <Text style={[styles.googleMarkLetter, styles.googleBlue]}>g</Text>
      <Text style={[styles.googleMarkLetter, styles.googleGreen]}>l</Text>
      <Text style={[styles.googleMarkLetter, styles.googleRed]}>e</Text>
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
    width: 96,
    height: 96,
    borderRadius: 48,
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
    marginTop: spacing.md,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
    paddingVertical: spacing.md,
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: spacing.md,
  },
  forgotText: {
    ...typography.labelMd,
    color: colors.secondary,
    fontWeight: '700',
  },
  submitBtn: {
    marginTop: spacing.xl,
    paddingVertical: spacing.lg,
  },
  demoBox: {
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  demoText: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  demoSubtext: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  dividerLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.lg,
  },
  googleBtnPressed: {
    opacity: 0.85,
  },
  googleLabel: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  googleMark: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleMarkLetter: {
    fontSize: 18,
    fontWeight: '700',
  },
  googleBlue: {
    color: '#4285F4',
  },
  googleRed: {
    color: '#EA4335',
  },
  googleYellow: {
    color: '#FBBC05',
  },
  googleGreen: {
    color: '#34A853',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  footerLink: {
    ...typography.bodyMd,
    color: colors.secondary,
    fontWeight: '700',
  },
});
