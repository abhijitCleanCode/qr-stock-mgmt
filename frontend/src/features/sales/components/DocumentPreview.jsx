import { useEffect, useRef, useState } from "react";

import { DOCUMENT_CSS } from "../utils/documentStyles.js";

// Shows the document exactly as it will print, using the same HTML and stylesheet the print path
// uses, so what is on screen and what comes out of the printer can never drift apart. Rendered
// in a sandboxed iframe rather than inline: the print stylesheet assumes it owns the page, and
// inlining it would leak those rules into the app. The page is laid out at A4 width (794px) and
// padded like the printed margin. On narrow screens the whole page is scaled down to fit the
// card, so the phone never scrolls sideways; the printed output is unchanged.
const A4_WIDTH = 794;
const A4_HEIGHT = 1123;
const CARD_PADDING = 24;

const DocumentPreview = ({ html }) => {
  const cardRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return undefined;

    const fit = () => {
      const available = card.clientWidth - CARD_PADDING * 2;
      setScale(available > 0 ? Math.min(1, available / A4_WIDTH) : 1);
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={cardRef} className="glass-card overflow-hidden rounded-[24px] p-6">
      <div
        className="mx-auto"
        style={{ width: A4_WIDTH * scale, height: A4_HEIGHT * scale }}
      >
        <iframe
          title="Document preview"
          sandbox=""
          className="rounded-md border border-slate-200 bg-white shadow-sm"
          style={{
            width: A4_WIDTH,
            height: A4_HEIGHT,
            maxWidth: "none",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
          srcDoc={`<!doctype html><html><head><meta charset="utf-8"><style>${DOCUMENT_CSS}
body { padding:10mm; }</style></head><body>${html}</body></html>`}
        />
      </div>
    </div>
  );
};

export default DocumentPreview;
