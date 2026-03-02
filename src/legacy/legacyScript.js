    const DRAFT_KEY = "school_grades_draft_v7";

    const API_BASE_URL = String(
      (typeof API_BASE !== "undefined" && API_BASE) || window.__APP_API_BASE__ || "http://localhost:3000"
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
    let tableContext = { grade: "", section: "" };

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
    function computeLevel(r,u,h,mr,mu,mh) {
      if(mr<=0||mu<=0||mh<=0) return {txt:"—",cls:""};
      const pr=r/mr*100, pu=u/mu*100, ph=h/mh*100;
      if(pr<50||pu<50||ph<50) return {txt:"ضعيف",cls:"bad"};
      if(pr>=80&&pu>=80&&ph>=80) return {txt:"ممتاز",cls:"ok"};
      return {txt:"جيد",cls:"warn"};
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

    /* ── Build Row ── */
    function makeRow(data, index) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="row-num"><span class="row-index">${index||""}</span></td>
        <td class="name-cell">
          <input type="text" class="studentName" value="${esc(data.studentName||"")}" placeholder="اسم الطالبة" />
        </td>
        <td class="num-cell"><input type="number" class="recall" min="0" step="1" value="${esc(data.recall??"")}"/></td>
        <td class="num-cell"><input type="number" class="understand" min="0" step="1" value="${esc(data.understand??"")}"/></td>
        <td class="num-cell"><input type="number" class="hots" min="0" step="1" value="${esc(data.hots??"")}"/></td>
        <td class="total-cell"><input type="number" class="total" readonly value="${esc(data.total??0)}"/></td>
        <td class="plan-cell"><input type="text" class="planInput" value="${esc(data.plan||"")}" placeholder="خطة علاجية (1–30 حرف)" maxlength="30"/></td>
        <td><span class="chip level-chip">—</span></td>
        <td><button class="danger del-btn" style="padding:6px 10px;font-size:12px;">✕</button></td>
      `;

      const iName = tr.querySelector(".studentName");
      const iRecall = tr.querySelector(".recall");
      const iUnder = tr.querySelector(".understand");
      const iHots = tr.querySelector(".hots");
      const iTotal = tr.querySelector(".total");
      const iPlan  = tr.querySelector(".planInput");
      const chipLvl= tr.querySelector(".level-chip");
      const btnDel = tr.querySelector(".del-btn");

      function getRowIndex() {
        return [...tbody.querySelectorAll("tr")].indexOf(tr)+1;
      }

      function recompute() {
        const r=num(iRecall.value), u=num(iUnder.value), h=num(iHots.value);
        iTotal.value = r+u+h;
        const mr=num(maxRecallEl.value), mu=num(maxUnderstandEl.value), mh=num(maxHotsEl.value);
        const L=computeLevel(r,u,h,mr,mu,mh);
        chipLvl.textContent=L.txt; chipLvl.className="chip level-chip"+(L.cls?" "+L.cls:"");
        const bad = r>mr||u>mu||h>mh;
        tr.classList.toggle("invalid-row", bad);
        updateValidationChip();
      }

      function onFocus() {
        tr.classList.add("row-active");
        showSpotlight(iName.value, getRowIndex());
      }
      function onBlur() {
        tr.classList.remove("row-active");
        hideSpotlight();
      }

      iName.addEventListener("input", ()=>{ scheduleDraftSave(); recompute(); if(spotlight.classList.contains("visible")) showSpotlight(iName.value, getRowIndex()); });
      iRecall.addEventListener("input", ()=>{ recompute(); scheduleDraftSave(); });
      iUnder.addEventListener("input", ()=>{ recompute(); scheduleDraftSave(); });
      iHots.addEventListener("input", ()=>{ recompute(); scheduleDraftSave(); });
      iPlan.addEventListener("input", ()=>scheduleDraftSave());

      [iName, iRecall, iUnder, iHots, iPlan].forEach(inp => {
        inp.addEventListener("focus", onFocus);
        inp.addEventListener("blur", onBlur);
      });

      btnDel.addEventListener("click", ()=>{ tr.remove(); reindexRows(); updateValidationChip(); updateAutoFillButtonState(); scheduleDraftSave(); });

      recompute();
      return tr;
    }

    function reindexRows() {
      [...tbody.querySelectorAll("tr")].forEach((tr,i) => {
        const s = tr.querySelector(".row-index");
        if(s) s.textContent = i+1;
      });
    }

    function setRows(names) {
      tbody.innerHTML="";
      names.forEach((n,i) => tbody.appendChild(makeRow({studentName:n,recall:"",understand:"",hots:"",total:"",plan:""}, i+1)));
      tableContext = { grade: gradeSel.value.trim(), section: sectionSel.value.trim() };
      updateValidationChip();
      updateAutoFillButtonState();
      scheduleDraftSave();
    }

    function clearScoresOnly() {
      [...tbody.querySelectorAll("tr")].forEach(tr => {
        tr.querySelector(".recall").value="";
        tr.querySelector(".understand").value="";
        tr.querySelector(".hots").value="";
        tr.querySelector(".total").value="0";
        tr.querySelector(".planInput").value="";
        const c=tr.querySelector(".level-chip"); c.textContent="—"; c.className="chip level-chip";
        tr.classList.remove("invalid-row","row-active");
      });
      updateValidationChip();
      scheduleDraftSave();
    }

    function validateAllRows() {
      [...tbody.querySelectorAll("tr")].forEach(tr => tr.querySelector(".recall").dispatchEvent(new Event("input",{bubbles:true})));
    }

    function updateValidationChip() {
      const mr=num(maxRecallEl.value), mu=num(maxUnderstandEl.value), mh=num(maxHotsEl.value);
      const trs=[...tbody.querySelectorAll("tr")];
      let any=false, bad=0;
      for(const tr of trs) {
        const n=tr.querySelector(".studentName").value.trim();
        if(!n) continue; any=true;
        const r=num(tr.querySelector(".recall").value), u=num(tr.querySelector(".understand").value), h=num(tr.querySelector(".hots").value);
        if(r>mr||u>mu||h>mh) bad++;
      }
      if(!any) { validChip.textContent="التحقق: لا توجد بيانات"; validChip.className="chip"; return; }
      if(bad===0) { validChip.textContent="✓ جميع الدرجات ضمن الحدود"; validChip.className="chip ok"; }
      else        { validChip.textContent=`✕ يوجد ${bad} سطر خارج الحدود`; validChip.className="chip bad"; }
    }
    function hasTableRows() {
      return tbody && tbody.querySelectorAll("tr").length > 0;
    }
    function updateAutoFillButtonState() {
      const btn = $("btnAutoFill");
      if (!btn) return;
      btn.textContent = "⟳ تحديث الطالبات حسب الصف/الشعبة الحالية";
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
        setStatus("ok","تم تحميل القوائم بنجاح ✅");
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
        setStatus("ok",`تمت تعبئة ${list.length} طالبة ✅`);
        succeed("تم جلب البيانات بنجاح");
      } catch(e) {
        setStatus("bad","تعذر تعبئة الطالبات",e.message);
        fail("تعذر جلب البيانات");
      }
    }
    function checkIncomplete() {
      return [...tbody.querySelectorAll("tr")].filter(tr => {
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
      for(const tr of tbody.querySelectorAll("tr")) {
        const n=tr.querySelector(".studentName").value.trim(); if(!n) continue;
        let r=tr.querySelector(".recall").value.trim();
        let u=tr.querySelector(".understand").value.trim();
        let h=tr.querySelector(".hots").value.trim();
        const plan=(tr.querySelector(".planInput").value||"").trim();
        if(fillEmpty) { if(r==="")r="0"; if(u==="")u="0"; if(h==="")h="0"; }
        else { if(r===""||u===""||h==="") throw new Error(`يرجى تعبئة علامات الطالبة: ${n}`); }
        const rn=num(r),un=num(u),hn=num(h);
        if(rn>mr) throw new Error(`تجاوز حد التذكر: ${n}`);
        if(un>mu) throw new Error(`تجاوز حد الفهم: ${n}`);
        if(hn>mh) throw new Error(`تجاوز حد المهارات: ${n}`);
        const L=computeLevel(rn,un,hn,mr,mu,mh);
        if(!fillEmpty&&L.txt==="ضعيف"&&(plan.length<1||plan.length>30))
          throw new Error(`الطالبة "${n}" — ضعيف، يجب إدخال خطة علاجية (1–30 حرف)`);
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
        setStatus("ok",`تم الإرسال بنجاح ✅ (${j.inserted} سجل)`,`BatchID: ${j.batchId}`);
        clearDraft();
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
        rows:[...tbody.querySelectorAll("tr")].map(tr=>({
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
      tableContext = { grade: h.grade || "", section: h.section || "" };
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
      tableContext = { grade: "", section: "" };
      updateValidationChip();
      updateAutoFillButtonState();
      lastBatch.textContent = "—";
      setStatus("warn","تم تفريغ الكل");
      if (shouldReload) {
        setTimeout(() => window.location.reload(), 150);
      }
    }

    /* ── Boot ── */
    function boot() {
      if (window.__legacyBooted) return;
      window.__legacyBooted = true;
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
        scheduleDraftSave();
      }));
      [teacherSel,gradeSel,sectionSel,subjectSel,examSel].forEach(s=>{
        s.addEventListener("change",()=>{
          scheduleDraftSave();
          updateAutoFillButtonState();
          if(s===gradeSel||s===sectionSel) setStatus("warn","تم تغيير الصف/الشعبة","اضغط (تعبئة تلقائية) لتحديث قائمة الطالبات");
        });
      });

      loadLookups();
      updateAutoFillButtonState();

      window.addEventListener("beforeunload", ()=>{ pendingSubmit=null; stopLoading(); });
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

      function levelChip(lvl) {
        const map = { 'ممتاز':'ok', 'جيد':'warn', 'ضعيف':'bad' };
        const cls = map[lvl] || '';
        return `<span class="result-chip ${cls}">${esc(lvl||'—')}</span>`;
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
        ['recall','understand','hots','total'].forEach(k => {
          const card = document.getElementById('sc-'+k+'-card');
          if(card) card.classList.remove('ok-card','warn-card','bad-card');
        });

        if (n === 0) {
          ['sc-count','sc-recall','sc-understand','sc-hots','sc-total','sc-pass','sc-fail'].forEach(id => set(id,'—'));
          ['sc-pass-pct','sc-fail-pct'].forEach(id => set(id,'—%'));
          ['sc-recall-n','sc-understand-n','sc-hots-n','sc-total-n'].forEach(id => set(id,'— طالبة'));
          set('sc-count-lbl','بعد الفلترة');
          return;
        }

        let sumR=0, sumU=0, sumH=0, sumT=0, pass=0, fail=0;
        let maxR=0, maxU=0, maxH=0, maxTot=0, cntMax=0;

        for (const r of rows) {
          sumR  += Number(r.recall)||0;
          sumU  += Number(r.understand)||0;
          sumH  += Number(r.hots)||0;
          sumT  += Number(r.total)||0;
          maxR  += Number(r.maxRecall)||0;
          maxU  += Number(r.maxUnderstand)||0;
          maxH  += Number(r.maxHots)||0;
          maxTot+= Number(r.totalMax)||(Number(r.maxRecall||0)+Number(r.maxUnderstand||0)+Number(r.maxHots||0));
          cntMax++;
          const mT = Number(r.totalMax)||(Number(r.maxRecall||0)+Number(r.maxUnderstand||0)+Number(r.maxHots||0));
          const threshold = mT > 0 ? mT * PASS_THRESHOLD_PCT : Infinity;
          if ((Number(r.total)||0) >= threshold) pass++; else fail++;
        }

        const avgMaxR   = cntMax>0 ? maxR/cntMax   : 0;
        const avgMaxU   = cntMax>0 ? maxU/cntMax   : 0;
        const avgMaxH   = cntMax>0 ? maxH/cntMax   : 0;
        const avgMaxTot = cntMax>0 ? maxTot/cntMax : 0;

        const avgR = sumR/n, avgU = sumU/n, avgH = sumH/n, avgTot = sumT/n;

        // النسب المئوية لتحديد اللون
        const pctR   = avgMaxR>0   ? (avgR/avgMaxR)*100   : null;
        const pctU   = avgMaxU>0   ? (avgU/avgMaxU)*100   : null;
        const pctH   = avgMaxH>0   ? (avgH/avgMaxH)*100   : null;
        const pctTot = avgMaxTot>0 ? (avgTot/avgMaxTot)*100 : null;

        set('sc-count', n);
        set('sc-count-lbl', 'إجمالي الطالبات المفلترة');

        set('sc-recall',     numF(avgR));
        set('sc-recall-n',   n + ' طالبة');
        colorCard(document.getElementById('sc-recall-card'), document.getElementById('sc-recall'), pctR);

        set('sc-understand',   numF(avgU));
        set('sc-understand-n', n + ' طالبة');
        colorCard(document.getElementById('sc-understand-card'), document.getElementById('sc-understand'), pctU);

        set('sc-hots',   numF(avgH));
        set('sc-hots-n', n + ' طالبة');
        colorCard(document.getElementById('sc-hots-card'), document.getElementById('sc-hots'), pctH);

        set('sc-total',   numF(avgTot));
        set('sc-total-n', n + ' طالبة');
        colorCard(document.getElementById('sc-total-card'), document.getElementById('sc-total'), pctTot);

        set('sc-pass', pass);
        set('sc-fail', fail);
        set('sc-pass-pct', numF(pass/n*100,1) + '%');
        set('sc-fail-pct', numF(fail/n*100,1) + '%');
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
          tbody.innerHTML = '<tr class="loading-row"><td colspan="12">لا توجد نتائج مطابقة للفلاتر</td></tr>';
          return;
        }
        const frag = document.createDocumentFragment();
        rows.forEach((r, i) => {
          const tr = document.createElement('tr');
          const lvl = r.level || computeLevelFromRow(r);
          const mr = Number(r.maxRecall)||0;
          const mu = Number(r.maxUnderstand)||0;
          const mh = Number(r.maxHots)||0;
          const mt = Number(r.totalMax)||(mr+mu+mh);
          const rv = r.recall === '' || r.recall === null || r.recall === undefined ? 0 : Number(r.recall);
          const uv = r.understand === '' || r.understand === null || r.understand === undefined ? 0 : Number(r.understand);
          const hv = r.hots === '' || r.hots === null || r.hots === undefined ? 0 : Number(r.hots);
          const tv = r.total === '' || r.total === null || r.total === undefined ? 0 : Number(r.total);

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
            <td>${levelChip(lvl)}</td>
            <td style="color:var(--muted);font-size:12px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(r.plan||'—')}</td>
          `;
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
        if(mr<=0||mu<=0||mh<=0) return '—';
        const pr=recall/mr*100, pu=understand/mu*100, ph=hots/mh*100;
        if(pr<50||pu<50||ph<50) return 'ضعيف';
        if(pr>=80&&pu>=80&&ph>=80) return 'ممتاز';
        return 'جيد';
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
          const rowLevel = r.level || computeLevelFromRow(r);
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

        computeStats(filteredRows);
        renderTable(filteredRows);
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
        tbody.innerHTML = '<tr class="loading-row"><td colspan="12">جاري تحميل البيانات... <span class="spinner"></span></td></tr>';
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
            recall:       Number(r[12] || 0),
            understand:   Number(r[13] || 0),
            hots:         Number(r[14] || 0),
            total:        Number(r[15] || 0),
            plan:         r[16] || ''
          }));

          refreshAdminFilterOptions(getAdminFilterValues());
          applyFilters();
          succeed("تم تحميل البيانات بنجاح");

          const footer = document.getElementById('admin-footer-batch');
          if (footer) footer.textContent = 'آخر تحديث: ' + new Date().toLocaleTimeString('ar-SA');
        } catch(e) {
          tbody.innerHTML = `<tr class="loading-row"><td colspan="12" style="color:var(--bad);">
            ⚠ ${esc(e.message)}<br/>
            <span style="font-size:11px;opacity:0.7;">تعذر تحميل البيانات من الخادم</span>
          </td></tr>`;
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

      return { init, loadData };
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
        const resetSchoolsBtn = document.getElementById('superResetSchoolsBtn');
        if (resetSchoolsBtn) {
          resetSchoolsBtn.addEventListener('click', async () => {
            const yes = confirm('هل فعلاً تريد مسح جميع بيانات المدارس؟ سيتم حذف المدارس والطالبات والمعلمات والنتائج نهائياً.');
            if (!yes) return;
            try {
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
      const loginRoleBtns = document.querySelectorAll('[data-login-role]');
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

      let selectedRole = 'teacher';

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

      if (loginRoleBtns && loginRoleBtns.length) {
        loginRoleBtns.forEach(btn => {
          btn.addEventListener('click', () => {
            loginRoleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedRole = btn.getAttribute('data-login-role') || 'teacher';
          });
        });
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
          if (selectedRole && uiRole && uiRole !== selectedRole) {
            selectedRole = uiRole;
          }
          try {
            sessionStorage.setItem(SESSION_KEY, uiRole || selectedRole);
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
            uiRole || selectedRole
          );
          applySession(uiRole || selectedRole);
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



