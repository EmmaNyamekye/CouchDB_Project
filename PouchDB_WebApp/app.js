const db = new PouchDB('boardgames');
const remoteDB = new PouchDB('http://localhost:5984/boardgames', {
  auth: {
    username: 'admin',
    password: 'hello123'
  }
});

const addBtn = document.getElementById('addBtn');
const statusDiv = document.getElementById('syncStatus');
const tableBody = document.getElementById('boardgameTableBody');

let editingId = null;
let editingRev = null;

async function displayBoardgames() {
  const result = await db.allDocs({ include_docs: true });
  const boardgames = result.rows
    .map(r => r.doc)
    .sort((a, b) => (a.created_at || a._id).localeCompare(b.created_at || b._id)) // oldest first
    .slice(0, 10); // first 10

  tableBody.innerHTML = '';
  boardgames.forEach(doc => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${doc.boardgame || ''}</td>
      <td>${doc.release_year || ''}</td>
      <td>${doc.min_players || ''}</td>
      <td>${doc.max_players || ''}</td>
      <td>${doc.min_playtime || ''}</td>
      <td>${doc.max_playtime || ''}</td>
      <td>${doc.minimum_age || ''}</td>
      <td>
        <button onclick="deleteBoardgame('${doc._id}', '${doc._rev}')">Delete</button>
        <button onclick="syncSingleBoardgame('${doc._id}')">Sync</button>
        <button onclick="editBoardgame('${doc._id}')">Update</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

addBtn.addEventListener('click', async () => {
  const boardgame = document.getElementById('title').value.trim();
  const yearRaw = document.getElementById('year').value.trim();
  const minPlayersRaw = document.getElementById('min_players').value;
  const maxPlayersRaw = document.getElementById('max_players').value;
  const minPlaytimeRaw = document.getElementById('min_playtime').value;
  const maxPlaytimeRaw = document.getElementById('max_playtime').value;
  const minAgeRaw = document.getElementById('minimum_age').value;
  const description = document.getElementById('description').value.trim();

  const year = parseInt(yearRaw);
  const min_players = parseInt(minPlayersRaw);
  const max_players = parseInt(maxPlayersRaw);
  const min_playtime = parseInt(minPlaytimeRaw);
  const max_playtime = parseInt(maxPlaytimeRaw);
  const minimum_age = parseInt(minAgeRaw);
  const currentYear = new Date().getFullYear();

  if (!boardgame || !yearRaw || !minPlayersRaw || !maxPlayersRaw || !minPlaytimeRaw ||
      !maxPlaytimeRaw || !minAgeRaw || !description) {
    statusDiv.textContent = "Please enter every value.";
    return;
  }

  if (isNaN(year) || year < 1980 || year > currentYear) {
    statusDiv.textContent = `Year must be between 1980 and ${currentYear}.`;
    return;
  }

  if (isNaN(min_players) || isNaN(max_players) || min_players >= max_players) {
    statusDiv.textContent = "Min players must be less than max players.";
    return;
  }

  if (isNaN(min_playtime) || isNaN(max_playtime) || min_playtime >= max_playtime) {
    statusDiv.textContent = "Min playtime must be less than max playtime.";
    return;
  }

  if (isNaN(minimum_age)) {
    statusDiv.textContent = "Minimum age must be a number.";
    return;
  }

  try {
    const doc = {
      boardgame,
      release_year: year,
      min_players,
      max_players,
      min_playtime,
      max_playtime,
      minimum_age,
      description,
      created_at: new Date().toISOString()
    };

    if (editingId) {
      doc._id = editingId;
      doc._rev = editingRev;
      await db.put(doc);
      await remoteDB.put(doc);
      statusDiv.textContent = `"${boardgame}" updated successfully!`;
    } else {
      doc._id = new Date().toISOString();
      await db.put(doc);
      statusDiv.textContent = `"${boardgame}" added successfully!`;
    }

    resetForm();
    displayBoardgames();
  } catch (err) {
    console.error("Save error:", err);
    statusDiv.textContent = "Error saving boardgame.";
  }
});

function resetForm() {
  document.getElementById('title').value = '';
  document.getElementById('year').value = '';
  document.getElementById('description').value = '';
  document.getElementById('min_players').value = '';
  document.getElementById('max_players').value = '';
  document.getElementById('min_playtime').value = '';
  document.getElementById('max_playtime').value = '';
  document.getElementById('minimum_age').value = '';
  editingId = null;
  editingRev = null;
  addBtn.textContent = "Add Boardgame";
}

async function editBoardgame(id) {
  try {
    const doc = await db.get(id);
    document.getElementById('title').value = doc.boardgame || '';
    document.getElementById('year').value = doc.release_year || '';
    document.getElementById('description').value = doc.description || '';
    document.getElementById('min_players').value = doc.min_players || '';
    document.getElementById('max_players').value = doc.max_players || '';
    document.getElementById('min_playtime').value = doc.min_playtime || '';
    document.getElementById('max_playtime').value = doc.max_playtime || '';
    document.getElementById('minimum_age').value = doc.minimum_age || '';
    editingId = doc._id;
    editingRev = doc._rev;
    addBtn.textContent = "Update Boardgame";
    statusDiv.textContent = `Editing "${doc.boardgame}"...`;
  } catch (err) {
    console.error("Edit error:", err);
    statusDiv.textContent = "Error loading boardgame for editing.";
  }
}

async function deleteBoardgame(id, rev) {
  try {
    await db.remove(id, rev);
    statusDiv.textContent = "Boardgame deleted.";
    displayBoardgames();
  } catch (err) {
    console.error("Delete error:", err);
    statusDiv.textContent = "Error deleting boardgame.";
  }
}

window.deleteBoardgame = deleteBoardgame;
window.syncSingleBoardgame = async function(id) {
  try {
    const doc = await db.get(id);
    await remoteDB.put(doc);
    statusDiv.textContent = `Synced "${doc.boardgame}" to remote DB.`;
  } catch (err) {
    console.error("Sync error:", err);
    statusDiv.textContent = "Sync error.";
  }
};
window.editBoardgame = editBoardgame;

displayBoardgames();

db.sync(remoteDB, { live: true, retry: true })
  .on('change', info => {
    console.log("Live sync change:", info);
    displayBoardgames();
  })
  .on('error', err => {
    console.error("Live sync error:", err);
  });
