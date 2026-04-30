import { getProjectVendorLinks, getProjectVendorShortlists } from "@/lib/integration/store";
import { ProjectDashboardData, CRMClient } from "@/lib/project/types";
import { DashboardData } from "@/lib/vendor/types";
import { Freelancer } from "@/app/manpower/freelancer/_types/freelancer";
import { readDocuments } from "@/lib/finance/store";


function normalizePhoneToWhatsApp(phone: string) {
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return digits;
}

export async function buildIntegratedDashboards(
  projectData: ProjectDashboardData, 
  vendorData: DashboardData, 
  freelancerData: Freelancer[] = [],
  clients: CRMClient[] = []
) {
  const [links, shortlists, financeDocs] = await Promise.all([
    getProjectVendorLinks(), 
    getProjectVendorShortlists(),
    readDocuments()
  ]);

  function projectVendorRequirements(project: ProjectDashboardData["projects"][number]) {
    return [
      {
        label: "Service Fit",
        summary: project.serviceLine ? `Prioritaskan vendor dengan layanan ${project.serviceLine}.` : "Pilih vendor sesuai scope project.",
      },
      {
        label: "Coverage",
        summary: project.eventDate ? "Pastikan vendor available pada tanggal event dan area kerja relevan." : "Konfirmasi area dan tanggal kerja.",
      },
      {
        label: "Compliance",
        summary: "Utamakan vendor dengan dokumen valid, tidak expired, dan status lifecycle approved/verified.",
      },
    ];
  }

  const availableVendors = vendorData.vendorDetails.map((vendor) => ({
    id: vendor.id,
    name: vendor.name,
    serviceNames: vendor.serviceNames,
    businessAddress: vendor.businessAddress,
    whatsappPhone: normalizePhoneToWhatsApp(vendor.contacts[0]?.phone || ""),
    averageScore: vendor.performance.average,
    lifecycleStatus: vendor.lifecycleStatus,
  }));

  const availableFreelancers = freelancerData.map((f) => ({
    id: f.id,
    nama: f.nama,
    posisi_utama: f.posisi_utama,
    no_hp: f.no_hp,
    kota_domisili: f.kota_domisili,
  }));

  const projects = projectData.projects.map((project) => ({
    ...project,
    assignedVendors: links
      .filter((link) => link.projectId === project.id)
      .map((link) => {
        const vendor = vendorData.vendorDetails.find((item) => item.id === link.vendorId);
        return vendor
          ? {
              linkId: link.id,
              vendorId: vendor.id,
              vendorName: vendor.name,
              vendorType: vendor.serviceNames[0] || vendor.displayType || "-",
              businessAddress: vendor.businessAddress,
              whatsappPhone: normalizePhoneToWhatsApp(vendor.contacts[0]?.phone || ""),
              averageScore: vendor.performance.average,
            }
          : null;
      })
      .filter((item) => item !== null),
    vendorShortlist: shortlists
      .filter((item) => item.projectId === project.id)
      .map((item) => {
        const vendor = vendorData.vendorDetails.find((entry) => entry.id === item.vendorId);
        return vendor
          ? {
              linkId: item.id,
              vendorId: vendor.id,
              vendorName: vendor.name,
              vendorType: vendor.serviceNames[0] || vendor.displayType || "-",
              businessAddress: vendor.businessAddress,
              whatsappPhone: normalizePhoneToWhatsApp(vendor.contacts[0]?.phone || ""),
              averageScore: vendor.performance.average,
              serviceLine: item.serviceLine,
              status: item.status,
              note: item.note,
              quotedPrice: item.quotedPrice,
            }
          : null;
      })
      .filter((item) => item !== null),
    vendorRequirements: projectVendorRequirements(project),
  }));

  const linkedProjectsByVendor = new Map(
    vendorData.vendorDetails.map((vendor) => [
      vendor.id,
      links
        .filter((link) => link.vendorId === vendor.id)
        .map((link) => {
          const project = projectData.projects.find((item) => item.id === link.projectId);
          return project
            ? {
                linkId: link.id,
                projectId: project.id,
                projectName: project.projectName,
                client: project.client,
                stageLabel: project.currentStageLabel,
              }
            : null;
        })
        .filter((item) => item !== null),
    ]),
  );

  const vendors = vendorData.vendors.map((vendor) => ({
    ...vendor,
    linkedProjects: linkedProjectsByVendor.get(vendor.id) ?? [],
  }));

  const vendorDetails = vendorData.vendorDetails.map((vendor) => {
    const vendorProjects = linkedProjectsByVendor.get(vendor.id) ?? [];
    
    // Attach real finance documents from PO 2026 Excel
    const vendorPOs = financeDocs.filter(doc => 
      doc.vendorName.toLowerCase().trim() === vendor.name.toLowerCase().trim()
    );

    const totalPOAmount = vendorPOs.reduce((sum, po) => sum + po.amount, 0);

    return {
      ...vendor,
      linkedProjects: vendorProjects,
      totalTransactionAmount: totalPOAmount,
      transactionCount: vendorPOs.length,
      auditLog: vendorPOs.map(po => ({
        id: po.id,
        action: 'PO_ISSUED',
        actor: 'Finance System',
        message: `Purchase Order ${po.id.slice(-6).toUpperCase()} issued for amount Rp ${po.amount.toLocaleString('id-ID')}`,
        createdAt: po.issueDate
      }))
    };
  });


  return {
    projectData: {
      ...projectData,
      projects,
      availableVendors,
      availableFreelancers,
      clients,
    },
    vendorData: {
      ...vendorData,
      vendors,
      vendorDetails,
    },
  };
}
