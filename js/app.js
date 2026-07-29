/* ==========================================================
   WEEKLY PLANNER
   app.js - Part 1
========================================================== */
const savedTheme = localStorage.getItem("theme");

// 2. Default to "dark" if savedTheme is null (never chosen before) or explicitly "dark"
if (savedTheme === "dark" || savedTheme === null) {
    document.body.classList.add("dark");
} else {
    document.body.classList.remove("dark");
}

const STORAGE_KEY = "weeklyPlannerData";

/* ========================================= */

let plannerData = {
    goals: [],
    notes: "",
    days: {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        weekend: [],
        goals: []
    },
    colors: {},
    darkMode: false
};

/* ========================================= */
// document.body.classList.add("dark");
// plannerData.darkMode = true;

const template = document.getElementById("taskTemplate");

const goals = document.getElementById("weeklyGoals");
const notes = document.getElementById("notes");

/* ========================================= */

function updateThemeIcon() {
    const themeIcon = document.getElementById("themeIcon");
    if (!themeIcon) return;
    const isDark = document.body.classList.contains("dark");
    themeIcon.src = isDark ? "icons/dark mode.png" : "icons/light mode.png";
    themeIcon.alt = isDark ? "Dark Mode" : "Light Mode";
}

document.addEventListener("DOMContentLoaded", () => {
    loadPlanner();
    initializeTextAreas();
    initializeButtons();
    updateThemeIcon();
});

/* ========================================= */

function initializeButtons() {
    document.querySelectorAll(".addTaskBtn").forEach(button => {
        button.addEventListener("click", () => {
            const card = button.closest(".card");
            createTask(card.id);
        });
    });
}

/* ========================================= */

function initializeTextAreas() {
    goals.addEventListener("input", () => {
        plannerData.goals = goals.value;
        savePlanner();
    });

    notes.addEventListener("input", () => {
        plannerData.notes = notes.value;
        savePlanner();
    });
}

const notesArea = document.getElementById("notesArea");

if (notesArea) {
    // 1. Capitalize automatically as the user types
    notesArea.addEventListener("input", () => {
        if (notesArea.value.length > 0) {
            // Capitalizes the very first letter while preserving cursor position
            const start = notesArea.selectionStart;
            const end = notesArea.selectionEnd;

            notesArea.value = notesArea.value.charAt(0).toUpperCase() + notesArea.value.slice(1);

            notesArea.setSelectionRange(start, end);
        }
        savePlanner();
    });

    // 2. Blur / deactivate edit when pressing Escape
    notesArea.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            notesArea.blur();
        }
    });
}

// 3. Deactivate notes textarea when clicking outside of it
document.addEventListener("click", (e) => {
    if (notesArea && e.target !== notesArea && document.activeElement === notesArea) {
        notesArea.blur();
    }
});

/* ========================================= */

function createTask(day, text = "", completed = false) {
    const container = document
        .getElementById(day)
        .querySelector(".taskContainer");

    const task = template.content.firstElementChild.cloneNode(true);

    const checkbox = task.querySelector(".taskCheck");
    const taskText = task.querySelector(".taskText");
    const deleteButton = task.querySelector(".deleteTask");

    taskText.textContent = text;
    checkbox.checked = completed;

    if (completed) {
        task.classList.add("completed");
    }

    /* --------------------------------------------------
       1. CHECKBOX TOGGLE
    -------------------------------------------------- */
    checkbox.addEventListener("change", () => {
        task.classList.toggle("completed", checkbox.checked);
        savePlanner();
    });

    /* --------------------------------------------------
       2. EDITABLE TEXT INPUT & AUTO-SAVE
    -------------------------------------------------- */
    taskText.addEventListener("input", () => {
        // Save state on input without re-rendering the element 
        // to preserve exact cursor position
        savePlanner();
    });

    /* Deactivate edit mode when pressing Enter or Escape */
    taskText.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === "Escape") {
            e.preventDefault();
            taskText.blur(); // Unfocus text editing
        }
    });
/* --------------------------------------------------
       2. EDITABLE TEXT INPUT & AUTO-SAVE
    -------------------------------------------------- */
    taskText.addEventListener("input", () => {
        // Save state directly without re-rendering or resetting selection
        plannerData.days[day] = Array.from(
            container.querySelectorAll(".task")
        ).map(t => ({
            text: t.querySelector(".taskText").textContent,
            completed: t.querySelector(".taskCheck").checked
        }));
        
        savePlanner();
    });
    /* --------------------------------------------------
       3. CLICK TASK ROW TO DEACTIVATE EDITING
    -------------------------------------------------- */
    task.addEventListener("click", (e) => {
        // If clicking inside the task row BUT outside the text input, blur/unfocus the text
        if (e.target !== taskText) {
            taskText.blur();
        }
    });

    /* --------------------------------------------------
       4. DELETE TASK
    -------------------------------------------------- */
    deleteButton.addEventListener("click", (e) => {
        e.stopPropagation();
        task.remove();
        savePlanner();
    });

    container.appendChild(task);
    savePlanner();


/* --------------------------------------------------
   5. GLOBAL CONTAINER CLICK DEACTIVATION
   Clicking empty space in task box un-focuses editing
-------------------------------------------------- */
    container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth"
    });

    setTimeout(() => {
        taskText.focus({ preventScroll: true });
    }, 50);
    updateStorage(day);
}

document.addEventListener("click", (e) => {
    // If click is inside a taskContainer or card, but not on editable text, blur active element
    if (e.target.classList.contains("taskContainer") || e.target.classList.contains("card")) {
        if (document.activeElement && document.activeElement.classList.contains("taskText")) {
            document.activeElement.blur();
        }
    }
});
/* ========================================= */

function updateStorage(day) {
    const tasks = [];

    const container = document
        .getElementById(day)
        .querySelector(".taskContainer");

    container.querySelectorAll(".task").forEach(task => {
        tasks.push({
            text: task.querySelector(".taskText").textContent,
            completed: task.querySelector(".taskCheck").checked
        });
    });

    plannerData.days[day] = tasks;
    savePlanner();
}

/* ========================================= */

function savePlanner() {
    plannerData.goals = goals.value;
    plannerData.notes = notes.value;

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(plannerData)
    );
}

/* ========================================= */

function loadPlanner() {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return;

    plannerData = JSON.parse(saved);

    goals.value = plannerData.goals || "";
    notes.value = plannerData.notes || "";

    for (const day in plannerData.days) {
        plannerData.days[day].forEach(task => {
            createTask(
                day,
                task.text,
                task.completed
            );
        });
    }
}

/* ========================================= */

function clearDay(day) {
    const container = document
        .getElementById(day)
        .querySelector(".taskContainer");

    container.innerHTML = "";
    plannerData.days[day] = [];
}

/* ========================================= */

function clearAllDays() {
    Object.keys(plannerData.days).forEach(day => {
        clearDay(day);
    });

    savePlanner();
}

/* ==========================================================
   app.js - Part 2
   Drag & Drop + Colors + Dark Mode
========================================================== */

/* =========================================
   INITIALIZATION
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    initializeDragAndDrop();
    initializeColorPickers();
});

/* =========================================
   DRAG & DROP
========================================= */

function initializeDragAndDrop() {
    document.querySelectorAll(".taskContainer").forEach(container => {
        container.addEventListener("dragover", e => {
            e.preventDefault();

            const afterElement = getDragAfterElement(container, e.clientY);
            const dragging = document.querySelector(".dragging");

            if (!dragging) return;

            if (afterElement == null) {
                container.appendChild(dragging);
            } else {
                container.insertBefore(dragging, afterElement);
            }
        });

        container.addEventListener("drop", () => {
            const day = container.closest(".card").id;
            updateStorage(day);
        });
    });
}

/* ========================================= */

document.addEventListener("dragstart", e => {
    if (!e.target.classList.contains("task")) return;
    e.target.classList.add("dragging");
});

document.addEventListener("dragend", e => {
    if (!e.target.classList.contains("task")) return;
    e.target.classList.remove("dragging");
});

/* ========================================= */

function getDragAfterElement(container, y) {
    const elements = [...container.querySelectorAll(".task:not(.dragging)")];

    return elements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return {
                offset,
                element: child
            };
        }

        return closest;
    }, {
        offset: Number.NEGATIVE_INFINITY
    }).element;
}

/* =========================================
   ENABLE NEW TASKS TO DRAG
========================================= */

const originalCreateTask = createTask;

createTask = function(day, text = "", completed = false) {
    originalCreateTask(day, text, completed);

    const container = document
        .getElementById(day)
        .querySelector(".taskContainer");

    const lastTask = container.lastElementChild;

    if (lastTask) {
        lastTask.draggable = true;
        
        // FIX: Smooth auto-scroll container when new dragging task is initialized
        container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth"
        });
    }
};

/* =========================================
   COLOR PICKERS
========================================= */

function initializeColorPickers() {
    document.querySelectorAll(".colorPicker").forEach(picker => {
        const cardName = picker.dataset.card;

        if (plannerData.colors[cardName]) {
            picker.value = plannerData.colors[cardName];
        }

        applyHeaderColor(cardName, picker.value);

        picker.addEventListener("input", () => {
            plannerData.colors[cardName] = picker.value;
            applyHeaderColor(cardName, picker.value);
            savePlanner();
        });
    });
}

document.querySelectorAll(".colorMenu").forEach(menu => {
    const button = menu.querySelector(".paletteBtn");
    const picker = menu.querySelector(".colorPicker");

    button.addEventListener("click", () => {
        picker.click();
    });
});

document.addEventListener("click", () => {
    document.querySelectorAll(".palettePopup").forEach(menu => {
        menu.classList.remove("show");
    });
});

/* ========================================= */

function applyHeaderColor(cardName, color) {
    const card = document.getElementById(cardName);

    if (!card) {
        console.error("Card not found:", cardName);
        return;
    }

    const header = card.querySelector(".card-header");

    if (header) {
        header.style.backgroundColor = color;
    }
}

/* =========================================
   DARK MODE
========================================= */

const themeToggle = document.getElementById("themeToggle");
const themeText = document.getElementById("themeText");
const themeIcon = document.getElementById("themeIcon");

updateThemeIcon();

if (themeToggle) {
    themeToggle.addEventListener("click", () => {
        document.body.classList.toggle("dark");

        plannerData.darkMode = document.body.classList.contains("dark");

        updateThemeIcon();
        
        localStorage.setItem(
            "theme",
            plannerData.darkMode ? "dark" : "light"
        );
        savePlanner();
    });
}

/* =========================================
   BETTER TASK FOCUS
========================================= */

document.addEventListener("click", e => {
    const btn = e.target.closest(".addTaskBtn");
    if (!btn) return;

    const card = btn.closest(".card");
    if (!card) return;

    setTimeout(() => {
        const tasks = card.querySelectorAll(".taskText");
        const container = card.querySelector(".taskContainer");

        if (container) {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: "smooth"
            });
        }
        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia("(pointer: coarse)").matches;
        if (!isTouchDevice && tasks.length) {
            tasks[tasks.length - 1].focus({ preventScroll: true });
        }
    }, 20);
});

/* =========================================
   RESTORE HEADER COLORS AFTER LOAD
========================================= */

window.addEventListener("load", () => {

    document.querySelectorAll(".colorPicker").forEach(picker => {

        const card = picker.dataset.card;

        if (plannerData.colors[card]) {

            picker.value = plannerData.colors[card];

            applyHeaderColor(card, picker.value);

        }

    });

});

/* ==========================================================
   app.js - Part 3A
   Export • Import • Clear Week
========================================================== */

function reloadPlanner() {
    goals.value = plannerData.goals || "";
    notes.value = plannerData.notes || "";

    Object.keys(plannerData.days).forEach(day => {
        const container = document
            .getElementById(day)
            .querySelector(".taskContainer");

        container.innerHTML = "";
    });

    for (const day in plannerData.days) {
        plannerData.days[day].forEach(task => {
            createTask(
                day,
                task.text,
                task.completed
            );
        });
    }

    document.querySelectorAll(".colorPicker").forEach(picker => {
        const card = picker.dataset.card;

        if (plannerData.colors && plannerData.colors[card]) {
            picker.value = plannerData.colors[card];

            applyHeaderColor(
                card,
                plannerData.colors[card]
            );
        }
    });

    if (plannerData.darkMode) {
        document.body.classList.add("dark");
    } else {
        document.body.classList.remove("dark");
    }
    updateThemeIcon();
}

/* =========================================
   AUTO SAVE EVERY 30 SECONDS
========================================= */

setInterval(() => {
    savePlanner();
}, 30000);

/* ==========================================================
   app.js - Part 3B
   Print • Shortcuts • Final Polish
========================================================== */

/* =========================================
   KEYBOARD SHORTCUTS
========================================= */

document.addEventListener("keydown", e => {
    /* Ctrl + S -> Save */
    if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        savePlanner();
    }

    /* Ctrl + D -> Dark Mode */
    if (e.ctrlKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (themeToggle) themeToggle.click();
    }
});

/* =========================================
   REMOVE EMPTY TASKS
========================================= */

function removeEmptyTasks() {
    Object.keys(plannerData.days).forEach(day => {
        const container = document
            .getElementById(day)
            .querySelector(".taskContainer");

        if (!container) return;

        container.querySelectorAll(".task").forEach(task => {
            const text = task
                .querySelector(".taskText")
                .textContent
                .trim();

            if (text === "") {
                task.remove();
            }
        });

        updateStorage(day);
    });
}

/* =========================================
   SAVE WHEN LEAVING PAGE
========================================= */

window.addEventListener("beforeunload", () => {
    removeEmptyTasks();
    savePlanner();
});

/* =========================================
   AUTO SAVE ON VISIBILITY CHANGE
========================================= */

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        savePlanner();
    }
});

/* =========================================
   TOAST MESSAGE
========================================= */

function showToast(message) {
    let toast = document.getElementById("plannerToast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "plannerToast";
        toast.style.position = "fixed";
        toast.style.bottom = "25px";
        toast.style.right = "25px";
        toast.style.padding = "12px 18px";
        toast.style.background = "#4f8ef7";
        toast.style.color = "white";
        toast.style.borderRadius = "10px";
        toast.style.boxShadow = "0 8px 20px rgba(0,0,0,.15)";
        toast.style.fontWeight = "600";
        toast.style.zIndex = "9999";
        toast.style.opacity = "0";
        toast.style.transition = ".25s";

        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.opacity = "1";

    clearTimeout(showToast.timeout);

    showToast.timeout = setTimeout(() => {
        toast.style.opacity = "0";
    }, 1800);
}



/* =========================================
   ESCAPE TO BLUR TASK
========================================= */

document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;

    if (document.activeElement.classList.contains("taskText")) {
        document.activeElement.blur();
    }
});

/* =========================================
   AUTO TRIM TASKS
========================================= */

document.addEventListener("focusout", e => {
    if (!e.target.classList.contains("taskText")) return;
    e.target.textContent = e.target.textContent.trim();
});

/* =========================================
   CLICK HEADER TO SCROLL TO TOP
========================================= */

document.querySelectorAll(".card-header").forEach(header => {
    header.addEventListener("click", () => {
        const container = header.parentElement.querySelector(".taskContainer");

        if (container) {
            container.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        }
    });
});

/* =========================================
   STARTUP CLEANUP
========================================= */

window.addEventListener("load", () => {
    removeEmptyTasks();
    savePlanner();
});

/* =========================================
   CLEAR ALL BUTTON
========================================= */

const clearButton = document.getElementById("clearWeek");

if (clearButton) {
    clearButton.onclick = function () {
        if (!confirm("Clear the entire planner?")) {
            return;
        }

        const goals = document.getElementById("weeklyGoals");
        if (goals) {
            if (goals.classList.contains("taskContainer")) {
                goals.innerHTML = "";
            } else {
                goals.value = "";
            }
        }

        const notes = document.getElementById("notes");
        if (notes) {
            notes.value = "";
        }

        document.querySelectorAll(".taskContainer").forEach(container => {
            container.innerHTML = "";
        });

        plannerData = {
            goals: [],
            notes: "",
            days: {
                monday: [],
                tuesday: [],
                wednesday: [],
                thursday: [],
                friday: [],
                weekend: []
            },
            colors: plannerData.colors || {},
            darkMode: plannerData.darkMode || false
        };

        localStorage.removeItem(STORAGE_KEY);
        savePlanner();
    };
}