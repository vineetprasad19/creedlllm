// Semantic search / mini-RAG — embed each line + the question, rank lines by
// cosine similarity to the question. This is the "retrieve" half of RAG.

const ragEls = {
  docs: document.getElementById("ragDocs"),
  query: document.getElementById("ragQuery"),
  btn: document.getElementById("ragBtn"),
  status: document.getElementById("ragStatus"),
  result: document.getElementById("ragResult"),
};

let ragBusy = false;

function ragStatus(msg, kind) {
  ragEls.status.textContent = msg;
  ragEls.status.className = "cluster-status" + (kind ? " " + kind : "");
}

async function ragSearch() {
  const lines = ragEls.docs.value.split("\n").map((s) => s.trim()).filter(Boolean);
  const q = ragEls.query.value.trim();
  if (lines.length < 2 || !q) {
    ragStatus("Add a few lines of text and a question.", "error");
    ragEls.result.replaceChildren();
    return;
  }
  if (ragBusy) return;
  ragBusy = true; ragEls.btn.disabled = true;
  try {
    ragStatus("Embedding…", "busy");
    const vecs = await window.Embeddings.embed([q, ...lines], (pct) =>
      ragStatus(`Downloading model… ${pct}% (one-time, then cached)`, "busy"));
    const qv = vecs[0];
    const scored = lines
      .map((line, i) => ({ line, score: Math.max(0, window.Embeddings.cosine(qv, vecs[i + 1])) }))
      .sort((a, b) => b.score - a.score);
    renderRag(scored);
    ragStatus("Top match is highlighted — that's what a chatbot would read to answer.", "ready");
  } catch (err) {
    console.error(err);
    ragStatus("Error: " + err.message, "error");
  } finally {
    ragBusy = false; ragEls.btn.disabled = false;
  }
}

function renderRag(scored) {
  ragEls.result.replaceChildren();
  scored.forEach((s, i) => {
    const pct = Math.round(s.score * 100);
    const row = document.createElement("div");
    row.className = "metric-row" + (i === 0 ? " top" : "");
    const name = document.createElement("span");
    name.className = "metric-name metric-name-wide";
    name.textContent = s.line;
    const bar = document.createElement("span");
    bar.className = "metric-bar";
    const fill = document.createElement("span");
    fill.className = "metric-fill";
    fill.style.width = pct + "%";
    bar.appendChild(fill);
    const num = document.createElement("span");
    num.className = "metric-num";
    num.textContent = pct + "%";
    row.append(name, bar, num);
    ragEls.result.appendChild(row);
  });
}

ragEls.btn.addEventListener("click", ragSearch);
