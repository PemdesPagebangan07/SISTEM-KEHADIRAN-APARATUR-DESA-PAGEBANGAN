import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  CheckCircle2, 
  Clock, 
  UserCheck, 
  Users, 
  Search, 
  Calendar as CalendarIcon,
  ChevronRight,
  UserX,
  AlertCircle,
  Download,
  LayoutDashboard,
  FileText,
  UserPlus,
  Trash2,
  Edit2,
  X,
  Plus
} from "lucide-react";

const KEBUMEN_LOGO = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Lambang_Kabupaten_Kebumen.png/400px-Lambang_Kabupaten_Kebumen.png";

interface Aparatur {
  id: number;
  name: string;
  position: string;
}

interface AttendanceLog {
  aparatur_id: number;
  name: string;
  position: string;
  time: string | null;
  status: string | null;
}

interface RecapItem {
  id: number;
  name: string;
  niapd: string;
  position: string;
  note: string;
  stats: {
    hadir: number;
    ijin: number;
    sakit: number;
    cuti: number;
    dinas: number;
    tk: number;
  };
}

type View = "daily" | "recap" | "aparatur" | "monthly";

export default function App() {
  const [view, setView] = useState<View>("daily");
  const [aparatur, setAparatur] = useState<Aparatur[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [recap, setRecap] = useState<RecapItem[]>([]);
  const [monthlyLogs, setMonthlyLogs] = useState<any[]>([]);
  const [workingDays, setWorkingDays] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  
  const holidays2026: Record<string, { name: string, type: "LN" | "CB" }> = {
    "2026-01-01": { name: "Tahun Baru 2026 Masehi", type: "LN" },
    "2026-02-14": { name: "Isra Mikraj Nabi Muhammad SAW", type: "LN" },
    "2026-02-17": { name: "Tahun Baru Imlek 2577 Kongzili", type: "LN" },
    "2026-02-18": { name: "Cuti Bersama Tahun Baru Imlek", type: "CB" },
    "2026-03-19": { name: "Hari Suci Nyepi Tahun Baru Saka 1948", type: "LN" },
    "2026-03-20": { name: "Hari Raya Idul Fitri 1447 Hijriah", type: "LN" },
    "2026-03-21": { name: "Hari Raya Idul Fitri 1447 Hijriah", type: "LN" },
    "2026-03-23": { name: "Cuti Bersama Idul Fitri 1447 Hijriah", type: "CB" },
    "2026-03-24": { name: "Cuti Bersama Idul Fitri 1447 Hijriah", type: "CB" },
    "2026-03-25": { name: "Cuti Bersama Idul Fitri 1447 Hijriah", type: "CB" },
    "2026-04-03": { name: "Wafat Yesus Kristus", type: "LN" },
    "2026-04-05": { name: "Kebangkitan Yesus Kristus (Paskah)", type: "LN" },
    "2026-05-01": { name: "Hari Buruh Internasional", type: "LN" },
    "2026-05-14": { name: "Kenaikan Yesus Kristus", type: "LN" },
    "2026-05-15": { name: "Cuti Bersama Kenaikan Yesus Kristus", type: "CB" },
    "2026-06-01": { name: "Hari Lahir Pancasila", type: "LN" },
    "2026-05-22": { name: "Hari Raya Waisak 2570 BE", type: "LN" },
    "2026-05-27": { name: "Idul Adha 1447 Hijriah", type: "LN" },
    "2026-05-28": { name: "Cuti Bersama Idul Adha", type: "CB" },
    "2026-06-16": { name: "Tahun Baru Islam 1448 Hijriah", type: "LN" },
    "2026-08-17": { name: "Proklamasi Kemerdekaan RI", type: "LN" },
    "2026-08-25": { name: "Maulid Nabi Muhammad SAW", type: "LN" },
    "2026-12-24": { name: "Cuti Bersama Natal", type: "CB" },
    "2026-12-25": { name: "Kelahiran Yesus Kristus (Natal)", type: "LN" },
    "2026-12-26": { name: "Cuti Bersama Natal", type: "CB" },
  };

  const getDayInfo = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDay();
    const isWeekend = day === 0 || day === 6;
    const holiday = holidays2026[dateStr];
    return { isWeekend, holiday };
  };

  // Modal states
  const [showAparaturModal, setShowAparaturModal] = useState(false);
  const [editingAparatur, setEditingAparatur] = useState<Aparatur | null>(null);
  const [formData, setFormData] = useState({ name: "", position: "", niapd: "" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const printParam = params.get("print");
    const monthParam = params.get("month");
    const viewParam = params.get("view");

    if (viewParam === "recap") setView("recap");
    if (monthParam) setCurrentMonth(monthParam);
    
    fetchAparatur();

    if (printParam === "true") {
      // Small delay to ensure data is fetched before printing
      setTimeout(() => {
        window.print();
      }, 1500);
    }
  }, []);

  const fetchAparatur = async () => {
    try {
      const res = await fetch("/api/aparatur");
      const data = await res.json();
      setAparatur(data);
    } catch (error) {
      console.error("Error fetching aparatur:", error);
    }
  };

  const handlePrint = (printView: View = "recap") => {
    const printUrl = `${window.location.origin}${window.location.pathname}?view=${printView}&month=${currentMonth}&print=true`;
    window.open(printUrl, "_blank");
  };

  useEffect(() => {
    if (view === "daily") fetchLogs();
    if (view === "recap") fetchRecap();
    if (view === "monthly") {
      fetchRecap();
      fetchMonthlyLogs();
    }
  }, [view, currentDate, currentMonth]);

  const fetchMonthlyLogs = async () => {
    try {
      const res = await fetch(`/api/attendance/monthly?month=${currentMonth}`);
      const data = await res.json();
      setMonthlyLogs(data);
    } catch (error) {
      console.error("Error fetching monthly logs:", error);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance?date=${currentDate}`);
      const data = await res.json();
      setLogs(data);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecap = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/recap?month=${currentMonth}`);
      const data = await res.json();
      setRecap(data.recap);
      setWorkingDays(data.workingDays);
    } catch (error) {
      console.error("Error fetching recap:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecap = async () => {
    try {
      setLoading(true);
      const notes = recap.map(item => ({ aparatur_id: item.id, note: item.note }));
      await fetch("/api/recap/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: currentMonth, notes }),
      });
      alert("Rekapan berhasil disimpan!");
      fetchRecap();
    } catch (error) {
      console.error("Error saving recap notes:", error);
      alert("Gagal menyimpan rekapan.");
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = async (aparaturId: number, status: string) => {
    if (status === "Hadir") {
      const confirmBulk = confirm(`Apakah Anda ingin mengisi kehadiran 'Hadir' untuk SELURUH BULAN ini?\n\n- Hanya hari kerja (Senin-Jumat)\n- Hari Libur Nasional & Cuti Bersama akan DIKECUALIKAN otomatis.\n\nKlik 'OK' untuk Seluruh Bulan, 'Cancel' untuk Hari Ini saja.`);
      if (confirmBulk) {
        try {
          setLoading(true);
          await fetch("/api/attendance/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ aparatur_id: aparaturId, status, month: currentMonth }),
          });
          fetchLogs();
          return;
        } catch (error) {
          console.error("Error marking bulk attendance:", error);
        } finally {
          setLoading(false);
        }
      }
    }

    try {
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aparatur_id: aparaturId, status, date: currentDate }),
      });
      fetchLogs();
    } catch (error) {
      console.error("Error marking attendance:", error);
    }
  };

  const handleAparaturSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAparatur) {
        await fetch(`/api/aparatur/${editingAparatur.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      } else {
        await fetch("/api/aparatur", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      }
      setShowAparaturModal(false);
      setEditingAparatur(null);
      setFormData({ name: "", position: "" });
      fetchAparatur();
      if (view === "daily") fetchLogs();
    } catch (error) {
      console.error("Error saving aparatur:", error);
    }
  };

  const deleteAparatur = async (id: number) => {
    if (!confirm("Hapus data perangkat ini? Semua riwayat kehadiran juga akan terhapus.")) return;
    try {
      await fetch(`/api/aparatur/${id}`, { method: "DELETE" });
      fetchAparatur();
      if (view === "daily") fetchLogs();
    } catch (error) {
      console.error("Error deleting aparatur:", error);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "Hadir": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Izin": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Sakit": return "bg-amber-100 text-amber-700 border-amber-200";
      case "Cuti": return "bg-purple-100 text-purple-700 border-purple-200";
      case "Dinas": return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "Alpa": return "bg-rose-100 text-rose-700 border-rose-200";
      case "LN":
      case "CB":
      case "LP":
      case "Libur Nasional (LN)":
      case "Cuti Bersama (CB)":
      case "Libur Akhir Pekan":
        return "bg-rose-100 text-rose-700 border-rose-200";
      default: return "bg-slate-100 text-slate-500 border-slate-200";
    }
  };

  const monthNames = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
  const [year, month] = currentMonth.split("-");
  const monthName = monthNames[parseInt(month) - 1];

  // Check if we are in print mode
  const isPrintMode = new URLSearchParams(window.location.search).get("print") === "true";

  if (isPrintMode && (view === "recap" || view === "monthly")) {
    return (
      <div className="bg-white p-0">
        <style>{`
          @page { size: A4 ${view === "monthly" ? "landscape" : "portrait"}; margin: 10mm; }
          body { background: white; -webkit-print-color-adjust: exact; }
          .print-content { width: 100%; margin: 0 auto; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 2px solid black !important; }
        `}</style>
        <div className="print-content">
          {/* Kop Surat */}
          <div className="relative flex items-center justify-center mb-8 border-b-4 border-double border-slate-900 pb-6">
            <img src={KEBUMEN_LOGO} alt="Kebumen Logo" className="absolute left-0 w-20 h-20 object-contain" referrerPolicy="no-referrer" />
            <div className="text-center">
              <h3 className="text-lg font-bold">PEMERINTAH KABUPATEN KEBUMEN</h3>
              <h3 className="text-lg font-bold">KECAMATAN KARANGGAYAM</h3>
              <h2 className="text-xl font-black">DESA PAGEBANGAN</h2>
              <p className="text-[10px] italic mt-1">Jl. Raya Pagebangan RT 001 RW 001 Desa Pagebangan NO. HP +6285194541464</p>
              <p className="text-[10px] italic">Web : http://pagebangan.kec-karanggayam.kebumenkab.go.id Kode Pos 54365</p>
            </div>
          </div>

          {view === "recap" ? (
            <>
              <div className="text-center mb-8">
                <h4 className="font-bold underline uppercase text-sm">REKAPITULASI DAFTAR KEHADIRAN APARATUR PEMERINTAH DESA</h4>
                <h4 className="font-bold uppercase text-sm">DESA PAGEBANGAN KECAMATAN KARANGGAYAM</h4>
                <div className="flex justify-center gap-8 mt-4 font-bold text-xs">
                  <span>BULAN : {monthName}</span>
                  <span>TAHUN : {year}</span>
                  <span>HARI KERJA : {workingDays} HARI</span>
                </div>
              </div>

          <table className="w-full border-collapse border-2 border-slate-900 text-[10px]">
            <thead>
              <tr className="bg-slate-100">
                <th rowSpan={2} className="border-2 border-slate-900 px-1 py-2 text-center w-8">NO</th>
                <th rowSpan={2} className="border-2 border-slate-900 px-2 py-2 text-center">NAMA</th>
                <th rowSpan={2} className="border-2 border-slate-900 px-2 py-2 text-center">NIAPD</th>
                <th rowSpan={2} className="border-2 border-slate-900 px-2 py-2 text-center">JABATAN</th>
                <th rowSpan={2} className="border-2 border-slate-900 px-1 py-2 text-center w-12">HADIR</th>
                <th colSpan={5} className="border-2 border-slate-900 px-1 py-1 text-center">JUMLAH HARI TIDAK HADIR</th>
                <th rowSpan={2} className="border-2 border-slate-900 px-2 py-2 text-center w-20">KET</th>
              </tr>
              <tr className="bg-slate-100">
                <th className="border-2 border-slate-900 px-1 py-1 text-center w-8">IJIN</th>
                <th className="border-2 border-slate-900 px-1 py-1 text-center w-8">SAKIT</th>
                <th className="border-2 border-slate-900 px-1 py-1 text-center w-8">CUTI</th>
                <th className="border-2 border-slate-900 px-1 py-1 text-center w-8">DINAS</th>
                <th className="border-2 border-slate-900 px-1 py-1 text-center w-8">TK</th>
              </tr>
            </thead>
            <tbody>
              {recap.map((item, idx) => (
                <tr key={item.id}>
                  <td className="border-2 border-slate-900 px-1 py-1.5 text-center">{idx + 1}</td>
                  <td className="border-2 border-slate-900 px-2 py-1.5 font-bold uppercase">{item.name}</td>
                  <td className="border-2 border-slate-900 px-2 py-1.5 font-mono text-[9px]">{item.niapd}</td>
                  <td className="border-2 border-slate-900 px-2 py-1.5 uppercase">{item.position}</td>
                  <td className="border-2 border-slate-900 px-1 py-1.5 text-center font-bold">{item.stats.hadir}</td>
                  <td className="border-2 border-slate-900 px-1 py-1.5 text-center">{item.stats.ijin}</td>
                  <td className="border-2 border-slate-900 px-1 py-1.5 text-center">{item.stats.sakit}</td>
                  <td className="border-2 border-slate-900 px-1 py-1.5 text-center">{item.stats.cuti}</td>
                  <td className="border-2 border-slate-900 px-1 py-1.5 text-center">{item.stats.dinas}</td>
                  <td className="border-2 border-slate-900 px-1 py-1.5 text-center">{item.stats.tk}</td>
                  <td className="border-2 border-slate-900 px-2 py-1.5">{item.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <h4 className="font-bold underline uppercase text-sm">DAFTAR KEHADIRAN APARATUR PEMERINTAH DESA</h4>
                <h4 className="font-bold uppercase text-sm">DESA PAGEBANGAN KECAMATAN KARANGGAYAM KABUPATEN KEBUMEN</h4>
                <h4 className="font-bold uppercase text-sm">BULAN {monthName} TAHUN {year}</h4>
              </div>

              <table className="w-full border-collapse border-2 border-slate-900 text-[8px]">
                <thead>
                  <tr className="bg-emerald-500 text-white">
                    <th rowSpan={2} className="border-2 border-slate-900 px-1 py-2 text-center w-6">NO.</th>
                    <th rowSpan={2} className="border-2 border-slate-900 px-2 py-2 text-center w-32">N A M A</th>
                    <th rowSpan={2} className="border-2 border-slate-900 px-2 py-2 text-center w-24">NIAPD</th>
                    <th colSpan={31} className="border-2 border-slate-900 px-1 py-1 text-center">T A N G G A L</th>
                    <th colSpan={6} className="border-2 border-slate-900 px-1 py-1 text-center">KET</th>
                  </tr>
                  <tr className="bg-emerald-500 text-white">
                    {Array.from({ length: 31 }).map((_, i) => {
                      const dateStr = `${currentMonth}-${String(i + 1).padStart(2, '0')}`;
                      const info = getDayInfo(dateStr);
                      const isHoliday = info.holiday || info.isWeekend;
                      return (
                        <th key={i} className={`border-2 border-slate-900 px-0.5 py-1 text-center w-5 ${isHoliday ? 'bg-rose-600' : ''}`}>
                          {i + 1}
                        </th>
                      );
                    })}
                    <th className="border-2 border-slate-900 px-0.5 py-1 text-center w-5">A</th>
                    <th className="border-2 border-slate-900 px-0.5 py-1 text-center w-5">I</th>
                    <th className="border-2 border-slate-900 px-0.5 py-1 text-center w-5">S</th>
                    <th className="border-2 border-slate-900 px-0.5 py-1 text-center w-5">P</th>
                    <th className="border-2 border-slate-900 px-0.5 py-1 text-center w-5">C</th>
                    <th className="border-2 border-slate-900 px-0.5 py-1 text-center w-5">DL</th>
                  </tr>
                </thead>
                <tbody>
                  {recap.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="border-2 border-slate-900 px-1 py-1 text-center">{idx + 1}</td>
                      <td className="border-2 border-slate-900 px-2 py-1 font-bold uppercase text-[7px]">{item.name}</td>
                      <td className="border-2 border-slate-900 px-2 py-1 text-center font-mono text-[7px]">{item.niapd}</td>
                      {Array.from({ length: 31 }).map((_, i) => {
                        const day = i + 1;
                        const dateStr = `${currentMonth}-${String(day).padStart(2, '0')}`;
                        const info = getDayInfo(dateStr);
                        const isHoliday = info.holiday || info.isWeekend;
                        const log = monthlyLogs.find(l => l.aparatur_id === item.id && l.date === dateStr);
                        let content = "";
                        if (log) {
                          if (log.status === "Hadir") content = "H";
                          else if (log.status === "Izin") content = "I";
                          else if (log.status === "Sakit") content = "S";
                          else if (log.status === "Cuti") content = "C";
                          else if (log.status === "Dinas") content = "D";
                          else if (log.status === "Alpa") content = "A";
                        } else if (info.holiday) content = info.holiday.type;
                        else if (info.isWeekend) content = "LP";
                        return (
                          <td key={i} className={`border-2 border-slate-900 px-0.5 py-1 text-center ${isHoliday ? 'bg-rose-50 text-rose-600 font-bold' : ''}`}>
                            {content}
                          </td>
                        );
                      })}
                      <td className="border-2 border-slate-900 px-0.5 py-1 text-center">{item.stats.tk}</td>
                      <td className="border-2 border-slate-900 px-0.5 py-1 text-center">{item.stats.ijin}</td>
                      <td className="border-2 border-slate-900 px-0.5 py-1 text-center">{item.stats.sakit}</td>
                      <td className="border-2 border-slate-900 px-0.5 py-1 text-center">{item.stats.dinas}</td>
                      <td className="border-2 border-slate-900 px-0.5 py-1 text-center">{item.stats.cuti}</td>
                      <td className="border-2 border-slate-900 px-0.5 py-1 text-center text-[7px]">{item.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div className="mt-8 grid grid-cols-3 gap-8 text-[10px]">
            <div className="space-y-1">
              {view === "monthly" && (
                <>
                  <p className="italic underline">Keterangan Hari Libur Nasional dan Cuti Bersama:</p>
                  {Object.entries(holidays2026)
                    .filter(([date]) => date.startsWith(currentMonth))
                    .map(([date, holiday]) => (
                      <p key={date}>{parseInt(date.split('-')[2])} : {holiday.name}</p>
                    ))
                  }
                  <div className="mt-4 space-y-0.5">
                    <p className="italic underline">Keterangan Ketidakhadiran:</p>
                    <p>L : Libur Nasional/ Hari Raya dan Peringatan Hari Besar</p>
                    <p>A : Alpa</p>
                    <p>I : Izin</p>
                    <p>S : Sakit</p>
                    <p>P : Pertemuan/ Pelatihan</p>
                    <p>C : Cuti/ Cuti Bersama</p>
                    <p>DL : Dinas Luar</p>
                  </div>
                </>
              )}
              {view === "recap" && (
                <>
                  <p>Jumlah {recap.length} Orang</p>
                  <p>Hadir {recap.filter(r => r.stats.hadir > 0).length} Orang</p>
                  <p>Tidak Hadir {recap.filter(r => r.stats.hadir === 0).length} Orang</p>
                  <div className="mt-4">
                    <p className="font-bold underline">Keterangan Tidak Hadir</p>
                    <p>Ijin (I) {recap.reduce((acc, curr) => acc + curr.stats.ijin, 0)} Orang</p>
                    <p>Sakit (S) {recap.reduce((acc, curr) => acc + curr.stats.sakit, 0)} Orang</p>
                    <p>Cuti (C) {recap.reduce((acc, curr) => acc + curr.stats.cuti, 0)} Orang</p>
                    <p>Tanpa Keterangan (TK) {recap.reduce((acc, curr) => acc + curr.stats.tk, 0)} Orang</p>
                  </div>
                </>
              )}
            </div>
            <div className="text-center flex flex-col items-center justify-end">
              <p>Mengetahui,</p>
              <p className="font-bold uppercase">KEPALA DESA PAGEBANGAN</p>
              <div className="h-20"></div>
              <p className="font-bold underline uppercase">
                {recap.find(r => r.position.toLowerCase() === "kepala desa")?.name || "...................................."}
              </p>
              <p className="text-[9px]">{recap.find(r => r.position.toLowerCase() === "kepala desa")?.niapd || ""}</p>
            </div>
            <div className="text-center flex flex-col items-center justify-end">
              <p>Pagebangan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p>Petugas Daftar Hadir</p>
              <div className="h-20"></div>
              <p className="font-bold underline uppercase">
                {recap.find(r => r.position.toLowerCase() === "kasi pemerintahan")?.name || "...................................."}
              </p>
              <p className="text-[9px]">{recap.find(r => r.position.toLowerCase() === "kasi pemerintahan")?.niapd || ""}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header Section */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-4">
              <img src={KEBUMEN_LOGO} alt="Kebumen Logo" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Desa Pagebangan
                </h1>
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">
                  Kec. Karanggayam, Kab. Kebumen
                </p>
              </div>
            </div>
            
            <nav className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              {[
                { id: "daily", label: "Harian", icon: LayoutDashboard },
                { id: "monthly", label: "Bulanan", icon: CalendarIcon },
                { id: "recap", label: "Rekapan", icon: FileText },
                { id: "aparatur", label: "Data Perangkat", icon: UserPlus },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id as View)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    view === item.id 
                      ? "bg-white text-indigo-600 shadow-sm" 
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Daily View */}
        {view === "daily" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Kehadiran Harian</h2>
                <p className="text-slate-500 text-sm">Kelola absensi perangkat desa setiap hari</p>
              </div>
              <div className={`flex items-center gap-3 p-2 rounded-xl border shadow-sm transition-all ${getDayInfo(currentDate).holiday || getDayInfo(currentDate).isWeekend ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
                <CalendarIcon className={`w-5 h-5 ${getDayInfo(currentDate).holiday || getDayInfo(currentDate).isWeekend ? 'text-rose-400' : 'text-slate-400'}`} />
                <input 
                  type="date" 
                  value={currentDate}
                  onChange={(e) => setCurrentDate(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700 cursor-pointer"
                />
              </div>
            </div>

            {getDayInfo(currentDate).holiday && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center font-bold">
                  {getDayInfo(currentDate).holiday?.type}
                </div>
                <div>
                  <p className="font-bold">{getDayInfo(currentDate).holiday?.name}</p>
                  <p className="text-xs opacity-80">Hari Libur Nasional / Cuti Bersama</p>
                </div>
              </div>
            )}

            {getDayInfo(currentDate).isWeekend && !getDayInfo(currentDate).holiday && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center font-bold">
                  LP
                </div>
                <div>
                  <p className="font-bold">Libur Akhir Pekan</p>
                  <p className="text-xs opacity-80">Sabtu / Minggu</p>
                </div>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Cari nama..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/30 border-b border-slate-100">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Perangkat</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">NIAPD</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Jabatan</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Waktu</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td colSpan={6} className="py-20 text-center text-slate-400">Memuat data...</td></tr>
                    ) : logs.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase())).map((log) => (
                      <tr key={log.name} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4 font-semibold text-slate-800">{log.name}</td>
                        <td className="px-6 py-4 text-xs font-mono text-slate-500">{(aparatur.find(a => a.id === log.aparatur_id) as any)?.niapd || "-"}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{log.position}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{log.time || "--:--"}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(log.status || (getDayInfo(currentDate).holiday ? getDayInfo(currentDate).holiday?.type : (getDayInfo(currentDate).isWeekend ? "LP" : null)))}`}>
                            {log.status || (getDayInfo(currentDate).holiday ? (getDayInfo(currentDate).holiday?.type === "LN" ? "Libur Nasional (LN)" : "Cuti Bersama (CB)") : (getDayInfo(currentDate).isWeekend ? "Libur Akhir Pekan" : "Belum Absen"))}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {[
                              { s: "Hadir", label: "H", color: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100" },
                              { s: "Izin", label: "I", color: "text-blue-600 bg-blue-50 hover:bg-blue-100" },
                              { s: "Sakit", label: "S", color: "text-amber-600 bg-amber-50 hover:bg-amber-100" },
                              { s: "Cuti", label: "C", color: "text-purple-600 bg-purple-50 hover:bg-purple-100" },
                              { s: "Dinas", label: "D", color: "text-indigo-600 bg-indigo-50 hover:bg-indigo-100" },
                              { s: "Alpa", label: "A", color: "text-rose-600 bg-rose-50 hover:bg-rose-100" },
                            ].map((btn) => (
                              <button
                                key={btn.s}
                                onClick={() => markAttendance(log.aparatur_id, btn.s)}
                                title={btn.s}
                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${btn.color}`}
                              >
                                {btn.label}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Recap View */}
        {view === "recap" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 print:hidden">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Rekapitulasi Bulanan</h2>
                <p className="text-slate-500 text-sm">Laporan bulanan kehadiran perangkat desa</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                  <CalendarIcon className="w-5 h-5 text-slate-400" />
                  <input 
                    type="month" 
                    value={currentMonth}
                    onChange={(e) => setCurrentMonth(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700 cursor-pointer"
                  />
                </div>
                <button 
                  onClick={handleSaveRecap}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all text-sm font-bold shadow-lg shadow-blue-200"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Simpan Rekap
                </button>
                <button 
                  onClick={async () => {
                    if (confirm(`Apakah Anda ingin mengisi kehadiran 'Hadir' untuk SEMUA PERANGKAT pada bulan ${monthName} ${year}?\n\n- Hanya hari kerja (Senin-Jumat)\n- Hari Libur & Cuti Bersama akan DIKECUALIKAN.`)) {
                      try {
                        setLoading(true);
                        await fetch("/api/attendance/bulk-all", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ month: currentMonth, status: "Hadir" }),
                        });
                        fetchRecap();
                      } catch (error) {
                        console.error("Error bulk filling all:", error);
                      } finally {
                        setLoading(false);
                      }
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all text-sm font-bold shadow-lg shadow-emerald-200"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Isi Otomatis Semua
                </button>
                <button 
                  onClick={() => handlePrint("recap")}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all text-sm font-bold shadow-lg shadow-indigo-200"
                >
                  <Download className="w-4 h-4" />
                  Cetak Rekap
                </button>
              </div>
            </div>

            {/* Print Layout */}
            <div className="bg-white p-8 md:p-12 shadow-xl rounded-2xl border border-slate-200 print:shadow-none print:border-none print:p-0">
              {/* Kop Surat */}
              <div className="relative flex items-center justify-center mb-8 border-b-4 border-double border-slate-900 pb-6">
                <img src={KEBUMEN_LOGO} alt="Kebumen Logo" className="absolute left-0 w-24 h-24 object-contain print:w-20 print:h-20" referrerPolicy="no-referrer" />
                <div className="text-center">
                  <h3 className="text-lg md:text-xl font-bold">PEMERINTAH KABUPATEN KEBUMEN</h3>
                  <h3 className="text-lg md:text-xl font-bold">KECAMATAN KARANGGAYAM</h3>
                  <h2 className="text-xl md:text-2xl font-black">DESA PAGEBANGAN</h2>
                  <p className="text-[10px] md:text-xs italic mt-1">Jl. Raya Pagebangan RT 001 RW 001 Desa Pagebangan NO. HP +6285194541464</p>
                  <p className="text-[10px] md:text-xs italic">Web : http://pagebangan.kec-karanggayam.kebumenkab.go.id Kode Pos 54365</p>
                </div>
              </div>

              <div className="text-center mb-8">
                <h4 className="font-bold underline uppercase">REKAPITULASI DAFTAR KEHADIRAN APARATUR PEMERINTAH DESA</h4>
                <h4 className="font-bold uppercase">DESA PAGEBANGAN KECAMATAN KARANGGAYAM</h4>
                <div className="flex justify-center gap-8 mt-4 font-bold text-sm">
                  <span>BULAN : {monthName}</span>
                  <span>TAHUN : {year}</span>
                  <span>HARI KERJA : {workingDays} HARI</span>
                </div>
              </div>

              <table className="w-full border-collapse border-2 border-slate-900 text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    <th rowSpan={2} className="border-2 border-slate-900 px-2 py-3 text-center w-10">NO</th>
                    <th rowSpan={2} className="border-2 border-slate-900 px-4 py-3 text-center">NAMA</th>
                    <th rowSpan={2} className="border-2 border-slate-900 px-4 py-3 text-center">NIAPD</th>
                    <th rowSpan={2} className="border-2 border-slate-900 px-4 py-3 text-center">JABATAN</th>
                    <th rowSpan={2} className="border-2 border-slate-900 px-2 py-3 text-center w-16">HADIR</th>
                    <th colSpan={5} className="border-2 border-slate-900 px-2 py-1 text-center">JUMLAH HARI TIDAK HADIR</th>
                    <th rowSpan={2} className="border-2 border-slate-900 px-4 py-3 text-center w-24">KET</th>
                  </tr>
                  <tr className="bg-slate-100">
                    <th className="border-2 border-slate-900 px-1 py-2 text-center w-10">IJIN</th>
                    <th className="border-2 border-slate-900 px-1 py-2 text-center w-10">SAKIT</th>
                    <th className="border-2 border-slate-900 px-1 py-2 text-center w-10">CUTI</th>
                    <th className="border-2 border-slate-900 px-1 py-2 text-center w-10">DINAS</th>
                    <th className="border-2 border-slate-900 px-1 py-2 text-center w-10">TK</th>
                  </tr>
                </thead>
                <tbody>
                  {recap.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="border-2 border-slate-900 px-2 py-2 text-center">{idx + 1}</td>
                      <td className="border-2 border-slate-900 px-4 py-2 font-bold uppercase">{item.name}</td>
                      <td className="border-2 border-slate-900 px-4 py-2 font-mono text-[10px]">{item.niapd}</td>
                      <td className="border-2 border-slate-900 px-4 py-2 uppercase">{item.position}</td>
                      <td className="border-2 border-slate-900 px-2 py-2 text-center font-bold">{item.stats.hadir}</td>
                      <td className="border-2 border-slate-900 px-1 py-2 text-center">{item.stats.ijin}</td>
                      <td className="border-2 border-slate-900 px-1 py-2 text-center">{item.stats.sakit}</td>
                      <td className="border-2 border-slate-900 px-1 py-2 text-center">{item.stats.cuti}</td>
                      <td className="border-2 border-slate-900 px-1 py-2 text-center">{item.stats.dinas}</td>
                      <td className="border-2 border-slate-900 px-1 py-2 text-center">{item.stats.tk}</td>
                      <td className="border-2 border-slate-900 px-1 py-1">
                        <input 
                          type="text"
                          value={item.note || ""}
                          onChange={(e) => {
                            const newRecap = [...recap];
                            newRecap[idx].note = e.target.value;
                            setRecap(newRecap);
                          }}
                          className="w-full bg-transparent border-none focus:ring-0 text-[10px] p-1"
                          placeholder="..."
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Footer Recap */}
              <div className="mt-8 grid grid-cols-2 gap-8 text-sm">
                <div className="space-y-1">
                  <p>Jumlah {recap.length} Orang</p>
                  <p>Hadir {recap.filter(r => r.stats.hadir > 0).length} Orang</p>
                  <p>Tidak Hadir {recap.filter(r => r.stats.hadir === 0).length} Orang</p>
                  <div className="mt-4">
                    <p className="font-bold underline">Keterangan Tidak Hadir</p>
                    <p>Ijin (I) {recap.reduce((acc, curr) => acc + curr.stats.ijin, 0)} Orang</p>
                    <p>Sakit (S) {recap.reduce((acc, curr) => acc + curr.stats.sakit, 0)} Orang</p>
                    <p>Cuti (C) {recap.reduce((acc, curr) => acc + curr.stats.cuti, 0)} Orang</p>
                    <p>Tanpa Keterangan (TK) {recap.reduce((acc, curr) => acc + curr.stats.tk, 0)} Orang</p>
                  </div>
                </div>
                <div className="text-center flex flex-col items-center justify-end">
                  <p>Kebumen, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p>Kepala Desa Pagebangan</p>
                  <div className="h-24"></div>
                  <p className="font-bold underline uppercase">
                    {recap.find(r => r.position.toLowerCase() === "kepala desa")?.name || "...................................."}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Monthly Grid View */}
        {view === "monthly" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 print:hidden">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Daftar Kehadiran Bulanan</h2>
                <p className="text-slate-500 text-sm">Tampilan grid kehadiran bulanan perangkat desa</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                  <CalendarIcon className="w-5 h-5 text-slate-400" />
                  <input 
                    type="month" 
                    value={currentMonth}
                    onChange={(e) => setCurrentMonth(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700 cursor-pointer"
                  />
                </div>
                <button 
                  onClick={() => handlePrint("monthly")}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all text-sm font-bold shadow-lg shadow-indigo-200"
                >
                  <Download className="w-4 h-4" />
                  Cetak Daftar
                </button>
              </div>
            </div>

            <div className="bg-white p-4 md:p-8 shadow-xl rounded-2xl border border-slate-200 print:shadow-none print:border-none print:p-0 overflow-x-auto">
              {/* Kop Surat */}
              <div className="relative flex items-center justify-center mb-8 border-b-4 border-double border-slate-900 pb-6">
                <img src={KEBUMEN_LOGO} alt="Kebumen Logo" className="absolute left-0 w-20 h-20 object-contain" referrerPolicy="no-referrer" />
                <div className="text-center">
                  <h3 className="text-lg font-bold">PEMERINTAH KABUPATEN KEBUMEN</h3>
                  <h3 className="text-lg font-bold">KECAMATAN KARANGGAYAM</h3>
                  <h2 className="text-xl font-black">DESA PAGEBANGAN</h2>
                  <p className="text-[10px] italic mt-1">Jl. Raya Pagebangan RT 001 RW 001 Desa Pagebangan NO. HP +6285194541464</p>
                  <p className="text-[10px] italic">Web : http://pagebangan.kec-karanggayam.kebumenkab.go.id Kode Pos 54365</p>
                </div>
              </div>

              <div className="text-center mb-8">
                <h4 className="font-bold underline uppercase text-sm">DAFTAR KEHADIRAN APARATUR PEMERINTAH DESA</h4>
                <h4 className="font-bold uppercase text-sm">DESA PAGEBANGAN KECAMATAN KARANGGAYAM KABUPATEN KEBUMEN</h4>
                <h4 className="font-bold uppercase text-sm">BULAN {monthName} TAHUN {year}</h4>
              </div>

              <table className="w-full border-collapse border-2 border-slate-900 text-[9px]">
                <thead>
                  <tr className="bg-emerald-500 text-white">
                    <th rowSpan={2} className="border-2 border-slate-900 px-1 py-2 text-center w-6">NO.</th>
                    <th rowSpan={2} className="border-2 border-slate-900 px-2 py-2 text-center w-32">N A M A</th>
                    <th rowSpan={2} className="border-2 border-slate-900 px-2 py-2 text-center w-24">NIAPD</th>
                    <th colSpan={31} className="border-2 border-slate-900 px-1 py-1 text-center">T A N G G A L</th>
                    <th colSpan={6} className="border-2 border-slate-900 px-1 py-1 text-center">KET</th>
                  </tr>
                  <tr className="bg-emerald-500 text-white">
                    {Array.from({ length: 31 }).map((_, i) => {
                      const dateStr = `${currentMonth}-${String(i + 1).padStart(2, '0')}`;
                      const info = getDayInfo(dateStr);
                      const isHoliday = info.holiday || info.isWeekend;
                      return (
                        <th key={i} className={`border-2 border-slate-900 px-0.5 py-1 text-center w-5 ${isHoliday ? 'bg-rose-600' : ''}`}>
                          {i + 1}
                        </th>
                      );
                    })}
                    <th className="border-2 border-slate-900 px-0.5 py-1 text-center w-5">A</th>
                    <th className="border-2 border-slate-900 px-0.5 py-1 text-center w-5">I</th>
                    <th className="border-2 border-slate-900 px-0.5 py-1 text-center w-5">S</th>
                    <th className="border-2 border-slate-900 px-0.5 py-1 text-center w-5">P</th>
                    <th className="border-2 border-slate-900 px-0.5 py-1 text-center w-5">C</th>
                    <th className="border-2 border-slate-900 px-0.5 py-1 text-center w-5">DL</th>
                  </tr>
                </thead>
                <tbody>
                  {recap.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="border-2 border-slate-900 px-1 py-1 text-center">{idx + 1}</td>
                      <td className="border-2 border-slate-900 px-2 py-1 font-bold uppercase text-[8px]">{item.name}</td>
                      <td className="border-2 border-slate-900 px-2 py-1 text-center font-mono text-[8px]">{item.niapd}</td>
                      {Array.from({ length: 31 }).map((_, i) => {
                        const day = i + 1;
                        const dateStr = `${currentMonth}-${String(day).padStart(2, '0')}`;
                        const info = getDayInfo(dateStr);
                        const isHoliday = info.holiday || info.isWeekend;
                        
                        const log = monthlyLogs.find(l => l.aparatur_id === item.id && l.date === dateStr);
                        
                        let content = "";
                        if (log) {
                          if (log.status === "Hadir") content = "H";
                          else if (log.status === "Izin") content = "I";
                          else if (log.status === "Sakit") content = "S";
                          else if (log.status === "Cuti") content = "C";
                          else if (log.status === "Dinas") content = "D";
                          else if (log.status === "Alpa") content = "A";
                        } else if (info.holiday) {
                          content = info.holiday.type;
                        } else if (info.isWeekend) {
                          content = "LP";
                        }

                        return (
                          <td key={i} className={`border-2 border-slate-900 px-0.5 py-1 text-center ${isHoliday ? 'bg-rose-50 text-rose-600 font-bold' : ''}`}>
                            {content}
                          </td>
                        );
                      })}
                      <td className="border-2 border-slate-900 px-0.5 py-1 text-center">{item.stats.tk}</td>
                      <td className="border-2 border-slate-900 px-0.5 py-1 text-center">{item.stats.ijin}</td>
                      <td className="border-2 border-slate-900 px-0.5 py-1 text-center">{item.stats.sakit}</td>
                      <td className="border-2 border-slate-900 px-0.5 py-1 text-center">{item.stats.dinas}</td>
                      <td className="border-2 border-slate-900 px-0.5 py-1 text-center">{item.stats.cuti}</td>
                      <td className="border-2 border-slate-900 px-0.5 py-1 text-center text-[7px]">{item.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-6 grid grid-cols-3 gap-8 text-[9px]">
                <div className="space-y-1">
                  <p className="italic underline">Keterangan Hari Libur Nasional dan Cuti Bersama:</p>
                  {Object.entries(holidays2026)
                    .filter(([date]) => date.startsWith(currentMonth))
                    .map(([date, holiday]) => (
                      <p key={date}>{parseInt(date.split('-')[2])} : {holiday.name}</p>
                    ))
                  }
                  <div className="mt-4 space-y-0.5">
                    <p className="italic underline">Keterangan Ketidakhadiran:</p>
                    <p>L : Libur Nasional/ Hari Raya dan Peringatan Hari Besar</p>
                    <p>A : Alpa</p>
                    <p>I : Izin</p>
                    <p>S : Sakit</p>
                    <p>P : Pertemuan/ Pelatihan</p>
                    <p>C : Cuti/ Cuti Bersama</p>
                    <p>DL : Dinas Luar</p>
                  </div>
                </div>
                <div className="text-center flex flex-col items-center justify-end">
                  <p>Mengetahui,</p>
                  <p className="font-bold uppercase">KEPALA DESA PAGEBANGAN</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline uppercase">
                    {recap.find(r => r.position.toLowerCase() === "kepala desa")?.name}
                  </p>
                  <p className="text-[8px]">{recap.find(r => r.position.toLowerCase() === "kepala desa")?.niapd}</p>
                </div>
                <div className="text-center flex flex-col items-center justify-end">
                  <p>Pagebangan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p>Petugas Daftar Hadir</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline uppercase">
                    {recap.find(r => r.position.toLowerCase() === "kasi pemerintahan")?.name || "...................................."}
                  </p>
                  <p className="text-[8px]">{recap.find(r => r.position.toLowerCase() === "kasi pemerintahan")?.niapd || ""}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        {view === "aparatur" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Data Perangkat Desa</h2>
                <p className="text-slate-500 text-sm">Kelola daftar aparatur pemerintah desa</p>
              </div>
              <button 
                onClick={() => {
                  setEditingAparatur(null);
                  setFormData({ name: "", position: "", niapd: "" });
                  setShowAparaturModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all text-sm font-bold shadow-lg shadow-indigo-200"
              >
                <Plus className="w-4 h-4" />
                Tambah Perangkat
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {aparatur.map((person) => (
                <div key={person.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg">
                    {person.name.charAt(0)}
                  </div>
                  <div className="mt-4">
                    <h3 className="font-bold text-slate-900">{person.name}</h3>
                    <p className="text-slate-500 text-sm">{person.position}</p>
                    <p className="text-slate-400 text-xs mt-1 font-mono">NIAPD: {person.niapd || "-"}</p>
                  </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingAparatur(person);
                          setFormData({ name: person.name, position: person.position, niapd: person.niapd || "" });
                          setShowAparaturModal(true);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteAparatur(person.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1">{person.name}</h3>
                  <p className="text-sm text-slate-500 font-medium">{person.position}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </main>

      {/* Aparatur Modal */}
      <AnimatePresence>
        {showAparaturModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowAparaturModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-lg font-bold">{editingAparatur ? "Edit Perangkat" : "Tambah Perangkat"}</h3>
                <button onClick={() => setShowAparaturModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleAparaturSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Nama Lengkap</label>
                  <input 
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    placeholder="Contoh: Budi Santoso, S.Pd."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">NIAPD</label>
                  <input 
                    type="text"
                    value={formData.niapd}
                    onChange={(e) => setFormData({ ...formData, niapd: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    placeholder="Contoh: 2107130519920107"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Jabatan</label>
                  <input 
                    required
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    placeholder="Contoh: Sekretaris Desa"
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowAparaturModal(false)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-slate-200 mt-12 print:hidden">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400 text-sm">
          <p>© {new Date().getFullYear()} Pemerintah Desa Pagebangan. Semua Hak Dilindungi.</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sistem Aktif
            </span>
            <span>Versi 1.2.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
