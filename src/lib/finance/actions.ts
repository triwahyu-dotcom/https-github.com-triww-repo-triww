/**
 * Shared client-side actions for the Finance module
 */

export async function updateRFPStatus(rfpId: string, status: string, additionalData: Record<string, any> = {}) {
  try {
    const res = await fetch("/api/finance/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rfpId, status, ...additionalData })
    });
    if (res.ok) {
      window.location.reload();
      return { success: true };
    } else {
      const err = await res.json();
      throw new Error(err.error || "Failed to update status");
    }
  } catch (e: any) {
    console.error("Status update error:", e);
    alert(`Error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

export async function updateDocStatus(docId: string, status: string, additionalData: Record<string, any> = {}) {
  try {
    const res = await fetch("/api/finance/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docId, status, ...additionalData })
    });
    if (res.ok) {
      window.location.reload();
      return { success: true };
    } else {
      const err = await res.json();
      throw new Error(err.error || "Failed to update document status");
    }
  } catch (e: any) {
    console.error("Doc status update error:", e);
    alert(`Error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

