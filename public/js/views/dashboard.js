import { apiFetch, esc, showToast, uploadFile } from '../api.js';

export async function renderDashboard(container, currentUser) {
  if (!currentUser) {
    container.innerHTML = `<div class="card">Please sign in to access your dashboard.</div>`;
    return;
  }

  if (currentUser.role !== 'student') {
    container.innerHTML = `
      <div class="card stack">
        <h2>Evaluator Dashboard</h2>
        <p class="muted">You are signed in as <strong>${esc(currentUser.full_name)}</strong> (${esc(currentUser.role)}).</p>
        <div class="row">
          <a href="#verify" class="btn btn-primary">Open Certificate Verification Queue</a>
          <a href="#discover" class="btn btn-outline">Discover &amp; Endorse Students</a>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = `<div class="card">Loading your portfolio workspace...</div>`;
  let activeTab = 'profile';
  let data = await apiFetch('/api/portfolio/me');

  async function refresh() {
    data = await apiFetch('/api/portfolio/me');
    draw();
  }

  function draw() {
    const { user, profile, skills, academics, projects, certificates, activities } = data;

    container.innerHTML = `
      <div class="stack">
        <div class="card row-between">
          <div>
            <h1>Student Portfolio Builder</h1>
            <p class="muted" style="margin: 4px 0 0;">Manage your achievements, skills, projects, verifiable certificates, and extracurriculars.</p>
          </div>
          <div class="row">
            <a href="#portfolio/${esc(profile.slug)}" class="btn btn-outline btn-sm">Preview Public Portfolio</a>
            <a href="#resume/${esc(profile.slug)}" class="btn btn-primary btn-sm">Generate Resume</a>
          </div>
        </div>

        <div class="card">
          <div class="tabs" id="dashTabs">
            <button class="tab ${activeTab === 'profile' ? 'active' : ''}" data-tab="profile">Profile</button>
            <button class="tab ${activeTab === 'academics' ? 'active' : ''}" data-tab="academics">Academics (${academics.length})</button>
            <button class="tab ${activeTab === 'skills' ? 'active' : ''}" data-tab="skills">Skills (${skills.length})</button>
            <button class="tab ${activeTab === 'projects' ? 'active' : ''}" data-tab="projects">Projects (${projects.length})</button>
            <button class="tab ${activeTab === 'certificates' ? 'active' : ''}" data-tab="certificates">Certificates (${certificates.length})</button>
            <button class="tab ${activeTab === 'activities' ? 'active' : ''}" data-tab="activities">Activities (${activities.length})</button>
          </div>

          <div id="dashTabBody"></div>
        </div>
      </div>
    `;

    document.querySelectorAll('#dashTabs .tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        draw();
      });
    });

    const body = document.getElementById('dashTabBody');

    if (activeTab === 'profile') {
      body.innerHTML = `
        <form id="profileForm" class="stack">
          <div class="grid-2">
            <div class="form-group"><label>Full Name</label><input type="text" id="pName" value="${esc(user.full_name)}" required /></div>
            <div class="form-group"><label>Headline</label><input type="text" id="pHeadline" value="${esc(profile.headline)}" placeholder="e.g., Full-Stack Developer & AI Researcher" /></div>
            <div class="form-group"><label>University</label><input type="text" id="pUni" value="${esc(profile.university)}" /></div>
            <div class="form-group"><label>Department</label><input type="text" id="pDept" value="${esc(profile.department)}" /></div>
            <div class="form-group"><label>Graduation Year</label><input type="number" id="pGrad" value="${esc(profile.graduation_year || '')}" /></div>
            <div class="form-group"><label>CGPA / GPA</label><input type="number" step="0.01" id="pGpa" value="${esc(profile.gpa || '')}" /></div>
            <div class="form-group"><label>Location</label><input type="text" id="pLoc" value="${esc(profile.location)}" /></div>
            <div class="form-group"><label>Avatar Image (PNG/JPG/WEBP)</label><input type="file" id="pAvatarFile" accept="image/*" /></div>
            <div class="form-group"><label>GitHub URL</label><input type="url" id="pGithub" value="${esc(profile.github_url)}" /></div>
            <div class="form-group"><label>LinkedIn URL</label><input type="url" id="pLinkedin" value="${esc(profile.linkedin_url)}" /></div>
          </div>
          <div class="form-group"><label>Personal Website</label><input type="url" id="pWebsite" value="${esc(profile.website_url)}" /></div>
          <div class="form-group"><label>Bio / Career Summary</label><textarea id="pBio" rows="3">${esc(profile.bio)}</textarea></div>
          <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;">
            <input type="checkbox" id="pPublic" ${profile.is_public ? 'checked' : ''} style="width:auto;" />
            Make my portfolio discoverable in Skill-Based Student Discovery
          </label>
          <div><button type="submit" class="btn btn-primary">Save Profile</button></div>
        </form>
      `;

      document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          let avatar_url = profile.avatar_url || '';
          const fileInput = document.getElementById('pAvatarFile');
          if (fileInput.files[0]) {
            const up = await uploadFile(fileInput.files[0]);
            avatar_url = up.url;
          }
          await apiFetch('/api/portfolio/profile', {
            method: 'PUT',
            body: JSON.stringify({
              full_name: document.getElementById('pName').value,
              headline: document.getElementById('pHeadline').value,
              university: document.getElementById('pUni').value,
              department: document.getElementById('pDept').value,
              graduation_year: document.getElementById('pGrad').value,
              gpa: document.getElementById('pGpa').value,
              location: document.getElementById('pLoc').value,
              github_url: document.getElementById('pGithub').value,
              linkedin_url: document.getElementById('pLinkedin').value,
              website_url: document.getElementById('pWebsite').value,
              bio: document.getElementById('pBio').value,
              is_public: document.getElementById('pPublic').checked,
              avatar_url
            })
          });
          showToast('Profile saved!', 'success');
          refresh();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    } else if (activeTab === 'academics') {
      body.innerHTML = `
        <div class="stack">
          <form id="acadForm" class="card stack" style="box-shadow:none;background:var(--surface-alt);">
            <h3>Add Academic Record</h3>
            <div class="grid-3">
              <div class="form-group"><label>Institution *</label><input id="aInst" required /></div>
              <div class="form-group"><label>Degree *</label><input id="aDeg" required placeholder="B.Tech / M.Sc" /></div>
              <div class="form-group"><label>Field of Study</label><input id="aField" placeholder="Computer Science" /></div>
              <div class="form-group"><label>Start Year *</label><input id="aStart" type="number" required placeholder="2022" /></div>
              <div class="form-group"><label>End Year</label><input id="aEnd" type="number" placeholder="2026" /></div>
              <div class="form-group"><label>Grade / CGPA</label><input id="aGrade" placeholder="9.2 / 10.0" /></div>
            </div>
            <div class="grid-2">
              <div class="form-group"><label>Honors / Awards</label><input id="aHonors" placeholder="Dean's List" /></div>
              <div class="form-group"><label>Coursework / Notes</label><input id="aDesc" /></div>
            </div>
            <div><button type="submit" class="btn btn-primary btn-sm">Add Academic Record</button></div>
          </form>

          ${academics
            .map(
              (a) => `
            <div class="row-between" style="padding:12px;border:1px solid var(--border);border-radius:8px;">
              <div>
                <strong>${esc(a.degree)} ${a.field_of_study ? `in ${esc(a.field_of_study)}` : ''}</strong> — ${esc(a.institution)}
                <div class="muted" style="font-size:0.84rem;">${esc(a.start_year)}–${esc(a.end_year || 'Present')} ${a.grade ? `• ${esc(a.grade)}` : ''}</div>
              </div>
              <button class="btn btn-outline btn-xs del-item" data-endpoint="academics" data-id="${a.id}">Delete</button>
            </div>
          `
            )
            .join('')}
        </div>
      `;

      document.getElementById('acadForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await apiFetch('/api/portfolio/academics', {
            method: 'POST',
            body: JSON.stringify({
              institution: document.getElementById('aInst').value,
              degree: document.getElementById('aDeg').value,
              field_of_study: document.getElementById('aField').value,
              start_year: document.getElementById('aStart').value,
              end_year: document.getElementById('aEnd').value,
              grade: document.getElementById('aGrade').value,
              honors: document.getElementById('aHonors').value,
              description: document.getElementById('aDesc').value
            })
          });
          showToast('Academic record added!', 'success');
          refresh();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    } else if (activeTab === 'skills') {
      body.innerHTML = `
        <div class="stack">
          <form id="skillForm" class="card row" style="box-shadow:none;background:var(--surface-alt);align-items:flex-end;">
            <div class="form-group" style="flex:1;"><label>Skill Name *</label><input id="sName" required placeholder="e.g., React, Python, Public Speaking" /></div>
            <div class="form-group"><label>Category</label>
              <select id="sCat">
                <option>Technical</option><option>Design</option><option>Leadership</option><option>Research</option><option>Language</option>
              </select>
            </div>
            <div class="form-group" style="width:120px;"><label>Proficiency %</label><input id="sProf" type="number" min="1" max="100" value="85" /></div>
            <button type="submit" class="btn btn-primary">Add Skill</button>
          </form>

          <div class="grid-2">
            ${skills
              .map(
                (s) => `
              <div class="row-between" style="padding:10px 12px;border:1px solid var(--border);border-radius:8px;">
                <div><strong>${esc(s.name)}</strong> <span class="badge">${esc(s.category)}</span> <span class="muted">${s.proficiency}%</span></div>
                <button class="btn btn-outline btn-xs del-item" data-endpoint="skills" data-id="${s.id}">Delete</button>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `;

      document.getElementById('skillForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await apiFetch('/api/portfolio/skills', {
            method: 'POST',
            body: JSON.stringify({
              name: document.getElementById('sName').value,
              category: document.getElementById('sCat').value,
              proficiency: Number(document.getElementById('sProf').value)
            })
          });
          showToast('Skill added!', 'success');
          refresh();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    } else if (activeTab === 'projects') {
      body.innerHTML = `
        <div class="stack">
          <form id="projForm" class="card stack" style="box-shadow:none;background:var(--surface-alt);">
            <h3>Add Project</h3>
            <div class="grid-2">
              <div class="form-group"><label>Title *</label><input id="prTitle" required /></div>
              <div class="form-group"><label>Tech Stack (comma-separated)</label><input id="prTech" placeholder="React, Node.js, SQLite" /></div>
              <div class="form-group"><label>One-line Summary</label><input id="prSum" /></div>
              <div class="form-group"><label>Completion Date</label><input id="prDate" placeholder="2026-03" /></div>
              <div class="form-group"><label>GitHub / Repo URL</label><input id="prRepo" type="url" /></div>
              <div class="form-group"><label>Live Demo URL</label><input id="prLive" type="url" /></div>
            </div>
            <div class="grid-2">
              <div class="form-group"><label>Thumbnail Image (optional)</label><input id="prImg" type="file" accept="image/*" /></div>
              <label style="display:flex;align-items:center;gap:8px;margin-top:22px;">
                <input type="checkbox" id="prFeat" style="width:auto;" /> Mark as Featured Project
              </label>
            </div>
            <div class="form-group"><label>Detailed Description</label><textarea id="prDesc" rows="2"></textarea></div>
            <div><button type="submit" class="btn btn-primary btn-sm">Add Project</button></div>
          </form>

          ${projects
            .map(
              (p) => `
            <div class="row-between" style="padding:12px;border:1px solid var(--border);border-radius:8px;">
              <div>
                <strong>${esc(p.title)}</strong> ${p.featured ? `<span class="badge badge-primary">Featured</span>` : ''}
                <div class="muted" style="font-size:0.84rem;">${esc(p.summary || p.tech_stack)}</div>
              </div>
              <button class="btn btn-outline btn-xs del-item" data-endpoint="projects" data-id="${p.id}">Delete</button>
            </div>
          `
            )
            .join('')}
        </div>
      `;

      document.getElementById('projForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          let image_url = '';
          const imgFile = document.getElementById('prImg').files[0];
          if (imgFile) {
            const up = await uploadFile(imgFile);
            image_url = up.url;
          }
          await apiFetch('/api/portfolio/projects', {
            method: 'POST',
            body: JSON.stringify({
              title: document.getElementById('prTitle').value,
              tech_stack: document.getElementById('prTech').value,
              summary: document.getElementById('prSum').value,
              completed_date: document.getElementById('prDate').value,
              repo_url: document.getElementById('prRepo').value,
              live_url: document.getElementById('prLive').value,
              description: document.getElementById('prDesc').value,
              featured: document.getElementById('prFeat').checked,
              image_url
            })
          });
          showToast('Project added!', 'success');
          refresh();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    } else if (activeTab === 'certificates') {
      body.innerHTML = `
        <div class="stack">
          <form id="certForm" class="card stack" style="box-shadow:none;background:var(--surface-alt);">
            <h3>Add Certificate (Auto-generates Verifiable Credential ID &amp; SHA-256 Hash)</h3>
            <div class="grid-3">
              <div class="form-group"><label>Certificate Title *</label><input id="cTitle" required /></div>
              <div class="form-group"><label>Issuing Organization *</label><input id="cIssuer" required /></div>
              <div class="form-group"><label>Issue Date *</label><input id="cDate" type="date" required /></div>
            </div>
            <div class="grid-2">
              <div class="form-group"><label>Upload Certificate (PDF / Image)</label><input id="cFile" type="file" accept=".pdf,image/*" /></div>
              <div class="form-group"><label>Description</label><input id="cDesc" /></div>
            </div>
            <div><button type="submit" class="btn btn-primary btn-sm">Add Certificate</button></div>
          </form>

          ${certificates
            .map(
              (c) => `
            <div class="row-between" style="padding:12px;border:1px solid var(--border);border-radius:8px;">
              <div>
                <strong>${esc(c.title)}</strong> <span class="badge badge-${esc(c.status)}">${esc(c.status)}</span>
                <div class="muted" style="font-size:0.84rem;">${esc(c.issuer)} • Credential ID: <code class="code-mono">${esc(c.credential_id)}</code></div>
              </div>
              <div class="row">
                <a href="#verify/${esc(c.credential_id)}" class="btn btn-ghost btn-xs">Verify Page</a>
                <button class="btn btn-outline btn-xs del-item" data-endpoint="certificates" data-id="${c.id}">Delete</button>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      `;

      document.getElementById('certForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          let file_url = '';
          const f = document.getElementById('cFile').files[0];
          if (f) {
            const up = await uploadFile(f);
            file_url = up.url;
          }
          const created = await apiFetch('/api/portfolio/certificates', {
            method: 'POST',
            body: JSON.stringify({
              title: document.getElementById('cTitle').value,
              issuer: document.getElementById('cIssuer').value,
              issue_date: document.getElementById('cDate').value,
              description: document.getElementById('cDesc').value,
              file_url
            })
          });
          showToast(`Certificate added! Credential ID: ${created.credential_id}`, 'success');
          refresh();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    } else if (activeTab === 'activities') {
      body.innerHTML = `
        <div class="stack">
          <form id="actForm" class="card stack" style="box-shadow:none;background:var(--surface-alt);">
            <h3>Add Extracurricular Activity</h3>
            <div class="grid-3">
              <div class="form-group"><label>Activity / Event Title *</label><input id="actTitle" required /></div>
              <div class="form-group"><label>Organization *</label><input id="actOrg" required /></div>
              <div class="form-group"><label>Category</label>
                <select id="actCat">
                  <option>Club</option><option>Hackathon</option><option>Volunteering</option><option>Sports</option><option>Competition</option><option>Publication</option>
                </select>
              </div>
              <div class="form-group"><label>Role / Position</label><input id="actRole" placeholder="Team Lead / Volunteer" /></div>
              <div class="form-group"><label>Impact Metric</label><input id="actImpact" placeholder="Mentored 40+ peers" /></div>
              <div class="form-group"><label>Description</label><input id="actDesc" /></div>
            </div>
            <div><button type="submit" class="btn btn-primary btn-sm">Add Activity</button></div>
          </form>

          ${activities
            .map(
              (act) => `
            <div class="row-between" style="padding:12px;border:1px solid var(--border);border-radius:8px;">
              <div>
                <strong>${esc(act.title)}</strong> <span class="badge">${esc(act.category)}</span>
                <div class="muted" style="font-size:0.84rem;">${esc(act.organization)} ${act.role ? `• ${esc(act.role)}` : ''}</div>
              </div>
              <button class="btn btn-outline btn-xs del-item" data-endpoint="activities" data-id="${act.id}">Delete</button>
            </div>
          `
            )
            .join('')}
        </div>
      `;

      document.getElementById('actForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await apiFetch('/api/portfolio/activities', {
            method: 'POST',
            body: JSON.stringify({
              title: document.getElementById('actTitle').value,
              organization: document.getElementById('actOrg').value,
              category: document.getElementById('actCat').value,
              role: document.getElementById('actRole').value,
              impact: document.getElementById('actImpact').value,
              description: document.getElementById('actDesc').value
            })
          });
          showToast('Activity added!', 'success');
          refresh();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    body.querySelectorAll('.del-item').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await apiFetch(`/api/portfolio/${btn.dataset.endpoint}/${btn.dataset.id}`, {
            method: 'DELETE'
          });
          showToast('Item deleted.', 'success');
          refresh();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  }

  draw();
}
