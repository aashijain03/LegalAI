import { Link } from "react-router";
import { ScanText, MessageSquareText, Shield, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

export function Home() {
  const features = [
    {
      icon: ScanText,
      title: "Document Scanning",
      description: "Upload and scan legal documents for instant analysis and insights.",
      link: "/scan",
      buttonText: "Scan Document",
    },
    {
      icon: MessageSquareText,
      title: "Legal Advice",
      description: "Get AI-powered legal guidance and answers to your questions.",
      link: "/advice",
      buttonText: "Get Advice",
    },
  ];

  const benefits = [
    "AI-powered document analysis",
    "Real-time legal guidance",
    "Secure and confidential",
    "24/7 availability",
  ];

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-full mb-6">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-4xl font-bold mb-4">
              AI-Powered Legal Assistant
            </h1>
            <p className="text-xl text-slate-300 mb-8">
              Scan documents, analyze contracts, and receive instant legal guidance
              with our advanced AI technology.
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
                <Link to="/scan">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature) => (
            <Card key={feature.title} className="p-8 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 mb-4">{feature.description}</p>
                  <Button asChild variant="outline" className="w-full">
                    <Link to={feature.link}>{feature.buttonText}</Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold text-center text-slate-900 mb-8">
            Why Choose LegalAI
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-slate-700">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
