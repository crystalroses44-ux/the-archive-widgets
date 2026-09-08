const notes = document.getElementById("looseLeaves");
const status = document.getElementById("saveStatus");
const clearButton = document.getElementById("clearNotes");
const STORAGE_KEY = "archive-loose-leaves";
try {
  const savedNotes = localStorage.getItem(STORAGE_KEY);
  if (savedNotes) {
    notes.value = savedNotes;
  }
} catch (error) {
  status.textContent = "temporary notes";
}
let saveTimer;
notes.addEventListener("input", () => {
  status.textContent = "saving...";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, notes.value);
      status.textContent = "saved locally";
    } catch (error) {
      status.textContent = "not saved";
    }
  }, 300);
});
clearButton.addEventListener("click", () => {
  const shouldClear = confirm("Clear all Loose Leaves notes?");
  if (!shouldClear) return;
  notes.value = "";
  try {
    localStorage.removeItem(STORAGE_KEY);
    status.textContent = "cleared";
  } catch (error) {
    status.textContent = "cleared";
  }
  notes.focus();
});