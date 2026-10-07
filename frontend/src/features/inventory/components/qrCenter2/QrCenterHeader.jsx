import { Sheet } from "./shared/primitives.jsx";

export default function QrCenterHeader() {
    return (
        <Sheet>
            <h1 className="mb-1 text-[22px] font-bold tracking-[-.02em] sm:text-[27px]">QR Center</h1>
            <p className="text-sm text-slate-500 sm:text-[15px]">Look up any tag, reprint it, and print batches whose tags were skipped at stock-in.</p>
        </Sheet>
    );
}
