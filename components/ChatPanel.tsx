import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';

import { ChatBubble } from '@/components/ChatBubble';
import type { ResolvedSuggestedAction } from '@/components/SuggestedActionCard';
import { Text, View } from '@/components/Themed';
import { Toast } from '@/components/Toast';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAIChatStore } from '@/store/useAIChatStore';
import { useBudgetStore } from '@/store/useBudgetStore';
import { useCategoryStore } from '@/store/useCategoryStore';
import { useExpenseStore } from '@/store/useExpenseStore';
import { useLoanStore } from '@/store/useLoanStore';
import { useRecurringStore } from '@/store/useRecurringStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useSubcategoryStore } from '@/store/useSubcategoryStore';
import { useWalletStore } from '@/store/useWalletStore';
import type { ChatMessage } from '@/types';
import { buildChatContext } from '@/utils/aiContext';
import { formatCurrency } from '@/utils/currency';
import { currentMonth } from '@/utils/date';
import type { PanHandlers } from '@/utils/dragCorner';
import { downloadModel, isModelDownloaded } from '@/utils/modelDownload';

type DownloadStatus = 'ready' | 'downloading' | 'failed';

interface ChatPanelProps {
  /** Renders a header with a close button when set — used by the bubble modal. Omit for a full-screen host that provides its own header (e.g. a Stack.Screen title). */
  onClose?: () => void;
  /** Spread onto the header row so dragging it repositions the floating panel — only meaningful alongside onClose. */
  headerPanHandlers?: PanHandlers;
}

/**
 * Gates the chat on the (simulated — see utils/modelDownload.ts) model
 * download, which happens on first launch of this screen, not app install.
 */
function ModelDownloadGate({ children }: PropsWithChildren) {
  const colorScheme = useColorScheme();
  const [status, setStatus] = useState<DownloadStatus>(() =>
    isModelDownloaded() ? 'ready' : 'downloading'
  );
  const [progress, setProgress] = useState(0);

  // No synchronous setState here — status/progress are already correct by
  // the time this runs (freshly reset by handleRetry, or already
  // 'downloading' from the lazy initial state above on first mount).
  const runDownload = useCallback(() => {
    downloadModel({ onProgress: setProgress })
      .then(() => setStatus('ready'))
      .catch(() => setStatus('failed'));
  }, []);

  useEffect(() => {
    if (!isModelDownloaded()) {
      runDownload();
    }
  }, [runDownload]);

  function handleRetry() {
    setStatus('downloading');
    setProgress(0);
    runDownload();
  }

  if (status === 'ready') {
    return <>{children}</>;
  }

  return (
    <View style={styles.center}>
      {status === 'failed' ? (
        <>
          <Text style={styles.downloadTitle}>Download failed</Text>
          <Text style={styles.downloadCaption}>Check your connection.</Text>
          <Pressable
            onPress={handleRetry}
            style={[styles.retryButton, { backgroundColor: Colors[colorScheme].primary }]}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.downloadTitle}>Preparing AI Assistant…</Text>
          <Text style={styles.downloadCaption}>Setting up the on-device model (one-time).</Text>
          <View style={[styles.progressTrack, { backgroundColor: Colors[colorScheme].border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: Colors[colorScheme].primary,
                  width: `${Math.round(progress * 100)}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>{Math.round(progress * 100)}%</Text>
        </>
      )}
    </View>
  );
}

function ThinkingIndicator() {
  const colorScheme = useColorScheme();
  return (
    <View style={styles.thinkingRow}>
      <View style={[styles.thinkingBubble, { backgroundColor: Colors[colorScheme].card }]}>
        <ActivityIndicator size="small" color={Colors[colorScheme].primary} />
        <Text style={styles.thinkingText}>Thinking…</Text>
      </View>
    </View>
  );
}

export function ChatPanel({ onClose, headerPanHandlers }: ChatPanelProps) {
  const colorScheme = useColorScheme();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [inputText, setInputText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const account = useSettingsStore((state) => state.account);
  const messages = useAIChatStore((state) => state.messages);
  const isLoading = useAIChatStore((state) => state.isLoading);
  const expenses = useExpenseStore((state) => state.expenses);
  const categories = useCategoryStore((state) => state.categories);
  const subcategories = useSubcategoryStore((state) => state.subcategories);
  const budgets = useBudgetStore((state) => state.budgets);
  const wallets = useWalletStore((state) => state.wallets);
  const loans = useLoanStore((state) => state.loans);
  const recurringTemplates = useRecurringStore((state) => state.templates);

  const hideToast = useCallback(() => setToastMessage(null), []);

  async function handleSend() {
    const text = inputText.trim();
    if (!text || !account || isLoading) {
      return;
    }
    setInputText('');
    await useAIChatStore.getState().sendMessage({
      userId: account.id,
      text,
      context: buildChatContext({
        expenses,
        categories,
        subcategories,
        budgets,
        wallets,
        loans,
        month: currentMonth(),
        currency: account.currency,
        recurringTemplates,
        payday: account.payday,
      }),
      historyEnabled: account.aiChatHistoryEnabled,
    });
  }

  async function handleConfirm(messageId: string, resolved: ResolvedSuggestedAction) {
    if (!account) {
      return;
    }
    try {
      await useAIChatStore.getState().confirmAction({
        userId: account.id,
        messageId,
        historyEnabled: account.aiChatHistoryEnabled,
        ...resolved,
      });
      if (resolved.kind === 'wallet') {
        setToastMessage(
          `${formatCurrency(resolved.amount, account.currency)} added to ${resolved.walletName} wallet`
        );
      } else {
        const category = categories.find((c) => c.id === resolved.categoryId);
        const categoryName = category?.name ?? '';
        setToastMessage(
          resolved.kind === 'budget'
            ? `${formatCurrency(resolved.amount, account.currency)}/month ${categoryName} budget set`
            : `${formatCurrency(resolved.amount, account.currency)} ${categoryName} expense added`
        );
      }
    } catch (err) {
      Alert.alert('Failed to save', err instanceof Error ? err.message : 'Unknown error');
    }
  }

  async function handleCancel(messageId: string) {
    if (!account) {
      return;
    }
    await useAIChatStore.getState().cancelAction({
      messageId,
      historyEnabled: account.aiChatHistoryEnabled,
    });
  }

  return (
    <View style={styles.container}>
      {onClose && (
        <View style={styles.header} {...headerPanHandlers}>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={Colors[colorScheme].text} />
          </Pressable>
        </View>
      )}
      <ModelDownloadGate>
        <Text style={styles.privacyNote}>
          Your data stays on your device. No messages leave your phone.
        </Text>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatBubble
              message={item}
              categories={categories}
              currency={account?.currency ?? 'PHP'}
              onConfirm={(resolved) => handleConfirm(item.id, resolved)}
              onCancel={() => handleCancel(item.id)}
            />
          )}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Ask me about your spending, budgets, wallets, or loans this month.
            </Text>
          }
          ListFooterComponent={isLoading ? <ThinkingIndicator /> : null}
        />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.input,
                { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].border },
              ]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask about your spending…"
              placeholderTextColor={Colors[colorScheme].tabIconDefault}
              editable={!isLoading}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <Pressable
              onPress={handleSend}
              disabled={isLoading || !inputText.trim()}
              style={[
                styles.sendButton,
                { backgroundColor: Colors[colorScheme].primary },
                (isLoading || !inputText.trim()) && styles.sendButtonDisabled,
              ]}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>

        <Toast message={toastMessage} onHide={hideToast} />
      </ModelDownloadGate>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  privacyNote: {
    fontSize: 11,
    opacity: 0.6,
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  messageList: {
    padding: 16,
    flexGrow: 1,
  },
  emptyText: {
    marginTop: 40,
    textAlign: 'center',
    opacity: 0.6,
    paddingHorizontal: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  thinkingRow: {
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  thinkingText: {
    fontSize: 14,
    opacity: 0.7,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  downloadTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  downloadCaption: {
    fontSize: 13,
    opacity: 0.7,
    textAlign: 'center',
  },
  progressTrack: {
    width: '80%',
    height: 8,
    borderRadius: 4,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabel: {
    marginTop: 8,
    fontSize: 13,
    opacity: 0.7,
  },
  retryButton: {
    marginTop: 16,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
