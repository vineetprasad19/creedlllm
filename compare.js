// Tokenizer comparison — tokenize the same text with every encoding and show the
// counts side by side, so you can see how different model families (and different
// languages / emoji) cost different numbers of tokens. Uses the tiktoken
// instance already running in Pyodide via window.Tokenizer.

const COMPARE_ENCODINGS = [
  { id: "o200k_base", label: "GPT-4o / 4.1" },
  { id: "cl100k_base", label: "GPT-4 / 3.5" },
  { id: "p50k_base", label: "Codex / davinci" },
  { id: "r50k_base", label: "GPT-3" },
];

const compEls = {
  input: document.getElementById("compareInput"),
  result: document.getElementById("compareResult"),
  chips: document.querySelectorAll(".example-chips button"),
};

let compTimer = null;
let compBusy = false;
let compPending = false;

async function compareTokenizers() {
  if (!window.Tokenizer || !window.Tokenizer.ready) return;
  if (compBusy) { compPending = true; return; }
  compBusy = true;
  try {
    const text = compEls.input.value;
    const counts = [];
    for (const enc of COMPARE_ENCODINGS) {
      counts.push(await window.Tokenizer.count(enc.id, text));
    }
    renderCompare(counts, [...text].length);
  } catch (err) {
    console.error(err);
  } finally {
    compBusy = false;
    if (compPending) { compPending = false; compareTokenizers(); }
  }
}

function renderCompare(counts, chars) {
  const max = Math.max(1, ...counts);
  compEls.result.replaceChildren();
  COMPARE_ENCODINGS.forEach((enc, i) => {
    const ratio = chars ? (counts[i] / chars).toFixed(2) : "0";
    const row = document.createElement("div");
    row.className = "cmp-row";

    const name = document.createElement("span");
    name.className = "cmp-name";
    name.textContent = enc.label;

    const bar = document.createElement("span");
    bar.className = "cmp-bar";
    const fill = document.createElement("span");
    fill.className = "cmp-fill";
    fill.style.width = (counts[i] / max * 100).toFixed(1) + "%";
    bar.appendChild(fill);

    const num = document.createElement("span");
    num.className = "cmp-num";
    num.textContent = `${counts[i]} tok · ${ratio}/char`;

    row.append(name, bar, num);
    compEls.result.appendChild(row);
  });
}

function scheduleCompare() {
  clearTimeout(compTimer);
  compTimer = setTimeout(compareTokenizers, 200);
}

compEls.input.addEventListener("input", scheduleCompare);
compEls.chips.forEach((ch) =>
  ch.addEventListener("click", () => { compEls.input.value = ch.dataset.ex; compareTokenizers(); }));

function initCompare() {
  if (!compEls.input.value) {
    compEls.input.value = "The quick brown fox jumps over the lazy dog.";
  }
  compareTokenizers();
}

if (window.Tokenizer && window.Tokenizer.ready) initCompare();
else window.Tokenizer.onReady = initCompare;
