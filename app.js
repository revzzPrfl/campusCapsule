// app.js - Main Client Logic for campusCapsule

// State variables
let currentUser = null;
let activePage = "superpage"; // current page view
let activeDepartmentTab = "BS"; // active department page view
let activeDeptSubTab = "all"; // active department sub-tab
let superpageSubTab = "feed"; // 'feed' or 'hot-ears'
let peekabooUnlocked = false;
let gossipUnlocked = false;
let modalOpen = false;
let modalType = ""; // 'post', 'poll', 'damage', 'event', 'project', 'feedback', 'notification'

// Load user session on init
function initSession() {
  const savedUser = sessionStorage.getItem("campus_user");
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
  }
  
  const pUnlock = sessionStorage.getItem("peekaboo_unlocked");
  if (pUnlock) peekabooUnlocked = true;
  
  const gUnlock = sessionStorage.getItem("gossip_unlocked");
  if (gUnlock) gossipUnlocked = true;
}

function saveSession(user) {
  currentUser = user;
  if (user) {
    sessionStorage.setItem("campus_user", JSON.stringify(user));
  } else {
    sessionStorage.removeItem("campus_user");
    sessionStorage.removeItem("peekaboo_unlocked");
    sessionStorage.removeItem("gossip_unlocked");
    peekabooUnlocked = false;
    gossipUnlocked = false;
  }
}

// Helper to format timestamps
function formatTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Set up UI components & actions
document.addEventListener("DOMContentLoaded", () => {
  // Initialize Database
  CampusDB.initDB();
  initSession();
  
  // Render main viewport
  renderApp();
});

function navigateTo(pageId, deptCode = null) {
  activePage = pageId;
  if (deptCode) {
    activeDepartmentTab = deptCode;
    activeDeptSubTab = "all"; // Reset department sub-tab filter
  }
  
  // Close any modal on navigate
  closeModal();
  renderApp();
}

function renderApp() {
  const root = document.getElementById("root");
  if (!root) return;

  if (!currentUser) {
    CampusBackgrounds.setPageBackground("auth");
    renderAuth(root);
  } else {
    CampusBackgrounds.setPageBackground(activePage);
    renderDashboard(root);
  }
}

// RENDER AUTHENTICATION (Login / Registration / Reset Password)
function renderAuth(container) {
  let authMode = sessionStorage.getItem("auth_mode") || "login"; // 'login', 'register', 'reset'
  let activeRole = sessionStorage.getItem("auth_role") || "student"; // 'student', 'admin'
  let authError = sessionStorage.getItem("auth_error") || "";
  let authSuccess = sessionStorage.getItem("auth_success") || "";

  let contentHtml = "";

  if (authMode === "login") {
    contentHtml = `
      <div class="auth-card">
        <div class="auth-header">
          <img src="logo.jpg" alt="campusCapsule Logo" class="auth-logo">
          <h2 class="auth-title">campusCapsule</h2>
          <p class="auth-subtitle">Connect, collaborate and stay updated</p>
        </div>

        <div class="auth-tabs">
          <div class="auth-tab ${activeRole === "student" ? "active" : ""}" onclick="setAuthRole('student')">Student</div>
          <div class="auth-tab ${activeRole === "admin" ? "active" : ""}" onclick="setAuthRole('admin')">Department Admin</div>
        </div>

        ${authError ? `<div class="error-message">⚠️ ${authError}</div>` : ""}
        ${authSuccess ? `<div class="success-message">✅ ${authSuccess}</div>` : ""}

        <form id="login-form" onsubmit="handleLogin(event)">
          <div class="form-group">
            <label class="form-label">${activeRole === "student" ? "USN" : "Admin ID"}</label>
            <input type="text" id="login-id" class="form-input" placeholder="${activeRole === "student" ? "e.g. 1GD25CS045" : "e.g. admin_CSE"}" required>
          </div>
          
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" id="login-password" class="form-input" placeholder="••••••••" required>
          </div>

          <button type="submit" class="btn-primary">Sign In</button>
        </form>

        <div class="form-footer">
          ${activeRole === "student" ? `<p>Don't have an account? <span class="form-link" onclick="setAuthMode('register')">Register here</span></p>` : ""}
          <p style="margin-top: 10px;"><span class="form-link" onclick="setAuthMode('reset')">Forgot Password?</span></p>
        </div>
      </div>
    `;
  } else if (authMode === "register") {
    contentHtml = `
      <div class="auth-card" style="max-width: 500px;">
        <div class="auth-header">
          <img src="logo.jpg" alt="campusCapsule Logo" class="auth-logo">
          <h2 class="auth-title">Student Registration</h2>
          <p class="auth-subtitle">Create an account to join your campus capsule</p>
        </div>

        ${authError ? `<div class="error-message">⚠️ ${authError}</div>` : ""}

        <form id="register-form" onsubmit="handleRegister(event)">
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input type="text" id="reg-name" class="form-input" placeholder="e.g. Rohan Sen" required>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div class="form-group">
              <label class="form-label">USN (Unique)</label>
              <input type="text" id="reg-usn" class="form-input" placeholder="e.g. 1GD25CS045" required>
            </div>
            <div class="form-group">
              <label class="form-label">Department</label>
              <select id="reg-dept" class="form-select" required>
                ${Object.entries(CampusDB.DEPARTMENTS).map(([code, name]) => `<option value="${code}">${code} - ${name}</option>`).join("")}
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Mask Name (Mystery Anon Name)</label>
            <input type="text" id="reg-mask" class="form-input" placeholder="e.g. CyberNinja" required>
            <span style="font-size: 11px; color: var(--color-text-secondary); margin-top: 4px; display: block;">Used anonymously in Peekaboo memes and Go-sip threads.</span>
          </div>

          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" id="reg-password" class="form-input" placeholder="••••••••" required>
          </div>

          <button type="submit" class="btn-primary">Register Account</button>
        </form>

        <div class="form-footer">
          <p>Already have an account? <span class="form-link" onclick="setAuthMode('login')">Sign In</span></p>
        </div>
      </div>
    `;
  } else if (authMode === "reset") {
    contentHtml = `
      <div class="auth-card">
        <div class="auth-header">
          <div style="display: flex; justify-content: center; margin-bottom: 12px;">
            <div class="logo-icon" style="background: linear-gradient(135deg, var(--color-yellow), var(--color-maroon));">🔑</div>
          </div>
          <h2 class="auth-title">Reset Password</h2>
          <p class="auth-subtitle">Enter recovery key provided by Superadmin</p>
        </div>

        ${authError ? `<div class="error-message">⚠️ ${authError}</div>` : ""}

        <form id="reset-form" onsubmit="handleResetPassword(event)">
          <div class="form-group">
            <label class="form-label">USN / Admin ID</label>
            <input type="text" id="reset-id" class="form-input" placeholder="e.g. 1GD25CS045 or admin_CSE" required>
          </div>

          <div class="form-group">
            <label class="form-label">Superadmin Recovery Key</label>
            <input type="password" id="reset-key" class="form-input" placeholder="Enter recovery key" required>
          </div>

          <div class="form-group">
            <label class="form-label">New Password</label>
            <input type="password" id="reset-new-password" class="form-input" placeholder="Enter new password" required>
          </div>

          <button type="submit" class="btn-primary">Set New Password</button>
        </form>

        <div class="form-footer">
          <p>Back to <span class="form-link" onclick="setAuthMode('login')">Sign In</span></p>
        </div>
      </div>
    `;
  }

  container.innerHTML = `<div class="auth-page"><img src="logo_circular.jpg" class="top-left-logo" alt="Rotating Brand Logo">${contentHtml}</div>`;
}

// AUTH HANDLERS
window.setAuthMode = function(mode) {
  sessionStorage.setItem("auth_mode", mode);
  sessionStorage.removeItem("auth_error");
  sessionStorage.removeItem("auth_success");
  renderApp();
};

window.setAuthRole = function(role) {
  sessionStorage.setItem("auth_role", role);
  sessionStorage.removeItem("auth_error");
  sessionStorage.removeItem("auth_success");
  renderApp();
};

window.handleLogin = function(event) {
  event.preventDefault();
  const usn = document.getElementById("login-id").value.trim();
  const password = document.getElementById("login-password").value;

  const result = CampusDB.loginUser(usn, password);
  if (result.success) {
    saveSession(result.user);
    sessionStorage.removeItem("auth_error");
    sessionStorage.removeItem("auth_success");
    navigateTo("superpage");
  } else {
    sessionStorage.setItem("auth_error", result.message);
    renderApp();
  }
};

window.handleRegister = function(event) {
  event.preventDefault();
  const name = document.getElementById("reg-name").value.trim();
  const usn = document.getElementById("reg-usn").value.trim();
  const dept = document.getElementById("reg-dept").value;
  const maskName = document.getElementById("reg-mask").value.trim();
  const password = document.getElementById("reg-password").value;

  const result = CampusDB.registerStudent(name, usn, password, dept, maskName);
  if (result.success) {
    sessionStorage.setItem("auth_mode", "login");
    sessionStorage.setItem("auth_success", "Registration successful! You can now log in.");
    sessionStorage.removeItem("auth_error");
    renderApp();
  } else {
    sessionStorage.setItem("auth_error", result.message);
    renderApp();
  }
};

window.handleResetPassword = function(event) {
  event.preventDefault();
  const usn = document.getElementById("reset-id").value.trim();
  const key = document.getElementById("reset-key").value.trim();
  const newPassword = document.getElementById("reset-new-password").value;

  const result = CampusDB.resetPassword(usn, key, newPassword);
  if (result.success) {
    sessionStorage.setItem("auth_mode", "login");
    sessionStorage.setItem("auth_success", "Password reset successful! Sign in with your new password.");
    sessionStorage.removeItem("auth_error");
    renderApp();
  } else {
    sessionStorage.setItem("auth_error", result.message);
    renderApp();
  }
};

window.handleLogout = function() {
  saveSession(null);
  renderApp();
};

// RENDER DASHBOARD LAYOUT
function renderDashboard(container) {
  container.innerHTML = `
    <div class="app-container">
      <!-- Sidebar Navigation -->
      <aside class="sidebar">
        <div class="logo-container">
          <div class="logo-icon">C</div>
          <span class="logo-text">campusCapsule</span>
        </div>
        
        <ul class="sidebar-menu">
          <li class="menu-item ${activePage === "superpage" ? "active" : ""}" onclick="navigateTo('superpage')">
            <span class="menu-icon">🏛️</span> Superpage
          </li>
          
          <li class="menu-item ${activePage === "posts" ? "active" : ""}" onclick="navigateTo('posts')">
            <span class="menu-icon">📝</span> Posts
          </li>
          
          <li class="menu-item ${activePage === "peekaboo" ? "active" : ""}" onclick="navigateTo('peekaboo')">
            <span class="menu-icon">🎭</span> Peekaboo
          </li>
          
          <li class="menu-item ${activePage === "damage_reports" ? "active" : ""}" onclick="navigateTo('damage_reports')">
            <span class="menu-icon">🛠️</span> Damage Reports
          </li>
          
          <li class="menu-item ${activePage === "events" ? "active" : ""}" onclick="navigateTo('events')">
            <span class="menu-icon">🎉</span> Events
          </li>
          
          <li class="menu-item ${activePage === "projects" ? "active" : ""}" onclick="navigateTo('projects')">
            <span class="menu-icon">🚀</span> Projects
          </li>
          
          <li class="menu-item ${activePage === "marketplace" ? "active" : ""}" onclick="navigateTo('marketplace')">
            <span class="menu-icon">🛒</span> Marketplace
          </li>
          
          <li class="menu-item ${activePage === "gossip" ? "active" : ""}" onclick="navigateTo('gossip')">
            <span class="menu-icon">☕</span> Go-sip
          </li>

          <!-- Department Submenus -->
          <li style="margin-top: 15px; margin-bottom: 5px; padding: 0 16px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--color-text-secondary); font-weight: 700;">
            Departments
          </li>
          ${Object.keys(CampusDB.DEPARTMENTS).map(deptCode => `
            <li class="menu-item ${activePage === "department" && activeDepartmentTab === deptCode ? "active" : ""}" onclick="navigateTo('department', '${deptCode}')">
              <span class="menu-icon" style="font-size: 13px; font-weight: 700; width: 20px;">${deptCode}</span> 
              <span style="font-size: 13.5px;">${deptCode} Feed</span>
            </li>
          `).join("")}

          <!-- Admin-only Manage Damage Portal -->
          ${currentUser.role === 'admin' ? `
            <li class="menu-item ${activePage === "manage_damage" ? "active" : ""}" onclick="navigateTo('manage_damage')">
              <span class="menu-icon">🔧</span> Manage Damage
            </li>
          ` : ""}

          <!-- Logout Button -->
          <li class="menu-item logout-btn" onclick="handleLogout()">
            <span class="menu-icon">🚪</span> Logout
          </li>
        </ul>
      </aside>

      <!-- Main Panel viewport -->
      <main class="main-content">
        <header class="header-bar">
          <div>
            <h1 style="font-size: 26px; font-weight: 800; color: var(--color-white); letter-spacing: -0.5px;">
              ${getPageTitle()}
            </h1>
            <p style="font-size: 14px; color: var(--color-text-secondary); margin-top: 4px;">
              ${getPageDescription()}
            </p>
          </div>
          
          <div class="user-badge">
            <div class="badge-dot"></div>
            <div class="card-author-info">
              <span class="badge-text">${currentUser.role === 'admin' ? `${currentUser.dept === 'CS' ? 'CSE' : currentUser.dept === 'CD' ? 'CSDS' : currentUser.dept === 'CI' ? 'CI' : currentUser.dept === 'EC' ? 'ECE' : currentUser.dept === 'IS' ? 'ISE' : currentUser.dept === 'AE' ? 'AE' : currentUser.dept}-admin` : currentUser.name}</span>
              <span class="badge-subtext">${currentUser.role === 'admin' ? 'Dept Administrator' : currentUser.usn}</span>
            </div>
          </div>
        </header>

        <!-- Dynamic Page Injector -->
        <div id="page-content">
          ${renderPageContent()}
        </div>
      </main>
    </div>

    <!-- Floating Action Action Button -->
    ${shouldShowFloatingBtn() ? `
      <div class="floating-action">
        <button class="btn-float" onclick="openPostModal()">+</button>
      </div>
    ` : ""}

    <!-- Modal Dialog Sheet -->
    <div class="modal-overlay ${modalOpen ? "active" : ""}" id="post-modal" onclick="handleModalOverlayClick(event)">
      <div class="modal-container">
        <div class="modal-header">
          <h3 class="modal-title" id="modal-title-text">Create Contribution</h3>
          <button class="modal-close" onclick="closeModal()">×</button>
        </div>
        <div id="modal-body-content">
          <!-- Injected modal form -->
        </div>
      </div>
    </div>
  `;
}

function getPageTitle() {
  switch (activePage) {
    case "superpage": return "Main College Portal";
    case "posts": return "Department Posts Feed";
    case "peekaboo": return "🎭 Peekaboo Meme Arena";
    case "damage_reports": return "🛠️ Damage Reports Desk";
    case "events": return "🎉 Campus Events Board";
    case "projects": return "🚀 Innovation Projects Hub";
    case "marketplace": return "🛒 Campus Marketplace";
    case "gossip": return "☕ Go-sip Station";
    case "department": return `${CampusDB.DEPARTMENTS[activeDepartmentTab]} Feed`;
    case "manage_damage": return "🔧 Damage Reports Control";
    default: return "Dashboard";
  }
}

function getPageDescription() {
  switch (activePage) {
    case "superpage": return "Trending feeds, official college updates, polls, and promoted campus activities.";
    case "posts": return "General student posts organized by respective department boards.";
    case "peekaboo": return "Unfiltered mystery memes. Authenticate using your USN and Mask Name to spill the humor.";
    case "damage_reports": return "Report broken facilities and request maintenance support (students limit: 3).";
    case "events": return "Fests, hackathons, and workshops. Events receiving >15 uparrows feature on the main page with student USN.";
    case "projects": return "Showcase student engineering prototypes. Projects receiving >10 uparrows promote to the college dashboard.";
    case "marketplace": return "Buy, sell, or rent student essentials (currently under maintenance).";
    case "gossip": return "Anonymous gossip and tea spilling. Only sentence-based texts. Strictly hidden identities.";
    case "department": return `Official boards and student contributions for the department of ${CampusDB.DEPARTMENTS[activeDepartmentTab]}.`;
    case "manage_damage": return "Review and update the status of broken facilities reported by students of your department.";
    default: return "";
  }
}

function shouldShowFloatingBtn() {
  // Only students and admins can post, but certain pages have specific rules
  if (activePage === "marketplace") return false;
  if (activePage === "peekaboo" && !peekabooUnlocked) return false;
  if (activePage === "gossip" && !gossipUnlocked) return false;
  if (activePage === "manage_damage") return false;
  
  // Students and admins are allowed to post in events and department pages
  return true;
}

// ROUTER CONTENT RENDERING
function renderPageContent() {
  switch (activePage) {
    case "superpage":
      return renderSuperpage();
    case "posts":
      return renderPostsFeed();
    case "peekaboo":
      return renderPeekaboo();
    case "damage_reports":
      return renderDamageReports();
    case "events":
      return renderEvents();
    case "projects":
      return renderProjects();
    case "marketplace":
      return renderMarketplace();
    case "gossip":
      return renderGossip();
    case "department":
      return renderDepartmentPage();
    case "manage_damage":
      return renderAdminDamagePortal();
    default:
      return "<div>Page not found!</div>";
  }
}

// 1. SUPERPAGE VIEW (MAIN PAGE)
function renderSuperpage() {
  const feed = superpageSubTab === "feed" ? CampusDB.getSuperpageFeed() : CampusDB.getHOTearsFeed();

  return `
    <div class="superpage-brand-card">
      <img src="logo.jpg" alt="GCEM Campus Capsule Logo" class="superpage-brand-logo">
      <div class="superpage-brand-info">
        <h3>GCEM Campus Capsule</h3>
        <p>The official central campus portal. Stay updated with department fests, prototype showcases, official notices, and student activities.</p>
      </div>
    </div>

    <div class="section-tabs">
      <div class="section-tab ${superpageSubTab === "feed" ? "active" : ""}" onclick="setSuperpageSubTab('feed')">College Board</div>
      <div class="section-tab ${superpageSubTab === "hot-ears" ? "active" : ""}" onclick="setSuperpageSubTab('hot-ears')">🔥 HOT-ears (Trending)</div>
    </div>

    ${feed.length === 0 ? `
      <div class="card" style="text-align: center; padding: 40px; color: var(--color-text-secondary);">
        <span style="font-size: 40px; display: block; margin-bottom: 16px;">📭</span>
        No trending items or official bulletins currently posted. Check back later!
      </div>
    ` : `
      <div class="feed-grid">
        ${feed.map(post => renderPostCard(post)).join("")}
      </div>
    `}
  `;
}

window.setSuperpageSubTab = function(tab) {
  superpageSubTab = tab;
  renderApp();
};

// 2. GENERAL POSTS FEED VIEW
function renderPostsFeed() {
  const posts = CampusDB.getPosts().filter(p => p.type === "post" && p.status === "active");

  return `
    <div style="margin-bottom: 24px;">
      <p style="font-size: 14px; color: var(--color-text-secondary);">
        All general posts. When you add a post, it automatically appears under your respective department page feed.
      </p>
    </div>
    
    ${posts.length === 0 ? `
      <div class="card" style="text-align: center; padding: 40px; color: var(--color-text-secondary);">
        <span style="font-size: 40px; display: block; margin-bottom: 16px;">📝</span>
        No general student posts. Be the first to share something!
      </div>
    ` : `
      <div class="feed-grid">
        ${posts.map(post => renderPostCard(post)).join("")}
      </div>
    `}
  `;
}

// 3. PEEKABOO (MEME FORUM)
function renderPeekaboo() {
  if (currentUser.role === "admin") {
    return `
      <div class="card" style="text-align: center; padding: 50px;">
        <span style="font-size: 50px; display: block; margin-bottom: 16px;">🔒</span>
        <h3>Student Only Area</h3>
        <p style="color: var(--color-text-secondary); margin-top: 10px;">
          The Peekaboo meme forum is restricted to students only to preserve anonymity and community mystery.
        </p>
      </div>
    `;
  }

  if (!peekabooUnlocked) {
    return renderAnonUnlockForm("peekaboo");
  }

  const posts = CampusDB.getAnonFeed("peekaboo");

  return `
    <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
      <span class="upload-counter">Uploads: ${CampusDB.getStudentContributionCount(currentUser.usn, 'peekaboo')}/3</span>
      <span class="text-pink" style="font-size: 13px; font-weight: 600;">Masked Session Active: ${currentUser.maskName} 🎭</span>
    </div>

    ${posts.length === 0 ? `
      <div class="card" style="text-align: center; padding: 40px; color: var(--color-text-secondary);">
        <span style="font-size: 40px; display: block; margin-bottom: 16px;">🎭</span>
        No mystery memes posted yet. Share a funny image or word joke!
      </div>
    ` : `
      <div class="feed-grid">
        ${posts.map(post => renderPostCard(post)).join("")}
      </div>
    `}
  `;
}

// 4. DAMAGE REPORTS
function renderDamageReports() {
  const posts = CampusDB.getPosts().filter(p => p.type === "damage" && p.status === "active");

  return `
    ${currentUser.role === "student" ? `
      <div style="margin-bottom: 24px;">
        <span class="upload-counter">Uploads: ${CampusDB.getStudentContributionCount(currentUser.usn, 'damage')}/3</span>
      </div>
    ` : ""}
    
    ${posts.length === 0 ? `
      <div class="card" style="text-align: center; padding: 40px; color: var(--color-text-secondary);">
        <span style="font-size: 40px; display: block; margin-bottom: 16px;">🛠️</span>
        No damage reports filed. Everything seems clean and functional!
      </div>
    ` : `
      <div class="feed-grid">
        ${posts.map(post => renderPostCard(post)).join("")}
      </div>
    `}
  `;
}

// 5. EVENTS BOARD
function renderEvents() {
  const posts = CampusDB.getPosts().filter(p => p.type === "event" && p.status === "active");

  return `
    ${currentUser.role === "student" ? `
      <div style="margin-bottom: 24px;">
        <span class="upload-counter">Uploads: ${CampusDB.getStudentContributionCount(currentUser.usn, 'event')}/3</span>
      </div>
    ` : ""}
    
    ${posts.length === 0 ? `
      <div class="card" style="text-align: center; padding: 40px; color: var(--color-text-secondary);">
        <span style="font-size: 40px; display: block; margin-bottom: 16px;">🎉</span>
        No upcoming events or fest posters listed. Check back later!
      </div>
    ` : `
      <div class="feed-grid">
        ${posts.map(post => renderPostCard(post)).join("")}
      </div>
    `}
  `;
}

// 6. PROJECTS DISPLAY
function renderProjects() {
  const posts = CampusDB.getPosts().filter(p => p.type === "project" && p.status === "active");

  return `
    ${currentUser.role === "student" ? `
      <div style="margin-bottom: 24px;">
        <span class="upload-counter">Uploads: ${CampusDB.getStudentContributionCount(currentUser.usn, 'project')}/3</span>
      </div>
    ` : ""}
    
    ${posts.length === 0 ? `
      <div class="card" style="text-align: center; padding: 40px; color: var(--color-text-secondary);">
        <span style="font-size: 40px; display: block; margin-bottom: 16px;">🚀</span>
        No prototype projects shared yet. Publish your project to gain upvotes!
      </div>
    ` : `
      <div class="feed-grid">
        ${posts.map(post => renderPostCard(post)).join("")}
      </div>
    `}
  `;
}

// 7. MARKETPLACE (COMA STAGE-2)
function renderMarketplace() {
  return `
    <div class="coma-container">
      <div class="coma-icon">😴</div>
      <h2 class="coma-title">Coma Stage-2</h2>
      <p class="coma-desc">
        Shhh... The marketplace is currently in a deep coma under maintenance. Developers are preparing the auction modules for launch. Stay tuned!
      </p>
    </div>
  `;
}

// 8. GO-SIP STATION
function renderGossip() {
  if (currentUser.role === "admin") {
    return `
      <div class="card" style="text-align: center; padding: 50px;">
        <span style="font-size: 50px; display: block; margin-bottom: 16px;">🔒</span>
        <h3>Student Only Area</h3>
        <p style="color: var(--color-text-secondary); margin-top: 10px;">
          The Go-sip station is reserved for students only to keep discussions friendly, mysterious, and safe.
        </p>
      </div>
    `;
  }

  if (!gossipUnlocked) {
    return renderAnonUnlockForm("gossip");
  }

  const posts = CampusDB.getAnonFeed("gossip");

  return `
    <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
      <span class="upload-counter">Uploads: ${CampusDB.getStudentContributionCount(currentUser.usn, 'gossip')}/3</span>
      <span class="text-yellow" style="font-size: 13px; font-weight: 600;">Masked Session Active: ${currentUser.maskName} ☕</span>
    </div>

    ${posts.length === 0 ? `
      <div class="card" style="text-align: center; padding: 40px; color: var(--color-text-secondary);">
        <span style="font-size: 40px; display: block; margin-bottom: 16px;">☕</span>
        No campus tea spilled yet. Drop the first scoop!
      </div>
    ` : `
      <div class="feed-grid">
        ${posts.map(post => renderPostCard(post)).join("")}
      </div>
    `}
  `;
}

// ANONYMOUS UNLOCK FORM
function renderAnonUnlockForm(type) {
  const errorKey = `anon_error_${type}`;
  const errorMsg = sessionStorage.getItem(errorKey) || "";

  return `
    <div class="anon-unlock-container">
      <div class="anon-unlock-icon">${type === "peekaboo" ? "🎭" : "☕"}</div>
      <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 10px;">Unlock Anonymous Mode</h3>
      <p style="font-size: 14px; color: var(--color-text-secondary); margin-bottom: 24px;">
        To maintain mystery, verify your registered student credentials. Your real name and USN will remain strictly hidden from other students in this section.
      </p>

      ${errorMsg ? `<div class="error-message" style="text-align: left;">⚠️ ${errorMsg}</div>` : ""}

      <form onsubmit="handleAnonUnlock(event, '${type}')">
        <div class="form-group" style="text-align: left;">
          <label class="form-label">Your USN</label>
          <input type="text" id="anon-usn-${type}" class="form-input" placeholder="e.g. 1GD25CS045" required>
        </div>

        <div class="form-group" style="text-align: left;">
          <label class="form-label">Your Mask Name</label>
          <input type="text" id="anon-mask-${type}" class="form-input" placeholder="e.g. ShadowCoder" required>
        </div>

        <button type="submit" class="btn-primary">Verify & Unlock</button>
      </form>
    </div>
  `;
}

window.handleAnonUnlock = function(event, type) {
  event.preventDefault();
  const usnInput = document.getElementById(`anon-usn-${type}`).value.trim().toUpperCase();
  const maskInput = document.getElementById(`anon-mask-${type}`).value.trim();
  const errorKey = `anon_error_${type}`;

  if (currentUser.usn.toUpperCase() === usnInput && currentUser.maskName.toLowerCase() === maskInput.toLowerCase()) {
    sessionStorage.removeItem(errorKey);
    if (type === "peekaboo") {
      peekabooUnlocked = true;
      sessionStorage.setItem("peekaboo_unlocked", "true");
    } else {
      gossipUnlocked = true;
      sessionStorage.setItem("gossip_unlocked", "true");
    }
    renderApp();
  } else {
    sessionStorage.setItem(errorKey, "Credentials mismatch! Please enter your correct USN and Mask Name.");
    renderApp();
  }
};

// 9. DEPARTMENT FEED VIEW (INDIVIDUAL BOARD)
let showStudentList = false; // Toggle for admin student list

function renderDepartmentPage() {
  let deptPosts = CampusDB.getDepartmentFeed(activeDepartmentTab);
  
  // Filter department feed based on active sub-tab
  if (activeDeptSubTab !== "all") {
    deptPosts = deptPosts.filter(p => p.type === activeDeptSubTab);
  }
  
  // Statistics/Counts
  const registeredStudents = CampusDB.getUsers().filter(u => u.role === "student" && u.dept === activeDepartmentTab);
  const studentsCount = registeredStudents.length;

  const isAdminOfThisDept = currentUser.role === "admin" && currentUser.dept === activeDepartmentTab;

  return `
    <!-- Top Stats Row -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <span class="stat-title">Registered Students</span>
        <span class="stat-value">
          ${studentsCount} 
          ${isAdminOfThisDept ? `<button class="btn-tab-action" style="margin-left: auto;" onclick="toggleStudentList()">${showStudentList ? "Hide List" : "View List"}</button>` : ""}
        </span>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📝</div>
        <span class="stat-title">Student Contributions</span>
        <span class="stat-value">${deptPosts.filter(p => p.authorUsn !== `${activeDepartmentTab}-admin`).length}</span>
      </div>
      <div class="stat-card" style="border-left: 3px solid var(--color-pink);">
        <div class="stat-icon">🔔</div>
        <span class="stat-title">Official Announcements</span>
        <span class="stat-value">${deptPosts.filter(p => p.type === "notification").length}</span>
      </div>
    </div>

    <!-- Admin-only Student Management Table -->
    ${isAdminOfThisDept && showStudentList ? `
      <div class="card" style="margin-bottom: 30px; animation: slideIn 0.3s ease-out;">
        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 12px; color: var(--color-white);">Department Registered Students List</h3>
        <p style="font-size: 13px; color: var(--color-text-secondary); margin-bottom: 16px;">
          Auditing portal. Student Mask Names are visible here to coordinate contributions responsibly.
        </p>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>USN</th>
                <th>Name</th>
                <th>Mask Name</th>
                <th>Total Uploads</th>
              </tr>
            </thead>
            <tbody>
              ${registeredStudents.map(student => {
                const totalPosts = CampusDB.getPosts().filter(p => p.authorUsn === student.usn && p.status === "active").length;
                return `
                  <tr>
                    <td style="font-family: monospace; font-weight: bold; color: var(--color-pink);">${student.usn}</td>
                    <td>${student.name}</td>
                    <td><span class="badge-tag-event" style="padding: 2px 6px;">${student.maskName}</span></td>
                    <td>${totalPosts} / 18 max</td>
                  </tr>
                `;
              }).join("")}
              ${registeredStudents.length === 0 ? `<tr><td colspan="4" style="text-align: center; color: var(--color-text-secondary);">No students registered in this department yet.</td></tr>` : ""}
            </tbody>
          </table>
        </div>
      </div>
    ` : ""}

    <!-- Department Sub-Tabs -->
    <div class="section-tabs" style="margin-bottom: 24px;">
      <div class="section-tab ${activeDeptSubTab === "all" ? "active" : ""}" onclick="setDeptSubTab('all')">All Feed</div>
      <div class="section-tab ${activeDeptSubTab === "project" ? "active" : ""}" onclick="setDeptSubTab('project')">Projects</div>
      <div class="section-tab ${activeDeptSubTab === "event" ? "active" : ""}" onclick="setDeptSubTab('event')">Events</div>
      <div class="section-tab ${activeDeptSubTab === "feedback" ? "active" : ""}" onclick="setDeptSubTab('feedback')">Faculty Feedback</div>
      <div class="section-tab ${activeDeptSubTab === "notification" ? "active" : ""}" onclick="setDeptSubTab('notification')">Notifications</div>
    </div>

    <!-- Action buttons for admin to post official content -->
    ${isAdminOfThisDept ? `
      <div style="display: flex; gap: 12px; margin-bottom: 24px;">
        <button class="btn-tab-action" onclick="openAdminPostModal('notification')">📢 Post Notification</button>
        <button class="btn-tab-action" style="background: var(--color-maroon-light);" onclick="openAdminPostModal('feedback')">🍎 Post Faculty Feedback Form</button>
      </div>
    ` : ""}

    <!-- Posts Grid -->
    ${deptPosts.length === 0 ? `
      <div class="card" style="text-align: center; padding: 40px; color: var(--color-text-secondary);">
        <span style="font-size: 40px; display: block; margin-bottom: 16px;">📭</span>
        No contributions or updates posted in this department yet.
      </div>
    ` : `
      <div class="feed-grid">
        ${deptPosts.map(post => renderPostCard(post)).join("")}
      </div>
    `}
  `;
}

window.toggleStudentList = function() {
  showStudentList = !showStudentList;
  renderApp();
};

window.setDeptSubTab = function(tab) {
  activeDeptSubTab = tab;
  renderApp();
};

// POST CARD COMPONENT
function renderPostCard(post) {
  const isVotedUp = post.votedUsers && post.votedUsers[currentUser.usn] === "up";
  const isVotedDown = post.votedUsers && post.votedUsers[currentUser.usn] === "down";

  const isPeekOrGossip = ["peekaboo", "gossip"].includes(post.type);
  const isPeekaboo = post.type === "peekaboo";
  const isAdminPost = post.authorUsn && (post.authorUsn.endsWith("-admin") || post.authorUsn.includes("admin"));

  // Moderation: Check if current user is admin of the post's department
  const canModerate = currentUser.role === "admin" && currentUser.dept === post.department;

  // Determine display name
  let authorDisplayName = isPeekOrGossip ? post.authorMask : post.authorName;
  if (isPeekOrGossip && currentUser.role === "admin") {
    authorDisplayName = `${post.authorMask} <span style="font-family: monospace; font-size: 11px; color: var(--color-pink); font-weight: normal; margin-left: 6px;">[${post.authorUsn}]</span>`;
  } else if (post.type === "event" && activePage === "superpage" && post.votes > 15 && !isAdminPost) {
    authorDisplayName = `<span style="font-family: monospace; font-size: 13.5px; color: var(--color-pink); font-weight: bold;">${post.authorUsn}</span>`; // Insist on USN only
  }

  return `
    <div class="card" id="card-${post.id}">
      <div class="card-header">
        <div class="card-meta">
          <div class="card-avatar ${isAdminPost ? "admin-avatar" : isPeekOrGossip ? "anon-avatar" : ""}">
            ${isAdminPost ? "👑" : isPeekOrGossip ? "🎭" : authorDisplayName.charAt(0)}
          </div>
          <div class="card-author-info">
            <span class="card-author">
              ${authorDisplayName}
            </span>
            <span class="card-time">${formatTime(post.timestamp)} • Department: ${post.department}</span>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="card-badge badge-tag-${post.type}">${post.type}</span>
          ${post.type === "damage" ? (post.damageStatus === "fixed" ? 
            `<span class="badge-tag-event" style="padding: 2px 8px; border-radius: 12px; font-weight: 800; font-size: 10px; text-transform: uppercase;">✅ FIXED</span>` : 
            `<span class="badge-tag-poll" style="padding: 2px 8px; border-radius: 12px; font-weight: 800; font-size: 10px; text-transform: uppercase;">⚠️ PENDING</span>`) : ""}
        </div>
      </div>

      <div class="card-content">${post.content}</div>

      ${post.image ? (post.type === "reel" ? `
        <div class="reel-media-wrapper">
          <img src="${post.image}" class="card-image reel-image" alt="Reel cover">
          <div class="reel-play-overlay">
            <div class="reel-play-button">▶</div>
          </div>
        </div>
      ` : `<img src="${post.image}" class="card-image" alt="Post attachment">`) : ""}

      <!-- If type is poll, render poll visualizer -->
      ${post.type === "poll" ? renderPollOptionsBlock(post) : ""}

      <div class="card-footer">
        <div class="vote-actions">
          ${isPeekaboo ? `
            <!-- Anonymous Bomb/Eyeroll Voting -->
            <button class="vote-btn bomb-btn ${isVotedUp ? "active" : ""}" onclick="handleVote('${post.id}', 'up')">
              💣 <span class="vote-count" style="margin-left: 2px;">${post.votes || 0}</span>
            </button>
            <button class="vote-btn eyeroll-btn ${isVotedDown ? "active" : ""}" onclick="handleVote('${post.id}', 'down')">
              🙄 <span class="dislike-count" style="margin-left: 2px;">${post.dislikes || 0}</span>
            </button>
          ` : `
            <!-- Standard Up/Down Voting -->
            <button class="vote-btn up-arrow ${isVotedUp ? "active" : ""}" onclick="handleVote('${post.id}', 'up')">▲</button>
            <span class="vote-count">${post.votes || 0}</span>
            <button class="vote-btn down-arrow ${isVotedDown ? "active" : ""}" onclick="handleVote('${post.id}', 'down')">▼</button>
          `}
        </div>

        <!-- Moderator utilities -->
        ${canModerate ? `
          <div class="moderator-actions">
            <button class="btn-delete" onclick="handleDeletePost('${post.id}')">🗑️ Delete</button>
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

function renderPollOptionsBlock(post) {
  const totalVotes = Object.values(post.pollVotes || {}).reduce((a, b) => a + b, 0);
  const userVotedIndex = post.userPollVotes ? post.userPollVotes[currentUser.usn] : undefined;

  return `
    <div class="poll-container">
      ${post.options.map((opt, idx) => {
        const votes = post.pollVotes[idx] || 0;
        const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
        const isVoted = userVotedIndex === idx;

        return `
          <div class="poll-option-row ${isVoted ? "voted" : ""}" onclick="handlePollVote('${post.id}', ${idx})">
            <div class="poll-progress-bg" style="width: ${percent}%;"></div>
            <span class="poll-option-text">${opt}</span>
            <span class="poll-option-votes">${percent}% (${votes})</span>
          </div>
        `;
      }).join("")}
      <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: 4px;">
        Total Votes Cast: ${totalVotes}
      </div>
    </div>
  `;
}

// POST INTERACTION UTILITIES
window.handleVote = function(postId, direction) {
  const result = CampusDB.voteContribution(postId, currentUser.usn, direction);
  if (result.success) {
    renderApp();
  }
};

window.handlePollVote = function(postId, optionIdx) {
  const result = CampusDB.votePollOption(postId, currentUser.usn, optionIdx);
  if (result.success) {
    renderApp();
  }
};

window.handleDeletePost = function(postId) {
  if (confirm("Are you sure you want to delete this contribution? This action is permanent.")) {
    const result = CampusDB.deleteContribution(postId, currentUser);
    if (result.success) {
      renderApp();
    } else {
      alert(result.message);
    }
  }
};

// MODAL CONTROLS
let pollOptionsCount = 2; // Initial options count for poll building

window.openPostModal = function() {
  modalOpen = true;
  modalType = activePage === "department" ? "post" : activePage;
  pollOptionsCount = 2; // Reset option counters
  
  // Normalize types
  if (modalType === "superpage") modalType = "post";
  
  renderModalContent();
};

window.openAdminPostModal = function(type) {
  modalOpen = true;
  modalType = type;
  renderModalContent();
};

window.closeModal = function() {
  modalOpen = false;
  document.getElementById("post-modal").classList.remove("active");
};

window.handleModalOverlayClick = function(event) {
  if (event.target.id === "post-modal") {
    closeModal();
  }
};

// Image Upload handlers for Base64 conversion
window.handleImageUploadChange = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Check file size (limit to 3MB)
  if (file.size > 3 * 1024 * 1024) {
    alert("Image size should be less than 3MB!");
    event.target.value = "";
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const base64Data = e.target.result;
    const base64Input = document.getElementById("post-image-base64");
    if (base64Input) base64Input.value = base64Data;
    
    const urlInput = document.getElementById("post-image");
    if (urlInput) urlInput.value = ""; // Clear URL input
    
    // Show preview
    const preview = document.getElementById("image-preview");
    if (preview) preview.src = base64Data;
    
    const previewContainer = document.getElementById("image-preview-container");
    if (previewContainer) previewContainer.style.display = "block";
  };
  reader.readAsDataURL(file);
};

window.handleImageUrlChange = function(event) {
  const url = event.target.value.trim();
  const fileInput = document.getElementById("post-image-file");
  const base64Input = document.getElementById("post-image-base64");
  
  if (url) {
    if (fileInput) fileInput.value = "";
    if (base64Input) base64Input.value = "";
    
    const preview = document.getElementById("image-preview");
    if (preview) preview.src = url;
    
    const previewContainer = document.getElementById("image-preview-container");
    if (previewContainer) previewContainer.style.display = "block";
  } else {
    const previewContainer = document.getElementById("image-preview-container");
    if (previewContainer) previewContainer.style.display = "none";
  }
};

window.clearUploadedImage = function() {
  const fileInput = document.getElementById("post-image-file");
  if (fileInput) fileInput.value = "";
  
  const base64Input = document.getElementById("post-image-base64");
  if (base64Input) base64Input.value = "";

  const urlInput = document.getElementById("post-image");
  if (urlInput) urlInput.value = "";
  
  const previewContainer = document.getElementById("image-preview-container");
  if (previewContainer) previewContainer.style.display = "none";
};

function renderImageAttachmentFields(label = "Attachment Image") {
  return `
    <div class="form-group" id="image-upload-group">
      <label class="form-label" id="image-url-label">${label}</label>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <input type="file" id="post-image-file" class="form-input" accept="image/*" onchange="handleImageUploadChange(event)" style="padding: 8px; font-size: 13px;">
        <div style="text-align: center; color: var(--color-text-secondary); font-size: 11px; margin: 2px 0;">— OR —</div>
        <input type="url" id="post-image" class="form-input" placeholder="Paste image URL instead..." oninput="handleImageUrlChange(event)">
        <input type="hidden" id="post-image-base64">
      </div>
      <div id="image-preview-container" style="display: none; margin-top: 12px; text-align: center; border: 1px dashed var(--glass-border); padding: 10px; border-radius: var(--border-radius-md); background: rgba(0,0,0,0.2);">
        <img id="image-preview" src="" style="max-height: 140px; max-width: 100%; border-radius: var(--border-radius-md); object-fit: contain;" alt="Preview">
        <button type="button" class="btn-remove-option" style="margin: 8px auto 0 auto; padding: 4px 12px; font-size: 12px; width: auto;" onclick="clearUploadedImage()">Remove Image</button>
      </div>
    </div>
  `;
}

function renderModalContent() {
  const overlay = document.getElementById("post-modal");
  const titleText = document.getElementById("modal-title-text");
  const body = document.getElementById("modal-body-content");
  
  if (!overlay || !body) return;

  let formHtml = "";
  
  // Set title
  let displayTitle = "Add Contribution";
  if (modalType === "post") displayTitle = "Create New Post";
  if (modalType === "peekaboo") displayTitle = "Share Secret Meme";
  if (modalType === "gossip") displayTitle = "Spill Campus Tea";
  if (modalType === "damage_reports") displayTitle = "File Damage Report";
  if (modalType === "projects") displayTitle = "Publish Engineering Project";
  if (modalType === "events") displayTitle = "Post Event Flyer";
  if (modalType === "feedback") displayTitle = "Post Faculty Feedback Portal";
  if (modalType === "notification") displayTitle = "Post Department Announcement";

  titleText.innerText = displayTitle;

  // Render Form based on type
  if (modalType === "post") {
    formHtml = `
      <form onsubmit="submitContributionForm(event)">
        <div class="form-group">
          <label class="form-label">Post Category</label>
          <select id="post-sub-type" class="form-select" onchange="togglePostTypeFields(this.value)" required>
            <option value="post">General Post (Appears in Department)</option>
            <option value="poll">Interactive Poll (Appears in Main Board)</option>
            <option value="reel">Video Reel (Appears in Department / Main Board if >5 votes)</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Message / Details</label>
          <textarea id="post-content" class="form-input" style="height: 120px; resize: vertical;" placeholder="What's happening?" required></textarea>
        </div>

        <!-- File Upload + Image URL attachment for posts and reels -->
        ${renderImageAttachmentFields("Attachment Image (Optional)")}

        <!-- Dynamic Poll options -->
        <div id="poll-fields" style="display: none; border-left: 2px solid var(--color-pink); padding-left: 14px; margin-bottom: 18px;">
          <label class="form-label">Poll Choices</label>
          <div class="poll-inputs-container" id="poll-options-list">
            <div class="poll-input-row">
              <input type="text" class="form-input poll-option-val" placeholder="Choice 1" required disabled>
            </div>
            <div class="poll-input-row">
              <input type="text" class="form-input poll-option-val" placeholder="Choice 2" required disabled>
            </div>
          </div>
          <button type="button" class="btn-add-option" onclick="addPollOptionField()">+ Add Option</button>
        </div>

        <div class="form-group">
          <label class="form-label">Department Board</label>
          <select id="post-dept" class="form-select" disabled required>
            ${Object.entries(CampusDB.DEPARTMENTS).map(([code, name]) => `
              <option value="${code}" ${currentUser.dept === code ? "selected" : ""}>${code} - ${name}</option>
            `).join("")}
          </select>
          <span style="font-size: 11px; color: var(--color-text-secondary); margin-top: 4px; display: block;">Contributions are locked to your registered department board.</span>
        </div>
        ${currentUser.role === 'admin' ? `
        <div class="form-group">
          <label class="form-label">Target Page</label>
          <select id="post-target-page" class="form-select" required>
            <option value="both" selected>Both Main College & Department Pages</option>
            <option value="main">Main College Page Only</option>
            <option value="dept">Respective Department Page Only</option>
          </select>
        </div>
        ` : ''}

        <button type="submit" class="btn-primary">Post Now</button>
      </form>
    `;
  } else if (modalType === "peekaboo") {
    formHtml = `
      <form onsubmit="submitContributionForm(event)">
        <div class="form-group">
          <label class="form-label">Meme Caption / Words</label>
          <textarea id="post-content" class="form-input" style="height: 100px; resize: vertical;" placeholder="Type caption or thoughts..." required></textarea>
        </div>
        <!-- File Upload + Image URL for Peekaboo memes -->
        ${renderImageAttachmentFields("Meme Image (Optional)")}
        <button type="submit" class="btn-primary">Spill Meme Anonymously</button>
      </form>
    `;
  } else if (modalType === "gossip") {
    formHtml = `
      <form onsubmit="submitContributionForm(event)">
        <div class="form-group">
          <label class="form-label">Tea (Text sentence only)</label>
          <textarea id="post-content" class="form-input" style="height: 100px; resize: vertical;" placeholder="Type your rumor or gossip sentence..." required></textarea>
        </div>
        <button type="submit" class="btn-primary">Share Tea Anonymously</button>
      </form>
    `;
  } else if (modalType === "damage_reports") {
    formHtml = `
      <form onsubmit="submitContributionForm(event)">
        <div class="form-group">
          <label class="form-label">Damage Location & Description</label>
          <textarea id="post-content" class="form-input" style="height: 100px; resize: vertical;" placeholder="What is broken and where?" required></textarea>
        </div>
        <!-- File Upload + Image URL for damage reports -->
        ${renderImageAttachmentFields("Photo Attachment (Optional)")}
        <div class="form-group">
          <label class="form-label">Department Board</label>
          <select id="post-dept" class="form-select" disabled required>
            ${Object.entries(CampusDB.DEPARTMENTS).map(([code, name]) => `
              <option value="${code}" ${currentUser.dept === code ? "selected" : ""}>${code} - ${name}</option>
            `).join("")}
          </select>
        </div>
        <button type="submit" class="btn-primary">File Report</button>
      </form>
    `;
  } else if (modalType === "projects") {
    formHtml = `
      <form onsubmit="submitContributionForm(event)">
        <div class="form-group">
          <label class="form-label">Project Details & Description</label>
          <textarea id="post-content" class="form-input" style="height: 120px; resize: vertical;" placeholder="Explain your design, components, and prototype findings..." required></textarea>
        </div>
        <!-- Proactively allow students to attach project photos too! -->
        ${renderImageAttachmentFields("Prototype Image (Optional)")}
        <div class="form-group">
          <label class="form-label">Department Board</label>
          <select id="post-dept" class="form-select" disabled required>
            ${Object.entries(CampusDB.DEPARTMENTS).map(([code, name]) => `
              <option value="${code}" ${currentUser.dept === code ? "selected" : ""}>${code} - ${name}</option>
            `).join("")}
          </select>
        </div>
        <button type="submit" class="btn-primary">Publish Project</button>
      </form>
    `;
  } else if (modalType === "events") {
    formHtml = `
      <form onsubmit="submitContributionForm(event)">
        <div class="form-group">
          <label class="form-label">Event Agenda & Poster Details</label>
          <textarea id="post-content" class="form-input" style="height: 120px; resize: vertical;" placeholder="Enter event name, dates, timings, criteria, and prize pools..." required></textarea>
        </div>
        <!-- File Upload + Image URL for event flyers -->
        ${renderImageAttachmentFields("Poster Image (Optional)")}
        <div class="form-group">
          <label class="form-label">Department Board</label>
          <select id="post-dept" class="form-select" disabled required>
            ${Object.entries(CampusDB.DEPARTMENTS).map(([code, name]) => `
              <option value="${code}" ${currentUser.dept === code ? "selected" : ""}>${code} - ${name}</option>
            `).join("")}
          </select>
        </div>
        ${currentUser.role === 'admin' ? `
        <div class="form-group">
          <label class="form-label">Target Page</label>
          <select id="post-target-page" class="form-select" required>
            <option value="both" selected>Both Main College & Department Pages</option>
            <option value="main">Main College Page Only</option>
            <option value="dept">Respective Department Page Only</option>
          </select>
        </div>
        ` : ''}
        <button type="submit" class="btn-primary">Post Event flyer</button>
      </form>
    `;
  } else if (modalType === "feedback") {
    formHtml = `
      <form onsubmit="submitContributionForm(event)">
        <div class="form-group">
          <label class="form-label">Faculty Feedback Subject / Link</label>
          <textarea id="post-content" class="form-input" style="height: 100px; resize: vertical;" placeholder="Provide feedback description, guidelines or external form link..." required></textarea>
        </div>
        ${currentUser.role === 'admin' ? `
        <div class="form-group">
          <label class="form-label">Target Page</label>
          <select id="post-target-page" class="form-select" required>
            <option value="both" selected>Both Main College & Department Pages</option>
            <option value="main">Main College Page Only</option>
            <option value="dept">Respective Department Page Only</option>
          </select>
        </div>
        ` : ''}
        <button type="submit" class="btn-primary">Publish Feedback Form</button>
      </form>
    `;
  } else if (modalType === "notification") {
    formHtml = `
      <form onsubmit="submitContributionForm(event)">
        <div class="form-group">
          <label class="form-label">Bulletin Details</label>
          <textarea id="post-content" class="form-input" style="height: 120px; resize: vertical;" placeholder="Type official notice details..." required></textarea>
        </div>
        ${currentUser.role === 'admin' ? `
        <div class="form-group">
          <label class="form-label">Target Page</label>
          <select id="post-target-page" class="form-select" required>
            <option value="both" selected>Both Main College & Department Pages</option>
            <option value="main">Main College Page Only</option>
            <option value="dept">Respective Department Page Only</option>
          </select>
        </div>
        ` : ''}
        <button type="submit" class="btn-primary">Broadcast Notice</button>
      </form>
    `;
  }

  body.innerHTML = formHtml;
  overlay.classList.add("active");
}

window.togglePostTypeFields = function(value) {
  const pollBlock = document.getElementById("poll-fields");
  const optionInputs = document.querySelectorAll(".poll-option-val");
  const imgLabel = document.getElementById("image-url-label");
  const uploadGroup = document.getElementById("image-upload-group");
  
  if (value === "poll") {
    if (pollBlock) pollBlock.style.display = "block";
    if (uploadGroup) uploadGroup.style.display = "none";
    optionInputs.forEach(i => i.disabled = false);
  } else {
    if (pollBlock) pollBlock.style.display = "none";
    if (uploadGroup) uploadGroup.style.display = "block";
    optionInputs.forEach(i => i.disabled = true);
    
    if (value === "reel") {
      if (imgLabel) imgLabel.innerText = "Reel Cover Image (Optional)";
    } else {
      if (imgLabel) imgLabel.innerText = "Attachment Image (Optional)";
    }
  }
};

window.addPollOptionField = function() {
  const list = document.getElementById("poll-options-list");
  if (list.children.length >= 6) {
    alert("Maximum of 6 choices are allowed in a poll!");
    return;
  }
  
  pollOptionsCount++;
  const div = document.createElement("div");
  div.className = "poll-input-row";
  div.id = `poll-opt-row-${pollOptionsCount}`;
  div.innerHTML = `
    <input type="text" class="form-input poll-option-val" placeholder="Choice ${pollOptionsCount}" required>
    <button type="button" class="btn-remove-option" onclick="removePollOptionField(${pollOptionsCount})">×</button>
  `;
  list.appendChild(div);
};

window.removePollOptionField = function(id) {
  const row = document.getElementById(`poll-opt-row-${id}`);
  if (row) {
    row.remove();
  }
};

window.submitContributionForm = function(event) {
  event.preventDefault();
  
  let type = modalType;
  const content = document.getElementById("post-content").value.trim();
  
  // Image handling
  const base64Input = document.getElementById("post-image-base64");
  const urlInput = document.getElementById("post-image");
  let image = null;
  if (base64Input && base64Input.value) {
    image = base64Input.value;
  } else if (urlInput && urlInput.value.trim()) {
    image = urlInput.value.trim();
  }

  const deptSelect = document.getElementById("post-dept");
  const department = deptSelect ? deptSelect.value : (currentUser ? currentUser.dept : 'BS');

  let options = null;

  // Handle nested category switches on general post form
  if (modalType === "post") {
    const subTypeSelect = document.getElementById("post-sub-type");
    if (subTypeSelect) {
      type = subTypeSelect.value;
      if (type === "poll") {
        const optionNodes = document.querySelectorAll(".poll-option-val");
        options = Array.from(optionNodes).map(input => input.value.trim()).filter(val => val !== "");
        if (options.length < 2) {
          alert("A poll requires at least 2 choices!");
          return;
        }
      }
    }
  }

  const targetSelect = document.getElementById("post-target-page");
  const targetPage = targetSelect ? targetSelect.value : "both";

  // Create post
  const result = CampusDB.addContribution(type, department, content, options, image, currentUser, null, targetPage);
  
  if (result.success) {
    closeModal();
    renderApp();
  } else {
    alert(result.message);
  }
};

// Admin Damage reports portal rendering
function renderAdminDamagePortal() {
  if (currentUser.role !== "admin") {
    return `<div class="card" style="text-align: center; padding: 40px;">Unauthorized access!</div>`;
  }
  
  const posts = CampusDB.getPosts().filter(p => p.type === "damage" && p.department === currentUser.dept && p.status === "active");

  return `
    <div style="margin-bottom: 24px;">
      <p style="font-size: 14px; color: var(--color-text-secondary);">
        Admin Portal for resolving broken facility reports submitted to the <strong>${CampusDB.DEPARTMENTS[currentUser.dept]}</strong> department. Changing status will immediately reflect in the public feeds.
      </p>
    </div>
    
    ${posts.length === 0 ? `
      <div class="card" style="text-align: center; padding: 40px; color: var(--color-text-secondary);">
        <span style="font-size: 40px; display: block; margin-bottom: 16px;">🎉</span>
        No damage reports filed in your department! Excellent!
      </div>
    ` : `
      <div class="table-container" style="animation: slideIn 0.3s ease-out;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Photo</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${posts.map(post => {
              const statusText = post.damageStatus ? post.damageStatus.toUpperCase() : "PENDING";
              const buttonText = post.damageStatus === "fixed" ? "⏳ Set Pending" : "✅ Mark Fixed";
              const newStatus = post.damageStatus === "fixed" ? "pending" : "fixed";

              return `
                <tr>
                  <td>${formatTime(post.timestamp)}</td>
                  <td style="max-width: 300px; line-height: 1.4;">${post.content}</td>
                  <td>
                    ${post.image ? `<a href="${post.image}" target="_blank" style="color: var(--color-blue); font-weight: 600;">View Photo</a>` : '<span style="color: var(--color-text-secondary);">None</span>'}
                  </td>
                  <td>
                    <span class="card-badge badge-tag-${post.damageStatus === 'fixed' ? 'event' : 'poll'}" style="padding: 4px 10px; border-radius: 20px; font-weight: 700; font-size: 11px;">
                      ${statusText}
                    </span>
                  </td>
                  <td>
                    <button class="btn-tab-action" style="padding: 6px 12px; font-size: 12px; ${post.damageStatus === 'fixed' ? 'background: var(--color-grey-light);' : 'background: var(--color-pink); color: var(--color-white);'}" onclick="changeDamageStatus('${post.id}', '${newStatus}')">
                      ${buttonText}
                    </button>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `}
  `;
}

window.changeDamageStatus = function(postId, newStatus) {
  const result = CampusDB.updateDamageStatus(postId, newStatus, currentUser);
  if (result.success) {
    renderApp();
  } else {
    alert(result.message);
  }
};
