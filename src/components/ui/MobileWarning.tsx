import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";

/**
 * MobileWarning — displays a full-page message on mobile devices
 * recommending users switch to a larger screen for the best experience.
 */
function MobileWarning() {
  const [isMobile, setIsMobile] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      // Check if screen width is less than 1024px (desktop breakpoint)
      const isSmallScreen = window.innerWidth < 1024;

      // Also check for touch-only devices as a secondary signal
      const isTouchOnly =
        "ontouchstart" in window &&
        window.matchMedia("(pointer: coarse)").matches &&
        !window.matchMedia("(pointer: fine)").matches;

      setIsMobile(isSmallScreen || isTouchOnly);
    };

    // Initial check
    checkMobile();

    // Listen for resize events
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Don't render anything if not on mobile or if dismissed
  if (!isMobile || dismissed) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background p-6">
      <div className="max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="mb-4 text-xl font-semibold text-foreground">
          <FormattedMessage
            id="1aU6UU"
            defaultMessage="Better on a Larger Screen"
          />
        </h1>

        {/* Message */}
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          <FormattedMessage
            id="COLwrL"
            defaultMessage="This experience is optimized for tablets and desktops to provide the best viewing experience. Please open this website on a tablet, laptop, or desktop computer."
          />
        </p>

        {/* Continue anyway button */}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <FormattedMessage id="bIxels" defaultMessage="Continue Anyway" />
        </button>
      </div>
    </div>
  );
}

export default MobileWarning;
