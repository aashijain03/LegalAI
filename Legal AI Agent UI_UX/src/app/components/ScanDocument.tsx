import { useState } from "react";
import { useNavigate } from "react-router";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Progress } from "./ui/progress";

export function ScanDocument() {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanComplete, setScanComplete] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFile(files[0]);
      setScanComplete(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      setScanComplete(false);
    }
  };

  const handleScan = async () => {
    if (!selectedFile) return;

    setIsScanning(true);
    setScanProgress(0);

    // Simulate scanning progress slowly
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        return prev >= 90 ? 90 : prev + 10;
      });
    }, 500);

    const formData = new FormData();
    formData.append("document", selectedFile);

    try {
      const response = await fetch("https://legalai-backend-v4t2.onrender.com/scan", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      clearInterval(interval);
      setScanProgress(100);
      setScanComplete(true);

      localStorage.setItem("analysisResult", JSON.stringify({
        ...data.result,
        documentName: selectedFile.name,
        analyzedDate: new Date().toLocaleDateString("en-US", { month: 'long', day: 'numeric', year: 'numeric' })
      }));
    } catch (e: any) {
      console.error(e);
      clearInterval(interval);
      setIsScanning(false);
      alert(e.message || "Failed to scan document");
    }

  };

  const handleViewResults = () => {
    navigate("/analysis/1");
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">
            Scan Legal Document
          </h1>
          <p className="text-slate-600">
            Upload a document for AI-powered analysis and insights
          </p>
        </div>

        <Card className="p-8">
          {!selectedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${isDragging
                ? "border-slate-900 bg-slate-50"
                : "border-slate-300 hover:border-slate-400"
                }`}
            >
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Upload className="w-8 h-8 text-slate-600" />
                </div>
                <p className="text-slate-900 font-medium mb-2">
                  Drop your document here or click to browse
                </p>
                <p className="text-sm text-slate-500 mb-6">
                  Supports PDF, DOC, DOCX, Images (Max 10MB)
                </p>
                <label htmlFor="file-upload">
                  <Button asChild>
                    <span>Select File</span>
                  </Button>
                </label>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={handleFileSelect}
                />

              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
                <FileText className="w-10 h-10 text-slate-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                {!isScanning && !scanComplete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                  >
                    Remove
                  </Button>
                )}
              </div>

              {isScanning && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Scanning document...</span>
                    <span className="text-slate-900 font-medium">
                      {scanProgress}%
                    </span>
                  </div>
                  <Progress value={scanProgress} />
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing content and extracting key information</span>
                  </div>
                </div>
              )}

              {scanComplete && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">
                        Scan completed successfully
                      </p>
                      <p className="text-sm text-green-700">
                        Your document has been analyzed and is ready for review
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleViewResults} className="flex-1">
                      View Analysis
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedFile(null);
                        setScanComplete(false);
                        setScanProgress(0);
                      }}
                    >
                      Scan Another
                    </Button>
                  </div>
                </div>
              )}

              {!isScanning && !scanComplete && (
                <Button onClick={handleScan} className="w-full">
                  Start Scan
                </Button>
              )}

              <div className="flex items-start gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Privacy Notice</p>
                  <p className="text-blue-700">
                    Your documents are processed securely and are not stored
                    permanently. All data is encrypted during transmission.
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
