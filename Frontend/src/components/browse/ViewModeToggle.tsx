import { Grid3X3, List } from "lucide-react";

export type ViewMode = "grid" | "list";

interface ViewModeToggleProps {
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
}

export function ViewModeToggle({ viewMode, setViewMode }: ViewModeToggleProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Desktop segmented control */}
      <div className="hidden md:inline-flex rounded-md overflow-hidden border border-primary/20">
        <button
          type="button"
          aria-pressed={viewMode === "grid"}
          onClick={() => setViewMode("grid")}
          className={`inline-flex items-center gap-2 px-3 py-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
            viewMode === "grid"
              ? "bg-gradient-to-r from-primary to-research-green text-white shadow-md"
              : "bg-transparent text-primary hover:bg-primary/5"
          }`}
        >
          <Grid3X3 className="w-4 h-4" />
          <span className="text-sm font-medium">Grid</span>
        </button>

        <button
          type="button"
          aria-pressed={viewMode === "list"}
          onClick={() => setViewMode("list")}
          className={`inline-flex items-center gap-2 px-3 py-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
            viewMode === "list"
              ? "bg-gradient-to-r from-primary to-research-green text-white shadow-md"
              : "bg-transparent text-primary hover:bg-primary/5"
          }`}
        >
          <List className="w-4 h-4" />
          <span className="text-sm font-medium">List</span>
        </button>
      </div>

      {/* Mobile toggle (icon-first, distinct active state) */}
      <div className="inline-flex md:hidden items-center gap-2 rounded-md overflow-hidden border border-primary/10 bg-white/0">
        <button
          type="button"
          aria-pressed={viewMode === "grid"}
          onClick={() => setViewMode("grid")}
          className={`flex flex-col items-center justify-center px-3 py-2 w-16 transition-all duration-150 ${
            viewMode === "grid"
              ? "bg-gradient-to-r from-primary to-research-green text-white shadow"
              : "text-primary hover:bg-primary/5"
          }`}
        >
          <Grid3X3 className="w-5 h-5" />
          <span className="text-[11px] mt-1">Grid</span>
        </button>

        <button
          type="button"
          aria-pressed={viewMode === "list"}
          onClick={() => setViewMode("list")}
          className={`flex flex-col items-center justify-center px-3 py-2 w-16 transition-all duration-150 ${
            viewMode === "list"
              ? "bg-gradient-to-r from-primary to-research-green text-white shadow"
              : "text-primary hover:bg-primary/5"
          }`}
        >
          <List className="w-5 h-5" />
          <span className="text-[11px] mt-1">List</span>
        </button>
      </div>
    </div>
  );
}
