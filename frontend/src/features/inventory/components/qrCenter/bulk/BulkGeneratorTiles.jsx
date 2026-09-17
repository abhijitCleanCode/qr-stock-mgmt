import { useState } from "react";
import { toast } from "react-toastify";
import { useBulkGenerateApi } from "../../../hooks/useBulkGenerateApi";
import { useQrCenterReferenceApi } from "../../../hooks/useQrCenterReferenceApi";
import { useQrCenterHealthApi } from "../../../hooks/useQrCenterHealthApi";
import { DangerButton, SecondaryButton, NativeInput, NativeSelect } from "../ui/qrcUi";

// The mockup's tiles were plain buttons over hardcoded demo params; POST /qr-center/bulk/:kind
// needs real ids (printerId / rackId / stockItemIds / stockInTransactionId), so each tile grew
// the minimal input it needs — documented as a deliberate deviation in the build report.
function PrinterField({ value, onChange, printers }) {
    return (
        <NativeSelect value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">Select printer</option>
            {printers.map((p) => (
                <option key={p.id} value={p.id}>
                    {p.name} — {p.location}
                </option>
            ))}
        </NativeSelect>
    );
}

export default function BulkGeneratorTiles({ guards }) {
    const bulkGenerate = useBulkGenerateApi();
    const { data: referenceResponse } = useQrCenterReferenceApi();
    const { data: healthResponse } = useQrCenterHealthApi();
    const printers = referenceResponse?.data?.printers ?? [];
    const untaggedPieces = healthResponse?.data?.untaggedPieces ?? 0;

    const [migrationPrinter, setMigrationPrinter] = useState("");
    const [rackLabelPrinter, setRackLabelPrinter] = useState("");
    const [rebagRackId, setRebagRackId] = useState("");
    const [rebagPrinter, setRebagPrinter] = useState("");
    const [tourItemIds, setTourItemIds] = useState("");
    const [voidTxnId, setVoidTxnId] = useState("");
    const [voidPrinter, setVoidPrinter] = useState("");

    const run = async (kind, body, successMessage) => {
        try {
            const res = await bulkGenerate.mutateAsync({ kind, ...body });
            toast.success(successMessage ?? `Job queued — ${res?.data?.printJob?.totalCount ?? ""} labels.`);
        } catch (err) {
            toast.error(err?.message ?? "Couldn't queue that job.");
        }
    };

    const handleMigration = () => {
        if (!migrationPrinter) return toast.error("Select a printer first.");
        guards.guardVolume({
            count: untaggedPieces,
            media: "~1 roll per ~500 labels of 58×40mm media",
            onConfirm: () => run("migration-run", { printerId: Number(migrationPrinter) }, "Legacy migration run queued."),
        });
    };

    const handleRackBinLabels = () => {
        if (!rackLabelPrinter) return toast.error("Select a printer first.");
        run("rack-bin-labels", { printerId: Number(rackLabelPrinter) }, "Rack & bin label job queued.");
    };

    const handleRebag = () => {
        if (!rebagRackId || !rebagPrinter) return toast.error("Enter a rack ID and select a printer.");
        run("rebag-rack", { rackId: Number(rebagRackId), printerId: Number(rebagPrinter) }, "Re-bag job queued.");
    };

    const handleTourManifest = () => {
        const ids = tourItemIds
            .split(",")
            .map((s) => Number(s.trim()))
            .filter((n) => Number.isFinite(n) && n > 0);
        if (ids.length === 0) return toast.error("Enter at least one stock item id.");
        run("tour-manifest", { stockItemIds: ids }, "Tour manifest generated.");
    };

    const handleVoid = () => {
        if (!voidTxnId || !voidPrinter) return toast.error("Enter a Stock In transaction id and select a printer.");
        run("void-labels", { stockInTransactionId: Number(voidTxnId), printerId: Number(voidPrinter) }, "Labels voided.");
    };

    const tiles = [
        {
            id: "migration",
            title: "Legacy migration run",
            sub: `${untaggedPieces} pieces on legacy racks awaiting QR generation`,
            body: <PrinterField value={migrationPrinter} onChange={setMigrationPrinter} printers={printers} />,
            action: <SecondaryButton className="mt-2 w-full" disabled={bulkGenerate.isPending} onClick={handleMigration}>Run migration</SecondaryButton>,
        },
        {
            id: "racklabels",
            title: "Rack & bin labels",
            sub: "Print fresh location labels for racks and bins",
            body: <PrinterField value={rackLabelPrinter} onChange={setRackLabelPrinter} printers={printers} />,
            action: <SecondaryButton className="mt-2 w-full" disabled={bulkGenerate.isPending} onClick={handleRackBinLabels}>Generate labels</SecondaryButton>,
        },
        {
            id: "rebag",
            title: "Re-bag entire rack",
            sub: "New set QR + passport cards for every set on a rack",
            body: (
                <div className="space-y-1.5">
                    <NativeInput type="number" min="1" placeholder="Rack ID" value={rebagRackId} onChange={(e) => setRebagRackId(e.target.value)} />
                    <PrinterField value={rebagPrinter} onChange={setRebagPrinter} printers={printers} />
                </div>
            ),
            action: <SecondaryButton className="mt-2 w-full" disabled={bulkGenerate.isPending} onClick={handleRebag}>Re-bag rack</SecondaryButton>,
        },
        {
            id: "tour",
            title: "Tour manifest",
            sub: "Manifest + piece tags for a salesperson tour pack",
            body: <NativeInput placeholder="Stock item ids, comma separated" value={tourItemIds} onChange={(e) => setTourItemIds(e.target.value)} />,
            action: <SecondaryButton className="mt-2 w-full" disabled={bulkGenerate.isPending} onClick={handleTourManifest}>Generate manifest</SecondaryButton>,
        },
        {
            id: "void",
            title: "Void labels for cancelled batch",
            sub: "Voids every active label from a cancelled Stock In batch",
            body: (
                <div className="space-y-1.5">
                    <NativeInput type="number" min="1" placeholder="Stock In transaction id" value={voidTxnId} onChange={(e) => setVoidTxnId(e.target.value)} />
                    <PrinterField value={voidPrinter} onChange={setVoidPrinter} printers={printers} />
                </div>
            ),
            action: <DangerButton className="mt-2 w-full" disabled={bulkGenerate.isPending} onClick={handleVoid}>Void labels</DangerButton>,
        },
    ];

    return (
        <section className="mb-6">
            <div className="qrc-eyebrow mb-2">Bulk generators</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                {tiles.map((t) => (
                    <div key={t.id} className="bg-white border border-[var(--qrc-line)] rounded-[10px] p-3.5 flex flex-col">
                        <div className="font-semibold text-[var(--qrc-ink)] text-[13px] mb-1">{t.title}</div>
                        <div className="text-[12px] text-[var(--qrc-ink3)] leading-snug mb-3 flex-1">{t.sub}</div>
                        {t.body}
                        {t.action}
                    </div>
                ))}
            </div>
        </section>
    );
}
