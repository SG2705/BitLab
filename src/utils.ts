import { createIntl, createIntlCache, IntlShape } from "react-intl";
import { MESSAGES, Messages } from "./constants";

const _cache = createIntlCache();
const _defaultIntl = createIntl({ locale: "en", messages: {} }, _cache);

export const fm = (
  key: Messages,
  intl: IntlShape = _defaultIntl,
  values?: Record<string, string | number | undefined>,
) => intl.formatMessage(MESSAGES[key], values);
