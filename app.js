// ============================================================
// SEMIOTIC — Archive controller (hash-routed)
// ============================================================

const PER_PAGE = 9;

const CONTACT = {
  channel: "facebook", 
  facebookPageUsername: "YOUR_FACEBOOK_PAGE_USERNAME",
};

const state = {
  products: [],
  currentPage: 1,
  totalPages: 1,
  selectedSize: {},
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

if (/^#product\//.test(window.location.hash)) {
  viewArchive.classList.add("hidden");
}

async function loadProducts() {
  try {
    const res = await fetch("products.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.products = await res.json();
    state.totalPages = Math.max(1, Math.ceil(state.products.length / PER_PAGE));
    updateCounters();
    render();
    handleRoute();
  } catch (err) {
    grid.innerHTML = `
      <div class="col-span-full py-20 text-center font-mono text-xs tracking-[0.3em] text-ash uppercase">
        Archive unavailable — ${err.message}
      </div>`;
  }
}

const formatPHP = (n) => `₱${n.toLocaleString("en-PH")}`;
const pad2 = (n) => String(n).padStart(2, "0");
const PLACEHOLDER_FALLBACK = "this.style.display='none'; this.parentElement.classList.add('placeholder');";

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
  return Array.isArray(product.images) && product.images.length ? product.images[0] : "";
}

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
  if (!product) { window.location.replace("#collection"); return; }
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
    card.innerHTML = `
      <div class="flex items-center justify-between font-mono text-[10px] tracking-[0.3em] text-ash uppercase mb-3">
        <span>№ ${archiveNumber}</span>
        <span class="${stockLabel === "ARCHIVED" ? "text-ash" : stockLabel === "LOW STOCK" ? "text-blood" : "text-bone"}">${stockLabel}</span>
      </div>
      <div class="block relative aspect-square border hairline overflow-hidden bg-char">
        <img src="${primaryImage(p)}" alt="${p.name}" class="card-img w-full h-full object-cover" onerror="${PLACEHOLDER_FALLBACK}" />
        <span class="absolute top-3 left-3 font-mono text-[9px] tracking-[0.25em] text-bone bg-ink/70 backdrop-blur-sm px-2 py-1 uppercase">${p.id}</span>
      </div>
      <div class="mt-4 flex items-start justify-between gap-4">
        <h4 class="font-display text-base md:text-lg leading-tight tracking-tight uppercase">${p.name}</h4>
        <p class="font-mono text-sm whitespace-nowrap text-bone shrink-0">${formatPHP(p.price)}</p>
      </div>
      <div class="mt-3 border-t hairline"></div>
      <p class="mt-3 font-mono text-[10px] tracking-[0.3em] text-ash uppercase group-hover:text-bone transition-colors">View Piece →</p>`;
    grid.appendChild(card);
  });
}

function renderPagination() {
  pagination.innerHTML = "";
  const prev = document.createElement("button");
  prev.className = "page-btn text-bone text-base hover:text-blood transition-colors disabled:opacity-25";
  prev.textContent = "←";
  prev.disabled = state.currentPage === 1;
  prev.addEventListener("click", () => goToPage(state.currentPage - 1));
  pagination.appendChild(prev);
  for (let i = 1; i <= state.totalPages; i++) {
    const btn = document.createElement("button");
    btn.className = "page-btn hover:text-bone transition-colors px-1";
    btn.textContent = i === state.currentPage ? `[ ${pad2(i)} ]` : pad2(i);
    btn.addEventListener("click", () => goToPage(i));
    pagination.appendChild(btn);
  }
  const next = document.createElement("button");
  next.className = "page-btn text-bone text-base hover:text-blood transition-colors disabled:opacity-25";
  next.textContent = "→";
  next.disabled = state.currentPage === state.totalPages;
  next.addEventListener("click", () => goToPage(state.currentPage + 1));
  pagination.appendChild(next);
}

function render() { renderGrid(); renderPagination(); }
function goToPage(page) { state.currentPage = page; render(); collection.scrollIntoView({ behavior: "smooth" }); }

grid.addEventListener("click", (e) => {
  const card = e.target.closest("article[data-id]");
  if (card) window.location.hash = `#product/${card.dataset.id}`;
});

function renderProductDetail(product) {
  // (Rendering code remains same as your original)
  // ... (Full rendering function as in your original file)
  // To save space, please copy the rest of your original functions here:
  // wireDetailInteractions, applySizeSelection, dispatchAcquisition, etc.
}

loadProducts();
