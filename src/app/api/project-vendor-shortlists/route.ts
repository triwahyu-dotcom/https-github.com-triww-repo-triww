import { NextRequest, NextResponse } from "next/server";

import {
  removeVendorShortlist,
  shortlistVendorForProject,
  updateProjectVendorShortlist,
} from "@/lib/integration/store";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    projectId?: string;
    vendorId?: string;
    serviceLine?: string;
    note?: string;
    quotedPrice?: number;
  };

  if (!body.projectId || !body.vendorId) {
    return NextResponse.json({ error: "projectId and vendorId are required." }, { status: 400 });
  }

  const shortlist = await shortlistVendorForProject(
    body.projectId,
    body.vendorId,
    body.serviceLine ?? "",
    body.note ?? "",
    Number(body.quotedPrice ?? 0),
  );

  return NextResponse.json({ shortlist });
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as {
    shortlistId?: string;
    status?: "shortlisted" | "contacted" | "quoted" | "selected";
    note?: string;
    quotedPrice?: number;
  };

  if (!body.shortlistId) {
    return NextResponse.json({ error: "shortlistId is required." }, { status: 400 });
  }

  const shortlist = await updateProjectVendorShortlist(body.shortlistId, {
    status: body.status,
    note: body.note,
    quotedPrice: body.quotedPrice !== undefined ? Number(body.quotedPrice) : undefined,
  });

  return NextResponse.json({ shortlist });
}

export async function DELETE(request: NextRequest) {
  const body = (await request.json()) as { shortlistId?: string };

  if (!body.shortlistId) {
    return NextResponse.json({ error: "shortlistId is required." }, { status: 400 });
  }

  await removeVendorShortlist(body.shortlistId);
  return NextResponse.json({ ok: true });
}

