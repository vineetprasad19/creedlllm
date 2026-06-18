// Sentiment classifier — runs DistilBERT (SST-2) in the browser to label text as
// POSITIVE or NEGATIVE with a confidence score. Shows that models can classify,
// not just generate.

const CLS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.3";
const CLS_MODEL = "Xenova/distilbert-base-uncased-finetuned-sst-2-english";

const clsEls = {
  input: document.getElementById("clsInput"),
  btn: document.getElementById("clsBtn"),
  status: document.getElementById("clsStatus"),
  result: document.getElementById("clsResult"),
};

let _cls = null, _clsLoading = null, clsBusy = false;

function clsStatus(msg, kind) {
  clsEls.status.textContent = msg;
  clsEls.status.className = "cluster-status" + (kind ? " " + kind : "");
}

async function getCls() {
  if (_cls) return _cls;
  if (_clsLoading) return _clsLoading;
  _clsLoading = (async () => {
    const { pipeline, env } = await import(CLS_URL);
    env.allowLocalModels = false;
    _cls = await pipeline("text-classification", CLS_MODEL, {
      progress_callback: (p) => {
        if (p.status === "progress" && p.total) {
          clsStatus(`Downloading model… ${Math.round((p.loaded / p.total) * 100)}% (one-time, then cached)`, "busy");
        }
      },
    });
    return _cls;
  })();
  return _clsLoading;
}

async function classify() {
  const text = clsEls.input.value.trim();
  if (!text) { clsStatus("Type a sentence first.", "error"); return; }
  if (clsBusy) return;
  clsBusy = true; clsEls.btn.disabled = true;
  try {
    clsStatus("Loading model…", "busy");
    const model = await getCls();
    clsStatus("Classifying…", "busy");
    const out = await model(text);
    const r = Array.isArray(out) ? out[0] : out; // { label, score }
    const positive = r.label.toUpperCase() === "POSITIVE";
    const pct = Math.round(r.score * 100);

    const row = document.createElement("div");
    row.className = "metric-row";
    const name = document.createElement("span");
    name.className = "metric-name";
    name.textContent = positive ? "😊 Positive" : "☹️ Negative";
    name.style.color = positive ? "#7ee787" : "#ff7b72";
    name.style.fontWeight = "700";
    const bar = document.createElement("span");
    bar.className = "metric-bar";
    const fill = document.createElement("span");
    fill.className = "metric-fill";
    fill.style.width = pct + "%";
    fill.style.background = positive
      ? "linear-gradient(90deg,#10a37f,#7ee787)"
      : "linear-gradient(90deg,#a32d2d,#ff7b72)";
    bar.appendChild(fill);
    const num = document.createElement("span");
    num.className = "metric-num";
    num.textContent = pct + "%";
    row.append(name, bar, num);
    clsEls.result.replaceChildren(row);
    clsStatus("", "hidden");
  } catch (err) {
    console.error(err);
    clsStatus("Error: " + err.message, "error");
  } finally {
    clsBusy = false; clsEls.btn.disabled = false;
  }
}

clsEls.btn.addEventListener("click", classify);
