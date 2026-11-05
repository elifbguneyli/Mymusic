const form = document.getElementById("generate-form");
const customModeToggle = document.getElementById("customMode");
const customFields = document.getElementById("custom-fields");
const submitBtn = document.getElementById("submit-btn");
const errorBox = document.getElementById("error");
const statusLine = document.getElementById("status-line");
const tracksEl = document.getElementById("tracks");
const creditsEl = document.getElementById("credits");

const TERMINAL_FAILURE_STATUSES = [
  "CREATE_TASK_FAILED",
  "GENERATE_AUDIO_FAILED",
  "CALLBACK_EXCEPTION",
  "SENSITIVE_WORD_ERROR",
];

const HTTP_CODE_MESSAGES = {
  400: "Invalid parameters — please check your inputs.",
  401: "Unauthorized — the server's SunoAPI key is missing or invalid.",
  404: "Invalid request path.",
  405: "Rate limit exceeded. Please wait and try again.",
  413: "Your prompt or style text is too long.",
  429: "Insufficient credits on the SunoAPI.org account.",
  430: "You're generating too quickly. Please slow down.",
  455: "SunoAPI.org is under maintenance. Try again shortly.",
  500: "Server error. Please try again.",
};

let pollTimer = null;

customModeToggle.addEventListener("change", () => {
  customFields.classList.toggle("hidden", !customModeToggle.checked);
});

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

function clearError() {
  errorBox.classList.add("hidden");
  errorBox.textContent = "";
}

function setStatus(text, spinning) {
  if (!text) {
    statusLine.classList.add("hidden");
    statusLine.innerHTML = "";
    return;
  }
  statusLine.classList.remove("hidden");
  statusLine.innerHTML = spinning
    ? `<span class="spinner"></span><span>${text}</span>`
    : `<span>${text}</span>`;
}

function renderTracks(sunoData) {
  if (!sunoData || sunoData.length === 0) return;
  tracksEl.innerHTML = "";
  for (const track of sunoData) {
    const card = document.createElement("div");
    card.className = "track-card";

    const cover = document.createElement("img");
    cover.className = "track-cover";
    cover.src = track.image_url || "";
    cover.alt = "";
    card.appendChild(cover);

    const info = document.createElement("div");
    info.className = "track-info";

    const title = document.createElement("p");
    title.className = "track-title";
    title.textContent = track.title || "Untitled";
    info.appendChild(title);

    const tags = document.createElement("p");
    tags.className = "track-tags";
    const duration = track.duration ? `${Math.round(track.duration)}s` : "";
    tags.textContent = [track.tags, duration].filter(Boolean).join(" · ");
    info.appendChild(tags);

    if (track.audio_url) {
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.src = track.audio_url;
      info.appendChild(audio);

      const links = document.createElement("div");
      links.className = "track-links";
      const download = document.createElement("a");
      download.href = track.audio_url;
      download.target = "_blank";
      download.rel = "noopener";
      download.textContent = "Download / open audio";
      links.appendChild(download);
      info.appendChild(links);
    } else {
      const pending = document.createElement("p");
      pending.className = "track-tags";
      pending.textContent = "Audio rendering…";
      info.appendChild(pending);
    }

    card.appendChild(info);
    tracksEl.appendChild(card);
  }
}

async function fetchCredits() {
  try {
    const res = await fetch("/.netlify/functions/credits");
    const body = await res.json();
    if (res.ok && body.code === 200) {
      creditsEl.textContent = `Credits: ${body.data}`;
    } else {
      creditsEl.textContent = "Credits: —";
    }
  } catch {
    creditsEl.textContent = "Credits: —";
  }
}

function stopPolling() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

async function pollTask(taskId, startedAt) {
  const MAX_WAIT_MS = 10 * 60 * 1000;

  try {
    const res = await fetch(`/.netlify/functions/status?taskId=${encodeURIComponent(taskId)}`);
    const body = await res.json();

    if (!res.ok || body.code !== 200) {
      showError(HTTP_CODE_MESSAGES[body.code] || body.msg || "Something went wrong while checking status.");
      setStatus(null);
      submitBtn.disabled = false;
      return;
    }

    const data = body.data || {};
    const status = data.status;
    const sunoData = data.response && data.response.sunoData;

    if (sunoData && sunoData.length) {
      renderTracks(sunoData);
    }

    if (status === "SUCCESS") {
      setStatus(null);
      submitBtn.disabled = false;
      fetchCredits();
      return;
    }

    if (TERMINAL_FAILURE_STATUSES.includes(status)) {
      showError(`Generation failed (${status}). ${data.errorMessage || ""}`.trim());
      setStatus(null);
      submitBtn.disabled = false;
      return;
    }

    if (Date.now() - startedAt > MAX_WAIT_MS) {
      showError("Generation is taking longer than expected. Please check back later.");
      setStatus(null);
      submitBtn.disabled = false;
      return;
    }

    const label =
      status === "FIRST_SUCCESS" || status === "TEXT_SUCCESS"
        ? "First track ready, finishing the rest…"
        : "Composing your song…";
    setStatus(label, true);
    pollTimer = setTimeout(() => pollTask(taskId, startedAt), 5000);
  } catch (err) {
    showError("Lost connection while checking status. Retrying…");
    pollTimer = setTimeout(() => pollTask(taskId, startedAt), 8000);
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();
  stopPolling();

  const customMode = customModeToggle.checked;
  const payload = {
    prompt: document.getElementById("prompt").value.trim(),
    customMode,
    instrumental: document.getElementById("instrumental").checked,
    model: document.getElementById("model").value,
  };

  if (customMode) {
    payload.title = document.getElementById("title").value.trim();
    payload.style = document.getElementById("style").value.trim();
    const lyrics = document.getElementById("lyrics").value.trim();
    if (lyrics) payload.lyrics = lyrics;
    const vocalGender = document.getElementById("vocalGender").value;
    if (vocalGender) payload.vocalGender = vocalGender;
    const negativeTags = document.getElementById("negativeTags").value.trim();
    if (negativeTags) payload.negativeTags = negativeTags;
  }

  submitBtn.disabled = true;
  tracksEl.innerHTML = "";
  setStatus("Sending your request…", true);

  try {
    const res = await fetch("/.netlify/functions/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();

    if (!res.ok || body.code !== 200) {
      showError(HTTP_CODE_MESSAGES[body.code] || body.msg || "Could not start generation.");
      setStatus(null);
      submitBtn.disabled = false;
      return;
    }

    const taskId = body.data.taskId;
    setStatus("Composing your song…", true);
    pollTask(taskId, Date.now());
  } catch (err) {
    showError("Could not reach the server. Please try again.");
    setStatus(null);
    submitBtn.disabled = false;
  }
});

fetchCredits();
