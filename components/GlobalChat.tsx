import { Ionicons } from '@expo/vector-icons';
import { Animated, Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';

import { ChatPanel } from '@/components/ChatPanel';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAIChatStore } from '@/store/useAIChatStore';
import { type BubbleCorner, useDraggableCorner } from '@/utils/dragCorner';

const FAB_SIZE = { width: 40, height: 50 };
// bottom is tall enough to clear the tab bar so the dragged-away default
// corners never re-overlap the Settings tab (the original bug report).
const FAB_MARGINS = { top: 60, bottom: 100, left: 16, right: 16 };

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANEL_SIZE = { width: SCREEN_WIDTH * 0.9, height: SCREEN_HEIGHT * 0.7 };
const PANEL_SIDE_MARGIN = SCREEN_WIDTH * 0.05;
const PANEL_MARGINS = { top: 50, bottom: 24, left: PANEL_SIDE_MARGIN, right: PANEL_SIDE_MARGIN };

/**
 * Mounted once at the root layout (below the Stack, above nothing) so the
 * floating button and its unread badge persist across tab/screen navigation
 * instead of resetting per screen.
 */
export function GlobalChat() {
  const colorScheme = useColorScheme();
  const isChatOpen = useAIChatStore((state) => state.isChatOpen);
  const hasUnread = useAIChatStore((state) => state.hasUnread);
  const bubbleCorner = useAIChatStore((state) => state.bubbleCorner);

  const setCorner = (corner: BubbleCorner) => useAIChatStore.getState().setBubbleCorner(corner);

  const fab = useDraggableCorner({
    corner: bubbleCorner,
    size: FAB_SIZE,
    margins: FAB_MARGINS,
    onCornerChange: setCorner,
  });

  const panel = useDraggableCorner({
    corner: bubbleCorner,
    size: PANEL_SIZE,
    margins: PANEL_MARGINS,
    onCornerChange: setCorner,
    resetKey: isChatOpen,
    claimOnStart: true,
  });

  return (
    <>
      <Animated.View
        {...fab.panHandlers}
        style={[styles.fabWrapper, { transform: fab.pan.getTranslateTransform() }]}
      >
        <Pressable
          onPress={() => useAIChatStore.getState().openChat()}
          style={[styles.fab, { backgroundColor: Colors[colorScheme].primary }]}
        >
          <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
          {hasUnread && <View style={styles.badge} />}
        </Pressable>
      </Animated.View>

      <Modal
        visible={isChatOpen}
        transparent
        animationType="fade"
        onRequestClose={() => useAIChatStore.getState().closeChat()}
      >
        <Pressable style={styles.backdrop} onPress={() => useAIChatStore.getState().closeChat()}>
          <Animated.View
            style={[styles.panelWrapper, { transform: panel.pan.getTranslateTransform() }]}
          >
            <Pressable
              style={[styles.panel, { backgroundColor: Colors[colorScheme].background }]}
              onPress={(e) => e.stopPropagation()}
            >
              <ChatPanel
                onClose={() => useAIChatStore.getState().closeChat()}
                headerPanHandlers={panel.panHandlers}
              />
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fabWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: FAB_SIZE.width,
    height: FAB_SIZE.height,
    zIndex: 50,
  },
  fab: {
    flex: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
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
  },
  panelWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: PANEL_SIZE.width,
    height: PANEL_SIZE.height,
  },
  panel: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
});
