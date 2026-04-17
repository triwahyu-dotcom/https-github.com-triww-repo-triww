import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getJsonClients, updateJsonClient, deleteJsonClient } from "@/lib/project/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const clients = await getJsonClients();
  return NextResponse.json(clients);
}

export async function POST(req: Request) {
  try {
    const newClient = await req.json();
    const normalized = await updateJsonClient(newClient);
    
    // Force Next.js to re-fetch data for the dashboard
    revalidatePath("/crm");
    revalidatePath("/projects");
    
    return NextResponse.json({ success: true, client: normalized });
  } catch (err: unknown) {
    console.error("API POST clients error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const updatedClient = await req.json();
    const normalized = await updateJsonClient(updatedClient);
    
    // Force Next.js to re-fetch data for the dashboard
    revalidatePath("/crm");
    revalidatePath("/projects");

    return NextResponse.json({ success: true, client: normalized });
  } catch (err: unknown) {
    console.error("API PUT clients error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "Missing ID" }, { status: 400 });

    await deleteJsonClient(id);
    
    // Force Next.js to re-fetch data for the dashboard
    revalidatePath("/crm");
    revalidatePath("/projects");

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("API DELETE clients error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
