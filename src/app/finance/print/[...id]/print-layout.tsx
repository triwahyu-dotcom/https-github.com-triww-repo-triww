"use client";

import { useEffect, useState } from "react";
import { RequestForPayment, ExpenseDocument } from "@/lib/finance/types";
import { formatCurrencyIDR, formatDateFullID } from "@/lib/utils/format";

interface Props {
  rfp?: RequestForPayment;
  doc?: ExpenseDocument;
}

export function PrintLayout({ rfp, doc }: Props) {
  const [mounted, setMounted] = useState(false);
  const [onlyRender, setOnlyRender] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setOnlyRender(new URLSearchParams(window.location.search).get('only'));
  }, []);

  if (!mounted) return null;
  
  const showRfp = (!onlyRender || onlyRender === 'rfp') && rfp;
  const showPo = (!onlyRender || onlyRender === 'po') && doc;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  };

  const formatDateID = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" });
  };

  const terbilang = (amount: number): string => {
    const units = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
    let result = '';

    if (amount === 0) return 'nol';

    const getTerbilang = (n: number): string => {
      let temp = '';
      if (n < 12) {
        temp = ' ' + units[n];
      } else if (n < 20) {
        temp = getTerbilang(n - 10) + ' belas';
      } else if (n < 100) {
        temp = getTerbilang(Math.floor(n / 10)) + ' puluh' + getTerbilang(n % 10);
      } else if (n < 200) {
        temp = ' seratus' + getTerbilang(n - 100);
      } else if (n < 1000) {
        temp = getTerbilang(Math.floor(n / 100)) + ' ratus' + getTerbilang(n % 100);
      } else if (n < 2000) {
        temp = ' seribu' + getTerbilang(n - 1000);
      } else if (n < 1000000) {
        temp = getTerbilang(Math.floor(n / 1000)) + ' ribu' + getTerbilang(n % 1000);
      } else if (n < 1000000000) {
        temp = getTerbilang(Math.floor(n / 1000000)) + ' juta' + getTerbilang(n % 1000000);
      } else if (n < 1000000000000) {
        temp = getTerbilang(Math.floor(n / 1000000000)) + ' milyar' + getTerbilang(n % 1000000000);
      }
      return temp.trim();
    };

    result = getTerbilang(amount);
    return result.charAt(0).toUpperCase() + result.slice(1) + ' rupiah';
  };

  const today = formatDateID(new Date().toISOString());

  const isPO = doc?.documentType === "PO";
  const isSPK = doc?.documentType === "SPK" || doc?.documentType === "KONTRAK";
  const isCashAdvance = doc?.documentType === "CASH_ADVANCE" || (!doc && rfp?.paymentType === "Cash");

  const rfpPreparedByName = doc?.preparedBy?.name || "Project Officer";
  const rfpPreparedByDate = doc?.preparedBy?.date ? formatDateID(doc?.preparedBy?.date) : today;
  
  const rfpVerifiedByName = rfp?.financeApprovedBy?.name || doc?.verifiedBy?.name || "Finance Admin";
  const rfpVerifiedByDate = rfp?.financeApprovedBy?.date ? formatDateID(rfp.financeApprovedBy.date) : (doc?.verifiedBy?.date ? formatDateID(doc.verifiedBy.date) : today);
  
  const rfpApprovedByName = rfp?.cLevelApprovedBy?.name || doc?.approvedBy?.name || "Eka Marutha Yuswardana";
  const rfpApprovedByDate = rfp?.cLevelApprovedBy?.date ? formatDateID(rfp.cLevelApprovedBy.date) : (doc?.approvedBy?.date ? formatDateID(doc.approvedBy.date) : today);

  const docTypeLabel: Record<string, string> = {
    "PO": "Purchase Order",
    "SPK": "SPK",
    "KONTRAK": "Kontrak",
    "CASH_ADVANCE": "Cash Advance"
  };

  return (
    <div style={{ background: "white", color: "black", minHeight: "100vh", padding: "0", fontFamily: "'Inter', Arial, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body { background: white; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .print-page { padding: 0 !important; position: relative; box-sizing: border-box; page-break-inside: avoid; }
          .page-break { page-break-after: always; }
          .footer-bar { position: relative !important; margin-top: 30px; }
        }
        .print-page { padding: 40px; box-sizing: border-box; font-size: 13px; line-height: 1.5; background: white; margin: 0 auto; max-width: 210mm; position: relative; box-shadow: 0 0 10px rgba(0,0,0,0.1); margin-bottom: 20px; page-break-inside: avoid; }
        
        /* PO Styles */
        .po-table th { background: #f8f9fa; font-weight: 600; font-size: 11px; border: 1px solid #333; padding: 6px; }
        .po-table td { border: 1px solid #333; padding: 6px; font-size: 11px; vertical-align: middle; }
        .signature-box { border: 1px solid #333; height: 100px; display: flex; flex-direction: column; justify-content: space-between; padding: 10px; text-align: center; font-size: 11px; }
        .footer-bar { position: relative; height: 40px; background: #004a99; display: flex; align-items: center; padding: 0 20px; color: white; font-size: 10px; justify-content: space-between; border-top: 5px solid #ff9900; margin-top: 30px; margin-left: -40px; margin-right: -40px; }
        @media print {
           .footer-bar { margin-left: 0; margin-right: 0; }
        }
        
        /* RFP Form Styles */
        .rfp-title { text-align: center; font-weight: 800; font-size: 18px; border-bottom: 2px solid #004a99; padding-bottom: 10px; margin-bottom: 20px; color: #004a99; letter-spacing: 0.5px; text-transform: uppercase; }
        .rfp-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
        .rfp-table td { padding: 10px 12px; border: 1px solid #aaa; vertical-align: top; }
        .rfp-table td.label { font-weight: 600; width: 35%; background-color: #f7f9fc; }
        .rfp-note-box { border: 1px solid #aaa; padding: 15px; background: #fdfdfd; min-height: 100px; margin-bottom: 30px; font-size: 12px; }
      `}</style>

      {/* Floating Action Buttons */}
      <div className="no-print" style={{ position: 'fixed', top: '20px', right: '20px', display: 'flex', gap: '10px', zIndex: 100 }}>
        <button onClick={() => window.location.href = '/finance'} style={{ background: "white", border: "1px solid #ccc", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>← Back</button>
        <button onClick={() => window.print()} style={{ background: "#004a99", color: "white", border: "none", padding: "8px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>🖨️ Save / Print Document</button>
      </div>

      {/* =========================================================
          PAGE 1: FORMAL RFP (REQUEST FOR PAYMENT)
          ========================================================= */}
      {showRfp && (
        <div className="print-page page-break" style={{ zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '10px' }}>
             <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#004a99', letterSpacing: '1px' }}>JUARA</div>
          </div>

          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <h2 style={{ margin: "0", fontSize: "16px", fontWeight: "bold" }}>PT JUARA BERHASIL BERKAH SEJAHTERA</h2>
            <div style={{ fontSize: "14px", fontWeight: "bold", textDecoration: "underline", marginTop: "4px" }}>REQUEST FOR PAYMENT (RFP)</div>
          </div>
          
          <table className="rfp-gapempi-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "20px" }}>
            <tbody>
              <tr>
                <td style={{ border: "1px solid #000", padding: "8px", fontWeight: "bold", width: "30%" }}>Project Name</td>
                <td colSpan={3} style={{ border: "1px solid #000", padding: "8px" }}>{rfp.projectName}</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "8px", fontWeight: "bold", width: "30%" }}>No. RFP</td>
                <td style={{ border: "1px solid #000", padding: "8px", width: "35%" }}></td>
                <td style={{ border: "1px solid #000", padding: "8px", fontWeight: "bold", width: "15%" }}>Date</td>
                <td style={{ border: "1px solid #000", padding: "8px", width: "20%" }}>{formatDateID(rfp.requestDate)}</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "8px", fontWeight: "bold", width: "30%" }}>No. PO/SPK Dasar</td>
                <td colSpan={3} style={{ border: "1px solid #000", padding: "8px" }}>{rfp.documentIds?.[0] || doc?.id || "-"}</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "8px", fontWeight: "bold" }}>From Bank</td>
                <td colSpan={3} style={{ border: "1px solid #000", padding: "8px" }}>BCA 000689573</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "8px", fontWeight: "bold" }}>Pay To</td>
                <td colSpan={3} style={{ border: "1px solid #000", padding: "8px" }}>{rfp.payeeName}</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "8px", fontWeight: "bold" }}>Payment Type</td>
                <td colSpan={3} style={{ border: "1px solid #000", padding: "8px" }}>
                  <span style={{ marginRight: "16px" }}>
                    {rfp.paymentType === "Transfer" ? "☑" : "☐"} Transfer
                  </span>
                  <span>
                    {rfp.paymentType === "Cash" ? "☑" : "☐"} Cash
                  </span>
                </td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "8px", fontWeight: "bold" }}>Bank</td>
                <td colSpan={3} style={{ border: "1px solid #000", padding: "8px" }}>{rfp.paymentType === "Transfer" ? rfp.bankAccount.bankName : "-"}</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "8px", fontWeight: "bold" }}>Bank Account No.</td>
                <td colSpan={3} style={{ border: "1px solid #000", padding: "8px" }}>{rfp.paymentType === "Transfer" ? rfp.bankAccount.accountNo : "-"}</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "8px", fontWeight: "bold" }}>Bank Account Name</td>
                <td colSpan={3} style={{ border: "1px solid #000", padding: "8px" }}>{rfp.paymentType === "Transfer" ? rfp.bankAccount.accountName : "-"}</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "8px", fontWeight: "bold" }}>VMS</td>
                <td colSpan={3} style={{ border: "1px solid #000", padding: "8px" }}>☑ VMS Checked</td>
              </tr>
            </tbody>
          </table>

          <table className="rfp-gapempi-items" style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "20px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f0f0f0" }}>
                <th style={{ border: "1px solid #000", padding: "8px", textAlign: "left" }}>Description</th>
                <th style={{ border: "1px solid #000", padding: "8px", textAlign: "right", width: "200px" }}>Amount (Rp.)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: "1px solid #000", padding: "8px", verticalAlign: "top", minHeight: "100px", height: "100px" }}>
                  {doc?.lineItems && doc.lineItems.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                       {doc.lineItems.map((item, idx) => (
                         <li key={idx}>{item.description} {item.specification ? `- ${item.specification}` : ""}</li>
                       ))}
                    </ul>
                  ) : (
                    <div style={{ whiteSpace: "pre-wrap" }}>{doc?.description || rfp.notes}</div>
                  )}
                </td>
                <td style={{ border: "1px solid #000", padding: "8px", verticalAlign: "top", textAlign: "right" }}>
                  {formatCurrency(rfp.totalAmount)}
                </td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "8px", fontWeight: "bold", textAlign: "right" }}>Total Amount</td>
                <td style={{ border: "1px solid #000", padding: "8px", fontWeight: "bold", textAlign: "right" }}>
                  {formatCurrency(rfp.totalAmount)}
                </td>
              </tr>
            </tbody>
          </table>

          <table className="rfp-gapempi-signatures" style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", textAlign: "center" }}>
            <tbody>
              <tr>
                <td style={{ border: "1px solid #000", padding: "8px", width: "25%" }}>Prepared by:</td>
                <td style={{ border: "1px solid #000", padding: "8px", width: "25%" }}>Checked by:</td>
                <td style={{ border: "1px solid #000", padding: "8px", width: "25%" }}>Approved by:</td>
                <td style={{ border: "1px solid #000", padding: "8px", width: "25%" }}>Posted by:</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", height: "80px", verticalAlign: "bottom", padding: "8px" }}>
                  <div style={{ fontWeight: "bold", textDecoration: "underline" }}>{rfpPreparedByName}</div>
                </td>
                <td style={{ border: "1px solid #000", height: "80px", verticalAlign: "bottom", padding: "8px", position: "relative" }}>
                   {rfp?.financeApprovedBy?.signature ? (
                      <div style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', border: '1px solid #16a34a', padding: '4px', borderRadius: '4px', transform: 'rotate(-2deg)', background: 'rgba(255, 255, 255, 0.9)', color: '#16a34a', zIndex: 10 }}>
                         <div style={{ fontFamily: 'var(--font-signature)', fontSize: '14px', lineHeight: 1 }}>{rfpVerifiedByName}</div>
                         <div style={{ fontSize: '5px', fontWeight: 'bold' }}>{rfp.financeApprovedBy.signature}</div>
                      </div>
                   ) : (
                      <div style={{ color: rfp?.status !== "pending_finance" && rfp?.status !== "draft" ? "green" : "transparent", fontSize: "18px", marginBottom: "10px" }}>{rfp?.status !== "pending_finance" && rfp?.status !== "draft" ? "✔️" : ""}</div>
                   )}
                  <div style={{ fontWeight: "bold", textDecoration: "underline" }}>{rfpVerifiedByName}</div>
                </td>
                <td style={{ border: "1px solid #000", height: "80px", verticalAlign: "bottom", padding: "8px", position: "relative" }}>
                   {doc?.approvedBy?.digitalSignature && (
                      <div style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', border: '1px solid #2563eb', padding: '4px', borderRadius: '4px', transform: 'rotate(-5deg)', background: 'rgba(255, 255, 255, 0.9)', color: '#1e40af', zIndex: 10 }}>
                         <div style={{ fontFamily: 'var(--font-signature)', fontSize: '14px', lineHeight: 1 }}>{rfpApprovedByName}</div>
                         <div style={{ fontSize: '5px', fontWeight: 'bold' }}>{doc?.approvedBy?.digitalSignature}</div>
                      </div>
                   )}
                  <div style={{ fontWeight: "bold", textDecoration: "underline" }}>{rfpApprovedByName}</div>
                </td>
                <td style={{ border: "1px solid #000", height: "80px", verticalAlign: "bottom", padding: "8px" }}>
                  <div style={{ fontWeight: "bold", textDecoration: "underline" }}>Finance Dept</div>
                </td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "8px" }}>Date: {rfpPreparedByDate}</td>
                <td style={{ border: "1px solid #000", padding: "8px" }}>Date: {rfpVerifiedByDate}</td>
                <td style={{ border: "1px solid #000", padding: "8px" }}>Date: {rfpApprovedByDate}</td>
                <td style={{ border: "1px solid #000", padding: "8px" }}>Date:</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* =========================================================
          PAGE 2: DOCUMENT LAMPIRAN (PO / SPK / CASH ADVANCE)
          ========================================================= */}
      {doc && isPO && (
        <div className="print-page">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
             <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#004a99', letterSpacing: '1px' }}>JUARA</div>
             </div>
          </div>

          <h1 style={{ textAlign: 'center', fontSize: '20px', margin: '0 0 30px', fontWeight: 'bold' }}>PURCHASE ORDER</h1>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', fontSize: '12px' }}>
            <div style={{ width: '60%' }}>
              <p style={{ margin: '4px 0' }}><strong>Project :</strong> {doc.projectName}</p>
              <p style={{ margin: '4px 0' }}><strong>Nama Vendor :</strong> {doc.vendorName}</p>
              <div style={{ display: 'flex' }}>
                <strong style={{ minWidth: '60px' }}>Alamat :</strong> 
                <span style={{ marginLeft: '4px', maxWidth: '300px' }}>{doc.vendorAddress || "-"}</span>
              </div>
              <p style={{ margin: '4px 0' }}><strong>Tax ID/NPWP :</strong> {doc.vendorTaxId || "-"}</p>
            </div>
            <div style={{ width: '35%' }}>
              <p style={{ margin: '4px 0' }}><strong>PO Number</strong></p>
              <p style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 'bold' }}>{doc.id}</p>
              <p style={{ margin: '4px 0' }}><strong>Date</strong></p>
              <p style={{ margin: '0', fontSize: '14px', fontWeight: 'bold' }}>{formatDateID(doc.issueDate)}</p>
            </div>
          </div>

          {/* Table */}
          {(() => {
            const calculatedTotal = (doc.lineItems && doc.lineItems.length > 0) 
              ? doc.lineItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0)
              : doc.amount;
            
            return (
              <>
                <table className="po-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                  <thead>
                    <tr>
                      <th rowSpan={2} style={{ width: '30px' }}>No</th>
                      <th rowSpan={2}>Item / Task</th>
                      <th rowSpan={2}>Specification</th>
                      <th colSpan={2}>Qty</th>
                      <th colSpan={2}>Freq</th>
                      <th colSpan={2}>Vol</th>
                      <th rowSpan={2} style={{ width: '100px' }}>Price</th>
                      <th rowSpan={2} style={{ width: '110px' }}>Amount IDR</th>
                    </tr>
                    <tr>
                      <th style={{ width: '30px' }}>Qty</th>
                      <th style={{ width: '40px' }}>Unit</th>
                      <th style={{ width: '30px' }}>Fq</th>
                      <th style={{ width: '40px' }}>Unit</th>
                      <th style={{ width: '30px' }}>Vol</th>
                      <th style={{ width: '45px' }}>Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(doc.lineItems && doc.lineItems.length > 0) ? doc.lineItems.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                        <td>{item.description}</td>
                        <td>{item.specification || "-"}</td>
                        <td style={{ textAlign: 'center' }}>{item.qty}</td>
                        <td style={{ textAlign: 'center' }}>{item.unit}</td>
                        <td style={{ textAlign: 'center' }}>{item.freq}</td>
                        <td style={{ textAlign: 'center' }}>{item.freqUnit}</td>
                        <td style={{ textAlign: 'center' }}>{item.vol}</td>
                        <td style={{ textAlign: 'center' }}>{item.volUnit}</td>
                        <td style={{ textAlign: 'right' }}>{new Intl.NumberFormat("id-ID").format(item.price)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{new Intl.NumberFormat("id-ID").format(item.amount)}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td style={{ textAlign: 'center' }}>1</td>
                        <td>{doc.description}</td>
                        <td>-</td>
                        <td style={{ textAlign: 'center' }}>1</td>
                        <td style={{ textAlign: 'center' }}>-</td>
                        <td style={{ textAlign: 'center' }}>1</td>
                        <td style={{ textAlign: 'center' }}>-</td>
                        <td style={{ textAlign: 'center' }}>1</td>
                        <td style={{ textAlign: 'center' }}>-</td>
                        <td style={{ textAlign: 'right' }}>{new Intl.NumberFormat("id-ID").format(doc.amount)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{new Intl.NumberFormat("id-ID").format(doc.amount)}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ fontWeight: 'bold' }}>
                      <td colSpan={10} style={{ textAlign: 'right', padding: '10px' }}>NOMINAL DI SPK (GROSS)</td>
                      <td style={{ textAlign: 'right', padding: '10px', fontSize: '13px', background: '#f9f9f9' }}>{formatCurrency(doc.grossAmount || calculatedTotal)}</td>
                    </tr>
                    {doc.usePPh21 && (
                      <tr style={{ color: '#d32f2f' }}>
                        <td colSpan={10} style={{ textAlign: 'right', padding: '8px 10px' }}>PPh 21 (2,5%)</td>
                        <td style={{ textAlign: 'right', padding: '8px 10px', fontSize: '11px' }}>- {formatCurrency(doc.taxAmount || (calculatedTotal * 0.025))}</td>
                      </tr>
                    )}
                    <tr style={{ fontWeight: 'bold', borderTop: '2px solid #333' }}>
                      <td colSpan={10} style={{ textAlign: 'right', padding: '10px', background: '#f0f4f8' }}>TOTAL YANG DITRANSFER (NET)</td>
                      <td style={{ textAlign: 'right', padding: '10px', fontSize: '14px', background: '#f0f4f8', color: '#004a99' }}>{formatCurrency(doc.netAmount || doc.amount)}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Details Sections */}
                <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
                  <p style={{ margin: '8px 0' }}><strong>Notes :</strong> {doc.description && doc.lineItems?.length ? doc.description : "-"}</p>
                  
                  {doc.paymentSchedule && doc.paymentSchedule.length > 0 ? (
                    <div style={{ margin: '12px 0' }}>
                      <p style={{ fontWeight: 'bold', marginBottom: '6px' }}>Jadwal Pembayaran (Payment Schedule):</p>
                      <table style={{ width: '400px', borderCollapse: 'collapse', fontSize: '10px', border: '1px solid #ddd' }}>
                        <thead>
                          <tr style={{ background: '#f8f9fa' }}>
                            <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>Keterangan</th>
                            <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center' }}>%</th>
                            <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'right' }}>Nominal (IDR)</th>
                            <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center' }}>Estimasi Tanggal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {doc.paymentSchedule.map((ev, i) => (
                            <tr key={i}>
                              <td style={{ border: '1px solid #ddd', padding: '4px' }}>{ev.label}</td>
                              <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center' }}>{ev.percentage}%</td>
                              <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'right' }}>{formatCurrency(ev.amount || (calculatedTotal * (ev.percentage || 0) / 100))}</td>
                              <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center' }}>{formatDateID(ev.date)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ margin: '8px 0' }}><strong>Payment Terms:</strong> {doc.paymentTerms || "-"}</p>
                  )}
                </div>
              </>
            );
          })()}
             
             <div style={{ display: 'flex', marginTop: '20px' }}>
                <div style={{ flex: 1 }}>
                   <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '4px' }}>Delivery Instruction</p>
                   <p>Ship to : {doc.shipTo || "-"}</p>
                   <p>Delivery date : {doc.deliveryDate ? formatDateID(doc.deliveryDate) : "-"}</p>
                </div>
                <div style={{ flex: 1 }}>
                   <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '4px' }}>Billing Instruction</p>
                   <p>Send/Email to : {doc.billingInstruction || "-"}</p>
                </div>
                <div style={{ width: '200px', border: '1px solid #333', padding: '10px', background: '#fefefe' }}>
                   <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>Billing Terms :</p>
                   {(doc.billingTerms && doc.billingTerms.length > 0) ? doc.billingTerms.map((term, i) => (
                      <p key={i} style={{ margin: '2px 0' }}>{i+1}. {term}</p>
                   )) : (
                      <>
                        <p style={{ margin: '2px 0' }}>1. Invoice</p>
                        <p style={{ margin: '2px 0' }}>2. BAST</p>
                        <p style={{ margin: '2px 0' }}>3. Report Dokumentasi</p>
                      </>
                   )}
                   {rfp?.vendorInvoiceUrl && (
                      <p style={{ margin: '2px 0' }}>4. Invoice Vendor (Attached in System)</p>
                   )}
                </div>
             </div>

          {/* Signatures */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0', marginTop: '60px' }}>
             <div className="signature-box">
                <div>Prepared by</div>
                <div style={{ fontWeight: 'bold' }}>{rfpPreparedByName}</div>
                <div>Date: {rfpPreparedByDate}</div>
             </div>
             <div className="signature-box" style={{ borderLeft: 'none' }}>
                <div>Verified by:</div>
                <div style={{ fontWeight: 'bold' }}>{rfpVerifiedByName}</div>
                <div>Date: {rfpVerifiedByDate}</div>
             </div>
             <div className="signature-box" style={{ borderLeft: 'none', position: 'relative' }}>
                <div>Approved by:</div>
                 {(rfp?.cLevelApprovedBy?.signature || doc?.approvedBy?.digitalSignature) && (
                    <div style={{ position: 'absolute', top: '-15px', left: '10px', right: '10px', border: '1.5px solid #2563eb', padding: '10px 4px', borderRadius: '4px', transform: 'rotate(-5deg)', background: 'rgba(255, 255, 255, 0.98)', color: '#1e40af', textAlign: 'center', pointerEvents: 'none', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                       <div style={{ fontFamily: 'var(--font-signature)', fontSize: '24px', lineHeight: 1, marginBottom: '4px', fontWeight: 'normal' }}>{rfpApprovedByName}</div>
                       <div style={{ fontSize: '7px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.8 }}>E-SIGNATURE VERIFIED • {rfp?.cLevelApprovedBy?.signature || doc?.approvedBy?.digitalSignature}</div>
                    </div>
                 )}
                <div style={{ fontWeight: 'bold', marginTop: doc.approvedBy?.digitalSignature ? '20px' : '0' }}>{rfpApprovedByName}</div>
                <div>Date: {rfpApprovedByDate}</div>
             </div>
          </div>

          <div className="footer-bar">
             <div style={{ fontWeight: 'bold' }}>PT JUARA BERHASIL BERKAH SEJAHTERA</div>
             <div>Gedung IS Plaza Lt. 8 R. 801, Jl. Pramuka Raya Kav. 150 Matraman, Jakarta</div>
             <div>contact@juaraevent.id | www.juaraevent.id</div>
          </div>
        </div>
      )}

      {showPo && isSPK && (
        <div className="print-page" style={{ padding: "60px 50px", fontSize: "12.5px", lineHeight: 1.6, color: "#333", position: 'relative' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '30px' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a365d', letterSpacing: '1.5px', fontFamily: 'Arial, sans-serif' }}>JUARA</div>
          </div>

          <h1 style={{ textAlign: 'center', fontSize: '18px', margin: '0 0 40px', fontWeight: 'bold', textDecoration: 'underline', color: '#000' }}>SURAT PERINTAH KERJA (SPK)</h1>

          <div style={{ marginBottom: '30px' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <tbody>
                <tr><td style={{ width: '130px', fontWeight: 'bold' }}>Nomor</td><td style={{ width: '20px' }}>:</td><td>{doc.id}</td></tr>
                <tr><td style={{ fontWeight: 'bold' }}>Lampiran</td><td>:</td><td>{doc.lampiran || "1 (satu) set"}</td></tr>
                <tr><td style={{ fontWeight: 'bold', verticalAlign: 'top' }}>Event</td><td style={{ verticalAlign: 'top' }}>:</td><td><strong>{doc.projectName} (DPN GAPEMPI) Periode Tahun 2026-2031</strong></td></tr>
              </tbody>
            </table>
          </div>

          <p style={{ margin: '20px 0 15px' }}>Yang bertanda tangan di bawah ini:</p>
          <div style={{ marginLeft: '40px', marginBottom: '25px' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <tbody>
                <tr><td style={{ width: '110px' }}>Nama</td><td style={{ width: '20px' }}>:</td><td><strong>Eka Marutha Yuswardana</strong></td></tr>
                <tr><td>Jabatan</td><td>:</td><td><em>Managing Director</em></td></tr>
                <tr>
                  <td style={{ verticalAlign: 'top' }}>Alamat</td>
                  <td style={{ verticalAlign: 'top' }}>:</td>
                  <td>Gedung IS Plaza lantai 8 Ruang 801, Jl. Pramuka Raya Kav. 150, Kel. Utan<br/>
                    Kayu Utara, Kec. Matraman, Kota Jakarta Timur, DKI Jakarta
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p style={{ textAlign: 'justify', lineHeight: 1.6 }}>Selaku Penyedia Jasa Event Organizer yang bertindak untuk dan atas nama <strong>PT Juara Berhasil Berkah SEJAHTERA</strong>, selanjutnya disebut sebagai <strong>Pihak Pertama</strong>, dengan ini memberikan penugasan kepada:</p>
          
          <div style={{ marginLeft: '30px', margin: '15px 0' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', lineHeight: 1.6 }}>
              <tbody>
                <tr><td style={{ width: '100px' }}>Nama</td><td style={{ width: '15px' }}>:</td><td><strong>{doc.vendorName}</strong></td></tr>
                <tr><td style={{ verticalAlign: 'top' }}>Alamat</td><td style={{ verticalAlign: 'top' }}>:</td><td>{doc.vendorAddress || "-"}</td></tr>
              </tbody>
            </table>
          </div>
          <p style={{ marginBottom: '15px' }}>Disebut sebagai <strong>Pihak Kedua</strong>.</p>

          <p style={{ textAlign: 'justify', lineHeight: 1.6 }}>Pihak Kedua bertindak untuk dan atas nama sendiri untuk menyatakan ketersediaan dengan rincian sebagai berikut:</p>
          <div style={{ marginLeft: '30px', marginBottom: '25px' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', lineHeight: 1.8 }}>
              <tbody>
                <tr><td style={{ width: '140px' }}>Nama Event</td><td style={{ width: '15px' }}>:</td><td><strong>{doc.projectName}</strong></td></tr>
                <tr><td>Tanggal Event</td><td>:</td><td>{doc.deliveryDate ? formatDateID(doc.deliveryDate) : "-"}</td></tr>
                <tr><td>Durasi Pekerjaan</td><td>:</td><td>{doc.duration || (doc.deliveryDate ? formatDateID(doc.deliveryDate) : "-")}</td></tr>
                <tr><td>Lokasi</td><td>:</td><td>{doc.venue || doc.shipTo || "-"}</td></tr>
                <tr><td>Nama Pekerjaan</td><td>:</td><td>{doc.description?.toUpperCase() || "JASA VENDOR"}</td></tr>
                <tr>
                  <td style={{ verticalAlign: 'top' }}>Ruang lingkup</td>
                  <td style={{ verticalAlign: 'top' }}>:</td>
                  <td> 
                    {doc.workScope && doc.workScope.length > 0 ? (
                      <ul style={{ margin: '0', paddingLeft: '18px', listStyleType: 'disc' }}>
                        {doc.workScope.map((item, idx) => item.trim() && (
                          <li key={idx} style={{ marginBottom: '2px' }}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <span>Sesuai dengan kesepakatan spesifikasi pekerjaan.</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginBottom: '25px', padding: '15px', border: '1px solid #ddd', background: '#fafafa', borderRadius: '4px' }}>
             <p style={{ margin: '0 0 10px', fontSize: '14px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}><strong>Rincian Nilai Pekerjaan :</strong></p>
             <div style={{ display: 'grid', gridTemplateColumns: 'min-content 1fr', gap: '8px 15px', fontSize: '12px' }}>
                <div style={{ whiteSpace: 'nowrap' }}>Nominal di SPK (Gross)</div>
                <div>: <strong>{formatCurrency(doc.grossAmount || doc.amount / (doc.usePPh21 ? 0.975 : 1))}</strong></div>
                
                {doc.usePPh21 && (
                  <>
                    <div style={{ whiteSpace: 'nowrap', color: '#d32f2f' }}>PPh 21 (2,5%)</div>
                    <div style={{ color: '#d32f2f' }}>: - {formatCurrency(doc.taxAmount || (doc.grossAmount ? doc.grossAmount * 0.025 : 0))}</div>
                  </>
                )}
                
                <div style={{ whiteSpace: 'nowrap', fontSize: '13px', marginTop: '5px' }}><strong>Total yang ditransfer (Net)</strong></div>
                <div style={{ fontSize: '13px', marginTop: '5px' }}>: <strong>{formatCurrency(doc.netAmount || doc.amount)}</strong></div>
              </div>
              
              <p style={{ margin: '15px 0 10px', fontSize: '12px' }}>
                <strong>Terbilang:</strong> 
                <em style={{ color: '#004a99', marginLeft: '8px', fontWeight: 'bold' }}>
                  ## {terbilang(doc.netAmount || doc.amount).toUpperCase()} ##
                </em>
              </p>

              <p style={{ margin: '15px 0 5px' }}><strong>Keterangan Pembayaran :</strong></p>
              <ul style={{ margin: '0', paddingLeft: '18px', lineHeight: 1.5 }}>
                 {doc.paymentKeterangan && doc.paymentKeterangan.length > 0 ? (
                   doc.paymentKeterangan.map((item, i) => (
                     <li key={i} style={{ marginBottom: '4px' }}>{item}</li>
                   ))
                 ) : (
                   <>
                     <li style={{ marginBottom: '4px' }}>Sudah menandatangani Perjanjian Kerahasiaan (Non-Disclosure Agreement)</li>
                     {doc.paymentSchedule && doc.paymentSchedule.length > 0 ? (
                       doc.paymentSchedule.map((ev, i) => (
                         <li key={i} style={{ marginBottom: '4px' }}>{ev.label} ({ev.percentage}%) sebesar {formatCurrency(ev.amount || (doc.amount * (ev.percentage || 0) / 100))} akan dibayarkan {ev.date ? `pada tanggal ${formatDateID(ev.date)}` : "setelah invoice diterima"}.</li>
                       ))
                     ) : (
                       <li style={{ marginBottom: '4px' }}>{doc.paymentTerms || "Pembayaran dilakukan 3 hari kerja setelah invoice diterima."}</li>
                     )}
                   </>
                 )}
              </ul>
          </div>

          <p style={{ marginTop: '40px', textAlign: 'right' }}>Jakarta, {today}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <div style={{ textAlign: 'left', width: '45%', position: 'relative' }}>
                 <p style={{ marginBottom: '80px' }}>Pemberi Kerja,</p>
                 {doc.approvedBy?.digitalSignature && (
                    <div style={{ position: 'absolute', bottom: '30px', left: '-10px', border: '1.5px solid rgba(26, 54, 93, 0.4)', padding: '10px 15px', borderRadius: '4px', transform: 'rotate(-2deg)', background: 'rgba(255, 255, 255, 0.98)', color: '#1a365d', textAlign: 'center', pointerEvents: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                       <span style={{ fontFamily: 'var(--font-signature)', fontSize: '26px', lineHeight: 1 }}>Eka Marutha Y</span>
                       <span style={{ fontSize: '7px', fontWeight: 'bold', marginTop: '3px', textTransform: 'uppercase' }}>Verified E-Sign • {rfpApprovedByDate}</span>
                    </div>
                 )}
                 <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>Eka Marutha Yuswardana</div>
                 <div>Managing Director</div>
              </div>
             <div style={{ textAlign: 'left', width: '45%' }}>
                <p style={{ marginBottom: '80px' }}>Penerima Kerja,</p>
                <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{doc.vendorName}</div>
                <div>{docTypeLabel[doc.documentType]} Talent/Vendor</div>
             </div>
          </div>

          <div className="footer-bar" style={{ position: 'absolute', bottom: '40px', left: '40px', right: '40px' }}>
             <div style={{ fontWeight: 'bold' }}>PT JUARA BERHASIL BERKAH SEJAHTERA</div>
             <div>Gedung IS Plaza Lt. 8 R. 801, Jl. Pramuka Raya Kav. 150 Matraman, Jakarta</div>
             <div>contact@juaraevent.id | www.juaraevent.id</div>
          </div>
        </div>
      )}

      {showPo && isCashAdvance && (
        <>
          <div className="print-page page-break" style={{ padding: "60px 40px", fontSize: "12px", lineHeight: 1.5 }}>
            <div style={{ textAlign: "center", marginBottom: "30px" }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>PT JUARA BERHASIL BERKAH SEJAHTERA</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', textDecoration: 'underline', marginTop: '4px' }}>FORMULIR PERMOHONAN ADVANCE</div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '150px', fontWeight: 'bold' }}>Nama Event</td>
                    <td>: {doc.projectName}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold' }}>Tanggal Permohonan</td>
                    <td>: {today}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <table className="po-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px', marginTop: '20px' }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ width: '40px' }}>No.</th>
                  <th>Uraian</th>
                  <th style={{ width: '60px' }}>Qty</th>
                  <th style={{ width: '100px' }}>Duration</th>
                  <th style={{ width: '120px' }}>Harga(Rp.)</th>
                  <th style={{ width: '120px' }}>Jumlah(Rp.)</th>
                </tr>
              </thead>
              <tbody>
                {(doc.lineItems && doc.lineItems.length > 0) ? doc.lineItems.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                    <td>{item.description} {item.specification ? `- ${item.specification}` : ""}</td>
                    <td style={{ textAlign: 'center' }}>{item.qty} {item.unit}</td>
                    <td style={{ textAlign: 'center' }}>{item.freq} {item.freqUnit}</td>
                    <td style={{ textAlign: 'right' }}>{new Intl.NumberFormat("id-ID").format(item.price)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{new Intl.NumberFormat("id-ID").format(item.amount)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td style={{ textAlign: 'center' }}>1</td>
                    <td>{doc.description || "Advance Request"}</td>
                    <td style={{ textAlign: 'center' }}>1</td>
                    <td style={{ textAlign: 'center' }}>-</td>
                    <td style={{ textAlign: 'right' }}>{new Intl.NumberFormat("id-ID").format(doc.amount)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{new Intl.NumberFormat("id-ID").format(doc.amount)}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f0f0f0', fontWeight: 'bold' }}>
                  <td colSpan={5} style={{ textAlign: 'right', padding: '10px' }}>Jumlah</td>
                  <td style={{ textAlign: 'right', padding: '10px' }}>{new Intl.NumberFormat("id-ID").format(doc.amount)}</td>
                </tr>
              </tfoot>
            </table>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', marginTop: '60px' }}>
              <tbody>
                <tr>
                  <td style={{ width: '33%', paddingBottom: '80px' }}>Disiapkan oleh :</td>
                  <td style={{ width: '33%', paddingBottom: '80px' }}>Diperiksa oleh :</td>
                  <td style={{ width: '34%', paddingBottom: '80px', position: 'relative' }}>
                    Disetujui oleh :
                    {doc.approvedBy?.digitalSignature && (
                      <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translate(-50%, 0) rotate(-5deg)', border: '1px solid #2563eb', padding: '4px 10px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.9)', color: '#1e40af', width: 'max-content' }}>
                         <div style={{ fontFamily: 'var(--font-signature)', fontSize: '18px', lineHeight: 1 }}>{rfpApprovedByName}</div>
                         <div style={{ fontSize: '6px', fontWeight: 'bold', letterSpacing: '0.5px' }}>SIGNED • {doc?.approvedBy?.digitalSignature}</div>
                      </div>
                    )}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{rfpPreparedByName}</td>
                  <td style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{rfpVerifiedByName}</td>
                  <td style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{rfpApprovedByName}</td>
                </tr>
                <tr>
                  <td>Tanggal : {rfpPreparedByDate}</td>
                  <td>Tanggal : {rfpVerifiedByDate}</td>
                  <td>Tanggal : {rfpApprovedByDate}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="print-page" style={{ minHeight: '120mm' }}>
            <div style={{ border: '2px solid #333', padding: '30px', borderRadius: '4px', position: 'relative', background: '#fff' }}>
               {/* Kuitansi Header */}
               <div style={{ display: 'flex', borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '30px', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                     <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#004a99' }}>JUARA</div>
                     <div style={{ fontSize: '11px', color: '#666' }}>PT Juara Berhasil Berkah Sejahtera</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                     <div style={{ fontSize: '20px', fontWeight: 'bold' }}>KUITANSI / RECEIPT</div>
                     <div style={{ fontFamily: 'monospace' }}>No: {doc?.id || rfp?.id}</div>
                  </div>
               </div>

               <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <tbody>
                     <tr style={{ height: '45px' }}>
                        <td style={{ padding: '10px 0', width: '220px' }}>Sudah Terima Dari (Received From)</td>
                        <td style={{ padding: '10px 0', fontWeight: 'bold' }}>: PT Juara Berhasil Berkah Sejahtera</td>
                     </tr>
                     <tr style={{ height: '45px' }}>
                        <td style={{ padding: '10px 0' }}>Banyaknya Uang (Amount in Words)</td>
                        <td style={{ padding: '10px 0', fontStyle: 'italic', background: '#f5f5f5', paddingLeft: '10px', fontWeight: '600' }}>: {terbilang(doc?.amount || rfp?.totalAmount || 0)}</td>
                     </tr>
                     <tr style={{ height: '45px' }}>
                        <td style={{ padding: '10px 0' }}>Untuk Pembayaran (For Payment of)</td>
                        <td style={{ padding: '10px 0' }}>: {doc?.description || rfp?.notes || doc?.projectName}</td>
                     </tr>
                  </tbody>
               </table>

               <div style={{ marginTop: '50px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ background: '#eee', padding: '15px 30px', border: '2px solid #333', fontSize: '24px', fontWeight: 'bold' }}>
                     Rp {new Intl.NumberFormat("id-ID").format(doc?.amount || rfp?.totalAmount || 0)},-
                  </div>
                  <div style={{ textAlign: 'center', width: '250px' }}>
                     <div>Jakarta, {today}</div>
                     <div style={{ height: '80px' }}></div>
                     <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{doc?.vendorName || rfp?.payeeName}</div>
                     <div style={{ fontSize: '11px' }}>Penerima / Payee Signature</div>
                  </div>
               </div>
               
               <div style={{ marginTop: '60px', fontSize: '10px', color: '#999', textAlign: 'center', fontStyle: 'italic' }}>
                 This is a formal electronic receipt generated by PT JBBS Project Tracker System.
               </div>
            </div>
          </div>
        </>
      )}

      {rfp && rfp.settlementDetails && (
        <div className="print-page page-break" style={{ padding: "60px 40px", fontSize: "12px", lineHeight: 1.5 }}>
          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>PT JUARA BERHASIL BERKAH SEJAHTERA</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', textDecoration: 'underline', marginTop: '4px' }}>FORMULIR PERTANGGUNGJAWABAN ADVANCE</div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <tbody>
                <tr>
                  <td style={{ width: '150px', fontWeight: 'bold' }}>Nama Event</td>
                  <td>: {rfp.projectName}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold' }}>Tanggal Laporan</td>
                  <td>: {formatDateFullID(rfp.settlementDetails.settlementDate)}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold' }}>Total Kasbon (Awal)</td>
                  <td>: {formatCurrencyIDR(rfp.totalAmount)}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold' }}>Total Realisasi</td>
                  <td>: {formatCurrencyIDR(rfp.settlementDetails.actualAmount)}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold' }}>Selisih (Variance)</td>
                  <td style={{ fontWeight: 'bold', color: rfp.settlementDetails.difference > 0 ? '#ff0000' : '#00aa00' }}>
                    : {rfp.settlementDetails.difference > 0 
                        ? `KURANG (+) ${formatCurrencyIDR(rfp.settlementDetails.difference)}` 
                        : (rfp.settlementDetails.difference < 0 
                            ? `SISA (-) ${formatCurrencyIDR(Math.abs(rfp.settlementDetails.difference))}`
                            : 'PAS (0)')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '30px', fontWeight: 'bold', borderBottom: '1px solid #333', paddingBottom: '4px', marginBottom: '8px' }}>
            Rincian Penggunaan Dana Aktual:
          </div>
          <table className="po-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{ width: '40px' }}>No.</th>
                <th>Uraian / Keterangan Kwitansi</th>
                <th style={{ width: '60px' }}>Qty</th>
                <th style={{ width: '120px' }}>Harga</th>
                <th style={{ width: '120px' }}>Jumlah(Rp.)</th>
              </tr>
            </thead>
            <tbody>
              {rfp.settlementDetails.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                  <td>{item.description} {item.specification ? `- ${item.specification}` : ""}</td>
                  <td style={{ textAlign: 'center' }}>{item.qty} {item.unit}</td>
                  <td style={{ textAlign: 'right' }}>{new Intl.NumberFormat("id-ID").format(item.price)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{new Intl.NumberFormat("id-ID").format(item.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f0f0f0', fontWeight: 'bold' }}>
                <td colSpan={4} style={{ textAlign: 'right', padding: '10px' }}>Total Realisasi Biaya</td>
                <td style={{ textAlign: 'right', padding: '10px' }}>{new Intl.NumberFormat("id-ID").format(rfp.settlementDetails.actualAmount)}</td>
              </tr>
            </tfoot>
          </table>

          {rfp.settlementDetails.notes && (
            <div style={{ marginBottom: '40px', padding: '10px', background: '#f9f9f9', border: '1px solid #ddd', minHeight: '60px' }}>
              <strong>Catatan:</strong><br />
              {rfp.settlementDetails.notes}
            </div>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', marginTop: '60px' }}>
            <tbody>
              <tr>
                <td style={{ width: '50%', paddingBottom: '80px' }}>Dilaporkan oleh (PM) :</td>
                <td style={{ width: '50%', paddingBottom: '80px', position: 'relative' }}>
                  Disetujui oleh (Finance) :
                  {rfp.status === 'settled' && (
                    <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translate(-50%, 0) rotate(-5deg)', border: '1px solid #2563eb', padding: '4px 10px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.9)', color: '#1e40af', width: 'max-content' }}>
                        <div style={{ fontFamily: 'var(--font-signature)', fontSize: '18px', lineHeight: 1 }}>Finance / Direktur</div>
                        <div style={{ fontSize: '6px', fontWeight: 'bold', letterSpacing: '0.5px' }}>SETTLEMENT APPROVED</div>
                    </div>
                  )}
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{rfp.payeeName}</td>
                <td style={{ fontWeight: 'bold', textDecoration: 'underline' }}>Finance Dept.</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {!doc && (!onlyRender || onlyRender === 'po') && (
        <div className="print-page" style={{ padding: "60px 40px", fontSize: "12px", lineHeight: 1.5, textAlign: "center" }}>
          <h2>PO / Kontrak (Dokumen Dasar) Tidak Ditemukan</h2>
          <p>Dokumen asli mungkin telah dihapus dari database atau referensinya rusak.</p>
        </div>
      )}

      {showRfp && rfp.vendorInvoiceUrl && (
        <div className="print-page page-break" style={{ padding: "60px 40px", fontSize: "12px", lineHeight: 1.5, textAlign: "center", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>VENDOR INVOICE ATTACHMENT</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '30px' }}>Reference RFP: {rfp.id}</div>
          <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
            <img src={rfp.vendorInvoiceUrl} alt="Vendor Invoice" style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain", border: "1px solid var(--line)" }} />
          </div>
        </div>
      )}
    </div>
  );
}
