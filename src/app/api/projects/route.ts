import { NextResponse } from "next/server";
import { getJsonProjects, updateJsonProject } from "@/lib/project/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const projects = await getJsonProjects();
  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  try {
    const project = await req.json();
    
    // Normalize before saving to ensure ID and all fields are present
    const normalized = await updateJsonProject(project);
    
    return NextResponse.json({ success: true, project: normalized });
  } catch (err: unknown) {
    console.error("API POST projects error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const project = await req.json();
    
    // Normalize before saving
    const normalized = await updateJsonProject(project);
    
    return NextResponse.json({ success: true, project: normalized });
  } catch (err: unknown) {
    console.error("API PUT projects error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
