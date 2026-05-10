chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "TRIGGER_TEMPLATE_TOGGLE_PANEL" });
  } catch (error) {
    await chrome.action.setTitle({
      tabId: tab.id,
      title: "Trigger Template is not available on this page"
    });
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== "TRIGGER_TEMPLATE_OPEN_OPTIONS") return;
  chrome.runtime.openOptionsPage();
});
