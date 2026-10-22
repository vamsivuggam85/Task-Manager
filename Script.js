
const taskForm = document.getElementById("taskForm");
const taskTitle = document.getElementById("taskTitle");
const taskCategory = document.getElementById("taskCategory");
const taskDueDate = document.getElementById("taskDueDate");

const saveButton = document.getElementById("saveButton");
const cancelEdit = document.getElementById("cancelEdit");
const formHeading = document.getElementById("formHeading");

const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");

const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const filterButtons = document.querySelectorAll(".filter-button");

const clearCompleted = document.getElementById("clearCompleted");
const toast = document.getElementById("toast");

// Statistics
const totalCount = document.getElementById("totalCount");
const activeCount = document.getElementById("activeCount");
const completedCount = document.getElementById("completedCount");
const completionRate = document.getElementById("completionRate");
const todayLabel = document.getElementById("todayLabel");
const footerSummary = document.getElementById("footerSummary");
const visibleCount = document.getElementById("visibleCount");

// Load saved tasks from localStorage
let tasks = [];

try {
    const savedTasks = JSON.parse(localStorage.getItem("taskflowTasks"));
    tasks = Array.isArray(savedTasks) ? savedTasks : [];
} catch (error) {
    tasks = [];
}

let currentFilter = "All";
let editingTaskId = null;
let toastTimeout;

// Save tasks to localStorage
function saveTasks() {
    localStorage.setItem("taskflowTasks", JSON.stringify(tasks));
}

// Display notification
function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return "No due date";

    const date = new Date(dateString + "T00:00:00");

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

// Check whether a task is overdue
function isOverdue(task) {
    if (!task.dueDate || task.completed) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return new Date(task.dueDate + "T00:00:00") < today;
}

// Create a task element safely
function createTaskElement(task) {
    const taskCard = document.createElement("article");
    taskCard.className = "task-card";

    if (task.completed) {
        taskCard.classList.add("completed");
    }

    const taskMain = document.createElement("div");
    taskMain.className = "task-main";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", "Mark task completed");

    checkbox.addEventListener("change", () => {
        task.completed = checkbox.checked;
        saveTasks();
        renderTasks();

        showToast(
            task.completed ? "Task completed!" : "Task marked active."
        );
    });

    const taskContent = document.createElement("div");
    taskContent.className = "task-content";

    const title = document.createElement("h3");
    title.className = "task-title";
    title.textContent = task.title;

    const taskMeta = document.createElement("div");
    taskMeta.className = "task-meta";

    const category = document.createElement("span");
    category.className = "task-category";
    category.textContent = task.category;

    const dueDate = document.createElement("span");
    dueDate.className = "task-due-date";
    dueDate.textContent = task.dueDate
        ? "Due " + formatDate(task.dueDate)
        : "No due date";

    if (isOverdue(task)) {
        dueDate.classList.add("overdue");
        dueDate.textContent += " · Overdue";
    }

    taskMeta.append(category, dueDate);
    taskContent.append(title, taskMeta);
    taskMain.append(checkbox, taskContent);

    const taskActions = document.createElement("div");
    taskActions.className = "task-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "edit-button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => {
        editTask(task.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
        deleteTask(task.id);
    });

    taskActions.append(editButton, deleteButton);
    taskCard.append(taskMain, taskActions);

    return taskCard;
}

// Display tasks based on filters and search
function renderTasks() {
    taskList.replaceChildren();

    const searchText = searchInput.value.trim().toLowerCase();
    const selectedCategory = categoryFilter.value;

    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title
            .toLowerCase()
            .includes(searchText);

        const matchesCategory =
            selectedCategory === "All" ||
            task.category === selectedCategory;

        const matchesStatus =
            currentFilter === "All" ||
            (currentFilter === "Active" && !task.completed) ||
            (currentFilter === "Completed" && task.completed);

        return matchesSearch && matchesCategory && matchesStatus;
    });

    // Show matching tasks
    filteredTasks.forEach(task => {
        taskList.appendChild(createTaskElement(task));
    });

    // Empty state
    if (filteredTasks.length === 0) {
        emptyState.hidden = false;

        const emptyTitle = document.getElementById("emptyTitle");
        const emptyMessage = document.getElementById("emptyMessage");

        if (tasks.length === 0) {
            emptyTitle.textContent = "No tasks yet";
            emptyMessage.textContent =
                "Add your first task to get started.";
        } else {
            emptyTitle.textContent = "No matching tasks";
            emptyMessage.textContent =
                "Try changing your search or filters.";
        }
    } else {
        emptyState.hidden = true;
    }

    updateStatistics(filteredTasks.length);
}

// Update dashboard statistics
function updateStatistics(numberVisible) {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const active = total - completed;

    const rate = total === 0
        ? 0
        : Math.round((completed / total) * 100);

    totalCount.textContent = total;
    activeCount.textContent = active;
    completedCount.textContent = completed;
    completionRate.textContent = rate + "%";
    visibleCount.textContent = numberVisible;

    footerSummary.textContent =
        `${completed} of ${total} tasks completed`;

    const today = new Date();

    todayLabel.textContent = today.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "short"
    });
}

// Add a new task or update an existing one
taskForm.addEventListener("submit", event => {
    event.preventDefault();

    const title = taskTitle.value.trim();

    if (!title) {
        showToast("Please enter a task title.");
        taskTitle.focus();
        return;
    }

    if (editingTaskId !== null) {
        const task = tasks.find(item => item.id === editingTaskId);

        if (task) {
            task.title = title;
            task.category = taskCategory.value;
            task.dueDate = taskDueDate.value;

            showToast("Task updated successfully!");
        }

        editingTaskId = null;
    } else {
        const newTask = {
            id: Date.now().toString() +
                Math.random().toString(36).slice(2, 7),
            title: title,
            category: taskCategory.value,
            dueDate: taskDueDate.value,
            completed: false
        };

        tasks.unshift(newTask);
        showToast("Task added successfully!");
    }

    saveTasks();
    resetForm();
    renderTasks();
});

// Load a task into the form for editing
function editTask(id) {
    const task = tasks.find(item => item.id === id);

    if (!task) return;

    editingTaskId = id;

    taskTitle.value = task.title;
    taskCategory.value = task.category;
    taskDueDate.value = task.dueDate || "";

    formHeading.textContent = "Edit Task";
    saveButton.textContent = "Update Task";
    cancelEdit.hidden = false;

    taskTitle.focus();
}

// Delete a task
function deleteTask(id) {
    const confirmed = confirm("Are you sure you want to delete this task?");

    if (!confirmed) return;

    tasks = tasks.filter(task => task.id !== id);

    if (editingTaskId === id) {
        resetForm();
    }

    saveTasks();
    renderTasks();
    showToast("Task deleted.");
}

// Reset the form
function resetForm() {
    taskForm.reset();
    editingTaskId = null;

    formHeading.textContent = "Add New Task";
    saveButton.textContent = "Add Task";
    cancelEdit.hidden = true;
}

// Cancel editing
cancelEdit.addEventListener("click", () => {
    resetForm();
});

// Search tasks
searchInput.addEventListener("input", renderTasks);

// Filter by category
categoryFilter.addEventListener("change", renderTasks);

// All, Active, Completed filter buttons
filterButtons.forEach(button => {
    button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;

        filterButtons.forEach(item => {
            const isActive = item === button;

            item.classList.toggle("active", isActive);
            item.setAttribute("aria-pressed", String(isActive));
        });

        renderTasks();
    });
});

// Delete all completed tasks
clearCompleted.addEventListener("click", () => {
    const completedTasks = tasks.filter(task => task.completed);

    if (completedTasks.length === 0) {
        showToast("There are no completed tasks to clear.");
        return;
    }

    const confirmed = confirm(
        `Delete all ${completedTasks.length} completed task(s)?`
    );

    if (!confirmed) return;

    tasks = tasks.filter(task => !task.completed);

    if (
        editingTaskId !== null &&
        !tasks.some(task => task.id === editingTaskId)
    ) {
        resetForm();
    }

    saveTasks();
    renderTasks();
    showToast("Completed tasks cleared.");
});

// Display the initial task list
renderTasks();
