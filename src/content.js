(function () {
  const STORAGE_KEY = "triggerTemplates";
  const DELIMITER_KEYS = new Set([" ", "Enter", "Tab"]);
  const MAX_TRIGGER_LENGTH = 80;
  const PANEL_WIDTH = 360;
  const MIN_TAB_Y = 28;
  let templates = [];
  let triggerMap = new Map();
  let panelState = { open: false, hidden: false, y: 96, side: "right" };
  let shadow;
  let host;
  let searchTerm = "";
  let editingId = "";
  let dragId = "";
  let tabWasDragged = false;
  let formDraft = null;
  let panelNotice = "";
  let storageStatus = { canCreate: true, message: "" };

  loadTemplates();
  if (window.top === window) mountPanel();

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "sync" && hasTemplateStorageChange(changes)) {
      loadTemplates({ refreshPanelState: false });
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message && message.type === "TRIGGER_TEMPLATE_TOGGLE_PANEL") {
      if (panelState.hidden) {
        setPanelState({ hidden: false, open: true });
        return;
      }
      setPanelOpen(!panelState.open);
    }
  });

  document.addEventListener("keydown", handleKeydown, true);
  document.addEventListener("beforeinput", handleBeforeInput, true);

  async function loadTemplates(options = {}) {
    if (window.TriggerTemplateStore) {
      setTemplates(await window.TriggerTemplateStore.getTemplates());
      if (options.refreshPanelState !== false) {
        panelState = await window.TriggerTemplateStore.getPanelState();
      }
      storageStatus = await window.TriggerTemplateStore.getStorageStatus();
      renderPanel();
      return;
    }

    const result = await chrome.storage.sync.get(STORAGE_KEY);
    setTemplates(Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : []);
    renderPanel();
  }

  function setTemplates(nextTemplates) {
    templates = nextTemplates.filter((template) => template.trigger && template.body);
    triggerMap = new Map(templates.map((template) => [template.trigger.toLowerCase(), template]));
  }

  function hasTemplateStorageChange(changes) {
    if (!window.TriggerTemplateStore) return Boolean(changes[STORAGE_KEY]);
    return Object.keys(changes).some((key) => {
      return key === STORAGE_KEY || key === window.TriggerTemplateStore.ORDER_KEY || key.startsWith(window.TriggerTemplateStore.TEMPLATE_PREFIX);
    });
  }

  function handleKeydown(event) {
    if (!DELIMITER_KEYS.has(event.key)) return;
    if (event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return;
    expandTrigger(event, event.target, event.key);
  }

  function handleBeforeInput(event) {
    if (event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return;
    const key = keyFromBeforeInput(event);
    if (!key) return;
    expandTrigger(event, event.target, key);
  }

  function keyFromBeforeInput(event) {
    if (event.inputType === "insertParagraph" || event.inputType === "insertLineBreak") return "Enter";
    if (event.inputType === "insertText" && event.data === " ") return " ";
    if (event.inputType === "insertText" && event.data === "\t") return "Tab";
    return "";
  }

  function expandTrigger(event, target, key) {
    const context = getEditableContext(target);
    if (!context) return false;

    const token = context.getTokenBeforeCaret();
    if (!token || token.length > MAX_TRIGGER_LENGTH) return false;

    const template = triggerMap.get(token.toLowerCase());
    if (!template) return false;

    event.preventDefault();
    context.replaceToken(template.body, key);
    return true;
  }

  function getEditableContext(target) {
    if (target instanceof HTMLTextAreaElement) return textInputContext(target);
    if (target instanceof HTMLInputElement && isSupportedInput(target)) return textInputContext(target);
    if (isContentEditable(target)) return contentEditableContext(target);
    return null;
  }

  function isSupportedInput(input) {
    const type = (input.type || "text").toLowerCase();
    return ["email", "search", "tel", "text", "url", "password"].includes(type);
  }

  function isContentEditable(node) {
    return node instanceof HTMLElement && Boolean(node.closest("[contenteditable]:not([contenteditable='false'])"));
  }

  function delimiterForKey(key) {
    if (key === "Enter") return "\n";
    return "";
  }

  function textInputContext(input) {
    return {
      getTokenBeforeCaret() {
        if (input.selectionStart !== input.selectionEnd) return "";
        return extractTrailingToken(input.value.slice(0, input.selectionStart || 0));
      },
      replaceToken(body, key) {
        const selectionStart = input.selectionStart || 0;
        const selectionEnd = input.selectionEnd || selectionStart;
        const token = extractTrailingToken(input.value.slice(0, selectionStart));
        const start = selectionStart - token.length;
        const replacement = body + delimiterForKey(key);
        const nextValue = input.value.slice(0, start) + replacement + input.value.slice(selectionEnd);
        const nextCaret = start + replacement.length;

        setNativeValue(input, nextValue);
        input.setSelectionRange(nextCaret, nextCaret);
        input.dispatchEvent(new InputEvent("input", {
          bubbles: true,
          inputType: "insertReplacementText",
          data: replacement
        }));
      }
    };
  }

  function contentEditableContext(target) {
    const root = target.closest("[contenteditable]:not([contenteditable='false'])");
    return {
      getTokenBeforeCaret() {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return "";
        if (!root.contains(selection.anchorNode)) return "";
        const range = selection.getRangeAt(0).cloneRange();
        range.selectNodeContents(root);
        range.setEnd(selection.anchorNode, selection.anchorOffset);
        return extractTrailingToken(range.toString());
      },
      replaceToken(body, key) {
        replaceContentEditableToken(root, body + delimiterForKey(key));
      }
    };
  }

  function extractTrailingToken(text) {
    const match = String(text).match(/(?:^|\s)(\S+)$/);
    return match ? match[1] : "";
  }

  function setNativeValue(input, value) {
    const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    if (descriptor && descriptor.set) {
      descriptor.set.call(input, value);
      return;
    }
    input.value = value;
  }

  function replaceContentEditableToken(root, replacement) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!range.collapsed || !root.contains(range.startContainer)) return;
    const tokenRange = findTokenRange(root, range);
    if (!tokenRange) return;

    tokenRange.deleteContents();
    tokenRange.insertNode(document.createTextNode(replacement));
    tokenRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(tokenRange);
    root.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      inputType: "insertReplacementText",
      data: replacement
    }));
  }

  function findTokenRange(root, caretRange) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let current;
    while ((current = walker.nextNode())) textNodes.push(current);

    const caretNodeIndex = textNodes.indexOf(caretRange.startContainer);
    if (caretNodeIndex === -1) return null;
    const range = document.createRange();

    for (let i = caretNodeIndex; i >= 0; i -= 1) {
      const node = textNodes[i];
      const text = node.textContent || "";
      let offset = i === caretNodeIndex ? caretRange.startOffset : text.length;
      while (offset > 0) {
        if (/\s/.test(text[offset - 1])) {
          range.setStart(node, offset);
          range.setEnd(caretRange.startContainer, caretRange.startOffset);
          return range;
        }
        offset -= 1;
      }
    }

    if (!textNodes.length) return null;
    range.setStart(textNodes[0], 0);
    range.setEnd(caretRange.startContainer, caretRange.startOffset);
    return range;
  }

  function mountPanel() {
    if (host || document.documentElement.dataset.triggerTemplatePanel === "true") return;
    document.documentElement.dataset.triggerTemplatePanel = "true";
    host = document.createElement("div");
    host.id = "trigger-template-root";
    shadow = host.attachShadow({ mode: "closed" });
    document.documentElement.appendChild(host);
    renderPanel();
  }

  function renderPanel() {
    if (!shadow) return;
    const editing = templates.find((template) => template.id === editingId);
    const isEditing = Boolean(editingId);

    shadow.innerHTML = `
      <style>${panelStyles()}</style>
      <div class="shell ${panelState.open ? "open" : ""} ${panelState.hidden ? "hidden-tab" : ""}" data-theme="${panelState.theme || "light"}" data-side="${panelState.side}" style="--panel-y:${clampPanelY(panelState.y)}px">
        <div class="tab-zone">
          <button class="tab-dismiss" type="button" data-action="dismiss-tab" aria-label="Hide side tab" title="Hide side tab">x</button>
          <button class="tab" type="button" data-action="toggle" aria-label="Open Trigger Template">
            <span>TT</span>
          </button>
        </div>
        <section class="panel" aria-label="Trigger Template panel">
          <header class="panel-header">
            <div>
              <button class="title-link" type="button" data-action="open-options" title="Open options">TriggerTemplate</button>
              <p>${savedTemplateLabel(templates.length)}</p>
            </div>
            <div class="header-actions">
              <button class="theme-toggle" type="button" data-action="toggle-theme" aria-label="Toggle dark mode" title="Toggle dark mode">
                <span class="theme-knob"></span>
              </button>
              <button class="icon" type="button" data-action="new" aria-label="New template" title="${escapeAttribute(storageStatus.message || "New template")}" ${storageStatus.canCreate ? "" : "disabled"}>+</button>
              <button class="icon" type="button" data-action="close" aria-label="Close" title="Close">x</button>
            </div>
          </header>
          ${isEditing ? "" : `
            <div class="search-wrap">
              <input class="search" type="search" placeholder="Search by Trigger Name" value="${escapeAttribute(searchTerm)}">
              <p class="hint">Activate a trigger with Space, Tab, or Enter.</p>
            </div>
          `}
          <div class="content">
            ${panelNotice ? `<div class="notice">${escapeHtml(panelNotice)}</div>` : ""}
            ${isEditing ? formTemplate(editing) : libraryTemplate(filteredTemplates())}
          </div>
          <footer class="support-note">
            Thank you ❤️ If this helps, you can buy me a coffee ☕ <span class="venmo-wrap">(<a href="https://venmo.com/u/fgamboa011" target="_blank" rel="noopener noreferrer">Venmo</a>)</span>
          </footer>
        </section>
      </div>
    `;

    bindPanelEvents();
  }

  function libraryTemplate(items) {
    if (!items.length) {
      return `<div class="empty">No templates found.</div>`;
    }

    return `
      <ul class="list">
        ${items.map((template) => `
          <li class="item" draggable="${searchTerm ? "false" : "true"}" data-id="${template.id}">
            <button class="drag" type="button" aria-label="Drag template" title="Drag template">::</button>
            <button class="item-main" type="button" data-action="edit" data-id="${template.id}">
              <strong>${escapeHtml(template.title)}</strong>
              <code>${escapeHtml(template.trigger)}</code>
              <span>${escapeHtml(template.body)}</span>
            </button>
          </li>
        `).join("")}
      </ul>
    `;
  }

  function filteredTemplates() {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return templates;
    return templates.filter((template) => template.title.toLowerCase().includes(normalizedSearch));
  }

  function savedTemplateLabel(count) {
    return `${count} saved ${count === 1 ? "template" : "templates"}`;
  }

  function formTemplate(template) {
    const isEdit = Boolean(template);
    const values = formDraft && editingId === (template ? template.id : "new") ? formDraft : {
      title: template ? template.title : "",
      trigger: template ? template.trigger : "",
      body: template ? template.body : ""
    };

    return `
      <form class="form">
        <input name="id" type="hidden" value="${escapeAttribute(template ? template.id : "")}">
        <label>
          <span>Trigger Name</span>
          <input name="title" type="text" required value="${escapeAttribute(values.title)}" placeholder="Test template">
        </label>
        <label>
          <span>Trigger Action</span>
          <input name="trigger" type="text" required value="${escapeAttribute(values.trigger)}" placeholder="-test">
        </label>
        <label>
          <span>Template</span>
          <textarea name="body" required rows="8" placeholder="Hello, you can make ANYTHING a reusable template!">${escapeHtml(values.body)}</textarea>
        </label>
        <div class="form-actions">
          ${isEdit ? `<button class="danger" type="button" data-action="delete" data-id="${template.id}">Delete</button>` : ""}
          <button class="secondary" type="button" data-action="cancel">Cancel</button>
          <button type="submit" data-save-button>${isEdit ? "Save" : "Create"}</button>
        </div>
      </form>
    `;
  }

  function bindPanelEvents() {
    const shell = shadow.querySelector(".shell");
    const tab = shadow.querySelector(".tab");
    const panel = shadow.querySelector(".panel");
    const search = shadow.querySelector(".search");
    const form = shadow.querySelector(".form");

    shadow.querySelectorAll("[data-action='toggle']").forEach((button) => {
      button.addEventListener("click", (event) => {
        if (tabWasDragged) {
          tabWasDragged = false;
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        setPanelOpen(!panelState.open);
      });
    });
    shadow.querySelectorAll("[data-action='close']").forEach((button) => {
      button.addEventListener("click", () => setPanelOpen(false));
    });
    shadow.querySelectorAll("[data-action='open-options']").forEach((button) => {
      button.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "TRIGGER_TEMPLATE_OPEN_OPTIONS" });
      });
    });
    shadow.querySelectorAll("[data-action='toggle-theme']").forEach((button) => {
      button.addEventListener("click", async () => {
        const nextTheme = panelState.theme === "dark" ? "light" : "dark";
        await setPanelState({ theme: nextTheme });
      });
    });
    shadow.querySelectorAll("[data-action='dismiss-tab']").forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.stopPropagation();
        await setPanelState({ hidden: true, open: false });
      });
    });
    shadow.querySelectorAll("[data-action='new']").forEach((button) => {
      button.addEventListener("click", () => {
        if (!storageStatus.canCreate) {
          panelNotice = storageStatus.message;
          renderPanel();
          return;
        }
        editingId = "new";
        formDraft = null;
        panelNotice = "";
        renderPanel();
      });
    });
    shadow.querySelectorAll("[data-action='edit']").forEach((button) => {
      button.addEventListener("click", () => {
        editingId = button.dataset.id || "";
        formDraft = null;
        panelNotice = "";
        renderPanel();
      });
    });
    shadow.querySelectorAll("[data-action='cancel']").forEach((button) => {
      button.addEventListener("click", () => {
        editingId = "";
        formDraft = null;
        panelNotice = "";
        renderPanel();
      });
    });
    shadow.querySelectorAll("[data-action='delete']").forEach((button) => {
      button.addEventListener("click", async () => {
        templates = templates.filter((template) => template.id !== button.dataset.id);
        editingId = "";
        formDraft = null;
        await saveTemplatesAndRender();
      });
    });

    if (search) {
      search.addEventListener("input", () => {
        searchTerm = search.value;
        renderLibraryOnly();
      });
    }

    if (form) {
      const submitButton = form.querySelector("[data-save-button]");
      updateSaveVisibility(form, submitButton);

      form.addEventListener("input", () => {
        formDraft = getFormValues(form);
        updateSaveVisibility(form, submitButton);
      });

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const template = window.TriggerTemplateStore.cleanTemplate({
          id: String(data.get("id") || "") || crypto.randomUUID(),
          title: data.get("title"),
          trigger: data.get("trigger"),
          body: data.get("body")
        });
        templates = templates.filter((item) => item.id !== template.id && item.trigger.toLowerCase() !== template.trigger.toLowerCase());
        templates.push(template);
        editingId = "";
        formDraft = null;
        searchTerm = "";
        await saveTemplatesAndRender();
      });
    }

    bindDragSort();
    bindPanelDrag(tab, shell, panel);
  }

  function renderLibraryOnly() {
    const content = shadow.querySelector(".content");
    if (!content || editingId) return;
    content.innerHTML = libraryTemplate(filteredTemplates());
    bindDragSort();
  }

  function getFormValues(form) {
    return {
      title: form.elements.title.value,
      trigger: form.elements.trigger.value,
      body: form.elements.body.value
    };
  }

  function updateSaveVisibility(form, submitButton) {
    if (!submitButton) return;
    if (editingId === "new") {
      submitButton.hidden = false;
      return;
    }

    const original = templates.find((template) => template.id === editingId);
    if (!original) {
      submitButton.hidden = false;
      return;
    }

    const current = getFormValues(form);
    submitButton.hidden = current.title === original.title && current.trigger === original.trigger && current.body === original.body;
  }

  function bindDragSort() {
    shadow.querySelectorAll(".item").forEach((item) => {
      item.addEventListener("dragstart", (event) => {
        dragId = item.dataset.id || "";
        item.classList.add("dragging");
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", dragId);
        }
      });
      item.addEventListener("dragend", () => {
        item.classList.remove("dragging");
        dragId = "";
      });
      item.addEventListener("dragover", (event) => {
        event.preventDefault();
        const dragging = shadow.querySelector(".dragging");
        if (!dragging || dragging === item) return;
        const list = item.parentElement;
        const after = event.clientY > item.getBoundingClientRect().top + item.offsetHeight / 2;
        list.insertBefore(dragging, after ? item.nextSibling : item);
      });
      item.addEventListener("drop", async (event) => {
        event.preventDefault();
        await persistDomOrder();
      });
    });
  }

  async function persistDomOrder() {
    const orderedIds = Array.from(shadow.querySelectorAll(".item")).map((item) => item.dataset.id);
    if (!orderedIds.length || searchTerm) return;
    const byId = new Map(templates.map((template) => [template.id, template]));
    templates = orderedIds.map((id) => byId.get(id)).filter(Boolean);
    await saveTemplatesAndRender();
  }

  function bindPanelDrag(tab, shell, panel) {
    let startY = 0;
    let startPanelY = 0;
    let didDrag = false;

    tab.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      startY = event.clientY;
      startPanelY = panelState.y;
      didDrag = false;
      tab.setPointerCapture(event.pointerId);
      shell.classList.add("moving");
    });

    tab.addEventListener("pointermove", (event) => {
      if (!tab.hasPointerCapture(event.pointerId)) return;
      const delta = event.clientY - startY;
      if (Math.abs(delta) > 3) {
        didDrag = true;
        tabWasDragged = true;
      }
      panelState.y = clampPanelY(startPanelY + delta);
      shell.style.setProperty("--panel-y", `${panelState.y}px`);
    });

    tab.addEventListener("pointerup", async (event) => {
      if (tab.hasPointerCapture(event.pointerId)) tab.releasePointerCapture(event.pointerId);
      shell.classList.remove("moving");
      await savePanelState({ y: panelState.y });
      if (didDrag) {
        event.preventDefault();
        event.stopPropagation();
      }
    });

    tab.addEventListener("lostpointercapture", () => {
      if (!tabWasDragged) return;
      window.setTimeout(() => {
        tabWasDragged = false;
      }, 0);
    });

    panel.addEventListener("pointerdown", (event) => event.stopPropagation());
  }

  async function saveTemplatesAndRender() {
    try {
      await window.TriggerTemplateStore.saveTemplates(templates);
      templates = await window.TriggerTemplateStore.getTemplates();
      storageStatus = await window.TriggerTemplateStore.getStorageStatus();
      setTemplates(templates);
      panelNotice = "";
      renderPanel();
    } catch (error) {
      panelNotice = error.message || "Could not save templates.";
      renderPanel();
    }
  }

  async function setPanelOpen(open) {
    panelState.open = open;
    await savePanelState({ open });
    renderPanel();
  }

  async function setPanelState(nextState) {
    panelState = { ...panelState, ...nextState };
    await savePanelState(nextState);
    renderPanel();
  }

  async function savePanelState(state) {
    if (window.TriggerTemplateStore) {
      await window.TriggerTemplateStore.savePanelState(state);
    }
  }

  function clampPanelY(y) {
    return Math.max(MIN_TAB_Y, Math.min(Number(y) || MIN_TAB_Y, window.innerHeight - 120));
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replaceAll("\n", "&#10;");
  }

  function panelStyles() {
    return `
      :host{all:initial}
      *{box-sizing:border-box}
      .shell{--panel-y:96px;--panel-bg:#fff;--panel-text:#111827;--panel-muted:#667085;--panel-line:#d9dee7;--panel-soft:#f3f5f8;--panel-input:#fff;--panel-card:#fff;--panel-card-hover:#fafbfc;--panel-chip:#fff7bf;--panel-footer:rgba(255,255,255,.96);--panel-shadow:0 18px 48px rgba(15,23,42,.2);position:fixed;top:var(--panel-y);right:0;z-index:2147483647;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--panel-text)}
      .shell[data-theme="dark"]{--panel-bg:#242424;--panel-text:#f5f5f5;--panel-muted:#b5bac4;--panel-line:#3a3a3a;--panel-soft:#303030;--panel-input:#2f2f2f;--panel-card:#2f2f2f;--panel-card-hover:#363636;--panel-chip:#ffd400;--panel-footer:rgba(36,36,36,.97);--panel-shadow:0 18px 48px rgba(0,0,0,.38)}
      .shell.hidden-tab{display:none}
      .tab-zone{position:absolute;top:0;right:0;width:132px;height:58px;transition:transform .18s ease}
      .tab{position:absolute;top:0;right:0;width:70px;height:58px;border:0;border-radius:18px;background:#ffd400;color:#050505;box-shadow:0 10px 28px rgba(0,0,0,.18);cursor:grab;font:900 20px/1 system-ui;letter-spacing:0;z-index:2}
      .tab span{display:block;transform:translateX(-2px)}
      .tab-dismiss{position:absolute;top:7px;right:80px;width:44px;height:44px;border:1px solid var(--panel-line);border-radius:999px;background:var(--panel-bg);color:var(--panel-muted);box-shadow:0 10px 28px rgba(0,0,0,.14);cursor:pointer;font:700 24px/1 system-ui;opacity:0;transform:translateX(18px) scale(.92);transition:opacity .16s ease,transform .16s ease,background .16s ease;z-index:1}
      .tab-zone:hover .tab-dismiss,.tab-zone:focus-within .tab-dismiss{opacity:1;transform:translateX(0) scale(1)}
      .tab-dismiss:hover{background:var(--panel-soft);color:var(--panel-text)}
      .shell.moving .tab{cursor:grabbing}
      .panel{position:absolute;top:0;right:0;width:${PANEL_WIDTH}px;max-width:calc(100vw - 18px);height:min(620px,calc(100vh - var(--panel-y) - 20px));display:flex;flex-direction:column;overflow:hidden;background:var(--panel-bg);border:1px solid var(--panel-line);border-right:0;border-radius:14px 0 0 14px;box-shadow:var(--panel-shadow);transform:translateX(calc(100% + 12px));opacity:0;transition:transform .18s ease,opacity .18s ease}
      .shell.open .panel{transform:translateX(0);opacity:1}
      .shell.open .tab-zone{transform:translateX(-${PANEL_WIDTH - 18}px)}
      .shell.open .tab-dismiss{right:80px}
      .panel-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 14px 10px 22px;border-bottom:1px solid var(--panel-line)}
      .panel-header>div:first-child{min-width:0;flex:1;text-align:left}
      .shell.open .panel-header{padding-left:34px}
      p{margin:0}
      .title-link{display:block;margin:0;padding:0;border:0;background:transparent;color:var(--panel-text);cursor:pointer;font:800 16px/1.2 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:left}
      .title-link:hover{text-decoration:underline;text-underline-offset:3px}
      p{margin-top:3px;color:var(--panel-muted);font-size:12px}
      .header-actions{display:flex;align-items:center;gap:8px}
      button{font:inherit}
      .icon{width:34px;height:34px;border:1px solid var(--panel-line);border-radius:8px;background:var(--panel-bg);color:var(--panel-text);cursor:pointer;font-size:20px;line-height:1}
      .icon:hover,.secondary:hover{background:var(--panel-soft)}
      .icon:disabled{opacity:.45;cursor:not-allowed}
      .icon:disabled:hover{background:var(--panel-bg)}
      .theme-toggle{position:relative;width:42px;height:24px;border:1px solid var(--panel-line);border-radius:999px;background:var(--panel-soft);cursor:pointer;padding:0}
      .theme-knob{position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:999px;background:var(--panel-bg);box-shadow:0 1px 4px rgba(0,0,0,.22);transition:transform .16s ease}
      .shell[data-theme="dark"] .theme-knob{transform:translateX(18px);background:#ffd400}
      .search-wrap{padding:12px 14px 10px;border-bottom:1px solid var(--panel-line)}
      .hint{margin:7px 2px 0;color:var(--panel-muted);font-size:11px;line-height:1.3}
      input,textarea{width:100%;border:1px solid var(--panel-line);border-radius:8px;padding:10px 11px;background:var(--panel-input);color:var(--panel-text);outline:0;font:14px/1.4 inherit}
      input::placeholder,textarea::placeholder{color:var(--panel-muted)}
      input:focus,textarea:focus{border-color:var(--panel-text);box-shadow:0 0 0 3px rgba(125,125,125,.18)}
      .content{min-height:0;flex:1;display:flex;flex-direction:column;overflow:hidden}
      .list{min-height:0;flex:1;display:flex;flex-direction:column;gap:8px;margin:0;padding:12px 14px 16px;overflow-y:auto;overscroll-behavior:contain;list-style:none}
      .item{display:grid;grid-template-columns:30px minmax(0,1fr);align-items:stretch;border:1px solid var(--panel-line);border-radius:10px;background:var(--panel-card);transition:transform .12s ease,box-shadow .12s ease,opacity .12s ease}
      .item.dragging{opacity:.55;box-shadow:0 10px 24px rgba(15,23,42,.16)}
      .drag{border:0;border-right:1px solid var(--panel-line);background:var(--panel-soft);color:var(--panel-muted);cursor:grab;border-radius:10px 0 0 10px;font-weight:800}
      .item-main{min-width:0;border:0;background:var(--panel-card);color:var(--panel-text);text-align:left;padding:10px 11px;border-radius:0 10px 10px 0;cursor:pointer}
      .item-main:hover{background:var(--panel-card-hover)}
      strong,code,span{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      strong{font-size:14px;line-height:1.25}
      code{width:max-content;max-width:100%;margin-top:5px;padding:3px 6px;border-radius:5px;background:var(--panel-chip);color:#111827;font:700 12px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace}
      .item-main span{margin-top:6px;color:var(--panel-muted);font-size:12px}
      .empty{margin:14px;padding:24px;border:1px dashed var(--panel-line);border-radius:10px;color:var(--panel-muted);text-align:center}
      .notice{margin:12px 14px 0;padding:10px 11px;border:1px solid #fecdca;border-radius:8px;background:#fff2f1;color:#b42318;font-size:12px;line-height:1.35}
      .form{min-height:0;flex:1;display:flex;flex-direction:column;gap:12px;padding:14px;overflow-y:auto;overscroll-behavior:contain}
      label span{display:block;margin-bottom:6px;color:var(--panel-text);font-size:12px;font-weight:750}
      textarea{resize:vertical;min-height:154px}
      .form-actions{display:flex;justify-content:flex-end;gap:8px;padding-top:4px}
      .form-actions button{min-height:36px;border:0;border-radius:8px;padding:0 13px;background:var(--panel-text);color:var(--panel-bg);cursor:pointer}
      .form-actions .secondary{border:1px solid var(--panel-line);background:var(--panel-bg);color:var(--panel-text)}
      .form-actions .danger{margin-right:auto;background:#fee4e2;color:#b42318}
      .support-note{display:block;padding:8px 8px;border-top:1px solid var(--panel-line);background:var(--panel-footer);color:var(--panel-muted);font-size:8.8px;line-height:1.25;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .support-note .venmo-wrap{display:inline;min-width:0;white-space:nowrap;overflow:visible;text-overflow:clip}
      .support-note a{color:var(--panel-text);font-weight:800;text-decoration:none;white-space:nowrap}
      .support-note a:hover{text-decoration:underline}
    `;
  }
})();
