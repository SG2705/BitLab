import { createFileRoute } from "@tanstack/react-router";
import { DigitalGateApp } from "@/components/digital-gate/App";

export const Route = createFileRoute("/")({
  component: DigitalGateApp,
});
