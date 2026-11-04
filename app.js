// Garden Control Panel — Craftland garden planner (static, localStorage based)
(() => {
  const STORE_KEY = "craftland-garden-v1";

  const TOOLS = [
    { id: "flower", icon: "🌸", name: "Flower", beauty: 3 },
    { id: "tulip", icon: "🌷", name: "Tulip", beauty: 3 },
    { id: "tree", icon: "🌳", name: "Tree", beauty: 4 },
    { id: "palm", icon: "🌴", name: "Palm", beauty: 4 },
    { id: "bush", icon: "🌿", name: "Bush", beauty: 2 },
    { id: "water", icon: "🟦", name: "Water", beauty: 3 },
    { id: "fountain", icon: "⛲", name: "Fountain", beauty: 8 },
    { id: "path", icon: "🟫", name: "Path", beauty: 1 },
    { id: "fence", icon: "🧱", name: "Wall", beauty: 0 },
    { id: "bench", icon: "🪑", name: "Bench", beauty: 2 },
    { id: "lamp", icon: "💡", name: "Lamp", beauty: 2 },
    { id: "house", icon: "🏠", name: "House", beauty: 5 },
    { id: "spawn", icon: "🚩", name: "Spawn", beauty: 0 },
    { id: "loot", icon: "🎁", name: "Loot box", beauty: 0 },
    { id: "erase", icon: "🧽", name: "Erase", beauty: 0 },
  ];
  const TOOL_BY_ID = Object.fromEntries(TOOLS.map(t => [t.id, t]));

  const defaultState = () => ({
    size: 16,
    grid: Array(16 * 16).fill(null),
    map: { name: "", code: "", mode: "Chill / Explore", players: 8, desc: "" },
    tasks: [
      { text: "Garden ka boundary wall banana", done: false },
      { text: "Center mein fountain lagana", done: false },
      { text: "Spawn points set karna", done: false },
    ],
  });

  let state = load();
  let tool = "flower";
  let history = [];
  let painting = false;

  // ---------- persistence ----------
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && Array.isArray(s.grid) && s.grid.length === s.size * s.size) return { ...defaultState(), ...s };
      }
    } catch (_) {}
    return defaultState();
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) {}
  }
  const $ = id => document.getElementById(id);

  // ---------- tabs ----------
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b === btn));
      document.querySelectorAll(".panel").forEach(p => p.classList.toggle("active", p.id === btn.dataset.tab));
    });
  });

  // ---------- palette ----------
  function renderPalette() {
    $("palette").innerHTML = "";
    TOOLS.forEach(t => {
      const b = document.createElement("button");
      b.className = "tool" + (t.id === tool ? " active" : "");
      b.innerHTML = `<span class="ic">${t.icon}</span>${t.name}`;
      b.onclick = () => { tool = t.id; renderPalette(); };
      $("palette").appendChild(b);
    });
  }

  // ---------- board ----------
  const board = $("board");
  function renderBoard() {
    board.style.gridTemplateColumns = `repeat(${state.size}, 1fr)`;
    board.innerHTML = "";
    state.grid.forEach((v, i) => {
      const c = document.createElement("div");
      c.className = "cell";
      c.dataset.i = i;
      c.textContent = v ? TOOL_BY_ID[v]?.icon || "" : "";
      c.title = v ? TOOL_BY_ID[v]?.name : "Empty";
      board.appendChild(c);
    });
    renderStats();
  }
  function paintCell(i, erase) {
    const next = erase || tool === "erase" ? null : tool;
    if (state.grid[i] === next) return;
    state.grid[i] = next;
    const c = board.children[i];
    c.textContent = next ? TOOL_BY_ID[next].icon : "";
    c.title = next ? TOOL_BY_ID[next].name : "Empty";
  }
  function snapshot() {
    history.push(state.grid.slice());
    if (history.length > 50) history.shift();
  }
  function commit() { renderStats(); save(); }

  function cellFromEvent(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    return el && el.classList.contains("cell") && board.contains(el) ? +el.dataset.i : -1;
  }
  let eraseMode = false;
  board.addEventListener("pointerdown", e => {
    const i = cellFromEvent(e);
    if (i < 0) return;
    e.preventDefault();
    snapshot();
    painting = true;
    eraseMode = e.button === 2;
    paintCell(i, eraseMode);
  });
  board.addEventListener("pointermove", e => {
    if (!painting) return;
    const i = cellFromEvent(e);
    if (i >= 0) paintCell(i, eraseMode);
  });
  window.addEventListener("pointerup", () => { if (painting) { painting = false; commit(); } });
  board.addEventListener("contextmenu", e => e.preventDefault());

  $("undoBtn").onclick = () => {
    const prev = history.pop();
    if (prev) { state.grid = prev; renderBoard(); save(); }
  };
  $("clearBtn").onclick = () => {
    if (!confirm("Poora garden clear karna hai?")) return;
    snapshot(); state.grid.fill(null); renderBoard(); save();
  };
  $("fillGrassBtn").onclick = () => {
    snapshot();
    state.grid = state.grid.map(v => v || "bush");
    renderBoard(); save();
  };
  $("gridSize").value = String(state.size);
  $("gridSize").onchange = e => {
    const n = +e.target.value;
    if (n === state.size) return;
    const old = state.grid, os = state.size;
    const g = Array(n * n).fill(null);
    for (let r = 0; r < Math.min(n, os); r++)
      for (let c = 0; c < Math.min(n, os); c++) g[r * n + c] = old[r * os + c];
    state.size = n; state.grid = g; history = [];
    renderBoard(); save();
  };

  // ---------- stats ----------
  function renderStats() {
    const counts = {};
    let beauty = 0;
    state.grid.forEach(v => { if (v) { counts[v] = (counts[v] || 0) + 1; beauty += TOOL_BY_ID[v]?.beauty || 0; } });
    const list = $("statsList");
    list.innerHTML = "";
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (!entries.length) list.innerHTML = "<li>Abhi garden khaali hai 🌱</li>";
    entries.forEach(([id, n]) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${TOOL_BY_ID[id].icon} ${TOOL_BY_ID[id].name}</span><b>${n}</b>`;
      list.appendChild(li);
    });
    const filled = state.grid.filter(Boolean).length;
    const li = document.createElement("li");
    li.innerHTML = `<span>Filled tiles</span><b>${filled}/${state.grid.length}</b>`;
    list.appendChild(li);
    $("beauty").textContent = beauty;
  }

  // ---------- map info ----------
  const mapFields = { mapName: "name", mapCode: "code", mapMode: "mode", mapPlayers: "players", mapDesc: "desc" };
  Object.entries(mapFields).forEach(([el, key]) => {
    $(el).value = state.map[key] ?? "";
    $(el).addEventListener("input", e => { state.map[key] = e.target.value; save(); });
  });
  function flash(id, text) { $(id).textContent = text; setTimeout(() => ($(id).textContent = ""), 2500); }
  async function copy(text, msgId, ok) {
    try { await navigator.clipboard.writeText(text); flash(msgId, ok); }
    catch (_) { prompt("Copy karo:", text); }
  }
  $("copyCodeBtn").onclick = () => {
    if (!state.map.code) return flash("mapMsg", "Pehle map code daalo.");
    copy(state.map.code, "mapMsg", "✅ Map code copy ho gaya!");
  };
  $("shareBtn").onclick = () => {
    const m = state.map;
    const text = `🌿 ${m.name || "My Garden"} — Craftland map\nCode: ${m.code || "(coming soon)"}\nMode: ${m.mode} · ${m.players} players\n${m.desc}`.trim();
    if (navigator.share) navigator.share({ text }).catch(() => {});
    else copy(text, "mapMsg", "✅ Share text copy ho gaya!");
  };

  // ---------- tasks ----------
  function renderTasks() {
    const ul = $("taskList");
    ul.innerHTML = "";
    state.tasks.forEach((t, i) => {
      const li = document.createElement("li");
      li.className = t.done ? "done" : "";
      const cb = document.createElement("input");
      cb.type = "checkbox"; cb.checked = t.done;
      cb.onchange = () => { t.done = cb.checked; save(); renderTasks(); };
      const span = document.createElement("span"); span.textContent = t.text;
      const del = document.createElement("button"); del.textContent = "✕"; del.title = "Delete";
      del.onclick = () => { state.tasks.splice(i, 1); save(); renderTasks(); };
      li.append(cb, span, del);
      ul.appendChild(li);
    });
    const done = state.tasks.filter(t => t.done).length;
    $("taskProgress").textContent = state.tasks.length ? `${done}/${state.tasks.length} complete` : "Koi task nahi.";
  }
  $("taskForm").onsubmit = e => {
    e.preventDefault();
    const v = $("taskInput").value.trim();
    if (!v) return;
    state.tasks.push({ text: v, done: false });
    $("taskInput").value = "";
    save(); renderTasks();
  };

  // ---------- export / import ----------
  function download(name, blob) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  $("exportBtn").onclick = () => {
    download(`${(state.map.name || "garden").replace(/\W+/g, "_")}.json`,
      new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }));
    flash("dataMsg", "✅ Backup download ho gaya.");
  };
  $("importFile").onchange = async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const s = JSON.parse(await f.text());
      if (!Array.isArray(s.grid) || s.grid.length !== s.size * s.size) throw new Error("bad");
      state = { ...defaultState(), ...s };
      save(); location.reload();
    } catch (_) { flash("dataMsg", "❌ Galat file."); }
    e.target.value = "";
  };
  $("pngBtn").onclick = () => {
    const px = 40, n = state.size;
    const cv = document.createElement("canvas");
    cv.width = cv.height = n * px;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#1f3a28"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = `${px * 0.7}px serif`;
    state.grid.forEach((v, i) => {
      const x = (i % n) * px, y = Math.floor(i / n) * px;
      ctx.strokeStyle = "#2a4233"; ctx.strokeRect(x, y, px, px);
      if (v) ctx.fillText(TOOL_BY_ID[v].icon, x + px / 2, y + px / 2 + 2);
    });
    cv.toBlob(b => download("garden-layout.png", b));
  };

  renderPalette();
  renderBoard();
  renderTasks();
})();
