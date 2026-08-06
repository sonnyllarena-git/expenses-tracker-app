import { create } from 'zustand';

import {
  deleteAllChatMessages,
  insertChatMessage,
  listChatMessages,
  updateChatMessageActionStatus,
} from '@/db/queries/chatMessages';
import { useExpenseStore } from '@/store/useExpenseStore';
import type { ChatMessage, SuggestedActionStatus } from '@/types';
import type { ChatContextData } from '@/utils/aiContext';
import { today } from '@/utils/date';
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

interface ConfirmActionInput {
  userId: string;
  messageId: string;
  amount: number;
  categoryId: string;
  description: string;
  historyEnabled: boolean;
}

interface CancelActionInput {
  messageId: string;
  historyEnabled: boolean;
}

interface AIChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  /** Loads persisted history for the account; a no-op if history was never enabled. */
  load: (userId: string) => Promise<void>;
  sendMessage: (input: SendMessageInput) => Promise<void>;
  /** Creates the real expense from an already-validated suggestion, then marks it confirmed. */
  confirmAction: (input: ConfirmActionInput) => Promise<void>;
  cancelAction: (input: CancelActionInput) => Promise<void>;
  clearHistory: (userId: string) => Promise<void>;
}

export const useAIChatStore = create<AIChatState>((set, get) => ({
  messages: [],
  isLoading: false,
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
    set({ messages: [...get().messages, assistantMessage], isLoading: false });
  },
  confirmAction: async ({ userId, messageId, amount, categoryId, description, historyEnabled }) => {
    await useExpenseStore.getState().addExpense({
      userId,
      amount,
      categoryId,
      date: today(),
      description,
    });

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
}));
