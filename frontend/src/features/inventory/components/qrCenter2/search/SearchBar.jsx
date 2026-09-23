export default function SearchBar({ value, onChange, placeholder }) {
    return (
        <div className="qrc2-searchwrap">
            <svg className="qrc2-mag" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <input value={value} onChange={(e) => onChange(e.target.value)} autoComplete="off" placeholder={placeholder} />
        </div>
    );
}
