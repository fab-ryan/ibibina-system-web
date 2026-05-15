import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import Link from "next/link";

const chairpersonDuties = [
  "Register new members quickly with complete digital profiles.",
  "Track attendance per meeting and identify participation trends.",
  "Review and approve loans with clear eligibility checkpoints.",
  "Keep secure records to avoid lost books and missing documents.",
  "Use financial history to plan savings cycles and group priorities.",
];

const systemAdminBenefits = [
  "Centralized oversight across multiple IBIBINA groups in one platform.",
  "Accurate activity logs and audit trails for full traceability.",
  "Simplified role management for stronger account and permission security.",
  "Performance analytics for usage trends and operational optimization.",
  "Reliable reporting that supports data-driven system decisions.",
];

function resolveAvailableLogo(): string | null {
  const candidateFiles = [
    "ibibina-logo.png",
    "ibibina-logo.jpg",
    "ibibina-logo.jpeg",
    "ibibina-logo.webp",
    "ibibina-light-logo.png",
    "ibibina-dark-logo.png",
    "logo.png",
  ];

  for (const file of candidateFiles) {
    const absolutePath = path.join(process.cwd(), "public", file);
    if (fs.existsSync(absolutePath)) {
      return `/${file}`;
    }
  }

  return null;
}

export default function Home() {
  const logoSrc = resolveAvailableLogo();

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="hero-orb hero-orb-a" />
        <div className="hero-orb hero-orb-b" />
        <div className="hero-grid" />
      </div>

      <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-12 pt-10 md:px-10 lg:pt-14">
        <header className="fade-up flex flex-col gap-5">
          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-(--ib-line) bg-white/70 px-4 py-2 text-sm backdrop-blur-sm">
            <span className="h-2.5 w-2.5 rounded-full bg-(--ib-accent) shadow-[0_0_0_6px_rgba(11,57,120,0.12)]" />
            IBIBINA Digital Governance Platform
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h1 className="headline text-4xl leading-tight sm:text-5xl lg:text-6xl">
                Manage groups with clarity, security, and trust.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-(--ib-muted) sm:text-lg">
                IBIBINA brings chairperson workflows and system administration
                controls into one modern workspace for registration, attendance,
                loans, auditability, and planning.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link href="/auth" className="ib-btn-primary">
                  Open Auth Portal
                </Link>
                <Link href="/dashboard" className="ib-btn-secondary">
                  View Dashboards
                </Link>
              </div>
            </div>

            <div className="logo-shell pulse-in">
              {logoSrc ? (
                <Image
                  src={logoSrc}
                  alt="IBIBINA logo"
                  width={230}
                  height={230}
                  priority
                  className="h-auto w-45 sm:w-55"
                />
              ) : (
                <div className="logo-fallback">
                  <p>IBIBINA</p>
                  <span>Add your logo to public/ibibina-logo.png</span>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="stagger-in grid gap-4 md:grid-cols-2">
          <article className="panel">
            <p className="panel-tag">Chairperson Workspace</p>
            <h2 className="panel-title">Operational responsibilities made simple</h2>
            <ul className="panel-list">
              {chairpersonDuties.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="panel">
            <p className="panel-tag">System Administration</p>
            <h2 className="panel-title">Oversight across all IBIBINA groups</h2>
            <ul className="panel-list">
              {systemAdminBenefits.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>

        <section className="stagger-in grid gap-4 lg:grid-cols-3">
          <article className="metric-card">
            <p className="metric-value">Real-time</p>
            <p className="metric-label">Transparency that reduces disputes and misunderstandings.</p>
          </article>
          <article className="metric-card">
            <p className="metric-value">Automated</p>
            <p className="metric-label">Documentation and secure records that protect critical data.</p>
          </article>
          <article className="metric-card">
            <p className="metric-value">Insightful</p>
            <p className="metric-label">Financial history and analytics that improve decision-making.</p>
          </article>
        </section>

        <footer className="fade-up mt-2 rounded-2xl border border-(--ib-line) bg-white/80 p-4 text-sm text-(--ib-muted) backdrop-blur-sm sm:text-base">
          Ready to continue? Next step is connecting this interface to modules
          for member registration, attendance records, and loan workflows.
        </footer>
      </section>
    </main>
  );
}
