const textarea = document.getElementById("looseLeaves");
const display = document.getElementById("looseLeavesDisplay");
const saveStatus = document.getElementById("saveStatus");
const clearButton = document.getElementById("clearNotes");

const STORAGE_KEY = "archive-loose-leaves-v1";

let saveTimer;

/* ---------- load ---------- */

const savedNotes = localStorage.getItem(STORAGE_KEY) || "";
textarea.value = savedNotes;

renderDisplay(savedNotes);

if (savedNotes.trim()) {
  showDisplay();
} else {
  showEditor();
}

/* ---------- save ---------- */

textarea.addEventListener("input", () => {
  saveStatus.textContent = "saving…";

  clearTimeout(saveTimer);

  saveTimer = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, textarea.value);
    saveStatus.textContent = "saved locally";
  }, 300);
});

/* ---------- switching views ---------- */

textarea.addEventListener("blur", () => {
  const value = textarea.value;

  localStorage.setItem(STORAGE_KEY, value);
  saveStatus.textContent = "saved locally";

  renderDisplay(value);

  if (value.trim()) {
    showDisplay();
  }
});

display.addEventListener("click", event => {
  /*
    Clicking a URL should open the link.
    Clicking anywhere else returns to editing.
  */
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

/* ---------- clear ---------- */

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

/* ---------- rendering ---------- */

function renderDisplay(text) {
  display.innerHTML = "";

  if (!text.trim()) {
    return;
  }

  const lines = text.split("\n");

  lines.forEach(line => {
    const trimmed = line.trim();

    /*
      Blank lines remain subtle spacing between notes.
    */
    if (!trimmed) {
      const spacer = document.createElement("div");
      spacer.className = "leaf-spacer";
      display.appendChild(spacer);
      return;
    }

    /*
      If an entire line is a URL, turn it into a clean bookmark-style leaf.
    */
    if (isUrl(trimmed)) {
      display.appendChild(createUrlLeaf(trimmed));
      return;
    }

    /*
      Ordinary written notes remain unchanged.
    */
    const note = document.createElement("div");
    note.className = "leaf-note";
    note.textContent = line;

    display.appendChild(note);
  });
}

function createUrlLeaf(url) {
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.className = "leaf-link";

  const info = describeUrl(url);

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
  source.textContent = info.source;

  text.appendChild(label);
  text.appendChild(source);

  const arrow = document.createElement("span");
  arrow.className = "leaf-arrow";
  arrow.textContent = "↗";

  anchor.appendChild(marker);
  anchor.appendChild(text);
  anchor.appendChild(arrow);

  return anchor;
}

function describeUrl(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");

    /* Substack */
    if (hostname === "substack.com" || hostname.endsWith(".substack.com")) {
      const pathParts = parsed.pathname
        .split("/")
        .filter(Boolean);

      const handle =
        pathParts.find(part => part.startsWith("@")) ||
        (hostname.endsWith(".substack.com")
          ? `@${hostname.replace(".substack.com", "")}`
          : "");

      return {
        label: handle
          ? `Substack · ${handle}`
          : "Substack",
        source: "saved reading"
      };
    }

    /* YouTube */
    if (
      hostname.includes("youtube.com") ||
      hostname === "youtu.be"
    ) {
      return {
        label: "YouTube",
        source: "video"
      };
    }

    /* AO3 */
    if (hostname.includes("archiveofourown.org")) {
      return {
        label: "Archive of Our Own",
        source: "saved work"
      };
    }

    /* Goodreads */
    if (hostname.includes("goodreads.com")) {
      return {
        label: "Goodreads",
        source: "book"
      };
    }

    /*
      Generic website:
      example.com -> Example
    */
    const domainName = hostname
      .split(".")[0]
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, letter => letter.toUpperCase());

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

function isUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/* ---------- helpers ---------- */

function showDisplay() {
  textarea.hidden = true;
  display.hidden = false;
}

function showEditor() {
  display.hidden = true;
  textarea.hidden = false;
}
