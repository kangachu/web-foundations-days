const loadBtn = document.getElementById("load-users");
const filterInput = document.getElementById("filter-input");
const statusEl = document.getElementById("status");
const usersList = document.getElementById("users-list");

let users = [];

function renderUsers(list) {
  usersList.textContent = "";

  if (list.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.textContent = "No users match your filter.";
    usersList.appendChild(emptyItem);
    return;
  }

  list.forEach((user) => {
    const li = document.createElement("li");
    li.className = "user-card";

    const nameHeading = document.createElement("h3");
    nameHeading.textContent = user.name;

    const emailPara = document.createElement("p");
    emailPara.textContent = `Email: ${user.email}`;

    const cityPara = document.createElement("p");
    cityPara.textContent = `City: ${user.address?.city || "N/A"}`;

    const companyPara = document.createElement("p");
    companyPara.textContent = `Company: ${user.company?.name || "N/A"}`;

    li.appendChild(nameHeading);
    li.appendChild(emailPara);
    li.appendChild(cityPara);
    li.appendChild(companyPara);

    usersList.appendChild(li);
  });
}

async function loadUsers() {
  loadBtn.disabled = true;
  statusEl.textContent = "Loading users...";
  usersList.textContent = "";

  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/users");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    users = data;
    statusEl.textContent = `Successfully loaded ${users.length} users.`;
    renderUsers(users);
  } catch (error) {
    statusEl.textContent = `Failed to load users: ${error.message}`;
  } finally {
    loadBtn.disabled = false;
  }
}

filterInput.addEventListener("input", () => {
  const query = filterInput.value.trim().toLowerCase();
  const filtered = users.filter((user) =>
    user.name.toLowerCase().includes(query)
  );
  renderUsers(filtered);
});

loadBtn.addEventListener("click", loadUsers);