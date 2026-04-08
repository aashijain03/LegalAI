import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronDown,
  Download,
  ArrowLeft,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";

type RiskLevel = "low" | "medium" | "high";

type Finding = {
  id: string;
  title: string;
  description: string;
  riskLevel: RiskLevel;
  section: string;
};

const DEFAULT_MOCK_ANALYSIS = {
  documentName: "Service Agreement Contract.pdf",
  documentType: "Service Agreement",
  analyzedDate: "April 5, 2026",
  overallRisk: "medium" as RiskLevel,
  summary:
    "This service agreement contains standard terms with some areas requiring attention. The contract structure is generally sound, but several clauses warrant review before signing.",
  keyFindings: [
    {
      id: "1",
      title: "Unlimited Liability Clause",
      description:
        "The agreement contains an unlimited liability provision in Section 7.2 that could expose you to significant financial risk. Consider negotiating a liability cap.",
      riskLevel: "high" as RiskLevel,
      section: "Section 7.2",
    },
    {
      id: "2",
      title: "Automatic Renewal Terms",
      description:
        "The contract automatically renews annually unless cancelled 60 days prior to renewal date. This is a longer notice period than standard (typically 30 days).",
      riskLevel: "medium" as RiskLevel,
      section: "Section 3.1",
    },
    {
      id: "3",
      title: "Intellectual Property Rights",
      description:
        "IP ownership terms are clearly defined with appropriate protections for work created during the contract period. This is favorable.",
      riskLevel: "low" as RiskLevel,
      section: "Section 9.3",
    },
    {
      id: "4",
      title: "Termination Clause Missing",
      description:
        "No clear termination for convenience clause. Recommend adding mutual termination rights with appropriate notice period.",
      riskLevel: "medium" as RiskLevel,
      section: "Section 4",
    },
    {
      id: "5",
      title: "Confidentiality Provisions",
      description:
        "Standard confidentiality clauses are present with reasonable scope and duration. No concerns identified.",
      riskLevel: "low" as RiskLevel,
      section: "Section 8",
    },
  ],
  recommendations: [
    "Request a liability cap to limit financial exposure",
    "Negotiate a shorter termination notice period (30 days)",
    "Add a mutual termination for convenience clause",
    "Consider adding a dispute resolution process",
    "Have this reviewed by a contract attorney before signing",
  ],
};

export function DocumentAnalysis() {
  const [expandedFindings, setExpandedFindings] = useState<string[]>(["1"]);
  const [analysisData, setAnalysisData] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem("analysisResult");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAnalysisData({
          documentName: parsed.documentName || "Analyzed Document",
          documentType: "Legal Document",
          analyzedDate: parsed.analyzedDate || new Date().toLocaleDateString(),
          overallRisk: parsed.overallRisk || "low",
          summary: parsed.summary || "",
          keyFindings: parsed.keyFindings || [],
          recommendations: parsed.recommendations || []
        });
      } catch (e) {
        setAnalysisData(DEFAULT_MOCK_ANALYSIS);
      }
    } else {
      setAnalysisData(DEFAULT_MOCK_ANALYSIS);
    }
  }, []);

  const toggleFinding = (id: string) => {
    setExpandedFindings((prev) =>
      prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id]
    );
  };

  const getRiskBadge = (level: RiskLevel) => {
    const config = {
      low: { label: "Low Risk", className: "bg-green-100 text-green-800" },
      medium: { label: "Medium Risk", className: "bg-amber-100 text-amber-800" },
      high: { label: "High Risk", className: "bg-red-100 text-red-800" },
    };
    return config[level] || config.low;
  };

  const getRiskIcon = (level: RiskLevel) => {
    switch (level) {
      case "high":
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case "medium":
        return <Info className="w-5 h-5 text-amber-600" />;
      default:
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    }
  };

  if (!analysisData) {
    return <div className="min-h-[calc(100vh-8rem)] py-12 flex justify-center items-center">Loading...</div>;
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/scan">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Scan
            </Link>
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900 mb-2">
                Document Analysis
              </h1>
              <p className="text-slate-600">
                AI-powered analysis completed on {analysisData.analyzedDate}
              </p>
            </div>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Document Info */}
        <Card className="p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-slate-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 mb-1">
                {analysisData.documentName}
              </h3>
              <p className="text-sm text-slate-600 mb-3">
                Document Type: {analysisData.documentType}
              </p>
              <Badge className={getRiskBadge(analysisData.overallRisk).className}>
                Overall: {getRiskBadge(analysisData.overallRisk).label}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Summary */}
        <Card className="p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-3">Executive Summary</h2>
          <p className="text-slate-700">{analysisData.summary}</p>
        </Card>

        {/* Key Findings */}
        <Card className="p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">
            Key Findings ({analysisData.keyFindings?.length || 0})
          </h2>
          <div className="space-y-3">
            {analysisData.keyFindings?.map((finding: any, index: number) => {
              const isExpanded = expandedFindings.includes(finding.id);
              const riskBadge = getRiskBadge(finding.riskLevel);

              return (
                <div key={finding.id || index}>
                  {index > 0 && <Separator className="my-3" />}
                  <div
                    className="cursor-pointer"
                    onClick={() => toggleFinding(finding.id)}
                  >
                    <div className="flex items-start gap-3">
                      {getRiskIcon(finding.riskLevel)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-slate-900">
                            {finding.title}
                          </h3>
                          <ChevronDown
                            className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""
                              }`}
                          />
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {finding.section}
                          </Badge>
                          <Badge className={`${riskBadge.className} text-xs`}>
                            {riskBadge.label}
                          </Badge>
                        </div>
                        {isExpanded && (
                          <p className="text-sm text-slate-700 mt-3">
                            {finding.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Recommendations */}
        <Card className="p-6">
          <h2 className="font-semibold text-slate-900 mb-4">
            Recommendations
          </h2>
          <ul className="space-y-3">
            {analysisData.recommendations?.map((rec: string, index: number) => (
              <li key={index} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">{rec}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* CTA */}
        <Card className="p-6 mt-6 bg-slate-900 text-white">
          <h3 className="font-semibold mb-2">Need Professional Review?</h3>
          <p className="text-slate-300 mb-4">
            This analysis provides general guidance. For personalized legal advice,
            consult with a licensed attorney.
          </p>
          <Button variant="secondary">
            Find a Legal Professional
          </Button>
        </Card>
      </div>
    </div>
  );
}
