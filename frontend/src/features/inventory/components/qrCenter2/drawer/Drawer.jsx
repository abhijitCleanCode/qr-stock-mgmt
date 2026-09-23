import { useEffect } from "react";

// Generic slide-in drawer shell, ported from the reference mockup's .scrim/.drawer behavior —
// no equivalent existed in the app's shared components, so this is net new.
export default function Drawer({ open, onClose, title, subtitle, children, footer }) {
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    return (
        <>
            <div className={`qrc2-scrim${open ? " qrc2-on" : ""}`} onClick={onClose} />
            <aside className={`qrc2-drawer${open ? " qrc2-on" : ""}`} role="dialog" aria-label={title}>
                <div className="qrc2-drhead">
                    <div><h3>{title}</h3><div className="qrc2-m">{subtitle}</div></div>
                    <button className="qrc2-btn qrc2-sm" onClick={onClose}>Close</button>
                </div>
                <div className="qrc2-drbody">{children}</div>
                <div className="qrc2-drfoot">{footer}</div>
            </aside>
        </>
    );
}
