const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const MAX_TEAM = 12;

app.use(express.json());
app.use(express.static(__dirname));

function readData() {
    if (!fs.existsSync(DATA_FILE)) return { checkins: [] };
    return JSON.parse(fs.readFileSync(DATA_FILE));
}
function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getUniqueMemberCountToday(checkins) {
    const today = new Date().toISOString().split('T')[0];
    const todayCheckins = checkins.filter(c => c.date === today);
    return new Set(todayCheckins.map(c => c.name.toLowerCase())).size;
}

app.get('/api/checkins', (req, res) => {
    res.json(readData().checkins);
});

app.post('/api/checkins', (req, res) => {
    const data = readData();
    const newCheckin = req.body;

    if (!newCheckin.id || !newCheckin.date || !newCheckin.name) {
        return res.status(400).json({ error: 'Missing fields' });
    }

    const uniqueCount = getUniqueMemberCountToday(data.checkins);
    const isNewMember = !data.checkins.some(c => c.date === newCheckin.date && c.name.toLowerCase() === newCheckin.name.toLowerCase());

    if (isNewMember && uniqueCount >= MAX_TEAM) {
        return res.status(400).json({ error: `Team limit of ${MAX_TEAM} reached today.` });
    }

    if (data.checkins.some(c => c.date === newCheckin.date && c.name.toLowerCase() === newCheckin.name.toLowerCase())) {
        return res.status(400).json({ error: `${newCheckin.name} already checked in today.` });
    }

    data.checkins.unshift(newCheckin);
    writeData(data);
    res.status(201).json(newCheckin);
});

app.delete('/api/checkins/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const data = readData();
    const index = data.checkins.findIndex(c => c.id === id);
    if (index === -1) return res.status(404).json({ error: 'Not found' });
    data.checkins.splice(index, 1);
    writeData(data);
    res.json({ success: true });
});

app.post('/api/reactions/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { reactionType } = req.body;
    const data = readData();
    const checkin = data.checkins.find(c => c.id === id);
    if (!checkin) return res.status(404).json({ error: 'Check-in not found' });
    if (!checkin.reactions) checkin.reactions = { '👍': 0, '🎉': 0, '☕': 0 };
    checkin.reactions[reactionType] = (checkin.reactions[reactionType] || 0) + 1;
    writeData(data);
    res.json({ success: true });
});

app.post('/api/comments/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { text, timestamp } = req.body;
    const data = readData();
    const checkin = data.checkins.find(c => c.id === id);
    if (!checkin) return res.status(404).json({ error: 'Check-in not found' });
    if (!checkin.comments) checkin.comments = [];
    checkin.comments.push({ text, timestamp });
    writeData(data);
    res.json({ success: true });
});

app.delete('/api/reset-today', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const data = readData();
    data.checkins = data.checkins.filter(c => c.date !== today);
    writeData(data);
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));