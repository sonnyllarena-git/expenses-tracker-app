import { create } from 'zustand';

import {
  deleteAllChatMessages,
  insertChatMessage,
  listChatMessages,
  updateChatMessageActionStatus,
} from '@/db/queries/chatMessages';
import { useBudgetStore } from '@/store/useBudgetStore';
import { useExpenseStore } from '@/store/useExpenseStore';
import { useWalletStore } from '@/store/useWalletStore';
import type { ChatMessage, SuggestedActionStatus, WalletType } from '@/types';
import type { ChatContextData } from '@/utils/aiContext';
import { currentMonth, today } from '@/utils/date';
import type { BubbleCorner } from '@/utils/dragCorner';
import { generateMockResponse } from '@/utils/mockLlm';
import { withTimeout } from '@/utils/withTimeout';

const INFERENCE_TIMEOUT_MS = 30000;
// Mimics the ~5-15s CPU inference window the real on-device model (deferred
// to a follow-up sprint) would take, so the loading spinner is exercised now
// instead of only once llama.rn lands.
const SIMULATED_INFERENCE_MIN_MS = 1200;
const SIMULATED_INFERENCE_MAX_MS = 2600;

export const TIMEOUT_FALLBACK_MESSAGE = "I couldn't process that. Try asking again.";

function randomInferenceDelay(): Promise<void> {
  const ms =
    SIMULATED_INFERENCE_MIN_MS +
    Math.random() * (SIMULATED_INFERENCE_MAX_MS - SIMULATED_INFERENCE_MIN_MS);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runMockInference(text: string, context: ChatContextData): Promise<string> {
  await randomInferenceDelay();
  return generateMockResponse(text, context);
}

function localMessage(
  userId: string,
  role: ChatMessage['role'],
  content: string,
  actionStatus: SuggestedActionStatus | null
): ChatMessage {
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    userId,
    role,
    content,
    actionStatus,
    createdAt: new Date().toISOString(),
  };
}

/** Persists the message when history is enabled; otherwise keeps it session-only. */
async function appendMessage(
  userId: string,
  role: ChatMessage['role'],
  content: string,
  actionStatus: SuggestedActionStatus | null,
  historyEnabled: boolean
): Promise<ChatMessage> {
  if (historyEnabled) {
    return insertChatMessage({ userId, role, content, actionStatus });
  }
  return localMessage(userId, role, content, actionStatus);
}

interface SendMessageInput {
  userId: string;
  text: string;
  context: ChatContextData;
  historyEnabled: boolean;
}

interface ConfirmExpenseInput {
  kind: 'expense';
  userId: string;
  messageId: string;
  amount: number;
  categoryId: string;
  subcategoryId: string | null;
  description: string;
  historyEnabled: boolean;
}

interface ConfirmBudgetInput {
  kind: 'budget';
  userId: string;
  messageId: string;
  amount: number;
  categoryId: string;
  alertThreshold: number;
  historyEnabled: boolean;
}

interface ConfirmWalletInput {
  kind: 'wallet';
  userId: string;
  messageId: string;
  amount: number;
  walletType: WalletType;
  walletName: string;
  historyEnabled: boolean;
}

type ConfirmActionInput = ConfirmExpenseInput | ConfirmBudgetInput | ConfirmWalletInput;

interface CancelActionInput {
  messageId: string;
  historyEnabled: boolean;
}

interface AIChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  /** Whether the floating chat bubble modal is currently on screen. */
  isChatOpen: boolean;
  /** True once an assistant reply has arrived while the modal was closed. */
  hasUnread: boolean;
  /** Which screen corner the bubble/panel is snapped to; persists across close/reopen for the session. */
  bubbleCorner: BubbleCorner;
  /** Loads persisted history for the account; a no-op if history was never enabled. */
  load: (userId: string) => Promise<void>;
  sendMessage: (input: SendMessageInput) => Promise<void>;
  /** Creates the real expense/budget from an already-validated suggestion, then marks it confirmed. */
  confirmAction: (input: ConfirmActionInput) => Promise<void>;
  cancelAction: (input: CancelActionInput) => Promise<void>;
  clearHistory: (userId: string) => Promise<void>;
  openChat: () => void;
  closeChat: () => void;
  setBubbleCorner: (corner: BubbleCorner) => void;
}

export const useAIChatStore = create<AIChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  isChatOpen: false,
  hasUnread: false,
  bubbleCorner: 'bottom-right',
  load: async (userId: string) => {
    const messages = await listChatMessages(userId);
    set({ messages });
  },
  sendMessage: async ({ userId, text, context, historyEnabled }) => {
    const userMessage = await appendMessage(userId, 'user', text, null, historyEnabled);
    set({ messages: [...get().messages, userMessage], isLoading: true });

    let responseText: string;
    try {
      responseText = await withTimeout(runMockInference(text, context), INFERENCE_TIMEOUT_MS);
    } catch {
      responseText = TIMEOUT_FALLBACK_MESSAGE;
    }

    const actionStatus: SuggestedActionStatus | null = responseText.includes('[SUGGEST_ACTION]')
      ? 'pending'
      : null;
    const assistantMessage = await appendMessage(
      userId,
      'assistant',
      responseText,
      actionStatus,
      historyEnabled
    );
    set({
      messages: [...get().messages, assistantMessage],
      isLoading: false,
      hasUnread: !get().isChatOpen,
    });
  },
  confirmAction: async (input) => {
    const { userId, messageId, amount, historyEnabled } = input;

    if (input.kind === 'budget') {
      const month = currentMonth();
      const existing = useBudgetStore
        .getState()
        .budgets.find((b) => b.categoryId === input.categoryId && b.month === month);
      if (existing) {
        await useBudgetStore.getState().editBudget(existing.id, {
          limitAmount: amount,
          alertThreshold: input.alertThreshold,
        });
      } else {
        await useBudgetStore.getState().addBudget({
          userId,
          categoryId: input.categoryId,
          limitAmount: amount,
          month,
          alertThreshold: input.alertThreshold,
        });
      }
    } else if (input.kind === 'wallet') {
      // "Add to wallet" tops up an existing wallet of that type rather than
      // creating a duplicate; only creates a new one the first time.
      const existing = useWalletStore.getState().wallets.find((w) => w.type === input.walletType);
      if (existing) {
        await useWalletStore.getState().editWallet(existing.id, {
          balance: existing.balance + amount,
        });
      } else {
        await useWalletStore.getState().addWallet({
          userId,
          name: input.walletName,
          type: input.walletType,
          balance: amount,
        });
      }
    } else {
      await useExpenseStore.getState().addExpense({
        userId,
        amount,
        categoryId: input.categoryId,
        subcategoryId: input.subcategoryId,
        date: today(),
        description: input.description,
      });
    }

    set({
      messages: get().messages.map((message) =>
        message.id === messageId ? { ...message, actionStatus: 'confirmed' } : message
      ),
    });

    if (historyEnabled) {
      await updateChatMessageActionStatus(messageId, 'confirmed');
    }
  },
  cancelAction: async ({ messageId, historyEnabled }) => {
    set({
      messages: get().messages.map((message) =>
        message.id === messageId ? { ...message, actionStatus: 'cancelled' } : message
      ),
    });

    if (historyEnabled) {
      await updateChatMessageActionStatus(messageId, 'cancelled');
    }
  },
  clearHistory: async (userId: string) => {
    await deleteAllChatMessages(userId);
    set({ messages: [] });
  },
  openChat: () => set({ isChatOpen: true, hasUnread: false }),
  closeChat: () => set({ isChatOpen: false }),
  setBubbleCorner: (corner) => set({ bubbleCorner: corner }),
}));
