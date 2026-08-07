import { useEffect, useState } from 'react';
import { Animated, Dimensions, PanResponder } from 'react-native';

export type BubbleCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type PanHandlers = ReturnType<typeof PanResponder.create>['panHandlers'];

interface Size {
  width: number;
  height: number;
}

interface Margins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** Below this drag distance (px), a release is treated as a tap, not a reposition. */
const MOVE_THRESHOLD = 4;

function cornerPosition(corner: BubbleCorner, size: Size, margins: Margins): { x: number; y: number } {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const x = corner.endsWith('left') ? margins.left : screenWidth - size.width - margins.right;
  const y = corner.startsWith('top') ? margins.top : screenHeight - size.height - margins.bottom;
  return { x, y };
}

/** Which corner is nearest an absolute screen point, split simply by screen half. */
function nearestCorner(pageX: number, pageY: number): BubbleCorner {
  const { width, height } = Dimensions.get('window');
  const vertical = pageY < height / 2 ? 'top' : 'bottom';
  const horizontal = pageX < width / 2 ? 'left' : 'right';
  return `${vertical}-${horizontal}` as BubbleCorner;
}

/**
 * Drives a corner-snapping draggable element (the chat FAB, or the open
 * panel's header): tracks the drag as an absolute {x,y} Animated.ValueXY
 * (top-left position), then springs to whichever of the 4 screen corners is
 * nearest on release.
 */
export function useDraggableCorner({
  corner,
  size,
  margins,
  onCornerChange,
  resetKey,
  claimOnStart = false,
}: {
  corner: BubbleCorner;
  size: Size;
  margins: Margins;
  onCornerChange: (corner: BubbleCorner) => void;
  /** Re-snaps to `corner` whenever this value becomes truthy (e.g. the modal opening). */
  resetKey?: unknown;
  /**
   * The FAB's only child is a same-sized Pressable, which always wins the
   * initial touch-down claim — so the FAB (claimOnStart: false, default)
   * instead intercepts via the *capture* phase once real movement starts,
   * letting a plain tap fall through to that Pressable untouched.
   *
   * The header has no such full-coverage sibling — its blank space has no
   * deeper leaf to lose that negotiation to — but it DOES sit inside the
   * panel's own stop-propagation Pressable, an ANCESTOR. Capture only
   * intercepts descendants, not ancestors, so that Pressable would still
   * claim the gesture at touch-down before any capture check on the header
   * ever ran. The header therefore claims immediately on touch-down
   * (claimOnStart: true) and disambiguates tap-vs-drag at release instead.
   */
  claimOnStart?: boolean;
}) {
  const [pan] = useState(() => new Animated.ValueXY(cornerPosition(corner, size, margins)));

  useEffect(() => {
    if (resetKey) {
      pan.setValue(cornerPosition(corner, size, margins));
    }
    // Only re-syncs when resetKey flips truthy (e.g. the panel opening) — not
    // on every `corner` change, which would abort this element's own
    // in-flight release spring with a hard jump.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const [panResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => claimOnStart,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: (_evt, gesture) =>
        !claimOnStart &&
        (Math.abs(gesture.dx) > MOVE_THRESHOLD || Math.abs(gesture.dy) > MOVE_THRESHOLD),
      onPanResponderGrant: () => {
        pan.extractOffset();
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_evt, gesture) => {
        pan.flattenOffset();
        // Only relevant when claimOnStart unconditionally grabbed the
        // responder — the capture-phase path never grants below this
        // threshold in the first place.
        if (Math.abs(gesture.dx) < MOVE_THRESHOLD && Math.abs(gesture.dy) < MOVE_THRESHOLD) {
          return;
        }
        const target = nearestCorner(gesture.moveX, gesture.moveY);
        Animated.spring(pan, {
          toValue: cornerPosition(target, size, margins),
          useNativeDriver: false,
          bounciness: 6,
        }).start();
        onCornerChange(target);
      },
    })
  );

  return { pan, panHandlers: panResponder.panHandlers };
}
