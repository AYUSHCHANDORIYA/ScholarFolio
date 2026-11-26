import { apiFetch, esc, renderAvatar, showToast } from '../api.js';

export async function renderPortfolio(container, slug, currentUser) {
  container.innerHTML = `<div class="card">Loading portfolio...</div>`;
  try {
    const data = await apiFetch(`/api/discovery/students/${encodeURIComponent(slug)}`);
    const { user, profile, skills, academics, projects, certificates, activities, endorsements } = data;
    const verifiedCount = certificates.filter((c) => c.status === 'verified').length;

    container.innerHTML = `
      <div class="stack">
        <section class="card">
          <div class="row-between" style="align-items: flex-start;">
            <div class="row" style="align-items: flex-start; gap: 18px;">
              ${renderAvatar(user.full_name, profile.avatar_url, true)}
              <div class="stack" style="gap: 6px;">
                <div class="row">
                  <h1 style="font-size: 1.7rem;">${esc(user.full_name)}</h1>
                  ${verifiedCount > 0 ? `<span class="badge badge-verified">✓ ${verifiedCount} Verified Credentials</span>` : ''}
                </div>
                <div style="font-weight: 600; color: var(--primary);">${esc(profile.headline || 'Student Portfolio')}</div>
                <div class="muted" style="font-size: 0.9rem;">
                  ${esc(profile.university || '')}
                  ${profile.department ? ` • ${esc(profile.department)}` : ''}
                  ${profile.graduation_year ? ` • Class of ${esc(profile.graduation_year)}` : ''}
                  ${profile.location ? ` • ${esc(profile.location)}` : ''}
                </div>
                <div class="row" style="gap: 10px; margin-top: 4px;">
                  ${profile.gpa ? `<span class="badge">CGPA: ${esc(profile.gpa)}</span>` : ''}
                  ${profile.github_url ? `<a href="${esc(profile.github_url)}" target="_blank" rel="noopener" class="btn btn-outline btn-xs">GitHub ↗</a>` : ''}
                  ${profile.linkedin_url ? `<a href="${esc(profile.linkedin_url)}" target="_blank" rel="noopener" class="btn btn-outline btn-xs">LinkedIn ↗</a>` : ''}
                  ${profile.website_url ? `<a href="${esc(profile.website_url)}" target="_blank" rel="noopener" class="btn btn-outline btn-xs">Website ↗</a>` : ''}
                </div>
              </div>
            </div>
            <div class="row">
              <a href="#resume/${esc(profile.slug)}" class="btn btn-primary">Generate Resume / PDF</a>
              <button type="button" id="copyPortfolioLink" class="btn btn-outline">Copy Link</button>
            </div>
          </div>
          ${profile.bio ? `<p style="margin: 16px 0 0; color: var(--text-muted);">${esc(profile.bio)}</p>` : ''}
        </section>

        <div class="grid-2" style="align-items: start;">
          <section class="card stack">
            <h2>Skills &amp; Competencies</h2>
            ${
              skills.length === 0
                ? `<p class="muted">No skills listed yet.</p>`
                : skills
                    .map(
                      (s) => `
                  <div>
                    <div class="row-between" style="font-size: 0.88rem; margin-bottom: 4px;">
                      <span><strong>${esc(s.name)}</strong> <span class="muted">(${esc(s.category)})</span></span>
                      <span class="muted">${esc(s.proficiency)}%</span>
                    </div>
                    <div class="progress-track">
                      <div class="progress-fill" style="width: ${Number(s.proficiency)}%;"></div>
                    </div>
                  </div>
                `
                    )
                    .join('')
            }
          </section>

          <section class="card stack">
            <h2>Academic Achievements</h2>
            ${
              academics.length === 0
                ? `<p class="muted">No academic records added yet.</p>`
                : academics
                    .map(
                      (a) => `
                  <div style="border-left: 3px solid var(--primary); padding-left: 12px;">
                    <div class="row-between">
                      <strong>${esc(a.degree)} ${a.field_of_study ? `in ${esc(a.field_of_study)}` : ''}</strong>
                      <span class="badge">${esc(a.start_year)} – ${esc(a.end_year || 'Present')}</span>
                    </div>
                    <div class="muted" style="font-size: 0.88rem;">${esc(a.institution)} ${a.grade ? `• ${esc(a.grade)}` : ''}</div>
                    ${a.honors ? `<div style="font-size: 0.85rem; color: var(--success); font-weight: 600; margin-top: 2px;">🏆 ${esc(a.honors)}</div>` : ''}
                    ${a.description ? `<p class="muted" style="font-size: 0.85rem; margin: 4px 0 0;">${esc(a.description)}</p>` : ''}
                  </div>
                `
                    )
                    .join('')
            }
          </section>
        </div>

        <section class="card stack">
          <h2>Featured &amp; Academic Projects (${projects.length})</h2>
          ${
            projects.length === 0
              ? `<p class="muted">No projects showcased yet.</p>`
              : `<div class="grid-2">
                ${projects
                  .map(
                    (p) => `
                  <article class="card stack" style="box-shadow: none; background: var(--surface-alt);">
                    ${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.title)}" style="width:100%; height:160px; object-fit:cover; border-radius:8px;" />` : ''}
                    <div class="row-between">
                      <h3 style="font-size: 1.05rem;">${esc(p.title)}</h3>
                      ${p.featured ? `<span class="badge badge-primary">Featured</span>` : ''}
                    </div>
                    <p style="margin: 0; font-size: 0.9rem;">${esc(p.summary || p.description)}</p>
                    ${p.description && p.summary ? `<p class="muted" style="margin: 0; font-size: 0.84rem;">${esc(p.description)}</p>` : ''}
                    <div class="row" style="gap: 6px;">
                      ${String(p.tech_stack || '')
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean)
                        .map((t) => `<span class="badge">${esc(t)}</span>`)
                        .join('')}
                    </div>
                    <div class="row" style="margin-top: auto;">
                      ${p.repo_url ? `<a href="${esc(p.repo_url)}" target="_blank" rel="noopener" class="btn btn-outline btn-xs">Source Code ↗</a>` : ''}
                      ${p.live_url ? `<a href="${esc(p.live_url)}" target="_blank" rel="noopener" class="btn btn-primary btn-xs">Live Demo ↗</a>` : ''}
                      ${p.completed_date ? `<span class="muted" style="font-size: 0.78rem; margin-left: auto;">${esc(p.completed_date)}</span>` : ''}
                    </div>
                  </article>
                `
                  )
                  .join('')}
              </div>`
          }
        </section>

        <section class="card stack">
          <h2>Certificates &amp; Verifiable Credentials (${certificates.length})</h2>
          ${
            certificates.length === 0
              ? `<p class="muted">No certificates uploaded yet.</p>`
              : `<div class="grid-2">
                ${certificates
                  .map(
                    (c) => `
                  <div class="card stack" style="box-shadow: none;">
                    <div class="row-between">
                      <strong>${esc(c.title)}</strong>
                      <span class="badge badge-${esc(c.status)}">${esc(c.status.toUpperCase())}</span>
                    </div>
                    <div class="muted" style="font-size: 0.86rem;">Issued by <strong>${esc(c.issuer)}</strong> • ${esc(c.issue_date)}</div>
                    ${c.description ? `<p class="muted" style="margin: 0; font-size: 0.84rem;">${esc(c.description)}</p>` : ''}
                    <div class="row-between" style="font-size: 0.82rem; padding-top: 6px; border-top: 1px solid var(--border);">
                      <span>ID: <a href="#verify/${esc(c.credential_id)}" class="code-mono">${esc(c.credential_id)}</a></span>
                      <div class="row" style="gap: 6px;">
                        ${c.file_url ? `<a href="${esc(c.file_url)}" target="_blank" class="btn btn-ghost btn-xs">Attachment</a>` : ''}
                        <a href="#verify/${esc(c.credential_id)}" class="btn btn-outline btn-xs">Verify</a>
                      </div>
                    </div>
                  </div>
                `
                  )
                  .join('')}
              </div>`
          }
        </section>

        <div class="grid-2" style="align-items: start;">
          <section class="card stack">
            <h2>Extracurricular Activities</h2>
            ${
              activities.length === 0
                ? `<p class="muted">No extracurricular activities listed.</p>`
                : activities
                    .map(
                      (act) => `
                  <div style="border-bottom: 1px solid var(--border); padding-bottom: 10px;">
                    <div class="row-between">
                      <strong>${esc(act.title)}</strong>
                      <span class="badge">${esc(act.category)}</span>
                    </div>
                    <div class="muted" style="font-size: 0.86rem;">${esc(act.organization)} ${act.role ? `• ${esc(act.role)}` : ''}</div>
                    ${act.impact ? `<div style="font-size: 0.85rem; color: var(--primary); margin-top: 2px;">Impact: ${esc(act.impact)}</div>` : ''}
                    ${act.description ? `<p class="muted" style="font-size: 0.84rem; margin: 4px 0 0;">${esc(act.description)}</p>` : ''}
                  </div>
                `
                    )
                    .join('')
            }
          </section>

          <section class="card stack">
            <h2>Faculty &amp; Evaluator Endorsements</h2>
            ${
              endorsements.length === 0
                ? `<p class="muted">No endorsements yet.</p>`
                : endorsements
                    .map(
                      (en) => `
                  <div style="background: var(--surface-alt); padding: 12px; border-radius: 8px;">
                    <div class="row-between">
                      <strong>${esc(en.evaluator_name)}</strong>
                      <span>${'★'.repeat(en.rating)}${'☆'.repeat(5 - en.rating)}</span>
                    </div>
                    <div class="muted" style="font-size: 0.8rem;">${esc(en.evaluator_role)}</div>
                    <p style="margin: 6px 0 0; font-size: 0.88rem;">"${esc(en.comment)}"</p>
                  </div>
                `
                    )
                    .join('')
            }
            ${
              currentUser && (currentUser.role === 'evaluator' || currentUser.role === 'admin')
                ? `
              <form id="endorseForm" class="stack" style="border-top: 1px solid var(--border); padding-top: 12px;">
                <h4 style="font-size: 0.92rem;">Add Evaluator Endorsement</h4>
                <div class="grid-2">
                  <input type="text" id="endorseRole" placeholder="Your Role (e.g., Dept Chair)" value="Faculty Evaluator" />
                  <select id="endorseRating">
                    <option value="5">5 ★ — Outstanding</option>
                    <option value="4">4 ★ — Strong</option>
                    <option value="3">3 ★ — Good</option>
                  </select>
                </div>
                <textarea id="endorseComment" rows="2" required placeholder="Write evaluation feedback..."></textarea>
                <button type="submit" class="btn btn-primary btn-sm">Submit Endorsement</button>
              </form>
            `
                : ''
            }
          </section>
        </div>
      </div>
    `;

    document.getElementById('copyPortfolioLink').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast('Portfolio URL copied to clipboard!', 'success');
      } catch {
        showToast('Copy the URL from your browser address bar.');
      }
    });

    const endorseForm = document.getElementById('endorseForm');
    if (endorseForm) {
      endorseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await apiFetch(`/api/discovery/students/${encodeURIComponent(slug)}/endorse`, {
            method: 'POST',
            body: JSON.stringify({
              evaluator_role: document.getElementById('endorseRole').value,
              rating: Number(document.getElementById('endorseRating').value),
              comment: document.getElementById('endorseComment').value
            })
          });
          showToast('Endorsement published!', 'success');
          renderPortfolio(container, slug, currentUser);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }
  } catch (err) {
    container.innerHTML = `<div class="card">Could not load portfolio: ${esc(err.message)}</div>`;
  }
}
