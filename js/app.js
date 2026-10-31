(() => {
  const songs = Array.isArray(window.WALA_SONGS) ? window.WALA_SONGS : [];
  const state = {
    query: new URLSearchParams(window.location.search).get("q") || "",
    artist: new Set(),
    length: new Set(),
    style: new Set(),
    initial: "",
    panel: "",
    randomPick: "",
    artistOrder: "count",
    favoritesOnly: false,
    visibleLimit: 60,
    favorites: new Set(JSON.parse(localStorage.getItem("wala-favorites") || "[]"))
  };

  const els = {
    search: document.querySelector("#songSearch"),
    list: document.querySelector("#songList"),
    allFilter: document.querySelector("#allFilter"),
    artistFilter: document.querySelector("#artistFilter"),
    lengthFilter: document.querySelector("#lengthFilter"),
    styleFilter: document.querySelector("#styleFilter"),
    panel: document.querySelector("#filterPanel"),
    panelTitle: document.querySelector("#panelTitle"),
    panelHint: document.querySelector("#panelHint"),
    panelOptions: document.querySelector("#panelOptions"),
    artistSearch: document.querySelector("#artistSearch"),
    artistOrder: document.querySelector("#artistOrder"),
    clearPanelFilter: document.querySelector("#clearPanelFilter"),
    closePanel: document.querySelector("#closePanel"),
    favoritesFilter: document.querySelector("#favoritesFilter"),
    results: document.querySelector("#resultsText"),
    initialLetters: document.querySelector("#initialLetters"),
    clearInitial: document.querySelector("#clearInitialFilter"),
    empty: document.querySelector("#emptyState"),
    clear: document.querySelector("#clearFilters"),
    reset: document.querySelector("#resetSearch"),
    random: document.querySelector("#randomSongButton"),
    randomList: document.querySelector("#randomSongListButton"),
    toast: document.querySelector("#toast"),
    toastMessage: document.querySelector("#toastMessage"),
    loadMore: document.querySelector("#loadMore")
  };

  const artistCounts = new Map();
  songs.forEach((song) => artistCounts.set(song.artist, (artistCounts.get(song.artist) || 0) + 1));
  const artistNames = [...artistCounts.keys()];
  const artistMatchCounts = new Map(artistNames.map((artist) => [artist, songs.filter((song) => song.artist.includes(artist)).length]));
  const nameCollator = new Intl.Collator("zh-CN-u-co-pinyin", { sensitivity: "base", numeric: true });
  const isChineseName = (name) => /^[\u3400-\u9fff]/.test(name);
  const compareArtistNames = (a, b, direction = 1) => {
    const groupDifference = Number(isChineseName(b)) - Number(isChineseName(a));
    return groupDifference || direction * nameCollator.compare(a, b);
  };
  const lengths = [...new Set(songs.map((song) => Array.from(song.title).length))].sort((a, b) => a - b);
  const styles = ["民谣", "流行", "经典老歌", "古风", "短视频热歌"];
  const folkArtists = new Set(["花粥", "陈粒", "赵雷", "谢春花", "宋冬野", "马頔", "陈鸿宇", "房东的猫", "朴树", "李志", "老狼", "柳爽", "刘森", "万晓利", "周云蓬", "贰佰", "马良", "木小雅", "邵帅", "徐秉龙", "大乔小乔", "好妹妹"]);
  const popArtists = new Set(["周杰伦", "梁静茹", "王菲", "孙燕姿", "林俊杰", "薛之谦", "许嵩", "陈奕迅", "张韶涵", "李荣浩", "蔡依林", "田馥甄", "莫文蔚", "张杰", "杨丞琳", "邓紫棋", "刘若英"]);
  const classicArtists = new Set(["邓丽君", "罗大佑", "张信哲", "李宗盛", "周华健", "任贤齐", "梅艳芳", "苏芮", "凤飞飞", "姜育恒", "经典老歌"]);
  const ancientTitles = new Set(["红昭愿", "青花瓷", "盗将行", "桃花笑", "敕勒歌", "芊芊", "画中仙", "蜀绣", "上山岗", "故梦", "落花情", "逍遥叹"]);
  const viralTitles = new Set(["起风了", "可能否", "桥边姑娘", "纸短情长", "往后余生", "云烟成雨", "盗将行", "红昭愿", "我会等", "向云端", "凄美地"]);
  let toastTimer;

  function songStyles(song) {
    const tags = [];
    if (folkArtists.has(song.artist)) tags.push("民谣");
    if (popArtists.has(song.artist)) tags.push("流行");
    if (classicArtists.has(song.artist)) tags.push("经典老歌");
    if (ancientTitles.has(song.title)) tags.push("古风");
    if (viralTitles.has(song.title)) tags.push("短视频热歌");
    return tags;
  }

  const normalize = (text = "") => text.toString().toLowerCase().trim().replace(/[’']/g, "");
  const searchable = (song) => normalize([
    song.title, song.artist, song.pinyin
  ].join(" "));
  const titleInitial = (song) => {
    const first = Array.from(song.title.trim())[0] || "";
    if (/^[a-z]$/i.test(first)) return first.toUpperCase();
    if (!/^[\u3400-\u9fff]$/.test(first)) return "#";
    const pinyin = song.pinyin.trim().split(/\s+/)[0];
    return /^[a-z]/i.test(pinyin) ? pinyin[0].toUpperCase() : "#";
  };
  const initials = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", "#"];
  const initialCounts = new Map(initials.map((initial) => [initial, 0]));
  songs.forEach((song) => {
    const initial = titleInitial(song);
    initialCounts.set(initial, (initialCounts.get(initial) || 0) + 1);
  });
  els.initialLetters.innerHTML = initials.map((initial) => `
    <button class="initial-letter" type="button" data-initial="${initial}"
      aria-label="${initial}，${initialCounts.get(initial)} 首歌" aria-pressed="false"
      ${initialCounts.get(initial) ? "" : "disabled"}>${initial}</button>`).join("");

  function getFilteredSongs() {
    const terms = normalize(state.query).split(/\s+/).filter(Boolean);
    const filtered = songs.filter((song) => {
      const matchesQuery = terms.every((term) => searchable(song).includes(term));
      const matchesArtist = !state.artist.size || [...state.artist].some((artist) => song.artist.includes(artist));
      const matchesInitial = !state.initial || titleInitial(song) === state.initial;
      const matchesLength = !state.length.size || state.length.has(Array.from(song.title).length);
      const matchesStyle = !state.style.size || songStyles(song).some((style) => state.style.has(style));
      const matchesFavorite = !state.favoritesOnly || state.favorites.has(`${song.title}|${song.artist}`);
      const matchesRandom = !state.randomPick || state.randomPick === `${song.title}|${song.artist}`;
      return matchesQuery && matchesArtist && matchesInitial && matchesLength && matchesStyle && matchesFavorite && matchesRandom;
    });
    return filtered;
  }

  function escapeHtml(value) {
    return value.replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[char]);
  }

  function renderFilters() {
    els.allFilter.classList.toggle("active", !state.artist.size && !state.length.size && !state.style.size && !state.initial);
    for (const [name, button, fallback] of [
      ["artist", els.artistFilter, "歌手"],
      ["length", els.lengthFilter, "字数"],
      ["style", els.styleFilter, "风格"]
    ]) {
      const selected = [...state[name]];
      const first = name === "length" ? `${selected[0]} 字` : selected[0];
      const label = selected.length ? `${first}${selected.length > 1 ? ` +${selected.length - 1}` : ""}` : fallback;
      button.innerHTML = `${escapeHtml(label)} <span aria-hidden="true">⌄</span>`;
      button.classList.toggle("active", selected.length > 0);
      button.setAttribute("aria-expanded", String(state.panel === name));
    }
    els.favoritesFilter.setAttribute("aria-pressed", state.favoritesOnly.toString());
    els.favoritesFilter.querySelector("span").textContent = state.favoritesOnly ? "♥" : "♡";
    els.clearInitial.hidden = !state.initial;
    els.initialLetters.querySelectorAll("[data-initial]").forEach((button) => {
      const selected = button.dataset.initial === state.initial;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function renderPanel() {
    els.panel.hidden = !state.panel;
    if (!state.panel) return;
    els.artistSearch.hidden = state.panel !== "artist";
    els.artistOrder.hidden = state.panel !== "artist";
    els.artistOrder.querySelectorAll("[data-artist-order]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.artistOrder === state.artistOrder));
    });
    els.panelTitle.textContent = ({ artist: "选择歌手", length: "选择歌名字数", style: "选择参考风格" })[state.panel];
    els.clearPanelFilter.textContent = ({ artist: "清除歌手", length: "清除字数", style: "清除风格" })[state.panel];
    els.clearPanelFilter.hidden = !state[state.panel].size;
    els.panelHint.textContent = state.panel === "style"
      ? "风格只为部分歌曲提供参考标签；未标注的歌曲仍可在“全部”中搜索。"
      : state.panel === "artist" ? `共 ${artistNames.length} 个歌手/组合署名，可输入名称查找。中文按拼音排序，英文署名随后。` : "按歌名字符数精确筛选。";
    let options;
    if (state.panel === "artist") {
      const query = normalize(els.artistSearch.value);
      options = artistNames.filter((artist) => {
        return normalize(artist).includes(query);
      }).sort((a, b) => state.artistOrder === "count"
        ? artistMatchCounts.get(b) - artistMatchCounts.get(a) || compareArtistNames(a, b)
        : compareArtistNames(a, b, state.artistOrder === "name-desc" ? -1 : 1)
      ).map((artist) => ({ value: artist, label: artist, count: artistMatchCounts.get(artist) }));
    } else if (state.panel === "length") {
      options = lengths.map((length) => ({ value: length, label: `${length} 字`, count: songs.filter((song) => Array.from(song.title).length === length).length }));
    } else {
      options = styles.map((style) => ({ value: style, label: style, count: songs.filter((song) => songStyles(song).includes(style)).length }));
    }
    const current = state[state.panel];
    els.panelOptions.innerHTML = options.length ? options.map(({ value, label, count }) => `
      <button class="panel-option ${current.has(value) ? "selected" : ""}" type="button" data-value="${escapeHtml(String(value))}" aria-pressed="${current.has(value)}">
        <span>${current.has(value) ? '<i aria-hidden="true">✓</i>' : ""}${escapeHtml(label)}</span><small>${count} 首</small>
      </button>`).join("") : '<p class="panel-none">没有找到这个歌手</p>';
  }

  function renderSongs() {
    const visible = getFilteredSongs();
    const displayed = visible.slice(0, state.visibleLimit);
    els.list.innerHTML = displayed.map((song, index) => {
      const key = `${song.title}|${song.artist}`;
      const isFavorite = state.favorites.has(key);
      const safeTitle = escapeHtml(song.title);
      const safeArtist = escapeHtml(song.artist);
      const tags = songStyles(song).slice(0, 2);
      return `
        <article class="song-row" data-title="${safeTitle}">
          <span class="song-number">${String(index + 1).padStart(2, "0")}</span>
          <div class="song-title"><strong>${safeTitle}</strong><small>${safeArtist}${tags.length ? `<span class="mobile-tag"> · ${tags.join(" · ")}</span>` : ""}</small></div>
          <span class="song-artist">${safeArtist}</span>
          <div class="song-tags">${tags.map((tag) => `<span class="song-tag">${tag}</span>`).join("")}</div>
          <div class="song-actions">
            <button class="favorite-button ${isFavorite ? "active" : ""}" type="button" data-favorite="${escapeHtml(key)}" aria-label="${isFavorite ? "取消收藏" : "收藏"}${safeTitle}" aria-pressed="${isFavorite}">${isFavorite ? "♥" : "♡"}</button>
            <button class="request-button" type="button" data-request="${safeTitle}">点这首</button>
          </div>
        </article>`;
    }).join("");

    const hasFilter = Boolean(state.query || state.artist.size || state.length.size || state.style.size || state.initial || state.favoritesOnly || state.randomPick);
    els.results.innerHTML = visible.length
      ? `${state.randomPick ? "随机抽到" : "找到"} <strong>${visible.length}</strong> 首歌${state.query && !state.randomPick ? `，和“${escapeHtml(state.query)}”有关` : ""}`
      : "没有找到符合条件的歌";
    els.clear.hidden = !hasFilter;
    els.empty.hidden = visible.length > 0;
    els.list.hidden = visible.length === 0;
    els.loadMore.hidden = displayed.length >= visible.length;
    els.loadMore.textContent = `继续看更多歌曲（还剩 ${visible.length - displayed.length} 首）↓`;
  }

  function render() {
    renderFilters();
    renderPanel();
    renderSongs();
  }

  function reset() {
    state.query = "";
    state.artist.clear();
    state.length.clear();
    state.style.clear();
    state.initial = "";
    state.panel = "";
    state.randomPick = "";
    state.favoritesOnly = false;
    state.visibleLimit = 60;
    els.search.value = "";
    els.artistSearch.value = "";
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
    state.randomPick = "";
    state.visibleLimit = 60;
    const url = new URL(window.location.href);
    state.query ? url.searchParams.set("q", state.query) : url.searchParams.delete("q");
    history.replaceState(null, "", url);
    renderSongs();
  });

  els.allFilter.addEventListener("click", () => {
    state.artist.clear();
    state.length.clear();
    state.style.clear();
    state.initial = "";
    state.randomPick = "";
    state.panel = "";
    state.visibleLimit = 60;
    render();
  });

  for (const [name, button] of [["artist", els.artistFilter], ["length", els.lengthFilter], ["style", els.styleFilter]]) {
    button.addEventListener("click", () => {
      state.panel = state.panel === name ? "" : name;
      if (name === "artist") els.artistSearch.value = "";
      render();
      if (state.panel === "artist") els.artistSearch.focus();
    });
  }
  els.closePanel.addEventListener("click", () => { state.panel = ""; render(); });
  els.clearPanelFilter.addEventListener("click", () => {
    if (!state.panel) return;
    state[state.panel].clear();
    state.randomPick = "";
    state.visibleLimit = 60;
    render();
  });
  els.initialLetters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-initial]");
    if (!button) return;
    state.initial = state.initial === button.dataset.initial ? "" : button.dataset.initial;
    state.randomPick = "";
    state.visibleLimit = 60;
    render();
  });
  els.clearInitial.addEventListener("click", () => {
    state.initial = "";
    state.visibleLimit = 60;
    render();
  });
  els.artistSearch.addEventListener("input", renderPanel);
  els.artistOrder.addEventListener("click", (event) => {
    const button = event.target.closest("[data-artist-order]");
    if (!button) return;
    state.artistOrder = button.dataset.artistOrder;
    renderPanel();
    els.panelOptions.scrollTop = 0;
  });
  els.panelOptions.addEventListener("click", (event) => {
    const option = event.target.closest("[data-value]");
    if (!option) return;
    const value = state.panel === "length" ? Number(option.dataset.value) : option.dataset.value;
    const selected = state[state.panel];
    selected.has(value) ? selected.delete(value) : selected.add(value);
    state.randomPick = "";
    state.panel = "";
    state.visibleLimit = 60;
    render();
  });

  els.favoritesFilter.addEventListener("click", () => {
    state.favoritesOnly = !state.favoritesOnly;
    state.randomPick = "";
    state.visibleLimit = 60;
    render();
  });

  els.list.addEventListener("click", (event) => {
    const favorite = event.target.closest("[data-favorite]");
    const request = event.target.closest("[data-request]");
    if (favorite) {
      const key = favorite.dataset.favorite;
      state.favorites.has(key) ? state.favorites.delete(key) : state.favorites.add(key);
      localStorage.setItem("wala-favorites", JSON.stringify([...state.favorites]));
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
  function pickRandomSong() {
    if (!songs.length) return;
    const song = songs[Math.floor(Math.random() * songs.length)];
    state.query = "";
    state.artist.clear();
    state.length.clear();
    state.style.clear();
    state.initial = "";
    state.panel = "";
    state.randomPick = `${song.title}|${song.artist}`;
    state.favoritesOnly = false;
    els.search.value = "";
    const url = new URL(window.location.href);
    url.searchParams.delete("q");
    history.replaceState(null, "", url);
    render();
    document.querySelector("#songbook").scrollIntoView({ behavior: "smooth" });
    setTimeout(() => showToast(`随机抽到：${song.title} · ${song.artist}`), 450);
  }
  els.random.addEventListener("click", pickRandomSong);
  els.randomList.addEventListener("click", pickRandomSong);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.panel) {
      state.panel = "";
      render();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      els.search.focus();
    }
    if (event.key === "Escape" && document.activeElement === els.search) {
      reset();
      els.search.blur();
    }
  });

  document.querySelector("#songCount").textContent = songs.length;
  document.querySelector("#artistCount").textContent = new Set(songs.map((song) => song.artist)).size;
  render();
})();
