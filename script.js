/* Portfolio renderer — reads content.json and fills the page.
   Edit content.json to change what the site says; this file only
   handles layout and behavior. */

(function themeInit() {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") {
    document.documentElement.dataset.theme = saved;
  }
})();

document.getElementById("theme-toggle").addEventListener("click", () => {
  const root = document.documentElement;
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  localStorage.setItem("theme", next);
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
  document.getElementById("hero-location").textContent = p.location.toUpperCase();
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

  // --- Case studies ---
  const csList = document.getElementById("case-studies-list");
  (data.caseStudies || []).forEach((cs) => {
    const details = el("details", "case-study");
    const summary = el(
      "summary",
      "",
      `<span class="chevron">▶</span>
       <span class="cs-title">${esc(cs.title)}</span>
       <span class="badge badge-outline">${esc(cs.tag)}</span>`
    );
    const body = el("div", "cs-body");
    body.append(
      el("div", "cs-block", `<h4 class="mono">Problem</h4><p>${esc(cs.problem)}</p>`),
      el("div", "cs-block", `<h4 class="mono">My Role</h4><p>${esc(cs.role)}</p>`)
    );
    const techBlock = el("div", "cs-block", '<h4 class="mono">Tech Stack</h4>');
    const techBadges = el("div", "badges");
    cs.tech.forEach((t) => techBadges.append(el("span", "badge", esc(t))));
    techBlock.append(techBadges);
    body.append(
      techBlock,
      el("div", "cs-block", `<h4 class="mono">Challenges</h4><p>${esc(cs.challenges)}</p>`),
      el("div", "cs-block", `<h4 class="mono">Result</h4><p>${esc(cs.result)}</p>`)
    );
    details.append(summary, body);
    csList.append(details);
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
}

main().catch((err) => {
  console.error("Failed to load content.json:", err);
  document.getElementById("hero-name").textContent =
    "Could not load content.json — if you opened index.html directly from disk, serve it over HTTP (e.g. python -m http.server).";
});
