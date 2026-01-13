import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, X, Lock, Trash2, Edit3, Settings, Clock, CheckCircle, Upload, ChevronLeft, ChevronRight, Users, UserMinus, Search, Calendar, List as ListIcon, Grid, Download, Store, Filter, MapPin, CreditCard, Hash, Layers, MessageCircle, AlertOctagon } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, query, orderBy, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import emailjs from '@emailjs/browser';

// --- Config & Constants ---
const firebaseConfig = { apiKey: "AIzaSyBkFqTUwtC7MqZ6h4--2_1BmldXEg-Haiw", authDomain: "uniwawa-beauty.com", projectId: "uniwawa-beauty", storageBucket: "uniwawa-beauty.firebasestorage.app", appId: "1:1009617609234:web:3cb5466e79a81c1f1aaecb" };
const app = initializeApp(firebaseConfig), auth = getAuth(app), db = getFirestore(app), storage = getStorage(app), appId = 'uniwawa01';

const CONSTS = {
  CATS: ['極簡氣質', '華麗鑽飾', '藝術手繪', '日系暈染', '貓眼系列'],
  PRICES: ['全部', '1300以下', '1300-1900', '1900以上'],
  WEEKDAYS: ['日', '一', '二', '三', '四', '五', '六'],
  IMG_WAWA: "https://drive.google.com/thumbnail?id=19CcU5NwecoqA0Xe4rjmHc_4OM_LGFq78&sz=w1000",
  IMG_STORE: "https://drive.google.com/thumbnail?id=1LKfqD6CfqPsovCs7fO_r6SQY6YcNtiNX&sz=w1000",
  NOTICE: [
    { t: "網站預約制", c: "本店採全預約制，請依系統開放的時段與服務項目進行預約，恕不接受臨時客。" },
    { t: "款式說明", c: "服務款式以網站上提供內容為主，暫不提供帶圖或客製設計服務。" },
    { t: "病甲服務說明", c: "為了衛生與施作安全考量，恕不提供病甲（如黴菌感染、卷甲、崁甲、灰指甲等）相關服務。" },
    { t: "遲到規範", c: "若遲到超過 10 分鐘，將視當日狀況調整服務內容；若影響後續預約可能無法施作。" },
    { t: "取消與改期", c: "如需取消或改期，請於預約 24 小時前告知。未提前取消或無故未到者，將無法再接受後續預約。" },
    { t: "保固服務", c: "施作後 7 日內若非人為因素脫落，可協助免費補修，請聯絡官方 LINE 預約補修時間。" },
  ]
};
const TIME_SLOTS = Array.from({ length: 37 }, (_, i) => { const h = 12 + Math.floor(i * 10 / 60); const m = (i * 10) % 60; return h === 18 && m > 30 ? null : `${h}:${m===0?'00':m}`; }).filter(Boolean);
const timeToMin = (s) => { const [h, m] = s?.split(':').map(Number) || [0, 0]; return h * 60 + m; };
const getTodayStr = () => new Date().toISOString().split('T')[0];
const NOTICE_TEXT = CONSTS.NOTICE.map((i, idx) => `${idx + 1}. ${i.t}: ${i.c}`).join('\n');

// --- Helpers & UI Components ---
const Btn = ({ children, onClick, className = "", disabled, type = "button" }) => (
  <button type={type} disabled={disabled} onClick={onClick} className={`transition-all duration-300 ${className}`}>{children}</button>
);
const SectionTitle = ({ title }) => <h2 className="text-2xl font-light tracking-[0.3em] text-[#463E3E] text-center mb-8 md:mb-12 uppercase">{title}</h2>;

const StyleCard = ({ item, isLoggedIn, onEdit, onDelete, onBook, addons, onTagClick }) => {
  const [idx, setIdx] = useState(0);
  const [aid, setAid] = useState('');
  const imgs = item.images?.length ? item.images : ['https://via.placeholder.com/400x533'];
  const ts = useRef(0);

  const move = (d) => setIdx((prev) => (prev + d + imgs.length) % imgs.length);
  const handleTouch = (e, type) => {
    if (type === 'start') ts.current = e.targetTouches[0].clientX;
    if (type === 'end' && ts.current) {
      const diff = ts.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) move(diff > 0 ? 1 : -1);
      ts.current = 0;
    }
  };

  return (
    <div className="group flex flex-col bg-white border border-[#F0EDEA] shadow-sm relative">
      {isLoggedIn && (
        <div className="absolute top-4 right-4 flex gap-2 z-[30]">
          <Btn onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-2 bg-white/90 rounded-full text-blue-600 hover:scale-110"><Edit3 size={16}/></Btn>
          <Btn onClick={(e) => { e.stopPropagation(); confirm('確定刪除？') && onDelete(item.id); }} className="p-2 bg-white/90 rounded-full text-red-600 hover:scale-110"><Trash2 size={16}/></Btn>
        </div>
      )}
      <div className="aspect-[3/4] overflow-hidden relative bg-gray-50" onTouchStart={e=>handleTouch(e,'start')} onTouchEnd={e=>handleTouch(e,'end')}>
        <div className="flex w-full h-full transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${idx * 100}%)` }}>
          {imgs.map((src, i) => <img key={i} src={src} className="w-full h-full object-cover flex-shrink-0" loading={i===0?"eager":"lazy"} decoding="async"/>)}
        </div>
        {imgs.length > 1 && <>
          <Btn onClick={()=>move(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full z-10 backdrop-blur-sm"><ChevronLeft size={20}/></Btn>
          <Btn onClick={()=>move(1)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full z-10 backdrop-blur-sm"><ChevronRight size={20}/></Btn>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">{imgs.map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full ${i===idx?'bg-white':'bg-white/40'}`}/>)}</div>
        </>}
      </div>
      <div className="p-6 flex flex-col items-center text-center">
        <span className="text-xs text-[#C29591] tracking-[0.3em] uppercase mb-2 font-medium">{item.category}</span>
        <h3 className="text-[#463E3E] font-medium text-lg tracking-widest mb-1">{item.title}</h3>
        {item.tags?.length > 0 && <div className="flex flex-wrap justify-center gap-2 mb-3 mt-1">{item.tags.map((t,i)=><Btn key={i} onClick={()=>onTagClick(t)} className="text-[10px] text-gray-400 hover:text-[#C29591]">#{t}</Btn>)}</div>}
        <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-4 uppercase tracking-widest font-light"><Clock size={14} /> 預計服務：{item.duration || '90'} 分鐘</div>
        <p className="text-[#463E3E] font-bold text-xl mb-6"><span className="text-xs font-light tracking-widest mr-1">NT$</span>{item.price.toLocaleString()}</p>
        <select className={`w-full text-sm border py-3 px-4 bg-[#FAF9F6] mb-6 outline-none text-[#463E3E] ${!aid?'border-red-200':'border-[#EAE7E2]'}`} onChange={(e)=>setAid(e.target.value)} value={aid}>
          <option value="">請選擇指甲現況 (必選)</option>
          {addons.map(a => <option key={a.id} value={a.id}>{a.name} (+${a.price} / +{a.duration}分)</option>)}
        </select>
        <Btn disabled={!aid} onClick={() => onBook(item, addons.find(a=>a.id===aid))} className="bg-[#463E3E] text-white px-8 py-3.5 rounded-full text-xs tracking-[0.2em] font-medium w-full hover:bg-[#C29591] disabled:opacity-50 disabled:bg-gray-300">{!aid?'請先選擇現況':'點此預約'}</Btn>
      </div>
    </div>
  );
};

const CalendarBase = ({ dateStr, onSelect, renderDay, maxDays = 30 }) => {
  const [viewDate, setViewDate] = useState(dateStr ? new Date(dateStr) : new Date());
  useEffect(() => { if(dateStr) setViewDate(new Date(dateStr)); }, [dateStr]);
  const y = viewDate.getFullYear(), m = viewDate.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const firstDay = new Date(y, m, 1).getDay();

  return (
    <div className="w-full max-w-md bg-white border border-[#EAE7E2] p-6 shadow-sm mx-auto">
      <div className="flex justify-between items-center mb-6 px-2">
        <h4 className="text-sm font-bold tracking-widest text-[#463E3E]">{y}年 {m + 1}月</h4>
        <div className="flex gap-2">
          <Btn onClick={()=>setViewDate(new Date(y, m-1, 1))}><ChevronLeft size={18}/></Btn>
          <Btn onClick={()=>setViewDate(new Date(y, m+1, 1))}><ChevronRight size={18}/></Btn>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 mb-2">{CONSTS.WEEKDAYS.map(w=><div key={w} className="w-full flex justify-center text-xs text-gray-400 font-bold">{w}</div>)}</div>
      <div className="grid grid-cols-7 gap-2">
        {[...Array(firstDay).fill(null), ...Array(daysInMonth).keys()].map((d, i) => {
           if(d===null) return <div key={`e-${i}`} className="w-full aspect-square"/>;
           const curDate = `${y}-${String(m+1).padStart(2,'0')}-${String(d+1).padStart(2,'0')}`;
           return renderDay(d + 1, curDate);
        })}
      </div>
      {maxDays && <div className="text-[10px] text-center text-gray-400 mt-4 tracking-widest">僅開放 {maxDays} 天內預約</div>}
    </div>
  );
};

// --- Sub-Components ---
const BookingForm = ({ item, addon, stores, settings, bookingData, setBookingData, onSubmit, isSubmitting, isSlotFull, isDayFull, allBookings }) => {
  const calcTotal = (k) => (Number(item?.[k])||0) + (Number(addon?.[k])||0);
  const isValid = bookingData.name.trim() && !/\d/.test(bookingData.name) && bookingData.phone.length===10 && /\S+@\S+\.\S+/.test(bookingData.email) && bookingData.time && bookingData.storeId;

  return (
    <div className="max-w-2xl mx-auto px-6">
      <SectionTitle title="RESERVATION / 預約資訊" />
      <div className="bg-white border border-[#EAE7E2] mb-6 p-6 shadow-sm flex flex-col md:flex-row gap-6 items-center">
         <img src={item?.images?.[0]} className="w-24 h-24 object-cover border" alt="p"/>
         <div className="flex-1 space-y-1">
           <p className="text-xs text-[#C29591] font-bold">預約項目</p>
           <p className="text-sm font-medium">{item?.title} {addon ? `+ ${addon.name}` : ''}</p>
           <p className="text-xs text-gray-400">時長: <span className="font-bold text-[#463E3E]">{calcTotal('duration')}</span> 分</p>
         </div>
         <div className="text-right"><p className="text-xs text-gray-400">總金額</p><p className="text-lg font-bold text-[#463E3E]">NT$ {calcTotal('price').toLocaleString()}</p></div>
      </div>
      <div className="bg-white border border-[#EAE7E2] p-8 shadow-sm space-y-8">
        <div className="border-b pb-6">
          <label className="text-xs font-bold text-gray-400 mb-2 block">選擇預約門市</label>
          <div className="flex flex-wrap gap-3">{stores.length ? stores.map(s => <Btn key={s.id} onClick={()=>setBookingData({...bookingData, storeId: s.id, date:'', time:''})} className={`px-4 py-2 text-xs border rounded-full ${String(bookingData.storeId)===String(s.id)?'bg-[#463E3E] text-white':'bg-white text-gray-500 hover:border-[#C29591]'}`}>{s.name}</Btn>) : <p className="text-xs text-red-400">無可預約門市</p>}</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <input type="text" placeholder="顧客姓名 (不可含數字)" className={`border-b py-2 outline-none w-full ${/\d/.test(bookingData.name)?'border-red-300 text-red-500':''}`} value={bookingData.name} onChange={e=>setBookingData({...bookingData, name:e.target.value})}/>
          <input type="tel" placeholder="聯絡電話 (10碼)" className="border-b py-2 outline-none w-full" value={bookingData.phone} onChange={e=>{ const v=e.target.value.replace(/\D/g,''); if(v.length<=10) setBookingData({...bookingData, phone:v}); }}/>
          <input type="email" placeholder="電子信箱" className="border-b py-2 outline-none w-full" value={bookingData.email} onChange={e=>setBookingData({...bookingData, email:e.target.value})}/>
          <div className="flex items-center gap-2 border-b py-2 text-gray-400 md:col-span-2"><CreditCard size={16}/><span className="text-xs">付款方式：<span className="text-[#463E3E] font-medium">門市付款</span></span></div>
        </div>
        <div className="flex justify-center pt-2">
          <CalendarBase dateStr={bookingData.date} renderDay={(d, dateStr) => {
             const today = new Date(); today.setHours(0,0,0,0); const target = new Date(dateStr);
             const isHoliday = (settings.holidays||[]).some(h=>h.date===dateStr && (h.storeId==='all'||String(h.storeId)===String(bookingData.storeId)));
             const staff = (settings.staff||[]).filter(s=>String(s.storeId)===String(bookingData.storeId));
             const allOnLeave = staff.length > 0 && (staff.length - staff.filter(s=>(s.leaveDates||[]).includes(dateStr)).length) <= 0;
             const disabled = isHoliday || allOnLeave || target < today || !bookingData.storeId || target > new Date(today.setDate(today.getDate()+30)) || isDayFull(dateStr);
             return <Btn key={d} disabled={disabled} onClick={()=>setBookingData({...bookingData, date:dateStr, time:''})} className={`w-full aspect-square text-sm rounded-full flex items-center justify-center ${disabled?'text-gray-300 line-through cursor-not-allowed': bookingData.date===dateStr?'bg-[#463E3E] text-white':'hover:bg-[#C29591] hover:text-white'}`}>{d}</Btn>
          }} />
        </div>
        {bookingData.date && bookingData.storeId && <div className="grid grid-cols-4 md:grid-cols-6 gap-2">{TIME_SLOTS.map(t=><Btn key={t} disabled={isSlotFull(bookingData.date, t)} onClick={()=>setBookingData({...bookingData, time:t})} className={`py-2 text-[10px] border ${bookingData.time===t?'bg-[#463E3E] text-white':'bg-white disabled:opacity-20'}`}>{t}</Btn>)}</div>}
        <Btn disabled={isSubmitting || !isValid} onClick={onSubmit} className="w-full py-4 bg-[#463E3E] text-white text-xs tracking-widest uppercase disabled:opacity-50">{isSubmitting?'處理中...':'確認預約'}</Btn>
      </div>
    </div>
  );
};

const SuccessView = ({ item, booking, addon, stores, goHome }) => (
  <div className="max-w-lg mx-auto px-6">
    <div className="text-center mb-10"><div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FAF9F6] mb-4"><CheckCircle size={32} className="text-[#C29591]"/></div><h2 className="text-xl font-light tracking-[0.3em] uppercase">Confirmed</h2><p className="text-[10px] text-gray-400 mt-2">預約已送出</p></div>
    <div className="bg-white border border-[#EAE7E2] shadow-lg relative">
      <div className="h-1 bg-[#C29591]"/>
      <div className="w-full h-56 relative bg-gray-50"><img src={item?.images?.[0]} className="w-full h-full object-cover"/><div className="absolute inset-0 bg-gradient-to-t from-[#463E3E]/90 to-transparent flex items-end p-6 text-white"><h3 className="text-lg">{item?.title}</h3></div></div>
      <div className="p-8">
        <div className="bg-[#FAF9F6] border p-4 text-center mb-8"><p className="text-lg font-bold">{booking.date} • {booking.time}</p><div className="text-xs font-bold text-[#C29591]">{stores.find(s=>s.id===booking.storeId)?.name}</div></div>
        <div className="space-y-4 text-xs text-[#5C5555]">
          {[ ['顧客', booking.name], ['電話', booking.phone], ['加購', addon?.name||'無'], ['時長', `${(Number(item?.duration)||90)+(Number(addon?.duration)||0)} 分`] ].map(([l,v],i)=><div key={i} className="flex justify-between border-b border-dashed pb-2"><span className="text-gray-400">{l}</span><span className="font-medium">{v}</span></div>)}
        </div>
        <div className="mt-8 pt-6 border-t flex justify-between items-end"><span className="text-[10px] font-bold text-gray-400">TOTAL</span><div className="text-2xl font-bold text-[#C29591]">NT$ {((Number(item?.price)||0)+(Number(addon?.price)||0)).toLocaleString()}</div></div>
      </div>
    </div>
    <Btn onClick={goHome} className="w-full mt-8 bg-[#463E3E] text-white py-4 text-xs tracking-[0.2em] shadow-lg">回到首頁</Btn>
  </div>
);

const AdminModal = ({ isOpen, close, onLogin }) => isOpen ? (
  <div className="fixed inset-0 bg-black/40 z-[250] flex items-center justify-center p-4">
    <div className="bg-white p-10 max-w-sm w-full shadow-2xl">
      <h3 className="tracking-[0.5em] mb-10 text-gray-400 text-sm text-center">ADMIN ACCESS</h3>
      <form onSubmit={e=>{e.preventDefault(); if(e.target[0].value==="8888") onLogin(); close();}}>
        <input type="password" placeholder="••••" className="w-full border-b py-4 text-center tracking-[1.5em] outline-none" autoFocus/>
        <Btn type="submit" className="w-full bg-[#463E3E] text-white py-4 mt-6 text-xs">ENTER</Btn>
      </form>
    </div>
  </div>
) : null;

// --- Corrected ManagerModal with Formatting ---
const ManagerModal = ({ isOpen, close, settings, setSettings, bookings, items, onDeleteBooking }) => {
  const [tab, setTab] = useState('stores');
  const [inputs, setInputs] = useState({ store:'', cat:'', tag:'', hDate:'', hStore:'all', addon:{name:'',p:'',d:''} });
  const [adminFilter, setAdminFilter] = useState({ store:'all', date: getTodayStr(), mode:'list' });

  if (!isOpen) return null;
  const update = (k, v) => setSettings(p => ({ ...p, [k]: v }));
  const save = async (newS) => await setDoc(doc(db, 'artifacts', appId, 'public', 'settings'), newS);
   
  const addStore = () => { if(inputs.store) { const ns={...settings, stores:[...settings.stores, {id:Date.now().toString(), name:inputs.store, cleaningTime:20}]}; save(ns); setInputs({...inputs, store:''}); }};
  const addCat = () => { if(inputs.cat && !settings.styleCategories.includes(inputs.cat)) { const ns={...settings, styleCategories:[...settings.styleCategories, inputs.cat]}; save(ns); setInputs({...inputs, cat:''}); }};
  const addTag = () => { if(inputs.tag && !settings.savedTags.includes(inputs.tag)) { const ns={...settings, savedTags:[...settings.savedTags, inputs.tag]}; save(ns); setInputs({...inputs, tag:''}); }};
  const addHoliday = () => { if(inputs.hDate) { const ns={...settings, holidays:[...settings.holidays, {date:inputs.hDate, storeId:inputs.hStore}]}; save(ns); }};
  const addAddon = async (e) => { e.preventDefault(); if(inputs.addon.name){ await addDoc(collection(db,'artifacts',appId,'public','data','addons'),{name:inputs.addon.name, price:Number(inputs.addon.p), duration:Number(inputs.addon.d)}); setInputs({...inputs, addon:{name:'',p:'',d:''}}); }};

  const filteredBookings = bookings.filter(b => (adminFilter.store==='all'||String(b.storeId)===String(adminFilter.store))).sort((a,b)=>new Date(`${a.date} ${a.time}`) - new Date(`${b.date} ${b.time}`));
  const dateBookings = filteredBookings.filter(b => b.date === adminFilter.date);

  return (
    <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center md:p-4 backdrop-blur-sm">
      <div className="bg-white w-full h-full md:max-w-[98vw] md:h-[95vh] flex flex-col md:rounded-lg overflow-hidden">
        <div className="px-8 py-6 border-b flex justify-between items-center"><h3 className="text-xs tracking-[0.3em] font-bold text-[#463E3E]">系統管理</h3><Btn onClick={close}><X size={24}/></Btn></div>
        <div className="flex border-b bg-[#FAF9F6] px-8 overflow-x-auto">
          {[{id:'stores',l:'門市',i:<Store size={14}/>},{id:'attrs',l:'屬性',i:<Layers size={14}/>},{id:'staff',l:'人員',i:<Users size={14}/>},{id:'bookings',l:'預約',i:<Calendar size={14}/>}].map(t=>(
            <Btn key={t.id} onClick={()=>setTab(t.id)} className={`flex gap-2 px-6 py-4 text-xs tracking-widest whitespace-nowrap ${tab===t.id?'bg-white border-x border-t text-[#C29591] font-bold -mb-[1px]':'text-gray-400'}`}>{t.i}{t.l}</Btn>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {tab === 'stores' && <div className="space-y-6">
              <div className="flex gap-2"><input className="border p-2 text-xs flex-1" placeholder="新門市" value={inputs.store} onChange={e=>setInputs({...inputs, store:e.target.value})}/><Btn onClick={addStore} className="bg-[#463E3E] text-white px-4 text-xs">新增</Btn></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{settings.stores.map(s=><div key={s.id} className="border p-4 bg-white shadow-sm flex flex-col gap-2"><div className="flex justify-between font-bold text-sm text-[#463E3E]"><span>{s.name}</span><Btn onClick={()=>{confirm('刪除?')&&save({...settings, stores:settings.stores.filter(x=>x.id!==s.id)})}}><Trash2 size={14}/></Btn></div><div className="text-xs text-gray-400 flex items-center gap-1">整備 <input type="number" defaultValue={s.cleaningTime||20} onBlur={e=>{const ns={...settings, stores:settings.stores.map(x=>x.id===s.id?{...x, cleaningTime:Number(e.target.value)}:x)}; save(ns);}} className="w-10 border text-center"/> 分</div></div>)}</div>
          </div>}
          {tab === 'attrs' && <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="space-y-4">
                <h4 className="font-bold text-sm border-l-4 border-[#C29591] pl-2">風格分類</h4>
                <div className="flex gap-2"><input className="border p-2 text-xs flex-1" value={inputs.cat} onChange={e=>setInputs({...inputs, cat:e.target.value})}/><Btn onClick={addCat} className="bg-[#463E3E] text-white px-3 text-xs">新增</Btn></div>
                <div className="flex flex-wrap gap-2">{settings.styleCategories.map(c=><span key={c} className="bg-[#FAF9F6] border px-3 py-2 text-xs relative group">{c}<Btn onClick={()=>confirm('刪除?')&&save({...settings, styleCategories:settings.styleCategories.filter(x=>x!==c)})} className="absolute -top-2 -right-2 bg-red-400 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"><X size={10}/></Btn></span>)}</div>
              </div>
              <div className="space-y-4">
                <h4 className="font-bold text-sm border-l-4 border-[#C29591] pl-2">標籤</h4>
                <div className="flex gap-2"><input className="border p-2 text-xs flex-1" value={inputs.tag} onChange={e=>setInputs({...inputs, tag:e.target.value})}/><Btn onClick={addTag} className="bg-[#463E3E] text-white px-3 text-xs">新增</Btn></div>
                <div className="flex flex-wrap gap-2">{settings.savedTags.map(t=><span key={t} className="bg-gray-50 border px-3 py-1 rounded-full text-xs relative group">#{t}<Btn onClick={()=>save({...settings, savedTags:settings.savedTags.filter(x=>x!==t)})} className="absolute -top-1 -right-1 bg-red-400 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"><X size={8}/></Btn></span>)}</div>
              </div>
              <div className="space-y-4">
                <h4 className="font-bold text-sm border-l-4 border-[#C29591] pl-2">加購項目</h4>
                <form onSubmit={addAddon} className="bg-gray-50 p-3 border space-y-2"><input placeholder="名稱" className="w-full border p-2 text-xs" value={inputs.addon.name} onChange={e=>setInputs({...inputs, addon:{...inputs.addon, name:e.target.value}})}/><div className="flex gap-2"><input placeholder="$" type="number" className="w-1/2 border p-2 text-xs" value={inputs.addon.p} onChange={e=>setInputs({...inputs, addon:{...inputs.addon, p:e.target.value}})}/><input placeholder="分" type="number" className="w-1/2 border p-2 text-xs" value={inputs.addon.d} onChange={e=>setInputs({...inputs, addon:{...inputs.addon, d:e.target.value}})}/></div><Btn type="submit" className="w-full bg-[#463E3E] text-white py-1 text-xs">新增</Btn></form>
              </div>
          </div>}
          
          {tab === 'staff' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center border-l-4 border-[#C29591] pl-2">
                  <h4 className="font-bold text-sm">人員名單</h4>
                  <Btn onClick={() => {
                    const n = prompt('姓名?');
                    n && save({ ...settings, staff: [...settings.staff, { id: Date.now().toString(), name: n, storeId: settings.stores[0]?.id, leaveDates: [] }] });
                  }} className="text-[10px] bg-[#C29591] text-white px-3 py-1 rounded-full">+ 新增</Btn>
                </div>
                {settings.staff.map(s => (
                  <div key={s.id} className="border p-4 bg-gray-50 space-y-2">
                    <div className="flex justify-between font-bold text-xs">
                      <span>{s.name}</span>
                      <select value={s.storeId} onChange={e => save({ ...settings, staff: settings.staff.map(x => x.id === s.id ? { ...x, storeId: e.target.value } : x) })} className="ml-2 border">
                        {settings.stores.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                      </select>
                      <Btn onClick={() => confirm('刪除?') && save({ ...settings, staff: settings.staff.filter(x => x.id !== s.id) })}>
                        <Trash2 size={14} />
                      </Btn>
                    </div>
                    <div className="border-t pt-2">
                      <label className="text-[10px] text-gray-400">休假: </label>
                      <input type="date" className="text-[10px] border p-1" onChange={e => {
                        if (e.target.value) save({ ...settings, staff: settings.staff.map(x => x.id === s.id ? { ...x, leaveDates: [...x.leaveDates, e.target.value].sort() } : x) });
                      }} />
                      <div className="flex flex-wrap gap-1 mt-1">
                        {s.leaveDates.map(d => (
                          <span key={d} className="text-[9px] bg-white border px-1 flex items-center gap-1">
                            {d}
                            <X size={8} onClick={() => save({ ...settings, staff: settings.staff.map(x => x.id === s.id ? { ...x, leaveDates: x.leaveDates.filter(l => l !== d) } : x) })} />
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <h4 className="font-bold text-sm border-l-4 border-[#C29591] pl-2">公休日</h4>
                <div className="flex gap-2 bg-gray-50 p-2 border">
                  <select className="text-xs border" value={inputs.hStore} onChange={e => setInputs({ ...inputs, hStore: e.target.value })}>
                    <option value="all">全品牌</option>
                    {settings.stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input type="date" className="flex-1 text-xs border p-1" value={inputs.hDate} onChange={e => setInputs({ ...inputs, hDate: e.target.value })} />
                  <Btn onClick={addHoliday} className="bg-[#463E3E] text-white px-3 text-xs">新增</Btn>
                </div>
                <div className="flex flex-wrap gap-2">
                  {settings.holidays.map((h, i) => (
                    <span key={i} className="text-[10px] border px-2 py-1 bg-white flex items-center gap-1">
                      {h.date} ({h.storeId === 'all' ? '全' : settings.stores.find(s => s.id === h.storeId)?.name})
                      <X size={10} onClick={() => save({ ...settings, holidays: settings.holidays.filter((_, idx) => idx !== i) })} />
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'bookings' && <div className="h-full flex flex-col space-y-4">
              <div className="flex justify-between border-b pb-2 items-center">
                <div className="flex gap-2 items-center"><Filter size={14}/><select className="text-xs border-none outline-none font-bold" value={adminFilter.store} onChange={e=>setAdminFilter({...adminFilter, store:e.target.value})}><option value="all">全部分店</option>{settings.stores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                <div className="flex gap-1"><Btn onClick={()=>setAdminFilter({...adminFilter, mode:'list'})} className={`p-1 rounded ${adminFilter.mode==='list'?'bg-gray-200':''}`}><ListIcon size={16}/></Btn><Btn onClick={()=>setAdminFilter({...adminFilter, mode:'cal'})} className={`p-1 rounded ${adminFilter.mode==='cal'?'bg-gray-200':''}`}><Grid size={16}/></Btn></div>
              </div>
              {adminFilter.mode === 'list' ? <div className="space-y-2 overflow-y-auto">{filteredBookings.map(b=><div key={b.id} className="border p-3 flex justify-between bg-[#FAF9F6] text-xs hover:border-[#C29591]"><div><div className="font-bold mb-1">{b.date} <span className="text-[#C29591]">{b.time}</span> <span className="border px-1 text-gray-400 font-normal">{b.storeName}</span></div><div>{b.name} | {b.phone}</div><div className="text-gray-400">{b.itemTitle} {b.addonName!=='無'&&`+ ${b.addonName}`}</div></div><Btn onClick={()=>confirm('取消?')&&onDeleteBooking(b.id)}><Trash2 size={16} className="text-gray-300 hover:text-red-500"/></Btn></div>)}</div> : 
              <div className="flex flex-col md:flex-row gap-4 h-full"><CalendarBase dateStr={adminFilter.date} renderDay={(d,ds)=>{ const has=filteredBookings.some(x=>x.date===ds); return <Btn key={d} onClick={()=>setAdminFilter({...adminFilter, date:ds})} className={`w-full aspect-square text-xs border flex flex-col items-center justify-center ${adminFilter.date===ds?'bg-[#FAF9F6] border-[#C29591] font-bold':''}`}>{d}{has&&<span className="w-1 h-1 rounded-full bg-red-400"/>}</Btn>}} maxDays={null}/>
                <div className="flex-1 overflow-y-auto space-y-2 border-l pl-4"><h5 className="font-bold text-xs mb-2">{adminFilter.date}</h5>{dateBookings.map(b=><div key={b.id} className="border p-2 text-xs relative overflow-hidden"><div className="absolute left-0 top-0 bottom-0 w-1 bg-[#C29591]"/><div className="flex justify-between pl-2"><span className="font-bold">{b.time} {b.name}</span><span className="text-[#C29591]">${b.totalAmount}</span></div><div className="pl-2 text-gray-400">{b.itemTitle}</div></div>)}</div></div>}
          </div>}
        </div>
      </div>
    </div>
  );
};

const UploadModal = ({ isOpen, close, item, settings, onSubmit, isUploading }) => {
  const [f, setF] = useState({ title:'', price:'', category: settings.styleCategories[0]||'極簡氣質', duration:'90', images:[], tags:'' });
  const [files, setFiles] = useState([]);
  useEffect(() => { if(item) setF({...item, tags: item.tags?.join(', ')||''}); else setF({ title:'', price:'', category:settings.styleCategories[0], duration:'90', images:[], tags:'' }); setFiles([]); }, [item, isOpen]);

  if(!isOpen) return null;
  const handleFile = (e) => {
    const fs = Array.from(e.target.files).filter(file => file.size <= 1024*1024);
    if(fs.length < e.target.files.length) alert('部分檔案過大被略過');
    setFiles(p => [...p, ...fs]);
    setF(p => ({...p, images: [...p.images, ...fs.map(file=>URL.createObjectURL(file))]}));
  };
   
  return (
    <div className="fixed inset-0 bg-black/40 z-[1000] flex items-center justify-center p-4">
      <div className="bg-white p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-6"><h3 className="tracking-widest">{item?'修改':'上傳'}</h3><Btn onClick={close}><X size={20}/></Btn></div>
        <form onSubmit={e => { e.preventDefault(); onSubmit(f, files); }} className="space-y-6">
          <input required className="w-full border-b py-2 outline-none" value={f.title} onChange={e=>setF({...f, title:e.target.value})} placeholder="名稱"/>
          <div className="flex gap-4"><input required type="number" className="w-1/2 border-b py-2 outline-none" value={f.price} onChange={e=>setF({...f, price:e.target.value})} placeholder="價格"/><input required type="number" className="w-1/2 border-b py-2 outline-none" value={f.duration} onChange={e=>setF({...f, duration:e.target.value})} placeholder="分鐘"/></div>
          <select value={f.category} onChange={e=>setF({...f, category:e.target.value})} className="w-full border-b py-2 bg-white">{settings.styleCategories.map(c=><option key={c} value={c}>{c}</option>)}</select>
          <div><input className="w-full border-b py-2 outline-none text-xs" value={f.tags} onChange={e=>setF({...f, tags:e.target.value})} placeholder="標籤 (逗號分隔)"/><div className="flex flex-wrap gap-1 mt-1">{settings.savedTags.map(t=><Btn key={t} onClick={()=>{if(!f.tags.includes(t)) setF({...f, tags: f.tags?`${f.tags}, ${t}`:t})}} className="text-[9px] bg-gray-100 px-2 py-1 rounded-full">#{t}</Btn>)}</div></div>
          <div className="flex flex-wrap gap-2">{f.images.map((img,i)=><div key={i} className="relative w-20 h-20 border"><img src={img} className="w-full h-full object-cover"/><Btn onClick={()=>setF({...f, images:f.images.filter((_,x)=>x!==i)})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"><X size={12}/></Btn></div>)}<label className="w-20 h-20 border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-[#C29591]"><Upload size={16}/><input type="file" hidden multiple accept="image/*" onChange={handleFile}/></label></div>
          <Btn type="submit" disabled={isUploading} className="w-full bg-[#463E3E] text-white py-4 text-xs tracking-widest uppercase disabled:opacity-50">{isUploading?'處理中...':'確認'}</Btn>
        </form>
      </div>
    </div>
  );
};

// --- Main App ---
export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('catalog');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [data, setData] = useState({ items: [], addons: [], bookings: [] });
  const [settings, setSettings] = useState({ stores: [], staff: [], holidays: [], styleCategories: CONSTS.CATS, savedTags: [] });
  const [modals, setModals] = useState({ admin: false, upload: false, manager: false });
  const [editItem, setEditItem] = useState(null);
  const [filters, setFilters] = useState({ style: '全部', price: '全部', tag: '' });
  const [bookingState, setBookingState] = useState({ step: 'none', item: null, addon: null, data: { name: '', phone: '', email: '', date: '', time: '', storeId: '', paymentMethod: '門市付款' }, loading: false });
  const [search, setSearch] = useState({ kw: '', res: [] });
  const [loading, setLoading] = useState(false);

  // --- FIX START: 解決無限迴圈與白屏問題的核心修改 ---
  
  // 1. 處理使用者登入 (僅在元件掛載時執行一次)
  useEffect(() => {
    signInAnonymously(auth);
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe(); // 清理監聽
  }, []); // 依賴為空陣列，確保只跑一次

  // 2. 處理資料監聽 (當 user 狀態確立後執行，並負責清理舊的監聽)
  useEffect(() => {
    if (!user) return;

    const unsubs = []; // 儲存所有 onSnapshot 的取消函式

    const sub = (path, fn) => {
      // 根據路徑判斷是 doc 還是 collection
      const ref = path.includes('/') && path.split('/').length % 2 === 0 
        ? doc(db, ...path.split('/')) 
        : collection(db, ...path.split('/'));
      
      const unsub = onSnapshot(ref, fn);
      unsubs.push(unsub);
    };

    // 建立監聽
    sub('artifacts/uniwawa01/public/settings', s => s.exists() && setSettings(p => ({ ...p, ...s.data() })));
    sub('artifacts/uniwawa01/public/data/nail_designs', s => setData(p => ({ ...p, items: s.docs.map(d => ({ id: d.id, ...d.data() })) })));
    sub('artifacts/uniwawa01/public/data/addons', s => setData(p => ({ ...p, addons: s.docs.map(d => ({ id: d.id, ...d.data() })) })));
    
    // 預約資料需排序，使用 query
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), orderBy('createdAt', 'desc'));
    unsubs.push(onSnapshot(q, s => setData(p => ({ ...p, bookings: s.docs.map(d => ({ id: d.id, ...d.data() })) }))));

    // 清理函式：當 user 改變或元件卸載時，取消所有監聽，釋放記憶體
    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [user]);

  // --- FIX END ---

  const toggleModal = (k, v = true) => setModals(p => ({ ...p, [k]: v }));
  const openUpload = (i = null) => { setEditItem(i); toggleModal('upload'); };

  const isSlotFull = (date, timeStr) => {
    if (!bookingState.data.storeId) return false;
    const startA = timeToMin(timeStr), dur = (Number(bookingState.item?.duration)||90) + (Number(bookingState.addon?.duration)||0), clean = settings.stores.find(s=>s.id===bookingState.data.storeId)?.cleaningTime || 20;
    const staff = settings.staff.filter(s => String(s.storeId) === String(bookingState.data.storeId));
    const availStaff = staff.length - staff.filter(s => (s.leaveDates || []).includes(date)).length;
    if (availStaff <= 0 || new Date(`${date} ${timeStr}`) < new Date(Date.now() + 5400000)) return true;
    const concurrent = data.bookings.filter(b => b.date === date && String(b.storeId) === String(bookingState.data.storeId) && (timeToMin(b.time) < startA + dur + clean) && (timeToMin(b.time) + (b.totalDuration||90) + clean > startA));
    return concurrent.length >= availStaff;
  };

  const handleBook = async () => {
    setBookingState(p => ({ ...p, loading: true }));
    const { item, addon, data: bd } = bookingState;
    const total = (Number(item?.price)||0) + (Number(addon?.price)||0);
    const dur = (Number(item?.duration)||90) + (Number(addon?.duration)||0);
    const storeName = settings.stores.find(s => s.id === bd.storeId)?.name || '未指定';
     
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), { ...bd, storeName, itemTitle: item.title, addonName: addon?.name||'無', totalAmount: total, totalDuration: dur, createdAt: serverTimestamp() });
      await emailjs.send('service_uniwawa', 'template_d5tq1z9', { to_email: bd.email, to_name: bd.name, phone: bd.phone, store_name: storeName, booking_date: bd.date, booking_time: bd.time, item_title: item.title, addon_name: addon?.name||'無', total_amount: total, total_duration: dur, notice_content: NOTICE_TEXT }, 'ehbGdRtZaXWft7qLM');
      setBookingState(p => ({ ...p, step: 'success', loading: false }));
    } catch (e) { alert('預約記錄成功，但信件發送失敗'); setBookingState(p => ({ ...p, step: 'success', loading: false })); }
  };

  const handleUpload = async (f, rawFiles) => {
    setLoading(true);
    try {
      let urls = f.images.filter(u => !u.startsWith('blob:'));
      if (rawFiles.length) {
        const newUrls = await Promise.all(rawFiles.map(async file => getDownloadURL((await uploadBytes(ref(storage, `nail_designs/${Date.now()}_${file.name}`), file)).ref)));
        urls = [...urls, ...newUrls];
      }
      const payload = { ...f, price: Number(f.price), duration: Number(f.duration), images: urls, tags: f.tags.split(',').map(t=>t.trim()).filter(Boolean), updatedAt: serverTimestamp() };
      if (editItem) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', editItem.id), payload);
      else await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), { ...payload, createdAt: serverTimestamp() });
      toggleModal('upload', false); alert('成功');
    } catch (e) { alert(e.message); } finally { setLoading(false); }
  };

  const filteredItems = data.items.filter(i => (filters.style === '全部' || i.category === filters.style) && (filters.tag === '' || i.tags?.includes(filters.tag)) && (filters.price === '全部' ? true : filters.price === '1300以下' ? i.price < 1300 : filters.price === '1900以上' ? i.price > 1900 : (i.price >= 1300 && i.price <= 1900)));

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555] font-sans pb-12">
      <style>{`::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:#C29591;border-radius:3px}`}</style>
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-[500] border-b border-[#EAE7E2]">
        <div className="max-w-7xl mx-auto px-6 py-4 md:h-20 flex flex-col md:flex-row items-center justify-between">
          <h1 className="text-3xl tracking-[0.4em] font-extralight cursor-pointer text-[#463E3E] mb-4 md:mb-0" onClick={()=>{setTab('catalog'); setBookingState(p=>({...p, step:'none'}));}}>UNIWAWA</h1>
          <div className="flex gap-6 text-sm tracking-widest font-medium uppercase items-center overflow-x-auto">
            {[{k:'about',n:'關於'},{k:'catalog',n:'款式'},{k:'notice',n:'須知'},{k:'store',n:'門市'},{k:'search',n:'查詢'},{k:'contact',n:'聯絡'}].map(t=><Btn key={t.k} onClick={()=>{setTab(t.k); setBookingState(p=>({...p, step:'none'}));}} className={tab===t.k?'text-[#C29591]':''}>{t.n}</Btn>)}
            {isLoggedIn ? <><div className="w-[1px] h-4 bg-gray-300 mx-2"/><Btn onClick={()=>openUpload()}><Plus size={18} className="text-[#C29591]"/></Btn><Btn onClick={()=>toggleModal('manager')}><Settings size={18} className="text-[#C29591]"/></Btn></> : <Btn onClick={()=>toggleModal('admin')}><Lock size={14} className="text-gray-300 hover:text-[#C29591]"/></Btn>}
          </div>
        </div>
      </nav>

      <main className="pt-32 md:pt-28">
        {bookingState.step === 'form' ? (
          <BookingForm item={bookingState.item} addon={bookingState.addon} stores={settings.stores} settings={settings} bookingData={bookingState.data} setBookingData={d=>setBookingState(p=>({...p, data:d}))} onSubmit={handleBook} isSubmitting={bookingState.loading} isSlotFull={isSlotFull} isDayFull={d=>TIME_SLOTS.every(t=>isSlotFull(d,t))} allBookings={data.bookings}/>
        ) : bookingState.step === 'success' ? (
          <SuccessView item={bookingState.item} addon={bookingState.addon} booking={bookingState.data} stores={settings.stores} goHome={()=>{setBookingState(p=>({...p, step:'none'})); setTab('catalog');}}/>
        ) : tab === 'notice' ? (
          <div className="max-w-3xl mx-auto px-6"><SectionTitle title="預約須知" /><div className="bg-white border p-8 md:p-12 shadow-sm border-t-4 border-t-[#C29591] space-y-6">{CONSTS.NOTICE.map((n,i)=><div key={i} className="flex gap-6 border-b border-dashed pb-5"><span className="text-3xl font-serif italic text-[#C29591]/80">{String(i+1).padStart(2,'0')}</span><div><h3 className="font-bold tracking-widest mb-2 text-[#463E3E]">{n.t}</h3><p className="text-xs text-gray-500 leading-relaxed">{n.c}</p></div></div>)}<div className="mt-8 pt-6 text-center text-[10px] text-gray-400 tracking-widest flex justify-center gap-2"><AlertOctagon size={14}/> 預約即代表同意條款</div></div></div>
        ) : tab === 'store' ? (
          <div className="max-w-4xl mx-auto px-6"><SectionTitle title="門市資訊" /><div className="grid md:grid-cols-2 gap-8"><div className="bg-white border hover:border-[#C29591] transition-colors"><div className="aspect-video relative"><img src={CONSTS.IMG_STORE} className="w-full h-full object-cover"/></div><div className="p-8"><h3 className="text-lg tracking-widest mb-2 font-bold text-[#463E3E]">桃園文中店</h3><div className="w-8 h-[1px] bg-[#C29591] mb-6"/><div className="flex gap-3 text-xs text-gray-500 mb-6"><MapPin size={16} className="text-[#C29591]"/> 桃園區文中三路 67 號 1 樓</div><Btn onClick={()=>window.open('https://www.google.com/maps/search/?api=1&query=桃園區文中三路67號1樓','_blank')} className="w-full border py-3 text-xs tracking-widest hover:bg-[#463E3E] hover:text-white">GOOGLE MAPS</Btn></div></div></div></div>
        ) : tab === 'about' ? (
          <div className="max-w-3xl mx-auto px-6"><SectionTitle title="關於 UNIWAWA" /><div className="bg-white border p-8 md:p-12 border-t-4 border-t-[#C29591] flex flex-col md:flex-row gap-8"><img src={CONSTS.IMG_WAWA} className="w-full md:w-5/12 aspect-[4/5] object-cover border"/><div className="flex-1 space-y-6 text-xs text-gray-500 leading-8 text-justify"><p>創業八年的 <span className="font-bold text-[#463E3E]">UNIWAWA 藝術蛋糕師 Wawa</span>，將對美的追求延伸至指尖...</p><Btn onClick={()=>setTab('catalog')} className="bg-[#463E3E] text-white px-8 py-3 rounded-full mt-4">查看款式</Btn></div></div></div>
        ) : tab === 'contact' ? (
          <div className="max-w-3xl mx-auto px-6"><SectionTitle title="聯絡我們" /><div className="bg-white p-10 border text-center shadow-sm"><p className="text-xs text-gray-500 mb-6">如有疑問歡迎加入 LINE 官方帳號諮詢</p><a href="https://lin.ee/X91bkZ6" target="_blank" className="inline-flex items-center gap-2 bg-[#06C755] text-white px-8 py-3 rounded-full font-bold tracking-widest text-sm"><MessageCircle size={20}/> 加入 LINE 好友</a></div></div>
        ) : tab === 'search' ? (
          <div className="max-w-3xl mx-auto px-6"><SectionTitle title="預約查詢" /><form onSubmit={e=>{e.preventDefault(); const res=data.bookings.filter(b=>b.name===search.kw||b.phone===search.kw).sort((a,b)=>new Date(b.date)-new Date(a.date)); setSearch(p=>({...p, res})); if(!res.length) alert('查無資料');}} className="mb-12"><input className="w-full border-b py-3 px-2 outline-none bg-transparent" placeholder="輸入姓名或電話" value={search.kw} onChange={e=>setSearch({...search, kw:e.target.value})}/><Btn type="submit" className="bg-[#463E3E] text-white w-full py-3 mt-4 text-xs tracking-widest flex justify-center gap-2"><Search size={14}/> 查詢</Btn></form><div className="space-y-6">{search.res.map(b=><div key={b.id} className="bg-white border shadow-lg relative"><div className="h-1 bg-[#C29591]"/><div className="p-6 flex justify-between items-center"><div><div className="font-bold text-xl mb-1 text-[#463E3E]">{b.date} {b.time}</div><div className="text-xs text-[#C29591] font-bold">{b.storeName}</div><div className="text-xs text-gray-500 mt-2">{b.itemTitle} + {b.addonName}</div></div><div className="text-right text-xl font-bold text-[#C29591]">NT${b.totalAmount}</div></div></div>)}</div></div>
        ) : (
          <div className="max-w-7xl mx-auto px-6 space-y-8">
            <div className="flex flex-col gap-4 border-b pb-8 mb-8">
              {[ ['STYLE', filters.style, ['全部', ...settings.styleCategories], 'style'], ['PRICE', filters.price, CONSTS.PRICES, 'price'] ].map(([l, v, opts, k]) => <div key={k} className="flex flex-col md:flex-row gap-4 items-start"><span className="text-[10px] text-gray-400 font-bold tracking-widest w-16 pt-2">{l}</span><div className="flex flex-wrap gap-2 flex-1">{opts.map(o=><Btn key={o} onClick={()=>setFilters(p=>({...p, [k]:o}))} className={`px-4 py-1.5 text-xs rounded-full border ${v===o?'bg-[#463E3E] text-white border-[#463E3E]':'bg-white text-gray-500 hover:border-[#C29591]'}`}>{o}</Btn>)}</div></div>)}
              {filters.tag && <div className="mt-2"><Btn onClick={()=>setFilters(p=>({...p, tag:''}))} className="flex items-center gap-2 bg-[#C29591] text-white px-4 py-1.5 rounded-full text-xs">#{filters.tag} <X size={14}/></Btn></div>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-16 pb-24">
              {filteredItems.map(item => <StyleCard key={item.id} item={item} isLoggedIn={isLoggedIn} onEdit={openUpload} onDelete={id=>deleteDoc(doc(db,'artifacts',appId,'public','data','nail_designs',id))} onBook={(i,a)=>{setBookingState({step:'form', item:i, addon:a, data:{...bookingState.data, storeId:'', date:'', time:''}, loading:false}); window.scrollTo(0,0);}} addons={data.addons} onTagClick={t=>setFilters(p=>({...p, tag:t}))}/>)}
            </div>
          </div>
        )}
      </main>

      <AdminModal isOpen={modals.admin} close={()=>toggleModal('admin', false)} onLogin={()=>setIsLoggedIn(true)}/>
      <ManagerModal isOpen={modals.manager} close={()=>toggleModal('manager', false)} settings={settings} setSettings={setSettings} bookings={data.bookings} items={data.items} onDeleteBooking={id=>deleteDoc(doc(db,'artifacts',appId,'public','data','bookings',id))}/>
      <UploadModal isOpen={modals.upload} close={()=>toggleModal('upload', false)} item={editItem} settings={settings} onSubmit={handleUpload} isUploading={loading}/>
    </div>
  );
}