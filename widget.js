// Course Cleaner (widget.js)
// - Builds the complete UI into <div id="app">
// - No jQuery dependencies
// - RowView factory holds row DOM + parsed HTML document

const _cc = {
    version: "1.0",
    target_id: "app",

    latest_css: "8.0",
    // !! EDIT THIS LINK WHEN CHANGING FROM TEST SERVER
    latest_css_link: "https://online.pcc.edu/shared/css/8.0/css/stylesheet.css",

    blacklist: [],
    module_blacklist: [],

    issues: {
        email: "carmi.troncibell@pcc.edu",
        docs: "https://docs.google.com/document/d/1bZ8H4uOdLKrC31RzP-pRQDa-7RQfTi-Mges6vfuvMaw/edit?tab=t.0#heading=h.1663rrt5qnn6"
    },

    // Runtime state
    app_container: null,
    rows: [],
    updated_count: 0,
    updatable_count: 0,

    // cached DOM
    table_body: null,
    update_all_button: null
};

const UI_TEMPLATE = `
  <div class="cc-root">
    <h1 class="cc-title">IDS Course Cleaner</h1>
    <h2 class="cc-subtitle">CSS Bulk Tool</h2>

    <p class="cc-instructions-label">Instructions:</p>
    <ol class="cc-instructions">
      <li>If using <strong>Copy Components</strong> to populate this course, wait for your copy to finish before using the plugin. You can tell if a copy is finished either on the Copy Components page, or from the D2L popup on any other page.</li>
      <li>After clicking either Update All or Update, do not refresh the page and wait until a popup appears telling you that the updates have been completed.</li>
    </ol>

    <p>The latest CSS version is <strong>${_cc.latest_css}</strong></p>
    <p>View <a href="${_cc.issues.docs}" target="_blank" rel="noopener">the changelog</a>. Issues with the program? Let dev know at <a href="mailto:${_cc.issues.email}">${_cc.issues.email}</a>. Version ${_cc.version}</p>

    <p class="cc-updateall-wrap">
      <button disabled id="updateAll">Update All</button>
    </p>

    <table id="cssTable" border="1">
      <colgroup>
        <col class="cc-col-page">
        <col class="cc-col-status">
        <col class="cc-col-sheets">
        <col class="cc-col-warnings">
      </colgroup>
      <thead>
        <tr>
          <th>Page + Module</th>
          <th>Up to Date?</th>
          <th>Linked Stylesheets <span>(hover for full path)</span></th>
          <th>Manual Changes</th>
        </tr>
      </thead>
      <tbody id="cssTableBody"></tbody>
    </table>
  </div>
`;

window.addEventListener("DOMContentLoaded", () => {
    _cc.app_container = document.getElementById(_cc.target_id);
    if (!_cc.app_container) return;

    build(_cc.app_container);
    void startScanAndWireUI();
});

function build(container) {
    container.innerHTML = UI_TEMPLATE;
    _cc.table_body = container.querySelector("#cssTableBody");
    _cc.update_all_button = container.querySelector("#updateAll");
}

function createRowView(topic, parentModule) {
    // Private state
    let htmlDocument = null; // DOMParser document
    let element = null; // <tr>
    let isUpdated = false;
    let hasLatestCss = false;
    let canUpdate = false;

    // Cached element references
    let pageTitleEl;
    let statusCell;
    let statusSpan;
    let updateBtn;
    let sheetListOl;
    let warningUl;

    function buildElement() {
        const tr = document.createElement("tr");
        tr.className = "cssRow";
        tr.innerHTML = `
          <td class="pageTitle"></td>
          <td class="status n updateButton"><span>N</span><br><button disabled>Update CSS</button></td>
          <td class="sheetList"><ol></ol></td>
          <td class="pageData"><ul></ul></td>
        `;
        element = tr;
        pageTitleEl = tr.querySelector(".pageTitle");
        statusCell = tr.querySelector(".status");
        statusSpan = tr.querySelector(".status span");
        updateBtn = tr.querySelector(".updateButton button");
        sheetListOl = tr.querySelector(".sheetList ol");
        warningUl = tr.querySelector(".pageData ul");
        return tr;
    }

    function setStatus(updated) {
        if (!statusCell || !statusSpan) return;
        statusCell.classList.toggle("y", updated);
        statusCell.classList.toggle("n", !updated);
        statusSpan.textContent = updated ? "Y" : "N";
    }

    function shortenPath(fullHref) {
        try {
            const m = /.*\/(.*\/.*\/.*)/.exec(fullHref);
            return m && m[1] ? m[1] : fullHref;
        } catch {
            return fullHref;
        }
    }

    return {
        topic,
        parentModule,

        getElement() {
            return element || buildElement();
        },

        setTitle() {
            const el = this.getElement();
            if (!pageTitleEl) pageTitleEl = el.querySelector(".pageTitle");
            const editableUrl = `https://online.pcc.edu/d2l/le/content/${window.orgUnitId}/contentfile/${topic.Identifier}/EditFile?fm=0`;
            pageTitleEl.innerHTML = `<p><b><a target="_blank" href="${editableUrl}">${topic.Title}</a></b><br><i>Module: ${parentModule}</i></p>`;
        },

        setDocument(doc) {
            htmlDocument = doc;
        },
        getDocument() {
            return htmlDocument;
        },

        setHasLatestCss(value) {
            hasLatestCss = Boolean(value);
        },
        getHasLatestCss() {
            return hasLatestCss;
        },

        setUpdated(value) {
            isUpdated = Boolean(value);
            setStatus(isUpdated);
        },
        isUpdated() {
            return isUpdated;
        },

        setCanUpdate(value) {
            canUpdate = Boolean(value);
        },
        canUpdate() {
            return canUpdate;
        },

        addWarning(message, type = "normal") {
            this.getElement();
            const li = document.createElement("li");
            li.textContent = message;
            if (type === "bad") li.classList.add("bad");
            if (type === "warn") li.classList.add("warn");
            warningUl.appendChild(li);
        },

        addStylesheet(href) {
            this.getElement();
            const li = document.createElement("li");
            li.setAttribute("title", href);
            li.textContent = shortenPath(href);
            sheetListOl.appendChild(li);
        },

        setStylesheetMessage(message) {
            this.getElement();
            const p = document.createElement("p");
            p.textContent = message;
            sheetListOl.parentElement.appendChild(p);
        },

        clearStylesheets() {
            this.getElement();
            sheetListOl.innerHTML = "";
            // remove any <p> siblings previously added
            const sheetCell = sheetListOl.parentElement;
            sheetCell.querySelectorAll("p").forEach(p => p.remove());
        },

        enableUpdateButton(callback) {
            this.getElement();
            updateBtn.disabled = false;
            updateBtn.addEventListener("click", () => callback(this), { once: true });
        },

        disableUpdateButton() {
            this.getElement();
            updateBtn.disabled = true;
        }
    };
}

async function startScanAndWireUI() {
    if (!_cc.table_body || !_cc.update_all_button) return;
    if (!window.orgUnitId) {
        // In local dev index.html sets this, but guard anyway.
        console.warn("window.orgUnitId is not set; scan cannot run.");
        return;
    }

    console.log("orgUnitId:", JSON.stringify(window.orgUnitId));

    let toc;
    try {
        const tocUrl = `/d2l/api/le/1.75/${window.orgUnitId}/content/toc`;
        console.log("Fetching from:", tocUrl);
        toc = await fetchJSON(tocUrl);
        console.log("TOC Data:", toc);
    } catch (e) {
        console.error("TOC fetch failed", e);
        _cc.app_container?.insertAdjacentHTML(
            "beforeend",
            `<p class="bad">Failed to load course TOC. See console for details.</p>`
        );
        return;
    }

    const topics = recursiveFileFinder(toc);
    console.log("Found topics:", topics);
    _cc.rows = topics.map(t => createRowView(t, t.ParentModule));

    // Render rows immediately
    for (const row of _cc.rows) {
        row.setTitle();
        _cc.table_body.appendChild(row.getElement());
    }

    // Load and analyze each topic's HTML
    await Promise.allSettled(_cc.rows.map(row => loadAndAnalyzeRow(row)));

    // Enable Update All once, after scans complete
    _cc.updatable_count = _cc.rows.filter(r => r.canUpdate() && !r.isUpdated()).length;
    if (_cc.updatable_count > 0) {
        _cc.update_all_button.disabled = false;
        _cc.update_all_button.addEventListener(
            "click",
            async () => {
                _cc.update_all_button.disabled = true;
                for (const row of _cc.rows) {
                    if (row.canUpdate() && !row.isUpdated()) {
                        await updateOneFile(row);
                    }
                }
            },
            { once: true }
        );
    }
}

async function loadAndAnalyzeRow(row) {
    const t = row.topic;
    try {
        console.log(`Processing topic ${t.Identifier}: ${t.Title}`);
        const text = await fetchText(`/d2l/api/le/1.75/${window.orgUnitId}/content/topics/${t.Identifier}/file`);
        const doc = new DOMParser().parseFromString(text, "text/html");
        row.setDocument(doc);

        // CHECK THAT PAGE IS DONE IMPORTING
        if (text.includes("<body>Not Found</body>") || text === "Bad Request") {
            row.addWarning(
                "Page not finished importing. Refresh and try again when all pages are imported.",
                "bad"
            );
            return;
        }

        // CHECK FOR ABLE PLAYER FEATURES (skip if playlist)
        if (text.includes("able-playlist")) {
            row.addWarning(
                "Page contains an Able Player playlist. Please manually update this page.",
                "bad"
            );
            return;
        }

        // WARN IF THERES VIDEOS
        if (text.includes("ablep-wrapper")) {
            row.addWarning(
                "Page contains Able Player videos - be aware that upon CSS update, real captions may no longer display, and other style issues may arise.",
                "warn"
            );
        }

        // CHECK FOR FOOTERS
        const footers = doc.querySelectorAll("footer");
        if (footers.length > 0 || text.includes('<div id="footer">') || text.includes("<div id='footer'")) {
            row.addWarning("Page contains footer.");
        } else {
            row.addWarning("Page does not contain footer.", "bad");
        }

        // CHECK FOR INLINE STYLES
        if (/style=["'].*;["']/.test(text)) {
            row.addWarning("Page has inline styles.", "bad");
        } else {
            row.addWarning("No inline styles found.");
        }

        // CHECK FOR TED VIDEOS
        if (/<iframe.*src=".*embed.ted.com/.test(text)) {
            row.addWarning("Page contains a TedEx embed which may not be displaying properly.", "warn");
        }

        // LIST STYLESHEETS
        const styles = doc.querySelectorAll('[rel="stylesheet"]');
        if (styles.length > 0) {
            let hasLatest = false;
            styles.forEach(s => {
                const full = s.getAttribute("href") || "";
                row.addStylesheet(full);

                const skip = isBlacklisted(s);
                if (skip) return;

                if (isLatestStyle(s)) {
                    hasLatest = true;
                }
            });
            row.setHasLatestCss(hasLatest);

            // if latest is the ONLY sheet there's no need to update
            if (hasLatest && styles.length === 1) {
                row.setUpdated(true);
                return;
            }
        } else {
            row.setStylesheetMessage("File is not local or no stylesheet is found.");
        }

        // Wire update button if updatable and file is local
        const fileInfo = urlToPathAndName(t.Url);
        if (!fileInfo) {
            row.addWarning("File is not local (cannot be updated by this tool).", "bad");
            return;
        }

        row.setUpdated(false);
        row.setCanUpdate(true);
        row.enableUpdateButton(async (rv) => {
            await updateOneFile(rv);
        });
    } catch (e) {
        console.error("Fetch/analyze error", e);
        row.addWarning(`Fetch error: ${String(e)}`, "bad");
    }
}

async function updateOneFile(row) {
    const t = row.topic;
    const doc = row.getDocument();
    if (!doc) return;

    // Work on a cloned <html> element (matches legacy behavior and serializes cleanly)
    const newWrapper = doc.documentElement.cloneNode(true);

    // delete unwanted stylesheets
    newWrapper.querySelectorAll('[rel="stylesheet"]').forEach((s) => {
        if (!isBlacklisted(s) && !isLatestStyle(s)) {
            s.remove();
        }
    });

    // remove all scripts
    newWrapper.querySelectorAll("script").forEach((s) => s.remove());

    // delete unwanted comments + whitespace-only text nodes
    stripCommentsAndEmptyText(newWrapper);

    // replace columbia banner+title combos on overview pages
    newWrapper.querySelectorAll(".intersect-wrapper.bg-img-wrapper").forEach((w) => {
        const title = w.querySelector("h1");
        const banner = w.querySelector("img");
        if (!banner) return;

        const alttext = banner.getAttribute("alt") || "";
        const newtitle = w.ownerDocument.createElement("h1");
        newtitle.textContent = title ? title.textContent : t.Title;

        const newbanner = w.ownerDocument.createElement("div");
        newbanner.className = "banner-img";
        const img = w.ownerDocument.createElement("img");
        img.setAttribute("src", banner.getAttribute("src") || "");
        img.setAttribute("alt", alttext);
        newbanner.appendChild(img);

        // Preserve legacy order: banner then title (matches chained .before() calls)
        w.parentNode?.insertBefore(newbanner, w);
        w.parentNode?.insertBefore(newtitle, w);

        title?.remove();
        banner.remove();

        const savetext = w.innerText;
        if (savetext && savetext.length > 0) {
            newtitle.insertAdjacentText("afterend", savetext);
        }
        w.remove();
    });

    // replace columbia left indentations on overview pages
    newWrapper.querySelectorAll(".offset-md-2").forEach((w) => w.classList.remove("offset-md-2"));

    // add new latest CSS link IF NEEDED
    if (!row.getHasLatestCss()) {
        const l = doc.createElement("link");
        l.setAttribute("rel", "stylesheet");
        l.setAttribute("href", _cc.latest_css_link);
        newWrapper.querySelector("head")?.prepend(l);
    }

    // add lang=en
    newWrapper.setAttribute("lang", "en");

    const fileInfo = urlToPathAndName(t.Url);
    if (!fileInfo) {
        row.addWarning("File is not local (cannot be updated by this tool).", "bad");
        return;
    }

    const result = await overwriteHtmlFile(newWrapper, fileInfo.filename, fileInfo.path);

    if (result === 200) {
        row.setUpdated(true);
        row.clearStylesheets();
        newWrapper.querySelectorAll('[rel="stylesheet"]').forEach((l) => {
            const full = l.getAttribute("href") || "";
            row.addStylesheet(full);
        });
        row.disableUpdateButton();
    }

    _cc.updated_count++;
    if (_cc.updatable_count > 0 && _cc.updated_count === _cc.updatable_count) {
        alert("Updates complete. Check table for results.");
    }

    return result;
}

function stripCommentsAndEmptyText(root) {
    // Walk once, collect nodes to remove (avoids iterator invalidation)
    const toRemove = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_TEXT, null);
    let node = walker.nextNode();
    while (node) {
        if (node.nodeType === Node.COMMENT_NODE) {
            toRemove.push(node);
        } else if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim() === "") {
            toRemove.push(node);
        }
        node = walker.nextNode();
    }
    toRemove.forEach(n => n.remove());
}

function isBlacklisted(linkEl) {
    const styleLink = linkEl.getAttribute("href") || "";
    for (let n = 0; n < _cc.blacklist.length; n++) {
        if (styleLink.search(_cc.blacklist[n]) > -1) {
            return _cc.blacklist[n];
        }
    }
    return false;
}

function isLatestStyle(linkEl) {
    const styleLink = linkEl.getAttribute("href") || "";
    return styleLink.includes(_cc.latest_css);
}

// Helper function for Topic Url field to filename and relative path for upload
function urlToPathAndName(url) {
    const regex = /\/content\/enforced\/[^/]+\//;
    if (!url || !url.match(regex)) {
        // file is not a local file
        return null;
    }
    const relativepart = url.split(regex)[1];
    const pathparts = relativepart.split("/");
    const filename = pathparts.pop();
    const relativepath = pathparts.join("/");
    return { filename, path: relativepath };
}

function fileUrlIsHtml(url) {
    const htmlext = /\w?html?/;
    if (!url) return;
    const ext = url.split(".").pop();
    return htmlext.test(ext);
}

async function uploadHTMLString(htmlNode, filename, path, overwrite) {
    // Serialize DOM node and upload
    const encoder = new XMLSerializer();
    const uploadString = encoder.serializeToString(htmlNode);
    const uploadBlob = new Blob([uploadString], { type: "text/html" });

    // this first POST will redirect fetch automatically and cause a 416
    return await fetch(`/d2l/api/lp/1.46/${window.orgUnitId}/managefiles/file/upload`, {
        method: "POST",
        headers: {
            "X-Upload-Content-Type": "text/html",
            "X-Upload-Content-Length": uploadBlob.size.toString(),
            "X-Upload-File-Name": filename,
            "X-CSRF-TOKEN": localStorage.getItem("XSRF.Token")
        }
    }).then(async (response) => {
        // response.status is 416 not 308 due to the fetch handling of 308 codes
        // but if the redirect was successful we have the upload key in the url field
        if (response.redirected) {
            return await fetch(response.url, {
                method: "POST",
                headers: {
                    "Content-Type": "text/html",
                    "X-CSRF-TOKEN": localStorage.getItem("XSRF.Token")
                },
                body: uploadBlob
            }).then((uploadResponse) => {
                if (uploadResponse.status === 200) {
                    const fileKey = uploadResponse.url.split("/").pop();
                    saveFile(fileKey, path, overwrite);
                    return uploadResponse.status;
                }
            });
        }
    });
}

async function overwriteHtmlFile(htmlNode, filename, path) {
    return await uploadHTMLString(htmlNode, filename, path, true);
}

function saveFile(key, path, overwrite) {
    const queryParams = new URLSearchParams({
        overwriteFile: overwrite.toString()
    });
    const formParams = new URLSearchParams({
        fileKey: key,
        relativePath: path
    });
    fetch(`/d2l/api/lp/1.46/${window.orgUnitId}/managefiles/file/save?${queryParams}`, {
        method: "POST",
        headers: {
            "X-CSRF-TOKEN": localStorage.getItem("XSRF.Token")
        },
        body: formParams
    }).then((response) => response.json());
}

async function fetchJSON(url) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
    return await resp.json();
}

async function fetchText(url) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
    return await resp.text();
}

// Works in TOC with submodules
function recursiveFileFinder(toc) {
    return toc.Modules.flatMap(function loop(module) {
        const arr = [];
        if (module.Modules.length) {
            arr.push(...module.Modules.flatMap(loop));
        }
        if (_cc.module_blacklist.includes(module.Title)) {
            return [];
        }
        const filtered_topics = module.Topics
            .filter(
                (topic) =>
                    fileUrlIsHtml(topic.Url) &&
                    topic.TypeIdentifier === "File" &&
                    !topic.Title.includes("Combined Syllabus")
            )
            .map((topic) => ({ ...topic, ParentModule: module.Title }));
        arr.push(...filtered_topics);
        return arr;
    });
}