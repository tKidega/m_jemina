import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { AppHeader } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { useAuth } from '../state/AuthContext';
import { TwoFactorRequiredError } from '../data/api';
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

type IdMode = 'email' | 'phone';

export function LoginScreen() {
  const { login, loginWithGoogle } = useAuth();
  const { goBack, navigate } = useNavigation();
  const [idMode, setIdMode] = useState<IdMode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    if (!email.trim() || !password) {
      setError(idMode === 'email' ? 'Enter your email and password.' : 'Enter your trader ID and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim()).catch(() => {});
      goBack();
    } catch (e) {
      if (e instanceof TwoFactorRequiredError) {
        navigate('TwoFactor', { email: e.email, resendAfter: e.resendAfter });
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
      goBack();
    } catch (e) {
      if (e instanceof TwoFactorRequiredError) {
        navigate('TwoFactor', { email: e.email, resendAfter: e.resendAfter });
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
            {/* ID mode toggle */}
            <View style={styles.modeRow}>
              {(['email', 'phone'] as IdMode[]).map(mode => (
                <Pressable key={mode} style={[styles.modeChip, idMode === mode && styles.modeChipOn]} onPress={() => setIdMode(mode)}>
                  <Text style={[styles.modeChipTxt, idMode === mode && styles.modeChipTxtOn]}>
                    {mode === 'email' ? 'Email / Trader ID' : 'Phone / MoMo'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>{idMode === 'email' ? 'Trader ID or Email' : 'Registered MoMo Number'}</Text>
            <View style={styles.inputWrap}>
              <Icon name="person" size={20} color={colors.outline} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder={idMode === 'email' ? 'you@example.com' : '+256 7•• ••• •••'}
                placeholderTextColor={colors.outline}
                keyboardType={idMode === 'email' ? 'email-address' : 'phone-pad'}
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

            <Button
              label={loading ? 'Signing in...' : 'Sign In to JEMINA'}
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
  content: { flexGrow: 1, padding: spacing.xl, paddingBottom: spacing.xxl },
  hero: { alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl, marginBottom: spacing.lg },
  shieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#ecfdf5', borderRadius: radius.full, paddingHorizontal: spacing.sm + 2, paddingVertical: 4, marginBottom: spacing.sm },
  bouBadge: { ...typography.labelSm, color: '#065f46', fontWeight: '700', letterSpacing: 0.6 },
  brandTitle: { ...typography.displayLgMobile, color: colors.primary, fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
  brandSub: { ...typography.labelMd, color: colors.secondary, fontWeight: '700', letterSpacing: 4, marginTop: 2, textAlign: 'center' },
  title: { ...typography.headlineLg, color: colors.onSurface, textAlign: 'center', alignSelf: 'center', marginTop: spacing.lg },
  subtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center', alignSelf: 'center', marginTop: spacing.sm, maxWidth: 320 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.errorContainer, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg },
  errorText: { ...typography.bodyMd, color: colors.onErrorContainer, flex: 1 },
  form: { backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.xl, padding: spacing.xl },
  modeRow: { flexDirection: 'row', backgroundColor: colors.surfaceContainerLow, borderRadius: radius.lg, padding: 4, marginBottom: spacing.sm },
  modeChip: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.md },
  modeChipOn: { backgroundColor: colors.primaryContainer },
  modeChipTxt: { ...typography.labelMd, color: colors.onSurfaceVariant, fontWeight: '600' },
  modeChipTxtOn: { color: colors.onPrimary, fontWeight: '700' },
  label: { ...typography.labelMd, color: colors.onSurface, fontWeight: '700', marginBottom: spacing.sm, marginTop: spacing.md },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.lg, paddingHorizontal: spacing.md },
  input: { flex: 1, ...typography.bodyMd, color: colors.onSurface, paddingVertical: spacing.md },
  forgotRow: { alignItems: 'flex-end', marginTop: spacing.md },
  forgotText: { ...typography.labelMd, color: colors.secondary, fontWeight: '700' },
  submitBtn: { marginTop: spacing.xl, paddingVertical: spacing.lg },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
  divider: { flex: 1, height: 1, backgroundColor: colors.borderLight },
  dividerLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.lg, paddingVertical: spacing.lg, marginTop: spacing.lg },
  bioBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.primaryContainer, borderRadius: radius.lg, paddingVertical: spacing.lg, marginTop: spacing.sm },
  googleBtnPressed: { opacity: 0.85 },
  googleLabel: { ...typography.labelMd, color: colors.onSurface, fontWeight: '700' },
  bioLabel: { ...typography.labelMd, color: colors.primary, fontWeight: '700' },
  googleMark: { flexDirection: 'row', alignItems: 'center' },
  googleMarkLetter: { fontSize: 18, fontWeight: '700' },
  googleBlue: { color: '#4285F4' },
  googleRed: { color: '#EA4335' },
  googleYellow: { color: '#FBBC05' },
  googleGreen: { color: '#34A853' },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl, flexWrap: 'wrap' },
  footerText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  footerLink: { ...typography.bodyMd, color: colors.secondary, fontWeight: '700' },
});