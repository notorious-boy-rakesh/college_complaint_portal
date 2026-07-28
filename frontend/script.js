// ================= GLOBAL STATE =================
let currentUser = null;
let isAdmin = false;
const API = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
  ? "http://localhost:3004" 
  : "https://college-complaint-backend.onrender.com";

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
  const savedUser = localStorage.getItem("currentUser");
  const savedIsAdmin = localStorage.getItem("isAdmin");

  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    isAdmin = savedIsAdmin === "true";
    showDashboard();
  } else {
    showPage("welcome");
  }

  setupEventListeners();
  updateNavigation();
  createAIModal(); // Create modal dynamically
});

// ================= EVENTS =================
function setupEventListeners() {
  document.getElementById("loginForm")?.addEventListener("submit", handleLogin);
  document.getElementById("signupForm")?.addEventListener("submit", handleSignup);
}

// ================= PAGE NAV =================
function showPage(pageName) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const page = document.getElementById(pageName + "Page") || document.getElementById(pageName);
  if (page) page.classList.add("active");
}

function showDashboard() {
  if (isAdmin) {
    document.getElementById("notifBell").style.display = "none";
    showPage("adminDashboard");
    loadAdminDashboard();
  } else {
    document.getElementById("notifBell").style.display = "flex";
    showPage("studentDashboard");
    loadStudentDashboard();
    startNotifPolling();
  }
  updateNavigation();
}

// ================= NAV BAR =================
function updateNavigation() {
  const navLinks = document.getElementById("navLinks");
  if (!navLinks) return;

  navLinks.innerHTML = "";

  if (!currentUser) {
    navLinks.innerHTML = `
      <button onclick="showPage('welcome')" class="nav-btn">Home</button>
      <button onclick="showPage('login')" class="nav-btn">Login</button>
    `;
    return;
  }

  navLinks.innerHTML = `
    <button onclick="showDashboard()" class="nav-btn">Dashboard</button>
    <button onclick="logout()" class="nav-btn btn-logout">Logout</button>
  `;
}

// ================= AUTH =================
function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    "Authorization": token ? `Bearer ${token}` : ""
  };
}

async function handleSignup(e) {
  e.preventDefault();

  const name = val("name");
  const regNumber = val("signupRegNumber");
  const password = val("signupPassword");
  const confirmPassword = val("confirmPassword");

  if (password !== confirmPassword) {
    showToast("Passwords do not match", "error");
    return;
  }

  const res = await fetch(`${API}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, regNumber, password })
  });

  const data = await res.json();
  showToast(data.message, res.ok ? "success" : "error");
  if (res.ok) showPage("login");
}

async function handleLogin(e) {
  e.preventDefault();

  const isAdminLogin = document
    .querySelector('.toggle-btn[data-type="admin"]')
    .classList.contains("active");

  const payload = isAdminLogin
    ? {
        username: document.getElementById("adminUsername").value,
        password: document.getElementById("loginPassword").value,
        isAdmin: true
      }
    : {
        regNumber: document.getElementById("loginRegNumber").value,
        password: document.getElementById("loginPassword").value,
        isAdmin: false
      };

  try {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.message, "error");
      return;
    }

    currentUser = data.user;
    isAdmin = currentUser.role === "admin";
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    localStorage.setItem("isAdmin", isAdmin);
    localStorage.setItem("token", data.token);

    showToast("Login successful");
    showDashboard();
  } catch (error) {
    showToast("Server error. Please try again later.", "error");
  }
}

function logout() {
  localStorage.clear();
  currentUser = null;
  isAdmin = false;
  if (notifInterval) clearInterval(notifInterval);
  document.getElementById("notifBell").style.display = "none";
  showToast("Logged out");
  showPage("welcome");
  updateNavigation();
}

let notifInterval = null;

function startNotifPolling() {
  checkUnreadMails();
  if (notifInterval) clearInterval(notifInterval);
  notifInterval = setInterval(checkUnreadMails, 10000);
}

async function checkUnreadMails() {
  if (!currentUser || isAdmin) return;
  try {
    const res = await fetch(`${API}/mail/unread-count`, { headers: getAuthHeaders() });
    const data = await res.json();
    const badge = document.getElementById("notifCount");
    if (data.count > 0) {
      badge.style.display = "flex";
      badge.textContent = data.count;
    } else {
      badge.style.display = "none";
    }
  } catch(e) {}
}

async function openInboxModal() {
  const res = await fetch(`${API}/mail/inbox`, { headers: getAuthHeaders() });
  const mails = await res.json();
  
  // Mark as read
  fetch(`${API}/mail/mark-read`, { method: "PUT", headers: getAuthHeaders() });
  document.getElementById("notifCount").style.display = "none";

  const listEl = document.getElementById("inboxList");
  if (!mails.length) {
    listEl.innerHTML = `<div class="no-complaints"><i class="fas fa-envelope-open"></i><p>No messages yet</p></div>`;
  } else {
    listEl.innerHTML = mails.map(m => `
      <div class="complaint-item" style="border-left-color: #667eea; margin-bottom:1rem;">
        <div style="display:flex; justify-content:space-between; margin-bottom:0.3rem;">
          <strong>${m.subject}</strong>
          <span style="font-size:0.8rem; color:var(--text-dim);">${new Date(m.sentAt).toLocaleString()}</span>
        </div>
        <p style="white-space: pre-wrap; color: #d0d0d0;">${m.body}</p>
        <span style="font-size:0.75rem; color:var(--text-dim);">From: College Administration</span>
      </div>
    `).join("");
  }
  document.getElementById("inboxModal").style.display = "flex";
}

function closeInboxModal() {
  document.getElementById("inboxModal").style.display = "none";
}

// ================= STUDENT =================
function loadStudentDashboard() {
  const generatedEmail = `${currentUser.regNumber}@gmail.com`;
  document.getElementById("studentProfile").innerHTML = `
    <div class="profile-info">
      <span class="username">${currentUser.name}</span>
      <span class="role">${generatedEmail}</span>
    </div>
  `;
  loadStudentComplaints();
}

async function submitComplaint() {
  const category = val("category");
  const title = val("complaintTitle");
  const details = val("complaintDetails");

  if (!category || !title || !details) {
    showToast("Fill all fields", "error");
    return;
  }

  const res = await fetch(`${API}/complaint`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ category, title, details })
  });
  
  if (res.status === 401) return logout();
  
  showToast("Complaint submitted");
  clearComplaintForm();
  loadStudentComplaints();
}

async function loadStudentComplaints() {
  const res = await fetch(`${API}/complaints/my`, { headers: getAuthHeaders() });
  if (res.status === 401) return logout();
  
  const complaints = await res.json();

  const list = document.getElementById("complaintList");
  if (complaints.length === 0) {
    list.innerHTML = `<div class="no-complaints"><i class="fas fa-inbox"></i><p>No complaints filed yet</p></div>`;
    return;
  }

  list.innerHTML = complaints.map(c => `
    <div class="complaint-item ${c.status}">
      <h4>${c.title}</h4>
      <p>${c.details}</p>
      <span class="status-badge status-${c.status}">${c.status.toUpperCase()}</span>
    </div>
  `).join("");
}

// ================= ADMIN =================
let hideResolvedState = false;

function toggleResolvedComplaints() {
    hideResolvedState = !hideResolvedState;
    const btn = document.getElementById("filterResolvedBtn");
    if (btn) {
        btn.innerHTML = hideResolvedState ? `<i class="fas fa-filter"></i> Show All` : `<i class="fas fa-filter"></i> Hide Resolved`;
    }
    loadAdminDashboard();
}

async function loadAdminDashboard() {
  const res = await fetch(`${API}/admin/complaints`, { headers: getAuthHeaders() });
  if (res.status === 401 || res.status === 403) return logout();
  
  let complaints = await res.json();

  document.getElementById("totalComplaints").textContent = complaints.length;
  document.getElementById("pendingComplaints").textContent = complaints.filter(c => c.status === "pending").length;
  document.getElementById("resolvedComplaints").textContent = complaints.filter(c => c.status === "resolved").length;

  if (hideResolvedState) {
      complaints = complaints.filter(c => c.status !== 'resolved');
  }

  renderAdminTable(complaints);
}

function renderAdminTable(complaints) {
  const tbody = document.querySelector("#adminComplaintsTable tbody");
  tbody.innerHTML = complaints.map(c => `
    <tr>
      <td>#${c.id}</td>
      <td>${c.studentName}<br>
        <span style="font-size:0.85rem; color:#b0b0b0;">${c.regNumber}@gmail.com</span>
      </td>
      <td>${c.category}</td>
      <td>${c.title}</td>
      <td>${new Date(c.date).toLocaleDateString()}</td>
      <td><span class="status-badge status-${c.status}">${c.status}</span></td>
      <td>
        <div style="display:flex; gap:5px; flex-wrap:wrap;">
            ${c.status !== 'resolved' ? `<button class="btn btn-small" onclick="updateStatus(${c.id}, 'resolved')"><i class="fas fa-check"></i></button>` : ''}
            <button class="btn btn-small btn-secondary" onclick="openEmailModal('${c.regNumber}', '${c.title.replace(/'/g, "\\'")}', ${c.id})"><i class="fas fa-envelope"></i> Mail</button>
        </div>
      </td>
    </tr>
  `).join("");
}

async function updateStatus(id, status) {
  await fetch(`${API}/admin/complaint/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status })
  });
  loadAdminDashboard();
}

async function markAllAsResolved() {
  if (!confirm("Are you sure you want to mark all complaints as resolved?")) return;

  const res = await fetch(`${API}/admin/complaints/resolve-all`, {
    method: "PUT",
    headers: getAuthHeaders()
  });

  const data = await res.json();
  showToast(data.message);
  loadAdminDashboard();
}

async function deleteAllComplaints() {
  if (!confirm("WARNING: Are you sure you want to completely erase ALL complaints from the live database? This action cannot be undone.")) return;

  const res = await fetch(`${API}/admin/complaints`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });

  const data = await res.json();
  showToast(data.message);
  loadAdminDashboard();
}

async function viewAllStudents() {
  const res = await fetch(`${API}/admin/students`, { headers: getAuthHeaders() });
  if (res.status === 401 || res.status === 403) return logout();
  const students = await res.json();
  
  const tbody = document.querySelector("#studentTable tbody");
  if (!tbody) return; 
  
  tbody.innerHTML = students.map(s => `
    <tr>
      <td>${s.name}</td>
      <td>${s.regNumber}<br><span style="font-size:0.8rem;color:#b0b0b0;">${s.regNumber}@gmail.com</span></td>
      <td>
        <button class="btn btn-small" style="background:#f44336; color:white; border:none;" onclick="deleteStudent('${s.regNumber}')">Delete</button>
      </td>
    </tr>
  `).join("");
  document.getElementById("studentModal").style.display = "flex";
}

function closeStudentModal() {
  document.getElementById("studentModal").style.display = "none";
}

async function deleteStudent(regNumber) {
    if(!confirm(`Are you sure you want to permanently delete student ${regNumber} and all their complaints?`)) return;
    try {
        const res = await fetch(`${API}/admin/student/${regNumber}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });
        const data = await res.json();
        showToast(data.message, res.ok ? "success" : "error");
        if (res.ok) {
            viewAllStudents(); 
            loadAdminDashboard(); 
        }
    } catch(err) {
        showToast("Error deleting student", "error");
    }
}

function exportComplaints() {
  window.open(`${API}/admin/complaints/export/pdf`, "_blank");
}

// ================= AI FEATURES =================

function createAIModal() {
  const modalHTML = `
    <div id="aiModal" class="ai-modal" style="display:none;">
      <div class="ai-modal-content">
        <span class="ai-close" onclick="closeAIModal()">&times;</span>
        <h3 id="aiModalTitle"><i class="fas fa-robot"></i> AI Response</h3>
        <div id="aiModalBody" class="ai-modal-body">Loading...</div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function showAIModal(title, content) {
  document.getElementById("aiModalTitle").innerHTML = `<i class="fas fa-robot"></i> ${title}`;
  
  // Basic markdown to HTML conversion for bold and lists
  let formattedContent = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n- /g, '<br>• ')
    .replace(/\n/g, '<br>');

  document.getElementById("aiModalBody").innerHTML = formattedContent;
  document.getElementById("aiModal").style.display = "flex";
}

function closeAIModal() {
  document.getElementById("aiModal").style.display = "none";
}

async function fetchAIFeature(endpoint, bodyData, title) {
  showToast("Waking up AI...", "info");
  document.getElementById("aiModalBody").innerHTML = '<div class="loader">Thinking...</div>';
  document.getElementById("aiModal").style.display = "flex";
  document.getElementById("aiModalTitle").innerHTML = `<i class="fas fa-robot"></i> ${title}`;

  try {
    const res = await fetch(`${API}/api/ai/${endpoint}`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(bodyData || {})
    });
    if (res.status === 401 || res.status === 403) return logout();
    const data = await res.json();
    showAIModal(title, data.result || data.message || "No response");
  } catch (error) {
    showAIModal("Error", "Failed to connect to AI Service. Make sure backend is running.");
  }
}

// Student AI Features
function checkSimilarComplaints() {
  const title = val("complaintTitle");
  const details = val("complaintDetails");
  if (!title || !details) return showToast("Please enter a title and details first to check similarity.", "error");
  fetchAIFeature("similar-complaints", { title, details }, "Similar Complaints Check");
}

function generateEmailUpdate() {
  // Mock functionality for student: Ask AI for a draft of how they should followup
  fetchAIFeature("similar-complaints", { title: "Follow up draft", details: "Write a short follow up template" }, "Email Update Draft");
}

// Admin AI Features
function generateBulkEmails() {
  fetchAIFeature("draft-email", {}, "Draft Response for Pending Complaint");
}

function generateMonthlyReport() {
  fetchAIFeature("monthly-report", {}, "Monthly AI Analysis Report");
}

function groupSimilarComplaints() {
  fetchAIFeature("group-complaints", {}, "AI Complaint Grouping");
}

let activeEmailComplaintId = null;

function openEmailModal(regNumber, title, complaintId) {
    activeEmailComplaintId = complaintId;
    document.getElementById("emailTo").value = `${regNumber}@gmail.com`;
    document.getElementById("emailSubject").value = `Update regarding your complaint: ${title}`;
    document.getElementById("emailBody").value = "";
    document.getElementById("emailModal").style.display = "flex";
}

function closeEmailModal() {
    document.getElementById("emailModal").style.display = "none";
}

async function draftEmailWithAI() {
    if (!activeEmailComplaintId) return showToast("No complaint linked.", "error");
    
    document.getElementById("emailBody").value = "Thinking... AI is generating a professional draft...";
    
    try {
        const res = await fetch(`${API}/api/ai/draft-email`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ complaintId: activeEmailComplaintId })
        });
        
        if (res.status === 401 || res.status === 403) return logout();
        const data = await res.json();
        
        document.getElementById("emailBody").value = data.result || "Generation failed.";
    } catch (e) {
        document.getElementById("emailBody").value = "Failed to connect to AI.";
    }
}

function sendAdminEmail() {
    if (!val("emailSubject") || !val("emailBody")) {
        return showToast("Please fill subject and message fields", "error");
    }
    const to = val("emailTo");
    const regNumber = to.replace("@gmail.com", "");

    fetch(`${API}/admin/mail/send`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
            toRegNumber: regNumber,
            subject: val("emailSubject"),
            body: val("emailBody")
        })
    }).then(res => res.json()).then(data => {
        showToast(`Email delivered to ${to}!`);
        closeEmailModal();
    }).catch(() => showToast("Failed to send email", "error"));
}

// ================= HELPERS && LOGIN MODE SWITCH =================
const val = id => document.getElementById(id).value;

function clearComplaintForm() {
  ["category","complaintTitle","complaintDetails"].forEach(id => document.getElementById(id).value = "");
}

function showToast(msg, type="success") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = "toast show";
  setTimeout(() => toast.classList.remove("show"), 3000);
}

function showAdminLogin() {
  showPage("loginPage");
  switchToAdminLogin();
}

function switchToAdminLogin() {
  document.querySelector('.toggle-btn[data-type="admin"]').classList.add("active");
  document.querySelector('.toggle-btn[data-type="student"]').classList.remove("active");
  document.getElementById("studentLoginFields").style.display = "none";
  document.getElementById("adminLoginFields").style.display = "block";
  document.getElementById("loginTitle").textContent = "Admin Login";
  document.getElementById("loginSubtitle").textContent = "Access administrative dashboard";
  document.querySelector(".admin-credentials").style.display = "block";
  document.getElementById("passwordHint").style.display = "none";
}

function switchToStudentLogin() {
  document.querySelector('.toggle-btn[data-type="student"]').classList.add("active");
  document.querySelector('.toggle-btn[data-type="admin"]').classList.remove("active");
  document.getElementById("studentLoginFields").style.display = "block";
  document.getElementById("adminLoginFields").style.display = "none";
  document.getElementById("loginTitle").textContent = "Student Login";
  document.getElementById("loginSubtitle").textContent = "Access your complaint dashboard";
  document.querySelector(".admin-credentials").style.display = "none";
  document.getElementById("passwordHint").style.display = "block";
}
