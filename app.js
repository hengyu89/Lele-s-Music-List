(() => {
  const songs = Array.isArray(window.LELE_SONGS) ? window.LELE_SONGS : [];
  const state = {
    query: new URLSearchParams(window.location.search).get("q") || "",
    filter: "全部",
    favoritesOnly: false,
    visibleLimit: 60,
    favorites: new Set(JSON.parse(localStorage.getItem("lele-favorites") || "[]"))
  };

  const els = {
    search: document.querySelector("#songSearch"),
    list: document.querySelector("#songList"),
    filters: document.querySelector("#filterChips"),
    favoritesFilter: document.querySelector("#favoritesFilter"),
    results: document.querySelector("#resultsText"),
    empty: document.querySelector("#emptyState"),
    clear: document.querySelector("#clearFilters"),
    reset: document.querySelector("#resetSearch"),
    random: document.querySelector("#randomSongButton"),
    toast: document.querySelector("#toast"),
    toastMessage: document.querySelector("#toastMessage"),
    loadMore: document.querySelector("#loadMore")
  };

  const filters = ["全部", ...new Set(songs.map((song) => song.language))];
  let toastTimer;

  const normalize = (text = "") => text.toString().toLowerCase().trim().replace(/[’']/g, "");
  const searchable = (song) => normalize([
    song.title, song.artist, song.language, song.mood, song.pinyin, song.aliases
  ].join(" "));

  function getFilteredSongs() {
    const terms = normalize(state.query).split(/\s+/).filter(Boolean);
    return songs.filter((song) => {
      const matchesQuery = terms.every((term) => searchable(song).includes(term));
      const matchesFilter = state.filter === "全部" || song.language === state.filter;
      const matchesFavorite = !state.favoritesOnly || state.favorites.has(song.title);
      return matchesQuery && matchesFilter && matchesFavorite;
    });
  }

  function escapeHtml(value) {
    return value.replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[char]);
  }

  function renderFilters() {
    els.filters.innerHTML = filters.map((filter) => `
      <button class="filter-chip ${filter === state.filter ? "active" : ""}" type="button" data-filter="${filter}">
        ${filter}
      </button>
    `).join("");
    els.favoritesFilter.setAttribute("aria-pressed", state.favoritesOnly.toString());
    els.favoritesFilter.querySelector("span").textContent = state.favoritesOnly ? "♥" : "♡";
  }

  function renderSongs() {
    const visible = getFilteredSongs();
    const displayed = visible.slice(0, state.visibleLimit);
    els.list.innerHTML = displayed.map((song, index) => {
      const isFavorite = state.favorites.has(song.title);
      const safeTitle = escapeHtml(song.title);
      const safeArtist = escapeHtml(song.artist);
      return `
        <article class="song-row" data-title="${safeTitle}">
          <span class="song-number">${String(index + 1).padStart(2, "0")}</span>
          <div class="song-title"><strong>${safeTitle}</strong><small>${safeArtist}</small></div>
          <span class="song-artist">${safeArtist}</span>
          <div class="song-tags"><span class="song-tag">${song.language}</span><span class="song-tag">${song.mood}</span></div>
          <div class="song-actions">
            <button class="favorite-button ${isFavorite ? "active" : ""}" type="button" data-favorite="${safeTitle}" aria-label="${isFavorite ? "取消收藏" : "收藏"}${safeTitle}" aria-pressed="${isFavorite}">${isFavorite ? "♥" : "♡"}</button>
            <button class="request-button" type="button" data-request="${safeTitle}">点这首</button>
          </div>
        </article>`;
    }).join("");

    const hasFilter = Boolean(state.query || state.filter !== "全部" || state.favoritesOnly);
    els.results.innerHTML = visible.length
      ? `找到 <strong>${visible.length}</strong> 首歌${state.query ? `，和“${escapeHtml(state.query)}”有关` : ""}`
      : "没有找到符合条件的歌";
    els.clear.hidden = !hasFilter;
    els.empty.hidden = visible.length > 0;
    els.list.hidden = visible.length === 0;
    els.loadMore.hidden = displayed.length >= visible.length;
    els.loadMore.textContent = `继续看更多歌曲（还剩 ${visible.length - displayed.length} 首）↓`;
  }

  function render() {
    renderFilters();
    renderSongs();
  }

  function reset() {
    state.query = "";
    state.filter = "全部";
    state.favoritesOnly = false;
    state.visibleLimit = 60;
    els.search.value = "";
    history.replaceState(null, "", window.location.pathname);
    render();
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    els.toastMessage.textContent = message;
    els.toast.classList.add("show");
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2600);
  }

  async function requestSong(title) {
    const command = `点歌：${title}`;
    try {
      await navigator.clipboard.writeText(command);
      showToast(`${command} · 去直播间粘贴吧`);
    } catch {
      showToast(command);
    }
  }

  els.search.value = state.query;
  els.search.addEventListener("input", (event) => {
    state.query = event.target.value;
    state.visibleLimit = 60;
    const url = new URL(window.location.href);
    state.query ? url.searchParams.set("q", state.query) : url.searchParams.delete("q");
    history.replaceState(null, "", url);
    renderSongs();
  });

  els.filters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    state.filter = button.dataset.filter;
    state.visibleLimit = 60;
    render();
  });

  els.favoritesFilter.addEventListener("click", () => {
    state.favoritesOnly = !state.favoritesOnly;
    state.visibleLimit = 60;
    render();
  });

  els.list.addEventListener("click", (event) => {
    const favorite = event.target.closest("[data-favorite]");
    const request = event.target.closest("[data-request]");
    if (favorite) {
      const title = favorite.dataset.favorite;
      state.favorites.has(title) ? state.favorites.delete(title) : state.favorites.add(title);
      localStorage.setItem("lele-favorites", JSON.stringify([...state.favorites]));
      renderSongs();
    }
    if (request) requestSong(request.dataset.request);
  });

  els.clear.addEventListener("click", reset);
  els.reset.addEventListener("click", reset);
  els.loadMore.addEventListener("click", () => {
    state.visibleLimit += 60;
    renderSongs();
  });
  els.random.addEventListener("click", () => {
    if (!songs.length) return;
    const song = songs[Math.floor(Math.random() * songs.length)];
    state.query = song.title;
    els.search.value = song.title;
    renderSongs();
    document.querySelector("#songbook").scrollIntoView({ behavior: "smooth" });
    setTimeout(() => showToast(`随机抽到：${song.title} · ${song.artist}`), 450);
  });

  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      els.search.focus();
    }
    if (event.key === "Escape" && document.activeElement === els.search) {
      reset();
      els.search.blur();
    }
  });

  document.querySelector("#songCount").textContent = `${songs.length}+`;
  document.querySelector("#artistCount").textContent = new Set(songs.map((song) => song.artist)).size;
  render();
})();
