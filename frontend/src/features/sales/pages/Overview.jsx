import { useNavigate } from "react-router";
import { ArrowRight, FileText, Receipt, Users } from "lucide-react";
import { usePartySummaryApi } from "../hooks/usePartiesApi.js";

const STEPS = [
    "Customer shortlists at the counter",
    "Order Form (checklist)",
    "Pick & scan in the godown",
    "Invoice — stock deducted",
];

const ACTIONS = [
    {
        to: "/stock-out/orders",
        icon: FileText,
        tone: "bg-blue-50 text-blue-700",
        title: "New Order Form",
        description: "Scan the hanging designs the customer shortlists and note pieces per variant. Doesn't touch stock.",
    },
    {
        to: "/stock-out/invoices",
        icon: Receipt,
        tone: "bg-emerald-50 text-emerald-700",
        title: "New Invoice",
        description: "Fetch an order form as your checklist, scan the actual stock you pick, and bill it. Stock is deducted here.",
    },
];

const Overview = () => {
    const navigate = useNavigate();
    const { data: summary } = usePartySummaryApi();
    const partyCount = summary?.data?.partyCount;

    return (
        <div className="flex h-full flex-col gap-5 overflow-y-auto pb-2">
            <div className="glass-card rounded-[24px] p-6">
                <h1 className="text-3xl font-bold tracking-tight text-[#1E1B4B]">Stock Out</h1>
                <p className="mt-1 max-w-[72ch] text-sm text-[#1E1B4B]/60">
                    Note what the customer wants at the counter, then pick it from the godown and bill it — stock
                    updates only when the invoice is generated.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {ACTIONS.map((action) => (
                    <button
                        key={action.to}
                        type="button"
                        onClick={() => navigate(action.to)}
                        className="glass-card flex w-full items-start gap-4 rounded-[20px] p-5 text-left transition-shadow hover:shadow-lg"
                    >
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${action.tone}`}>
                            <action.icon className="h-5 w-5" />
                        </span>
                        <span>
                            <span className="block text-base font-bold text-[#1E1B4B]">{action.title}</span>
                            <span className="mt-0.5 block text-sm text-[#1E1B4B]/60">{action.description}</span>
                        </span>
                    </button>
                ))}
            </div>

            <div className="glass-card rounded-[24px] p-6">
                <div className="flex flex-wrap items-center gap-2 text-sm text-[#1E1B4B]/60">
                    {STEPS.map((step, index) => (
                        <span key={step} className="flex items-center gap-2">
                            <span className="flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/70 text-[11px] font-bold text-[#1E1B4B]">
                                    {index + 1}
                                </span>
                                {step}
                            </span>
                            {index < STEPS.length - 1 && <ArrowRight className="h-3.5 w-3.5" />}
                        </span>
                    ))}
                </div>

                <div className="mt-5 flex items-center gap-4 rounded-2xl border border-white/50 bg-white/40 px-5 py-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/70 text-[#1E1B4B]/70">
                        <Users className="h-5 w-5" />
                    </span>
                    <div>
                        <div className="font-mono text-xl font-bold text-[#1E1B4B]">{partyCount ?? "—"}</div>
                        <div className="text-xs text-[#1E1B4B]/60">Parties in Party Master</div>
                    </div>
                </div>

                <p className="mt-4 text-xs text-[#1E1B4B]/50">
                    Counts for open order forms, invoices this month, pieces dispatched and value invoiced arrive with
                    the Order Forms and Invoices slices.
                </p>
            </div>
        </div>
    );
};

export default Overview;
