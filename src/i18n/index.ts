import type { IntlShape } from "react-intl";

export type SupportedLocale = "en";

export const defaultLocale: SupportedLocale = "en";

const messageModules: Record<
  SupportedLocale,
  () => Promise<Record<string, string>>
> = {
  en: () =>
    import("./locales/en.json").then((m) => m.default as Record<string, string>),
};

export async function loadMessages(
  locale: SupportedLocale,
): Promise<Record<string, string>> {
  return messageModules[locale]();
}

export type { IntlShape };
