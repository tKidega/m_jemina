import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from './Button';
import { Icon } from './Icon';
import type { ApiChatReply } from '../data/api';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

interface ChatViewProps {
  assistantName: string;
  greeting: string;
  onSend: (message: string) => Promise<ApiChatReply>;
  onNotifyVendor?: (message: string) => Promise<unknown>;
}

let messageCounter = 0;
function nextMessageId(): string {
  messageCounter += 1;
  return `m_${Date.now()}_${messageCounter}`;
}

export function ChatView({ assistantName, greeting, onSend, onNotifyVendor }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'greeting', role: 'assistant', text: greeting },
  ]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [pendingNotify, setPendingNotify] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || sending) {
        return;
      }
      setMessages(prev => [...prev, { id: nextMessageId(), role: 'user', text }]);
      setInput('');
      setSuggestions([]);
      setPendingNotify(null);
      setSending(true);
      try {
        const reply = await onSend(text);
        const responseText = reply.response;
        if (responseText) {
          setMessages(prev => [...prev, { id: nextMessageId(), role: 'assistant', text: responseText }]);
        }
        if (reply.suggestions && reply.suggestions.length > 0) {
          setSuggestions(reply.suggestions);
        }
        if (reply.needs_vendor && onNotifyVendor) {
          setPendingNotify(text);
        }
      } catch {
        setMessages(prev => [
          ...prev,
          {
            id: nextMessageId(),
            role: 'assistant',
            text: 'Sorry, I could not get a reply right now. Please try again in a moment.',
          },
        ]);
      } finally {
        setSending(false);
      }
      scrollToEnd();
    },
    [onSend, onNotifyVendor, sending, scrollToEnd],
  );

  const notifyVendor = useCallback(async () => {
    if (!pendingNotify || !onNotifyVendor || notifying) {
      return;
    }
    setNotifying(true);
    try {
      await onNotifyVendor(pendingNotify);
      setMessages(prev => [
        ...prev,
        {
          id: nextMessageId(),
          role: 'assistant',
          text: 'Thanks! I have passed your question on to the shop owner, who will get in touch with you personally.',
        },
      ]);
      setPendingNotify(null);
      setSuggestions([]);
    } catch {
      setMessages(prev => [
        ...prev,
        { id: nextMessageId(), role: 'assistant', text: 'Sorry, I could not notify the shop owner right now.' },
      ]);
    } finally {
      setNotifying(false);
    }
    scrollToEnd();
  }, [pendingNotify, onNotifyVendor, notifying, scrollToEnd]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToEnd}
      >
        {messages.map(m => (
          <View key={m.id} style={[styles.row, m.role === 'user' ? styles.rowUser : styles.rowAssistant]}>
            {m.role === 'assistant' ? (
              <View style={styles.avatar}>
                <Icon name="chat" size={14} color={colors.onPrimary} />
              </View>
            ) : null}
            <View style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}>
              {m.role === 'assistant' ? <Text style={styles.bubbleName}>{assistantName}</Text> : null}
              <Text style={[styles.bubbleText, m.role === 'user' && styles.bubbleTextUser]}>{m.text}</Text>
            </View>
          </View>
        ))}

        {sending ? (
          <View style={[styles.row, styles.rowAssistant]}>
            <View style={styles.avatar}>
              <Icon name="chat" size={14} color={colors.onPrimary} />
            </View>
            <View style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}>
              <ActivityIndicator size="small" color={colors.secondary} />
            </View>
          </View>
        ) : null}

        {pendingNotify && onNotifyVendor ? (
          <View style={styles.notifyWrap}>
            <Button
              label={notifying ? 'Notifying shop owner...' : 'Notify the shop owner personally'}
              variant="primary"
              icon="storefront"
              fullWidth
              onPress={notifyVendor}
              style={styles.notifyBtn}
            />
          </View>
        ) : null}

        {suggestions.length > 0 && !sending ? (
          <View style={styles.suggestions}>
            {suggestions.map(s => (
              <Pressable key={s} style={styles.suggestionChip} onPress={() => send(s)}>
                <Text style={styles.suggestionText}>{s}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={`Message ${assistantName}...`}
          placeholderTextColor={colors.outline}
          multiline
          maxLength={500}
        />
        <Pressable
          style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
          onPress={() => send(input)}
          disabled={!input.trim() || sending}
          hitSlop={4}
        >
          <Icon name="send" size={20} color={input.trim() && !sending ? colors.onSecondary : colors.outline} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAssistant: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleUser: {
    backgroundColor: colors.secondaryContainer,
    borderBottomRightRadius: radius.sm,
  },
  bubbleAssistant: {
    backgroundColor: colors.surfaceContainerHighest,
    borderBottomLeftRadius: radius.sm,
  },
  bubbleName: {
    ...typography.labelSm,
    color: colors.secondary,
    fontWeight: '700',
    marginBottom: 2,
  },
  bubbleText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: colors.onSecondaryContainer,
  },
  typingBubble: {
    minWidth: 56,
    alignItems: 'center',
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  suggestionChip: {
    borderWidth: 1,
    borderColor: colors.secondaryContainer,
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestionText: {
    ...typography.labelMd,
    color: colors.onSecondaryContainer,
    fontWeight: '700',
  },
  notifyWrap: {
    marginBottom: spacing.md,
  },
  notifyBtn: {
    paddingVertical: spacing.md,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surfaceContainerLowest,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    maxHeight: 100,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLowest,
    fontFamily: typography.bodyMd.fontFamily,
    fontSize: typography.bodyMd.fontSize,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.surfaceContainerHighest,
  },
});
