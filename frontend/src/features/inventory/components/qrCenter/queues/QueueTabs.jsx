import { QUEUE_TABS } from "../../../utils/qrCenterConstants";
import ToTagTab from "./ToTagTab";
import ReprintsTab from "./ReprintsTab";
import StaleTab from "./StaleTab";
import RecoveryTab from "./RecoveryTab";
import JobsTab from "./JobsTab";

export default function QueueTabs({ activeTab, onChangeTab, guards }) {
    return (
        <section className="mb-6">
            <div className="bg-white border border-[var(--qrc-line)] rounded-[10px] overflow-hidden">
                <div className="flex items-center gap-1 px-3 pt-2 bg-[var(--qrc-sunken)] border-b border-[var(--qrc-line)] overflow-x-auto">
                    {QUEUE_TABS.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => onChangeTab(t.id)}
                            className={`px-3.5 py-2.5 text-[13px] font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
                                activeTab === t.id
                                    ? "text-[var(--qrc-accent-hover)] border-[var(--qrc-accent)]"
                                    : "text-[var(--qrc-ink3)] border-transparent hover:text-[var(--qrc-ink2)]"
                            }`}
                        >
                            {t.label}
                            {t.locked ? <span className="ml-1 text-[9px] align-middle">🔒</span> : null}
                        </button>
                    ))}
                </div>
                <div className="p-4">
                    {activeTab === "totag" && <ToTagTab guards={guards} />}
                    {activeTab === "reprints" && <ReprintsTab guards={guards} />}
                    {activeTab === "stale" && <StaleTab guards={guards} />}
                    {activeTab === "recovery" && <RecoveryTab />}
                    {activeTab === "jobs" && <JobsTab guards={guards} />}
                </div>
            </div>
        </section>
    );
}
