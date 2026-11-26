import { apiFetch, esc, showToast } from '../api.js';

export async function renderVerify(container, initialCode = '', currentUser = null) {
  container.innerHTML = `
    <div class="stack">
      <section class="card stack">
        <div>
          <h1>Certificate Verification Portal</h1>
          <p class="muted" style="margin: 4px 0 0;">
            Verify the authenticity of any student credential using its Credential ID or SHA-256 verification hash.
          </p>
        </div>

        <form id="verifyLookupForm" class="row">
          <input type="text" id="verifyCodeInput" value="${esc(initialCode)}" placeholder="e.g. CERT-2026-8841 or SHA-256 hash" style="flex: 1; min-width: 240px;" required />
          <button type="submit" class="btn btn-primary">Verify Credential</button>
        </form>

        <div class="row" style="gap: 8px; font-size: 0.82rem;">
          <span class="muted">Sample IDs:</span>
          <button type="button" class="chip sample-cert" data-id="CERT-2026-8841">CERT-2026-8841 (Verified)</button>
          <button type="button" class="chip sample-cert" data-id="CERT-2026-7312">CERT-2026-7312 (Pending)</button>
          <button type="button" class="chip sample-cert" data-id="CERT-2026-5529">CERT-2026-5529 (Verified)</button>
        </div>

        <div id="verifyResult"></div>
      </section>

      <section id="evaluatorQueueSection" class="${currentUser && (currentUser.role === 'evaluator' || currentUser.role === 'admin') ? 'card stack' : 'hidden'}"></section>
    </div>
  `;

  async function runLookup(code) {
    const resultEl = document.getElementById('verifyResult');
    if (!code) return;
    resultEl.innerHTML = `<div class="muted">Checking registry...</div>`;
    try {
      const { verified, certificate: c } = await apiFetch(`/api/verify/lookup/${encodeURIComponent(code)}`);
      resultEl.innerHTML = `
        <div class="card" style="background: var(--surface-alt); box-shadow: none;">
          <div class="row-between" style="margin-bottom: 10px;">
            <h3 style="font-size: 1.15rem;">${esc(c.title)}</h3>
            <span class="badge badge-${esc(c.status)}">${verified ? '✓ AUTHENTIC & VERIFIED' : esc(c.status.toUpperCase())}</span>
          </div>
          <div class="grid-2" style="font-size: 0.9rem;">
            <div><strong>Recipient:</strong> <a href="#portfolio/${esc(c.student_slug)}">${esc(c.student_name)}</a></div>
            <div><strong>University:</strong> ${esc(c.student_university || 'N/A')}</div>
            <div><strong>Issuing Organization:</strong> ${esc(c.issuer)}</div>
            <div><strong>Issue Date:</strong> ${esc(c.issue_date)}</div>
            <div><strong>Credential ID:</strong> <code class="code-mono">${esc(c.credential_id)}</code></div>
            <div><strong>Verified By:</strong> ${esc(c.verified_by || 'Pending Evaluator Review')} ${c.verified_at ? `(${esc(c.verified_at)})` : ''}</div>
          </div>
          <div style="margin-top: 10px; font-size: 0.82rem;">
            <strong>SHA-256 Verification Hash:</strong><br/>
            <code class="code-mono">${esc(c.verification_hash)}</code>
          </div>
          ${c.file_url ? `<div style="margin-top: 10px;"><a href="${esc(c.file_url)}" target="_blank" class="btn btn-outline btn-xs">View Uploaded Certificate File ↗</a></div>` : ''}
        </div>
      `;
    } catch (err) {
      resultEl.innerHTML = `
        <div class="card" style="border-color: var(--danger); background: var(--danger-soft); box-shadow: none;">
          <strong>Verification Failed:</strong> ${esc(err.message)}
        </div>
      `;
    }
  }

  async function loadEvaluatorQueue() {
    const qSec = document.getElementById('evaluatorQueueSection');
    if (!currentUser || (currentUser.role !== 'evaluator' && currentUser.role !== 'admin')) return;
    try {
      const { certificates } = await apiFetch('/api/verify/queue');
      qSec.innerHTML = `
        <div class="row-between">
          <div>
            <h2>Evaluator Verification Queue</h2>
            <p class="muted" style="margin: 2px 0 0; font-size: 0.88rem;">Review and approve or revoke student-submitted certificates.</p>
          </div>
        </div>
        <div class="stack">
          ${certificates
            .map(
              (c) => `
            <div class="row-between" style="padding: 12px; border: 1px solid var(--border); border-radius: 8px;">
              <div>
                <strong>${esc(c.title)}</strong> <span class="badge badge-${esc(c.status)}">${esc(c.status)}</span>
                <div class="muted" style="font-size: 0.84rem;">
                  Student: <a href="#portfolio/${esc(c.student_slug)}">${esc(c.student_name)}</a> • Issuer: ${esc(c.issuer)} • ID: <code class="code-mono">${esc(c.credential_id)}</code>
                </div>
              </div>
              <div class="row">
                ${c.status !== 'verified' ? `<button type="button" class="btn btn-success btn-xs cert-action" data-id="${esc(c.credential_id)}" data-status="verified">Approve &amp; Verify</button>` : ''}
                ${c.status !== 'revoked' ? `<button type="button" class="btn btn-danger btn-xs cert-action" data-id="${esc(c.credential_id)}" data-status="revoked">Revoke</button>` : ''}
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      `;

      qSec.querySelectorAll('.cert-action').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            await apiFetch(`/api/verify/${encodeURIComponent(btn.dataset.id)}/status`, {
              method: 'POST',
              body: JSON.stringify({ status: btn.dataset.status })
            });
            showToast(`Certificate ${btn.dataset.id} marked as ${btn.dataset.status}.`, 'success');
            loadEvaluatorQueue();
          } catch (err) {
            showToast(err.message, 'error');
          }
        });
      });
    } catch (err) {
      qSec.innerHTML = `<div class="muted">Unable to load queue: ${esc(err.message)}</div>`;
    }
  }

  document.getElementById('verifyLookupForm').addEventListener('submit', (e) => {
    e.preventDefault();
    runLookup(document.getElementById('verifyCodeInput').value.trim());
  });

  container.querySelectorAll('.sample-cert').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('verifyCodeInput').value = btn.dataset.id;
      runLookup(btn.dataset.id);
    });
  });

  if (initialCode) {
    runLookup(initialCode);
  }
  loadEvaluatorQueue();
}
