(function () {
  const STORAGE_KEY = "triggerTemplates";
  const TEMPLATE_PREFIX = "triggerTemplate:item:";
  const ORDER_KEY = "triggerTemplateOrder";
  const PANEL_STATE_KEY = "triggerTemplatePanelState";
  const MAX_TEMPLATES = 100;
  const MAX_TEMPLATE_BYTES = 7600;
  const MAX_TOTAL_BYTES = 95000;

  const seedTemplates = [];

  function normalizeTrigger(value) {
    return String(value || "").trim();
  }

  function cleanTemplate(template) {
    return {
      id: template.id || crypto.randomUUID(),
      trigger: normalizeTrigger(template.trigger),
      title: String(template.title || "").trim(),
      body: String(template.body || "")
    };
  }

  function dedupeTemplates(templates) {
    const seen = new Map();
    for (const template of templates.map(cleanTemplate)) {
      if (!template.trigger || !template.title || !template.body) continue;
      seen.set(template.trigger.toLowerCase(), template);
    }
    return Array.from(seen.values());
  }

  function getTemplateKey(id) {
    return `${TEMPLATE_PREFIX}${id}`;
  }

  function byteSize(value) {
    return new Blob([JSON.stringify(value)]).size;
  }

  function assertWithinQuota(templates) {
    if (templates.length > MAX_TEMPLATES) {
      throw new Error(`Template limit reached. Keep ${MAX_TEMPLATES} or fewer templates when Chrome Sync is enabled.`);
    }

    const orderBytes = byteSize({ [ORDER_KEY]: templates.map((template) => template.id) });
    let totalBytes = orderBytes;

    for (const template of templates) {
      const key = getTemplateKey(template.id);
      const itemBytes = byteSize({ [key]: template });
      if (itemBytes > MAX_TEMPLATE_BYTES) {
        throw new Error(`"${template.title}" is too large for Chrome Sync. Shorten this template before saving.`);
      }
      totalBytes += itemBytes;
    }

    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new Error("Chrome Sync storage is almost full. Delete or shorten templates before saving more.");
    }
  }

  async function getTemplates() {
    const result = await chrome.storage.sync.get(null);
    const order = Array.isArray(result[ORDER_KEY]) ? result[ORDER_KEY] : [];
    const itemKeys = Object.keys(result).filter((key) => key.startsWith(TEMPLATE_PREFIX));

    if (order.length || itemKeys.length) {
      const byId = new Map();
      for (const key of itemKeys) {
        const template = cleanTemplate(result[key]);
        if (template.trigger && template.title && template.body) {
          byId.set(template.id, template);
        }
      }

      const ordered = order.map((id) => byId.get(id)).filter(Boolean);
      const unordered = Array.from(byId.values()).filter((template) => !order.includes(template.id));
      return dedupeTemplates([...ordered, ...unordered]);
    }

    if (Array.isArray(result[STORAGE_KEY])) {
      const migrated = dedupeTemplates(result[STORAGE_KEY]);
      await saveTemplates(migrated);
      await chrome.storage.sync.remove(STORAGE_KEY);
      return migrated;
    }

    await saveTemplates(seedTemplates);
    return seedTemplates;
  }

  async function saveTemplates(templates) {
    const nextTemplates = dedupeTemplates(templates);
    assertWithinQuota(nextTemplates);

    const current = await chrome.storage.sync.get(null);
    const currentTemplateKeys = Object.keys(current).filter((key) => key.startsWith(TEMPLATE_PREFIX));
    const nextTemplateKeys = nextTemplates.map((template) => getTemplateKey(template.id));
    const staleKeys = currentTemplateKeys.filter((key) => !nextTemplateKeys.includes(key));
    const payload = {
      [ORDER_KEY]: nextTemplates.map((template) => template.id)
    };

    for (const template of nextTemplates) {
      payload[getTemplateKey(template.id)] = template;
    }

    if (staleKeys.length) {
      await chrome.storage.sync.remove(staleKeys);
    }
    await chrome.storage.sync.set(payload);
    await chrome.storage.sync.remove(STORAGE_KEY);
  }

  async function getStorageStatus() {
    const templates = await getTemplates();
    const bytesInUse = await chrome.storage.sync.getBytesInUse(null);
    const templateCount = templates.length;
    const canCreate = templateCount < MAX_TEMPLATES && bytesInUse < MAX_TOTAL_BYTES;

    return {
      canCreate,
      templateCount,
      maxTemplates: MAX_TEMPLATES,
      bytesInUse,
      maxBytes: MAX_TOTAL_BYTES,
      message: canCreate
        ? ""
        : templateCount >= MAX_TEMPLATES
          ? `Template limit reached. Delete a template before creating another.`
          : `Chrome Sync storage is almost full. Delete or shorten templates before creating another.`
    };
  }

  async function getPanelState() {
    const result = await chrome.storage.local.get(PANEL_STATE_KEY);
    return {
      open: false,
      hidden: false,
      y: 96,
      side: "right",
      ...(result[PANEL_STATE_KEY] || {})
    };
  }

  async function savePanelState(state) {
    const current = await getPanelState();
    await chrome.storage.local.set({ [PANEL_STATE_KEY]: { ...current, ...state } });
  }

  window.TriggerTemplateStore = {
    STORAGE_KEY,
    TEMPLATE_PREFIX,
    ORDER_KEY,
    PANEL_STATE_KEY,
    MAX_TEMPLATES,
    cleanTemplate,
    dedupeTemplates,
    getTemplates,
    saveTemplates,
    getStorageStatus,
    getPanelState,
    savePanelState
  };
})();
