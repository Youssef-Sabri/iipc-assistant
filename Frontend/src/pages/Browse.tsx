import { useEffect, useCallback, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IIPCData, supabase } from "@/lib/supabase";
import {
  Search,
  Calendar,
  User,
  ExternalLink,
  Grid3X3,
  List,
  Archive,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { useItemTypes } from "@/hooks/use-iipc-data";

type ViewMode = "grid" | "list";
type SortField = "title" | "date" | "creator" | "item_type";
type SortOrder = "asc" | "desc";

const ITEMS_PER_PAGE = 12;

const ViewModeToggle = ({ viewMode, setViewMode }: { viewMode: ViewMode; setViewMode: (v: ViewMode) => void; }) => {
  // Desktop segmented + Mobile icon-first toggle
  return (
    <div className="flex items-center gap-2">
      {/* Desktop segmented control */}
      <div className="hidden md:inline-flex rounded-md overflow-hidden border border-primary/20">
        <button
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
};

const Browse = () => {
  // Data & UI state
  const [materials, setMaterials] = useState<IIPCData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { itemTypes } = useItemTypes();

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const sortOptions = [
    { value: "date-desc", label: "Date (Newest First)", mobileLabel: "Newest" },
    { value: "date-asc", label: "Date (Oldest First)", mobileLabel: "Oldest" },
    { value: "title-asc", label: "Title (A-Z)", mobileLabel: "A-Z" },
    { value: "title-desc", label: "Title (Z-A)", mobileLabel: "Z-A" },
    { value: "creator-asc", label: "Author (A-Z)", mobileLabel: "Author A-Z" },
    { value: "creator-desc", label: "Author (Z-A)", mobileLabel: "Author Z-A" },
    { value: "item_type-asc", label: "Type (A-Z)", mobileLabel: "Type A-Z" },
    { value: "item_type-desc", label: "Type (Z-A)", mobileLabel: "Type Z-A" },
  ];

  // Fetch page (server-side filtering/sorting/pagination) — debounced
  const fetchPage = useCallback(async () => {
    const debounce = 200;
    setLoading(true);
    try {
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from("iipc_data")
        .select("id,title,description,creator,item_type,date,ark_url,created_at", { count: "exact" });

      // Search: case-insensitive substring match across fields
      const q = searchQuery.trim();
      if (q) {
        const escaped = q.replace(/%/g, "\\%").replace(/_/g, "\\_");
        query = query.or(
          `title.ilike.%${escaped}%,creator.ilike.%${escaped}%,description.ilike.%${escaped}%`
        );
      }

      if (selectedType && selectedType !== "all") {
        const tEsc = selectedType.replace(/%/g, "\\%").replace(/_/g, "\\_");
        query = query.ilike("item_type", `%${tEsc}%`);
      }

      // Year filter => translate to range (utilizes date index)
      if (selectedYear && selectedYear !== "all") {
        const year = Number(selectedYear);
        if (!Number.isNaN(year)) {
          const from = `${year}-01-01`;
          const to = `${year}-12-31`;
          query = query.gte("date", from).lte("date", to);
        }
      }

      const sortColumn = sortField === "date" ? "date" : sortField;
      query = query.order(sortColumn, { ascending: sortOrder === "asc" });

      query = query.range(start, end);

      // small client debounce
      await new Promise((r) => setTimeout(r, debounce));
      const res = await query;
      const { data, error: fetchError, count } = res as {
        data: IIPCData[] | null;
        error: Error | null;
        count: number | null;
      };
      if (fetchError) throw fetchError;

      setMaterials((data as IIPCData[]) || []);
      setTotalCount(typeof count === "number" ? count : (data ? data.length : 0));
      setError(null);
    } catch (err) {
      console.error("Fetch page error", err);
      setError(err instanceof Error ? err.message : String(err));
      setMaterials([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, selectedType, selectedYear, sortField, sortOrder]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  // Fetch available years once (lightweight)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("iipc_data")
          .select("date", { count: undefined })
          .neq("date", null);
        if (error) {
          console.warn("Years fetch failed:", error);
          return;
        }
        if (!mounted) return;
        const yearsSet = new Set<number>();
        (data || []).forEach((r: { date: string }) => {
          try {
            const d = new Date(r.date);
            if (!isNaN(d.getTime())) {
              const y = d.getFullYear();
              if (y >= 1900 && y <= new Date().getFullYear() + 5) yearsSet.add(y);
            }
          } catch {
            // ignore
          }
        });
        const yearsArr = Array.from(yearsSet).sort((a, b) => b - a);
        setAvailableYears(yearsArr);
      } catch (err) {
        console.warn("Failed to load years", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedType, selectedYear, sortField, sortOrder]);

  const handleMaterialClick = (arkUrl: string) => {
    if (arkUrl) window.open(arkUrl, "_blank");
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedType("all");
    setSelectedYear("all");
    setSortField("date");
    setSortOrder("desc");
  };

  const hasActiveFilters = !!(searchQuery || selectedType !== "all" || selectedYear !== "all");

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const showingTo = Math.min(startIndex + ITEMS_PER_PAGE, totalCount);

  const onSortChange = (value: string) => {
    const [field, order] = value.split("-") as [SortField, SortOrder];
    setSortField(field);
    setSortOrder(order);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 animate-in fade-in-0 slide-in-from-top-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-primary/20 to-research-green/20 rounded-full flex items-center justify-center">
              <Archive className="w-6 h-6 text-primary" />
            </div>
            <div>
              {/* Gradient title like Index */}
              <h1 className="text-3xl sm:text-4xl font-bold mb-1 bg-gradient-to-r from-primary to-research-green bg-clip-text text-transparent">
                Browse Materials
              </h1>
              <p className="text-muted-foreground">
                Explore {totalCount.toLocaleString() || "0"} IIPC conference materials and research papers
              </p>
            </div>
          </div>
        </div>

        {/* Filters Card */}
        <Card className="p-4 sm:p-6 mb-8 bg-gradient-to-r from-background to-primary/5 border-primary/20 animate-in fade-in-0 slide-in-from-top-4" style={{ animationDelay: "200ms" }}>
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by title, author, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-base sm:text-lg border-primary/20 focus:border-primary/50"
              />
            </div>

            {/* Responsive filters grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-8 flex flex-col gap-4 md:flex-row md:items-end md:gap-4">
                {/* Type Filter */}
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    <span className="md:hidden">Type</span>
                    <span className="hidden md:inline">Filter by Type</span>
                  </label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="border-primary/20 focus:border-primary/50 h-10 md:h-auto">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {itemTypes.map((t) => (
                        <SelectItem key={t.type} value={t.type}>
                          <span className="capitalize">{t.type}</span>
                          <span className="hidden md:inline"> {!isNaN(Number(t.count)) ? ` (${t.count})` : ""}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Year Filter */}
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    <span className="md:hidden">Year</span>
                    <span className="hidden md:inline">Filter by Year</span>
                  </label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="border-primary/20 focus:border-primary/50 h-10 md:h-auto">
                      <SelectValue placeholder="All Years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {availableYears.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Filter */}
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Sort By</label>
                  <Select value={`${sortField}-${sortOrder}`} onValueChange={onSortChange}>
                    <SelectTrigger className="border-primary/20 focus:border-primary/50 h-10 md:h-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="md:hidden">{opt.mobileLabel}</span>
                          <span className="hidden md:inline">{opt.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="md:col-span-4 flex items-center justify-between md:justify-end gap-4">
                <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters} className="text-muted-foreground hover:bg-red-50 hover:text-red-600 border-red-200">
                    <X className="w-4 h-4 mr-2" />
                    <span className="hidden md:inline">Clear</span>
                    <span className="md:hidden">Clear All</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Active filters display */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-primary/10">
                <span className="text-sm font-medium text-muted-foreground flex items-center">
                  <Filter className="w-4 h-4 mr-2" />
                  Active filters:
                </span>
                {searchQuery && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    Search: "{searchQuery}"
                  </Badge>
                )}
                {selectedType !== "all" && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary capitalize">
                    Type: {selectedType}
                  </Badge>
                )}
                {selectedYear !== "all" && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    Year: {selectedYear}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Results header */}
        <div className="mb-6 flex items-center justify-between animate-in fade-in-0 slide-in-from-top-4" style={{ animationDelay: "300ms" }}>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {totalCount === 0 ? `All Materials (0)` : `${totalCount.toLocaleString()} materials`}
            </h2>
            <p className="text-sm text-muted-foreground">
              Showing {totalCount === 0 ? 0 : startIndex + 1} to {showingTo}
            </p>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-4 w-20 bg-muted rounded mb-4" />
                <div className="h-6 bg-muted rounded mb-3" />
                <div className="h-4 bg-muted rounded mb-3 w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <Card className="p-8 text-center max-w-md">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Error Loading Materials</h2>
              <p className="text-muted-foreground">{error}</p>
            </Card>
          </div>
        ) : materials.length === 0 ? (
          <Card className="p-12 text-center bg-gradient-to-r from-background to-primary/5 border-primary/20">
            <div className="w-16 h-16 bg-gradient-to-r from-primary/20 to-research-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No materials found</h3>
            <p className="text-muted-foreground mb-6">Try adjusting your search terms or filters to find what you're looking for.</p>
            {hasActiveFilters && (
              <Button onClick={clearFilters} className="bg-gradient-to-r from-primary to-research-green text-white">
                <X className="w-4 h-4 mr-2" />
                Clear all filters
              </Button>
            )}
          </Card>
        ) : (
          <>
            {/* Materials Grid/List:
                - Desktop uses original grid/list markup (md:block)
                - Mobile uses distinct render (mobile-grid vs mobile-list)
            */}
            <div className="mb-8 animate-in fade-in-0 slide-in-from-bottom-4" style={{ animationDelay: "400ms" }}>
              {/* MOBILE: distinct grid vs list */}
              <div className={`block md:hidden ${viewMode === "grid" ? "grid grid-cols-2 gap-3" : "space-y-2"}`}>
                {materials.map((material) => (
                  <article
                    key={material.id + "-mobile"}
                    onClick={() => handleMaterialClick(material.ark_url)}
                    className={`cursor-pointer transform transition-all duration-200 ${
                      viewMode === "grid"
                        ? "p-3 rounded-lg bg-gradient-to-r from-background to-primary/5 hover:shadow-lg"
                        : "p-2 flex items-center gap-3 bg-white/0 border border-primary/5 rounded-md hover:bg-primary/5"
                    }`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter") handleMaterialClick(material.ark_url); }}
                  >
                    {viewMode === "grid" ? (
                      // mobile grid tile
                      <>
                        <div className="flex items-start justify-between mb-2">
                          <Badge className="capitalize border-primary/30 text-primary bg-gradient-to-r from-primary/10 to-research-green/10 px-2 py-0.5 text-xs font-semibold rounded-full">
                            {material.item_type || "document"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{material.date ? new Date(material.date).getFullYear() : "N/A"}</span>
                        </div>

                        <h3 className="font-semibold text-sm leading-snug mb-1 line-clamp-2">{material.title || "Untitled"}</h3>

                        <div className="text-xs text-muted-foreground mb-1 line-clamp-2">{material.creator || "Unknown Author"}</div>

                        <p className="text-xs text-muted-foreground line-clamp-3">{material.description || ""}</p>
                      </>
                    ) : (
                      // mobile compact list row
                      <>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary/20 to-research-green/20 flex items-center justify-center shrink-0">
                          <div className="w-2 h-2 bg-primary rounded-full" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-sm line-clamp-1">{material.title || "Untitled"}</h3>
                            <span className="text-[11px] text-muted-foreground">{material.date ? new Date(material.date).getFullYear() : "N/A"}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">{material.creator || "Unknown Author"}</div>
                        </div>

                        <div className="ml-2 text-primary">
                          <ExternalLink className="w-4 h-4" />
                        </div>
                      </>
                    )}
                  </article>
                ))}
              </div>

              {/* DESKTOP: original grid/list layout preserved */}
              <div className={`${viewMode === "grid" ? "hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6" : "hidden md:block space-y-4"}`}>
                {materials.map((material, index) => (
                  <Card
                    key={material.id}
                    className={`hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 border-0 bg-gradient-to-r from-background to-primary/5 hover:to-primary/10 ${viewMode === "list" ? "p-4 flex items-center gap-6" : "p-6"}`}
                    onClick={() => handleMaterialClick(material.ark_url)}
                    style={{ animationDelay: `${500 + index * 50}ms` }}
                  >
                    {viewMode === "grid" ? (
                      <>
                        <div className="flex items-start justify-between mb-4">
                          <Badge variant="outline" className="capitalize border-primary/30 text-primary bg-gradient-to-r from-primary/10 to-research-green/10 px-3 py-1 font-semibold">
                            {material.item_type || "document"}
                          </Badge>
                          <span className="text-sm text-muted-foreground font-medium">
                            {material.date ? new Date(material.date).getFullYear() : "N/A"}
                          </span>
                        </div>

                        <h3 className="font-bold text-foreground mb-3 line-clamp-2 text-lg leading-tight">{material.title || "Untitled"}</h3>

                        <div className="flex items-center gap-2 mb-3">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground font-medium">{material.creator || "Unknown Author"}</span>
                        </div>

                        {material.date && (
                          <div className="flex items-center gap-2 mb-3">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {new Date(material.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                            </span>
                          </div>
                        )}

                        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed mb-4">{material.description || "No description available"}</p>

                        <div className="flex items-center justify-end mt-auto">
                          <ExternalLink className="w-4 h-4 text-primary" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant="outline" className="capitalize border-primary/30 text-primary bg-gradient-to-r from-primary/10 to-research-green/10 font-semibold">
                              {material.item_type || "document"}
                            </Badge>
                            <span className="text-sm text-muted-foreground font-medium">
                              {material.date ? new Date(material.date).getFullYear() : "N/A"}
                            </span>
                          </div>

                          <h3 className="font-bold text-foreground mb-2 text-lg line-clamp-1">{material.title || "Untitled"}</h3>

                          <div className="flex items-center gap-4 mb-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span className="font-medium">{material.creator || "Unknown Author"}</span>
                            </div>
                            {material.date && (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span>
                                  {new Date(material.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                                </span>
                              </div>
                            )}
                          </div>

                          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{material.description || "No description available"}</p>
                        </div>

                        <ExternalLink className="w-5 h-5 text-primary flex-shrink-0 ml-4" />
                      </>
                    )}
                  </Card>
                ))}
              </div>
            </div>

            {/* Pagination */}
            {totalCount > ITEMS_PER_PAGE && (
              <Card className="p-4 sm:p-6 bg-gradient-to-r from-background to-primary/5 border-primary/20 animate-in fade-in-0 slide-in-from-bottom-4" style={{ animationDelay: "600ms" }}>
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-muted-foreground font-medium text-center md:text-left">
                    Showing <span className="font-bold text-primary">{startIndex + 1}</span> to <span className="font-bold text-primary">{showingTo}</span> of <span className="font-bold text-primary">{totalCount.toLocaleString()}</span> materials
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="border-primary/20 hover:bg-primary/10">
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden md:inline">Previous</span>
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, Math.ceil(totalCount / ITEMS_PER_PAGE)) }, (_, i) => {
                        const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
                        let pageNum;
                        if (totalPages <= 5) pageNum = i + 1;
                        else if (currentPage <= 3) pageNum = i + 1;
                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                        else pageNum = currentPage - 2 + i;

                        if (pageNum < 1 || pageNum > totalPages) return null;

                        return (
                          <Button key={pageNum} variant={pageNum === currentPage ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(pageNum)} className={pageNum === currentPage ? "bg-gradient-to-r from-primary to-research-green text-white" : "border-primary/20 hover:bg-primary/10"}>
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(Math.ceil(totalCount / ITEMS_PER_PAGE), p + 1))} disabled={startIndex + ITEMS_PER_PAGE >= totalCount} className="border-primary/20 hover:bg-primary/10">
                      <span className="hidden md:inline">Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Browse;
