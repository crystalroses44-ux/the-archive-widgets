const textarea = document.getElementById("looseLeaves");
const display = document.getElementById("looseLeavesDisplay");
const saveStatus = document.getElementById("saveStatus");
const clearButton = document.getElementById("clearNotes");

const STORAGE_KEY = "archive-loose-leaves-v1";
const CAPTURED_KEY = "archive-loose-leaves-captured-v1";

const EDIFICE_CAPTURE_URL =
  "https://archive-edifice.crystalroses44.workers.dev/capture";

const ART_CAPTURE_URL =
  "https://archive-art-repository.crystalroses44.workers.dev/capture";

let saveTimer;


/* =========================================
   ROUTING CONTROL STYLES
   ========================================= */

injectRoutingStyles();


/* =========================================
   LOAD
   ========================================= */

const savedNotes =
  localStorage.getItem(STORAGE_KEY) || "";

textarea.value = savedNotes;

migrateOldCaptureRecords();

renderDisplay(savedNotes);

if (savedNotes.trim()) {
  showDisplay();
} else {
  showEditor();
}


/* =========================================
   AUTOSAVE
   ========================================= */

textarea.addEventListener("input", () => {
  saveStatus.textContent = "saving…";

  clearTimeout(saveTimer);

  saveTimer = setTimeout(() => {
    const value = textarea.value;

    localStorage.setItem(
      STORAGE_KEY,
      value
    );

    saveStatus.textContent =
      "saved locally";

    renderDisplay(value);
  }, 1000);
});


/* =========================================
   WHEN LEAVING EDIT MODE
   ========================================= */

textarea.addEventListener(
  "blur",
  () => {
    clearTimeout(saveTimer);

    const value = textarea.value;

    localStorage.setItem(
      STORAGE_KEY,
      value
    );

    saveStatus.textContent =
      "saved locally";

    renderDisplay(value);

    if (value.trim()) {
      showDisplay();
    }
  }
);


/* =========================================
   CLICK DISPLAY TO EDIT
   ========================================= */

display.addEventListener(
  "click",
  event => {
    /*
      Links and destination buttons
      stay interactive.

      Clicking anywhere else opens
      the editor.
    */

    if (
      event.target.closest("a") ||
      event.target.closest("button")
    ) {
      return;
    }

    showEditor();
    textarea.focus();
  }
);


display.addEventListener(
  "keydown",
  event => {
    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      if (
        !event.target.closest("a") &&
        !event.target.closest("button")
      ) {
        event.preventDefault();

        showEditor();
        textarea.focus();
      }
    }
  }
);


/* =========================================
   CLEAR
   ========================================= */

clearButton.addEventListener(
  "click",
  () => {
    clearTimeout(saveTimer);

    textarea.value = "";

    localStorage.removeItem(
      STORAGE_KEY
    );

    renderDisplay("");
    showEditor();

    saveStatus.textContent =
      "cleared";

    setTimeout(() => {
      saveStatus.textContent =
        "saved locally";
    }, 1200);

    textarea.focus();
  }
);


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


    /* Blank line */

    if (!trimmed) {
      const spacer =
        document.createElement("div");

      spacer.className =
        "leaf-spacer";

      display.appendChild(spacer);

      return;
    }


    /* URL on its own line */

    if (isUrl(trimmed)) {
      display.appendChild(
        createUrlLeaf(trimmed)
      );

      return;
    }


    /* Regular note */

    const note =
      document.createElement("div");

    note.className =
      "leaf-note";

    note.textContent = line;

    display.appendChild(note);
  });
}


/* =========================================
   URL LEAF
   ========================================= */

function createUrlLeaf(url) {
  const wrapper =
    document.createElement("div");

  wrapper.className =
    "leaf-resource";


  const anchor =
    document.createElement("a");

  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel =
    "noopener noreferrer";

  anchor.className =
    "leaf-link";


  const info =
    describeUrl(url);

  const capture =
    getCaptureRecord(url);


  /* Gold star */

  const marker =
    document.createElement("span");

  marker.className =
    "leaf-marker";

  marker.textContent = "✦";


  /* Text stack */

  const text =
    document.createElement("span");

  text.className =
    "leaf-link-text";


  const label =
    document.createElement("span");

  label.className =
    "leaf-link-label";

  label.textContent =
    info.label;


  const source =
    document.createElement("span");

  source.className =
    "leaf-link-source";


  if (
    capture?.status === "archived"
  ) {
    const destinationLabel =
      capture.destination === "art"
        ? "Art Repository"
        : "Edifice";

    if (capture.duplicate) {
      source.textContent =
        `${info.source} · already in ${destinationLabel}`;
    } else {
      source.textContent =
        `${info.source} · archived to ${destinationLabel}`;
    }

  } else if (
    capture?.status === "capturing"
  ) {
    const destinationLabel =
      capture.destination === "art"
        ? "Art Repository"
        : "Edifice";

    source.textContent =
      `${info.source} · sending to ${destinationLabel}…`;

  } else if (
    capture?.status === "error"
  ) {
    source.textContent =
      `${info.source} · archive failed`;

  } else {
    source.textContent =
      info.source;
  }


  text.appendChild(label);
  text.appendChild(source);


  /* Right-side symbol */

  const arrow =
    document.createElement("span");

  arrow.className =
    "leaf-arrow";

  if (
    capture?.status === "archived"
  ) {
    arrow.textContent = "✓";
  } else {
    arrow.textContent = "↗";
  }


  anchor.appendChild(marker);
  anchor.appendChild(text);
  anchor.appendChild(arrow);

  wrapper.appendChild(anchor);


  /* =====================================
     DESTINATION CHOICES
     ===================================== */

  if (
    capture?.status !== "archived" &&
    capture?.status !== "capturing"
  ) {
    const routing =
      document.createElement("div");

    routing.className =
      "leaf-routing";


    const edificeButton =
      createRouteButton(
        "Edifice",
        "edifice",
        url
      );


    const separator =
      document.createElement("span");

    separator.className =
      "leaf-routing-separator";

    separator.textContent = "·";


    const artButton =
      createRouteButton(
        "Art Repository",
        "art",
        url
      );


    routing.appendChild(
      edificeButton
    );

    routing.appendChild(
      separator
    );

    routing.appendChild(
      artButton
    );

    wrapper.appendChild(
      routing
    );
  }


  return wrapper;
}


/* =========================================
   ROUTE BUTTON
   ========================================= */

function createRouteButton(
  label,
  destination,
  url
) {
  const button =
    document.createElement("button");

  button.type = "button";

  button.className =
    "leaf-route-button";

  button.textContent = label;


  button.addEventListener(
    "click",
    async event => {
      event.preventDefault();
      event.stopPropagation();

      await captureToDestination(
        url,
        destination
      );
    }
  );


  return button;
}


/* =========================================
   SEND TO CHOSEN ARCHIVE
   ========================================= */

async function captureToDestination(
  url,
  destination
) {
  const existing =
    getCaptureRecord(url);


  /*
    Prevent repeat clicks while
    a request is already running.
  */

  if (
    existing?.status === "capturing"
  ) {
    return;
  }


  /*
    Already archived.
  */

  if (
    existing?.status === "archived"
  ) {
    return;
  }


  const captureUrl =
    destination === "art"
      ? ART_CAPTURE_URL
      : EDIFICE_CAPTURE_URL;


  setCaptureRecord(
    url,
    {
      status: "capturing",
      destination
    }
  );


  renderDisplay(
    textarea.value
  );


  try {
    const response =
      await fetch(
        captureUrl,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            url
          })
        }
      );


    const result =
      await response.json();


    if (
      !response.ok ||
      !result.ok
    ) {
      throw new Error(
        result.error ||
        "Could not archive source."
      );
    }


    setCaptureRecord(
  url,
  {
    status: "archived",

    destination,

    duplicate:
      Boolean(
        result.duplicate
      ),

    notionUrl:
      result.notionUrl || "",

    pageId:
      result.pageId || "",

    resource:
      result.resource || "",

    creator:
      result.creator || "",

    type:
      result.type || ""
  }
);


  } catch (error) {
    console.error(
      destination === "art"
        ? "Loose Leaves → Art Repository:"
        : "Loose Leaves → Edifice:",
      error
    );


    setCaptureRecord(
      url,
      {
        status: "error",
        destination
      }
    );
  }


  renderDisplay(
    textarea.value
  );
}


/* =========================================
   ARCHIVE STATUS STORAGE
   ========================================= */

function getCapturedMap() {
  try {
    return JSON.parse(
      localStorage.getItem(
        CAPTURED_KEY
      ) || "{}"
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
  const map =
    getCapturedMap();

  return (
    map[
      normalizeLocalUrl(url)
    ] || null
  );
}


function setCaptureRecord(
  url,
  record
) {
  const map =
    getCapturedMap();

  const key =
    normalizeLocalUrl(url);

  map[key] = {
    ...map[key],
    ...record
  };

  saveCapturedMap(map);
}


/* =========================================
   MIGRATE OLD EDIFICE RECORDS
   ========================================= */

function migrateOldCaptureRecords() {
  const map =
    getCapturedMap();

  let changed = false;


  Object.keys(map).forEach(key => {
    const record = map[key];

    /*
      Before the destination picker
      existed, every archived URL
      automatically went to Edifice.

      Give those older records their
      proper destination label.
    */

    if (
      record?.status === "archived" &&
      !record.destination
    ) {
      record.destination =
        "edifice";

      changed = true;
    }
  });


  if (changed) {
    saveCapturedMap(map);
  }
}


/* =========================================
   URL NORMALIZATION
   ========================================= */

function normalizeLocalUrl(value) {
  try {
    const url =
      new URL(value.trim());

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


    trackingParams.forEach(
      param => {
        url.searchParams.delete(
          param
        );
      }
    );


    url.searchParams.sort();

    return url.toString();

  } catch {
    return value.trim();
  }
}


/* =========================================
   HUMAN-READABLE URL DISPLAY
   ========================================= */

function describeUrl(url) {
  try {
    const parsed =
      new URL(url);

    const hostname =
      parsed.hostname.replace(
        /^www\./,
        ""
      );


    /* Substack */

    if (
      hostname ===
        "substack.com" ||
      hostname.endsWith(
        ".substack.com"
      )
    ) {
      const pathParts =
        parsed.pathname
          .split("/")
          .filter(Boolean);


      const handle =
        pathParts.find(
          part =>
            part.startsWith("@")
        ) ||

        (
          hostname.endsWith(
            ".substack.com"
          )
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

        source:
          "saved reading"
      };
    }


    /* YouTube */

    if (
      hostname.includes(
        "youtube.com"
      ) ||
      hostname === "youtu.be"
    ) {
      return {
        label: "YouTube",
        source: "video"
      };
    }


    /* AO3 */

    if (
      hostname.includes(
        "archiveofourown.org"
      )
    ) {
      return {
        label:
          "Archive of Our Own",

        source:
          "saved work"
      };
    }


    /* Goodreads */

    if (
      hostname.includes(
        "goodreads.com"
      )
    ) {
      return {
        label: "Goodreads",
        source: "book"
      };
    }


    /* Generic site */

    const domainName =
      hostname
        .split(".")[0]
        .replace(
          /[-_]/g,
          " "
        )
        .replace(
          /\b\w/g,
          letter =>
            letter.toUpperCase()
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
   URL VALIDATION
   ========================================= */

function isUrl(value) {
  try {
    const url =
      new URL(value);

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


/* =========================================
   ROUTING CONTROL CSS
   ========================================= */

function injectRoutingStyles() {
  if (
    document.getElementById(
      "loose-leaves-routing-styles"
    )
  ) {
    return;
  }


  const style =
    document.createElement("style");

  style.id =
    "loose-leaves-routing-styles";


  style.textContent = `
    .leaf-resource {
      width: 100%;
    }

    .leaf-routing {
      display: flex;
      align-items: center;
      gap: 5px;

      margin:
        -2px 0 5px 19px;

      font-family:
        Georgia,
        "Times New Roman",
        serif;

      font-size: 8px;
      line-height: 1.2;

      color: #829074;
    }

    .leaf-route-button {
      appearance: none;
      border: 0;
      padding: 0;
      margin: 0;

      background: transparent;

      font: inherit;
      color: #829074;

      cursor: pointer;

      text-decoration: none;
    }

    .leaf-route-button:hover {
      color: #b68b45;
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    .leaf-route-button:focus-visible {
      outline:
        1px solid #b68b45;

      outline-offset: 2px;
    }

    .leaf-routing-separator {
      color: #b68b45;
      opacity: 0.7;
    }
  `;


  document.head.appendChild(
    style
  );
}
