const textarea =
  document.getElementById(
    "looseLeaves"
  );

const display =
  document.getElementById(
    "looseLeavesDisplay"
  );

const saveStatus =
  document.getElementById(
    "saveStatus"
  );

const clearButton =
  document.getElementById(
    "clearNotes"
  );


const STORAGE_KEY =
  "archive-loose-leaves-v1";

const CAPTURED_KEY =
  "archive-loose-leaves-captured-v1";


const EDIFICE_CAPTURE_URL =
  "https://archive-edifice.crystalroses44.workers.dev/capture";


const ART_CAPTURE_URL =
  "https://archive-art-repository.crystalroses44.workers.dev/capture";


let saveTimer;


/* =========================================
   ROUTING STYLES
   ========================================= */

injectRoutingStyles();


/* =========================================
   LOAD
   ========================================= */

const savedNotes =
  localStorage.getItem(
    STORAGE_KEY
  ) || "";


textarea.value =
  savedNotes;


migrateOldCaptureRecords();


renderDisplay(
  savedNotes
);


if (savedNotes.trim()) {
  showDisplay();
} else {
  showEditor();
}


/* =========================================
   AUTOSAVE
   ========================================= */

textarea.addEventListener(
  "input",
  () => {

    saveStatus.textContent =
      "saving…";


    clearTimeout(
      saveTimer
    );


    saveTimer =
      setTimeout(
        () => {

          const value =
            textarea.value;


          localStorage.setItem(
            STORAGE_KEY,
            value
          );


          saveStatus.textContent =
            "saved locally";


          renderDisplay(
            value
          );

        },
        1000
      );
  }
);


/* =========================================
   LEAVE EDIT MODE
   ========================================= */

textarea.addEventListener(
  "blur",
  () => {

    clearTimeout(
      saveTimer
    );


    const value =
      textarea.value;


    localStorage.setItem(
      STORAGE_KEY,
      value
    );


    saveStatus.textContent =
      "saved locally";


    renderDisplay(
      value
    );


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


/* =========================================
   KEYBOARD DISPLAY TO EDIT
   ========================================= */

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

    clearTimeout(
      saveTimer
    );


    textarea.value = "";


    localStorage.removeItem(
      STORAGE_KEY
    );


    renderDisplay("");


    showEditor();


    saveStatus.textContent =
      "cleared";


    setTimeout(
      () => {

        saveStatus.textContent =
          "saved locally";

      },
      1200
    );


    textarea.focus();
  }
);


/* =========================================
   RENDER
   ========================================= */

function renderDisplay(text) {

  display.innerHTML = "";


  if (!text.trim()) {
    return;
  }


  const lines =
    text.split("\n");


  lines.forEach(
    line => {

      const trimmed =
        line.trim();


      /* Blank line */

      if (!trimmed) {

        const spacer =
          document.createElement(
            "div"
          );


        spacer.className =
          "leaf-spacer";


        display.appendChild(
          spacer
        );


        return;
      }


      /* URL */

      if (
        isUrl(trimmed)
      ) {

        display.appendChild(
          createUrlLeaf(
            trimmed
          )
        );


        return;
      }


      /* Normal text */

      const note =
        document.createElement(
          "div"
        );


      note.className =
        "leaf-note";


      note.textContent =
        line;


      display.appendChild(
        note
      );
    }
  );
}


/* =========================================
   CREATE URL LEAF
   ========================================= */

function createUrlLeaf(url) {

  const wrapper =
    document.createElement(
      "div"
    );


  wrapper.className =
    "leaf-resource";


  const anchor =
    document.createElement(
      "a"
    );


  anchor.href =
    url;


  anchor.target =
    "_blank";


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
    document.createElement(
      "span"
    );


  marker.className =
    "leaf-marker";


  marker.textContent =
    "✦";


  /* Text */

  const text =
    document.createElement(
      "span"
    );


  text.className =
    "leaf-link-text";


  const label =
    document.createElement(
      "span"
    );


  label.className =
    "leaf-link-label";


  /*
    Once archived, use the actual
    resource title returned by Worker.
  */

  label.textContent =
    capture?.resource ||
    info.label;


  const source =
    document.createElement(
      "span"
    );


  source.className =
    "leaf-link-source";


  source.textContent =
    getSourceLine(
      info,
      capture
    );


  text.appendChild(
    label
  );


  text.appendChild(
    source
  );


  /* Arrow / check */

  const arrow =
    document.createElement(
      "span"
    );


  arrow.className =
    "leaf-arrow";


  arrow.textContent =
    capture?.status ===
    "archived"
      ? "✓"
      : "↗";


  anchor.appendChild(
    marker
  );


  anchor.appendChild(
    text
  );


  anchor.appendChild(
    arrow
  );


  wrapper.appendChild(
    anchor
  );


  /* =====================================
     ROUTING OPTIONS
     ===================================== */

  if (
    capture?.status !==
      "archived" &&

    capture?.status !==
      "capturing"
  ) {

    const routing =
      document.createElement(
        "div"
      );


    routing.className =
      "leaf-routing";


    const edificeButton =
      createRouteButton(
        "Edifice",
        "edifice",
        url
      );


    const separator =
      document.createElement(
        "span"
      );


    separator.className =
      "leaf-routing-separator";


    separator.textContent =
      "·";


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
   SOURCE LINE
   ========================================= */

function getSourceLine(
  info,
  capture
) {

  /*
    Before routing
  */

  if (!capture) {
    return info.source;
  }


  /*
    Capturing
  */

  if (
    capture.status ===
    "capturing"
  ) {

    const destination =
      capture.destination ===
      "art"
        ? "Art Repository"
        : "Edifice";


    return (
      `${info.source} · ` +
      `sending to ${destination}…`
    );
  }


  /*
    Error
  */

  if (
    capture.status ===
    "error"
  ) {

    return (
      `${info.source} · ` +
      "archive failed"
    );
  }


  /*
    Archived
  */

  if (
    capture.status ===
    "archived"
  ) {

    const destination =
      capture.destination ===
      "art"
        ? "Art Repository"
        : "Edifice";


    const parts = [];


    /*
      Actual creator/channel
    */

    if (
      capture.creator
    ) {

      parts.push(
        capture.creator
      );

    } else {

      /*
        If no creator was found,
        retain the generic source.
      */

      parts.push(
        info.source
      );
    }


    /*
      Resource type
    */

    if (
      capture.type
    ) {

      const typeText =
        capture.type
          .toLowerCase();


      /*
        Avoid saying
        "video · video"
      */

      if (
        !parts
          .join(" ")
          .toLowerCase()
          .includes(typeText)
      ) {

        parts.push(
          typeText
        );
      }
    }


    if (
      capture.duplicate
    ) {

      parts.push(
        `already in ${destination}`
      );

    } else {

      parts.push(
        `archived to ${destination}`
      );
    }


    return parts.join(
      " · "
    );
  }


  return info.source;
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
    document.createElement(
      "button"
    );


  button.type =
    "button";


  button.className =
    "leaf-route-button";


  button.textContent =
    label;


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
   CAPTURE TO DESTINATION
   ========================================= */

async function captureToDestination(
  url,
  destination
) {

  const existing =
    getCaptureRecord(
      url
    );


  if (
    existing?.status ===
    "capturing"
  ) {
    return;
  }


  if (
    existing?.status ===
    "archived"
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
      status:
        "capturing",

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
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
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
        status:
          "archived",

        destination,

        duplicate:
          Boolean(
            result.duplicate
          ),

        notionUrl:
          result.notionUrl ||
          "",

        pageId:
          result.pageId ||
          "",

        /*
          NEW:
          save metadata returned
          by the Worker.
        */

        resource:
          result.resource ||
          "",

        creator:
          result.creator ||
          "",

        type:
          result.type ||
          ""
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
        status:
          "error",

        destination
      }
    );
  }


  renderDisplay(
    textarea.value
  );
}


/* =========================================
   CAPTURE STORAGE
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
      normalizeLocalUrl(
        url
      )
    ] ||
    null
  );
}


function setCaptureRecord(
  url,
  record
) {

  const map =
    getCapturedMap();


  const key =
    normalizeLocalUrl(
      url
    );


  map[key] = {
    ...map[key],
    ...record
  };


  saveCapturedMap(
    map
  );
}


/* =========================================
   MIGRATE OLD RECORDS
   ========================================= */

function migrateOldCaptureRecords() {

  const map =
    getCapturedMap();


  let changed =
    false;


  Object.keys(
    map
  ).forEach(
    key => {

      const record =
        map[key];


      if (
        record?.status ===
          "archived" &&

        !record.destination
      ) {

        record.destination =
          "edifice";


        changed =
          true;
      }
    }
  );


  if (changed) {

    saveCapturedMap(
      map
    );
  }
}


/* =========================================
   NORMALIZE URL
   ========================================= */

function normalizeLocalUrl(
  value
) {

  try {

    const url =
      new URL(
        value.trim()
      );


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
   HUMAN URL DESCRIPTION
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
            part.startsWith(
              "@"
            )
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
        label:
          handle
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

      hostname ===
        "youtu.be"
    ) {

      return {
        label:
          "YouTube",

        source:
          "video"
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
        label:
          "Goodreads",

        source:
          "book"
      };
    }


    /* Generic */

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
      label:
        domainName,

      source:
        hostname
    };


  } catch {

    return {
      label:
        "Saved Link",

      source:
        "reference"
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
      url.protocol ===
        "http:" ||

      url.protocol ===
        "https:"
    );


  } catch {

    return false;
  }
}


/* =========================================
   VIEW HELPERS
   ========================================= */

function showDisplay() {

  textarea.hidden =
    true;


  display.hidden =
    false;
}


function showEditor() {

  display.hidden =
    true;


  textarea.hidden =
    false;
}


/* =========================================
   ROUTING CSS
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
    document.createElement(
      "style"
    );


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

      background:
        transparent;

      font: inherit;

      color: #829074;

      cursor: pointer;

      text-decoration:
        none;
    }

    .leaf-route-button:hover {
      color: #b68b45;

      text-decoration:
        underline;

      text-underline-offset:
        2px;
    }

    .leaf-route-button:focus-visible {
      outline:
        1px solid #b68b45;

      outline-offset:
        2px;
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
