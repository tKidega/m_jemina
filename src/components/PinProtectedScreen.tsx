import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { Button } from './Button';
import { Toast } from './Toast';
import { useAuth } from '../state/AuthContext';
import { apiGetPinStatus, apiVerifyPinDetailed } from '../data/api';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

const MAX_LEN = 4;

// Module-level session unlock cache — once verified, stays unlocked this app session.
const unlocked: Record<string, boolean> = {};

interface PinGateScreenProps {
  gateKey: string; // e.g. 'cart' | 'account'
  label: string; // e.g. 'Cart' | 'Account'
  children: React.ReactNode;
}

export function PinProtectedScreen({ gateKey, label, children }: PinGateScreenProps) {
  const { token, isAuthenticated } = useAuth();
  const [checking, setChecking] = useState(isAuthenticated && !!token);
  const [required, setRequired] = useState(false);
  const [entered, setEntered] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2200);
  };

  const check = useCallback(async () => {
    if (!token || !isAuthenticated) {
      setChecking(false);
      return;
    }
    if (unlocked[gateKey]) {
      setRequired(false);
      setChecking(false);
      return;
    }
    try {
      const s = await apiGetPinStatus(token).catch(() => null);
      const gateOn = !!s?.pin_gate_enabled && !!s?.pin_set && !s?.pin_lockout;
      setRequired(gateOn);
      if (!gateOn) unlocked[gateKey] = true;
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
        unlocked[gateKey] = true;
        setRequired(false);
        setEntered('');
        showToast('PIN verified');
      } else if (r.pin_lockout) {
        setErr('Security lockout active. Try again in 20 minutes.');
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
            <Text style={s.title}>Enter JEMINA PIN</Text>
            <Text style={s.sub}>Your PIN is required to open {label}. This unlocks for this session.</Text>

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
});