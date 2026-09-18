import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppHeader } from '../components/AppHeader';
import { Icon, IconName } from '../components/Icon';
import { Button } from '../components/Button';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import {
  apiGetSurveys,
  apiGetSurvey,
  apiSubmitSurvey,
  ApiSurvey,
  ApiSurveyQuestion,
} from '../data/api';
import { formatUGX } from '../components/ProductCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

/* ─── Draft persistence (save progress, resume later) ─── */

interface SurveyDraft {
  answers: Record<number, string | string[]>;
  activeIdx: number;
}
type SurveyDrafts = Record<number, SurveyDraft>;
const draftsKey = (userId: string) => `@jemina/surveys/drafts/v1:${userId}`;

export function SurveysScreen() {
  const { token, isAuthenticated, user } = useAuth();
  const { goBack, navigate } = useNavigation();
  const [surveys, setSurveys] = useState<ApiSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per-survey expanded state: surveyId → { questions, answers, active question }
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [surveyQuestions, setSurveyQuestions] = useState<Record<number, ApiSurveyQuestion[]>>({});
  const [answers, setAnswers] = useState<Record<number, Record<number, string | string[]>>>({});
  const [activeIndexes, setActiveIndexes] = useState<Record<number, number>>({});
  const [surveyLoading, setSurveyLoading] = useState<number | null>(null);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [draftsLoaded, setDraftsLoaded] = useState(false);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Hydrate drafts for the signed-in user */
  const userId = user?.id ?? null;
  useEffect(() => {
    setAnswers({});
    setActiveIndexes({});
    setDraftsLoaded(false);
    if (!userId) return;
    let cancelled = false;
    AsyncStorage.getItem(draftsKey(userId))
      .then(raw => {
        if (cancelled || !raw) return;
        try {
          const parsed = JSON.parse(raw) as SurveyDrafts;
          const ans: Record<number, Record<number, string | string[]>> = {};
          const idx: Record<number, number> = {};
          Object.keys(parsed).forEach(k => {
            const sid = Number(k);
            const d = parsed[sid];
            if (d && d.answers && Object.keys(d.answers).length > 0) ans[sid] = d.answers;
            if (d && typeof d.activeIdx === 'number' && d.activeIdx > 0) idx[sid] = d.activeIdx;
          });
          setAnswers(prev => {
            const next = { ...prev };
            Object.keys(ans).forEach(sid => {
              next[Number(sid)] = ans[Number(sid)];
            });
            return next;
          });
          setActiveIndexes(idx);
        } catch {
          // ignore corrupt drafts
        }
      })
      .finally(() => {
        if (!cancelled) setDraftsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  /* Persist drafts (debounced) whenever answers / active question change */
  useEffect(() => {
    if (!draftsLoaded || !user) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      const surveyIds = new Set<number>([
        ...Object.keys(answers).map(Number),
        ...Object.keys(activeIndexes).map(Number),
      ]);
      if (surveyIds.size === 0) {
        AsyncStorage.removeItem(draftsKey(user.id)).catch(() => {});
        return;
      }
      const payload: SurveyDrafts = {};
      surveyIds.forEach(sid => {
        payload[sid] = {
          answers: answers[sid] ?? {},
          activeIdx: activeIndexes[sid] ?? 0,
        };
      });
      AsyncStorage.setItem(draftsKey(user.id), JSON.stringify(payload)).catch(() => {});
    }, 300);
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [draftsLoaded, user, answers, activeIndexes]);

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

  const toggleExpand = useCallback(
    async (survey: ApiSurvey) => {
      if (expandedId === survey.id) {
        setExpandedId(null);
        return;
      }
      setExpandedId(survey.id);

      // Load questions if not cached
      if (!surveyQuestions[survey.id] && token) {
        setSurveyLoading(survey.id);
        try {
          const detail = await apiGetSurvey(token, survey.id);
          setSurveyQuestions(prev => ({ ...prev, [survey.id]: detail.questions ?? [] }));
          // Merge any server-side answers with locally saved draft (draft wins)
          const init: Record<number, string | string[]> = {};
          if (detail.questions) {
            detail.questions.forEach(q => {
              if (q.answer != null) {
                init[q.id] = q.answer as string | string[];
              }
            });
          }
          setAnswers(prev => ({
            ...prev,
            [survey.id]: { ...init, ...(prev[survey.id] ?? {}) },
          }));
          setActiveIndexes(prev => ({ ...prev, [survey.id]: prev[survey.id] ?? 0 }));
        } catch {
          Alert.alert('Error', 'Failed to load survey questions.');
        } finally {
          setSurveyLoading(null);
        }
      }
    },
    [expandedId, surveyQuestions, token],
  );

  const chooseOption = useCallback((surveyId: number, questionId: number, option: string) => {
    setAnswers(prev => {
      const surveyAns = prev[surveyId] ?? {};
      const current = surveyAns[questionId];
      let newVal: string | string[];
      if (Array.isArray(current)) {
        newVal = current.includes(option)
          ? current.filter(o => o !== option)
          : [...current, option];
      } else {
        newVal = option;
      }
      return { ...prev, [surveyId]: { ...surveyAns, [questionId]: newVal } };
    });
  }, []);

  const typeAnswer = useCallback((surveyId: number, questionId: number, text: string) => {
    setAnswers(prev => {
      const surveyAns = { ...(prev[surveyId] ?? {}) };
      if (text.trim().length === 0) {
        delete surveyAns[questionId];
      } else {
        surveyAns[questionId] = text;
      }
      return { ...prev, [surveyId]: surveyAns };
    });
  }, []);

  const setActiveQuestion = useCallback((surveyId: number, idx: number) => {
    setActiveIndexes(prev => ({ ...prev, [surveyId]: idx }));
  }, []);

  const submitSurvey = useCallback(
    async (surveyId: number) => {
      if (!token) return;
      const questions = surveyQuestions[surveyId] ?? [];
      const surveyAns = answers[surveyId] ?? {};
      const required = questions.filter(q => q.is_required);
      const missing = required.filter(
        q =>
          surveyAns[q.id] === undefined ||
          (Array.isArray(surveyAns[q.id]) && (surveyAns[q.id] as string[]).length === 0),
      );
      if (missing.length > 0) {
        Alert.alert('Incomplete', 'Please answer all required questions before submitting.');
        return;
      }
      const payload = questions
        .filter(q => surveyAns[q.id] !== undefined)
        .map(q => ({ question_id: q.id, answer: surveyAns[q.id] as string | string[] }));
      setSubmittingId(surveyId);
      try {
        const awarded = await apiSubmitSurvey(token, surveyId, payload);
        setExpandedId(null);
        setSurveyQuestions(prev => {
          const next = { ...prev };
          delete next[surveyId];
          return next;
        });
        setAnswers(prev => {
          const next = { ...prev };
          delete next[surveyId];
          return next;
        });
        setActiveIndexes(prev => {
          const next = { ...prev };
          delete next[surveyId];
          return next;
        });
        loadSurveys();
        Alert.alert(
          'Survey submitted',
          awarded > 0
            ? `Thank you! You earned ${formatUGX(awarded)} in credit.`
            : 'Thank you for your feedback!',
        );
      } catch (e) {
        Alert.alert('Submission failed', e instanceof Error ? e.message : 'Please try again.');
      } finally {
        setSubmittingId(null);
      }
    },
    [token, surveyQuestions, answers, loadSurveys],
  );

  const userSurveys = surveys.filter(s => (s.type ?? 'user') !== 'vendor');
  const vendorSurveys = surveys.filter(s => s.type === 'vendor');
  const availableCount = surveys.filter(s => !s.completed).length;
  const completedCount = surveys.filter(s => s.completed).length;
  // Rewards are disabled server-side (submit returns credit_awarded: 0) — show 0.
  const claimedRewards = 0;

  // ─── Not authenticated ─────────────────────────────
  if (!isAuthenticated || !token) {
    return (
      <View style={styles.root}>
        <AppHeader title="Surveys & Feedback" showBack onBack={goBack} />
        <View style={styles.center}>
          <Icon name="edit-note" size={56} color={colors.outlineVariant} />
          <Text style={styles.centerTitle}>Sign in to take surveys</Text>
          <Text style={styles.centerSub}>Share your feedback to help improve JEMINA and earn credits.</Text>
          <Button
            label="Sign In"
            variant="primary"
            fullWidth
            onPress={() => navigate('Login')}
            style={styles.centerBtn}
          />
        </View>
      </View>
    );
  }

  // ─── Main list ─────────────────────────────────────
  return (
    <View style={styles.root}>
      <AppHeader title="Surveys & Feedback" showBack onBack={goBack} />
      {loading ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading surveys...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Icon name="error-outline" size={48} color={colors.outlineVariant} />
          <Text style={styles.centerTitle}>Couldn't load surveys</Text>
          <Text style={styles.centerSub}>{error}</Text>
          <Button
            label="Try Again"
            variant="primary"
            fullWidth
            onPress={() => loadSurveys()}
            style={styles.centerBtn}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />
          }
        >
          {/* Credits badge */}
          <View style={styles.creditsBadge}>
            <Icon name="monetization-on" size={18} color={colors.statusSuccess} />
            <Text style={styles.creditsText}>{formatUGX(claimedRewards)} Credits</Text>
          </View>

          {/* Hero card */}
          <View style={styles.heroCard}>
            <View style={styles.heroRow}>
              <View style={styles.heroIconWrap}>
                <Icon name="insights" size={24} color={colors.primary} />
              </View>
              <View style={styles.heroBody}>
                <Text style={styles.heroTitle}>Jemina Survey Rewards</Text>
                <View style={styles.heroActiveRow}>
                  <View style={styles.heroActiveDot} />
                  <Text style={styles.heroActiveText}>Active</Text>
                </View>
              </View>
              <View style={styles.heroVerified}>
                <Icon name="verified" size={18} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.heroDesc}>
              Share your experience and complete vendor verification to earn JEMINA B2B trade credits
              and unlock higher escrow credit tiers for Gulu, Lira &amp; Kitgum operations.
            </Text>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{availableCount}</Text>
              <Text style={styles.statLabel}>Available Surveys</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{completedCount}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{formatUGX(claimedRewards)}</Text>
              <Text style={styles.statLabel}>Rewards Claimed</Text>
            </View>
          </View>

          {/* Community & Platform UX */}
          {userSurveys.length > 0 && (
            <>
              <SectionHeader
                icon="quiz"
                title="Community & Platform UX"
                subtitle={`${userSurveys.length} available survey${userSurveys.length > 1 ? 's' : ''}`}
              />
              {userSurveys.map(survey => (
                <SurveyCard
                  key={survey.id}
                  survey={survey}
                  expanded={expandedId === survey.id}
                  onToggle={() => toggleExpand(survey)}
                  questions={surveyQuestions[survey.id] ?? null}
                  loading={surveyLoading === survey.id}
                  surveyAnswers={answers[survey.id] ?? {}}
                  activeIdx={activeIndexes[survey.id] ?? 0}
                  onSetActiveIdx={idx => setActiveQuestion(survey.id, idx)}
                  onChoose={(qId, opt) => chooseOption(survey.id, qId, opt)}
                  onType={(qId, text) => typeAnswer(survey.id, qId, text)}
                  onSubmit={() => submitSurvey(survey.id)}
                  submitting={submittingId === survey.id}
                />
              ))}
            </>
          )}

          {/* B2B Supplier Compliance */}
          {vendorSurveys.length > 0 && (
            <>
              <SectionHeader
                icon="assignment"
                title="B2B Supplier Compliance"
                subtitle="Verified vendor badge & Tier 2 escrow"
              />
              {vendorSurveys.map(survey => (
                <SurveyCard
                  key={survey.id}
                  survey={survey}
                  expanded={expandedId === survey.id}
                  onToggle={() => toggleExpand(survey)}
                  questions={surveyQuestions[survey.id] ?? null}
                  loading={surveyLoading === survey.id}
                  surveyAnswers={answers[survey.id] ?? {}}
                  activeIdx={activeIndexes[survey.id] ?? 0}
                  onSetActiveIdx={idx => setActiveQuestion(survey.id, idx)}
                  onChoose={(qId, opt) => chooseOption(survey.id, qId, opt)}
                  onType={(qId, text) => typeAnswer(survey.id, qId, text)}
                  onSubmit={() => submitSurvey(survey.id)}
                  submitting={submittingId === survey.id}
                />
              ))}
            </>
          )}

          {/* Security notice */}
          <View style={styles.securityCard}>
            <Icon name="security" size={20} color={colors.onSurfaceVariant} />
            <View style={styles.securityBody}>
              <Text style={styles.securityTitle}>Jemina Feedback Guarantee</Text>
              <Text style={styles.securityDesc}>
                Survey answers are encrypted and used for platform optimization and verified
                supplier vetting. Credits earned are credited directly to your JEMINA Credit
                balance — usable at checkout across the marketplace.
              </Text>
              <View style={styles.securityChips}>
                <View style={styles.securityChip}>
                  <Icon name="lock" size={14} color={colors.onSurfaceVariant} />
                  <Text style={styles.securityChipText}>256-Bit Encrypted</Text>
                </View>
                <View style={styles.securityChip}>
                  <Icon name="account-balance-wallet" size={14} color={colors.onSurfaceVariant} />
                  <Text style={styles.securityChipText}>Instant Credit</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

/* ─── Survey Card (inline expandable) ──────────────────── */

function minutesLabel(count: number) {
  const mins = Math.max(1, Math.round((count * 18) / 60));
  return `~${mins} min${mins > 1 ? 's' : ''}`;
}

function SurveyCard({
  survey,
  expanded,
  onToggle,
  questions,
  loading,
  surveyAnswers,
  activeIdx,
  onSetActiveIdx,
  onChoose,
  onType,
  onSubmit,
  submitting,
}: {
  survey: ApiSurvey;
  expanded: boolean;
  onToggle: () => void;
  questions: ApiSurveyQuestion[] | null;
  loading: boolean;
  surveyAnswers: Record<number, string | string[]>;
  activeIdx: number;
  onSetActiveIdx: (idx: number) => void;
  onChoose: (questionId: number, option: string) => void;
  onType: (questionId: number, text: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const isVendor = survey.type === 'vendor';
  const questionsCount = survey.questions_count ?? 0;
  const completed = survey.completed ?? false;
  const locked = survey.locked ?? false;

  const qs = questions ?? [];
  const answeredCount =
    qs.length > 0
      ? qs.filter(q => surveyAnswers[q.id] !== undefined).length
      : Object.keys(surveyAnswers).length;
  const currentQ = activeIdx < qs.length ? qs[activeIdx] : undefined;
  const allDone = qs.length > 0 && activeIdx >= qs.length;
  const progressPct =
    qs.length > 0
      ? Math.round((answeredCount / qs.length) * 100)
      : questionsCount > 0
        ? Math.round((answeredCount / questionsCount) * 100)
        : 0;

  const goNext = useCallback(() => {
    if (!currentQ) return;
    const hasAnswer =
      surveyAnswers[currentQ.id] !== undefined &&
      !(
        Array.isArray(surveyAnswers[currentQ.id]) &&
        (surveyAnswers[currentQ.id] as string[]).length === 0
      );
    if (hasAnswer || !currentQ.is_required) {
      onSetActiveIdx(Math.min(activeIdx + 1, qs.length));
    } else {
      Alert.alert('Question required', 'Please answer this question to continue.');
    }
  }, [currentQ, surveyAnswers, activeIdx, qs.length, onSetActiveIdx]);

  const goSkip = useCallback(() => {
    if (currentQ) {
      onSetActiveIdx(Math.min(activeIdx + 1, qs.length));
    }
  }, [currentQ, activeIdx, qs.length, onSetActiveIdx]);

  return (
    <View style={[styles.card, expanded && styles.cardExpanded]}>
      {/* ── Card header (always visible) ── */}
      <Pressable onPress={onToggle} style={styles.cardPressable}>
        <View style={styles.cardRow}>
          <View style={[styles.cardIconWrap, completed && styles.cardIconWrapDone]}>
            <Icon
              name={isVendor ? 'assignment' : 'quiz'}
              size={22}
              color={completed ? colors.onPrimary : colors.secondary}
            />
          </View>
          <View style={styles.cardMeta}>
            <Text style={styles.cardCount}>
              {questionsCount} Questions · {minutesLabel(questionsCount)}
            </Text>
            <Text style={styles.cardTitle}>{survey.survey_name}</Text>
          </View>
        </View>

        {/* Reward chip */}
        {isVendor ? (
          <View style={styles.cardRewardRow}>
            <Icon name="verified-user" size={16} color={colors.statusSuccess} />
            <Text style={styles.cardRewardText}>Verified Vendor Badge + Tier 2 Escrow Limit</Text>
          </View>
        ) : null}

        {/* Description */}
        {survey.survey_description ? (
          <Text style={styles.cardDesc}>{survey.survey_description}</Text>
        ) : null}

        {/* Tags */}
        <View style={styles.cardTags}>
          {isVendor ? (
            <>
              <Tag label="UNBS Certification" />
              <Tag label="Warehouse Capacity" />
              <Tag label="Tax/EFRIS" />
            </>
          ) : (
            <>
              <Tag label="Payment Rails" />
              <Tag label="Hub Logistics" />
              <Tag label="App Speed" />
            </>
          )}
        </View>
      </Pressable>

      {/* ── Status bar / action row ── */}
      {completed ? (
        <View style={styles.cardFooter}>
          <View style={styles.cardCompletedRow}>
            <Icon name="check-circle" size={18} color={colors.statusSuccess} />
            <Text style={styles.cardCompletedText}>Completed</Text>
          </View>
        </View>
      ) : locked ? (
        <View style={styles.cardFooter}>
          <View style={styles.cardLockedRow}>
            <Icon name="lock" size={16} color={colors.onSurfaceVariant} />
            <Text style={styles.cardLockedText}>
              Complete the User Experience survey to unlock
            </Text>
          </View>
        </View>
      ) : expanded ? (
        /* ── Expanded inline question view ── */
        <View style={styles.cardExpandedBody}>
          {/* Progress */}
          <View style={styles.progressBarWrap}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
            </View>
            <Text style={styles.progressLabel}>
              {progressPct}% completed · {answeredCount}/{qs.length} answered
            </Text>
          </View>

          {loading ? (
            <View style={styles.qLoading}>
              <ActivityIndicator size="small" color={colors.secondary} />
              <Text style={styles.qLoadingText}>Loading questions...</Text>
            </View>
          ) : allDone ? (
            /* ── All questions answered ── */
            <View style={styles.qAllDone}>
              <Icon name="check-circle" size={36} color={colors.statusSuccess} />
              <Text style={styles.qAllDoneTitle}>All questions answered!</Text>
              <Text style={styles.qAllDoneSub}>Review or submit your responses.</Text>
              <Button
                label={submitting ? 'Submitting...' : 'Submit Survey'}
                variant="primary"
                icon="arrow-forward"
                onPress={onSubmit}
                style={styles.qSubmitBtn}
              />
            </View>
          ) : currentQ ? (
            /* ── Quick Question Preview (inline) ── */
            <View style={styles.qPreview}>
              {/* Question header */}
              <View style={styles.qPreviewHeader}>
                <Text style={styles.qPreviewLabel}>Quick Question Preview</Text>
                <Text style={styles.qPreviewCount}>
                  Q {activeIdx + 1} of {qs.length}
                </Text>
              </View>

              {/* Question text */}
              <Text style={styles.qPreviewText}>{currentQ.question}</Text>

              {/* Options */}
              <View style={styles.qOptions}>
                {(currentQ.type === 'choice' ||
                  currentQ.type === 'single' ||
                  currentQ.type === 'radio' ||
                  currentQ.type === 'select') && (
                  <>
                    {currentQ.type === 'select' ? (
                      <Text style={styles.qInputHint}>Select an option</Text>
                    ) : null}
                    {currentQ.options.map(opt => {
                      const selected = surveyAnswers[currentQ.id] === opt;
                      return (
                        <Pressable
                          key={opt}
                          style={[styles.qOpt, selected && styles.qOptOn]}
                          onPress={() => onChoose(currentQ.id, opt)}
                        >
                          <View style={[styles.qRadio, selected && styles.qRadioOn]}>
                            {selected && <View style={styles.qRadioDot} />}
                          </View>
                          <Text style={[styles.qOptText, selected && styles.qOptTextOn]}>
                            {opt}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </>
                )}

                {(currentQ.type === 'multi' ||
                  currentQ.type === 'checkbox' ||
                  currentQ.type === 'multiple') &&
                  currentQ.options.map(opt => {
                    const sel =
                      Array.isArray(surveyAnswers[currentQ.id]) &&
                      (surveyAnswers[currentQ.id] as string[]).includes(opt);
                    return (
                      <Pressable
                        key={opt}
                        style={[styles.qOpt, sel && styles.qOptOn]}
                        onPress={() => onChoose(currentQ.id, opt)}
                      >
                        <View style={[styles.qCheck, sel && styles.qCheckOn]}>
                          {sel && <Icon name="check" size={14} color={colors.onPrimary} />}
                        </View>
                        <Text style={[styles.qOptText, sel && styles.qOptTextOn]}>
                          {opt}
                        </Text>
                      </Pressable>
                    );
                  })}

                {currentQ.type === 'text' && (
                  <TextInput
                    style={styles.qInput}
                    value={(surveyAnswers[currentQ.id] as string) ?? ''}
                    onChangeText={txt => onType(currentQ.id, txt)}
                    placeholder="Type your answer here..."
                    placeholderTextColor={colors.outline}
                    returnKeyType="done"
                  />
                )}

                {currentQ.type === 'textarea' && (
                  <TextInput
                    style={[styles.qInput, styles.qInputMultiline]}
                    value={(surveyAnswers[currentQ.id] as string) ?? ''}
                    onChangeText={txt => onType(currentQ.id, txt)}
                    placeholder="Type your answer here..."
                    placeholderTextColor={colors.outline}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                )}
              </View>

              {/* Action row */}
              <View style={styles.qActions}>
                <Button
                  label={currentQ && !currentQ.is_required ? 'Save & Continue' : 'Save & Next'}
                  variant="primary"
                  icon="chevron-right"
                  onPress={goNext}
                  style={styles.qSaveBtn}
                />
                {currentQ && !currentQ.is_required ? (
                  <Pressable style={styles.qSkipBtn} onPress={goSkip}>
                    <Text style={styles.qSkipText}>Skip</Text>
                  </Pressable>
                ) : null}
              </View>

              {/* Continue link */}
              {!allDone && (
                <Pressable style={styles.qContinueRow} onPress={onToggle}>
                  <Icon name="edit-note" size={18} color={colors.primary} />
                  <Text style={styles.qContinueText}>
                    Continue Survey (Question {activeIdx + 1}/{qs.length})
                  </Text>
                  <Icon name="chevron-right" size={18} color={colors.primary} />
                </Pressable>
              )}
            </View>
          ) : null}
        </View>
      ) : (
        /* ── Collapsed: Start / Continue + progress ── */
        <View style={styles.cardFooter}>
          {survey.is_required || questionsCount > 0 ? (
            <>
              <View style={styles.cardActionRow}>
                <Text style={styles.cardStatusText}>
                  {answeredCount > 0 ? 'In Progress' : 'Not Started'} · {answeredCount}/{questionsCount}{' '}
                  answered
                </Text>
              </View>
              <View style={styles.progressBarWrap}>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFillEmpty, { width: `${progressPct}%` }]} />
                </View>
              </View>
              <Button
                label={
                  answeredCount > 0
                    ? `Continue Survey (${questionsCount} Qs)`
                    : `Start Survey (${questionsCount} Qs)`
                }
                variant="primary"
                icon="arrow-forward"
                onPress={onToggle}
                style={styles.cardStartBtn}
              />
            </>
          ) : null}
        </View>
      )}
    </View>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: IconName; title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <Icon name={icon} size={20} color={colors.secondary} />
      </View>
      <View style={styles.sectionBody}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

/* ─── Styles ───────────────────────────────────────────── */

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
    ...typography.headlineMd,
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

  /* Credits badge */
  creditsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginBottom: spacing.md,
  },
  creditsText: {
    ...typography.labelMd,
    color: colors.statusSuccess,
    fontWeight: '700',
  },

  /* Hero card */
  heroCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBody: {
    flex: 1,
  },
  heroTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  heroActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  heroActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.statusSuccess,
  },
  heroActiveText: {
    ...typography.labelSm,
    color: colors.statusSuccess,
    fontWeight: '700',
  },
  heroVerified: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroDesc: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
  },

  /* Stats row */
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    ...typography.labelLg,
    color: colors.secondary,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 12,
  },

  /* Section headers */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBody: {
    flex: 1,
  },
  sectionTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  sectionSub: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },

  /* Survey card */
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardExpanded: {
    borderColor: colors.secondary,
    borderWidth: 2,
  },
  cardPressable: {},
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconWrapDone: {
    backgroundColor: colors.statusSuccess,
  },
  cardMeta: {
    flex: 1,
    paddingTop: 2,
  },
  cardCount: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  cardTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '700',
    marginTop: 3,
  },
  cardRewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  cardRewardText: {
    ...typography.labelMd,
    color: colors.statusSuccess,
    fontWeight: '600',
  },
  cardDesc: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  cardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  tagText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
    marginTop: spacing.md,
  },
  cardCompletedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardCompletedText: {
    ...typography.labelMd,
    color: colors.statusSuccess,
    fontWeight: '700',
  },
  cardLockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  cardLockedText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    flex: 1,
    fontWeight: '600',
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  cardStatusText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  cardStartBtn: {
    marginTop: spacing.sm,
  },

  /* ── Expanded body ── */
  cardExpandedBody: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
    marginTop: spacing.md,
  },

  /* Progress bar */
  progressBarWrap: {
    marginBottom: spacing.md,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.secondary,
  },
  progressBarFillEmpty: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.secondary,
  },
  progressLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 4,
    textAlign: 'right',
  },

  /* Question loading */
  qLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  qLoadingText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },

  /* All done state */
  qAllDone: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  qAllDoneTitle: {
    ...typography.headlineMd,
    color: colors.statusSuccess,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  qAllDoneSub: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  qSubmitBtn: {
    width: '100%',
  },

  /* ── Quick Question Preview ── */
  qPreview: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  qPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  qPreviewLabel: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  qPreviewCount: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  qPreviewText: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '600',
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  qOptions: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  qOpt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  qOptOn: {
    borderColor: colors.secondary,
    backgroundColor: colors.secondaryContainer,
  },
  qRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qRadioOn: {
    borderColor: colors.secondary,
  },
  qRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.secondary,
  },
  qCheck: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qCheckOn: {
    borderColor: colors.secondary,
    backgroundColor: colors.secondary,
  },
  qOptText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    flex: 1,
  },
  qOptTextOn: {
    fontWeight: '600',
    color: colors.onSecondaryContainer,
  },
  qInput: {
    ...typography.bodyMd,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  qInputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  qInputHint: {
    ...typography.labelSm,
    color: colors.outline,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  qActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  qSaveBtn: {
    flex: 1,
  },
  qSkipBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  qSkipText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    textDecorationLine: 'underline',
  },
  qContinueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  qContinueText: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '600',
    flex: 1,
  },

  /* Security card */
  securityCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  securityBody: {
    flex: 1,
  },
  securityTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: '700',
    marginBottom: 4,
  },
  securityDesc: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  securityChips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  securityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  securityChipText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
});