document.addEventListener("DOMContentLoaded", () => {
  const elements = getElements();
  let templates = [];

  init();

  async function init() {
    elements.form.addEventListener("submit", handleSubmit);
    elements.cancelEdit.addEventListener("click", resetForm);
    elements.list.addEventListener("click", handleListClick);
    elements.exportButton.addEventListener("click", exportTemplates);
    elements.importInput.addEventListener("change", importTemplates);
    elements.clearButton.addEventListener("click", clearTemplates);

    templates = await TriggerTemplateStore.getTemplates();
    render();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const template = TriggerTemplateStore.cleanTemplate({
      id: elements.id.value || crypto.randomUUID(),
      trigger: elements.trigger.value,
      title: elements.title.value,
      body: elements.body.value
    });

    if (!template.trigger || !template.title || !template.body) return;

    templates = templates.filter((item) => item.id !== template.id && item.trigger.toLowerCase() !== template.trigger.toLowerCase());
    templates.push(template);
    await persist("Template saved.");
    resetForm();
  }

  async function handleListClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const item = templates.find((template) => template.id === button.dataset.id);
    if (!item) return;

    if (button.dataset.action === "edit") {
      elements.id.value = item.id;
      elements.trigger.value = item.trigger;
      elements.title.value = item.title;
      elements.body.value = item.body;
      elements.cancelEdit.classList.remove("hidden");
      elements.title.focus();
    }

    if (button.dataset.action === "delete") {
      templates = templates.filter((template) => template.id !== item.id);
      await persist("Template deleted.");
    }
  }

  function exportTemplates() {
    const blob = new Blob([JSON.stringify({ templates }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "trigger-template-backup.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("Exported JSON backup.");
  }

  async function importTemplates(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const data = JSON.parse(await file.text());
      const imported = Array.isArray(data) ? data : data.templates;
      if (!Array.isArray(imported)) throw new Error("Invalid template file.");

      templates = TriggerTemplateStore.dedupeTemplates([...templates, ...imported]);
      await persist("Imported templates.");
    } catch (error) {
      setStatus(error.message || "Could not import file.");
    } finally {
      elements.importInput.value = "";
    }
  }

  async function clearTemplates() {
    const confirmed = window.confirm("Delete all templates? This cannot be undone unless you have an exported backup.");
    if (!confirmed) return;

    templates = [];
    resetForm();
    await persist("All templates deleted.");
  }

  async function persist(message) {
    try {
      await TriggerTemplateStore.saveTemplates(templates);
      templates = await TriggerTemplateStore.getTemplates();
      render();
      setStatus(message);
    } catch (error) {
      setStatus(error.message || "Could not save templates.");
    }
  }

  function render() {
    elements.count.textContent = String(templates.length);
    elements.empty.classList.toggle("hidden", templates.length > 0);
    elements.list.replaceChildren(...templates.map(renderItem));
  }

  function renderItem(template) {
    const item = document.createElement("li");
    item.className = "template-item";

    const content = document.createElement("div");
    content.className = "template-content";

    const trigger = document.createElement("code");
    trigger.textContent = template.trigger;

    const title = document.createElement("strong");
    title.textContent = template.title;

    const preview = document.createElement("p");
    preview.textContent = template.body;

    content.append(title, trigger, preview);

    const actions = document.createElement("div");
    actions.className = "item-actions";
    actions.append(actionButton("edit", template.id, "Edit"), actionButton("delete", template.id, "Delete"));

    item.append(content, actions);
    return item;
  }

  function actionButton(action, id, label) {
    const button = document.createElement("button");
    button.className = "secondary compact";
    button.type = "button";
    button.dataset.action = action;
    button.dataset.id = id;
    button.textContent = label;
    return button;
  }

  function resetForm() {
    elements.form.reset();
    elements.id.value = "";
    elements.cancelEdit.classList.add("hidden");
  }

  function setStatus(message) {
    elements.status.textContent = message;
    window.clearTimeout(setStatus.timeout);
    setStatus.timeout = window.setTimeout(() => {
      elements.status.textContent = "";
    }, 3000);
  }

  function getElements() {
    return {
      form: document.getElementById("templateForm"),
      id: document.getElementById("templateId"),
      trigger: document.getElementById("triggerInput"),
      title: document.getElementById("titleInput"),
      body: document.getElementById("bodyInput"),
      cancelEdit: document.getElementById("cancelEdit"),
      list: document.getElementById("templateList"),
      count: document.getElementById("templateCount"),
      empty: document.getElementById("emptyState"),
      exportButton: document.getElementById("exportTemplates"),
      importInput: document.getElementById("importTemplates"),
      clearButton: document.getElementById("clearTemplates"),
      status: document.getElementById("statusMessage")
    };
  }
});
