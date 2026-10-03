// Starting data
let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

// 1. searchNotes(word)
// Returns array of notes whose text contains word, ignoring case
function searchNotes(word) {
  const query = word.toLowerCase();
  return notes.filter((note) => note.text.toLowerCase().includes(query));
}

// 2. longestNote()
// Returns the note object with the most characters, or null if no notes
function longestNote() {
  if (notes.length === 0) return null;
  return notes.reduce((longest, current) =>
    current.text.length > longest.text.length ? current : longest
  );
}

// 3. countByCategory()
// Returns an object counting notes per category
function countByCategory() {
  const counts = {};
  for (const note of notes) {
    counts[note.category] = (counts[note.category] || 0) + 1;
  }
  return counts;
}

// 4. getSummary()
// Returns a summary sentence using countByCategory and template literals
function getSummary() {
  const count = notes.length;
  const word = count === 1 ? "note" : "notes";
  const counts = countByCategory();

  const details = Object.entries(counts)
    .map(([cat, qty]) => `${qty} ${cat}`)
    .join(", ");

  return `${count} ${word}: ${details}.`;
}

// 5. isDuplicate(text)
// Returns true if a note with the same text already exists (ignoring case & extra spaces)
function isDuplicate(text) {
  const cleanText = text.trim().toLowerCase();
  return notes.some((note) => note.text.trim().toLowerCase() === cleanText);
}

// 6. addNote(text, category)
// Adds a note only if valid (1-200 chars, not duplicate, allowed category).
// Returns true when added, false otherwise (logging reason).
function addNote(text, category) {
  const allowedCategories = ["personal", "work", "study"];

  if (!text || text.trim().length === 0 || text.trim().length > 200) {
    console.log("Failed to add note: text must be between 1 and 200 characters.");
    return false;
  }

  if (isDuplicate(text)) {
    console.log("Failed to add note: duplicate note text detected.");
    return false;
  }

  if (!allowedCategories.includes(category)) {
    console.log(`Failed to add note: category must be one of ${allowedCategories.join(", ")}.`);
    return false;
  }

  const nextId = notes.length > 0 ? Math.max(...notes.map((n) => n.id)) + 1 : 1;
  const newNote = {
    id: nextId,
    text: text.trim(),
    category: category,
  };

  notes.push(newNote);
  return true;
}

// ==========================================
// TEST CONSOLE LOGS
// ==========================================

console.log("--- 1. Testing searchNotes ---");
// Normal case: search matching multiple notes
console.log(searchNotes("day"));
// Expected: [{ id: 2, text: "Finish the Day 3 assignment", category: "study" }]

// Edge case: no matches found
console.log(searchNotes("xyz123"));
// Expected: []

console.log("\n--- 2. Testing longestNote ---");
// Normal case: returns longest note
console.log(longestNote());
// Expected: { id: 3, text: "Email the project report to Grace", category: "work" }

// Edge case: empty notes array returns null
const backupNotes = [...notes];
notes = [];
console.log(longestNote());
// Expected: null
notes = backupNotes; // restore

console.log("\n--- 3. Testing countByCategory ---");
// Normal case: counts all categories
console.log(countByCategory());
// Expected: { personal: 2, study: 2, work: 1 }

// Edge case: when notes array is empty
notes = [];
console.log(countByCategory());
// Expected: {}
notes = backupNotes; // restore

console.log("\n--- 4. Testing getSummary ---");
// Normal case: plural note summary
console.log(getSummary());
// Expected: "5 notes: 2 personal, 1 work, 2 study." (order of categories can vary)

// Edge case: single note handling
notes = [{ id: 1, text: "Single item", category: "work" }];
console.log(getSummary());
// Expected: "1 note: 1 work."
notes = backupNotes; // restore

console.log("\n--- 5. Testing isDuplicate ---");
// Normal case: existing text with extra spaces/case difference
console.log(isDuplicate("  buy Milk and Bread  "));
// Expected: true

// Edge case: text does not exist
console.log(isDuplicate("Brand new unique note"));
// Expected: false

console.log("\n--- 6. Testing addNote ---");
// Normal case: adding valid note
console.log(addNote("Walk the dog", "personal"));
// Expected: true

// Edge case 1: duplicate note rejected
console.log(addNote("Walk the dog", "personal"));
// Expected: Failed to add note: duplicate note text detected. -> false

// Edge case 2: invalid category rejected
console.log(addNote("Cook dinner", "hobbies"));
// Expected: Failed to add note: category must be one of personal, work, study. -> false

// Edge case 3: empty text rejected
console.log(addNote("   ", "study"));
// Expected: Failed to add note: text must be between 1 and 200 characters. -> false