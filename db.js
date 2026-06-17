// db.js - Local Database Layer using LocalStorage for campusCapsule

const RECOVERY_KEY = "threethugsrobworldbank";

const DEPARTMENTS = {
  BS: "Basic Sciences",
  CS: "CSE",
  CD: "CSDS",
  CI: "CI",
  EC: "ECE",
  IS: "ISE",
  AE: "AE"
};

// Pre-seeded Admins configuration
const PRESEEDED_ADMINS = [
  { usn: "admin_BS", name: "Basic Sciences Admin", dept: "BS", password: "gcembs006", role: "admin" },
  { usn: "admin_CSE", name: "CSE Admin", dept: "CS", password: "gcemcse001", role: "admin" },
  { usn: "admin_CSDS", name: "CSDS Admin", dept: "CD", password: "gcemcsds001", role: "admin" },
  { usn: "admin_AIML", name: "AIML Admin", dept: "CI", password: "gcemaiml001", role: "admin" },
  { usn: "admin_ECE", name: "ECE Admin", dept: "EC", password: "gcemece002", role: "admin" },
  { usn: "admin_ISE", name: "ISE Admin", dept: "IS", password: "gcemise003", role: "admin" },
  { usn: "admin_AE", name: "Aero Admin", dept: "AE", password: "gcemae005", role: "admin" }
];

// Initialize DB
function initDB() {
  let users = getUsers();
  
  // Filter out any mock student registrations to start with a clean slate
  users = users.filter(u => u.role === "admin");
  
  // For each preseeded admin, check if they are already in the database.
  const admins = PRESEEDED_ADMINS.map(seededAdmin => {
    const existingAdmin = users.find(u => u.dept.toUpperCase() === seededAdmin.dept.toUpperCase() && u.role === "admin");
    if (existingAdmin) {
      existingAdmin.usn = seededAdmin.usn;
      // If the password starts with 1GD (old default), update to the new default
      if (existingAdmin.password.startsWith("1GD")) {
        existingAdmin.password = seededAdmin.password;
      }
      return existingAdmin;
    }
    return seededAdmin;
  });
  
  saveUsers(admins);

  // Clear any existing dummy posts (post_1 through post_8) to wipe out sample activity
  let posts = [];
  try {
    const data = localStorage.getItem("campus_posts");
    if (data) {
      posts = JSON.parse(data);
    }
  } catch (e) {}
  
  const dummyIds = ["post_1", "post_2", "post_3", "post_4", "post_5", "post_6", "post_7", "post_8"];
  posts = posts.filter(p => !dummyIds.includes(p.id));
  localStorage.setItem("campus_posts", JSON.stringify(posts));
}

// Read database
function getUsers() {
  try {
    const data = localStorage.getItem("campus_users");
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem("campus_users", JSON.stringify(users));
}

// Read posts
function getPosts() {
  try {
    const data = localStorage.getItem("campus_posts");
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function savePosts(posts) {
  localStorage.setItem("campus_posts", JSON.stringify(posts));
}

// User Actions
function registerStudent(name, usn, password, dept, maskName) {
  const users = getUsers();
  
  // Enforce unique USN
  if (users.some(u => u.usn.toLowerCase() === usn.toLowerCase())) {
    return { success: false, message: "A user with this USN already exists!" };
  }

  // Enforce unique Mask Name
  if (users.some(u => u.maskName && u.maskName.toLowerCase() === maskName.toLowerCase())) {
    return { success: false, message: "This Mask Name is already taken! Choose another mystery name." };
  }

  const newStudent = {
    name,
    usn: usn.toUpperCase(),
    password,
    dept,
    maskName,
    role: "student",
    uploads: {
      posts: 0,
      peekaboo: 0,
      damage: 0,
      events: 0,
      projects: 0,
      gossip: 0
    }
  };

  users.push(newStudent);
  saveUsers(users);
  return { success: true, user: newStudent };
}

function loginUser(usn, password) {
  const users = getUsers();
  const cleanUsn = usn.trim().toUpperCase().replace(/[-_]ADMIN$/, "").replace(/^ADMIN[-_]/, "");
  
  const user = users.find(u => {
    const dbUsn = u.usn.toUpperCase().replace(/[-_]ADMIN$/, "").replace(/^ADMIN[-_]/, "");
    if (u.role === "admin") {
      // Allow matching department abbreviations
      return (dbUsn === cleanUsn || 
              (dbUsn === "CS" && cleanUsn === "CSE") ||
              (dbUsn === "CD" && cleanUsn === "CSDS") ||
              (dbUsn === "CI" && cleanUsn === "AIML") ||
              (dbUsn === "IS" && cleanUsn === "ISE") ||
              (dbUsn === "EC" && cleanUsn === "ECE") ||
              (dbUsn === "AE" && cleanUsn === "AERO") ||
              u.usn.toUpperCase() === usn.trim().toUpperCase());
    }
    return u.usn.toUpperCase() === usn.trim().toUpperCase();
  });

  if (user) {
    if (user.password === password) {
      return { success: true, user };
    }
  }
  return { success: false, message: "Invalid USN/Admin ID or Password!" };
}

function resetPassword(usn, recoveryKey, newPassword) {
  if (recoveryKey !== RECOVERY_KEY) {
    return { success: false, message: "Incorrect Recovery Key!" };
  }

  const users = getUsers();
  const cleanUsn = usn.trim().toUpperCase();
  
  const userIndex = users.findIndex(u => {
    const dbUsn = u.usn.toUpperCase();
    if (u.role === "admin") {
      const cleanUsnNoPrefix = cleanUsn.replace("ADMIN_", "");
      const dbUsnNoPrefix = dbUsn.replace("ADMIN_", "");
      return (dbUsn === cleanUsn || 
              dbUsnNoPrefix === cleanUsn ||
              dbUsn === `ADMIN_${cleanUsn}` ||
              (dbUsnNoPrefix === "CS" && cleanUsnNoPrefix === "CSE") ||
              (dbUsnNoPrefix === "CD" && cleanUsnNoPrefix === "CSDS") ||
              (dbUsnNoPrefix === "CI" && cleanUsnNoPrefix === "AIML") ||
              (dbUsnNoPrefix === "IS" && cleanUsnNoPrefix === "ISE") ||
              (dbUsnNoPrefix === "EC" && cleanUsnNoPrefix === "ECE") ||
              (dbUsnNoPrefix === "AE" && cleanUsnNoPrefix === "AERO"));
    }
    return dbUsn === cleanUsn;
  });

  if (userIndex === -1) {
    return { success: false, message: "USN/Admin ID not found in the records!" };
  }

  users[userIndex].password = newPassword;
  saveUsers(users);
  return { success: true, message: "Password updated successfully!" };
}

// Get student contributions count helper
function getStudentContributionCount(usn, section) {
  const posts = getPosts();
  return posts.filter(p => p.authorUsn === usn && p.type === section && p.status === "active").length;
}

// Add Contributions
function addContribution(type, department, content, options = null, image = null, user, maskNameLogin = null, targetPage = "both") {
  const posts = getPosts();

  // Validate student post limits (max 3 per section)
  if (user.role === "student") {
    const currentCount = getStudentContributionCount(user.usn, type);
    if (currentCount >= 3) {
      return { success: false, message: `You have reached the limit of 3 posts in the ${type} section!` };
    }
  }

  // Enforce department alignment for students
  let postDept = department;
  if (user.role === "student") {
    postDept = user.dept; // Force student posts to their registered department
  }

  const newPost = {
    id: "post_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    type,
    department: postDept,
    content,
    targetPage: targetPage || "both",
    votes: 0,
    dislikes: 0, // For peekaboo / gossip
    votedUsers: {},
    timestamp: new Date().toISOString(),
    status: "active"
  };

  if (type === "damage") {
    newPost.damageStatus = "pending";
  }

  if (user.role === "admin") {
    const deptName = user.dept === "CS" ? "CSE" : user.dept === "CD" ? "CSDS" : user.dept === "CI" ? "CI" : user.dept === "EC" ? "ECE" : user.dept === "IS" ? "ISE" : user.dept === "AE" ? "AE" : user.dept;
    newPost.authorName = `${deptName}-admin`;
    newPost.authorUsn = user.usn;
  } else {
    // Student posting
    newPost.authorUsn = user.usn;
    if (type === "peekaboo" || type === "gossip") {
      newPost.authorName = "Anonymous";
      newPost.authorMask = maskNameLogin || user.maskName;
    } else {
      newPost.authorName = user.name;
    }
  }

  if (type === "poll" && options) {
    newPost.options = options;
    newPost.pollVotes = {};
    options.forEach((_, idx) => {
      newPost.pollVotes[idx] = 0;
    });
    newPost.userPollVotes = {};
  }

  if (image) {
    newPost.image = image;
  }

  posts.unshift(newPost);
  savePosts(posts);
  return { success: true, post: newPost };
}

// Vote Actions (Up arrow / Down arrow)
function voteContribution(postId, usn, direction) {
  const posts = getPosts();
  const post = posts.find(p => p.id === postId);
  if (!post) return { success: false, message: "Post not found!" };

  if (!post.votedUsers) post.votedUsers = {};

  const currentVote = post.votedUsers[usn];

  if (post.type === "peekaboo") {
    // For Peekaboo: 💣 (like) and 🙄 (dislike)
    if (direction === "up") { // Bomb (Like)
      if (currentVote === "up") {
        // Undo like
        post.votes = Math.max(0, (post.votes || 0) - 1);
        delete post.votedUsers[usn];
      } else {
        if (currentVote === "down") {
          // Change dislike to like
          post.dislikes = Math.max(0, (post.dislikes || 0) - 1);
        }
        post.votes = (post.votes || 0) + 1;
        post.votedUsers[usn] = "up";
      }
    } else { // Eye-roll (Dislike)
      if (currentVote === "down") {
        // Undo dislike
        post.dislikes = Math.max(0, (post.dislikes || 0) - 1);
        delete post.votedUsers[usn];
      } else {
        if (currentVote === "up") {
          // Change like to dislike
          post.votes = Math.max(0, (post.votes || 0) - 1);
        }
        post.dislikes = (post.dislikes || 0) + 1;
        post.votedUsers[usn] = "down";
      }
    }
  } else {
    // Standard upvote/downvote
    if (direction === "up") {
      if (currentVote === "up") {
        post.votes -= 1;
        delete post.votedUsers[usn];
      } else {
        if (currentVote === "down") {
          post.votes += 2;
        } else {
          post.votes += 1;
        }
        post.votedUsers[usn] = "up";
      }
    } else {
      if (currentVote === "down") {
        post.votes += 1;
        delete post.votedUsers[usn];
      } else {
        if (currentVote === "up") {
          post.votes -= 2;
        } else {
          post.votes -= 1;
        }
        post.votedUsers[usn] = "down";
      }
    }
  }

  savePosts(posts);
  return { success: true, post };
}

// Poll voting
function votePollOption(postId, usn, optionIndex) {
  const posts = getPosts();
  const post = posts.find(p => p.id === postId);
  if (!post || post.type !== "poll") return { success: false, message: "Poll not found!" };

  if (!post.userPollVotes) post.userPollVotes = {};
  if (!post.pollVotes) post.pollVotes = {};

  const previousVote = post.userPollVotes[usn];
  if (previousVote !== undefined) {
    // Decrement previous choice
    post.pollVotes[previousVote] = Math.max(0, (post.pollVotes[previousVote] || 0) - 1);
  }

  // Increment new choice
  post.pollVotes[optionIndex] = (post.pollVotes[optionIndex] || 0) + 1;
  post.userPollVotes[usn] = optionIndex;

  savePosts(posts);
  return { success: true, post };
}

// Moderation
function deleteContribution(postId, adminUser) {
  if (adminUser.role !== "admin") {
    return { success: false, message: "Unauthorized action!" };
  }

  const posts = getPosts();
  const postIndex = posts.findIndex(p => p.id === postId);
  if (postIndex === -1) return { success: false, message: "Post not found!" };

  const post = posts[postIndex];
  
  // Respective department check: Admin can moderate posts in their department
  // If it's a peekaboo/gossip post, or an admin-posted global post, it might not map directly, 
  // but let's allow admins to moderate student posts originating from their department.
  if (post.department !== adminUser.dept) {
    return { success: false, message: `As a ${adminUser.dept} Admin, you can only delete posts within your department!` };
  }

  post.status = "deleted";
  savePosts(posts);
  return { success: true, message: "Post deleted successfully!" };
}

// Aggregation Queries

// Get Superpage Feed (Main College Page)
function getSuperpageFeed() {
  const posts = getPosts().filter(p => p.status === "active");
  return posts.filter(p => {
    // If it's an admin post and specifically targeted only to department
    if (p.authorUsn && (p.authorUsn.endsWith("-admin") || p.authorUsn.startsWith("admin_") || p.authorUsn.includes("admin"))) {
      if (p.targetPage === "dept") return false;
    }
    
    // 1. All college updates, polls, fests posters, and damage reports (visible on main page)
    if (["update", "poll", "damage", "fest", "notification", "feedback"].includes(p.type)) {
      return true;
    }
    // 2. Projects only appear if they have > 10 uparrows in the department page
    if (p.type === "project" && p.votes > 10) {
      return true;
    }
    // 3. Events only appear if they have > 15 uparrows (shows student USN on main page)
    if (p.type === "event" && p.votes > 15) {
      return true;
    }
    // 4. Reels only appear if they have > 5 uparrows
    if (p.type === "reel" && p.votes > 5) {
      return true;
    }
    return false;
  }).sort((a, b) => b.votes - a.votes); // Sort by vote counts (appear on top)
}

// Get HOT-ears Feed (Trending subsection of the Superpage)
function getHOTearsFeed() {
  const posts = getPosts().filter(p => p.status === "active");
  // Trending contains any content across categories that has > 5 uparrows (reels, projects, damage, events, posts)
  return posts.filter(p => p.votes >= 5).sort((a, b) => b.votes - a.votes);
}

// Get Department Feed
function getDepartmentFeed(dept) {
  const posts = getPosts().filter(p => p.status === "active");
  return posts.filter(p => p.department === dept && !["peekaboo", "gossip"].includes(p.type));
}

// Get Anonymous Feeds (Peekaboo & Gossip)
function getAnonFeed(type) {
  const posts = getPosts().filter(p => p.status === "active");
  return posts.filter(p => p.type === type).sort((a, b) => b.votes - a.votes);
}

// Update damage status (admin only)
function updateDamageStatus(postId, newStatus, adminUser) {
  if (adminUser.role !== "admin") {
    return { success: false, message: "Unauthorized action!" };
  }
  const posts = getPosts();
  const post = posts.find(p => p.id === postId);
  if (!post) return { success: false, message: "Post not found!" };
  if (post.department !== adminUser.dept) {
    return { success: false, message: "Unauthorized! You can only manage damage reports for your own department." };
  }
  post.damageStatus = newStatus;
  savePosts(posts);
  return { success: true, post };
}

// Export functions to global scope
window.CampusDB = {
  DEPARTMENTS,
  RECOVERY_KEY,
  initDB,
  getUsers,
  getPosts,
  registerStudent,
  loginUser,
  resetPassword,
  addContribution,
  voteContribution,
  votePollOption,
  deleteContribution,
  getSuperpageFeed,
  getHOTearsFeed,
  getDepartmentFeed,
  getAnonFeed,
  getStudentContributionCount,
  updateDamageStatus
};
