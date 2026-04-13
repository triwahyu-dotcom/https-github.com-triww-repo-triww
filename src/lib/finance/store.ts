import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { ExpenseDocument, RequestForPayment, FinanceDashboardData } from "./types";
import { getProjectDashboardData } from "../project/store";

const DATA_DIR = path.join(process.cwd(), "data");
const DOCS_PATH = path.join(DATA_DIR, "expense_documents.json");
const RFPS_PATH = path.join(DATA_DIR, "rfps.json");

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

export async function readDocuments(): Promise<ExpenseDocument[]> {
  if (existsSync(DOCS_PATH)) {
    try {
      return JSON.parse(readFileSync(DOCS_PATH, "utf-8"));
    } catch {
      return [];
    }
  }
  return [];
}

export async function readRFPs(): Promise<RequestForPayment[]> {
  if (existsSync(RFPS_PATH)) {
    try {
      return JSON.parse(readFileSync(RFPS_PATH, "utf-8"));
    } catch {
      return [];
    }
  }
  return [];
}

export async function getFinanceDashboardData(): Promise<FinanceDashboardData> {
  const expenseDocuments = await readDocuments();
  const rfps = await readRFPs();

  const totalOutstandingAmount = rfps
    .filter(rfp => rfp.status !== "paid")
    .reduce((sum, rfp) => sum + rfp.totalAmount, 0);

  return {
    expenseDocuments,
    rfps,
    summary: {
      totalRFPs: rfps.length,
      pendingFinance: rfps.filter(rfp => rfp.status === "pending_finance").length,
      pendingCLevel: rfps.filter(rfp => rfp.status === "pending_c_level").length,
      totalOutstandingAmount,
    }
  };
}

export async function saveDocument(doc: ExpenseDocument) {
  ensureDataDir();
  const docs = await readDocuments();
  const index = docs.findIndex(d => d.id === doc.id);
  if (index >= 0) {
    docs[index] = doc;
  } else {
    docs.push(doc);
  }
  writeFileSync(DOCS_PATH, JSON.stringify(docs, null, 2));
}

export async function saveRFP(rfp: RequestForPayment) {
  ensureDataDir();
  const rfps = await readRFPs();
  const index = rfps.findIndex(r => r.id === rfp.id);
  if (index >= 0) {
    rfps[index] = rfp;
  } else {
    rfps.push(rfp);
  }
  writeFileSync(RFPS_PATH, JSON.stringify(rfps, null, 2));
}
