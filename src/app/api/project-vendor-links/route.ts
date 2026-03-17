import { NextRequest, NextResponse } from "next/server";

import { assignVendorToProject, removeVendorFromProject } from "@/lib/integration/store";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    projectId?: string;
    vendorId?: string;
    note?: string;
  };

  if (!body.projectId || !body.vendorId) {
    return NextResponse.json({ error: "projectId and vendorId are required." }, { status: 400 });
  }

  const link = await assignVendorToProject(body.projectId, body.vendorId, body.note ?? "");
  return NextResponse.json({ link });
}

export async function DELETE(request: NextRequest) {
  const body = (await request.json()) as {
    linkId?: string;
  };

  if (!body.linkId) {
    return NextResponse.json({ error: "linkId is required." }, { status: 400 });
  }

  await removeVendorFromProject(body.linkId);
  return NextResponse.json({ ok: true });
}
