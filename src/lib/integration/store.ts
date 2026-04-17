import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

import { ProjectVendorLink, ProjectVendorShortlist } from "@/lib/integration/types";
import { appendVendorAuditEntry } from "@/lib/vendor/ops-store";

const DATA_DIR = path.join(process.cwd(), "data");
const LINKS_PATH = path.join(DATA_DIR, "project-vendor-links.json");
const SHORTLISTS_PATH = path.join(DATA_DIR, "project-vendor-shortlists.json");

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function getProjectVendorLinks(): Promise<ProjectVendorLink[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase!.from('project_vendor_links').select('data');
    if (!error && data) return data.map(item => item.data as ProjectVendorLink);
  }

  await ensureDataDir();
  if (!existsSync(LINKS_PATH)) return [];
  const content = await readFile(LINKS_PATH, "utf8");
  return JSON.parse(content) as ProjectVendorLink[];
}

async function writeProjectVendorLinks(links: ProjectVendorLink[]) {
  if (isSupabaseConfigured()) {
    // upsert each link individually
    for (const link of links) {
      await supabase!.from('project_vendor_links').upsert({ id: link.id, data: link });
    }
    return;
  }

  await ensureDataDir();
  await writeFile(LINKS_PATH, JSON.stringify(links, null, 2));
}

export async function getProjectVendorShortlists(): Promise<ProjectVendorShortlist[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase!.from('project_vendor_shortlists').select('data');
    if (!error && data) return data.map(item => item.data as ProjectVendorShortlist);
  }

  await ensureDataDir();
  if (!existsSync(SHORTLISTS_PATH)) return [];
  const content = await readFile(SHORTLISTS_PATH, "utf8");
  return JSON.parse(content) as ProjectVendorShortlist[];
}

async function writeProjectVendorShortlists(shortlists: ProjectVendorShortlist[]) {
  if (isSupabaseConfigured()) {
    for (const item of shortlists) {
      await supabase!.from('project_vendor_shortlists').upsert({ id: item.id, data: item });
    }
    return;
  }

  await ensureDataDir();
  await writeFile(SHORTLISTS_PATH, JSON.stringify(shortlists, null, 2));
}

export async function assignVendorToProject(projectId: string, vendorId: string, note = "") {
  const links = await getProjectVendorLinks();
  const existing = links.find((link) => link.projectId === projectId && link.vendorId === vendorId);

  if (existing) {
    return existing;
  }

  const link: ProjectVendorLink = {
    id: randomUUID(),
    projectId,
    vendorId,
    assignedAt: new Date().toISOString(),
    note: note.trim(),
  };

  links.push(link);
  await writeProjectVendorLinks(links);
  await appendVendorAuditEntry(vendorId, "assigned_to_project", `Vendor assigned to project ${projectId}.`);

  return link;
}

export async function removeVendorFromProject(linkId: string) {
  const links = await getProjectVendorLinks();
  const removed = links.find((link) => link.id === linkId);
  const nextLinks = links.filter((link) => link.id !== linkId);
  await writeProjectVendorLinks(nextLinks);
  if (removed) {
    await appendVendorAuditEntry(removed.vendorId, "removed_from_project", `Vendor removed from project ${removed.projectId}.`);
  }
}

export async function shortlistVendorForProject(
  projectId: string,
  vendorId: string,
  serviceLine: string,
  note = "",
  quotedPrice = 0,
) {
  const shortlists = await getProjectVendorShortlists();
  const existing = shortlists.find((item) => item.projectId === projectId && item.vendorId === vendorId);

  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const shortlist: ProjectVendorShortlist = {
    id: randomUUID(),
    projectId,
    vendorId,
    serviceLine: serviceLine.trim(),
    status: "shortlisted",
    note: note.trim(),
    quotedPrice,
    createdAt: now,
    updatedAt: now,
  };

  shortlists.push(shortlist);
  await writeProjectVendorShortlists(shortlists);
  await appendVendorAuditEntry(vendorId, "shortlisted", `Vendor shortlisted for project ${projectId}.`);

  return shortlist;
}

export async function updateProjectVendorShortlist(
  shortlistId: string,
  patch: Partial<Pick<ProjectVendorShortlist, "status" | "note" | "quotedPrice">>,
) {
  const shortlists = await getProjectVendorShortlists();
  const shortlist = shortlists.find((item) => item.id === shortlistId);
  if (!shortlist) {
    throw new Error("Shortlist not found");
  }

  if (patch.status) shortlist.status = patch.status;
  if (patch.note !== undefined) shortlist.note = patch.note;
  if (patch.quotedPrice !== undefined) shortlist.quotedPrice = patch.quotedPrice;
  shortlist.updatedAt = new Date().toISOString();

  await writeProjectVendorShortlists(shortlists);
  await appendVendorAuditEntry(
    shortlist.vendorId,
    "shortlist_updated",
    `Shortlist for project ${shortlist.projectId} updated to ${shortlist.status}.`,
  );

  return shortlist;
}

export async function removeVendorShortlist(shortlistId: string) {
  const shortlists = await getProjectVendorShortlists();
  const shortlist = shortlists.find((item) => item.id === shortlistId);
  const next = shortlists.filter((item) => item.id !== shortlistId);
  await writeProjectVendorShortlists(next);

  if (shortlist) {
    await appendVendorAuditEntry(shortlist.vendorId, "shortlist_removed", `Shortlist removed from project ${shortlist.projectId}.`);
  }
}
