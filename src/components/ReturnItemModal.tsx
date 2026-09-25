import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from './Icon';
import { apiCreateReturn, apiGetPickupPoints, ApiOrderItem, ApiPickupPoint } from '../data/api';
import { formatUGX } from './ProductCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

// Matches the website's "Received item" return reasons
const RETURN_REASONS = [
  'Item damaged in transit',
  'Not as described',
  'Wrong item received',
  'Defective / Not working',
  'Other',
];

interface ReturnItemModalProps {
  visible: boolean;
  token: string;
  orderId: number;
  item: ApiOrderItem | null;
  onClose: () => void;
  onSubmitted: () => void;
}

export function ReturnItemModal({ visible, token, orderId, item, onClose, onSubmitted }: ReturnItemModalProps) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pickupPoints, setPickupPoints] = useState<ApiPickupPoint[] | null>(null);
  const [pickupPointId, setPickupPointId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setReason('');
    setNotes('');
    setPickupPoints(null);
    setPickupPointId(null);
    let active = true;
    apiGetPickupPoints()
      .then(points => {
        if (active) {
          setPickupPoints(points);
          setPickupPointId(points.find(p => p.is_default)?.id ?? points[0]?.id ?? null);
        }
      })
      .catch(() => {
        if (active) {
          setPickupPoints([]);
        }
      });
    return () => {
      active = false;
    };
  }, [visible]);

  const submit = async () => {
    if (!item) {
      return;
    }
    if (!reason) {
      Alert.alert('Reason Required', 'Please select a reason for the return.');
      return;
    }
    setSubmitting(true);
    try {
      await apiCreateReturn(token, {
        order_id: orderId,
        product_id: item.product_id,
        reason,
        customer_notes: notes.trim() || undefined,
        pickup_point_id: pickupPointId ? Number(pickupPointId) : undefined,
      });
      onClose();
      onSubmitted();
      Alert.alert(
        'Return Requested',
        'Your return request was submitted. Take the item to the selected pickup point within 24 hours.',
      );
    } catch (e) {
      Alert.alert('Return Failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!item) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Return Item</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="close" size={24} color={colors.onSurface} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.itemCard}>
              <Text style={styles.itemName} numberOfLines={2}>{item.product_name}</Text>
              <Text style={styles.itemMeta}>Qty {item.quantity} · {formatUGX(item.total)}</Text>
            </View>
            <Text style={styles.hint}>
              Return window: 24 hours from delivery. Drop the item at a pickup point below to complete the return.
            </Text>

            <Text style={styles.label}>Reason *</Text>
            {RETURN_REASONS.map(r => {
              const selected = reason === r;
              return (
                <Pressable
                  key={r}
                  style={[styles.optionRow, selected && styles.optionRowSelected]}
                  onPress={() => setReason(r)}
                >
                  <Icon
                    name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={18}
                    color={selected ? colors.primary : colors.outline}
                  />
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{r}</Text>
                </Pressable>
              );
            })}

            <Text style={styles.label}>Return to pickup point</Text>
            {pickupPoints === null ? (
              <View style={styles.pickupLoading}>
                <ActivityIndicator size="small" color={colors.secondary} />
                <Text style={styles.hint}>Loading pickup points...</Text>
              </View>
            ) : pickupPoints.length === 0 ? (
              <Text style={styles.hint}>No pickup points available yet.</Text>
            ) : (
              pickupPoints.map(point => {
                const selected = pickupPointId === point.id;
                return (
                  <Pressable
                    key={point.id}
                    style={[styles.optionRow, selected && styles.optionRowSelected]}
                    onPress={() => setPickupPointId(point.id)}
                  >
                    <Icon
                      name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                      size={18}
                      color={selected ? colors.primary : colors.outline}
                    />
                    <View style={styles.pickupBody}>
                      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                        {point.name}
                        {point.is_default ? ' · Default' : ''}
                      </Text>
                      <Text style={styles.pickupMeta}>
                        {[point.location, point.city, point.hours].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}

            <Text style={styles.label}>
              Notes <Text style={styles.labelMuted}>(optional)</Text>
            </Text>
            <TextInput
              style={styles.notesInput}
              multiline
              value={notes}
              onChangeText={setNotes}
              placeholder="Provide additional details about your request..."
              placeholderTextColor={colors.outline}
              textAlignVertical="top"
            />
          </ScrollView>
          <View style={styles.footer}>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={onClose} disabled={submitting}>
              <Text style={styles.btnGhostText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnSolid, submitting && styles.btnDisabled]}
              onPress={submit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <>
                  <Icon name="send" size={16} color={colors.onPrimary} />
                  <Text style={styles.btnSolidText}>Submit Request</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  modalTitle: {
    ...typography.labelSm,
    color: colors.onSurface,
    fontWeight: '700',
    flex: 1,
    marginRight: spacing.sm,
  },
  itemCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: 2,
  },
  itemName: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  itemMeta: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  hint: {
    ...typography.bodySm,
    color: colors.outline,
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  labelMuted: {
    ...typography.bodySm,
    color: colors.outline,
    fontWeight: '400',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    backgroundColor: colors.surface,
    marginBottom: 6,
  },
  optionRowSelected: {
    borderColor: colors.primaryContainer,
    backgroundColor: colors.surfaceContainerLow,
  },
  optionText: {
    ...typography.bodySm,
    color: colors.onSurface,
    flexShrink: 1,
  },
  optionTextSelected: {
    fontWeight: '700',
  },
  pickupBody: {
    flex: 1,
  },
  pickupMeta: {
    ...typography.labelSm,
    color: colors.outline,
    marginTop: 1,
  },
  pickupLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  notesInput: {
    ...typography.bodySm,
    color: colors.onSurface,
    minHeight: 84,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.md,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHigh,
    backgroundColor: colors.surfaceContainerLowest,
  },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
  },
  btnGhostText: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: '600',
  },
  btnSolid: {
    backgroundColor: colors.primaryContainer,
  },
  btnSolidText: {
    ...typography.labelLg,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.7,
  },
});
