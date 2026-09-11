const textarea = document.getElementById("looseLeaves");
const display = document.getElementById("looseLeavesDisplay");
const saveStatus = document.getElementById("saveStatus");
const clearButton = document.getElementById("clearNotes");

const STORAGE_KEY = "archive-loose-leaves-v1";
const CAPTURED_KEY = "archive-loose-leaves-captured-v1";

const EDIFICE_CAPTURE_URL =
  "https://archive-edifice.crystalroses44.workers.dev/capture";

let saveTimer;


/* =========================================
   LOAD
   ========================================= */

const savedNotes = localStorage.getItem(STORAGE_KEY) || "";
textarea.value = savedNotes;

renderDisplay(savedNotes);

if (savedNotes.trim()) {
  showDisplay();
} else {
  showEditor();
}


/* =========================================
   SAVE
   ========================================= */

textarea.addEventListener("input", () => {
  saveStatus.textContent = "saving…";

  clearTimeout(saveTimer);

  saveTimer = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, textarea.value);
    saveStatus.textContent = "saved locally";
  }, 300);
});


/* =========================================
   SAVE + CAPTURE WHEN LEAVING EDIT MODE
   ========================================= */

textarea.addEventListener("blur", async () => {
  const value = textarea.value;

  localStorage.setItem(STORAGE_KEY, value);
  saveStatus.textContent = "saved locally";

  renderDisplay(value);

  if (value.trim()) {
    showDisplay();
  }

  await captureUrlsFromText(value);

  renderDisplay(value);
});


/* =========================================
   CLICK DISPLAY TO EDIT
   ========================================= */

display.addEventListener("click", event => {
  if (event.target.closest("a")) return;

  showEditor();
  textarea.focus();
});


display.addEventListener("keydown", event => {
  if (event.key === "Enter" || event.key === " ") {
    if (!event.target.closest("a")) {
      event.preventDefault();

      showEditor();
      textarea.focus();
    }
  }
});


/* =========================================
   CLEAR
   ========================================= */

clearButton.addEventListener("click", () => {
  textarea.value = "";

  localStorage.removeItem(STORAGE_KEY);

  renderDisplay("");
  showEditor();

  saveStatus.textContent = "cleared";

  setTimeout(() => {
    saveStatus.textContent = "saved locally";
  }, 1200);

  textarea.focus();
});


/* =========================================
   RENDER DISPLAY
   ========================================= */

function renderDisplay(text) {
  display.innerHTML = "";

  if (!text.trim()) {
    return;
  }

  const lines = text.split("\n");

  lines.forEach(line => {
    const trimmed = line.trim();

    if (!trimmed) {
      const spacer = document.createElement("div");
      spacer.className = "leaf-spacer";

      display.appendChild(spacer);
      return;
    }

    if (isUrl(trimmed)) {
      display.appendChild(createUrlLeaf(trimmed));
      return;
    }

    const note = document.createElement("div");

    note.className = "leaf-note";
    note.textContent = line;

    display.appendChild(note);
  });
}


/* =========================================
   CREATE CLEAN URL LEAF
   ========================================= */

function createUrlLeaf(url) {
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.className = "leaf-link";

  const info = describeUrl(url);
  const capture = getCaptureRecord(url);

  const marker = document.createElement("span");
  marker.className = "leaf-marker";
  marker.textContent = "✦";

  const text = document.createElement("span");
  text.className = "leaf-link-text";

  const label = document.createElement("span");
  label.className = "leaf-link-label";
  label.textContent = info.label;

  const source = document.createElement("span");
  source.className = "leaf-link-source";

  if (capture?.status === "archived") {
    source.textContent = `${info.source} · archived`;
  } else if (capture?.status === "capturing") {
    source.textContent = `${info.source} · archiving…`;
  } else if (capture?.status === "error") {
    source.textContent = `${info.source} · not archived`;
  } else {
    source.textContent = info.source;
  }

  text.appendChild(label);
  text.appendChild(source);

  const arrow = document.createElement("span");
  arrow.className = "leaf-arrow";

  if (capture?.status === "archived") {
    arrow.textContent = "✓";
  } else {
    arrow.textContent = "↗";
  }

  anchor.appendChild(marker);
  anchor.appendChild(text);
  anchor.appendChild(arrow);

  return anchor;
}


/* =========================================
   CAPTURE URLS INTO THE EDIFICE
   ========================================= */

async function captureUrlsFromText(text) {
  const urls = text
    .split("\n")
    .map(line => line.trim())
    .filter(line => isUrl(line));

  for (const url of urls) {
    const existingRecord = getCaptureRecord(url);

    if (existingRecord?.status === "archived") {
      continue;
    }

    setCaptureRecord(url, {
      status: "capturing"
    });

    renderDisplay(text);

    try {
      const response = await fetch(
        EDIFICE_CAPTURE_URL,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            url
          })
        }
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error || "Could not archive source."
        );
      }

      setCaptureRecord(url, {
        status: "archived",
        duplicate: Boolean(result.duplicate),
        notionUrl: result.notionUrl || "",
        pageId: result.pageId || ""
      });

    } catch (error) {
      console.error(
        "Loose Leaves capture failed:",
        error
      );

      setCaptureRecord(url, {
        status: "error"
      });
    }

    renderDisplay(text);
  }
}


/* =========================================
   CAPTURE STORAGE
   ========================================= */

function getCapturedMap() {
  try {
    return JSON.parse(
      localStorage.getItem(CAPTURED_KEY) || "{}"
    );
  } catch {
    return {};
  }
}


function saveCapturedMap(map) {
  localStorage.setItem(
    CAPTURED_KEY,
    JSON.stringify(map)
  );
}


function getCaptureRecord(url) {
  const map = getCapturedMap();

  return map[normalizeLocalUrl(url)] || null;
}


function setCaptureRecord(url, record) {
  const map = getCapturedMap();

  const key = normalizeLocalUrl(url);

  map[key] = {
    ...map[key],
    ...record
  };

  saveCapturedMap(map);
}


/* =========================================
   LOCAL URL NORMALIZATION
   ========================================= */

function normalizeLocalUrl(value) {
  try {
    const url = new URL(value.trim());

    url.hash = "";

    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "utm_id",
      "gclid",
      "fbclid",
      "mc_cid",
      "mc_eid"
    ];

    trackingParams.forEach(param => {
      url.searchParams.delete(param);
    });

    url.searchParams.sort();

    return url.toString();

  } catch {
    return value.trim();
  }
}


/* =========================================
   URL DISPLAY HELPERS
   ========================================= */

function describeUrl(url) {
  try {
    const parsed = new URL(url);

    const hostname =
      parsed.hostname.replace(/^www\./, "");

    if (
      hostname === "substack.com" ||
      hostname.endsWith(".substack.com")
    ) {
      const pathParts = parsed.pathname
        .split("/")
        .filter(Boolean);

      const handle =
        pathParts.find(
          part => part.startsWith("@")
        ) ||
        (
          hostname.endsWith(".substack.com")
            ? `@${hostname.replace(
                ".substack.com",
                ""
              )}`
            : ""
        );

      return {
        label: handle
          ? `Substack · ${handle}`
          : "Substack",

        source: "saved reading"
      };
    }

    if (
      hostname.includes("youtube.com") ||
      hostname === "youtu.be"
    ) {
      return {
        label: "YouTube",
        source: "video"
      };
    }

    if (
      hostname.includes("archiveofourown.org")
    ) {
      return {
        label: "Archive of Our Own",
        source: "saved work"
      };
    }

    if (
      hostname.includes("goodreads.com")
    ) {
      return {
        label: "Goodreads",
        source: "book"
      };
    }

    const domainName = hostname
      .split(".")[0]
      .replace(/[-_]/g, " ")
      .replace(
        /\b\w/g,
        letter => letter.toUpperCase()
      );

    return {
      label: domainName,
      source: hostname
    };

  } catch {
    return {
      label: "Saved Link",
      source: "reference"
    };
  }
}


/* =========================================
   URL CHECK
   ========================================= */

function isUrl(value) {
  try {
    const url = new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );

  } catch {
    return false;
  }
}


/* =========================================
   VIEW HELPERS
   ========================================= */

function showDisplay() {
  textarea.hidden = true;
  display.hidden = false;
}


function showEditor() {
  display.hidden = true;
  textarea.hidden = false;
}
