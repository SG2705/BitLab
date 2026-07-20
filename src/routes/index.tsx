import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import DigitalGateApp from "@/components/layout/App";
import { BitLabLoader } from "@/components/ui";
import { settingsStore } from "@/stores/settings-store";

/**
 * AppBootstrap — shows a loader while initial setup completes,
 * then renders the main app.
 */
function AppBootstrap() {
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("Loading settings…");

  useEffect(() => {
    const boot = async () => {
      // 1. Settings are loaded synchronously via the store module init,
      //    but we simulate a brief moment for any future async calls.
      setMessage("Loading settings…");
      // Settings store is already initialized on import — just validate
      settingsStore.get();

      // 2. Load circuit maps / custom circuits (future API calls go here)
      setMessage("Loading circuits…");
      // Placeholder for future async: await fetchCircuitMaps();
      await new Promise((resolve) => {
        setTimeout(resolve, 400);
      });

      // 3. Ready
      setMessage("Starting…");

      await new Promise((resolve) => {
        setTimeout(resolve, 200);
      });

      setReady(true);
    };

    boot().catch(() => setReady(true));
  }, []);

  if (!ready) {
    return <BitLabLoader message={message} />;
  }

  return <DigitalGateApp />;
}

export const Route = createFileRoute("/")({
  component: AppBootstrap,
});

export default Route;
