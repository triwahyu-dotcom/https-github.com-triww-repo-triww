import { NextResponse } from "next/server";
import { getJsonClients, updateJsonClient } from "@/lib/project/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const clients = await getJsonClients();
  return NextResponse.json(clients);
}

export async function POST(req: Request) {
  try {
    const newClient = await req.json();
    
    if (!newClient.id) {
      newClient.id = newClient.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    }
    
    await updateJsonClient(newClient);
    return NextResponse.json({ success: true, client: newClient });
  } catch (err: unknown) {
    console.error("API POST clients error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const updatedClient = await req.json();
    await updateJsonClient(updatedClient);
    return NextResponse.json({ success: true, client: updatedClient });
  } catch (err: unknown) {
    console.error("API PUT clients error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
