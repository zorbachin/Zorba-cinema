(() => {
  const catalog = window.CINEMATIC_LISTINGS || {};
  const app = document.getElementById("app");
  const ids = Object.keys(catalog);
  if (!app || !ids.length) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const query = new URL(window.location.href);
  let propertyId = catalog[query.searchParams.get("property")] ? query.searchParams.get("property") : ids[0];
  let index = 0;
  let lastWheel = 0;
  let touchStart = null;

  const property = () => catalog[propertyId];
  const sceneIndexFromHash = () => {
    const id = decodeURIComponent(location.hash.replace(/^#/, ""));
    const found = property().scenes.findIndex((scene) => scene.id === id);
    return found >= 0 ? found : 0;
  };
  index = sceneIndexFromHash();

  function updateUrl() {
    const next = new URL(location.href);
    next.searchParams.set("property", propertyId);
    next.hash = property().scenes[index].id;
    history.replaceState(null, "", next);
  }

  function pendingMedia() {
    return '<div class="asset-pending" role="img" aria-label="Continuity media pack pending"><span>CONTINUITY MEDIA PACK<br>PENDING</span></div>';
  }

  function sceneMedia(scene) {
    if (scene.image) {
      return '<img class="scene-image" data-scene-image src="' + scene.image + '" alt="Concept property image for ' + scene.kicker + '" />';
    }
    return pendingMedia();
  }

  function installMediaFallback() {
    const image = app.querySelector("[data-scene-image]");
    if (!image) return;
    image.addEventListener("error", () => {
      const wrapper = image.parentElement;
      if (!wrapper) return;
      image.remove();
      wrapper.insertAdjacentHTML("afterbegin", pendingMedia());
    }, { once: true });
  }

  function render() {
    const item = property();
    const scene = item.scenes[index];
    const progress = ((index + 1) / item.scenes.length) * 100;

    app.innerHTML = '<section class="shell ' + item.treatment + (reduced.matches ? ' reduced' : '') + '">' +
      '<header class="topbar">' +
        '<div class="brand">CINEMATIC LISTINGS <small>REVIEW BUILD</small></div>' +
        '<div class="property-switch">' +
          ids.map((id) => '<button data-property="' + id + '" aria-pressed="' + (id === propertyId) + '">' + catalog[id].label + '</button>').join('') +
        '</div>' +
      '</header>' +
      '<div class="stage" tabindex="0">' +
        '<div class="media">' + sceneMedia(scene) + '<div class="shade"></div></div>' +
        '<div class="scene-count" aria-hidden="true">' + String(index + 1).padStart(2, "0") + '</div>' +
        '<article class="copy">' +
          '<p class="kicker">' + scene.kicker + ' / ' + item.location + '</p>' +
          '<h1>' + scene.title + '</h1>' +
          '<p class="body">' + scene.body + '</p>' +
          '<p class="disclosure">' + item.disclosure + '</p>' +
          (scene.final ? '<button class="concept-cta" data-action="explain">HOW THE REAL VERSION WORKS</button>' : '') +
        '</article>' +
        '<nav class="scene-nav" aria-label="Scenes">' +
          item.scenes.map((s, i) => '<button data-scene="' + i + '" class="' + (i === index ? 'active' : '') + '" aria-label="Go to ' + s.kicker + '">' + String(i + 1).padStart(2, "0") + '</button>').join('') +
        '</nav>' +
        '<div class="controls">' +
          '<button data-action="prev" ' + (index === 0 ? 'disabled' : '') + '>← BACK</button>' +
          '<div class="progress"><span style="width:' + progress + '%"></span></div>' +
          '<button data-action="next" ' + (index === item.scenes.length - 1 ? 'disabled' : '') + '>NEXT →</button>' +
        '</div>' +
      '</div>' +
      '<dialog id="explain"><div><p class="kicker">CONCEPT ONLY</p><h2>The property is the interface.</h2><p>Agents provide approved photography, verified property details and branding. A client version turns that material into a guided property microsite with one supplied enquiry or viewing path.</p><p class="dialog-note">No live contact action is wired in this review build.</p><button data-action="close">CLOSE</button></div></dialog>' +
    '</section>';

    installMediaFallback();

    app.querySelectorAll("[data-property]").forEach((button) => button.addEventListener("click", () => {
      propertyId = button.dataset.property;
      index = 0;
      render();
    }));
    app.querySelectorAll("[data-scene]").forEach((button) => button.addEventListener("click", () => {
      index = Number(button.dataset.scene);
      render();
    }));
    app.querySelector('[data-action="prev"]')?.addEventListener("click", () => go(-1));
    app.querySelector('[data-action="next"]')?.addEventListener("click", () => go(1));
    app.querySelector('[data-action="explain"]')?.addEventListener("click", () => app.querySelector("#explain")?.showModal());
    app.querySelector('[data-action="close"]')?.addEventListener("click", () => app.querySelector("#explain")?.close());
    updateUrl();
  }

  function go(delta) {
    const next = Math.max(0, Math.min(index + delta, property().scenes.length - 1));
    if (next === index) return;
    index = next;
    render();
  }

  addEventListener("keydown", (event) => {
    if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(event.key)) {
      event.preventDefault();
      go(1);
    } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) {
      event.preventDefault();
      go(-1);
    }
  });

  addEventListener("wheel", (event) => {
    const now = Date.now();
    if (Math.abs(event.deltaY) < 24 || now - lastWheel < 700) return;
    event.preventDefault();
    lastWheel = now;
    go(event.deltaY > 0 ? 1 : -1);
  }, { passive: false });

  addEventListener("touchstart", (event) => {
    const touch = event.changedTouches[0];
    touchStart = { x: touch.clientX, y: touch.clientY };
  }, { passive: true });

  addEventListener("touchend", (event) => {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    touchStart = null;
    const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
    if (Math.abs(delta) >= 44) go(delta < 0 ? 1 : -1);
  }, { passive: true });

  addEventListener("hashchange", () => {
    index = sceneIndexFromHash();
    render();
  });

  reduced.addEventListener?.("change", render);
  render();
})();
