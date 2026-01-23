import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, X, Lock, Trash2, Edit3, Settings, Clock, CheckCircle, Upload, ChevronLeft, ChevronRight, Users, UserMinus, Search, Calendar, List as ListIcon, Grid, Download, Store, Filter, MapPin, CreditCard, Hash, Layers, MessageCircle, AlertOctagon, Ban, ArrowDownUp } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, query, orderBy, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import emailjs from '@emailjs/browser';

const firebaseConfig = {
  apiKey: "AIzaSyBkFqTUwtC7MqZ6h4--2_1BmldXEg-Haiw",
  authDomain: "uniwawa-beauty.com", 
  projectId: "uniwawa-beauty",
  storageBucket: "uniwawa-beauty.firebasestorage.app",
  appId: "1:1009617609234:web:3cb5466e79a81c1f1aaecb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const appId = 'uniwawa01';

const CONSTANTS = {
  CATS: ['極簡氣質', '華麗鑽飾', '藝術手繪', '日系暈染', '貓眼系列', '單色/貓眼/鏡面', '純保養'],
  PRICES: ['全部', '1400以下', '1400-1800', '1800以上'], 
  DAYS: ['日', '一', '二', '三', '四', '五', '六'],
  CLEAN: 20, MAX_DAYS: 30,
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
  for (let h = 12; h <= 18; h++) {
    for (let m = 0; m < 60; m += 10) {
      if (h === 18 && m > 30) break;
      slots.push(`${h}:${m === 0 ? '00' : m}`);
    }
  }
  return slots;
};
const TIME_SLOTS = generateTimeSlots();

const timeToMin = (t) => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const getTodayStr = () => new Date().toISOString().split('T')[0];

const StyleCard = ({ item, isLoggedIn, onEdit, onDelete, onBook, addons, onTagClick }) => {
  const [idx, setIdx] = useState(0);
  const [addonId, setAddonId] = useState('');
  const imgs = item.images?.length ? item.images : ['https://via.placeholder.com/400x533'];
  const ts = useRef(0); const te = useRef(0);

  const move = (dir) => setIdx((p) => (p + dir + imgs.length) % imgs.length);
  const handleTouch = (e, type) => {
    if (type === 's') { te.current = null; ts.current = e.targetTouches[0].clientX; }
    if (type === 'm') te.current = e.targetTouches[0].clientX;
    if (type === 'e' && ts.current && te.current) {
      const d = ts.current - te.current;
      if (Math.abs(d) > 50) move(d > 0 ? 1 : -1);
    }
  };

  return (
    <div className="group flex flex-col bg-white border border-[#F0EDEA] shadow-sm relative">
      {isLoggedIn && (
        <div className="absolute top-4 right-4 flex gap-2 z-[30]">
          <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-2 bg-white/90 rounded-full text-gray-600 shadow-sm hover:scale-110 transition-transform"><Edit3 size={16}/></button>
          <button onClick={(e) => { e.stopPropagation(); confirm('確定刪除？') && onDelete(item.id); }} className="p-2 bg-white/90 rounded-full text-gray-600 shadow-sm hover:scale-110 transition-transform"><Trash2 size={16}/></button>
        </div>
      )}
      <div className="aspect-[3/4] overflow-hidden relative bg-gray-50" onTouchStart={e=>handleTouch(e,'s')} onTouchMove={e=>handleTouch(e,'m')} onTouchEnd={e=>handleTouch(e,'e')}>
        <div className="flex w-full h-full transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${idx * 100}%)` }}>
          {imgs.map((src, i) => (<img key={i} src={src} className="w-full h-full object-cover flex-shrink-0" loading={i===0?"eager":"lazy"} decoding="async" alt="" />))}
        </div>
        {imgs.length > 1 && <>
          <button onClick={(e) => {e.stopPropagation(); move(-1)}} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full z-10"><ChevronLeft size={20}/></button>
          <button onClick={(e) => {e.stopPropagation(); move(1)}} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full z-10"><ChevronRight size={20}/></button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {imgs.map((_, i) => (<div key={i} className={`w-1.5 h-1.5 rounded-full shadow-sm transition-colors ${i === idx ? 'bg-white' : 'bg-white/40'}`} />))}
          </div>
        </>}
      </div>
      <div className="p-6 flex flex-col items-center text-center">
        <span className="text-xs text-[#C29591] tracking-[0.3em] uppercase mb-2 font-medium">{item.category}</span>
        <h3 className="text-[#463E3E] font-medium text-lg tracking-widest mb-1">{item.title}</h3>
        {item.tags?.length > 0 && <div className="flex flex-wrap justify-center gap-2 mb-3 mt-1">{item.tags.map((t, i) => <button key={i} onClick={() => onTagClick(t)} className="text-[10px] text-gray-400 hover:text-[#C29591]">#{t}</button>)}</div>}
        <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-4 uppercase tracking-widest font-light"><Clock size={14} /> 預計服務：{item.duration || '90'} 分鐘</div>
        <p className="text-[#463E3E] font-bold text-xl mb-6"><span className="text-xs font-light tracking-widest mr-1">NT$</span>{item.price.toLocaleString()}</p>
        <select className={`w-full text-sm border py-3 px-4 bg-[#FAF9F6] mb-6 outline-none text-[#463E3E] ${!addonId ? 'border-red-200' : 'border-[#EAE7E2]'}`} onChange={(e) => setAddonId(e.target.value)} value={addonId}>
          <option value="">請選擇指甲現況 (必選)</option>
          {addons.map(a => <option key={a.id} value={a.id}>{a.name} (+${a.price} / +{a.duration}分)</option>)}
        </select>
        <button disabled={!addonId} onClick={() => onBook(item, addons.find(a => a.id === addonId))} className="bg-[#463E3E] text-white px-8 py-3.5 rounded-full text-xs tracking-[0.2em] font-medium w-full hover:bg-[#C29591] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300">
            {!addonId ? '請先選擇現況' : '點此預約'}
        </button>
      </div>
    </div>
  );
};

const CustomCalendar = ({ selectedDate, onDateSelect, settings, selectedStoreId, isDayFull }) => {
  const [viewDate, setViewDate] = useState(selectedDate ? new Date(selectedDate) : new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date(); today.setHours(0,0,0,0);
  const maxDate = new Date(today); maxDate.setDate(today.getDate() + CONSTANTS.MAX_DAYS);

  const days = Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => i + 1);
  const blanks = Array.from({ length: new Date(year, month, 1).getDay() }, (_, i) => i);

  return (
    <div className="w-full max-w-md bg-white border border-[#EAE7E2] p-6 shadow-sm mx-auto">
      <div className="flex justify-between items-center mb-6 px-2">
        <h4 className="text-sm font-bold tracking-widest text-[#463E3E]">{year}年 {month + 1}月</h4>
        <div className="flex gap-2">
          <button onClick={() => setViewDate(new Date(year, month - 1, 1))}><ChevronLeft size={18}/></button>
          <button onClick={() => setViewDate(new Date(year, month + 1, 1))}><ChevronRight size={18}/></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 mb-2">{CONSTANTS.DAYS.map(w => <div key={w} className="w-full aspect-square flex items-center justify-center text-xs text-gray-400 font-bold">{w}</div>)}</div>
      <div className="grid grid-cols-7 gap-2">
        {blanks.map(i => <div key={`e-${i}`} />)}
        {days.map(d => {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const tDate = new Date(year, month, d);
          const isHoliday = (settings?.holidays || []).some(h => h.date === dateStr && (h.storeId === 'all' || String(h.storeId) === String(selectedStoreId)));
          const staff = (settings?.staff || []).filter(s => String(s.storeId) === String(selectedStoreId));
          const allLeave = staff.length > 0 && staff.every(s => (s.leaveDates || []).includes(dateStr));
          const disabled = isHoliday || allLeave || tDate < today || !selectedStoreId || tDate > maxDate || isDayFull(dateStr);
          return (
            <button key={d} disabled={disabled} onClick={() => onDateSelect(dateStr)} className={`w-full aspect-square text-sm rounded-full flex items-center justify-center transition-all ${disabled ? 'text-gray-300 line-through cursor-not-allowed' : selectedDate === dateStr ? 'bg-[#463E3E] text-white' : 'hover:bg-[#C29591] hover:text-white'}`}>{d}</button>
          );
        })}
      </div>
      <div className="text-[10px] text-center text-gray-400 mt-4 tracking-widest">僅開放 {CONSTANTS.MAX_DAYS} 天內預約</div>
    </div>
  );
};

const AdminBookingCalendar = ({ bookings, onDateSelect, selectedDate }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const year = viewDate.getFullYear(); 
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  useEffect(() => {
      if(selectedDate) setViewDate(new Date(selectedDate));
  }, [selectedDate]);

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="w-full aspect-square"></div>);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const hasBooking = bookings.some(b => b.date === dateStr);
    const isSelected = selectedDate === dateStr;
    days.push(
      <button key={d} onClick={() => onDateSelect(dateStr)}
        className={`w-full aspect-square text-xs rounded-lg flex flex-col items-center justify-center gap-1 transition-all border
        ${isSelected ? 'border-[#C29591] bg-[#FAF9F6] text-[#C29591] font-bold' : 'border-transparent hover:bg-gray-50'}`}>
        <span>{d}</span>
        {hasBooking && <span className="w-1.5 h-1.5 rounded-full bg-[#C29591]"></span>}
      </button>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto bg-white border border-[#EAE7E2] p-4 shadow-sm">
      <div className="flex justify-between items-center mb-6 px-2">
        <h4 className="text-sm font-bold tracking-widest text-[#463E3E]">{year}年 {month + 1}月</h4>
        <div className="flex gap-2">
          <button onClick={() => setViewDate(new Date(year, month - 1, 1))}><ChevronLeft size={18}/></button>
          <button onClick={() => setViewDate(new Date(year, month + 1, 1))}><ChevronRight size={18}/></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">{CONSTANTS.DAYS.map(w => <div key={w} className="h-10 flex items-center justify-center text-[10px] text-gray-400 font-bold">{w}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">{days}</div>
    </div>
  );
};

export default function App() {
  // --- 禁止縮放的核心邏輯 (Start) ---
  useEffect(() => {
    // 1. 強制設定 Meta Viewport
    const metaTagId = 'viewport-meta-no-zoom';
    let meta = document.getElementById(metaTagId);
    if (!meta) {
      meta = document.querySelector('meta[name="viewport"]');
    }
    
    // 設定 content 禁止 user-scalable
    const content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    
    if (meta) {
      meta.content = content;
    } else {
      const newMeta = document.createElement('meta');
      newMeta.name = 'viewport';
      newMeta.id = metaTagId;
      newMeta.content = content;
      document.head.appendChild(newMeta);
    }

    // 2. 阻擋 iOS Safari 雙指縮放手勢 (Gesture Start)
    const preventGestureZoom = (e) => {
      e.preventDefault();
    };
    document.addEventListener('gesturestart', preventGestureZoom);

    // 3. (Optional) 阻擋雙擊縮放 - 雖然 CSS touch-action 已經處理，但 JS 可做雙重保險
    // 這裡我們主要依賴下方的 CSS touch-action: manipulation

    return () => {
      document.removeEventListener('gesturestart', preventGestureZoom);
    };
  }, []);
  // --- 禁止縮放的核心邏輯 (End) ---

  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('catalog');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [items, setItems] = useState([]);
  const [addons, setAddons] = useState([]);
  const [bookings, setBookings] = useState([]);
  
  const [settings, setSettings] = useState({ 
      stores: [], 
      staff: [], 
      holidays: [], 
      styleCategories: CONSTANTS.CATS, 
      savedTags: [],
      blacklist: []
  });
  
  const [inputs, setInputs] = useState({ holiday: { date: '', storeId: 'all' }, store: '', category: '', tag: '', addon: { name: '', price: '', duration: '' }, pwd: '', blacklistPhone: '' });
  const [mgrTab, setMgrTab] = useState('stores');
  const [viewMode, setViewMode] = useState('list');
  const [adminSel, setAdminSel] = useState({ date: '', store: 'all' });
  
  const [step, setStep] = useState('none');
  const [selItem, setSelItem] = useState(null);
  const [selAddon, setSelAddon] = useState(null);
  const [bookData, setBookData] = useState({ name: '', phone: '', email: '', date: '', time: '', storeId: '', paymentMethod: '門市付款' });
  
  const [status, setStatus] = useState({ submitting: false, adminOpen: false, uploadOpen: false, mgrOpen: false, uploading: false });
  const [editItem, setEditItem] = useState(null);
  const [filters, setFilters] = useState({ style: '全部', price: '全部', tag: '' });
  const [catalogSearch, setCatalogSearch] = useState('');
  const [sortOption, setSortOption] = useState('latest');

  const [formData, setFormData] = useState({ title: '', price: '', category: '極簡氣質', duration: '90', images: [], tags: '' });
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState({ key: '', res: [] });

  useEffect(() => { signInAnonymously(auth); onAuthStateChanged(auth, setUser); }, []);
  useEffect(() => {
    if (!user) return;
    const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'settings'), d => d.exists() && setSettings(s => ({ ...s, ...d.data() })));
    const unsubItems = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), s => setItems(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubAddons = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'addons'), s => setAddons(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubBookings = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), orderBy('createdAt', 'desc')), s => setBookings(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubSettings(); unsubItems(); unsubAddons(); unsubBookings(); };
  }, [user]);

  useEffect(() => {
      if (mgrTab === 'bookings' && bookings.length > 0) {
          const today = getTodayStr();
          const relevantBookings = bookings.filter(b => adminSel.store === 'all' || String(b.storeId) === String(adminSel.store));
          const upcoming = relevantBookings.sort((a, b) => new Date(a.date) - new Date(b.date)).find(b => b.date >= today);
          setAdminSel(prev => ({ ...prev, date: upcoming ? upcoming.date : today }));
      }
  }, [mgrTab, bookings, adminSel.store]);

  const handleOpenUpload = (item = null) => {
    setEditItem(item);
    setFormData(item ? { ...item, tags: item.tags?.join(', ') || '' } : { title: '', price: '', category: settings.styleCategories[0] || '極簡氣質', duration: '90', images: [], tags: '' });
    setStatus(p => ({ ...p, uploadOpen: true }));
  };

  const getDuration = () => (Number(selItem?.duration) || 90) + (Number(selAddon?.duration) || 0);
  const getAmount = () => (Number(selItem?.price) || 0) + (Number(selAddon?.price) || 0);

  const isTimeFull = (date, time) => {
    if (!date || !time || !bookData.storeId) return false;
    if (new Date(`${date} ${time}`) < new Date(Date.now() + 5400000)) return true;
    
    const storeStaff = (settings.staff || []).filter(s => String(s.storeId) === String(bookData.storeId));
    const availStaff = storeStaff.filter(s => !(s.leaveDates || []).includes(date)).length;
    if (availStaff <= 0) return true;

    const clean = Number(settings.stores.find(s => s.id === bookData.storeId)?.cleaningTime) || CONSTANTS.CLEAN;
    const start = timeToMin(time);
    const end = start + getDuration() + clean;

    const overlapping = bookings.filter(b => b.date === date && String(b.storeId) === String(bookData.storeId) && 
      ((timeToMin(b.time) < end) && ((timeToMin(b.time) + (Number(b.totalDuration) || 90) + clean) > start)));
    return overlapping.length >= availStaff;
  };

  useEffect(() => {
    if (step === 'form' && bookData.storeId && !bookData.date && settings.stores.length) {
      let d = new Date();
      for (let i = 0; i < CONSTANTS.MAX_DAYS; i++) {
        const dateStr = d.toISOString().split('T')[0];
        const isHoliday = settings.holidays.some(h => h.date === dateStr && (h.storeId === 'all' || String(h.storeId) === String(bookData.storeId)));
        if (!isHoliday && TIME_SLOTS.some(t => !isTimeFull(dateStr, t))) {
          setBookData(p => ({ ...p, date: dateStr })); break;
        }
        d.setDate(d.getDate() + 1);
      }
    }
  }, [step, bookData.storeId, settings]);

  const saveSettings = async (s) => setDoc(doc(db, 'artifacts', appId, 'public', 'settings'), s);

  const handleDeleteBooking = (id) => {
      if(confirm('確定取消此預約？')) {
          if(confirm('再次確認：真的要刪除這筆預約嗎？刪除後無法復原。')) {
              deleteDoc(doc(db,'artifacts',appId,'public','data','bookings',id));
          }
      }
  };

  const confirmBooking = async () => {
    if ((settings.blacklist || []).includes(bookData.phone)) {
        alert("此號碼無法進行預約，請聯繫客服。");
        return;
    }

    setStatus(p => ({ ...p, submitting: true }));
    const amount = getAmount(); const duration = getDuration();
    const storeName = settings.stores.find(s => s.id === bookData.storeId)?.name || '未指定';
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), {
        ...bookData, storeName, itemTitle: selItem?.title, addonName: selAddon?.name || '無',
        totalAmount: amount, totalDuration: duration, createdAt: serverTimestamp()
      });
      await emailjs.send('service_uniwawa', 'template_d5tq1z9', {
        to_email: bookData.email, staff_email: 'unibeatuy@gmail.com', to_name: bookData.name, phone: bookData.phone,
        store_name: storeName, booking_date: bookData.date, booking_time: bookData.time,
        item_title: selItem?.title, addon_name: selAddon?.name || '無', total_amount: amount, total_duration: duration, notice_content: NOTICE_TEXT
      }, 'ehbGdRtZaXWft7qLM');
      alert('預約成功！'); setStep('success');
    } catch (e) { console.error(e); alert('預約記錄成功但信件發送失敗'); setStep('success'); }
    finally { setStatus(p => ({ ...p, submitting: false })); }
  };

  const handleExportCSV = () => {
      const today = new Date();
      const end = new Date(today);
      end.setDate(today.getDate() + 30);
      
      const targetBookings = bookings.filter(b => {
          const storeMatch = adminSel.store === 'all' || String(b.storeId) === String(adminSel.store);
          if(!storeMatch) return false;
          const bDate = new Date(b.date);
          return bDate >= today && bDate <= end;
      });

      // 格式化時間戳記的函式
      const formatTimestamp = (ts) => {
          if (!ts) return '';
          // 處理 Firestore Timestamp (具有 toDate 方法) 或普通秒數
          const date = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
          return date.toLocaleString('zh-TW', { hour12: false });
      };

      // 修改1: 新增 '下單時間' 到標題的第一個位置
      const headers = ['下單時間', '日期', '時間', '門市', '顧客姓名', '電話', '電子信箱', '服務項目', '加購項目', '預約時長', '金額'];
      
      // 修改1: 對應 rows 資料，將 createdAt 轉換後放在第一個位置
      const rows = targetBookings.map(b => [
        formatTimestamp(b.createdAt),
        b.date, b.time, b.storeName, b.name, b.phone, b.email, b.itemTitle, b.addonName, b.totalDuration, b.totalAmount
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bookings_next30days_${adminSel.store}.csv`;
      link.click();
      URL.revokeObjectURL(url);
  };

  const submitItem = async (e) => {
    e.preventDefault(); setStatus(p => ({ ...p, uploading: true }));
    try {
      let urls = formData.images.filter(u => !u.startsWith('blob:'));
      if (files.length) {
        urls = [...urls, ...await Promise.all(files.map(async f => await getDownloadURL((await uploadBytes(ref(storage, `nail_designs/${Date.now()}_${f.name}`), f)).ref)))];
      }
      const payload = { ...formData, price: Number(formData.price), duration: Number(formData.duration), images: urls, tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t=>t) : [], updatedAt: serverTimestamp() };
      editItem ? await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', editItem.id), payload) : await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), { ...payload, createdAt: serverTimestamp() });
      setStatus(p => ({ ...p, uploadOpen: false })); setFiles([]); alert("發布成功！");
    } catch (err) { alert("失敗：" + err.message); } finally { setStatus(p => ({ ...p, uploading: false })); }
  };

  const processedItems = useMemo(() => {
    let res = items.filter(i => {
        const p = Number(i.price);
        const styleMatch = filters.style === '全部' || i.category === filters.style;
        let priceMatch = true;
        if (filters.price === '1400以下') priceMatch = p < 1400;
        else if (filters.price === '1400-1800') priceMatch = p >= 1400 && p <= 1800;
        else if (filters.price === '1800以上') priceMatch = p > 1800;
        const tagMatch = !filters.tag || i.tags?.includes(filters.tag);
        return styleMatch && priceMatch && tagMatch;
    });

    if(catalogSearch) {
        const lowerKey = catalogSearch.toLowerCase();
        res = res.filter(i => i.title.toLowerCase().includes(lowerKey) || i.tags?.some(t => t.toLowerCase().includes(lowerKey)));
    }

    if (sortOption === 'popular') {
        const popularityMap = bookings.reduce((acc, b) => {
            if(b.itemTitle) acc[b.itemTitle] = (acc[b.itemTitle] || 0) + 1;
            return acc;
        }, {});
        res.sort((a, b) => (popularityMap[b.title] || 0) - (popularityMap[a.title] || 0));
    } else {
        res.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    }

    return res;
  }, [items, filters, catalogSearch, sortOption, bookings]);

  const storeBookings = useMemo(() => bookings.filter(b => adminSel.store === 'all' || String(b.storeId) === String(adminSel.store)), [bookings, adminSel.store]);

  const listBookings = useMemo(() => {
      const start = new Date(); start.setDate(start.getDate() - 90);
      return storeBookings.filter(b => new Date(b.date) >= start).sort((a,b) => new Date(`${a.date} ${a.time}`) - new Date(`${b.date} ${b.time}`));
  }, [storeBookings]);

  const dayBookings = useMemo(() => {
      return storeBookings.filter(b => b.date === adminSel.date).sort((a,b) => a.time.localeCompare(b.time));
  }, [storeBookings, adminSel.date]);

  const isPhoneInvalid = bookData.phone.length > 0 && bookData.phone.length !== 10;
  const isEmailInvalid = bookData.email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookData.email);

  const renderContent = () => {
    if (step === 'form') return (
      <div className="max-w-2xl mx-auto px-6">
        <h2 className="text-2xl font-light tracking-[0.3em] text-center mb-8 text-[#463E3E]">RESERVATION / 預約資訊</h2>
        <div className="bg-white border border-[#EAE7E2] mb-6 p-6 shadow-sm flex flex-col md:flex-row gap-6">
           <img src={selItem?.images?.[0]} className="w-24 h-24 object-cover border" alt="" />
           <div className="flex-1">
               <p className="text-xs text-[#C29591] font-bold">預約項目</p>
               <p className="font-medium">{selItem?.title} {selAddon && `+ ${selAddon.name}`}</p>
               <p className="text-xs text-gray-400">預計總時長: <span className="font-bold text-[#463E3E]">{getDuration()}</span> 分鐘</p>
           </div>
           <div className="text-right">
               <p className="text-xs text-gray-400 tracking-widest uppercase">總金額 (含加購)</p>
               <p className="text-lg font-bold">NT$ {getAmount().toLocaleString()}</p>
           </div>
        </div>
        <div className="bg-white border border-[#EAE7E2] p-8 shadow-sm space-y-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="relative">
                <input type="text" placeholder="顧客姓名 (必填，不可含數字)" className={`w-full border-b py-2 outline-none ${/\d/.test(bookData.name) ? 'border-red-300 text-red-500' : ''}`} value={bookData.name} onChange={e => setBookData(p=>({...p, name: e.target.value}))} />
                {/\d/.test(bookData.name) && <span className="absolute -bottom-5 left-0 text-[10px] text-red-500">姓名不可包含數字</span>}
            </div>
            
            <div className="relative">
                <input type="tel" placeholder="聯絡電話 (必填10碼)" className={`w-full border-b py-2 outline-none ${isPhoneInvalid ? 'border-red-300 text-red-500' : ''}`} value={bookData.phone} onChange={e => { const v = e.target.value.replace(/\D/g, ''); if(v.length<=10) setBookData(p=>({...p, phone:v})); }} />
                {isPhoneInvalid && <span className="absolute -bottom-5 left-0 text-[10px] text-red-500">電話需為10碼數字</span>}
            </div>

            <div className="relative">
                <input type="email" placeholder="電子信箱 (必填)" className={`w-full border-b py-2 outline-none ${isEmailInvalid ? 'border-red-300 text-red-500' : ''}`} value={bookData.email} onChange={e => setBookData(p=>({...p, email: e.target.value}))} />
                {isEmailInvalid && <span className="absolute -bottom-5 left-0 text-[10px] text-red-500">信箱格式錯誤</span>}
            </div>
            
            <div className="md:col-span-2 flex items-center gap-2 border-b py-2 text-gray-400 text-xs"><CreditCard size={16}/> 付款方式：<span className="text-[#463E3E]">門市付款</span></div>
          </div>

          <div className="border-b pb-6">
            <label className="text-xs font-bold text-gray-400 mb-2 block">選擇預約門市</label>
            <div className="flex flex-wrap gap-3">{settings.stores.map(s => <button key={s.id} onClick={() => setBookData(p => ({ ...p, storeId: s.id, date: '', time: '' }))} className={`px-4 py-2 text-xs border rounded-full ${String(bookData.storeId) === String(s.id) ? 'bg-[#463E3E] text-white' : 'hover:border-[#C29591]'}`}>{s.name}</button>)}</div>
          </div>

          <div className="flex justify-center pt-2"><CustomCalendar selectedDate={bookData.date} onDateSelect={d => setBookData(p=>({...p, date: d, time: ''}))} settings={settings} selectedStoreId={bookData.storeId} isDayFull={d => TIME_SLOTS.every(t => isTimeFull(d, t))} /></div>
          {bookData.date && bookData.storeId && <div className="grid grid-cols-4 md:grid-cols-6 gap-2">{TIME_SLOTS.map(t => <button key={t} disabled={isTimeFull(bookData.date, t)} onClick={() => setBookData(p=>({...p, time: t}))} className={`py-2 text-[10px] border ${bookData.time===t ? 'bg-[#463E3E] text-white' : 'bg-white disabled:opacity-20'}`}>{t}</button>)}</div>}
          
          <button disabled={status.submitting || !bookData.storeId || /\d/.test(bookData.name) || !bookData.name || bookData.phone.length!==10 || isEmailInvalid || !bookData.email || !bookData.time} onClick={confirmBooking} className="w-full py-4 bg-[#463E3E] text-white text-xs tracking-widest uppercase disabled:opacity-50">
            {status.submitting ? '處理中...' : !bookData.storeId ? '請先選擇門市' : '確認送出預約'}
          </button>
        </div>
      </div>
    );

    if (step === 'success') return (
      <div className="max-w-lg mx-auto px-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FAF9F6] mb-4"><CheckCircle size={32} className="text-[#C29591]" /></div>
        <h2 className="text-xl font-light tracking-[0.3em] text-[#463E3E] uppercase">Reservation Confirmed</h2>
        <p className="text-[10px] text-gray-400 mt-2 tracking-widest mb-10">您的預約已成功送出，期待與您相見</p>
        
        <div className="bg-white border border-[#EAE7E2] shadow-lg overflow-hidden relative text-left">
          <div className="h-1 bg-[#C29591]"></div>
          {selItem?.images?.[0] && <div className="w-full h-56 relative group">
              <img src={selItem.images[0]} className="w-full h-full object-cover" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#463E3E]/90 via-transparent to-transparent flex items-end p-6">
                <div className="text-white">
                    <p className="text-[10px] tracking-[0.2em] opacity-80 uppercase mb-1">{selItem.category}</p>
                    <h3 className="text-lg font-medium tracking-wide">{selItem.title}</h3>
                </div>
              </div>
          </div>}
          
          <div className="p-8 space-y-4 text-xs tracking-wide">
            <div className="bg-[#FAF9F6] border border-[#EAE7E2] p-4 text-center mb-8">
                <p className="text-[10px] text-gray-400 tracking-widest uppercase mb-1">預約時間</p>
                <div className="flex justify-center items-baseline gap-2 text-[#463E3E]">
                    <span className="text-lg font-bold tracking-widest">{bookData.date}</span>
                    <span className="text-[#C29591]">•</span>
                    <span className="text-xl font-bold tracking-widest">{bookData.time}</span>
                </div>
                <div className="mt-2 text-xs font-bold text-[#C29591]">{settings.stores.find(s=>s.id===bookData.storeId)?.name}</div>
            </div>
            
            {[
              ['顧客姓名', bookData.name], ['聯絡電話', bookData.phone], ['電子信箱', bookData.email],
              ['加購項目', selAddon?.name || '無'], ['總時長', `${getDuration()} 分鐘`], ['付款方式', bookData.paymentMethod]
            ].map(([l, v]) => <div key={l} className="flex justify-between border-b border-dashed border-gray-100 pb-2"><span className="text-gray-400">{l}</span><span className="font-medium text-[#463E3E]">{v}</span></div>)}
            
            <div className="mt-8 pt-6 border-t border-[#EAE7E2] flex justify-between items-end">
                <span className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">Total Amount</span>
                <div className="text-2xl font-bold text-[#C29591] leading-none">
                    <span className="text-xs mr-1 text-gray-400 font-normal align-top mt-1 inline-block">NT$</span>
                    {getAmount().toLocaleString()}
                </div>
            </div>
          </div>
        </div>
        <button onClick={() => { setStep('none'); setTab('catalog'); }} className="w-full mt-8 bg-[#463E3E] text-white py-4 text-xs tracking-[0.2em] uppercase">回到首頁</button>
      </div>
    );

    switch(tab) {
      case 'catalog': return (
        <div className="max-w-7xl mx-auto px-6 space-y-8">
          <div className="flex flex-col gap-6 border-b pb-8 mb-8">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center pb-4 border-b border-dashed border-gray-200">
                <div className="flex items-center gap-2 w-full md:w-auto relative">
                    <Search size={14} className="absolute left-3 text-gray-400"/>
                    <input 
                        type="text" 
                        placeholder="搜尋款式名稱或標籤..." 
                        value={catalogSearch} 
                        onChange={(e) => setCatalogSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 border border-gray-200 rounded-full text-xs w-full md:w-64 outline-none focus:border-[#C29591] bg-white transition-colors"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 font-bold tracking-widest"><ArrowDownUp size={12} className="inline mr-1"/>SORT</span>
                    <select 
                        value={sortOption} 
                        onChange={(e) => setSortOption(e.target.value)}
                        className="text-xs border border-gray-200 rounded-full px-3 py-1.5 outline-none bg-white text-gray-600 focus:border-[#C29591]"
                    >
                        <option value="latest">最新上架</option>
                        <option value="popular">熱門排行</option>
                    </select>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-start">
              <span className="text-[10px] text-gray-400 font-bold tracking-widest w-16 pt-2">STYLE</span>
              <div className="flex flex-wrap gap-2 flex-1">
                  {['全部', ...(settings.styleCategories.length > 0 ? settings.styleCategories : CONSTANTS.CATS)].map(c => <button key={c} onClick={() => setFilters(p=>({...p, style:c}))} className={`px-4 py-1.5 text-xs rounded-full border ${filters.style===c ? 'bg-[#463E3E] text-white border-[#463E3E]' : 'bg-white text-gray-500 border-gray-200 hover:border-[#C29591]'}`}>{c}</button>)}
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-start">
              <span className="text-[10px] text-gray-400 font-bold tracking-widest w-16 pt-2">PRICE</span>
              <div className="flex flex-wrap gap-2 flex-1">
                  {CONSTANTS.PRICES.map(p => <button key={p} onClick={() => setFilters(prev=>({...prev, price:p}))} className={`px-4 py-1.5 text-xs rounded-full border ${filters.price===p ? 'bg-[#463E3E] text-white border-[#463E3E]' : 'bg-white text-gray-500 border-gray-200 hover:border-[#C29591]'}`}>{p}</button>)}
              </div>
            </div>
            {filters.tag && <div className="flex justify-center mt-2"><button onClick={() => setFilters(p=>({...p, tag:''}))} className="flex items-center gap-2 bg-[#C29591] text-white px-4 py-1.5 rounded-full text-xs">#{filters.tag} <X size={14} /></button></div>}
          </div>
          
          <div className="grid md:grid-cols-3 gap-10 pb-24">
            {processedItems.length > 0 ? processedItems.map(i => <StyleCard key={i.id} item={i} isLoggedIn={isLoggedIn} onEdit={handleOpenUpload} onDelete={id => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', id))} onBook={(it, ad) => { setSelItem(it); setSelAddon(ad); setBookData({ name: '', phone: '', email: '', date: '', time: '', storeId: '', paymentMethod: '門市付款' }); setStep('form'); window.scrollTo(0,0); }} addons={addons} onTagClick={t => setFilters(p=>({...p, tag:t}))} />) : <div className="col-span-3 text-center py-20 text-gray-300 text-xs">沒有符合條件的款式</div>}
          </div>
        </div>
      );
      case 'notice': return (
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-light tracking-[0.3em] text-center mb-12 text-[#463E3E]">預約須知</h2>
          <div className="bg-white border border-[#EAE7E2] p-12 relative shadow-sm"><div className="absolute top-0 left-0 w-full h-1 bg-[#C29591]"></div>
            <div className="space-y-5">{NOTICE_ITEMS.map((n, i) => <div key={i} className="flex gap-6 border-b border-dashed pb-5"><span className="text-3xl font-serif italic text-[#C29591]/80">{String(i+1).padStart(2,'0')}</span><div><h3 className="text-sm font-bold mb-2">{n.title}</h3><p className="text-xs text-gray-500 leading-7">{n.content}</p></div></div>)}</div>
            <div className="mt-12 pt-8 border-t text-center text-[10px] text-gray-400 flex justify-center gap-2"><AlertOctagon size={14}/> 預約即代表同意以上條款</div>
          </div>
        </div>
      );
      case 'search': return (
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-light tracking-[0.3em] text-[#463E3E] text-center mb-12">預約查詢</h2>
          <div className="bg-white p-8 border mb-12 flex flex-col gap-4">
            <input type="text" placeholder="輸入預約姓名 或 手機號碼" className="border-b py-3 px-2 outline-none text-xs" value={search.key} onChange={e => setSearch(p=>({...p, key: e.target.value}))} />
            <button onClick={() => { const k = search.key.trim(); const r = bookings.filter(b => b.name === k || b.phone === k).sort((a,b) => new Date(`${b.date} ${b.time}`) - new Date(`${a.date} ${a.time}`)); setSearch(p=>({...p, res: r.length ? r : []})); if(!r.length) alert('查無資料'); }} className="bg-[#463E3E] text-white py-3 text-xs tracking-widest flex justify-center gap-2"><Search size={14}/> 查詢預約</button>
          </div>
          <div className="space-y-6 pb-24">
            {search.res.map(b => (
              <div key={b.id} className="bg-white border shadow-lg relative"><div className="h-1 bg-[#C29591]"></div>
                {(() => { const l = items.find(i=>i.title===b.itemTitle); return l?.images?.[0] ? <div className="h-40 relative"><img src={l.images[0]} className="w-full h-full object-cover" alt="" /><div className="absolute inset-0 bg-gradient-to-t from-[#463E3E]/90 to-transparent p-4 flex items-end text-white"><h3>{b.itemTitle}</h3></div></div> : null; })()}
                <div className="p-8"><div className="bg-[#FAF9F6] border p-4 text-center mb-8"><span className="text-lg font-bold">{b.date} • {b.time}</span><div className="text-[#C29591] font-bold text-xs">{b.storeName}</div></div>
                  <div className="space-y-4 text-xs">{[['顧客姓名', b.name], ['聯絡電話', b.phone], ['加購', b.addonName], ['時長', b.totalDuration+'分'], ['付款', b.paymentMethod]].map(([l, v]) => <div key={l} className="flex justify-between border-b border-dashed pb-2"><span className="text-gray-400">{l}</span><span className="font-medium">{v}</span></div>)}</div>
                  <div className="mt-8 pt-6 border-t flex justify-between items-end"><span className="text-[10px] font-bold text-gray-400">Total</span><span className="text-2xl font-bold text-[#C29591]">NT$ {b.totalAmount?.toLocaleString()}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
      case 'store': return (
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-light tracking-[0.3em] text-center mb-12 text-[#463E3E]">門市資訊</h2>
          <div className="grid md:grid-cols-2 gap-8"><div className="bg-white border hover:border-[#C29591] transition-colors">
            <div className="aspect-video bg-gray-100 relative">
                <img src={CONSTANTS.IMG_STORE} className="w-full h-full object-cover" alt="" />
            </div>
            <div className="p-8"><h3 className="text-lg font-medium tracking-widest mb-2">桃園文中店</h3><div className="w-8 h-[1px] bg-[#C29591] mb-6"></div><div className="flex gap-3 text-xs text-gray-500 mb-6"><MapPin size={16} className="text-[#C29591]" /> 桃園區文中三路 67 號 1 樓</div><button onClick={() => window.open('https://maps.app.goo.gl/B5ekaXi85mrWtXBJ6', '_blank')} className="w-full border py-3 text-xs tracking-widest text-gray-400 hover:bg-[#463E3E] hover:text-white">GOOGLE MAPS</button></div></div></div>
        </div>
      );
      case 'about': return (
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-light tracking-[0.3em] text-[#463E3E] text-center mb-12">關於 UNIWAWA</h2>
          <div className="bg-white border border-[#EAE7E2] p-12 relative"><div className="absolute top-0 left-0 w-full h-1 bg-[#C29591]"></div>
            <div className="flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-5/12 aspect-[4/5]"><img src={CONSTANTS.IMG_WAWA} className="w-full h-full object-cover" alt="" /></div>
              <div className="flex-1 space-y-6 text-xs text-gray-500 leading-8 text-justify">
                <p>創業八年的蛋糕師 Wawa (娃娃)， 始終對美有著不懈的追求與獨到的見解。</p>
                <p>為了將這份美感延伸至不同的創作形式，Wawa 成立了全新的美甲品牌。 在這裡，指尖是另一種畫布，我們延續了對細節的堅持與藝術的熱愛， 期望能為每一位顧客帶來獨一無二的指尖藝術體驗。</p>
                <p>無論是甜點還是美甲，UNIWAWA 都致力於傳遞一份純粹的美好與感動。</p>
              </div>
            </div>
          </div>
        </div>
      );
      case 'contact': return (
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-light tracking-[0.3em] text-[#463E3E] mb-12">聯絡我們</h2>
          <div className="bg-white p-10 border shadow-sm"><p className="text-xs text-gray-500 mb-6 leading-relaxed">如有任何疑問，歡迎加入 LINE 官方帳號諮詢<br/>(預約請直接使用網站功能)</p><a href="https://lin.ee/RNTAv2L" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-[#06C755] text-white px-8 py-3 rounded-full font-bold text-sm"><MessageCircle size={20} /> 加入 LINE 好友</a></div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555] font-sans">
      <style>{`
        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-thumb{background:#C29591;border-radius:3px}
        html{overflow-y:scroll}
        .hide-scrollbar::-webkit-scrollbar{display:none}
        /* 禁止縮放與字體調整的核心 CSS */
        html, body {
            touch-action: manipulation;
            -webkit-text-size-adjust: 100%;
            text-size-adjust: 100%;
        }
      `}</style>
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-[500] border-b border-[#EAE7E2]">
        <div className="max-w-7xl mx-auto px-6 py-4 md:py-0 md:h-20 flex flex-col md:flex-row items-center justify-between">
          <h1 className="text-2xl md:text-3xl tracking-[0.4em] font-extralight cursor-pointer mb-4 md:mb-0" onClick={() => {setTab('catalog'); setStep('none');}}>UNIWAWA</h1>
          <div className="flex gap-3 md:gap-6 text-xs md:text-sm tracking-widest font-medium uppercase items-center overflow-x-auto no-scrollbar justify-center">
            {['about:關於', 'catalog:款式', 'notice:須知', 'store:門市', 'search:查詢', 'contact:聯絡'].map(t => { const [k,v]=t.split(':'); return <button key={k} onClick={() => {setTab(k); setStep('none'); if(k==='search') setSearch({key:'',res:[]});}} className={`flex-shrink-0 ${tab===k?'text-[#C29591]':''}`}>{v}</button>; })}
            {isLoggedIn ? <div className="flex gap-4 border-l pl-4 flex-shrink-0"><button onClick={() => handleOpenUpload()} className="text-[#C29591] hover:scale-110"><Plus size={18}/></button><button onClick={() => setStatus(p=>({...p, mgrOpen:true}))} className="text-[#C29591]"><Settings size={18}/></button></div> : <button onClick={() => setStatus(p=>({...p, adminOpen:true}))} className="text-gray-300 hover:text-[#C29591] flex-shrink-0"><Lock size={14}/></button>}
          </div>
        </div>
      </nav>
      <main className="pt-32 md:pt-28 pb-12">{renderContent()}</main>

      {status.adminOpen && <div className="fixed inset-0 bg-black/40 z-[250] flex items-center justify-center p-4"><div className="bg-white p-10 max-w-sm w-full shadow-2xl"><h3 className="tracking-[0.5em] mb-10 text-center text-gray-400">ADMIN</h3><form onSubmit={e=>{e.preventDefault(); if(inputs.pwd==="8888") setIsLoggedIn(true); setStatus(p=>({...p, adminOpen:false}));}}><input type="password" placeholder="••••" className="w-full border-b py-4 text-center tracking-[1em] outline-none" onChange={e=>setInputs(p=>({...p, pwd:e.target.value}))} autoFocus/><button className="w-full bg-[#463E3E] text-white py-4 mt-6 text-xs">ENTER</button></form></div></div>}

      {status.mgrOpen && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center md:p-4 backdrop-blur-sm">
          <div className="bg-white w-full h-full md:max-w-[98vw] md:h-[95vh] shadow-2xl flex flex-col overflow-hidden md:rounded-lg">
            <div className="px-8 py-6 border-b flex justify-between"><h3 className="text-xs tracking-[0.3em] font-bold">系統管理</h3><button onClick={()=>setStatus(p=>({...p, mgrOpen:false}))}><X size={24}/></button></div>
            <div className="flex border-b px-8 bg-[#FAF9F6] overflow-x-auto hide-scrollbar" style={{ touchAction: 'pan-x' }}>
              {[{id:'stores',l:'門市',i:<Store size={14}/>},{id:'attributes',l:'商品',i:<Layers size={14}/>},{id:'staff_holiday',l:'人員',i:<Users size={14}/>},{id:'bookings',l:'預約',i:<Calendar size={14}/>},{id:'blacklist',l:'黑名單',i:<Ban size={14}/>}].map(t => <button key={t.id} onClick={()=>setMgrTab(t.id)} className={`flex items-center gap-2 px-6 py-4 text-xs tracking-widest whitespace-nowrap ${mgrTab===t.id?'bg-white border-x border-t border-b-white text-[#C29591] font-bold -mb-[1px]':'text-gray-400'}`}>{t.i} {t.l}</button>)}
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-12">
              {mgrTab === 'stores' && <div className="space-y-6">
                <div className="border-l-4 border-[#C29591] pl-4"><h4 className="text-sm font-bold tracking-widest text-[#463E3E]">門市管理</h4><p className="text-[10px] text-gray-400 mt-1">設定品牌旗下的所有分店</p></div>
                <div className="flex gap-2"><input type="text" className="flex-1 border p-2 text-xs" placeholder="新門市名稱" value={inputs.store} onChange={e=>setInputs(p=>({...p, store:e.target.value}))} /><button onClick={()=>{if(!inputs.store)return; saveSettings({...settings, stores:[...settings.stores, {id:Date.now().toString(), name:inputs.store, cleaningTime:20}]}); setInputs(p=>({...p, store:''}))}} className="bg-[#463E3E] text-white px-4 text-xs">新增</button></div>
                <div className="grid md:grid-cols-3 gap-4">{settings.stores.map(s => <div key={s.id} className="border p-4 bg-white shadow-sm flex flex-col gap-3"><div className="flex justify-between font-bold text-sm text-[#463E3E]"><span>{s.name}</span><button onClick={()=>confirm('刪除？') && saveSettings({...settings, stores:settings.stores.filter(i=>i.id!==s.id)})}><Trash2 size={14}/></button></div><div className="flex items-center gap-2 bg-[#FAF9F6] p-2 rounded text-[10px] text-gray-500"><Clock size={12}/> 整備: <input type="number" defaultValue={s.cleaningTime||20} className="w-10 text-center border" onBlur={e=>saveSettings({...settings, stores:settings.stores.map(i=>i.id===s.id?{...i, cleaningTime:Number(e.target.value)}:i)})} />分</div></div>)}</div>
              </div>}
              {mgrTab === 'attributes' && <div className="grid lg:grid-cols-3 gap-8">
                <div className="space-y-6 border-r pr-8">
                    <div className="border-l-4 border-[#C29591] pl-4"><h4 className="text-sm font-bold tracking-widest text-[#463E3E]">風格分類管理</h4><p className="text-[10px] text-gray-400 mt-1">管理前台篩選與上傳時的分類選項</p></div>
                    <div className="flex gap-2"><input value={inputs.category} onChange={e=>setInputs(p=>({...p,category:e.target.value}))} className="border p-2 text-xs flex-1"/><button onClick={()=>{if(inputs.category && !settings.styleCategories.includes(inputs.category)) saveSettings({...settings, styleCategories:[...settings.styleCategories, inputs.category]}); setInputs(p=>({...p,category:''}))}} className="bg-[#463E3E] text-white px-3 text-xs">新增</button></div><div className="flex flex-wrap gap-2">{settings.styleCategories.map(c=><div key={c} className="bg-[#FAF9F6] border px-3 py-2 text-xs relative group">{c}<button onClick={()=>confirm('刪除？')&&saveSettings({...settings, styleCategories:settings.styleCategories.filter(i=>i!==c)})} className="absolute -top-2 -right-2 bg-red-400 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"><X size={10}/></button></div>)}</div>
                </div>
                <div className="space-y-6 border-r pr-8">
                    <div className="border-l-4 border-[#C29591] pl-4"><h4 className="text-sm font-bold tracking-widest text-[#463E3E]">常用標籤 (Hashtag)</h4><p className="text-[10px] text-gray-400 mt-1">設定常用的標籤，上傳時可快速選用</p></div>
                    <div className="flex gap-2"><input value={inputs.tag} onChange={e=>setInputs(p=>({...p,tag:e.target.value}))} className="border p-2 text-xs flex-1"/><button onClick={()=>{if(inputs.tag && !settings.savedTags.includes(inputs.tag)) saveSettings({...settings, savedTags:[...settings.savedTags, inputs.tag]}); setInputs(p=>({...p,tag:''}))}} className="bg-[#463E3E] text-white px-3 text-xs">新增</button></div><div className="flex flex-wrap gap-2">{settings.savedTags.map(t=><div key={t} className="bg-[#FAF9F6] border px-3 py-2 text-xs rounded-full relative group">#{t}<button onClick={()=>saveSettings({...settings, savedTags:settings.savedTags.filter(i=>i!==t)})} className="absolute -top-1 -right-1 bg-red-400 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"><X size={8}/></button></div>)}</div>
                </div>
                <div className="space-y-6">
                    <div className="border-l-4 border-[#C29591] pl-4"><h4 className="text-sm font-bold tracking-widest text-[#463E3E]">加購品項</h4><p className="text-[10px] text-gray-400 mt-1">設定如「卸甲」、「延甲」等額外服務</p></div>
                    <div className="bg-[#FAF9F6] p-4 border space-y-3"><input placeholder="名稱" value={inputs.addon.name} onChange={e=>setInputs(p=>({...p,addon:{...p.addon,name:e.target.value}}))} className="w-full border p-2 text-xs"/><div className="flex gap-2"><input placeholder="金額" value={inputs.addon.price} onChange={e=>setInputs(p=>({...p,addon:{...p.addon,price:e.target.value}}))} className="w-1/2 border p-2 text-xs"/><input placeholder="分鐘" value={inputs.addon.duration} onChange={e=>setInputs(p=>({...p,addon:{...p.addon,duration:e.target.value}}))} className="w-1/2 border p-2 text-xs"/></div><button onClick={()=>{if(inputs.addon.name&&inputs.addon.price) addDoc(collection(db,'artifacts',appId,'public','data','addons'),{...inputs.addon,price:Number(inputs.addon.price),duration:Number(inputs.addon.duration),createdAt:serverTimestamp()}); setInputs(p=>({...p,addon:{name:'',price:'',duration:''}}));}} className="w-full bg-[#463E3E] text-white py-2 text-[10px]">新增</button></div><div className="max-h-60 overflow-y-auto space-y-2">{addons.map(a=><div key={a.id} className="border p-3 flex justify-between bg-white"><div><div className="text-xs font-bold">{a.name}</div><div className="text-[10px] text-gray-400">+${a.price} / {a.duration}分</div></div><button onClick={()=>confirm('刪除？')&&deleteDoc(doc(db,'artifacts',appId,'public','data','addons',a.id))}><Trash2 size={12}/></button></div>)}</div>
                </div>
              </div>}
              {mgrTab === 'staff_holiday' && <div className="grid lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                    <div className="flex justify-between border-l-4 border-[#C29591] pl-4"><div><h4 className="text-sm font-bold tracking-widest text-[#463E3E]">人員名單與請假</h4><p className="text-[10px] text-gray-400 mt-1">設定美甲師名稱</p></div><button onClick={()=>{const n=prompt("姓名"); if(n) saveSettings({...settings, staff:[...settings.staff, {id:Date.now().toString(), name:n, storeId:settings.stores[0]?.id||'', leaveDates:[]}]})}} className="text-[10px] bg-[#C29591] text-white px-4 py-2 rounded-full">+ 新增人員</button></div>
                    <div className="space-y-4">{settings.staff.map(s=><div key={s.id} className="bg-[#FAF9F6] border p-5"><div className="flex justify-between"><span className="text-xs font-bold flex gap-2"><Users size={14}/> {s.name} <select value={s.storeId} onChange={e=>saveSettings({...settings, staff:settings.staff.map(x=>x.id===s.id?{...x,storeId:e.target.value}:x)})} className="border bg-white p-1 ml-2">{settings.stores.map(st=><option key={st.id} value={st.id}>{st.name}</option>)}</select></span><button onClick={()=>confirm('刪除？')&&saveSettings({...settings, staff:settings.staff.filter(x=>x.id!==s.id)})}><Trash2 size={14}/></button></div><div className="mt-4 pt-4 border-t"><label className="text-[10px] flex gap-1"><UserMinus size={12}/> 請假</label><input type="date" className="text-[10px] border p-2 w-full mt-2" onChange={e=>{if(e.target.value) saveSettings({...settings, staff:settings.staff.map(x=>x.id===s.id?{...x, leaveDates:x.leaveDates.includes(e.target.value)?x.leaveDates:[...x.leaveDates, e.target.value].sort()}:x)})}} /><div className="flex flex-wrap gap-1 mt-2">{s.leaveDates?.map(d=><span key={d} className="text-[9px] bg-red-50 text-red-500 px-2 py-1 border flex items-center gap-1">{d} <X size={10} className="cursor-pointer" onClick={()=>saveSettings({...settings, staff:settings.staff.map(x=>x.id===s.id?{...x, leaveDates:x.leaveDates.filter(l=>l!==d)}:x)})}/></span>)}</div></div></div>)}</div>
                </div>
                <div className="space-y-6">
                    <h4 className="text-sm font-bold border-l-4 border-[#C29591] pl-4 uppercase tracking-widest text-[#463E3E]">門市公休日設定</h4>
                    <div className="flex gap-2 items-center bg-[#FAF9F6] p-3 border"><select className="text-xs border p-2" value={inputs.holiday.storeId} onChange={e=>setInputs(p=>({...p,holiday:{...p.holiday,storeId:e.target.value}}))}><option value="all">全品牌</option>{settings.stores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><input type="date" className="flex-1 p-2 border text-xs" value={inputs.holiday.date} onChange={e=>setInputs(p=>({...p,holiday:{...p.holiday,date:e.target.value}}))}/><button onClick={()=>{if(inputs.holiday.date) saveSettings({...settings, holidays:[...settings.holidays, inputs.holiday]})}} className="bg-[#463E3E] text-white px-4 py-2 text-[10px]">新增</button></div><div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">{settings.holidays.map((h,i)=><span key={i} className="text-[10px] bg-gray-100 text-gray-500 px-3 py-1.5 border flex gap-2">{h.date} ({h.storeId==='all'?'全':settings.stores.find(s=>s.id===h.storeId)?.name}) <X size={12} className="cursor-pointer" onClick={()=>saveSettings({...settings, holidays:settings.holidays.filter((_,idx)=>idx!==i)})}/></span>)}</div>
                </div>
              </div>}
              
              {mgrTab === 'bookings' && <div className="h-full flex flex-col space-y-4">
                <div className="flex justify-between border-b pb-4">
                    <div className="border-l-4 border-[#C29591] pl-4"><h4 className="text-sm font-bold tracking-widest text-[#463E3E]">預約訂單管理</h4><p className="text-[10px] text-gray-400 mt-1">查看與管理顧客預約(近三月內預約)</p></div>
                    <div className="flex gap-2 items-center bg-[#FAF9F6] p-1 rounded"><Filter size={14}/><select className="text-xs bg-transparent" value={adminSel.store} onChange={e=>setAdminSel(p=>({...p, store:e.target.value}))}><option value="all">全店</option>{settings.stores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><div className="w-[1px] h-6 bg-gray-300 mx-1"></div><button onClick={()=>setViewMode('list')} className={`p-2 ${viewMode==='list'?'bg-white shadow text-[#C29591]':''}`}><ListIcon size={16}/></button><button onClick={()=>{setViewMode('calendar');setAdminSel(p=>({...p, date:getTodayStr()}))}} className={`p-2 ${viewMode==='calendar'?'bg-white shadow text-[#C29591]':''}`}><Grid size={16}/></button><button onClick={handleExportCSV} className="p-2"><Download size={16}/></button></div>
                </div>
                {viewMode === 'list' ? <div className="flex-1 overflow-y-auto pr-2 space-y-3">{listBookings.map(b => <div key={b.id} className="border p-4 flex justify-between bg-[#FAF9F6] text-[11px] hover:border-[#C29591]"><div><div className="font-bold text-sm mb-1">{b.date} <span className="text-[#C29591]">{b.time}</span> <span className="bg-white border px-1.5 text-gray-400 font-normal text-[10px]">{b.storeName}</span></div><div className="font-bold">{b.name} | {b.phone}</div><div className="text-gray-500 mt-1">{b.itemTitle} {b.addonName!=='無'&&`+ ${b.addonName}`}</div></div><button onClick={()=>handleDeleteBooking(b.id)}><Trash2 size={16}/></button></div>)}</div> : 
                <div className="flex flex-col md:flex-row gap-6 h-full"><div className="w-full md:w-64 flex-shrink-0"><AdminBookingCalendar bookings={storeBookings} selectedDate={adminSel.date} onDateSelect={d=>setAdminSel(p=>({...p, date:d}))}/></div>
                {/* 修改2: 移除 h-full，改為 flex-1 搭配 min-h-0，解決手機版垂直排列時的捲動溢出問題 */}
                <div className="flex-1 overflow-y-auto space-y-2 p-2 bg-[#FAF9F6] border border-dashed min-h-0 md:h-full">
                    <h5 className="text-xs font-bold text-[#463E3E] sticky top-0 bg-[#FAF9F6] pb-2 border-b border-gray-200">{adminSel.date} 預約</h5>
                    {dayBookings.length > 0 ? dayBookings.map(b=><div key={b.id} className="border p-2 bg-white shadow-sm text-xs relative pl-4"><div className="absolute left-0 top-0 bottom-0 w-1 bg-[#C29591]"></div><div className="flex justify-between items-center"><div className="font-bold text-lg">{b.time}</div><button onClick={()=>handleDeleteBooking(b.id)}><Trash2 size={12} className="text-gray-300 hover:text-red-500"/></button></div><div className="font-bold">{b.name}</div><div className="text-[10px] text-gray-400">{b.phone}</div><div className="mt-1 pt-1 border-t border-dashed flex justify-between text-[10px]"><span>{b.itemTitle}</span><span className="text-[#C29591]">NT${b.totalAmount}</span></div></div>) : <p className="text-center text-gray-400 text-xs py-10">無預約</p>}
                </div></div>}
              </div>}

              {mgrTab === 'blacklist' && <div className="space-y-6">
                  <div className="border-l-4 border-[#C29591] pl-4">
                      <h4 className="text-sm font-bold tracking-widest text-[#463E3E]">黑名單管理</h4>
                      <p className="text-[10px] text-gray-400 mt-1">輸入電話號碼以禁止該顧客預約</p>
                  </div>
                  <div className="flex gap-2">
                      <input 
                          type="tel" 
                          className="flex-1 border p-2 text-xs" 
                          placeholder="輸入電話號碼" 
                          value={inputs.blacklistPhone} 
                          onChange={e => setInputs(p => ({...p, blacklistPhone: e.target.value.replace(/\D/g, '')}))}
                      />
                      <button 
                          onClick={() => {
                              if(!inputs.blacklistPhone) return;
                              saveSettings({...settings, blacklist: [...(settings.blacklist || []), inputs.blacklistPhone]});
                              setInputs(p => ({...p, blacklistPhone: ''}));
                          }} 
                          className="bg-[#463E3E] text-white px-4 text-xs"
                      >
                          新增
                      </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {(settings.blacklist || []).map(phone => (
                          <div key={phone} className="border p-3 flex justify-between items-center bg-white shadow-sm">
                              <span className="text-xs font-bold text-[#463E3E]">{phone}</span>
                              <button onClick={() => saveSettings({...settings, blacklist: settings.blacklist.filter(p => p !== phone)})}>
                                  <Trash2 size={14} className="text-gray-300 hover:text-red-500"/>
                              </button>
                          </div>
                      ))}
                      {(settings.blacklist || []).length === 0 && <p className="col-span-4 text-center text-gray-300 text-xs py-10">目前無黑名單</p>}
                  </div>
              </div>}
            </div>
          </div>
        </div>
      )}

      {status.uploadOpen && (
        <div className="fixed inset-0 bg-black/40 z-[1000] flex items-center justify-center p-4">
          <div className="bg-white p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-6"><h3>{editItem ? '修改' : '上傳'}</h3><button onClick={()=>setStatus(p=>({...p, uploadOpen:false}))}><X size={20}/></button></div>
            <form onSubmit={submitItem} className="space-y-6">
              <input required className="w-full border-b py-2 outline-none" value={formData.title} onChange={e=>setFormData(p=>({...p,title:e.target.value}))} placeholder="名稱" />
              <div className="flex gap-4"><input type="number" required className="w-1/2 border-b py-2 outline-none" value={formData.price} onChange={e=>setFormData(p=>({...p,price:e.target.value}))} placeholder="價格" /><input type="number" required className="w-1/2 border-b py-2 outline-none" value={formData.duration} onChange={e=>setFormData(p=>({...p,duration:e.target.value}))} placeholder="分鐘" /></div>
              <select value={formData.category} onChange={e=>setFormData(p=>({...p,category:e.target.value}))} className="w-full border-b py-2 bg-white">{settings.styleCategories.map(c=><option key={c} value={c}>{c}</option>)}</select>
              <input className="w-full border-b py-2 outline-none text-xs" value={formData.tags} onChange={e=>setFormData(p=>({...p,tags:e.target.value}))} placeholder="標籤 (逗號分隔)" />
              {settings.savedTags.length>0 && <div className="flex flex-wrap gap-1">{settings.savedTags.map(t=><button type="button" key={t} onClick={()=>{const cur=formData.tags?formData.tags.split(',').map(x=>x.trim()):[]; if(!cur.includes(t)) setFormData(p=>({...p,tags:[...cur,t].filter(x=>x).join(', ')}));}} className="text-[9px] bg-gray-100 px-2 py-1 rounded-full">#{t}</button>)}</div>}
              <div className="flex flex-wrap gap-2">{formData.images.map((img,i)=><div key={i} className="relative w-20 h-20 border"><img src={img} className="w-full h-full object-cover" alt=""/><button type="button" onClick={()=>setFormData(p=>({...p,images:p.images.filter((_,x)=>x!==i)}))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"><X size={12}/></button></div>)}<label className="w-20 h-20 border-2 border-dashed flex items-center justify-center cursor-pointer"><Upload size={16}/><input type="file" hidden accept="image/*" multiple onChange={e=>{if(e.target.files?.length){ const f=Array.from(e.target.files).filter(x=>x.size<1048576); setFiles(p=>[...p,...f]); setFormData(p=>({...p,images:[...p.images,...f.map(x=>URL.createObjectURL(x))]})); }}}/></label></div>
              <button disabled={status.uploading} className="w-full bg-[#463E3E] text-white py-4 text-xs tracking-widest uppercase">{status.uploading ? '...' : '發布'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}