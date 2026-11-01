
// Get form elements
const taskForm = document.getElementById("taskForm");
const taskTitle = document.getElementById("taskTitle");
const taskCategory = document.getElementById("taskCategory");
const taskDueDate = document.getElementById("taskDueDate");
const taskDueTime = document.getElementById("taskDueTime");

// Buttons
const saveButton = document.getElementById("saveButton");
const cancelEdit = document.getElementById("cancelEdit");
const formHeading = document.getElementById("formHeading");
const enableNotifications = document.getElementById("enableNotifications");

// Task list elements
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");

// Search and filters
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const filterButtons = document.querySelectorAll(".filter-button");

// Other elements
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


// Display toast message
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


// Format time for display
function formatTime(timeString) {
    if (!timeString) return "";

    const date = new Date("1970-01-01T" + timeString + ":00");

    return date.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit"
    });
}


// Get the exact due date and time of a task
function getTaskDueTimestamp(task) {
    if (!task.dueDate || !task.dueTime) {
        return null;
    }

    const timestamp = new Date(
        `${task.dueDate}T${task.dueTime}:00`
    ).getTime();

    return Number.isNaN(timestamp) ? null : timestamp;
}


// Check whether a task is overdue
function isOverdue(task) {
    if (!task.dueDate || task.completed) {
        return false;
    }

    // If both date and time are available,
    // check the exact due date and time.
    if (task.dueTime) {
        const dueTimestamp = getTaskDueTimestamp(task);

        return dueTimestamp !== null &&
            Date.now() > dueTimestamp;
    }

    // Otherwise, check only the due date.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return new Date(task.dueDate + "T00:00:00") < today;
}


// Update notification button text
function updateNotificationButton() {
    if (!enableNotifications) return;

    if (!("Notification" in window)) {
        enableNotifications.textContent = "Notifications not supported";
        enableNotifications.disabled = true;
        return;
    }

    if (Notification.permission === "granted") {
        enableNotifications.textContent = "Notifications enabled";
    } else if (Notification.permission === "denied") {
        enableNotifications.textContent = "Notifications blocked";
    } else {
        enableNotifications.textContent = "Enable notifications";
    }
}


// Enable browser notifications
if (enableNotifications) {
    enableNotifications.addEventListener("click", async () => {

        if (!("Notification" in window)) {
            showToast("Your browser does not support notifications.");
            return;
        }

        if (Notification.permission === "granted") {
            showToast("Notifications are already enabled.");
            checkTaskReminders();
            return;
        }

        if (Notification.permission === "denied") {
            showToast(
                "Notifications are blocked. Allow them in browser settings."
            );
            return;
        }

        try {
            const permission = await Notification.requestPermission();

            updateNotificationButton();

            if (permission === "granted") {
                showToast("Browser notifications enabled!");
                checkTaskReminders();
            } else {
                showToast("Notification permission was not granted.");
            }

        } catch (error) {
            showToast("Unable to enable notifications.");
        }
    });
}


// Check tasks and send reminders 5 minutes before due time
function checkTaskReminders() {

    // Do not continue if notifications are unavailable
    // or the user has not granted permission.
    if (
        !("Notification" in window) ||
        Notification.permission !== "granted"
    ) {
        return;
    }

    const currentTime = Date.now();
    let tasksUpdated = false;

    tasks.forEach(task => {

        // Ignore completed tasks
        if (task.completed) {
            return;
        }

        // A task needs both date and time
        if (!task.dueDate || !task.dueTime) {
            return;
        }

        // Do not send the same reminder more than once
        if (task.reminderSent) {
            return;
        }

        const dueTimestamp = getTaskDueTimestamp(task);

        if (dueTimestamp === null) {
            return;
        }

        // Calculate reminder time: 5 minutes before due time
        const reminderTimestamp = dueTimestamp - (5 * 60 * 1000);

        // Send only during the reminder window
        if (
            currentTime >= reminderTimestamp &&
            currentTime < dueTimestamp
        ) {
            try {
                const notification = new Notification(
                    "Task Reminder",
                    {
                        body: `"${task.title}" is due in 5 minutes!`,
                        tag: "task-reminder-" + task.id
                    }
                );

                // Mark the reminder as sent
                task.reminderSent = true;
                tasksUpdated = true;

                notification.onclick = () => {
                    window.focus();
                    notification.close();
                };

            } catch (error) {
                console.error("Notification error:", error);
            }
        }
    });

    // Save reminder status to prevent duplicate notifications
    if (tasksUpdated) {
        saveTasks();
    }
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
            task.completed
                ? "Task completed!"
                : "Task marked active."
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

    if (task.dueDate) {

        dueDate.textContent = "Due " + formatDate(task.dueDate);

        if (task.dueTime) {
            dueDate.textContent += " at " + formatTime(task.dueTime);
        }

    } else {
        dueDate.textContent = "No due date";
    }

    if (isOverdue(task)) {
        dueDate.classList.add("overdue");
        dueDate.textContent += " · Overdue";
    }

    taskMeta.append(category, dueDate);
    taskContent.append(title, taskMeta);
    taskMain.append(checkbox, taskContent);


    // Edit and delete buttons
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
    const dueDate = taskDueDate.value;
    const dueTime = taskDueTime ? taskDueTime.value : "";

    if (!title) {
        showToast("Please enter a task title.");
        taskTitle.focus();
        return;
    }

    // A time cannot be used without a due date
    if (dueTime && !dueDate) {
        showToast("Please select a due date for the task time.");
        taskDueDate.focus();
        return;
    }


    // Update existing task
    if (editingTaskId !== null) {

        const task = tasks.find(item => item.id === editingTaskId);

        if (task) {

            // Reset reminder status only if date or time changes
            const scheduleChanged =
                task.dueDate !== dueDate ||
                (task.dueTime || "") !== dueTime;

            task.title = title;
            task.category = taskCategory.value;
            task.dueDate = dueDate;
            task.dueTime = dueTime;

            if (scheduleChanged) {
                task.reminderSent = false;
            }

            showToast("Task updated successfully!");
        }

        editingTaskId = null;

    } else {

        // Create a new task
        const newTask = {
            id: Date.now().toString() +
                Math.random().toString(36).slice(2, 7),

            title: title,
            category: taskCategory.value,
            dueDate: dueDate,
            dueTime: dueTime,
            completed: false,
            reminderSent: false
        };

        tasks.unshift(newTask);

        showToast("Task added successfully!");
    }

    saveTasks();
    resetForm();
    renderTasks();

    // Check whether a reminder is due
    checkTaskReminders();
});


// Load a task into the form for editing
function editTask(id) {

    const task = tasks.find(item => item.id === id);

    if (!task) return;

    editingTaskId = id;

    taskTitle.value = task.title;
    taskCategory.value = task.category;
    taskDueDate.value = task.dueDate || "";

    if (taskDueTime) {
        taskDueTime.value = task.dueTime || "";
    }

    formHeading.textContent = "Edit Task";
    saveButton.textContent = "Update Task";
    cancelEdit.hidden = false;

    taskTitle.focus();
}


// Delete a task
function deleteTask(id) {

    const confirmed = confirm(
        "Are you sure you want to delete this task?"
    );

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


// Update the notification button when the page loads
updateNotificationButton();


// Check reminders immediately when the page loads
checkTaskReminders();


// Check for reminders every 15 seconds
// This works while the website is open in the browser.
setInterval(checkTaskReminders, 15000);
