import { supabase } from "./supabase.js";

// Typing Text Effect
const typingText = document.getElementById("typingText");

const roles = [
  "BCA Student",
  "Aspiring Full Stack Developer",
  "Web Developer",
  "Coding Creator",
  "Problem Solver"
];

let roleIndex = 0;
let charIndex = 0;
let isDeleting = false;

function typeEffect() {
  if (!typingText) return;
  
  const currentRole = roles[roleIndex];

  if (isDeleting) {
    typingText.textContent = currentRole.substring(0, charIndex--);
  } else {
    typingText.textContent = currentRole.substring(0, charIndex++);
  }

  if (!isDeleting && charIndex === currentRole.length + 1) {
    isDeleting = true;
    setTimeout(typeEffect, 1200);
    return;
  }

  if (isDeleting && charIndex === 0) {
    isDeleting = false;
    roleIndex = (roleIndex + 1) % roles.length;
  }

  setTimeout(typeEffect, isDeleting ? 55 : 95);
}

typeEffect();

// Mobile Menu Navigation
const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");

if (menuBtn && navLinks) {
  menuBtn.addEventListener("click", () => {
    navLinks.classList.toggle("active");
  });

  document.querySelectorAll(".nav-links a").forEach(link => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("active");
    });
  });
}

// DOM Elements
const journeyList = document.getElementById("journeyList");
const projectList = document.getElementById("projectList");
const certificateList = document.getElementById("certificateList");
const goalList = document.getElementById("goalList");
const feedbackForm = document.getElementById("feedbackForm");

// Utility Functions
function escapeHTML(value) {
  return String(value || "")
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

// Fetch Data from Supabase
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

// Render Journey Section
function renderJourney(data) {
  if (!journeyList) return;
  journeyList.innerHTML = "";

  if (!data.length) {
    journeyList.innerHTML = `<p class="feedback-note">No journey updates added yet.</p>`;
    return;
  }

  data.forEach(item => {
    const div = document.createElement("div");
    div.className = "timeline-item reveal";

    div.innerHTML = `
      <span>${escapeHTML(item.date)}</span>
      <h3>${escapeHTML(item.title)}</h3>
      <p>${escapeHTML(item.description)}</p>
    `;

    journeyList.appendChild(div);
  });
}

// Render Projects Section
function renderProjects(data) {
  if (!projectList) return;
  projectList.innerHTML = "";

  if (!data.length) {
    projectList.innerHTML = `<p class="feedback-note">No projects added yet.</p>`;
    return;
  }

  data.forEach(project => {
    const div = document.createElement("div");
    div.className = "card reveal";

    const tech = Array.isArray(project.tech) ? project.tech : [];

    div.innerHTML = `
      ${
        project.image_url
          ? `<img src="${safeURL(project.image_url)}" class="project-image" alt="${escapeHTML(project.title)}" />`
          : `<div class="card-icon"><i class="fa-solid fa-code"></i></div>`
      }

      <h3>${escapeHTML(project.title)}</h3>
      <p>${escapeHTML(project.description)}</p>

      <div class="tags">
        ${tech.map(tag => `<span>${escapeHTML(tag)}</span>`).join("")}
      </div>

      <div class="card-links">
        <a href="${safeURL(project.live)}" target="_blank"><i class="fa-solid fa-arrow-up-right-from-square"></i> Live Demo</a>
        <a href="${safeURL(project.github)}" target="_blank"><i class="fa-brands fa-github"></i> GitHub</a>
      </div>
    `;

    projectList.appendChild(div);
  });
}

// Render Certificates Section
function renderCertificates(data) {
  if (!certificateList) return;
  certificateList.innerHTML = "";

  if (!data.length) {
    certificateList.innerHTML = `<p class="feedback-note">No certificates added yet.</p>`;
    return;
  }

  data.forEach(certificate => {
    const div = document.createElement("div");
    div.className = "card certificate-card reveal";

    const tech = Array.isArray(certificate.tech) ? certificate.tech : [];

    div.innerHTML = `
      ${
        certificate.image_url
          ? `<img src="${safeURL(certificate.image_url)}" class="certificate-image" alt="${escapeHTML(certificate.title)}" />`
          : `<div class="card-icon"><i class="fa-solid fa-award"></i></div>`
      }

      <h3>${escapeHTML(certificate.title)}</h3>
      <p>${escapeHTML(certificate.description)}</p>

      <div class="tags">
        ${tech.map(tag => `<span>${escapeHTML(tag)}</span>`).join("")}
      </div>
    `;

    certificateList.appendChild(div);
  });
}

// Render Goals Section
function renderGoals(data) {
  if (!goalList) return;
  goalList.innerHTML = "";

  if (!data.length) {
    goalList.innerHTML = `<p class="feedback-note">No goals added yet.</p>`;
    return;
  }

  data.forEach(goal => {
    const div = document.createElement("div");
    div.className = "goal-item reveal";

    div.innerHTML = `
      <h3>${escapeHTML(goal.title)}</h3>
      <p>${escapeHTML(goal.description)}</p>
    `;

    goalList.appendChild(div);
  });
}

// Load All Dynamic Portfolio Data
async function loadPortfolioData() {
  if (journeyList) journeyList.innerHTML = `<p class="feedback-note">Loading journey...</p>`;
  if (projectList) projectList.innerHTML = `<p class="feedback-note">Loading projects...</p>`;
  if (certificateList) certificateList.innerHTML = `<p class="feedback-note">Loading certificates...</p>`;
  if (goalList) goalList.innerHTML = `<p class="feedback-note">Loading goals...</p>`;

  const [journey, projects, certificates, goals] = await Promise.all([
    getTableData("journey"),
    getTableData("projects"),
    getTableData("certificates"),
    getTableData("goals")
  ]);

  renderJourney(journey);
  renderProjects(projects);
  renderCertificates(certificates);
  renderGoals(goals);

  startRevealAnimation();
}

// Web3Forms AJAX Feedback Form Submit (Without Page Reload)
if (feedbackForm) {
  feedbackForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const submitBtn = feedbackForm.querySelector("button[type='submit']");
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Sending...";
    submitBtn.disabled = true;

    const formData = new FormData(feedbackForm);

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        alert("Thank you! Your feedback was submitted successfully.");
        feedbackForm.reset();
      } else {
        alert("Submission failed. Please try again later.");
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("Something went wrong! Please try again.");
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
}

// Scroll Reveal Animation
function startRevealAnimation() {
  const revealElements = document.querySelectorAll(".reveal");

  const revealObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
        }
      });
    },
    { threshold: 0.1 }
  );

  revealElements.forEach(element => {
    revealObserver.observe(element);
  });
}

// Image Modal Preview for Certificates
const imageModal = document.getElementById("imageModal");
const modalImage = document.getElementById("modalImage");
const modalClose = document.getElementById("modalClose");

if (imageModal && modalImage && modalClose) {
  document.addEventListener("click", function (event) {
    if (event.target.classList.contains("certificate-image") || event.target.classList.contains("project-image")) {
      modalImage.src = event.target.src;
      imageModal.classList.add("active");
    }
  });

  modalClose.addEventListener("click", function () {
    imageModal.classList.remove("active");
    modalImage.src = "";
  });

  imageModal.addEventListener("click", function (event) {
    if (event.target === imageModal) {
      imageModal.classList.remove("active");
      modalImage.src = "";
    }
  });
}

// Dynamic Footer Current Year
const currentYear = document.getElementById("currentYear");
if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}

// Execute Data Load
loadPortfolioData();
