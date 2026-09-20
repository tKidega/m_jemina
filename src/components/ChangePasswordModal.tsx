import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from './Icon';
import { Button } from './Button';
import { Toast } from './Toast';
import { useAuth } from '../state/AuthContext';
import { apiChangePassword } from '../data/api';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

interface Props {
  visible: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

export function ChangePasswordModal({ visible, onClose, onChanged }: Props) {
  const { token } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2600);
  };

  const close = () => {
    setCurrent(''); setNext(''); setConfirm(''); setShow(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (current.length < 8) { showToast('Enter your current password.', 'error'); return; }
    if (next.length < 8) { showToast('New password must be at least 8 characters.', 'error'); return; }
    if (next !== confirm) { showToast('New passwords do not match.', 'error'); return; }
    setLoading(true);
    try {
      const msg = await apiChangePassword(token!, current, next);
      showToast(msg, 'success');
      setTimeout(close, 1200);
      onChanged?.();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not update password.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const inputProps = { color: colors.onSurface, placeholderTextColor: colors.outline };
  const icon = (name: any) => <Icon name={name} size={18} color={colors.outline} />;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.sheet}>
          <View style={s.drag} />
          <View style={s.hdr}>
            <View style={{ flex: 1, marginRight: spacing.lg }}>
              <Text style={s.title}>Change Password</Text>
              <Text style={s.sub}>Verify your current password to update</Text>
            </View>
            <Pressable onPress={close} hitSlop={8} style={s.closeBtn}><Icon name="close" size={20} color={colors.outline} /></Pressable>
          </View>

          <View style={s.body}>
            <View style={s.field}>
              <Text style={s.label}>Current Password</Text>
              <View style={s.inputWrap}>
                {icon('lock')}
                <TextInput
                  style={s.input}
                  value={current}
                  onChangeText={setCurrent}
                  secureTextEntry={!show}
                  autoCapitalize="none"
                  placeholder="••••••••"
                  {...inputProps}
                />
                <Pressable onPress={() => setShow(v => !v)} hitSlop={8}>
                  <Icon name={show ? 'visibility-off' : 'visibility'} size={20} color={colors.outline} />
                </Pressable>
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>New Password</Text>
              <View style={s.inputWrap}>
                {icon('lock-reset')}
                <TextInput
                  style={s.input}
                  value={next}
                  onChangeText={setNext}
                  secureTextEntry={!show}
                  autoCapitalize="none"
                  placeholder="At least 8 characters"
                  {...inputProps}
                />
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Confirm New Password</Text>
              <View style={s.inputWrap}>
                {icon('verified-user')}
                <TextInput
                  style={s.input}
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry={!show}
                  autoCapitalize="none"
                  placeholder="Repeat new password"
                  {...inputProps}
                />
              </View>
            </View>

            <View style={s.hintCard}>
              <Icon name="shield" size={16} color={colors.secondary} />
              <Text style={s.hintTxt}>Other sessions will be signed out after the update.</Text>
            </View>

            <Button label={loading ? 'Updating...' : 'Update Password'} variant="primary" icon="lock-reset" fullWidth onPress={handleSubmit} disabled={loading} />
            <Pressable style={s.cancelBtn} onPress={close}><Text style={s.cancelTxt}>Cancel</Text></Pressable>
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
  field: {},
  label: { ...typography.labelMd, color: colors.onSurface, fontWeight: '600', marginBottom: spacing.xs },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: radius.md, backgroundColor: colors.surfaceContainerLowest, paddingHorizontal: spacing.sm + 2, height: 48 },
  input: { flex: 1, ...typography.bodyMd, color: colors.onSurface },
  hintCard: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', backgroundColor: colors.surfaceContainerLow, borderRadius: radius.md, padding: spacing.sm + 2 },
  hintTxt: { ...typography.bodySm, color: colors.onSurfaceVariant, flex: 1, lineHeight: 16 },
  cancelBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  cancelTxt: { ...typography.labelLg, color: colors.outline, fontWeight: '600' },
});