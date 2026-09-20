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

export function RegisterScreen() {
  const { register } = useAuth();
  const { goBack, navigate, finishAuthFlow } = useNavigation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      finishAuthFlow();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
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
            <View style={styles.shieldRow}>
              <Icon name="verified-user" size={14} color={colors.statusSuccess} />
              <Text style={styles.bouBadge}>ESCROW SECURE</Text>
            </View>
            <Text style={styles.brandTitle}>JEMINA</Text>
            <Text style={styles.brandSub}>MARKETPLACE</Text>
            <Text style={styles.title}>Create an Account</Text>
            <Text style={styles.subtitle}>Join JEMINA to shop, track orders and more.</Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Icon name="info" size={18} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputWrap}>
              <Icon name="person-outline" size={20} color={colors.outline} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="John Doe"
                placeholderTextColor={colors.outline}
                autoCapitalize="words"
              />
            </View>

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
                placeholder="At least 6 characters"
                placeholderTextColor={colors.outline}
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword(s => !s)} hitSlop={8}>
                <Icon name={showPassword ? 'visibility-off' : 'visibility'} size={20} color={colors.outline} />
              </Pressable>
            </View>

            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputWrap}>
              <Icon name="lock" size={20} color={colors.outline} />
              <TextInput
                style={styles.input}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Re-enter your password"
                placeholderTextColor={colors.outline}
                secureTextEntry={!showPassword}
              />
            </View>

            <Button
              label={loading ? 'Creating account...' : 'Create Account'}
              variant="primary"
              fullWidth
              onPress={handleRegister}
              style={styles.submitBtn}
            />
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable onPress={() => navigate('Login')}>
              <Text style={styles.footerLink}>Sign in</Text>
            </Pressable>
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
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  shieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#ecfdf5', borderRadius: radius.full, paddingHorizontal: spacing.sm + 2, paddingVertical: 4, marginBottom: spacing.sm },
  bouBadge: { ...typography.labelSm, color: '#065f46', fontWeight: '700', letterSpacing: 0.6 },
  brandTitle: { ...typography.displayLgMobile, color: colors.primary, fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
  brandSub: { ...typography.labelMd, color: colors.secondary, fontWeight: '700', letterSpacing: 4, marginTop: 2, textAlign: 'center' },
  title: {
    ...typography.headlineLg,
    color: colors.onSurface,
    textAlign: 'center',
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    alignSelf: 'center',
    marginTop: 2,
    maxWidth: 320,
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
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  label: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
    marginBottom: spacing.xs + 2,
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
    paddingVertical: spacing.sm + 2,
  },
  submitBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
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
