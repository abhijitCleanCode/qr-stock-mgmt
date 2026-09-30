import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, Check, Keyboard, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";

const METHODS = [
    { key: "Manual", label: "Manual ID", Icon: Keyboard },
    { key: "QR Scanner", label: "QR Scanner", Icon: Camera },
    { key: "QR Gun", label: "QR Gun", Icon: ScanLine },
];

// The three ways stock gets identified on the floor, behind one interface.
//
// Manual and QR Gun are the same text field — a gun is a keyboard that types very fast and
// presses Enter — but they are separate modes because the gun needs the field to keep focus and
// the operator needs to see that it is listening. QR Scanner uses the device camera where the
// browser supports it.
const ScanPanel = ({ title, hint, placeholder, onScan, feedback, busy }) => {
    const [method, setMethod] = useState("Manual");
    const [value, setValue] = useState("");
    const [cameraError, setCameraError] = useState("");
    const [cameraOn, setCameraOn] = useState(false);

    const inputRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const timerRef = useRef(null);
    const lastRef = useRef({ code: "", at: 0 });

    const cameraSupported = typeof window !== "undefined"
        && "BarcodeDetector" in window
        && Boolean(navigator.mediaDevices?.getUserMedia);

    const stopCamera = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;

        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setCameraOn(false);
    };

    // Whatever the mode, leaving the panel must release the camera — a page that keeps the lens
    // warm after you navigate away is a bug people notice as a hot phone.
    useEffect(() => stopCamera, []);
    useEffect(() => {
        if (method !== "QR Scanner") stopCamera();
        if (method !== "QR Scanner") setTimeout(() => inputRef.current?.focus(), 0);
    }, [method]);

    const submit = (code, via = method) => {
        const trimmed = String(code ?? "").trim();
        if (!trimmed) return;

        onScan(trimmed, via);
        setValue("");
        inputRef.current?.focus();
    };

    const startCamera = async () => {
        setCameraError("");

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            streamRef.current = stream;
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            setCameraOn(true);

            const detector = new window.BarcodeDetector({ formats: ["qr_code", "code_128"] });

            timerRef.current = setInterval(async () => {
                try {
                    const codes = await detector.detect(videoRef.current);
                    if (codes.length === 0) return;

                    const code = codes[0].rawValue;
                    const now = Date.now();
                    // A tag held in frame reads many times a second; without this the same set is
                    // added repeatedly while the operator is still lining up the next one.
                    if (code === lastRef.current.code && now - lastRef.current.at < 2500) return;

                    lastRef.current = { code, at: now };
                    submit(code, "QR Scanner");
                } catch {
                    // A single failed frame is not worth interrupting the scan loop for.
                }
            }, 350);
        } catch {
            setCameraError("Camera permission denied — allow camera access, or use the QR Gun.");
        }
    };

    return (
        <div>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-base font-bold text-[#1E1B4B]">{title}</h2>
                    <p className="text-xs text-[#1E1B4B]/60">{hint}</p>
                </div>

                <div className="toolbar-neu flex gap-1 rounded-xl p-1">
                    {METHODS.map(({ key, label, Icon }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setMethod(key)}
                            className={cn(
                                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                                method === key ? "bg-white text-[#1E1B4B] shadow-sm" : "text-[#1E1B4B]/60 hover:text-[#1E1B4B]",
                            )}
                        >
                            <Icon className="h-3.5 w-3.5" /> {label}
                        </button>
                    ))}
                </div>
            </div>

            {method === "QR Scanner" ? (
                <div>
                    <div className="relative flex h-52 items-center justify-center overflow-hidden rounded-2xl bg-[#0F172A]">
                        <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
                        <div className="relative h-32 w-32 rounded-xl border-[2.5px] border-white/85" />
                        <span className="absolute bottom-2 left-0 right-0 text-center text-[11.5px] text-slate-300">
                            {!cameraSupported ? "Live camera scanning isn't supported in this browser"
                                : cameraError ? cameraError
                                : cameraOn ? "Scanning… hold the tag inside the frame"
                                : "Tap Start camera, then point at the QR tag"}
                        </span>
                    </div>

                    <div className="mt-2 flex gap-2">
                        {cameraSupported ? (
                            <>
                                <button type="button" onClick={startCamera} className="neu-button rounded-full px-4 py-1.5 text-xs font-semibold text-[#1E1B4B]">
                                    Start camera
                                </button>
                                <button type="button" onClick={stopCamera} className="neu-button rounded-full px-4 py-1.5 text-xs font-semibold text-[#1E1B4B]">
                                    Stop
                                </button>
                            </>
                        ) : (
                            <span className="text-xs text-[#1E1B4B]/60">Use Chrome on Android, or type the ID with Manual ID.</span>
                        )}
                    </div>
                </div>
            ) : (
                <div>
                    {method === "QR Gun" && (
                        <div className="mb-2 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
                            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-600" />
                            <div>
                                <b className="text-xs text-emerald-900">Ready — pull the trigger</b>
                                <p className="text-[11px] text-emerald-800/70">
                                    The gun types into the field below. Keep it focused while scanning.
                                </p>
                            </div>
                        </div>
                    )}

                    <input
                        ref={inputRef}
                        value={value}
                        disabled={busy}
                        autoComplete="off"
                        spellCheck={false}
                        onChange={(event) => setValue(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key !== "Enter") return;
                            event.preventDefault();
                            submit(event.currentTarget.value);
                        }}
                        placeholder={placeholder}
                        className="w-full rounded-xl border-2 border-emerald-200 bg-emerald-50/60 px-4 py-3 font-mono text-sm text-[#1E1B4B] outline-none focus:border-emerald-500"
                    />
                    <p className="mt-1.5 text-[11.5px] text-[#1E1B4B]/50">
                        Type or scan the ID and press <b>Enter</b>.
                    </p>
                </div>
            )}

            {feedback && (
                <div className={cn(
                    "mt-3 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs leading-relaxed",
                    feedback.tone === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                        : feedback.tone === "warn" ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-red-200 bg-red-50 text-red-900",
                )}>
                    {feedback.tone === "ok" ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                    <span>{feedback.message}</span>
                </div>
            )}
        </div>
    );
};

export default ScanPanel;
