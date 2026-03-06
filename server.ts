import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("attendance.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS aparatur (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    position TEXT NOT NULL,
    niapd TEXT
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aparatur_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY (aparatur_id) REFERENCES aparatur (id),
    UNIQUE(aparatur_id, date)
  );

  CREATE TABLE IF NOT EXISTS recap_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aparatur_id INTEGER NOT NULL,
    month TEXT NOT NULL,
    note TEXT,
    FOREIGN KEY (aparatur_id) REFERENCES aparatur (id),
    UNIQUE(aparatur_id, month)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Seed data if empty
const count = db.prepare("SELECT COUNT(*) as count FROM aparatur").get() as { count: number };
if (count.count === 0) {
  const insert = db.prepare("INSERT INTO aparatur (name, position, niapd) VALUES (?, ?, ?)");
  const officials = [
    ["NUR SOLEH AJI SETIAWAN, Amd.KL.", "KEPALA DESA", "2107130519920107"],
    ["SAIRIN", "SEKRETARIS DESA", "2107310119880120"],
    ["SUTINI", "KAUR TU DAN UMUM", "2107020219930211"],
    ["GAMPANG EDI KURNIAWAN, S.Pd.", "KAUR KEUANGAN", "2107260219900114"],
    ["WASIDIN, SM.", "KAUR PERENCANAAN", "2107300119790110"],
    ["WAHYU BUDI ROHIMAN", "KASI PEMERINTAHAN", "2107200620180106"],
    ["RASTONO", "KASI KESEJAHTERAAN", "2107301219920101"],
    ["TUGIMAN", "KASI PELAYANAN", "2107231119660103"],
    ["SLAMET", "KEPALA DUSUN 1", "2107030919810112"],
    ["MINTARSIH", "KEPALA DUSUN 2", "2107270919880221"]
  ];
  for (const [name, position, niapd] of officials) {
    insert.run(name, position, niapd);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get("/api/settings/logo", (req, res) => {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'logo'").get() as any;
    res.json({ logo: row ? row.value : null });
  });

  app.post("/api/settings/logo", (req, res) => {
    const { logo } = req.body;
    db.prepare("INSERT INTO settings (key, value) VALUES ('logo', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(logo);
    res.json({ success: true });
  });

  app.get("/api/aparatur", (req, res) => {
    const aparatur = db.prepare("SELECT * FROM aparatur ORDER BY id ASC").all();
    res.json(aparatur);
  });

  app.post("/api/aparatur", (req, res) => {
    const { name, position, niapd } = req.body;
    const result = db.prepare("INSERT INTO aparatur (name, position, niapd) VALUES (?, ?, ?)").run(name, position, niapd);
    res.json({ id: result.lastInsertRowid, name, position, niapd });
  });

  app.put("/api/aparatur/:id", (req, res) => {
    const { id } = req.params;
    const { name, position, niapd } = req.body;
    db.prepare("UPDATE aparatur SET name = ?, position = ?, niapd = ? WHERE id = ?").run(name, position, niapd, id);
    res.json({ success: true });
  });

  app.delete("/api/aparatur/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM attendance WHERE aparatur_id = ?").run(id);
    db.prepare("DELETE FROM aparatur WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/attendance", (req, res) => {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const logs = db.prepare(`
      SELECT a.id as aparatur_id, a.name, a.position, att.time, att.status, att.id
      FROM aparatur a
      LEFT JOIN attendance att ON a.id = att.aparatur_id AND att.date = ?
      ORDER BY a.id ASC
    `).all(date);
    res.json(logs);
  });

  // Holiday & Cuti Bersama 2026 (Approximate/User List)
  const holidays2026 = [
    "2026-01-01", // Tahun Baru 2026 Masehi
    "2026-01-16", // Isra Mikraj Nabi Muhammad SAW
    "2026-02-17", // Tahun Baru Imlek 2577 Kongzili
    "2026-02-18", // Cuti Bersama Tahun Baru Imlek
    "2026-03-19", // Hari Suci Nyepi Tahun Baru Saka 1948
    "2026-03-20", // Hari Raya Idul Fitri 1447 Hijriah
    "2026-03-21", // Hari Raya Idul Fitri 1447 Hijriah
    "2026-03-23", // Cuti Bersama Idul Fitri 1447 Hijriah
    "2026-03-24", // Cuti Bersama Idul Fitri 1447 Hijriah
    "2026-03-25", // Cuti Bersama Idul Fitri 1447 Hijriah
    "2026-04-03", // Wafat Yesus Kristus
    "2026-04-05", // Kebangkitan Yesus Kristus (Paskah)
    "2026-05-01", // Hari Buruh Internasional
    "2026-05-14", // Kenaikan Yesus Kristus
    "2026-05-15", // Cuti Bersama Kenaikan Yesus Kristus
    "2026-05-22", // Hari Raya Waisak 2570 BE
    "2026-05-27", // Idul Adha 1447 Hijriah
    "2026-05-28", // Cuti Bersama Idul Adha
    "2026-06-01", // Hari Lahir Pancasila
    "2026-06-16", // Tahun Baru Islam 1448 Hijriah
    "2026-08-17", // Proklamasi Kemerdekaan RI
    "2026-08-25", // Maulid Nabi Muhammad SAW
    "2026-12-24", // Cuti Bersama Natal
    "2026-12-25", // Kelahiran Yesus Kristus (Natal)
    "2026-12-26", // Cuti Bersama Natal
  ];

  app.get("/api/recap", (req, res) => {
    const month = req.query.month; // Format: YYYY-MM
    if (!month) return res.status(400).json({ error: "Month is required" });

    const [year, monthNum] = (month as string).split("-").map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    
    let workingDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(year, monthNum - 1, d);
      const dayOfWeek = dateObj.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5 && !holidays2026.includes(dateStr)) {
        workingDays++;
      }
    }

    const aparatur = db.prepare("SELECT * FROM aparatur ORDER BY id ASC").all();
    const recap = aparatur.map((person: any) => {
      const stats = db.prepare(`
        SELECT 
          SUM(CASE WHEN status = 'Hadir' THEN 1 ELSE 0 END) as hadir,
          SUM(CASE WHEN status = 'Izin' THEN 1 ELSE 0 END) as ijin,
          SUM(CASE WHEN status = 'Sakit' THEN 1 ELSE 0 END) as sakit,
          SUM(CASE WHEN status = 'Cuti' THEN 1 ELSE 0 END) as cuti,
          SUM(CASE WHEN status = 'Dinas' THEN 1 ELSE 0 END) as dinas,
          SUM(CASE WHEN status = 'Alpa' THEN 1 ELSE 0 END) as tk
        FROM attendance 
        WHERE aparatur_id = ? AND date LIKE ?
      `).get(person.id, `${month}%`) as any;

      const note = db.prepare("SELECT note FROM recap_notes WHERE aparatur_id = ? AND month = ?").get(person.id, month) as any;

      const ijin = stats.ijin || 0;
      const sakit = stats.sakit || 0;
      const cuti = stats.cuti || 0;
      const dinas = stats.dinas || 0;
      const tk = stats.tk || 0;
      
      // Calculate hadir as working days minus any absences
      const hadir = Math.max(0, workingDays - (ijin + sakit + cuti + dinas + tk));

      return {
        ...person,
        note: note ? note.note : "",
        stats: {
          hadir,
          ijin,
          sakit,
          cuti,
          dinas,
          tk
        }
      };
    });

    res.json({ recap, workingDays });
  });

  app.get("/api/recap/notes", (req, res) => {
    const month = req.query.month;
    if (!month) return res.status(400).json({ error: "Month is required" });
    const notes = db.prepare("SELECT * FROM recap_notes WHERE month = ?").all(month);
    res.json(notes);
  });

  app.post("/api/recap/notes", (req, res) => {
    const { month, notes } = req.body; // notes is an array of { aparatur_id, note }
    if (!month || !notes) return res.status(400).json({ error: "Missing parameters" });

    const insert = db.prepare("INSERT OR REPLACE INTO recap_notes (aparatur_id, month, note) VALUES (?, ?, ?)");
    db.transaction(() => {
      for (const item of notes) {
        insert.run(item.aparatur_id, month, item.note);
      }
    })();
    res.json({ success: true });
  });

  app.get("/api/attendance/monthly", (req, res) => {
    const month = req.query.month; // Format: YYYY-MM
    if (!month) return res.status(400).json({ error: "Month is required" });

    const logs = db.prepare(`
      SELECT aparatur_id, date, status
      FROM attendance
      WHERE date LIKE ?
    `).all(`${month}%`);
    res.json(logs);
  });

  app.post("/api/attendance/bulk-all", (req, res) => {
    const { month, status } = req.body;
    if (!month || !status) return res.status(400).json({ error: "Missing parameters" });

    const [year, monthNum] = month.split("-").map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const aparatur = db.prepare("SELECT id FROM aparatur").all();
    
    const insert = db.prepare("INSERT OR REPLACE INTO attendance (aparatur_id, date, time, status) VALUES (?, ?, ?, ?)");
    const time = "07:30";

    db.transaction(() => {
      for (const person of aparatur) {
        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dateObj = new Date(year, monthNum - 1, day);
          const dayOfWeek = dateObj.getDay();

          if (dayOfWeek >= 1 && dayOfWeek <= 5 && !holidays2026.includes(dateStr)) {
            insert.run((person as any).id, dateStr, time, status);
          }
        }
      }
    })();

    res.json({ success: true });
  });

  app.post("/api/attendance/bulk", (req, res) => {
    const { aparatur_id, status, month } = req.body; // month: YYYY-MM
    if (!aparatur_id || !status || !month) return res.status(400).json({ error: "Missing parameters" });

    const [year, monthNum] = month.split("-").map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    
    const insert = db.prepare("INSERT OR REPLACE INTO attendance (aparatur_id, date, time, status) VALUES (?, ?, ?, ?)");
    const time = "07:30"; // Default time for bulk

    db.transaction(() => {
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dateObj = new Date(year, monthNum - 1, day);
        const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday

        // Only Mon-Fri (1-5) AND NOT a holiday
        if (dayOfWeek >= 1 && dayOfWeek <= 5 && !holidays2026.includes(dateStr)) {
          insert.run(aparatur_id, dateStr, time, status);
        }
      }
    })();

    res.json({ success: true });
  });

  app.post("/api/attendance", (req, res) => {
    const { aparatur_id, status, date: customDate } = req.body;
    const date = customDate || new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // Check if already exists for today
    const existing = db.prepare("SELECT id FROM attendance WHERE aparatur_id = ? AND date = ?").get(aparatur_id, date);

    if (existing) {
      db.prepare("UPDATE attendance SET status = ?, time = ? WHERE id = ?").run(status, time, (existing as any).id);
    } else {
      db.prepare("INSERT INTO attendance (aparatur_id, date, time, status) VALUES (?, ?, ?, ?)").run(aparatur_id, date, time, status);
    }

    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
