import { apiFetch, esc, renderAvatar } from '../api.js';

export async function renderDiscovery(container) {
  container.innerHTML = `<div class="card">Loading talent directory...</div>`;

  try {
    const facets = await apiFetch('/api/discovery/facets');
    const selectedSkills = new Set();

    container.innerHTML = `
      <div class="stack">
        <div class="row-between">
          <div>
            <h1>Skill-Based Student Discovery</h1>
            <p class="muted" style="margin: 4px 0 0;">Find students by verified skills, academic performance, department, and project experience.</p>
          </div>
        </div>

        <section class="card stack">
          <div class="grid-4">
            <div class="form-group">
              <label for="discQuery">Keyword Search</label>
              <input type="text" id="discQuery" placeholder="Name, skill, bio, university..." />
            </div>
            <div class="form-group">
              <label for="discDept">Department</label>
              <select id="discDept">
                <option value="">All Departments</option>
                ${facets.departments.map((d) => `<option value="${esc(d)}">${esc(d)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="discYear">Graduation Year</label>
              <select id="discYear">
                <option value="">Any Year</option>
                ${facets.graduationYears.map((y) => `<option value="${esc(y)}">${esc(y)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="discSort">Sort By</label>
              <select id="discSort">
                <option value="gpa">Highest GPA</option>
                <option value="projects">Most Projects</option>
                <option value="verified">Most Verified Certificates</option>
              </select>
            </div>
          </div>

          <div class="row-between">
            <div class="row" style="gap: 8px;">
              <label style="display: flex; align-items: center; gap: 6px; font-size: 0.88rem; cursor: pointer;">
                <input type="checkbox" id="discVerifiedOnly" style="width: auto;" />
                Verified Certificate Holders Only
              </label>
              <div class="row" style="gap: 6px; margin-left: 10px;">
                <span class="muted" style="font-size: 0.85rem;">Min GPA:</span>
                <input type="number" id="discMinGpa" step="0.1" min="0" max="10" placeholder="e.g. 8.5" style="width: 95px; padding: 5px 8px;" />
              </div>
            </div>
            <button type="button" id="discResetBtn" class="btn btn-ghost btn-sm">Reset Filters</button>
          </div>

          <div>
            <div class="muted" style="font-size: 0.82rem; font-weight: 600; margin-bottom: 8px;">Filter by Skills:</div>
            <div class="row" id="skillChips" style="gap: 8px;">
              ${facets.skills
                .map(
                  (s) =>
                    `<button type="button" class="chip" data-skill="${esc(s.name)}">${esc(s.name)} <span class="muted">(${s.student_count})</span></button>`
                )
                .join('')}
            </div>
          </div>
        </section>

        <div id="discoveryCount" class="muted" style="font-size: 0.9rem;"></div>
        <div id="discoveryResults" class="grid-3"></div>
      </div>
    `;

    const qEl = document.getElementById('discQuery');
    const deptEl = document.getElementById('discDept');
    const yearEl = document.getElementById('discYear');
    const sortEl = document.getElementById('discSort');
    const verEl = document.getElementById('discVerifiedOnly');
    const gpaEl = document.getElementById('discMinGpa');

    async function loadStudents() {
      const params = new URLSearchParams();
      if (qEl.value.trim()) params.set('q', qEl.value.trim());
      if (selectedSkills.size > 0) params.set('skill', Array.from(selectedSkills).join(','));
      if (deptEl.value) params.set('department', deptEl.value);
      if (yearEl.value) params.set('gradYear', yearEl.value);
      if (gpaEl.value) params.set('minGpa', gpaEl.value);
      if (verEl.checked) params.set('verifiedOnly', 'true');
      params.set('sort', sortEl.value);

      const { students } = await apiFetch(`/api/discovery/students?${params.toString()}`);
      document.getElementById('discoveryCount').textContent = `Showing ${students.length} matching student${students.length === 1 ? '' : 's'}`;

      const grid = document.getElementById('discoveryResults');
      if (students.length === 0) {
        grid.innerHTML = `<div class="card" style="grid-column: 1 / -1; text-align: center;">No students matched your filter criteria. Try removing a skill filter.</div>`;
        return;
      }

      grid.innerHTML = students
        .map(
          (st) => `
        <article class="card stack">
          <div class="row">
            ${renderAvatar(st.full_name, st.avatar_url)}
            <div style="min-width: 0;">
              <h3 style="font-size: 1.05rem;">${esc(st.full_name)}</h3>
              <div class="muted" style="font-size: 0.82rem;">${esc(st.university || '')}</div>
              <div class="muted" style="font-size: 0.8rem;">${esc(st.department || '')} ${st.graduation_year ? `• Class of ${esc(st.graduation_year)}` : ''}</div>
            </div>
          </div>

          <p style="margin: 0; font-size: 0.9rem;">${esc(st.headline || st.bio || 'Digital Student Portfolio')}</p>

          <div class="row" style="gap: 6px;">
            ${st.gpa ? `<span class="badge">GPA: ${esc(st.gpa)}</span>` : ''}
            <span class="badge">${st.project_count} Projects</span>
            ${st.verified_cert_count > 0 ? `<span class="badge badge-verified">✓ ${st.verified_cert_count} Verified</span>` : ''}
          </div>

          <div class="row" style="gap: 6px;">
            ${st.skills
              .slice(0, 5)
              .map((s) => `<span class="badge badge-primary">${esc(s.name)}</span>`)
              .join('')}
          </div>

          <div class="row-between" style="margin-top: auto; padding-top: 10px; border-top: 1px solid var(--border);">
            <a href="#portfolio/${esc(st.slug)}" class="btn btn-primary btn-sm">View Portfolio</a>
            <a href="#resume/${esc(st.slug)}" class="btn btn-outline btn-sm">Resume</a>
          </div>
        </article>
      `
        )
        .join('');
    }

    document.getElementById('skillChips').addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      const skill = btn.dataset.skill;
      if (selectedSkills.has(skill)) {
        selectedSkills.delete(skill);
        btn.classList.remove('active');
      } else {
        selectedSkills.add(skill);
        btn.classList.add('active');
      }
      loadStudents();
    });

    [qEl, deptEl, yearEl, sortEl, verEl, gpaEl].forEach((el) => {
      el.addEventListener('input', loadStudents);
      el.addEventListener('change', loadStudents);
    });

    document.getElementById('discResetBtn').addEventListener('click', () => {
      qEl.value = '';
      deptEl.value = '';
      yearEl.value = '';
      gpaEl.value = '';
      verEl.checked = false;
      sortEl.value = 'gpa';
      selectedSkills.clear();
      document.querySelectorAll('#skillChips .chip').forEach((c) => c.classList.remove('active'));
      loadStudents();
    });

    await loadStudents();
  } catch (err) {
    container.innerHTML = `<div class="card">Failed to load discovery: ${esc(err.message)}</div>`;
  }
}
