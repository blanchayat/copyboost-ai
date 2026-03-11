const inputEl = document.getElementById("input-text");
const outputEl = document.getElementById("output-text");
const optimizeBtn = document.getElementById("optimize-btn");
const clearBtn = document.getElementById("clear-btn");
const copyBtn = document.getElementById("copy-btn");
const copyLabelEl = document.getElementById("copy-label");
const statusLabel = document.getElementById("status-label");

const toneEl = document.getElementById("tone");
const focusEl = document.getElementById("focus");
const platformEl = document.getElementById("platform");
const languageEl = document.getElementById("language");

const apiProviderEl = document.getElementById("api-provider");
const apiEndpointEl = document.getElementById("api-endpoint");
const apiModelEl = document.getElementById("api-model");
const apiKeyEl = document.getElementById("api-key");
const saveApiBtn = document.getElementById("save-api-btn");

const csvInputEl = document.getElementById("csv-input");
const processCsvBtn = document.getElementById("process-csv-btn");
const downloadCsvBtn = document.getElementById("download-csv-btn");
const csvStatusEl = document.getElementById("csv-status");

const STORAGE_KEY = "ai-product-optimizer-settings";

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed.apiProvider && apiProviderEl) apiProviderEl.value = parsed.apiProvider;
    if (parsed.apiEndpoint && apiEndpointEl) apiEndpointEl.value = parsed.apiEndpoint;
    if (parsed.apiModel && apiModelEl) apiModelEl.value = parsed.apiModel;
    if (parsed.apiKey && apiKeyEl) apiKeyEl.value = parsed.apiKey;
  } catch (e) {
    console.warn("Unable to load settings from localStorage", e);
  }
}

function saveSettings() {
  const data = {
    apiProvider: apiProviderEl ? apiProviderEl.value : "anthropic",
    apiEndpoint: apiEndpointEl ? apiEndpointEl.value.trim() : "",
    apiModel: apiModelEl ? apiModelEl.value.trim() : "",
    apiKey: apiKeyEl.value.trim(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    flashStatus("API settings saved locally", "idle");
  } catch (e) {
    console.warn("Unable to save settings", e);
    flashStatus("Could not save settings", "error");
  }
}

function setStatus(text, type) {
  statusLabel.textContent = text;
  statusLabel.classList.remove("status-idle", "status-loading", "status-error");
  switch (type) {
    case "loading":
      statusLabel.classList.add("status-loading");
      break;
    case "error":
      statusLabel.classList.add("status-error");
      break;
    default:
      statusLabel.classList.add("status-idle");
  }
}

let statusTimeout;
function flashStatus(text, type, ms = 2200) {
  if (statusTimeout) {
    clearTimeout(statusTimeout);
  }
  setStatus(text, type);
  statusTimeout = setTimeout(() => setStatus("Ready", "idle"), ms);
}

function setLoading(isLoading) {
  if (isLoading) {
    optimizeBtn.classList.add("loading");
    optimizeBtn.disabled = true;
    setStatus("Optimizing…", "loading");
  } else {
    optimizeBtn.classList.remove("loading");
    optimizeBtn.disabled = false;
    setStatus("Ready", "idle");
  }
}

function systemPrompt(tone, focus) {
  const toneLabelMap = {
    default: "balanced, professional",
    friendly: "friendly, conversational",
    luxury: "premium, luxurious",
    energetic: "bold, energetic",
  };
  const focusLabelMap = {
    balanced: "balanced for conversion and SEO",
    conversion: "conversion-first (high intent, persuasive, reduces objections)",
    seo: "SEO-first (natural keyword usage, avoids stuffing, scannable)",
  };

  const platformGuidelines = {
    generic:
      "Standard DTC product page. Emphasise clarity, benefits, and fast scanning.",
    trendyol:
      "Trendyol marketplace listing. Respect character limits, keep bullets concise, avoid unsupported claims, and highlight key attributes shoppers filter by.",
    amazon:
      "Amazon listing. Think in terms of title, bullet points, and description. Avoid prohibited claims, comparison language, and health/medical guarantees.",
    shopify:
      "Shopify product page. You can use slightly richer storytelling, but keep skimmability with strong headings and bullets.",
    temu:
      "Temu marketplace listing. Keep descriptions simple, direct, and focused on value and price-conscious shoppers.",
  };

  const languageLabelMap = {
    en: "English",
    tr: "Turkish",
    de: "German",
  };

  return `
You are a senior direct-response e-commerce copywriter and SEO specialist.

Goal: rewrite product descriptions so they are persuasive, premium, and highly scannable—without inventing facts.

Voice & focus:
- Tone: ${toneLabelMap[tone] || toneLabelMap.default}
- Strategy: ${focusLabelMap[focus] || focusLabelMap.balanced}

Platform context:
- Platform type: {platform}
- Guidelines: {platformGuidelines}

Language:
- Write the entire output in natural, fluent {languageName}. Do not mix in other languages unless present in the source.

Non-negotiables:
- Do NOT fabricate: no made-up materials, dimensions, compatibility, performance claims, certifications, warranties, shipping, discounts, or guarantees.
- If specifics are missing, avoid guessing; write benefit-led but generic-safe phrasing.
- Avoid clichés (“game changer”, “best ever”, “must-have”) unless the source already uses them.
- Keep it skimmable and shopper-friendly.

Output format (return ONLY this; no preface, no analysis):
1) Headline (one punchy line)
2) Subheadline (one line emotional hook + outcome)
3) Benefits (4–7 bullets). Each bullet must start with **Benefit phrase** then a short explanation.
4) Why you’ll love it (2–3 short sentences: emotional + practical)
5) SEO keywords: 6–12 keywords/phrases, comma-separated (infer from the source; keep natural)
6) Perfect for: 3–6 audiences or use-cases, comma-separated
7) CTA: one low-pressure sentence

Length target: 140–260 words.
`.trim();
}

function userPrompt(rawText, platform, language) {
  return [
    "Rewrite this product description for the specified platform and language.",
    "",
    `Platform: ${platform || "generic"}`,
    `Language: ${language || "en"}`,
    "",
    "Source description:",
    `"""`,
    rawText.trim(),
    `"""`,
  ].join("\n");
}

async function optimizeWithAnthropic(rawText, tone, focus, platform, language, endpoint, apiKey, model) {
  // Always use local proxy; do not call Anthropic directly from the browser
  const url = "http://localhost:4000/anthropic";

  const system = systemPrompt(tone, focus)
    .replace("{platform}", platform || "generic product page")
    .replace(
      "{platformGuidelines}",
      platform === "trendyol"
        ? "Trendyol marketplace listing. Respect local regulations, avoid medical/health claims, and keep bullets short and clear."
        : platform === "amazon"
        ? "Amazon marketplace listing. Follow Amazon style: clear benefit-led bullets, no prohibited claims, no external URLs or promotions, and avoid all-caps."
        : platform === "shopify"
        ? "Shopify DTC store page. You can be a bit more narrative, but keep structure: strong headline, benefit bullets, and concise paragraphs."
        : platform === "temu"
        ? "Temu marketplace listing. Focus on simple, price-conscious value language and clear benefits."
        : "Generic e-commerce product page. Emphasise clear benefits, key features, and easy scanning."
    )
    .replace(
      "{languageName}",
      language === "tr" ? "Turkish" : language === "de" ? "German" : "English"
    );

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      max_tokens: 650,
      temperature: 0.7,
      system,
      messages: [{ role: "user", content: userPrompt(rawText, platform, language) }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `API error (${response.status}): ${text.slice(0, 200) || "Unknown error"}`
    );
  }

  const data = await response.json();
  const content = data && data.content;
  const firstText = Array.isArray(content)
    ? content.find((c) => c && c.type === "text" && typeof c.text === "string")
    : null;

  if (!firstText || !firstText.text) {
    throw new Error("Unexpected API response format.");
  }
  return firstText.text.trim();
}

function localRewrite(rawText, tone, focus) {
  const text = rawText.trim();
  if (!text) return "";

  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);

  const title =
    sentences[0] && sentences[0].length < 140
      ? sentences[0]
      : "Discover your next best‑selling product";

  const rest = sentences.slice(1).join(" ");

  const bullets = rest
    .split(/(?:,|;|•|-|\n)+/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 18)
    .slice(0, 6);

  const toneTag =
    tone === "friendly"
      ? "friendly and approachable"
      : tone === "luxury"
      ? "premium and refined"
      : tone === "energetic"
      ? "bold and energetic"
      : "clear and professional";

  const focusLine =
    focus === "conversion"
      ? "Designed to remove friction and highlight the value that matters most to your shoppers."
      : focus === "seo"
      ? "Structured with natural keywords that help you stand out in search without sounding robotic."
      : "Balanced to both convert visitors and support healthy search performance.";

  const lines = [];
  lines.push(`### ${title}`);
  lines.push("");
  lines.push(
    `Present this product in a ${toneTag} way that feels on‑brand and easy to scan.`
  );
  lines.push(focusLine);
  lines.push("");

  if (bullets.length) {
    lines.push("Key benefits:");
    bullets.forEach((b) => {
      const cleaned = b.replace(/^[•\-–]+/, "").trim();
      lines.push(`- ${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}`);
    });
    lines.push("");
  }

  if (rest) {
    lines.push("Details:");
    lines.push(rest);
  }

  return lines.join("\n");
}

async function handleOptimizeClick() {
  const rawText = inputEl.value;
  if (!rawText.trim()) {
    flashStatus("Please paste a product description first", "error");
    inputEl.focus();
    return;
  }

  const tone = toneEl.value;
  const focus = focusEl.value;
  const platform = platformEl ? platformEl.value : "generic";
  const language = languageEl ? languageEl.value : "en";

  const endpoint = apiEndpointEl.value.trim();
  const model = apiModelEl ? apiModelEl.value.trim() : "";
  const apiKey = apiKeyEl.value.trim();

  setLoading(true);
  outputEl.value = "";

  try {
    let optimized;
    if (apiKey) {
      optimized = await optimizeWithAnthropic(
        rawText,
        tone,
        focus,
        platform,
        language,
        endpoint,
        apiKey,
        model
      );
    } else {
      optimized = localRewrite(rawText, tone, focus);
      flashStatus("Used local rewrite (no API key set)", "idle", 2600);
    }
    outputEl.value = optimized;
    copyLabelEl.textContent = "Copy optimized text";
  } catch (err) {
    console.error(err);
    flashStatus("Something went wrong while optimizing", "error", 3500);
  } finally {
    setLoading(false);
  }
}

async function optimizeSingleDescription(rawText) {
  const tone = toneEl.value;
  const focus = focusEl.value;
  const platform = platformEl ? platformEl.value : "generic";
  const language = languageEl ? languageEl.value : "en";
  const endpoint = apiEndpointEl ? apiEndpointEl.value.trim() : "";
  const model = apiModelEl ? apiModelEl.value.trim() : "";
  const apiKey = apiKeyEl ? apiKeyEl.value.trim() : "";

  if (apiKey) {
    return optimizeWithAnthropic(
      rawText,
      tone,
      focus,
      platform,
      language,
      endpoint,
      apiKey,
      model
    );
  }
  return localRewrite(rawText, tone, focus);
}

function parseCsvSimple(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return { header: [], rows: [] };
  const header = lines[0].split(",");
  const rows = lines.slice(1).map((line) => line.split(","));
  return { header, rows };
}

function detectDescriptionIndex(header) {
  if (!header || !header.length) return 0;
  const lower = header.map((h) => h.trim().toLowerCase());
  const idx = lower.indexOf("description");
  if (idx !== -1) return idx;
  // Fallback: use last column
  return header.length - 1;
}

let lastCsvResult = null;

async function handleProcessCsv() {
  const file = csvInputEl && csvInputEl.files && csvInputEl.files[0];
  if (!file) {
    csvStatusEl.textContent = "Please choose a CSV file first.";
    return;
  }

  if (!window.FileReader) {
    csvStatusEl.textContent = "Your browser does not support FileReader for CSV processing.";
    return;
  }

  processCsvBtn.disabled = true;
  downloadCsvBtn.disabled = true;
  csvStatusEl.textContent = "Reading CSV file…";

  const text = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  }).catch((err) => {
    console.error(err);
    csvStatusEl.textContent = "Failed to read CSV file.";
    processCsvBtn.disabled = false;
  });

  if (!text && text !== "") return;

  const { header, rows } = parseCsvSimple(text);
  if (!rows.length) {
    csvStatusEl.textContent = "CSV has no data rows.";
    processCsvBtn.disabled = false;
    return;
  }

  const descIdx = detectDescriptionIndex(header);
  const outHeader = [...header, "optimized_description"];
  const outRows = [];

  csvStatusEl.textContent = `Optimizing 0 / ${rows.length} products…`;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const descriptionParts = row.slice(descIdx);
    const rawDesc = descriptionParts.join(",").trim();
    if (!rawDesc) {
      outRows.push([...row, ""]);
      csvStatusEl.textContent = `Skipped empty description (${i + 1} / ${rows.length})…`;
      continue;
    }
    try {
      const optimized = await optimizeSingleDescription(rawDesc);
      outRows.push([...row, optimized]);
      csvStatusEl.textContent = `Optimized ${i + 1} / ${rows.length} products…`;
    } catch (err) {
      console.error("Bulk optimize error for row", i, err);
      outRows.push([...row, ""]);
      csvStatusEl.textContent = `Error on row ${i + 1}; continuing (${i + 1} / ${rows.length})…`;
    }
  }

  lastCsvResult = { header: outHeader, rows: outRows };
  csvStatusEl.textContent = `Done. Optimized ${rows.length} products. You can now download the CSV.`;
  downloadCsvBtn.disabled = false;
  processCsvBtn.disabled = false;
}

function handleDownloadCsv() {
  if (!lastCsvResult) return;
  const { header, rows } = lastCsvResult;
  const escape = (value) => {
    const v = value == null ? "" : String(value);
    if (/[",\n\r]/.test(v)) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const lines = [];
  lines.push(header.map(escape).join(","));
  rows.forEach((row) => {
    lines.push(row.map(escape).join(","));
  });

  const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "copyboost-ai-optimized.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function handleCopyClick() {
  const text = outputEl.value.trim();
  if (!text) {
    flashStatus("Nothing to copy yet", "error");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    copyLabelEl.textContent = "Copied!";
    setTimeout(() => {
      copyLabelEl.textContent = "Copy optimized text";
    }, 2000);
  } catch (e) {
    console.error("Clipboard copy failed", e);
    flashStatus("Could not copy to clipboard", "error");
  }
}

function handleClearClick() {
  inputEl.value = "";
  outputEl.value = "";
  copyLabelEl.textContent = "Copy optimized text";
  setStatus("Ready", "idle");
  inputEl.focus();
}

optimizeBtn.addEventListener("click", () => {
  if (optimizeBtn.disabled) return;
  handleOptimizeClick();
});

copyBtn.addEventListener("click", handleCopyClick);
clearBtn.addEventListener("click", handleClearClick);

if (processCsvBtn && csvInputEl && csvStatusEl) {
  processCsvBtn.addEventListener("click", (e) => {
    e.preventDefault();
    handleProcessCsv();
  });
}

if (downloadCsvBtn) {
  downloadCsvBtn.addEventListener("click", (e) => {
    e.preventDefault();
    handleDownloadCsv();
  });
}

saveApiBtn.addEventListener("click", (e) => {
  e.preventDefault();
  saveSettings();
});

inputEl.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "enter") {
    e.preventDefault();
    if (!optimizeBtn.disabled) {
      handleOptimizeClick();
    }
  }
});

document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
  if (apiProviderEl && !apiProviderEl.value) apiProviderEl.value = "anthropic";
  if (apiEndpointEl && !apiEndpointEl.value) apiEndpointEl.value = "http://localhost:4000/anthropic";
  if (apiModelEl && !apiModelEl.value) apiModelEl.value = "claude-haiku-4-5-20251001";
  setStatus("Ready", "idle");
});

