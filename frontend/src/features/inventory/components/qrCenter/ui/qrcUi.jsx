// Small presentational primitives shared across every QR Center zone. Kept bespoke
// (not shadcn Button) because the mockup's flat emerald/slate palette is intentionally
// different from the app's default button theme, and these are plain <button>s so the
// exact mockup classes port over verbatim.

export function PrimaryButton({ children, className = "", ...props }) {
    return (
        <button
            type="button"
            className={`px-3.5 py-2 rounded-lg bg-[var(--qrc-accent)] hover:bg-[var(--qrc-accent-hover)] text-white text-[13px] font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}

export function SecondaryButton({ children, className = "", ...props }) {
    return (
        <button
            type="button"
            className={`px-3.5 py-2 rounded-lg bg-white border border-[var(--qrc-line-strong)] hover:bg-[var(--qrc-sunken)] text-[var(--qrc-ink2)] text-[13px] font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}

export function DangerButton({ children, className = "", ...props }) {
    return (
        <button
            type="button"
            className={`px-3.5 py-2 rounded-lg bg-white border border-[var(--qrc-danger-border)] hover:bg-[var(--qrc-danger-bg)] text-[var(--qrc-danger)] text-[13px] font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}

export function VariantDot({ color }) {
    if (!color) return null;
    return <span className="inline-block w-[9px] h-[9px] rounded-full flex-none" style={{ background: color }} />;
}

export function Eyebrow({ children, className = "" }) {
    return <div className={`qrc-eyebrow ${className}`}>{children}</div>;
}

export function Pill({ children, className = "" }) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${className}`}>
            {children}
        </span>
    );
}

export function Th({ children, right = false }) {
    return <th className={`text-left px-3 py-2 qrc-eyebrow ${right ? "text-right" : ""}`}>{children}</th>;
}

export function NativeSelect({ className = "", ...props }) {
    return (
        <select
            className={`h-9 w-full rounded-lg border border-[var(--qrc-line-strong)] bg-white px-2 text-[13px] text-[var(--qrc-ink)] ${className}`}
            {...props}
        />
    );
}

export function NativeInput({ className = "", ...props }) {
    return (
        <input
            className={`h-9 w-full rounded-lg border border-[var(--qrc-line-strong)] bg-white px-2.5 text-[13px] text-[var(--qrc-ink)] placeholder:text-[var(--qrc-ink4)] ${className}`}
            {...props}
        />
    );
}

export function FieldLabel({ children }) {
    return <span className="text-[10px] font-semibold text-[var(--qrc-ink3)] uppercase tracking-wide">{children}</span>;
}
