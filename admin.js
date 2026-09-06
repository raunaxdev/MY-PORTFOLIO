import { supabase } from "./supabase.js";

// DOM Elements
const loginScreen = document.getElementById("loginScreen");
const adminDashboard = document.getElementById("adminDashboard");
const loginForm = document.getElementById("loginForm");
const logoutBtn = document.getElementById("logoutBtn");

const navButtons = document.querySelectorAll(".nav-btn");
const sectionTitle = document.getElementById("sectionTitle");
const formTitle = document.getElementById("formTitle");
const listTitle = document.getElementById("listTitle");
const dynamicFields = document.getElementById("dynamicFields");
const itemForm = document.getElementById("itemForm");
const itemsList = document.getElementById("itemsList");
const resetFormBtn = document.getElementById("resetFormBtn");
const formPanel = document.getElementById("formPanel");
const mobileSidebarToggle = document.getElementById("mobileSidebarToggle");
const sidebar = document.getElementById("sidebar");

let activeSection = "projects";
let editingId = null;
let editingItem = null;
let currentItems = [];

// Section Definitions
const sections = {
  projects: {
    title: "Projects",
    table: "projects",
    fields: [
      { name: "icon", label: "Icon / Emoji", type: "text", placeholder: "Example: 💻" },
      { name: "image_file", label: "Project Screenshot", type: "file", accept: "image/*", optional: true },
      { name: "title", label: "Project Title", type: "text", placeholder: "Project name" },
      { name: "description", label: "Description", type: "textarea", placeholder: "Project details" },
      { name: "tech", label: "Tech Stack", type: "text", placeholder: "HTML, CSS, JavaScript" },
      { name: "live", label: "Live Link", type: "text", placeholder: "https://..." },
      { name: "github", label: "GitHub Link", type: "text", placeholder: "https://github.com/..." }
    ]
  },

  journey: {
    title: "Journey Timeline",
    table: "journey",
    fields: [
      { name: "date", label: "Date / Day", type: "text", placeholder: "Day 13 / June 2026" },
      { name: "title", label: "Journey Title", type: "text", placeholder: "Started JavaScript" },
      { name: "description", label: "Description", type: "textarea", placeholder: "What did you learn?" }
    ]
  },

  certificates: {
    title: "Certificates & Achievements",
    table: "certificates",
    fields: [
      { name: "icon", label: "Icon / Emoji", type: "text", placeholder: "Example: 🏆" },
      { name: "image_file", label: "Certificate Photo", type: "file", accept: "image/*" },
      { name: "title", label: "Certificate / Achievement Title", type: "text", placeholder: "Certificate name" },
      { name: "description", label: "Description", type: "textarea", placeholder: "Certificate details" },
      { name: "tech", label: "Skills / Tags", type: "text", placeholder: "Python, Web, Coding" }
    ]
  },

  goals: {
    title: "Dreams & Goals",
    table: "goals",
    fields: [
      { name: "title", label: "Goal Title", type: "text", placeholder: "Goal name" },
      { name: "description", label: "Description", type: "textarea", placeholder: "Write your goal" }
    ]
  },

  feedback: {
    title: "Feedback",
    table: "feedback",
    fields: []
  }
};

// Helpers
function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseTags(value) {
  return String(value || "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

function tagsToString(tags) {
  return Array.isArray(tags) ? tags.join(", ") : "";
}

function getFileExtension(fileName) {
  return fileName.split(".").pop().toLowerCase();
}

// Authentication
if (loginForm) {
  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("adminEmail").value.trim();
    const password = document.getElementById("adminPassword").value.trim();

    const submitBtn = loginForm.querySelector("button[type='submit']");
    submitBtn.textContent = "Logging in...";
    submitBtn.disabled = true;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error("LOGIN ERROR:", error);
      alert("Login failed: " + error.message);
      submitBtn.textContent = "Login";
      submitBtn.disabled = false;
      return;
    }

    submitBtn.textContent = "Login";
    submitBtn.disabled = false;
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async function () {
    await supabase.auth.signOut();
  });
}

// Auth State Change Listener
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    loginScreen.classList.add("hidden");
    adminDashboard.classList.remove("hidden");
    loadSection(activeSection);
  } else {
    loginScreen.classList.remove("hidden");
    adminDashboard.classList.add("hidden");
  }
});

// Mobile Sidebar Toggle
if (mobileSidebarToggle && sidebar) {
  mobileSidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("hidden");
  });
}

// Fetch Section Data
async function getSectionData(sectionName) {
  const tableName = sections[sectionName].table;

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

// Image Upload Handler
async function uploadPortfolioImage(file, folderName = "uploads") {
  if (!file || file.size === 0) return "";

  const extension = getFileExtension(file.name);
  const filePath = `${folderName}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("portfolio")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from("portfolio")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

// Section Loader
async function loadSection(sectionName) {
  activeSection = sectionName;
  editingId = null;
  editingItem = null;

  navButtons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.section === sectionName);
  });

  const section = sections[sectionName];

  sectionTitle.textContent = section.title;
  listTitle.textContent = section.title + " List";
  formTitle.textContent = "Add New " + section.title;

  if (sectionName === "feedback") {
    formPanel.classList.add("hidden");
    resetFormBtn.classList.add("hidden");
    await renderFeedback();
    return;
  }

  formPanel.classList.remove("hidden");
  resetFormBtn.classList.remove("hidden");

  renderForm();
  await renderItems();
}

// Dynamic Form Renderer
function renderForm(item = {}) {
  const fields = sections[activeSection].fields;

  dynamicFields.innerHTML = fields.map(field => {
    if (field.type === "file") {
      const isRequired = !field.optional && !item.image_url;
      return `
        <div class="field">
          <label>${field.label}</label>
          <input 
            type="file" 
            name="${field.name}" 
            accept="${field.accept || "image/*"}"
            ${isRequired ? "required" : ""}
          />
          ${
            item.image_url
              ? `<img src="${escapeHTML(item.image_url)}" class="form-preview" alt="Current preview" />`
              : `<p class="file-note">Upload image/photo</p>`
          }
        </div>
      `;
    }

    let value = field.name === "tech" ? tagsToString(item.tech || []) : (item[field.name] || "");

    if (field.type === "textarea") {
      return `
        <div class="field">
          <label>${field.label}</label>
          <textarea name="${field.name}" placeholder="${field.placeholder}" required>${escapeHTML(value)}</textarea>
        </div>
      `;
    }

    return `
      <div class="field">
        <label>${field.label}</label>
        <input 
          type="${field.type}" 
          name="${field.name}" 
          value="${escapeHTML(value)}" 
          placeholder="${field.placeholder}" 
          required 
        />
      </div>
    `;
  }).join("");
}

// Submit Form Handler
itemForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const saveBtn = document.getElementById("saveBtn");
  const originalText = saveBtn.innerHTML;
  saveBtn.innerHTML = "Saving...";
  saveBtn.disabled = true;

  const section = sections[activeSection];
  const fields = section.fields;
  const formData = new FormData(itemForm);
  const newItem = {};

  try {
    for (const field of fields) {
      if (field.type === "file") {
        const file = formData.get(field.name);

        if (file && file.size > 0) {
          const folderName = activeSection === "projects" ? "projects" : "certificates";
          newItem.image_url = await uploadPortfolioImage(file, folderName);
        } else {
          newItem.image_url = editingItem?.image_url || "";
        }
      } else {
        const value = formData.get(field.name).trim();
        if (field.name === "tech") {
          newItem.tech = parseTags(value);
        } else {
          newItem[field.name] = value;
        }
      }
    }

    newItem.updated_at = new Date().toISOString();

    if (editingId) {
      const { error } = await supabase
        .from(section.table)
        .update(newItem)
        .eq("id", editingId);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from(section.table)
        .insert([newItem]);

      if (error) throw error;
    }

    editingId = null;
    editingItem = null;
    itemForm.reset();
    renderForm();
    await renderItems();

    alert("Saved successfully!");
  } catch (error) {
    console.error("Save error:", error.message);
    alert("Save failed! Please check Supabase policies/storage permissions.");
  } finally {
    saveBtn.innerHTML = originalText;
    saveBtn.disabled = false;
  }
});

// Render Saved Items
async function renderItems() {
  currentItems = await getSectionData(activeSection);

  if (!currentItems.length) {
    itemsList.innerHTML = `<div class="empty-message">No items added yet.</div>`;
    return;
  }

  itemsList.innerHTML = currentItems.map(item => {
    const tags = Array.isArray(item.tech) ? item.tech : [];

    return `
      <div class="admin-item">
        ${item.date ? `<div class="item-meta">${escapeHTML(item.date)}</div>` : ""}

        ${
          item.image_url
            ? `<img src="${escapeHTML(item.image_url)}" class="form-preview" alt="${escapeHTML(item.title)}" />`
            : ""
        }

        <h3>${item.icon ? escapeHTML(item.icon) + " " : ""}${escapeHTML(item.title)}</h3>
        <p>${escapeHTML(item.description)}</p>

        ${
          tags.length
            ? `<div class="tag-row">${tags.map(tag => `<span>${escapeHTML(tag)}</span>`).join("")}</div>`
            : ""
        }

        ${
          item.live || item.github
            ? `<p>
                ${item.live ? `<strong>Live:</strong> ${escapeHTML(item.live)}<br>` : ""}
                ${item.github ? `<strong>GitHub:</strong> ${escapeHTML(item.github)}` : ""}
               </p>`
            : ""
        }

        <div class="item-actions">
          <button class="edit-btn" data-id="${item.id}">Edit</button>
          <button class="delete-btn" data-id="${item.id}">Delete</button>
        </div>
      </div>
    `;
  }).join("");

  document.querySelectorAll(".edit-btn").forEach(button => {
    button.addEventListener("click", () => editItem(button.dataset.id));
  });

  document.querySelectorAll(".delete-btn").forEach(button => {
    button.addEventListener("click", () => deleteItem(button.dataset.id));
  });
}

// Edit Item
function editItem(id) {
  const item = currentItems.find(data => data.id === id);
  if (!item) return;

  editingId = id;
  editingItem = item;

  formTitle.textContent = "Edit " + sections[activeSection].title;
  renderForm(item);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Delete Item
async function deleteItem(id) {
  if (!confirm("Are you sure you want to delete this item?")) return;

  const { error } = await supabase
    .from(sections[activeSection].table)
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error.message);
    alert("Delete failed.");
    return;
  }

  await renderItems();
}

// Render Feedback Messages
async function renderFeedback() {
  currentItems = await getSectionData("feedback");

  if (!currentItems.length) {
    itemsList.innerHTML = `<div class="empty-message">No feedback yet.</div>`;
    return;
  }

  itemsList.innerHTML = currentItems.map(item => {
    return `
      <div class="admin-item">
        <div class="item-meta">${escapeHTML(item.created_at || "")}</div>
        <h3>${escapeHTML(item.name || "Unknown")}</h3>
        <p><strong>Email:</strong> ${escapeHTML(item.email || "")}</p>
        <p>${escapeHTML(item.message || "")}</p>

        <div class="item-actions">
          <button class="delete-btn" data-id="${item.id}">Delete</button>
        </div>
      </div>
    `;
  }).join("");

  document.querySelectorAll(".delete-btn").forEach(button => {
    button.addEventListener("click", async () => {
      if (!confirm("Delete this feedback message?")) return;

      const { error } = await supabase
        .from("feedback")
        .delete()
        .eq("id", button.dataset.id);

      if (error) {
        console.error(error.message);
        alert("Failed to delete feedback.");
        return;
      }

      await renderFeedback();
    });
  });
}

// Clear Form
if (resetFormBtn) {
  resetFormBtn.addEventListener("click", function () {
    editingId = null;
    editingItem = null;
    itemForm.reset();
    formTitle.textContent = "Add New " + sections[activeSection].title;
    renderForm();
  });
}

// Navigation Tab Buttons
navButtons.forEach(button => {
  button.addEventListener("click", function () {
    loadSection(button.dataset.section);
  });
});
