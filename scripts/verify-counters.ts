import { getDashboardData } from "./src/lib/vendor/store";

async function testCounters() {
  const data = await getDashboardData();
  const vendors = data.vendorDetails.map(v => {
      const isGoods = v.relationshipType 
        ? v.relationshipType === "vendor_supply" 
        : (v.classification === "Penyedia Barang");
      return { ...v, category: isGoods ? "PENYEDIA BARANG" : "PENYEDIA JASA" };
  });

  const jasa = vendors.filter(v => v.category === "PENYEDIA JASA").length;
  const barang = vendors.filter(v => v.category === "PENYEDIA BARANG").length;
  const approved = vendors.filter(v => v.reviewStatus === "approved").length;

  console.log("Audit Counter Results:");
  console.log(`Total Vendors: ${vendors.length}`);
  console.log(`Penyedia Jasa: ${jasa}`);
  console.log(`Penyedia Barang: ${barang}`);
  console.log(`Approved: ${approved}`);
  console.log(`Sum (Jasa + Barang): ${jasa + barang}`);
}

testCounters().catch(console.error);
