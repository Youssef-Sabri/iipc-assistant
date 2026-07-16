import { useEffect, useCallback, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IIPCData, supabase } from "@/lib/supabase";
import { formatMaterialDate } from "@/lib/date-utils";
import { formatItemType, openExternalLink } from "@/lib/utils";
import {
  Search,
  Calendar,
  User,
  ExternalLink,
  Archive,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { useItemTypes } from "@/hooks/use-iipc-data";
import { ViewMode, ViewModeToggle } from "@/components/browse/ViewModeToggle";

type SortField = "title" | "date" | "creator" | "item_type";
type SortOrder = "asc" | "desc";

const ITEMS_PER_PAGE = 12;

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

export default function BrowsePage() {
  const [materials, setMaterials] = useState<IIPCData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { itemTypes } = useItemTypes();
  const requestIdRef = useRef(0);

  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedType, setSelectedType] = useState<string>(searchParams.get("type") || "all");
  const [selectedYear, setSelectedYear] = useState<string>(searchParams.get("year") || "all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const fetchPage = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from("iipc_data")
        .select("id,title,description,creator,item_type,date,ark_url,created_at", { count: "exact" });

      const q = searchQuery.trim().replace(/,/g, " ");
      if (q) {
        const escaped = q.replace(/%/g, "\\%").replace(/_/g, "\\_");
        query = query.or(
          `title.ilike.%${escaped}%,creator.ilike.%${escaped}%,description.ilike.%${escaped}%`
        );
      }

      if (selectedType && selectedType !== "all") {
        query = query.eq("item_type", selectedType);
      }

      if (selectedYear && selectedYear !== "all") {
        const year = Number(selectedYear);
        if (!Number.isNaN(year)) {
          query = query.gte("date", `${year}-01-01`).lte("date", `${year}-12-31`);
        }
      }

      const sortColumn = sortField === "date" ? "date" : sortField;
      query = query.order(sortColumn, { ascending: sortOrder === "asc" });
      query = query.range(start, end);

      const res = await query;
      if (currentRequestId !== requestIdRef.current) return;

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
      if (currentRequestId !== requestIdRef.current) return;
      console.error("Fetch page error", err);
      setError(err instanceof Error ? err.message : String(err));
      setMaterials([]);
      setTotalCount(0);
    } finally {
      if (currentRequestId === requestIdRef.current) setLoading(false);
    }
  }, [currentPage, searchQuery, selectedType, selectedYear, sortField, sortOrder]);

  useEffect(() => { fetchPage(); }, [fetchPage]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("iipc_data")
          .select("date", { count: undefined })
          .not("date", "is", null);
        if (error || !mounted) return;
        const yearsSet = new Set<number>();
        (data || []).forEach((r: { date: string }) => {
          try {
            const d = new Date(r.date);
            if (!isNaN(d.getTime())) {
              const y = d.getFullYear();
              if (y >= 1900 && y <= new Date().getFullYear() + 5) yearsSet.add(y);
            }
          } catch { /* ignore */ }
        });
        setAvailableYears(Array.from(yearsSet).sort((a, b) => b - a));
      } catch (err) {
        console.warn("Failed to load years", err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const clearFilters = () => {
    setSearchInput("");
    setSearchQuery("");
    setSelectedType("all");
    setSelectedYear("all");
    setSortField("date");
    setSortOrder("desc");
    setCurrentPage(1);
  };

  const hasActiveFilters = !!(searchQuery || selectedType !== "all" || selectedYear !== "all");
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const showingTo = Math.min(startIndex + ITEMS_PER_PAGE, totalCount);

  const onSortChange = (value: string) => {
    const [field, order] = value.split("-") as [SortField, SortOrder];
    setSortField(field);
    setSortOrder(order);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-gradient-to-br from-background via-background to-primary/5 overflow-x-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 animate-in fade-in-0 slide-in-from-top-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-primary/20 to-research-green/20 rounded-full flex items-center justify-center">
              <Archive className="w-6 h-6 text-primary" />
            </div>
            <div>
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
        <Card className="p-4 sm:p-6 mb-8 bg-gradient-to-r from-background to-primary/5 border-primary/20">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by title, author, or description..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-12 h-12 text-base sm:text-lg border-primary/20 focus:border-primary/50"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-8 flex flex-col gap-4 md:flex-row md:items-end md:gap-4">
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    <span className="md:hidden">Type</span>
                    <span className="hidden md:inline">Filter by Type</span>
                  </label>
                  <Select value={selectedType} onValueChange={(val) => { setSelectedType(val); setCurrentPage(1); }}>
                    <SelectTrigger className="border-primary/20 focus:border-primary/50 h-10 md:h-auto">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {itemTypes.map((t) => (
                        <SelectItem key={t.type} value={t.type}>
                          <span className="capitalize">{formatItemType(t.type)}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    <span className="md:hidden">Year</span>
                    <span className="hidden md:inline">Filter by Year</span>
                  </label>
                  <Select value={selectedYear} onValueChange={(val) => { setSelectedYear(val); setCurrentPage(1); }}>
                    <SelectTrigger className="border-primary/20 focus:border-primary/50 h-10 md:h-auto">
                      <SelectValue placeholder="All Years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {availableYears.map((year) => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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
                  <Button variant="outline" size="sm" onClick={clearFilters} className="text-muted-foreground hover:bg-destructive/5 hover:text-destructive border-destructive/20">
                    <X className="w-4 h-4 mr-2" />
                    <span className="hidden md:inline">Clear</span>
                    <span className="md:hidden">Clear All</span>
                  </Button>
                )}
              </div>
            </div>

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
                    Type: {formatItemType(selectedType)}
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
        <div className="mb-6 flex items-center justify-between">
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
        {loading && materials.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-4 w-20 mb-4" />
                <Skeleton className="h-6 mb-3" />
                <Skeleton className="h-4 mb-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <Card className="p-8 text-center max-w-md">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-destructive" />
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
            <div className={`mb-8 transition-opacity duration-200 ${loading ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
              <div className={viewMode === "grid" ? "grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6" : "space-y-3 md:space-y-4"}>
                {materials.map((material) => (
                  <Card
                    key={material.id}
                    role="button"
                    tabIndex={0}
                    className={`hover:shadow-xl hover:border-primary/20 border border-primary/10 transition-all duration-300 cursor-pointer transform hover:-translate-y-1 active:scale-95 bg-gradient-to-br from-background to-primary/5 hover:to-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      viewMode === "list"
                        ? "p-3 md:p-5 flex items-center gap-3 md:gap-6"
                        : "p-4 md:p-6 flex flex-col h-full"
                    }`}
                    onClick={() => openExternalLink(material.ark_url)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openExternalLink(material.ark_url);
                      }
                    }}
                  >
                    {viewMode === "grid" ? (
                      <>
                        <div className="flex items-start justify-between mb-2 md:mb-4">
                          <Badge variant="outline" className="capitalize border-primary/25 text-primary bg-gradient-to-r from-primary/10 to-research-green/10 px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-xs font-semibold rounded-full">
                            {formatItemType(material.item_type)}
                          </Badge>
                          <span className="text-[10px] md:text-sm text-muted-foreground font-medium">
                            {formatMaterialDate(material.date, 'year')}
                          </span>
                        </div>

                        <h3 className="font-bold text-foreground text-xs md:text-lg leading-snug mb-1 md:mb-3 line-clamp-2 hover:text-primary transition-colors">
                          {material.title || "Untitled"}
                        </h3>

                        <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2 text-muted-foreground/95">
                          <User className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                          <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider line-clamp-1">
                            {material.creator || "Unknown Author"}
                          </span>
                        </div>

                        {material.date && (
                          <div className="hidden md:flex items-center gap-2 mb-3 text-muted-foreground">
                            <Calendar className="w-4 h-4 shrink-0" />
                            <span className="text-sm">{formatMaterialDate(material.date, 'full')}</span>
                          </div>
                        )}

                        <p className="text-[11px] md:text-sm text-muted-foreground/80 md:text-muted-foreground/90 line-clamp-2 md:line-clamp-3 leading-relaxed mb-4 md:mb-6">
                          {material.description || "No description available"}
                        </p>

                        <div className="hidden md:flex items-center justify-between mt-auto pt-4 border-t border-primary/5">
                          <span className="text-xs text-primary font-bold tracking-wide flex items-center gap-1 group">
                            View Material
                            <ExternalLink className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex md:hidden w-8 h-8 rounded-full bg-gradient-to-r from-primary/20 to-research-green/20 items-center justify-center shrink-0">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1 md:mb-2">
                            <Badge variant="outline" className="capitalize border-primary/30 text-primary bg-gradient-to-r from-primary/10 to-research-green/10 px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-xs font-semibold">
                              {formatItemType(material.item_type)}
                            </Badge>
                            <span className="text-[10px] md:text-sm text-muted-foreground font-medium">
                              {formatMaterialDate(material.date, 'year')}
                            </span>
                          </div>

                          <h3 className="font-bold text-foreground text-sm md:text-lg mb-1 md:mb-2 line-clamp-1">
                            {material.title || "Untitled"}
                          </h3>

                          <div className="flex items-center gap-3 md:gap-4 mb-1 md:mb-2 text-[10px] md:text-sm text-muted-foreground">
                            <div className="flex items-center gap-1 md:gap-2">
                              <User className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                              <span className="font-semibold uppercase tracking-wider line-clamp-1">{material.creator || "Unknown Author"}</span>
                            </div>
                            {material.date && (
                              <div className="hidden md:flex items-center gap-1 md:gap-2">
                                <Calendar className="w-3.5 h-3.5 shrink-0" />
                                <span>{formatMaterialDate(material.date, 'short')}</span>
                              </div>
                            )}
                          </div>

                          <p className="text-[11px] md:text-sm text-muted-foreground line-clamp-1 md:line-clamp-2 leading-relaxed">
                            {material.description || "No description available"}
                          </p>
                        </div>

                        <ExternalLink className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0 ml-2 md:ml-4" />
                      </>
                    )}
                  </Card>
                ))}
              </div>
            </div>

            {totalCount > ITEMS_PER_PAGE && (
              <Card className="p-4 sm:p-6 bg-gradient-to-r from-background to-primary/5 border-primary/20">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-muted-foreground font-medium text-center md:text-left">
                    Showing <span className="font-bold text-primary">{startIndex + 1}</span> to <span className="font-bold text-primary">{showingTo}</span> of <span className="font-bold text-primary">{totalCount.toLocaleString()}</span> materials
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1 || loading} className="border-primary/20 hover:bg-primary/10">
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
                          <Button key={pageNum} variant={pageNum === currentPage ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(pageNum)} disabled={pageNum === currentPage || loading} className={pageNum === currentPage ? "bg-gradient-to-r from-primary to-research-green text-white" : "border-primary/20 hover:bg-primary/10"}>
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(Math.ceil(totalCount / ITEMS_PER_PAGE), p + 1))} disabled={startIndex + ITEMS_PER_PAGE >= totalCount || loading} className="border-primary/20 hover:bg-primary/10">
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
}
