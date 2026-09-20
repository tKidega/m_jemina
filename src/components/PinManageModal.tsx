import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { Button } from './Button';
import { Toast } from './Toast';
import { useAuth } from '../state/AuthContext';
import { apiGetPinStatus, apiSetPin, apiVerifyPinDetailed } from '../data/api';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

type Step = 'status' | 'set' | 'change';
const MAX_LEN = 4;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function PinManageModal({ visible, onClose }: Props) {
  const { token } = useAuth();
  const [step, setStep] = useState<Step>('status');
  const [pinSet, setPinSet] = useState(false);
  const [pinSetAt, setPinSetAt] = useState<string | null>(null);
  const [lockout, setLockout] = useState(false);
  const [current, setCurrent] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2600);
  };

  const load = async () => {
    if (!token) return;
    try {
      const s = await apiGetPinStatus(token);
      setPinSet(s.pin_set);
      setPinSetAt(s.pin_set_at);
      setLockout(!!s.pin_lockout);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (visible) { load(); setStep('status'); setCurrent(''); setNewPin(''); setConfirm(''); setErr(''); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const close = () => { setCurrent(''); setNewPin(''); setConfirm(''); setErr(''); onClose(); };

  const dots = (v: string) => (
    <View style={s.dots}>{[0,1,2,3].map(i => (
      <View key={i} style={[s.dot, i < (v || '').length && s.dotOn]}>
        {i < (v || '').length ? <View style={s.dotFill} /> : null}
      </View>
    ))}</View>
  );

  const keypad = (onPress: (d: string) => void, onDel: () => void, disabled: boolean) => (
    <View style={s.keypad}>
      {['1','2','3','4','5','6','7','8','9'].map(d => (
        <Pressable key={d} style={[s.keyBtn, disabled && s.keyDisabled]} onPress={() => !disabled && onPress(d)}><Text style={s.keyTxt}>{d}</Text></Pressable>
      ))}
      <View style={s.keyBtn} />
      <Pressable style={[s.keyBtn, disabled && s.keyDisabled]} onPress={() => !disabled && onPress('0')}><Text style={s.keyTxt}>0</Text></Pressable>
      <Pressable style={s.keyBtn} onPress={() => !disabled && onDel()}><Icon name="backspace" size={22} color={colors.outline} /></Pressable>
    </View>
  );

  const startSet = async () => {
    if (!token) return;
    setLoading(true); setErr('');
    try {
      const r = await apiVerifyPinDetailed(token, current);
      if (!r.verified) {
        if (r.pin_lockout) { setErr('Security lockout active. Auto-debit paused for 20 minutes.'); setLockout(true); }
        else setErr(`Incorrect PIN entered. ${r.attempts_remaining} attempt${r.attempts_remaining === 1 ? '' : 's'} remaining before temporary escrow lockout.`);
        setCurrent('');
        setLoading(false); return;
      }
      setCurrent(''); setStep('set');
    } catch {
      setErr('Could not start the update. Try again.');
    } finally { setLoading(false); }
  };

  const savePin = async (isChange: boolean) => {
    if (!token) return;
    if (newPin.length !== MAX_LEN) { setErr('Choose a 4-digit PIN.'); return; }
    if (newPin !== confirm) { setErr('PINs do not match.'); return; }
    setLoading(true); setErr('');
    try {
      await apiSetPin(token, newPin, isChange ? current : undefined);
      setPinSet(true); setPinSetAt(new Date().toISOString()); setCurrent(''); setNewPin(''); setConfirm('');
      setStep('status');
      showToast('JEMINA trade PIN updated.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save PIN.');
    } finally { setLoading(false); }
  };

  const backToStatus = () => { if (!lockout) { setStep('status'); setErr(''); } };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.sheet}>
          <View style={s.drag} />
          <View style={s.hdr}>
            <View style={{ flex: 1, marginRight: spacing.lg }}>
              <Text style={s.title}>{step === 'set' ? 'Set New Trade PIN' : 'JEMINA Trade PIN'}</Text>
              <Text style={s.sub}>{step === 'set' ? 'Choose a 4-digit PIN' : `PIN ${pinSet ? 'configured' : 'not set yet'}`}</Text>
            </View>
            <Pressable onPress={close} hitSlop={8} style={s.closeBtn}><Icon name="close" size={20} color={colors.outline} /></Pressable>
          </View>

          <View style={s.body}>
            {step === 'status' && (
              <>
                <View style={s.statusRow}>
                  <View style={[s.statusIcon, pinSet ? s.statusOn : s.statusOff]}><Icon name={pinSet ? 'lock' : 'error-outline'} size={22} color={pinSet ? colors.onPrimary : colors.outline} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.statusTitle}>{pinSet ? 'Trade PIN Active' : 'No Trade PIN Set'}</Text>
                    <Text style={s.statusSub}>
                      {pinSet
                        ? (pinSetAt ? `Created ${new Date(pinSetAt).toLocaleDateString()} ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â protects escrow & auto-reload authorizations.` : 'Protects escrow & auto-reload authorizations.')
                        : 'A 4-digit PIN secures escrow, auto-reload and sensitive account actions.'}
                    </Text>
                  </View>
                </View>

                {lockout && (
                  <View style={s.errBox}>
                    <Icon name="lock-clock" size={16} color={colors.statusFlash} />
                    <Text style={s.errTxt}>Security lockout active ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â PIN entry disabled for 20 minutes.</Text>
                  </View>
                )}

                {pinSet ? (
                  <Button label={loading ? 'Verifying...' : 'Change Trade PIN'} variant="primary" icon="lock-reset" fullWidth onPress={() => { setErr(''); setStep('change'); }} disabled={loading || lockout} />
                ) : (
                  <Button label="Set Trade PIN" variant="primary" icon="lock" fullWidth onPress={() => { setErr(''); setStep('set'); }} disabled={lockout} />
                )}
                {pinSet && (
                  <Pressable style={s.cancelBtn} onPress={close}><Text style={s.cancelTxt}>Close</Text></Pressable>
                )}
              </>
            )}

            {step === 'set' && (
              <>
                <Text style={s.desc}>Enter a 4-digit trade PIN. Keep it private ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â it authorizes escrow and auto-reload mandates.</Text>
                {dots(newPin)}
                <Text style={s.fieldLbl}>New PIN</Text>
                {dots(confirm)}
                <Text style={s.fieldLbl}>Confirm PIN</Text>
                {err ? <View style={s.errBox}><Icon name="error-outline" size={16} color={colors.statusFlash} /><Text style={s.errTxt}>{err}</Text></View> : null}
                <View style={s.row}>
                  <Pressable style={s.miniBtn} onPress={backToStatus}><Text style={s.miniTxt}>Back</Text></Pressable>
                  <Button label={loading ? 'Saving...' : 'Save PIN'} variant="primary" icon="lock" style={{ flex: 3 }} onPress={() => savePin(false)} disabled={loading || newPin.length !== MAX_LEN || confirm.length !== MAX_LEN} />
                </View>
              </>
            )}

            {step === 'change' && (
              <>
                <Text style={s.desc}>First verify your current PIN, then choose a new 4-digit PIN.</Text>
                <Text style={s.fieldLbl}>Current PIN</Text>
                {dots(current)}
                {keypad(d => setCurrent(p => (p.length < MAX_LEN ? p + d : p)), () => setCurrent(p => p.slice(0, -1)), lockout || loading)}
                {err ? <View style={s.errBox}><Icon name="error-outline" size={16} color={colors.statusFlash} /><Text style={s.errTxt}>{err}</Text></View> : null}
                <Button label={loading ? 'Verifying...' : 'Verify & Continue'} variant="primary" icon="arrow-forward" fullWidth onPress={startSet} disabled={loading || current.length !== MAX_LEN} />
                <Pressable style={s.cancelBtn} onPress={backToStatus}><Text style={s.cancelTxt}>Cancel</Text></Pressable>
              </>
            )}
          </View>
        </View>
        <Toast message={toast ? toast.msg : ''} type={toast ? toast.type : 'success'} visible={!!toast} onDone={() => setToast(null)} />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', backgroundColor: colors.surfaceContainerLowest, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, overflow: 'hidden' },
  drag: { width: 48, height: 4, borderRadius: 2, backgroundColor: colors.outlineVariant, alignSelf: 'center', marginTop: spacing.sm, marginBottom: spacing.xs },
  hdr: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  title: { ...typography.headlineSm, color: colors.onSurface, fontWeight: '700' },
  sub: { ...typography.bodySm, color: colors.outline, marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  statusRow: { flexDirection: 'row', gap: spacing.sm + 2, alignItems: 'center' },
  statusIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  statusOn: { backgroundColor: colors.primaryContainer },
  statusOff: { backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.outlineVariant },
  statusTitle: { ...typography.headlineSm, color: colors.onSurface, fontWeight: '700' },
  statusSub: { ...typography.bodySm, color: colors.outline, marginTop: 2, lineHeight: 17 },
  desc: { ...typography.bodyMd, color: colors.onSurfaceVariant, lineHeight: 19 },
  fieldLbl: { ...typography.labelSm, color: colors.outline, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: spacing.xs },
  dots: { flexDirection: 'row', gap: 14, justifyContent: 'center', marginVertical: spacing.sm },
  dot: { width: 48, height: 48, borderRadius: radius.md, borderWidth: 2, borderColor: colors.primaryContainer, backgroundColor: colors.surfaceContainerLowest, alignItems: 'center', justifyContent: 'center' },
  dotOn: { borderColor: colors.secondary },
  dotFill: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.primaryContainer },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%' },
  keyBtn: { width: '30%', height: 48, borderRadius: radius.md, backgroundColor: colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  keyDisabled: { opacity: 0.4 },
  keyTxt: { ...typography.headlineSm, color: colors.primary, fontWeight: '700' },
  errBox: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', backgroundColor: colors.errorContainer, borderRadius: radius.md, padding: spacing.sm + 2 },
  errTxt: { ...typography.bodySm, color: colors.statusFlash, flex: 1, lineHeight: 16, fontWeight: '600' },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  miniBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.outlineVariant },
  miniTxt: { ...typography.labelLg, color: colors.onSurface, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  cancelTxt: { ...typography.labelLg, color: colors.outline, fontWeight: '600' },
});