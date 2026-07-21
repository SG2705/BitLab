/**
 * Platform modifier key detection utility for auto-connect gestures.
 *
 * Detects the platform-appropriate modifier key (Cmd on macOS, Ctrl elsewhere)
 * and reads its state from the mouse event in the same event-loop frame.
 */

interface NavigatorUAData {
  platform?: string;
}

/**
 * Detects whether the current platform is macOS.
 * Uses navigator.userAgentData?.platform when available (modern API),
 * falls back to navigator.platform (legacy but widely supported).
 */
const isMacOS = (): boolean => {
  // Modern User-Agent Client Hints API
  const uaData = (navigator as Navigator & { userAgentData?: NavigatorUAData })
    .userAgentData;

  if (uaData?.platform) {
    return uaData.platform === "macOS";
  }

  // Legacy fallback — navigator.platform starts with "Mac" on macOS
  return navigator.platform.startsWith("Mac");
};

/**
 * Returns true if the platform-appropriate auto-connect modifier key is held.
 * - macOS: metaKey (Cmd)
 * - Windows/Linux: ctrlKey
 *
 * Reads the modifier state directly from the mouse event, so this must be
 * called within the same event-loop frame as the mousedown.
 */
export const isAutoConnectModifier = (
  e: MouseEvent | React.MouseEvent,
): boolean => (isMacOS() ? e.metaKey : e.ctrlKey);

export default isAutoConnectModifier;
