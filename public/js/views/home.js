import { apiFetch, esc, renderAvatar } from '../api.js';

export async function renderHome(container) {
  container.innerHTML = `<div class="card">Loading platform overview...</div>`;
  try {
    const [{ stats }, { students }] = await Promise.all([
      apiFetch('/api/discovery/facets'),
      apiFetch('/api/discovery/students?sort=gpa')
    ]);

    const featured = students.slice(0, 3);

    container.innerHTML = `
      <section class="hero">
        <span class="badge badge-primary" style="margin-bottom: 12px;">Digital Student Portfolio &amp; Achievement Showcase</span>
        <h1>Showcase Academic Excellence, Verified Credentials &amp; Real Projects</h1>
        <p>
          Build a unified digital portfolio for your academic milestones, technical skills, projects,
          verifiable certificates, and extracurricular impact. Generate an ATS-ready resume in one click
          and get discovered by recruiters and faculty evaluators.
        </p>
        <div class="row">
          <a href="#discover" class="btn btn-primary">Explore Student Talent</a>
          <a href="#verify" class="btn btn-outline">Verify a Certificate</a>
        </div>
      </section>

      <section class="grid-4" style="margin-bottom: 28px;">
        <div class="card stat-card">
          <div class="stat-value">${stats.total_students}</div>
          <div class="stat-label">Public Student Portfolios</div>
        </div>
        <div class="card stat-card">
          <div class="stat-value">${stats.total_projects}</div>
          <div class="stat-label">Showcased Projects</div>
        </div>
        <div class="card stat-card">
          <div class="stat-value">${stats.verified_certificates}</div>
          <div class="stat-label">Verified Certificates</div>
        </div>
        <div class="card stat-card">
          <div class="stat-value">${stats.unique_skills}</div>
          <div class="stat-label">Indexed Skills</div>
        </div>
      </section>

      <section class="card" style="margin-bottom: 28px;">
        <div class="row-between" style="margin-bottom: 12px;">
          <div>
            <h3>Instant Certificate Verification</h3>
            <p class="muted" style="margin: 4px 0 0; font-size: 0.9rem;">
              Enter a Credential ID (try <code class="code-mono">CERT-2026-8841</code>) to verify authenticity.
            </p>
          </div>
        </div>
        <form id="quickVerifyForm" class="row">
          <input type="text" id="quickVerifyInput" placeholder="Enter Credential ID or SHA-256 hash..." style="flex: 1; min-width: 220px;" required />
          <button type="submit" class="btn btn-primary">Verify Now</button>
        </form>
      </section>

      <section>
        <div class="row-between" style="margin-bottom: 16px;">
          <h2>Featured Student Portfolios</h2>
          <a href="#discover" class="btn btn-outline btn-sm">View All Students →</a>
        </div>
        <div class="grid-3">
          ${featured
            .map(
              (st) => `
            <article class="card stack">
              <div class="row">
                ${renderAvatar(st.full_name, st.avatar_url)}
                <div>
                  <h3 style="font-size: 1.05rem;">${esc(st.full_name)}</h3>
                  <div class="muted" style="font-size: 0.84rem;">${esc(st.department || 'Student')} • ${esc(st.graduation_year || '')}</div>
                </div>
              </div>
              <p style="margin: 0; font-size: 0.9rem; color: var(--text-muted);">${esc(st.headline || st.bio)}</p>
              <div class="row" style="gap: 6px;">
                ${st.skills
                  .slice(0, 4)
                  .map((s) => `<span class="badge badge-primary">${esc(s.name)}</span>`)
                  .join('')}
              </div>
              <div class="row-between" style="margin-top: auto; padding-top: 8px; border-top: 1px solid var(--border); font-size: 0.82rem;">
                <span class="muted">${st.project_count} Projects • ${st.verified_cert_count} Verified Certs</span>
                <a href="#portfolio/${esc(st.slug)}" class="btn btn-outline btn-xs">Open Portfolio</a>
              </div>
            </article>
          `
            )
            .join('')}
        </div>
      </section>
    `;

    document.getElementById('quickVerifyForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const val = document.getElementById('quickVerifyInput').value.trim();
      if (val) {
        window.location.hash = `#verify/${encodeURIComponent(val)}`;
      }
    });
  } catch (err) {
    container.innerHTML = `<div class="card">Error loading home: ${esc(err.message)}</div>`;
  }
}
