// ==========================================================================
// 1. SYSTEM CREDENTIALS & INITIALIZATION
// ==========================================================================
const SUPABASE_URL = "https://pgmuunufwugjhltimtmu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnbXV1bnVmd3VnamhsdGltdG11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NzYzOTYsImV4cCI6MjEwNTU1MjM5Nn0.pa6ZC1ctOX3pCp4hYFx1DMPZfitDt9GOYWYUHyRitB8";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let activeUser = { id: "00000000-0000-0000-0000-000000000000" };
let activeTasks = JSON.parse(localStorage.getItem("raunak_offline_tasks") || "[]");
let currentVerifyingTaskId = null;
let activeScreenTimeMinutes = 0;

let isJarvisActive = false;
let conversationTimeout = null;
let globalRecognition = null;

window.addEventListener("DOMContentLoaded", () => {
  const authContainer = document.getElementById("auth-container");
  const dashboard = document.getElementById("dashboard");
  
  if (authContainer) authContainer.classList.add("hidden");
  if (dashboard) dashboard.classList.remove("hidden");
  
  renderTasks();
  loadUserTasks();
  startPersistentPopups();
  initUnifiedJarvisVoiceCore();
  requestNotificationPermission();
});

setInterval(() => {
  if (activeUser) {
    activeScreenTimeMinutes++;
    const counterEl = document.getElementById("screen-time-counter");
    if (counterEl) counterEl.innerText = `${activeScreenTimeMinutes} mins`;
  }
}, 60000);

// PWA Notification Request
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission !== 'granted') {
    Notification.requestPermission();
  }
}

function triggerPushNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: 'data:,' });
  }
}

// ==========================================================================
// 2. FAILSAFE REST GATEWAY
// ==========================================================================
async function callGeminiAI(promptText) {
  try {
    let userPrompt = promptText;
    if (typeof promptText === 'object') {
      userPrompt = promptText?.contents?.[0]?.parts?.[0]?.text || JSON.stringify(promptText);
    }

    setReactorStatus("PROCESSING DIRECTIVE...", true);

    const systemContext = "You are an advanced digital study assistant for student Raunak. Give extremely brief, crisp 2-sentence answers in English or Hinglish with high precision.";
    const fullQuery = `${systemContext} Question: ${userPrompt}`;
    const encodedQuery = encodeURIComponent(fullQuery);

    const response = await fetch(`https://text.pollinations.ai/${encodedQuery}?model=openai`);

    if (response.ok) {
      const textResponse = await response.text();
      setReactorStatus("SYSTEM STANDBY - READY FOR VOICE", false);
      return textResponse.trim();
    }
  } catch (err) {
    console.warn("Primary Gateway Error, switching...", err);
  }

  setReactorStatus("SYSTEM STANDBY - READY FOR VOICE", false);
  return "Directive processed, Raunak. Standing by.";
}

// ==========================================================================
// 3. VISUALIZER & HUD SOUND SYNTHESIZER
// ==========================================================================
function setReactorStatus(text, isActive) {
  const statusEl = document.getElementById("jarvis-status-text");
  const box = document.getElementById("jarvis-reactor-container");
  if (statusEl) statusEl.innerText = text;
  if (box) {
    if (isActive) box.classList.add("jarvis-active");
    else box.classList.remove("jarvis-active");
  }
}

function speakText(text, callback = null) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = /[a-zA-Z]/.test(text) ? 'en-IN' : 'hi-IN';
    utterance.rate = 1.05; 
    utterance.pitch = 1.0;

    utterance.onstart = () => setReactorStatus("SYSTEM SPEAKING...", true);
    utterance.onend = () => {
      setReactorStatus("SYSTEM STANDBY - READY FOR VOICE", false);
      if (callback) callback();
    };

    window.speechSynthesis.speak(utterance);
  }
}

function playSciFiSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'wake') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'processing') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {}
}

function openMobileSafeLink(url) {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.click();
}

// ==========================================================================
// 4. VOICE ENGINE (HINGLISH + SHORTCUTS)
// ==========================================================================
function initUnifiedJarvisVoiceCore() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  globalRecognition = new SpeechRecognition();
  globalRecognition.continuous = true;
  globalRecognition.interimResults = true;
  globalRecognition.lang = 'en-IN';

  const liveBox = document.getElementById("voice-speech-text");
  const liveOutput = document.getElementById("speech-live-output");
  const btn = document.getElementById("voice-btn");

  globalRecognition.onresult = async (event) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }

    const cleanSpeech = transcript.toLowerCase().trim();

    if (isJarvisActive) {
      clearTimeout(conversationTimeout);
      conversationTimeout = setTimeout(() => { resetJarvisUI(); }, 15000);
    }

    if (!isJarvisActive) {
      if (cleanSpeech.includes("system") || cleanSpeech.includes("hey system") || cleanSpeech.includes("jarvis") || cleanSpeech.includes("suno")) {
        isJarvisActive = true;
        playSciFiSound('wake');
        if (btn) btn.innerText = "Voice Active...";
        if (liveBox) liveBox.classList.remove("hidden");
        if (liveOutput) liveOutput.innerText = "Listening...";
        speakText("At your service, Raunak.");
      }
      return;
    }

    if (liveOutput) liveOutput.innerText = `"${transcript}"`;

    if (event.results[event.results.length - 1].isFinal) {
      playSciFiSound('processing');

      if (cleanSpeech.includes("google")) {
        speakText("Opening Google.");
        openMobileSafeLink("https://www.google.com");
        resetJarvisUI();
        return;
      }
      if (cleanSpeech.includes("youtube") || cleanSpeech.includes("utube")) {
        speakText("Launching YouTube.");
        openMobileSafeLink("https://www.youtube.com");
        resetJarvisUI();
        return;
      }
      if (cleanSpeech.includes("chat gpt") || cleanSpeech.includes("chatgpt")) {
        speakText("Opening ChatGPT.");
        openMobileSafeLink("https://chat.openai.com");
        resetJarvisUI();
        return;
      }

      if (cleanSpeech.includes("clock") || cleanSpeech.includes("time")) {
        document.getElementById("flip-clock-modal").classList.remove("hidden");
        speakText("Standby clock active.");
        resetJarvisUI();
        return;
      }

      const isExplicitTaskCommand = cleanSpeech.startsWith("add task") || cleanSpeech.startsWith("create mission") || cleanSpeech.includes("task add karo");

      if (isExplicitTaskCommand) {
        let cleanTaskTitle = transcript.replace("add task", "").replace("create mission", "").replace("task add karo", "").trim();
        if (cleanTaskTitle.length > 0) {
          await addNewTask(cleanTaskTitle);
          speakText(`Mission deployed: ${cleanTaskTitle}`);
        }
        resetJarvisUI();
        return;
      }

      const aiResponse = await callGeminiAI(transcript);
      speakText(aiResponse || "Directive processed.");
      resetJarvisUI();
    }
  };

  globalRecognition.onend = () => {
    setTimeout(() => { try { globalRecognition.start(); } catch(e) {} }, 300);
  };

  try { globalRecognition.start(); } catch(e) {}
}

function startVoiceCommand() {
  isJarvisActive = true;
  playSciFiSound('wake');
  setReactorStatus("LISTENING TO DIRECTIVE...", true);
  const btn = document.getElementById("voice-btn");
  const liveBox = document.getElementById("voice-speech-text");
  if (btn) btn.innerText = "Voice Active...";
  if (liveBox) liveBox.classList.remove("hidden");
}

function resetJarvisUI() {
  isJarvisActive = false;
  clearTimeout(conversationTimeout);
  const btn = document.getElementById("voice-btn");
  const liveBox = document.getElementById("voice-speech-text");
  if (btn) btn.innerText = "🎙️ Voice Control";
  setReactorStatus("SYSTEM STANDBY - READY FOR VOICE", false);
  setTimeout(() => { if (liveBox) liveBox.classList.add("hidden"); }, 3000);
}

// ==========================================================================
// 5. TASK MANAGEMENT SYSTEM
// ==========================================================================
function toggleTaskInputs() {
  const type = document.getElementById("task-type").value;
  if (type === "link") {
    document.getElementById("link-inputs").classList.remove("hidden");
    document.getElementById("notes-inputs").classList.add("hidden");
  } else {
    document.getElementById("link-inputs").classList.add("hidden");
    document.getElementById("notes-inputs").classList.remove("hidden");
  }
}

function saveTasksLocally() {
  localStorage.setItem("raunak_offline_tasks", JSON.stringify(activeTasks));
}

async function addNewTask(titleParam = null) {
  const title = titleParam || document.getElementById("task-title").value;
  const type = document.getElementById("task-type") ? document.getElementById("task-type").value : "link";
  let resourceUrl = "";

  if (!title) return alert("Task title required!");
  if (type === "link" && document.getElementById("task-url")) resourceUrl = document.getElementById("task-url").value;

  const newTaskObj = { id: Date.now().toString(), user_id: activeUser.id, title, type, resource_url: resourceUrl, status: "pending" };
  activeTasks.push(newTaskObj);
  saveTasksLocally();
  renderTasks();

  triggerPushNotification("Mission Deployed", `New mission: ${title}`);

  try {
    await supabaseClient.from("tasks").insert([{ user_id: activeUser.id, title, type, resource_url: resourceUrl, status: "pending" }]);
  } catch(e) {}

  if (document.getElementById("task-title")) document.getElementById("task-title").value = "";
  if (document.getElementById("task-url")) document.getElementById("task-url").value = "";
}

async function loadUserTasks() {
  try {
    const { data: tasks, error } = await supabaseClient.from("tasks").select("*").eq("user_id", activeUser.id).eq("status", "pending");
    if (!error && tasks && tasks.length > 0) {
      activeTasks = tasks;
      saveTasksLocally();
    }
  } catch(e) {}
  renderTasks();
}

function renderTasks() {
  const list = document.getElementById("task-list");
  if (!list) return;
  list.innerHTML = "";
  
  if (activeTasks.length === 0) {
    list.innerHTML = `<p style="color:var(--text-muted, #94a3b8); font-style:italic;"><i class="fa-solid fa-circle-check"></i> All missions clear, Raunak. Systems optimal.</p>`;
    return;
  }

  activeTasks.forEach(task => {
    const item = document.createElement("div");
    item.className = "task-card-item";
    item.innerHTML = `
      <div class="task-info-box">
        <div>
          <strong style="color: var(--text-main);">${task.title}</strong><br>
          ${task.resource_url ? `<a href="${task.resource_url}" target="_blank" style="color:var(--accent-cyan); font-size:0.8rem;">Open Resource</a>` : ''}
        </div>
      </div>
      <button class="btn-primary" style="width:auto; padding: 10px 18px;" onclick="completeTask('${task.id}', '${task.title}')">Done</button>
    `;
    list.appendChild(item);
  });
}

async function completeTask(taskId, taskTitle) {
  activeTasks = activeTasks.filter(t => t.id !== taskId);
  saveTasksLocally();
  renderTasks();
  playSciFiSound('success');
  speakText(`Mission ${taskTitle} completed.`);

  try { await supabaseClient.from("tasks").update({ status: "completed" }).eq("id", taskId); } catch(e){}
}

// ==========================================================================
// 6. STANDBY CLOCK AUDIO & VIDEO SWITCHER
// ==========================================================================
function toggleFlipClock() { document.getElementById("flip-clock-modal").classList.toggle("hidden"); }

setInterval(() => {
  const now = new Date();
  const hrs = document.getElementById("hours");
  const mins = document.getElementById("minutes");
  const secs = document.getElementById("seconds");
  if (hrs && mins && secs) {
    hrs.textContent = String(now.getHours()).padStart(2, '0');
    mins.textContent = String(now.getMinutes()).padStart(2, '0');
    secs.textContent = String(now.getSeconds()).padStart(2, '0');
  }
}, 1000);

function changeClockVideo(type) {
  const videoEl = document.getElementById("clock-bg-video");
  const videoSrc = document.getElementById("video-source");
  if (type === 'stars') videoSrc.src = "https://assets.mixkit.co/videos/preview/mixkit-stars-in-the-night-sky-1610-large.mp4";
  else if (type === 'rain') videoSrc.src = "https://assets.mixkit.co/videos/preview/mixkit-rain-drops-on-a-window-41528-large.mp4";
  videoEl.load();
  videoEl.play();
}

let activeStudyAudio = null;
function toggleStudyAudio(type) {
  if (activeStudyAudio) { activeStudyAudio.pause(); activeStudyAudio = null; }
  let audioUrl = "";
  if (type === 'lofi') audioUrl = "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3";
  else if (type === 'rain') audioUrl = "https://cdn.pixabay.com/download/audio/2021/09/06/audio_8b2112a818.mp3";
  else if (type === 'noise') audioUrl = "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c6d30e38.mp3";

  if (audioUrl) {
    activeStudyAudio = new Audio(audioUrl);
    activeStudyAudio.loop = true;
    activeStudyAudio.play();
  }
}

function startPersistentPopups() {
  setInterval(() => {
    if (activeTasks.length > 0) {
      triggerPushNotification("Pending Mission Alert", `You have ${activeTasks.length} missions pending!`);
    }
  }, 120000);
}
function closePersistentPopup() { document.getElementById("persistent-popup").classList.add("hidden"); }
function generateMonthlyReport() { document.getElementById("report-modal").classList.remove("hidden"); }
function closeReportModal() { document.getElementById("report-modal").classList.add("hidden"); }