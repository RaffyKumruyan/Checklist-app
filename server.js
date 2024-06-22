const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'checklist.json');

app.use(bodyParser.json());
app.use(express.static('public'));

// Load checklist from file
async function loadChecklist() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading checklist data:', err);
    return [];
  }
}

// Save checklist to file
async function saveChecklist(checklist) {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(checklist, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing checklist data:', err);
  }
}

// Initialize checklist
let checklist = loadChecklist();

// Reset checklist items' done status at 05:00 AM CEST
cron.schedule('0 5 * * *', async () => {
  const checklist = await loadChecklist();
  checklist.forEach(item => item.done = false);
  await saveChecklist(checklist);
}, {
  scheduled: true,
  timezone: "Europe/Berlin"
});

app.get('/api/checklist', async (req, res) => {
  const checklist = await loadChecklist();
  res.json(checklist);
});

app.post('/api/checklist', async (req, res) => {
  const name = req.body.name;
  if (name) {
    const checklist = await loadChecklist();
    checklist.push({ name, done: false });
    await saveChecklist(checklist);
    res.status(201).json({ message: 'Item added' });
  } else {
    res.status(400).json({ message: 'Name is required' });
  }
});

app.put('/api/checklist', async (req, res) => {
  const { name, done } = req.body;
  const checklist = await loadChecklist();
  const item = checklist.find(item => item.name === name);
  if (item) {
    item.done = done;
    await saveChecklist(checklist);
    res.json({ message: 'Item updated' });
  } else {
    res.status(404).json({ message: 'Item not found' });
  }
});

app.delete('/api/checklist', async (req, res) => {
  const name = req.body.name;
  const checklist = await loadChecklist();
  const index = checklist.findIndex(item => item.name === name);
  if (index !== -1) {
    checklist.splice(index, 1);
    await saveChecklist(checklist);
    res.json({ message: 'Item deleted' });
  } else {
    res.status(404).json({ message: 'Item not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
