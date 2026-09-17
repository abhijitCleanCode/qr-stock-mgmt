import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useQrCenterReferenceApi } from "../../../hooks/useQrCenterReferenceApi";
import { Th, Pill } from "../ui/qrcUi";
import { reasonLabel, reasonStyle, REASON_CODE_LABELS } from "../../../utils/qrCenterConstants";

const SECTIONS = [
    { id: "presets", label: "Tag presets per design" },
    { id: "printers", label: "Printers & loaded media" },
    { id: "reasons", label: "Reprint reason codes" },
    { id: "permissions", label: "Permissions" },
];

export default function LibraryAccordion() {
    const { data: response, isPending, isError } = useQrCenterReferenceApi();
    const [open, setOpen] = useState("presets");
    const ref = response?.data;

    return (
        <section className="mb-10">
            <div className="qrc-eyebrow mb-2">Library &amp; settings</div>
            <div className="bg-white border border-[var(--qrc-line)] rounded-[10px] divide-y divide-[var(--qrc-line)]">
                {SECTIONS.map((s) => (
                    <Collapsible key={s.id} open={open === s.id} onOpenChange={(next) => setOpen(next ? s.id : null)}>
                        <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 text-left">
                            <span className="text-[13px] font-semibold text-[var(--qrc-ink)]">{s.label}</span>
                            <ChevronDown className={`w-4 h-4 text-[var(--qrc-ink3)] transition-transform ${open === s.id ? "rotate-180" : ""}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-4 qrc-fade-in">
                            {isPending && <div className="text-[12px] text-[var(--qrc-ink3)]">Loading…</div>}
                            {isError && <div className="text-[12px] text-[var(--qrc-danger)]">Couldn't load reference data.</div>}
                            {ref && s.id === "presets" && <PresetsTable rows={ref.tagPresets} />}
                            {ref && s.id === "printers" && <PrintersTable printers={ref.printers} />}
                            {ref && s.id === "reasons" && <ReasonsGrid reasonCodes={ref.reasonCodes} />}
                            {ref && s.id === "permissions" && <PermissionsList permissions={ref.permissions} />}
                        </CollapsibleContent>
                    </Collapsible>
                ))}
            </div>
        </section>
    );
}

function PresetsTable({ rows = [] }) {
    if (rows.length === 0) return <div className="text-[12px] text-[var(--qrc-ink3)]">No tag presets configured yet.</div>;
    return (
        <div className="qrc-scrollx">
            <table className="w-full min-w-[520px] text-[13px]">
                <thead>
                    <tr className="bg-[var(--qrc-sunken)] border-b border-[var(--qrc-line)]">
                        <Th>Design</Th>
                        <Th>Preset</Th>
                        <Th>Media size</Th>
                        <Th>Default printer</Th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.designId} className="border-b border-[var(--qrc-line)] last:border-0">
                            <td className="px-3 py-2 qrc-mono font-semibold text-[var(--qrc-ink)]">{r.designCode}</td>
                            <td className="px-3 py-2 text-[var(--qrc-ink2)]">{r.presetName}</td>
                            <td className="px-3 py-2 qrc-mono text-[var(--qrc-ink3)]">{r.mediaSize}</td>
                            <td className="px-3 py-2 text-[var(--qrc-ink2)]">{r.defaultPrinter ?? "—"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function PrintersTable({ printers = [] }) {
    if (printers.length === 0) return <div className="text-[12px] text-[var(--qrc-ink3)]">No printers registered yet.</div>;
    return (
        <div className="qrc-scrollx">
            <table className="w-full min-w-[560px] text-[13px]">
                <thead>
                    <tr className="bg-[var(--qrc-sunken)] border-b border-[var(--qrc-line)]">
                        <Th>Printer</Th>
                        <Th>Location</Th>
                        <Th right>Status</Th>
                    </tr>
                </thead>
                <tbody>
                    {printers.map((p) => (
                        <tr key={p.id} className="border-b border-[var(--qrc-line)] last:border-0">
                            <td className="px-3 py-2 font-semibold text-[var(--qrc-ink)]">{p.name}</td>
                            <td className="px-3 py-2 text-[var(--qrc-ink2)]">{p.location}</td>
                            <td className="px-3 py-2 text-right">
                                <Pill className={p.isActive ? "text-[var(--qrc-accent-hover)] bg-[var(--qrc-accent-bg)] border-[var(--qrc-accent-border)]" : "text-[var(--qrc-ink3)] bg-[var(--qrc-sunken)] border-[var(--qrc-line)]"}>
                                    {p.isActive ? "Active" : "Inactive"}
                                </Pill>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function ReasonsGrid({ reasonCodes = [] }) {
    const rows = reasonCodes.length ? reasonCodes : Object.entries(REASON_CODE_LABELS).map(([code, label]) => ({ code, label }));
    return (
        <div className="flex flex-wrap gap-2">
            {rows.map((x) => (
                <div key={x.code} className={`px-3 py-2 rounded-lg border min-w-[150px] ${reasonStyle(x.code)}`}>
                    <div className="text-[11px] font-bold uppercase tracking-wide">{x.label ?? reasonLabel(x.code)}</div>
                </div>
            ))}
        </div>
    );
}

function PermissionsList({ permissions = [] }) {
    if (permissions.length === 0) return <div className="text-[12px] text-[var(--qrc-ink3)]">No permission roles configured.</div>;
    return (
        <div className="space-y-2">
            {permissions.map((r) => (
                <div key={r.role} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-[var(--qrc-sunken)] border border-[var(--qrc-line)]">
                    <span className="text-[12px] font-semibold text-[var(--qrc-ink)] w-32 flex-none">{r.role}</span>
                    <span className="text-[12px] text-[var(--qrc-ink3)]">{r.capabilities}</span>
                </div>
            ))}
        </div>
    );
}
