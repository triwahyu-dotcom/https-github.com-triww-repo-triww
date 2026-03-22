import { NextResponse } from "next/server";
import { getJsonProjects, updateJsonProject } from "@/lib/project/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const projects = await getJsonProjects();
  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  try {
    const newProject = await req.json();
    
    if (!newProject.id) {
      newProject.id = Date.now().toString();
    }
    
    await updateJsonProject(newProject);
    return NextResponse.json({ success: true, project: newProject });
  } catch (err: unknown) {
    console.error("API POST projects error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const updatedProject = await req.json();
    await updateJsonProject(updatedProject);
    return NextResponse.json({ success: true, project: updatedProject });
  } catch (err: unknown) {
    console.error("API PUT projects error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
