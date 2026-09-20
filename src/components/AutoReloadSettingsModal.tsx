import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from './Icon';
import { Button } from './Button';
import { Toast } from './Toast';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import { apiGetPinStatus, apiSetPin, apiVerifyPinDetailed, apiSendOtp, apiVerifyOtp, apiActivateAutoReload, apiResetPin, apiGetPaymentMethods } from '../data/api';
import type { ApiPaymentMethod } from '../data/api';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

type Step = 'settings' | 'setpin' | 'pin' | 'lockout' | 'reset_otp' | 'reset_pin' | 'success';
const THRESHOLDS = [50000, 100000, 250000];
const TOPUP = [
  { amount: 100000, bonus: 2000, label: 'Standard' },
  { amount: 500000, bonus: 15000, label: '3% Rebate', recommended: true },
  { amount: 2000000, bonus: 80000, label: 'Wholesale' },
];
const fmt = (v: number) => 'UGX ' + v.toLocaleString();

interface Props { visible: boolean; onClose: () => void; onActivated?: () => void; }

export function AutoReloadSettingsModal({ visible, onClose, onActivated }: Props) {
  const { token } = useAuth();
  const { navigate } = useNavigation();
  const [step, setStep] = useState<Step>('settings');
  const [enabled, setEnabled] = useState(true);
  const [threshold, setThreshold] = useState(100000);
  const [topupIdx, setTopupIdx] = useState(1);
  const [rail, setRail] = useState<'mtn' | 'airtel'>('mtn');
  const [paymentMethods, setPaymentMethods] = useState<ApiPaymentMethod[]>([]);
  const [defaultMethod, setDefaultMethod] = useState<ApiPaymentMethod | null>(null);
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [otp, setOtp] = useState('');
  const [useOtp, setUseOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pinSet, setPinSet] = useState(false);
  const [mandateRef, setMandateRef] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  // PIN error / lockout / reset state (matches JEMINA escrow designs)
  const [pinError, setPinError] = useState('');
  const [lockoutSec, setLockoutSec] = useState(0);
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPin, setResetNewPin] = useState('');
  const [resetConfirmPin, setResetConfirmPin] = useState('');
  const [resendSec, setResendSec] = useState(0);
  const [resetPinVisible, setResetPinVisible] = useState(false);
  const lockTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const resendTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2600);
  };

  const clearLockTimer = () => { if (lockTimer.current) { clearInterval(lockTimer.current); lockTimer.current = null; } };
  const clearResendTimer = () => { if (resendTimer.current) { clearInterval(resendTimer.current); resendTimer.current = null; } };

  useEffect(() => () => { clearLockTimer(); clearResendTimer(); }, []);

  const startLockCountdown = (seconds: number) => {
    clearLockTimer();
    setLockoutSec(seconds);
    lockTimer.current = setInterval(() => {
      setLockoutSec(prev => {
        if (prev <= 1) { clearLockTimer(); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const startResendCountdown = (seconds = 38) => {
    clearResendTimer();
    setResendSec(seconds);
    resendTimer.current = setInterval(() => {
      setResendSec(prev => {
        if (prev <= 1) { clearResendTimer(); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

const checkPinStatus = async () => {
    if (!token) return;
    try {
      const status = await apiGetPinStatus(token);
      setPinSet(status.pin_set);
      if (status.pin_lockout) {
        setStep('lockout');
        startLockCountdown(status.pin_lockout_remaining_seconds || 3600);
      }
    } catch { /* ignore */ }
  };

  const loadPaymentMethods = async () => {
    if (!token) return;
    try {
      const methods = await apiGetPaymentMethods(token);
      setPaymentMethods(methods);
      setDefaultMethod(methods.find(m => m.is_default) ?? methods[0] ?? null);
    } catch { /* ignore */ }
  };

  const railFromMethod = (m: ApiPaymentMethod): 'mtn' | 'airtel' | null => {
    const p = (m.provider || '').toLowerCase();
    if (p === 'mtn' || p === 'mtn_mo_mo' || p === 'mtn_mobile_money') return 'mtn';
    if (p === 'airtel' || p === 'airtel_money') return 'airtel';
    return null;
  };

  // Rail options derived from the user's saved payment methods (mobile money),
  // falling back to the hardcoded defaults.
  const railOptions: { rail: 'mtn' | 'airtel'; name: string; phone: string; provided: boolean }[] = (() => {
    const map = new Map<'mtn' | 'airtel', string>();
    paymentMethods.forEach(m => {
      const r = railFromMethod(m);
      if (r && m.account_number) map.set(r, m.account_number);
    });
    return [
      { rail: 'mtn', name: 'MTN MoMo', phone: map.get('mtn') ?? '+256 772 *** 891', provided: map.has('mtn') },
      { rail: 'airtel', name: 'Airtel Money', phone: map.get('airtel') ?? '+256 754 *** 440', provided: map.has('airtel') },
    ];
  })();

  useEffect(() => {
    if (visible) { checkPinStatus(); loadPaymentMethods(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // On activation success, allow the wallet to refresh an auto-reload stopped status.
  const notifyActivated = () => onActivated?.();

  const close = () => {
    setStep('settings'); setPin(''); setNewPin(''); setOtp(''); setUseOtp(false);
    setPinError(''); setResetOtp(''); setResetNewPin(''); setResetConfirmPin(''); ;
    clearLockTimer(); clearResendTimer();
    onClose();
  };
  const pinPress = (d: string) => { if (pin.length < 4) setPin(p => p + d); };
  const pinDel = () => setPin(p => p.slice(0, -1));
  const newPinPress = (d: string) => { if (newPin.length < 4) setNewPin(p => p + d); };
  const newPinDel = () => setNewPin(p => p.slice(0, -1));

  const sendOtp = async () => {
    setLoading(true);
    try {
      await apiSendOtp(token!, 'mtn', 'auto_reload');
      setUseOtp(true);
      showToast('OTP sent to your registered MoMo number.', 'info');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not send OTP.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPin = async () => {
    if (newPin.length !== 4) { showToast('PIN must be 4 digits.', 'error'); return; }
    setLoading(true);
    try {
      await apiSetPin(token!, newPin);
      setPinSet(true);
      setStep('pin');
      showToast('JEMINA PIN set successfully!', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to set PIN.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => setStep(pinSet ? 'pin' : 'setpin');

  const handleAuthorize = async () => {
    if (!useOtp && pin.length !== 4) { showToast('Enter your 4-digit PIN.', 'error'); return; }
    if (useOtp && otp.length !== 6) { showToast('Enter the 6-digit OTP.', 'error'); return; }
    setLoading(true);
    try {
      const payload: { pin?: string; otp?: string; threshold: number; topup_amount: number; payment_rail: string } = {
        threshold,
        topup_amount: TOPUP[topupIdx].amount,
        payment_rail: rail,
      };
      if (useOtp) {
        const ok = await apiVerifyOtp(token!, otp, 'auto_reload');
        if (!ok) { showToast('Invalid or expired OTP.', 'error'); setLoading(false); return; }
        payload.otp = otp;
      } else {
        const result = await apiVerifyPinDetailed(token!, pin);
        if (!result.verified) {
          setPin('');
          if (result.pin_lockout) {
            setStep('lockout');
            startLockCountdown(result.pin_lockout_remaining_seconds || 3600);
            showToast('Security lockout active. Auto-debit paused for 1 hour.', 'error');
          } else {
                        setPinError(`The 4-digit PIN entered does not match your JEMINA Trade Security PIN. ${result.attempts_remaining} attempt${result.attempts_remaining === 1 ? '' : 's'} remaining before temporary escrow lockout.`);
            showToast(result.message || 'Incorrect PIN entered.', 'error');
          }
          setLoading(false);
          return;
        }
        setPinError('');
        payload.pin = pin;
      }
      const result = await apiActivateAutoReload(token!, payload);
      setMandateRef(result.mandate_reference);
      setStep('success');
      setPin('');
      setOtp('');
      notifyActivated();
      showToast('Auto-reload mandate activated!', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not activate auto-reload.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetOtp = async () => {
    setLoading(true);
    try {
      await apiSendOtp(token!, 'mtn', 'pin_reset');
            startResendCountdown(38);
      showToast('OTP sent to your registered MTN MoMo number.', 'info');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not send OTP.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPin = async () => {
    if (resetOtp.length !== 6) { showToast('Enter the 6-digit OTP.', 'error'); return; }
    if (resetNewPin.length !== 4) { showToast('Create a 4-digit PIN.', 'error'); return; }
    if (resetNewPin !== resetConfirmPin) { showToast('PINs do not match.', 'error'); return; }
    setLoading(true);
    try {
      const res = await apiResetPin(token!, resetOtp, resetNewPin);
      clearLockTimer();
      setPinSet(true);
      setStep('success');
      setPin('');
      setResetOtp(''); setResetNewPin(''); setResetConfirmPin(''); ;
      setMandateRef(res.restored ? 'RST-9042-MOMO' : 'RST-9042');
      notifyActivated();
      showToast(res.restored
        ? 'Trade PIN reset. Escrow lockout cleared & auto-reload restored!'
        : 'Trade PIN reset successfully. Escrow lockout cleared.', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not reset PIN.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.sheet}>
          <View style={s.drag} />

          {step === 'settings' && (
            <>
              <View style={s.hdr}>
                <View style={{ flex: 1, marginRight: spacing.lg }}>
                  <Text style={s.title}>Auto-Reload Settings</Text>
                  <Text style={s.sub}>Keep trade liquidity active for tenders & depot bids</Text>
                </View>
                <Pressable onPress={close} hitSlop={8} style={s.closeBtn}><Icon name="close" size={20} color={colors.outline} /></Pressable>
              </View>
              <ScrollView style={s.body} contentContainerStyle={s.bodyC} showsVerticalScrollIndicator={false}>
                <View style={s.switchCard}>
                  <View style={s.switchLeft}>
                    <View style={s.switchIcon}><Icon name="autorenew" size={20} color={colors.secondary} /></View>
                    <View style={{ flex: 1 }}>
                      <View style={s.switchRow}><Text style={s.switchLbl}>Enable Auto-Reload</Text>
                        {enabled && <View style={s.activeBadge}><Text style={s.activeTxt}>Active</Text></View>}
                      </View>
                      <Text style={s.switchDesc}>Instant refill prevents tender cancellation</Text>
                    </View>
                  </View>
                  <Pressable style={[s.toggle, enabled && s.toggleOn]} onPress={() => setEnabled(v => !v)}>
                    <View style={[s.toggleDot, enabled && s.toggleDotOn]}>{enabled && <Icon name="check" size={14} color={colors.secondary} />}</View>
                  </Pressable>
                </View>

                <View><View style={s.secHdr}><Text style={s.secLbl}>When trade balance falls below</Text><Text style={s.secTag}>Trigger point</Text></View>
                  <View style={s.thrGrid}>{THRESHOLDS.map(t => (
                    <Pressable key={t} style={[s.thrPill, threshold === t && s.thrPillOn]} onPress={() => setThreshold(t)}>
                      <Text style={[s.thrTxt, threshold === t && s.thrTxtOn]}>{fmt(t)}</Text>
                      {threshold === t && <Icon name="check" size={14} color={colors.secondaryContainer} />}
                    </Pressable>
                  ))}<Pressable style={s.thrPill}><Text style={[s.thrTxt, { color: colors.outline }]}>Custom</Text></Pressable></View>
                </View>

                <View><View style={s.secHdr}><Text style={s.secLbl}>Automatically top up with</Text><Text style={s.secTag}>Tiered bonus apply</Text></View>
                  {TOPUP.map((o, i) => (
                    <Pressable key={o.amount} style={[s.tpCard, topupIdx === i && s.tpCardOn]} onPress={() => setTopupIdx(i)}>
                      {o.recommended && <View style={s.recBadge}><Text style={s.recTxt}>RECOMMENDED</Text></View>}
                      <View style={s.tpRow}>
                        <View style={[s.tpRadio, topupIdx === i && s.tpRadioOn]}>{topupIdx === i && <Icon name="check" size={14} color={colors.onSecondary} />}</View>
                        <View style={{ flex: 1 }}><View style={s.tpNameRow}><Text style={s.tpAmt}>{fmt(o.amount)}</Text>
                          {o.recommended && <View style={s.rebateBadge}><Text style={s.rebateTxt}>{o.label}</Text></View>}
                        </View><Text style={s.tpBonus}>+{fmt(o.bonus)} Bonus{o.label !== 'Standard' ? ' / ' + o.label : ''}</Text></View>
                        {topupIdx === i && <Icon name="bolt" size={18} color={colors.secondary} />}
                      </View>
                    </Pressable>
                  ))}
                </View>

<View><Text style={s.secLbl}>Charge payment rail</Text>
                  {railOptions.map(op => (
                    <Pressable key={op.rail} style={[s.railCard, rail === op.rail && s.railOn]} onPress={() => setRail(op.rail)}>
                      <View style={[s.railRadio, rail === op.rail && s.railRadioOn]}>{rail === op.rail && <View style={s.railDot} />}</View>
                      <View style={{ flex: 1 }}><View style={s.railRow}><Text style={s.railName}>{op.name}</Text>
                        {op.rail === 'mtn' && <View style={s.fastBadge}><Text style={s.fastTxt}>Fastest</Text></View>}
                        {op.provided && <View style={s.savedBadge}><Text style={s.savedTxt}>Saved</Text></View>}
                      </View>
                        <Text style={s.railPhone}>{op.phone} {op.provided ? '(Uganda)' : ''}</Text></View>
                      <Icon name="smartphone" size={18} color={rail === op.rail ? colors.primaryContainer : colors.outline} />
                    </Pressable>
                  ))}
                  {defaultMethod ? (
                    <Pressable style={s.manageRailBtn} onPress={() => { close(); navigate('PaymentMethods' as never); }}>
                      <Icon name="settings" size={15} color={colors.secondary} />
                      <Text style={s.manageRailTxt}>Manage Payment Methods in Account Settings</Text>
                      <Icon name="chevron-right" size={16} color={colors.outline} />
                    </Pressable>
                  ) : null}
                </View>

                <View style={s.compCard}><Icon name="verified-user" size={18} color={colors.secondary} />
                  <Text style={s.compTxt}>Bank of Uganda Compliant: Monthly auto-debit ceiling capped at <Text style={s.compBold}>UGX 2,500,000</Text>. You will receive an instant prompt and SMS notification 5 minutes before every debit execution.</Text>
                </View>

{!pinSet ? (
                  <Button label="Set JEMINA PIN to Continue" variant="primary" icon="lock" fullWidth onPress={handleContinue} />
                ) : (
                  <Button label="Continue to Security Authorization" variant="primary" icon="arrow-forward" fullWidth onPress={handleContinue} />
                )}
                <Pressable style={s.cancelBtn} onPress={close}><Text style={s.cancelTxt}>Cancel / Keep Manual Top-ups</Text></Pressable>
              </ScrollView>
            </>
          )}

          {step === 'setpin' && (
            <>
              <View style={s.pinHdr}><Pressable onPress={() => setStep('settings')} hitSlop={8}><Icon name="arrow-back" size={24} color={colors.primaryContainer} /></Pressable>
                <Text style={s.pinHdrLbl}>Set JEMINA PIN</Text>
                <Pressable onPress={close} hitSlop={8}><Icon name="close" size={24} color={colors.outline} /></Pressable>
              </View>
              <View style={s.pinContent}>
                <View style={s.pinIcon}><Icon name="lock" size={28} color={colors.secondary} /></View>
                <Text style={s.pinTitle}>Create Your Trade PIN</Text>
                <Text style={s.pinDesc}>Choose a 4-digit PIN. It secures all auto-debit and escrow authorizations.</Text>
                <View style={s.pinDisplay}>{[0,1,2,3].map(i => (
                  <View key={i} style={[s.pinBox, i === newPin.length && s.pinBoxOn]}>
                    {i < newPin.length ? <View style={s.pinDot} /> : i === newPin.length ? <View style={s.pinCursor} /> : null}
                  </View>
                ))}</View>
                <View style={s.keypad}>
                  {['1','2','3','4','5','6','7','8','9'].map(d => <Pressable key={d} style={s.keyBtn} onPress={() => newPinPress(d)}><Text style={s.keyTxt}>{d}</Text></Pressable>)}
                  <View style={s.keyBtn} />
                  <Pressable style={s.keyBtn} onPress={() => newPinPress('0')}><Text style={s.keyTxt}>0</Text></Pressable>
                  <Pressable style={[s.keyBtn, s.keySpecial]} onPress={newPinDel}><Icon name="backspace" size={22} color={colors.outline} /></Pressable>
                </View>
              </View>
              <View style={s.pinFooter}><Button label={loading ? 'Saving...' : 'Save PIN'} variant="primary" icon="lock" fullWidth onPress={handleSetPin} disabled={loading || newPin.length !== 4} /></View>
            </>
          )}

          {step === 'pin' && (
            <>
              <View style={s.pinHdr}><Pressable onPress={() => setStep('settings')} hitSlop={8}><Icon name="arrow-back" size={24} color={colors.primaryContainer} /></Pressable>
                <Text style={s.pinHdrLbl}>Escrow Mandate Lock</Text>
                <Pressable onPress={close} hitSlop={8}><Icon name="close" size={24} color={colors.outline} /></Pressable>
              </View>
<View style={s.pinContent}>
                <View style={s.pinIcon}><Icon name="shield" size={28} color={colors.secondary} /></View>
                <Text style={s.pinTitle}>Security Authorization</Text>
                <Text style={s.pinDesc}>{useOtp ? 'Enter the 6-digit OTP sent to your phone' : 'Enter your 4-digit JEMINA Trade PIN to lock the auto-debit mandate'}</Text>
                <View style={s.mandateCard}><Icon name="autorenew" size={18} color={colors.secondary} />
                  <View style={{ flex: 1 }}><Text style={s.mandateLbl}>AUTO-DEBIT MANDATE</Text>
                    <Text style={s.mandateVal}>{fmt(TOPUP[topupIdx].amount)} when balance &lt; {fmt(threshold)}</Text>
                    <Text style={s.mandateSrc}>Source: {rail === 'mtn' ? 'MTN MoMo (*** 891)' : 'Airtel Money (*** 440)'}</Text></View>
                </View>

                {useOtp ? (
                  <TextInput
                    style={s.otpInput}
                    value={otp}
                    onChangeText={t => setOtp(t.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder="••••••"
                    placeholderTextColor={colors.outline}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                ) : (
                  <View style={s.pinDisplay}>{[0,1,2,3].map(i => (
                    <View key={i} style={[s.pinBox, i === pin.length && s.pinBoxOn]}>
                      {i < pin.length ? <View style={s.pinDot} /> : i === pin.length ? <View style={s.pinCursor} /> : null}
                    </View>
                  ))}</View>
                )}

                <View style={s.keypad}>
                  {['1','2','3','4','5','6','7','8','9'].map(d => <Pressable key={d} style={s.keyBtn} onPress={() => pinPress(d)}><Text style={s.keyTxt}>{d}</Text></Pressable>)}
                  <Pressable style={[s.keyBtn, s.keySpecial]}><Icon name="fingerprint" size={24} color={colors.secondary} /></Pressable>
                  <Pressable style={s.keyBtn} onPress={() => pinPress('0')}><Text style={s.keyTxt}>0</Text></Pressable>
                  <Pressable style={[s.keyBtn, s.keySpecial]} onPress={pinDel}><Icon name="backspace" size={22} color={colors.outline} /></Pressable>
                </View>

                <Pressable style={s.otpLink} onPress={sendOtp} disabled={loading}>
                  <Text style={s.otpLinkText}>{useOtp ? 'Use JEMINA Trade PIN instead' : 'Verify via MTN MoMo OTP instead'}</Text>
                </Pressable>

                {!!pinError && (
                  <View style={s.pinErrCard}>
                    <Icon name="error-outline" size={16} color={colors.statusFlash} />
                    <Text style={s.pinErrTxt}>{pinError}</Text>
                  </View>
                )}

                <Pressable style={s.forgotPinBtn} onPress={() => { setStep('reset_otp'); handleResetOtp(); }}>
                  <Icon name="sim-card" size={14} color={colors.statusFlash} />
                  <Text style={s.forgotPinTxt}>Forgot your Trade PIN? Verify via OTP instead</Text>
                </Pressable>
              </View>
              <View style={s.pinFooter}><Button label={loading ? 'Authorizing...' : 'Authorize Mandate'} variant="primary" icon="lock" fullWidth onPress={handleAuthorize} disabled={loading || (useOtp ? otp.length !== 6 : pin.length !== 4)} /></View>
            </>
          )}

          {step === 'lockout' && (
            <>
              <View style={[s.pinHdr, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.surfaceContainerHigh }]}>
                <Pressable onPress={close} hitSlop={8}><Icon name="close" size={24} color={colors.outline} /></Pressable>
                <Text style={s.lockTitle}>Security Lockout Active</Text>
                <View style={{ width: 24 }} />
              </View>
              <ScrollView style={s.body} contentContainerStyle={s.lockC} showsVerticalScrollIndicator={false}>
                <View style={s.lockIcon}><Icon name="lock-clock" size={34} color={colors.statusFlash} /></View>
                <Text style={s.lockHeading}>Security Lockout Active</Text>
                <Text style={s.pinDesc}>
                  Too many incorrect PIN attempts (3/3). To safeguard your JEMINA trade balance and escrow transactions,
                  auto-debit authorizations are temporarily locked.
                </Text>
                <View style={s.lockTimerCard}>
                  <Icon name="schedule" size={20} color={colors.secondary} />
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={s.lockTimerLbl}>RECOVERY TIMEOUT — Auto-unlock active</Text>
                    <Text style={s.lockTimerVal}>{String(Math.floor(lockoutSec / 60)).padStart(2, '0')}:{String(lockoutSec % 60).padStart(2, '0')}</Text>
                  </View>
                </View>
                <View style={s.pauseCard}>
                  <Icon name="pause-circle" size={18} color={colors.secondary} />
                  <Text style={s.pauseTxt}>
                    Auto-reload mandate is <Text style={{ fontWeight: '700' }}>paused</Text>. PIN keypad disabled until
                    lock expires.
                  </Text>
                </View>
                <View style={s.simCard}>
                  <Icon name="sim-card" size={18} color={colors.primary} />
                  <Text style={s.simTxt}>
                    <Text style={{ fontWeight: '700' }}>Reset Trade PIN via Registered MTN MoMo SIM</Text>{'\n'}
                    Verify with an OTP sent to your registered number to unlock instantly — no need to wait.
                  </Text>
                </View>
                <View style={s.compCard}><Icon name="verified-user" size={18} color={colors.statusSuccess} />
                  <Text style={s.compTxt}>Bank of Uganda Escrow Protection Guideline (#SEC-LK-9021).</Text>
                </View>
              </ScrollView>
              <View style={s.pinFooter}>
                <Button label="Reset Trade PIN via MTN MoMo" variant="primary" icon="sim-card" fullWidth onPress={() => { setStep('reset_otp'); handleResetOtp(); }} />
                <Pressable style={s.cancelBtn} onPress={close}><Text style={s.cancelTxt}>Return to Credits & Wallet</Text></Pressable>
              </View>
            </>
          )}

          {step === 'reset_otp' && (
            <>
              <View style={s.pinHdr}><Pressable onPress={() => setStep(lockoutSec > 0 ? 'lockout' : 'pin')} hitSlop={8}><Icon name="arrow-back" size={24} color={colors.primaryContainer} /></Pressable>
                <Text style={s.pinHdrLbl}>Reset Trade PIN</Text>
                <Pressable onPress={close} hitSlop={8}><Icon name="close" size={24} color={colors.outline} /></Pressable>
              </View>
              <ScrollView style={s.body} contentContainerStyle={s.resetC} showsVerticalScrollIndicator={false}>
                <View style={s.stepBadge}><Text style={s.stepBadgeTxt}>Step 1 of 2: Verify SIM OTP</Text><Text style={s.stepBadgeSub}>Next: Set 4-Digit PIN</Text></View>
                <Text style={s.resetTitle}>Enter 6-Digit SMS Code</Text>
                <Text style={s.pinDesc}>
                  We sent a temporary verification code via SMS to your registered MTN MoMo phone number: {'\n'}
                  <Text style={{ fontWeight: '700', color: colors.onSurface }}>+256 772 ••• 891</Text>
                </Text>
                <TextInput
                  style={s.otpInput}
                  value={resetOtp}
                  onChangeText={t => setResetOtp(t.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="••••••"
                  placeholderTextColor={colors.outline}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <Text style={s.resendTxt}>
                  Didn't receive code?{' '}
                  {resendSec > 0
                    ? <Text style={{ color: colors.outline, fontWeight: '600' }}>Resend SMS (in {resendSec}s)</Text>
                    : <Text style={s.resendLink} onPress={handleResetOtp} disabled={loading}>Resend SMS</Text>}
                </Text>
                <Pressable style={s.altContactRow} onPress={() => handleResetOtp()}>
                  <Text style={s.altContact}><Icon name="chat" size={13} color={colors.secondary} /> Send via WhatsApp</Text>
                  <Text style={s.altContact}><Icon name="call" size={13} color={colors.secondary} /> Call Me with Code</Text>
                </Pressable>
                <View style={s.compCard}><Icon name="verified-user" size={18} color={colors.statusSuccess} />
                  <Text style={s.compTxt}><Text style={{ fontWeight: '700' }}>Bank of Uganda SIM Bind Security:</Text> OTP must originate from the SIM card registered on MTN Uganda account #772891.</Text>
                </View>
              </ScrollView>
              <View style={s.pinFooter}>
                <Button label={loading ? 'Sending...' : 'Verify OTP'} variant="primary" icon="verified-user" fullWidth onPress={() => setStep('reset_pin')} disabled={loading || resetOtp.length !== 6} />
              </View>
            </>
          )}

          {step === 'reset_pin' && (
            <>
              <View style={s.pinHdr}><Pressable onPress={() => setStep('reset_otp')} hitSlop={8}><Icon name="arrow-back" size={24} color={colors.primaryContainer} /></Pressable>
                <Text style={s.pinHdrLbl}>Set New Trade PIN</Text>
                <Pressable onPress={close} hitSlop={8}><Icon name="close" size={24} color={colors.outline} /></Pressable>
              </View>
              <View style={s.pinContent}>
                <View style={s.stepBadge}><Text style={s.stepBadgeTxt}>Step 2 of 2: Set 4-Digit PIN</Text></View>
                <Text style={s.resetNewTitle}>Create New PIN</Text>
                <View style={s.resetPinRow}>
                  <TextInput
                    style={s.resetPinInput}
                    value={resetNewPin}
                    onChangeText={t => setResetNewPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
                    placeholder="****" placeholderTextColor={colors.outline}
                    keyboardType="number-pad" maxLength={4} secureTextEntry={!resetPinVisible}
                  />
                  <Pressable onPress={() => setResetPinVisible(v => !v)} hitSlop={8}>
                    <Icon name={resetPinVisible ? 'visibility' : 'visibility-off'} size={20} color={colors.outline} />
                  </Pressable>
                </View>
                <Text style={s.resetShowHint}>Show PIN</Text>
                <View style={s.resetPinRow}>
                  <TextInput
                    style={s.resetPinInput}
                    value={resetConfirmPin}
                    onChangeText={t => setResetConfirmPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
                    placeholder="****" placeholderTextColor={colors.outline}
                    keyboardType="number-pad" maxLength={4} secureTextEntry={!resetPinVisible}
                  />
                </View>
                <Text style={s.resetHint}>Security Tip: Do not use common digits like 1234 or your year of birth.</Text>
              </View>
              <View style={s.pinFooter}>
                <Button label={loading ? 'Saving...' : 'Verify OTP & Save New PIN'} variant="primary" icon="lock-reset" fullWidth
                  onPress={handleResetPin} disabled={loading || resetNewPin.length !== 4 || resetConfirmPin.length !== 4} />
              </View>
            </>
          )}

          {step === 'success' && (
            <ScrollView style={s.body} contentContainerStyle={s.succC} showsVerticalScrollIndicator={false}>
              <View style={s.succIconWrap}><View style={s.succIconOuter}><Icon name="check-circle" size={36} color={colors.statusSuccess} /></View>
                <View style={s.succBolt}><Icon name="bolt" size={14} color={colors.onPrimary} /></View></View>
              <Text style={s.succTitle}>Auto-Reload Activated!</Text>
              <Text style={s.succDesc}>Your automated liquidity mandate is now live. Never miss a depot auction or produce tender in Gulu & Lira.</Text>
              <View style={s.refBadge}><Icon name="verified" size={14} color={colors.statusSuccess} /><Text style={s.refTxt}>Mandate Ref: {mandateRef ? '#' + mandateRef : '...'}</Text></View>
              <View style={s.succSummary}>
                <View style={s.sumRow}><View style={s.sumIcon}><Icon name="trending-down" size={18} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={s.sumLbl}>Auto-Debit Threshold</Text><Text style={s.sumVal}>Balance falls below {fmt(threshold)}</Text></View></View>
                <View style={s.sumDiv} />
                <View style={s.sumRow}><View style={[s.sumIcon, { backgroundColor: colors.secondary + '1a' }]}><Icon name="add-circle" size={18} color={colors.secondary} /></View><View style={{ flex: 1 }}><Text style={s.sumLbl}>Recharge Package</Text><Text style={s.sumVal}>{fmt(TOPUP[topupIdx].amount)} {TOPUP[topupIdx].label} Tier</Text>
                  <View style={s.bonusBadge}><Text style={s.bonusTxt}>+{fmt(TOPUP[topupIdx].bonus)} bonus credits per recharge</Text></View></View></View>
                <View style={s.sumDiv} />
                <View style={s.sumRow}><View style={s.sumIcon}><Icon name="account-balance-wallet" size={18} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={s.sumLbl}>Payment Rail</Text><Text style={s.sumVal}>{rail === 'mtn' ? 'MTN Mobile Money (+256 772 *** 891)' : 'Airtel Money (+256 754 *** 440)'}</Text><Text style={s.sumSub}>Northern Aggregator Pre-Authorized</Text></View></View>
                <View style={s.sumDiv} />
                <View style={s.sumRow}><View style={s.sumIcon}><Icon name="sms" size={18} color={colors.outline} /></View><View style={{ flex: 1 }}><Text style={s.sumLbl}>Automated Dispatch Notice</Text><Text style={s.sumVal}>SMS alert sent 30 mins before every auto-debit run</Text></View></View>
              </View>
              <View style={s.safetyNote}><Icon name="shield" size={16} color={colors.outline} /><Text style={s.safetyTxt}>You can pause, adjust thresholds, or cancel this mandate at any time from your Wallet settings.</Text></View>
              <Button label="Done & Return to Wallet" variant="primary" icon="arrow-forward" fullWidth onPress={close} />
              <Pressable style={s.cancelBtn} onPress={close}><Text style={s.cancelTxt}>Manage Mandate / Thresholds</Text></Pressable>
            </ScrollView>
          )}
</View>
      </KeyboardAvoidingView>
      <Toast
        message={toast ? toast.msg : ''}
        type={toast ? toast.type : 'success'}
        visible={!!toast}
        onDone={() => setToast(null)}
      />
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '95%', backgroundColor: colors.surfaceContainerLowest, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, overflow: 'hidden' },
  drag: { width: 48, height: 4, borderRadius: 2, backgroundColor: colors.outlineVariant, alignSelf: 'center', marginTop: spacing.sm, marginBottom: spacing.xs },
  hdr: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  title: { ...typography.headlineSm, color: colors.onSurface, fontWeight: '700' },
  sub: { ...typography.bodySm, color: colors.outline, marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  body: { flexGrow: 1 },
  bodyC: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.lg },
  switchCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceContainerLow, borderRadius: radius.lg, padding: spacing.md },
  switchLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, flex: 1 },
  switchIcon: { width: 36, height: 36, borderRadius: radius.lg, backgroundColor: colors.secondary + '1a', alignItems: 'center', justifyContent: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  switchLbl: { ...typography.labelLg, color: colors.onSurface, fontWeight: '700' },
  activeBadge: { backgroundColor: '#1b4332', borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  activeTxt: { ...typography.labelSm, color: '#d8f3dc', fontWeight: '700', fontSize: 9 },
  switchDesc: { ...typography.bodySm, color: colors.outline, marginTop: 2 },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: colors.surfaceContainerHigh, padding: 2, justifyContent: 'center' },
  toggleOn: { backgroundColor: colors.primaryContainer },
  toggleDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surfaceContainerLowest, justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-start' },
  toggleDotOn: { alignSelf: 'flex-end', backgroundColor: colors.onPrimary },
  secHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.sm },
  secLbl: { ...typography.labelLg, color: colors.onSurface, fontWeight: '700', marginBottom: spacing.sm },
  secTag: { ...typography.labelSm, color: colors.secondary, fontWeight: '600' },
  thrGrid: { flexDirection: 'row', gap: spacing.sm },
  thrPill: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.surfaceContainerHigh, backgroundColor: colors.surfaceContainerLowest },
  thrPillOn: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  thrTxt: { ...typography.labelMd, color: colors.onSurfaceVariant },
  thrTxtOn: { color: colors.onPrimary, fontWeight: '700' },
  tpCard: { backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: colors.surfaceContainerHigh, borderRadius: radius.lg, padding: spacing.sm + 2, marginBottom: spacing.sm, position: 'relative' },
  tpCardOn: { borderWidth: 2, borderColor: colors.secondary, backgroundColor: '#fff9f3' },
  tpRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  tpRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.outline, alignItems: 'center', justifyContent: 'center' },
  tpRadioOn: { borderColor: colors.secondary, backgroundColor: colors.secondary },
  tpNameRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  tpAmt: { ...typography.headlineSm, color: colors.onSurface, fontWeight: '800' },
  rebateBadge: { backgroundColor: colors.secondaryFixed, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  rebateTxt: { ...typography.labelSm, color: colors.onSecondaryFixed, fontWeight: '700', fontSize: 10 },
  tpBonus: { ...typography.bodySm, color: colors.secondary, fontWeight: '600', marginTop: 2 },
  recBadge: { position: 'absolute', top: -10, right: 12, backgroundColor: colors.secondary, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  recTxt: { ...typography.labelSm, color: colors.onSecondary, fontWeight: '700', fontSize: 9, textTransform: 'uppercase' },
  railCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, padding: spacing.sm + 2, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.surfaceContainerHigh, marginBottom: spacing.sm },
  railOn: { borderColor: colors.primaryContainer, borderWidth: 2 },
  railRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.outline, alignItems: 'center', justifyContent: 'center' },
  railRadioOn: { borderColor: colors.primaryContainer, backgroundColor: colors.primaryContainer },
  railDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.onPrimary },
  railRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  railName: { ...typography.labelLg, color: colors.onSurface, fontWeight: '700' },
fastBadge: { backgroundColor: '#ffcc0033', borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 1 },
  fastTxt: { ...typography.labelSm, color: '#7a5900', fontWeight: '700', fontSize: 10 },
  savedBadge: { backgroundColor: '#1b4332', borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 1, marginLeft: 4 },
  savedTxt: { ...typography.labelSm, color: '#d8f3dc', fontWeight: '700', fontSize: 10 },
  manageRailBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: spacing.sm, marginTop: 2 },
  manageRailTxt: { ...typography.labelMd, color: colors.secondary, fontWeight: '600', flex: 1 },
  railPhone: { ...typography.bodySm, color: colors.onSurfaceVariant, fontFamily: 'monospace', fontSize: 11 },
  compCard: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.surfaceContainerLow, borderRadius: radius.lg, padding: spacing.sm + 2 },
  compTxt: { ...typography.bodySm, color: colors.outline, flex: 1, lineHeight: 16 },
  compBold: { fontWeight: '700', color: colors.onSurface },
  cancelBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  cancelTxt: { ...typography.labelLg, color: colors.outline, fontWeight: '600' },
  pinHdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  pinHdrLbl: { ...typography.labelSm, color: colors.outline, textTransform: 'uppercase', letterSpacing: 0.5 },
  pinContent: { alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md },
  pinIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: `${colors.outlineVariant}80`, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  pinTitle: { ...typography.headlineSm, color: colors.primary, fontWeight: '700' },
  pinDesc: { ...typography.bodySm, color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 4, maxWidth: 280, lineHeight: 18 },
  mandateCard: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.surfaceContainerLow, borderRadius: radius.lg, padding: spacing.sm + 2, width: '100%', marginTop: spacing.md },
  mandateLbl: { ...typography.labelSm, color: colors.secondary, fontWeight: '700' },
  mandateVal: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '600', marginTop: 2 },
  mandateSrc: { ...typography.bodySm, color: colors.outline, fontSize: 11 },
  pinDisplay: { flexDirection: 'row', gap: 14, marginVertical: spacing.lg },
  pinBox: { width: 48, height: 48, borderRadius: radius.md, borderWidth: 2, borderColor: colors.primaryContainer, backgroundColor: colors.surfaceContainerLowest, alignItems: 'center', justifyContent: 'center' },
  pinBoxOn: { borderColor: colors.secondary },
  pinDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.primaryContainer },
  pinCursor: { width: 2, height: 20, backgroundColor: colors.secondary, borderRadius: 1 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: spacing.md, paddingTop: spacing.sm, width: '100%' },
  keyBtn: { width: '30%', height: 48, borderRadius: radius.md, backgroundColor: colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  keySpecial: { backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: `${colors.outlineVariant}66` },
  keyTxt: { ...typography.headlineSm, color: colors.primary, fontWeight: '700' },
  pinFooter: { padding: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.surfaceContainerHigh },
  otpInput: {
    width: 180,
    height: 56,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.secondary,
    backgroundColor: colors.surfaceContainerLowest,
    textAlign: 'center',
    fontSize: 26,
    letterSpacing: 10,
    marginVertical: spacing.md,
    color: colors.onSurface,
  },
otpLink: { paddingVertical: spacing.sm, marginTop: spacing.sm },
  otpLinkText: { ...typography.labelMd, color: colors.secondary, fontWeight: '600' },
  pinErrCard: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: colors.errorContainer + 'aa', borderRadius: radius.md, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.sm, width: '100%' },
  pinErrTxt: { ...typography.bodySm, color: colors.statusFlash, flex: 1, lineHeight: 16, fontWeight: '600' },
  forgotPinBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.sm },
  forgotPinTxt: { ...typography.labelMd, color: colors.statusFlash, fontWeight: '600' },
  lockTitle: { ...typography.labelSm, color: colors.statusFlash, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '700' },
  lockC: { alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.lg, gap: spacing.sm },
  lockIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.errorContainer, borderWidth: 2, borderColor: colors.statusFlash, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  lockHeading: { ...typography.headlineMd, color: colors.statusFlash, fontWeight: '800', textAlign: 'center' },
  lockTimerCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, backgroundColor: colors.surfaceContainerLow, borderRadius: radius.lg, padding: spacing.md, width: '100%', marginTop: spacing.sm },
  lockTimerLbl: { ...typography.labelSm, color: colors.outline, textTransform: 'uppercase' },
  lockTimerVal: { ...typography.headlineLg, color: colors.onSurface, fontWeight: '800', letterSpacing: 2 },
  pauseCard: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', backgroundColor: '#fffbeb', borderRadius: radius.md, padding: spacing.sm + 2, width: '100%', borderWidth: 1, borderColor: '#fde68a' },
  pauseTxt: { ...typography.bodySm, color: '#92400e', flex: 1, lineHeight: 16 },
  simCard: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', backgroundColor: colors.surfaceContainerLow, borderRadius: radius.md, padding: spacing.sm + 2, width: '100%' },
  simTxt: { ...typography.bodySm, color: colors.onSurfaceVariant, flex: 1, lineHeight: 17 },
  resetC: { alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.lg, gap: spacing.sm },
  resetTitle: { ...typography.headlineSm, color: colors.onSurface, fontWeight: '700', marginTop: spacing.sm },
  resetNewTitle: { ...typography.headlineSm, color: colors.onSurface, fontWeight: '700', marginTop: spacing.md },
  stepBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surfaceContainerLow, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 6, marginTop: spacing.sm },
  stepBadgeTxt: { ...typography.labelSm, color: colors.primary, fontWeight: '700' },
  stepBadgeSub: { ...typography.labelSm, color: colors.outline },
  resendTxt: { ...typography.bodySm, color: colors.outline, textAlign: 'center', marginTop: spacing.sm },
  resendLink: { color: colors.secondary, fontWeight: '700' },
  altContactRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  altContact: { ...typography.labelMd, color: colors.secondary, fontWeight: '600' },
  resetPinRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, width: '100%', justifyContent: 'center' },
  resetPinInput: { width: 160, height: 52, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.primaryContainer, backgroundColor: colors.surfaceContainerLowest, textAlign: 'center', fontSize: 24, letterSpacing: 10, color: colors.onSurface },
  resetShowHint: { ...typography.labelSm, color: colors.outline, marginTop: 4 },
  resetHint: { ...typography.bodySm, color: colors.outline, textAlign: 'center', marginTop: spacing.lg, lineHeight: 16 },
  succC: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, alignItems: 'center', gap: spacing.md },
  succIconWrap: { position: 'relative', marginBottom: spacing.sm },
  succIconOuter: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#ecfdf5', borderWidth: 2, borderColor: colors.statusSuccess, alignItems: 'center', justifyContent: 'center' },
  succBolt: { position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surfaceContainerLowest },
  succTitle: { ...typography.headlineMd, color: colors.onSurface, fontWeight: '800', textAlign: 'center' },
  succDesc: { ...typography.bodySm, color: colors.outline, textAlign: 'center', maxWidth: 310, lineHeight: 18 },
  refBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceContainerLow, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 6, borderWidth: 1, borderColor: `${colors.outlineVariant}66` },
  refTxt: { ...typography.labelSm, color: colors.primary, fontWeight: '700' },
  succSummary: { width: '100%', backgroundColor: colors.surfaceContainerLow, borderRadius: radius.lg, padding: spacing.sm + 2, gap: spacing.sm },
  sumRow: { flexDirection: 'row', gap: spacing.sm },
  sumIcon: { width: 28, height: 28, borderRadius: radius.md, backgroundColor: colors.surfaceContainerLowest, alignItems: 'center', justifyContent: 'center' },
  sumLbl: { ...typography.labelSm, color: colors.outline },
  sumVal: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '600' },
  sumSub: { ...typography.labelSm, color: colors.secondary, marginTop: 2 },
  sumDiv: { height: 1, backgroundColor: colors.surfaceContainerHigh },
  bonusBadge: { marginTop: 4, backgroundColor: '#333e48', borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  bonusTxt: { ...typography.labelSm, color: colors.white, fontWeight: '600', fontSize: 10 },
  safetyNote: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', paddingHorizontal: spacing.sm },
  safetyTxt: { ...typography.labelSm, color: colors.outline, flex: 1, lineHeight: 16 },
});

