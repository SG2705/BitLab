import { createFileRoute } from "@tanstack/react-router";

import DigitalGateApp from "@/components/layout/App";

export const Route = createFileRoute("/")({
  component: DigitalGateApp,
});

export default Route;
