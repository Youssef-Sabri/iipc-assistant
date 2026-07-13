import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Globe,
  Users,
  BookOpen,
  Target,
  Calendar,
  ExternalLink,
  Archive,
  Building,
  Network,
  Trophy,
  Mail
} from "lucide-react";
import iipcLogo from "@/assets/iipc-logo.svg";

export default function AboutPage() {
  const objectives = [
    {
      icon: Target,
      title: "Best Practices Development",
      description: "Identify and develop best practices for selecting, harvesting, collecting, preserving and providing access to Internet content."
    },
    {
      icon: Globe,
      title: "International Coverage",
      description: "Foster broad international coverage in web archive content through outreach and building curated collaborative collections."
    },
    {
      icon: BookOpen,
      title: "International Advocacy",
      description: "Develop international advocacy for initiatives and legislation that encourage the collection and preservation of Internet content."
    },
    {
      icon: Archive,
      title: "Research Facilitation",
      description: "Encourage and facilitate research use of archived Internet content for academic and scholarly purposes."
    }
  ];

  const workingAreas = [
    {
      icon: Network,
      title: "Tools Development",
      description: "Develop and sustain software and tools for web archiving, ensuring accessibility and effectiveness across institutions."
    },
    {
      icon: Users,
      title: "Member Engagement",
      description: "Foster collaboration and knowledge sharing among member institutions through working groups and joint initiatives."
    },
    {
      icon: Building,
      title: "Partnerships & Outreach",
      description: "Build strategic partnerships and expand outreach to promote web archiving globally and engage new communities."
    },
    {
      icon: BookOpen,
      title: "Training & Education",
      description: "Provide comprehensive training materials, workshops, and educational resources for web archiving professionals."
    }
  ];

  const keyFacts = [
    { label: "Founded", value: "July 2003", icon: Calendar },
    { label: "Members", value: "35+ Countries", icon: Globe },
    { label: "Institution Types", value: "Libraries, Archives, Museums", icon: Building },
    { label: "Charter Members", value: "12 Founding Institutions", icon: Trophy }
  ];

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-gradient-to-br from-background via-background to-primary/5 overflow-x-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Hero Section */}
        <div className="text-center mb-20 animate-in fade-in-0 slide-in-from-bottom-4">
          <div className="flex flex-col sm:flex-row items-center justify-center mb-8 gap-6 sm:gap-12">
            <div className="relative flex-shrink-0">
              <img
                src={iipcLogo}
                alt="IIPC Logo"
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-lg"
              />
              <div className="absolute -inset-3 bg-gradient-to-r from-primary/30 to-research-green/30 rounded-full blur-xl"></div>
            </div>
            <div className="text-center sm:text-left max-w-2xl">
              <h1 className="text-4xl sm:text-6xl font-bold mb-4 bg-gradient-to-r from-primary to-research-green bg-clip-text text-transparent">
                About IIPC
              </h1>
              <p className="text-xl sm:text-2xl text-muted-foreground font-semibold">
                International Internet Preservation Consortium
              </p>
            </div>
          </div>
          
          <p className="text-lg sm:text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            The mission of the IIPC is to acquire, preserve and make accessible knowledge and information from the Internet for future generations everywhere, promoting global exchange and international relations.
          </p>
        </div>

        {/* Key Facts */}
        <div className="mb-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {keyFacts.map((fact, index) => {
              const IconComponent = fact.icon;
              return (
                <Card
                  key={fact.label}
                  className="p-6 text-center bg-gradient-to-r from-background to-primary/5 border-primary/20 hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-in fade-in-0 slide-in-from-bottom-4"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-12 h-12 bg-gradient-to-r from-primary/20 to-research-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <IconComponent className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-primary mb-2">{fact.value}</div>
                  <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{fact.label}</div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* History Section */}
        <div className="mb-20 animate-in fade-in-0 slide-in-from-left-4" style={{ animationDelay: "400ms" }}>
          <Card className="p-8 sm:p-12 bg-gradient-to-r from-primary/5 to-research-green/5 border-primary/20">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-primary/20 to-research-green/20 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-foreground">Our History</h2>
            </div>
            
            <div className="space-y-6 text-lg leading-relaxed">
              <p className="text-muted-foreground">
                In July 2003, the IIPC was formally chartered at the National Library of France with 12 participating institutions. The members agreed jointly to fund and participate in projects and working groups to accomplish the goals of the IIPC.
              </p>
              
              <p className="text-muted-foreground">
                The initial agreement was in effect for three years, and membership was limited to charter institutions. The IIPC is now open to libraries, archives, museums and cultural heritage institutions everywhere and welcomes inquiries for membership.
              </p>
              
              <div className="bg-gradient-to-r from-primary/10 to-research-green/10 p-6 rounded-xl border border-primary/20">
                <p className="text-foreground font-semibold">
                  Today, IIPC Members are organizations from over 35 countries, including national, university and regional libraries and archives.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Mission & Objectives */}
        <div className="mb-20">
          <div className="text-center mb-12 animate-in fade-in-0 slide-in-from-top-4" style={{ animationDelay: "600ms" }}>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Mission & Objectives</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              The Consortium works to preserve the digital heritage of our time through collaborative efforts and innovative approaches.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {objectives.map((objective, index) => {
              const IconComponent = objective.icon;
              return (
                <Card
                  key={objective.title}
                  className="p-8 bg-gradient-to-r from-background to-primary/5 border-primary/20 hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-in fade-in-0 slide-in-from-bottom-4"
                  style={{ animationDelay: `${800 + index * 100}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-primary/20 to-research-green/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <IconComponent className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-3">{objective.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{objective.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Working Areas */}
        <div className="mb-20">
          <div className="text-center mb-12 animate-in fade-in-0 slide-in-from-top-4" style={{ animationDelay: "1000ms" }}>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Key Working Areas</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Members participate in working groups that focus on different aspects of web archiving, including content development, preservation of web archives, training, and research.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {workingAreas.map((area, index) => {
              const IconComponent = area.icon;
              return (
                <Card
                  key={area.title}
                  className="p-8 bg-gradient-to-r from-background to-primary/5 border-primary/20 hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-in fade-in-0 slide-in-from-left-4"
                  style={{ animationDelay: `${1200 + index * 100}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-primary/20 to-research-green/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <IconComponent className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-3">{area.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{area.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Leadership & Organization */}
        <div className="mb-20 animate-in fade-in-0 slide-in-from-right-4" style={{ animationDelay: "1400ms" }}>
          <Card className="p-8 sm:p-12 bg-gradient-to-r from-primary/5 to-research-green/5 border-primary/20">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-primary/20 to-research-green/20 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-foreground">Leadership & Organization</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold text-foreground mb-4">Governance Structure</h3>
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    The IIPC is led by an elected Steering Committee and the Executive Board. The latter comprises Consortium Chair, Vice-Chair, Treasurer and Senior Staff, and may also include up to two additional Steering Committee members.
                  </p>
                  <p>
                    The Portfolio Leads direct, oversee and report to the Steering Committee on work undertaken in their specific portfolios: Tools Development, Member Engagement, and Partnerships and Outreach.
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-foreground mb-4">Administrative Support</h3>
                <div className="bg-gradient-to-r from-primary/10 to-research-green/10 p-6 rounded-xl border border-primary/20">
                  <p className="text-foreground font-semibold">
                    The Council on Library and Information Resources (CLIR) is the IIPC's Financial and Administrative Host.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Engagement & Community */}
        <div className="mb-20">
          <div className="text-center mb-12 animate-in fade-in-0 slide-in-from-top-4" style={{ animationDelay: "1600ms" }}>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Engage with IIPC</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Join our global community of web archiving professionals and researchers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-8 text-center bg-gradient-to-r from-background to-primary/5 border-primary/20 hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-in fade-in-0 slide-in-from-bottom-4" style={{ animationDelay: "1800ms" }}>
              <div className="w-16 h-16 bg-gradient-to-r from-primary/20 to-research-green/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Building className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">Membership</h3>
              <p className="text-muted-foreground mb-6">
                The IIPC accepts membership applications throughout the year from libraries, archives, museums and cultural heritage institutions.
              </p>
              <Button
                asChild
                className="bg-gradient-to-r from-primary to-research-green text-white hover:shadow-lg transition-all duration-300"
              >
                <a
                  href="https://netpreserve.org/join-iipc/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Join IIPC
                </a>
              </Button>
            </Card>

            <Card className="p-8 text-center bg-gradient-to-r from-background to-primary/5 border-primary/20 hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-in fade-in-0 slide-in-from-bottom-4" style={{ animationDelay: "1900ms" }}>
              <div className="w-16 h-16 bg-gradient-to-r from-primary/20 to-research-green/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">Mailing List</h3>
              <p className="text-muted-foreground mb-6">
                Non-members can engage with IIPC on web archiving topics via the open mailing list.
              </p>
              <Button
                asChild
                className="bg-gradient-to-r from-primary to-research-green text-white hover:shadow-lg transition-all duration-300"
              >
                <a
                  href="https://netpreserve.org/about/mailing-list/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Subscribe
                </a>
              </Button>
            </Card>

            <Card className="p-8 text-center bg-gradient-to-r from-background to-primary/5 border-primary/20 hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-in fade-in-0 slide-in-from-bottom-4" style={{ animationDelay: "2000ms" }}>
              <div className="w-16 h-16 bg-gradient-to-r from-primary/20 to-research-green/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">Steering Committee</h3>
              <p className="text-muted-foreground mb-6">
                View the list of member institutions represented in the IIPC governance.
              </p>
              <Button
                asChild
                className="bg-gradient-to-r from-primary to-research-green text-white hover:shadow-lg transition-all duration-300"
              >
                <a
                  href="https://netpreserve.org/about/steering-committee/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Committee
                </a>
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
