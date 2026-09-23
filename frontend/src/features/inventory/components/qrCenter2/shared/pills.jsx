export function Pill({ tone = "neu", children }) {
    return <span className={`qrc2-pill qrc2-pill-${tone}`}>{children}</span>;
}

export function KindBadge({ kind }) {
    return <span className={`qrc2-kind qrc2-kind-${kind}`}>{kind}</span>;
}
