import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import { apiUpdateProfile } from '../data/api';
import type { ApiUser } from '../data/api';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

interface FormState {
  name: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  language: string;
  bio: string;
  street_address: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
  email_notifications: boolean;
  sms_notifications: boolean;
}

export function EditProfileScreen({ embedded = false }: { embedded?: boolean }) {
  const { user, token, isAuthenticated, updateUser } = useAuth();
  const { goBack, navigate } = useNavigation();
  const [form, setForm] = useState<FormState>({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    date_of_birth: '',
    gender: '',
    language: '',
    bio: '',
    street_address: '',
    city: '',
    region: '',
    postal_code: '',
    country: '',
    email_notifications: true,
    sms_notifications: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }
    let cancelled = false;
    fetchProfile(token)
      .then(profile => {
        if (cancelled) {
          return;
        }
        setForm(prev => ({
          ...prev,
          name: profile?.name ?? prev.name ?? '',
          phone: profile?.phone ?? prev.phone ?? '',
          date_of_birth: profile?.date_of_birth ?? '',
          gender: profile?.gender ?? '',
          language: profile?.language ?? 'english',
          bio: profile?.bio ?? '',
          street_address: profile?.street_address ?? '',
          city: profile?.city ?? '',
          region: profile?.region ?? '',
          postal_code: profile?.postal_code ?? '',
          country: profile?.country ?? '',
          email_notifications: profile?.email_notifications ?? true,
          sms_notifications: profile?.sms_notifications ?? false,
        }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token]);

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    if (!token) {
      setError('Please sign in to update your profile.');
      return;
    }
    if (!form.name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    setSaving(true);
    try {
      const updated = await apiUpdateProfile(token, {
        name: form.name.trim(),
        phone: form.phone?.trim() || null,
        date_of_birth: form.date_of_birth?.trim() || null,
        gender: form.gender?.trim() || null,
        language: form.language?.trim() || null,
        bio: form.bio?.trim() || null,
        street_address: form.street_address?.trim() || null,
        city: form.city?.trim() || null,
        region: form.region?.trim() || null,
        postal_code: form.postal_code?.trim() || null,
        country: form.country?.trim() ? form.country.trim().toUpperCase() : null,
        email_notifications: form.email_notifications,
        sms_notifications: form.sms_notifications,
      });
      if (user && updated) {
        updateUser({ ...user, name: updated.name ?? user.name, phone: updated.phone ?? user.phone });
      }
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated || !token) {
    return (
      <View style={styles.root}>
        {!embedded ? <AppHeader title="Edit Profile" showBack onBack={goBack} /> : null}
        <View style={styles.center}>
          <Icon name="person-outline" size={56} color={colors.outlineVariant} />
          <Text style={styles.centerTitle}>Sign in to edit your profile</Text>
          <Button label="Sign In" variant="primary" fullWidth onPress={() => navigate('Login')} style={styles.centerBtn} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {!embedded ? <AppHeader title="Edit Profile" showBack onBack={goBack} /> : null}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {error ? (
            <View style={styles.msgBox}>
              <Icon name="info" size={18} color={colors.error} />
              <Text style={[styles.msgText, { color: colors.error }]}>{error}</Text>
            </View>
          ) : null}
          {saved ? (
            <View style={styles.msgBox}>
              <Icon name="check-circle" size={18} color={colors.statusSuccess} />
              <Text style={[styles.msgText, { color: colors.statusSuccess }]}>Profile updated successfully.</Text>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Personal</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputWrap}>
              <Icon name="person-outline" size={20} color={colors.outline} />
              <TextInput style={styles.input} value={form.name} onChangeText={t => set('name', t)} placeholder="Your full name" placeholderTextColor={colors.outline} autoCapitalize="words" />
            </View>
            <Text style={styles.label}>Phone</Text>
            <View style={styles.inputWrap}>
              <Icon name="call" size={20} color={colors.outline} />
              <TextInput style={styles.input} value={form.phone} onChangeText={t => set('phone', t)} placeholder="+256..." placeholderTextColor={colors.outline} keyboardType="phone-pad" />
            </View>
            <Text style={styles.label}>Date of Birth</Text>
            <View style={styles.inputWrap}>
              <Icon name="event" size={20} color={colors.outline} />
              <TextInput style={styles.input} value={form.date_of_birth} onChangeText={t => set('date_of_birth', t)} placeholder="YYYY-MM-DD" placeholderTextColor={colors.outline} />
            </View>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.pillRow}>
              {['male', 'female', 'other'].map(g => (
                <Pressable
                  key={g}
                  style={[styles.pill, form.gender === g && styles.pillActive]}
                  onPress={() => set('gender', form.gender === g ? '' : g)}
                >
                  <Text style={[styles.pillText, form.gender === g && styles.pillTextActive]}>
                    {g[0].toUpperCase() + g.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Language</Text>
            <View style={styles.pillRow}>
              {['english', 'swahili', 'french', 'spanish', 'german'].map(l => (
                <Pressable
                  key={l}
                  style={[styles.pill, form.language.toLowerCase().startsWith(l) && styles.pillActive]}
                  onPress={() => set('language', form.language.toLowerCase().startsWith(l) ? '' : l)}
                >
                  <Text style={[styles.pillText, form.language.toLowerCase().startsWith(l) && styles.pillTextActive]}>{l[0].toUpperCase() + l.slice(1)}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Text style={styles.sectionTitle}>Address</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Street Address</Text>
            <View style={styles.inputWrap}>
              <Icon name="home" size={20} color={colors.outline} />
              <TextInput style={styles.input} value={form.street_address} onChangeText={t => set('street_address', t)} placeholder="Street address" placeholderTextColor={colors.outline} />
            </View>
            <Text style={styles.label}>City</Text>
            <View style={styles.inputWrap}>
              <Icon name="location-on" size={20} color={colors.outline} />
              <TextInput style={styles.input} value={form.city} onChangeText={t => set('city', t)} placeholder="City" placeholderTextColor={colors.outline} />
            </View>
            <Text style={styles.label}>Region / State</Text>
            <View style={styles.inputWrap}>
              <Icon name="map" size={20} color={colors.outline} />
              <TextInput style={styles.input} value={form.region} onChangeText={t => set('region', t)} placeholder="Region" placeholderTextColor={colors.outline} />
            </View>
            <Text style={styles.label}>Postal Code</Text>
            <View style={styles.inputWrap}>
              <Icon name="place" size={20} color={colors.outline} />
              <TextInput style={styles.input} value={form.postal_code} onChangeText={t => set('postal_code', t)} placeholder="Postal code" placeholderTextColor={colors.outline} />
            </View>
            <Text style={styles.label}>Country (2-letter code)</Text>
            <View style={styles.inputWrap}>
              <Icon name="public" size={20} color={colors.outline} />
              <TextInput style={styles.input} value={form.country} onChangeText={t => set('country', t)} placeholder="UG" placeholderTextColor={colors.outline} autoCapitalize="characters" maxLength={2} />
            </View>
          </View>

          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={form.bio}
              onChangeText={t => set('bio', t)}
              placeholder="Tell us a little about yourself..."
              placeholderTextColor={colors.outline}
              multiline
              numberOfLines={4}
            />
            <View style={styles.checkboxRow}>
              <Pressable
                style={[styles.checkbox, form.email_notifications && styles.checkboxOn]}
                onPress={() => set('email_notifications', !form.email_notifications)}
              >
                {form.email_notifications ? <Icon name="check" size={16} color={colors.onSecondary} /> : null}
              </Pressable>
              <Text style={styles.checkboxLabel}>Receive email notifications</Text>
            </View>
            <View style={styles.checkboxRow}>
              <Pressable
                style={[styles.checkbox, form.sms_notifications && styles.checkboxOn]}
                onPress={() => set('sms_notifications', !form.sms_notifications)}
              >
                {form.sms_notifications ? <Icon name="check" size={16} color={colors.onSecondary} /> : null}
              </Pressable>
              <Text style={styles.checkboxLabel}>Receive SMS notifications</Text>
            </View>
          </View>

          <Button label={saving ? 'Saving...' : 'Save Changes'} variant="primary" fullWidth onPress={handleSave} style={styles.saveBtn} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

async function fetchProfile(token: string): Promise<ApiUser | null> {
  try {
    const response = await fetch(`https://jemi-na.com/api/v1/profile`, {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    const json = await response.json();
    if (json?.success && json?.data?.user) {
      return json.data.user as ApiUser;
    }
    return null;
  } catch {
    return null;
  }
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
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  centerTitle: {
    ...typography.headlineLg,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  centerBtn: {
    width: '100%',
  },
  sectionTitle: {
    ...typography.headlineMd,
    color: colors.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.labelMd,
    color: colors.onSurface,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    marginTop: spacing.xs,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.onSurface,
    fontFamily: typography.bodyMd.fontFamily,
    fontSize: typography.bodyMd.fontSize,
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  pill: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
  },
  pillActive: {
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.secondaryContainer,
  },
  pillText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    textTransform: 'capitalize',
  },
  pillTextActive: {
    color: colors.onSecondary,
    fontWeight: '700',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.secondaryContainer,
  },
  checkboxLabel: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  msgBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  msgText: {
    ...typography.bodyMd,
    flex: 1,
  },
  saveBtn: {
    marginTop: spacing.xl,
  },
});