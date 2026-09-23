import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { AppHeader } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { useAuth } from '../state/AuthContext';
import { TwoFactorRequiredError, AccountPendingError } from '../data/api';
import { useNavigation } from '../navigation/NavigationContext';
import { isBiometricAvailable, promptBiometric, biometryLabel } from '../lib/biometric';
import type { BiometryType } from 'react-native-biometrics';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

const GOOGLE_WEB_CLIENT_ID =
  '866135422582-6d1joa5old61o8re0k3uv10ok4kc538u.apps.googleusercontent.com';
const REMEMBERED_EMAIL_KEY = '@jemina/last_email';

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: false,
});

type IdMode = 'email' | 'pin';

export function LoginScreen() {
  const { login, loginWithPin, loginWithGoogle } = useAuth();
  const { goBack, navigate, finishAuthFlow } = useNavigation();
  const [idMode, setIdMode] = useState<IdMode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [bio, setBio] = useState<{ available: boolean; type: BiometryType | null }>({ available: false, type: null });
  const [bioLoading, setBioLoading] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setBio).catch(() => setBio({ available: false, type: null }));
  }, []);

  const handleLogin = async () => {
    setError(null);

    if (idMode === 'pin') {
      if (pin.trim().length !== 4) {
        setError('Enter your 4-digit Trader PIN.');
        return;
      }
      setLoading(true);
      try {
        const remembered = (await AsyncStorage.getItem(REMEMBERED_EMAIL_KEY).catch(() => null))?.trim();
        if (!remembered) {
          setError('No saved email for PIN sign-in. Sign in with your email first, then use your PIN next time.');
          return;
        }
        await loginWithPin(remembered, pin.trim());
        finishAuthFlow();
      } catch (e) {
        if (e instanceof TwoFactorRequiredError) {
          navigate('TwoFactor', { email: e.email, resendAfter: e.resendAfter });
          return;
        }
        if (e instanceof AccountPendingError) {
          navigate('AccountPending', { email: e.email, deactivated: e.deactivated });
          return;
        }
        setError(e instanceof Error ? e.message : 'PIN sign-in failed. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim()).catch(() => {});
      finishAuthFlow();
    } catch (e) {
      if (e instanceof TwoFactorRequiredError) {
        navigate('TwoFactor', { email: e.email, resendAfter: e.resendAfter });
        return;
      }
      if (e instanceof AccountPendingError) {
        navigate('AccountPending', { email: e.email, deactivated: e.deactivated });
        return;
      }
      setError(e instanceof Error ? e.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      if (userInfo.type === 'cancelled') return;
      const idToken = userInfo.data?.idToken;
      if (!idToken) throw new Error('Google sign-in did not return an authentication token.');
      await loginWithGoogle(idToken);
      finishAuthFlow();
    } catch (e) {
      if (e instanceof TwoFactorRequiredError) {
        navigate('TwoFactor', { email: e.email, resendAfter: e.resendAfter });
        return;
      }
      if (e instanceof AccountPendingError) {
        navigate('AccountPending', { email: e.email, deactivated: e.deactivated });
        return;
      }
      setError(e instanceof Error ? e.message : 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setError(null);
    if (!bio.available) {
      setError('Biometrics are not available on this device.');
      return;
    }
    setBioLoading(true);
    try {
      const ok = await promptBiometric('Sign in with ' + biometryLabel(bio.type));
      if (ok) {
        // Prefill the remembered email; the user still completes the password step.
        const remembered = await AsyncStorage.getItem(REMEMBERED_EMAIL_KEY).catch(() => null);
        if (remembered) setEmail(remembered);
        setError('Biometric verified. Enter your password to continue.');
      }
    } finally {
      setBioLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <AppHeader showBack onBack={goBack} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Brand hero */}
          <View style={styles.hero}>
            <View style={styles.shieldRow}>
              <Icon name="verified-user" size={14} color={colors.statusSuccess} />
              <Text style={styles.bouBadge}>BOU ESCROW PROTECTED</Text>
            </View>
            <Text style={styles.brandTitle}>JEMINA</Text>
            <Text style={styles.brandSub}>MARKETPLACE</Text>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Access your trade escrow wallet, orders and live depot auctions.</Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Icon name="info" size={18} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            {/* Login method toggle */}
            <View style={styles.modeRow}>
              {(['email', 'pin'] as IdMode[]).map(mode => (
                <Pressable
                  key={mode}
                  style={[styles.modeChip, idMode === mode && styles.modeChipOn]}
                  onPress={() => {
                    setIdMode(mode);
                    setError(null);
                  }}
                >
                  <Text style={[styles.modeChipTxt, idMode === mode && styles.modeChipTxtOn]}>
                    {mode === 'email' ? 'Email' : 'Trader PIN'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {idMode === 'email' ? (
              <>
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

                <Pressable style={styles.forgotRow} onPress={() => setError(null)}>
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.label}>Trader PIN</Text>
                <View style={styles.inputWrap}>
                  <Icon name="fingerprint" size={20} color={colors.outline} />
                  <TextInput
                    style={[styles.input, styles.pinInput]}
                    value={pin}
                    onChangeText={t => setPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
                    placeholder="••••"
                    placeholderTextColor={colors.outline}
                    keyboardType="number-pad"
                    secureTextEntry
                    maxLength={4}
                    autoFocus
                  />
                </View>
                <Text style={styles.pinHint}>Enter the 4-digit PIN you use for escrow &amp; Trade PIN actions.</Text>
              </>
            )}

            <Button
              label={
                loading
                  ? 'Signing in...'
                  : idMode === 'pin'
                    ? 'Sign In with PIN'
                    : 'Sign In to JEMINA'
              }
              variant="primary"
              icon="arrow-forward"
              fullWidth
              onPress={handleLogin}
              style={styles.submitBtn}
            />

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerLabel}>OR CONTINUE WITH</Text>
              <View style={styles.divider} />
            </View>

            <Pressable style={({ pressed }) => [styles.googleBtn, pressed && styles.googleBtnPressed]} onPress={handleGoogleLogin} disabled={googleLoading}>
              <GoogleMark />
              <Text style={styles.googleLabel}>{googleLoading ? 'Signing in with Google...' : 'Continue with Google'}</Text>
            </Pressable>

            {bio.available ? (
              <Pressable style={({ pressed }) => [styles.bioBtn, pressed && styles.googleBtnPressed]} onPress={handleBiometricLogin} disabled={bioLoading}>
                <Icon name="fingerprint" size={20} color={colors.primary} />
                <Text style={styles.bioLabel}>
                  {bioLoading ? 'Verifying...' : `Fast Login with ${biometryLabel(bio.type)}`}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>New to JEMINA? </Text>
            <Pressable onPress={() => navigate('Register')}>
              <Text style={styles.footerLink}>Create an Account</Text>
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
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.md, paddingBottom: spacing.xl },
  hero: { alignItems: 'center', justifyContent: 'center', marginTop: spacing.md, marginBottom: spacing.md },
  shieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#ecfdf5', borderRadius: radius.full, paddingHorizontal: spacing.sm + 2, paddingVertical: 4, marginBottom: spacing.sm },
  bouBadge: { ...typography.labelSm, color: '#065f46', fontWeight: '700', letterSpacing: 0.6 },
  brandTitle: { ...typography.displayLgMobile, color: colors.primary, fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
  brandSub: { ...typography.labelMd, color: colors.secondary, fontWeight: '700', letterSpacing: 4, marginTop: 2, textAlign: 'center' },
  title: { ...typography.headlineLg, color: colors.onSurface, textAlign: 'center', alignSelf: 'center', marginTop: spacing.sm },
  subtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center', alignSelf: 'center', marginTop: 2, maxWidth: 320 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.errorContainer, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg },
  errorText: { ...typography.bodyMd, color: colors.onErrorContainer, flex: 1 },
  form: { backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.lg, padding: spacing.md },
  modeRow: { flexDirection: 'row', backgroundColor: colors.surfaceContainerLow, borderRadius: radius.lg, padding: 4, marginBottom: spacing.sm },
  modeChip: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.md },
  modeChipOn: { backgroundColor: colors.primaryContainer },
  modeChipTxt: { ...typography.labelMd, color: colors.onSurfaceVariant, fontWeight: '600' },
  modeChipTxtOn: { color: colors.onPrimary, fontWeight: '700' },
  label: { ...typography.labelMd, color: colors.onSurface, fontWeight: '700', marginBottom: spacing.xs + 2, marginTop: spacing.md },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.lg, paddingHorizontal: spacing.md },
  input: { flex: 1, ...typography.bodyMd, color: colors.onSurface, paddingVertical: spacing.sm + 2 },
  pinInput: { letterSpacing: 8, textAlign: 'center', fontWeight: '700' },
  pinHint: { ...typography.labelSm, color: colors.outline, marginTop: 6, textAlign: 'center' },
  forgotRow: { alignItems: 'flex-end', marginTop: spacing.sm },
  forgotText: { ...typography.labelMd, color: colors.secondary, fontWeight: '700' },
  submitBtn: { marginTop: spacing.md, paddingVertical: spacing.sm + 2 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  divider: { flex: 1, height: 1, backgroundColor: colors.borderLight },
  dividerLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.lg, paddingVertical: spacing.sm + 2, marginTop: spacing.md },
  bioBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.primaryContainer, borderRadius: radius.lg, paddingVertical: spacing.sm + 2, marginTop: spacing.sm },
  googleBtnPressed: { opacity: 0.85 },
  googleLabel: { ...typography.labelMd, color: colors.onSurface, fontWeight: '700' },
  bioLabel: { ...typography.labelMd, color: colors.primary, fontWeight: '700' },
  googleMark: { flexDirection: 'row', alignItems: 'center' },
  googleMarkLetter: { fontSize: 18, fontWeight: '700' },
  googleBlue: { color: '#4285F4' },
  googleRed: { color: '#EA4335' },
  googleYellow: { color: '#FBBC05' },
  googleGreen: { color: '#34A853' },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.md, flexWrap: 'wrap' },
  footerText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  footerLink: { ...typography.bodyMd, color: colors.secondary, fontWeight: '700' },
});