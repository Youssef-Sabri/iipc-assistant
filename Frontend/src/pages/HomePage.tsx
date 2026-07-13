import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Archive,
  Search,
  ArrowRight,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import iipcLogo from "@/assets/iipc-logo.svg";
import { useItemTypes } from "@/hooks/use-iipc-data";

export default function HomePage() {
  const { itemTypes, loading: itemTypesLoading, error: itemTypesError } = useItemTypes();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 overflow-x-hidden">
      {/* Hero Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <div className="flex flex-col sm:flex-row items-center justify-center mb-8 animate-in fade-in-0 slide-in-from-bottom-4 gap-6 sm:gap-12">
            <div className="relative flex-shrink-0">
              <img
                src={iipcLogo}
                alt="IIPC Logo"
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-lg relative z-10"
              />
              <div className="absolute -inset-2 bg-gradient-to-r from-primary/30 to-research-green/30 rounded-full blur-xl -z-10"></div>
            </div>

            {/* Centered title and subtitle */}
            <div className="text-center max-w-xl">
              <h1 className="text-3xl sm:text-5xl font-bold mb-3 bg-gradient-to-r from-primary to-research-green bg-clip-text text-transparent mx-auto">
                IIPC Assistant
              </h1>
              <p className="text-base sm:text-xl text-muted-foreground font-semibold">
                AI-Powered Web Archiving Research
              </p>
            </div>
          </div>

          <p className="text-base sm:text-lg text-muted-foreground max-w-4xl mx-auto mb-10 leading-relaxed">
            Explore conference materials, research papers, and presentations from the{" "}
            International Internet Preservation Consortium. Get instant answers about web archiving
            practices, technical standards, and digital preservation.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12 px-4 sm:px-0">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-primary to-research-green text-white border-0 px-8 py-3 text-lg font-semibold"
            >
              <Link to="/chat" className="flex items-center justify-center">
                <MessageCircle className="w-5 h-5 mr-3" />
                Start Asking Questions
              </Link>
            </Button>

            <Button
              variant="outline"
              size="lg"
              asChild
              className="w-full sm:w-auto border-2 border-primary/30 text-primary hover:bg-gradient-to-r hover:from-primary/10 hover:to-research-green/10 hover:border-primary transition-all duration-300 transform hover:scale-105 px-8 py-3 text-lg font-semibold"
            >
              <Link to="/browse" className="flex items-center justify-center">
                <Archive className="w-5 h-5 mr-3" />
                Browse Materials
              </Link>
            </Button>
          </div>
        </div>

        {/* Available Item Types */}
        <div className="mb-20 px-4 sm:px-0 max-w-5xl mx-auto">
          <div className="animate-in fade-in-0 slide-in-from-bottom-4" style={{ animationDelay: "800ms" }}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Available Item Types</h2>
              <Button
                variant="ghost"
                asChild
                className="hover:bg-gradient-to-r hover:from-primary/10 hover:to-research-green/10 transition-colors text-primary"
              >
                <Link to="/browse" className="flex items-center font-semibold">
                  View All <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {itemTypesLoading ? (
                // Loading skeleton
                Array.from({ length: 6 }).map((_, index) => (
                  <Card
                    key={index}
                    className="p-6 border-0 bg-gradient-to-r from-background to-muted/20 rounded-xl"
                  >
                    <div className="h-6 bg-muted animate-pulse rounded mb-3" />
                    <div className="h-8 bg-muted animate-pulse rounded" />
                  </Card>
                ))
              ) : itemTypesError ? (
                <div className="col-span-full text-center text-muted-foreground p-8">
                  <div className="text-lg font-medium">Error loading item types</div>
                  <div className="text-sm text-muted-foreground mt-2">{itemTypesError}</div>
                </div>
              ) : itemTypes.length === 0 ? (
                <div className="col-span-full text-center text-muted-foreground p-8">
                  <div className="text-lg font-medium">No item types available</div>
                </div>
              ) : (
                itemTypes.slice(0, 6).map((itemType, index) => (
                  <Card
                    key={itemType.type}
                    className="p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer border-0 bg-gradient-to-r from-background to-primary/5 rounded-xl"
                    style={{ animationDelay: `${1000 + index * 100}ms` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-foreground capitalize text-lg">
                        {itemType.type.replace("image_presentation", "presentation").replace("_", " ")}
                      </h3>
                      <div className="w-8 h-8 bg-gradient-to-r from-primary/20 to-research-green/20 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-primary mb-2">{itemType.count.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground font-medium">items available</div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <Card
          className="p-8 sm:p-12 text-center bg-gradient-to-r from-primary/10 to-research-green/10 border-primary/30 animate-in fade-in-0 slide-in-from-bottom-4 rounded-2xl max-w-4xl mx-auto"
          style={{ animationDelay: "1200ms" }}
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r from-primary/20 to-research-green/20 flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-lg">
            <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 sm:mb-6">
            Ready to Explore IIPC Assistant?
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 leading-relaxed max-w-xl mx-auto">
            Whether you're researching web archiving methodologies, looking for technical
            solutions, or exploring policy frameworks, our AI assistant can help you find
            relevant materials from years of IIPC conferences and research.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-md mx-auto">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-primary to-research-green text-white border-0 px-10 py-4 text-lg font-semibold"
            >
              <Link to="/chat" className="flex items-center justify-center">
                <Search className="w-6 h-6 mr-3" />
                Ask Your First Question
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-primary to-research-green text-white border-0 px-10 py-4 text-lg font-semibold"
            >
              <a
                href="https://netpreserve.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center"
              >
                <ExternalLink className="w-6 h-6 mr-3" />
                Visit IIPC Website
              </a>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
