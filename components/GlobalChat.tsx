import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ChatPanel } from '@/components/ChatPanel';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAIChatStore } from '@/store/useAIChatStore';

/**
 * Mounted once at the root layout (below the Stack, above nothing) so the
 * floating button and its unread badge persist across tab/screen navigation
 * instead of resetting per screen.
 */
export function GlobalChat() {
  const colorScheme = useColorScheme();
  const isChatOpen = useAIChatStore((state) => state.isChatOpen);
  const hasUnread = useAIChatStore((state) => state.hasUnread);

  return (
    <>
      <Pressable
        onPress={() => useAIChatStore.getState().openChat()}
        style={[styles.fab, { backgroundColor: Colors[colorScheme].primary }]}
      >
        <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
        {hasUnread && <View style={styles.badge} />}
      </Pressable>

      <Modal
        visible={isChatOpen}
        transparent
        animationType="slide"
        onRequestClose={() => useAIChatStore.getState().closeChat()}
      >
        <Pressable style={styles.backdrop} onPress={() => useAIChatStore.getState().closeChat()}>
          <Pressable
            style={[styles.panel, { backgroundColor: Colors[colorScheme].background }]}
            onPress={(e) => e.stopPropagation()}
          >
            <ChatPanel onClose={() => useAIChatStore.getState().closeChat()} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 40,
    height: 50,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 50,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#fff',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  panel: {
    width: '90%',
    height: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    marginBottom: 0,
  },
});
