import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, X, Lock, Trash2, Edit3, Settings, Clock, CheckCircle, Upload, ChevronLeft, ChevronRight, Users, UserMinus, Search, Calendar, List as ListIcon, Grid, Download, Store, Filter, MapPin, CreditCard, Hash, Layers, MessageCircle, AlertOctagon } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, query, orderBy, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import emailjs from '@emailjs/browser';

// --- Firebase & Config ---
const firebaseConfig = { apiKey: "AIzaSyBkFqTUwtC7MqZ6h4--2_1BmldXEg-Haiw", authDomain: "uniwawa-beauty.com", projectId: "uniwawa-beauty", storageBucket: "uniwawa-beauty.firebasestorage.app", appId: "1:1009617609234:web:3cb5466e79a81c1f1aaecb" };
const app = initializeApp(firebaseConfig), auth = getAuth(app), db = getFirestore(app), storage = getStorage(app), appId = 'uniwawa01';

const CONSTANTS = {
  CATEGORIES: ['極簡氣質', '華麗鑽飾', '藝術手繪', '日系暈染', '貓眼系列'],
  PRICES: ['全部', '1300以下', '1300-1900', '1900以上'],
  WEEKDAYS: ['日', '一', '二', '三', '四', '五', '六'],
  CLEANING_TIME: 20, BOOKING_DAYS: 30,
  IMG_WAWA: "https://drive.google.com/thumbnail?id=19CcU5NwecoqA0Xe4rjmHc_4OM_LGFq78&sz=w1000",
  IMG_STORE: "https://drive.google.com/thumbnail?id=1LKfqD6CfqPsovCs7fO_r6SQY6YcNtiNX&sz=w1000"
};

const NOTICE_ITEMS = [
  { title: "網站預約制", content: "本店採全預約制，請依系統開放的時段與服務項目進行預約，恕不接受臨時客。" },
  { title: "款式說明", content: "服務款式以網站上提供內容為主，暫不提供帶圖或客製設計服務。" },
  { title: "病甲服務說明", content: "為了衛生與施作安全考量，恕不提供病甲（如黴菌感染、卷甲、崁甲、灰指甲等）相關服務。" },
  { title: "遲到規範", content: "若遲到超過 10 分鐘，將視當日狀況調整服務內容；若影響後續預約可能無法施作。" },
  { title: "取消與改期", content: "如需取消或改期，請於預約 24 小時前告知。未提前取消或無故未到者，將無法再接受後續預約。" },
  { title: "保固服務", content: "施作後 7 日內若非人為因素脫落，可協助免費補修，請聯絡官方 LINE 預約補修時間。" },
];
const NOTICE_TEXT = NOTICE_ITEMS.map((i, idx) => `${idx + 1}. ${i.title}: ${i.content}`).join('\n');

const generateTimeSlots = () => {
  const slots = [];
  for (let h = 12; h <= 18; h++) for (let m = 0; m < 60; m += 10) { if (h === 18 && m > 30) break; slots.push(`${h}:${m === 0 ? '00' : m}`); }
  return slots;
};
const TIME_SLOTS = generateTimeSlots();
const timeToMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const getToday = () => new Date().toISOString().split('T')[0];

// --- Components ---
const StyleCard = ({ item, isLoggedIn, onEdit, onDelete, onBook, addons, onTagClick }) => {
  const [idx, setIdx] = useState(0);
  const [aid, setAid] = useState('');
  const imgs = item.images?.length ? item.images : ['https://via.placeholder.com/400x533'];
  const touch = useRef({ start: 0, end: 0 });

  const move = (dir, e) => { e?.stopPropagation(); setIdx((prev) => (prev + dir + imgs.length) % imgs.length); };
  const onTouchEnd = () => {
    const d = touch.current.start - touch.current.end;
    if (Math.abs(d) > 50) move(d > 0 ? 1 : -1);
    touch.current = { start: 0, end: 0 };
  };

  return (
    <div className="group flex flex-col bg-white border border-[#F0EDEA] shadow-sm relative">
      {isLoggedIn && (
        <div className="absolute top-4 right-4 flex gap-2 z-[30]">
          <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-2 bg-white/90 rounded-full text-blue-600 shadow hover:scale-110"><Edit3 size={16}/></button>
          <button onClick={(e) => { e.stopPropagation(); confirm('確定刪除？') && onDelete(item.id); }} className="p-2 bg-white/90 rounded-full text-red-600 shadow hover:scale-110"><Trash2 size={16}/></button>
        </div>
      )}
      <div className="aspect-[3/4] overflow-hidden relative bg-gray-50"
           onTouchStart={e => touch.current.start = e.touches[0].clientX} onTouchMove={e => touch.current.end = e.touches[0].clientX} onTouchEnd={onTouchEnd}>
        <div className="flex w-full h-full transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${idx * 100}%)` }}>
          {imgs.map((src, i) => <img key={i} src={src} className="w-full h-full object-cover flex-shrink-0" loading={i===0?"eager":"lazy"} decoding="async" alt="" />)}
        </div>
        {imgs.length > 1 && <>
          <button onClick={(e) => move(-1, e)} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 rounded-full text-white z-10"><ChevronLeft size={20} /></button>
          <button onClick={(e) => move(1, e)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 rounded-full text-white z-10"><ChevronRight size={20} /></button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">{imgs.map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i===idx?'bg-white':'bg-white/40'}`} />)}</div>
        </>}
      </div>
      <div className="p-6 flex flex-col items-center text-center">
        <span className="text-xs text-[#C29591] tracking-[0.3em] uppercase mb-2 font-medium">{item.category}</span>
        <h3 className="text-[#463E3E] font-medium text-lg tracking-widest mb-1">{item.title}</h3>
        {item.tags?.length > 0 && <div className="flex flex-wrap justify-center gap-2 mb-3 mt-1">{item.tags.map((t, i) => <button key={i} onClick={() => onTagClick(t)} className="text-[10px] text-gray-400 hover:text-[#C29591]">#{t}</button>)}</div>}
        <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-4 uppercase tracking-widest font-light"><Clock size={14} /> 預計服務：{item.duration || '90'} 分鐘</div>
        <p className="text-[#463E3E] font-bold text-xl mb-6"><span className="text-xs font-light tracking-widest mr-1">NT$</span>{item.price.toLocaleString()}</p>
        <select className={`w-full text-sm border py-3 px-4 bg-[#FAF9F6] mb-6 outline-none text-[#463E3E] ${!aid ? 'border-red-200' : 'border-[#EAE7E2]'}`} onChange={e => setAid(e.target.value)} value={aid}>
          <option value="">請選擇指甲現況 (必選)</option>
          {addons.map(a => <option key={a.id} value={a.id}>{a.name} (+${a.price} / +{a.duration}分)</option>)}
        </select>
        <button disabled={!aid} onClick={() => onBook(item, addons.find(a => a.id === aid))} className="bg-[#463E3E] text-white px-8 py-3.5 rounded-full text-xs tracking-[0.2em] font-medium w-full hover:bg-[#C29591] transition-colors disabled:opacity-50 disabled:bg-gray-300">{!aid ? '請先選擇現況' : '點此預約'}</button>
      </div>
    </div>
  );
};

const BaseCalendar = ({ date, onSelect, settings, storeId, fullCheck, bookings, type = 'user' }) => {
  const [viewDate, setViewDate] = useState(date ? new Date(date) : new Date());
  useEffect(() => { if (date) setViewDate(new Date(date)); }, [date]);

  const y = viewDate.getFullYear(), m = viewDate.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const firstDay = new Date(y, m, 1).getDay();
  const today = new Date(); today.setHours(0,0,0,0);
  const maxDate = new Date(today); maxDate.setDate(today.getDate() + CONSTANTS.BOOKING_DAYS);

  const renderDay = (d) => {
    const dStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const target = new Date(y, m, d);
    
    if (type === 'admin') {
      const hasBooking = bookings?.some(b => b.date === dStr);
      return (
        <button key={d} onClick={() => onSelect(dStr)} className={`w-full aspect-square text-xs rounded-lg flex flex-col items-center justify-center gap-1 border ${date === dStr ? 'border-[#C29591] bg-[#FAF9F6] text-[#C29591] font-bold' : 'border-transparent hover:bg-gray-50'}`}>
          <span>{d}</span>{hasBooking && <span className="w-1.5 h-1.5 rounded-full bg-[#C29591]"></span>}
        </button>
      );
    }

    const isH = (settings?.holidays || []).some(h => h.date === dStr && (h.storeId === 'all' || String(h.storeId) === String(storeId)));
    const staff = (settings?.staff || []).filter(s => String(s.storeId) === String(storeId));
    const isAllLeave = staff.length > 0 && (staff.length - staff.filter(s => s.leaveDates?.includes(dStr)).length) <= 0;
    const disabled = isH || isAllLeave || target < today || target > maxDate || (!storeId) || (fullCheck && fullCheck(dStr));
    
    return (
      <button key={d} disabled={disabled} onClick={() => onSelect(dStr)} className={`w-full aspect-square text-sm rounded-full flex items-center justify-center transition-all ${disabled ? 'text-gray-300 line-through cursor-not-allowed' : date === dStr ? 'bg-[#463E3E] text-white' : 'hover:bg-[#C29591] hover:text-white'}`}>{d}</button>
    );
  };

  return (
    <div className={`w-full max-w-md bg-white border border-[#EAE7E2] p-6 shadow-sm mx-auto ${type==='admin'?'md:p-6 p-4':''}`}>
      <div className="flex justify-between items-center mb-6 px-2">
        <h4 className="text-sm font-bold tracking-widest text-[#463E3E]">{y}年 {m + 1}月</h4>
        <div className="flex gap-2">
          <button onClick={() => setViewDate(new Date(y, m - 1, 1))}><ChevronLeft size={18}/></button>
          <button onClick={() => setViewDate(new Date(y, m + 1, 1))}><ChevronRight size={18}/></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 mb-2">{CONSTANTS.WEEKDAYS.map(w => <div key={w} className="flex justify-center text-xs text-gray-400 font-bold">{w}</div>)}</div>
      <div className={`grid grid-cols-7 gap-${type==='admin'?'1':'2'}`}>
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => renderDay(i + 1))}
      </div>
      {type === 'user' && <div className="text-[10px] text-center text-gray-400 mt-4 tracking-widest">僅開放 {CONSTANTS.BOOKING_DAYS} 天內預約</div>}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [ui, setUi] = useState({ tab: 'catalog', step: 'none', modal: null, managerTab: 'stores', view: 'list' }); // modal: 'admin', 'upload', 'manager'
  const [data, setData] = useState({ items: [], addons: [], bookings: [], settings: { stores: [], staff: [], holidays: [], styleCategories: CONSTANTS.CATEGORIES, savedTags: [] } });
  
  const [filters, setFilters] = useState({ style: '全部', price: '全部', tag: '', search: '', adminDate: '', adminStore: 'all' });
  const [forms, setForms] = useState({
    booking: { name: '', phone: '', email: '', date: '', time: '', storeId: '', paymentMethod: '門市付款' },
    item: { title: '', price: '', category: '極簡氣質', duration: '90', images: [], tags: '' },
    addon: { name: '', price: '', duration: '' },
    login: '', newHoliday: { date: '', storeId: 'all' }, newStore: '', newCat: '', newTag: ''
  });
  
  const [selection, setSelection] = useState({ item: null, addon: null, editItem: null, rawFiles: [] });
  const [status, setStatus] = useState({ submitting: false, uploading: false, searchRes: [] });

  // Helpers
  const updateUi = (k, v) => setUi(p => ({ ...p, [k]: v }));
  const updateForm = (type, k, v) => setForms(p => ({ ...p, [type]: { ...p[type], [k]: v } }));
  const resetForm = (type, init) => setForms(p => ({ ...p, [type]: init }));
  const getStore = (id) => data.settings.stores.find(s => s.id === id);
  const calcTotals = () => ({
    dur: (Number(selection.item?.duration) || 90) + (Number(selection.addon?.duration) || 0),
    amt: (Number(selection.item?.price) || 0) + (Number(selection.addon?.price) || 0)
  });

  // Effects
  useEffect(() => { signInAnonymously(auth); onAuthStateChanged(auth, setUser); }, []);
  useEffect(() => {
    if (!user) return;
    const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'settings'), s => s.exists() && setData(p => ({ ...p, settings: { ...p.settings, ...s.data() } })));
    const unsubItems = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), s => setData(p => ({ ...p, items: s.docs.map(d => ({ id: d.id, ...d.data() })) })));
    const unsubAddons = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'addons'), s => setData(p => ({ ...p, addons: s.docs.map(d => ({ id: d.id, ...d.data() })) })));
    const unsubBookings = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), orderBy('createdAt', 'desc')), s => setData(p => ({ ...p, bookings: s.docs.map(d => ({ id: d.id, ...d.data() })) })));
    return () => { unsubSettings(); unsubItems(); unsubAddons(); unsubBookings(); };
  }, [user]);

  // Logic: Booking Check
  const isSlotFull = (date, timeStr) => {
    if (!date || !timeStr || !forms.booking.storeId) return false;
    const checkT = new Date(`${date} ${timeStr}`);
    if (checkT < new Date(Date.now() + 5400000)) return true; // 90mins buffer

    const staff = data.settings.staff.filter(s => String(s.storeId) === String(forms.booking.storeId));
    const availStaff = staff.length - staff.filter(s => s.leaveDates?.includes(date)).length;
    if (availStaff <= 0) return true;

    const start = timeToMin(timeStr), clean = Number(getStore(forms.booking.storeId)?.cleaningTime) || CONSTANTS.CLEANING_TIME;
    const end = start + calcTotals().dur + clean;
    
    const conflicts = data.bookings.filter(b => b.date === date && String(b.storeId) === String(forms.booking.storeId) && 
      ((timeToMin(b.time) < end) && (timeToMin(b.time) + (Number(b.totalDuration) || 90) + clean > start)));
    return conflicts.length >= availStaff;
  };

  useEffect(() => {
    if (ui.step === 'form' && forms.booking.storeId && !forms.booking.date && data.settings.stores.length) {
       let d = new Date();
       for(let i=0; i<CONSTANTS.BOOKING_DAYS; i++) {
         const dStr = d.toISOString().split('T')[0];
         const isH = data.settings.holidays.some(h => h.date === dStr && (h.storeId === 'all' || String(h.storeId) === String(forms.booking.storeId)));
         if(!isH && TIME_SLOTS.some(t => !isSlotFull(dStr, t))) { updateForm('booking', 'date', dStr); break; }
         d.setDate(d.getDate() + 1);
       }
    }
    if (ui.step === 'form' && forms.booking.date && forms.booking.time && isSlotFull(forms.booking.date, forms.booking.time)) updateForm('booking', 'time', '');
  }, [ui.step, forms.booking.storeId, forms.booking.date, data]);

  // Actions
  const handleSaveSettings = (newSet) => setDoc(doc(db, 'artifacts', appId, 'public', 'settings'), newSet);
  const handleBooking = async () => {
    setStatus(p => ({ ...p, submitting: true }));
    const { dur, amt } = calcTotals();
    const payload = { ...forms.booking, storeName: getStore(forms.booking.storeId)?.name || '未指定', itemTitle: selection.item?.title, addonName: selection.addon?.name || '無', totalAmount: amt, totalDuration: dur, createdAt: serverTimestamp() };
    
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), payload);
      await emailjs.send('service_uniwawa', 'template_d5tq1z9', { to_email: forms.booking.email, staff_email: 'unibeatuy@gmail.com', to_name: forms.booking.name, phone: forms.booking.phone, store_name: payload.storeName, booking_date: payload.date, booking_time: payload.time, item_title: payload.itemTitle, addon_name: payload.addonName, total_amount: amt, total_duration: dur, notice_content: NOTICE_TEXT }, 'ehbGdRtZaXWft7qLM');
      alert('預約成功！確認信已發送。'); updateUi('step', 'success');
    } catch (e) { alert(`預約已記錄，但信件發送失敗: ${e}`); updateUi('step', 'success'); }
    finally { setStatus(p => ({ ...p, submitting: false })); }
  };

  const handleUpload = async (e) => {
    e.preventDefault(); setStatus(p => ({ ...p, uploading: true }));
    try {
      let urls = forms.item.images.filter(u => !u.startsWith('blob:'));
      if (selection.rawFiles.length) {
        urls = [...urls, ...await Promise.all(selection.rawFiles.map(async f => getDownloadURL((await uploadBytes(ref(storage, `nail_designs/${Date.now()}_${f.name}`), f)).ref)))];
      }
      const payload = { ...forms.item, price: Number(forms.item.price), duration: Number(forms.item.duration), images: urls, tags: forms.item.tags ? forms.item.tags.split(',').map(t=>t.trim()).filter(t=>t) : [], updatedAt: serverTimestamp() };
      selection.editItem ? await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', selection.editItem.id), payload) 
                         : await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), { ...payload, createdAt: serverTimestamp() });
      updateUi('modal', null); resetForm('item', { title: '', price: '', category: data.settings.styleCategories[0], duration: '90', images: [], tags: '' }); setSelection(p => ({...p, rawFiles: []})); alert("發布成功！");
    } catch (err) { alert("失敗：" + err.message); } finally { setStatus(p => ({ ...p, uploading: false })); }
  };

  const handleSearch = (e) => {
    e.preventDefault(); const kw = filters.search.trim();
    if(!kw) return;
    const res = data.bookings.filter(b => b.name === kw || b.phone === kw).sort((a,b) => new Date(`${b.date} ${b.time}`) - new Date(`${a.date} ${a.time}`));
    setStatus(p=>({...p, searchRes: res})); if(!res.length) alert('查無資料');
  };

  const handleExport = () => {
    const rows = filteredBookings.map(b => [b.date, b.time, b.storeName, b.name, b.phone, b.itemTitle, b.addonName, b.totalAmount, b.totalDuration, b.paymentMethod].join(','));
    const url = URL.createObjectURL(new Blob(['\uFEFF' + ['日期,時間,門市,姓名,電話,項目,加購,金額,時長,付款'].join(',') + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = `預約_${filters.adminStore}_${getToday()}.csv`; a.click();
  };

  // Derived Data
  const validForm = forms.booking.name.trim() && !/\d/.test(forms.booking.name) && forms.booking.phone.length === 10 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forms.booking.email) && forms.booking.time && forms.booking.storeId;
  const filteredItems = data.items.filter(i => (filters.style === '全部' || i.category === filters.style) && (filters.price === '全部' ? true : filters.price === '1300以下' ? i.price < 1300 : filters.price === '1900以上' ? i.price > 1900 : (i.price >= 1300 && i.price <= 1900)) && (!filters.tag || i.tags?.includes(filters.tag)));
  const filteredBookings = data.bookings.filter(b => (filters.adminStore === 'all' || String(b.storeId) === String(filters.adminStore)) && (!filters.adminDate || b.date === filters.adminDate)).sort((a, b) => new Date(`${a.date} ${a.time}`) - new Date(`${b.date} ${b.time}`));

  // Sub-Renderers
  const renderStores = () => (
    <div className="space-y-6 fade-in">
      <div className="flex gap-2">
        <input className="flex-1 border p-2 text-xs outline-none" placeholder="新門市名稱" value={forms.newStore} onChange={e => updateForm('newStore', '', e.target.value)} />
        <button onClick={() => { if(forms.newStore) { handleSaveSettings({ ...data.settings, stores: [...data.settings.stores, { id: Date.now().toString(), name: forms.newStore, cleaningTime: 20 }] }); updateForm('newStore', '', ''); } }} className="bg-[#463E3E] text-white px-4 text-xs">新增</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.settings.stores.map(s => (
          <div key={s.id} className="border p-4 bg-white shadow-sm hover:border-[#C29591] group">
            <div className="flex justify-between mb-3"><span className="font-bold text-sm tracking-widest">{s.name}</span><button onClick={() => confirm('刪除？') && handleSaveSettings({ ...data.settings, stores: data.settings.stores.filter(x => x.id !== s.id) })}><Trash2 size={14} className="text-gray-300 hover:text-red-500"/></button></div>
            <div className="flex items-center gap-2 bg-[#FAF9F6] p-2 rounded"><Clock size={12} className="text-gray-400"/><span className="text-[10px] text-gray-500">整備:</span><input type="number" className="w-10 text-center text-xs p-1 border" defaultValue={s.cleaningTime||20} onBlur={e => handleSaveSettings({...data.settings, stores: data.settings.stores.map(x => x.id===s.id?{...x, cleaningTime: Number(e.target.value)}:x)})} /><span className="text-[10px]">分</span></div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555] font-sans">
      <style>{`::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:#C29591;border-radius:3px}html{overflow-y:scroll}.hide-scrollbar::-webkit-scrollbar{display:none}.fade-in{animation:fadeIn 0.5s ease-in}@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
      
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-[500] border-b border-[#EAE7E2]">
        <div className="max-w-7xl mx-auto px-6 py-4 md:py-0 md:h-20 flex flex-col md:flex-row items-start md:items-center justify-between">
          <h1 className="text-2xl md:text-3xl tracking-[0.4em] font-extralight cursor-pointer text-[#463E3E] mb-4 md:mb-0 w-full md:w-auto text-center md:text-left" onClick={() => updateUi('tab', 'catalog') || updateUi('step', 'none')}>UNIWAWA</h1>
          <div className="flex gap-3 md:gap-6 text-xs md:text-sm tracking-widest font-medium uppercase items-center w-full md:w-auto overflow-x-auto hide-scrollbar justify-center">
            {['about:關於','catalog:款式','notice:須知','store:門市','search:查詢','contact:聯絡'].map(t => { const [k, l] = t.split(':'); return <button key={k} onClick={() => { updateUi('tab', k); updateUi('step', 'none'); if(k==='search') setStatus(p=>({...p, searchRes:[]})); }} className={`flex-shrink-0 ${ui.tab === k ? 'text-[#C29591]' : ''}`}>{l}</button> })}
            {user ? (
              <div className="flex gap-4 border-l pl-4 border-[#EAE7E2]">
                <button onClick={() => { setSelection(p=>({...p, editItem: null})); resetForm('item', {title:'',price:'',category:data.settings.styleCategories[0],duration:'90',images:[],tags:''}); updateUi('modal', 'upload'); }} className="text-[#C29591] hover:scale-110"><Plus size={18}/></button>
                <button onClick={() => updateUi('modal', 'manager')} className="text-[#C29591] hover:scale-110"><Settings size={18}/></button>
              </div>
            ) : <button onClick={() => updateUi('modal', 'admin')} className="text-gray-300 hover:text-[#C29591]"><Lock size={14}/></button>}
          </div>
        </div>
      </nav>

      <main className="pt-32 md:pt-28 pb-12">
        {ui.step === 'form' ? (
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-2xl font-light tracking-[0.3em] text-center mb-8 text-[#463E3E]">RESERVATION / 預約資訊</h2>
            <div className="bg-white border border-[#EAE7E2] mb-6 p-6 shadow-sm flex flex-col md:flex-row gap-6">
               <img src={selection.item?.images?.[0]} className="w-24 h-24 object-cover bg-gray-50 border" alt="" />
               <div className="flex-1"><p className="text-xs text-[#C29591] font-bold">預約項目</p><p className="font-medium">{selection.item?.title} {selection.addon ? `+ ${selection.addon.name}` : ''}</p><p className="text-xs text-gray-400">預計: <span className="font-bold text-[#463E3E]">{calcTotals().dur}</span> 分鐘</p></div>
               <div className="text-right"><p className="text-xs text-gray-400">總金額</p><p className="text-lg font-bold text-[#463E3E]">NT$ {calcTotals().amt.toLocaleString()}</p></div>
            </div>
            <div className="bg-white border border-[#EAE7E2] p-8 shadow-sm space-y-8">
              <div className="border-b pb-6"><label className="block text-xs font-bold text-gray-400 mb-2">預約門市</label><div className="flex flex-wrap gap-3">{data.settings.stores.map(s => <button key={s.id} onClick={() => updateForm('booking', 'storeId', s.id) || updateForm('booking', 'date', '') || updateForm('booking', 'time', '')} className={`px-4 py-2 text-xs border rounded-full transition-all ${String(forms.booking.storeId) === String(s.id) ? 'bg-[#463E3E] text-white border-[#463E3E]' : 'bg-white text-gray-500 hover:border-[#C29591]'}`}>{s.name}</button>)}</div></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative"><input required type="text" placeholder="顧客姓名 (不可含數字)" className={`w-full border-b py-2 outline-none ${/\d/.test(forms.booking.name)?'border-red-300 text-red-500':''}`} value={forms.booking.name} onChange={e => updateForm('booking', 'name', e.target.value)} />{/\d/.test(forms.booking.name) && <span className="absolute -bottom-5 left-0 text-[10px] text-red-500">不可含數字</span>}</div>
                <input required type="tel" placeholder="聯絡電話 (10碼)" className="border-b py-2 outline-none" value={forms.booking.phone} onChange={e => { if(e.target.value.length<=10) updateForm('booking', 'phone', e.target.value.replace(/\D/g,'')); }} />
                <input required type="email" placeholder="電子信箱" className="border-b py-2 outline-none" value={forms.booking.email} onChange={e => updateForm('booking', 'email', e.target.value)} />
                <div className="md:col-span-2 flex items-center gap-2 border-b py-2 text-gray-400"><CreditCard size={16}/><span className="text-xs">付款方式：門市付款</span></div>
              </div>
              <div className="flex justify-center pt-2"><BaseCalendar date={forms.booking.date} onSelect={d => updateForm('booking', 'date', d) || updateForm('booking', 'time', '')} settings={data.settings} storeId={forms.booking.storeId} fullCheck={isSlotFull} /></div>
              {forms.booking.date && forms.booking.storeId && <div className="grid grid-cols-4 md:grid-cols-6 gap-2">{TIME_SLOTS.map(t => <button key={t} disabled={isSlotFull(forms.booking.date, t)} onClick={() => updateForm('booking', 'time', t)} className={`py-2 text-[10px] border ${forms.booking.time===t ? 'bg-[#463E3E] text-white' : 'bg-white disabled:opacity-20'}`}>{t}</button>)}</div>}
              <button disabled={status.submitting || !validForm} onClick={handleBooking} className="w-full py-4 bg-[#463E3E] text-white text-xs tracking-widest uppercase disabled:opacity-50">{status.submitting ? '處理中...' : !forms.booking.storeId ? '請選擇門市' : '確認送出預約'}</button>
            </div>
          </div>
        ) : ui.step === 'success' ? (
          <div className="max-w-lg mx-auto px-6">
            <div className="text-center mb-10"><div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FAF9F6] mb-4"><CheckCircle size={32} className="text-[#C29591]" /></div><h2 className="text-xl font-light tracking-[0.3em] uppercase">Reservation Confirmed</h2><p className="text-[10px] text-gray-400 mt-2">您的預約已成功送出</p></div>
            <div className="bg-white border border-[#EAE7E2] shadow-lg relative"><div className="h-1 w-full bg-[#C29591]"></div>
               <div className="w-full h-56 relative bg-gray-50"><img src={selection.item?.images?.[0]} className="w-full h-full object-cover" alt="" /><div className="absolute inset-0 bg-gradient-to-t from-[#463E3E]/90 to-transparent flex items-end p-6"><div className="text-white"><p className="text-[10px] tracking-[0.2em] opacity-80 uppercase">{selection.item?.category}</p><h3 className="text-lg font-medium">{selection.item?.title}</h3></div></div></div>
               <div className="p-8">
                 <div className="bg-[#FAF9F6] border p-4 text-center mb-8"><p className="text-[10px] text-gray-400 tracking-widest mb-1">預約時間</p><div className="flex justify-center items-baseline gap-2 text-[#463E3E]"><span className="text-lg font-bold">{forms.booking.date}</span><span className="text-[#C29591]">•</span><span className="text-xl font-bold">{forms.booking.time}</span></div><div className="mt-2 text-xs font-bold text-[#C29591]">{getStore(forms.booking.storeId)?.name}</div></div>
                 <div className="space-y-4 text-xs tracking-wide text-[#5C5555]">
                   {[
                     ['顧客姓名', forms.booking.name], ['聯絡電話', forms.booking.phone], ['電子信箱', forms.booking.email], 
                     ['加購項目', selection.addon?.name || '無'], ['預計時長', `${calcTotals().dur} 分鐘`], ['付款方式', forms.booking.paymentMethod]
                   ].map(([l, v]) => <div key={l} className="flex justify-between border-b border-dashed pb-2"><span className="text-gray-400">{l}</span><span className="font-medium">{v}</span></div>)}
                 </div>
                 <div className="mt-8 pt-6 border-t flex justify-between items-end"><span className="text-[10px] font-bold text-gray-400 tracking-[0.2em]">Total</span><div className="text-2xl font-bold text-[#C29591]">NT$ {calcTotals().amt.toLocaleString()}</div></div>
               </div>
            </div>
            <button onClick={() => { updateUi('step', 'none'); updateUi('tab', 'catalog'); }} className="w-full mt-8 bg-[#463E3E] text-white py-4 text-xs tracking-[0.2em] hover:bg-[#C29591] shadow-lg">回到首頁</button>
          </div>
        ) : ui.tab === 'notice' ? (
          <div className="max-w-3xl mx-auto px-6">
             <h2 className="text-2xl font-light tracking-[0.3em] text-center mb-8 text-[#463E3E]">預約須知</h2>
             <div className="bg-white border p-8 md:p-12 shadow-sm relative"><div className="absolute top-0 left-0 w-full h-1 bg-[#C29591]"></div><div className="space-y-5">{NOTICE_ITEMS.map((i, idx) => <div key={idx} className="flex gap-4 border-b border-dashed pb-5 last:border-0"><span className="text-2xl italic text-[#C29591]/80 font-serif">{String(idx+1).padStart(2,'0')}</span><div><h3 className="text-sm font-bold text-[#463E3E] mb-2">{i.title}</h3><p className="text-xs text-gray-500 leading-7 text-justify">{i.content}</p></div></div>)}</div><div className="mt-12 pt-8 border-t text-center"><p className="text-[10px] text-gray-400 tracking-widest flex items-center justify-center gap-2"><AlertOctagon size={14}/> 預約即代表同意以上條款</p></div></div>
          </div>
        ) : ui.tab === 'search' ? (
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-2xl font-light tracking-[0.3em] text-[#463E3E] uppercase text-center mb-8">預約查詢</h2>
            <form onSubmit={handleSearch} className="flex flex-col gap-4 mb-12 bg-white p-8 border shadow-sm"><input type="text" placeholder="輸入預約姓名 或 手機號碼" className="border-b py-3 px-2 outline-none text-xs" value={filters.search} onChange={e => setFilters(p=>({...p, search: e.target.value}))} /><button className="bg-[#463E3E] text-white w-full py-3 text-xs tracking-widest hover:bg-[#C29591] flex justify-center gap-2"><Search size={14}/> 查詢預約</button></form>
            <div className="space-y-6 pb-24">
              {status.searchRes.map(b => {
                 const linked = data.items.find(i => i.title === b.itemTitle);
                 return (
                   <div key={b.id} className="bg-white border shadow-lg relative"><div className="h-1 w-full bg-[#C29591]"></div>
                     {linked?.images?.[0] && <div className="w-full h-40 relative bg-gray-50"><img src={linked.images[0]} className="w-full h-full object-cover" alt="" /><div className="absolute inset-0 bg-gradient-to-t from-[#463E3E]/90 to-transparent flex items-end p-4"><div className="text-white"><p className="text-[10px] tracking-[0.2em] opacity-80 uppercase">{linked.category}</p><h3 className="text-sm font-medium">{b.itemTitle}</h3></div></div></div>}
                     <div className="p-8">
                       <div className="bg-[#FAF9F6] border p-4 text-center mb-8"><p className="text-[10px] text-gray-400 tracking-widest mb-1">預約時間</p><div className="flex justify-center items-baseline gap-2 text-[#463E3E]"><span className="text-lg font-bold">{b.date}</span><span className="text-[#C29591]">•</span><span className="text-xl font-bold">{b.time}</span></div><div className="mt-2 text-xs font-bold text-[#C29591]">{b.storeName}</div></div>
                       <div className="space-y-4 text-xs tracking-wide text-[#5C5555]">{[['顧客姓名', b.name],['聯絡電話', b.phone],['加購項目', b.addonName],['總時長', `${b.totalDuration} 分鐘`],['付款方式', b.paymentMethod||'門市付款']].map(([l, v]) => <div key={l} className="flex justify-between border-b border-dashed pb-2"><span className="text-gray-400">{l}</span><span className="font-medium text-[#463E3E]">{v}</span></div>)}</div>
                       <div className="mt-8 pt-6 border-t flex justify-between items-end"><span className="text-[10px] font-bold text-gray-400 tracking-[0.2em]">Total</span><div className="text-2xl font-bold text-[#C29591]">NT$ {b.totalAmount?.toLocaleString()}</div></div>
                     </div>
                   </div>
                 );
              })}
            </div>
          </div>
        ) : ui.tab === 'store' ? (
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-2xl font-light tracking-[0.3em] text-center mb-8 text-[#463E3E]">門市資訊</h2>
            <div className="bg-white border hover:border-[#C29591] transition-colors md:w-1/2 mx-auto">
               <div className="aspect-video bg-gray-100 overflow-hidden relative group"><img src={CONSTANTS.IMG_STORE} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" /></div>
               <div className="p-8"><h3 className="text-lg font-medium tracking-widest text-[#463E3E] mb-2">桃園文中店</h3><div className="w-8 h-[1px] bg-[#C29591] mb-6"></div><div className="flex items-start gap-3 text-xs text-gray-500 mb-6"><MapPin size={16} className="text-[#C29591]" /><span>桃園區文中三路 67 號 1 樓</span></div><button onClick={()=>window.open('https://www.google.com/maps/search/?api=1&query=桃園區文中三路67號1樓','_blank')} className="w-full border py-3 text-xs tracking-widest text-gray-400 hover:bg-[#463E3E] hover:text-white transition-all">GOOGLE MAPS</button></div>
            </div>
          </div>
        ) : ui.tab === 'about' ? (
           <div className="max-w-3xl mx-auto px-6">
             <h2 className="text-2xl font-light tracking-[0.3em] text-[#463E3E] text-center mb-8">關於 UNIWAWA</h2>
             <div className="bg-white border p-8 md:p-12 shadow-sm relative"><div className="absolute top-0 left-0 w-full h-1 bg-[#C29591]"></div>
                <div className="flex flex-col md:flex-row gap-8 items-center"><div className="w-full md:w-5/12 aspect-[4/5] bg-gray-100 border"><img src={CONSTANTS.IMG_WAWA} className="w-full h-full object-cover" alt="" /></div><div className="flex-1 space-y-6 text-xs text-gray-500 leading-8 text-justify"><p>創業八年的 <span className="font-bold text-[#463E3E]">UNIWAWA 藝術蛋糕師 Wawa</span>，始終對美有著不懈的追求與獨到的見解。</p><p>為了將這份美感延伸至不同的創作形式，Wawa 成立了全新的美甲品牌。</p><p>無論是甜點還是美甲，UNIWAWA 都致力於傳遞一份純粹的美好與感動。</p></div></div>
                <div className="mt-12 pt-8 border-t text-center"><button onClick={() => updateUi('tab', 'catalog')} className="bg-[#463E3E] text-white px-8 py-3 text-xs tracking-widest hover:bg-[#C29591] rounded-full">查看款式</button></div>
             </div>
           </div>
        ) : ui.tab === 'contact' ? (
           <div className="max-w-3xl mx-auto px-6">
              <h2 className="text-2xl font-light tracking-[0.3em] text-[#463E3E] text-center mb-8">聯絡我們</h2>
              <div className="bg-white p-10 border shadow-sm text-center"><p className="text-xs text-gray-500 mb-6 leading-relaxed">如有任何疑問，歡迎加入 LINE 官方帳號諮詢<br/>(預約請直接使用網站功能)</p><a href="https://lin.ee/X91bkZ6" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-[#06C755] text-white px-8 py-3 rounded-full font-bold hover:opacity-90 tracking-widest text-sm"><MessageCircle size={20} />加入 LINE 好友</a></div>
           </div>
        ) : (
          <div className="max-w-7xl mx-auto px-6 space-y-8">
            <div className="flex flex-col gap-6 border-b pb-8 mb-8">
               <div className="flex flex-col md:flex-row gap-2 items-start"><span className="text-[10px] text-gray-400 font-bold w-16 pt-2">STYLE</span><div className="flex flex-wrap gap-2 flex-1">{['全部', ...data.settings.styleCategories].map(c => <button key={c} onClick={() => setFilters(p=>({...p, style:c}))} className={`px-4 py-1.5 text-xs rounded-full border ${filters.style===c?'bg-[#463E3E] text-white border-[#463E3E]':'bg-white text-gray-500 hover:border-[#C29591]'}`}>{c}</button>)}</div></div>
               <div className="flex flex-col md:flex-row gap-2 items-start"><span className="text-[10px] text-gray-400 font-bold w-16 pt-2">PRICE</span><div className="flex flex-wrap gap-2 flex-1">{CONSTANTS.PRICES.map(p => <button key={p} onClick={() => setFilters(p=>({...p, price:p}))} className={`px-4 py-1.5 text-xs rounded-full border ${filters.price===p?'bg-[#463E3E] text-white border-[#463E3E]':'bg-white text-gray-500 hover:border-[#C29591]'}`}>{p}</button>)}</div></div>
               {filters.tag && <div className="flex justify-center mt-2"><button onClick={() => setFilters(p=>({...p, tag:''}))} className="flex items-center gap-2 bg-[#C29591] text-white px-4 py-1.5 rounded-full text-xs hover:bg-[#463E3E]">瀏覽標籤：#{filters.tag} <X size={14}/></button></div>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16 pb-24">
               {filteredItems.map(item => <StyleCard key={item.id} item={item} isLoggedIn={!!user} onEdit={i => { setSelection(p=>({...p, editItem:i})); updateForm('item', 'tags', i.tags?.join(', ') || ''); updateForm('item', 'title', i.title); updateForm('item', 'price', i.price); updateForm('item', 'category', i.category); updateForm('item', 'duration', i.duration); updateForm('item', 'images', i.images); updateUi('modal', 'upload'); }} onDelete={id => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', id))} onBook={(i, a) => { setSelection({ item: i, addon: a }); updateForm('booking', 'storeId', ''); updateForm('booking', 'date', ''); updateForm('booking', 'time', ''); updateUi('step', 'form'); window.scrollTo(0,0); }} onTagClick={t => setFilters(p=>({...p, tag:t}))} addons={data.addons} />)}
            </div>
          </div>
        )}
      </main>

      {/* Admin Login */}
      {ui.modal === 'admin' && <div className="fixed inset-0 bg-black/40 z-[250] flex items-center justify-center p-4"><div className="bg-white p-10 max-w-sm w-full shadow-2xl"><h3 className="tracking-[0.5em] mb-10 font-light text-gray-400 text-sm uppercase text-center">Admin Access</h3><form onSubmit={e=>{e.preventDefault();if(forms.login==='8888')setUser(true);updateUi('modal',null);}}><input type="password" placeholder="••••" className="w-full border-b py-4 text-center tracking-[1.5em] outline-none" onChange={e=>updateForm('login','',e.target.value)} autoFocus /><button className="w-full bg-[#463E3E] text-white py-4 mt-6 text-xs tracking-widest">ENTER</button></form></div></div>}

      {/* Upload Modal */}
      {ui.modal === 'upload' && <div className="fixed inset-0 bg-black/40 z-[1000] flex items-center justify-center p-4"><div className="bg-white p-8 max-w-md w-full max-h-[90vh] overflow-y-auto"><div className="flex justify-between items-center mb-6"><h3 className="tracking-widest font-light">{selection.editItem?'修改':'上傳'}</h3><button onClick={()=>updateUi('modal',null)}><X size={20}/></button></div>
        <form onSubmit={handleUpload} className="space-y-6">
          <input required className="w-full border-b py-2 outline-none" value={forms.item.title} onChange={e=>updateForm('item','title',e.target.value)} placeholder="名稱" />
          <div className="flex gap-4"><input required type="number" className="w-1/2 border-b py-2" value={forms.item.price} onChange={e=>updateForm('item','price',e.target.value)} placeholder="價格" /><input required type="number" className="w-1/2 border-b py-2" value={forms.item.duration} onChange={e=>updateForm('item','duration',e.target.value)} placeholder="時間(分)" /></div>
          <select value={forms.item.category} onChange={e=>updateForm('item','category',e.target.value)} className="w-full border-b py-2 bg-white">{data.settings.styleCategories.map(c=><option key={c} value={c}>{c}</option>)}</select>
          <input className="w-full border-b py-2" value={forms.item.tags} onChange={e=>updateForm('item','tags',e.target.value)} placeholder="標籤 (逗號分隔)" />
          {data.settings.savedTags?.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{data.settings.savedTags.map(t => <button type="button" key={t} onClick={() => { const cur = forms.item.tags.split(',').map(x=>x.trim()); if(!cur.includes(t)) updateForm('item', 'tags', [...cur, t].filter(x=>x).join(', ')); }} className="text-[9px] bg-gray-100 text-gray-500 px-2 py-1 rounded-full hover:bg-[#C29591] hover:text-white">#{t}</button>)}</div>}
          <div className="flex flex-wrap gap-2">{forms.item.images.map((img,i) => <div key={i} className="relative w-20 h-20 border"><img src={img} className="w-full h-full object-cover" alt="" /><button type="button" onClick={()=>updateForm('item','images',forms.item.images.filter((_,x)=>x!==i))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"><X size={12}/></button></div>)}<label className="w-20 h-20 border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-[#C29591]"><Upload size={16}/><input type="file" hidden accept="image/*" multiple onChange={e => { const f = Array.from(e.target.files).filter(x => x.size < 1048576); setSelection(p=>({...p, rawFiles: [...p.rawFiles, ...f]})); updateForm('item', 'images', [...forms.item.images, ...f.map(x=>URL.createObjectURL(x))]); }} /></label></div>
          <button disabled={status.uploading} className="w-full bg-[#463E3E] text-white py-4 text-xs tracking-widest">{status.uploading?'處理中...':'確認發布'}</button>
        </form></div></div>}

      {/* Manager Modal */}
      {ui.modal === 'manager' && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center md:p-4"><div className="bg-white w-full h-full md:max-w-[98vw] md:h-[95vh] flex flex-col md:rounded-lg">
           <div className="px-8 py-6 border-b flex justify-between items-center"><h3 className="text-xs tracking-[0.3em] font-bold text-[#463E3E]">系統管理</h3><button onClick={()=>updateUi('modal',null)}><X size={24}/></button></div>
           <div className="flex border-b bg-[#FAF9F6] px-8 overflow-x-auto hide-scrollbar">{[['stores',<Store size={14}/>,'門市'],['attributes',<Layers size={14}/>,'屬性'],['staff_holiday',<Users size={14}/>,'人員'],['bookings',<Calendar size={14}/>,'預約']].map(([k,i,l]) => <button key={k} onClick={()=>updateUi('managerTab',k)} className={`flex items-center gap-2 px-6 py-4 text-xs whitespace-nowrap ${ui.managerTab===k?'bg-white border-x border-t text-[#C29591] font-bold -mb-[1px]':'text-gray-400'}`}>{i} {l}</button>)}</div>
           <div className="flex-1 overflow-y-auto p-8 space-y-12">
             {ui.managerTab === 'stores' && renderStores()}
             {ui.managerTab === 'attributes' && (
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 fade-in">
                 <div className="space-y-4 border-b lg:border-b-0 lg:border-r pb-8 lg:pr-8">
                   <h4 className="text-sm font-bold tracking-widest border-l-4 border-[#C29591] pl-4">風格分類</h4>
                   <div className="flex gap-2"><input className="flex-1 border p-2 text-xs" placeholder="新分類" value={forms.newCat} onChange={e=>updateForm('newCat','',e.target.value)} /><button onClick={()=>{if(forms.newCat && !data.settings.styleCategories.includes(forms.newCat)) { handleSaveSettings({...data.settings, styleCategories: [...data.settings.styleCategories, forms.newCat]}); updateForm('newCat','',''); }}} className="bg-[#463E3E] text-white px-3 text-xs">新增</button></div>
                   <div className="flex flex-wrap gap-2">{data.settings.styleCategories.map(c => <div key={c} className="group relative bg-[#FAF9F6] border px-3 py-2 text-xs">{c}<button onClick={()=>confirm('刪除？')&&handleSaveSettings({...data.settings,styleCategories:data.settings.styleCategories.filter(x=>x!==c)})} className="absolute -top-2 -right-2 bg-red-400 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"><X size={10}/></button></div>)}</div>
                 </div>
                 <div className="space-y-4 border-b lg:border-b-0 lg:border-r pb-8 lg:pr-8">
                   <h4 className="text-sm font-bold tracking-widest border-l-4 border-[#C29591] pl-4">常用標籤</h4>
                   <div className="flex gap-2"><input className="flex-1 border p-2 text-xs" placeholder="新標籤" value={forms.newTag} onChange={e=>updateForm('newTag','',e.target.value)} /><button onClick={()=>{if(forms.newTag && !data.settings.savedTags.includes(forms.newTag)) { handleSaveSettings({...data.settings, savedTags: [...data.settings.savedTags, forms.newTag]}); updateForm('newTag','',''); }}} className="bg-[#463E3E] text-white px-3 text-xs">新增</button></div>
                   <div className="flex flex-wrap gap-2">{data.settings.savedTags.map(t => <div key={t} className="group relative bg-[#FAF9F6] border px-3 py-2 text-xs rounded-full">#{t}<button onClick={()=>handleSaveSettings({...data.settings,savedTags:data.settings.savedTags.filter(x=>x!==t)})} className="absolute -top-1 -right-1 bg-red-400 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"><X size={8}/></button></div>)}</div>
                 </div>
                 <div className="space-y-4">
                   <h4 className="text-sm font-bold tracking-widest border-l-4 border-[#C29591] pl-4">加購品項</h4>
                   <div className="bg-[#FAF9F6] p-4 border space-y-3">
                     <input className="w-full border p-2 text-xs" placeholder="名稱" value={forms.addon.name} onChange={e=>updateForm('addon','name',e.target.value)} />
                     <div className="flex gap-2"><input type="number" className="w-1/2 border p-2 text-xs" placeholder="金額" value={forms.addon.price} onChange={e=>updateForm('addon','price',e.target.value)} /><input type="number" className="w-1/2 border p-2 text-xs" placeholder="分鐘" value={forms.addon.duration} onChange={e=>updateForm('addon','duration',e.target.value)} /></div>
                     <button onClick={async()=>{if(forms.addon.name && forms.addon.price) { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'addons'), {...forms.addon, price:Number(forms.addon.price), duration:Number(forms.addon.duration||0), createdAt:serverTimestamp()}); resetForm('addon', {name:'',price:'',duration:''}); }}} className="w-full bg-[#463E3E] text-white py-2 text-[10px] tracking-widest uppercase">新增項目</button>
                   </div>
                   <div className="space-y-2 max-h-60 overflow-y-auto">{data.addons.map(a => <div key={a.id} className="border p-3 flex justify-between bg-white text-xs"><div><div className="font-bold">{a.name}</div><div className="text-gray-400">+${a.price} / {a.duration}分</div></div><button onClick={()=>confirm('刪除？') && deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'addons', a.id))}><Trash2 size={12} className="text-gray-300 hover:text-red-500"/></button></div>)}</div>
                 </div>
               </div>
             )}
             {ui.managerTab === 'staff_holiday' && (
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 fade-in">
                 <div className="space-y-4">
                   <div className="flex justify-between items-center border-l-4 border-[#C29591] pl-4"><h4 className="text-sm font-bold tracking-widest">人員名單</h4><button onClick={()=>{const n=prompt("姓名:"); if(n) handleSaveSettings({...data.settings, staff: [...data.settings.staff, {id:Date.now().toString(), name:n, storeId: data.settings.stores[0]?.id||'', leaveDates:[]}]})}} className="text-[10px] bg-[#C29591] text-white px-4 py-2 rounded-full">+ 新增</button></div>
                   {data.settings.staff.map(s => (
                     <div key={s.id} className="bg-[#FAF9F6] border p-5 space-y-4">
                       <div className="flex justify-between items-center"><div className="flex items-center gap-2 font-bold text-xs"><Users size={14} className="text-[#C29591]"/> {s.name} <select value={s.storeId} onChange={e => handleSaveSettings({...data.settings, staff: data.settings.staff.map(x=>x.id===s.id?{...x,storeId:e.target.value}:x)})} className="text-[10px] border bg-white p-1 ml-2 font-normal">{data.settings.stores.map(st=><option key={st.id} value={st.id}>{st.name}</option>)}</select></div><button onClick={()=>confirm('刪除？')&&handleSaveSettings({...data.settings, staff: data.settings.staff.filter(x=>x.id!==s.id)})}><Trash2 size={14} className="text-gray-300 hover:text-red-500"/></button></div>
                       <div className="border-t pt-4"><label className="text-[10px] font-bold text-gray-400 flex items-center gap-1 mb-2"><UserMinus size={12}/> 設定請假</label><input type="date" className="text-[10px] border p-2 w-full" onChange={e => { if(e.target.value) handleSaveSettings({...data.settings, staff: data.settings.staff.map(x=>x.id===s.id?{...x, leaveDates: [...(x.leaveDates||[]), e.target.value].sort()}:x)}); }} /> <div className="flex flex-wrap gap-1 mt-2">{s.leaveDates?.map(d=><span key={d} className="text-[9px] bg-red-50 text-red-500 px-2 py-1 flex items-center gap-1 border border-red-100">{d} <X size={10} className="cursor-pointer" onClick={()=>handleSaveSettings({...data.settings, staff: data.settings.staff.map(x=>x.id===s.id?{...x, leaveDates: x.leaveDates.filter(y=>y!==d)}:x)})}/></span>)}</div></div>
                     </div>
                   ))}
                 </div>
                 <div className="space-y-4">
                    <h4 className="text-sm font-bold tracking-widest border-l-4 border-[#C29591] pl-4">門市公休</h4>
                    <div className="flex gap-2 items-center bg-[#FAF9F6] p-3 border"><select className="text-xs border p-2 bg-white" value={forms.newHoliday.storeId} onChange={e=>updateForm('newHoliday','storeId',e.target.value)}><option value="all">全品牌</option>{data.settings.stores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><input type="date" className="flex-1 p-2 border text-xs" value={forms.newHoliday.date} onChange={e=>updateForm('newHoliday','date',e.target.value)} /><button onClick={()=>{ if(forms.newHoliday.date) handleSaveSettings({...data.settings, holidays: [...data.settings.holidays, forms.newHoliday]}); }} className="bg-[#463E3E] text-white px-4 py-2 text-[10px]">新增</button></div>
                    <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">{data.settings.holidays.map((h,i) => <span key={i} className="text-[10px] bg-gray-100 text-gray-500 px-3 py-1.5 border flex items-center gap-2">{h.date} ({h.storeId==='all'?'全':data.settings.stores.find(s=>s.id===h.storeId)?.name}) <X size={12} className="cursor-pointer" onClick={()=>handleSaveSettings({...data.settings, holidays: data.settings.holidays.filter((_,idx)=>idx!==i)})} /></span>)}</div>
                 </div>
               </div>
             )}
             {ui.managerTab === 'bookings' && (
               <div className="space-y-6 fade-in h-full flex flex-col">
                 <div className="flex justify-between items-center border-b border-dashed pb-4">
                   <div className="border-l-4 border-[#C29591] pl-4"><h4 className="text-sm font-bold tracking-widest">預約管理</h4><p className="text-[10px] text-gray-400 mt-1">查看與管理訂單</p></div>
                   <div className="flex gap-2 items-center bg-[#FAF9F6] p-1 rounded-lg">
                     <div className="flex items-center px-2"><Filter size={14} className="text-gray-400 mr-1"/><select className="text-xs border-none bg-transparent font-medium" value={filters.adminStore} onChange={e=>setFilters(p=>({...p, adminStore:e.target.value}))}><option value="all">全部分店</option>{data.settings.stores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div className="w-[1px] h-6 bg-gray-300 mx-1"></div>
                     <button onClick={()=>updateUi('view','list')} className={`p-2 rounded ${ui.view==='list'?'bg-white shadow text-[#C29591]':'text-gray-400'}`}><ListIcon size={16}/></button><button onClick={()=>updateUi('view','calendar')||setFilters(p=>({...p, adminDate: getToday()}))} className={`p-2 rounded ${ui.view==='calendar'?'bg-white shadow text-[#C29591]':'text-gray-400'}`}><Grid size={16}/></button><button onClick={handleExport} className="p-2 text-gray-400 hover:text-[#C29591]"><Download size={16}/></button>
                   </div>
                 </div>
                 {ui.view === 'list' ? (
                   <div className="space-y-3 overflow-y-auto pr-2 flex-1">{filteredBookings.map(b => (
                     <div key={b.id} className="border p-4 flex justify-between bg-[#FAF9F6] text-[11px] hover:border-[#C29591]">
                       <div><div className="font-bold text-sm mb-1 flex items-center gap-2">{b.date} <span className="text-[#C29591]">{b.time}</span><span className="bg-white border px-1.5 rounded text-gray-400">{b.storeName}</span></div><div className="font-bold">{b.name} | {b.phone}</div><div className="text-gray-500 mt-1">{b.itemTitle} {b.addonName!=='無' && <span className="text-[#C29591]">+ {b.addonName}</span>}</div></div>
                       <button onClick={()=>confirm('取消預約？') && deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', b.id))} className="text-gray-300 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                     </div>
                   ))}</div>
                 ) : (
                   <div className="flex flex-col md:flex-row gap-8 h-full">
                     <div className="flex-shrink-0"><BaseCalendar type="admin" date={filters.adminDate} onSelect={d=>setFilters(p=>({...p, adminDate:d}))} bookings={filteredBookings} /></div>
                     <div className="flex-1 overflow-y-auto border-l border-dashed pl-8 space-y-3">
                       <h5 className="text-xs font-bold text-[#463E3E] mb-4 flex items-center gap-2"><Calendar size={14}/> {filters.adminDate} 的預約</h5>
                       {filteredBookings.length ? filteredBookings.map(b => (
                         <div key={b.id} className="border p-4 bg-white shadow-sm text-xs relative overflow-hidden"><div className="absolute left-0 top-0 bottom-0 w-1 bg-[#C29591]"></div><div className="flex justify-between"><div className="flex gap-2 items-baseline"><span className="font-bold text-lg">{b.time}</span><span className="text-[10px] text-gray-400 border px-1 rounded">{b.storeName}</span></div><button onClick={()=>confirm('取消？')&&deleteDoc(doc(db,'artifacts',appId,'public','data','bookings',b.id))} className="text-gray-300 hover:text-red-500"><Trash2 size={14}/></button></div><div className="mt-1 font-bold">{b.name}</div><div className="text-gray-400">{b.phone}</div><div className="mt-2 pt-2 border-t border-dashed flex justify-between"><span>{b.itemTitle}</span><span className="text-[#C29591] font-bold">NT${b.totalAmount}</span></div></div>
                       )) : <p className="text-gray-300 text-xs text-center py-10">無預約</p>}
                     </div>
                   </div>
                 )}
               </div>
             )}
           </div>
        </div>
      )}
    </div>
  );
}