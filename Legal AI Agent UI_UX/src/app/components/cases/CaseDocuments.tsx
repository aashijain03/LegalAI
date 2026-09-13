import { useState } from "react";
import { toast } from "sonner";
import { Upload, FileText, Download, Trash2, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { useAuth } from "../../contexts/AuthContext";
import {
  uploadCaseDocuments,
  deleteCaseDocument,
  downloadCaseDocument,
  type CaseDocumentMeta,
} from "../../lib/casesApi";

export function CaseDocuments({
  caseId,
  documents,
  onChange,
}: {
  caseId: string;
  documents: CaseDocumentMeta[];
  onChange: (documents: CaseDocumentMeta[]) => void;
}) {
  const { token } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !token) return;

    setUploading(true);
    try {
      const updated = await uploadCaseDocuments(token, caseId, Array.from(files));
      onChange(updated);
      toast.success("Documents uploaded");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload documents");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: CaseDocumentMeta) => {
    if (!token) return;
    try {
      await downloadCaseDocument(token, caseId, doc);
    } catch (err: any) {
      toast.error(err.message || "Failed to download document");
    }
  };

  const handleDelete = async (docId: string) => {
    if (!token) return;
    setDeletingId(docId);
    try {
      await deleteCaseDocument(token, caseId, docId);
      onChange(documents.filter((d) => d.id !== docId));
      toast.success("Document removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove document");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging ? "border-slate-900 bg-slate-50" : "border-slate-300 hover:border-slate-400"
        }`}
      >
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
            {uploading ? (
              <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
            ) : (
              <Upload className="w-6 h-6 text-slate-600" />
            )}
          </div>
          <p className="text-slate-900 font-medium mb-1">
            {uploading ? "Uploading..." : "Drop files here or click to browse"}
          </p>
          <p className="text-sm text-slate-500 mb-4">
            Supports PDF, DOC, DOCX, TXT, Images (Max 10MB per file, up to 5 at once)
          </p>
          <label htmlFor="case-file-upload">
            <Button asChild disabled={uploading}>
              <span>Select Files</span>
            </Button>
          </label>
          <input
            id="case-file-upload"
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
            disabled={uploading}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      </div>

      {documents.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card key={doc.id} className="p-4 flex items-center gap-3">
              <FileText className="w-8 h-8 text-slate-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{doc.filename}</p>
                <p className="text-xs text-slate-500">
                  {(doc.size_bytes / 1024).toFixed(1)} KB &middot;{" "}
                  {new Date(doc.uploaded_at).toLocaleDateString()}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)}>
                <Download className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={deletingId === doc.id}
                onClick={() => handleDelete(doc.id)}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
