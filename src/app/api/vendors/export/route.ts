import { NextResponse } from "next/server";

import { exportVendorsCsv } from "@/lib/vendor/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const csv = await exportVendorsCsv({
    search: searchParams.get("search") ?? undefined,
    service: searchParams.get("service") ?? undefined,
    location: searchParams.get("location") ?? undefined,
    reviewStatus: (searchParams.get("reviewStatus") as
      | "new"
      | "in_review"
      | "approved"
      | "rejected"
      | "needs_revision"
      | null) ?? undefined,
    classification: (searchParams.get("classification") as "manpower" | "goods" | "services" | null) ?? undefined,
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="vendors-export.csv"',
    },
  });
}
