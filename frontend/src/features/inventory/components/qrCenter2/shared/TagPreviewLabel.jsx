import QrCodeImage from "../../qr-center/QrCodeImage.jsx";

// Real-data counterpart of the reference mockup's `label()` string-builder — same visual
// layout, but every value is a prop sourced from the backend instead of a demo lookup table.
export default function TagPreviewLabel({ shortCode, kind, designCode, designName, colorName, sizeLabel, semiLabel, parentShortCode, mrp, inwardDate }) {
    const isSet = kind === "SET";
    const isSemi = kind === "SEMI" || kind === "BUNDLE";
    const isLoose = kind === "LOOSE" || kind === "LOOSE_PIECE";

    return (
        <div className="qrc2-lbl">
            <div className="qrc2-lbl-top">
                <span>STOCK MGMT</span>
                <span>[{isSet ? "PARENT SET" : isSemi ? "SEMI SET" : isLoose ? "LOOSE PIECE" : "GARMENT PIECE"}]</span>
            </div>
            <div className="qrc2-lbl-b">
                <div><QrCodeImage value={shortCode} size={58} /></div>
                <div className="qrc2-lbl-t">
                    <div className="qrc2-c1">{designCode}</div>
                    <div className="qrc2-c2">{designName}</div>
                    <div className="qrc2-c3">{colorName?.toUpperCase()}</div>
                    {isSet && <div className="qrc2-c4">SET{mrp != null ? ` · MRP ₹ ${mrp}` : ""}</div>}
                    {isSemi && <div className="qrc2-c4">SEMI: {semiLabel ?? "—"}</div>}
                    {!isSet && !isSemi && (
                        <>
                            <div className="qrc2-c4">SIZE {sizeLabel ?? "—"}</div>
                            {parentShortCode && <div className="qrc2-c6">PARENT: {parentShortCode}</div>}
                            {isLoose && <div className="qrc2-c6">LOOSE — FROM JOBBER</div>}
                        </>
                    )}
                    {inwardDate && <div className="qrc2-c6">INWARD {inwardDate}</div>}
                </div>
            </div>
            <div className="qrc2-lbl-f"><span className="qrc2-id">{shortCode}</span></div>
        </div>
    );
}
