import { useState } from "react";
import { toast } from "react-toastify";

import "../qrCenter.theme.css";
import { useQrCenterPrintGuards } from "../hooks/useQrCenterPrintGuards";
import ResolverSection from "../components/qrCenter/resolver/ResolverSection";
import HealthTiles from "../components/qrCenter/health/HealthTiles";
import QueueTabs from "../components/qrCenter/queues/QueueTabs";
import BulkGeneratorTiles from "../components/qrCenter/bulk/BulkGeneratorTiles";
import LibraryAccordion from "../components/qrCenter/library/LibraryAccordion";
import OfflineQueuePill from "../components/qrCenter/OfflineQueuePill";
import DuplicatePrintGuardModal from "../components/qrCenter/modals/DuplicatePrintGuardModal";
import VolumeConfirmModal from "../components/qrCenter/modals/VolumeConfirmModal";

const QrCenter = () => {
    const [activeTab, setActiveTab] = useState("totag");
    const guards = useQrCenterPrintGuards();

    // The health "Duplicate suspects" tile has no dedicated endpoint that names which code is
    // in conflict (GET /qr-center/health only returns a count) — so rather than fabricating a
    // demo code the way the mockup does, this nudges the operator toward the resolver instead.
    const handleShowDuplicateFromHealth = () => {
        toast.info("Scan or search the affected code in the resolver above to see the duplicate conflict.");
        document.querySelector(".qrc-resolver-input")?.focus();
    };

    return (
        <div className="qr-center-scope min-h-full bg-[var(--qrc-page)] rounded-2xl">
            <main className="max-w-[1360px] w-full mx-auto px-4 sm:px-6 py-6">
                <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
                    <div>
                        <h1 className="text-[22px] font-extrabold text-[var(--qrc-ink)] tracking-tight">QR Center</h1>
                        <p className="text-[13px] text-[var(--qrc-ink3)] mt-0.5">Resolve, reprint and recover every tag in the godown.</p>
                    </div>
                    <OfflineQueuePill />
                </div>

                <ResolverSection onGotoTab={setActiveTab} />
                <HealthTiles activeTab={activeTab} onSelectTab={setActiveTab} onShowDuplicate={handleShowDuplicateFromHealth} duplicateShown={false} />
                <QueueTabs activeTab={activeTab} onChangeTab={setActiveTab} guards={guards} />
                <BulkGeneratorTiles guards={guards} />
                <LibraryAccordion />
            </main>

            <DuplicatePrintGuardModal modal={guards.modal} onClose={guards.closeModal} onConfirm={guards.confirmModal} />
            <VolumeConfirmModal modal={guards.modal} onClose={guards.closeModal} onConfirm={guards.confirmModal} />
        </div>
    );
};

export default QrCenter;
