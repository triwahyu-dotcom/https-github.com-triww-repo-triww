import { NextResponse } from "next/server";
import { getJsonClients, updateJsonClient } from "@/lib/project/store";

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
  } catch (err: any) {
    console.error("API POST clients error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const updatedClient = await req.json();
    await updateJsonClient(updatedClient);
    return NextResponse.json({ success: true, client: updatedClient });
  } catch (err: any) {
    console.error("API PUT clients error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
