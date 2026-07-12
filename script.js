/* Portfolio renderer — reads content.json and fills the page.
   Edit content.json to change what the site says; this file only
   handles layout and behavior. */

(function themeInit() {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") {
    document.documentElement.dataset.theme = saved;
  }
})();

// Motion preferences — checked once; every animation below respects these.
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const FINE_POINTER = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

document.getElementById("theme-toggle").addEventListener("click", (e) => {
  const root = document.documentElement;
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  const apply = () => {
    root.dataset.theme = next;
    localStorage.setItem("theme", next);
  };

  // Circular reveal via the View Transitions API where available;
  // instant switch otherwise (and for reduced-motion users).
  if (REDUCED_MOTION || !document.startViewTransition) {
    apply();
    return;
  }
  const rect = e.currentTarget.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );
  root.classList.add("theme-switching");
  const vt = document.startViewTransition(apply);
  // .catch: a transition aborted mid-flight (e.g. rapid re-click) rejects
  // these promises; the theme itself has already been applied.
  vt.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 450, easing: "ease-in-out", pseudoElement: "::view-transition-new(root)" }
      );
    })
    .catch(() => {});
  vt.finished
    .finally(() => root.classList.remove("theme-switching"))
    .catch(() => {});
});

const navToggle = document.getElementById("nav-toggle");
const navLinks = document.getElementById("nav-links");
navToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(open));
});
navLinks.addEventListener("click", (e) => {
  if (e.target.tagName === "A") navLinks.classList.remove("open");
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

async function main() {
  const res = await fetch("content.json");
  const data = await res.json();
  const p = data.profile;

  // --- Hero ---
  document.title = data.meta.siteTitle;
  document.getElementById("hero-eyebrow-text").textContent = `ONLINE · ${p.location.toUpperCase()}`;
  document.getElementById("hero-name").textContent = p.name;
  document.getElementById("hero-title").textContent = p.title;
  document.getElementById("hero-summary").textContent = p.summary;

  const heroGithub = document.getElementById("hero-github-btn");
  if (p.github) {
    heroGithub.href = p.github;
  } else {
    heroGithub.hidden = true;
  }

  const avatar = document.getElementById("avatar");
  if (p.photo) {
    avatar.innerHTML = `<img src="${esc(p.photo)}" alt="Photo of ${esc(p.shortName)}">`;
  } else {
    avatar.textContent = p.initials;
  }

  // --- Current role ---
  const cr = data.currentRole;
  document.getElementById("cr-title").textContent = p.title;
  document.getElementById("cr-company").textContent = cr.company;
  document.getElementById("cr-period").textContent = cr.period;
  document.getElementById("cr-intro").textContent = cr.intro;

  const envChips = document.getElementById("cr-env-chips");
  cr.environment.split("|").map((s) => s.trim()).forEach((tech, i) => {
    const chip = el("span", "env-chip mono", esc(tech));
    chip.style.transitionDelay = `${i * 80}ms`;
    envChips.append(chip);
  });

  const envPanel = document.getElementById("cr-environment");
  const envObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          envObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.3 }
  );
  envObserver.observe(envPanel);

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
    card.append(
      el("div", "card-icon", ICONS[group.icon] || ICONS.code),
      el("h3", "", esc(group.category))
    );
    const badges = el("div", "badges");
    group.items.forEach((item) => badges.append(el("span", "badge", esc(item))));
    card.append(badges);
    skillsGrid.append(card);
  });

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
    job.bullets.forEach((b) => ul.append(el("li", "", esc(b))));
    details.append(summary, ul);
    item.append(details);
    timeline.append(item);
  });

  // --- Projects / Highlights ---
  const projectsGrid = document.getElementById("projects-grid");
  data.projects.forEach((proj) => {
    const card = el("div", "card");
    card.append(
      el("span", "badge badge-outline card-tag", esc(proj.tag)),
      el("h3", "", esc(proj.title)),
      el("p", "", esc(proj.description))
    );
    const ul = el("ul");
    proj.points.forEach((pt) => ul.append(el("li", "", esc(pt))));
    card.append(ul);
    const badges = el("div", "badges");
    proj.tech.forEach((t) => badges.append(el("span", "badge", esc(t))));
    card.append(badges);
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
    if (proj.privateNote) {
      card.append(el("span", "badge badge-private", `🔒 ${esc(proj.privateNote)}`));
    }
    if (proj.screenshots && proj.screenshots.length) {
      // Screenshot gallery — add image paths to "screenshots" in content.json to populate.
      const gallery = el("div", "screenshot-gallery");
      proj.screenshots.forEach((src) => {
        gallery.append(el("figure", "", `<img src="${esc(src)}" alt="Screenshot of ${esc(proj.title)}" loading="lazy">`));
      });
      card.append(gallery);
    }
    if (proj.link) {
      const a = el("a", "btn btn-ghost", esc(proj.linkLabel || "View Project"));
      a.href = proj.link;
      a.target = "_blank";
      a.rel = "noopener";
      a.style.marginTop = "1rem";
      card.append(a);
    }
    addGrid.append(card);
  });

  // --- Testimonials (hidden until enabled in content.json) ---
  const t = data.testimonials;
  if (t && t.enabled && Array.isArray(t.items) && t.items.length) {
    const section = document.getElementById("testimonials");
    section.hidden = false;
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
    eduList.append(
      el(
        "div",
        "edu-item",
        `<h4>${esc(e.institution)}</h4><p>${esc(e.detail)}</p><span class="period">${esc(e.period)}</span>`
      )
    );
  });

  const certList = document.getElementById("cert-list");
  data.certifications.forEach((c) => {
    certList.append(
      el(
        "div",
        "edu-item",
        `<h4>${esc(c.title)}</h4><p>${esc(c.detail)}</p><span class="period">${esc(c.period)}</span>`
      )
    );
  });

  const langList = document.getElementById("lang-list");
  data.languages.forEach((l) => {
    langList.append(el("span", "badge", `${esc(l.name)} · ${esc(l.level)}`));
  });

  // --- Resume ---
  const pdf = data.resume.file;
  document.getElementById("hero-resume-btn").href = pdf;
  document.getElementById("resume-download").href = pdf;
  document.getElementById("resume-newtab").href = pdf;
  document.getElementById("resume-fallback-link").href = pdf;
  document.getElementById("resume-embed").data = pdf;

  // --- Contact ---
  const contacts = [
    { label: "Email", value: p.email, href: `mailto:${p.email}`, icon: "✉" },
    { label: "Phone", value: p.phone, href: `tel:${p.phone.replace(/[^+\d]/g, "")}`, icon: "☎" },
    { label: "LinkedIn", value: p.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com/, ""), href: p.linkedin, icon: "in" },
  ];
  if (p.github) {
    contacts.push({ label: "GitHub", value: p.github.replace(/^https?:\/\/(www\.)?github\.com\//, "@"), href: p.github, icon: "gh" });
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
    if (c.href.startsWith("http")) {
      a.target = "_blank";
      a.rel = "noopener";
    }
    contactLinks.append(a);
  });

  document.getElementById("contact-mailto").href = `mailto:${p.email}?subject=Hello%20${encodeURIComponent(p.shortName)}`;
  document.getElementById("contact-location").textContent = `📍 ${p.location} (GMT+8)`;

  // --- Footer ---
  document.getElementById("footer-line").innerHTML =
    `© ${new Date().getFullYear()} ${esc(p.name)} — deployed on GitHub Pages.`;

  // --- Animation layer (all rendered nodes exist from here on) ---
  initReveals();
  initScrollEffects();
  initCardTilt();
  initMagneticButtons();
  initClock();
  initCountUps();
  initHeroNetwork();
  heroEntrance(p);
}

main().catch((err) => {
  console.error("Failed to load content.json:", err);
  document.getElementById("hero-name").textContent =
    "Could not load content.json — if you opened index.html directly from disk, serve it over HTTP (e.g. python -m http.server).";
});

/* ==========================================================
   Animation layer — every effect below respects
   prefers-reduced-motion and degrades to the static page.
   ========================================================== */

// --- Hero entrance: terminal typing → name decrypt → staged fade-ups ---

function typeText(node, text, speed = 32) {
  return new Promise((resolve) => {
    node.classList.add("typing");
    let i = 0;
    (function tick() {
      node.textContent = text.slice(0, ++i);
      if (i < text.length) {
        setTimeout(tick, speed);
      } else {
        node.classList.remove("typing");
        resolve();
      }
    })();
  });
}

function scrambleText(node, finalText, duration = 850) {
  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ<>#/[]{}=+*";
  const randomize = (from) => {
    let out = finalText.slice(0, from);
    for (let i = from; i < finalText.length; i++) {
      out += finalText[i] === " " ? " " : CHARS[(Math.random() * CHARS.length) | 0];
    }
    return out;
  };
  node.textContent = randomize(0);
  return new Promise((resolve) => {
    let start = null;
    requestAnimationFrame(function step(now) {
      if (start === null) start = now;
      const t = Math.min((now - start) / duration, 1);
      node.textContent = randomize(Math.floor(t * finalText.length));
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    });
  });
}

async function heroEntrance(p) {
  if (REDUCED_MOTION) return; // static hero already rendered by main()
  const eyebrow = document.getElementById("hero-eyebrow-text");
  const name = document.getElementById("hero-name");
  const fadeEls = [
    document.getElementById("hero-title"),
    document.getElementById("hero-summary"),
    document.querySelector(".hero-actions"),
    document.querySelector(".hero-photo"),
  ].filter(Boolean);

  const eyebrowText = eyebrow.textContent;
  const nameText = name.textContent;
  eyebrow.textContent = "";
  fadeEls.forEach((el) => el.classList.add("hero-fade"));

  await typeText(eyebrow, eyebrowText);
  await scrambleText(name, nameText);
  fadeEls.forEach((el, i) => {
    setTimeout(() => el.classList.add("hero-fade-in"), i * 130);
  });
}

// --- Scroll-triggered reveals (extends the env-panel pattern site-wide) ---

function initReveals() {
  if (REDUCED_MOTION) return;
  const groups = [
    "#cr-areas > .card",
    "#skills-grid > .card",
    "#projects-grid > .card",
    "#additional-grid > .card",
    "#education-list > .edu-item",
    "#cert-list > .edu-item",
    "#timeline .timeline-item > details",
  ];

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const target = entry.target;
        observer.unobserve(target);
        const item = target.closest(".timeline-item");
        if (item) item.classList.add("tl-seen"); // dot glow fires first
        target.classList.add("in-view");
        // Once revealed, hand the element back to its stock styles so
        // hover transitions (cards, tilt) behave exactly as before.
        const cleanup = () => {
          target.classList.remove("reveal", "in-view");
          target.style.transitionDelay = "";
          target.removeEventListener("transitionend", cleanup);
        };
        target.addEventListener("transitionend", cleanup);
        setTimeout(cleanup, 1500);
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  groups.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el, i) => {
      el.classList.add("reveal");
      el.style.transitionDelay = `${Math.min(i, 6) * 80}ms`;
      observer.observe(el);
    });
  });
}

// --- Scroll progress bar + timeline line draw-in (one rAF-throttled handler) ---

function initScrollEffects() {
  const progress = document.getElementById("scroll-progress");
  const timeline = document.getElementById("timeline");
  let ticking = false;

  const update = () => {
    ticking = false;
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    if (timeline && !REDUCED_MOTION) {
      const rect = timeline.getBoundingClientRect();
      const drawn = Math.min(Math.max((window.innerHeight * 0.75 - rect.top) / rect.height, 0), 1);
      timeline.style.setProperty("--tl-draw", drawn.toFixed(4));
    }
  };
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();
}

// --- Subtle 3D tilt on cards (desktop pointers only) ---

function initCardTilt() {
  if (REDUCED_MOTION || !FINE_POINTER) return;
  const MAX_DEG = 3.5;
  document.querySelectorAll(".card").forEach((card) => {
    let px = 0, py = 0, raf = null;
    card.addEventListener("mousemove", (e) => {
      if (card.classList.contains("reveal")) return; // don't fight the reveal transition
      const r = card.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width - 0.5;
      py = (e.clientY - r.top) / r.height - 0.5;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        card.style.transform =
          `perspective(700px) rotateX(${(-py * MAX_DEG).toFixed(2)}deg) ` +
          `rotateY(${(px * MAX_DEG).toFixed(2)}deg) translateY(-3px)`;
      });
    });
    card.addEventListener("mouseleave", () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
      }
      card.style.transform = "";
    });
  });
}

// --- Magnetic pull on primary CTAs (desktop pointers only) ---

function initMagneticButtons() {
  if (REDUCED_MOTION || !FINE_POINTER) return;
  document.querySelectorAll(".btn-primary, .btn-lg").forEach((btn) => {
    btn.addEventListener("mousemove", (e) => {
      const r = btn.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      // -2px keeps the stock .btn:hover lift baked in
      btn.style.transform = `translate(${(dx * 5).toFixed(1)}px, ${(dy * 4 - 2).toFixed(1)}px)`;
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "";
    });
  });
}

// --- Live clock (Asia/Kuala_Lumpur), contact section ---

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

// --- Count-up utility (dormant until elements carry data-count-to) ---

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
      const eased = 1 - Math.pow(1 - t, 3);
      node.textContent = (target * eased).toFixed(decimals) + suffix;
      if (t < 1) requestAnimationFrame(step);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        animate(entry.target);
      });
    },
    // threshold 0: zero-size placeholders (empty spans) never reach a
    // fractional visibility threshold, so fire on first intersection.
    { threshold: 0 }
  );
  els.forEach((node) => observer.observe(node));
}

// --- Hero background: drifting network nodes (desktop only, pauses offscreen) ---

function initHeroNetwork() {
  if (REDUCED_MOTION || !FINE_POINTER || window.innerWidth < 820) return;
  const hero = document.querySelector(".hero");
  const canvas = document.createElement("canvas");
  canvas.className = "hero-net";
  canvas.setAttribute("aria-hidden", "true");
  hero.prepend(canvas);
  const ctx = canvas.getContext("2d");

  let w = 0, h = 0, nodes = [];
  let running = false, rafId = null, heroVisible = false;

  let accent = "45, 212, 191";
  const readAccent = () => {
    const c = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    const m = c.match(/^#([0-9a-f]{6})$/i);
    if (m) {
      accent = [m[1].slice(0, 2), m[1].slice(2, 4), m[1].slice(4, 6)]
        .map((x) => parseInt(x, 16))
        .join(", ");
    }
  };
  readAccent();
  document.getElementById("theme-toggle").addEventListener("click", () => setTimeout(readAccent, 60));

  const size = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = hero.clientWidth;
    h = hero.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(Math.floor((w * h) / 26000), 60);
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
    }));
  };
  size();

  const LINK = 130;
  const frame = () => {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1;
    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
    }
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < LINK * LINK) {
          ctx.strokeStyle = `rgba(${accent}, ${((1 - Math.sqrt(d2) / LINK) * 0.28).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      ctx.fillStyle = `rgba(${accent}, 0.5)`;
      ctx.beginPath();
      ctx.arc(a.x, a.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    rafId = requestAnimationFrame(frame);
  };

  const setRunning = (on) => {
    if (on === running) return;
    running = on;
    if (on) rafId = requestAnimationFrame(frame);
    else if (rafId) cancelAnimationFrame(rafId);
  };

  new IntersectionObserver((entries) => {
    heroVisible = entries[0].isIntersecting;
    setRunning(heroVisible && !document.hidden);
  }).observe(hero);
  document.addEventListener("visibilitychange", () => setRunning(heroVisible && !document.hidden));

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(size, 150);
  }, { passive: true });
}
