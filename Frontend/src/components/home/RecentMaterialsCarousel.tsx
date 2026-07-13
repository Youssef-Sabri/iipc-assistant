import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IIPCData } from "@/lib/supabase";
import { formatMaterialDate } from "@/lib/date-utils";

interface RecentMaterialsCarouselProps {
  allMaterials: IIPCData[];
  handleMaterialClick: (arkUrl: string) => void;
}

export function RecentMaterialsCarousel({
  allMaterials,
  handleMaterialClick,
}: RecentMaterialsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedMaterials, setDisplayedMaterials] = useState<IIPCData[]>([]);

  // Carousel animation effect
  useEffect(() => {
    if (!allMaterials || allMaterials.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 3) % allMaterials.length;
        return nextIndex;
      });
    }, 8000); // Switch every 8 seconds

    return () => clearInterval(interval);
  }, [allMaterials]);

  // Update displayed materials based on current index with wrap-around
  useEffect(() => {
    if (!allMaterials || allMaterials.length === 0) return;
    const total = allMaterials.length;
    const startIndex = currentIndex;
    const newDisplayed: IIPCData[] = [];
    const itemsToRender = Math.min(3, total);
    for (let i = 0; i < itemsToRender; i++) {
      newDisplayed.push(allMaterials[(startIndex + i) % total]);
    }
    setDisplayedMaterials(newDisplayed);
  }, [currentIndex, allMaterials]);

  if (displayedMaterials.length === 0) {
    return <div className="text-center text-muted-foreground py-8">No materials available</div>;
  }

  return (
    <div className="space-y-4">
      {displayedMaterials.map((material, idx) => (
        <Card
          key={`${material.id}-${currentIndex}-${idx}`}
          className="p-4 sm:p-6 hover:shadow-lg transition-all duration-500 cursor-pointer transform hover:scale-105 animate-in fade-in-0 slide-in-from-bottom-4 border-0 bg-gradient-to-r from-background to-primary/5 rounded-xl"
          style={{
            animationDelay: `${idx * 200}ms`,
            animationDuration: "700ms",
          }}
          onClick={() => handleMaterialClick(material.ark_url)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleMaterialClick(material.ark_url);
            }
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <Badge
              variant="outline"
              className="capitalize border-primary/30 text-primary bg-gradient-to-r from-primary/10 to-research-green/10 px-3 py-1 text-sm font-semibold rounded-full"
            >
              {material.item_type || "document"}
            </Badge>
            <span className="text-sm text-muted-foreground font-medium">
              {formatMaterialDate(material.date, "year")}
            </span>
          </div>

          <h3 className="font-bold text-foreground mb-3 line-clamp-2 text-base sm:text-lg">
            {material.title || "Untitled"}
          </h3>

          <p className="text-sm text-muted-foreground mb-4 font-medium">
            by {material.creator || "Unknown Author"}
          </p>

          <div className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
            {material.description || "No description available"}
          </div>
        </Card>
      ))}
    </div>
  );
}
