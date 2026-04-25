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
          <span style={{ color: "var(--blue)" }}>Customers</span>
          <strong>CRM Dashboard</strong>
          <p>Manage client relationships, portfolio value, and key contacts.</p>
        </Link>
        <Link className="hub-card" href="/projects">
          <span style={{ color: "var(--green)" }}>Projects</span>
          <strong>Project Tracker</strong>
          <p>Track event pipelines, document centralization, and stages.</p>
        </Link>
        <Link className="hub-card" href="/vendors">
          <span style={{ color: "var(--slate)" }}>Procurement</span>
          <strong>Vendor Database</strong>
          <p>Review vendor submissions, social links, and assignment history.</p>
        </Link>
        <Link className="hub-card" href="/finance">
          <span style={{ color: "var(--amber)" }}>Finance</span>
          <strong>Finance Operations</strong>
          <p>Generate POs with custom numbering, track payments, and reporting.</p>
        </Link>
        <Link className="hub-card" href="/manpower/freelancer">
          <span style={{ color: "var(--purple)" }}>Talent</span>
          <strong>Man Power</strong>
          <p>Database of 90+ verified freelancers, technicians, and crew members.</p>
        </Link>
        <Link className="hub-card" href="/docs">
          <span style={{ color: "var(--blue)" }}>AI Tools</span>
          <strong>Document Center</strong>
          <p>Extract data from Budget (Excel), Invoices, and RFP automatically.</p>
        </Link>
        <Link className="hub-card" href="/vendor/register">
          <span>Portal</span>
          <strong>Vendor Self Registration</strong>
          <p>Public intake form for vendors to submit profiles independently.</p>
        </Link>
        <Link className="hub-card" href="/vendor/status">
          <span>Status</span>
          <strong>Vendor Submission Status</strong>
          <p>Check registration progress and review missing documents.</p>
        </Link>
      </section>
    </main>
  );
}
