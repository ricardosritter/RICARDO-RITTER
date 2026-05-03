/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  Trash2, 
  X, 
  Send, 
  Plus,
  Calendar,
  Clock,
  Target,
  BookOpen,
  User as UserIcon,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Entry {
  horas: number;
  territorio: string;
  local: string;
  morador: string;
  publicacao: string;
  obs: string;
}

interface YearData {
  [dateKey: string]: Entry;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const DAYS_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData] = useState<YearData>({});
  const [annualText, setAnnualText] = useState('Felizes os que têm consciência de sua necessidade espiritual');
  const [meta, setMeta] = useState(30);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('');

  // Form State
  const [formData, setFormData] = useState<Entry>({
    horas: 0,
    territorio: '',
    local: '',
    morador: '',
    publicacao: '',
    obs: ''
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Load Data
  useEffect(() => {
    const savedData = localStorage.getItem(`campo_${year}`);
    if (savedData) setData(JSON.parse(savedData));

    const savedText = localStorage.getItem(`texto_anual_${year}`);
    if (savedText) setAnnualText(savedText);

    const savedMeta = localStorage.getItem(`meta_${year}_${month}`);
    if (savedMeta) setMeta(parseInt(savedMeta));
  }, [year, month]);

  // Save Data Helpers
  const persistData = (newData: YearData) => {
    setData(newData);
    localStorage.setItem(`campo_${year}`, JSON.stringify(newData));
  };

  const persistMeta = (newMeta: number) => {
    setMeta(newMeta);
    localStorage.setItem(`meta_${year}_${month}`, newMeta.toString());
  };

  const persistAnnualText = (text: string) => {
    setAnnualText(text);
    localStorage.setItem(`texto_anual_${year}`, text);
  };

  // Calculations
  const stats = useMemo(() => {
    let monthH = 0;
    let monthD = 0;
    let monthPub = 0;
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const k = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (data[k]) {
        monthH += data[k].horas;
        monthD++;
        if (data[k].publicacao) monthPub++;
      }
    }

    let yearH = 0;
    Object.keys(data).forEach(k => {
      yearH += data[k].horas;
    });

    return { monthH, monthD, monthPub, yearH };
  }, [data, year, month]);

  const changeMonth = (delta: number) => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + delta);
    setCurrentDate(next);
  };

  const openEntry = (dateKey: string) => {
    setSelectedDate(dateKey);
    const entry = data[dateKey];
    if (entry) {
      setFormData(entry);
    } else {
      setFormData({
        horas: 0,
        territorio: '',
        local: '',
        morador: '',
        publicacao: '',
        obs: ''
      });
    }
    setIsModalOpen(true);
    setGpsStatus('');
  };

  const saveEntry = () => {
    if (!selectedDate || formData.horas <= 0) {
      alert('Informe as horas trabalhadas.');
      return;
    }
    const newData = { ...data, [selectedDate]: formData };
    persistData(newData);
    setIsModalOpen(false);
  };

  const deleteEntry = () => {
    if (!selectedDate) return;
    if (confirm('Excluir este registro?')) {
      const newData = { ...data };
      delete newData[selectedDate];
      persistData(newData);
      setIsModalOpen(false);
    }
  };

  const getGpsLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('GPS não suportado.');
      return;
    }
    setIsGpsLoading(true);
    setGpsStatus('Obtendo localização...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const geoData = await res.json();
          setFormData(prev => ({ ...prev, local: geoData.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` }));
          setGpsStatus(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } catch {
          setFormData(prev => ({ ...prev, local: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` }));
          setGpsStatus('Coordenadas obtidas.');
        } finally {
          setIsGpsLoading(false);
        }
      },
      () => {
        setGpsStatus('Erro ao obter GPS.');
        setIsGpsLoading(false);
      }
    );
  };

  const sendWhatsApp = () => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let msg = `*RELATÓRIO DE CAMPO*\n`;
    msg += `*${MONTHS[month].toUpperCase()} ${year}*\n\n`;
    msg += `Meta: ${meta}h\n`;
    msg += `Total: ${stats.monthH}h\n`;
    msg += `Publicações: ${stats.monthPub}\n`;
    msg += `Dias trabalhados: ${stats.monthD}\n\n`;
    msg += `--- Detalhes ---\n`;

    for (let d = 1; d <= daysInMonth; d++) {
      const k = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const e = data[k];
      if (e) {
        msg += `Dia ${d}: ${e.horas}h ${e.territorio ? `| ${e.territorio}` : ''}\n`;
      }
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const today = new Date();
  const isToday = (d: number) => 
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  const progress = Math.min(100, Math.round((stats.monthH / (meta || 1)) * 100));

  return (
    <div className="min-h-screen bg-neutral-50 pb-20 font-sans text-neutral-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-br from-blue-600 to-blue-800 p-4 text-white shadow-lg">
        <div className="mx-auto max-w-lg space-y-3">
          <input 
            className="w-full bg-transparent text-center text-sm italic opacity-90 outline-none hover:bg-white/10 focus:bg-white/10"
            value={annualText}
            onChange={(e) => persistAnnualText(e.target.value)}
          />
          <h1 className="text-center text-xl font-bold tracking-tight">Serviço de Campo</h1>
          <p className="text-center text-[0.7rem] opacity-75">
            "Persistam, então, em buscar primeiro o Reino..." — Mateus 6:33
          </p>
          
          <div className="flex items-center justify-between px-4 pt-2">
            <button onClick={() => changeMonth(-1)} className="rounded-full p-2 hover:bg-white/20">
              <ChevronLeft size={24} />
            </button>
            <span className="text-lg font-bold">{MONTHS[month]} {year}</span>
            <button onClick={() => changeMonth(1)} className="rounded-full p-2 hover:bg-white/20">
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg p-4 space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<Target size={18} />} label="Meta" value={`${meta}h`} color="text-blue-600" />
          <StatCard icon={<Clock size={18} />} label="Mês" value={`${stats.monthH}h`} color="text-green-600" />
          <StatCard icon={<BookOpen size={18} />} label="Pubs" value={stats.monthPub} color="text-orange-600" />
          <StatCard icon={<Calendar size={18} />} label="Ano" value={`${stats.yearH}h`} color="text-purple-600" />
        </div>

        {/* Progress */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold">
            <span className="text-neutral-500">Progresso</span>
            <span className="text-blue-600">{progress}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-100">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className={`h-full ${progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
            />
          </div>
          {meta > stats.monthH && (
            <p className="mt-2 text-center text-xs text-neutral-400">
              Faltam <span className="font-bold text-red-500">{meta - stats.monthH}h</span> para a meta
            </p>
          )}
        </div>

        {/* Pioneer Select */}
        <div className="flex items-center justify-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Pioneiro</span>
          <select 
            value={meta}
            onChange={(e) => persistMeta(parseInt(e.target.value))}
            className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1 text-sm font-medium focus:border-blue-500 focus:outline-none"
          >
            <option value={15}>Auxiliar (15h)</option>
            <option value={30}>Auxiliar (30h)</option>
            <option value={50}>Regular (50h)</option>
            <option value={70}>Antigo (70h)</option>
          </select>
        </div>

        {/* Calendar Grid */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 grid grid-cols-7 text-center text-[0.6rem] font-bold text-neutral-400 uppercase tracking-widest">
            {DAYS_WEEK.map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const k = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const hasData = !!data[k];
              const todayMark = isToday(d);

              return (
                <button
                  key={d}
                  onClick={() => openEntry(k)}
                  className={`relative flex aspect-square items-center justify-center rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95
                    ${hasData ? 'bg-green-100 text-green-700' : 'bg-neutral-50 text-neutral-700'}
                    ${todayMark ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                  `}
                >
                  {d}
                  {hasData && (
                    <div className="absolute top-1 right-1 h-1 w-1 rounded-full bg-green-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* WhatsApp Floating Action */}
        <button 
          onClick={sendWhatsApp}
          className="fixed right-6 bottom-6 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-xl transition-transform hover:scale-110 active:scale-95"
        >
          <Send size={24} />
        </button>
      </main>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
                <h3 className="text-lg font-bold text-neutral-800">
                  {selectedDate && new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="rounded-full p-1 hover:bg-neutral-100">
                  <X />
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
                <InputGroup label="Horas" icon={<Clock size={16}/>}>
                  <input 
                    type="number" step="0.1"
                    className="w-full bg-transparent outline-none"
                    value={formData.horas || ''}
                    onChange={e => setFormData({ ...formData, horas: parseFloat(e.target.value) || 0 })}
                  />
                </InputGroup>

                <InputGroup label="Território" icon={<MapPin size={16}/>}>
                  <input 
                    className="w-full bg-transparent outline-none"
                    value={formData.territorio}
                    onChange={e => setFormData({ ...formData, territorio: e.target.value })}
                  />
                </InputGroup>

                <InputGroup label="Local" icon={<MapPin size={16}/>}>
                  <div className="flex gap-2">
                    <input 
                      className="w-full bg-transparent outline-none"
                      value={formData.local}
                      onChange={e => setFormData({ ...formData, local: e.target.value })}
                    />
                    <button 
                      onClick={getGpsLocation}
                      className={`text-blue-500 ${isGpsLoading ? 'animate-spin' : ''}`}
                    >
                      <MapPin size={20} />
                    </button>
                  </div>
                  {gpsStatus && <p className="mt-1 text-[0.6rem] text-neutral-400">{gpsStatus}</p>}
                </InputGroup>

                <InputGroup label="Morador" icon={<UserIcon size={16}/>}>
                  <input 
                    className="w-full bg-transparent outline-none"
                    value={formData.morador}
                    onChange={e => setFormData({ ...formData, morador: e.target.value })}
                  />
                </InputGroup>

                <InputGroup label="Publicação" icon={<BookOpen size={16}/>}>
                  <input 
                    className="w-full bg-transparent outline-none"
                    value={formData.publicacao}
                    onChange={e => setFormData({ ...formData, publicacao: e.target.value })}
                  />
                </InputGroup>

                <div className="space-y-1">
                  <label className="text-[0.65rem] font-bold text-neutral-400 uppercase">Observações</label>
                  <textarea 
                    rows={3}
                    className="w-full rounded-2xl border-2 border-neutral-100 bg-neutral-50 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.obs}
                    onChange={e => setFormData({ ...formData, obs: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2 border-t border-neutral-100 p-6">
                {data[selectedDate!] && (
                  <button 
                    onClick={deleteEntry}
                    className="flex aspect-square items-center justify-center rounded-2xl bg-red-50 text-red-500 hover:bg-red-100"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-2xl bg-neutral-100 py-3 text-sm font-bold text-neutral-600"
                >
                  Cancelar
                </button>
                <button 
                  onClick={saveEntry}
                  className="flex-[2] rounded-2xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string | number, color: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-3 shadow-sm text-center">
      <div className={`mb-1 ${color}`}>{icon}</div>
      <span className="text-[0.6rem] font-bold text-neutral-400 uppercase tracking-tight">{label}</span>
      <span className="text-sm font-bold text-neutral-800">{value}</span>
    </div>
  );
}

function InputGroup({ label, icon, children }: { label: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[0.65rem] font-bold text-neutral-400 uppercase">{label}</label>
      <div className="flex items-center gap-3 rounded-2xl border-2 border-neutral-100 bg-neutral-50 px-4 py-3 text-sm">
        <div className="text-neutral-400">{icon}</div>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
