import { NextResponse } from "next/server";
import { deleteJsonProject } from "@/lib/project/store";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing project ID" }, { status: 400 });
    }

    await deleteJsonProject(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("API DELETE project error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
