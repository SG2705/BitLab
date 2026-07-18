import { FormattedMessage } from "react-intl";

import BitLabLogo from "./BitLabLogo";

/**
 * EmptyCanvas
 */
function EmptyCanvas() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="text-center">
        <BitLabLogo />
        <div className="text-lg font-semibold">
          <FormattedMessage id="GkBxYy" defaultMessage="Start designing" />
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          <FormattedMessage
            id="Xco1sn"
            defaultMessage="Drag a component from the toolbox onto the canvas"
          />
        </div>
        <div className="text-xs text-muted-foreground mt-3">
          <FormattedMessage id="uizmax" defaultMessage="Press" />
          &nbsp;
          <kbd className="px-1.5 py-0.5 rounded bg-secondary border border-border">
            <FormattedMessage id="cpOWpz" defaultMessage="⌘K" />
          </kbd>
          &nbsp;
          <FormattedMessage
            id="0TVISU"
            defaultMessage="for the command palette"
          />
        </div>
      </div>
    </div>
  );
}

export default EmptyCanvas;
