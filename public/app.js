// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  apiKey: localStorage.getItem("adminApiKey") || "",
  status: "",
  submissions: [],
  selectedSubmissionId: "",
  accounts: [],
  selectedAccountId: "",
  affiliates: [],
  selectedAffiliateId: ""
};

// ─── Element refs ─────────────────────────────────────────────────────────────
const els = {
  apiKey: document.getElementById("apiKey"),
  statusFilter: document.getElementById("statusFilter"),
  refreshButton: document.getElementById("refreshButton"),
  // tabs
  tabReports: document.getElementById("tabReports"),
  tabAccounts: document.getElementById("tabAccounts"),
  tabAffiliates2: document.getElementById("tabAffiliates"),
  tabMastermind: document.getElementById("tabMastermind"),
  reportsTab: document.getElementById("reportsTab"),
  accountsTab: document.getElementById("accountsTab"),
  mastermindTab: document.getElementById("mastermindTab"),
  mindmapSvg: document.getElementById("mindmapSvg"),
  mmPopup: document.getElementById("mmPopup"),
  mmPopupClose: document.getElementById("mmPopupClose"),
  mmPopUsername: document.getElementById("mmPopUsername"),
  mmPopType: document.getElementById("mmPopType"),
  mmPopStatus: document.getElementById("mmPopStatus"),
  mmPopEmail: document.getElementById("mmPopEmail"),
  mmPopPhone: document.getElementById("mmPopPhone"),
  mmPopPassword: document.getElementById("mmPopPassword"),
  mmPopLastActive: document.getElementById("mmPopLastActive"),
  mmPopAffiliate: document.getElementById("mmPopAffiliate"),
  mmPopTiktokLink: document.getElementById("mmPopTiktokLink"),
  // reports
  submissionList: document.getElementById("submissionList"),
  listSummary: document.getElementById("listSummary"),
  detailSummary: document.getElementById("detailSummary"),
  emptyState: document.getElementById("emptyState"),
  detailPanel: document.getElementById("detailPanel"),
  submissionImage: document.getElementById("submissionImage"),
  reviewForm: document.getElementById("reviewForm"),
  rejectButton: document.getElementById("rejectButton"),
  retryButton: document.getElementById("retryButton"),
  // affiliates
  tabAffiliates: document.getElementById("tabAffiliates"),
  affiliatesTab: document.getElementById("affiliatesTab"),
  affiliateList: document.getElementById("affiliateList"),
  affiliateStatusFilter: document.getElementById("affiliateStatusFilter"),
  affiliateEmptyState: document.getElementById("affiliateEmptyState"),
  affiliateDetailPanel: document.getElementById("affiliateDetailPanel"),
  afNama: document.getElementById("afNama"),
  afStatus: document.getElementById("afStatus"),
  afFon: document.getElementById("afFon"),
  afEmel: document.getElementById("afEmel"),
  afTiktok: document.getElementById("afTiktok"),
  afDate: document.getElementById("afDate"),
  afAlamat: document.getElementById("afAlamat"),
  afBank: document.getElementById("afBank"),
  afAkauntBank: document.getElementById("afAkauntBank"),
  afNotes: document.getElementById("afNotes"),
  afManagedAccounts: document.getElementById("afManagedAccounts"),
  afApproveBtn: document.getElementById("afApproveBtn"),
  afRejectBtn: document.getElementById("afRejectBtn"),
  afEditBtn: document.getElementById("afEditBtn"),
  afDeleteBtn: document.getElementById("afDeleteBtn"),
  afSaveNotes: document.getElementById("afSaveNotes"),
  affiliateEditPanel: document.getElementById("affiliateEditPanel"),
  affiliateEditForm: document.getElementById("affiliateEditForm"),
  affiliateEditTitle: document.getElementById("affiliateEditTitle"),
  addAffiliateBtn: document.getElementById("addAffiliateBtn"),
  afEditCancelBtn: document.getElementById("afEditCancelBtn"),
  // accounts
  addAccountBtn: document.getElementById("addAccountBtn"),
  accountList: document.getElementById("accountList"),
  accountFormPanel: document.getElementById("accountFormPanel"),
  accountDetailPanel: document.getElementById("accountDetailPanel"),
  accountEmptyState: document.getElementById("accountEmptyState"),
  accountForm: document.getElementById("accountForm"),
  accountFormTitle: document.getElementById("accountFormTitle"),
  cancelAccountForm: document.getElementById("cancelAccountForm"),
  adUsername: document.getElementById("adUsername"),
  adType: document.getElementById("adType"),
  adStatus: document.getElementById("adStatus"),
  adInactive: document.getElementById("adInactive"),
  adTiktokLink: document.getElementById("adTiktokLink"),
  adEmail: document.getElementById("adEmail"),
  adPhone: document.getElementById("adPhone"),
  adPassword: document.getElementById("adPassword"),
  adLastActive: document.getElementById("adLastActive"),
  adNotes: document.getElementById("adNotes"),
  adCurrentAffiliate: document.getElementById("adCurrentAffiliate"),
  adHistory: document.getElementById("adHistory"),
  accountSearch: document.getElementById("accountSearch"),
  affiliateSearch: document.getElementById("affiliateSearch"),
  assignForm: document.getElementById("assignForm"),
  assignAffiliateSelect: document.getElementById("assignAffiliateSelect"),
  unassignBtn: document.getElementById("unassignBtn"),
  editAccountBtn: document.getElementById("editAccountBtn"),
  markActiveBtn: document.getElementById("markActiveBtn"),
  deleteAccountBtn: document.getElementById("deleteAccountBtn"),
  // reporting tab
  tabDataTiktok: document.getElementById("tabDataTiktok"),
  dataTiktokTab: document.getElementById("dataTiktokTab"),
  reportStartDate: document.getElementById("reportStartDate"),
  reportEndDate: document.getElementById("reportEndDate"),
  syncAllBtn: document.getElementById("syncAllBtn"),
  reportingAccountList: document.getElementById("reportingAccountList"),
  reportingResults: document.getElementById("reportingResults")
};

// ─── Fetch helper ─────────────────────────────────────────────────────────────
function adminFetch(path, options = {}) {
  return fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.apiKey}`,
      ...(options.headers || {})
    }
  }).then(async (res) => {
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || "Request failed");
    return payload;
  });
}

// ─── Tab switching ────────────────────────────────────────────────────────────
function showTab(tab) {
  els.reportsTab.classList.toggle("hidden", tab !== "reports");
  els.dataTiktokTab.classList.toggle("hidden", tab !== "dataTiktok");
  els.accountsTab.classList.toggle("hidden", tab !== "accounts");
  els.affiliatesTab.classList.toggle("hidden", tab !== "affiliates");
  els.mastermindTab.classList.toggle("hidden", tab !== "mastermind");
  document.getElementById("studioTab").classList.toggle("hidden", tab !== "studio");
  els.tabReports.classList.toggle("active", tab === "reports");
  els.tabDataTiktok.classList.toggle("active", tab === "dataTiktok");
  els.tabAccounts.classList.toggle("active", tab === "accounts");
  els.tabAffiliates2.classList.toggle("active", tab === "affiliates");
  els.tabMastermind.classList.toggle("active", tab === "mastermind");
  document.getElementById("tabStudio").classList.toggle("active", tab === "studio");
  els.statusFilter.parentElement.classList.toggle("hidden", tab !== "reports");

  state.apiKey = els.apiKey.value.trim() || state.apiKey;
  localStorage.setItem("adminApiKey", state.apiKey);

  if (tab === "accounts") loadAccounts();
  if (tab === "affiliates") { loadAccounts(); loadAffiliates(); }
  if (tab === "mastermind") { loadAccounts(); loadAffiliates().then(() => renderMindMap()); }
  if (tab === "dataTiktok") loadReportingAccounts();
  if (tab === "studio") studioInit();
}

els.tabReports.addEventListener("click", () => showTab("reports"));
els.tabDataTiktok.addEventListener("click", () => showTab("dataTiktok"));
els.tabAccounts.addEventListener("click", () => showTab("accounts"));
els.tabAffiliates2.addEventListener("click", () => showTab("affiliates"));
els.tabMastermind.addEventListener("click", () => showTab("mastermind"));
document.getElementById("tabStudio").addEventListener("click", () => showTab("studio"));

// ─── REPORTS ──────────────────────────────────────────────────────────────────
function toDisplayText(value) { return value || "—"; }

function submissionImageUrl(submission) {
  if (submission.image.driveFileUrl) return submission.image.driveFileUrl;
  if (submission.image.localPath) {
    const parts = submission.image.localPath.split(/[\\/]/);
    return `/media/${parts[parts.length - 1]}`;
  }
  return "";
}

function renderList() {
  els.submissionList.innerHTML = "";
  els.listSummary.textContent = `${state.submissions.length} submission(s) loaded`;
  if (!state.submissions.length) {
    els.submissionList.innerHTML = `<p class="subtle">No submissions found.</p>`;
    return;
  }
  state.submissions.forEach((s) => {
    const el = document.createElement("article");
    el.className = `submission-item ${s.id === state.selectedSubmissionId ? "active" : ""}`;
    el.innerHTML = `
      <div class="badge ${s.status}">${s.status}</div>
      <h3>${toDisplayText(s.metadata.staffName)} / ${toDisplayText(s.metadata.hostName)}</h3>
      <p>${toDisplayText(s.metadata.liveSessionIdOrLabel)}</p>
      <p class="subtle">${s.submittedAt}</p>`;
    el.addEventListener("click", () => {
      state.selectedSubmissionId = s.id;
      renderList();
      renderDetail();
    });
    els.submissionList.appendChild(el);
  });
}

function setFormValue(name, value) {
  const field = els.reviewForm.elements.namedItem(name);
  if (field) field.value = value ?? "";
}

function renderDetail() {
  const s = state.submissions.find((x) => x.id === state.selectedSubmissionId);
  if (!s) {
    els.detailPanel.classList.add("hidden");
    els.emptyState.classList.remove("hidden");
    els.detailSummary.textContent = "Select a submission to review.";
    return;
  }
  els.detailPanel.classList.remove("hidden");
  els.emptyState.classList.add("hidden");
  els.detailSummary.textContent = `${s.status} | ${s.senderPhone}`;
  els.submissionImage.src = submissionImageUrl(s);
  setFormValue("staffName", s.metadata.staffName);
  setFormValue("hostName", s.metadata.hostName);
  setFormValue("liveSessionIdOrLabel", s.metadata.liveSessionIdOrLabel);
  setFormValue("reportDate", s.metadata.reportDate);
  Object.entries(s.extraction.metrics).forEach(([k, v]) => setFormValue(k, v));
  setFormValue("confidence", s.extraction.confidence);
  setFormValue("warnings", (s.extraction.warnings || []).join("\n"));
  setFormValue("rejectionReason", s.review.rejectionReason || "");
}

async function loadSubmissions() {
  if (!state.apiKey) { els.listSummary.textContent = "Enter Admin API Key."; return; }
  const q = state.status ? `?status=${encodeURIComponent(state.status)}` : "";
  const payload = await adminFetch(`/api/submissions${q}`);
  state.submissions = payload.submissions;
  if (!state.submissions.some((x) => x.id === state.selectedSubmissionId))
    state.selectedSubmissionId = state.submissions[0]?.id || "";
  renderList();
  renderDetail();
}

function metricOverridesFromForm(fd) {
  const fields = ["start_time", "end_time", "duration", "spent", "sales_gmv", "roi"];
  return Object.fromEntries(fields.map((f) => {
    const raw = fd.get(f);
    if (f === "start_time" || f === "end_time" || f === "duration") return [f, raw || null];
    return [f, raw === "" ? null : Number(raw)];
  }));
}

els.apiKey.value = state.apiKey;

els.refreshButton.addEventListener("click", async () => {
  try {
    state.apiKey = els.apiKey.value.trim();
    localStorage.setItem("adminApiKey", state.apiKey);
    state.status = els.statusFilter.value;
    await loadSubmissions();
  } catch (e) { alert(e.message); }
});

els.reviewForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const s = state.submissions.find((x) => x.id === state.selectedSubmissionId);
  if (!s) return;
  const fd = new FormData(els.reviewForm);
  try {
    await adminFetch(`/api/submissions/${s.id}/approve`, {
      method: "POST",
      body: JSON.stringify({
        reviewer: fd.get("reviewer") || "admin",
        overrides: {
          metadata: {
            staffName: String(fd.get("staffName") || "").trim(),
            hostName: String(fd.get("hostName") || "").trim(),
            liveSessionIdOrLabel: String(fd.get("liveSessionIdOrLabel") || "").trim(),
            reportDate: String(fd.get("reportDate") || "").trim()
          },
          metrics: metricOverridesFromForm(fd),
          confidence: Number(fd.get("confidence") || 0),
          warnings: String(fd.get("warnings") || "").split("\n").map((x) => x.trim()).filter(Boolean)
        }
      })
    });
    await loadSubmissions();
  } catch (e) { alert(e.message); }
});

els.rejectButton.addEventListener("click", async () => {
  const s = state.submissions.find((x) => x.id === state.selectedSubmissionId);
  if (!s) return;
  const fd = new FormData(els.reviewForm);
  try {
    await adminFetch(`/api/submissions/${s.id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reviewer: fd.get("reviewer") || "admin", reason: fd.get("rejectionReason") || "" })
    });
    await loadSubmissions();
  } catch (e) { alert(e.message); }
});

els.retryButton.addEventListener("click", async () => {
  const s = state.submissions.find((x) => x.id === state.selectedSubmissionId);
  if (!s) return;
  try {
    await adminFetch(`/api/submissions/${s.id}/retry`, { method: "POST" });
    await loadSubmissions();
  } catch (e) { alert(e.message); }
});

// ─── ACCOUNTS ─────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ms-MY", { dateStyle: "medium", timeStyle: "short" });
}

function renderAccountList() {
  els.accountList.innerHTML = "";
  const q = els.accountSearch.value.toLowerCase();
  const accounts = q
    ? state.accounts.filter((a) =>
        a.tiktokUsername.toLowerCase().includes(q) ||
        (a.currentAffiliate?.name || "").toLowerCase().includes(q) ||
        (a.email || "").toLowerCase().includes(q))
    : state.accounts;
  if (!accounts.length) {
    els.accountList.innerHTML = `<p class="subtle">${q ? "Tiada hasil carian." : "Tiada akaun. Tambah akaun baru."}</p>`;
    return;
  }
  accounts.forEach((a) => {
    const el = document.createElement("article");
    el.className = `submission-item ${a.id === state.selectedAccountId ? "active" : ""}`;
    const inactiveBadge = a.inactive ? `<span class="badge badge-warn">⚠ Inactive</span>` : "";
    el.innerHTML = `
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
        <span class="badge badge-type">${a.type}</span>
        <span class="badge badge-${a.status.toLowerCase()}">${a.status}</span>
        ${inactiveBadge}
      </div>
      <h3>@${a.tiktokUsername}</h3>
      <p>${a.currentAffiliate ? a.currentAffiliate.name : "Tiada affiliate"}</p>`;
    el.addEventListener("click", () => {
      state.selectedAccountId = a.id;
      renderAccountList();
      renderAccountDetail();
    });
    els.accountList.appendChild(el);
  });
}

function showAccountPanel(panel) {
  els.accountFormPanel.classList.toggle("hidden", panel !== "form");
  els.accountDetailPanel.classList.toggle("hidden", panel !== "detail");
  els.accountEmptyState.classList.toggle("hidden", panel !== "empty");
}

function renderAccountDetail() {
  const a = state.accounts.find((x) => x.id === state.selectedAccountId);
  if (!a) { showAccountPanel("empty"); return; }
  showAccountPanel("detail");

  els.adUsername.textContent = `@${a.tiktokUsername}`;
  els.adType.textContent = a.type;
  els.adType.className = `badge badge-type`;
  els.adStatus.textContent = a.status;
  els.adStatus.className = `badge badge-${a.status.toLowerCase()}`;
  els.adInactive.classList.toggle("hidden", !a.inactive);
  els.adTiktokLink.href = `https://www.tiktok.com/@${a.tiktokUsername}`;
  els.adTiktokLink.classList.remove("hidden");
  els.adEmail.textContent = a.email || "—";
  els.adPhone.textContent = a.phone || "—";
  els.adPassword.textContent = a.password;
  els.adLastActive.textContent = fmtDate(a.lastActiveAt);
  els.adNotes.textContent = a.notes || "—";

  const today = new Date().toISOString().split("T")[0];
  if (a.currentAffiliate) {
    els.adCurrentAffiliate.innerHTML = `
      <div class="affiliate-card">
        <strong>${a.currentAffiliate.name}</strong>
        <span>${a.currentAffiliate.phone}</span>
        <span class="subtle">Sejak ${fmtDate(a.currentAffiliate.startDate)}</span>
      </div>`;
    els.assignAffiliateSelect.value = a.currentAffiliate.name;
    els.assignForm.elements.namedItem("phone").value = a.currentAffiliate.phone;
    els.assignForm.elements.namedItem("startDate").value = a.currentAffiliate.startDate
      ? a.currentAffiliate.startDate.split("T")[0] : today;
  } else {
    els.adCurrentAffiliate.innerHTML = `<p class="subtle">Tiada affiliate semasa.</p>`;
    els.assignAffiliateSelect.value = "";
    els.assignForm.elements.namedItem("phone").value = "";
    els.assignForm.elements.namedItem("startDate").value = today;
  }

  els.adHistory.innerHTML = a.history.length
    ? a.history.slice().reverse().map((h) => `
        <div class="history-item">
          <strong>${h.name}</strong> <span>${h.phone}</span>
          <span class="subtle">${fmtDate(h.startDate)} → ${fmtDate(h.endDate)}</span>
        </div>`).join("")
    : `<p class="subtle">Tiada sejarah.</p>`;
}

async function populateAffiliateDropdown() {
  if (!state.apiKey) return;
  try {
    const payload = await adminFetch("/api/affiliates?status=approved");
    const select = els.assignAffiliateSelect;
    const current = select.value;
    select.innerHTML = '<option value="">-- Pilih Affiliate --</option>';
    for (const af of payload.affiliates) {
      const opt = document.createElement("option");
      opt.value = af.namaLengkap;
      opt.dataset.phone = af.noFon || "";
      opt.textContent = af.namaLengkap;
      select.appendChild(opt);
    }
    select.value = current;
  } catch (_) {}
}

async function loadAccounts() {
  if (!state.apiKey) return;
  const payload = await adminFetch("/api/accounts");
  state.accounts = payload.accounts;
  if (!state.accounts.some((x) => x.id === state.selectedAccountId))
    state.selectedAccountId = "";
  await populateAffiliateDropdown();
  renderAccountList();
  renderAccountDetail();
}

// Add account button
els.addAccountBtn.addEventListener("click", () => {
  els.accountFormTitle.textContent = "Tambah Akaun Baru";
  els.accountForm.reset();
  els.accountForm.elements.namedItem("id").value = "";
  state.selectedAccountId = "";
  renderAccountList();
  showAccountPanel("form");
});

// Cancel form
els.cancelAccountForm.addEventListener("click", () => {
  showAccountPanel(state.selectedAccountId ? "detail" : "empty");
});

// Save account (add or edit)
els.accountForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(els.accountForm);
  const id = fd.get("id");
  const body = {
    tiktokUsername: fd.get("tiktokUsername"),
    password: fd.get("password"),
    email: fd.get("email"),
    phone: fd.get("phone"),
    type: fd.get("type"),
    status: fd.get("status"),
    notes: fd.get("notes")
  };
  try {
    if (id) {
      await adminFetch(`/api/accounts/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    } else {
      const res = await adminFetch("/api/accounts", { method: "POST", body: JSON.stringify(body) });
      state.selectedAccountId = res.account.id;
    }
    await loadAccounts();
    showAccountPanel("detail");
  } catch (err) { alert(err.message); }
});

// Edit account
els.editAccountBtn.addEventListener("click", () => {
  const a = state.accounts.find((x) => x.id === state.selectedAccountId);
  if (!a) return;
  els.accountFormTitle.textContent = "Edit Akaun";
  els.accountForm.elements.namedItem("id").value = a.id;
  els.accountForm.elements.namedItem("tiktokUsername").value = a.tiktokUsername;
  els.accountForm.elements.namedItem("password").value = a.password;
  els.accountForm.elements.namedItem("email").value = a.email;
  els.accountForm.elements.namedItem("phone").value = a.phone;
  els.accountForm.elements.namedItem("type").value = a.type;
  els.accountForm.elements.namedItem("status").value = a.status;
  els.accountForm.elements.namedItem("notes").value = a.notes;
  showAccountPanel("form");
});

// Mark active
els.markActiveBtn.addEventListener("click", async () => {
  if (!state.selectedAccountId) return;
  try {
    await adminFetch(`/api/accounts/${state.selectedAccountId}/mark-active`, { method: "POST" });
    await loadAccounts();
  } catch (e) { alert(e.message); }
});

// Delete account
els.deleteAccountBtn.addEventListener("click", async () => {
  if (!state.selectedAccountId) return;
  if (!confirm("Padam akaun ini?")) return;
  try {
    await adminFetch(`/api/accounts/${state.selectedAccountId}`, { method: "DELETE" });
    state.selectedAccountId = "";
    await loadAccounts();
    showAccountPanel("empty");
  } catch (e) { alert(e.message); }
});

// Assign affiliate
els.assignForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!state.selectedAccountId) return;
  const fd = new FormData(els.assignForm);
  try {
    await adminFetch(`/api/accounts/${state.selectedAccountId}/assign`, {
      method: "POST",
      body: JSON.stringify({ name: fd.get("name"), phone: fd.get("phone"), startDate: fd.get("startDate") })
    });
    await loadAccounts();
  } catch (e) { alert(e.message); }
});

// ─── AFFILIATES ───────────────────────────────────────────────────────────────
const AF_STATUS_LABEL = { pending: "Pending", approved: "Approved", rejected: "Rejected" };
const AF_STATUS_CLASS = { pending: "awaiting_metadata", approved: "approved", rejected: "rejected" };

function renderAffiliateList() {
  els.affiliateList.innerHTML = "";
  const q = els.affiliateSearch.value.toLowerCase();
  const affiliates = q
    ? state.affiliates.filter((a) =>
        (a.namaLengkap || "").toLowerCase().includes(q) ||
        (a.noFon || "").toLowerCase().includes(q) ||
        (a.emel || "").toLowerCase().includes(q))
    : state.affiliates;
  if (!affiliates.length) {
    els.affiliateList.innerHTML = `<p class="subtle">${q ? "Tiada hasil carian." : "Tiada pendaftaran."}</p>`;
    return;
  }
  affiliates.forEach((a) => {
    const el = document.createElement("article");
    el.className = `submission-item ${a.id === state.selectedAffiliateId ? "active" : ""}`;
    el.innerHTML = `
      <div class="badge ${AF_STATUS_CLASS[a.status]}">${AF_STATUS_LABEL[a.status]}</div>
      <h3>${a.namaLengkap}</h3>
      <p>${a.noFon} · ${a.emel}</p>
      <p class="subtle">${fmtDate(a.submittedAt)}</p>`;
    el.addEventListener("click", () => {
      state.selectedAffiliateId = a.id;
      renderAffiliateList();
      renderAffiliateDetail();
    });
    els.affiliateList.appendChild(el);
  });
}

function renderAffiliateDetail() {
  const a = state.affiliates.find((x) => x.id === state.selectedAffiliateId);
  if (!a) {
    els.affiliateEmptyState.classList.remove("hidden");
    els.affiliateDetailPanel.classList.add("hidden");
    return;
  }
  els.affiliateEmptyState.classList.add("hidden");
  els.affiliateEditPanel.classList.add("hidden");
  els.affiliateDetailPanel.classList.remove("hidden");

  els.afNama.textContent = a.namaLengkap;
  els.afStatus.textContent = AF_STATUS_LABEL[a.status];
  els.afStatus.className = `badge ${AF_STATUS_CLASS[a.status]}`;
  els.afFon.textContent = a.noFon || "—";
  els.afEmel.textContent = a.emel || "—";
  els.afTiktok.textContent = a.akauntTiktok || "—";
  els.afDate.textContent = fmtDate(a.submittedAt);
  els.afAlamat.textContent = a.alamat || [a.alamatBaris1, a.alamatBaris2, a.alamatBaris3, [a.poskod, a.daerah, a.negeri].filter(Boolean).join(", ")].filter(Boolean).join("\n") || "—";
  els.afBank.textContent = a.namaBank || "—";
  els.afAkauntBank.textContent = a.noAkauntBank || "—";
  els.afNotes.value = a.notes || "";

  const managed = state.accounts.filter((acc) => acc.currentAffiliate?.name === a.namaLengkap);
  if (managed.length) {
    els.afManagedAccounts.innerHTML = managed.map((acc) => `
      <div class="history-item">
        <strong>@${acc.tiktokUsername}</strong>
        <span class="badge badge-type" style="margin-left:6px">${acc.type}</span>
        <span class="badge badge-${acc.status.toLowerCase()}" style="margin-left:4px">${acc.status}</span>
        <span class="subtle" style="margin-left:6px">Sejak ${fmtDate(acc.currentAffiliate.startDate)}</span>
      </div>`).join("");
  } else {
    els.afManagedAccounts.innerHTML = `<p class="subtle">Tiada akaun diuruskan.</p>`;
  }
}

// ─── MASTERMIND MIND MAP ──────────────────────────────────────────────────────
const MM = { NW: 190, NH: 44, ROW: 68, GAP: 28, AX: 40, ACX: 290, UX: 560, NAX: 800, SVG_MIN_W: 1020 };
const NS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs) {
  const el = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

function renderMindMap() {
  const svg = els.mindmapSvg;
  svg.innerHTML = "";

  const tree = state.affiliates.map(af => ({
    af,
    accs: state.accounts.filter(a => a.currentAffiliate?.name === af.namaLengkap)
  }));

  if (!tree.length) {
    svg.innerHTML = `<text x="20" y="40" font-family="system-ui" font-size="14" fill="#999">Tiada data. Pastikan affiliate dan akaun sudah dimuatkan.</text>`;
    return;
  }

  let y = MM.GAP;
  const afNodes = [], accNodes = [];

  tree.forEach(({ af, accs }) => {
    const rows = Math.max(1, accs.length);
    const afCY = y + (rows * MM.ROW) / 2 - MM.NH / 2;
    afNodes.push({ af, x: MM.AX, y: afCY, cy: afCY + MM.NH / 2 });

    accs.forEach((acc, i) => {
      const accY = y + i * MM.ROW + (MM.ROW - MM.NH) / 2;
      accNodes.push({ acc, x: MM.ACX, y: accY, cy: accY + MM.NH / 2, parentCY: afCY + MM.NH / 2 });
    });

    if (!accs.length) {
      accNodes.push({ empty: true, x: MM.ACX, y: afCY, cy: afCY + MM.NH / 2, parentCY: afCY + MM.NH / 2 });
    }

    y += rows * MM.ROW + MM.GAP;
  });

  // Unassigned accounts
  const unassigned = state.accounts.filter(a => !a.currentAffiliate);
  const leftH = y + MM.GAP;
  const noAccCount = state.affiliates.filter(af => !state.accounts.some(a => a.currentAffiliate?.name === af.namaLengkap)).length;
  const rightH = MM.GAP + 36 + unassigned.length * MM.ROW + MM.GAP;
  const col3H = MM.GAP + 36 + noAccCount * MM.ROW + MM.GAP;
  const svgH = Math.max(leftH, rightH, col3H);
  const svgW = Math.max(MM.SVG_MIN_W, MM.UX + MM.NW + MM.GAP);
  svg.setAttribute("width", svgW);
  svg.setAttribute("height", svgH);

  // Divider line
  const divX = MM.UX - 20;
  svg.appendChild(svgEl("line", { x1: divX, y1: 0, x2: divX, y2: svgH, stroke: "#e8d9c8", "stroke-width": "1.5", "stroke-dasharray": "6,4" }));

  // Unassigned header
  const hdr = svgEl("text", { x: MM.UX, y: MM.GAP + 16, fill: "#e05a2b", "font-size": "13", "font-weight": "700", "font-family": "system-ui, sans-serif" });
  hdr.textContent = `⚠ Belum Di-Assign (${unassigned.length})`;
  svg.appendChild(hdr);

  // Draw curved lines (assigned)
  accNodes.forEach(n => {
    const x1 = MM.AX + MM.NW, y1 = n.parentCY;
    const x2 = n.x, y2 = n.cy;
    const mx = (x1 + x2) / 2;
    svg.appendChild(svgEl("path", {
      d: `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`,
      fill: "none", stroke: "#d4b896", "stroke-width": "1.5"
    }));
  });

  // Draw affiliate nodes
  afNodes.forEach(({ af, x, y: ny }) => {
    const g = document.createElementNS(NS, "g");
    g.style.cursor = "default";
    g.appendChild(svgEl("rect", { x, y: ny, width: MM.NW, height: MM.NH, rx: 10, fill: "#c0834f", stroke: "#a0663a", "stroke-width": "1.5" }));
    const label = af.namaLengkap.length > 22 ? af.namaLengkap.slice(0, 20) + "…" : af.namaLengkap;
    const t = svgEl("text", { x: x + MM.NW / 2, y: ny + MM.NH / 2 + 5, "text-anchor": "middle", fill: "white", "font-size": "13", "font-weight": "600", "font-family": "system-ui, sans-serif" });
    t.textContent = label;
    g.appendChild(t);
    svg.appendChild(g);
  });

  const statusColors = { active: "#22a06b", idle: "#888", expired: "#e74c3c", suspended: "#c0392b" };

  function drawAccountNode(acc, x, ny, fillColor, strokeColor) {
    const g = document.createElementNS(NS, "g");
    g.style.cursor = "pointer";
    const rect = svgEl("rect", { x, y: ny, width: MM.NW, height: MM.NH, rx: 10, fill: fillColor, stroke: strokeColor, "stroke-width": "1.5" });
    g.appendChild(rect);
    g.appendChild(svgEl("circle", { cx: x + 14, cy: ny + MM.NH / 2, r: 5, fill: statusColors[acc.status.toLowerCase()] || "#888" }));
    const label = `@${acc.tiktokUsername}`;
    const t = svgEl("text", { x: x + 26, y: ny + MM.NH / 2 + 5, fill: "#5a3e2b", "font-size": "13", "font-family": "system-ui, sans-serif" });
    t.textContent = label.length > 20 ? label.slice(0, 18) + "…" : label;
    g.appendChild(t);
    g.addEventListener("click", () => showMmPopup(acc));
    g.addEventListener("mouseenter", () => rect.setAttribute("fill", fillColor === "#fdf6ee" ? "#f0e4d4" : "#fde8e8"));
    g.addEventListener("mouseleave", () => rect.setAttribute("fill", fillColor));
    svg.appendChild(g);
  }

  // Draw assigned account nodes
  accNodes.forEach(n => {
    if (n.empty) {
      const t = svgEl("text", { x: n.x + 10, y: n.cy + 5, fill: "#bbb", "font-size": "12", "font-family": "system-ui, sans-serif" });
      t.textContent = "Tiada akaun";
      svg.appendChild(t);
      return;
    }
    drawAccountNode(n.acc, n.x, n.y, "#fdf6ee", "#d4b896");
  });

  // Draw unassigned account nodes
  unassigned.forEach((acc, i) => {
    const ny = MM.GAP + 36 + i * MM.ROW;
    drawAccountNode(acc, MM.UX, ny, "#fff0ee", "#f5b8b0");
  });

  if (!unassigned.length) {
    const t = svgEl("text", { x: MM.UX, y: MM.GAP + 52, fill: "#22a06b", "font-size": "13", "font-family": "system-ui, sans-serif" });
    t.textContent = "✓ Semua akaun dah di-assign";
    svg.appendChild(t);
  }

  // ── Affiliates tanpa akaun ──
  const noAccAffiliates = state.affiliates.filter(af =>
    !state.accounts.some(a => a.currentAffiliate?.name === af.namaLengkap)
  );

  const div2X = MM.NAX - 20;
  svg.appendChild(svgEl("line", { x1: div2X, y1: 0, x2: div2X, y2: svgH, stroke: "#e8d9c8", "stroke-width": "1.5", "stroke-dasharray": "6,4" }));

  const hdr2 = svgEl("text", { x: MM.NAX, y: MM.GAP + 16, fill: "#888", "font-size": "13", "font-weight": "700", "font-family": "system-ui, sans-serif" });
  hdr2.textContent = `Affiliate Belum Ada Akaun (${noAccAffiliates.length})`;
  svg.appendChild(hdr2);

  if (!noAccAffiliates.length) {
    const t = svgEl("text", { x: MM.NAX, y: MM.GAP + 52, fill: "#22a06b", "font-size": "13", "font-family": "system-ui, sans-serif" });
    t.textContent = "✓ Semua affiliate dah ada akaun";
    svg.appendChild(t);
  } else {
    noAccAffiliates.forEach((af, i) => {
      const ny = MM.GAP + 36 + i * MM.ROW;
      const g = document.createElementNS(NS, "g");
      const rect = svgEl("rect", { x: MM.NAX, y: ny, width: MM.NW, height: MM.NH, rx: 10, fill: "#f5f5f5", stroke: "#ccc", "stroke-width": "1.5" });
      g.appendChild(rect);
      const label = af.namaLengkap.length > 22 ? af.namaLengkap.slice(0, 20) + "…" : af.namaLengkap;
      const t = svgEl("text", { x: MM.NAX + MM.NW / 2, y: ny + MM.NH / 2 + 5, "text-anchor": "middle", fill: "#888", "font-size": "12", "font-family": "system-ui, sans-serif" });
      t.textContent = label;
      g.appendChild(t);
      svg.appendChild(g);
    });
  }
}

function showMmPopup(acc) {
  els.mmPopUsername.textContent = `@${acc.tiktokUsername}`;
  els.mmPopType.textContent = acc.type;
  els.mmPopType.className = `badge badge-type`;
  els.mmPopStatus.textContent = acc.status;
  els.mmPopStatus.className = `badge badge-${acc.status.toLowerCase()}`;
  els.mmPopEmail.textContent = acc.email || "—";
  els.mmPopPhone.textContent = acc.phone || "—";
  els.mmPopPassword.textContent = acc.password || "—";
  els.mmPopLastActive.textContent = acc.lastActive ? fmtDate(acc.lastActive) : "—";
  els.mmPopAffiliate.textContent = acc.currentAffiliate ? `${acc.currentAffiliate.name} · ${acc.currentAffiliate.phone}` : "Tiada";
  els.mmPopTiktokLink.href = `https://www.tiktok.com/@${acc.tiktokUsername}`;
  els.mmPopup.classList.remove("hidden");
}

els.mmPopupClose.addEventListener("click", () => els.mmPopup.classList.add("hidden"));

async function loadAffiliates() {
  if (!state.apiKey) return;
  const q = els.affiliateStatusFilter.value ? `?status=${els.affiliateStatusFilter.value}` : "";
  const payload = await adminFetch(`/api/affiliates${q}`);
  state.affiliates = payload.affiliates;
  if (!state.affiliates.some((x) => x.id === state.selectedAffiliateId))
    state.selectedAffiliateId = "";
  renderAffiliateList();
  renderAffiliateDetail();
}

els.affiliateStatusFilter.addEventListener("change", () => loadAffiliates());
els.affiliateSearch.addEventListener("input", () => renderAffiliateList());
els.accountSearch.addEventListener("input", () => renderAccountList());

els.afApproveBtn.addEventListener("click", async () => {
  if (!state.selectedAffiliateId) return;
  try {
    await adminFetch(`/api/affiliates/${state.selectedAffiliateId}`, {
      method: "PATCH", body: JSON.stringify({ status: "approved" })
    });
    await loadAffiliates();
  } catch (e) { alert(e.message); }
});

els.afRejectBtn.addEventListener("click", async () => {
  if (!state.selectedAffiliateId) return;
  try {
    await adminFetch(`/api/affiliates/${state.selectedAffiliateId}`, {
      method: "PATCH", body: JSON.stringify({ status: "rejected" })
    });
    await loadAffiliates();
  } catch (e) { alert(e.message); }
});

function openAffiliateForm(a = null) {
  const f = els.affiliateEditForm;
  f.elements.namedItem("id").value = a?.id || "";
  f.namaLengkap.value = a?.namaLengkap || "";
  f.noFon.value = a?.noFon || "";
  f.emel.value = a?.emel || "";
  f.akauntTiktok.value = a?.akauntTiktok || "";
  f.submittedAt.value = a?.submittedAt ? a.submittedAt.slice(0, 16) : "";
  f.namaBank.value = a?.namaBank || "";
  f.noAkauntBank.value = a?.noAkauntBank || "";
  f.alamat.value = a?.alamat || [a?.alamatBaris1, a?.alamatBaris2, a?.alamatBaris3, [a?.poskod, a?.daerah, a?.negeri].filter(Boolean).join(", ")].filter(Boolean).join("\n") || "";
  els.affiliateEditTitle.textContent = a ? "Edit Maklumat Affiliate" : "Tambah Affiliate Baru";
  els.affiliateEmptyState.classList.add("hidden");
  els.affiliateDetailPanel.classList.add("hidden");
  els.affiliateEditPanel.classList.remove("hidden");
}

els.addAffiliateBtn.addEventListener("click", () => {
  state.selectedAffiliateId = "";
  renderAffiliateList();
  openAffiliateForm(null);
});

els.afEditBtn.addEventListener("click", () => {
  const a = state.affiliates.find((x) => x.id === state.selectedAffiliateId);
  if (!a) return;
  openAffiliateForm(a);
});

els.afEditCancelBtn.addEventListener("click", () => {
  els.affiliateEditPanel.classList.add("hidden");
  els.affiliateDetailPanel.classList.remove("hidden");
});

els.affiliateEditForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = els.affiliateEditForm;
  const id = f.elements.namedItem("id").value;
  const body = {
    namaLengkap: f.namaLengkap.value,
    noFon: f.noFon.value,
    emel: f.emel.value,
    akauntTiktok: f.akauntTiktok.value,
    submittedAt: f.submittedAt.value ? new Date(f.submittedAt.value).toISOString() : undefined,
    namaBank: f.namaBank.value,
    noAkauntBank: f.noAkauntBank.value,
    alamat: f.alamat.value,
  };
  try {
    if (id) {
      await adminFetch(`/api/affiliates/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    } else {
      const res = await adminFetch("/api/affiliates", { method: "POST", body: JSON.stringify(body) });
      state.selectedAffiliateId = res.affiliate.id;
    }
    els.affiliateEditPanel.classList.add("hidden");
    els.affiliateDetailPanel.classList.remove("hidden");
    await loadAffiliates();
  } catch (err) { alert(err.message); }
});

els.afDeleteBtn.addEventListener("click", async () => {
  if (!state.selectedAffiliateId || !confirm("Padam rekod affiliate ini?")) return;
  try {
    await adminFetch(`/api/affiliates/${state.selectedAffiliateId}`, { method: "DELETE" });
    state.selectedAffiliateId = "";
    await loadAffiliates();
  } catch (e) { alert(e.message); }
});

els.afSaveNotes.addEventListener("click", async () => {
  if (!state.selectedAffiliateId) return;
  try {
    await adminFetch(`/api/affiliates/${state.selectedAffiliateId}`, {
      method: "PATCH", body: JSON.stringify({ notes: els.afNotes.value })
    });
    await loadAffiliates();
  } catch (e) { alert(e.message); }
});

// Unassign affiliate
els.assignAffiliateSelect.addEventListener("change", () => {
  const selected = els.assignAffiliateSelect.selectedOptions[0];
  els.assignForm.elements.namedItem("phone").value = selected ? (selected.dataset.phone || "") : "";
});

els.unassignBtn.addEventListener("click", async () => {
  if (!state.selectedAccountId) return;
  if (!confirm("Unassign affiliate dari akaun ni?")) return;
  try {
    await adminFetch(`/api/accounts/${state.selectedAccountId}/unassign`, { method: "POST" });
    await loadAccounts();
  } catch (e) { alert(e.message); }
});

// ─── DATA TIKTOK TAB ──────────────────────────────────────────────────────────

// Set default date range to current month
(function initDateRange() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  els.reportStartDate.value = firstDay.toISOString().slice(0, 10);
  els.reportEndDate.value = today.toISOString().slice(0, 10);
})();

async function loadReportingAccounts() {
  els.reportingAccountList.innerHTML = "<p class='subtle'>Memuatkan...</p>";
  try {
    const { accounts } = await adminFetch("/api/reporting/accounts");
    if (!accounts.length) {
      els.reportingAccountList.innerHTML = "<p class='subtle'>Tiada akaun.</p>";
      return;
    }
    els.reportingAccountList.innerHTML = `
      <table class="reporting-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Jenis</th>
            <th>Shop</th>
            <th>Status</th>
            <th>Tindakan</th>
          </tr>
        </thead>
        <tbody>
          ${accounts.map((a) => {
            const conn = a.shopConnect || {};
            const isConnected = conn.connected;
            return `<tr>
              <td><strong>@${a.tiktokUsername}</strong></td>
              <td>${a.type}</td>
              <td>${isConnected ? (conn.shopName || "—") : "—"}</td>
              <td><span class="badge ${isConnected ? "approved" : "rejected"}">${isConnected ? "Bersambung" : "Tidak bersambung"}</span></td>
              <td>
                ${isConnected
                  ? `<button class="ghost small disconnect-btn" data-id="${a.id}">Putus</button>
                     <button class="primary small sync-one-btn" data-id="${a.id}">Sync</button>`
                  : `<a href="/auth/tiktok/connect/${a.id}" target="_blank" class="primary small" style="text-decoration:none;display:inline-block;padding:4px 10px;border-radius:6px">Connect</a>`
                }
              </td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>`;

    // Attach disconnect handlers
    els.reportingAccountList.querySelectorAll(".disconnect-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Putus sambungan akaun ini?")) return;
        try {
          await adminFetch(`/api/reporting/disconnect/${btn.dataset.id}`, { method: "POST" });
          loadReportingAccounts();
        } catch (e) { alert(e.message); }
      });
    });

    // Attach single sync handlers
    els.reportingAccountList.querySelectorAll(".sync-one-btn").forEach((btn) => {
      btn.addEventListener("click", () => syncAccount(btn.dataset.id));
    });
  } catch (e) {
    els.reportingAccountList.innerHTML = `<p class="subtle">Ralat: ${e.message}</p>`;
  }
}

async function syncAccount(accountId) {
  const startDate = els.reportStartDate.value;
  const endDate = els.reportEndDate.value;
  if (!startDate || !endDate) { alert("Pilih tarikh dahulu"); return; }
  els.reportingResults.innerHTML = "<p class='subtle'>Sync sedang berjalan...</p>";
  try {
    const res = await adminFetch(`/api/reporting/sync/${accountId}`, {
      method: "POST",
      body: JSON.stringify({ startDate, endDate })
    });
    renderReportingData([res.data]);
  } catch (e) {
    els.reportingResults.innerHTML = `<p class="subtle">Ralat: ${e.message}</p>`;
  }
}

async function syncAll() {
  const startDate = els.reportStartDate.value;
  const endDate = els.reportEndDate.value;
  if (!startDate || !endDate) { alert("Pilih tarikh dahulu"); return; }
  els.syncAllBtn.disabled = true;
  els.syncAllBtn.textContent = "Syncing...";
  els.reportingResults.innerHTML = "<p class='subtle'>Sync semua akaun sedang berjalan...</p>";
  try {
    const res = await adminFetch("/api/reporting/sync-all", {
      method: "POST",
      body: JSON.stringify({ startDate, endDate })
    });
    renderReportingData(res.data);
  } catch (e) {
    els.reportingResults.innerHTML = `<p class="subtle">Ralat: ${e.message}</p>`;
  } finally {
    els.syncAllBtn.disabled = false;
    els.syncAllBtn.textContent = "Sync Semua";
  }
}

function renderReportingData(dataList) {
  if (!dataList || !dataList.length) {
    els.reportingResults.innerHTML = "<p class='subtle'>Tiada data.</p>";
    return;
  }
  els.reportingResults.innerHTML = dataList.map((d) => {
    if (d.error) {
      return `<div class="reporting-result-card"><strong>@${d.tiktokUsername}</strong> — <span class="subtle">${d.error}</span></div>`;
    }

    const fmt = (v) => (v !== undefined && v !== null && !isNaN(v)) ? `RM ${parseFloat(v).toFixed(2)}` : "—";

    // Orders
    const orderList = d.orders?.data?.orders || [];
    const orderCount = d.orders?.data?.total_count ?? orderList.length;
    const orderErr = (d.orders?.code && d.orders.code !== 0) ? d.orders.message : (d.orders?.error || null);
    const gmvTotal = orderList.reduce((s, o) => {
      const amt = o.payment_info?.total_amount ?? o.total_amount ?? o.item_list?.reduce((x, i) => x + parseFloat(i.sale_price ?? 0), 0) ?? 0;
      return s + parseFloat(amt);
    }, 0);

    // Statements
    const stmtData = d.statements?.data;
    const stmtList = stmtData?.statements || stmtData?.list || [];
    const stmtErr = (d.statements?.code && d.statements.code !== 0) ? d.statements.message : (d.statements?.error || null);
    const stmtTotal = stmtList.reduce((s, r) => s + parseFloat(r.settlement_amount ?? r.total_amount ?? r.amount ?? 0), 0);

    const stmtNote = stmtErr
      ? (stmtErr.includes("cipher") ? "⚠ App perlu jenis ISV untuk akses finance" : stmtErr)
      : `${stmtList.length} rekod`;
    const orderNote = orderErr
      ? (orderErr.includes("scope") || orderErr.includes("authorized") || orderErr.includes("Access denied")
          ? "⚠ Perlu tukar app ke jenis ISV dalam Partner Center"
          : orderErr)
      : `${orderCount} pesanan`;

    const rows = [
      ["Sales Live GMV", "—", "⏳ Scope analytics TikTok pending kelulusan"],
      ["Sales Video (VTT)", "—", "⏳ Scope analytics TikTok pending kelulusan"],
      ["Total GMV (Pesanan)", orderErr ? "—" : fmt(gmvTotal), orderNote],
      ["Penyata Kewangan", stmtErr ? "—" : (stmtList.length ? fmt(stmtTotal) : "RM 0.00"), stmtNote],
      ["Spent", "—", "Data dari TikTok Ads (belum dilaksanakan)"],
      ["ROI", "—", "Memerlukan data Spent"],
    ];

    return `
      <div class="reporting-result-card">
        <div class="result-header">
          <h4>@${d.tiktokUsername} — ${d.shopName || d.shopId}</h4>
          <p class="subtle">${d.startDate} hingga ${d.endDate}</p>
        </div>
        <table class="data-table">
          <thead><tr><th>Metrik</th><th>Nilai</th><th>Catatan</th></tr></thead>
          <tbody>
            ${rows.map(([label, val, note]) => `
              <tr>
                <td>${label}</td>
                <td class="${val === "—" ? "subtle" : "metric-val"}">${val}</td>
                <td class="subtle">${note || ""}</td>
              </tr>`).join("")}
          </tbody>
        </table>
        <details style="margin-top:12px">
          <summary class="subtle" style="cursor:pointer;font-size:12px">Lihat JSON penuh</summary>
          <pre style="font-size:10px;overflow:auto;max-height:200px;margin-top:8px">${JSON.stringify(d, null, 2)}</pre>
        </details>
      </div>`;
  }).join("");
}

els.syncAllBtn.addEventListener("click", syncAll);

// ═══════════════════════════════════════════════════════════════════════════════
// CONTENT STUDIO
// ═══════════════════════════════════════════════════════════════════════════════

const studio = {
  generatedImageUrl: null,
  lastNiche: "",
  lastProduct: "",
  lastImageStyle: "",
  lastLanguage: "ms"
};

const studioEls = {
  accountStatus: document.getElementById("creatorAccountStatus"),
  connectBtn: document.getElementById("connectCreatorBtn"),
  disconnectBtn: document.getElementById("disconnectCreatorBtn"),
  generateForm: document.getElementById("generateForm"),
  generateBtn: document.getElementById("generateBtn"),
  captionOnlyBtn: document.getElementById("captionOnlyBtn"),
  generateStatus: document.getElementById("generateStatus"),
  emptyState: document.getElementById("studioEmptyState"),
  previewPanel: document.getElementById("studioPreviewPanel"),
  generatedImage: document.getElementById("generatedImage"),
  studioImageWrap: document.getElementById("studioImageWrap"),
  generatedCaption: document.getElementById("generatedCaption"),
  generatedHashtags: document.getElementById("generatedHashtags"),
  postType: document.getElementById("postType"),
  postPrivacy: document.getElementById("postPrivacy"),
  videoUrlBlock: document.getElementById("videoUrlBlock"),
  videoUrlInput: document.getElementById("videoUrlInput"),
  scheduleCheck: document.getElementById("scheduleCheck"),
  scheduleBlock: document.getElementById("scheduleBlock"),
  scheduleTime: document.getElementById("scheduleTime"),
  postToTiktokBtn: document.getElementById("postToTiktokBtn"),
  regenerateBtn: document.getElementById("regenerateBtn"),
  postStatus: document.getElementById("postStatus"),
  refreshPostsBtn: document.getElementById("refreshPostsBtn"),
  postHistoryList: document.getElementById("postHistoryList")
};

function studioSetStatus(msg, isError = false) {
  studioEls.generateStatus.style.display = msg ? "block" : "none";
  studioEls.generateStatus.textContent = msg;
  studioEls.generateStatus.style.color = isError ? "#e53e3e" : "";
}

function studioSetPostStatus(msg, isError = false) {
  studioEls.postStatus.style.display = msg ? "block" : "none";
  studioEls.postStatus.textContent = msg;
  studioEls.postStatus.style.color = isError ? "#e53e3e" : "";
}

async function studioLoadAccounts() {
  try {
    const { accounts } = await adminFetch("/api/studio/accounts");
    const account = accounts[0];
    if (account) {
      studioEls.accountStatus.textContent = `Disambungkan: @${account.displayName || account.openId}`;
      studioEls.accountStatus.style.color = "#2f9e44";
      studioEls.connectBtn.classList.add("hidden");
      studioEls.disconnectBtn.classList.remove("hidden");
      studioEls.disconnectBtn.dataset.openId = account.openId;
    } else {
      studioEls.accountStatus.textContent = "Belum sambung akaun TikTok Creator";
      studioEls.accountStatus.style.color = "";
      studioEls.connectBtn.classList.remove("hidden");
      studioEls.disconnectBtn.classList.add("hidden");
    }
  } catch (e) {
    studioEls.accountStatus.textContent = "Gagal semak akaun";
  }
}

async function studioLoadPosts() {
  try {
    const { posts } = await adminFetch("/api/studio/posts");
    if (!posts.length) {
      studioEls.postHistoryList.innerHTML = '<p class="subtle">Belum ada post.</p>';
      return;
    }
    studioEls.postHistoryList.innerHTML = posts.map((p) => {
      const date = new Date(p.scheduledAt || p.createdAt).toLocaleString("ms-MY");
      const badgeColor = p.status === "published" ? "#2f9e44" : p.status === "failed" ? "#e53e3e" : "#e07b00";
      const preview = p.imageUrls?.[0]
        ? `<img src="${p.imageUrls[0]}" style="width:56px;height:56px;object-fit:cover;border-radius:6px;flex-shrink:0" alt="">`
        : `<div style="width:56px;height:56px;background:#eee;border-radius:6px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:20px">🎬</div>`;
      return `
        <div style="display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-bottom:1px solid #eee">
          ${preview}
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span style="background:${badgeColor};color:#fff;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600">${p.status.toUpperCase()}</span>
              <span class="subtle" style="font-size:12px">${p.type} • ${date}</span>
            </div>
            <p style="margin:0;font-size:13px;white-space:pre-wrap;overflow:hidden;max-height:50px">${p.caption || ""}</p>
          </div>
        </div>`;
    }).join("");
  } catch (e) {
    studioEls.postHistoryList.innerHTML = `<p class="subtle" style="color:#e53e3e">Gagal load post: ${e.message}</p>`;
  }
}

function studioShowPreview({ imageUrl, caption, hashtags }) {
  if (imageUrl) {
    studioEls.generatedImage.src = imageUrl;
    studioEls.studioImageWrap.style.display = "block";
  } else {
    studioEls.studioImageWrap.style.display = "none";
  }
  studioEls.generatedCaption.value = caption || "";
  studioEls.generatedHashtags.value = hashtags || "";
  studioEls.emptyState.classList.add("hidden");
  studioEls.previewPanel.classList.remove("hidden");
  studio.generatedImageUrl = imageUrl;
}

studioEls.generateForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const niche = fd.get("niche").trim();
  const product = fd.get("product").trim();
  const imageStyle = fd.get("imageStyle");
  const language = fd.get("language");

  studio.lastNiche = niche;
  studio.lastProduct = product;
  studio.lastImageStyle = imageStyle;
  studio.lastLanguage = language;

  studioEls.generateBtn.disabled = true;
  studioEls.generateBtn.textContent = "Menjana...";
  studioSetStatus("Jana gambar dan caption... (ambil ~15 saat)");

  try {
    const result = await adminFetch("/api/studio/generate", {
      method: "POST",
      body: JSON.stringify({ niche, product, imageStyle, language })
    });
    studioSetStatus("");
    studioShowPreview({
      imageUrl: result.image?.publicUrl,
      caption: result.caption,
      hashtags: result.hashtags
    });
  } catch (err) {
    studioSetStatus(`Gagal: ${err.message}`, true);
  } finally {
    studioEls.generateBtn.disabled = false;
    studioEls.generateBtn.textContent = "Jana Sekarang";
  }
});

studioEls.captionOnlyBtn.addEventListener("click", async () => {
  const fd = new FormData(studioEls.generateForm);
  const niche = fd.get("niche").trim();
  if (!niche) { studioSetStatus("Isi niche dahulu", true); return; }

  studioEls.captionOnlyBtn.disabled = true;
  studioEls.captionOnlyBtn.textContent = "Menjana...";
  studioSetStatus("Jana caption...");

  try {
    const result = await adminFetch("/api/studio/generate/caption", {
      method: "POST",
      body: JSON.stringify({
        niche,
        product: fd.get("product").trim(),
        imageStyle: fd.get("imageStyle"),
        language: fd.get("language")
      })
    });
    studioSetStatus("");
    studioEls.generatedCaption.value = result.caption || "";
    studioEls.generatedHashtags.value = result.hashtags || "";
    if (studioEls.previewPanel.classList.contains("hidden")) {
      studioEls.emptyState.classList.add("hidden");
      studioEls.previewPanel.classList.remove("hidden");
    }
  } catch (err) {
    studioSetStatus(`Gagal: ${err.message}`, true);
  } finally {
    studioEls.captionOnlyBtn.disabled = false;
    studioEls.captionOnlyBtn.textContent = "Caption Sahaja";
  }
});

studioEls.regenerateBtn.addEventListener("click", () => {
  studioEls.generateForm.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
});

studioEls.postType.addEventListener("change", () => {
  studioEls.videoUrlBlock.style.display = studioEls.postType.value === "video_url" ? "block" : "none";
});

studioEls.scheduleCheck.addEventListener("change", () => {
  studioEls.scheduleBlock.style.display = studioEls.scheduleCheck.checked ? "block" : "none";
});

studioEls.postToTiktokBtn.addEventListener("click", async () => {
  const caption = studioEls.generatedCaption.value.trim();
  const hashtags = studioEls.generatedHashtags.value.trim();
  const type = studioEls.postType.value;
  const privacyLevel = studioEls.postPrivacy.value;
  const scheduledAt = studioEls.scheduleCheck.checked && studioEls.scheduleTime.value
    ? new Date(studioEls.scheduleTime.value).toISOString()
    : null;

  if (!caption) { studioSetPostStatus("Caption tidak boleh kosong", true); return; }

  const body = { type, caption, hashtags, privacyLevel, scheduledAt };

  if (type === "photo") {
    if (!studio.generatedImageUrl) { studioSetPostStatus("Tiada gambar untuk post. Jana gambar dahulu.", true); return; }
    body.imageUrls = [studio.generatedImageUrl];
  } else if (type === "video_url") {
    const videoUrl = studioEls.videoUrlInput.value.trim();
    if (!videoUrl) { studioSetPostStatus("Masukkan URL video", true); return; }
    body.videoUrl = videoUrl;
  }

  studioEls.postToTiktokBtn.disabled = true;
  studioEls.postToTiktokBtn.textContent = "Posting...";
  studioSetPostStatus("Hantar ke TikTok...");

  try {
    const { post } = await adminFetch("/api/studio/posts", {
      method: "POST",
      body: JSON.stringify(body)
    });
    const label = scheduledAt ? `Dijadualkan: ${new Date(scheduledAt).toLocaleString("ms-MY")}` : "Berjaya dipost!";
    studioSetPostStatus(label);
    studioEls.postToTiktokBtn.textContent = "Post ke TikTok";
    studioEls.postToTiktokBtn.disabled = false;
    studioLoadPosts();
  } catch (err) {
    studioSetPostStatus(`Gagal: ${err.message}`, true);
    studioEls.postToTiktokBtn.disabled = false;
    studioEls.postToTiktokBtn.textContent = "Post ke TikTok";
  }
});

studioEls.disconnectBtn.addEventListener("click", async () => {
  const openId = studioEls.disconnectBtn.dataset.openId;
  if (!openId) return;
  if (!confirm("Putus sambungan akaun TikTok ini?")) return;
  try {
    await adminFetch(`/auth/creator/disconnect/${openId}`, { method: "POST" });
    studioLoadAccounts();
  } catch (e) {
    alert("Gagal: " + e.message);
  }
});

studioEls.refreshPostsBtn.addEventListener("click", studioLoadPosts);

function studioInit() {
  studioLoadAccounts();
  studioLoadPosts();

  // Handle ?tab=studio&connected=1 redirect from OAuth
  const params = new URLSearchParams(window.location.search);
  if (params.get("connected")) {
    studioSetStatus("Akaun TikTok berjaya disambungkan!");
    window.history.replaceState({}, "", "/");
  }
  if (params.get("error")) {
    studioSetStatus(`OAuth error: ${params.get("error")}`, true);
    window.history.replaceState({}, "", "/");
  }
}

// Auto-open studio tab if redirected from OAuth
(function () {
  const params = new URLSearchParams(window.location.search);
  if (params.get("tab") === "studio") {
    showTab("studio");
  }
})();

