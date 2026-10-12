/* Portfolio renderer — reads content.json and fills the page.
   Edit content.json to change what the site says; this file only
   handles layout, behavior and the motion layer. */

// Motion preferences — checked once; every animation below respects these.
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const FINE_POINTER = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const root = document.documentElement;

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
};

/* ---------- Theme toggle (circular view-transition reveal) ---------- */

document.getElementById("theme-toggle").addEventListener("click", (e) => {
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  const apply = () => {
    root.dataset.theme = next;
    store.set("theme", next);
    document.dispatchEvent(new Event("themechange"));
  };

  if (REDUCED_MOTION || !document.startViewTransition) {
    apply();
    return;
  }
  const rect = e.currentTarget.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  root.classList.add("theme-switching");
  const vt = document.startViewTransition(apply);
  // .catch: a transition aborted mid-flight (e.g. rapid re-click) rejects
  // these promises; the theme itself has already been applied.
  vt.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 700, easing: "cubic-bezier(0.16, 1, 0.3, 1)", pseudoElement: "::view-transition-new(root)" }
      );
    })
    .catch(() => {});
  vt.finished.finally(() => root.classList.remove("theme-switching")).catch(() => {});
});

const navToggle = document.getElementById("nav-toggle");
const navLinks = document.getElementById("nav-links");
navToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(open));
});
navLinks.addEventListener("click", (e) => {
  if (e.target.tagName === "A") {
    navLinks.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  }
});

const ICONS = {
  network:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="16" y="16" width="6" height="6" rx="1"/><path d="M12 8v4M5 16v-2a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"/></svg>',
  server:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>',
  shield:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  storage:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
  code:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
};

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function badgeRow(items, cls = "badge") {
  const badges = el("div", "badges");
  items.forEach((item, i) => {
    const b = el("span", cls, esc(item));
    b.style.setProperty("--i", i);
    badges.append(b);
  });
  return badges;
}

// Boot intro runs in parallel with the content fetch.
let bootResolve;
const bootDone = runBoot();

async function main() {
  // no-cache: revalidate every load so content.json edits show immediately
  // (GitHub Pages otherwise lets browsers reuse it for 10 minutes).
  const res = await fetch("content.json", { cache: "no-cache" });
  const data = await res.json();
  const p = data.profile;

  // --- Hero ---
  document.title = data.meta.siteTitle;
  document.getElementById("hero-eyebrow-text").textContent = `ONLINE · ${p.location.toUpperCase()}`;
  document.getElementById("hero-name").textContent = p.name;
  document.getElementById("hero-title").textContent = p.title;
  document.getElementById("hero-summary").textContent = p.summary;

  const heroGithub = document.getElementById("hero-github-btn");
  if (p.github) heroGithub.href = p.github;
  else heroGithub.hidden = true;

  const avatar = document.getElementById("avatar");
  if (p.photo) avatar.innerHTML = `<img src="${esc(p.photo)}" alt="Photo of ${esc(p.shortName)}">`;
  else avatar.textContent = p.initials;

  // --- Current role ---
  const cr = data.currentRole;
  document.getElementById("cr-title").textContent = p.title;
  document.getElementById("cr-company").textContent = cr.company;
  document.getElementById("cr-period").textContent = cr.period;
  document.getElementById("cr-intro").textContent = cr.intro;

  // Production environment: two counter-scrolling marquees. Each track holds
  // the list twice so translateX(-50%) loops seamlessly; copies are aria-hidden.
  const envItems = cr.environment.split("|").map((s) => s.trim());
  const fillTrack = (track, items) => {
    [0, 1].forEach((copy) => {
      items.forEach((tech) => {
        const chip = el("span", "env-chip mono", esc(tech));
        if (copy) chip.setAttribute("aria-hidden", "true");
        track.append(chip);
      });
    });
  };
  fillTrack(document.getElementById("cr-env-chips"), envItems);
  fillTrack(document.getElementById("cr-env-chips-2"), [...envItems].reverse());

  const crGrid = document.getElementById("cr-areas");
  cr.areas.forEach((a) => {
    const card = el("div", "card");
    card.append(
      el("div", "card-icon", ICONS[a.icon] || ICONS.server),
      el("h3", "", esc(a.title)),
      el("p", "", esc(a.text))
    );
    crGrid.append(card);
  });

  // --- Skills ---
  const skillsGrid = document.getElementById("skills-grid");
  data.skills.forEach((group) => {
    const card = el("div", "card");
    card.append(el("div", "card-icon", ICONS[group.icon] || ICONS.code), el("h3", "", esc(group.category)));
    const badges = badgeRow(group.items);
    badges.classList.add("pop");
    card.append(badges);
    skillsGrid.append(card);
  });

  // --- Ticker: every skill + environment item, doubled for a seamless loop ---
  const tickerItems = [...new Set([...data.skills.flatMap((g) => g.items), ...envItems])];
  const ticker = document.getElementById("ticker-track");
  [...tickerItems, ...tickerItems].forEach((t) => ticker.append(el("span", "", esc(t))));

  // --- Experience timeline ---
  const timeline = document.getElementById("timeline");
  data.experience.forEach((job, i) => {
    const item = el("div", "timeline-item");
    const details = el("details");
    if (i === 0) details.open = true;
    const summary = el(
      "summary",
      "",
      `<span class="chevron">▶</span>
       <span class="role">${esc(job.role)}</span>
       <span class="company">${esc(job.company)}</span>
       ${job.current ? '<span class="badge badge-accent">Current</span>' : ""}
       <span class="period">${esc(job.period)}</span>`
    );
    const ul = el("ul");
    job.bullets.forEach((b, j) => {
      const li = el("li", "", esc(b));
      li.style.setProperty("--i", j);
      ul.append(li);
    });
    details.append(summary, ul);
    item.append(details);
    timeline.append(item);
  });

  // --- Projects / Highlights (sticky stack) ---
  const projectsGrid = document.getElementById("projects-grid");
  data.projects.forEach((proj, i) => {
    const card = el("div", "card stack-card");
    card.style.setProperty("--n", i);
    card.append(
      el("span", "badge badge-outline card-tag", esc(proj.tag)),
      el("h3", "", esc(proj.title)),
      el("p", "", esc(proj.description))
    );
    const ul = el("ul");
    proj.points.forEach((pt) => ul.append(el("li", "", esc(pt))));
    card.append(ul, badgeRow(proj.tech));
    card.append(el("span", "stack-num", String(i + 1).padStart(2, "0")));
    projectsGrid.append(card);
  });

  // --- Additional projects ---
  const addGrid = document.getElementById("additional-grid");
  data.additionalProjects.forEach((proj) => {
    const card = el("div", "card");
    card.append(
      el("span", "badge badge-outline card-tag", esc(proj.status)),
      el("h3", "", esc(proj.title)),
      el("p", "", esc(proj.description))
    );
    const ul = el("ul");
    proj.points.forEach((pt) => ul.append(el("li", "", esc(pt))));
    card.append(ul);
    if (proj.privateNote) card.append(el("span", "badge badge-private", `🔒 ${esc(proj.privateNote)}`));
    if (proj.screenshots && proj.screenshots.length) {
      // Screenshot gallery — add image paths to "screenshots" in content.json to populate.
      const gallery = el("div", "screenshot-gallery");
      proj.screenshots.forEach((src) => {
        gallery.append(el("figure", "", `<img src="${esc(src)}" alt="Screenshot of ${esc(proj.title)}" loading="lazy">`));
      });
      card.append(gallery);
    }
    if (proj.link) {
      const a = el("a", "btn btn-ghost", `<span>${esc(proj.linkLabel || "View Project")}</span>`);
      a.href = proj.link;
      a.target = "_blank";
      a.rel = "noopener";
      a.dataset.cursor = "open";
      a.style.marginTop = "1rem";
      card.append(a);
    }
    addGrid.append(card);
  });

  // --- Testimonials (hidden until enabled in content.json) ---
  const t = data.testimonials;
  if (t && t.enabled && Array.isArray(t.items) && t.items.length) {
    document.getElementById("testimonials").hidden = false;
    if (t.heading) document.getElementById("testimonials-heading").textContent = t.heading;
    const grid = document.getElementById("testimonials-grid");
    t.items.forEach((item) => {
      grid.append(
        el(
          "div",
          "card testimonial-card",
          `<p class="testimonial-quote">“${esc(item.quote)}”</p>
           <p class="testimonial-name">${esc(item.name)}</p>
           <p class="testimonial-title">${esc(item.title)}</p>`
        )
      );
    });
  }

  // --- Education & certifications ---
  const eduList = document.getElementById("education-list");
  data.education.forEach((e) => {
    eduList.append(el("div", "edu-item", `<h4>${esc(e.institution)}</h4><p>${esc(e.detail)}</p><span class="period">${esc(e.period)}</span>`));
  });
  const certList = document.getElementById("cert-list");
  data.certifications.forEach((c) => {
    certList.append(el("div", "edu-item", `<h4>${esc(c.title)}</h4><p>${esc(c.detail)}</p><span class="period">${esc(c.period)}</span>`));
  });
  const langList = document.getElementById("lang-list");
  data.languages.forEach((l) => langList.append(el("span", "badge", `${esc(l.name)} · ${esc(l.level)}`)));

  // --- Resume ---
  const pdf = data.resume.file;
  ["hero-resume-btn", "resume-download", "resume-newtab", "resume-fallback-link"].forEach((id) => {
    document.getElementById(id).href = pdf;
  });
  document.getElementById("resume-embed").data = pdf;

  // --- CTA marquee ---
  const ctaTrack = document.getElementById("cta-marquee-track");
  const ctaWords = ["Reliable", "Secure", "Always On", "Networked"];
  for (let i = 0; i < 4; i++) ctaWords.forEach((w) => ctaTrack.append(el("span", "", `${esc(w)} ✦`)));

  // --- Contact ---
  const contacts = [
    { label: "Email", value: p.email, href: `mailto:${p.email}`, icon: "✉", cursor: "mail" },
    { label: "Phone", value: p.phone, href: `tel:${p.phone.replace(/[^+\d]/g, "")}`, icon: "☎", cursor: "call" },
    { label: "LinkedIn", value: p.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com/, ""), href: p.linkedin, icon: "in", cursor: "open" },
  ];
  if (p.github) {
    contacts.push({ label: "GitHub", value: p.github.replace(/^https?:\/\/(www\.)?github\.com\//, "@"), href: p.github, icon: "gh", cursor: "open" });
  }
  const contactLinks = document.getElementById("contact-links");
  contacts.forEach((c) => {
    const a = el(
      "a",
      "contact-card",
      `<span class="cc-icon mono">${esc(c.icon)}</span>
       <span class="cc-label">${esc(c.label)}</span>
       <span class="cc-value">${esc(c.value)}</span>`
    );
    a.href = c.href;
    a.dataset.cursor = c.cursor;
    if (c.href.startsWith("http")) {
      a.target = "_blank";
      a.rel = "noopener";
    }
    contactLinks.append(a);
  });

  document.getElementById("contact-mailto").href = `mailto:${p.email}?subject=Hello%20${encodeURIComponent(p.shortName)}`;
  document.getElementById("contact-location").textContent = `📍 ${p.location} (GMT+8)`;

  // --- Footer ---
  document.getElementById("footer-giant").textContent = p.shortName;
  document.getElementById("footer-line").innerHTML = `© ${new Date().getFullYear()} ${esc(p.name)} — deployed on GitHub Pages.`;

  // --- Motion layer (all rendered nodes exist from here on) ---
  initSplitText();
  initReveals();
  initScrollEffects();
  initNavIndicator();
  initSpotlightAndTilt();
  initMagnetic();
  initCursor();
  initFx();
  initClock();
  initCountUps();
  initHeroGlobe();
  initHeroParallax();

  await bootDone;
  heroEntrance(p, cr.areas.map((a) => a.title));
}

main().catch((err) => {
  console.error("Failed to load content.json:", err);
  endBoot();
  document.getElementById("hero-name").textContent =
    "Could not load content.json — if you opened index.html directly from disk, serve it over HTTP (e.g. python -m http.server).";
});

/* ==========================================================
   Motion layer — every effect below respects
   prefers-reduced-motion and degrades to the static page.
   ========================================================== */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- Boot intro ---------- */


function endBoot() {
  const boot = document.getElementById("boot");
  if (!root.classList.contains("is-booting")) {
    if (bootResolve) bootResolve();
    return;
  }
  try { sessionStorage.setItem("booted", "1"); } catch (e) {}
  boot.classList.add("boot-out");
  if (bootResolve) bootResolve();
  setTimeout(() => {
    root.classList.remove("is-booting");
    boot.remove();
  }, 1100);
}

function runBoot() {
  return new Promise((resolve) => {
    bootResolve = resolve;
    if (!root.classList.contains("is-booting")) {
      resolve();
      return;
    }
    const boot = document.getElementById("boot");
    const log = document.getElementById("boot-log");
    const bar = document.getElementById("boot-bar");
    const pct = document.getElementById("boot-pct");
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      endBoot();
    };
    boot.addEventListener("click", finish);
    setTimeout(finish, 6000); // failsafe — never trap the visitor

    const lines = [
      ["BIOS", "afiq-portfolio v3.0 — POST check"],
      ["NET ", "bringing up uplink interfaces"],
      ["VLAN", "admin / user / mgmt segments"],
      ["SEC ", "port-security · bpdu-guard · dhcp-snooping"],
      ["VMW ", "vCenter 7 handshake"],
      ["STOR", "replication policies verified"],
      ["SYS ", "rendering portfolio"],
    ];
    const start = performance.now();
    const TOTAL = 1900;
    (function tick(now) {
      if (done) return;
      const t = Math.min((now - start) / TOTAL, 1);
      const shown = Math.min(lines.length, Math.floor(t * lines.length) + 1);
      log.innerHTML = lines
        .slice(0, shown)
        .map(([k, v], i) => `<span class="dim">[${(i * 0.137 + 0.004).toFixed(3)}]</span> ${k} ${v} ${i < shown - 1 || t === 1 ? '<span class="ok">[ OK ]</span>' : "…"}`)
        .join("\n");
      bar.style.transform = `scaleX(${t})`;
      pct.textContent = Math.round(t * 100);
      if (t < 1) requestAnimationFrame(tick);
      else setTimeout(finish, 280);
    })(start);
  });
}

/* ---------- Text splitting ---------- */

function splitChars(node, { mask = false } = {}) {
  const text = node.textContent;
  node.textContent = "";
  node.setAttribute("aria-label", text);
  let i = 0;
  text.split(" ").forEach((word, wi, arr) => {
    const w = el("span", "w");
    w.setAttribute("aria-hidden", "true");
    [...word].forEach((ch) => {
      const c = el("span", "c");
      c.textContent = ch;
      c.style.setProperty("--i", i++);
      if (mask) {
        const m = el("span", "mask");
        m.append(c);
        w.append(m);
      } else {
        w.append(c);
      }
    });
    node.append(w);
    if (wi < arr.length - 1) node.append(document.createTextNode(" "));
  });
}

function splitWords(node) {
  const words = node.textContent.split(/\s+/).filter(Boolean);
  node.textContent = "";
  words.forEach((word, i) => {
    const s = el("span", "wd");
    s.textContent = word;
    s.style.setProperty("--i", i);
    node.append(s, document.createTextNode(" "));
  });
}

function initSplitText() {
  if (REDUCED_MOTION) return;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        entry.target.classList.add(entry.target.classList.contains("words") ? "words-in" : "split-in");
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -60px 0px" }
  );
  document.querySelectorAll("[data-split]").forEach((n) => {
    splitChars(n, { mask: true });
    n.classList.add("split");
    // Gradient text can't paint through transformed children, so give each
    // char its own slice of one continuous gradient.
    if (n.classList.contains("contact-headline")) {
      const cs = n.querySelectorAll(".c");
      cs.forEach((c, i) => {
        c.style.backgroundSize = `${cs.length * 100}% 100%`;
        c.style.backgroundPosition = `${cs.length > 1 ? (i / (cs.length - 1)) * 100 : 0}% 0`;
      });
    }
    io.observe(n);
  });
  document.querySelectorAll("[data-words]").forEach((n) => {
    splitWords(n);
    n.classList.add("words");
    io.observe(n);
  });

  // Footer giant name: per-letter hover bounce.
  const giant = document.getElementById("footer-giant");
  if (giant && FINE_POINTER) splitChars(giant);
}

/* ---------- Hero entrance: char flip-in → typed rotating title → fade-ups ---------- */

function typeInto(node, text, speed = 38) {
  return new Promise((resolve) => {
    let i = 0;
    (function tick() {
      node.textContent = text.slice(0, ++i);
      if (i < text.length) setTimeout(tick, speed);
      else resolve();
    })();
  });
}

async function eraseFrom(node, speed = 18) {
  while (node.textContent.length) {
    node.textContent = node.textContent.slice(0, -1);
    await sleep(speed);
  }
}

function scrambleText(node, finalText, duration = 700) {
  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ<>#/[]{}=+*01";
  return new Promise((resolve) => {
    let start = null;
    requestAnimationFrame(function step(now) {
      if (start === null) start = now;
      const t = Math.min((now - start) / duration, 1);
      const from = Math.floor(t * finalText.length);
      let out = finalText.slice(0, from);
      for (let i = from; i < finalText.length; i++) {
        out += finalText[i] === " " ? " " : CHARS[(Math.random() * CHARS.length) | 0];
      }
      node.textContent = out;
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    });
  });
}

async function heroEntrance(p, phrases) {
  if (REDUCED_MOTION) return; // static hero already rendered by main()
  const eyebrow = document.getElementById("hero-eyebrow-text");
  const name = document.getElementById("hero-name");
  const title = document.getElementById("hero-title");
  const fadeEls = [
    document.getElementById("hero-summary"),
    document.querySelector(".hero-actions"),
    document.querySelector(".hero-photo"),
    document.querySelector(".scroll-cue"),
  ].filter(Boolean);

  const eyebrowText = eyebrow.textContent;
  fadeEls.forEach((n) => n.classList.add("hero-fade"));
  title.textContent = "";

  // Name: per-letter 3D flip-in, gradient fill.
  name.textContent = "";
  name.setAttribute("aria-label", p.name);
  const chars = [];
  p.name.split(" ").forEach((word, wi, arr) => {
    const w = el("span", "word");
    w.setAttribute("aria-hidden", "true");
    [...word].forEach((ch) => {
      const c = el("span", "char pre");
      c.textContent = ch;
      w.append(c);
      chars.push(c);
    });
    name.append(w);
    if (wi < arr.length - 1) name.append(document.createTextNode(" "));
  });
  // Offset gradient per letter so the sweep reads as one continuous fill.
  chars.forEach((c, i) => {
    c.style.backgroundPosition = `${(i / chars.length) * 100}% 0`;
    c.style.animationDelay = `${-(i / chars.length) * 8}s`;
  });

  scrambleText(eyebrow, eyebrowText, 600);
  requestAnimationFrame(() => {
    chars.forEach((c, i) => setTimeout(() => c.classList.add("in"), 120 + i * 32));
  });
  await sleep(120 + chars.length * 32 + 250);

  fadeEls.forEach((n, i) => setTimeout(() => n.classList.add("hero-fade-in"), i * 140));
  await typeInto(title, p.title);

  // Rotate through current-role focus areas, always returning to the title.
  const cycle = [p.title, ...phrases];
  let idx = 0;
  while (true) {
    await sleep(idx === 0 ? 3200 : 2200);
    if (document.hidden) continue;
    idx = (idx + 1) % cycle.length;
    await eraseFrom(title);
    await typeInto(title, cycle[idx]);
  }
}

/* ---------- Scroll-triggered reveals ---------- */

function initReveals() {
  if (REDUCED_MOTION) return;
  const groups = [
    "#cr-areas > .card",
    "#skills-grid > .card",
    "#additional-grid > .card",
    "#education-list > .edu-item",
    "#cert-list > .edu-item",
    "#timeline .timeline-item > details",
    "#contact-links > .contact-card",
    ".current-role-line",
    ".cta-banner-inner",
    ".resume-actions",
  ];

  const pending = new Set();
  const reveal = (target) => {
    if (!pending.delete(target)) return;
    observer.unobserve(target);
    const item = target.closest(".timeline-item");
    if (item) item.classList.add("tl-seen");
    target.classList.add("in-view");
    const pops = target.querySelector(".badges.pop");
    if (pops) pops.classList.add("pop-in");
    // Once revealed, hand the element back to its stock styles so
    // hover transitions (cards, tilt) behave normally.
    const cleanup = () => {
      target.classList.remove("reveal", "in-view");
      target.style.transitionDelay = "";
      target.removeEventListener("transitionend", cleanup);
    };
    target.addEventListener("transitionend", cleanup);
    setTimeout(cleanup, 1600);
  };
  const observer = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && reveal(e.target)),
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  // Fallback: an anchor jump can skip past elements without them ever
  // intersecting — reveal anything already scrolled above the viewport.
  let ticking = false;
  addEventListener("scroll", () => {
    if (ticking || !pending.size) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      pending.forEach((n) => n.getBoundingClientRect().bottom < 0 && reveal(n));
    });
  }, { passive: true });

  groups.forEach((sel) => {
    document.querySelectorAll(sel).forEach((n, i) => {
      n.classList.add("reveal");
      n.style.transitionDelay = `${Math.min(i, 6) * 90}ms`;
      pending.add(n);
      observer.observe(n);
    });
  });
}

/* ---------- One rAF-throttled scroll handler for all scroll-linked effects ---------- */

function initScrollEffects() {
  const progress = document.getElementById("scroll-progress");
  const header = document.getElementById("site-header");
  const timeline = document.getElementById("timeline");
  const stackCards = [...document.querySelectorAll(".stack-card")];
  const resumeViewer = document.querySelector(".resume-viewer");
  const ctaTrack = document.getElementById("cta-marquee-track");
  const narrow = () => innerWidth <= 560;

  let ticking = false;
  let lastY = scrollY;
  let ctaX = 0;
  let velocity = 0;

  const update = () => {
    ticking = false;
    const y = scrollY;
    const vh = innerHeight;
    const max = root.scrollHeight - vh;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    header.classList.toggle("is-scrolled", y > 40);
    if (!navLinks.classList.contains("open")) {
      header.classList.toggle("is-hidden", y > lastY && y > 400);
    }
    velocity = y - lastY;
    lastY = y;

    if (REDUCED_MOTION) return;

    if (timeline) {
      const r = timeline.getBoundingClientRect();
      const drawn = Math.min(Math.max((vh * 0.7 - r.top) / r.height, 0), 1);
      timeline.style.setProperty("--tl-draw", drawn.toFixed(4));
    }

    // Stacked project cards: each card shrinks and dims as the next one slides over it.
    if (!narrow()) {
      stackCards.forEach((card, i) => {
        const next = stackCards[i + 1];
        if (!next) {
          card.style.transform = "";
          card.style.filter = "";
          return;
        }
        const cr = card.getBoundingClientRect();
        const nr = next.getBoundingClientRect();
        const overlap = Math.min(Math.max((cr.bottom - nr.top) / cr.height, 0), 1);
        card.style.transform = `scale(${(1 - overlap * 0.06).toFixed(4)})`;
        card.style.filter = `brightness(${(1 - overlap * 0.35).toFixed(3)})`;
      });
    }

    // Resume: lays flat as it scrolls into view.
    if (resumeViewer) {
      const r = resumeViewer.getBoundingClientRect();
      const t = Math.min(Math.max((vh - r.top) / (vh * 0.8), 0), 1);
      resumeViewer.style.setProperty("--rx", `${((1 - t) * 18).toFixed(2)}deg`);
      resumeViewer.style.setProperty("--rs", (0.92 + t * 0.08).toFixed(4));
    }
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll, { passive: true });
  onScroll();

  // CTA marquee: constant drift + scroll-velocity boost and skew.
  if (!REDUCED_MOTION && ctaTrack) {
    let visible = false;
    let raf = null;
    let skew = 0;
    const loop = () => {
      const boost = Math.max(-40, Math.min(40, velocity));
      ctaX -= 0.6 + Math.abs(boost) * 0.25;
      velocity *= 0.9;
      skew += (boost * -0.4 - skew) * 0.1;
      const half = ctaTrack.scrollWidth / 2;
      if (half > 0 && -ctaX > half) ctaX += half;
      ctaTrack.style.transform = `translate3d(${ctaX}px,0,0) skewX(${skew.toFixed(2)}deg)`;
      raf = visible ? requestAnimationFrame(loop) : null;
    };
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(loop);
    }).observe(ctaTrack);
  }
}

/* ---------- Nav: active section + sliding pill ---------- */

function initNavIndicator() {
  const links = [...document.querySelectorAll("[data-nav]")];
  const indicator = document.getElementById("nav-indicator");
  const sections = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);

  const moveTo = (a) => {
    if (!a || a.classList.contains("nav-cta")) {
      indicator.style.opacity = "0";
      return;
    }
    indicator.style.opacity = "1";
    indicator.style.width = `${a.offsetWidth}px`;
    indicator.style.transform = `translateX(${a.offsetLeft}px)`;
  };

  let current = null;
  const setActive = (id) => {
    const a = links.find((l) => l.getAttribute("href") === `#${id}`);
    if (a === current) return;
    links.forEach((l) => l.classList.toggle("active", l === a));
    current = a;
    moveTo(a);
  };

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) setActive(e.target.id);
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  sections.forEach((s) => io.observe(s));

  links.forEach((a) => {
    a.addEventListener("mouseenter", () => moveTo(a));
    a.addEventListener("mouseleave", () => moveTo(current));
  });
  addEventListener("resize", () => moveTo(current), { passive: true });
}

/* ---------- Cards: cursor spotlight + 3D tilt (desktop pointers) ---------- */

function initSpotlightAndTilt() {
  if (!FINE_POINTER) return;
  const MAX_DEG = 6;
  document.querySelectorAll(".card, .contact-card").forEach((card) => {
    const tilt = !REDUCED_MOTION && !card.classList.contains("stack-card");
    let raf = null, px = 0, py = 0;
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
      if (!tilt || card.classList.contains("reveal") || card.classList.contains("contact-card")) return;
      px = (e.clientX - r.left) / r.width - 0.5;
      py = (e.clientY - r.top) / r.height - 0.5;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        card.style.transform =
          `perspective(900px) rotateX(${(-py * MAX_DEG).toFixed(2)}deg) rotateY(${(px * MAX_DEG).toFixed(2)}deg) translateY(-6px)`;
      });
    });
    card.addEventListener("mouseleave", () => {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      if (tilt && !card.classList.contains("contact-card")) card.style.transform = "";
    });
  });
}

/* ---------- Magnetic buttons + nav links ---------- */

function initMagnetic() {
  if (REDUCED_MOTION || !FINE_POINTER) return;
  document.querySelectorAll(".btn, .theme-toggle, .contact-card .cc-icon").forEach((btn) => {
    const target = btn.classList.contains("cc-icon") ? btn.closest(".contact-card") : btn;
    const inner = btn.querySelector("span");
    const strength = btn.classList.contains("btn-lg") ? 14 : 9;
    target.addEventListener("mousemove", (e) => {
      const r = btn.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      btn.style.transform = `translate(${(dx * strength).toFixed(1)}px, ${(dy * strength * 0.7).toFixed(1)}px)`;
      if (inner && btn.classList.contains("btn")) inner.style.transform = `translate(${(dx * strength * 0.4).toFixed(1)}px, ${(dy * strength * 0.3).toFixed(1)}px)`;
    });
    target.addEventListener("mouseleave", () => {
      btn.style.transform = "";
      if (inner) inner.style.transform = "";
    });
  });
}

/* ---------- Custom cursor ---------- */

function initCursor() {
  if (REDUCED_MOTION || !FINE_POINTER) return;
  const dot = document.getElementById("cursor-dot");
  const ring = document.getElementById("cursor-ring");
  const label = document.getElementById("cursor-label");
  root.classList.add("has-cursor");
  dot.classList.add("is-hidden"); // stay hidden until the first mousemove
  ring.classList.add("is-hidden");

  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
  let shown = false;
  addEventListener("mousemove", (e) => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px)`;
    if (!shown) {
      shown = true;
      rx = mx;
      ry = my;
      dot.classList.remove("is-hidden");
      ring.classList.remove("is-hidden");
    }
  }, { passive: true });
  document.addEventListener("mouseleave", () => {
    shown = false;
    dot.classList.add("is-hidden");
    ring.classList.add("is-hidden");
  });
  addEventListener("mousedown", () => ring.classList.add("is-down"));
  addEventListener("mouseup", () => ring.classList.remove("is-down"));

  (function follow() {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    ring.style.transform = `translate(${rx.toFixed(1)}px, ${ry.toFixed(1)}px)`;
    requestAnimationFrame(follow);
  })();

  document.addEventListener("mouseover", (e) => {
    const t = e.target.closest("a, button, summary, .card, .env-chip, .badge");
    const lbl = t && t.dataset ? t.dataset.cursor : "";
    ring.classList.toggle("is-hover", !!t && !lbl);
    ring.classList.toggle("has-label", !!lbl);
    label.textContent = lbl || "";
  });
}

/* ---------- FX canvas: click bursts + "Say Hello" fireworks ---------- */

function initFx() {
  if (REDUCED_MOTION) return;
  const canvas = document.getElementById("fx-canvas");
  const ctx = canvas.getContext("2d");
  let particles = [];
  let running = false;
  let colors = [];

  const readColors = () => {
    const cs = getComputedStyle(root);
    colors = ["--accent", "--accent-2", "--accent-3"].map((v) => cs.getPropertyValue(v).trim());
  };
  readColors();
  document.addEventListener("themechange", () => setTimeout(readColors, 50));

  const size = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();
  addEventListener("resize", size, { passive: true });

  const burst = (x, y, n, power) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (0.4 + Math.random()) * power;
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - power * 0.3,
        life: 1,
        decay: 0.012 + Math.random() * 0.02,
        r: 1.5 + Math.random() * 2.5,
        c: colors[(Math.random() * colors.length) | 0],
        sq: Math.random() < 0.4,
      });
    }
    if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  };

  const frame = () => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    particles = particles.filter((p) => p.life > 0);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.vx *= 0.985;
      p.life -= p.decay;
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.fillStyle = p.c;
      if (p.sq) ctx.fillRect(p.x, p.y, p.r * 1.6, p.r * 1.6);
      else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    if (particles.length) requestAnimationFrame(frame);
    else running = false;
  };

  addEventListener("pointerdown", (e) => {
    if (e.target.closest(".btn-hello, .btn-primary")) return;
    burst(e.clientX, e.clientY, 14, 3.2);
  });
  document.querySelectorAll(".btn-primary").forEach((b) => {
    b.addEventListener("click", (e) => {
      const big = b.classList.contains("btn-hello");
      burst(e.clientX, e.clientY, big ? 140 : 40, big ? 9 : 5.5);
    });
  });
}

/* ---------- Live clock (Asia/Kuala_Lumpur), contact section ---------- */

function initClock() {
  const clock = document.getElementById("contact-clock");
  if (!clock) return;
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const tick = () => {
    clock.textContent = `⏱ LOCAL TIME ${fmt.format(new Date())} MYT`;
  };
  tick();
  setInterval(tick, 1000);
}

/* ---------- Count-up utility (dormant until elements carry data-count-to) ---------- */

function initCountUps() {
  const els = document.querySelectorAll("[data-count-to]");
  if (!els.length) return;
  const animate = (node) => {
    const raw = node.dataset.countTo;
    const target = parseFloat(raw);
    if (Number.isNaN(target)) return;
    const suffix = node.dataset.countSuffix || "";
    if (REDUCED_MOTION) {
      node.textContent = raw + suffix;
      return;
    }
    const duration = parseInt(node.dataset.countDuration, 10) || 1200;
    const decimals = (raw.split(".")[1] || "").length;
    let start = null;
    requestAnimationFrame(function step(now) {
      if (start === null) start = now;
      const t = Math.min((now - start) / duration, 1);
      node.textContent = (target * (1 - Math.pow(1 - t, 3))).toFixed(decimals) + suffix;
      if (t < 1) requestAnimationFrame(step);
    });
  };
  // threshold 0: zero-size placeholders never reach a fractional threshold.
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        animate(entry.target);
      });
    },
    { threshold: 0 }
  );
  els.forEach((node) => observer.observe(node));
}

/* ---------- Hero: rotating 3D network globe with travelling packets ---------- */

function hexToRgb(hex) {
  const m = hex.trim().match(/^#([0-9a-f]{6})$/i);
  if (!m) return "45, 212, 191";
  return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).join(", ");
}

function initHeroGlobe() {
  if (REDUCED_MOTION) return;
  const hero = document.querySelector(".hero");
  const canvas = document.getElementById("hero-globe");
  const ctx = canvas.getContext("2d");
  const small = innerWidth < 820;

  let w = 0, h = 0, cx = 0, cy = 0, R = 0;
  let c1 = "45, 212, 191", c2 = "139, 92, 246";
  const readColors = () => {
    const cs = getComputedStyle(root);
    c1 = hexToRgb(cs.getPropertyValue("--accent"));
    c2 = hexToRgb(cs.getPropertyValue("--accent-2"));
  };
  readColors();
  document.addEventListener("themechange", () => setTimeout(readColors, 50));

  // Fibonacci sphere → evenly spread nodes.
  const N = small ? 110 : 220;
  const pts = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = golden * i;
    pts.push({ x: Math.cos(th) * r, y, z: Math.sin(th) * r });
  }
  // Link each node to its 3 nearest neighbours.
  const edges = [];
  const seen = new Set();
  pts.forEach((a, i) => {
    pts
      .map((b, j) => ({ j, d: (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2 }))
      .filter((o) => o.j !== i)
      .sort((p, q) => p.d - q.d)
      .slice(0, 3)
      .forEach(({ j }) => {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (!seen.has(key)) {
          seen.add(key);
          edges.push([i, j]);
        }
      });
  });
  // Packets hop along random edges.
  const packets = Array.from({ length: small ? 14 : 30 }, () => ({ e: (Math.random() * edges.length) | 0, t: Math.random(), s: 0.006 + Math.random() * 0.012 }));

  const size = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = hero.clientWidth;
    h = hero.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const wide = w > 900;
    R = Math.min(wide ? w * 0.27 : w * 0.55, h * 0.42);
    cx = wide ? w * 0.72 : w * 0.5;
    cy = h * 0.5;
  };
  size();

  let rotY = 0, rotX = 0.35, targetX = 0.35, spinBoost = 0, tmx = 0;
  let scrollFade = 1;
  if (FINE_POINTER) {
    hero.addEventListener("mousemove", (e) => {
      const r = hero.getBoundingClientRect();
      tmx = (e.clientX - r.left) / r.width - 0.5;
      targetX = 0.35 + ((e.clientY - r.top) / r.height - 0.5) * 0.6;
    });
  }
  addEventListener("scroll", () => {
    scrollFade = Math.max(0, 1 - scrollY / (h * 0.9));
  }, { passive: true });

  const proj = new Array(N);
  let running = false, rafId = null, heroVisible = true;

  const frame = () => {
    if (!running) return;
    spinBoost += (tmx * 0.012 - spinBoost) * 0.05;
    rotY += 0.0022 + spinBoost;
    rotX += (targetX - rotX) * 0.04;
    const sy = Math.sin(rotY), cyR = Math.cos(rotY), sx = Math.sin(rotX), cxR = Math.cos(rotX);

    for (let i = 0; i < N; i++) {
      const p = pts[i];
      const x1 = p.x * cyR - p.z * sy;
      const z1 = p.x * sy + p.z * cyR;
      const y2 = p.y * cxR - z1 * sx;
      const z2 = p.y * sx + z1 * cxR;
      const persp = 1.8 / (2.6 - z2);
      proj[i] = { x: cx + x1 * R * persp, y: cy + y2 * R * persp, z: z2 };
    }

    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = scrollFade;

    // halo
    const g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.5);
    g.addColorStop(0, `rgba(${c1}, 0.10)`);
    g.addColorStop(0.5, `rgba(${c2}, 0.05)`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.lineWidth = 1;
    for (const [a, b] of edges) {
      const pa = proj[a], pb = proj[b];
      const depth = (pa.z + pb.z) / 2;
      const alpha = 0.06 + (depth + 1) * 0.16;
      ctx.strokeStyle = `rgba(${depth > 0 ? c1 : c2}, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }
    for (let i = 0; i < N; i++) {
      const p = proj[i];
      const d = (p.z + 1) / 2;
      ctx.fillStyle = `rgba(${c1}, ${(0.2 + d * 0.7).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 0.8 + d * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const pk of packets) {
      pk.t += pk.s;
      if (pk.t >= 1) {
        // hop onto an edge that shares the arrival node
        const end = edges[pk.e][1];
        const nexts = edges.map((e, k) => (e[0] === end ? k : -1)).filter((k) => k >= 0);
        pk.e = nexts.length ? nexts[(Math.random() * nexts.length) | 0] : (Math.random() * edges.length) | 0;
        pk.t = 0;
      }
      const [a, b] = edges[pk.e];
      const pa = proj[a], pb = proj[b];
      const x = pa.x + (pb.x - pa.x) * pk.t;
      const y = pa.y + (pb.y - pa.y) * pk.t;
      const z = pa.z + (pb.z - pa.z) * pk.t;
      if (z < -0.2) continue;
      ctx.fillStyle = "#fff";
      ctx.shadowColor = `rgb(${c1})`;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    rafId = requestAnimationFrame(frame);
  };

  const setRunning = (on) => {
    if (on === running) return;
    running = on;
    if (on) rafId = requestAnimationFrame(frame);
    else if (rafId) cancelAnimationFrame(rafId);
  };
  new IntersectionObserver(([e]) => {
    heroVisible = e.isIntersecting;
    setRunning(heroVisible && !document.hidden);
  }).observe(hero);
  document.addEventListener("visibilitychange", () => setRunning(heroVisible && !document.hidden));
  setRunning(true);

  let resizeTimer;
  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(size, 150);
  }, { passive: true });
}

/* ---------- Hero: avatar orbit parallax ---------- */

function initHeroParallax() {
  if (REDUCED_MOTION || !FINE_POINTER) return;
  const hero = document.querySelector(".hero");
  const orbit = document.querySelector(".avatar-orbit");
  const text = document.querySelector(".hero-text");
  hero.addEventListener("mousemove", (e) => {
    const x = e.clientX / innerWidth - 0.5;
    const y = e.clientY / innerHeight - 0.5;
    orbit.style.transform = `perspective(800px) rotateY(${x * 22}deg) rotateX(${-y * 22}deg) translate(${x * 20}px, ${y * 20}px)`;
    text.style.transform = `translate(${x * -12}px, ${y * -8}px)`;
  });
  hero.addEventListener("mouseleave", () => {
    orbit.style.transform = "";
    text.style.transform = "";
  });
}
