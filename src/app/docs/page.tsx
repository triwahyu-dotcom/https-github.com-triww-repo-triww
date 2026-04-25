"use client";

import React, { useState } from "react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { SummaryCard } from "@/components/ui/summary-card";
import { 
  FolderOpen, 
  Building2, 
  Coins, 
  Building, 
  FileText, 
  Upload, 
  Search, 
  Printer, 
  CheckCircle2, 
  X 
} from "lucide-react";

export const dynamic = "force-dynamic";

export default function DocCenterPage() {
  const [isParsing, setIsParsing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setError(null);
    setResults(null);

    try {
      const fileName = file.name.toLowerCase();
      let parseResult: any = null;

      if (fileName.includes("ce") || fileName.includes("budget") || fileName.includes("ac")) {
        if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
          const { parseCEandAC } = await import("@/lib/parser/ExcelParser");
          parseResult = await parseCEandAC(file);
        } else {
          setError("Format file CE/AC harus Excel (.xlsx)");
        }
      } else if (fileName.endsWith(".pdf")) {
        const { parsePDFAttachment } = await import("@/lib/parser/PDFParser");
        parseResult = await parsePDFAttachment(file);
      } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        const { parseRFPAttachment } = await import("@/lib/parser/ExcelParser");
        parseResult = await parseRFPAttachment(file);
      } else if (fileName.endsWith(".docx")) {
        const { parseWordAttachment } = await import("@/lib/parser/WordParser");
        parseResult = await parseWordAttachment(file);
      } else {
        setError("Format file tidak didukung. Gunakan PDF, Excel, atau Word.");
      }

      if (parseResult) {
        setResults(parseResult);
      }
    } catch (err: any) {
      console.error(err);
      setError("Gagal membaca file: " + err.message);
    } finally {
      setIsParsing(false);
    }
  };


  return (
    <WorkspaceShell title="Document Center" eyebrow="Automated Data Extraction">
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
        
        {/* Upload Hero Section */}
        <div style={{ 
          background: "var(--card-bg)", 
          border: "2px dashed var(--line)", 
          borderRadius: "16px", 
          padding: "40px", 
          textAlign: "center",
          marginBottom: "32px",
          transition: "all 0.3s ease",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center"
        }}
        onClick={() => document.getElementById('doc-upload')?.click()}
        >
          <div style={{ color: "var(--blue)", marginBottom: "16px", opacity: 0.8 }}><FolderOpen size={48} /></div>
          <h2 style={{ marginBottom: "8px" }}>Upload Business Document</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
            Drop your Budget (Excel), Invoice (PDF), or RFP (Word) here to extract data automatically.
          </p>
          <input 
            id="doc-upload"
            type="file" 
            style={{ display: "none" }} 
            onChange={handleFileUpload}
            accept=".pdf,.xlsx,.xls,.docx"
          />
          <button className="primary-button">Select File</button>
        </div>

        {isParsing && (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div className="spinner"></div>
            <p style={{ marginTop: "16px" }}>Analyzing document structure and extracting financial data...</p>
          </div>
        )}

        {error && (
          <div style={{ 
            background: "rgba(220, 38, 38, 0.1)", 
            color: "#ef4444", 
            padding: "16px", 
            borderRadius: "8px", 
            marginBottom: "24px",
            border: "1px solid rgba(220, 38, 38, 0.2)"
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {results && (
          <div className="results-container animate-in">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "32px" }}>
                {results.projectName && (
                  <SummaryCard 
                     label="Project/Source" 
                     value={results.projectName} 
                     icon={<Building2 size={18} />}
                  />
                )}
                {results.totalBudget !== undefined && (
                  <SummaryCard 
                     label="Total Amount" 
                     value={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(results.totalBudget || results.data?.amount || 0)} 
                     icon={<Coins size={18} />}
                  />
                )}
                {results.data?.vendorName && (
                  <SummaryCard 
                     label="Vendor Identified" 
                     value={results.data.vendorName} 
                     icon={<Building size={18} />}
                  />
                )}
            </div>

            {/* Detailed Data View */}
            <div style={{ background: "var(--card-bg)", borderRadius: "12px", padding: "24px", border: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Extraction Summary</h3>
                <button className="secondary-button" onClick={() => window.print()}>Print / Export</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px" }}>
                <div>
                   <h4 style={{ color: "var(--text-secondary)", marginBottom: "12px" }}>Financial Details</h4>
                   <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <tbody>
                        <tr style={{ borderBottom: "1px solid var(--line)" }}>
                          <td style={{ padding: "8px 0", color: "var(--text-secondary)" }}>Vendor</td>
                          <td style={{ padding: "8px 0", fontWeight: 500 }}>{results.data?.vendorName || "Heuristic detection failed"}</td>
                        </tr>
                        <tr style={{ borderBottom: "1px solid var(--line)" }}>
                          <td style={{ padding: "8px 0", color: "var(--text-secondary)" }}>Bank Name</td>
                          <td style={{ padding: "8px 0", fontWeight: 500 }}>{results.data?.bankName || "-"}</td>
                        </tr>
                        <tr style={{ borderBottom: "1px solid var(--line)" }}>
                          <td style={{ padding: "8px 0", color: "var(--text-secondary)" }}>Account No.</td>
                          <td style={{ padding: "8px 0", fontWeight: 500 }}>{results.data?.accountNo || "-"}</td>
                        </tr>
                        <tr style={{ borderBottom: "1px solid var(--line)" }}>
                          <td style={{ padding: "8px 0", color: "var(--text-secondary)" }}>Account Name</td>
                          <td style={{ padding: "8px 0", fontWeight: 500 }}>{results.data?.accountName || "-"}</td>
                        </tr>
                      </tbody>
                   </table>
                </div>

                <div>
                   <h4 style={{ color: "var(--text-secondary)", marginBottom: "12px" }}>Extracted Meta</h4>
                   <div style={{ padding: "12px", background: "rgba(0,0,0,0.2)", borderRadius: "8px", fontSize: "12px", maxHeight: "200px", overflow: "auto", fontFamily: "monospace" }}>
                      {results.rawText || "No raw text extracted"}
                   </div>
                </div>
              </div>

              {results.vendorSchedules?.length > 0 && (
                <div style={{ marginTop: "32px" }}>
                  <h4 style={{ color: "var(--text-secondary)", marginBottom: "12px" }}>Payment Schedules found (CE/AC)</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "12px" }}>
                    {results.vendorSchedules.map((vs: any, idx: number) => (
                      <div key={idx} style={{ padding: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--line)", borderRadius: "8px" }}>
                        <div style={{ fontWeight: "600", marginBottom: "4px" }}>{vs.vendor}</div>
                        <div style={{ fontSize: "14px", color: "var(--link)" }}>
                          Total: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(vs.total)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: "32px", display: "flex", gap: "12px" }}>
                 <button className="primary-button" onClick={() => alert('Syncing to Supabase...')}>Sync to Supabase</button>
                 <button className="secondary-button" onClick={() => setResults(null)}>Dismiss</button>
              </div>
            </div>
          </div>
        )}

      </div>

      <style jsx>{`
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255,255,255,0.1);
          border-left-color: var(--link);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-in {
          animation: slideUp 0.5s ease-out;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </WorkspaceShell>
  );
}
