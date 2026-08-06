import { StyleSheet } from 'react-native';

import { SuggestedActionCard } from '@/components/SuggestedActionCard';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import type { Category, ChatMessage } from '@/types';
import { parseAssistantMessage } from '@/utils/suggestedAction';

interface ChatBubbleProps {
  message: ChatMessage;
  categories: Category[];
  currency: string;
  onConfirm: (resolved: { amount: number; categoryId: string; description: string }) => void;
  onCancel: () => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function ChatBubble({
  message,
  categories,
  currency,
  onConfirm,
  onCancel,
}: ChatBubbleProps) {
  const colorScheme = useColorScheme();
  const isUser = message.role === 'user';
  const parsed = isUser
    ? { displayText: message.content, action: null }
    : parseAssistantMessage(message.content);

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View
        style={[
          styles.bubble,
          isUser
            ? { backgroundColor: Colors[colorScheme].primary }
            : { backgroundColor: Colors[colorScheme].card },
        ]}
      >
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
          {parsed.displayText}
        </Text>
        <Text style={[styles.timestamp, isUser && styles.timestampUser]}>
          {formatTime(message.createdAt)}
        </Text>
      </View>

      {!isUser && parsed.action && message.actionStatus && (
        <SuggestedActionCard
          action={parsed.action}
          status={message.actionStatus}
          categories={categories}
          currency={currency}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginVertical: 6,
    maxWidth: '85%',
  },
  rowUser: {
    alignSelf: 'flex-end',
  },
  rowAssistant: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: '#fff',
  },
  timestamp: {
    fontSize: 10,
    opacity: 0.5,
    alignSelf: 'flex-end',
  },
  timestampUser: {
    color: '#fff',
    opacity: 0.7,
  },
});
