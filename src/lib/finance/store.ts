import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
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
  if (isSupabaseConfigured()) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      let client = supabase!;
      if (supabaseUrl && serviceKey) {
        const { createClient } = await import('@supabase/supabase-js');
        client = createClient(supabaseUrl, serviceKey);
      }

      const { data, error } = await client.from('finance_documents').select('data');
      if (!error && data) {
        return data.map(item => item.data);
      }
    } catch (e) {
      console.warn("Error reading finance_documents from Supabase", e);
    }
  }

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
  if (isSupabaseConfigured()) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      let client = supabase!;
      if (supabaseUrl && serviceKey) {
        const { createClient } = await import('@supabase/supabase-js');
        client = createClient(supabaseUrl, serviceKey);
      }

      const { data, error } = await client.from('finance_rfps').select('data');
      if (!error && data) {
        return data.map(item => item.data);
      }
    } catch (e) {
      console.warn("Error reading finance_rfps from Supabase", e);
    }
  }

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
  if (isSupabaseConfigured()) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (supabaseUrl && serviceKey) {
        const { createClient } = await import('@supabase/supabase-js');
        const adminClient = createClient(supabaseUrl, serviceKey);
        const { error } = await adminClient.from('finance_documents').upsert({ id: doc.id, data: doc });
        if (error) throw error;
      } else {
        const { error } = await supabase!.from('finance_documents').upsert({ id: doc.id, data: doc });
        if (error) throw error;
      }
      
      if (process.env.VERCEL) return;
    } catch (e: any) {
      console.error("Supabase finance document update error:", e.message);
      throw new Error(`Gagal menyimpan dokumen: ${e.message}`);
    }
  }

  try {
    ensureDataDir();
    const docs = await readDocuments();
    const index = docs.findIndex(d => d.id === doc.id);
    if (index >= 0) {
      docs[index] = doc;
    } else {
      docs.push(doc);
    }
    writeFileSync(DOCS_PATH, JSON.stringify(docs, null, 2));
  } catch (e) {
    if (!isSupabaseConfigured()) throw e;
  }
}

export async function saveRFP(rfp: RequestForPayment) {
  if (isSupabaseConfigured()) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (supabaseUrl && serviceKey) {
        const { createClient } = await import('@supabase/supabase-js');
        const adminClient = createClient(supabaseUrl, serviceKey);
        const { error } = await adminClient.from('finance_rfps').upsert({ id: rfp.id, data: rfp });
        if (error) throw error;
      } else {
        const { error } = await supabase!.from('finance_rfps').upsert({ id: rfp.id, data: rfp });
        if (error) throw error;
      }
      
      if (process.env.VERCEL) return;
    } catch (e: any) {
      console.error("Supabase finance RFP update error:", e.message);
      throw new Error(`Gagal menyimpan RFP: ${e.message}`);
    }
  }

  try {
    ensureDataDir();
    const rfps = await readRFPs();
    const index = rfps.findIndex(r => r.id === rfp.id);
    if (index >= 0) {
      rfps[index] = rfp;
    } else {
      rfps.push(rfp);
    }
    writeFileSync(RFPS_PATH, JSON.stringify(rfps, null, 2));
  } catch (e) {
    if (!isSupabaseConfigured()) throw e;
  }
}

export async function deleteDocument(id: string) {
  if (isSupabaseConfigured()) {
    const { error } = await supabase!.from('finance_documents').delete().eq('id', id);
    if (error) console.error("Supabase finance document delete error:", error.message);
    return;
  }

  ensureDataDir();
  const docs = await readDocuments();
  const filtered = docs.filter(d => d.id !== id);
  writeFileSync(DOCS_PATH, JSON.stringify(filtered, null, 2));
}

export async function deleteRFP(id: string) {
  if (isSupabaseConfigured()) {
    const { error } = await supabase!.from('finance_rfps').delete().eq('id', id);
    if (error) console.error("Supabase finance RFP delete error:", error.message);
    return;
  }

  ensureDataDir();
  const rfps = await readRFPs();
  const filtered = rfps.filter(r => r.id !== id);
  writeFileSync(RFPS_PATH, JSON.stringify(filtered, null, 2));
}
