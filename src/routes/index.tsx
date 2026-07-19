import { createFileRoute } from "@tanstack/react-router";

import DigitalGateApp from "@/components/layout/App";
import { SettingsProvider } from "@/context/SettingsContext";

function AppWithProviders() {
  return (
    <SettingsProvider>
      <DigitalGateApp />
    </SettingsProvider>
  );
}

export const Route = createFileRoute("/")({
  component: AppWithProviders,
});

export default Route;
