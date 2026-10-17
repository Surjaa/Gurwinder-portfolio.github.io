/* =========================================================
   Blogging Platform — dashboard (v2)

   Two storage back ends share one interface:
   - Firebase  (real accounts + Firestore) when firebase-config.js is filled in
   - Local     (this browser's localStorage) otherwise
   Old data from the first version of the app is upgraded automatically
   in Local mode and can be moved to Firebase with Profile > Import.
   ========================================================= */
(() => {
  "use strict";

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

  const QUOTA_MSG = "Browser storage is full. Remove some cover images or export a backup.";

  const store = {
    get(key, fallback) {
      try {
        const v = JSON.parse(localStorage.getItem(key));
        return v ?? fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch {}
    },
  };

  const ICONS = {
    overview: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    posts: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>',
    feed: '<path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1.2"/>',
    write: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
    heart: '<path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 21.5l8.8-8.8a5 5 0 0 0 0-7.1z"/>',
    comment: '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z"/>',
    moon: '<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    logout: '<path d="M9 21H5V3h4M16 17l5-5-5-5M21 12H9"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    upload: '<path d="M12 15V3M7 8l5-5 5 5M4 21h16"/>',
  };
  const icon = (name, size = 20) =>
    `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;

  const fmtDate = (ts) =>
    new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

  function timeAgo(ts) {
    const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
    if (s < 60) return "just now";
    const m = Math.round(s / 60);
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} hr ago`;
    const d = Math.round(h / 24);
    if (d < 30) return `${d} day${d > 1 ? "s" : ""} ago`;
    return fmtDate(ts);
  }

  const dayKey = (ts) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const wordCount = (t) => (String(t).trim().match(/\S+/g) || []).length;
  const readMins = (t) => Math.max(1, Math.ceil(wordCount(t) / 200));
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + "s"}`;

  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  /* ---------- tiny markdown (safe: escapes first) ---------- */
  function md(src) {
    const lines = esc(src).split(/\r?\n/);
    const out = [];
    let list = null;
    let para = [];
    const inline = (t) =>
      t
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
        .replace(
          /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
          '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
        );
    const flushP = () => {
      if (para.length) {
        out.push("<p>" + para.map(inline).join("<br>") + "</p>");
        para = [];
      }
    };
    const flushL = () => {
      if (list) {
        out.push("<ul>" + list.map((i) => "<li>" + inline(i) + "</li>").join("") + "</ul>");
        list = null;
      }
    };
    for (const raw of lines) {
      const l = raw.trimEnd();
      let m;
      if (!l.trim()) {
        flushP();
        flushL();
      } else if ((m = l.match(/^(#{1,3})\s+(.*)$/))) {
        flushP();
        flushL();
        const n = m[1].length + 1;
        out.push(`<h${n}>${inline(m[2])}</h${n}>`);
      } else if ((m = l.match(/^[-*]\s+(.*)$/))) {
        flushP();
        (list = list || []).push(m[1]);
      } else if ((m = l.match(/^&gt;\s?(.*)$/))) {
        flushP();
        flushL();
        out.push(`<blockquote>${inline(m[1])}</blockquote>`);
      } else {
        flushL();
        para.push(l);
      }
    }
    flushP();
    flushL();
    return out.join("");
  }

  /* ---------- password hashing (Local mode only) ---------- */
  function cyrb53(str) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  }
  async function hashPw(pw, salt) {
    const text = `${salt}:${pw}`;
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    return "w" + cyrb53(text);
  }
  function newSalt() {
    if (window.crypto && crypto.getRandomValues) {
      return [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    return String(Math.random()).slice(2);
  }
  async function verifyPw(rec, pw) {
    if (rec.password !== undefined) return rec.password === pw; // legacy plain-text account
    return (await hashPw(pw, rec.salt)) === rec.passHash;
  }

  /* ---------- post model ---------- */
  function normalizePost(p) {
    const id = p.id || Date.now();
    return {
      id,
      author: p.author || "Unknown",
      ownerId: p.ownerId || (p.ownerEmail ? String(p.ownerEmail).toLowerCase() : null),
      title: p.title || "Untitled",
      description: p.description || "",
      content: p.content || "",
      tags: (Array.isArray(p.tags) ? p.tags : []).map((t) => String(t).trim()).filter(Boolean),
      imageUrl: p.imageUrl || "",
      status: p.status === "draft" ? "draft" : "published",
      createdAt: p.createdAt || id,
      updatedAt: p.updatedAt || p.createdAt || id,
      likes: Array.isArray(p.likes) ? p.likes : [],
      comments: (Array.isArray(p.comments) ? p.comments : []).map((c, i) =>
        typeof c === "string" ? { id: `${id}-${i}`, author: "Reader", text: c, at: Number(id) || Date.now() } : c
      ),
    };
  }

  /* =========================================================
     BACK ENDS
     Interface: mode, start(onUser), signup, login, logout,
       resetPassword, updateProfile, changePassword,
       watchPosts(user, cb) -> unsubscribe,
       createPost, updatePost, deletePost,
       addComment, removeComment, setLike
     ========================================================= */
  const cfg = window.BP_FIREBASE_CONFIG || {};
  const useFirebase =
    !!cfg.apiKey && !/^YOUR_/.test(cfg.apiKey) && !!cfg.projectId && !/^YOUR_/.test(cfg.projectId);

  /* ----- Local back end ----- */
  function createLocalBackend() {
    const users = store.get("users", []);
    const localPosts = store.get("posts", []).map(normalizePost);
    let notifyUser = () => {};
    let postCb = null;
    let current = null; // user record

    const persistUsers = () => {
      if (!store.set("users", users)) throw new Error(QUOTA_MSG);
    };
    const persistPosts = () => {
      if (!store.set("posts", localPosts)) throw new Error(QUOTA_MSG);
    };
    const emit = () => postCb && postCb(localPosts);
    const toUser = (u) => ({ id: u.email.toLowerCase(), name: u.name, email: u.email });
    const find = (email) => users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
    const byId = (id) => localPosts.find((p) => String(p.id) === String(id));
    const begin = (rec) => {
      current = rec;
      store.set("loggedInUser", { name: rec.name, email: rec.email });
      notifyUser(toUser(rec));
    };

    return {
      mode: "local",

      start(cb) {
        notifyUser = cb;
        const session = store.get("loggedInUser", null);
        const rec = session && session.email ? find(session.email) : null;
        if (!rec) store.remove("loggedInUser");
        current = rec || null;
        cb(rec ? toUser(rec) : null);
      },

      async seed(makeSeed) {
        if (users.length || localPosts.length) return;
        const d = makeSeed(Date.now());
        const salt = newSalt();
        users.push({ name: d.user.name, email: d.user.email, salt, passHash: await hashPw(d.user.password, salt) });
        d.posts.forEach((p) => localPosts.push(normalizePost(p)));
        persistUsers();
        persistPosts();
      },

      async signup(name, email, pw) {
        if (find(email)) throw new Error("An account with this email already exists. Log in instead.");
        const salt = newSalt();
        const rec = { name, email, salt, passHash: await hashPw(pw, salt) };
        users.push(rec);
        try {
          persistUsers();
        } catch (e) {
          users.pop();
          throw e;
        }
        begin(rec);
      },

      async login(email, pw) {
        const rec = find(email);
        if (!rec || !(await verifyPw(rec, pw))) throw new Error("Email or password is incorrect.");
        if (rec.password !== undefined) {
          // upgrade legacy plain-text password to a salted hash
          rec.salt = newSalt();
          rec.passHash = await hashPw(pw, rec.salt);
          delete rec.password;
          persistUsers();
        }
        begin(rec);
      },

      async logout() {
        current = null;
        store.remove("loggedInUser");
        notifyUser(null);
      },

      async resetPassword() {
        throw new Error("Password reset needs cloud accounts. Connect Firebase to enable it.");
      },

      async updateProfile(name, email) {
        const clash = users.find((u) => u !== current && u.email.toLowerCase() === email.toLowerCase());
        if (clash) throw new Error("Another account already uses that email.");
        const oldId = current.email.toLowerCase();
        const oldName = current.name;
        const newId = email.toLowerCase();
        localPosts.forEach((p) => {
          const mine = p.ownerId ? p.ownerId === oldId : p.author.trim().toLowerCase() === oldName.trim().toLowerCase();
          if (mine) {
            p.ownerId = newId;
            p.author = name;
          }
          p.likes = p.likes.map((e) => (e === oldId ? newId : e));
          p.comments.forEach((c) => {
            if (c.authorId ? c.authorId === oldId : c.author === oldName) {
              c.author = name;
              if (c.authorId) c.authorId = newId;
            }
          });
        });
        current.name = name;
        current.email = email;
        persistUsers();
        persistPosts();
        begin(current);
      },

      async changePassword(oldPw, newPw) {
        if (!(await verifyPw(current, oldPw))) throw new Error("Your current password is incorrect.");
        current.salt = newSalt();
        current.passHash = await hashPw(newPw, current.salt);
        delete current.password;
        persistUsers();
      },

      watchPosts(_user, cb) {
        postCb = cb;
        cb(localPosts);
        return () => {
          postCb = null;
        };
      },

      async createPost(p) {
        let id = p.id || Date.now();
        while (localPosts.some((x) => String(x.id) === String(id))) id = Number(id) + 1;
        const post = normalizePost({ ...p, id });
        localPosts.push(post);
        try {
          persistPosts();
        } catch (e) {
          localPosts.pop();
          throw e;
        }
        emit();
        return id;
      },

      async updatePost(id, fields) {
        const p = byId(id);
        if (!p) throw new Error("That post no longer exists.");
        Object.assign(p, fields);
        persistPosts();
        emit();
      },

      async deletePost(id) {
        const i = localPosts.findIndex((p) => String(p.id) === String(id));
        if (i >= 0) localPosts.splice(i, 1);
        persistPosts();
        emit();
      },

      async addComment(id, c) {
        const p = byId(id);
        if (!p) throw new Error("That post no longer exists.");
        p.comments.push(c);
        persistPosts();
        emit();
      },

      async removeComment(id, commentId) {
        const p = byId(id);
        if (!p) return;
        p.comments = p.comments.filter((c) => String(c.id) !== String(commentId));
        persistPosts();
        emit();
      },

      async setLike(id, uid, on) {
        const p = byId(id);
        if (!p) return;
        const i = p.likes.indexOf(uid);
        if (on && i < 0) p.likes.push(uid);
        if (!on && i >= 0) p.likes.splice(i, 1);
        persistPosts();
        emit();
      },
    };
  }

  /* ----- Firebase back end ----- */
  const FB_VERSION = "10.12.5";
  const FB_SDK = ["app", "auth", "firestore"].map(
    (n) => `https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-${n}-compat.js`
  );

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error("Could not load the Firebase SDK. Check your connection and reload."));
      document.head.appendChild(s);
    });
  }

  function friendly(e) {
    const code = (e && e.code) || "";
    const map = {
      "auth/invalid-credential": "Email or password is incorrect.",
      "auth/invalid-login-credentials": "Email or password is incorrect.",
      "auth/wrong-password": "Email or password is incorrect.",
      "auth/user-not-found": "Email or password is incorrect.",
      "auth/email-already-in-use": "An account with this email already exists. Log in instead.",
      "auth/weak-password": "Use a stronger password (at least 8 characters).",
      "auth/invalid-email": "Enter a valid email address.",
      "auth/too-many-requests": "Too many attempts. Wait a minute and try again.",
      "auth/network-request-failed": "Network error. Check your connection and try again.",
      "auth/requires-recent-login": "For safety, log out and log back in, then try again.",
      "auth/operation-not-allowed": "Email/password sign-in is not enabled in your Firebase project.",
      "auth/unauthorized-domain": "This domain is not in your Firebase Authorized domains list.",
      "permission-denied": "You do not have permission to do that. Check your Firestore rules.",
      unavailable: "The service is unreachable right now. Try again shortly.",
    };
    return map[code] || (e && e.message) || "Something went wrong. Try again.";
  }

  async function createFirebaseBackend() {
    if (!window.firebase) {
      for (const src of FB_SDK) await loadScript(src); // sequential: app must load first
    }
    firebase.initializeApp(cfg);
    const auth = firebase.auth();
    const db = firebase.firestore();
    const FV = firebase.firestore.FieldValue;
    const col = db.collection("posts");
    let notify = () => {};

    const toUser = (u) =>
      u ? { id: u.uid, name: u.displayName || (u.email || "Writer").split("@")[0], email: u.email } : null;
    const wrap = async (fn) => {
      try {
        return await fn();
      } catch (e) {
        throw new Error(friendly(e));
      }
    };

    return {
      mode: "firebase",

      start(cb) {
        notify = cb;
        auth.onAuthStateChanged((u) => cb(toUser(u)));
      },

      signup: (name, email, pw) =>
        wrap(async () => {
          const cred = await auth.createUserWithEmailAndPassword(email, pw);
          await cred.user.updateProfile({ displayName: name });
          notify(toUser(auth.currentUser)); // refresh so the new name shows immediately
        }),

      login: (email, pw) => wrap(() => auth.signInWithEmailAndPassword(email, pw)),
      logout: () => wrap(() => auth.signOut()),
      resetPassword: (email) => wrap(() => auth.sendPasswordResetEmail(email)),

      updateProfile: (name) =>
        wrap(async () => {
          const u = auth.currentUser;
          await u.updateProfile({ displayName: name });
          const snap = await col.where("ownerId", "==", u.uid).get();
          const batch = db.batch();
          snap.forEach((d) => batch.update(d.ref, { author: name }));
          if (!snap.empty) await batch.commit();
          notify(toUser(auth.currentUser));
        }),

      changePassword: (oldPw, newPw) =>
        wrap(async () => {
          const u = auth.currentUser;
          const cred = firebase.auth.EmailAuthProvider.credential(u.email, oldPw);
          try {
            await u.reauthenticateWithCredential(cred);
          } catch (e) {
            if (/auth\/(wrong-password|invalid-credential|invalid-login-credentials)/.test(e.code || "")) {
              throw new Error("Your current password is incorrect.");
            }
            throw e;
          }
          await u.updatePassword(newPw);
        }),

      watchPosts(u, cb) {
        let pub = new Map();
        let mine = new Map();
        let r1 = false;
        let r2 = false;
        const emit = () => {
          if (!(r1 && r2)) return;
          cb([...new Map([...pub, ...mine]).values()]);
        };
        const toMap = (s) => new Map(s.docs.map((d) => [d.id, { ...d.data(), id: d.id }]));
        const onErr = (e) => {
          toast(friendly(e), "error");
          r1 = r2 = true;
          emit();
        };
        const un1 = col.where("status", "==", "published").onSnapshot((s) => {
          pub = toMap(s);
          r1 = true;
          emit();
        }, onErr);
        const un2 = col.where("ownerId", "==", u.id).onSnapshot((s) => {
          mine = toMap(s);
          r2 = true;
          emit();
        }, onErr);
        return () => {
          un1();
          un2();
        };
      },

      createPost: (p) =>
        wrap(async () => {
          const data = { ...p };
          delete data.id;
          const ref = col.doc();
          await ref.set(data);
          return ref.id;
        }),

      updatePost: (id, fields) => wrap(() => col.doc(String(id)).update(fields)),
      deletePost: (id) => wrap(() => col.doc(String(id)).delete()),
      addComment: (id, c) => wrap(() => col.doc(String(id)).update({ comments: FV.arrayUnion(c) })),

      removeComment: (id, commentId) =>
        wrap(() =>
          db.runTransaction(async (tx) => {
            const ref = col.doc(String(id));
            const snap = await tx.get(ref);
            if (!snap.exists) return;
            const next = (snap.data().comments || []).filter((c) => String(c.id) !== String(commentId));
            tx.update(ref, { comments: next });
          })
        ),

      setLike: (id, uid, on) =>
        wrap(() => col.doc(String(id)).update({ likes: on ? FV.arrayUnion(uid) : FV.arrayRemove(uid) })),
    };
  }

  /* =========================================================
     APP STATE
     ========================================================= */
  let backend = null;
  let user = null; // { id, name, email }
  let posts = [];
  let postsReady = false;
  let unsubPosts = null;
  let currentPostId = null; // post open in the reader
  let editor = null; // editor state
  let pendingConfirm = null;
  let lastFocus = null;

  const ui = {
    mine: { q: "", status: "all", sort: "new", tag: "" },
    feed: { q: "", sort: "new", tag: "" },
    mode: store.get("bp_mode", "grid"),
  };

  const isMine = (p) =>
    !!user &&
    (p.ownerId
      ? p.ownerId === user.id
      : p.author.trim().toLowerCase() === user.name.trim().toLowerCase());
  const isMyComment = (c) => (c.authorId ? c.authorId === user.id : c.author === user.name);
  const getPost = (id) => posts.find((p) => String(p.id) === String(id));

  /* ---------- toast + modal ---------- */
  function toast(message, type = "ok") {
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    $("#toasts").appendChild(el);
    setTimeout(() => el.remove(), type === "error" ? 5500 : 3000);
  }

  const modalEl = () => $(".modal", $("#modal-root"));

  function openModal(html, { wide = false, label = "Dialog" } = {}) {
    closeModal(true);
    $("#modal-root").innerHTML = `<div class="scrim"><div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(label)}" tabindex="-1">${html}</div></div>`;
    document.body.classList.add("noscroll");
    modalEl().focus();
  }

  function closeModal(silent = false) {
    if (!modalEl()) return;
    $("#modal-root").innerHTML = "";
    document.body.classList.remove("noscroll");
    currentPostId = null;
    if (pendingConfirm) {
      const done = pendingConfirm;
      pendingConfirm = null;
      done(false);
    }
    if (!silent) {
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
      refreshView();
    }
  }

  function confirmDialog({ title, message, confirm = "Delete", danger = true }) {
    return new Promise((resolve) => {
      openModal(
        `<div class="dialog"><h2>${esc(title)}</h2><p>${esc(message)}</p>
          <div class="dialog-actions">
            <button type="button" class="btn" data-action="confirm-no">Cancel</button>
            <button type="button" class="btn ${danger ? "danger" : "primary"}" data-action="confirm-yes">${esc(confirm)}</button>
          </div></div>`,
        { label: title }
      );
      pendingConfirm = resolve;
    });
  }

  function resolveConfirm(value) {
    const done = pendingConfirm;
    pendingConfirm = null;
    $("#modal-root").innerHTML = "";
    document.body.classList.remove("noscroll");
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
    if (done) done(value);
  }

  const setBusy = (scope, on) => $$("button[type=submit]", scope).forEach((b) => (b.disabled = on));

  /* ---------- auth screen ---------- */
  let authReady = false;
  function showAuth() {
    $("#app").classList.add("hidden");
    $("#auth").classList.remove("hidden");
    if (authReady) return;
    authReady = true;

    const art = $("#auth-art");
    let html = "";
    for (let i = 0; i < 16 * 7; i++) {
      const r = (hashStr("blog" + i) % 100) / 100;
      const lv = r > 0.93 ? 4 : r > 0.8 ? 3 : r > 0.6 ? 2 : r > 0.4 ? 1 : 0;
      html += `<i class="l${lv}" style="--i:${i}"></i>`;
    }
    art.innerHTML = html;

    $("#forgot-btn").classList.toggle("hidden", backend.mode !== "firebase");
    const note = $("#auth-note");
    if (window.BP_DEMO) {
      note.textContent = "Preview mode: the demo account is filled in below. Press Log in to explore.";
      $("#login-email").value = "demo@blog.com";
      $("#login-password").value = "demo12345";
    } else if (backend.mode === "local") {
      note.textContent =
        "Local mode: accounts and posts stay in this browser. Add your Firebase keys in firebase-config.js to sync across devices.";
    }
  }

  function setAuthTab(tab) {
    const login = tab === "login";
    $("#login-form").classList.toggle("hidden", !login);
    $("#signup-form").classList.toggle("hidden", login);
    $("#tab-login").classList.toggle("active", login);
    $("#tab-signup").classList.toggle("active", !login);
    $("#tab-login").setAttribute("aria-selected", String(login));
    $("#tab-signup").setAttribute("aria-selected", String(!login));
    $("#login-error").textContent = "";
    $("#signup-error").textContent = "";
  }

  async function handleSignup() {
    const form = $("#signup-form");
    const name = $("#signup-name").value.trim();
    const email = $("#signup-email").value.trim().toLowerCase();
    const pw = $("#signup-password").value;
    const err = $("#signup-error");
    err.textContent = "";
    if (name.length < 2) return (err.textContent = "Enter your name (at least 2 characters).");
    if (!/^\S+@\S+\.\S+$/.test(email)) return (err.textContent = "Enter a valid email address.");
    if (pw.length < 8) return (err.textContent = "Use a password with at least 8 characters.");
    setBusy(form, true);
    try {
      await backend.signup(name, email, pw);
      form.reset();
      location.hash = "#/overview";
      toast(`Welcome, ${name.split(" ")[0]}.`);
    } catch (e) {
      err.textContent = e.message;
    }
    setBusy(form, false);
  }

  async function handleLogin() {
    const form = $("#login-form");
    const email = $("#login-email").value.trim().toLowerCase();
    const pw = $("#login-password").value;
    const err = $("#login-error");
    err.textContent = "";
    if (!email || !pw) return (err.textContent = "Enter your email and password.");
    setBusy(form, true);
    try {
      await backend.login(email, pw);
      form.reset();
      location.hash = "#/overview";
    } catch (e) {
      err.textContent = e.message;
    }
    setBusy(form, false);
  }

  async function forgotPassword() {
    const email = $("#login-email").value.trim();
    const err = $("#login-error");
    err.textContent = "";
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      err.textContent = "Type your email above first, then press this again.";
      return;
    }
    try {
      await backend.resetPassword(email);
      toast("If an account exists for that email, a reset link is on its way.");
    } catch (e) {
      err.textContent = e.message;
    }
  }

  async function logout() {
    const ok = await confirmDialog({
      title: "Log out?",
      message: backend.mode === "firebase" ? "You can log back in any time." : "Your posts stay saved in this browser.",
      confirm: "Log out",
      danger: false,
    });
    if (!ok) return;
    try {
      await backend.logout();
      history.replaceState(null, "", location.pathname);
    } catch (e) {
      toast(e.message, "error");
    }
  }

  /* ---------- session / posts wiring ---------- */
  function onUser(u) {
    $("#boot").classList.add("hidden");
    if (user && u && user.id === u.id) {
      user = u; // same person, new details
      route();
      return;
    }
    if (unsubPosts) {
      unsubPosts();
      unsubPosts = null;
    }
    user = u;
    postsReady = false;
    posts = [];
    editor = null;
    lastRoute = "";
    if (u) {
      unsubPosts = backend.watchPosts(u, (list) => {
        posts = list.map(normalizePost);
        if (!postsReady) {
          postsReady = true;
          route();
        } else onPostsChanged();
      });
    } else {
      route();
    }
  }

  function onPostsChanged() {
    if (!user) return;
    refreshView();
    if (currentPostId && $(".reader")) {
      const p = getPost(currentPostId);
      if (p) refreshReader(p);
      else closeModal(true);
    }
  }

  /* ---------- router ---------- */
  const NAV = [
    { id: "overview", label: "Overview", icon: "overview" },
    { id: "posts", label: "My posts", icon: "posts" },
    { id: "feed", label: "Community", icon: "feed" },
    { id: "write", label: "Write", icon: "write" },
    { id: "profile", label: "Profile", icon: "profile" },
  ];

  function parseHash() {
    const parts = location.hash.replace(/^#\/?/, "").split("/");
    return { name: parts[0] || "overview", arg: parts[1] || null };
  }

  let lastRoute = "";
  function route() {
    if (!backend) return;
    if (!user) {
      lastRoute = "";
      showAuth();
      return;
    }
    $("#auth").classList.add("hidden");
    $("#app").classList.remove("hidden", "nav-open");
    const { name, arg } = parseHash();
    const valid = NAV.some((n) => n.id === name) ? name : "overview";
    renderChrome(valid);
    if (!postsReady) {
      $("#view").innerHTML = '<p class="sub">Loading your posts…</p>';
      return;
    }
    const key = `${valid}/${arg || ""}`;
    const same = key === lastRoute;
    $("#view").classList.toggle("static", same);
    renderView(valid, arg);
    mountEditorParts();
    if (!same) {
      window.scrollTo(0, 0);
      const h = $("#view h1");
      if (h) {
        h.setAttribute("tabindex", "-1");
        h.focus({ preventScroll: true });
      }
    }
    lastRoute = key;
  }

  function renderChrome(active) {
    const mine = posts.filter(isMine).length;
    $("#nav").innerHTML = NAV.map(
      (n) =>
        `<a class="nav-link" href="#/${n.id}" ${n.id === active ? 'aria-current="page"' : ""}>${icon(n.icon)}<span>${n.label}</span>${n.id === "posts" && mine ? `<span class="count">${mine}</span>` : ""}</a>`
    ).join("");
    $("#me-name").textContent = user.name;
    $("#me-email").textContent = user.email;
    $("#me-avatar").textContent = user.name.trim().charAt(0).toUpperCase();
    $("#mode-note").textContent =
      backend.mode === "firebase" ? "Synced to your account" : "Saved in this browser only";
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    $("#theme-btn").innerHTML = `${icon(dark ? "sun" : "moon", 18)}<span>${dark ? "Light" : "Dark"}</span>`;
    $("#logout-btn").innerHTML = `${icon("logout", 18)}<span>Log out</span>`;
    $('[data-action="nav-toggle"].icon-btn').innerHTML = icon("menu");
  }

  function renderView(name, arg) {
    const el = $("#view");
    switch (name) {
      case "overview":
        el.innerHTML = overviewView();
        break;
      case "posts":
        el.innerHTML = listView("mine");
        renderResults("mine");
        break;
      case "feed":
        el.innerHTML = listView("feed");
        renderResults("feed");
        break;
      case "write":
        el.innerHTML = writeView(arg);
        break;
      case "profile":
        el.innerHTML = profileView();
        break;
    }
  }

  function refreshView() {
    if (!user || !postsReady) return;
    const { name } = parseHash();
    if (name === "overview") route();
    else if (name === "posts" || name === "feed") {
      renderChrome(name);
      renderResults(name === "posts" ? "mine" : "feed");
    } else renderChrome(name);
  }

  /* ---------- post pieces ---------- */
  function cover(p, cls = "") {
    if (p.imageUrl) {
      return `<img class="${cls}" src="${esc(p.imageUrl)}" alt="" loading="lazy" />`;
    }
    const h = 190 + (hashStr(p.title) % 100);
    return `<div class="cover-fallback ${cls}" style="--h:${h}" aria-hidden="true">${esc(p.title.trim().charAt(0).toUpperCase())}</div>`;
  }

  function tagsHTML(p) {
    return p.tags.length
      ? `<div class="tags">${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>`
      : "";
  }

  function postCard(p) {
    const mine = isMine(p);
    return `<article class="card">
      <button type="button" class="card-cover" data-action="open" data-id="${esc(p.id)}" aria-label="Open ${esc(p.title)}" tabindex="-1">${cover(p)}</button>
      <div class="card-body">
        <div class="card-meta">
          ${p.status === "draft" ? '<span class="badge">Draft</span>' : ""}
          <span>${esc(p.author)}</span>
          <span>${fmtDate(p.createdAt)}</span>
          <span>${readMins(p.content)} min read</span>
        </div>
        <h3><button type="button" class="linklike" data-action="open" data-id="${esc(p.id)}">${esc(p.title)}</button></h3>
        <p class="card-desc">${esc(p.description)}</p>
        ${tagsHTML(p)}
        <div class="card-foot">
          <span class="stat">${icon("heart", 16)} ${p.likes.length}</span>
          <span class="stat">${icon("comment", 16)} ${p.comments.length}</span>
          ${
            mine
              ? `<span class="spacer">
                  <button type="button" class="icon-btn" data-action="edit" data-id="${esc(p.id)}" aria-label="Edit ${esc(p.title)}">${icon("write", 18)}</button>
                  <button type="button" class="icon-btn danger" data-action="delete" data-id="${esc(p.id)}" aria-label="Delete ${esc(p.title)}">${icon("trash", 18)}</button>
                </span>`
              : ""
          }
        </div>
      </div>
    </article>`;
  }

  /* ---------- Overview ---------- */
  function activityMap() {
    const counts = {};
    const bump = (ts) => {
      const k = dayKey(ts);
      counts[k] = (counts[k] || 0) + 1;
    };
    posts.filter(isMine).forEach((p) => {
      bump(p.createdAt);
      if (dayKey(p.updatedAt) !== dayKey(p.createdAt)) bump(p.updatedAt);
    });
    posts.forEach((p) =>
      p.comments.forEach((c) => {
        if (isMyComment(c) && c.at) bump(c.at);
      })
    );
    return counts;
  }

  function overviewView() {
    const mine = posts.filter(isMine);
    const published = mine.filter((p) => p.status === "published");
    const drafts = mine.filter((p) => p.status === "draft");
    const words = mine.reduce((n, p) => n + wordCount(p.content), 0);
    const received = mine.reduce((n, p) => n + p.comments.filter((c) => !isMyComment(c)).length, 0);
    const likes = mine.reduce((n, p) => n + p.likes.length, 0);

    // heatmap: 16 weeks, columns start on Sunday
    const WEEKS = 16;
    const counts = activityMap();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() - (WEEKS - 1) * 7);
    let cells = "";
    let activeDays = 0;
    for (let i = 0; i < WEEKS * 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const n = counts[dayKey(d)] || 0;
      const future = d > today;
      if (n && !future) activeDays++;
      const lv = n >= 4 ? 4 : n === 3 ? 3 : n === 2 ? 2 : n === 1 ? 1 : 0;
      const label = `${d.toLocaleDateString(undefined, { day: "numeric", month: "short" })}: ${plural(n, "action")}`;
      cells += `<i class="l${lv}${future ? " future" : ""}${d.getTime() === today.getTime() ? " today" : ""}" style="--i:${i}" title="${label}"></i>`;
    }

    // streak
    let streak = 0;
    const cursor = new Date(today);
    if (!counts[dayKey(cursor)]) cursor.setDate(cursor.getDate() - 1);
    while (counts[dayKey(cursor)]) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    const hr = new Date().getHours();
    const greet = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
    const first = user.name.trim().split(/\s+/)[0];
    const summary = mine.length
      ? `You were active on <strong>${plural(activeDays, "day")}</strong> in the last ${WEEKS} weeks${streak > 1 ? `, and you are on a <strong>${streak}-day streak</strong>` : ""}.`
      : "Your first post lights up the first square.";

    // tags
    const tagCount = {};
    mine.forEach((p) => p.tags.forEach((t) => (tagCount[t.toLowerCase()] = (tagCount[t.toLowerCase()] || 0) + 1)));
    const topTags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const maxTag = topTags.length ? topTags[0][1] : 1;

    // recent
    const recent = [...mine].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);
    const comments = mine
      .flatMap((p) => p.comments.filter((c) => !isMyComment(c)).map((c) => ({ ...c, post: p })))
      .sort((a, b) => b.at - a.at)
      .slice(0, 5);

    const recentHTML = recent.length
      ? `<ul class="rows">${recent
          .map(
            (p) => `<li><button type="button" class="row-btn" data-action="open" data-id="${esc(p.id)}">
              <span class="row-thumb">${cover(p)}</span>
              <span class="row-main"><strong>${esc(p.title)}</strong><span>${p.status === "draft" ? "Draft" : "Published"}, updated ${timeAgo(p.updatedAt)}</span></span>
              <span class="row-end">${plural(wordCount(p.content), "word")}</span>
            </button></li>`
          )
          .join("")}</ul>`
      : `<div class="empty"><h3>No posts yet</h3><p>Write something short today. You can polish it later.</p><a class="btn primary" href="#/write">Write your first post</a></div>`;

    return `
      <section class="band" aria-label="Writing activity">
        <div>
          <h1>${greet}, ${esc(first)}</h1>
          <p>${summary}</p>
          <div class="band-actions">
            <a class="btn hi" href="#/write">${icon("write", 18)} New post</a>
            <a class="btn" href="#/feed">Read the community</a>
          </div>
        </div>
        <div class="heat-wrap">
          <div class="heat" role="img" aria-label="Activity over the last ${WEEKS} weeks: ${plural(activeDays, "active day")}">${cells}</div>
          <div class="heat-legend" aria-hidden="true">Less <i></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i> More</div>
        </div>
      </section>

      <section class="strip" aria-label="Totals">
        <div><b>${published.length}</b><span>Published</span></div>
        <div><b>${drafts.length}</b><span>Drafts</span></div>
        <div><b>${words.toLocaleString()}</b><span>Words written</span></div>
        <div><b>${received}</b><span>Comments received</span></div>
        <div><b>${likes}</b><span>Likes received</span></div>
      </section>

      <div class="cols">
        <section class="panel">
          <div class="panel-head"><h2>Recently edited</h2><a href="#/posts">All posts</a></div>
          ${recentHTML}
        </section>
        <div class="stack">
          <section class="panel">
            <h2>Your topics</h2>
            ${
              topTags.length
                ? `<div class="tagbars">${topTags
                    .map(
                      ([t, n]) =>
                        `<div class="tagbar"><span>${esc(t)}</span><span class="bar"><i style="width:${Math.round((n / maxTag) * 100)}%"></i></span><b>${n}</b></div>`
                    )
                    .join("")}</div>`
                : `<p class="sub">Add tags to a post and your most-used topics appear here.</p>`
            }
          </section>
          <section class="panel">
            <h2>Latest comments</h2>
            ${
              comments.length
                ? `<ul class="rows">${comments
                    .map(
                      (c) => `<li><button type="button" class="row-btn" data-action="open" data-id="${esc(c.post.id)}">
                        <span class="row-main"><strong>${esc(c.text)}</strong><span>${esc(c.author)} on ${esc(c.post.title)}</span></span>
                        <span class="row-end">${timeAgo(c.at)}</span></button></li>`
                    )
                    .join("")}</ul>`
                : `<p class="sub">No comments on your posts yet.</p>`
            }
          </section>
          ${
            drafts.length
              ? `<section class="panel"><h2>Unfinished drafts</h2><ul class="rows">${drafts
                  .slice(0, 4)
                  .map(
                    (p) => `<li><button type="button" class="row-btn" data-action="edit" data-id="${esc(p.id)}">
                      <span class="row-main"><strong>${esc(p.title)}</strong><span>${plural(wordCount(p.content), "word")}</span></span>
                      <span class="row-end">Continue</span></button></li>`
                  )
                  .join("")}</ul></section>`
              : ""
          }
        </div>
      </div>`;
  }

  /* ---------- Lists (My posts / Community) ---------- */
  function listView(scope) {
    const mine = scope === "mine";
    const f = ui[scope];
    return `
      <div class="page-head">
        <div>
          <h1>${mine ? "My posts" : "Community"}</h1>
          <p class="sub">${mine ? "Everything you have written, drafts included." : "Published posts from everyone on this blog."}</p>
        </div>
        ${mine ? `<a class="btn primary" href="#/write">${icon("write", 18)} New post</a>` : ""}
      </div>
      <div class="toolbar">
        <label class="search">${icon("search", 18)}
          <input type="search" data-bind="q" data-scope="${scope}" value="${esc(f.q)}" placeholder="Search titles, text and tags" aria-label="Search posts" />
        </label>
        ${mine ? '<div class="seg" id="status-seg" role="group" aria-label="Status"></div>' : ""}
        <select data-bind="sort" data-scope="${scope}" aria-label="Sort posts">
          <option value="new" ${f.sort === "new" ? "selected" : ""}>Newest first</option>
          <option value="old" ${f.sort === "old" ? "selected" : ""}>Oldest first</option>
          <option value="comments" ${f.sort === "comments" ? "selected" : ""}>Most comments</option>
          <option value="likes" ${f.sort === "likes" ? "selected" : ""}>Most liked</option>
          <option value="title" ${f.sort === "title" ? "selected" : ""}>Title A to Z</option>
        </select>
        <div class="seg" role="group" aria-label="Layout">
          <button type="button" data-action="mode" data-mode="grid" aria-pressed="${ui.mode === "grid"}" aria-label="Grid layout">${icon("grid", 16)}</button>
          <button type="button" data-action="mode" data-mode="list" aria-pressed="${ui.mode === "list"}" aria-label="List layout">${icon("list", 16)}</button>
        </div>
      </div>
      <div class="chips" id="tag-chips" role="group" aria-label="Filter by tag"></div>
      <p class="results-count" id="results-count"></p>
      <div id="results" class="cards ${ui.mode}"></div>`;
  }

  function baseList(scope) {
    return scope === "mine" ? posts.filter(isMine) : posts.filter((p) => p.status === "published");
  }

  function filtered(scope) {
    const f = ui[scope];
    let list = baseList(scope);
    if (scope === "mine" && f.status !== "all") list = list.filter((p) => p.status === f.status);
    if (f.tag) list = list.filter((p) => p.tags.some((t) => t.toLowerCase() === f.tag));
    if (f.q) {
      const q = f.q.toLowerCase();
      list = list.filter((p) =>
        [p.title, p.description, p.content, p.author, p.tags.join(" ")].join(" ").toLowerCase().includes(q)
      );
    }
    const sorters = {
      new: (a, b) => b.createdAt - a.createdAt,
      old: (a, b) => a.createdAt - b.createdAt,
      comments: (a, b) => b.comments.length - a.comments.length,
      likes: (a, b) => b.likes.length - a.likes.length,
      title: (a, b) => a.title.localeCompare(b.title),
    };
    return [...list].sort(sorters[f.sort] || sorters.new);
  }

  function renderResults(scope) {
    const f = ui[scope];
    const base = baseList(scope);
    const list = filtered(scope);

    const seg = $("#status-seg");
    if (seg) {
      const n = (s) => base.filter((p) => p.status === s).length;
      const opts = [["all", `All ${base.length}`], ["published", `Published ${n("published")}`], ["draft", `Drafts ${n("draft")}`]];
      seg.innerHTML = opts
        .map(([v, l]) => `<button type="button" data-action="status" data-value="${v}" aria-pressed="${f.status === v}">${l}</button>`)
        .join("");
    }

    const tags = [...new Set(base.flatMap((p) => p.tags.map((t) => t.toLowerCase())))].sort();
    const chips = $("#tag-chips");
    if (!chips) return;
    chips.classList.toggle("hidden", !tags.length);
    chips.innerHTML = tags
      .map((t) => `<button type="button" class="chip" data-action="tag" data-tag="${esc(t)}" aria-pressed="${f.tag === t}">${esc(t)}</button>`)
      .join("");

    const box = $("#results");
    box.className = `cards ${ui.mode}`;
    $("#results-count").textContent = base.length ? `Showing ${list.length} of ${base.length}` : "";

    if (!base.length) {
      box.className = "";
      box.innerHTML =
        scope === "mine"
          ? `<div class="empty center"><h3>Nothing written yet</h3><p>Your posts and drafts will live here.</p><a class="btn primary" href="#/write">Write your first post</a></div>`
          : `<div class="empty center"><h3>The community feed is empty</h3><p>Publish a post and it shows up here for everyone.</p><a class="btn primary" href="#/write">Write a post</a></div>`;
    } else if (!list.length) {
      box.className = "";
      box.innerHTML = `<div class="empty center"><h3>No posts match</h3><p>Try a different search or clear your filters.</p><button type="button" class="btn" data-action="clear-filters" data-scope="${scope}">Clear filters</button></div>`;
    } else {
      box.innerHTML = list.map(postCard).join("");
    }
  }

  /* ---------- Reader modal ---------- */
  function openPost(id) {
    const p = getPost(id);
    if (!p) return;
    openModal(readerHTML(p), { wide: true, label: p.title });
    currentPostId = p.id;
  }

  function readerHTML(p) {
    return `<div class="reader">
      <div class="modal-head"><button type="button" class="icon-btn" data-action="close-modal" aria-label="Close">${icon("x")}</button></div>
      ${cover(p, "reader-cover")}
      <div class="reader-body">
        <div class="card-meta">
          ${p.status === "draft" ? '<span class="badge">Draft</span>' : ""}
          <span>${esc(p.author)}</span><span>${fmtDate(p.createdAt)}</span><span>${readMins(p.content)} min read</span>
        </div>
        <h2 class="reader-title">${esc(p.title)}</h2>
        <p class="reader-desc">${esc(p.description)}</p>
        <div class="prose">${md(p.content)}</div>
        ${p.tags.length ? `<div style="margin-top:22px">${tagsHTML(p)}</div>` : ""}
        <div class="reader-actions" id="reader-actions">${readerActions(p)}</div>
        <section class="comments" id="comments">${commentsHTML(p)}</section>
      </div>
    </div>`;
  }

  function readerActions(p) {
    const liked = p.likes.includes(user.id);
    return `<button type="button" class="btn ${liked ? "liked" : ""}" data-action="like" data-id="${esc(p.id)}" aria-pressed="${liked}">${icon("heart", 18)} ${liked ? "Liked" : "Like"} (${p.likes.length})</button>
      ${isMine(p) ? `<button type="button" class="btn" data-action="edit" data-id="${esc(p.id)}">${icon("write", 18)} Edit</button><button type="button" class="btn" data-action="delete" data-id="${esc(p.id)}">${icon("trash", 18)} Delete</button>` : ""}`;
  }

  function commentsHTML(p) {
    const list = p.comments
      .map(
        (c) => `<div class="comment">
          <span class="avatar" aria-hidden="true">${esc((c.author || "?").charAt(0).toUpperCase())}</span>
          <div><strong>${esc(c.author)}</strong> <small>${timeAgo(c.at)}</small><p>${esc(c.text)}</p></div>
          ${
            isMyComment(c) || isMine(p)
              ? `<button type="button" class="icon-btn danger" data-action="del-comment" data-post="${esc(p.id)}" data-comment="${esc(c.id)}" aria-label="Delete comment">${icon("trash", 16)}</button>`
              : "<span></span>"
          }
        </div>`
      )
      .join("");
    return `<h3>${plural(p.comments.length, "comment")}</h3>${list}
      <form class="comment-form" data-form="comment" data-id="${esc(p.id)}">
        <input type="text" id="comment-input" placeholder="Add a comment" maxlength="500" aria-label="Add a comment" autocomplete="off" />
        <button type="submit" class="btn primary">Comment</button>
      </form>`;
  }

  // Re-render the live parts of the reader without losing a half-typed comment.
  function refreshReader(p) {
    const box = $("#reader-actions");
    const com = $("#comments");
    if (!box || !com) return;
    const input = $("#comment-input");
    const val = input ? input.value : "";
    const focused = !!input && document.activeElement === input;
    box.innerHTML = readerActions(p);
    com.innerHTML = commentsHTML(p);
    const next = $("#comment-input");
    if (next) {
      next.value = val;
      if (focused) next.focus();
    }
  }

  async function toggleLike(id) {
    const p = getPost(id);
    if (!p) return;
    try {
      await backend.setLike(id, user.id, !p.likes.includes(user.id));
    } catch (e) {
      toast(e.message, "error");
    }
  }

  async function addComment(id, text) {
    text = text.trim();
    if (!text) return;
    const input = $("#comment-input");
    if (input) input.value = "";
    try {
      await backend.addComment(id, {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        author: user.name,
        authorId: user.id,
        text,
        at: Date.now(),
      });
    } catch (e) {
      toast(e.message, "error");
      if (input) input.value = text;
    }
  }

  async function deleteComment(postId, commentId) {
    try {
      await backend.removeComment(postId, commentId);
    } catch (e) {
      toast(e.message, "error");
    }
  }

  async function deletePost(id) {
    const p = getPost(id);
    if (!p || !isMine(p)) return;
    const inReader = !!$(".reader");
    const ok = await confirmDialog({
      title: "Delete this post?",
      message: `"${p.title}" and its ${plural(p.comments.length, "comment")} will be removed. This cannot be undone.`,
      confirm: "Delete post",
    });
    if (!ok) {
      if (inReader) openPost(p.id);
      return;
    }
    try {
      await backend.deletePost(p.id);
      toast("Post deleted.");
    } catch (e) {
      toast(e.message, "error");
    }
  }

  /* ---------- Editor ---------- */
  const autosaveKey = () => `bp_autosave_${user.id}`;

  const blankEditor = () => ({ id: null, title: "", description: "", content: "", tags: [], imageUrl: "", status: "draft" });

  function writeView(arg) {
    let restored = false;
    if (arg) {
      const p = getPost(arg);
      if (!p || !isMine(p)) {
        toast("That post is not available to edit.", "error");
        location.hash = "#/posts";
        return "";
      }
      if (!editor || String(editor.id) !== String(p.id)) {
        editor = { id: p.id, title: p.title, description: p.description, content: p.content, tags: [...p.tags], imageUrl: p.imageUrl, status: p.status };
      }
    } else if (!editor || editor.id !== null) {
      editor = blankEditor();
      const saved = store.get(autosaveKey(), null);
      if (saved && (saved.title || saved.content)) {
        editor = { ...blankEditor(), ...saved, id: null };
        restored = true;
      }
    }
    if (restored) setTimeout(() => toast("Restored your unsaved draft."), 50);
    const e = editor;
    const editing = e.id !== null;

    return `
      <div class="page-head">
        <div>
          <h1>${editing ? "Edit post" : "New post"}</h1>
          <p class="sub">${editing ? "Changes are saved when you press a save button." : "Your work is autosaved in this browser while you type."}</p>
        </div>
      </div>
      <div class="seg pane-tabs" role="group" aria-label="Editor view">
        <button type="button" data-action="pane" data-pane="write" aria-pressed="true">Write</button>
        <button type="button" data-action="pane" data-pane="preview" aria-pressed="false">Preview</button>
      </div>
      <div class="editor" id="editor">
        <form class="editor-form" data-form="post" novalidate>
          <input type="text" id="f-title" class="title-input" placeholder="Post title" maxlength="120" value="${esc(e.title)}" aria-label="Post title" autocomplete="off" />
          <div>
            <label class="label" for="f-desc">Short description</label>
            <textarea id="f-desc" rows="2" maxlength="160" placeholder="One or two sentences that make someone want to read it">${esc(e.description)}</textarea>
            <div class="counter" id="desc-count">${e.description.length}/160</div>
          </div>
          <div>
            <label class="label" for="f-content">Content</label>
            <div class="md-tools" role="toolbar" aria-label="Formatting">
              <button type="button" data-action="tool" data-tool="bold" aria-label="Bold"><b>B</b></button>
              <button type="button" data-action="tool" data-tool="italic" aria-label="Italic"><i>I</i></button>
              <button type="button" data-action="tool" data-tool="h" aria-label="Heading">H</button>
              <button type="button" data-action="tool" data-tool="list" aria-label="Bulleted list">List</button>
              <button type="button" data-action="tool" data-tool="quote" aria-label="Quote">Quote</button>
              <button type="button" data-action="tool" data-tool="link" aria-label="Link">Link</button>
              <button type="button" data-action="tool" data-tool="code" aria-label="Code">Code</button>
            </div>
            <textarea id="f-content" placeholder="Start writing. Blank lines make new paragraphs.">${esc(e.content)}</textarea>
            <div class="editor-meta"><span id="word-stats"></span><span id="save-state"></span></div>
          </div>
          <div>
            <label class="label" for="f-tag">Tags</label>
            <div class="tag-input" id="tag-box"></div>
            <small class="sub">Press Enter or comma to add a tag. Up to 8.</small>
          </div>
          <div>
            <span class="label">Cover image</span>
            <div id="cover-box"></div>
            <input type="file" id="f-image" accept="image/*" class="visually-hidden" tabindex="-1" />
          </div>
          <div class="editor-actions">
            <button type="submit" class="btn primary" data-status="published">${editing && e.status === "published" ? "Update post" : "Publish"}</button>
            <button type="submit" class="btn" data-status="draft">Save as draft</button>
            <span class="spacer"></span>
            <button type="button" class="btn ghost" data-action="discard">${editing ? "Cancel" : "Discard"}</button>
          </div>
        </form>
        <aside class="editor-preview" aria-label="Live preview">
          <p class="preview-label">Live preview</p>
          <div id="preview"></div>
        </aside>
      </div>`;
  }

  function mountEditorParts() {
    if (!$("#editor") || !editor) return;
    renderTagBox();
    renderCoverBox();
    updateStats();
    updatePreview();
  }

  function renderTagBox() {
    $("#tag-box").innerHTML =
      editor.tags
        .map((t) => `<span class="tag-pill">${esc(t)}<button type="button" data-action="rm-tag" data-tag="${esc(t)}" aria-label="Remove tag ${esc(t)}">${icon("x", 12)}</button></span>`)
        .join("") +
      `<input type="text" id="f-tag" placeholder="${editor.tags.length ? "" : "e.g. travel, tutorial"}" maxlength="24" aria-label="Add a tag" autocomplete="off" />`;
  }

  function renderCoverBox() {
    $("#cover-box").innerHTML = editor.imageUrl
      ? `<div class="cover-preview"><img src="${esc(editor.imageUrl)}" alt="Cover preview" /><button type="button" class="btn small" data-action="rm-cover">Remove</button></div>`
      : `<button type="button" class="cover-drop" style="width:100%" data-action="pick-cover">${icon("image", 26)}<span>Add a cover image</span><small>JPG, PNG or WebP. Resized to keep storage small.</small></button>`;
  }

  function updateStats() {
    const w = wordCount(editor.content);
    const ws = $("#word-stats");
    if (ws) ws.textContent = `${plural(w, "word")}, ${readMins(editor.content)} min read`;
  }

  function updatePreview() {
    const box = $("#preview");
    if (!box || !editor) return;
    const fake = { title: editor.title || "Untitled", imageUrl: editor.imageUrl };
    box.innerHTML = `${cover(fake, "reader-cover")}
      <h2 class="reader-title" style="margin-top:0">${esc(editor.title) || '<span class="placeholder">Your title</span>'}</h2>
      ${editor.description ? `<p class="reader-desc">${esc(editor.description)}</p>` : ""}
      <div class="prose">${editor.content.trim() ? md(editor.content) : '<p class="placeholder">Your writing will appear here as you type.</p>'}</div>
      ${editor.tags.length ? `<div style="margin-top:18px">${tagsHTML(editor)}</div>` : ""}`;
  }

  let autosaveTimer = null;
  function queueAutosave() {
    if (!editor || editor.id !== null) return;
    const state = $("#save-state");
    if (state) state.textContent = "Saving…";
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      if (editor && user && (editor.title || editor.content)) {
        const ok = store.set(autosaveKey(), editor);
        const s = $("#save-state");
        if (s) s.textContent = ok ? "Autosaved" : "Could not autosave (browser storage full)";
      }
    }, 700);
  }

  function addTag(raw) {
    const t = raw.trim().replace(/,+$/, "").trim();
    if (!t) return;
    if (editor.tags.length >= 8) return toast("You can add up to 8 tags.", "error");
    if (editor.tags.some((x) => x.toLowerCase() === t.toLowerCase())) return;
    editor.tags.push(t);
    renderTagBox();
    $("#f-tag").focus();
    updatePreview();
    queueAutosave();
  }

  function applyTool(kind) {
    const ta = $("#f-content");
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const v = ta.value;
    const sel = v.slice(s, e);
    let before = "", after = "", ph = "";
    const lineStart = ["h", "list", "quote"].includes(kind);
    switch (kind) {
      case "bold": before = "**"; after = "**"; ph = "bold text"; break;
      case "italic": before = "*"; after = "*"; ph = "italic text"; break;
      case "h": before = "## "; ph = "Heading"; break;
      case "list": before = "- "; ph = "List item"; break;
      case "quote": before = "> "; ph = "Quote"; break;
      case "link": before = "["; after = "](https://)"; ph = "link text"; break;
      case "code": before = "`"; after = "`"; ph = "code"; break;
    }
    if (lineStart && s > 0 && v[s - 1] !== "\n") before = "\n" + before;
    ta.setRangeText(before + (sel || ph) + after, s, e, "end");
    ta.focus();
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // Shrinks the image until it is small enough to store inside a post (Firestore docs max out at 1 MB).
  function compressImage(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) return reject(new Error("Choose an image file."));
      if (file.size > 12 * 1024 * 1024) return reject(new Error("That image is over 12 MB. Choose a smaller one."));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read that file."));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Could not open that image."));
        img.onload = () => {
          const attempts = [[1200, 0.8], [1000, 0.72], [800, 0.66], [640, 0.6], [480, 0.55]];
          for (const [max, q] of attempts) {
            const scale = Math.min(1, max / img.width);
            const c = document.createElement("canvas");
            c.width = Math.max(1, Math.round(img.width * scale));
            c.height = Math.max(1, Math.round(img.height * scale));
            const ctx = c.getContext("2d");
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, c.width, c.height);
            ctx.drawImage(img, 0, 0, c.width, c.height);
            const url = c.toDataURL("image/jpeg", q);
            if (url.length < 600000) return resolve(url);
          }
          reject(new Error("Could not shrink that image enough. Try a simpler one."));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function submitPost(status) {
    const title = editor.title.trim();
    const content = editor.content.trim();
    if (!title) {
      toast("Add a title first.", "error");
      return $("#f-title").focus();
    }
    if (status === "published" && !content) {
      toast("Write something before publishing, or save it as a draft.", "error");
      return $("#f-content").focus();
    }
    const now = Date.now();
    const body = {
      title,
      description: editor.description.trim(),
      content,
      tags: [...editor.tags],
      imageUrl: editor.imageUrl || "",
      status,
      updatedAt: now,
      author: user.name,
    };
    const buttons = $$(".editor-actions button");
    buttons.forEach((b) => (b.disabled = true));
    try {
      if (editor.id !== null) {
        await backend.updatePost(editor.id, body);
      } else {
        await backend.createPost({ ...body, id: now, ownerId: user.id, createdAt: now, likes: [], comments: [] });
      }
    } catch (e) {
      toast(e.message || "Could not save the post.", "error");
      buttons.forEach((b) => (b.disabled = false));
      return;
    }
    store.remove(autosaveKey());
    toast(status === "published" ? "Published." : "Draft saved.");
    editor = null;
    ui.mine.status = "all";
    location.hash = "#/posts";
    route();
  }

  async function discardEditor() {
    const dirty = editor && (editor.title || editor.content || editor.description);
    if (dirty) {
      const ok = await confirmDialog({
        title: editor.id !== null ? "Leave without saving?" : "Discard this draft?",
        message: editor.id !== null ? "Your changes to this post will be lost." : "What you have written so far will be deleted.",
        confirm: editor.id !== null ? "Leave" : "Discard",
      });
      if (!ok) return;
    }
    store.remove(autosaveKey());
    editor = null;
    location.hash = "#/posts";
    route();
  }

  /* ---------- Profile ---------- */
  function profileView() {
    const cloud = backend.mode === "firebase";
    return `
      <div class="page-head"><div><h1>Profile</h1><p class="sub">Your details and your data.</p></div></div>
      <div class="profile-grid">
        <section class="panel">
          <h2>Your details</h2>
          <form data-form="profile" novalidate>
            <label class="field"><span>Name</span><input type="text" id="p-name" value="${esc(user.name)}" autocomplete="name" required /></label>
            <label class="field"><span>Email</span><input type="email" id="p-email" value="${esc(user.email)}" autocomplete="email" ${cloud ? "disabled" : ""} required />${cloud ? "<small>Your sign-in email cannot be changed here.</small>" : ""}</label>
            <p class="form-error" id="profile-error" role="alert"></p>
            <button type="submit" class="btn primary">Save changes</button>
          </form>
        </section>
        <section class="panel">
          <h2>Change password</h2>
          <form data-form="password" novalidate>
            <label class="field"><span>Current password</span><input type="password" id="pw-old" autocomplete="current-password" required /></label>
            <label class="field"><span>New password</span><input type="password" id="pw-new" autocomplete="new-password" minlength="8" required /><small>At least 8 characters.</small></label>
            <p class="form-error" id="password-error" role="alert"></p>
            <button type="submit" class="btn primary">Update password</button>
          </form>
        </section>
        <section class="panel">
          <h2>Backup and import</h2>
          <p class="hint">${cloud ? "Your posts are stored in your account. Export a copy any time, or import posts from a backup, including ones from the older local version of this app." : "Posts live in this browser's storage. Download a backup before you clear your browser data or switch devices."}</p>
          <div class="btn-row">
            <button type="button" class="btn" data-action="export">${icon("download", 18)} Export my posts</button>
            <button type="button" class="btn" data-action="import">${icon("upload", 18)} Import posts</button>
          </div>
          <input type="file" id="import-file" accept="application/json,.json" class="visually-hidden" tabindex="-1" />
        </section>
      </div>`;
  }

  async function saveProfile() {
    const form = $('[data-form="profile"]');
    const name = $("#p-name").value.trim();
    const email = $("#p-email").value.trim().toLowerCase();
    const err = $("#profile-error");
    err.textContent = "";
    if (name.length < 2) return (err.textContent = "Enter your name (at least 2 characters).");
    if (backend.mode === "local" && !/^\S+@\S+\.\S+$/.test(email))
      return (err.textContent = "Enter a valid email address.");
    const oldKey = autosaveKey();
    const saved = store.get(oldKey, null);
    setBusy(form, true);
    try {
      await backend.updateProfile(name, email);
    } catch (e) {
      err.textContent = e.message;
      setBusy(form, false);
      return;
    }
    if (saved && autosaveKey() !== oldKey) {
      store.set(autosaveKey(), saved);
      store.remove(oldKey);
    }
    toast("Profile updated.");
    route();
  }

  async function changePassword() {
    const form = $('[data-form="password"]');
    const oldPw = $("#pw-old").value;
    const newPw = $("#pw-new").value;
    const err = $("#password-error");
    err.textContent = "";
    if (!oldPw) return (err.textContent = "Enter your current password.");
    if (newPw.length < 8) return (err.textContent = "Use a new password with at least 8 characters.");
    setBusy(form, true);
    try {
      await backend.changePassword(oldPw, newPw);
      form.reset();
      toast("Password updated.");
    } catch (e) {
      err.textContent = e.message;
    }
    setBusy(form, false);
  }

  function exportData() {
    const data = {
      app: "blogging-platform",
      version: 3,
      exportedAt: new Date().toISOString(),
      posts: posts.filter(isMine),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `blogging-platform-backup-${dayKey(Date.now())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("Backup downloaded.");
  }

  async function importData(file) {
    let incoming;
    try {
      const data = JSON.parse(await file.text());
      incoming = Array.isArray(data) ? data : data.posts;
      if (!Array.isArray(incoming)) throw new Error("bad");
    } catch {
      return toast("That file is not a valid backup.", "error");
    }
    const key = (p) => `${p.createdAt}|${p.title}`;
    const have = new Set(posts.filter(isMine).map(key));
    let added = 0;
    try {
      for (const raw of incoming) {
        if (!raw || typeof raw !== "object") continue;
        const n = normalizePost({ ...raw, ownerId: null, ownerEmail: null });
        if (have.has(key(n))) continue;
        await backend.createPost({
          id: n.id,
          title: n.title,
          description: n.description,
          content: n.content,
          tags: n.tags,
          imageUrl: n.imageUrl,
          status: n.status,
          createdAt: n.createdAt,
          updatedAt: n.updatedAt,
          likes: [],
          comments: n.comments,
          ownerId: user.id,
          author: user.name,
        });
        have.add(key(n));
        added++;
      }
    } catch (e) {
      toast(`Stopped after ${plural(added, "post")}: ${e.message}`, "error");
      return;
    }
    toast(added ? `Imported ${plural(added, "post")}.` : "Nothing new to import.");
  }

  /* ---------- events ---------- */
  document.addEventListener("click", (ev) => {
    if (ev.target.classList && ev.target.classList.contains("scrim")) {
      if (pendingConfirm) resolveConfirm(false);
      else closeModal();
      return;
    }
    const el = ev.target.closest("[data-action]");
    if (!el) return;
    const a = el.dataset.action;
    const id = el.dataset.id;
    switch (a) {
      case "auth-tab": setAuthTab(el.dataset.tab); break;
      case "toggle-pass": $("#" + el.dataset.target).type = el.checked ? "text" : "password"; return;
      case "forgot": forgotPassword(); break;
      case "nav-toggle": $("#app").classList.toggle("nav-open"); break;
      case "theme": {
        const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        try { localStorage.setItem("bp_theme", next); } catch {}
        renderChrome(parseHash().name);
        break;
      }
      case "logout": lastFocus = el; logout(); break;
      case "open": lastFocus = el; openPost(id); break;
      case "close-modal": closeModal(); break;
      case "confirm-yes": resolveConfirm(true); break;
      case "confirm-no": resolveConfirm(false); break;
      case "edit":
        if (modalEl()) closeModal(true);
        editor = null;
        location.hash = `#/write/${id}`;
        break;
      case "delete": lastFocus = el; deletePost(id); break;
      case "like": toggleLike(id); break;
      case "del-comment": deleteComment(el.dataset.post, el.dataset.comment); break;
      case "mode":
        ui.mode = el.dataset.mode;
        store.set("bp_mode", ui.mode);
        $$('[data-action="mode"]').forEach((b) => b.setAttribute("aria-pressed", String(b === el)));
        renderResults(parseHash().name === "feed" ? "feed" : "mine");
        break;
      case "status": ui.mine.status = el.dataset.value; renderResults("mine"); break;
      case "tag": {
        const scope = parseHash().name === "feed" ? "feed" : "mine";
        ui[scope].tag = ui[scope].tag === el.dataset.tag ? "" : el.dataset.tag;
        renderResults(scope);
        break;
      }
      case "clear-filters": {
        const scope = el.dataset.scope;
        Object.assign(ui[scope], { q: "", tag: "", status: "all" });
        const s = $('input[data-bind="q"]');
        if (s) s.value = "";
        renderResults(scope);
        break;
      }
      case "tool": applyTool(el.dataset.tool); break;
      case "rm-tag":
        editor.tags = editor.tags.filter((t) => t !== el.dataset.tag);
        renderTagBox();
        updatePreview();
        queueAutosave();
        break;
      case "pick-cover": $("#f-image").click(); break;
      case "rm-cover":
        editor.imageUrl = "";
        renderCoverBox();
        updatePreview();
        queueAutosave();
        break;
      case "pane": {
        const preview = el.dataset.pane === "preview";
        $("#editor").classList.toggle("show-preview", preview);
        $$('[data-action="pane"]').forEach((b) => b.setAttribute("aria-pressed", String(b === el)));
        break;
      }
      case "discard": discardEditor(); break;
      case "export": exportData(); break;
      case "import": $("#import-file").click(); break;
    }
  });

  document.addEventListener("submit", async (ev) => {
    const form = ev.target.closest("[data-form]");
    if (!form) return;
    ev.preventDefault();
    switch (form.dataset.form) {
      case "login": await handleLogin(); break;
      case "signup": await handleSignup(); break;
      case "comment": await addComment(form.dataset.id, $("#comment-input").value); break;
      case "post": {
        const status = ev.submitter && ev.submitter.dataset.status ? ev.submitter.dataset.status : "published";
        await submitPost(status);
        break;
      }
      case "profile": await saveProfile(); break;
      case "password": await changePassword(); break;
    }
  });

  document.addEventListener("input", (ev) => {
    const t = ev.target;
    if (t.dataset && t.dataset.bind) {
      ui[t.dataset.scope][t.dataset.bind] = t.value;
      renderResults(t.dataset.scope);
      return;
    }
    if (!editor) return;
    switch (t.id) {
      case "f-title": editor.title = t.value; break;
      case "f-desc":
        editor.description = t.value;
        $("#desc-count").textContent = `${t.value.length}/160`;
        break;
      case "f-content": editor.content = t.value; updateStats(); break;
      default: return;
    }
    updatePreview();
    queueAutosave();
  });

  document.addEventListener("keydown", (ev) => {
    const t = ev.target;
    if (t.id === "f-tag" && editor) {
      if (ev.key === "Enter" || ev.key === ",") {
        ev.preventDefault();
        addTag(t.value);
      } else if (ev.key === "Backspace" && !t.value && editor.tags.length) {
        editor.tags.pop();
        renderTagBox();
        $("#f-tag").focus();
        updatePreview();
        queueAutosave();
      }
      return;
    }
    const modal = modalEl();
    if (!modal) return;
    if (ev.key === "Escape") {
      if (pendingConfirm) resolveConfirm(false);
      else closeModal();
      return;
    }
    if (ev.key === "Tab") {
      const f = $$('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])', modal).filter(
        (x) => !x.disabled && x.offsetParent !== null
      );
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      const active = document.activeElement;
      if (ev.shiftKey && (active === first || active === modal)) {
        ev.preventDefault();
        last.focus();
      } else if (!ev.shiftKey && active === last) {
        ev.preventDefault();
        first.focus();
      }
    }
  });

  // Keep a tag the person typed but did not confirm with Enter
  document.addEventListener("focusout", (ev) => {
    if (ev.target.id === "f-tag" && ev.target.value.trim() && editor) {
      const v = ev.target.value;
      ev.target.value = "";
      addTag(v);
    }
  });

  document.addEventListener("change", async (ev) => {
    const t = ev.target;
    if (t.id === "f-image" && t.files[0] && editor) {
      try {
        editor.imageUrl = await compressImage(t.files[0]);
        renderCoverBox();
        updatePreview();
        queueAutosave();
      } catch (e) {
        toast(e.message, "error");
      }
      t.value = "";
    } else if (t.id === "import-file" && t.files[0]) {
      const f = t.files[0];
      t.value = "";
      await importData(f);
    }
  });

  window.addEventListener("hashchange", () => {
    if (modalEl()) closeModal(true);
    route();
  });

  /* ---------- boot ---------- */
  async function boot() {
    try {
      backend = useFirebase ? await createFirebaseBackend() : createLocalBackend();
      if (backend.mode === "local" && typeof window.BP_DEMO_SEED === "function") {
        await backend.seed(window.BP_DEMO_SEED);
      }
    } catch (e) {
      const boot = $("#boot");
      boot.classList.add("error");
      boot.innerHTML = `<p>${esc(e.message || "Could not start the app.")}</p><button type="button" class="btn primary" onclick="location.reload()">Reload</button>`;
      return;
    }
    backend.start(onUser);
  }

  boot();
})();
