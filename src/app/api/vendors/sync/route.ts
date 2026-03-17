import { NextResponse } from "next/server";

import { buildIntegratedDashboards } from "@/lib/integration/view-models";
import { getProjectDashboardData } from "@/lib/project/store";
import { getDashboardData, syncFromSource } from "@/lib/vendor/store";

export async function POST() {
  const { importRun } = await syncFromSource();
  const [projectData, vendorData] = await Promise.all([getProjectDashboardData(), getDashboardData()]);
  const integrated = await buildIntegratedDashboards(projectData, vendorData);

  return NextResponse.json({
    importRun,
    dashboard: integrated.vendorData,
  });
}
