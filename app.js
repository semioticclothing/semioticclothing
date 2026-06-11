// ============================================================
// SEMIOTIC — Archive controller (hash-routed)
//
// Routes:
//   (empty) | #collection            → archive index page
//   #product/{id}                    → single-product detail view
//
// Two top-level containers in index.html switch based on hash:
//   #view-archive   → grid + pagination
//   #view-product   → split detail layout
// ============================================================

const PER_PAGE = 9;

// ============================================================
// BRAND CONFIG — Wire your Facebook Page routing here.
// Use your exact Facebook Page username or page ID.
// Example: "semioticclothing" -> routes to m.me/semioticclothing
// ============================================================
const CONTACT = {
  channel: "facebook", 
  facebookPageUsername: "YOUR_FACEBOOK_PAGE_USERNAME", // <-- REPLACE with your real Facebook page handle
};

const state = {
  products: [],
  currentPage: 1,
  totalPages: 1,
  selectedSize: {}, // { [productId]: "M" }   shared across views
};

// ---------- DOM REFERENCES ----------
const grid = document.getElementById("product-grid");
const pagination = document.getElementById("pagination");
const collection = document.getElementById("collection");
const countDesktop = document.getElementById("archive-count-desktop");
const countMobile = document.getElementById("archive-count-mobile");

const viewArchive = document.getElementById("view-archive");
const viewProduct = document.getElementById("view-product");
const detailBody = document.getElementById("product-detail-body");

// Pre-route flicker guard: if the page loaded with a #product/... hash,
// hide the archive immediately so it doesn't paint before fetch resolves.
if (/^#product\//.test(window.location.hash)) {
  viewArchive.classList.add("hidden");
}

// ---------- DATA ----------
async function loadProducts() {
  try {
    const res = await fetch("products.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.products = await res.json();
    state.totalPages = Math.max(1, Math.ceil(state.products.length / PER_PAGE));
    updateCounters();
    render();
    // Once data is in, run the router so a direct deep-link to
    // #product/{id} on page load lands on the right view.
    handleRoute();
  } catch (err) {
    grid.innerHTML = `
      <div class="col-span-full py-20 text-center font-mono text-xs tracking-[0.3em] text-ash uppercase">
        Archive unavailable — ${err.message}
      </div>`;
  }
}

// ---------- HELPERS ----------
const formatPHP = (n) => `₱${n.toLocaleString("en-PH")}`;
const pad2 = (n) => String(n).padStart(2, "0");

const PLACEHOLDER_FALLBACK =
  "this.style.display='none'; this.parentElement.classList.add('placeholder');";

function getPageSlice(page) {
  const start = (page - 1) * PER_PAGE;
  return state.products.slice(start, start + PER_PAGE);
}

function updateCounters() {
  const total = pad2(state.products.length);
  const text = `${pad2(state.products.length)} / ${total}`;
  if (countDesktop) countDesktop.textContent = text;
  if (countMobile) countMobile.textContent = text;
}

function getStockLabel(product) {
  const inStockCount = product.sizes.filter((s) => s.status !== "Sold Out").length;
  if (inStockCount === 0) return { label: "ARCHIVED", count: 0 };
  if (inStockCount <= 2) return { label: "LOW STOCK", count: inStockCount };
  return { label: "PRE-ORDER", count: inStockCount };
}

function primaryImage(product) {
  return Array.isArray(product.images) && product.images.length
    ? product.images[0]
    : "";
}

// ============================================================
// ROUTING
// ============================================================
function parseHash() {
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw || raw === "collection") return { view: "archive" };
  const match = raw.match(/^product\/(.+)$/);
  if (match) return { view: "product", productId: match[1] };
  return { view: "archive" };
}

function showArchive() {
  viewArchive.classList.remove("hidden");
  viewArchive.removeAttribute("aria-hidden");
  viewProduct.classList.add("hidden");
  viewProduct.setAttribute("aria-hidden", "true");
  detailBody.innerHTML = "";
  document.title = "SEMIOTIC — Archive Index";
}

function showProduct(productId) {
  const product = state.products.find((p) => p.id === productId);
  if (!product) {
    window.location.replace("#collection");
    return;
  }
  viewArchive.classList.add("hidden");
  viewProduct.classList.remove("hidden");
  viewProduct.removeAttribute("aria-hidden");
  renderProductDetail(product);
  document.title = `SEMIOTIC — ${product.name}`;
  window.scrollTo({ top: 0, behavior: "auto" });
}

function handleRoute() {
  if (!state.products.length) return;
  const route = parseHash();
  if (route.view === "product") showProduct(route.productId);
  else showArchive();
}

window.addEventListener("hashchange", handleRoute);

// ============================================================
// ARCHIVE — RENDERING
// ============================================================
function renderGrid() {
  grid.innerHTML = "";
  const items = getPageSlice(state.currentPage);
  const startIndex = (state.currentPage - 1) * PER_PAGE;

  items.forEach((p, i) => {
    const archiveNumber = pad2(startIndex + i + 1);
    const { label: stockLabel } = getStockLabel(p);

    const card = document.createElement("article");
    card.dataset.id = p.id;
    card.className = "card group";
    card.setAttribute("role", "link");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `View ${p.name}`);

    card.innerHTML = `
      <div class="flex items-center justify-between font-mono text-[10px] tracking-[0.3em] text-ash uppercase mb-3">
        <span>№ ${archiveNumber}</span>
        <span class="${stockLabel === "ARCHIVED" ? "text-ash" : stockLabel === "LOW STOCK" ? "text-blood" : "text-bone"}">${stockLabel}</span>
      </div>

      <div class="block relative aspect-square border hairline overflow-hidden bg-char">
        <img
          src="${primaryImage(p)}"
          alt="${p.name}"
          class="card-img w-full h-full object-cover"
          onerror="${PLACEHOLDER_FALLBACK}"
        />
        <span class="absolute top-3 left-3 font-mono text-[9px] tracking-[0.25em] text-bone bg-ink/70 backdrop-blur-sm px-2 py-1 uppercase">
          ${p.id}
        </span>
      </div>

      <div class="mt-4 flex items-start justify-between gap-4">
        <h4 class="font-display text-base md:text-lg leading-tight tracking-tight uppercase">${p.name}</h4>
        <p class="font-mono text-sm whitespace-nowrap text-bone shrink-0">${formatPHP(p.price)}</p>
      </div>

      <div class="mt-3 border-t hairline"></div>
      <p class="mt-3 font-mono text-[10px] tracking-[0.3em] text-ash uppercase group-hover:text-bone transition-colors">
        View Piece →
      </p>
    `;
    grid.appendChild(card);
  });
}

function renderPagination() {
  pagination.innerHTML = "";

  const prev = document.createElement("button");
  prev.type = "button";
  prev.textContent = "←";
  prev.setAttribute("aria-label", "Previous page");
  prev.className = "page-btn text-bone text-base hover:text-blood transition-colors disabled:hover:text-bone";
  prev.disabled = state.currentPage === 1;
  prev.addEventListener("click", () => goToPage(state.currentPage - 1));
  pagination.appendChild(prev);

  const spacerLeft = document.createElement("span");
  spacerLeft.className = "text-wire";
  spacerLeft.textContent = "|";
  pagination.appendChild(spacerLeft);

  for (let i = 1; i <= state.totalPages; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.page = i;
    btn.className = "page-btn hover:text-bone transition-colors px-1";
    btn.textContent = i === state.currentPage ? `[ ${pad2(i)} ]` : pad2(i);
    btn.setAttribute("aria-current", i === state.currentPage ? "page" : "false");
    btn.addEventListener("click", () => goToPage(i));
    pagination.appendChild(btn);
  }

  const spacerRight = document.createElement("span");
  spacerRight.className = "text-wire";
  spacerRight.textContent = "|";
  pagination.appendChild(spacerRight);

  const next = document.createElement("button");
  next.type = "button";
  next.textContent = "→";
  next.setAttribute("aria-label", "Next page");
  next.className = "page-btn text-bone text-base hover:text-blood transition-colors disabled:hover:text-bone";
  next.disabled = state.currentPage === state.totalPages;
  next.addEventListener("click", () => goToPage(state.currentPage + 1));
  pagination.appendChild(next);
}

function render() {
  renderGrid();
  renderPagination();
}

function goToPage(page) {
  if (page < 1 || page > state.totalPages || page === state.currentPage) return;
  state.currentPage = page;
  render();
  collection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function navigateToProduct(productId) {
  window.location.hash = `#product/${productId}`;
}

grid.addEventListener("click", (e) => {
  const card = e.target.closest("article[data-id]");
  if (!card) return;
  navigateToProduct(card.dataset.id);
});

grid.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const card = e.target.closest("article[data-id]");
  if (!card) return;
  e.preventDefault();
  navigateToProduct(card.dataset.id);
});

// ============================================================
// PRODUCT DETAIL — RENDERING
// ============================================================
function renderProductDetail(product) {
  const archiveNumber = (() => {
    const idx = state.products.findIndex((p) => p.id === product.id);
    return idx >= 0 ? pad2(idx + 1) : "—";
  })();
  const { label: stockLabel, count: stockCount } = getStockLabel(product);
  const isFullyArchived = stockCount === 0;
  const totalImages = product.images.length;

  const thumbsHTML = product.images
    .map(
      (src, idx) => `
        <button
          type="button"
          class="thumb-btn block relative aspect-square border hairline overflow-hidden bg-char"
          data-thumb-index="${idx}"
          aria-current="${idx === 0 ? "true" : "false"}"
          aria-label="View image ${idx + 1} of ${totalImages}"
        >
          <img src="${src}" alt="" class="w-full h-full object-cover" onerror="${PLACEHOLDER_FALLBACK}" />
        </button>`
    )
    .join("");

  const sizesHTML = product.sizes
    .map((s) => {
      const sold = s.status === "Sold Out";
      const last = s.status === "1 Left";

      if (sold) {
        return `
          <li class="relative aspect-square flex items-center justify-center border hairline text-ash select-none cursor-not-allowed" aria-disabled="true" data-sold="true">
            <span class="font-mono text-sm tracking-[0.2em]">${s.size}</span>
            <svg class="absolute inset-0 w-full h-full text-ash/60" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <line x1="0" y1="100" x2="100" y2="0" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke"/>
            </svg>
          </li>`;
      }

      return `
        <li>
          <button
            type="button"
            data-role="size-btn"
            data-size="${s.size}"
            data-last="${last}"
            class="size-btn relative w-full aspect-square flex items-center justify-center border hairline ${last ? "text-blood" : "text-bone"} hover:bg-bone hover:text-ink active:bg-bone active:text-ink transition-colors touch-manipulation font-mono text-sm tracking-[0.2em]"
            aria-pressed="false"
          >
            ${s.size}
          </button>
        </li>`;
    })
    .join("");

  detailBody.innerHTML = `
    <div class="mb-8 md:mb-14 pb-4 border-b hairline flex items-center justify-between gap-4">
      <a href="#collection" class="return-link font-display text-xs md:text-sm tracking-[0.25em] text-bone uppercase">
        [ RETURN TO ARCHIVE INDEX ]
      </a>
      <p class="font-mono text-[10px] tracking-[0.3em] text-ash uppercase hidden md:block">
        № ${archiveNumber} &nbsp;·&nbsp; ${product.id}
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-14">
      <div class="md:col-span-7">
        <div id="zoom-frame" class="zoom-frame relative aspect-square border hairline bg-char">
          <img id="focus-img" src="${product.images[0]}" alt="${product.name} — primary view" class="zoom-img" onerror="${PLACEHOLDER_FALLBACK}" />
          <span class="absolute top-3 left-3 z-10 font-mono text-[9px] tracking-[0.25em] text-bone bg-ink/70 backdrop-blur-sm px-2 py-1 uppercase pointer-events-none">
            ${product.id}
          </span>
          <span id="zoom-hint" class="absolute bottom-3 right-3 z-10 font-mono text-[9px] tracking-[0.3em] text-bone/70 bg-ink/60 backdrop-blur-sm px-2 py-1 uppercase pointer-events-none">
            Hover to zoom
          </span>
        </div>

        <div class="mt-4 grid grid-cols-3 gap-3" id="thumb-strip">${thumbsHTML}</div>

        <p class="mt-4 font-mono text-[10px] tracking-[0.3em] text-ash uppercase">
          Image <span id="image-index">01</span> / ${pad2(totalImages)}
        </p>
      </div>

      <div class="md:col-span-5 md:pt-2">
        <div class="flex items-center justify-between font-mono text-[10px] tracking-[0.3em] uppercase">
          <span class="${stockLabel === "ARCHIVED" ? "text-ash" : stockLabel === "LOW STOCK" ? "text-blood" : "text-bone"}">
            ${stockLabel}
          </span>
          <span class="text-ash">Vol. 01 — SS / 12</span>
        </div>

        <h1 class="font-display text-3xl md:text-5xl leading-[0.95] tracking-tight uppercase mt-4">
          ${product.name}
        </h1>

        <div class="mt-5 flex items-end justify-between gap-4 pb-5 border-b hairline">
          <p class="font-mono text-xl md:text-2xl text-bone">${formatPHP(product.price)}</p>
          <p class="font-mono text-[10px] tracking-[0.3em] text-ash uppercase">Ref · ${product.id}</p>
        </div>

        <dl class="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 font-mono text-[10px] tracking-[0.25em] uppercase">
          <dt class="text-ash">Edition</dt>
          <dd class="text-blood font-bold">Vol. 01 — Pre-order System</dd>
        </dl>

        <p class="mt-8 font-mono text-[10px] tracking-[0.35em] text-ash uppercase">Select Size</p>
        <ul class="mt-3 grid grid-cols-4 gap-2 uppercase" data-role="size-list">${sizesHTML}</ul>

        <button
          type="button"
          data-role="acquire-btn"
          class="acquire-btn mt-6 w-full font-display text-base tracking-[0.25em] uppercase border border-bone text-bone py-5 hover:bg-bone hover:text-ink active:bg-blood active:text-bone active:border-blood transition-colors touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-bone"
          ${isFullyArchived ? "disabled" : ""}
        >
          ${isFullyArchived ? "Fully Archived" : "Pre-Order Piece →"}
        </button>

        <p data-role="acquire-status" class="mt-3 font-mono text-[9px] tracking-[0.3em] text-ash uppercase min-h-[12px]">
          ${product.sizes.some((s) => s.status === "1 Left") ? "— Final pieces in select sizes" : "&nbsp;"}
        </p>
      </div>
    </div>
  `;

  wireDetailInteractions(product);
}

function wireDetailInteractions(product) {
  const root = detailBody;
  const focusImg = root.querySelector("#focus-img");
  const zoomFrame = root.querySelector("#zoom-frame");
  const thumbStrip = root.querySelector("#thumb-strip");
  const indexLabel = root.querySelector("#image-index");
  const zoomHint = root.querySelector("#zoom-hint");
  const sizeList = root.querySelector('[data-role="size-list"]');
  const acquireBtn = root.querySelector('[data-role="acquire-btn"]');
  const statusEl = root.querySelector('[data-role="acquire-status"]');

  thumbStrip.addEventListener("click", (e) => {
    const thumb = e.target.closest("[data-thumb-index]");
    if (!thumb) return;
    const idx = parseInt(thumb.dataset.thumbIndex, 10);
    if (Number.isNaN(idx) || !product.images[idx]) return;

    zoomFrame.classList.remove("is-zoomed");
    focusImg.style.display = ""; 
    zoomFrame.classList.remove("placeholder");
    focusImg.src = product.images[idx];
    focusImg.alt = `${product.name} — view ${idx + 1}`;

    thumbStrip.querySelectorAll("[data-thumb-index]").forEach((b) => {
      b.setAttribute("aria-current", b === thumb ? "true" : "false");
    });
    indexLabel.textContent = pad2(idx + 1);
  });

  zoomFrame.addEventListener("mousemove", (e) => {
    const rect = zoomFrame.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    zoomFrame.style.setProperty("--zx", `${x}%`);
    zoomFrame.style.setProperty("--zy", `${y}%`);
  });

  zoomFrame.addEventListener("click", () => {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    zoomFrame.classList.toggle("is-zoomed");
    if (zoomHint) {
      zoomHint.textContent = zoomFrame.classList.contains("is-zoomed") ? "Tap to exit zoom" : "Tap to zoom";
    }
  });

  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches && zoomHint) {
    zoomHint.textContent = "Tap to zoom";
  }

  const prevSize = state.selectedSize[product.id];
  if (prevSize) {
    const btn = sizeList.querySelector(`[data-size="${prevSize}"]`);
    if (btn) applySizeSelection(btn, sizeList);
  }

  sizeList.addEventListener("click", (e) => {
    const sizeBtn = e.target.closest('[data-role="size-btn"]');
    if (!sizeBtn) return;
    applySizeSelection(sizeBtn, sizeList);

    const size = sizeBtn.dataset.size;
    const isLast = sizeBtn.dataset.last === "true";
    state.selectedSize[product.id] = size;

    if (statusEl) {
      statusEl.classList.remove("text-ash", "text-blood");
      statusEl.classList.add(isLast ? "text-blood" : "text-bone");
      statusEl.textContent = isLast
        ? `→ Size ${size} selected — final slot`
        : `→ Size ${size} selected`;
    }
  });

  if (acquireBtn) {
    acquireBtn.addEventListener("click", () => {
      if (acquireBtn.disabled) return;
      const size = state.selectedSize[product.id];
      if (!size) {
        if (statusEl) {
          statusEl.classList.remove("text-ash", "text-bone");
          statusEl.classList.add("text-blood");
          statusEl.textContent = "↳ Select a size to transmit pre-order";
        }
        acquireBtn.animate(
          [{ transform: "translateX(0)" }, { transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "translateX(0)" }],
          { duration: 240, easing: "ease-in-out" }
        );
        return;
      }
      dispatchAcquisition(product, size);
    });
  }
}

function applySizeSelection(sizeBtn, sizeList) {
  sizeList.querySelectorAll('[data-role="size-btn"]').forEach((btn) => {
    btn.classList.remove("bg-bone", "text-ink", "border-bone");
    btn.setAttribute("aria-pressed", "false");
    const wasLast = btn.dataset.last === "true";
    btn.classList.remove("text-blood", "text-bone");
    btn.classList.add(wasLast ? "text-blood" : "text-bone");
  });

  sizeBtn.classList.remove("text-bone", "text-blood");
  sizeBtn.classList.add("bg-bone", "text-ink");
  sizeBtn.setAttribute("aria-pressed", "true");
}

// ============================================================
// ACQUISITION — Routes cleanly to Facebook Messenger (m.me)
// ============================================================
function buildMessage(product, size) {
  return [
    "SEMIOTIC SYSTEM PRE-ORDER INCOMING:",
    `I am requesting to secure a slot for ${product.name} in Size ${size}.`,
    "Please transmit settlement details (GCash/Maya/Bank) to finalize reservation.",
    "",
    `— Ref: ${product.id.toUpperCase()} · ${formatPHP(product.price)}`,
  ].join("\n");
}

function dispatchAcquisition(product, size) {
  const message = buildMessage(product, size);

  // Copy pre-order details to clipboard
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(message).catch(() => {});
  }

  // Open Messenger page
  window.open(
    "https://m.me/SemioticClothing",
    "_blank"
  );
}

const drawerBtn = document.getElementById("mobile-menu-btn");
const drawer = document.getElementById("mobile-drawer");
if (drawerBtn && drawer) {
  drawerBtn.addEventListener("click", () => {
    drawer.classList.toggle("hidden");
  });
}

loadProducts();
