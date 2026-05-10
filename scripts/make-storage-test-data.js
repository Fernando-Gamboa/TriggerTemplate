const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "..", "tmp");
const templates = Array.from({ length: 100 }, (_, index) => {
  const number = String(index + 1).padStart(3, "0");
  return {
    id: `storage-test-${number}`,
    title: `Storage test ${number}`,
    trigger: `-test${number}`,
    body: `Storage test template ${number}`
  };
});

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "storage-limit-100-templates.json"), JSON.stringify({ templates }, null, 2));
