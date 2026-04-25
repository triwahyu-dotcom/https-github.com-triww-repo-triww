import { VendorIntakeForm } from "@/components/vendors/VendorIntakeForm";
import { getDashboardData } from "@/lib/vendor/store";

export const metadata = {
  title: "Vendor Registration",
};

export default async function VendorRegisterPage() {
  const dashboard = await getDashboardData();

  return <VendorIntakeForm serviceOptions={dashboard.services} />;
}
