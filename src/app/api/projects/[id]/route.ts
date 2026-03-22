import { NextResponse } from "next/server";
import { deleteJsonProject } from "@/lib/project/store";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing project ID" }, { status: 400 });
    }

    await deleteJsonProject(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("API DELETE project error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
