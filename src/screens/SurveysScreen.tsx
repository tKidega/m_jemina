import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import {
  apiGetSurveys,
  apiGetSurvey,
  apiSubmitSurvey,
  ApiSurvey,
  ApiSurveyQuestion,
  ApiVendorJourney,
} from '../data/api';
import { formatUGX } from '../components/ProductCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

export function SurveysScreen() {
  const { token, isAuthenticated } = useAuth();
  const { goBack, navigate } = useNavigation();
  const [surveys, setSurveys] = useState<ApiSurvey[]>([]);
  const [vendorJourney, setVendorJourney] = useState<ApiVendorJourney | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSurvey, setActiveSurvey] = useState<ApiSurvey | null>(null);
  const [activeLoading, setActiveLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  const loadSurveys = useCallback(
    async (isRefresh = false) => {
      if (!token) {
        setLoading(false);
        return;
      }
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        const data = await apiGetSurveys(token);
        setSurveys(data.surveys);
        setVendorJourney(data.vendorJourney);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load surveys.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    loadSurveys();
  }, [loadSurveys]);

  const onRefresh = useCallback(() => loadSurveys(true), [loadSurveys]);

  const startSurvey = async (survey: ApiSurvey) => {
    setActiveSurvey(survey);
    setAnswers({});
    setActiveLoading(true);
    if (token) {
      try {
        const detail = await apiGetSurvey(token, survey.id);
        setActiveSurvey(detail);
      } catch {
        setActiveLoading(false);
      } finally {
        setActiveLoading(false);
      }
    }
  };

  const closeSurvey = () => {
    if (submitting) {
      return;
    }
    setActiveSurvey(null);
    setAnswers({});
  };

  const chooseOption = (questionId: number, option: string) => {
    setAnswers(prev => {
      const current = prev[questionId];
      if (Array.isArray(current)) {
        return { ...prev, [questionId]: current.includes(option) ? current.filter(o => o !== option) : [...current, option] };
      }
      return { ...prev, [questionId]: option };
    });
  };

  const submitSurvey = async () => {
    if (!activeSurvey || !token) {
      return;
    }
    const required = activeSurvey.questions?.filter(q => q.is_required) ?? [];
    const missing = required.filter(q => !answers[q.id] || (Array.isArray(answers[q.id]) && answers[q.id].length === 0));
    if (missing.length > 0) {
      Alert.alert('Incomplete survey', 'Please answer all required questions.');
      return;
    }
    const payload = (activeSurvey.questions ?? [])
      .filter(q => answers[q.id] !== undefined)
      .map(q => ({ question_id: q.id, answer: answers[q.id] as string | string[] }));
    setSubmitting(true);
    try {
      const awarded = await apiSubmitSurvey(token, activeSurvey.id, payload);
      setActiveSurvey(null);
      setAnswers({});
      loadSurveys();
      Alert.alert(
        'Survey submitted',
        awarded > 0 ? `Thank you! You earned ${formatUGX(awarded)} in credit.` : 'Thank you for your feedback!',
      );
    } catch (e) {
      Alert.alert('Submission failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated || !token) {
    return (
      <View style={styles.root}>
        <AppHeader title="Surveys" showBack onBack={goBack} />
        <View style={styles.center}>
          <Icon name="edit-note" size={56} color={colors.outlineVariant} />
          <Text style={styles.centerTitle}>Sign in to take surveys</Text>
          <Text style={styles.centerSub}>Earn JEMINA credits for sharing your feedback.</Text>
          <Button label="Sign In" variant="primary" fullWidth onPress={() => {}} style={styles.centerBtn} />
        </View>
      </View>
    );
  }

  if (activeSurvey) {
    const questions: ApiSurveyQuestion[] = activeSurvey.questions ?? [];
    return (
      <View style={styles.root}>
        <AppHeader title="Survey" showBack onBack={closeSurvey} />
        {activeLoading ? (
          <View style={styles.center}><Text style={styles.loadingText}>Loading survey...</Text></View>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.surveyTitle}>{activeSurvey.survey_name}</Text>
            {activeSurvey.survey_description ? (
              <Text style={styles.surveyDesc}>{activeSurvey.survey_description}</Text>
            ) : null}
            <Text style={styles.surveyReward}>Reward: {formatUGX(activeSurvey.credit_reward)}</Text>

            {questions.map((q, qi) => (
              <View key={q.id} style={styles.questionCard}>
                <Text style={styles.questionText}>
                  {qi + 1}. {q.question}
                  {q.is_required ? ' *' : ''}
                </Text>
                {q.type === 'choice' || q.type === 'single' || q.type === 'radio' ? (
                  q.options.map(opt => (
                    <Pressable
                      key={opt}
                      style={[styles.optionRow, answers[q.id] === opt && styles.optionRowOn]}
                      onPress={() => chooseOption(q.id, opt)}
                    >
                      {answers[q.id] === opt ? (
                        <Icon name="radio-button-checked" size={20} color={colors.secondary} />
                      ) : (
                        <Icon name="radio-button-unchecked" size={20} color={colors.outline} />
                      )}
                      <Text style={[styles.optionText, answers[q.id] === opt && styles.optionTextOn]}>{opt}</Text>
                    </Pressable>
                  ))
                ) : q.type === 'multi' || q.type === 'checkbox' || q.type === 'multiple' ? (
                  q.options.map(opt => {
                    const selected = Array.isArray(answers[q.id]) && (answers[q.id] as string[]).includes(opt);
                    return (
                      <Pressable
                        key={opt}
                        style={[styles.optionRow, selected && styles.optionRowOn]}
                        onPress={() => chooseOption(q.id, opt)}
                      >
                        {selected ? (
                          <Icon name="check-box" size={20} color={colors.secondary} />
                        ) : (
                          <Icon name="check-box-outline-blank" size={20} color={colors.outline} />
                        )}
                        <Text style={[styles.optionText, selected && styles.optionTextOn]}>{opt}</Text>
                      </Pressable>
                    );
                  })
                ) : (
                  q.options && q.options.length > 0 ? (
                    q.options.map(opt => {
                      const rating = answers[q.id];
                      return (
                        <Pressable
                          key={opt}
                          style={[styles.ratingRow, rating === opt && styles.ratingRowOn]}
                          onPress={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                        >
                          <Text style={[styles.ratingText, rating === opt && styles.ratingTextOn]}>{opt}</Text>
                        </Pressable>
                      );
                    })
                  ) : null
                )}
              </View>
            ))}

            <Button
              label={submitting ? 'Submitting...' : 'Submit Survey'}
              variant="primary"
              fullWidth
              onPress={submitSurvey}
              style={styles.submitBtn}
            />
          </ScrollView>
        )}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader title="Surveys" showBack onBack={goBack} />
      {loading ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading surveys...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Icon name="error-outline" size={48} color={colors.outlineVariant} />
          <Text style={styles.centerTitle}>Couldn't load surveys</Text>
          <Text style={styles.centerSub}>{error}</Text>
          <Button label="Try Again" variant="primary" fullWidth onPress={() => loadSurveys()} style={styles.centerBtn} />
        </View>
      ) : surveys.length === 0 ? (
        <View style={styles.center}>
          <Icon name="edit-note" size={56} color={colors.outlineVariant} />
          <Text style={styles.centerTitle}>No surveys available</Text>
          <Text style={styles.centerSub}>Check back later for new surveys and credit rewards.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
        >
          {vendorJourney?.both_completed ? (
            <Pressable style={styles.actionsBanner} onPress={() => navigate('VendorActions')}>
              <View style={styles.actionsBannerIcon}>
                <Icon name="storefront" size={24} color={colors.onPrimary} />
              </View>
              <View style={styles.actionsBannerBody}>
                <Text style={styles.actionsBannerTitle}>Vendor Actions Unlocked</Text>
                <Text style={styles.actionsBannerSub}>
                  {vendorJourney.has_vendor ? 'View your registered e-Store' : 'Review the agreement and register your e-Store'}
                </Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.onPrimary} />
            </Pressable>
          ) : null}
          {surveys.map(survey => (
            <SurveyCard key={survey.id} survey={survey} onStart={() => startSurvey(survey)} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function SurveyCard({ survey, onStart }: { survey: ApiSurvey; onStart: () => void }) {
  const isVendor = survey.type === 'vendor';
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, survey.completed && styles.iconWrapDone]}>
          <Icon name="edit-note" size={22} color={survey.completed ? colors.onPrimary : colors.secondary} />
        </View>
        <View style={styles.cardHeaderBody}>
          <Text style={styles.cardTitle}>{survey.survey_name}</Text>
          {isVendor ? (
            <Text style={styles.vendorTag}>Vendor Qualification</Text>
          ) : (
            <Text style={styles.userTag}>User Experience</Text>
          )}
          {survey.survey_description ? <Text style={styles.cardDesc} numberOfLines={2}>{survey.survey_description}</Text> : null}
        </View>
      </View>
      {survey.locked ? <View style={styles.cardFooter}><View style={styles.lockedChip}><Icon name="lock" size={14} color={colors.onSurfaceVariant} /><Text style={styles.lockedChipText}>Complete the User Experience survey to unlock</Text></View></View> : (
          <View style={styles.cardFooter}>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Reward</Text>
              <Text style={styles.metaValue}>{formatUGX(survey.credit_reward)}</Text>
            </View>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Questions</Text>
              <Text style={styles.metaValue}>{survey.questions_count ?? 0}</Text>
            </View>
            {survey.completed ? (
              <View style={styles.completedChip}>
                <Icon name="check" size={14} color={colors.onPrimary} />
                <Text style={styles.completedChipText}>Completed</Text>
              </View>
            ) : (
              <Button label="Start" variant="primary" onPress={onStart} style={styles.startBtn} />
            )}
          </View>)}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
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
  },
  centerSub: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  centerBtn: {
    width: '100%',
  },
  loadingText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDone: {
    backgroundColor: colors.statusSuccess,
  },
  cardHeaderBody: {
    flex: 1,
  },
  cardTitle: {
    ...typography.headlineMd,
    color: colors.primary,
    fontWeight: '700',
  },
  userTag: {
    ...typography.labelSm,
    color: colors.secondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  vendorTag: {
    ...typography.labelSm,
    color: colors.statusFlash,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  cardDesc: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
  },
  metaBox: {
    flex: 1,
  },
  metaLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  metaValue: {
    ...typography.headlineMd,
    color: colors.secondary,
    fontWeight: '700',
  },
  completedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.statusSuccess,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  completedChipText: {
    ...typography.labelSm,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  lockedChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
  },
  lockedChipText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  actionsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.statusSuccess,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  actionsBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsBannerBody: {
    flex: 1,
  },
  actionsBannerTitle: {
    ...typography.headlineMd,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  actionsBannerSub: {
    ...typography.labelMd,
    color: colors.onPrimary,
    marginTop: 2,
  },
  startBtn: {
    paddingHorizontal: spacing.lg,
  },
  surveyTitle: {
    ...typography.headlineLg,
    color: colors.primary,
    fontWeight: '700',
  },
  surveyDesc: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  surveyReward: {
    ...typography.labelMd,
    color: colors.secondary,
    fontWeight: '700',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  questionCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  questionText: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
  },
  optionRowOn: {
    backgroundColor: colors.secondaryContainer,
  },
  optionText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    flex: 1,
  },
  optionTextOn: {
    color: colors.onSecondary,
    fontWeight: '600',
  },
  ratingRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.full,
    marginBottom: spacing.sm,
  },
  ratingRowOn: {
    borderColor: colors.secondary,
    backgroundColor: colors.secondaryContainer,
  },
  ratingText: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  ratingTextOn: {
    color: colors.onSecondary,
    fontWeight: '700',
  },
  submitBtn: {
    marginTop: spacing.md,
  },
});