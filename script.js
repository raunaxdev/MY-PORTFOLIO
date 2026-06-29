import { supabase } from "./supabase.js";

// Typing Text
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


// Mobile Menu
const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");

menuBtn.addEventListener("click", () => {
  navLinks.classList.toggle("active");
});

document.querySelectorAll(".nav-links a").forEach(link => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("active");
  });
});


// Elements
const journeyList = document.getElementById("journeyList");
const projectList = document.getElementById("projectList");
const certificateList = document.getElementById("certificateList");
const goalList = document.getElementById("goalList");
const feedbackForm = document.getElementById("feedbackForm");


// Helpers
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


// Fetch Data
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


// Render Journey
function renderJourney(data) {
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


// Render Projects
function renderProjects(data) {
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
      : `<div class="card-icon">${escapeHTML(project.icon || "💻")}</div>`
  }

  <h3>${escapeHTML(project.title)}</h3>
  <p>${escapeHTML(project.description)}</p>

  <div class="tags">
    ${tech.map(tag => `<span>${escapeHTML(tag)}</span>`).join("")}
  </div>

  <div class="card-links">
    <a href="${safeURL(project.live)}" target="_blank">Live Demo</a>
    <a href="${safeURL(project.github)}" target="_blank">GitHub</a>
  </div>
`;

    projectList.appendChild(div);
  });
}


// Render Certificates
function renderCertificates(data) {
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
          : `<div class="card-icon">${escapeHTML(certificate.icon || "🏆")}</div>`
      }

      <h3>${certificate.icon ? escapeHTML(certificate.icon) + " " : ""}${escapeHTML(certificate.title)}</h3>
      <p>${escapeHTML(certificate.description)}</p>

      <div class="tags">
        ${tech.map(tag => `<span>${escapeHTML(tag)}</span>`).join("")}
      </div>
    `;

    certificateList.appendChild(div);
  });
}


// Render Goals
function renderGoals(data) {
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


// Load All Data
async function loadPortfolioData() {
  journeyList.innerHTML = `<p class="feedback-note">Loading journey...</p>`;
  projectList.innerHTML = `<p class="feedback-note">Loading projects...</p>`;
  certificateList.innerHTML = `<p class="feedback-note">Loading certificates...</p>`;
  goalList.innerHTML = `<p class="feedback-note">Loading goals...</p>`;

  const journey = await getTableData("journey");
  const projects = await getTableData("projects");
  const certificates = await getTableData("certificates");
  const goals = await getTableData("goals");

  renderJourney(journey);
  renderProjects(projects);
  renderCertificates(certificates);
  renderGoals(goals);

  startRevealAnimation();
}


// Feedback Submit
feedbackForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const name = document.getElementById("feedbackName").value.trim();
  const email = document.getElementById("feedbackEmail").value.trim();
  const message = document.getElementById("feedbackMessage").value.trim();

  if (!name || !message) {
    alert("Name aur feedback message required hai.");
    return;
  }

  const { error } = await supabase
    .from("feedback")
    .insert([
      {
        name,
        email,
        message
      }
    ]);

  if (error) {
    console.error(error.message);
    alert("Feedback submit nahi hua. Supabase policy check karo.");
    return;
  }

  alert("Thank you! Your feedback submitted successfully.");
  feedbackForm.reset();
});


// Reveal Animation
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
    {
      threshold: 0.15
    }
  );

  revealElements.forEach(element => {
    revealObserver.observe(element);
  });
}

const imageModal = document.getElementById("imageModal");
const modalImage = document.getElementById("modalImage");
const modalClose = document.getElementById("modalClose");

document.addEventListener("click", function (event) {
  if (event.target.classList.contains("certificate-image")) {
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

loadPortfolioData();
const currentYear = document.getElementById("currentYear");

if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}