import { supabase } from "./supabase.js";

const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");
const projectList = document.getElementById("projectList");
const certificateList = document.getElementById("certificateList");
const feedbackForm = document.getElementById("feedbackForm");
const contactSubmit = document.getElementById("contactSubmit");
const contactStatus = document.getElementById("contactStatus");
const imageModal = document.getElementById("imageModal");
const modalImage = document.getElementById("modalImage");
const modalClose = document.getElementById("modalClose");
const navSections = Array.from(navLinks.querySelectorAll('a[href^="#"]'))
  .map(link => ({ link, section: document.querySelector(link.hash) }))
  .filter(item => item.section);

const externalLinkIcon = `
  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path d="M5 11 11 5M5 5h6v6"/>
  </svg>
`;

const githubIcon = `
  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path d="M8 .7a7.3 7.3 0 0 0-2.31 14.23c.37.07.5-.16.5-.36v-1.38c-2.05.45-2.49-.86-2.49-.86-.33-.85-.8-1.08-.8-1.08-.66-.45.05-.44.05-.44.73.05 1.12.75 1.12.75.65 1.12 1.7.8 2.12.61.07-.47.25-.8.46-.98-1.64-.19-3.36-.82-3.36-3.65 0-.8.29-1.47.76-1.98-.08-.19-.33-.94.07-1.95 0 0 .62-.2 2.01.75a6.98 6.98 0 0 1 3.66 0c1.39-.95 2.01-.75 2.01-.75.4 1.01.15 1.76.07 1.95.47.51.76 1.18.76 1.98 0 2.84-1.73 3.46-3.38 3.65.27.23.5.68.5 1.36v2.01c0 .2.13.43.51.36A7.3 7.3 0 0 0 8 .7Z"/>
  </svg>
`;

function escapeHTML(value) {
  return String(value || "")
    .replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}\uFE0F\u200D\u20E3]/gu, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeURL(value) {
  let url = String(value || "").trim();

  const markdownLink = url.match(/^\[[^\]]+\]\((https?:\/\/[^)]+)\)$/i);
  if (markdownLink) {
    url = markdownLink[1];
  } else if (url.includes("](")) {
    url = url.slice(0, url.indexOf("]("));
  }

  if (!url) return "#";

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("assets/")
  ) {
    try {
      const parsedURL = new URL(url, window.location.href);
      if (parsedURL.protocol !== "http:" && parsedURL.protocol !== "https:") return "#";
    } catch {
      return "#";
    }

    return escapeHTML(url);
  }

  return "#";
}

function normalizeTech(tags) {
  if (!Array.isArray(tags)) return [];

  return tags
    .map(tag => displayText(tag).trim())
    .filter(tag => tag && tag.length <= 24)
    .slice(0, 4);
}

function displayText(value) {
  return String(value || "").replaceAll("\u2014", ":");
}

function displayProjectTitle(title) {
  const projectTitle = displayText(title).trim();

  if (/CIITM/i.test(projectTitle) && /dashboard/i.test(projectTitle)) {
    return "CIITM — Academic Management Dashboard";
  }

  return projectTitle;
}

function displayCertificateDescription(certificate) {
  const title = String(certificate.title || "");
  const description = displayText(certificate.description).trim();

  if (/AI Foundations/i.test(title) && (/oracle|oci/i.test(title) || /oracle/i.test(description))) {
    return "Earned the Oracle Cloud Infrastructure AI Foundations Associate certification with a 95% score, demonstrating a strong foundation in AI and cloud services.";
  }

  if (/techgyan/i.test(title) || (/techgyan/i.test(description) && /hackathon/i.test(description))) {
    return "Competed in the Techgyan AI and Machine Learning Hackathon at IIT Patna, applying AI concepts to a time-bound challenge.";
  }

  return description;
}

function renderProjectLink(url, label, icon) {
  const safeLink = safeURL(url);
  if (!url || safeLink === "#") return "";

  return `
    <a class="card-action" href="${safeLink}" target="_blank" rel="noopener noreferrer">
      ${icon}
      <span>${label}</span>
    </a>
  `;
}

async function getTableData(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(`Error loading ${tableName}:`, error.message);
    return [];
  }

  return data || [];
}

function renderProjects(data) {
  projectList.innerHTML = data.slice(0, 6).map((project, index) => {
    const title = displayProjectTitle(project.title);
    const tech = normalizeTech(project.tech);
    const imageURL = project.image_url ? safeURL(project.image_url) : "";
    const category = displayText(project.category).trim();
    const previewBadge = category && category.length <= 24
      ? category
      : tech[0] || "Software";
    const preview = imageURL && imageURL !== "#"
      ? `
        <div class="project-browser">
          <div class="browser-chrome" aria-hidden="true">
            <span></span><span></span><span></span><span class="browser-address"></span>
          </div>
          <img src="${imageURL}" class="project-image" alt="${escapeHTML(title)}">
        </div>
      `
      : `
        <div class="project-preview" aria-hidden="true">
          <span class="preview-badge">${escapeHTML(previewBadge)}</span>
        </div>
      `;

    return `
      <article class="project-card">
        ${preview}
        <div class="project-card-content">
          <p class="project-index">PROJECT / ${String(index + 1).padStart(2, "0")}</p>
          <h3>${escapeHTML(title)}</h3>
          <p class="project-card-description">${escapeHTML(displayText(project.description))}</p>
          <div class="tag-list">${tech.map(tag => `<span>${escapeHTML(tag)}</span>`).join("")}</div>
          <div class="card-links">
            ${renderProjectLink(project.live, "Live site", externalLinkIcon)}
            ${renderProjectLink(project.github, "Source", githubIcon)}
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderCertificates(data) {
  certificateList.innerHTML = data.map(certificate => {
    const title = displayText(certificate.title);
    const tech = Array.isArray(certificate.tech) ? certificate.tech : [];
    const imageURL = certificate.image_url ? safeURL(certificate.image_url) : "";
    const hasImage = Boolean(imageURL && imageURL !== "#");

    return `
      <article class="experience-card">
        ${hasImage ? `
          <button class="certificate-preview" type="button" aria-label="Preview ${escapeHTML(title)}">
            <img src="${imageURL}" class="certificate-image" alt="${escapeHTML(title)} certificate">
          </button>
        ` : ""}
        <p class="experience-type">Certificate / achievement</p>
        <h3>${escapeHTML(title)}</h3>
        <p>${escapeHTML(displayCertificateDescription(certificate))}</p>
        ${tech.length ? `<div class="tag-list">${tech.map(tag => `<span>${escapeHTML(displayText(tag))}</span>`).join("")}</div>` : ""}
      </article>
    `;
  }).join("");
}

async function loadPortfolioData() {
  const [projects, certificates] = await Promise.all([
    getTableData("projects"),
    getTableData("certificates")
  ]);

  if (projects.length) renderProjects(projects);
  if (certificates.length) renderCertificates(certificates);
  updateActiveNav();
}

menuBtn.addEventListener("click", () => {
  const isExpanded = menuBtn.getAttribute("aria-expanded") === "true";
  menuBtn.setAttribute("aria-expanded", String(!isExpanded));
  menuBtn.setAttribute("aria-label", isExpanded ? "Open navigation" : "Close navigation");
  navLinks.classList.toggle("active", !isExpanded);
});

navLinks.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("active");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.setAttribute("aria-label", "Open navigation");
  });
});

function updateActiveNav() {
  const headerBottom = document.querySelector(".site-header").getBoundingClientRect().bottom;
  const marker = Math.max(headerBottom + 24, window.innerHeight * 0.3);
  let activeItem = navSections[0];

  navSections.forEach(item => {
    if (item.section.getBoundingClientRect().top <= marker) activeItem = item;
  });

  navSections.forEach(item => {
    const isActive = item === activeItem;
    item.link.classList.toggle("active", isActive);
    if (isActive) {
      item.link.setAttribute("aria-current", "location");
    } else {
      item.link.removeAttribute("aria-current");
    }
  });
}

let navUpdateQueued = false;
window.addEventListener("scroll", () => {
  if (navUpdateQueued) return;
  navUpdateQueued = true;
  requestAnimationFrame(() => {
    navUpdateQueued = false;
    updateActiveNav();
  });
}, { passive: true });
window.addEventListener("resize", updateActiveNav);
updateActiveNav();

feedbackForm.addEventListener("submit", async event => {
  event.preventDefault();

  const name = document.getElementById("feedbackName").value.trim();
  const email = document.getElementById("feedbackEmail").value.trim();
  const message = document.getElementById("feedbackMessage").value.trim();

  if (!name || !email || !message) {
    contactStatus.textContent = "Please complete all fields before sending.";
    contactStatus.dataset.state = "error";
    return;
  }

  contactSubmit.disabled = true;
  contactSubmit.textContent = "Sending…";
  feedbackForm.setAttribute("aria-busy", "true");
  contactStatus.textContent = "";
  delete contactStatus.dataset.state;

  try {
    const { error } = await supabase
      .from("feedback")
      .insert([{ name, email, message }]);

    if (error) throw error;

    feedbackForm.reset();
    contactStatus.textContent = "Your message was sent. Thank you.";
    contactStatus.dataset.state = "success";
  } catch (error) {
    console.error("Error submitting contact message:", error.message);
    contactStatus.textContent = "Your message could not be sent. Please try again or email directly.";
    contactStatus.dataset.state = "error";
  } finally {
    contactSubmit.disabled = false;
    contactSubmit.textContent = "Send message";
    feedbackForm.removeAttribute("aria-busy");
  }
});

document.addEventListener("click", event => {
  const previewButton = event.target.closest(".certificate-preview");
  if (!previewButton || !imageModal || !modalImage) return;

  const image = previewButton.querySelector("img");
  if (!image) return;

  modalImage.src = image.currentSrc || image.src;
  modalImage.alt = image.alt;
  imageModal.showModal();
});

modalClose.addEventListener("click", () => imageModal.close());
imageModal.addEventListener("click", event => {
  if (event.target === imageModal) imageModal.close();
});
imageModal.addEventListener("close", () => {
  modalImage.removeAttribute("src");
  modalImage.alt = "";
});

document.getElementById("currentYear").textContent = new Date().getFullYear();
loadPortfolioData();
