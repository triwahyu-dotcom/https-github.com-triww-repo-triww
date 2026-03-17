import Link from "next/link";

export default function Home() {
  return (
    <main className="hub-shell">
      <section className="hub-hero">
        <p className="hub-kicker">JUARA Workspace</p>
        <h1>Projects and vendors in one workspace</h1>
        <p>
          Manage event pipeline, vendor onboarding, and vendor assignment from one app. Choose the module
          you want to open.
        </p>
      </section>

      <section className="hub-grid">
        <Link className="hub-card" href="/crm">
          <span style={{ color: "#5b8cff" }}>Customers</span>
          <strong>CRM Dashboard</strong>
          <p>Manage client relationships, portfolio value, and key contacts across your workspace.</p>
        </Link>
        <Link className="hub-card" href="/projects">
          <span>Projects</span>
          <strong>Project Tracker</strong>
          <p>Track client pipeline, stages, deliverables, and assign vendors to active projects.</p>
        </Link>
        <Link className="hub-card" href="/vendors">
          <span>Vendors</span>
          <strong>Vendor Management</strong>
          <p>Review vendor submissions, social links, WhatsApp contact, and see where each vendor is used.</p>
        </Link>
        <Link className="hub-card" href="/vendor/register">
          <span>Portal</span>
          <strong>Vendor Self Registration</strong>
          <p>Share this page with vendors so they can submit their profile and documents independently.</p>
        </Link>
        <Link className="hub-card" href="/vendor/status">
          <span>Status</span>
          <strong>Vendor Submission Status</strong>
          <p>Vendors can check registration progress, review status, and missing documents with their code.</p>
        </Link>
      </section>
    </main>
  );
}
