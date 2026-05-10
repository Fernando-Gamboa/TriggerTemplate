const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");
const outDir = path.join(root, "store-assets");
const htmlDir = path.join(outDir, "html");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

fs.mkdirSync(htmlDir, { recursive: true });

const pages = [
  {
    name: "promo-small-440x280",
    width: 440,
    height: 280,
    html: promoSmall()
  },
  {
    name: "promo-marquee-1400x560",
    width: 1400,
    height: 560,
    html: promoMarquee()
  },
  {
    name: "screenshot-library-1280x800",
    width: 1280,
    height: 800,
    html: screenshot("library")
  },
  {
    name: "screenshot-create-1280x800",
    width: 1280,
    height: 800,
    html: screenshot("create")
  },
  {
    name: "screenshot-side-tab-1280x800",
    width: 1280,
    height: 800,
    html: screenshot("tab")
  },
  {
    name: "screenshot-hero-1280x800",
    width: 1280,
    height: 800,
    html: heroScreenshot()
  }
];

for (const page of pages) {
  const htmlPath = path.join(htmlDir, `${page.name}.html`);
  const pngPath = path.join(outDir, `${page.name}.png`);
  fs.writeFileSync(htmlPath, page.html);
  execFileSync(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    `--window-size=${page.width},${page.height}`,
    `--screenshot=${pngPath}`,
    `file://${htmlPath}`
  ], { stdio: "ignore" });
}

function base(content, width, height) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body {
      width: ${width}px;
      height: ${height}px;
      margin: 0;
      overflow: hidden;
      font-family: Inter, Arial, Helvetica, sans-serif;
      background: #f4f6fb;
      color: #111827;
    }
    .logo {
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, #ffd400, #ffcc00);
      color: #030712;
      font-weight: 900;
      letter-spacing: 0;
      box-shadow: 0 20px 40px rgba(17, 24, 39, .16);
    }
    .card {
      background: #fff;
      border: 2px solid #d8dee9;
      box-shadow: 0 26px 60px rgba(17, 24, 39, .18);
    }
    .bubble {
      position: absolute;
      border-radius: 999px;
      background: #22c55e;
      box-shadow: 0 16px 36px rgba(34, 197, 94, .28);
    }
    .dot {
      position: absolute;
      width: 16px;
      height: 16px;
      border-radius: 999px;
      background: #111827;
      opacity: .1;
    }
    .tag {
      display: inline-block;
      padding: 8px 14px;
      border-radius: 10px;
      background: #fff3a3;
      font: 800 28px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    .muted { color: #667085; }
    ${content.css || ""}
  </style>
</head>
<body>${content.body}</body>
</html>`;
}

function promoSmall() {
  return base({
    css: `
      body { background: linear-gradient(135deg, #fff4a8 0%, #ffd400 45%, #111827 45%, #111827 100%); }
      .logo { position:absolute; left:42px; top:48px; width:126px; height:92px; border-radius:28px; font-size:40px; }
      .card { position:absolute; left:142px; top:82px; width:244px; height:136px; border-radius:24px; padding:24px 24px; box-shadow:0 18px 0 rgba(17,24,39,.12); }
      .line { height:16px; border-radius:99px; background:#111827; margin-bottom:16px; }
      .line.one { width:150px; }
      .chip { display:inline-grid; height:50px; min-width:116px; place-items:center; border-radius:12px; background:#fff09a; color:#111827; font:900 30px/1 ui-monospace,SFMono-Regular,Menlo,monospace; }
      .spark { position:absolute; right:34px; top:30px; color:#22c55e; font-size:54px; font-weight:900; transform:rotate(-11deg); }
      .bubble { position:absolute; right:56px; bottom:28px; width:40px; height:40px; border-radius:999px; background:#22c55e; }
    `,
    body: `
      <div class="logo">TT</div>
      <div class="card">
        <div class="line one"></div>
        <span class="chip">-test</span>
      </div>
      <div class="spark">+</div>
      <div class="bubble"></div>
    `
  }, 440, 280);
}

function promoMarquee() {
  return base({
    css: `
      body { background: linear-gradient(135deg, #fff7bf 0%, #ffd400 34%, #f8fafc 34%, #f8fafc 100%); }
      .logo { position:absolute; left:104px; top:132px; width:230px; height:164px; border-radius:46px; font-size:76px; }
      .panel { position:absolute; left:420px; top:72px; width:780px; height:416px; border-radius:34px; overflow:hidden; }
      .head { height:110px; padding:30px 40px; border-bottom:2px solid #e5eaf2; }
      h1 { margin:0; font-size:44px; line-height:1; }
      p { margin:10px 0 0; font-size:26px; color:#667085; }
      .search { margin:28px 40px; height:70px; border:2px solid #d8dee9; border-radius:18px; color:#667085; font-size:25px; padding:18px 26px; }
      .item { margin:0 40px; height:116px; border:2px solid #d8dee9; border-radius:20px; display:flex; align-items:center; gap:24px; padding:24px; }
      .handle { width:26px; color:#667085; font-size:36px; line-height:.5; }
      .copy { flex:1; }
      .copy strong { display:block; font-size:30px; margin-bottom:10px; }
      .bounce { position:absolute; right:86px; top:108px; width:96px; height:96px; border-radius:999px; background:#22c55e; color:#fff; display:grid; place-items:center; font-size:58px; font-weight:900; transform:rotate(-9deg); box-shadow:0 20px 44px rgba(34,197,94,.28); }
    `,
    body: `
      <div class="logo">TT</div>
      <div class="card panel">
        <div class="head"><h1>TriggerTemplate</h1><p>Reusable text in a snap</p></div>
        <div class="search">Search by Trigger Name</div>
        <div class="item"><div class="handle">::</div><div class="copy"><strong>Quick reply</strong><span class="tag">-test</span></div></div>
      </div>
      <div class="bounce">↵</div>
      <div class="bubble" style="left:1160px;bottom:78px;width:64px;height:64px;"></div>
      <div class="dot" style="left:54px;top:54px;"></div>
    `
  }, 1400, 560);
}

function heroScreenshot() {
  return base({
    css: `
      body {
        background:
          radial-gradient(circle at 14% 18%, rgba(255, 212, 0, .42), transparent 28%),
          radial-gradient(circle at 88% 78%, rgba(255, 212, 0, .24), transparent 30%),
          linear-gradient(135deg, #fff9d7 0%, #ffffff 44%, #111827 44%, #111827 100%);
      }
      .stage {
        position: absolute;
        inset: 54px;
        border-radius: 38px;
        overflow: hidden;
        background: linear-gradient(135deg, rgba(255,255,255,.92), rgba(255,255,255,.72));
        border: 2px solid rgba(216, 222, 233, .9);
        box-shadow: 0 34px 80px rgba(17, 24, 39, .22);
      }
      .stage::after {
        content: "";
        position: absolute;
        right: -130px;
        top: -70px;
        width: 560px;
        height: 560px;
        border-radius: 999px;
        background: #ffd400;
        opacity: .96;
      }
      .logo {
        position: absolute;
        left: 126px;
        top: 166px;
        width: 250px;
        height: 180px;
        border-radius: 46px;
        font-size: 78px;
        z-index: 2;
        box-shadow: 0 26px 58px rgba(17, 24, 39, .18);
      }
      .copy {
        position: absolute;
        left: 430px;
        top: 178px;
        width: 590px;
        z-index: 2;
      }
      h1 {
        margin: 0;
        color: #111827;
        font-size: 76px;
        line-height: .98;
        font-weight: 900;
        letter-spacing: 0;
      }
      .subtitle {
        margin-top: 26px;
        color: #344054;
        font-size: 34px;
        line-height: 1.2;
        font-weight: 700;
      }
      .trigger {
        position: absolute;
        left: 430px;
        top: 506px;
        z-index: 2;
        display: flex;
        align-items: center;
        gap: 20px;
        width: 620px;
        min-height: 86px;
        padding: 20px 24px;
        border-radius: 24px;
        background: #ffffff;
        border: 2px solid #d8dee9;
        box-shadow: 0 18px 42px rgba(17, 24, 39, .14);
        font-size: 28px;
        color: #667085;
      }
      .tag {
        font-size: 34px;
        border-radius: 14px;
        color: #111827;
        white-space: nowrap;
      }
      .arrow {
        color: #111827;
        font-size: 38px;
        font-weight: 900;
      }
      .result {
        flex: 1;
        min-width: 0;
        font-size: 28px;
        font-weight: 800;
        color: #111827;
        line-height: 1.12;
      }
    `,
    body: `
      <div class="stage">
        <div class="logo">TT</div>
        <div class="copy">
          <h1>TriggerTemplate</h1>
          <div class="subtitle">Save text once. Type a trigger. Insert it anywhere.</div>
        </div>
        <div class="trigger"><span class="tag">-test</span><span class="arrow">→</span><span class="result">Hello {name}, let's create some templates!</span></div>
      </div>
    `
  }, 1280, 800);
}

function screenshot(mode) {
  const isCreate = mode === "create";
  const isTab = mode === "tab";
  return base({
    css: `
      body { background: linear-gradient(135deg, #f7f8fb, #eef2f7); }
      .page-text { position:absolute; left:60px; top:56px; width:520px; color:#111827; opacity:.28; }
      .page-text h1 { margin:0 0 18px; font-size:52px; line-height:1.05; }
      .page-text p { margin:0; font-size:25px; line-height:1.35; }
      .side { position:absolute; right:0; top:0; width:34px; height:800px; background:#202124; }
      .logo { position:absolute; ${isTab ? "right:64px;top:254px;" : "right:936px;top:94px;"} width:138px; height:92px; border-radius:28px; font-size:43px; z-index:2; }
      .dismiss { position:absolute; ${isTab ? "right:232px;top:272px;" : "right:1082px;top:116px;"} width:64px; height:64px; border-radius:999px; background:#fff; color:#4b5563; display:grid; place-items:center; font-size:34px; font-weight:900; box-shadow:0 18px 42px rgba(17,24,39,.14); border:2px solid #e5e7eb; }
      .panel { position:absolute; right:34px; top:${isCreate ? 48 : 92}px; width:900px; height:${isCreate ? 720 : 650}px; border-radius:0 0 0 32px; overflow:hidden; display:${isTab ? "none" : "block"}; }
      .head { height:122px; border-bottom:2px solid #e5eaf2; display:flex; align-items:center; justify-content:space-between; padding:0 34px 0 86px; }
      .title h1 { margin:0; font-size:33px; line-height:1.1; }
      .title p { margin:8px 0 0; color:#667085; font-size:25px; }
      .actions { display:flex; gap:18px; }
      .btn { width:68px; height:68px; border:2px solid #d8dee9; border-radius:18px; display:grid; place-items:center; font-size:38px; font-weight:700; background:#fff; }
      .search { margin:30px 34px; height:74px; border:2px solid #d8dee9; border-radius:16px; padding:20px 24px; color:#777; font-size:27px; }
      .item { margin:0 34px; height:128px; border:2px solid #d8dee9; border-radius:20px; display:flex; overflow:hidden; }
      .handle { width:62px; border-right:2px solid #edf1f6; color:#667085; display:grid; place-items:center; font-size:34px; font-weight:900; }
      .item-content { padding:22px 28px; }
      .item-content strong { display:block; font-size:28px; margin-bottom:12px; }
      .item-content p { margin:12px 0 0; color:#667085; font-size:23px; }
      .form { padding:22px 36px; }
      label { display:block; margin:0 0 14px; font-size:21px; font-weight:800; color:#344054; }
      input, textarea { display:block; width:100%; margin-top:8px; border:2px solid #d8dee9; border-radius:16px; padding:15px 22px; font:24px/1.25 ui-monospace, SFMono-Regular, Menlo, monospace; color:#777; }
      textarea { height:138px; resize:none; }
      .form-actions { display:flex; justify-content:flex-end; gap:18px; padding-top:4px; }
      .form-actions .cancel, .form-actions .create { height:62px; padding:0 28px; border-radius:16px; font-size:28px; display:grid; place-items:center; border:2px solid #d8dee9; }
      .form-actions .create { background:#111827; color:#fff; border-color:#111827; }
    `,
    body: `
      <div class="page-text"><h1>Write faster with reusable templates.</h1><p>Save your best replies and expand them anywhere with a short trigger.</p></div>
      <div class="side"></div>
      ${isTab ? `<div class="dismiss">x</div><div class="logo">TT</div>` : `<div class="logo">TT</div>`}
      <div class="card panel">
        <div class="head"><div class="title"><h1>TriggerTemplate</h1><p>1 saved template</p></div><div class="actions"><div class="btn">+</div><div class="btn">x</div></div></div>
        ${isCreate ? `
          <div class="form">
            <label>Trigger Name<input value="Test template"></label>
            <label>Trigger Action<input value="-test"></label>
            <label>Template<textarea>Hello, you can make ANYTHING a reusable template!</textarea></label>
            <div class="form-actions"><div class="cancel">Cancel</div><div class="create">Create</div></div>
          </div>
        ` : `
          <div class="search">Search by Trigger Name</div>
          <div class="item"><div class="handle">::</div><div class="item-content"><strong>hi</strong><span class="tag">-test</span><p>hello</p></div></div>
        `}
      </div>
    `
  }, 1280, 800);
}
