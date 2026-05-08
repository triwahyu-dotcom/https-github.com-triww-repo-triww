import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { ExpenseDocument, RequestForPayment, FinanceDashboardData } from "./types";

/**
 * HELPER: Mengambil Admin Client dengan Service Role Key.
 * Menjamin akses privileged untuk operasi tulis dan bypass RLS.
 */
async function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (process.env.VERCEL && !serviceKey) {
    console.error("[FinanceStore] CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing in Vercel.");
    throw new Error("Konfigurasi keamanan database (Service Role) tidak ditemukan di server produksi.");
  }

  if (!supabaseUrl || !serviceKey) {
    if (isSupabaseConfigured()) return supabase!;
    throw new Error("Kredensial Supabase tidak ditemukan. Periksa file .env.local");
  }

  const { createClient } = await import('@supabase/supabase-js');
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

/**
 * HELPER: Menaikkan angka urut pada ID dokumen (Race Condition Mitigation).
 * Menangani format: 001/JBBS/..., CA-001-..., atau fallback suffix.
 */
function incrementSequence(id: string): string {
  const matchA = id.match(/^(\d+)(.*)$/);
  if (matchA) {
    const numPart = matchA[1];
    const restPart = matchA[2];
    const newNum = String(parseInt(numPart, 10) + 1).padStart(numPart.length, '0');
    return `${newNum}${restPart}`;
  }

  const matchB = id.match(/^(.*?-)(\d+)(.*)$/);
  if (matchB) {
    const prefix = matchB[1];
    const numPart = matchB[2];
    const suffix = matchB[3];
    const newNum = String(parseInt(numPart, 10) + 1).padStart(numPart.length, '0');
    return `${prefix}${newNum}${suffix}`;
  }

  return `${id}_retry`;
}

// --- CORE CRUD FUNCTIONS ---

export async function readDocuments(): Promise<ExpenseDocument[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const client = await getAdminClient();
    const { data, error } = await client.from('finance_documents').select('data');
    if (error) throw error;
    return (data || []).map(item => item.data as ExpenseDocument);
  } catch (e: any) {
    console.error("[FinanceStore] readDocuments error:", e.message);
    throw new Error(`Gagal membaca daftar dokumen: ${e.message}`);
  }
}

export async function readRFPs(): Promise<RequestForPayment[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const client = await getAdminClient();
    const { data, error } = await client.from('finance_rfps').select('data');
    if (error) throw error;
    return (data || []).map(item => item.data as RequestForPayment);
  } catch (e: any) {
    console.error("[FinanceStore] readRFPs error:", e.message);
    throw new Error(`Gagal membaca daftar RFP: ${e.message}`);
  }
}

export async function createDocument(doc: ExpenseDocument, maxRetries = 3): Promise<ExpenseDocument> {
  if (!isSupabaseConfigured()) throw new Error("Database not configured");
  
  const client = await getAdminClient();
  let attempt = 0;
  let currentDoc = { ...doc };

  while (attempt <= maxRetries) {
    const { error } = await client.from('finance_documents').insert({ 
      id: currentDoc.id, 
      data: currentDoc 
    });

    if (!error) return currentDoc;

    if (error.code === '23505' && attempt < maxRetries) {
      attempt++;
      console.warn(`[FinanceStore] Race condition detected for ID ${currentDoc.id}. Retry ${attempt}/${maxRetries}`);
      currentDoc.id = incrementSequence(currentDoc.id);
      await new Promise(r => setTimeout(r, 150));
      continue;
    }
    throw new Error(`Gagal membuat dokumen (DB Error ${error.code}): ${error.message}`);
  }
  throw new Error("DATABASE_CONCURRENCY_ERROR: Gagal membuat nomor dokumen unik setelah 3x mencoba.");
}

export async function updateDocument(doc: ExpenseDocument): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error("Database not configured");
  
  const client = await getAdminClient();
  const { error, count } = await client
    .from('finance_documents')
    .update({ data: doc }, { count: 'exact' })
    .eq('id', doc.id);

  if (error) throw error;
  if (count === 0) {
    throw new Error(`Dokumen dengan id ${doc.id} tidak ditemukan di database`);
  }
}

export async function createRFP(rfp: RequestForPayment): Promise<RequestForPayment> {
  if (!isSupabaseConfigured()) throw new Error("Database not configured");
  
  const client = await getAdminClient();
  // RFP ID menggunakan random suffix, risiko kolisi rendah, tapi tetap gunakan insert
  const { error } = await client.from('finance_rfps').insert({ 
    id: rfp.id, 
    data: rfp 
  });

  if (error) throw new Error(`Gagal membuat RFP: ${error.message}`);
  return rfp;
}

export async function updateRFP(rfp: RequestForPayment): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error("Database not configured");
  
  const client = await getAdminClient();
  const { error, count } = await client
    .from('finance_rfps')
    .update({ data: rfp }, { count: 'exact' })
    .eq('id', rfp.id);

  if (error) throw error;
  if (count === 0) {
    throw new Error(`RFP dengan id ${rfp.id} tidak ditemukan di database`);
  }
}

export async function deleteDocument(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const client = await getAdminClient();
    const { error } = await client.from('finance_documents').delete().eq('id', id);
    if (error) throw error;
  } catch (e: any) {
    console.error("[FinanceStore] deleteDocument error:", e.message);
    throw new Error(`Gagal menghapus dokumen: ${e.message}`);
  }
}

export async function deleteRFP(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const client = await getAdminClient();
    const { error } = await client.from('finance_rfps').delete().eq('id', id);
    if (error) throw error;
  } catch (e: any) {
    console.error("[FinanceStore] deleteRFP error:", e.message);
    throw new Error(`Gagal menghapus RFP: ${e.message}`);
  }
}

// --- DASHBOARD DATA ---

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
