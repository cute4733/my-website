import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, X, Lock, Trash2, Edit3, Settings, Clock, CheckCircle, Upload, ChevronLeft, ChevronRight, Users, UserMinus, Search, Calendar, List as ListIcon, Grid, Download, Store, Filter, MapPin, CreditCard, Layers, MessageCircle, AlertOctagon, Ban, Heart, MinusCircle, Armchair } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, query, setDoc, getDocs, where } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import emailjs from '@emailjs/browser';

const firebaseConfig = {
  apiKey: "AIzaSyBkFqTUwtC7MqZ6h4--2_1BmldXEg-Haiw",
  authDomain: "uniwawa-beauty.com", projectId: "uniwawa-beauty",
  storageBucket: "uniwawa-beauty.firebasestorage.app", appId: "1:1009617609234:web:3cb5466e79a81c1f1aaecb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const appId = 'uniwawa01';

const CONST = {
  CATS: ['極簡氣質', '華麗鑽飾', '藝術手繪', '日系暈染', '貓眼系列', '單色/貓眼/鏡面', '純保養'],
  PRICES: ['全部', '1400以下', '1400-1800', '1800以上'],
  DAYS: ['日', '一', '二', '三', '四', '五', '六'],
  CLEAN: 20, MAX_DAYS: 30, P_SIZE: 24,
  IMG_WAWA: "https://drive.google.com/thumbnail?id=19CcU5NwecoqA0Xe4rjmHc_4OM_LGFq78&sz=w1000",
  IMG_STORE: "https://drive.google.com/thumbnail?id=1LKfqD6CfqPsovCs7fO_r6SQY6YcNtiNX&sz=w1000"
};

const NOTICE_ITEMS = [
  { title: "網站預約制", content: "本店採全預約制，請依系統時段預約，不接臨時客。" },
  { title: "款式說明", content: "以網站內容為主，暫不提供客製設計。" },
  { title: "病甲服務", content: "衛生考量，恕不提供黴菌感染等相關服務。" },
  { title: "遲到規範", content: "超過 10 分鐘將調整內容或取消。" },
  { title: "取消改期", content: "請於 24 小時前告知，否則將限制後續預約。" },
  { title: "保固服務", content: "7 日內非人為脫落可免費補修。" }
];
const NOTICE_TEXT = NOTICE_ITEMS.map((i, idx) => `${idx + 1}. ${i.title}: ${i.content}`).join('\n');

const TIME_SLOTS = (() => {
  const slots = [];
  for (let h = 12; h <= 18; h++) {
    for (let m = 0; m < 60; m += 10) {
      if (h === 18 && m > 30) break;
      slots.push(`${h}:${m === 0 ? '00' : m}`);
    }
  }
  return slots;
})();

const timeToMin = (t) => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const getTodayStr = () => new Date().toISOString().split('T')[0];

const fetchWithCache = async (key, fetcher, setter) => {
  const cached = localStorage.getItem(key);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < 3600000) return setter(data);
  }
  const data = await fetcher();
  setter(data);
  localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
};

const compressImage = (file) => new Promise(resolve => {
  const reader = new FileReader(); reader.readAsDataURL(file);
  reader.onload = (e) => {
    const img = new Image(); img.src = e.target.result;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxW = 800; let w = img.width, h = img.height;
      if (w > maxW) { h *= maxW / w; w = maxW; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(b => resolve(new File([b], file.name, { type: 'image/jpeg' })), 'image/jpeg', 0.8);
    };
  };
});

const deleteImageFromUrl = async (url) => {
  if (!url?.includes('firebasestorage')) return;
  try {
    const path = decodeURIComponent(url.split("/o/")[1].split("?")[0]);
    await deleteObject(ref(storage, path));
  } catch (e) { console.warn("Delete failed", e); }
};

const StyleCard = ({ item, isLoggedIn, onEdit, onDelete, onBook, onAddToCart, addons, onTagClick }) => {
  const [idx, setIdx] = useState(0);
  const [addonId, setAddonId] = useState('');
  const imgs = item.images?.length ? item.images : ['https://via.placeholder.com/400x533'];
  const ts = useRef(0), te = useRef(0);

  const move = (dir) => setIdx(p => (p + dir + imgs.length) % imgs.length);
  const handleTouch = (e, type) => {
    if (type === 's') ts.current = e.targetTouches[0].clientX;
    if (type === 'm') te.current = e.targetTouches[0].clientX;
    if (type === 'e' && ts.current && te.current && Math.abs(ts.current - te.current) > 50) move(ts.current > te.current ? 1 : -1);
  };

  return (
    <div className="group flex flex-col bg-white border border-[#F0EDEA] shadow-sm relative">
      {isLoggedIn && (
        <div className="absolute top-4 right-4 flex gap-2 z-30">
          <button onClick={e => { e.stopPropagation(); onEdit(item); }} className="p-2 bg-white/90 rounded-full hover:scale-110"><Edit3 size={16}/></button>
          <button onClick={e => { e.stopPropagation(); confirm('確定刪除？') && onDelete(item); }} className="p-2 bg-white/90 rounded-full hover:scale-110"><Trash2 size={16}/></button>
        </div>
      )}
      <div className="aspect-[3/4] overflow-hidden relative bg-gray-50" onTouchStart={e=>handleTouch(e,'s')} onTouchMove={e=>handleTouch(e,'m')} onTouchEnd={e=>handleTouch(e,'e')}>
        <div className="flex w-full h-full transition-transform duration-500" style={{ transform: `translateX(-${idx * 100}%)` }}>
          {imgs.map((src, i) => <img key={i} src={src} className="w-full h-full object-cover flex-shrink-0" loading="lazy" alt="" />)}
        </div>
        {imgs.length > 1 && <>
          <button onClick={e => {e.stopPropagation(); move(-1)}} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 text-white rounded-full z-10"><ChevronLeft size={20}/></button>
          <button onClick={e => {e.stopPropagation(); move(1)}} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 text-white rounded-full z-10"><ChevronRight size={20}/></button>
        </>}
        <button onClick={e => {e.stopPropagation(); onAddToCart(item)}} className="absolute bottom-4 right-4 bg-white/90 hover:bg-[#C29591] hover:text-white p-3 rounded-full shadow-md z-20 transition-all"><Heart size={18}/></button>
      </div>
      <div className="p-6 flex flex-col items-center text-center">
        <span className="text-xs text-[#C29591] tracking-[0.3em] mb-2">{item.category}</span>
        <h3 className="text-[#463E3E] font-medium text-lg mb-1">{item.title}</h3>
        <div className="flex flex-wrap gap-2 mb-3 mt-1">{item.tags?.map((t, i) => <button key={i} onClick={() => onTagClick(t)} className="text-[10px] text-gray-400 hover:text-[#C29591]">#{t}</button>)}</div>
        <div className="flex items-center gap-1 text-gray-400 text-xs mb-4"><Clock size={14}/> {item.duration || '90'} 分鐘</div>
        <p className="text-[#463E3E] font-bold text-xl mb-6">NT$ {item.price.toLocaleString()}</p>
        <select className={`w-full text-sm border py-3 px-4 bg-[#FAF9F6] mb-6 outline-none ${!addonId ? 'border-red-200' : 'border-[#EAE7E2]'}`} onChange={e => setAddonId(e.target.value)} value={addonId}>
          <option value="">請選擇現況 (必選)</option>
          {addons.map(a => <option key={a.id} value={a.id}>{a.name} (+${a.price})</option>)}
        </select>
        <button disabled={!addonId} onClick={() => onBook(item, addons.find(a => a.id === addonId))} className="bg-[#463E3E] text-white py-3.5 rounded-full text-xs tracking-[0.2em] w-full hover:bg-[#C29591] transition-colors disabled:bg-gray-300">
          {!addonId ? '請選擇現況' : '點此預約'}
        </button>
      </div>
    </div>
  );
};

const CartDrawer = ({ isOpen, onClose, cartItems, onRemove, onBookCartItem, addons }) => {
  const CartItem = ({ item }) => {
    const [localId, setLocalId] = useState('');
    return (
      <div className="flex gap-4 p-4 border-b bg-white">
        <img src={item.images?.[0] || 'https://via.placeholder.com/100'} className="w-20 h-20 object-cover rounded-sm" alt="" />
        <div className="flex-1">
          <div className="flex justify-between font-bold text-sm text-[#463E3E]"><h4>{item.title}</h4><button onClick={() => onRemove(item.id)} className="text-gray-300 hover:text-red-400"><MinusCircle size={16}/></button></div>
          <p className="text-xs text-gray-500 mb-2">NT$ {item.price.toLocaleString()}</p>
          <select className="w-full text-[10px] border py-1.5 px-2 bg-[#FAF9F6] outline-none mb-2" value={localId} onChange={e => setLocalId(e.target.value)}>
            <option value="">選擇現況</option>
            {addons.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <button disabled={!localId} onClick={() => onBookCartItem(item, addons.find(a => a.id === localId))} className="w-full bg-[#463E3E] text-white py-2 text-[10px] rounded-sm disabled:bg-gray-300">預約此項目</button>
        </div>
      </div>
    );
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/40 z-[900]" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-full md:w-[400px] bg-white z-[950] shadow-2xl transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-5 border-b flex justify-between bg-[#FAF9F6]"><span className="font-bold tracking-widest text-[#463E3E]">我的最愛 ({cartItems.length})</span><button onClick={onClose}><X size={20}/></button></div>
        <div className="flex-1 overflow-y-auto">{cartItems.length ? cartItems.map((it, idx) => <CartItem key={idx} item={it}/>) : <div className="h-full flex flex-col items-center justify-center text-gray-300 pt-20"><Heart size={48}/><p className="text-xs mt-4">收藏清單是空的</p></div>}</div>
      </div>
    </>
  );
};

const CustomCalendar = ({ selectedDate, onDateSelect, settings, selectedStoreId, isDayFull }) => {
  const [view, setView] = useState(selectedDate ? new Date(selectedDate) : new Date());
  const y = view.getFullYear(), m = view.getMonth();
  const today = new Date(); today.setHours(0,0,0,0);
  const max = new Date(today); max.setDate(today.getDate() + CONST.MAX_DAYS);
  const days = Array.from({ length: new Date(y, m + 1, 0).getDate() }, (_, i) => i + 1);
  const blanks = Array.from({ length: new Date(y, m, 1).getDay() }, (_, i) => i);

  return (
    <div className="w-full max-w-md bg-white border border-[#EAE7E2] p-6 shadow-sm mx-auto">
      <div className="flex justify-between items-center mb-6 px-2"><h4 className="text-sm font-bold">{y}年 {m + 1}月</h4><div className="flex gap-2"><button onClick={() => setView(new Date(y, m - 1, 1))}><ChevronLeft size={18}/></button><button onClick={() => setView(new Date(y, m + 1, 1))}><ChevronRight size={18}/></button></div></div>
      <div className="grid grid-cols-7 gap-2 mb-2">{CONST.DAYS.map(w => <div key={w} className="w-full text-center text-xs text-gray-400 font-bold">{w}</div>)}</div>
      <div className="grid grid-cols-7 gap-2">
        {blanks.map(i => <div key={`e-${i}`} />)}
        {days.map(d => {
          const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const tDate = new Date(y, m, d);
          const holiday = (settings?.holidays || []).some(h => h.date === ds && (h.storeId === 'all' || h.storeId === selectedStoreId));
          const staff = (settings?.staff || []).filter(s => s.storeId === selectedStoreId);
          const off = staff.length > 0 && staff.every(s => s.leaveDates?.includes(ds));
          const disabled = holiday || off || tDate < today || !selectedStoreId || tDate > max || isDayFull(ds);
          return <button key={d} disabled={disabled} onClick={() => onDateSelect(ds)} className={`aspect-square text-sm rounded-full flex items-center justify-center transition-all ${disabled ? 'text-gray-300 line-through cursor-not-allowed' : selectedDate === ds ? 'bg-[#463E3E] text-white' : 'hover:bg-[#C29591] hover:text-white'}`}>{d}</button>;
        })}
      </div>
    </div>
  );
};

const AdminBookingCalendar = ({ bookings, onDateSelect, selectedDate }) => {
  const [view, setView] = useState(new Date());
  const y = view.getFullYear(), m = view.getMonth();
  const first = new Date(y, m, 1).getDay();
  const totalDays = new Date(y, m + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < first; i++) days.push(<div key={`e-${i}`} className="h-7"/>);
  for (let d = 1; d <= totalDays; d++) {
    const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const active = bookings.some(b => b.date === ds), sel = selectedDate === ds;
    days.push(<button key={d} onClick={() => onDateSelect(ds)} className={`h-7 text-[9px] rounded-lg border flex flex-col items-center justify-center transition-all ${sel ? 'border-[#C29591] bg-[#FAF9F6] text-[#C29591] font-bold' : 'border-transparent'}`}><span>{d}</span>{active && <span className="w-1 h-1 rounded-full bg-[#C29591]" />}</button>);
  }
  return (
    <div className="w-full max-w-[210px] mx-auto bg-white border border-[#EAE7E2] p-2 shadow-sm">
      <div className="flex justify-between items-center mb-2"><h4 className="text-[10px] font-bold">{y}年 {m + 1}月</h4><div className="flex gap-2"><button onClick={() => setView(new Date(y, m - 1, 1))}><ChevronLeft size={14}/></button><button onClick={() => setView(new Date(y, m + 1, 1))}><ChevronRight size={14}/></button></div></div>
      <div className="grid grid-cols-7 gap-1">{CONST.DAYS.map(w => <div key={w} className="text-center text-[9px] text-gray-400 font-bold">{w}</div>)}{days}</div>
    </div>
  );
};

export default function App() {
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]') || document.createElement('meta');
    meta.name = 'viewport'; meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
    document.head.appendChild(meta);
  }, []);

  const [tab, setTab] = useState('catalog');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [items, setItems] = useState([]);
  const [addons, setAddons] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('uniwawa_cart')) || []);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [settings, setSettings] = useState({ stores: [], staff: [], holidays: [], styleCategories: CONST.CATS, savedTags: [], blacklist: [] });
  const [inputs, setInputs] = useState({ store: '', category: '', tag: '', pwd: '', bList: '', addon: { name: '', price: '', duration: '' }, holiday: { date: '', storeId: 'all' } });
  const [mgrTab, setMgrTab] = useState('stores');
  const [viewMode, setViewMode] = useState('list');
  const [adminSel, setAdminSel] = useState({ date: '', store: 'all' });
  const [step, setStep] = useState('none');
  const [sel, setSel] = useState({ item: null, addon: null });
  const [bookData, setBookData] = useState({ name: '', phone: '', email: '', date: '', time: '', storeId: '', paymentMethod: '門市付款', remarks: '' });
  const [status, setStatus] = useState({ submitting: false, adminOpen: false, uploadOpen: false, mgrOpen: false, uploading: false });
  const [editItem, setEditItem] = useState(null);
  const [filters, setFilters] = useState({ style: '全部', price: '全部', tag: '' });
  const [catalogSearch, setCatalogSearch] = useState('');
  const [formData, setFormData] = useState({ title: '', price: '', category: '極簡氣質', duration: '90', images: [], tags: '' });
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState({ key: '', res: [] });

  useEffect(() => { 
    signInAnonymously(auth); 
    onAuthStateChanged(auth, u => { if(u) {
      onSnapshot(doc(db, 'artifacts', appId, 'public', 'settings'), d => d.exists() && setSettings(s => ({...s, ...d.data()})));
      fetchWithCache('uniwawa_designs', async () => (await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'))).docs.map(d=>({id:d.id,...d.data()})), setItems);
      fetchWithCache('uniwawa_addons', async () => (await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'addons'))).docs.map(d=>({id:d.id,...d.data()})), setAddons);
    }});
  }, []);

  useEffect(() => { localStorage.setItem('uniwawa_cart', JSON.stringify(cart)); }, [cart]);

  useEffect(() => {
    if (step === 'form' || tab === 'search' || status.mgrOpen) {
      const start = new Date(); start.setDate(start.getDate() - 30);
      return onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), where('date', '>=', start.toISOString().split('T')[0])), s => setBookings(s.docs.map(d=>({id:d.id, ...d.data()}))));
    }
  }, [step, tab, status.mgrOpen]);

  const getDuration = () => (Number(sel.item?.duration) || 90) + (Number(sel.addon?.duration) || 0);
  const getAmount = () => (Number(sel.item?.price) || 0) + (Number(sel.addon?.price) || 0);

  const isTimeFull = (date, time) => {
    if (!date || !time || !bookData.storeId) return false;
    if (new Date(`${date} ${time}`) < new Date(Date.now() + 5400000)) return true;
    const avail = (settings.staff || []).filter(s => s.storeId === bookData.storeId && !s.leaveDates?.includes(date)).length;
    if (avail <= 0) return true;
    const store = settings.stores.find(s => s.id === bookData.storeId);
    const clean = store?.cleaningTime || CONST.CLEAN, start = timeToMin(time), dur = getDuration(), end = start + dur + clean;
    const overlap = bookings.filter(b => b.date === date && b.storeId === bookData.storeId && (timeToMin(b.time) < end && (timeToMin(b.time) + (b.totalDuration || 90) + clean) > start));
    if (overlap.length >= avail) return true;
    if (sel.item?.title?.includes('足') || sel.item?.category?.includes('足')) {
      const chairs = store?.pedicureChairs || 1;
      const oPed = overlap.filter(b => b.itemTitle?.includes('足') || b.category?.includes('足'));
      if (oPed.length >= chairs) return true;
    }
    return false;
  };

  const confirmBooking = async () => {
    if (settings.blacklist?.includes(bookData.phone)) return alert("此號碼限制預約");
    setStatus(p => ({ ...p, submitting: true }));
    const store = settings.stores.find(s => s.id === bookData.storeId)?.name;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), { ...bookData, storeName: store, itemTitle: sel.item?.title, addonName: sel.addon?.name || '無', totalAmount: getAmount(), totalDuration: getDuration(), createdAt: serverTimestamp() });
      await emailjs.send('service_uniwawa', 'template_d5tq1z9', { to_email: bookData.email, to_name: bookData.name, booking_date: bookData.date, booking_time: bookData.time, store_name: store, item_title: sel.item.title, notice_content: NOTICE_TEXT }, 'ehbGdRtZaXWft7qLM');
      setStep('success');
    } catch (e) { setStep('success'); } finally { setStatus(p => ({ ...p, submitting: false })); }
  };

  const submitItem = async (e) => {
    e.preventDefault(); setStatus(p => ({ ...p, uploading: true }));
    try {
      let urls = formData.images.filter(u => !u.startsWith('blob:'));
      if (files.length) {
        const cFiles = await Promise.all(files.map(compressImage));
        const uploaded = await Promise.all(cFiles.map(async f => getDownloadURL((await uploadBytes(ref(storage, `nail_designs/${Date.now()}_${f.name}`), f)).ref)));
        urls = [...urls, ...uploaded];
      }
      const payload = { ...formData, price: Number(formData.price), duration: Number(formData.duration), images: urls, tags: formData.tags.split(',').map(t=>t.trim()).filter(Boolean), updatedAt: serverTimestamp() };
      editItem ? await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', editItem.id), payload) : await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), { ...payload, createdAt: serverTimestamp() });
      setItems([]); setStatus(p=>({...p, uploadOpen:false})); localStorage.removeItem('uniwawa_designs'); window.location.reload();
    } catch (err) { alert(err.message); } finally { setStatus(p => ({ ...p, uploading: false })); }
  };

  const pItems = useMemo(() => {
    let res = items.filter(i => (filters.style === '全部' || i.category === filters.style) && (!filters.tag || i.tags?.includes(filters.tag)));
    if (catalogSearch) res = res.filter(i => i.title.includes(catalogSearch) || i.tags?.some(t => t.includes(catalogSearch)));
    return res.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }, [items, filters, catalogSearch]);

  const renderContent = () => {
    if (step === 'form') return (
      <div className="max-w-2xl mx-auto px-6 space-y-8">
        <div className="bg-white border p-6 flex gap-6 items-center shadow-sm">
          <img src={sel.item?.images?.[0]} className="w-24 h-24 object-cover" alt="" />
          <div className="flex-1"><p className="font-medium">{sel.item.title} {sel.addon && `+ ${sel.addon.name}`}</p><p className="text-xs text-gray-400">總金額: NT$ {getAmount().toLocaleString()}</p></div>
        </div>
        <div className="bg-white border p-8 space-y-6">
          <input placeholder="姓名" className="w-full border-b py-2" value={bookData.name} onChange={e=>setBookData(p=>({...p, name: e.target.value}))}/>
          <input placeholder="電話(10碼)" className="w-full border-b py-2" value={bookData.phone} onChange={e=>setBookData(p=>({...p, phone: e.target.value.replace(/\D/g,'')}))}/>
          <input placeholder="Email" className="w-full border-b py-2" value={bookData.email} onChange={e=>setBookData(p=>({...p, email: e.target.value}))}/>
          <div><label className="text-xs text-gray-400">選擇門市</label><div className="flex gap-2 mt-2">{settings.stores.map(s=><button key={s.id} onClick={()=>setBookData(p=>({...p, storeId:s.id, date:'', time:''}))} className={`px-4 py-2 text-xs border rounded-full ${bookData.storeId===s.id?'bg-[#463E3E] text-white':'bg-white'}`}>{s.name}</button>)}</div></div>
          <CustomCalendar selectedDate={bookData.date} onDateSelect={d=>setBookData(p=>({...p, date:d, time:''}))} settings={settings} selectedStoreId={bookData.storeId} isDayFull={d=>TIME_SLOTS.every(t=>isTimeFull(d,t))}/>
          {bookData.date && <div className="grid grid-cols-4 md:grid-cols-6 gap-2">{TIME_SLOTS.map(t=><button key={t} disabled={isTimeFull(bookData.date,t)} onClick={()=>setBookData(p=>({...p, time:t}))} className={`py-2 text-[10px] border ${bookData.time===t?'bg-[#463E3E] text-white':'bg-white disabled:opacity-20'}`}>{t}</button>)}</div>}
          <button disabled={status.submitting || !bookData.time} onClick={confirmBooking} className="w-full py-4 bg-[#463E3E] text-white text-xs disabled:opacity-50">確認預約</button>
        </div>
      </div>
    );

    if (step === 'success') return (
      <div className="max-w-lg mx-auto px-6 text-center pt-10"><CheckCircle size={48} className="text-[#C29591] mx-auto mb-4"/><h2 className="text-xl font-light">預約成功</h2><button onClick={()=>{setStep('none');setTab('catalog')}} className="mt-10 w-full py-4 bg-[#463E3E] text-white">回到首頁</button></div>
    );

    switch(tab) {
      case 'catalog': return (
        <div className="max-w-7xl mx-auto px-6 space-y-8">
          <div className="flex flex-col gap-4 border-b pb-8">
            <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input placeholder="搜尋..." className="pl-9 pr-4 py-2 border rounded-full text-xs w-full md:w-64" value={catalogSearch} onChange={e=>setCatalogSearch(e.target.value)}/></div>
            <div className="flex flex-wrap gap-2">{['全部', ...settings.styleCategories].map(c=><button key={c} onClick={()=>setFilters(p=>({...p,style:c}))} className={`px-4 py-1 text-xs rounded-full border ${filters.style===c?'bg-[#463E3E] text-white':'bg-white'}`}>{c}</button>)}</div>
          </div>
          <div className="grid md:grid-cols-3 gap-10">{pItems.map(i=><StyleCard key={i.id} item={i} isLoggedIn={isLoggedIn} onEdit={it=>{setEditItem(it);setFormData({...it,tags:it.tags.join(',')});setStatus(p=>({...p,uploadOpen:true}))}} onDelete={async it=>{if(confirm('刪除？')){await deleteDoc(doc(db,'artifacts',appId,'public','data','nail_designs',it.id));setItems(p=>p.filter(x=>x.id!==it.id));}}} onBook={(it,ad)=>{setSel({item:it,addon:ad});setStep('form');window.scrollTo(0,0)}} onAddToCart={it=>!cart.some(c=>c.id===it.id)?setCart(p=>[...p,it]):alert('已收藏')} addons={addons} onTagClick={t=>setFilters(p=>({...p,tag:t}))}/>)}</div>
        </div>
      );
      case 'notice': return <div className="max-w-3xl mx-auto px-6"><h2 className="text-2xl font-light text-center mb-10">預約須知</h2><div className="bg-white border p-10 space-y-6">{NOTICE_ITEMS.map((n,i)=><div key={i} className="border-b pb-4"><h3 className="font-bold text-sm">{n.title}</h3><p className="text-xs text-gray-500">{n.content}</p></div>)}</div></div>;
      case 'about': return <div className="max-w-3xl mx-auto px-6 bg-white border p-12 flex flex-col md:flex-row gap-8"><img src={CONST.IMG_WAWA} className="w-full md:w-1/3 object-cover" alt=""/><div className="text-xs leading-8 text-gray-500">創業八年的 Wawa 對美有著不懈追求，UNIWAWA 將指尖視為另一種畫布，延續藝術熱愛。</div></div>;
      case 'store': return <div className="max-w-4xl mx-auto px-6"><div className="bg-white border p-8"><img src={CONST.IMG_STORE} className="w-full h-64 object-cover mb-6"/><h3 className="text-lg font-medium">桃園文中店</h3><p className="text-xs text-gray-500 mb-6">桃園區文中三路 67 號 1 樓</p><button onClick={()=>window.open('https://maps.google.com','_blank')} className="w-full border py-3 text-xs">GOOGLE MAPS</button></div></div>;
      case 'search': return <div className="max-w-3xl mx-auto px-6"><div className="bg-white p-8 border mb-10 flex gap-2"><input placeholder="姓名或電話" className="flex-1 border-b" value={search.key} onChange={e=>setSearch(p=>({...p,key:e.target.value}))}/><button onClick={()=>{const r=bookings.filter(b=>b.name===search.key||b.phone===search.key);setSearch(p=>({...p,res:r}))}} className="bg-[#463E3E] text-white px-6">查詢</button></div>{search.res.map(b=><div key={b.id} className="bg-white border p-6 mb-4 font-bold text-sm">{b.date} {b.time} - {b.itemTitle}</div>)}</div>;
      case 'contact': return <div className="text-center pt-20"><a href="https://lin.ee/RNTAv2L" className="bg-[#06C755] text-white px-8 py-3 rounded-full font-bold">LINE 客服諮詢</a></div>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-[500] border-b">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <h1 className="text-2xl tracking-[0.4em] font-extralight cursor-pointer" onClick={()=>{setTab('catalog');setStep('none')}}>UNIWAWA</h1>
          <div className="flex gap-4 text-xs tracking-widest uppercase items-center">
            {['about:關於','catalog:款式','notice:須知','store:門市','search:查詢','contact:聯絡'].map(t=>{const [k,v]=t.split(':'); return <button key={k} onClick={()=>{setTab(k);setStep('none')}} className={tab===k?'text-[#C29591]':''}>{v}</button>})}
            {isLoggedIn ? <button onClick={()=>setStatus(p=>({...p,mgrOpen:true}))}><Settings size={18}/></button> : <button onClick={()=>setStatus(p=>({...p,adminOpen:true}))}><Lock size={14}/></button>}
          </div>
        </div>
      </nav>
      <main className="pt-28 pb-20">{renderContent()}</main>
      <button onClick={()=>setIsCartOpen(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-[#463E3E] text-white rounded-full shadow-2xl flex items-center justify-center z-[800]"><div className="relative"><Heart size={24}/>{cart.length>0&&<span className="absolute -top-2 -right-2 bg-[#C29591] text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full">{cart.length}</span>}</div></button>
      <CartDrawer isOpen={isCartOpen} onClose={()=>setIsCartOpen(false)} cartItems={cart} onRemove={id=>setCart(p=>p.filter(i=>i.id!==id))} onBookCartItem={(it,ad)=>{setSel({item:it,addon:ad});setStep('form');setIsCartOpen(false)}} addons={addons}/>
      {status.adminOpen && <div className="fixed inset-0 bg-black/40 z-[999] flex items-center justify-center"><div className="bg-white p-10 w-full max-w-sm"><input type="password" placeholder="PWD" className="w-full border-b py-4 text-center" onChange={e=>e.target.value==='8888'&&setIsLoggedIn(true)||setStatus(p=>({...p,adminOpen:false}))}/></div></div>}
      {status.mgrOpen && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4">
          <div className="bg-white w-full h-full max-w-6xl max-h-[90vh] flex flex-col rounded-lg overflow-hidden">
            <div className="p-6 border-b flex justify-between font-bold"><span>管理系統</span><button onClick={()=>setStatus(p=>({...p,mgrOpen:false}))}><X size={24}/></button></div>
            <div className="flex bg-gray-50 border-b overflow-x-auto">{['stores:門市','attributes:商品','staff_holiday:人員','bookings:預約','blacklist:黑名單'].map(t=>{const [k,v]=t.split(':');return <button key={k} onClick={()=>setMgrTab(k)} className={`px-6 py-4 text-xs ${mgrTab===k?'bg-white text-[#C29591]':''}`}>{v}</button>})}</div>
            <div className="flex-1 overflow-y-auto p-8">
              {mgrTab==='stores'&&<div className="space-y-4"><input className="border p-2 mr-2 text-xs" placeholder="新門市" value={inputs.store} onChange={e=>setInputs(p=>({...p,store:e.target.value}))}/><button onClick={()=>{saveSettings({...settings,stores:[...settings.stores,{id:Date.now().toString(),name:inputs.store}]});setInputs(p=>({...p,store:''}))}} className="bg-[#463E3E] text-white px-4 py-2 text-xs">新增</button><div className="grid grid-cols-3 gap-4 mt-4">{settings.stores.map(s=><div key={s.id} className="border p-4 flex justify-between"><span>{s.name}</span><button onClick={()=>saveSettings({...settings,stores:settings.stores.filter(x=>x.id!==s.id)})}><Trash2 size={14}/></button></div>)}</div></div>}
              {mgrTab==='bookings'&&<div className="space-y-4 flex flex-col md:flex-row gap-6"><div className="w-64"><AdminBookingCalendar bookings={bookings} selectedDate={adminSel.date} onDateSelect={d=>setAdminSel(p=>({...p,date:d}))}/></div><div className="flex-1 border p-4 bg-gray-50">{bookings.filter(b=>b.date===adminSel.date).map(b=><div key={b.id} className="bg-white p-3 mb-2 shadow-sm text-xs flex justify-between"><span>{b.time} {b.name} ({b.itemTitle})</span><button onClick={()=>deleteDoc(doc(db,'artifacts',appId,'public','data','bookings',b.id))}><Trash2 size={14}/></button></div>)}</div></div>}
            </div>
          </div>
        </div>
      )}
      {status.uploadOpen && (
        <div className="fixed inset-0 bg-black/40 z-[1001] flex items-center justify-center p-4">
          <form onSubmit={submitItem} className="bg-white p-8 w-full max-w-md space-y-4"><h3 className="font-bold">編輯款式</h3><input required className="w-full border-b" placeholder="名稱" value={formData.title} onChange={e=>setFormData(p=>({...p,title:e.target.value}))}/><input type="number" required className="w-full border-b" placeholder="價格" value={formData.price} onChange={e=>setFormData(p=>({...p,price:e.target.value}))}/><button className="w-full bg-[#463E3E] text-white py-4 uppercase">發布</button><button type="button" onClick={()=>setStatus(p=>({...p,uploadOpen:false}))} className="w-full text-xs text-gray-400">取消</button></form>
        </div>
      )}
    </div>
  );
}