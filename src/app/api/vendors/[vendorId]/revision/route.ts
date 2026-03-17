import { NextRequest, NextResponse } from "next/server";

import { requestVendorRevision } from "@/lib/vendor/store";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ vendorId: string }> },
) {
  const { vendorId } = await context.params;
  const body = (await request.json()) as {
    generalNote?: string;
    items?: { fieldKey: string; label: string; note: string; section: "identity" | "contact" | "documents" | "finance" | "services" }[];
  };

  if (!body.items || body.items.length === 0) {
    return NextResponse.json({ error: "At least one revision item is required." }, { status: 400 });
  }

  try {
    const revision = await requestVendorRevision(vendorId, {
      generalNote: String(body.generalNote ?? "").trim(),
      items: body.items,
    });
    return NextResponse.json({ revision });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to request revision." },
      { status: 400 },
    );
  }
}

