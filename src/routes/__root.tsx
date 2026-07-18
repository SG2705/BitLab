/* eslint-disable react/jsx-props-no-spreading */
import { FormattedMessage, IntlProvider } from "react-intl";
import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  Link,
  Outlet,
  useRouter,
} from "@tanstack/react-router";

import { defaultLocale } from "@/i18n";
// eslint-disable-next-line import/extensions
import enMessages from "@/i18n/locales/en.json";

import "../styles.css";

const intlProps = {
  locale: defaultLocale,
  messages: Object.fromEntries(
    Object.entries(enMessages).map(([k, v]) => [k, v.defaultMessage]),
  ),
};

function NotFoundComponent() {
  return (
    <IntlProvider {...intlProps}>
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-7xl font-bold text-foreground">
            <FormattedMessage id="DRXWXB" defaultMessage="404" />
          </h1>
          <h2 className="mt-4 text-xl font-semibold text-foreground">
            <FormattedMessage id="QRccCM" defaultMessage="Page not found" />
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            <FormattedMessage
              id="8vtLM0"
              defaultMessage="The page you're looking for doesn't exist or has been moved"
            />
          </p>
          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <FormattedMessage id="SWMHO+" defaultMessage="Go home" />
            </Link>
          </div>
        </div>
      </div>
    </IntlProvider>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  // eslint-disable-next-line no-console
  console.error(error);

  const router = useRouter();

  return (
    <IntlProvider {...intlProps}>
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            <FormattedMessage
              id="9nolIL"
              defaultMessage="This page didn't load"
            />
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            <FormattedMessage
              id="m9VoMp"
              defaultMessage="Something went wrong on our end. You can try refreshing or head back home."
            />
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                router.invalidate().catch(() => {});

                reset();
              }}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <FormattedMessage id="FazwRl" defaultMessage="Try again" />
            </button>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <FormattedMessage id="SWMHO+" defaultMessage="Go home" />
            </a>
          </div>
        </div>
      </div>
    </IntlProvider>
  );
}

// eslint-disable-next-line import/prefer-default-export
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    component: RootComponent,
    notFoundComponent: NotFoundComponent,
    errorComponent: ErrorComponent,
  },
);

function RootComponent() {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  const { queryClient } = Route.useRouteContext() as {
    queryClient: QueryClient;
  };

  return (
    <IntlProvider {...intlProps}>
      <QueryClientProvider client={queryClient}>
        <Outlet />
      </QueryClientProvider>
    </IntlProvider>
  );
}
