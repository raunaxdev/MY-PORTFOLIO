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
  const url = String(value || "").trim();

  if (!url) return "#";

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("assets/")
  ) {
    return escapeHTML(url);
  }

  return "#";
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
  projectList.innerHTML = data.map(project => {
    const tech = Array.isArray(project.tech) ? project.tech : [];
    const imageURL = project.image_url ? safeURL(project.image_url) : "";
    const liveURL = project.live ? safeURL(project.live) : "#";
    const githubURL = project.github ? safeURL(project.github) : "#";

    return `
      <article class="project-card">
        ${imageURL ? `<img src="${imageURL}" class="project-image" alt="${escapeHTML(project.title)}">` : ""}
        <p class="project-index">Project</p>
        <h3>${escapeHTML(project.title)}</h3>
        <p>${escapeHTML(project.description)}</p>
        <div class="tag-list">${tech.map(tag => `<span>${escapeHTML(tag)}</span>`).join("")}</div>
        <div class="card-links">
          ${project.live && liveURL !== "#" ? `<a href="${liveURL}" target="_blank" rel="noopener noreferrer">Live site</a>` : ""}
          ${project.github && githubURL !== "#" ? `<a href="${githubURL}" target="_blank" rel="noopener noreferrer">Source</a>` : ""}
        </div>
      </article>
    `;
  }).join("");
}

function renderCertificates(data) {
  certificateList.innerHTML = data.map(certificate => {
    const tech = Array.isArray(certificate.tech) ? certificate.tech : [];
    const imageURL = certificate.image_url ? safeURL(certificate.image_url) : "";

    return `
      <article class="experience-card">
        ${imageURL ? `
          <button class="certificate-preview" type="button" aria-label="Preview ${escapeHTML(certificate.title)}">
            <img src="${imageURL}" class="certificate-image" alt="${escapeHTML(certificate.title)} certificate">
          </button>
        ` : ""}
        <p class="experience-type">Certificate / achievement</p>
        <h3>${escapeHTML(certificate.title)}</h3>
        <p>${escapeHTML(certificate.description)}</p>
        ${tech.length ? `<div class="tag-list">${tech.map(tag => `<span>${escapeHTML(tag)}</span>`).join("")}</div>` : ""}
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
