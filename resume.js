import { apiFetch, esc } from '../api.js';

export async function renderResume(container, slug) {
  container.innerHTML = `<div class="card">Generating resume...</div>`;
  try {
    const data = await apiFetch(`/api/discovery/students/${encodeURIComponent(slug)}`);
    const { user, profile, skills, academics, projects, certificates, activities } = data;

    let template = 'modern';
    let showGpa = true;
    let showCerts = true;
    let showActivities = true;

    function draw() {
      container.innerHTML = `
        <div class="stack">
          <div class="card row-between no-print">
            <div class="row">
              <a href="#portfolio/${esc(slug)}" class="btn btn-outline btn-sm">← Back to Portfolio</a>
              <select id="resumeTemplate" style="width: auto;">
                <option value="modern" ${template === 'modern' ? 'selected' : ''}>Modern Tech Template</option>
                <option value="classic" ${template === 'classic' ? 'selected' : ''}>Classic Academic Template</option>
              </select>
              <label style="display:flex;align-items:center;gap:5px;font-size:0.85rem;">
                <input type="checkbox" id="optGpa" ${showGpa ? 'checked' : ''} style="width:auto;" /> GPA
              </label>
              <label style="display:flex;align-items:center;gap:5px;font-size:0.85rem;">
                <input type="checkbox" id="optCerts" ${showCerts ? 'checked' : ''} style="width:auto;" /> Certificates
              </label>
              <label style="display:flex;align-items:center;gap:5px;font-size:0.85rem;">
                <input type="checkbox" id="optAct" ${showActivities ? 'checked' : ''} style="width:auto;" /> Activities
              </label>
            </div>
            <button type="button" id="printResumeBtn" class="btn btn-primary">Print / Save as PDF</button>
          </div>

          <article class="resume-sheet template-${template}">
            <header style="border-bottom: 2px solid #0f172a; padding-bottom: 12px;">
              <h1 style="font-size: 1.9rem; margin: 0;">${esc(user.full_name)}</h1>
              <div style="font-size: 1rem; color: #4f46e5; font-weight: 600; margin-top: 2px;">${esc(profile.headline || '')}</div>
              <div style="font-size: 0.85rem; color: #475569; margin-top: 6px;">
                ${esc(user.email)}
                ${profile.location ? ` • ${esc(profile.location)}` : ''}
                ${profile.github_url ? ` • ${esc(profile.github_url)}` : ''}
                ${profile.linkedin_url ? ` • ${esc(profile.linkedin_url)}` : ''}
              </div>
            </header>

            ${
              profile.bio
                ? `<section class="resume-section">
                    <h2 class="resume-section-title">Summary</h2>
                    <p style="margin: 0; font-size: 0.92rem;">${esc(profile.bio)}</p>
                  </section>`
                : ''
            }

            <section class="resume-section">
              <h2 class="resume-section-title">Education</h2>
              ${academics
                .map(
                  (a) => `
                <div class="resume-item">
                  <div style="display:flex; justify-content:space-between; font-weight:700; font-size:0.94rem;">
                    <span>${esc(a.institution)} — ${esc(a.degree)} ${a.field_of_study ? `(${esc(a.field_of_study)})` : ''}</span>
                    <span>${esc(a.start_year)} – ${esc(a.end_year || 'Present')}</span>
                  </div>
                  <div style="font-size: 0.86rem; color: #475569;">
                    ${showGpa && a.grade ? `Grade: ${esc(a.grade)}` : ''}
                    ${a.honors ? ` • Honors: ${esc(a.honors)}` : ''}
                  </div>
                  ${a.description ? `<div style="font-size: 0.85rem; margin-top: 2px;">${esc(a.description)}</div>` : ''}
                </div>
              `
                )
                .join('')}
            </section>

            <section class="resume-section">
              <h2 class="resume-section-title">Skills</h2>
              <p style="margin: 0; font-size: 0.9rem;">
                ${skills.map((s) => `<strong>${esc(s.name)}</strong>`).join(' • ')}
              </p>
            </section>

            <section class="resume-section">
              <h2 class="resume-section-title">Projects</h2>
              ${projects
                .map(
                  (p) => `
                <div class="resume-item">
                  <div style="display:flex; justify-content:space-between; font-weight:700; font-size:0.94rem;">
                    <span>${esc(p.title)}</span>
                    <span style="font-weight: 500; font-size: 0.84rem; color: #475569;">${esc(p.completed_date || '')}</span>
                  </div>
                  ${p.tech_stack ? `<div style="font-size: 0.82rem; color: #4f46e5;">Tech: ${esc(p.tech_stack)}</div>` : ''}
                  <div style="font-size: 0.88rem; margin-top: 2px;">${esc(p.summary || '')} ${esc(p.description || '')}</div>
                </div>
              `
                )
                .join('')}
            </section>

            ${
              showCerts && certificates.length > 0
                ? `<section class="resume-section">
                    <h2 class="resume-section-title">Verified Certifications</h2>
                    ${certificates
                      .map(
                        (c) => `
                      <div class="resume-item" style="display:flex; justify-content:space-between; font-size:0.88rem;">
                        <span><strong>${esc(c.title)}</strong> — ${esc(c.issuer)} (${esc(c.credential_id)})</span>
                        <span>${esc(c.issue_date)} [${esc(c.status.toUpperCase())}]</span>
                      </div>
                    `
                      )
                      .join('')}
                  </section>`
                : ''
            }

            ${
              showActivities && activities.length > 0
                ? `<section class="resume-section">
                    <h2 class="resume-section-title">Leadership &amp; Extracurricular Activities</h2>
                    ${activities
                      .map(
                        (act) => `
                      <div class="resume-item" style="font-size: 0.88rem;">
                        <strong>${esc(act.title)}</strong> — ${esc(act.organization)} ${act.role ? `(${esc(act.role)})` : ''}
                        ${act.impact ? `<div>${esc(act.impact)}</div>` : ''}
                      </div>
                    `
                      )
                      .join('')}
                  </section>`
                : ''
            }
          </article>
        </div>
      `;

      document.getElementById('resumeTemplate').addEventListener('change', (e) => {
        template = e.target.value;
        draw();
      });
      document.getElementById('optGpa').addEventListener('change', (e) => {
        showGpa = e.target.checked;
        draw();
      });
      document.getElementById('optCerts').addEventListener('change', (e) => {
        showCerts = e.target.checked;
        draw();
      });
      document.getElementById('optAct').addEventListener('change', (e) => {
        showActivities = e.target.checked;
        draw();
      });
      document.getElementById('printResumeBtn').addEventListener('click', () => window.print());
    }

    draw();
  } catch (err) {
    container.innerHTML = `<div class="card">Could not generate resume: ${esc(err.message)}</div>`;
  }
}
