    const DRAFT_KEY = "school_grades_draft_v7";

    const API_BASE_URL = String(
      (typeof API_BASE !== "undefined" && API_BASE) || window.__APP_API_BASE__ || "https://yubla-backend-production.up.railway.app"
    )
      .trim()
      .replace(/\/+$/, "");
    const withApiBase = (apiPath = "") => {
      const rawPath = String(apiPath || "").trim();
      if (!rawPath) return API_BASE_URL;
      if (/^https?:\/\//i.test(rawPath)) return rawPath;
      return `${API_BASE_URL}${rawPath.startsWith("/") ? rawPath : `/${rawPath}`}`;
    };

    const $ = id => document.getElementById(id);
    const teacherSel   = $("teacher");
    const gradeSel     = $("grade");
    const sectionSel   = $("section");
    const subjectSel   = $("subject");
    const examSel      = $("exam");
    const maxRecallEl  = $("maxRecall");
    const maxUnderstandEl = $("maxUnderstand");
    const maxHotsEl    = $("maxHots");
    const totalMaxEl   = $("totalMax");
    const tbody        = $("tbody");
    const validChip    = $("validChip");
    const statusBox    = $("statusBox");
    const statusDot    = $("statusDot");
    const statusMsg    = $("statusMsg");
    const statusSub    = $("statusSub");
    const lastBatch    = $("lastBatch");
    const spotlight    = $("studentSpotlight");
    const spotlightName= $("spotlightName");
    const spotlightRow = $("spotlightRow");
    const confirmModal = $("confirmModal");
    const modalMessage = $("modalMessage");
    const modalCancel  = $("modalCancel");
    const modalConfirm = $("modalConfirm");
    const globalLoading = $("globalLoading");
    const globalLoadingText = $("globalLoadingText");
    const globalLoadingSub = $("globalLoadingSub");
    const studentSearchInput = $("studentSearchInput");
    const btnVoiceEntry = $("btnVoiceEntry");
    const voicePanel = $("voicePanel");
    const voiceCurrentSn = $("voiceCurrentSn");
    const voiceSnInput = $("voiceSnInput");
    const voiceCurrentStudent = $("voiceCurrentStudent");
    const voiceListeningStatus = $("voiceListeningStatus");
    const voiceRecallVal = $("voiceRecallVal");
    const voiceUnderstandVal = $("voiceUnderstandVal");
    const voiceHotsVal = $("voiceHotsVal");
    const voiceTokensPreview = $("voiceTokensPreview");
    const voiceStartBtn = $("voiceStartBtn");
    const voiceStopBtn = $("voiceStopBtn");
    const voiceUndoBtn = $("voiceUndoBtn");
    const voiceCloseBtn = $("voiceCloseBtn");
    const adminPrintBtn = $("adminPrint");
    const btnPrint = $("btnPrint");
    const printModal = $("printModal");
    const printModalClose = $("printModalClose");
    const printModalTitle = $("printModalTitle");
    const printSheet = $("printSheet");
    const quickNotice = $("quickNotice");
    const quickNoticeText = $("quickNoticeText");
    const quickNoticeBtn = $("quickNoticeBtn");

    let pendingSubmit = null;
    const DRAFT_MODULE = "teacher";
    const DRAFT_DEBOUNCE_MS = 650;
    const SESSION_ROLE_KEY = "school_session_v1";
    const SESSION_TOKEN_KEY_GLOBAL = "school_session_token";
    const SESSION_USER_DISPLAY_KEY = "school_session_user_display";
    const SESSION_SCHOOL_NAME_KEY = "school_session_school_name";
    const DEFAULT_MAX_RECALL = 10;
    const DEFAULT_MAX_UNDERSTAND = 5;
    const DEFAULT_MAX_HOTS = 5;
    let draftTimer = null;
    let lastDraftHeader = null;
    let clearingAll = false;
    let rowSeq = 0;
    let selectedRowId = "";
    let selectedAdminRowId = "";
    let rowViewTimer = null;
    let activePrintContext = "teacher";
    let voiceSnInputTimer = null;
    let tableContext = { grade: "", section: "" };
    const rowNameCollator = new Intl.Collator("ar", { sensitivity: "base", numeric: true });
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const supportsSpeechSynthesis =
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      typeof window.SpeechSynthesisUtterance !== "undefined";
    const voiceState = {
      isOpen: false,
      listening: false,
      recognition: null,
      buffer: [],
      tokenPreview: [],
      interimTokens: [],
      activeRowId: "",
      undoStack: [],
      shouldKeepListening: false,
      restartTimer: null,
      lastProcessedResultIndex: 0,
      lastOverflowNoticeAt: 0,
      repeatFillTimer: null
    };
    const gridEditableCols = ["studentName", "recall", "understand", "hots", "planInput"];
    const gridNumericCols = new Set(["recall", "understand", "hots"]);
    const gridInputSelector = "input.studentName, input.recall, input.understand, input.hots, input.planInput";
    const gridSelectorByCol = {
      studentName: ".studentName",
      recall: ".recall",
      understand: ".understand",
      hots: ".hots",
      planInput: ".planInput"
    };
    const gridState = {
      selectedKeys: new Set(),
      anchorKey: "",
      dragging: false,
      undoStack: []
    };
    const GRID_UNDO_LIMIT = 120;
    const renderLucideIcons = () => {
      if (typeof window.__renderLucideIcons__ === "function") {
        window.__renderLucideIcons__();
      }
    };
    const iconMarkup = (name, extraClass = "") =>
      `<i data-lucide="${name}"${extraClass ? ` class="${extraClass}"` : ""} aria-hidden="true"></i>`;

    /* ── Utilities ── */
    function setStatus(type, msg, sub="") {
      statusBox.className = "status-bar show" + (type ? "" : " loading");
      statusDot.className = "dot" + (type ? " "+type : "");
      statusMsg.textContent = msg;
      statusSub.textContent = sub;
    }
    let loadingTimer = null;
    function startLoading(opText="") {
      if (!globalLoading) return;
      clearTimeout(loadingTimer);
      globalLoading.classList.remove("loading-error","loading-success");
      if (globalLoadingText) globalLoadingText.textContent = "يرجى الانتظار...";
      if (globalLoadingSub) globalLoadingSub.textContent = opText || "";
      const closeBtn = $("globalLoadingClose");
      if (closeBtn) {
        closeBtn.style.display = "none";
        closeBtn.onclick = stopLoading;
      }
      globalLoading.classList.add("visible");
    }
    function succeed(msg="تمت العملية بنجاح") {
      if (!globalLoading) return;
      clearTimeout(loadingTimer);
      globalLoading.classList.remove("loading-error");
      globalLoading.classList.add("loading-success");
      if (globalLoadingText) globalLoadingText.textContent = msg;
      if (globalLoadingSub) globalLoadingSub.textContent = "";
      const closeBtn = $("globalLoadingClose");
      if (closeBtn) {
        closeBtn.style.display = "none";
        closeBtn.onclick = stopLoading;
      }
      loadingTimer = setTimeout(() => stopLoading(), 1200);
    }
    function fail(msg="تعذر إتمام العملية") {
      if (!globalLoading) return;
      clearTimeout(loadingTimer);
      globalLoading.classList.remove("loading-success");
      globalLoading.classList.add("loading-error");
      if (globalLoadingText) globalLoadingText.textContent = msg;
      if (globalLoadingSub) globalLoadingSub.textContent = "يمكنك الإغلاق والمحاولة مرة أخرى";
      const closeBtn = $("globalLoadingClose");
      if (closeBtn) {
        closeBtn.style.display = "inline-flex";
        closeBtn.onclick = stopLoading;
      }
      globalLoading.classList.add("visible");
    }
    function stopLoading() {
      if (!globalLoading) return;
      clearTimeout(loadingTimer);
      globalLoading.classList.remove("visible","loading-error","loading-success");
    }
    function num(v) { const n=Number(v); return Number.isFinite(n)?n:0; }
    const WEAK_SKILL_THRESHOLD_PCT = 60;
    function esc(s) {
      return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    }
    function fillSelect(sel, arr, ph) {
      sel.innerHTML = "";
      const o0 = document.createElement("option");
      o0.value=""; o0.textContent=ph||"— اختر —";
      sel.appendChild(o0);
      (arr||[]).forEach(v => {
        const o=document.createElement("option"); o.value=v; o.textContent=v; sel.appendChild(o);
      });
    }
    function computeTotalMax() {
      totalMaxEl.value = num(maxRecallEl.value) + num(maxUnderstandEl.value) + num(maxHotsEl.value);
      validateAllRows();
    }
    function getWeakSkills(r,u,h,mr,mu,mh) {
      const maxRecall = Number(mr);
      const maxUnderstand = Number(mu);
      const maxHots = Number(mh);
      if (!(maxRecall > 0) || !(maxUnderstand > 0) || !(maxHots > 0)) return null;
      const skills = [
        { label: "المعرفة والتذكر", score: Number(r) || 0, max: maxRecall },
        { label: "الفهم والتحليل", score: Number(u) || 0, max: maxUnderstand },
        { label: "المهارات العليا", score: Number(h) || 0, max: maxHots }
      ];
      return skills
        .filter((item) => ((item.score / item.max) * 100) < WEAK_SKILL_THRESHOLD_PCT)
        .map((item) => item.label);
    }
    function computeEstimate(total, totalMax) {
      const max = Number(totalMax);
      if (!(max > 0)) return { txt: "—", cls: "", pct: null };
      const score = Math.max(0, Number(total) || 0);
      const pct = (score / max) * 100;
      if (pct >= 90) return { txt: "ممتاز", cls: "ok", pct };
      if (pct >= 80) return { txt: "جيد جدًا", cls: "ok", pct };
      if (pct >= 70) return { txt: "جيد", cls: "warn", pct };
      if (pct >= 60) return { txt: "مقبول", cls: "warn", pct };
      if (pct >= 50) return { txt: "ضعيف", cls: "bad", pct };
      return { txt: "راسب", cls: "bad", pct };
    }
    function computeSkillScale(r, u, h, mr, mu, mh) {
      const weakSkills = getWeakSkills(r, u, h, mr, mu, mh);
      if (!weakSkills) return { code: "—", txt: "—", cls: "" };
      const key = weakSkills.join("|");
      const map = {
        "": { code: 1, txt: "لا يوجد ضعف", cls: "ok" },
        "المعرفة والتذكر": { code: 2, txt: "ضعف في المعرفة والتذكر", cls: "warn" },
        "الفهم والتحليل": { code: 3, txt: "ضعف في الفهم والتحليل", cls: "warn" },
        "المهارات العليا": { code: 4, txt: "ضعف في المهارات العليا", cls: "warn" },
        "المعرفة والتذكر|الفهم والتحليل": { code: 5, txt: "ضعف في المعرفة والتذكر والفهم والتحليل", cls: "bad" },
        "المعرفة والتذكر|المهارات العليا": { code: 6, txt: "ضعف في المعرفة والتذكر والمهارات العليا", cls: "bad" },
        "الفهم والتحليل|المهارات العليا": { code: 7, txt: "ضعف في الفهم والتحليل والمهارات العليا", cls: "bad" },
        "المعرفة والتذكر|الفهم والتحليل|المهارات العليا": { code: 8, txt: "ضعف عام في جميع المهارات", cls: "bad" }
      };
      return map[key] || { code: "—", txt: "—", cls: "" };
    }
    function formatSkillScale(scale) {
      if (!scale || scale.code === "—") return "—";
      return `${scale.txt}`;
    }
    function isWeakLevel(levelText) {
      return String(levelText || "").startsWith("ضعف");
    }
    function computeLevel(r,u,h,mr,mu,mh) {
      const scale = computeSkillScale(r, u, h, mr, mu, mh);
      if (scale.code === "—") return { txt: "—", cls: "" };
      if (scale.code === 8) return { txt: "ضعف عام", cls: "bad" };
      return { txt: scale.txt, cls: scale.cls };
    }
    function hideQuickNotice() {
      if (!quickNotice) return;
      clearTimeout(showQuickNotice._timer);
      quickNotice.classList.remove("show", "require-ack");
    }
    function ensureQuickNoticeUi() {
      if (!quickNotice) return { textEl: null, btnEl: null };
      let textEl = quickNotice.querySelector(".quick-notice-text");
      if (!textEl) {
        textEl = document.createElement("div");
        textEl.className = "quick-notice-text";
        quickNotice.appendChild(textEl);
      }
      let btnEl = quickNotice.querySelector(".quick-notice-btn");
      if (!btnEl) {
        btnEl = document.createElement("button");
        btnEl.type = "button";
        btnEl.className = "quick-notice-btn";
        btnEl.textContent = "حسنًا";
        quickNotice.appendChild(btnEl);
      }
      btnEl.onclick = () => hideQuickNotice();
      return { textEl, btnEl };
    }
    function showQuickNotice(message, type = "info", timeoutMs = 2200, options = {}) {
      if (!quickNotice) return;
      const requireAck = options.requireAck !== false;
      const { textEl } = ensureQuickNoticeUi();
      if (textEl) textEl.textContent = message || "";
      quickNotice.className = `quick-notice show ${type}${requireAck ? " require-ack" : ""}`;
      clearTimeout(showQuickNotice._timer);
      if (!requireAck) {
        showQuickNotice._timer = setTimeout(() => {
          hideQuickNotice();
        }, timeoutMs);
      }
    }
    function getStudentRows() {
      return [...tbody.querySelectorAll("tr.student-row")];
    }
    function getVisibleStudentRows() {
      return getStudentRows().filter((tr) => tr.style.display !== "none");
    }
    function getRowName(tr) {
      return (tr?.querySelector(".studentName")?.value || "").trim();
    }
    function getLevelFromRow(tr) {
      const text = (tr?.dataset?.levelText || "").trim();
      if (text) return text;
      const r = num(tr?.querySelector(".recall")?.value);
      const u = num(tr?.querySelector(".understand")?.value);
      const h = num(tr?.querySelector(".hots")?.value);
      const mr = num(maxRecallEl.value);
      const mu = num(maxUnderstandEl.value);
      const mh = num(maxHotsEl.value);
      return computeLevel(r, u, h, mr, mu, mh).txt;
    }
    function hasMissingMarks(tr) {
      if (!tr) return true;
      const r = tr.querySelector(".recall")?.value?.trim();
      const u = tr.querySelector(".understand")?.value?.trim();
      const h = tr.querySelector(".hots")?.value?.trim();
      return r === "" || u === "" || h === "";
    }
    function getRowById(rowId) {
      if (!rowId) return null;
      return tbody.querySelector(`tr.student-row[data-row-id="${rowId}"]`);
    }
    function enforceMarkLimit(inputEl, maxValue, label, options = {}) {
      if (!inputEl) return;
      const notify = options.notify !== false;
      const raw = String(inputEl.value ?? "").trim();
      if (raw === "") return;
      let value = Number(raw);
      if (!Number.isFinite(value)) return;
      let changed = false;
      if (value < 0) value = 0;
      const safeMax = Math.max(0, Number(maxValue) || 0);
      if (value > safeMax) {
        value = safeMax;
        changed = true;
        if (notify) showQuickNotice(`لا يمكنك إدخال قيمة أكبر من ${safeMax} في ${label}`, "warn", 1900);
      }
      if (!Number.isInteger(value)) {
        value = Math.floor(value);
        changed = true;
      }
      const nextValue = String(value);
      if (inputEl.value !== nextValue) {
        inputEl.value = nextValue;
        changed = true;
      }
      return changed;
    }
    function clampRowMarksToLimits(tr, shouldNotify = false) {
      if (!tr) return;
      const maxR = num(maxRecallEl.value);
      const maxU = num(maxUnderstandEl.value);
      const maxH = num(maxHotsEl.value);
      const inputs = [
        { el: tr.querySelector(".recall"), max: maxR, label: "المعرفة والتذكر" },
        { el: tr.querySelector(".understand"), max: maxU, label: "الفهم والتحليل" },
        { el: tr.querySelector(".hots"), max: maxH, label: "المهارات العليا" }
      ];
      let exceeded = false;
      inputs.forEach((item) => {
        const changed = enforceMarkLimit(item.el, item.max, item.label, { notify: false });
        if (changed) exceeded = true;
      });
      if (shouldNotify && exceeded) {
        showQuickNotice("تم ضبط القيم لتطابق الحدود المسموحة", "warn", 1900);
      }
    }
    function clampAllRowsToCurrentLimits(shouldNotify = false) {
      getStudentRows().forEach((tr) => {
        clampRowMarksToLimits(tr, false);
        tr.querySelector(".recall")?.dispatchEvent(new Event("input", { bubbles: true }));
      });
      if (shouldNotify) showQuickNotice("تم تطبيق الحدود الجديدة على القيم", "info", 1700);
    }

    /* ── Spotlight ── */
    let spotlightTimeout;
    function showSpotlight(name, rowIndex) {
      clearTimeout(spotlightTimeout);
      if(name && name.trim()) {
        spotlightName.textContent = name.trim();
        spotlightRow.textContent  = "#" + rowIndex;
        spotlight.classList.add("visible");
      }
    }
    function hideSpotlight() {
      spotlightTimeout = setTimeout(() => {
        spotlight.classList.remove("visible");
      }, 250);
    }

    /* ── Student Rows / SN / Selection ── */
    function nextRowId() {
      rowSeq += 1;
      return `row-${rowSeq}`;
    }
    function updateRowSelectionState() {
      getStudentRows().forEach((tr) => {
        const isSelected = !!selectedRowId && tr.dataset.rowId === selectedRowId;
        tr.classList.toggle("row-selected", isSelected);
        const btn = tr.querySelector(".select-row-btn");
        if (btn) {
          btn.classList.toggle("active", isSelected);
          btn.setAttribute("aria-pressed", isSelected ? "true" : "false");
        }
      });
    }
    function selectRow(rowId, shouldScroll = false) {
      const row = getRowById(rowId);
      if (!row) return;
      selectedRowId = row.dataset.rowId || "";
      updateRowSelectionState();
      if (shouldScroll) row.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    function ensureSelectedRow() {
      const selected = getRowById(selectedRowId);
      if (selected && selected.style.display !== "none") return selected;
      const firstVisible = getVisibleStudentRows()[0] || getStudentRows()[0] || null;
      selectedRowId = firstVisible ? firstVisible.dataset.rowId : "";
      updateRowSelectionState();
      return firstVisible;
    }
    function sortStudentRows() {
      const rows = getStudentRows();
      if (rows.length < 2) return;
      rows.sort((a, b) => {
        const aName = getRowName(a);
        const bName = getRowName(b);
        if (!aName && bName) return 1;
        if (aName && !bName) return -1;
        return rowNameCollator.compare(aName, bName);
      });
      const frag = document.createDocumentFragment();
      rows.forEach((tr) => frag.appendChild(tr));
      tbody.appendChild(frag);
    }
    function applyStudentSearchFilter() {
      const q = (studentSearchInput?.value || "").trim().toLowerCase();
      getStudentRows().forEach((tr) => {
        const name = getRowName(tr).toLowerCase();
        const show = !q || name.includes(q);
        tr.style.display = show ? "" : "none";
      });
    }
    function refreshSerialNumbers() {
      let sn = 0;
      getStudentRows().forEach((tr) => {
        const snEl = tr.querySelector(".row-index");
        if (!snEl) return;
        if (tr.style.display === "none") {
          snEl.textContent = "";
          return;
        }
        sn += 1;
        snEl.textContent = String(sn);
      });
    }
    function refreshStudentRowsView(options = {}) {
      const { skipSort = false } = options;
      if (!skipSort) sortStudentRows();
      applyStudentSearchFilter();
      refreshSerialNumbers();
      ensureSelectedRow();
      updateRowSelectionState();
      syncVoiceRowAfterListChange();
      pruneGridSelection();
    }
    function scheduleStudentRowsRefresh(skipSort = false) {
      clearTimeout(rowViewTimer);
      rowViewTimer = setTimeout(() => refreshStudentRowsView({ skipSort }), 120);
    }

    function makeGridCellKey(rowId, colKey) {
      return `${rowId}::${colKey}`;
    }
    function parseGridCellKey(key) {
      const raw = String(key || "");
      const sep = raw.indexOf("::");
      if (sep <= 0) return null;
      const rowId = raw.slice(0, sep);
      const colKey = raw.slice(sep + 2);
      if (!rowId || !gridSelectorByCol[colKey]) return null;
      return { rowId, colKey };
    }
    function getGridColKeyFromInput(input) {
      if (!input) return "";
      const col = input.dataset?.gridCol || "";
      if (gridSelectorByCol[col]) return col;
      if (input.classList.contains("studentName")) return "studentName";
      if (input.classList.contains("recall")) return "recall";
      if (input.classList.contains("understand")) return "understand";
      if (input.classList.contains("hots")) return "hots";
      if (input.classList.contains("planInput")) return "planInput";
      return "";
    }
    function getGridCellInput(rowId, colKey) {
      const row = getRowById(rowId);
      if (!row || row.style.display === "none") return null;
      const selector = gridSelectorByCol[colKey];
      if (!selector) return null;
      return row.querySelector(selector);
    }
    function getGridCellFromInput(input) {
      if (!input || !input.closest) return null;
      const tr = input.closest("tr.student-row");
      if (!tr || tr.style.display === "none") return null;
      const rowId = tr.dataset.rowId || "";
      const colKey = getGridColKeyFromInput(input);
      if (!rowId || !colKey) return null;
      return { rowId, colKey, input, rowEl: tr };
    }
    function getGridCellFromTarget(target) {
      if (!target || !target.closest) return null;
      let input = target.closest(gridInputSelector);
      if (!input) {
        const td = target.closest("td");
        if (td) input = td.querySelector(gridInputSelector);
      }
      return getGridCellFromInput(input);
    }
    function getGridCellByKey(key) {
      const parsed = parseGridCellKey(key);
      if (!parsed) return null;
      const input = getGridCellInput(parsed.rowId, parsed.colKey);
      if (!input) return null;
      const row = input.closest("tr.student-row");
      if (!row) return null;
      return { rowId: parsed.rowId, colKey: parsed.colKey, input, rowEl: row };
    }
    function getGridCellPosition(cell) {
      if (!cell) return null;
      const rows = getVisibleStudentRows();
      const rowIndex = rows.findIndex((tr) => (tr.dataset.rowId || "") === cell.rowId);
      const colIndex = gridEditableCols.indexOf(cell.colKey);
      if (rowIndex < 0 || colIndex < 0) return null;
      return { rowIndex, colIndex };
    }
    function getGridCellByPosition(rowIndex, colIndex) {
      const rows = getVisibleStudentRows();
      const row = rows[rowIndex];
      const colKey = gridEditableCols[colIndex];
      if (!row || !colKey) return null;
      const rowId = row.dataset.rowId || "";
      const input = getGridCellInput(rowId, colKey);
      if (!input) return null;
      return { rowId, colKey, input, rowEl: row };
    }
    function renderGridSelection() {
      if (!tbody) return;
      tbody.querySelectorAll("td.grid-selected, td.grid-anchor").forEach((td) => {
        td.classList.remove("grid-selected", "grid-anchor");
      });
      gridState.selectedKeys.forEach((key) => {
        const cell = getGridCellByKey(key);
        const td = cell?.input?.closest("td");
        if (td) td.classList.add("grid-selected");
      });
      if (gridState.anchorKey) {
        const anchor = getGridCellByKey(gridState.anchorKey);
        const td = anchor?.input?.closest("td");
        if (td) td.classList.add("grid-anchor");
      }
    }
    function clearGridSelection(resetAnchor = true) {
      gridState.selectedKeys.clear();
      if (resetAnchor) gridState.anchorKey = "";
      renderGridSelection();
    }
    function clearGridUndoHistory() {
      gridState.undoStack = [];
    }
    function uniqueGridCells(cells) {
      const byKey = new Map();
      (cells || []).forEach((cell) => {
        if (!cell?.rowId || !cell?.colKey) return;
        const key = makeGridCellKey(cell.rowId, cell.colKey);
        if (!byKey.has(key)) byKey.set(key, cell);
      });
      return [...byKey.values()];
    }
    function snapshotGridCells(cells) {
      const map = new Map();
      uniqueGridCells(cells).forEach((cell) => {
        const key = makeGridCellKey(cell.rowId, cell.colKey);
        map.set(key, String(cell.input?.value ?? ""));
      });
      return map;
    }
    function buildGridUndoChanges(beforeMap, afterMap) {
      const changes = [];
      const keys = new Set([...(beforeMap?.keys() || []), ...(afterMap?.keys() || [])]);
      keys.forEach((key) => {
        const prev = String(beforeMap?.get(key) ?? "");
        const next = String(afterMap?.get(key) ?? "");
        if (prev !== next) changes.push({ key, prev, next });
      });
      return changes;
    }
    function pushGridUndoChanges(changes) {
      if (!Array.isArray(changes) || !changes.length) return;
      gridState.undoStack.push({ changes });
      if (gridState.undoStack.length > GRID_UNDO_LIMIT) gridState.undoStack.shift();
    }
    function undoGridLastAction() {
      const step = gridState.undoStack.pop();
      if (!step || !Array.isArray(step.changes) || !step.changes.length) return false;
      const restored = [];
      step.changes.forEach((change) => {
        const parsed = parseGridCellKey(change.key);
        if (!parsed) return;
        const input = getGridCellInput(parsed.rowId, parsed.colKey);
        if (!input) return;
        setGridInputValue(input, parsed.colKey, change.prev);
        restored.push({ rowId: parsed.rowId, colKey: parsed.colKey, input, rowEl: input.closest("tr.student-row") });
      });
      if (restored.length) {
        setGridSelection(restored, restored[0]);
        scheduleDraftSave();
      }
      return restored.length > 0;
    }
    function setGridSelection(cells, anchorCell = null) {
      gridState.selectedKeys.clear();
      (cells || []).forEach((cell) => {
        if (!cell?.rowId || !cell?.colKey) return;
        gridState.selectedKeys.add(makeGridCellKey(cell.rowId, cell.colKey));
      });
      if (anchorCell?.rowId && anchorCell?.colKey) {
        gridState.anchorKey = makeGridCellKey(anchorCell.rowId, anchorCell.colKey);
      } else if (!gridState.anchorKey && cells?.[0]) {
        gridState.anchorKey = makeGridCellKey(cells[0].rowId, cells[0].colKey);
      }
      renderGridSelection();
    }
    function selectGridRange(anchorCell, targetCell) {
      const aPos = getGridCellPosition(anchorCell);
      const tPos = getGridCellPosition(targetCell);
      if (!aPos || !tPos) return;
      const minRow = Math.min(aPos.rowIndex, tPos.rowIndex);
      const maxRow = Math.max(aPos.rowIndex, tPos.rowIndex);
      const minCol = Math.min(aPos.colIndex, tPos.colIndex);
      const maxCol = Math.max(aPos.colIndex, tPos.colIndex);
      const selected = [];
      for (let r = minRow; r <= maxRow; r += 1) {
        for (let c = minCol; c <= maxCol; c += 1) {
          const cell = getGridCellByPosition(r, c);
          if (cell) selected.push(cell);
        }
      }
      setGridSelection(selected, anchorCell);
    }
    function getGridSelectionCells() {
      const out = [];
      gridState.selectedKeys.forEach((key) => {
        const cell = getGridCellByKey(key);
        if (cell) out.push(cell);
      });
      return out;
    }
    function pruneGridSelection() {
      const next = new Set();
      gridState.selectedKeys.forEach((key) => {
        const cell = getGridCellByKey(key);
        if (cell) next.add(key);
      });
      gridState.selectedKeys = next;
      if (gridState.anchorKey && !getGridCellByKey(gridState.anchorKey)) {
        gridState.anchorKey = "";
      }
      renderGridSelection();
    }
    function getGridSelectionBounds() {
      const cells = getGridSelectionCells();
      if (!cells.length) return null;
      const positions = cells.map((cell) => ({ cell, pos: getGridCellPosition(cell) })).filter((item) => !!item.pos);
      if (!positions.length) return null;
      let minRow = Number.POSITIVE_INFINITY;
      let maxRow = Number.NEGATIVE_INFINITY;
      let minCol = Number.POSITIVE_INFINITY;
      let maxCol = Number.NEGATIVE_INFINITY;
      positions.forEach(({ pos }) => {
        minRow = Math.min(minRow, pos.rowIndex);
        maxRow = Math.max(maxRow, pos.rowIndex);
        minCol = Math.min(minCol, pos.colIndex);
        maxCol = Math.max(maxCol, pos.colIndex);
      });
      return { minRow, maxRow, minCol, maxCol };
    }
    function getGridTopLeftSelectedCell() {
      const bounds = getGridSelectionBounds();
      if (!bounds) return null;
      return getGridCellByPosition(bounds.minRow, bounds.minCol);
    }
    function normalizeDigits(value) {
      return String(value || "")
        .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
        .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));
    }
    function getGridMaxForCol(colKey) {
      if (colKey === "recall") return Math.max(0, num(maxRecallEl.value));
      if (colKey === "understand") return Math.max(0, num(maxUnderstandEl.value));
      if (colKey === "hots") return Math.max(0, num(maxHotsEl.value));
      return null;
    }
    function setGridInputValue(input, colKey, rawValue) {
      if (!input || !colKey) return false;
      let nextValue = String(rawValue ?? "");
      if (gridNumericCols.has(colKey)) {
        const normalized = normalizeDigits(nextValue).trim();
        if (!normalized) {
          nextValue = "";
        } else {
          const numeric = Number(normalized.replace(/,/g, "."));
          if (!Number.isFinite(numeric)) return false;
          const max = getGridMaxForCol(colKey);
          let safe = Math.floor(numeric);
          if (safe < 0) safe = 0;
          if (Number.isFinite(max)) safe = Math.min(safe, max);
          nextValue = String(safe);
        }
      } else if (colKey === "planInput") {
        nextValue = String(nextValue || "").slice(0, 30);
      }
      if (input.value === nextValue) return true;
      input.value = nextValue;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }
    function deleteGridSelectedCells() {
      const cells = uniqueGridCells(getGridSelectionCells());
      if (!cells.length) return;
      const before = snapshotGridCells(cells);
      cells.forEach((cell) => {
        setGridInputValue(cell.input, cell.colKey, "");
      });
      const after = snapshotGridCells(cells);
      pushGridUndoChanges(buildGridUndoChanges(before, after));
      scheduleDraftSave();
    }
    function gridSelectionAsTsv() {
      const bounds = getGridSelectionBounds();
      if (!bounds) return "";
      const lines = [];
      for (let r = bounds.minRow; r <= bounds.maxRow; r += 1) {
        const values = [];
        for (let c = bounds.minCol; c <= bounds.maxCol; c += 1) {
          const cell = getGridCellByPosition(r, c);
          if (!cell) {
            values.push("");
            continue;
          }
          const key = makeGridCellKey(cell.rowId, cell.colKey);
          values.push(gridState.selectedKeys.has(key) ? String(cell.input.value ?? "") : "");
        }
        lines.push(values.join("\t"));
      }
      return lines.join("\n");
    }
    function parseGridClipboardText(text) {
      const raw = String(text || "").replace(/\r/g, "");
      if (!raw.trim()) return [];
      const rows = raw.split("\n");
      while (rows.length && rows[rows.length - 1] === "") rows.pop();
      return rows.map((row) => row.split("\t"));
    }
    function applyGridMatrixFromCell(startCell, matrix) {
      if (!startCell || !Array.isArray(matrix) || !matrix.length) return [];
      const startPos = getGridCellPosition(startCell);
      if (!startPos) return [];
      const touched = [];
      matrix.forEach((rowValues, rowOffset) => {
        (rowValues || []).forEach((value, colOffset) => {
          const cell = getGridCellByPosition(startPos.rowIndex + rowOffset, startPos.colIndex + colOffset);
          if (!cell) return;
          const ok = setGridInputValue(cell.input, cell.colKey, value);
          if (ok) touched.push(cell);
        });
      });
      return touched;
    }
    function getGridPasteTargetCells(startCell, matrix) {
      if (!startCell || !Array.isArray(matrix) || !matrix.length) return [];
      const startPos = getGridCellPosition(startCell);
      if (!startPos) return [];
      const targets = [];
      matrix.forEach((rowValues, rowOffset) => {
        (rowValues || []).forEach((_, colOffset) => {
          const cell = getGridCellByPosition(startPos.rowIndex + rowOffset, startPos.colIndex + colOffset);
          if (cell) targets.push(cell);
        });
      });
      return uniqueGridCells(targets);
    }
    function getGridFocusCell() {
      const active = document.activeElement;
      return getGridCellFromInput(active);
    }
    function handleGridMouseDown(event) {
      if (event.button !== 0) return;
      const cell = getGridCellFromTarget(event.target);
      if (!cell) return;
      if (event.shiftKey && gridState.anchorKey) {
        const anchor = getGridCellByKey(gridState.anchorKey);
        if (anchor) {
          selectGridRange(anchor, cell);
        } else {
          setGridSelection([cell], cell);
        }
      } else {
        setGridSelection([cell], cell);
      }
      gridState.dragging = true;
    }
    function handleGridMouseOver(event) {
      if (!gridState.dragging || !gridState.anchorKey) return;
      const cell = getGridCellFromTarget(event.target);
      if (!cell) return;
      const anchor = getGridCellByKey(gridState.anchorKey);
      if (!anchor) return;
      selectGridRange(anchor, cell);
    }
    function stopGridDrag() {
      gridState.dragging = false;
    }
    function handleGridDocumentMouseDown(event) {
      if (!event.target?.closest || event.target.closest("#tbody")) return;
      clearGridSelection(true);
    }
    function handleGridKeyDown(event) {
      const key = String(event.key || "").toLowerCase();
      const ctrlOrMeta = event.ctrlKey || event.metaKey;
      const focusInGrid = !!document.activeElement?.closest?.("#tbody");
      if (ctrlOrMeta && !event.shiftKey && !event.altKey && key === "z") {
        if (gridState.undoStack.length > 0 && (focusInGrid || gridState.selectedKeys.size > 0)) {
          event.preventDefault();
          undoGridLastAction();
        }
        return;
      }
      const hasSelection = gridState.selectedKeys.size > 0;
      if (!hasSelection) return;
      if (event.key === "Delete") {
        event.preventDefault();
        deleteGridSelectedCells();
      }
    }
    function handleGridCopy(event) {
      if (event.defaultPrevented) return;
      if (!gridState.selectedKeys.size) return;
      const tsv = gridSelectionAsTsv();
      if (!tsv) return;
      event.preventDefault();
      event.clipboardData?.setData("text/plain", tsv);
    }
    function handleGridPaste(event) {
      if (event.defaultPrevented) return;
      const text = event.clipboardData?.getData("text/plain") || "";
      if (!text) return;
      const matrix = parseGridClipboardText(text);
      if (!matrix.length) return;
      let startCell = getGridTopLeftSelectedCell();
      if (!startCell) startCell = getGridFocusCell();
      if (!startCell) return;
      event.preventDefault();
      let touched = [];
      const fillAllSelected = matrix.length === 1 && (matrix[0]?.length || 0) === 1 && gridState.selectedKeys.size > 1;
      const targetCells = fillAllSelected
        ? uniqueGridCells(getGridSelectionCells())
        : getGridPasteTargetCells(startCell, matrix);
      const before = snapshotGridCells(targetCells);
      if (fillAllSelected) {
        const singleValue = matrix[0][0];
        touched = getGridSelectionCells().filter((cell) => setGridInputValue(cell.input, cell.colKey, singleValue));
      } else {
        touched = applyGridMatrixFromCell(startCell, matrix);
      }
      const after = snapshotGridCells(targetCells);
      const changes = buildGridUndoChanges(before, after);
      if (!changes.length) return;
      pushGridUndoChanges(changes);
      if (!touched.length) {
        touched = targetCells;
      }
      setGridSelection(uniqueGridCells(touched), touched[0]);
      scheduleDraftSave();
    }
    function initGridClipboardInteractions() {
      if (!tbody || tbody.dataset.gridInit === "1") return;
      tbody.dataset.gridInit = "1";
      tbody.addEventListener("mousedown", handleGridMouseDown);
      tbody.addEventListener("mouseover", handleGridMouseOver);
      document.addEventListener("mouseup", stopGridDrag);
      document.addEventListener("mousedown", handleGridDocumentMouseDown);
      document.addEventListener("keydown", handleGridKeyDown);
      document.addEventListener("copy", handleGridCopy);
      document.addEventListener("paste", handleGridPaste);
    }

    /* ── Build Row ── */
    function makeRow(data, index) {
      const tr = document.createElement("tr");
      tr.className = "student-row";
      tr.dataset.rowId = data?.rowId || nextRowId();
      tr.innerHTML = `
        <td class="row-num"><span class="row-index">${index || ""}</span></td>
        <td class="name-cell">
          <input type="text" class="studentName" data-grid-col="studentName" value="${esc(data.studentName || "")}" placeholder="اسم الطالبة" />
        </td>
        <td class="num-cell"><input type="number" class="recall" data-grid-col="recall" min="0" step="1" value="${esc(data.recall ?? "")}"/></td>
        <td class="num-cell"><input type="number" class="understand" data-grid-col="understand" min="0" step="1" value="${esc(data.understand ?? "")}"/></td>
        <td class="num-cell"><input type="number" class="hots" data-grid-col="hots" min="0" step="1" value="${esc(data.hots ?? "")}"/></td>
        <td class="total-cell"><input type="number" class="total" readonly value="${esc(data.total ?? 0)}"/></td>
        <td><span class="chip estimate-chip">—</span></td>
        <td><span class="chip skill-chip">—</span></td>
        <td class="plan-cell"><input type="text" class="planInput" data-grid-col="planInput" value="${esc(data.plan || "")}" placeholder="خطة علاجية (1–30 حرف)" maxlength="30"/></td>
      `;

      const iName = tr.querySelector(".studentName");
      const iRecall = tr.querySelector(".recall");
      const iUnder = tr.querySelector(".understand");
      const iHots = tr.querySelector(".hots");
      const iTotal = tr.querySelector(".total");
      const iPlan = tr.querySelector(".planInput");
      const chipEstimate = tr.querySelector(".estimate-chip");
      const chipSkill = tr.querySelector(".skill-chip");

      function getRowSn() {
        const txt = (tr.querySelector(".row-index")?.textContent || "").trim();
        if (txt) return txt;
        const all = getVisibleStudentRows();
        const idx = all.indexOf(tr);
        return idx >= 0 ? String(idx + 1) : "—";
      }

      function recompute() {
        enforceMarkLimit(iRecall, num(maxRecallEl.value), "المعرفة والتذكر", { notify: false });
        enforceMarkLimit(iUnder, num(maxUnderstandEl.value), "الفهم والتحليل", { notify: false });
        enforceMarkLimit(iHots, num(maxHotsEl.value), "المهارات العليا", { notify: false });
        const r = num(iRecall.value), u = num(iUnder.value), h = num(iHots.value);
        iTotal.value = r + u + h;
        const mr = num(maxRecallEl.value), mu = num(maxUnderstandEl.value), mh = num(maxHotsEl.value);
        const estimate = computeEstimate(r + u + h, mr + mu + mh);
        chipEstimate.textContent = estimate.txt;
        chipEstimate.className = "chip estimate-chip" + (estimate.cls ? " " + estimate.cls : "");
        const skillScale = computeSkillScale(r, u, h, mr, mu, mh);
        chipSkill.textContent = formatSkillScale(skillScale);
        chipSkill.className = "chip skill-chip" + (skillScale.cls ? " " + skillScale.cls : "");
        const L = computeLevel(r, u, h, mr, mu, mh);
        tr.dataset.levelText = L.txt;
        const bad = r > mr || u > mu || h > mh;
        tr.classList.toggle("invalid-row", bad);
        updateValidationChip();
      }

      function onFocus() {
        tr.classList.add("row-active");
        selectRow(tr.dataset.rowId || "");
        if (voiceState.isOpen) setVoiceActiveRowById(tr.dataset.rowId || "", false);
        showSpotlight(iName.value, getRowSn());
      }
      function onBlur() {
        tr.classList.remove("row-active");
        hideSpotlight();
      }

      iName.addEventListener("input", () => {
        scheduleDraftSave();
        recompute();
        scheduleStudentRowsRefresh();
        if (spotlight.classList.contains("visible")) showSpotlight(iName.value, getRowSn());
      });
      iRecall.addEventListener("input", () => {
        enforceMarkLimit(iRecall, num(maxRecallEl.value), "المعرفة والتذكر");
        recompute();
        scheduleDraftSave();
      });
      iUnder.addEventListener("input", () => {
        enforceMarkLimit(iUnder, num(maxUnderstandEl.value), "الفهم والتحليل");
        recompute();
        scheduleDraftSave();
      });
      iHots.addEventListener("input", () => {
        enforceMarkLimit(iHots, num(maxHotsEl.value), "المهارات العليا");
        recompute();
        scheduleDraftSave();
      });
      iPlan.addEventListener("input", () => scheduleDraftSave());

      [iName, iRecall, iUnder, iHots, iPlan].forEach((inp) => {
        inp.addEventListener("focus", onFocus);
        inp.addEventListener("blur", onBlur);
      });

      tr.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        selectRow(tr.dataset.rowId || "");
        if (voiceState.isOpen) setVoiceActiveRowById(tr.dataset.rowId || "", false);
      });

      recompute();
      return tr;
    }

    function reindexRows() {
      refreshSerialNumbers();
    }

    function setRows(names) {
      tbody.innerHTML = "";
      const sortedNames = [...(names || [])].sort((a, b) => rowNameCollator.compare(String(a || ""), String(b || "")));
      sortedNames.forEach((n, i) =>
        tbody.appendChild(makeRow({ studentName: n, recall: "", understand: "", hots: "", total: "", plan: "" }, i + 1))
      );
      renderLucideIcons();
      tableContext = { grade: gradeSel.value.trim(), section: sectionSel.value.trim() };
      selectedRowId = "";
      voiceState.undoStack = [];
      voiceState.buffer = [];
      clearGridUndoHistory();
      clearGridSelection(true);
      refreshStudentRowsView({ skipSort: true });
      updateValidationChip();
      updateAutoFillButtonState();
      scheduleDraftSave();
    }

    function clearScoresOnly() {
      getStudentRows().forEach((tr) => {
        tr.querySelector(".recall").value = "";
        tr.querySelector(".understand").value = "";
        tr.querySelector(".hots").value = "";
        tr.querySelector(".total").value = "0";
        tr.querySelector(".planInput").value = "";
        tr.dataset.levelText = "—";
        const estimateChip = tr.querySelector(".estimate-chip");
        if (estimateChip) {
          estimateChip.textContent = "—";
          estimateChip.className = "chip estimate-chip";
        }
        const skillChip = tr.querySelector(".skill-chip");
        if (skillChip) {
          skillChip.textContent = "—";
          skillChip.className = "chip skill-chip";
        }
        tr.classList.remove("invalid-row", "row-active", "voice-active");
      });
      clearGridUndoHistory();
      updateValidationChip();
      refreshStudentRowsView({ skipSort: true });
      scheduleDraftSave();
    }

    function validateAllRows() {
      getStudentRows().forEach((tr) => tr.querySelector(".recall").dispatchEvent(new Event("input", { bubbles: true })));
    }

    function updateValidationChip() {
      const mr = num(maxRecallEl.value), mu = num(maxUnderstandEl.value), mh = num(maxHotsEl.value);
      const trs = getStudentRows();
      let any = false, bad = 0;
      for (const tr of trs) {
        const n = getRowName(tr);
        if (!n) continue;
        any = true;
        const r = num(tr.querySelector(".recall").value);
        const u = num(tr.querySelector(".understand").value);
        const h = num(tr.querySelector(".hots").value);
        if (r > mr || u > mu || h > mh) bad++;
      }
      if (!any) {
        validChip.textContent = "التحقق: لا توجد بيانات";
        validChip.className = "chip";
        return;
      }
      if (bad === 0) {
        validChip.innerHTML = `${iconMarkup("circle-check-big")}<span>جميع الدرجات ضمن الحدود</span>`;
        validChip.className = "chip ok";
      } else {
        validChip.innerHTML = `${iconMarkup("circle-x")}<span>يوجد ${bad} سطر خارج الحدود</span>`;
        validChip.className = "chip bad";
      }
      renderLucideIcons();
    }
    function hasTableRows() {
      return getStudentRows().length > 0;
    }
    function updateAutoFillButtonState() {
      const btn = $("btnAutoFill");
      if (!btn) return;
      btn.innerHTML = `${iconMarkup("refresh-cw")}<span>تحديث الطالبات حسب الصف/الشعبة الحالية</span>`;
      renderLucideIcons();
    }

    /* ── API ── */
    function getAuthHeaders(extra = {}) {
      const token = sessionStorage.getItem(SESSION_TOKEN_KEY_GLOBAL) || "";
      const headers = { ...extra };
      if (token) headers.Authorization = `Bearer ${token}`;
      return headers;
    }
    async function apiGet(p) {
      const action = p?.action || "";
      if (action === "lookups") {
        const res = await fetch(withApiBase("/api/v1/lookups"), { method: "GET", headers: getAuthHeaders() });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "فشل الاتصال");
        return data;
      }
      if (action === "students") {
        const url = new URL(withApiBase("/api/v1/students"));
        url.searchParams.set("grade", p.grade || "");
        url.searchParams.set("section", p.section || "");
        const res = await fetch(url.toString(), { method: "GET", headers: getAuthHeaders() });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "فشل الاتصال");
        return data;
      }
      if (action === "submissions") {
        const res = await fetch(withApiBase("/api/v1/submissions"), { method: "GET", headers: getAuthHeaders() });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "فشل الاتصال");
        return data;
      }
      throw new Error("action غير مدعوم");
    }
    async function apiPost(body) {
      if (body?.action === "submit") {
        const res = await fetch(withApiBase("/api/v1/submissions"), {
          method: "POST",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ header: body.header, rows: body.rows })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "فشل الإرسال");
        return data;
      }
      if (body?.action === "updateAccount") {
        const res = await fetch(withApiBase("/api/v1/auth/account"), {
          method: "PATCH",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            currentPassword: body.currentPassword || "",
            newUsername: body.newUsername || "",
            newPassword: body.newPassword || "",
            newDisplayName: body.newDisplayName || ""
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "فشل تحديث الحساب");
        return data;
      }
      throw new Error("action غير مدعوم");
    }

    async function loadLookups() {
      try {
        startLoading("جارٍ تحديث القوائم...");
        setStatus("","جاري تحميل القوائم...");
        const j=await apiGet({action:"lookups"});
        if(!j.ok) throw new Error(j.error||"فشل");
        fillSelect(teacherSel, j.teachers||[], "— اختر المعلمة —");
        fillSelect(gradeSel,   j.grades||[],   "— اختر الصف —");
        fillSelect(sectionSel, j.sections||[], "— اختر الشعبة —");
        fillSelect(subjectSel, j.subjects||[], "— اختر المادة —");
        fillSelect(examSel,    j.exams||[],    "— اختر الامتحان —");
        if (lastDraftHeader) {
          teacherSel.value = lastDraftHeader.teacherName || "";
          gradeSel.value = lastDraftHeader.grade || "";
          sectionSel.value = lastDraftHeader.section || "";
          subjectSel.value = lastDraftHeader.subject || "";
          examSel.value = lastDraftHeader.exam || "";
        }
        const currentRole = sessionStorage.getItem(SESSION_ROLE_KEY) || "";
        const displayName = sessionStorage.getItem(SESSION_USER_DISPLAY_KEY) || "";
        if (currentRole === "teacher") {
          if (displayName) {
            const values = (j.teachers || []);
            if (!values.includes(displayName)) {
              const opt = document.createElement("option");
              opt.value = displayName;
              opt.textContent = displayName;
              teacherSel.appendChild(opt);
            }
            teacherSel.value = displayName;
          } else if ((j.teachers || []).length === 1) {
            teacherSel.value = j.teachers[0];
          }
          teacherSel.disabled = true;
        } else {
          teacherSel.disabled = false;
          if ((j.teachers || []).length === 1 && !teacherSel.value) teacherSel.value = j.teachers[0];
        }
        setStatus("ok","تم تحميل القوائم بنجاح");
        succeed("تم تحديث القوائم بنجاح");
        scheduleDraftSave();
      } catch(e) {
        setStatus("bad","تعذر تحميل القوائم",e.message);
        fail("تعذر تحديث القوائم");
      }
    }
    async function autoFillStudents() {
      try {
        const grade=gradeSel.value.trim(), section=sectionSel.value.trim();
        const missingGrade = !grade;
        const missingSection = !section;
        if(missingGrade && missingSection) { setStatus("warn","يرجى اختيار الصف والشعبة"); return; }
        if(missingGrade) { setStatus("warn","يرجى اختيار الصف"); return; }
        if(missingSection) { setStatus("warn","يرجى اختيار الشعبة"); return; }
        startLoading("جارٍ جلب أسماء الطالبات...");
        setStatus("","جاري تعبئة الأسماء...",`${grade} / ${section}`);
        const j=await apiGet({action:"students",grade,section});
        if(!j.ok) throw new Error(j.error||"فشل");
        const list=j.students||[];
        setRows(list);
        const restored = await hydrateRowsFromLatestSubmission();
        if (restored > 0) {
          setStatus("ok", `تمت تعبئة ${list.length} طالبة`, `تم استرجاع آخر إرسال (${restored} طالبة)`);
        } else {
          setStatus("ok",`تمت تعبئة ${list.length} طالبة`);
        }
        succeed("تم جلب البيانات بنجاح");
      } catch(e) {
        setStatus("bad","تعذر تعبئة الطالبات",e.message);
        fail("تعذر جلب البيانات");
      }
    }
    async function hydrateRowsFromLatestSubmission() {
      const teacherName = teacherSel.value.trim();
      const grade = gradeSel.value.trim();
      const section = sectionSel.value.trim();
      const subject = subjectSel.value.trim();
      const exam = examSel.value.trim();
      if (!teacherName || !grade || !section || !subject || !exam) return 0;

      const res = await apiGet({ action: "submissions" });
      const allRows = Array.isArray(res?.rows) ? res.rows : [];
      if (!allRows.length) return 0;

      const normalize = (v) => String(v || "").trim();
      const matched = allRows.filter((r) =>
        normalize(r?.[2]) === teacherName &&
        normalize(r?.[3]) === grade &&
        normalize(r?.[4]) === section &&
        normalize(r?.[5]) === subject &&
        normalize(r?.[6]) === exam
      );
      if (!matched.length) return 0;

      const latestBatchId = normalize(matched[0]?.[1]);
      const currentBatchRows = matched.filter((r) => normalize(r?.[1]) === latestBatchId);
      if (!currentBatchRows.length) return 0;

      const byName = new Map();
      currentBatchRows.forEach((r) => {
        const name = normalize(r?.[11]);
        if (!name || byName.has(name)) return;
        byName.set(name, {
          recall: r?.[12] ?? "",
          understand: r?.[13] ?? "",
          hots: r?.[14] ?? "",
          plan: r?.[16] ?? ""
        });
      });

      let hydrated = 0;
      getStudentRows().forEach((tr) => {
        const name = (tr.querySelector(".studentName")?.value || "").trim();
        if (!name) return;
        const prev = byName.get(name);
        if (!prev) return;
        const recallInput = tr.querySelector(".recall");
        const understandInput = tr.querySelector(".understand");
        const hotsInput = tr.querySelector(".hots");
        const planInput = tr.querySelector(".planInput");
        if (!recallInput || !understandInput || !hotsInput || !planInput) return;
        recallInput.value = prev.recall === "" ? "" : String(prev.recall);
        understandInput.value = prev.understand === "" ? "" : String(prev.understand);
        hotsInput.value = prev.hots === "" ? "" : String(prev.hots);
        planInput.value = prev.plan === "" ? "" : String(prev.plan);
        recallInput.dispatchEvent(new Event("input", { bubbles: true }));
        hydrated += 1;
      });

      if (hydrated > 0) {
        lastBatch.textContent = latestBatchId || "—";
        saveDraftSoft();
      }
      return hydrated;
    }
    function checkIncomplete() {
      return getStudentRows().filter(tr => {
        const n=tr.querySelector(".studentName").value.trim();
        if(!n) return false;
        const r=tr.querySelector(".recall").value.trim();
        const u=tr.querySelector(".understand").value.trim();
        const h=tr.querySelector(".hots").value.trim();
        return r===""||u===""||h==="";
      }).map(tr=>tr.querySelector(".studentName").value.trim());
    }

    function collectPayload(fillEmpty=false) {
      const header = {
        teacherName: teacherSel.value.trim(),
        grade: gradeSel.value.trim(),
        section: sectionSel.value.trim(),
        subject: subjectSel.value.trim(),
        exam: examSel.value.trim(),
        maxRecall: num(maxRecallEl.value),
        maxUnderstand: num(maxUnderstandEl.value),
        maxHots: num(maxHotsEl.value),
        totalMax: num(totalMaxEl.value)
      };
      const missing=[];
      if(!header.teacherName) missing.push("اسم المعلمة");
      if(!header.grade) missing.push("الصف");
      if(!header.section) missing.push("الشعبة");
      if(!header.subject) missing.push("المادة");
      if(!header.exam) missing.push("نوع الامتحان");
      if(missing.length) throw new Error("يرجى تعبئة: "+missing.join("، "));

      const rows=[];
      const {maxRecall:mr,maxUnderstand:mu,maxHots:mh}=header;
      for(const tr of getStudentRows()) {
        const n=tr.querySelector(".studentName").value.trim(); if(!n) continue;
        let r=tr.querySelector(".recall").value.trim();
        let u=tr.querySelector(".understand").value.trim();
        let h=tr.querySelector(".hots").value.trim();
        const plan=(tr.querySelector(".planInput").value||"").trim();
        if(fillEmpty) { if(r==="")r="0"; if(u==="")u="0"; if(h==="")h="0"; }
        else { if(r===""||u===""||h==="") throw new Error(`يرجى تعبئة علامات الطالبة: ${n}`); }
        const rn=num(r),un=num(u),hn=num(h);
        if(rn>mr) throw new Error(`تجاوز حد المعرفة والتذكر: ${n}`);
        if(un>mu) throw new Error(`تجاوز حد الفهم والتحليل: ${n}`);
        if(hn>mh) throw new Error(`تجاوز حد المهارات: ${n}`);
        const L=computeLevel(rn,un,hn,mr,mu,mh);
        if(!fillEmpty&&isWeakLevel(L.txt)&&(plan.length<1||plan.length>30))
          throw new Error(`الطالبة "${n}" — ${L.txt}، يجب إدخال خطة علاجية (1–30 حرف)`);
        rows.push({studentName:n,recall:rn,understand:un,hots:hn,plan});
      }
      if(rows.length===0) throw new Error("لا توجد طالبات للإرسال.");
      return {header,rows};
    }

    async function submitToMaster(fillEmpty=false) {
      try {
        startLoading("جارٍ إرسال البيانات...");
        setStatus("","جاري الإرسال...");
        const payload=collectPayload(fillEmpty);
        const j=await apiPost({action:"submit",...payload});
        if(!j.ok) throw new Error(j.error||"فشل");
        lastBatch.textContent=j.batchId||"—";
        setStatus("ok",`تم حفظ الإرسال بنجاح (${j.inserted} سجل)`,`يمكنك التعديل وإعادة الإرسال لنفس الصف | BatchID: ${j.batchId}`);
        saveDraftSoft();
        succeed("تم إرسال البيانات بنجاح");
      } catch(e) {
        setStatus("bad","فشل الإرسال",e.message);
        fail("فشل إرسال البيانات");
      }
    }
    function handleSubmit() {
      const inc=checkIncomplete();
      if(inc.length>0) {
        const names=inc.slice(0,3).join("، ")+(inc.length>3?"…":"");
        modalMessage.innerHTML=`البيانات لم تكتمل للطالبات: <strong>${names}</strong><br/><br/>هل تريد إرسال الحقول الفارغة كأصفار؟`;
        confirmModal.classList.add("visible");
        pendingSubmit=()=>submitToMaster(true);
      } else { submitToMaster(false); }
    }

    /* ── Draft ── */
    function getState() {
      return {
        module: DRAFT_MODULE,
        header:{
          teacherName:teacherSel.value,grade:gradeSel.value,section:sectionSel.value,
          subject:subjectSel.value,exam:examSel.value,
          maxRecall:maxRecallEl.value,maxUnderstand:maxUnderstandEl.value,maxHots:maxHotsEl.value,
          totalMax: totalMaxEl.value
        },
        rows:getStudentRows().map(tr=>({
          rowId: tr.dataset.rowId || nextRowId(),
          studentName:tr.querySelector(".studentName").value,
          recall:tr.querySelector(".recall").value,
          understand:tr.querySelector(".understand").value,
          hots:tr.querySelector(".hots").value,
          plan:tr.querySelector(".planInput").value
        })),
        lastBatch:lastBatch.textContent
      };
    }
    function applyState(st) {
      if(!st) return null;
      if(st.module && st.module !== DRAFT_MODULE) return null;
      const h=st.header||{};
      maxRecallEl.value=h.maxRecall??maxRecallEl.value;
      maxUnderstandEl.value=h.maxUnderstand??maxUnderstandEl.value;
      maxHotsEl.value=h.maxHots??maxHotsEl.value;
      computeTotalMax();
      tbody.innerHTML="";
      (st.rows||[]).forEach((r,i)=>tbody.appendChild(makeRow(r,i+1)));
      renderLucideIcons();
      tableContext = { grade: h.grade || "", section: h.section || "" };
      selectedRowId = "";
      voiceState.undoStack = [];
      voiceState.buffer = [];
      clearGridUndoHistory();
      clearGridSelection(true);
      refreshStudentRowsView();
      updateValidationChip();
      updateAutoFillButtonState();
      if(st.lastBatch) lastBatch.textContent=st.lastBatch;
      return h;
    }
    function saveDraftSoft() {
      try { localStorage.setItem(DRAFT_KEY,JSON.stringify(getState())); } catch(_){}
    }
    function scheduleDraftSave() {
      clearTimeout(draftTimer);
      draftTimer = setTimeout(saveDraftSoft, DRAFT_DEBOUNCE_MS);
    }
    function clearDraft() {
      clearTimeout(draftTimer);
      try { localStorage.removeItem(DRAFT_KEY); } catch(_){}
    }
    function resetAllData(shouldReload=false) {
      clearDraft();
      teacherSel.value = "";
      gradeSel.value = "";
      sectionSel.value = "";
      subjectSel.value = "";
      examSel.value = "";
      maxRecallEl.value = DEFAULT_MAX_RECALL;
      maxUnderstandEl.value = DEFAULT_MAX_UNDERSTAND;
      maxHotsEl.value = DEFAULT_MAX_HOTS;
      computeTotalMax();
      tbody.innerHTML = "";
      selectedRowId = "";
      voiceState.activeRowId = "";
      tableContext = { grade: "", section: "" };
      clearGridUndoHistory();
      clearGridSelection(true);
      refreshStudentRowsView({ skipSort: true });
      updateValidationChip();
      updateAutoFillButtonState();
      lastBatch.textContent = "—";
      setStatus("warn","تم تفريغ الكل");
      if (shouldReload) {
        setTimeout(() => window.location.reload(), 150);
      }
    }

    /* ── Voice Entry ── */
    const voiceNumberMap = {
      "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
      zero: 0, oh: 0, o: 0,
      one: 1,
      two: 2, to: 2, too: 2,
      three: 3,
      four: 4, for: 4,
      five: 5,
      six: 6,
      seven: 7,
      eight: 8, ate: 8,
      nine: 9,
      ten: 10,
      صفر: 0, زيرو: 0,
      واحد: 1, واحده: 1, اول: 1, ون: 1,
      اثنين: 2, اثنان: 2, اتنين: 2, تنين: 2, ثنين: 2, تو: 2,
      ثلاثه: 3, ثلاث: 3, تلاته: 3, ثري: 3,
      اربعه: 4, اربع: 4, فور: 4, فق: 4, فوك: 4, فوق: 4,
      خمسه: 5, خمس: 5, فايف: 5,
      سته: 6, ست: 6, سكس: 6,
      سبعه: 7, سبع: 7, سيفن: 7,
      ثمانيه: 8, ثماني: 8, ثمان: 8, ايت: 8,
      تسعه: 9, تسع: 9, ناين: 9,
      عشره: 10, عشر: 10
    };
    const voiceCommandMap = {
      next: "next",
      "نكست": "next",
      "نيكست": "next",
      "التالي": "next",
      "التاليه": "next",
      "بعده": "next"
    };
    function normalizeVoiceText(value) {
      return String(value || "")
        .toLowerCase()
        .normalize("NFKC")
        .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
        .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
        .replace(/[إأآٱ]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/ة/g, "ه")
        .replace(/ؤ/g, "و")
        .replace(/ئ/g, "ي")
        .replace(/[\u064B-\u065F\u0670]/g, "")
        .trim();
    }
    function speakStudentName(studentName) {
      if (!supportsSpeechSynthesis) return;
      const text = String(studentName || "").trim();
      if (!text) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new window.SpeechSynthesisUtterance(text);
        utterance.lang = "ar-SA";
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;
        window.speechSynthesis.speak(utterance);
      } catch (_) {}
    }

    function updateVoicePanelInfo() {
      if (!voiceCurrentSn || !voiceCurrentStudent || !voiceListeningStatus || !voiceTokensPreview) return;
      const row = getRowById(voiceState.activeRowId);
      const rowSn = (row?.querySelector(".row-index")?.textContent || "").trim();
      const studentName = row ? getRowName(row) : "";
      const recognitionSupported = Boolean(SpeechRecognitionCtor);
      const canStart = recognitionSupported && !voiceState.listening;
      const canStop = recognitionSupported && voiceState.listening;
      const canUndo = voiceState.undoStack.length > 0;
      voiceCurrentSn.textContent = rowSn || "—";
      if (voiceSnInput && document.activeElement !== voiceSnInput) {
        voiceSnInput.value = rowSn || "";
      }
      voiceCurrentStudent.textContent = studentName || "—";
      if (voiceState.listening) {
        voiceListeningStatus.textContent = "يستمع الآن";
        voiceListeningStatus.className = "voice-value listening";
      } else {
        voiceListeningStatus.textContent = SpeechRecognitionCtor ? "متوقف" : "غير مدعوم";
        voiceListeningStatus.className = "voice-value";
      }
      const rv = voiceState.buffer.length > 0 ? String(voiceState.buffer[0]) : "—";
      const uv = voiceState.buffer.length > 1 ? String(voiceState.buffer[1]) : "—";
      const hv = voiceState.buffer.length > 2 ? String(voiceState.buffer[2]) : "—";
      if (voiceRecallVal) voiceRecallVal.textContent = rv;
      if (voiceUnderstandVal) voiceUnderstandVal.textContent = uv;
      if (voiceHotsVal) voiceHotsVal.textContent = hv;
      const finalTokens = voiceState.tokenPreview.slice(-10).join(" ");
      const interimTokens = voiceState.interimTokens.join(" ");
      const preview = [finalTokens, interimTokens].filter(Boolean).join(" | ");
      voiceTokensPreview.textContent = preview || "—";
      if (voiceStartBtn) {
        voiceStartBtn.disabled = !canStart;
        voiceStartBtn.classList.toggle("voice-btn-active", canStart);
        voiceStartBtn.classList.toggle("voice-btn-idle", !canStart);
        voiceStartBtn.classList.toggle("voice-btn-disabled", !canStart);
      }
      if (voiceStopBtn) {
        voiceStopBtn.disabled = !canStop;
        voiceStopBtn.classList.toggle("voice-btn-active", canStop);
        voiceStopBtn.classList.toggle("voice-btn-idle", !canStop);
        voiceStopBtn.classList.toggle("voice-btn-disabled", !canStop);
      }
      if (voiceUndoBtn) {
        voiceUndoBtn.disabled = !canUndo;
        voiceUndoBtn.classList.toggle("voice-btn-active", canUndo);
        voiceUndoBtn.classList.toggle("voice-btn-idle", !canUndo);
        voiceUndoBtn.classList.toggle("voice-btn-disabled", !canUndo);
      }
    }

    function setVoiceActiveRowById(rowId, shouldScroll = true) {
      if (!voiceState.isOpen) {
        getStudentRows().forEach((tr) => tr.classList.remove("voice-active"));
        return;
      }
      const visibleRows = getVisibleStudentRows();
      if (!visibleRows.length) {
        voiceState.activeRowId = "";
        getStudentRows().forEach((tr) => tr.classList.remove("voice-active"));
        updateVoicePanelInfo();
        return;
      }
      let row = getRowById(rowId);
      if (!row || row.style.display === "none") {
        row = ensureSelectedRow();
        if (!row || row.style.display === "none") row = visibleRows[0];
      }
      if (!row) {
        updateVoicePanelInfo();
        return;
      }
      voiceState.activeRowId = row.dataset.rowId || "";
      selectRow(voiceState.activeRowId);
      getStudentRows().forEach((tr) => tr.classList.toggle("voice-active", tr === row));
      if (shouldScroll) row.scrollIntoView({ block: "nearest", behavior: "smooth" });
      updateVoicePanelInfo();
    }
    function setVoiceActiveBySn(snValue, shouldScroll = true, shouldSpeakName = false) {
      const sn = Number(snValue);
      const rows = getVisibleStudentRows();
      if (!Number.isInteger(sn) || sn < 1 || sn > rows.length) {
        if (rows.length > 0) showQuickNotice(`SN يجب أن يكون بين 1 و ${rows.length}`, "warn", 1700);
        return;
      }
      const target = rows[sn - 1];
      if (!target) return;
      setVoiceActiveRowById(target.dataset.rowId || "", shouldScroll);
      if (shouldSpeakName) speakStudentName(getRowName(target));
    }

    function syncVoiceRowAfterListChange() {
      if (!voiceState.isOpen) {
        getStudentRows().forEach((tr) => tr.classList.remove("voice-active"));
        return;
      }
      const visibleRows = getVisibleStudentRows();
      if (!visibleRows.length) {
        voiceState.activeRowId = "";
        getStudentRows().forEach((tr) => tr.classList.remove("voice-active"));
        updateVoicePanelInfo();
        return;
      }
      const current = getRowById(voiceState.activeRowId);
      if (!current || current.style.display === "none") {
        const selected = ensureSelectedRow();
        const next = selected && selected.style.display !== "none" ? selected : visibleRows[0];
        voiceState.activeRowId = next ? next.dataset.rowId : "";
      }
      setVoiceActiveRowById(voiceState.activeRowId, false);
    }

    function pushVoiceTokenPreview(token) {
      if (!token) return;
      voiceState.tokenPreview.push(token);
      if (voiceState.tokenPreview.length > 28) {
        voiceState.tokenPreview = voiceState.tokenPreview.slice(-28);
      }
    }

    function normalizeVoiceToken(token) {
      const value = normalizeVoiceText(token);
      if (!value) return null;
      if (voiceCommandMap[value]) return voiceCommandMap[value];
      if (value.includes("next") || value.includes("نكست") || value.includes("نيكست")) return "next";
      if (/^\d+$/.test(value)) {
        if (value.length > 1 && value !== "10") return value.split("");
        const numericValue = Number(value);
        if (Number.isInteger(numericValue) && numericValue >= 0 && numericValue <= 10) {
          return String(numericValue);
        }
      }
      const numeric = Object.prototype.hasOwnProperty.call(voiceNumberMap, value)
        ? voiceNumberMap[value]
        : null;
      if (numeric === null || numeric === undefined) return null;
      return String(numeric);
    }

    function filterAcceptedVoiceTokens(tokens) {
      return (tokens || []).flatMap((token) => {
        const normalized = normalizeVoiceToken(token);
        if (!normalized) return [];
        return Array.isArray(normalized) ? normalized : [normalized];
      });
    }

    function tokenizeVoice(text) {
      return normalizeVoiceText(text)
        .replace(/[^a-z0-9\u0600-\u06FF\s]/g, " ")
        .replace(/([0-9]+)([a-z\u0600-\u06FF]+)/g, "$1 $2")
        .replace(/([a-z\u0600-\u06FF]+)([0-9]+)/g, "$1 $2")
        .split(/\s+/)
        .filter(Boolean);
    }

    function resetVoiceBufferedMarks() {
      clearTimeout(voiceState.repeatFillTimer);
      voiceState.repeatFillTimer = null;
      voiceState.buffer = [];
      voiceState.tokenPreview = [];
      voiceState.interimTokens = [];
      voiceState.lastOverflowNoticeAt = 0;
    }

    function scheduleRepeatThirdFill() {
      clearTimeout(voiceState.repeatFillTimer);
      voiceState.repeatFillTimer = null;
      if (voiceState.buffer.length !== 2) return;
      if (voiceState.buffer[0] !== voiceState.buffer[1]) return;
      const repeated = Number(voiceState.buffer[1]);
      if (!Number.isFinite(repeated)) return;
      voiceState.repeatFillTimer = setTimeout(() => {
        voiceState.repeatFillTimer = null;
        if (voiceState.buffer.length !== 2) return;
        if (voiceState.buffer[0] !== voiceState.buffer[1]) return;
        voiceState.buffer.push(repeated);
        showQuickNotice(`تم إكمال الدرجة الثالثة تلقائيًا بنفس القيمة (${repeated})`, "info", 1500);
        updateVoicePanelInfo();
      }, 1200);
    }

    function notifyVoiceRejected(message) {
      resetVoiceBufferedMarks();
      showQuickNotice(message, "bad", 3400, { requireAck: true });
      if (voiceListeningStatus) {
        voiceListeningStatus.textContent = "لم يتم قبول القيم";
        voiceListeningStatus.className = "voice-value";
      }
      updateVoicePanelInfo();
    }

    function applyVoiceMarksToRow(row, values) {
      if (!row || !Array.isArray(values) || values.length !== 3) return false;
      const rInput = row.querySelector(".recall");
      const uInput = row.querySelector(".understand");
      const hInput = row.querySelector(".hots");
      const maxR = num(maxRecallEl.value);
      const maxU = num(maxUnderstandEl.value);
      const maxH = num(maxHotsEl.value);
      const numericValues = [
        Math.max(0, Number(values[0]) || 0),
        Math.max(0, Number(values[1]) || 0),
        Math.max(0, Number(values[2]) || 0)
      ];
      if (numericValues[0] > maxR) {
        notifyVoiceRejected(`لم يتم قبول القيم لأن قيمة المعرفة والتذكر (${numericValues[0]}) تجاوزت الحد المسموح ${maxR}`);
        return false;
      }
      if (numericValues[1] > maxU) {
        notifyVoiceRejected(`لم يتم قبول القيم لأن قيمة الفهم والتحليل (${numericValues[1]}) تجاوزت الحد المسموح ${maxU}`);
        return false;
      }
      if (numericValues[2] > maxH) {
        notifyVoiceRejected(`لم يتم قبول القيم لأن قيمة المهارات العليا (${numericValues[2]}) تجاوزت الحد المسموح ${maxH}`);
        return false;
      }
      const prev = {
        recall: rInput?.value ?? "",
        understand: uInput?.value ?? "",
        hots: hInput?.value ?? ""
      };
      if (rInput) rInput.value = String(numericValues[0]);
      if (uInput) uInput.value = String(numericValues[1]);
      if (hInput) hInput.value = String(numericValues[2]);
      if (rInput) rInput.dispatchEvent(new Event("input", { bubbles: true }));
      if (uInput) uInput.dispatchEvent(new Event("input", { bubbles: true }));
      if (hInput) hInput.dispatchEvent(new Event("input", { bubbles: true }));
      voiceState.undoStack.push({
        rowId: row.dataset.rowId || "",
        prev,
        next: { recall: String(numericValues[0]), understand: String(numericValues[1]), hots: String(numericValues[2]) }
      });
      if (voiceState.undoStack.length > 500) voiceState.undoStack.shift();
      scheduleDraftSave();
      return true;
    }

    function moveVoiceToNextRow() {
      const rows = getVisibleStudentRows();
      if (!rows.length) return;
      const current = getRowById(voiceState.activeRowId);
      const idx = rows.indexOf(current);
      if (idx >= 0 && idx < rows.length - 1) {
        setVoiceActiveRowById(rows[idx + 1].dataset.rowId, true);
        return;
      }
      if (idx === -1) {
        setVoiceActiveRowById(rows[0].dataset.rowId, true);
        return;
      }
      setVoiceActiveRowById(rows[rows.length - 1].dataset.rowId, true);
      showQuickNotice("تم الوصول إلى آخر طالبة", "warn", 1800);
    }

    function commitVoiceBufferedMarks() {
      clearTimeout(voiceState.repeatFillTimer);
      voiceState.repeatFillTimer = null;
      if (voiceState.buffer.length === 2 && voiceState.buffer[0] === voiceState.buffer[1]) {
        const repeated = Number(voiceState.buffer[1]);
        if (Number.isFinite(repeated)) {
          voiceState.buffer.push(repeated);
          showQuickNotice(`تم إكمال الدرجة الثالثة تلقائيًا بنفس القيمة (${repeated})`, "info", 1500);
        }
      }
      if (voiceState.buffer.length !== 3) {
        if (voiceState.buffer.length > 0) {
          resetVoiceBufferedMarks();
          showQuickNotice("لم تكتمل 3 درجات. تم مسح القيم المسموعة، أعد الإدخال ثم قل next", "warn", 2600);
        } else {
          resetVoiceBufferedMarks();
          showQuickNotice("يجب إدخال 3 درجات ثم كلمة next", "warn", 1900);
        }
        updateVoicePanelInfo();
        return;
      }
      const row = getRowById(voiceState.activeRowId) || ensureSelectedRow();
      if (!row) {
        showQuickNotice("لا توجد طالبات مرئية للإدخال الصوتي", "warn", 1900);
        resetVoiceBufferedMarks();
        updateVoicePanelInfo();
        return;
      }
      const committed = applyVoiceMarksToRow(row, voiceState.buffer);
      resetVoiceBufferedMarks();
      if (!committed) {
        updateVoicePanelInfo();
        return;
      }
      moveVoiceToNextRow();
      updateVoicePanelInfo();
    }

    function undoVoiceLastRow() {
      const last = voiceState.undoStack.pop();
      if (!last) {
        showQuickNotice("لا يوجد سجل للتراجع", "warn", 1800);
        return;
      }
      const row = getRowById(last.rowId);
      if (!row) {
        showQuickNotice("تعذر تنفيذ التراجع للصف السابق", "warn", 1800);
        return;
      }
      const rInput = row.querySelector(".recall");
      const uInput = row.querySelector(".understand");
      const hInput = row.querySelector(".hots");
      if (rInput) rInput.value = last.prev.recall ?? "";
      if (uInput) uInput.value = last.prev.understand ?? "";
      if (hInput) hInput.value = last.prev.hots ?? "";
      if (rInput) rInput.dispatchEvent(new Event("input", { bubbles: true }));
      if (uInput) uInput.dispatchEvent(new Event("input", { bubbles: true }));
      if (hInput) hInput.dispatchEvent(new Event("input", { bubbles: true }));
      voiceState.buffer = [];
      setVoiceActiveRowById(last.rowId, true);
      scheduleDraftSave();
      showQuickNotice("تم التراجع عن آخر صف صوتي", "info", 1700);
    }

    function consumeVoiceToken(token) {
      const normalized = normalizeVoiceToken(token);
      if (!normalized) return;
      if (Array.isArray(normalized)) {
        normalized.forEach((item) => consumeVoiceToken(item));
        return;
      }
      if (normalized === "next") {
        clearTimeout(voiceState.repeatFillTimer);
        voiceState.repeatFillTimer = null;
        pushVoiceTokenPreview(normalized);
        if (voiceState.buffer.length === 0) {
          moveVoiceToNextRow();
          updateVoicePanelInfo();
          return;
        }
        commitVoiceBufferedMarks();
        return;
      }
      const numeric = Number(normalized);
      if (!Number.isFinite(numeric)) return;
      if (voiceState.buffer.length >= 3) {
        clearTimeout(voiceState.repeatFillTimer);
        voiceState.repeatFillTimer = null;
        const now = Date.now();
        if (!voiceState.lastOverflowNoticeAt || now - voiceState.lastOverflowNoticeAt > 1800) {
          showQuickNotice("تم تجاهل قيمة إضافية. قل next لاعتماد الدرجات الحالية", "warn", 1800);
          voiceState.lastOverflowNoticeAt = now;
        }
        pushVoiceTokenPreview(String(numeric));
        updateVoicePanelInfo();
        return;
      }
      pushVoiceTokenPreview(String(numeric));
      voiceState.buffer.push(numeric);
      scheduleRepeatThirdFill();
      updateVoicePanelInfo();
    }

    function processVoiceTranscript(transcript) {
      const tokens = filterAcceptedVoiceTokens(tokenizeVoice(transcript));
      if (!tokens.length) return;
      tokens.forEach((token) => consumeVoiceToken(token));
      updateVoicePanelInfo();
    }

    function buildVoiceRecognition() {
      if (!SpeechRecognitionCtor) return null;
      const rec = new SpeechRecognitionCtor();
      rec.lang = "ar-SA";
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.onstart = () => {
        voiceState.listening = true;
        voiceState.lastProcessedResultIndex = 0;
        updateVoicePanelInfo();
      };
      rec.onresult = (event) => {
        const interim = [];
        const startIndex = Math.max(event.resultIndex || 0, voiceState.lastProcessedResultIndex || 0);
        for (let i = startIndex; i < event.results.length; i += 1) {
          const part = event.results[i][0]?.transcript || "";
          if (!part) continue;
          if (event.results[i].isFinal) {
            processVoiceTranscript(part);
            voiceState.lastProcessedResultIndex = i + 1;
          } else {
            interim.push(...filterAcceptedVoiceTokens(tokenizeVoice(part)).slice(-6));
          }
        }
        voiceState.interimTokens = interim.slice(-6);
        updateVoicePanelInfo();
      };
      rec.onerror = (event) => {
        const err = event?.error || "";
        if (err === "not-allowed" || err === "service-not-allowed") {
          voiceState.shouldKeepListening = false;
          voiceState.listening = false;
          showQuickNotice("لا يوجد إذن لاستخدام الميكروفون", "bad", 2600);
          updateVoicePanelInfo();
          return;
        }
        if (err === "aborted") return;
        if (err === "no-speech" || err === "audio-capture") {
          updateVoicePanelInfo();
          return;
        }
        showQuickNotice("تم تجاهل نتيجة صوتية غير واضحة", "warn", 1600);
      };
      rec.onend = () => {
        voiceState.listening = false;
        voiceState.interimTokens = [];
        voiceState.lastProcessedResultIndex = 0;
        updateVoicePanelInfo();
        if (!voiceState.shouldKeepListening || !voiceState.isOpen) return;
        clearTimeout(voiceState.restartTimer);
        voiceState.restartTimer = setTimeout(() => {
          try { rec.start(); } catch (_) {}
        }, 320);
      };
      return rec;
    }

    function startVoiceRecognition() {
      if (!SpeechRecognitionCtor) {
        showQuickNotice("المتصفح الحالي لا يدعم الإدخال الصوتي", "warn", 2600);
        updateVoicePanelInfo();
        return;
      }
      if (!voiceState.isOpen && voicePanel) {
        voicePanel.classList.add("visible");
        voiceState.isOpen = true;
      }
      if (!voiceState.recognition) voiceState.recognition = buildVoiceRecognition();
      if (!voiceState.recognition) return;
      voiceState.shouldKeepListening = true;
      syncVoiceRowAfterListChange();
      try {
        voiceState.recognition.start();
      } catch (_) {
        if (!voiceState.listening) {
          clearTimeout(voiceState.restartTimer);
          voiceState.restartTimer = setTimeout(() => {
            try { voiceState.recognition.start(); } catch (_) {}
          }, 240);
        }
      }
      updateVoicePanelInfo();
    }

    function stopVoiceRecognition(showMessage = false) {
      voiceState.shouldKeepListening = false;
      voiceState.interimTokens = [];
      voiceState.lastProcessedResultIndex = 0;
      clearTimeout(voiceState.repeatFillTimer);
      voiceState.repeatFillTimer = null;
      clearTimeout(voiceState.restartTimer);
      if (voiceState.recognition) {
        try { voiceState.recognition.stop(); } catch (_) {}
      }
      voiceState.listening = false;
      updateVoicePanelInfo();
      if (showMessage) showQuickNotice("تم إيقاف الإدخال الصوتي", "info", 1700);
    }

    function openVoicePanel() {
      if (!voicePanel) return;
      voicePanel.classList.add("visible");
      voiceState.isOpen = true;
      if (!SpeechRecognitionCtor) {
        showQuickNotice("المتصفح الحالي لا يدعم الإدخال الصوتي", "warn", 2600);
      }
      syncVoiceRowAfterListChange();
      updateVoicePanelInfo();
      clampVoicePanelToViewport();
    }

    function closeVoicePanel() {
      stopVoiceRecognition(false);
      clearTimeout(voiceSnInputTimer);
      voiceState.isOpen = false;
      clearTimeout(voiceState.repeatFillTimer);
      voiceState.repeatFillTimer = null;
      voiceState.buffer = [];
      voiceState.tokenPreview = [];
      voiceState.interimTokens = [];
      voiceState.activeRowId = "";
      voiceState.lastProcessedResultIndex = 0;
      if (supportsSpeechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch (_) {}
      }
      getStudentRows().forEach((tr) => tr.classList.remove("voice-active"));
      if (voicePanel) voicePanel.classList.remove("visible");
      updateVoicePanelInfo();
    }

    function clampVoicePanelToViewport() {
      if (!voicePanel) return;
      const rect = voicePanel.getBoundingClientRect();
      const margin = 8;
      const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
      const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);
      const nextLeft = Math.min(Math.max(rect.left, margin), maxLeft);
      const nextTop = Math.min(Math.max(rect.top, margin), maxTop);
      if (Math.abs(nextLeft - rect.left) > 0.5 || Math.abs(nextTop - rect.top) > 0.5) {
        voicePanel.style.left = `${nextLeft}px`;
        voicePanel.style.top = `${nextTop}px`;
        voicePanel.style.right = "auto";
        voicePanel.style.bottom = "auto";
      }
    }

    function initVoicePanelDrag() {
      if (!voicePanel) return;
      const handle = voicePanel.querySelector(".drag-handle");
      if (!handle) return;
      let dragging = false;
      let startX = 0;
      let startY = 0;
      let startLeft = 0;
      let startTop = 0;

      const onPointerMove = (e) => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const rect = voicePanel.getBoundingClientRect();
        const margin = 8;
        const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
        const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);
        const nextLeft = Math.min(Math.max(startLeft + dx, margin), maxLeft);
        const nextTop = Math.min(Math.max(startTop + dy, margin), maxTop);
        voicePanel.style.left = `${nextLeft}px`;
        voicePanel.style.top = `${nextTop}px`;
        voicePanel.style.right = "auto";
        voicePanel.style.bottom = "auto";
      };

      const endDrag = () => {
        if (!dragging) return;
        dragging = false;
        voicePanel.classList.remove("dragging");
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", endDrag);
        document.removeEventListener("pointercancel", endDrag);
        clampVoicePanelToViewport();
      };

      handle.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        if (e.target && e.target.closest("button")) return;
        dragging = true;
        const rect = voicePanel.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        startLeft = rect.left;
        startTop = rect.top;
        voicePanel.classList.add("dragging");
        handle.setPointerCapture(e.pointerId);
        document.addEventListener("pointermove", onPointerMove);
        document.addEventListener("pointerup", endDrag);
        document.addEventListener("pointercancel", endDrag);
      });

      window.addEventListener("resize", () => clampVoicePanelToViewport());
    }

    /* ── Print ── */
    function makeAdminPrintRowId(r) {
      return [
        r?.batchId || "",
        r?.timestamp || "",
        r?.teacherName || "",
        r?.grade || "",
        r?.section || "",
        r?.subject || "",
        r?.exam || "",
        r?.studentName || ""
      ].join("::");
    }
    function mapAdminRowToPrint(r, visibleSet = null) {
      const rowId = makeAdminPrintRowId(r);
      const recallRaw = r?.recall ?? "";
      const understandRaw = r?.understand ?? "";
      const hotsRaw = r?.hots ?? "";
      const totalRaw = r?.total ?? "";
      const recall = String(recallRaw).trim();
      const understand = String(understandRaw).trim();
      const hots = String(hotsRaw).trim();
      const total = String(totalRaw).trim();
      const computedLevel = computeLevel(
        Number(recall || 0),
        Number(understand || 0),
        Number(hots || 0),
        Number(r?.maxRecall || 0),
        Number(r?.maxUnderstand || 0),
        Number(r?.maxHots || 0)
      ).txt;
      const totalNumber = Number(total || 0);
      const totalMax = Number(r?.totalMax || 0) || (Number(r?.maxRecall || 0) + Number(r?.maxUnderstand || 0) + Number(r?.maxHots || 0));
      const estimate = computeEstimate(totalNumber, totalMax).txt;
      const skillScale = computeSkillScale(
        Number(recall || 0),
        Number(understand || 0),
        Number(hots || 0),
        Number(r?.maxRecall || 0),
        Number(r?.maxUnderstand || 0),
        Number(r?.maxHots || 0)
      );
      const level = computedLevel !== "—" ? computedLevel : String(r?.level || "—");
      const plan = String(r?.plan || "").trim();
      const skillMeasure = formatSkillScale(skillScale);
      const skillCode = Number(skillScale.code);
      return {
        rowId,
        sn: "",
        name: String(r?.studentName || r?.name || "").trim(),
        recall,
        understand,
        hots,
        total,
        estimate,
        skillMeasure,
        level,
        plan,
        hasPlan: !!plan,
        isWeak: Number.isFinite(skillCode) ? skillCode > 1 : isWeakLevel(level),
        hasMissing: recall === "" || understand === "" || hots === "",
        visible: visibleSet ? visibleSet.has(rowId) : true
      };
    }
    function getAdminPrintSnapshot() {
      if (typeof adminDash === "undefined" || !adminDash || typeof adminDash.getPrintSnapshot !== "function") {
        return null;
      }
      return adminDash.getPrintSnapshot();
    }
    function getPrintMeta(context = activePrintContext) {
      const schoolName = sessionStorage.getItem(SESSION_SCHOOL_NAME_KEY) || "—";
      let teacherName = teacherSel?.value?.trim() || "—";
      let grade = gradeSel?.value?.trim() || "—";
      let section = sectionSel?.value?.trim() || "—";
      let subject = subjectSel?.value?.trim() || "—";
      if (context === "admin") {
        const snap = getAdminPrintSnapshot();
        if (snap?.filters) {
          teacherName = snap.filters.teacher || "—";
          grade = snap.filters.grade || "—";
          section = snap.filters.section || "—";
          subject = snap.filters.subject || "—";
        }
      }
      const dateTime = new Date().toLocaleString("ar-EG", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
      return { schoolName, teacherName, grade, section, subject, dateTime };
    }
    function getPrintRows(context = activePrintContext) {
      if (context === "admin") {
        const snap = getAdminPrintSnapshot();
        if (!snap) return [];
        const visibleSet = new Set((snap.filteredRows || []).map((r) => makeAdminPrintRowId(r)));
        return (snap.baseRows || [])
          .map((r) => mapAdminRowToPrint(r, visibleSet))
          .filter((r) => r.name);
      }
      return getStudentRows()
        .map((tr) => {
          const recall = (tr.querySelector(".recall")?.value || "").trim();
          const understand = (tr.querySelector(".understand")?.value || "").trim();
          const hots = (tr.querySelector(".hots")?.value || "").trim();
          const total = (tr.querySelector(".total")?.value || "").trim();
          const plan = (tr.querySelector(".planInput")?.value || "").trim();
          const level = getLevelFromRow(tr);
          const mr = num(maxRecallEl.value);
          const mu = num(maxUnderstandEl.value);
          const mh = num(maxHotsEl.value);
          const estimate = computeEstimate(Number(total || 0), mr + mu + mh).txt;
          const skillScale = computeSkillScale(
            Number(recall || 0),
            Number(understand || 0),
            Number(hots || 0),
            mr,
            mu,
            mh
          );
          const skillMeasure = formatSkillScale(skillScale);
          const skillCode = Number(skillScale.code);
          return {
            rowId: tr.dataset.rowId || "",
            sn: (tr.querySelector(".row-index")?.textContent || "").trim(),
            name: getRowName(tr),
            recall,
            understand,
            hots,
            total,
            estimate,
            skillMeasure,
            level,
            plan,
            hasPlan: !!plan,
            isWeak: Number.isFinite(skillCode) ? skillCode > 1 : isWeakLevel(level),
            hasMissing: recall === "" || understand === "" || hots === "",
            visible: tr.style.display !== "none"
          };
        })
        .filter((r) => r.name);
    }

    function renderPrintHeader(title) {
      const meta = getPrintMeta();
      return `
        <div class="print-head">
          <div class="print-school">${esc(meta.schoolName)}</div>
          <div class="print-title">${esc(title)}</div>
          <div class="print-meta-grid">
            <div><strong>الصف:</strong> ${esc(meta.grade)}</div>
            <div><strong>الشعبة:</strong> ${esc(meta.section)}</div>
            <div><strong>المادة:</strong> ${esc(meta.subject)}</div>
            <div><strong>المعلمة:</strong> ${esc(meta.teacherName)}</div>
            <div><strong>التاريخ والوقت:</strong> ${esc(meta.dateTime)}</div>
          </div>
        </div>
      `;
    }

    function renderPrintRowsTable(rows, blank = false) {
      if (!rows.length) return `<div class="print-empty">لا توجد بيانات متاحة لهذا الخيار.</div>`;
      const body = rows
        .map((r, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td class="print-name">${esc(r.name)}</td>
            <td>${blank ? "" : esc(r.recall || "—")}</td>
            <td>${blank ? "" : esc(r.understand || "—")}</td>
            <td>${blank ? "" : esc(r.hots || "—")}</td>
            <td>${blank ? "" : esc(r.total || "—")}</td>
            <td>${blank ? "" : esc(r.estimate || "—")}</td>
            <td>${blank ? "" : esc(r.skillMeasure || "—")}</td>
            <td>${blank ? "" : esc(r.plan || "—")}</td>
          </tr>
        `)
        .join("");
      return `
        <table class="print-table">
          <thead>
            <tr>
              <th>SN</th>
              <th>اسم الطالبة</th>
              <th>المعرفة والتذكر</th>
              <th>الفهم والتحليل</th>
              <th>المهارات العليا</th>
              <th>المجموع</th>
              <th>التقدير</th>
              <th>القياس المهاري</th>
              <th>الخطة العلاجية</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      `;
    }

    function renderPrintSummary(rows) {
      const total = rows.length;
      const missing = rows.filter((r) => r.hasMissing).length;
      const entered = total - missing;
      const weak = rows.filter((r) => r.isWeak).length;
      const plans = rows.filter((r) => r.hasPlan).length;
      const totals = rows.map((r) => Number(r.total || 0)).filter((v) => Number.isFinite(v) && v > 0);
      const avgTotal = totals.length ? (totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(2) : "0.00";
      return `
        <table class="print-summary-table">
          <tbody>
            <tr><th>إجمالي الطالبات</th><td>${total}</td></tr>
            <tr><th>الطالبات المدخلة علاماتهن</th><td>${entered}</td></tr>
            <tr><th>الطالبات الناقصات علامات</th><td>${missing}</td></tr>
            <tr><th>عدد الطالبات ذوات الضعف</th><td>${weak}</td></tr>
            <tr><th>عدد الخطط العلاجية</th><td>${plans}</td></tr>
            <tr><th>متوسط المجموع</th><td>${avgTotal}</td></tr>
          </tbody>
        </table>
      `;
    }

    function getRowsForPrintMode(mode, allRows) {
      if (mode === "all") return allRows;
      if (mode === "with-plan") return allRows.filter((r) => r.hasPlan);
      if (mode === "without-plan") return allRows.filter((r) => !r.hasPlan);
      if (mode === "weak") return allRows.filter((r) => r.isWeak);
      if (mode === "missing") return allRows.filter((r) => r.hasMissing);
      if (mode === "filtered") return allRows.filter((r) => r.visible);
      if (mode === "single") {
        const targetId = activePrintContext === "admin"
          ? selectedAdminRowId
          : (selectedRowId || voiceState.activeRowId);
        const picked = allRows.find((r) => r.rowId === targetId);
        if (picked) return [picked];
        return allRows.length ? [allRows[0]] : [];
      }
      if (mode === "blank") return allRows;
      return allRows;
    }

    function printModeTitle(mode) {
      if (mode === "all") return "طباعة جميع الطالبات في الصف/الشعبة الحالية";
      if (mode === "with-plan") return "طباعة الطالبات ذوات الخطة العلاجية فقط";
      if (mode === "without-plan") return "طباعة الطالبات بدون خطة علاجية";
      if (mode === "weak") return "طباعة الطالبات ذوات الضعف فقط";
      if (mode === "missing") return "طباعة الطالبات ناقصات العلامات";
      if (mode === "filtered") return "طباعة العرض المفلتر الحالي";
      if (mode === "single") return "طباعة صف طالبة واحدة";
      if (mode === "summary") return "طباعة ورقة الملخص";
      if (mode === "blank") return "طباعة ورقة إدخال فارغة";
      return "طباعة";
    }

    function closePrintModalBox() {
      if (printModal) printModal.classList.remove("visible");
    }

    function openPrintModalBox(context = "teacher") {
      activePrintContext = context === "admin" ? "admin" : "teacher";
      if (printModalTitle) {
        printModalTitle.textContent = activePrintContext === "admin"
          ? "خيارات الطباعة - لوحة المديرة"
          : "خيارات الطباعة";
      }
      const hasRows = activePrintContext === "admin"
        ? getPrintRows("admin").length > 0
        : hasTableRows();
      if (!hasRows) {
        showQuickNotice("لا توجد بيانات للطباعة", "warn", 1700);
        return;
      }
      if (printModal) printModal.classList.add("visible");
    }

    function buildPrintSheetForMode(mode) {
      const allRows = getPrintRows(activePrintContext);
      const title = printModeTitle(mode);
      let bodyHtml = "";
      if (mode === "summary") {
        bodyHtml = renderPrintSummary(allRows);
      } else {
        const rows = getRowsForPrintMode(mode, allRows);
        if (!rows.length) return { ok: false, title };
        bodyHtml = renderPrintRowsTable(rows, mode === "blank");
      }
      if (!printSheet) return { ok: false, title };
      printSheet.innerHTML = `
        <div class="print-page">
          ${renderPrintHeader(title)}
          ${bodyHtml}
        </div>
      `;
      return { ok: true, title };
    }

    function startPrintMode(mode) {
      const res = buildPrintSheetForMode(mode);
      if (!res.ok) {
        showQuickNotice("لا توجد بيانات مناسبة لخيار الطباعة المحدد", "warn", 1800);
        return;
      }
      closePrintModalBox();
      setTimeout(() => window.print(), 60);
    }

    function clearPrintSheet() {
      if (printSheet) printSheet.innerHTML = "";
    }

    /* ── Boot ── */
    function boot() {
      if (window.__legacyBooted) return;
      window.__legacyBooted = true;
      renderLucideIcons();
      computeTotalMax();
      ["teacher","grade","section","subject","exam"].forEach(id=>fillSelect($(id),[],"— اختر —"));

      const raw=localStorage.getItem(DRAFT_KEY);
      if(raw) {
        try {
          const draft=JSON.parse(raw);
          const h=applyState(draft);
          lastDraftHeader = h || null;
          if (h) {
            setTimeout(()=>{
              teacherSel.value=h.teacherName||"";
              gradeSel.value=h.grade||"";
              sectionSel.value=h.section||"";
              subjectSel.value=h.subject||"";
              examSel.value=h.exam||"";
            },500);
            setStatus("warn","تم استرجاع حفظ مؤقت","اضغط (تحديث القوائم) للتأكد من القيم");
          }
        } catch(_){}
      }

      $("btnLoadLookups").addEventListener("click", async ()=>{
        await loadLookups();
        const raw2=localStorage.getItem(DRAFT_KEY);
        if(raw2) {
          try {
            const d=JSON.parse(raw2), h=d.header||{};
            teacherSel.value=h.teacherName||""; gradeSel.value=h.grade||"";
            sectionSel.value=h.section||""; subjectSel.value=h.subject||""; examSel.value=h.exam||"";
            scheduleDraftSave(); validateAllRows();
          } catch(_){}
        }
      });
      $("btnAutoFill").addEventListener("click", ()=>{ autoFillStudents(); });
      $("btnSubmit").addEventListener("click", handleSubmit);
      $("btnClearScores").addEventListener("click", ()=>{
        if(confirm("مسح الدرجات والخطة فقط؟ (الأسماء ستبقى)")) { clearScoresOnly(); setStatus("warn","تم مسح الدرجات فقط"); }
      });
      if (studentSearchInput) {
        studentSearchInput.addEventListener("input", () => {
          scheduleStudentRowsRefresh(true);
        });
      }
      if (btnVoiceEntry) {
        btnVoiceEntry.addEventListener("click", () => openVoicePanel());
      }
      if (voiceSnInput) {
        const applySn = (shouldSpeakName = false) => {
          const raw = String(voiceSnInput.value || "").trim();
          if (!raw) return;
          setVoiceActiveBySn(raw, true, shouldSpeakName);
        };
        voiceSnInput.addEventListener("input", () => {
          clearTimeout(voiceSnInputTimer);
          voiceSnInputTimer = setTimeout(() => applySn(true), 240);
        });
        voiceSnInput.addEventListener("change", () => applySn(true));
        voiceSnInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            clearTimeout(voiceSnInputTimer);
            applySn(true);
          }
        });
      }
      if (voiceStartBtn) voiceStartBtn.addEventListener("click", () => startVoiceRecognition());
      if (voiceStopBtn) voiceStopBtn.addEventListener("click", () => stopVoiceRecognition(true));
      if (voiceUndoBtn) voiceUndoBtn.addEventListener("click", () => undoVoiceLastRow());
      if (voiceCloseBtn) voiceCloseBtn.addEventListener("click", () => closeVoicePanel());
      if (quickNoticeBtn) quickNoticeBtn.addEventListener("click", () => hideQuickNotice());
      if (voicePanel) {
        voicePanel.addEventListener("click", (e) => e.stopPropagation());
        initVoicePanelDrag();
      }
      if (btnPrint) {
        btnPrint.addEventListener("click", () => openPrintModalBox("teacher"));
      }
      if (adminPrintBtn) adminPrintBtn.addEventListener("click", () => openPrintModalBox("admin"));
      if (printModalClose) printModalClose.addEventListener("click", closePrintModalBox);
      if (printModal) {
        printModal.addEventListener("click", (e) => {
          if (e.target === printModal) closePrintModalBox();
        });
      }
      document.querySelectorAll(".print-option-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const mode = btn.getAttribute("data-print-mode") || "";
          if (!mode) return;
          startPrintMode(mode);
        });
      });
      function onClearAllClick() {
        if (clearingAll) return;
        if(confirm("تفريغ الكل وحذف جميع البيانات المخزنة؟")) {
          clearingAll = true;
          resetAllData(true);
        }
      }
      const clearBtn = $("btnClearDraft");
      if (clearBtn) {
        clearBtn.removeEventListener("click", onClearAllClick);
        clearBtn.addEventListener("click", onClearAllClick);
      }
      initGridClipboardInteractions();

      modalCancel.addEventListener("click", ()=>{ confirmModal.classList.remove("visible"); pendingSubmit=null; });
      modalConfirm.addEventListener("click", ()=>{ if(pendingSubmit) pendingSubmit(); confirmModal.classList.remove("visible"); pendingSubmit=null; });
      confirmModal.addEventListener("click", e=>{ if(e.target===confirmModal){ confirmModal.classList.remove("visible"); pendingSubmit=null; } });
      const globalLoadingClose = $("globalLoadingClose");
      if (globalLoadingClose) globalLoadingClose.addEventListener("click", stopLoading);
      if (globalLoading) {
        globalLoading.addEventListener("click", e => {
          if (e.target === globalLoading && globalLoading.classList.contains("loading-error")) stopLoading();
        });
      }

      [maxRecallEl,maxUnderstandEl,maxHotsEl].forEach(el=>el.addEventListener("input",()=>{
        computeTotalMax();
        clampAllRowsToCurrentLimits(false);
        scheduleDraftSave();
      }));
      [teacherSel,gradeSel,sectionSel,subjectSel,examSel].forEach(s=>{
        s.addEventListener("change",()=>{
          scheduleDraftSave();
          updateAutoFillButtonState();
          refreshStudentRowsView({ skipSort: true });
          if(s===gradeSel||s===sectionSel) setStatus("warn","تم تغيير الصف/الشعبة","اضغط (تعبئة تلقائية) لتحديث قائمة الطالبات");
        });
      });

      loadLookups();
      updateAutoFillButtonState();
      refreshStudentRowsView({ skipSort: true });
      updateVoicePanelInfo();

      window.addEventListener("afterprint", clearPrintSheet);
      window.addEventListener("beforeunload", ()=>{
        pendingSubmit = null;
        stopLoading();
        stopVoiceRecognition(false);
        clearPrintSheet();
      });
    }

    /* ══════════════════════════════
       ADMIN DASHBOARD LOGIC
    ══════════════════════════════ */
    const adminDash = (function() {
      let allRows = [];
      let filteredRows = [];
      let assignmentRows = [];

      // Pass threshold: 50% of totalMax per record
      const PASS_THRESHOLD_PCT = 0.5;

      function numF(v, dec=2) {
        const n = Number(v);
        return Number.isFinite(n) ? n.toFixed(dec) : '—';
      }

      function esc(s) {
        return String(s||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
      }

      function resultChip(text, cls = '') {
        return `<span class="result-chip ${cls}">${esc(text || '—')}</span>`;
      }

      // تلوين الكارد حسب النسبة المئوية
      function colorCard(cardEl, valEl, pct) {
        cardEl.classList.remove('ok-card','warn-card','bad-card');
        valEl.style.color = '';
        if (pct === null) return;
        if (pct >= 80) {
          cardEl.classList.add('ok-card');
        } else if (pct >= 50) {
          cardEl.classList.add('warn-card');
        } else {
          cardEl.classList.add('bad-card');
        }
      }

      function computeStats(rows) {
        const set = (id, v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
        const n = rows.length;

        // إعادة تعيين الكاردات
        ['avg-recall','avg-understand','avg-hots','avg-total'].forEach(k => {
          const card = document.getElementById('sc-'+k+'-card');
          if(card) card.classList.remove('ok-card','warn-card','bad-card');
        });

        if (n === 0) {
          [
            'sc-count','sc-avg-total','sc-pass','sc-fail',
            'sc-avg-recall','sc-avg-understand','sc-avg-hots',
            'sc-no-weak','sc-weak-recall','sc-weak-understand','sc-weak-hots',
            'sc-weak-one','sc-weak-two','sc-weak-all'
          ].forEach(id => set(id,'—'));
          ['sc-no-weak-pct','sc-weak-recall-pct','sc-weak-understand-pct','sc-weak-hots-pct'].forEach(id => set(id,'—% من الإجمالي'));
          ['sc-avg-recall-sub','sc-avg-understand-sub','sc-avg-hots-sub'].forEach(id => set(id,'—'));
          ['sc-weak-one-sub','sc-weak-two-sub','sc-weak-all-sub'].forEach(id => set(id,'—% من الإجمالي'));
          return;
        }

        let sumRecallPct=0, sumUnderstandPct=0, sumHotsPct=0;
        let recallPctCount=0, understandPctCount=0, hotsPctCount=0;
        let sumTotalPct=0, totalPctCount=0;
        let pass=0, fail=0;
        let noWeak=0, weakRecall=0, weakUnderstand=0, weakHots=0;
        let weakOne=0, weakTwo=0, weakAll=0;

        for (const r of rows) {
          const recall = Number(r.recall)||0;
          const understand = Number(r.understand)||0;
          const hots = Number(r.hots)||0;
          const total = Number(r.total)||0;
          const maxRecall = Number(r.maxRecall)||0;
          const maxUnderstand = Number(r.maxUnderstand)||0;
          const maxHots = Number(r.maxHots)||0;
          const totalMax = Number(r.totalMax)||(maxRecall+maxUnderstand+maxHots);

          if (maxRecall > 0) {
            sumRecallPct += (recall / maxRecall) * 100;
            recallPctCount += 1;
          }
          if (maxUnderstand > 0) {
            sumUnderstandPct += (understand / maxUnderstand) * 100;
            understandPctCount += 1;
          }
          if (maxHots > 0) {
            sumHotsPct += (hots / maxHots) * 100;
            hotsPctCount += 1;
          }

          if (totalMax > 0) {
            sumTotalPct += (total / totalMax) * 100;
            totalPctCount += 1;
          }

          const threshold = totalMax > 0 ? totalMax * PASS_THRESHOLD_PCT : Infinity;
          if (total >= threshold) pass++; else fail++;

          const weakSkills = getWeakSkills(recall, understand, hots, maxRecall, maxUnderstand, maxHots) || [];
          if (weakSkills.length === 0) {
            noWeak += 1;
          } else {
            if (weakSkills.includes("المعرفة والتذكر")) weakRecall += 1;
            if (weakSkills.includes("الفهم والتحليل")) weakUnderstand += 1;
            if (weakSkills.includes("المهارات العليا")) weakHots += 1;
          }
          if (weakSkills.length === 1) weakOne += 1;
          else if (weakSkills.length === 2) weakTwo += 1;
          else if (weakSkills.length === 3) weakAll += 1;
        }

        const avgRecallPct = recallPctCount > 0 ? (sumRecallPct / recallPctCount) : 0;
        const avgUnderstandPct = understandPctCount > 0 ? (sumUnderstandPct / understandPctCount) : 0;
        const avgHotsPct = hotsPctCount > 0 ? (sumHotsPct / hotsPctCount) : 0;
        const avgTotalPct = totalPctCount > 0 ? (sumTotalPct / totalPctCount) : 0;

        // النسب المئوية لتحديد اللون
        const pctR   = recallPctCount > 0 ? avgRecallPct : null;
        const pctU   = understandPctCount > 0 ? avgUnderstandPct : null;
        const pctH   = hotsPctCount > 0 ? avgHotsPct : null;
        const pctTot = totalPctCount > 0 ? avgTotalPct : null;

        set('sc-count', n);
        set('sc-avg-total', numF(avgTotalPct,1));
        colorCard(document.getElementById('sc-avg-total-card'), document.getElementById('sc-avg-total'), pctTot);

        set('sc-avg-recall',     numF(avgRecallPct));
        set('sc-avg-recall-sub', `من 100 | ${recallPctCount} طالبة`);
        colorCard(document.getElementById('sc-avg-recall-card'), document.getElementById('sc-avg-recall'), pctR);

        set('sc-avg-understand',   numF(avgUnderstandPct));
        set('sc-avg-understand-sub', `من 100 | ${understandPctCount} طالبة`);
        colorCard(document.getElementById('sc-avg-understand-card'), document.getElementById('sc-avg-understand'), pctU);

        set('sc-avg-hots',   numF(avgHotsPct));
        set('sc-avg-hots-sub', `من 100 | ${hotsPctCount} طالبة`);
        colorCard(document.getElementById('sc-avg-hots-card'), document.getElementById('sc-avg-hots'), pctH);

        set('sc-pass', pass);
        set('sc-fail', fail);

        set('sc-no-weak', noWeak);
        set('sc-weak-recall', weakRecall);
        set('sc-weak-understand', weakUnderstand);
        set('sc-weak-hots', weakHots);
        set('sc-no-weak-pct', numF(noWeak/n*100,1) + '% من الإجمالي');
        set('sc-weak-recall-pct', numF(weakRecall/n*100,1) + '% من الإجمالي');
        set('sc-weak-understand-pct', numF(weakUnderstand/n*100,1) + '% من الإجمالي');
        set('sc-weak-hots-pct', numF(weakHots/n*100,1) + '% من الإجمالي');

        set('sc-weak-one', weakOne);
        set('sc-weak-two', weakTwo);
        set('sc-weak-all', weakAll);
        set('sc-weak-one-sub', numF(weakOne/n*100,1) + '% من الإجمالي');
        set('sc-weak-two-sub', numF(weakTwo/n*100,1) + '% من الإجمالي');
        set('sc-weak-all-sub', numF(weakAll/n*100,1) + '% من الإجمالي');
      }

      // لون الخلية حسب نسبة الدرجة من الحد الأقصى
      function cellColor(val, maxVal) {
        if (!maxVal || maxVal <= 0) return '';
        const pct = (val / maxVal) * 100;
        if (pct < 50)  return 'color:#f87171;font-weight:700;';   // أحمر - ضعيف
        if (pct < 80)  return 'color:#fbbf24;font-weight:700;';   // برتقالي - جيد
        return 'color:#4ade80;font-weight:700;';                   // أخضر - ممتاز
      }

      function renderTable(rows) {
        const tbody = document.getElementById('adminTbody');
        const chip = document.getElementById('admin-count-chip');
        if (chip) chip.textContent = rows.length + ' سجل';
        if (!rows.length) {
          tbody.innerHTML = '<tr class="loading-row"><td colspan="13">لا توجد نتائج مطابقة للفلاتر</td></tr>';
          return;
        }
        const frag = document.createDocumentFragment();
        rows.forEach((r, i) => {
          const tr = document.createElement('tr');
          const rowId = makeAdminPrintRowId(r);
          tr.dataset.rowId = rowId;
          if (selectedAdminRowId && selectedAdminRowId === rowId) {
            tr.classList.add('admin-row-selected');
          }
          const mr = Number(r.maxRecall)||0;
          const mu = Number(r.maxUnderstand)||0;
          const mh = Number(r.maxHots)||0;
          const mt = Number(r.totalMax)||(mr+mu+mh);
          const rv = r.recall === '' || r.recall === null || r.recall === undefined ? 0 : Number(r.recall);
          const uv = r.understand === '' || r.understand === null || r.understand === undefined ? 0 : Number(r.understand);
          const hv = r.hots === '' || r.hots === null || r.hots === undefined ? 0 : Number(r.hots);
          const tv = r.total === '' || r.total === null || r.total === undefined ? 0 : Number(r.total);
          const estimate = computeEstimate(tv, mt);
          const skillScale = computeSkillScale(rv, uv, hv, mr, mu, mh);

          const rcStyle  = cellColor(rv, mr);
          const ucStyle  = cellColor(uv, mu);
          const hcStyle  = cellColor(hv, mh);
          const totStyle = cellColor(tv, mt);

          tr.innerHTML = `
            <td class="mono" style="color:var(--muted);font-size:11px;">${i+1}</td>
            <td style="font-weight:600;min-width:180px;">${esc(r.studentName||r.name||'—')}</td>
            <td style="min-width:120px;color:var(--muted);font-size:12px;">${esc(r.teacherName||'—')}</td>
            <td style="white-space:nowrap;font-size:12px;">${esc(r.grade||'—')} / ${esc(r.section||'—')}</td>
            <td style="font-size:12px;">${esc(r.subject||'—')}</td>
            <td style="color:var(--muted);font-size:12px;">${esc(r.exam||'—')}</td>
            <td class="mono" style="text-align:center;${rcStyle}">${isNaN(rv)?'—':rv}</td>
            <td class="mono" style="text-align:center;${ucStyle}">${isNaN(uv)?'—':uv}</td>
            <td class="mono" style="text-align:center;${hcStyle}">${isNaN(hv)?'—':hv}</td>
            <td class="mono" style="text-align:center;${totStyle}">${isNaN(tv)?'—':tv}</td>
            <td>${resultChip(estimate.txt, estimate.cls)}</td>
            <td>${resultChip(formatSkillScale(skillScale), skillScale.cls)}</td>
            <td style="color:var(--muted);font-size:12px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(r.plan||'—')}</td>
          `;
          tr.addEventListener('click', () => {
            selectedAdminRowId = rowId;
            const allTrs = tbody.querySelectorAll('tr');
            allTrs.forEach((rowEl) => rowEl.classList.remove('admin-row-selected'));
            tr.classList.add('admin-row-selected');
          });
          frag.appendChild(tr);
        });
        tbody.innerHTML = '';
        tbody.appendChild(frag);
        const footer = document.getElementById('admin-footer-info');
        if (footer) footer.textContent = `إجمالي الظاهر: ${rows.length} من ${allRows.length} سجل`;
      }

      function computeLevelFromRow(r) {
        const recall=Number(r.recall)||0, understand=Number(r.understand)||0, hots=Number(r.hots)||0;
        const mr=Number(r.maxRecall)||0, mu=Number(r.maxUnderstand)||0, mh=Number(r.maxHots)||0;
        return computeLevel(recall, understand, hots, mr, mu, mh).txt;
      }

      function getAdminFilterValues() {
        return {
          teacher: (document.getElementById('af-teacher')?.value||'').trim(),
          grade:   (document.getElementById('af-grade')?.value||'').trim(),
          section: (document.getElementById('af-section')?.value||'').trim(),
          subject: (document.getElementById('af-subject')?.value||'').trim(),
          exam:    (document.getElementById('af-exam')?.value||'').trim(),
          level:   (document.getElementById('af-level')?.value||'').trim(),
          search:  (document.getElementById('adminSearch')?.value||'').trim().toLowerCase()
        };
      }

      function uniqSorted(arr) {
        return [...new Set(arr.filter(Boolean))].sort();
      }

      function refreshAdminFilterOptions(filters) {
        const f = filters || getAdminFilterValues();
        const base = assignmentRows.length
          ? assignmentRows
          : allRows.map((r) => ({
              teacherName: r.teacherName,
              grade: r.grade,
              section: r.section,
              subject: r.subject
            }));

        const by = {
          teacher: base.filter((a) => (!f.grade || a.grade === f.grade) && (!f.section || a.section === f.section) && (!f.subject || a.subject === f.subject)),
          grade: base.filter((a) => (!f.teacher || a.teacherName === f.teacher) && (!f.section || a.section === f.section) && (!f.subject || a.subject === f.subject)),
          section: base.filter((a) => (!f.teacher || a.teacherName === f.teacher) && (!f.grade || a.grade === f.grade) && (!f.subject || a.subject === f.subject)),
          subject: base.filter((a) => (!f.teacher || a.teacherName === f.teacher) && (!f.grade || a.grade === f.grade) && (!f.section || a.section === f.section))
        };

        const options = {
          teacher: uniqSorted(by.teacher.map((a) => a.teacherName)),
          grade: uniqSorted(by.grade.map((a) => a.grade)),
          section: uniqSorted(by.section.map((a) => a.section)),
          subject: uniqSorted(by.subject.map((a) => a.subject)),
          exam: uniqSorted(allRows.map((r) => r.exam))
        };

        function populate(id, arr, selected) {
          const sel = document.getElementById(id);
          if (!sel) return;
          sel.innerHTML = '<option value="">— الكل —</option>';
          arr.forEach((v) => {
            const o = document.createElement('option');
            o.value = v;
            o.textContent = v;
            sel.appendChild(o);
          });
          if (selected && arr.includes(selected)) sel.value = selected;
        }

        populate('af-teacher', options.teacher, f.teacher);
        populate('af-grade', options.grade, f.grade);
        populate('af-section', options.section, f.section);
        populate('af-subject', options.subject, f.subject);
        populate('af-exam', options.exam, f.exam);
      }

      function applyFilters() {
        const { teacher, grade, section, subject, exam, level, search } = getAdminFilterValues();
        refreshAdminFilterOptions({ teacher, grade, section, subject, exam, level, search });

        filteredRows = allRows.filter(r => {
          const computedLevel = computeLevelFromRow(r);
          const rowLevel = computedLevel !== '—' ? computedLevel : (r.level || '—');
          if (teacher && r.teacherName !== teacher) return false;
          if (grade   && r.grade !== grade) return false;
          if (section && r.section !== section) return false;
          if (subject && r.subject !== subject) return false;
          if (exam    && r.exam !== exam) return false;
          if (level   && rowLevel !== level) return false;
          if (search) {
            const name = (r.studentName||r.name||'').toLowerCase();
            if (!name.includes(search)) return false;
          }
          return true;
        });
        if (selectedAdminRowId && !filteredRows.some((r) => makeAdminPrintRowId(r) === selectedAdminRowId)) {
          selectedAdminRowId = filteredRows.length ? makeAdminPrintRowId(filteredRows[0]) : "";
        }

        computeStats(filteredRows);
        renderTable(filteredRows);
      }

      function getPrintSnapshot() {
        const { teacher, grade, section, subject, exam, level, search } = getAdminFilterValues();
        const baseRows = allRows.filter((r) => {
          if (teacher && r.teacherName !== teacher) return false;
          if (grade && r.grade !== grade) return false;
          if (section && r.section !== section) return false;
          if (subject && r.subject !== subject) return false;
          if (exam && r.exam !== exam) return false;
          return true;
        });
        return {
          baseRows,
          filteredRows: [...filteredRows],
          selectedRowId: selectedAdminRowId,
          filters: { teacher, grade, section, subject, exam, level, search }
        };
      }

      async function apiGet(params) {
        const token = sessionStorage.getItem("school_session_token") || "";
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        if (params.action === 'lookups') {
          const res = await fetch(withApiBase('/api/v1/lookups'), { method: 'GET', headers });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data?.error || ('فشل الاتصال HTTP ' + res.status));
          return data;
        }
        if (params.action === 'getData') {
          const res = await fetch(withApiBase('/api/v1/submissions'), { method: 'GET', headers });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data?.error || ('فشل الاتصال HTTP ' + res.status));
          return data;
        }
        if (params.action === 'adminAssignments') {
          const res = await fetch(withApiBase('/api/v1/admin/assignments'), { method: 'GET', headers });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data?.error || ('فشل الاتصال HTTP ' + res.status));
          return data;
        }
        throw new Error('action غير مدعوم');
      }

      async function loadData() {
        const tbody = document.getElementById('adminTbody');
        tbody.innerHTML = '<tr class="loading-row"><td colspan="13">جاري تحميل البيانات... <span class="spinner"></span></td></tr>';
        startLoading("جارٍ تحميل البيانات...");

        // ── Step 1: load assignments for dynamic dependent filters ──
        try {
          const asg = await apiGet({ action: 'adminAssignments' });
          assignmentRows = (asg.assignments || []).map((a) => ({
            teacherName: a.teacherName || '',
            grade: a.grade || '',
            section: a.section || '',
            subject: a.subject || ''
          }));
        } catch(e) { console.warn('فشل تحميل القوائم:', e.message); }

        // ── Step 2: load master data ──
        try {
          const j = await apiGet({ action: 'getData' });
          if (!j.ok) throw new Error(j.error || 'فشل جلب البيانات');

          // الأعمدة من الماستر (حسب ترتيب appendBatchToMaster_):
          // 0:وقت 1:batchId 2:teacherName 3:grade 4:section 5:subject 6:exam
          // 7:maxRecall 8:maxUnderstand 9:maxHots 10:totalMax
          // 11:studentName 12:recall 13:understand 14:hots 15:total 16:plan
          allRows = (j.rows || []).map(r => ({
            timestamp:    r[0]  || '',
            batchId:      r[1]  || '',
            teacherName:  r[2]  || '',
            grade:        r[3]  || '',
            section:      r[4]  || '',
            subject:      r[5]  || '',
            exam:         r[6]  || '',
            maxRecall:    Number(r[7]  || 0),
            maxUnderstand:Number(r[8]  || 0),
            maxHots:      Number(r[9]  || 0),
            totalMax:     Number(r[10] || 0),
            studentName:  r[11] || '',
            recall:       r[12] ?? '',
            understand:   r[13] ?? '',
            hots:         r[14] ?? '',
            total:        r[15] ?? '',
            plan:         r[16] || ''
          }));

          refreshAdminFilterOptions(getAdminFilterValues());
          applyFilters();
          succeed("تم تحميل البيانات بنجاح");

          const footer = document.getElementById('admin-footer-batch');
          if (footer) footer.textContent = 'آخر تحديث: ' + new Date().toLocaleTimeString('ar-SA');
        } catch(e) {
          tbody.innerHTML = `<tr class="loading-row"><td colspan="13" style="color:var(--bad);">
            ${iconMarkup("triangle-alert")} ${esc(e.message)}<br/>
            <span style="font-size:11px;opacity:0.7;">تعذر تحميل البيانات من الخادم</span>
          </td></tr>`;
          renderLucideIcons();
          fail("تعذر تحميل البيانات");
        }
      }
      function init() {
        // Filter change listeners
        ['af-teacher','af-grade','af-section','af-subject','af-exam','af-level'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.addEventListener('change', applyFilters);
        });

        // Search
        const searchEl = document.getElementById('adminSearch');
        if (searchEl) {
          let searchTimer;
          searchEl.addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(applyFilters, 200);
          });
        }

        // Refresh
        const refreshBtn = document.getElementById('adminRefresh');
        if (refreshBtn) refreshBtn.addEventListener('click', loadData);

        // Clear filters
        const clearBtn = document.getElementById('adminClearFilters');
        if (clearBtn) clearBtn.addEventListener('click', () => {
          ['af-teacher','af-grade','af-section','af-subject','af-exam','af-level'].forEach(id => {
            const el = document.getElementById(id); if(el) el.value = '';
          });
          const s = document.getElementById('adminSearch'); if(s) s.value = '';
          applyFilters();
        });
      }

      return { init, loadData, getPrintSnapshot };
    })();

    /* ══════════════════════════════
       SUPER ADMIN DASHBOARD LOGIC
    ══════════════════════════════ */
    window.superDash = (function() {
      const superScreen = document.getElementById('superScreen');
      if (!superScreen) {
        return { init() {}, loadData() {} };
      }

      let tenants = [];
      let users = [];
      let teachers = [];
      let students = [];
      let initialized = false;
      const cleanInput = (value) => String(value || '').trim();

      function tokenHeaders(extra = {}) {
        const token = sessionStorage.getItem('school_session_token') || '';
        const headers = { ...extra };
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
      }

      async function api(path, options = {}) {
        const res = await fetch(withApiBase(path), {
          method: options.method || 'GET',
          headers: tokenHeaders(options.headers || {}),
          body: options.body
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'فشل الطلب');
        return data;
      }

      async function verifyCurrentUserPassword(password) {
        const username = cleanInput(sessionStorage.getItem('school_session_user') || '');
        const secret = cleanInput(password || '');
        if (!username || !secret) return false;
        const res = await fetch(withApiBase('/api/v1/auth/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password: secret })
        });
        const data = await res.json().catch(() => ({}));
        return Boolean(res.ok && data?.ok);
      }

      function setStat(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = String(value ?? '—');
      }

      function renderTenantsTable() {
        const tbody = document.getElementById('superTenantsTbody');
        if (!tbody) return;
        if (!tenants.length) {
          tbody.innerHTML = '<tr><td colspan="5" class="loading-row">لا توجد مدارس</td></tr>';
          return;
        }
        tbody.innerHTML = tenants
          .map(
            (tenant, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${esc(tenant.code)}</td>
              <td>${esc(tenant.name)}</td>
              <td>${esc(tenant.city || '-')}</td>
              <td>${tenant.active ? 'نشطة' : 'موقوفة'}</td>
            </tr>
          `
          )
          .join('');
      }

      function fillTenantSelect() {
        const select = document.getElementById('superImportTenant');
        if (!select) return;
        const prev = select.value;
        select.innerHTML = '<option value="">— تلقائي من عمود المدرسة —</option>';
        tenants.forEach((tenant) => {
          const option = document.createElement('option');
          option.value = tenant.id;
          option.textContent = `${tenant.code} - ${tenant.name}`;
          select.appendChild(option);
        });
        if (prev && tenants.some((tenant) => tenant.id === prev)) select.value = prev;
      }

      function renderUsersTable() {
        const tbody = document.getElementById('superUsersTbody');
        if (!tbody) return;
        const rows = users;
        if (!rows.length) {
          tbody.innerHTML = '<tr><td colspan="8" class="loading-row">لا توجد حسابات</td></tr>';
          return;
        }
        tbody.innerHTML = rows
          .map(
            (user, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${esc(user.username)}</td>
              <td>${esc(user.passwordPlain || '-')}</td>
              <td>${esc(user.displayName || '-')}</td>
              <td>${esc(user.role)}</td>
              <td>${user.active ? 'مفعل' : 'موقوف'}</td>
              <td>${esc((tenants.find((tenant) => tenant.id === user.tenantId) || {}).code || '-')}</td>
              <td>
                <button class="info super-user-edit-btn" data-user-id="${esc(user.id)}">تعديل الدخول</button>
              </td>
            </tr>
          `
          )
          .join('');

        tbody.querySelectorAll('.super-user-edit-btn').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const userId = btn.getAttribute('data-user-id') || '';
            const user = users.find((item) => item.id === userId);
            if (!user) return;
            const promptedUsername = prompt('اسم مستخدم جديد', user.username);
            if (promptedUsername === null) return;
            const nextUsername = promptedUsername.trim() || user.username;
            const nextPassword = prompt('كلمة مرور جديدة (اتركها فارغة بدون تغيير)', '') || '';
            try {
              startLoading('جارٍ تحديث بيانات الدخول...');
              const payload = { username: nextUsername.toLowerCase() };
              if (nextPassword.trim()) payload.password = nextPassword.trim();
              await api(`/api/v1/super/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
              await loadData();
              succeed('تم تحديث بيانات الدخول');
            } catch (error) {
              fail(error.message || 'تعذر تحديث بيانات الدخول');
            }
          });
        });
      }

      function renderTeachersTable() {
        const tbody = document.getElementById('superTeachersTbody');
        if (!tbody) return;
        if (!teachers.length) {
          tbody.innerHTML = '<tr><td colspan="6" class="loading-row">لا توجد معلمات</td></tr>';
          return;
        }
        tbody.innerHTML = teachers
          .map(
            (teacher, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${esc(teacher.employeeNo || '-')}</td>
              <td>${esc(teacher.displayName || '-')}</td>
              <td>${esc(teacher.username || '-')}</td>
              <td>${esc(teacher.schoolName || '-')}</td>
              <td><button class="danger super-teacher-del-btn" data-user-id="${esc(teacher.id)}">حذف</button></td>
            </tr>
          `
          )
          .join('');

        tbody.querySelectorAll('.super-teacher-del-btn').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const userId = btn.getAttribute('data-user-id') || '';
            if (!userId) return;
            if (!confirm('هل تريد حذف/تعطيل هذه المعلمة؟')) return;
            try {
              startLoading('جارٍ حذف المعلمة...');
              await api(`/api/v1/super/teachers/${userId}`, { method: 'DELETE' });
              await loadData();
              succeed('تم حذف المعلمة');
            } catch (error) {
              fail(error.message || 'تعذر حذف المعلمة');
            }
          });
        });
      }

      function renderStudentsTable() {
        const tbody = document.getElementById('superStudentsTbody');
        if (!tbody) return;
        if (!students.length) {
          tbody.innerHTML = '<tr><td colspan="7" class="loading-row">لا توجد طالبات</td></tr>';
          return;
        }
        tbody.innerHTML = students
          .map(
            (student, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${esc(student.studentNo || '-')}</td>
              <td>${esc(student.studentName || '-')}</td>
              <td>${esc(student.grade || '-')}</td>
              <td>${esc(student.section || '-')}</td>
              <td>${esc(student.schoolName || '-')}</td>
              <td><button class="danger super-student-del-btn" data-student-id="${esc(String(student.id))}">حذف</button></td>
            </tr>
          `
          )
          .join('');

        tbody.querySelectorAll('.super-student-del-btn').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const studentId = btn.getAttribute('data-student-id') || '';
            if (!studentId) return;
            if (!confirm('هل تريد حذف/تعطيل هذه الطالبة؟')) return;
            try {
              startLoading('جارٍ حذف الطالبة...');
              await api(`/api/v1/super/students/${studentId}`, { method: 'DELETE' });
              await loadData();
              succeed('تم حذف الطالبة');
            } catch (error) {
              fail(error.message || 'تعذر حذف الطالبة');
            }
          });
        });
      }

      function showImportResult(message, type = 'ok') {
        const box = document.getElementById('superImportResult');
        if (!box) return;
        box.textContent = message || '';
        box.className = `status-bar show ${type}`;
        box.style.display = message ? 'flex' : 'none';
      }

      let xlsxLibPromise = null;
      function ensureXlsxLib() {
        if (window.XLSX) return Promise.resolve(window.XLSX);
        if (xlsxLibPromise) return xlsxLibPromise;

        xlsxLibPromise = new Promise((resolve, reject) => {
          const existing = document.querySelector('script[data-xlsx-lib="1"]');
          if (existing) {
            existing.addEventListener('load', () => resolve(window.XLSX));
            existing.addEventListener('error', () => reject(new Error('تعذر تحميل مكتبة Excel')));
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
          script.async = true;
          script.dataset.xlsxLib = '1';
          script.onload = () => {
            if (window.XLSX) resolve(window.XLSX);
            else reject(new Error('تعذر تهيئة مكتبة Excel'));
          };
          script.onerror = () => reject(new Error('تعذر تحميل مكتبة Excel'));
          document.head.appendChild(script);
        });

        return xlsxLibPromise;
      }

      async function parseXlsxFile(file) {
        const XLSX = await ensureXlsxLib();
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = (workbook.SheetNames || [])[0];
        if (!firstSheetName) return [];
        const sheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
        return rows.map((row) => {
          const out = {};
          Object.keys(row || {}).forEach((key) => {
            const normalizedKey = String(key || '').replace(/^\uFEFF/, '').trim();
            if (!normalizedKey) return;
            out[normalizedKey] = String(row[key] ?? '').trim();
          });
          return out;
        });
      }

      async function importXlsxFile({ inputId, endpoint, operationText, successText }) {
        const fileInput = document.getElementById(inputId);
        const file = fileInput?.files?.[0];

        if (!file) {
          fail('يرجى اختيار ملف XLSX أولاً');
          return;
        }

        if (!/\.xlsx$/i.test(file.name || '')) {
          fail('الرجاء اختيار ملف بصيغة XLSX فقط');
          return;
        }

        try {
          startLoading(operationText);
          const rows = await parseXlsxFile(file);
          if (!rows.length) throw new Error('الملف فارغ أو لا يحتوي صفوف بيانات');

          const payload = { rows };

          const response = await api(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          const report = response?.report || {};
          const errorsCount = Array.isArray(report.errors) ? report.errors.length : 0;
          const summary = [
            `تمت العملية: ${successText}`,
            `إجمالي الصفوف: ${report.total ?? rows.length}`,
            report.inserted !== undefined ? `إضافة: ${report.inserted}` : '',
            report.updated !== undefined ? `تحديث: ${report.updated}` : '',
            report.teachersCreated !== undefined ? `معلمات جديدات: ${report.teachersCreated}` : '',
            report.teachersUpdated !== undefined ? `معلمات محدثات: ${report.teachersUpdated}` : '',
            report.assignmentsInserted !== undefined ? `إسنادات مضافة: ${report.assignmentsInserted}` : '',
            report.assignmentsSkipped !== undefined ? `إسنادات متكررة: ${report.assignmentsSkipped}` : '',
            errorsCount ? `أخطاء: ${errorsCount}` : 'أخطاء: 0'
          ]
            .filter(Boolean)
            .join(' | ');

          showImportResult(summary, errorsCount ? 'warn' : 'ok');
          fileInput.value = '';
          await loadData();
          succeed(successText);
        } catch (error) {
          showImportResult(`فشل الاستيراد: ${error.message || 'خطأ غير معروف'}`, 'bad');
          fail(error.message || 'تعذر استيراد الملف');
        }
      }

      async function loadData() {
        try {
          startLoading('جارٍ تحميل بيانات المنصة...');
          const [overviewRes, tenantsRes, usersRes, teachersRes, studentsRes] = await Promise.all([
            api('/api/v1/super/overview'),
            api('/api/v1/super/tenants?page=1&pageSize=200'),
            api('/api/v1/super/users'),
            api('/api/v1/super/teachers'),
            api('/api/v1/super/students')
          ]);

          const stats = overviewRes?.stats || {};
          setStat('superStatTenants', stats.tenants ?? 0);
          setStat('superStatUsers', stats.users ?? 0);
          setStat('superStatStudents', stats.students ?? 0);
          setStat('superStatSubmissions', stats.submissions ?? 0);

          tenants = tenantsRes?.items || [];
          users = usersRes?.users || [];
          teachers = teachersRes?.teachers || [];
          students = studentsRes?.students || [];
          renderTenantsTable();
          fillTenantSelect();
          renderUsersTable();
          renderTeachersTable();
          renderStudentsTable();

          succeed('تم تحديث بيانات المنصة');
        } catch (error) {
          fail(error.message || 'تعذر تحميل بيانات المنصة');
        }
      }

      function init() {
        if (initialized) return;
        initialized = true;

        const refreshBtn = document.getElementById('superRefreshBtn');
        if (refreshBtn) refreshBtn.addEventListener('click', loadData);
        const dedupeSubmissionsBtn = document.getElementById('superDedupeSubmissionsBtn');
        if (dedupeSubmissionsBtn) {
          dedupeSubmissionsBtn.addEventListener('click', async () => {
            const yes = confirm('هل تريد حذف جميع سجلات العلامات المكررة (نفس المعلمة/الصف/الشعبة/المادة/الاختبار/اسم الطالبة)؟ سيتم الإبقاء على أحدث سجل فقط.');
            if (!yes) return;
            const passwordInput = prompt('للتأكيد النهائي، أدخل كلمة مرور حسابك الحالي');
            if (passwordInput === null) return;
            const password = cleanInput(passwordInput);
            if (!password) {
              fail('لم يتم إدخال كلمة المرور. تم إلغاء العملية');
              return;
            }
            try {
              const isPasswordValid = await verifyCurrentUserPassword(password);
              if (!isPasswordValid) {
                fail('كلمة المرور غير صحيحة. تم إلغاء العملية');
                return;
              }
              startLoading('جارٍ تنظيف سجلات العلامات المكررة...');
              const response = await api('/api/v1/super/system/dedupe-submissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirm: true })
              });
              const report = response?.report || {};
              showImportResult(
                `تم تنظيف التكرار | قبل التنظيف: ${report.duplicatesBefore ?? 0} | المحذوف: ${report.deleted ?? 0} | المتبقي: ${report.totalAfter ?? 0}`,
                'ok'
              );
              await loadData();
            } catch (error) {
              fail(error.message || 'تعذر تنظيف سجلات العلامات المكررة');
            }
          });
        }
        const resetSchoolsBtn = document.getElementById('superResetSchoolsBtn');
        if (resetSchoolsBtn) {
          resetSchoolsBtn.addEventListener('click', async () => {
            const yes = confirm('هل فعلاً تريد مسح جميع بيانات المدارس؟ سيتم حذف المدارس والطالبات والمعلمات والنتائج نهائياً.');
            if (!yes) return;
            const passwordInput = prompt('للتأكيد النهائي، أدخل كلمة مرور حسابك الحالي');
            if (passwordInput === null) return;
            const password = cleanInput(passwordInput);
            if (!password) {
              fail('لم يتم إدخال كلمة المرور. تم إلغاء العملية');
              return;
            }
            try {
              const isPasswordValid = await verifyCurrentUserPassword(password);
              if (!isPasswordValid) {
                fail('كلمة المرور غير صحيحة. تم إلغاء العملية');
                return;
              }
              startLoading('جارٍ مسح جميع بيانات المدارس...');
              const response = await api('/api/v1/super/system/reset-schools', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirm: true })
              });
              const report = response?.report || {};
              showImportResult(
                `تم المسح بنجاح | مدارس: ${report.deletedTenants ?? 0} | طالبات: ${report.deletedStudents ?? 0} | معلمات: ${report.deletedTeachers ?? 0}`,
                'ok'
              );
              await loadData();
            } catch (error) {
              fail(error.message || 'تعذر مسح بيانات المدارس');
            }
          });
        }

        const createAdminBtn = document.getElementById('superCreateAdminBtn');
        if (createAdminBtn) {
          createAdminBtn.addEventListener('click', async () => {
            const username = cleanInput(document.getElementById('superAdminUserName')?.value).toLowerCase();
            const displayName = cleanInput(document.getElementById('superAdminDisplay')?.value);
            const password = cleanInput(document.getElementById('superAdminPassword')?.value);
            if (!username || !password) {
              fail('يرجى إدخال اسم المستخدم وكلمة المرور');
              return;
            }
            try {
              startLoading('جارٍ إنشاء حساب أدمن...');
              await api('/api/v1/super/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  role: 'super_admin',
                  username,
                  displayName: displayName || username,
                  password
                })
              });
              document.getElementById('superAdminUserName').value = '';
              document.getElementById('superAdminDisplay').value = '';
              document.getElementById('superAdminPassword').value = '';
              await loadData();
              succeed('تم إنشاء حساب الأدمن');
            } catch (error) {
              fail(error.message || 'تعذر إنشاء حساب الأدمن');
            }
          });
        }

        const importTeachersBtn = document.getElementById('superImportTeachersBtn');
        if (importTeachersBtn) {
          importTeachersBtn.addEventListener('click', () =>
            importXlsxFile({
              inputId: 'superTeachersCsvFile',
              endpoint: '/api/v1/super/import/teachers',
              operationText: 'جارٍ استيراد ملف المعلمات XLSX...',
              successText: 'تم استيراد ملف المعلمات بنجاح'
            })
          );
        }

        const importStudentsBtn = document.getElementById('superImportStudentsBtn');
        if (importStudentsBtn) {
          importStudentsBtn.addEventListener('click', () =>
            importXlsxFile({
              inputId: 'superStudentsCsvFile',
              endpoint: '/api/v1/super/import/students',
              operationText: 'جارٍ استيراد ملف الطالبات XLSX...',
              successText: 'تم استيراد ملف الطالبات بنجاح'
            })
          );
        }
      }

      return { init, loadData };
    })();

    /* ══════════════════════════════
       LOGIN LOGIC
    ══════════════════════════════ */
    
    (function() {
      const SESSION_KEY = 'school_session_v1';
      const SESSION_USER_KEY = 'school_session_user';
      const SESSION_TOKEN_KEY = 'school_session_token';
      const SESSION_USER_DISPLAY_KEY = 'school_session_user_display';
      const SESSION_SCHOOL_NAME_KEY = 'school_session_school_name';

      const loginScreen  = document.getElementById('loginScreen');
      const teacherApp   = document.getElementById('teacherApp');
      const adminScreen  = document.getElementById('adminScreen');
      const loginUserEl  = document.getElementById('loginUser');
      const loginPassEl  = document.getElementById('loginPass');
      const loginErrEl   = document.getElementById('loginErr');
      const loginErrMsg  = document.getElementById('loginErrMsg');
      const loginBtn     = document.getElementById('loginBtn');
      const loginInfoBtn = document.getElementById('loginInfoBtn');
      const contactInfoModal = document.getElementById('contactInfoModal');
      const contactInfoClose = document.getElementById('contactInfoClose');
      const teacherLogout = document.getElementById('teacherLogout');
      const adminLogout  = document.getElementById('adminLogout');
      const acctOpenBtn = document.getElementById('acctOpenBtn');
      const acctOpenBtnAdmin = document.getElementById('acctOpenBtnAdmin');
      const acctOpenBtnSuper = document.getElementById('acctOpenBtnSuper');
      const superScreen = document.getElementById('superScreen');
      const accountModal = document.getElementById('accountModal');
      const acctModalCancel = document.getElementById('acctModalCancel');
      const acctUserEl = document.getElementById('acctUser');
      const acctCurrentPassEl = document.getElementById('acctCurrentPass');
      const acctNewUserEl = document.getElementById('acctNewUser');
      const acctNewPassEl = document.getElementById('acctNewPass');
      const acctSaveBtn = document.getElementById('acctSaveBtn');
      const acctLogoutBtn = document.getElementById('acctLogoutBtn');
      const acctMsg = document.getElementById('acctMsg');
      const teacherWelcomeText = document.getElementById('teacherWelcomeText');
      const adminWelcomeText = document.getElementById('adminWelcomeText');
      const superWelcomeText = document.getElementById('superWelcomeText');

      function mapApiRoleToUiRole(apiRole) {
        if (apiRole === 'teacher') return 'teacher';
        if (apiRole === 'school_admin') return 'admin';
        if (apiRole === 'super_admin') return 'super';
        return '';
      }

      async function apiV1Login(username, password) {
        const body = { username, password };
        const res = await fetch(withApiBase('/api/v1/auth/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { ok: false, error: data?.error || 'فشل تسجيل الدخول' };
        return data;
      }

      function setLoginLoading(loading) {
        if (!loginBtn) return;
        loginBtn.classList.toggle('loading', loading);
        loginBtn.disabled = loading;
      }

      function showError(msg) {
        loginErrMsg.textContent = msg || 'اسم المستخدم أو كلمة المرور غير صحيحة';
        loginErrEl.classList.remove('show');
        void loginErrEl.offsetWidth; // reflow to replay animation
        loginErrEl.classList.add('show');
        loginPassEl.value = '';
        loginPassEl.focus();
      }

      function showAccountMsg(el, msg, type) {
        if (!el) return;
        el.textContent = msg || '';
        el.className = 'status-bar show' + (type ? ' ' + type : '');
        el.style.display = msg ? 'flex' : 'none';
      }

      function setAccountUsername(name) {
        if (acctUserEl) acctUserEl.value = name || '';
      }
      function setWelcomeText(displayName, schoolName, uiRole) {
        const safeName = displayName || 'المستخدم';
        if (teacherWelcomeText) {
          teacherWelcomeText.textContent = `أهلاً ${safeName}`;
        }
        if (adminWelcomeText) {
          adminWelcomeText.textContent = `أهلاً ${safeName}`;
        }
        if (superWelcomeText) {
          superWelcomeText.textContent = schoolName
            ? `أهلاً ${safeName} - إدارة ${schoolName}`
            : `أهلاً ${safeName}`;
        }
      }

      function openAccountModal() {
        if (!accountModal) return;
        accountModal.classList.add('visible');
        showAccountMsg(acctMsg, '', '');
        if (acctCurrentPassEl) acctCurrentPassEl.value = '';
        if (acctNewUserEl) acctNewUserEl.value = '';
        if (acctNewPassEl) acctNewPassEl.value = '';
      }

      function closeAccountModal() {
        if (!accountModal) return;
        accountModal.classList.remove('visible');
      }
      function openContactInfoModal() {
        if (!contactInfoModal) return;
        contactInfoModal.classList.add('visible');
      }
      function closeContactInfoModal() {
        if (!contactInfoModal) return;
        contactInfoModal.classList.remove('visible');
      }

      let adminInitialized = false;
      let superInitialized = false;
      function applySession(role) {
        loginScreen.classList.add('hidden');
        if (role === 'teacher') {
          teacherApp.style.display = 'block';
          adminScreen.classList.remove('visible');
          if (superScreen) superScreen.classList.remove('visible');
          if (typeof loadLookups === 'function') {
            loadLookups();
          }
        } else if (role === 'admin') {
          adminScreen.classList.add('visible');
          teacherApp.style.display = 'none';
          if (superScreen) superScreen.classList.remove('visible');
          if (!adminInitialized) {
            adminInitialized = true;
            adminDash.init();
            adminDash.loadData();
          }
        } else if (role === 'super') {
          teacherApp.style.display = 'none';
          adminScreen.classList.remove('visible');
          if (superScreen) superScreen.classList.add('visible');
          if (!superInitialized && window.superDash) {
            superInitialized = true;
            window.superDash.init();
          }
          if (window.superDash) window.superDash.loadData();
        }
      }

      async function doLogin() {
        const user = (loginUserEl.value || '').trim();
        const pass = (loginPassEl.value || '').trim();
        if (!user || !pass) { showError('يرجى إدخال اسم المستخدم وكلمة المرور'); return; }
        try {
          setLoginLoading(true);
          const res = await apiV1Login(user, pass);
          if (!res || !res.ok) {
            showError((res && res.error) || 'اسم المستخدم أو كلمة المرور غير صحيحة');
            return;
          }
          const roleFromApi = (res.user && res.user.role) ? res.user.role : '';
          const uiRole = mapApiRoleToUiRole(roleFromApi);
          if (!uiRole) {
            showError('نوع الحساب غير مدعوم');
            return;
          }
          try {
            sessionStorage.setItem(SESSION_KEY, uiRole);
            sessionStorage.setItem(SESSION_USER_KEY, (res.user && res.user.username) ? res.user.username : user);
            sessionStorage.setItem(SESSION_TOKEN_KEY, res.accessToken || '');
            sessionStorage.setItem(
              SESSION_USER_DISPLAY_KEY,
              (res.user && (res.user.displayName || res.user.username)) ? (res.user.displayName || res.user.username) : user
            );
            sessionStorage.setItem(
              SESSION_SCHOOL_NAME_KEY,
              (res.tenant && res.tenant.name) ? res.tenant.name : ''
            );
          } catch (_) {}
          setAccountUsername((res.user && res.user.username) ? res.user.username : user);
          setWelcomeText(
            (res.user && (res.user.displayName || res.user.username)) ? (res.user.displayName || res.user.username) : user,
            (res.tenant && res.tenant.name) ? res.tenant.name : '',
            uiRole
          );
          applySession(uiRole);
        } catch (err) {
          showError('تعذر تسجيل الدخول');
        } finally {
          setLoginLoading(false);
        }
      }

      async function doLogout() {
        try {
          const token = sessionStorage.getItem(SESSION_TOKEN_KEY) || '';
          if (token) {
            await fetch(withApiBase('/api/v1/auth/logout'), {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` }
            });
          }
        } catch (_) {}
        try {
          sessionStorage.removeItem(SESSION_KEY);
          sessionStorage.removeItem(SESSION_USER_KEY);
          sessionStorage.removeItem(SESSION_TOKEN_KEY);
          sessionStorage.removeItem(SESSION_USER_DISPLAY_KEY);
          sessionStorage.removeItem(SESSION_SCHOOL_NAME_KEY);
        } catch(_) {}
        loginScreen.classList.remove('hidden');
        adminScreen.classList.remove('visible');
        if (superScreen) superScreen.classList.remove('visible');
        teacherApp.style.display = 'none';
        loginUserEl.value = '';
        loginPassEl.value = '';
        loginErrEl.classList.remove('show');
        closeAccountModal();
        if (acctCurrentPassEl) acctCurrentPassEl.value = '';
        if (acctNewUserEl) acctNewUserEl.value = '';
        if (acctNewPassEl) acctNewPassEl.value = '';
        loginUserEl.focus();
      }

      async function updateAccount() {
        const curPass = acctCurrentPassEl?.value;
        const newUser = acctNewUserEl?.value;
        const newPass = acctNewPassEl?.value;

        if (!curPass) {
          showAccountMsg(acctMsg, 'يرجى إدخال اسم المستخدم وكلمة المرور الحالية', 'warn');
          return;
        }

        if (!newUser && !newPass) {
          showAccountMsg(acctMsg, 'أدخل اسم مستخدم جديد أو كلمة مرور جديدة', 'warn');
          return;
        }
        try {
          startLoading("جارٍ تحديث الحساب...");
          const res = await apiPost({
            action: 'updateAccount',
            currentPassword: curPass,
            newUsername: (newUser || '').trim(),
            newPassword: (newPass || '').trim()
          });
          const nextUser = (res?.user?.username) || sessionStorage.getItem(SESSION_USER_KEY) || '';
          const nextDisplay = (res?.user?.displayName) || sessionStorage.getItem(SESSION_USER_DISPLAY_KEY) || nextUser;
          setAccountUsername(nextUser);
          setWelcomeText(nextDisplay, sessionStorage.getItem(SESSION_SCHOOL_NAME_KEY) || '', sessionStorage.getItem(SESSION_KEY) || '');
          try {
            sessionStorage.setItem(SESSION_USER_KEY, nextUser);
            sessionStorage.setItem(SESSION_USER_DISPLAY_KEY, nextDisplay);
          } catch(_) {}
          if (acctCurrentPassEl) acctCurrentPassEl.value = '';
          if (acctNewUserEl) acctNewUserEl.value = '';
          if (acctNewPassEl) acctNewPassEl.value = '';
          showAccountMsg(acctMsg, 'تم تحديث بيانات الحساب بنجاح', 'ok');
          succeed("تم تحديث الحساب بنجاح");
        } catch (err) {
          showAccountMsg(acctMsg, 'تعذر تحديث بيانات الحساب', 'bad');
          fail("تعذر تحديث الحساب");
        }
      }

      // Check existing session
      try {
        const saved = sessionStorage.getItem(SESSION_KEY);
        const savedUser = sessionStorage.getItem(SESSION_USER_KEY);
        const savedDisplay = sessionStorage.getItem(SESSION_USER_DISPLAY_KEY);
        const savedSchool = sessionStorage.getItem(SESSION_SCHOOL_NAME_KEY);
        if (savedUser) setAccountUsername(savedUser);
        setWelcomeText(savedDisplay || savedUser, savedSchool, saved);
        if (saved === 'teacher' || saved === 'admin' || saved === 'super') {
          applySession(saved);
        }
      } catch(_) {}

      loginBtn.addEventListener('click', doLogin);
      loginPassEl.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
      loginUserEl.addEventListener('keydown', e => { if (e.key === 'Enter') loginPassEl.focus(); });
      if (adminLogout) adminLogout.addEventListener('click', doLogout);
      if (teacherLogout) teacherLogout.addEventListener('click', doLogout);
      if (acctLogoutBtn) acctLogoutBtn.addEventListener('click', doLogout);
      if (acctSaveBtn) acctSaveBtn.addEventListener('click', updateAccount);
      if (acctOpenBtn) acctOpenBtn.addEventListener('click', openAccountModal);
      if (acctOpenBtnAdmin) acctOpenBtnAdmin.addEventListener('click', openAccountModal);
      if (acctOpenBtnSuper) acctOpenBtnSuper.addEventListener('click', openAccountModal);
      if (acctModalCancel) acctModalCancel.addEventListener('click', closeAccountModal);
      if (accountModal) accountModal.addEventListener('click', e => { if (e.target === accountModal) closeAccountModal(); });
      if (loginInfoBtn) loginInfoBtn.addEventListener('click', openContactInfoModal);
      if (contactInfoClose) contactInfoClose.addEventListener('click', closeContactInfoModal);
      if (contactInfoModal) contactInfoModal.addEventListener('click', e => { if (e.target === contactInfoModal) closeContactInfoModal(); });

      // Auto-focus username field
      setTimeout(() => loginUserEl.focus(), 100);
    })();


    boot();




