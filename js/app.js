/* ==========================================================
   WEEKLY PLANNER — app.js
   Clean rewrite: Firebase sync, Enter-to-add, no auto-focus,
   notes persistence, drag & drop reorder.
========================================================== */

"use strict";

/* =========================================
   CONSTANTS & STATE
========================================= */

const STORAGE_KEY = "weeklyPlannerData";

const DAYS = ["goals", "monday", "tuesday", "wednesday", "thursday", "friday", "weekend"];

let plannerData = {
    notes: "",
    days: {
        goals: [],
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        weekend: []
    },
    colors: {},
    darkMode: false
};

let currentUser = null;
let cloudUnsub = null;     // Firestore real-time listener unsubscribe
let saveTimer = null;      // Debounce timer for saves

/* =========================================
   THEME — apply before DOM paint
========================================= */

(function applyThemeEarly() {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
        document.body.classList.remove("dark");
    } else {
        // default: dark
        document.body.classList.add("dark");
    }
})();

/* =========================================
   UTILITIES
========================================= */

function updateThemeIcon() {
    const icon = document.getElementById("themeIcon");
    if (!icon) return;
    const dark = document.body.classList.contains("dark");
    icon.src = dark ? "icons/dark mode.png" : "icons/light mode.png";
    icon.alt = dark ? "Dark Mode" : "Light Mode";
}

function applyHeaderColor(cardId, color) {
    const card = document.getElementById(cardId);
    if (!card) return;
    const header = card.querySelector(".card-header");
    if (header) header.style.backgroundColor = color;
}

/* =========================================
   SAVE & LOAD
========================================= */

/** Debounced save — writes to localStorage (always) and Firestore (if signed in). */
function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(commitSave, 400);
}

function commitSave() {
    // Pull notes from textarea
    const notesEl = document.getElementById("notesArea");
    if (notesEl) plannerData.notes = notesEl.value;

    plannerData.darkMode = document.body.classList.contains("dark");

    localStorage.setItem(STORAGE_KEY, JSON.stringify(plannerData));

    // Cloud save
    if (currentUser && window._fbDb && window._fbFns) {
        const ref = window._fbFns.doc(window._fbDb, "user_planners", currentUser.uid);
        window._fbFns.setDoc(ref, plannerData, { merge: true }).catch(err =>
            console.warn("Cloud save error:", err)
        );
    }
}

function loadFromLocal() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
        const parsed = JSON.parse(raw);
        mergePlannerData(parsed);
    } catch (e) {
        console.warn("Failed to parse localStorage:", e);
    }
}

/** Merge incoming data into plannerData, then re-render. */
function mergePlannerData(incoming) {
    if (!incoming) return;

    plannerData.notes = incoming.notes != null ? incoming.notes : plannerData.notes;
    plannerData.darkMode = incoming.darkMode != null ? incoming.darkMode : plannerData.darkMode;
    plannerData.colors = incoming.colors || plannerData.colors || {};

    if (incoming.days) {
        for (const day of DAYS) {
            if (Array.isArray(incoming.days[day])) {
                plannerData.days[day] = incoming.days[day];
            }
        }
    }
}

/* =========================================
   RENDER
========================================= */

function renderAll() {
    // Notes — only update if not actively editing
    const notesEl = document.getElementById("notesArea");
    if (notesEl && document.activeElement !== notesEl) {
        notesEl.value = plannerData.notes || "";
    }

    // Theme
    if (plannerData.darkMode) {
        document.body.classList.add("dark");
    } else {
        document.body.classList.remove("dark");
    }
    updateThemeIcon();

    // Colors
    document.querySelectorAll(".colorPicker").forEach(picker => {
        const id = picker.dataset.card;
        if (plannerData.colors[id]) {
            picker.value = plannerData.colors[id];
            applyHeaderColor(id, plannerData.colors[id]);
        }
    });

    // Skip task re-render if user is actively editing a task
    if (document.activeElement && document.activeElement.classList.contains("taskText")) return;

    // Tasks
    for (const day of DAYS) {
        const cardId = day === "goals" ? "goals" : day;
        const card = document.getElementById(cardId);
        if (!card) continue;
        const container = card.querySelector(".taskContainer");
        if (!container) continue;
        container.innerHTML = "";
        const tasks = plannerData.days[day] || [];
        tasks.forEach(t => addTaskToDOM(day, t.text, t.completed));
    }
}

/* =========================================
   TASK DOM
========================================= */

const taskTemplate = document.getElementById("taskTemplate");

/**
 * Creates a task in the DOM (does NOT save).
 * Use createTask() for user-triggered adds (which also saves).
 */
function addTaskToDOM(day, text = "", completed = false) {
    const cardId = day;
    const card = document.getElementById(cardId);
    if (!card) return null;
    const container = card.querySelector(".taskContainer");
    if (!container || !taskTemplate) return null;

    const task = taskTemplate.content.firstElementChild.cloneNode(true);
    task.draggable = true;

    const checkbox = task.querySelector(".taskCheck");
    const taskText = task.querySelector(".taskText");
    const deleteBtn = task.querySelector(".deleteTask");

    taskText.textContent = text;
    checkbox.checked = completed;
    if (completed) task.classList.add("completed");

    // Checkbox
    checkbox.addEventListener("change", () => {
        task.classList.toggle("completed", checkbox.checked);
        saveDay(day);
    });

    // Text editing — save on input
    taskText.addEventListener("input", () => saveDay(day));

    // Enter key → add new task below
    taskText.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            e.preventDefault();
            taskText.blur();
            createTask(day);
        } else if (e.key === "Escape") {
            e.preventDefault();
            taskText.blur();
        }
    });

    // Trim on blur
    taskText.addEventListener("blur", () => {
        taskText.textContent = taskText.textContent.trim();
        saveDay(day);
    });

    // Click on task row (outside text) → blur editing
    task.addEventListener("click", e => {
        if (!e.target.closest(".taskText") &&
            !e.target.closest(".taskCheck") &&
            !e.target.closest(".deleteTask")) {
            taskText.blur();
        }
    });

    // Delete
    deleteBtn.addEventListener("click", e => {
        e.stopPropagation();
        task.remove();
        saveDay(day);
    });

    container.appendChild(task);
    return task;
}

/** Creates a task, saves, and focuses the new task text. */
function createTask(day, text = "", completed = false) {
    const task = addTaskToDOM(day, text, completed);
    saveDay(day);

    if (task) {
        // Scroll to new task
        const container = task.closest(".taskContainer");
        if (container) container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });

        // Focus — skip on touch devices to avoid keyboard popup
        const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
        if (!isTouch) {
            const span = task.querySelector(".taskText");
            setTimeout(() => {
                if (span) {
                    span.focus();
                    // Place cursor at end (Safari fix)
                    const sel = window.getSelection();
                    const range = document.createRange();
                    range.selectNodeContents(span);
                    range.collapse(false);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }, 30);
        }
    }
}

/** Reads the container and persists plannerData.days[day] + schedules save. */
function saveDay(day) {
    const cardId = day;
    const card = document.getElementById(cardId);
    if (!card) return;
    const container = card.querySelector(".taskContainer");
    if (!container) return;

    plannerData.days[day] = Array.from(container.querySelectorAll(".task")).map(t => ({
        text: t.querySelector(".taskText").textContent.trim(),
        completed: t.querySelector(".taskCheck").checked
    }));

    scheduleSave();
}

/* =========================================
   DRAG & DROP (native HTML5, no text conflict)
========================================= */

function initDragAndDrop() {
    // dragstart: only fire if NOT clicking on text/checkbox/delete
    document.addEventListener("dragstart", e => {
        const task = e.target.closest(".task");
        if (!task) return;
        if (e.target.closest(".taskText, .taskCheck, .checkbox-wrapper, .deleteTask")) {
            e.preventDefault();
            return;
        }
        task.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", "");
    });

    document.addEventListener("dragend", e => {
        const task = e.target.closest(".task");
        if (!task) return;
        task.classList.remove("dragging");
        const card = task.closest(".card");
        if (card) saveDay(card.id);
    });

    document.querySelectorAll(".taskContainer").forEach(container => {
        container.addEventListener("dragover", e => {
            e.preventDefault();
            const dragging = document.querySelector(".task.dragging");
            if (!dragging) return;
            const after = getDragAfterElement(container, e.clientY);
            if (after == null) {
                container.appendChild(dragging);
            } else {
                container.insertBefore(dragging, after);
            }
        });

        container.addEventListener("drop", e => {
            e.preventDefault();
            const card = container.closest(".card");
            if (card) saveDay(card.id);
        });
    });
}

function getDragAfterElement(container, y) {
    const els = [...container.querySelectorAll(".task:not(.dragging)")];
    return els.reduce((closest, el) => {
        const box = el.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) return { offset, element: el };
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

/* =========================================
   COLOR PICKERS
========================================= */

function initColorPickers() {
    document.querySelectorAll(".colorPicker").forEach(picker => {
        const id = picker.dataset.card;
        if (plannerData.colors[id]) {
            picker.value = plannerData.colors[id];
            applyHeaderColor(id, plannerData.colors[id]);
        } else {
            applyHeaderColor(id, picker.value);
        }

        picker.addEventListener("input", () => {
            plannerData.colors[id] = picker.value;
            applyHeaderColor(id, picker.value);
            scheduleSave();
        });
    });

    document.querySelectorAll(".colorMenu").forEach(menu => {
        const btn = menu.querySelector(".paletteBtn");
        const picker = menu.querySelector(".colorPicker");
        if (btn && picker) btn.addEventListener("click", () => picker.click());
    });
}

/* =========================================
   THEME TOGGLE
========================================= */

function initTheme() {
    const toggle = document.getElementById("themeToggle");
    if (!toggle) return;
    toggle.addEventListener("click", () => {
        document.body.classList.toggle("dark");
        plannerData.darkMode = document.body.classList.contains("dark");
        updateThemeIcon();
        localStorage.setItem("theme", plannerData.darkMode ? "dark" : "light");
        scheduleSave();
    });
}

/* =========================================
   NOTES
========================================= */

function initNotes() {
    const notesEl = document.getElementById("notesArea");
    if (!notesEl) return;

    notesEl.addEventListener("input", () => {
        // Auto-capitalise first letter
        if (notesEl.value.length > 0) {
            const start = notesEl.selectionStart;
            const end = notesEl.selectionEnd;
            notesEl.value = notesEl.value.charAt(0).toUpperCase() + notesEl.value.slice(1);
            notesEl.setSelectionRange(start, end);
        }
        plannerData.notes = notesEl.value;
        scheduleSave();
    });

    notesEl.addEventListener("keydown", e => {
        if (e.key === "Escape") notesEl.blur();
    });

    // Blur notes when clicking outside
    document.addEventListener("pointerdown", e => {
        if (document.activeElement === notesEl && !notesEl.contains(e.target)) {
            notesEl.blur();
        }
    });
}

/* =========================================
   CLEAR BUTTON
========================================= */

function initClearButton() {
    const btn = document.getElementById("clearWeek");
    if (!btn) return;
    btn.addEventListener("click", () => {
        if (!confirm("Clear the entire planner?")) return;

        // Clear tasks
        DAYS.forEach(day => {
            const card = document.getElementById(day);
            if (!card) return;
            const container = card.querySelector(".taskContainer");
            if (container) container.innerHTML = "";
            plannerData.days[day] = [];
        });

        // Clear notes
        const notesEl = document.getElementById("notesArea");
        if (notesEl) notesEl.value = "";
        plannerData.notes = "";

        localStorage.removeItem(STORAGE_KEY);
        commitSave();
    });
}

/* =========================================
   ADD TASK BUTTONS
========================================= */

function initAddButtons() {
    document.querySelectorAll(".addTaskBtn").forEach(btn => {
        btn.addEventListener("click", () => {
            const card = btn.closest(".card");
            if (card) createTask(card.id);
        });
    });
}

/* =========================================
   KEYBOARD SHORTCUTS (global)
========================================= */

function initKeyboardShortcuts() {
    document.addEventListener("keydown", e => {
        if (e.ctrlKey && e.key.toLowerCase() === "s") {
            e.preventDefault();
            commitSave();
        }
        if (e.ctrlKey && e.key.toLowerCase() === "d") {
            e.preventDefault();
            document.getElementById("themeToggle")?.click();
        }
        if (e.key === "Escape" && document.activeElement?.classList.contains("taskText")) {
            document.activeElement.blur();
        }
    });
}

/* =========================================
   STARTUP
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Load local data first (instant, no flicker)
    loadFromLocal();
    renderAll();

    // 2. Wire up UI
    initTheme();
    initNotes();
    initAddButtons();
    initClearButton();
    initDragAndDrop();
    initColorPickers();
    initKeyboardShortcuts();
    updateThemeIcon();

    window.addEventListener("storage", (e) => {
        if (e.key === STORAGE_KEY && e.newValue) {
            try {
                const incoming = JSON.parse(e.newValue);
                mergePlannerData(incoming);
                renderAll();
            } catch (err) {
                console.warn("Storage sync error:", err);
            }
        }
    });
    window.addEventListener("blur", () => {
    if (saveTimer) {
        clearTimeout(saveTimer);
        commitSave();
    }
    });
    // 3. Firebase auth (async — fires when Firebase module loads)
    initAuth();

    // 4. Make sure nothing is focused on load
    requestAnimationFrame(() => {
        if (document.activeElement && document.activeElement !== document.body) {
            document.activeElement.blur();
        }
    });

    // 5. Auto-save every 30s as a safety net
    setInterval(commitSave, 30000);
});

// Save before tab closes
window.addEventListener("beforeunload", commitSave);
window.addEventListener("visibilitychange", () => { if (document.hidden) commitSave(); });