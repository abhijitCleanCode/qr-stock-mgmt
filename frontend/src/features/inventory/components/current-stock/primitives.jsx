import { cn } from "@/lib/utils";
import { formatAge } from "../../utils/currentStock";

export const Sheet = ({ className, children }) => (
  <section
    className={cn("rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] md:p-7", className)}
  >
    {children}
  </section>
);

export const Eyebrow = ({ className, children }) => (
  <div className={cn("text-[10.5px] font-bold uppercase tracking-[0.08em] text-slate-400", className)}>{children}</div>
);

export const ColorDot = ({ hex, className }) => (
  <span
    className={cn("inline-block size-2.5 flex-none rounded-full ring-1 ring-slate-200", className)}
    style={{ backgroundColor: hex || "#CBD5E1" }}
  />
);

const PILL_TONES = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warn: "border-amber-200 bg-amber-50 text-amber-700",
  red: "border-red-200 bg-red-50 text-red-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  neutral: "border-slate-200 bg-slate-100 text-slate-500",
};

export const Pill = ({ tone = "neutral", className, children }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
      PILL_TONES[tone],
      className,
    )}
  >
    {children}
  </span>
);

// Dot + label pill, as on the prototype. Out and low are the urgent states; ageing is violet.
const Dotted = ({ tone, children }) => (
  <Pill tone={tone}>
    <i className="size-1.5 rounded-full bg-current" />
    {children}
  </Pill>
);

export const StatusPill = ({ variant }) => {
  if (variant.status === "OUT_OF_STOCK") return <Dotted tone="red">Out of stock</Dotted>;
  if (variant.status === "LOW") return <Dotted tone="warn">Low · {variant.totalPieces} pcs</Dotted>;
  if (variant.isAgeing) return <Dotted tone="violet">Ageing</Dotted>;
  return <Dotted tone="ok">In stock</Dotted>;
};

// Zero of a size is red (can't make a set), 1–2 amber (running out), otherwise neutral.
const sizeTone = (quantity) =>
  quantity === 0
    ? "border-red-200 bg-red-50 text-red-700"
    : quantity <= 2
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-slate-200 bg-white text-slate-700";

// One line of size counts that never wraps: "S 4 · M 0 · L 2", colouring only the zero and low sizes.
// With onSelect, each count is a button, so clicking a quantity opens what it belongs to.
export const SizeChips = ({ sizes, onSelect }) => (
  <div className="flex flex-nowrap gap-1 overflow-x-auto">
    {sizes.map((size) => {
      const className = cn(
        "inline-flex flex-none items-baseline gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 font-mono text-[12px] font-bold",
        sizeTone(size.quantity),
        onSelect && "cursor-pointer transition-shadow hover:shadow-[0_0_0_2px_rgba(16,185,129,0.35)]",
      );
      const content = (
        <>
          <b className="font-sans text-[10px] font-semibold opacity-60">{size.size}</b>
          {size.quantity}
        </>
      );
      return onSelect ? (
        <button key={size.size} type="button" onClick={onSelect} title={`${size.size}: ${size.quantity} pcs — open`} className={className}>
          {content}
        </button>
      ) : (
        <span key={size.size} className={className}>
          {content}
        </span>
      );
    })}
  </div>
);

export const AgeCell = ({ pieces, days, ageing }) =>
  pieces ? (
    <span className={cn("font-mono text-xs", ageing ? "font-bold text-violet-700" : "text-slate-600")}>{formatAge(days)}</span>
  ) : (
    <span className="text-slate-400">—</span>
  );

export const Num = ({ className, children }) => (
  <span className={cn("font-mono tabular-nums text-slate-600", className)}>{children}</span>
);
