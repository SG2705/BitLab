import type { IntlShape } from "react-intl";

export type SupportedLocale = "en";

export const defaultLocale: SupportedLocale = "en";

const messageModules: Record<
  SupportedLocale,
  () => Promise<Record<string, string>>
> = {
  en: () =>
    // eslint-disable-next-line import/extensions
    import("./locales/en.json").then(
      (m) => m.default as unknown as Record<string, string>,
    ),
};

/**
 * loadMessages
 */
export async function loadMessages(
  locale: SupportedLocale,
): Promise<Record<string, string>> {
  return messageModules[locale]();
}

export type { IntlShape };
