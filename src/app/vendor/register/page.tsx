import { VendorIntakeForm } from "@/components/vendor-intake-form";
import { getDashboardData } from "@/lib/vendor/store";

export const metadata = {
  title: "Vendor Registration",
};

export default async function VendorRegisterPage() {
  const dashboard = await getDashboardData();

  return <VendorIntakeForm serviceOptions={dashboard.services} />;
}
