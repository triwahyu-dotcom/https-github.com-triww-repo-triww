import { ProjectRecord } from "../project/types";

export type ExpenseDocumentType = "PO" | "SPK" | "KONTRAK" | "CASH_ADVANCE";

export interface LineItem {
  no: number;
  description: string;
  specification: string;
  qty: number;
  unit: string;
  freq: number;
  freqUnit: string;
  vol: number;
  volUnit: string;
  price: number;
  amount: number;
}

export interface PaymentEvent {
  label: string;
  percentage?: number;
  amount?: number;
  date?: string;
}

export interface ExpenseDocument {
  id: string;
  projectId: string;
  projectName: string;
  vendorName: string;
  vendorAddress?: string;
  vendorTaxId?: string;
  documentType: ExpenseDocumentType;
  issueDate: string;
  description: string;
  amount: number;
  status: "draft" | "submitted" | "approved" | "paid";
  rfpId?: string; // Legacy
  rfpIds?: string[]; // Multiple RFPs for termins
  lineItems?: LineItem[];
  paymentTerms?: string;
  paymentSchedule?: PaymentEvent[];
  deliveryInstruction?: string;
  deliveryDate?: string;
  shipTo?: string;
  billingInstruction?: string;
  billingTerms?: string[];
  notes?: string;
  
  // SPK Specific fields
  workScope?: string[];
  venue?: string;
  duration?: string;
  lampiran?: string;
  preparedBy?: { name: string; date: string };
  verifiedBy?: { name: string; date: string };
  approvedBy?: { name: string; date: string; digitalSignature?: string };
  rejectionReason?: string;
}

export interface RequestForPayment {
  id: string;
  documentIds: string[]; // Links to PO, SPK, Kontrak
  projectId: string;
  projectName: string;
  payeeName: string; // Internal or Vendor
  totalAmount: number;
  requestDate: string;
  requiredDate: string;
  status: "draft" | "pending_finance" | "pending_c_level" | "approved" | "paid" | "pending_settlement_approval" | "settled";
  paymentType: "Transfer" | "Cash";
  bankAccount: {
    bankName: string;
    accountNo: string;
    accountName: string;
  };
  notes: string;
  terminLabel?: string; // e.g. "Termin 1 - 30%"
  settlementDetails?: {
    actualAmount: number;
    difference: number;
    notes: string;
    settlementDate: string;
    items: LineItem[];
  };
  paymentProofUrl?: string;
  vendorInvoiceUrl?: string;
  financeApprovedBy?: { name: string; date: string; signature?: string };
  cLevelApprovedBy?: { name: string; date: string; signature?: string };
  rejectionReason?: string;
}

export interface FinanceDashboardData {
  expenseDocuments: ExpenseDocument[];
  rfps: RequestForPayment[];
  summary: {
    totalRFPs: number;
    pendingFinance: number;
    pendingCLevel: number;
    totalOutstandingAmount: number;
  };
}
