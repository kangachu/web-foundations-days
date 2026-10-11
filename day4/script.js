const noteText = document.getElementById("note-text");
const charCount = document.getElementById("char-count");
const wordCount = document.getElementById("word-count");
const clearBtn = document.getElementById("clear-btn");
const themeToggle = document.getElementById("theme-toggle");

function updateCounts() {
  const text = noteText.value;
  const chars = text.length;

  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;

  charCount.textContent = `${chars} / 200 characters`;
  wordCount.textContent = `${words} words`;

  charCount.classList.remove("warning", "over");
  if (chars > 200) {
    charCount.classList.add("over");
  } else if (chars > 180) {
    charCount.classList.add("warning");
  }
}

function clearNote() {
  noteText.value = "";
  localStorage.removeItem("quicknotes_draft");
  updateCounts();
}

function applyTheme(isDark) {
  if (isDark) {
    document.body.classList.add("dark");
    themeToggle.textContent = "Light mode";
    localStorage.setItem("quicknotes_theme", "dark");
  } else {
    document.body.classList.remove("dark");
    themeToggle.textContent = "Dark mode";
    localStorage.setItem("quicknotes_theme", "light");
  }
}

noteText.addEventListener("input", () => {
  updateCounts();
  localStorage.setItem("quicknotes_draft", noteText.value);
});

noteText.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    clearNote();
  }
});

clearBtn.addEventListener("click", clearNote);

themeToggle.addEventListener("click", () => {
  const isCurrentlyDark = document.body.classList.contains("dark");
  applyTheme(!isCurrentlyDark);
});

window.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("quicknotes_theme");
  if (savedTheme === "dark") {
    applyTheme(true);
  } else {
    applyTheme(false);
  }

  const savedDraft = localStorage.getItem("quicknotes_draft");
  if (savedDraft !== null) {
    noteText.value = savedDraft;
  }

  updateCounts();
});