import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from './Icon';
import { Button } from './Button';
import { Toast } from './Toast';
import { useAuth } from '../state/AuthContext';
import { apiGetPinStatus, apiVerifyPinDetailed, apiSendOtp, apiResetPin } from '../data/api';
import { useNavigation } from '../navigation/NavigationContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

const MAX_LEN = 4;

// Module-level unlock cache — a successful PIN unlocks a given screen for a short
// window only (UNLOCK_TTL_MS), after which the PIN is required again.
const UNLOCK_TTL_MS = 10000;
const unlocked: Record<string, number> = {};

interface PinGateScreenProps {
  gateKey: string; // e.g. 'cart' | 'account'
  label: string; // e.g. 'Cart' | 'Account'
  children: React.ReactNode;
}

type Mode = 'pin' | 'otp' | 'newpin';

export function PinProtectedScreen({ gateKey, label, children }: PinGateScreenProps) {
  const { token, isAuthenticated } = useAuth();
  const { switchTab } = useNavigation();
  const [checking, setChecking] = useState(isAuthenticated && !!token);
  const [required, setRequired] = useState(false);
  const [entered, setEntered] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Reset flow state
  const [mode, setMode] = useState<Mode>('pin');
  const [otp, setOtp] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2200);
  };

  const isUnlocked = (key: string): boolean => {
    const until = unlocked[key];
    return !!until && Date.now() < until;
  };

  const check = useCallback(async () => {
    if (!token || !isAuthenticated) {
      setChecking(false);
      return;
    }
    if (isUnlocked(gateKey)) {
      setRequired(false);
      setChecking(false);
      return;
    }
    try {
      const s = await apiGetPinStatus(token).catch(() => null);
      const gateOn = !!s?.pin_gate_enabled && !!s?.pin_set;
      setRequired(gateOn);
      if (!gateOn) unlocked[gateKey] = Date.now() + UNLOCK_TTL_MS;
    } catch {
      setRequired(false);
    } finally {
      setChecking(false);
    }
  }, [token, isAuthenticated, gateKey]);

  useEffect(() => {
    setChecking(isAuthenticated && !!token);
    check();
  }, [check, isAuthenticated, token]);

  const press = (d: string) => {
    if (entered.length < MAX_LEN) setEntered(p => p + d);
  };
  const del = () => setEntered(p => p.slice(0, -1));

  const verify = async () => {
    if (entered.length !== MAX_LEN) {
      setErr('Enter your 4-digit JEMINA PIN.');
      return;
    }
    setSubmitting(true);
    setErr('');
    try {
      const r = await apiVerifyPinDetailed(token!, entered);
      if (r.verified) {
        unlocked[gateKey] = Date.now() + UNLOCK_TTL_MS;
        setRequired(false);
        setEntered('');
        showToast('PIN verified');
      } else if (r.pin_lockout) {
        setErr('Security lockout active. You can reset your PIN below.');
        setEntered('');
      } else {
        setErr(
          `Incorrect PIN entered. ${r.attempts_remaining} attempt${r.attempts_remaining === 1 ? '' : 's'} remaining before temporary lockout.`,
        );
        setEntered('');
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not verify PIN.');
      setEntered('');
    } finally {
      setSubmitting(false);
    }
  };

  const startReset = async () => {
    setErr('');
    setSubmitting(true);
    try {
      await apiSendOtp(token!, 'mtn', 'pin_reset');
      setMode('otp');
      setOtp('');
      showToast('A 6-digit code has been sent to your registered MoMo number.', 'success');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not send the reset code.');
    } finally {
      setSubmitting(false);
    }
  };

  const doReset = async () => {
    if (otp.length !== 6) {
      setErr('Enter the 6-digit code.');
      return;
    }
    if (newPin.length !== MAX_LEN || confirmPin.length !== MAX_LEN) {
      setErr('Create and confirm your new 4-digit PIN.');
      return;
    }
    if (newPin !== confirmPin) {
      setErr('PINs do not match.');
      return;
    }
    setSubmitting(true);
    setErr('');
    try {
      await apiResetPin(token!, otp, newPin);
      // Reset clears the lockout + sets the new PIN — unlock the gate now.
      unlocked[gateKey] = Date.now() + UNLOCK_TTL_MS;
      setRequired(false);
      setMode('pin');
      setOtp('');
      setNewPin('');
      setConfirmPin('');
      setEntered('');
      showToast('PIN reset successfully. Unlocked!', 'success');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not reset PIN. Check the code.');
    } finally {
      setSubmitting(false);
    }
  };

  const backToPin = () => {
    setMode('pin');
    setErr('');
    setOtp('');
    setNewPin('');
    setConfirmPin('');
  };

  if (checking) {
    return null;
  }

  return (
    <>
      {children}
      <Modal visible={required} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={s.overlay}>
          <View style={s.card}>
            <View style={s.iconWrap}>
              <Icon name="lock" size={30} color={colors.onPrimary} />
            </View>

            {mode === 'pin' && (
              <>
                <Text style={s.title}>Enter JEMINA PIN</Text>
                <Text style={s.sub}>Your PIN is required to open {label}.</Text>

                <View style={s.dots}>
                  {[0, 1, 2, 3].map(i => (
                    <View key={i} style={[s.dot, i < entered.length && s.dotOn]}>
                      {i < entered.length ? <View style={s.dotFill} /> : null}
                    </View>
                  ))}
                </View>

                {err ? (
                  <View style={s.errBox}>
                    <Icon name="error-outline" size={16} color={colors.statusFlash} />
                    <Text style={s.errTxt}>{err}</Text>
                  </View>
                ) : null}

                <View style={s.keypad}>
                  {['1','2','3','4','5','6','7','8','9'].map(d => (
                    <Pressable key={d} style={s.keyBtn} onPress={() => press(d)}>
                      <Text style={s.keyTxt}>{d}</Text>
                    </Pressable>
                  ))}
                  <View style={s.keyBtn} />
                  <Pressable style={s.keyBtn} onPress={() => press('0')}><Text style={s.keyTxt}>0</Text></Pressable>
                  <Pressable style={s.keyBtn} onPress={del}><Icon name="backspace" size={22} color={colors.outline} /></Pressable>
                </View>

                <Button label={submitting ? 'Verifying...' : 'Unlock'} variant="primary" icon="lock" fullWidth
                  onPress={verify} disabled={submitting || entered.length !== MAX_LEN} />

                <Pressable style={s.forgotBtn} onPress={startReset} disabled={submitting}>
                  <Icon name="lock-reset" size={14} color={colors.statusFlash} />
                  <Text style={s.forgotTxt}>Forgot PIN? Reset via MTN MoMo OTP</Text>
                </Pressable>

                <Pressable style={s.cancelBtn} onPress={() => switchTab('Home')}>
                  <Text style={s.cancelTxt}>Cancel & Return to Home</Text>
                </Pressable>
              </>
            )}

            {mode === 'otp' && (
              <>
                <Text style={s.title}>Enter Reset Code</Text>
                <Text style={s.sub}>A 6-digit code was sent to your registered MoMo number.</Text>
                <TextInput
                  style={s.codeInput}
                  value={otp}
                  onChangeText={t => setOtp(t.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="000000"
                  placeholderTextColor={colors.outline}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                {err ? (
                  <View style={s.errBox}>
                    <Icon name="error-outline" size={16} color={colors.statusFlash} />
                    <Text style={s.errTxt}>{err}</Text>
                  </View>
                ) : null}
                <Button label={submitting ? 'Sending...' : 'Continue'} variant="primary" icon="arrow-forward" fullWidth
                  onPress={() => { setMode('newpin'); setErr(''); }} disabled={otp.length !== 6} />
                <View style={s.flexRow}>
                  <Pressable style={s.linkBtn} onPress={backToPin}><Text style={s.linkTxt}>Back</Text></Pressable>
                  <Pressable style={s.linkBtn} onPress={startReset} disabled={submitting}><Text style={s.forgotTxt}>Resend code</Text></Pressable>
                </View>
              </>
            )}

            {mode === 'newpin' && (
              <>
                <Text style={s.title}>Set New PIN</Text>
                <Text style={s.sub}>Choose a new 4-digit JEMINA PIN.</Text>
                <View style={s.dots}>
                  {[0, 1, 2, 3].map(i => (
                    <View key={i} style={[s.dot, i < newPin.length && s.dotOn]}>
                      {i < newPin.length ? <View style={s.dotFill} /> : null}
                    </View>
                  ))}
                </View>
                <View style={s.dots}>
                  {[0, 1, 2, 3].map(i => (
                    <View key={i} style={[s.dot, i < confirmPin.length && s.dotOn]}>
                      {i < confirmPin.length ? <View style={s.dotFill} /> : null}
                    </View>
                  ))}
                </View>
                <View style={s.keypad}>
                  {['1','2','3','4','5','6','7','8','9'].map(d => (
                    <Pressable key={d} style={s.keyBtn} onPress={() => {
                      if (newPin.length < MAX_LEN) setNewPin(p => p + d);
                      else if (confirmPin.length < MAX_LEN) setConfirmPin(p => p + d);
                    }}>
                      <Text style={s.keyTxt}>{d}</Text>
                    </Pressable>
                  ))}
                  <View style={s.keyBtn} />
                  <Pressable style={s.keyBtn} onPress={() => {
                    if (confirmPin.length > 0) setConfirmPin(p => p.slice(0, -1));
                    else setNewPin(p => p.slice(0, -1));
                  }}><Icon name="backspace" size={22} color={colors.outline} /></Pressable>
                </View>
                {err ? (
                  <View style={s.errBox}>
                    <Icon name="error-outline" size={16} color={colors.statusFlash} />
                    <Text style={s.errTxt}>{err}</Text>
                  </View>
                ) : null}
                <Button label={submitting ? 'Resetting...' : 'Reset PIN & Unlock'} variant="primary" icon="lock-reset" fullWidth
                  onPress={doReset} disabled={submitting || newPin.length !== MAX_LEN || confirmPin.length !== MAX_LEN} />
                <Pressable style={s.cancelBtn} onPress={backToPin}><Text style={s.cancelTxt}>Back</Text></Pressable>
              </>
            )}
          </View>
        </View>
        <Toast message={toast ? toast.msg : ''} type={toast ? toast.type : 'success'} visible={!!toast} onDone={() => setToast(null)} />
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(8,19,29,0.7)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: { width: '100%', maxWidth: 360, backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl, padding: spacing.lg },
  iconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  title: { ...typography.headlineSm, color: colors.onSurface, fontWeight: '700', textAlign: 'center', marginTop: spacing.sm },
  sub: { ...typography.bodySm, color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 4, lineHeight: 17 },
  dots: { flexDirection: 'row', gap: 14, justifyContent: 'center', marginVertical: spacing.md },
  dot: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 2, borderColor: colors.primaryContainer, backgroundColor: colors.surfaceContainerLowest, alignItems: 'center', justifyContent: 'center' },
  dotOn: { borderColor: colors.secondary },
  dotFill: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.primaryContainer },
  errBox: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', backgroundColor: colors.errorContainer, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm },
  errTxt: { ...typography.bodySm, color: colors.statusFlash, flex: 1, lineHeight: 15, fontWeight: '600' },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  keyBtn: { width: '30%', height: 44, borderRadius: radius.md, backgroundColor: colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  keyTxt: { ...typography.headlineSm, color: colors.primary, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: spacing.sm, marginTop: spacing.xs },
  cancelTxt: { ...typography.labelMd, color: colors.outline, fontWeight: '600' },
  forgotBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.sm, marginTop: spacing.xs },
  forgotTxt: { ...typography.labelMd, color: colors.statusFlash, fontWeight: '600' },
  codeInput: {
    ...typography.headlineSm,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    textAlign: 'center',
    letterSpacing: 8,
    marginVertical: spacing.md,
  },
  flexRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  linkBtn: { paddingVertical: spacing.sm },
  linkTxt: { ...typography.labelMd, color: colors.outline, fontWeight: '600' },
});