/* eslint-disable formatjs/no-literal-string-in-jsx */
import { memo, useEffect, useState } from "react";
import Markdown from "react-markdown";
import { BookOpen, Map, X } from "lucide-react";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

const DOCS_CATEGORY = {
  PRODUCT: "product",
  FUTURE: "future",
} as const;

type Category = (typeof DOCS_CATEGORY)[keyof typeof DOCS_CATEGORY];

interface DocsPanelProps {
  onClose: () => void;
}

function DocsPanel({ onClose }: DocsPanelProps) {
  const [cat, setCat] = useState<Category>(DOCS_CATEGORY.PRODUCT);
  const [productMd, setProductMd] = useState<string>("");
  const [futureMd, setFutureMd] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDocs = async () => {
      setLoading(true);

      try {
        const [productRes, futureRes] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}docs/PRODUCT.md`),
          fetch(`${import.meta.env.BASE_URL}docs/FUTURE.md`),
        ]);

        if (productRes.ok) {
          setProductMd(await productRes.text());
        }

        if (futureRes.ok) {
          setFutureMd(await futureRes.text());
        }
      } catch {
        // If fetch fails, show a fallback message
        setProductMd(
          "# Unable to load documentation\n\nPlease check that the docs folder is accessible.",
        );
        setFutureMd(
          "# Unable to load documentation\n\nPlease check that the docs folder is accessible.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadDocs().catch(() => {});
  }, []);

  const content = cat === DOCS_CATEGORY.PRODUCT ? productMd : futureMd;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-background/60 backdrop-blur-sm p-4"
      role="presentation"
      onClick={onClose}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        className="w-full max-w-5xl h-[85vh] rounded-xl border border-border bg-panel/95 shadow-2xl flex overflow-hidden animate-scale-in"
      >
        {/* Sidebar */}
        <aside className="w-52 shrink-0 border-r border-border bg-background/40 p-3 flex flex-col">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-2">
            Documentation
          </div>
          <SideItem
            active={cat === DOCS_CATEGORY.PRODUCT}
            onClick={() => setCat(DOCS_CATEGORY.PRODUCT)}
            icon={<BookOpen className="h-4 w-4" />}
            label="Product Guide"
          />
          <SideItem
            active={cat === DOCS_CATEGORY.FUTURE}
            onClick={() => setCat(DOCS_CATEGORY.FUTURE)}
            icon={<Map className="h-4 w-4" />}
            label="Future Roadmap"
          />
        </aside>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 shrink-0 border-b border-border flex items-center justify-between px-4">
            <div className="font-semibold tracking-tight">
              {cat === DOCS_CATEGORY.PRODUCT
                ? "Product Guide"
                : "Future Roadmap"}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Loading documentation...
              </div>
            ) : (
              <article className="prose prose-sm prose-invert max-w-none docs-content">
                <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
              </article>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SideItem({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors",
        active
          ? "bg-primary/15 text-foreground border border-primary/30"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

export default memo(DocsPanel);
