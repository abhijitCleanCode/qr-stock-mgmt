import { Construction } from "lucide-react";

// Keeps the subnav honest between slices: the tab exists and explains itself rather than 404ing
// or pretending to be an empty list.
const SlicePlaceholder = ({ title, description }) => (
    <div className="glass-card flex h-full flex-col items-center justify-center gap-3 rounded-[24px] p-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/60 text-[#1E1B4B]/60">
            <Construction className="h-7 w-7" />
        </span>
        <h2 className="text-lg font-bold text-[#1E1B4B]">{title}</h2>
        <p className="max-w-[46ch] text-sm text-[#1E1B4B]/60">{description}</p>
    </div>
);

export default SlicePlaceholder;
