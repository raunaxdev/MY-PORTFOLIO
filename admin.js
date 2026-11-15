import { supabase } from "./supabase.js";

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

let activeSection = "projects";
let editingId = null;
let editingItem = null;
let currentItems = [];

const sections = {
  projects: {
    title: "Projects",
    table: "projects",
    fields: [
      { name: "image_file", label: "Project screenshot", type: "file", accept: "image/*", optional: true },
      { name: "title", label: "Project title", type: "text", placeholder: "Project name" },
      { name: "description", label: "Description", type: "textarea", placeholder: "Project details" },
      { name: "tech", label: "Tech stack", type: "text", placeholder: "React, TypeScript, PostgreSQL" },
      { name: "live", label: "Live link", type: "url", placeholder: "https://..." },
      { name: "github", label: "GitHub link", type: "url", placeholder: "https://github.com/..." }
    ]
  },
  journey: {
    title: "Journey",
    table: "journey",
    fields: [
      { name: "date", label: "Date", type: "text", placeholder: "Month / year" },
      { name: "title", label: "Title", type: "text", placeholder: "Milestone title" },
      { name: "description", label: "Description", type: "textarea", placeholder: "What happened?" }
    ]
  },
  certificates: {
    title: "Certificates",
    table: "certificates",
    fields: [
      { name: "image_file", label: "Certificate image", type: "file", accept: "image/*" },
      { name: "title", label: "Certificate or achievement title", type: "text", placeholder: "Certificate name" },
      { name: "description", label: "Description", type: "textarea", placeholder: "Certificate details" },
      { name: "tech", label: "Skills or tags", type: "text", placeholder: "AI, Machine Learning" }
    ]
  },
  feedback: {
    title: "Feedback",
    table: "feedback",
    fields: []
  }
};

function escapeHTML(value) {
  return String(value || "")
    .replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}\uFE0F\u200D\u20E3]/gu, "")
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

loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value.trim();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("Login failed:", error.message);
    alert("Login failed: " + error.message);
  }
});

logoutBtn.addEventListener("click", async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Sign out failed:", error.message);
    alert("Sign out failed: " + error.message);
  }
});

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

async function checkSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("Could not check admin session:", error.message);
    return;
  }

  if (data.session) {
    loginScreen.classList.add("hidden");
    adminDashboard.classList.remove("hidden");
    loadSection(activeSection);
  }
}

async function getSectionData(sectionName) {
  const tableName = sections[sectionName].table;
  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(`Error loading ${sectionName}:`, error.message);
    return [];
  }

  return data || [];
}

async function uploadPortfolioImage(file, folderName = "uploads") {
  if (!file || file.size === 0) return "";

  const extension = getFileExtension(file.name);
  const filePath = `${folderName}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("portfolio")
    .upload(filePath, file, { cacheControl: "3600", upsert: false });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("portfolio").getPublicUrl(filePath);
  return data.publicUrl;
}

async function loadSection(sectionName) {
  activeSection = sectionName;
  editingId = null;
  editingItem = null;

  navButtons.forEach(button => {
    button.classList.toggle("active", button.dataset.section === sectionName);
  });

  const section = sections[sectionName];
  sectionTitle.textContent = section.title;
  listTitle.textContent = section.title + " list";
  formTitle.textContent = "Add new " + section.title.toLowerCase();

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

function renderForm(item = {}) {
  const sectionName = activeSection;
  const fields = sections[sectionName].fields;

  dynamicFields.innerHTML = fields.map(field => {
    if (field.type === "file") {
      const required = !field.optional && !item.image_url;
      const helpText = sectionName === "projects"
        ? "Optional. Upload a screenshot for this project."
        : "Upload an image of this certificate or achievement.";

      return `
        <div class="field">
          <label>${field.label}</label>
          <input type="file" name="${field.name}" accept="${field.accept || "image/*"}" ${required ? "required" : ""}>
          ${item.image_url ? `<img src="${escapeHTML(item.image_url)}" class="form-preview" alt="Current ${escapeHTML(field.label.toLowerCase())}">` : ""}
          <p class="file-note">${helpText}</p>
        </div>
      `;
    }

    const value = field.name === "tech"
      ? tagsToString(item.tech || [])
      : item[field.name] || "";
    const escapedValue = escapeHTML(value);

    if (field.type === "textarea") {
      return `
        <div class="field">
          <label>${field.label}</label>
          <textarea name="${field.name}" placeholder="${field.placeholder}" required>${escapedValue}</textarea>
        </div>
      `;
    }

    return `
      <div class="field">
        <label>${field.label}</label>
        <input type="${field.type}" name="${field.name}" value="${escapedValue}" placeholder="${field.placeholder}" required>
      </div>
    `;
  }).join("");
}

itemForm.addEventListener("submit", async event => {
  event.preventDefault();

  const section = sections[activeSection];
  const formData = new FormData(itemForm);
  const newItem = {};
  const saveButton = document.getElementById("saveBtn");
  saveButton.disabled = true;
  saveButton.textContent = "Saving…";

  try {
    for (const field of section.fields) {
      if (field.type === "file") {
        const file = formData.get(field.name);
        if (file && file.size > 0) {
          const folderName = activeSection === "projects" ? "projects" : "certificates";
          newItem.image_url = await uploadPortfolioImage(file, folderName);
        } else {
          newItem.image_url = editingItem?.image_url || "";
        }
      } else {
        const value = String(formData.get(field.name) || "").trim();
        newItem[field.name] = field.name === "tech" ? parseTags(value) : value;
      }
    }

    newItem.updated_at = new Date().toISOString();
    if (editingId) {
      const { error } = await supabase.from(section.table).update(newItem).eq("id", editingId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from(section.table).insert([newItem]);
      if (error) throw error;
    }

    editingId = null;
    editingItem = null;
    itemForm.reset();
    renderForm();
    await renderItems();
  } catch (error) {
    console.error("Could not save item:", error.message);
    alert("Save failed. Check the Supabase row-level security policy or storage bucket.");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "Save item";
  }
});

async function renderItems() {
  currentItems = await getSectionData(activeSection);
  if (!currentItems.length) {
    itemsList.innerHTML = `<div class="empty-message">No items added yet.</div>`;
    return;
  }

  itemsList.innerHTML = currentItems.map(item => {
    const tags = Array.isArray(item.tech) ? item.tech : [];
    return `
      <article class="admin-item">
        ${item.date ? `<div class="item-meta">${escapeHTML(item.date)}</div>` : ""}
        ${item.image_url ? `<img src="${escapeHTML(item.image_url)}" class="form-preview" alt="${escapeHTML(item.title || "Portfolio item")}">` : ""}
        <h3>${escapeHTML(item.title)}</h3>
        <p>${escapeHTML(item.description)}</p>
        ${tags.length ? `<div class="tag-row">${tags.map(tag => `<span>${escapeHTML(tag)}</span>`).join("")}</div>` : ""}
        ${item.live || item.github ? `<p>${item.live ? `Live: ${escapeHTML(item.live)}<br>` : ""}${item.github ? `GitHub: ${escapeHTML(item.github)}` : ""}</p>` : ""}
        <div class="item-actions">
          <button class="edit-btn" type="button" data-id="${escapeHTML(item.id)}">Edit</button>
          <button class="delete-btn" type="button" data-id="${escapeHTML(item.id)}">Delete</button>
        </div>
      </article>
    `;
  }).join("");

  itemsList.querySelectorAll(".edit-btn").forEach(button => {
    button.addEventListener("click", () => editItem(button.dataset.id));
  });
  itemsList.querySelectorAll(".delete-btn").forEach(button => {
    button.addEventListener("click", () => deleteItem(button.dataset.id));
  });
}

function editItem(id) {
  const item = currentItems.find(data => String(data.id) === String(id));
  if (!item) return;

  editingId = id;
  editingItem = item;
  formTitle.textContent = "Edit " + sections[activeSection].title.toLowerCase();
  renderForm(item);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteItem(id) {
  if (!confirm("Are you sure you want to delete this item?")) return;

  const { error } = await supabase
    .from(sections[activeSection].table)
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Could not delete item:", error.message);
    alert("Delete failed.");
    return;
  }

  await renderItems();
}

async function renderFeedback() {
  currentItems = await getSectionData("feedback");
  if (!currentItems.length) {
    itemsList.innerHTML = `<div class="empty-message">No messages yet.</div>`;
    return;
  }

  itemsList.innerHTML = currentItems.map(item => `
    <article class="admin-item">
      <div class="item-meta">${escapeHTML(item.created_at || "")}</div>
      <h3>${escapeHTML(item.name || "Unknown")}</h3>
      <p><strong>Email:</strong> ${escapeHTML(item.email || "")}</p>
      <p>${escapeHTML(item.message || "")}</p>
      <div class="item-actions"><button class="delete-btn" type="button" data-id="${escapeHTML(item.id)}">Delete</button></div>
    </article>
  `).join("");

  itemsList.querySelectorAll(".delete-btn").forEach(button => {
    button.addEventListener("click", async () => {
      if (!confirm("Delete this message?")) return;

      const { error } = await supabase.from("feedback").delete().eq("id", button.dataset.id);
      if (error) {
        console.error("Could not delete message:", error.message);
        alert("Message could not be deleted.");
        return;
      }
      await renderFeedback();
    });
  });
}

resetFormBtn.addEventListener("click", () => {
  editingId = null;
  editingItem = null;
  itemForm.reset();
  formTitle.textContent = "Add new " + sections[activeSection].title.toLowerCase();
  renderForm();
});

navButtons.forEach(button => {
  button.addEventListener("click", () => loadSection(button.dataset.section));
});

checkSession();
