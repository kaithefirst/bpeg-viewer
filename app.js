// ── Config ────────────────────────────────────────────────────────────────────
const CONTRACT = "0x4F3c803bbF62f46c76bf8f4aFf107393c007813a";
const RPC      = "https://sepolia.base.org";
const SCAN     = "https://sepolia.basescan.org";

// ── RPC helper ────────────────────────────────────────────────────────────────
async function rpcCall(method, params) {
  const res = await fetch(RPC, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

// ── ABI encode helpers ────────────────────────────────────────────────────────
function encodeUint(n) {
  return BigInt(n).toString(16).padStart(64, "0");
}
function encodeAddress(addr) {
  return addr.slice(2).toLowerCase().padStart(64, "0");
}

// ── Contract calls ────────────────────────────────────────────────────────────
async function ethCall(selector, ...args) {
  const data = selector + args.join("");
  return rpcCall("eth_call", [{ to: CONTRACT, data }, "latest"]);
}

async function getTokenURI(tokenId) {
  // tokenURI(uint256) => 0xc87b56dd
  const res = await ethCall("0xc87b56dd", encodeUint(tokenId));
  return decodeString(res);
}

async function getBpegCount(wallet) {
  // bpegCount(address) => 0x3a8a5d35
  const res = await ethCall("0x3a8a5d35", encodeAddress(wallet));
  return parseInt(res, 16);
}

async function getBpegAt(wallet, idx) {
  // bpegAt(address,uint256) => 0x8a6d6d4e
  const res = await ethCall("0x8a6d6d4e", encodeAddress(wallet), encodeUint(idx));
  const hex = res.slice(2);
  return {
    id:   parseInt(hex.slice(0, 64), 16),
    seed: BigInt("0x" + hex.slice(64, 128))
  };
}

async function getTotalBpegs() {
  // totalBpegs() => 0x2b5b2a13
  try {
    const res = await ethCall("0x2b5b2a13");
    return parseInt(res, 16);
  } catch { return null; }
}

// ── ABI decode ────────────────────────────────────────────────────────────────
function decodeString(hex) {
  const data   = hex.slice(2);
  const offset = parseInt(data.slice(0, 64), 16) * 2;
  const length = parseInt(data.slice(offset, offset + 64), 16) * 2;
  const strHex = data.slice(offset + 64, offset + 64 + length);
  let str = "";
  for (let i = 0; i < strHex.length; i += 2) {
    str += String.fromCharCode(parseInt(strHex.slice(i, i + 2), 16));
  }
  return str;
}

// ── Metadata parser ───────────────────────────────────────────────────────────
function parseMetadata(uri) {
  try {
    const b64  = uri.replace("data:application/json;base64,", "");
    return JSON.parse(atob(b64));
  } catch { return null; }
}

function getAttr(meta, key) {
  return (meta.attributes || []).find(a => a.trait_type === key)?.value || "—";
}

function badgeClass(rarity) {
  const map = {
    "Common":     "badge-common",
    "Uncommon":   "badge-uncommon",
    "Rare":       "badge-rare",
    "Ultra Rare": "badge-ultra"
  };
  return map[rarity] || "badge-common";
}

// ── NFT card builder ──────────────────────────────────────────────────────────
function buildCard(tokenId, meta) {
  const rarity = getAttr(meta, "Rarity");
  const color  = getAttr(meta, "Color");

  const div = document.createElement("div");
  div.className   = "nft-card";
  div.dataset.rarity = rarity;
  div.onclick     = () => openModal(tokenId, meta);
  div.innerHTML   = `
    <img src="${meta.image}" alt="${meta.name}" loading="lazy"/>
    <div class="nft-info">
      <div class="nft-name">${meta.name}</div>
      <div class="nft-color">${color}</div>
      <span class="nft-badge ${badgeClass(rarity)}">${rarity}</span>
    </div>
  `;
  return div;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openModal(tokenId, meta) {
  document.getElementById("modal-img").src  = meta.image;
  document.getElementById("modal-name").textContent = meta.name;
  document.getElementById("modal-scan").href =
    `${SCAN}/token/${CONTRACT}?a=${tokenId}`;

  const traitsEl = document.getElementById("modal-traits");
  traitsEl.innerHTML = (meta.attributes || []).map(a => `
    <div class="trait-box">
      <div class="trait-type">${a.trait_type}</div>
      <div class="trait-val">${a.value}</div>
    </div>
  `).join("");

  document.getElementById("modal").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal(e) {
  if (!e || e.target.id === "modal") {
    document.getElementById("modal").classList.remove("open");
    document.body.style.overflow = "";
  }
}

// ── Status helpers ────────────────────────────────────────────────────────────
function setStatus(id, msg, isError) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!msg) { el.style.display = "none"; return; }
  el.style.display = "flex";
  el.className = "status-msg" + (isError ? " status-error" : "");
  el.innerHTML = isError
    ? msg
    : `<div class="loader"></div>${msg}`;
}

// ── Load wallet NFTs ──────────────────────────────────────────────────────────
async function loadWallet() {
  const wallet = document.getElementById("wallet-input").value.trim();
  if (!wallet.startsWith("0x") || wallet.length !== 42) {
    alert("Please enter a valid Ethereum address (0x...)");
    return;
  }

  const grid = document.getElementById("lookup-grid");
  grid.innerHTML = "";
  setStatus("lookup-status", "Fetching NFTs from blockchain...");

  try {
    const count = await getBpegCount(wallet);
    if (count === 0) {
      setStatus("lookup-status", "No bPEG NFTs found for this wallet.", true);
      return;
    }
    setStatus("lookup-status", `Loading ${count} NFT${count > 1 ? "s" : ""}...`);

    for (let i = 0; i < count; i++) {
      const { id } = await getBpegAt(wallet, i);
      const uri    = await getTokenURI(id);
      const meta   = parseMetadata(uri);
      if (meta) grid.appendChild(buildCard(id, meta));
    }
    setStatus("lookup-status", "");
  } catch (e) {
    setStatus("lookup-status", "Error: " + e.message, true);
  }
}

// ── Load single token ─────────────────────────────────────────────────────────
async function loadSingle() {
  const id = parseInt(document.getElementById("token-id").value);
  if (!id || id < 1) { alert("Enter a valid token ID"); return; }

  const grid = document.getElementById("lookup-grid");
  grid.innerHTML = "";
  setStatus("lookup-status", `Loading bPEG #${id}...`);

  try {
    const uri  = await getTokenURI(id);
    const meta = parseMetadata(uri);
    if (meta) {
      grid.appendChild(buildCard(id, meta));
      setStatus("lookup-status", "");
    } else {
      setStatus("lookup-status", "Could not parse token metadata.", true);
    }
  } catch (e) {
    setStatus("lookup-status", "Error: " + e.message, true);
  }
}

// ── Gallery ───────────────────────────────────────────────────────────────────
let galleryPage = 0;
const PAGE_SIZE = 12;
let galleryTotal = 0;
let allCards = [];
let activeFilter = "all";

async function loadGallery() {
  setStatus("gallery-status", "Loading gallery...");
  try {
    galleryTotal = await getTotalBpegs() || 0;

    // Update hero stat
    const el = document.getElementById("stat-minted");
    if (el) el.textContent = galleryTotal.toLocaleString();

    if (galleryTotal === 0) {
      setStatus("gallery-status", "No NFTs minted yet. Be the first!", true);
      return;
    }

    setStatus("gallery-status", "");
    await loadMore();
  } catch (e) {
    setStatus("gallery-status", "Could not load gallery: " + e.message, true);
  }
}

async function loadMore() {
  const grid = document.getElementById("gallery-grid");
  const btn  = document.getElementById("load-more-btn");
  const start = galleryPage * PAGE_SIZE + 1;
  const end   = Math.min(start + PAGE_SIZE - 1, galleryTotal);

  btn.style.display = "none";

  for (let id = start; id <= end; id++) {
    try {
      const uri  = await getTokenURI(id);
      const meta = parseMetadata(uri);
      if (!meta) continue;
      const card = buildCard(id, meta);
      allCards.push({ card, rarity: meta.attributes?.find(a=>a.trait_type==="Rarity")?.value || "Common" });
      if (activeFilter === "all" || activeFilter === allCards[allCards.length-1].rarity) {
        grid.appendChild(card);
      }
    } catch {}
  }

  galleryPage++;
  if (end < galleryTotal) btn.style.display = "inline-flex";
}

function setFilter(filter, btn) {
  activeFilter = filter;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  const grid = document.getElementById("gallery-grid");
  grid.innerHTML = "";
  allCards.forEach(({ card, rarity }) => {
    if (filter === "all" || filter === rarity) grid.appendChild(card);
  });
}

// ── Keyboard close modal ──────────────────────────────────────────────────────
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});

// ── Init ──────────────────────────────────────────────────────────────────────
loadGallery();
