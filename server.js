const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'store.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readStore() {
  if (!fs.existsSync(DATA_FILE)) {
    return { members: [], loans: [] };
  }

  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

function writeStore(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function computeSummary(store) {
  const totalMembers = store.members.length;
  const activeMembers = store.members.filter((m) => m.status === 'Aktif').length;
  const totalLoan = store.loans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
  const totalPaid = store.loans.reduce((sum, loan) => sum + Number(loan.paid || 0), 0);

  return {
    totalMembers,
    activeMembers,
    totalLoan,
    totalPaid,
    outstanding: totalLoan - totalPaid,
  };
}

app.get('/api/summary', (req, res) => {
  const store = readStore();
  res.json(computeSummary(store));
});

app.get('/api/members', (req, res) => {
  const store = readStore();
  res.json(store.members);
});

app.post('/api/members', (req, res) => {
  const store = readStore();
  const { name, nik, phone, status = 'Aktif' } = req.body;

  if (!name || !nik) {
    return res.status(400).json({ message: 'Nama dan NIK wajib diisi.' });
  }

  const newMember = {
    id: Date.now(),
    name,
    nik,
    phone: phone || '-',
    status,
    joinDate: new Date().toISOString().slice(0, 10),
  };

  store.members.push(newMember);
  writeStore(store);

  res.status(201).json(newMember);
});

app.get('/api/loans', (req, res) => {
  const store = readStore();
  res.json(store.loans);
});

app.post('/api/loans', (req, res) => {
  const store = readStore();
  const { memberName, amount, dueDate, purpose } = req.body;

  if (!memberName || !amount) {
    return res.status(400).json({ message: 'Nama anggota dan jumlah pinjaman wajib diisi.' });
  }

  const newLoan = {
    id: Date.now(),
    memberName,
    amount: Number(amount),
    paid: 0,
    dueDate: dueDate || null,
    purpose: purpose || 'Pinjaman umum',
    status: 'Berjalan',
    createdAt: new Date().toISOString(),
  };

  store.loans.push(newLoan);
  writeStore(store);

  res.status(201).json(newLoan);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Koperasi Copilot running at http://localhost:${PORT}`);
});
