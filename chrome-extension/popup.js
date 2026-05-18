// ── Settings ──────────────────────────────────────────────────────────────────

const DEFAULT_SERVER = "http://localhost:3000";
let serverUrl = DEFAULT_SERVER;
let apiKey = "change-me";
let currentFilter = "pending";

async function loadSettings() {
  const data = await chrome.storage.local.get(["serverUrl", "apiKey"]);
  serverUrl = data.serverUrl || DEFAULT_SERVER;
  apiKey = data.apiKey || "change-me";
  document.getElementById("serverUrl").value = serverUrl;
  document.getElementById("apiKey").value = apiKey;
  document.getElementById("serverIndicator").textContent = `Server: ${serverUrl}`;
}

document.getElementById("saveSettings").addEventListener("click", async () => {
  serverUrl = document.getElementById("serverUrl").value.trim() || DEFAULT_SERVER;
  apiKey = document.getElementById("apiKey").value.trim() || "change-me";
  await chrome.storage.local.set({ serverUrl, apiKey });
  document.getElementById("serverIndicator").textContent = `Server: ${serverUrl}`;
  document.getElementById("settingsPanel").style.display = "none";
  loadKits();
});

document.getElementById("toggleSettings").addEventListener("click", () => {
  const p = document.getElementById("settingsPanel");
  p.style.display = p.style.display === "none" ? "block" : "none";
});

document.getElementById("refreshBtn").addEventListener("click", loadKits);

// Filter tabs
document.querySelectorAll(".filter-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".filter-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentFilter = tab.dataset.status;
    loadKits();
  });
});

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const res = await fetch(`${serverUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(options.headers || {})
    }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request gagal");
  return data;
}

function escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Load Kits ─────────────────────────────────────────────────────────────────

async function loadKits() {
  const listEl = document.getElementById("kitList");
  listEl.innerHTML = '<div class="empty"><strong>Memuatkan...</strong></div>';

  try {
    const query = currentFilter ? `?status=${currentFilter}` : "";
    const { kits } = await apiFetch(`/api/batch/kits${query}`);

    document.getElementById("kitCount").textContent = `${kits.length} kit${currentFilter ? ` (${currentFilter})` : ""}`;

    if (!kits.length) {
      listEl.innerHTML = `<div class="empty"><strong>Tiada kit ${currentFilter || ""}.</strong>${currentFilter === "pending" ? "Jana copy dalam webapp dahulu." : ""}</div>`;
      return;
    }

    listEl.innerHTML = kits.map((kit) => `
      <div class="kit-item ${kit.status}" data-id="${kit.id}">
        <div class="kit-top">
          <div class="kit-account">@${escHtml(kit.displayName || kit.openId)}</div>
          <span class="badge badge-${kit.status}">${kit.status}</span>
        </div>
        ${kit.headline ? `<div class="kit-headline">${escHtml(kit.headline)}</div>` : ""}
        <div class="kit-caption">${escHtml(kit.caption || "")}</div>
        <div class="kit-actions" id="actions-${kit.id}">
          ${kit.status === "pending" || kit.status === "in_progress" ? `
            <button class="btn-primary btn-sm post-btn" data-id="${kit.id}">▶ Auto-fill TikTok</button>
            ${kit.status === "in_progress" ? `<button class="btn-success btn-sm confirm-btn" data-id="${kit.id}">✓ Dah Post?</button>` : ""}
            <button class="btn-ghost btn-sm skip-btn" data-id="${kit.id}">Skip</button>
          ` : kit.status === "posted" ? `
            <span style="color:#38a169;font-size:12px">✓ Sudah dipost</span>
          ` : ""}
        </div>
        <div class="kit-status" id="status-${kit.id}"></div>
      </div>
    `).join("");

    // Bind buttons
    listEl.querySelectorAll(".post-btn").forEach((btn) => {
      btn.addEventListener("click", () => postKit(btn.dataset.id));
    });
    listEl.querySelectorAll(".confirm-btn").forEach((btn) => {
      btn.addEventListener("click", () => markPosted(btn.dataset.id));
    });
    listEl.querySelectorAll(".skip-btn").forEach((btn) => {
      btn.addEventListener("click", () => skipKit(btn.dataset.id));
    });
  } catch (e) {
    listEl.innerHTML = `<div class="empty" style="color:#e53e3e"><strong>Gagal connect ke server.</strong>${e.message}<br><br>Pastikan server berjalan dan URL/API key betul dalam Settings.</div>`;
  }
}

// ── Post a Kit ────────────────────────────────────────────────────────────────

async function postKit(kitId) {
  const btn = document.querySelector(`.post-btn[data-id="${kitId}"]`);
  const statusEl = document.getElementById(`status-${kitId}`);
  const actionsEl = document.getElementById(`actions-${kitId}`);

  btn.disabled = true;
  btn.textContent = "⏳ Menyediakan...";
  setStatus(statusEl, "");

  try {
    // Get full kit list and find this kit
    const { kits } = await apiFetch("/api/batch/kits");
    const kit = kits.find((k) => k.id === kitId);
    if (!kit) throw new Error("Kit tidak dijumpai");

    // Fetch image from server
    setStatus(statusEl, "Memuat turun gambar...");
    const imageResp = await fetch(kit.imageUrl);
    if (!imageResp.ok) throw new Error(`Gambar tidak boleh dimuat: ${imageResp.status}`);
    const imageBlob = await imageResp.blob();
    const imageBase64 = await blobToBase64(imageBlob);
    const imageBase64Data = imageBase64.split(",")[1];
    const imageType = imageBlob.type || "image/jpeg";
    const imageName = decodeURIComponent(kit.imageUrl.split("/").pop()) || "image.jpg";

    // Build caption
    const captionText = buildCaption(kit);

    // Find or open TikTok upload tab
    setStatus(statusEl, "Membuka TikTok Upload...");
    const tab = await getOrOpenTikTokTab();
    await sleep(2500);

    // Inject auto-fill
    setStatus(statusEl, "Auto-fill form TikTok...");
    btn.textContent = "⏳ Mengisi form...";

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: fillTikTokUploadPage,
      args: [captionText, imageBase64Data, imageType, imageName]
    });

    const result = results?.[0]?.result;

    if (result?.success) {
      setStatus(statusEl, `✓ Form diisi! Semak caption & gambar dalam tab TikTok, kemudian klik Post.`, "#2f9e44");

      // Mark as in_progress
      await apiFetch(`/api/batch/kits/${kitId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "in_progress" })
      });

      // Update actions to show "Dah Post?" button
      actionsEl.innerHTML = `
        <button class="btn-success btn-sm confirm-btn-new" data-id="${kitId}">✓ Dah Post?</button>
        <button class="btn-ghost btn-sm retry-btn" data-id="${kitId}">↺ Auto-fill Semula</button>
        <button class="btn-ghost btn-sm skip-btn" data-id="${kitId}">Skip</button>
      `;
      actionsEl.querySelector(".confirm-btn-new").addEventListener("click", () => markPosted(kitId));
      actionsEl.querySelector(".retry-btn").addEventListener("click", () => postKit(kitId));
      actionsEl.querySelector(".skip-btn").addEventListener("click", () => skipKit(kitId));
    } else {
      throw new Error(result?.error || "Auto-fill gagal. Pastikan tab TikTok upload terbuka dan cuba semula.");
    }
  } catch (e) {
    setStatus(statusEl, `✗ ${e.message}`, "#e53e3e");
    btn.disabled = false;
    btn.textContent = "▶ Auto-fill TikTok";
  }
}

async function markPosted(kitId) {
  const statusEl = document.getElementById(`status-${kitId}`);
  try {
    await apiFetch(`/api/batch/kits/${kitId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status: "posted" })
    });
    setStatus(statusEl, "✓ Marked as posted!", "#38a169");
    setTimeout(loadKits, 1200);
  } catch (e) {
    setStatus(statusEl, `Gagal: ${e.message}`, "#e53e3e");
  }
}

async function skipKit(kitId) {
  try {
    await apiFetch(`/api/batch/kits/${kitId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status: "skipped" })
    });
    loadKits();
  } catch (e) {
    console.error(e);
  }
}

// ── TikTok Tab ────────────────────────────────────────────────────────────────

async function getOrOpenTikTokTab() {
  const existing = await chrome.tabs.query({ url: "https://www.tiktok.com/upload*" });
  if (existing.length) {
    await chrome.tabs.update(existing[0].id, { active: true });
    const win = await chrome.windows.get(existing[0].windowId);
    if (win.focused === false) await chrome.windows.update(existing[0].windowId, { focused: true });
    return existing[0];
  }

  const tab = await chrome.tabs.create({ url: "https://www.tiktok.com/upload" });
  await new Promise((resolve) => {
    const listener = (tabId, info) => {
      if (tabId === tab.id && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
  return tab;
}

// ── Injected Function (runs in TikTok page context) ───────────────────────────

// NOTE: This function is serialized and injected into the TikTok page.
// It must be completely self-contained — no external references.
async function fillTikTokUploadPage(captionText, imageBase64, imageType, imageName) {
  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function waitForEl(selectorList, timeout = 15000) {
    const selectors = Array.isArray(selectorList) ? selectorList : [selectorList];
    return new Promise((resolve, reject) => {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) return resolve(el);
      }
      const observer = new MutationObserver(() => {
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) {
            observer.disconnect();
            return resolve(el);
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Timeout menunggu: ${selectors[0]}`));
      }, timeout);
    });
  }

  try {
    // Step 1: Convert base64 to File
    const bytes = atob(imageBase64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const blob = new Blob([arr], { type: imageType });
    const file = new File([blob], imageName, { type: imageType });

    // Step 2: Find file input and set file
    const fileInput = await waitForEl('input[type="file"]', 10000);
    const dt = new DataTransfer();
    dt.items.add(file);
    // Use defineProperty to override read-only files property
    Object.defineProperty(fileInput, "files", { value: dt.files, configurable: true });
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    fileInput.dispatchEvent(new Event("input", { bubbles: true }));

    // Step 3: Wait for upload to process and editor to appear
    await sleep(4000);

    // Step 4: Fill caption — try multiple selectors TikTok may use
    const captionSelectors = [
      '[data-e2e="video-caption"] [contenteditable]',
      '[data-e2e="caption-input"]',
      '.public-DraftEditor-content',
      'div[contenteditable="plaintext-only"]',
      'div[contenteditable="true"]',
      'textarea[placeholder]'
    ];

    let captionEl = null;
    for (const sel of captionSelectors) {
      captionEl = document.querySelector(sel);
      if (captionEl && captionEl.offsetParent !== null) break; // visible element
      captionEl = null;
    }

    if (captionEl) {
      captionEl.focus();
      captionEl.click();
      await sleep(300);

      if (captionEl.tagName === "TEXTAREA") {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
        nativeInputValueSetter.call(captionEl, captionText);
        captionEl.dispatchEvent(new Event("input", { bubbles: true }));
      } else {
        // contenteditable — select all and replace
        document.execCommand("selectAll", false);
        document.execCommand("delete", false);
        document.execCommand("insertText", false, captionText);
      }
    }

    return {
      success: true,
      captionFilled: !!captionEl,
      fileFilled: true
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function buildCaption(kit) {
  const parts = [];
  if (kit.headline?.trim()) parts.push(kit.headline.trim());
  if (kit.caption?.trim()) parts.push(kit.caption.trim());
  if (kit.hashtags?.trim()) parts.push(kit.hashtags.trim());
  return parts.join("\n\n");
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function setStatus(el, msg, color = "") {
  el.textContent = msg;
  el.style.color = color;
}

// ── Init ──────────────────────────────────────────────────────────────────────

loadSettings().then(loadKits);
