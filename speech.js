// Speech-to-text — records mic audio and transcribes it with Whisper (tiny) in
// the browser. Demonstrates audio AI / multimodality: sound -> numbers -> tokens.

const ASR_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.3";
const ASR_MODEL = "Xenova/whisper-tiny.en";

const spEls = {
  btn: document.getElementById("micBtn"),
  status: document.getElementById("micStatus"),
  result: document.getElementById("micResult"),
};

let _asr = null, _asrLoading = null;
let _recorder = null, _chunks = [], _recording = false, _stream = null;

function spStatus(msg, kind) {
  spEls.status.textContent = msg;
  spEls.status.className = "cluster-status" + (kind ? " " + kind : "");
}

async function getAsr() {
  if (_asr) return _asr;
  if (_asrLoading) return _asrLoading;
  _asrLoading = (async () => {
    const { pipeline, env } = await import(ASR_URL);
    env.allowLocalModels = false;
    _asr = await pipeline("automatic-speech-recognition", ASR_MODEL, {
      progress_callback: (p) => {
        if (p.status === "progress" && p.total) {
          spStatus(`Downloading model… ${Math.round((p.loaded / p.total) * 100)}% (one-time, then cached)`, "busy");
        }
      },
    });
    return _asr;
  })();
  return _asrLoading;
}

// Decode a recorded audio blob to mono 16 kHz Float32 samples (what Whisper wants).
async function toPcm16k(blob) {
  const ab = await blob.arrayBuffer();
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const decoded = await ctx.decodeAudioData(ab);
  ctx.close();
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}

async function startRecording() {
  try {
    _stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    spStatus("Microphone access denied or unavailable.", "error");
    return;
  }
  _chunks = [];
  _recorder = new MediaRecorder(_stream);
  _recorder.ondataavailable = (e) => { if (e.data.size) _chunks.push(e.data); };
  _recorder.onstop = transcribe;
  _recorder.start();
  _recording = true;
  spEls.btn.textContent = "⏹ Stop & transcribe";
  spEls.btn.classList.add("recording");
  spStatus("Recording… speak now, then click stop.", "busy");
}

function stopRecording() {
  _recording = false;
  spEls.btn.textContent = "🎤 Start recording";
  spEls.btn.classList.remove("recording");
  if (_recorder && _recorder.state !== "inactive") _recorder.stop();
  if (_stream) _stream.getTracks().forEach((t) => t.stop());
}

async function transcribe() {
  try {
    spStatus("Loading model…", "busy");
    const model = await getAsr();
    spStatus("Transcribing…", "busy");
    const blob = new Blob(_chunks);
    const pcm = await toPcm16k(blob);
    const out = await model(pcm);
    spEls.result.textContent = (out.text || "").trim() || "(nothing heard — try again)";
    spStatus("", "hidden");
  } catch (err) {
    console.error(err);
    spStatus("Error: " + err.message, "error");
  }
}

spEls.btn.addEventListener("click", () => {
  if (_recording) stopRecording();
  else startRecording();
});
