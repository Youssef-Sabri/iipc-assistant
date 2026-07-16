import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IIPCData } from "@/lib/supabase";
import { formatMaterialDate } from "@/lib/date-utils";
import { openExternalLink } from "@/lib/utils";
import { CAROUSEL_INTERVAL, CAROUSEL_PAGE_SIZE } from "@/lib/constants";

interface RecentMaterialsCarouselProps {
  allMaterials: IIPCData[];
}

export function RecentMaterialsCarousel({ allMaterials }: RecentMaterialsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedMaterials, setDisplayedMaterials] = useState<IIPCData[]>([]);

  useEffect(() => {
    if (!allMaterials || allMaterials.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + CAROUSEL_PAGE_SIZE) % allMaterials.length);
    }, CAROUSEL_INTERVAL);

    return () => clearInterval(interval);
  }, [allMaterials]);

  useEffect(() => {
    if (!allMaterials || allMaterials.length === 0) return;
    const total = allMaterials.length;
    const newDisplayed: IIPCData[] = [];
    const itemsToRender = Math.min(CAROUSEL_PAGE_SIZE, total);
    for (let i = 0; i < itemsToRender; i++) {
      newDisplayed.push(allMaterials[(currentIndex + i) % total]);
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
          className="p-4 sm:p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 active:scale-95 cursor-pointer border border-primary/10 hover:border-primary/20 bg-gradient-to-r from-background to-primary/5 rounded-xl"
          onClick={() => openExternalLink(material.ark_url)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openExternalLink(material.ark_url);
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
