import DataTable from "@/components/shared/table/DataTable";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Search } from "lucide-react";
import { Link } from "react-router";
import { useDesignListApi } from "../hooks/useDesignListApi";
import { columns } from "../table/DesignsColumns";

const Designs = () => {
  const { data: response, isPending } = useDesignListApi({ page: 1, limit: 20 });
  const designs = response?.data ?? [];

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col font-sans">
      {/* Header section */}
      <div className="mb-8 flex shrink-0 flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1E1B4B] tracking-tight">
            Design Master
          </h1>
        </div>
        <Button
          variant="link"
          className="text-[#1E1B4B] p-4 neu-button rounded-full transition-colors"
        >
          <Link to="/add-designs" className="flex items-center gap-1.5">
            <Plus className="w-5 h-5" /> Designs
          </Link>
        </Button>
      </div>

      {/* Main glass container */}
      <div className="flex min-h-0 flex-1 flex-col rounded-[24px] glass-table p-6 space-y-6">
        {/* Search & Filters */}
        <div className="flex shrink-0 flex-col md:flex-row gap-4 justify-between items-center rounded-[22px] px-3 py-2.5">
          <div className="flex items-center flex-1 w-full relative neu-pressed">
            <Search className="w-5 h-5 text-gray-400 absolute left-4" />
            <input
              type="text"
              placeholder="Search by name, ID or email..."
              className="bg-transparent border-none outline-none pl-12 pr-4 py-2 w-full text-sm placeholder:text-gray-500 font-medium"
            />
          </div>
        </div>

        {/* Table wrapper */}
        <div className="min-h-0 flex-1 bg-transparent">
          {isPending ? (
            <Loader2 className="animate-spin text-cyan-400" />
          ) : (
            <DataTable
              columns={columns}
              data={designs}
              emptyState={{
                title: "No designs found",
                description: "No designs match current filters",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Designs;
