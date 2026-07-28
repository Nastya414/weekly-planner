/* ==========================================================
   WEEKLY PLANNER
   app.js - Part 1
========================================================== */

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
document.body.classList.add("dark");
plannerData.darkMode = true;


const template = document.getElementById("taskTemplate");

const goals = document.getElementById("weeklyGoals");
const notes = document.getElementById("notes");

/* ========================================= */

document.addEventListener("DOMContentLoaded", () => {

    loadPlanner();

    initializeTextAreas();

    initializeButtons();

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

    /* ----------------------- */

    checkbox.addEventListener("change", () => {

        task.classList.toggle("completed", checkbox.checked);

        updateStorage(day);

    });

    /* ----------------------- */

    taskText.addEventListener("input", () => {

        updateStorage(day);

    });

    /* ----------------------- */

    taskText.addEventListener("keydown", e => {

        if (e.key === "Enter") {

            e.preventDefault();

            createTask(day);

        }

    });

    /* ----------------------- */

    deleteButton.addEventListener("click", () => {

        task.remove();

        updateStorage(day);

    });

    /* ----------------------- */

    container.appendChild(task);

    taskText.focus();

    updateStorage(day);

}

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

    // initializeTheme();

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
// document.querySelectorAll(".paletteBtn").forEach(button=>{

//     button.addEventListener("click",e=>{

//         e.stopPropagation();

//         const popup=button.nextElementSibling;

//         document.querySelectorAll(".palettePopup").forEach(menu=>{

//             if(menu!==popup){

//                 menu.classList.remove("show");

//             }

//         });

//         popup.classList.toggle("show");

//     });

// });

document.addEventListener("click",()=>{

    document.querySelectorAll(".palettePopup").forEach(menu=>{

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

// function initializeTheme() {

//     const button = document.getElementById("themeToggle");

//     if (plannerData.darkMode) {

//         document.body.classList.add("dark");

//         button.textContent = "Light Mode";

//     }

//     button.addEventListener("click", () => {

//         document.body.classList.toggle("dark");

//         plannerData.darkMode = document.body.classList.contains("dark");

//         button.textContent = plannerData.darkMode
//             ? "Light Mode"
//             : "🌙 Dark Mode";

//         savePlanner();

//     });

// }

const themeToggle = document.getElementById("themeToggle");

const themeText = document.getElementById("themeText");

const themeIcon = document.getElementById("themeIcon");

themeToggle.addEventListener("click", () => {

    document.body.classList.toggle("dark");

    plannerData.darkMode = document.body.classList.contains("dark");

    if(plannerData.darkMode){

        themeIcon.textContent = "🌙";

    }else{

        themeIcon.textContent = "☀️";

    }

    savePlanner();

});

/* =========================================
   BETTER TASK FOCUS
========================================= */

document.addEventListener("click", e => {

    if (!e.target.classList.contains(".addTaskBtn")) return;

    const card = e.target.closest(".card");

    setTimeout(() => {

        const tasks = card.querySelectorAll(".taskText");

        if (tasks.length) {

            tasks[tasks.length - 1].focus();

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

/* =========================================
   EXPORT
========================================= */

// const exportBtn = document.getElementById("exportBtn");

// exportBtn.addEventListener("click", exportPlanner);

// function exportPlanner() {

//     savePlanner();

//     const json = JSON.stringify(plannerData, null, 4);

//     const blob = new Blob([json], {
//         type: "application/json"
//     });

//     const url = URL.createObjectURL(blob);

//     const link = document.createElement("a");

//     const today = new Date();

//     const filename =
//         `WeeklyPlanner-${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}.json`;

//     link.href = url;
//     link.download = filename;

//     document.body.appendChild(link);

//     link.click();

//     document.body.removeChild(link);

//     URL.revokeObjectURL(url);

// }

/* =========================================
   IMPORT
========================================= */

// const importButton = document.getElementById("importBtn");
// const importFile = document.getElementById("importFile");

// importButton.addEventListener("click", () => {

//     importFile.click();

// });

// /* ========================================= */

// importFile.addEventListener("change", event => {

//     const file = event.target.files[0];

//     if (!file) return;

//     const reader = new FileReader();

//     reader.onload = e => {

//         try {

//             const imported = JSON.parse(e.target.result);

//             if (!imported.days) {

//                 throw new Error();

//             }

//             plannerData = imported;

//             savePlanner();

//             reloadPlanner();

//         }

//         catch {

//             alert("Invalid planner file.");

//         }

//     };

//     reader.readAsText(file);

// });

/* =========================================
   RELOAD UI
========================================= */

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

        if (plannerData.colors &&
            plannerData.colors[card]) {

            picker.value = plannerData.colors[card];

            applyHeaderColor(

                card,
                plannerData.colors[card]

            );

        }

    });

    if (plannerData.darkMode) {

        document.body.classList.add("dark");

        themeToggle.textContent = "Light Mode";

    }

    else {

        document.body.classList.remove("dark");

        themeToggle.textContent = "🌙 Dark Mode";

    }

}

/* ========================================= */

// function clearWeek() {

//     const answer = confirm(
//         "Clear all tasks, notes and weekly goals?"
//     );

//     if (!answer) return;

//     goals.value = "";
//     notes.value = "";

//     plannerData.goals = "";
//     plannerData.notes = "";

//     Object.keys(plannerData.days).forEach(day => {

//         plannerData.days[day] = [];

//         const container = document
//             .getElementById(day)
//             .querySelector(".taskContainer");

//         container.innerHTML = "";

//     });

//     savePlanner();

// }

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
   PRINT
========================================= */

// const printBtn = document.getElementById("printBtn");

// printBtn.addEventListener("click", () => {
//     window.print();
// });

/* =========================================
   KEYBOARD SHORTCUTS
========================================= */

document.addEventListener("keydown", e => {

    /* Ctrl + S -> Save */

    if (e.ctrlKey && e.key.toLowerCase() === "s") {

        e.preventDefault();

        savePlanner();

        showToast("Planner Saved");

    }

    /* Ctrl + P -> Print */

    if (e.ctrlKey && e.key.toLowerCase() === "p") {

        e.preventDefault();

        window.print();

    }

    /* Ctrl + D -> Dark Mode */

    if (e.ctrlKey && e.key.toLowerCase() === "d") {

        e.preventDefault();

        themeToggle.click();

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
   DOUBLE CLICK TO ADD TASK
========================================= */

document.querySelectorAll(".taskContainer").forEach(container => {

    container.addEventListener("dblclick", () => {

        const day = container.closest(".card").id;

        createTask(day);

    });

});

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
   VERSION
========================================= */

console.log(
    "%cWeekly Planner v1.0 Loaded",
    "color:#4f8ef7;font-size:14px;font-weight:bold;"
);

const clearButton = document.getElementById("clearWeek");

if (clearButton) {
    clearButton.onclick = function () {

        if (!confirm("Clear the entire planner?")) {
            return;
        }

        // Clear goals
        const goals = document.getElementById("weeklyGoals");
        if (goals) {
            if (goals.classList.contains("taskContainer")) {
                goals.innerHTML = "";
            } else {
                goals.value = "";
            }
        }

        // Clear notes
        const notes = document.getElementById("notes");
        if (notes) {
            notes.value = "";
        }

        // Clear all task containers
        document.querySelectorAll(".taskContainer").forEach(container => {
            container.innerHTML = "";
        });

        // Reset planner data
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