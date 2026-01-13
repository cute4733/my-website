import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, X, Lock, Trash2, Edit3, Settings, Clock, CheckCircle, Upload, ChevronLeft, ChevronRight, Users, UserMinus, Search, Calendar, List as ListIcon, Grid, Download, Store, Filter, MapPin, CreditCard, Hash, Layers, MessageCircle, AlertOctagon } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, query, orderBy, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import emailjs from '@emailjs/browser';

// --- Configuration & Constants ---
const firebaseConfig = { apiKey: "AIzaSyBkFqTUwtC7MqZ6h4--2_1BmldXEg-Haiw", authDomain: "uniwawa-beauty.com", projectId: "uniwawa-beauty", storageBucket: "uniwawa-beauty.firebasestorage.app", appId: "1:1009617609234:web:3cb5466e79a81c1f1aaecb" };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const appId = 'uniwawa01';

const CONST = {
  DEFAULT_CATS: ['極簡氣質', '華麗鑽飾', '藝術手繪', '日系暈染', '貓眼系列'],
  PRICES: ['全部', '1300以下', '1300-1900', '1900以上'],
  WEEKDAYS: ['日', '一', '二', '三', '四', '五', '六'],
  IMG_WAWA: "https://drive.google.com/thumbnail?id=19CcU5NwecoqA0Xe4rjmHc_4OM_LGFq78&sz=w1000",
  IMG_STORE: "https://drive.google.com/thumbnail?id=1LKfqD6CfqPsovCs7fO_r6SQY6YcNtiNX&sz=w1000",
  NOTICE: [
    { title: "網站預約制", content: "本店採全預約制，請依系統開放的時段與服務項目進行預約，恕不接受臨時客。" },
    { title: "款式說明", content: "服務款式以網站上提供內容為主，暫不提供帶圖或客製設計服務。" },
    { title: "病甲服務說明", content: "為了衛生與施作安全考量，恕不提供病甲（如黴菌感染、卷甲、崁甲、灰指甲等）相關服務。" },
    { title: "遲到規範", content: "若遲到超過 10 分鐘，將視當日狀況調整服務內容；若影響後續預約可能無法施作。" },
    { title: "取消與改期", content: "如需取消或改期，請於預約 24 小時前告知。未提前取消或無故未到者，將無法再接受後續預約。" },
    { title: "保固服務", content: "施作後 7 日內若非人為因素脫落，可協助免費補修，請聯絡官方 LINE 預約補修時間。" },
  ]
};
const NOTICE_TEXT = CONST.NOTICE.map((i, idx) => `${idx + 1}. ${i.title}: ${i.content}`).join('\n');

// --- Helpers ---
const generateTimeSlots = () => {
  const slots = [];
  for (let h = 12; h <= 18; h++) for (let m = 0; m < 60; m += 10) { if (h === 18 && m > 30) break; slots.push(`${h}:${m === 0 ? '00' : m}`); }
  return slots;
};
const TIME_SLOTS = generateTimeSlots();
const timeToMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const getTodayStr = () => new Date().toISOString().split('T')[0];

// --- Sub-Components ---
const StyleCard = ({ item, isLoggedIn, onEdit, onDelete, onBook, addons, onTagClick }) => {
  const [idx, setIdx] = useState(0);
  const [aid, setAid] = useState('');
  const imgs = item.images?.length ? item.images : ['https://via.placeholder.com/400x533'];
  const touch = useRef({ s: 0, e: 0 });

  const move = (dir) => setIdx((p) => (p + dir + imgs.length) % imgs.length);
  const swipe = () => { if (touch.current.s - touch.current.e > 50) move(1); if (touch.current.s - touch.current.e < -50) move(-1); };

  return (
    <div className="group flex flex-col bg-white border border-[#F0EDEA] shadow-sm relative">
      {isLoggedIn && (
        <div className="absolute top-4 right-4 flex gap-2 z-[30]">
          <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-2 bg-white/90 rounded-full text-blue-600 shadow hover:scale-110"><Edit3 size={16}/></button>
          <button onClick={(e) => { e.stopPropagation(); if(confirm('確定刪除？')) onDelete(item.id); }} className="p-2 bg-white/90 rounded-full text-red-600 shadow hover:scale-110"><Trash2 size={16}/></button>
        </div>
      )}
      <div className="aspect-[3/4] overflow-hidden relative bg-gray-50" onTouchStart={e=>touch.current.s=e.touches[0].clientX} onTouchMove={e=>touch.current.e=e.touches[0].clientX} onTouchEnd={swipe}>
        <div className="flex w-full h-full transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${idx * 100}%)` }}>
          {imgs.map((src, i) => <img key={i} src={src} className="w-full h-full flex-shrink-0 object-cover" loading={i===0?"eager":"lazy"} />)}
        </div>
        {imgs.length > 1 && <>
          <button onClick={(e)=>{e.stopPropagation();move(-1)}} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 text-white rounded-full z-10 hover:bg-black/50"><ChevronLeft size={20}/></button>
          <button onClick={(e)=>{e.stopPropagation();move(1)}} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 text-white rounded-full z-10 hover:bg-black/50"><ChevronRight size={20}/></button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">{imgs.map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full ${i===idx?'bg-white':'bg-white/40'}`} />)}</div>
        </>}
      </div>
      <div className="p-6 flex flex-col items-center text-center">
        <span className="text-xs text-[#C29591] tracking-[0.3em] uppercase mb-2 font-medium">{item.category}</span>
        <h3 className="text-[#463E3E] font-medium text-lg tracking-widest mb-1">{item.title}</h3>
        <div className="flex flex-wrap justify-center gap-2 mb-3 mt-1">{item.tags?.map((t,i)=><button key={i} onClick={()=>onTagClick(t)} className="text-[10px] text-gray-400 hover:text-[#C29591]">#{t}</button>)}</div>
        <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-4 uppercase tracking-widest font-light"><Clock size={14} /> {item.duration || '90'} 分鐘</div>
        <p className="text-[#463E3E] font-bold text-xl mb-6"><span className="text-xs font-light tracking-widest mr-1">NT$</span>{item.price.toLocaleString()}</p>
        <select className={`w-full text-sm border py-3 px-4 bg-[#FAF9F6] mb-6 outline-none text-[#463E3E] ${!aid?'border-red-200':'border-[#EAE7E2]'}`} onChange={e=>setAid(e.target.value)} value={aid}>
          <option value="">請選擇指甲現況 (必選)</option>
          {addons.map(a => <option key={a.id} value={a.id}>{a.name} (+${a.price} / +{a.duration}分)</option>)}
        </select>
        <button disabled={!aid} onClick={() => onBook(item, addons.find(a=>a.id===aid))} className="bg-[#463E3E] text-white px-8 py-3.5 rounded-full text-xs tracking-[0.2em] font-medium w-full hover:bg-[#C29591] disabled:opacity-50 disabled:bg-gray-300 transition-colors">
          {!aid ? '請先選擇現況' : '點此預約'}
        </button>
      </div>
    </div>
  );
};

const CustomCalendar = ({ selectedDate, onDateSelect, settings, storeId, isDayFull }) => {
  const [viewDate, setViewDate] = useState(selectedDate ? new Date(selectedDate) : new Date());
  const year = viewDate.getFullYear(), month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay(), daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date(); today.setHours(0,0,0,0);
  const maxDate = new Date(today); maxDate.setDate(today.getDate() + 30);

  const days = Array.from({ length: firstDay + daysInMonth }, (_, i) => {
    if (i < firstDay) return <div key={`e-${i}`} className="w-full aspect-square"/>;
    const d = i - firstDay + 1, dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const target = new Date(year, month, d);
    const isHoliday = (settings?.holidays||[]).some(h => h.date===dateStr && (h.storeId==='all'||String(h.storeId)===String(storeId)));
    const staff = (settings?.staff||[]).filter(s => String(s.storeId)===String(storeId));
    const allLeave = staff.length > 0 && staff.every(s => (s.leaveDates||[]).includes(dateStr));
    const disabled = isHoliday || allLeave || target < today || target > maxDate || !storeId || (isDayFull && isDayFull(dateStr));
    return (
      <button key={d} disabled={disabled} onClick={() => onDateSelect(dateStr)}
        className={`w-full aspect-square text-sm rounded-full flex items-center justify-center transition-all ${disabled ? 'text-gray-300 line-through cursor-not-allowed' : selectedDate===dateStr ? 'bg-[#463E3E] text-white' : 'hover:bg-[#C29591] hover:text-white'}`}>
        {d}
      </button>
    );
  });

  return (
    <div className="w-full max-w-md bg-white border border-[#EAE7E2] p-6 shadow-sm mx-auto">
      <div className="flex justify-between items-center mb-6 px-2">
        <h4 className="text-sm font-bold tracking-widest text-[#463E3E]">{year}年 {month + 1}月</h4>
        <div className="flex gap-2">
          <button onClick={()=>setViewDate(new Date(year, month-1, 1))}><ChevronLeft size={18}/></button>
          <button onClick={()=>setViewDate(new Date(year, month+1, 1))}><ChevronRight size={18}/></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 mb-2">{CONST.WEEKDAYS.map(w=><div key={w} className="w-full text-center text-xs text-gray-400 font-bold">{w}</div>)}</div>
      <div className="grid grid-cols-7 gap-2">{days}</div>
    </div>
  );
};

const UploadModal = ({ item, settings, onClose, onSave }) => {
  const [form, setForm] = useState(item || { title: '', price: '', category: settings.styleCategories[0], duration: '90', images: [], tags: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const { rawFiles, ...data } = form;
      let urls = data.images.filter(u => !u.startsWith('blob:'));
      if (rawFiles?.length) {
        urls = [...urls, ...await Promise.all(rawFiles.map(async f => getDownloadURL((await uploadBytes(ref(storage, `nail_designs/${Date.now()}_${f.name}`), f)).ref)))];
      }
      await onSave({ ...data, price: Number(data.price), duration: Number(data.duration), images: urls, tags: data.tags ? data.tags.split(',').map(t=>t.trim()).filter(Boolean) : [] });
      onClose();
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.size <= 1024*1024 || alert(`${f.name}太大`)&&false);
    if ((form.rawFiles?.reduce((a,f)=>a+f.size,0)||0) + files.reduce((a,f)=>a+f.size,0) > 5*1024*1024) return alert("總大小超過5MB");
    setForm(p => ({ ...p, rawFiles: [...(p.rawFiles||[]), ...files], images: [...p.images, ...files.map(f => URL.createObjectURL(f))] }));
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[1000] flex items-center justify-center p-4">
      <div className="bg-white p-8 max-w-md w-full max-h-[90vh] overflow-y-auto rounded-lg">
        <div className="flex justify-between items-center mb-6"><h3 className="tracking-widest">{item ? '修改' : '上傳'}</h3><button onClick={onClose}><X size={20}/></button></div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input required className="w-full border-b py-2 outline-none" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} placeholder="款式名稱" />
          <div className="flex gap-4">
            <input type="number" required className="w-1/2 border-b py-2 outline-none" value={form.price} onChange={e=>setForm({...form, price:e.target.value})} placeholder="價格" />
            <input type="number" required className="w-1/2 border-b py-2 outline-none" value={form.duration} onChange={e=>setForm({...form, duration:e.target.value})} placeholder="時間(分)" />
          </div>
          <select value={form.category} onChange={e=>setForm({...form, category:e.target.value})} className="w-full border-b py-2 outline-none bg-white">{settings.styleCategories.map(c=><option key={c} value={c}>{c}</option>)}</select>
          <div>
            <input className="w-full border-b py-2 outline-none text-xs" value={form.tags} onChange={e=>setForm({...form, tags:e.target.value})} placeholder="標籤 (逗號分隔)" />
            <div className="flex flex-wrap gap-1 mt-1">{settings.savedTags.map(t=><button type="button" key={t} onClick={()=>!form.tags.includes(t)&&setForm({...form, tags: form.tags?`${form.tags}, ${t}`:t})} className="text-[9px] bg-gray-100 px-2 py-1 rounded-full hover:bg-[#C29591] hover:text-white">#{t}</button>)}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.images.map((img, i) => <div key={i} className="relative w-20 h-20 border"><img src={img} className="w-full h-full object-cover"/><button type="button" onClick={()=>setForm(p=>({...p, images: p.images.filter((_,x)=>x!==i)}))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"><X size={12}/></button></div>)}
            <label className="w-20 h-20 border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-[#C29591] text-gray-400"><Upload size={16}/><input type="file" hidden accept="image/*" multiple onChange={handleFiles} /></label>
          </div>
          <button disabled={loading} className="w-full bg-[#463E3E] text-white py-4 text-xs tracking-widest uppercase hover:bg-[#C29591] disabled:opacity-50">{loading?'處理中...':'確認'}</button>
        </form>
      </div>
    </div>
  );
};

const AdminSystemModal = ({ isOpen, onClose, settings, setSettings, bookings, onDeleteBooking }) => {
  const [tab, setTab] = useState('stores');
  const [inputs, setInputs] = useState({ store: '', cat: '', tag: '', addon: { name: '', price: '', duration: '' }, holiday: { date: '', storeId: 'all' }, search: { store: 'all', date: getTodayStr() } });
  
  if (!isOpen) return null;
  const save = (newSettings) => setDoc(doc(db, 'artifacts', appId, 'public', 'settings'), newSettings).catch(e=>alert(e.message));
  const updateSettings = (key, val) => { const ns = { ...settings, [key]: val }; setSettings(ns); save(ns); };

  const filteredBookings = bookings.filter(b => (inputs.search.store==='all'||String(b.storeId)===String(inputs.search.store)) && b.date===inputs.search.date).sort((a,b)=>timeToMin(a.time)-timeToMin(b.time));

  return (
    <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-0 md:p-4 backdrop-blur-sm">
      <div className="bg-white w-full h-full md:max-w-[98vw] md:h-[95vh] shadow-2xl flex flex-col md:rounded-lg overflow-hidden">
        <div className="px-8 py-6 border-b flex justify-between items-center"><h3 className="text-xs tracking-[0.3em] font-bold uppercase text-[#463E3E]">系統管理</h3><button onClick={onClose}><X size={24}/></button></div>
        <div className="flex border-b px-8 bg-[#FAF9F6] overflow-x-auto hide-scrollbar">
          {[ ['stores','門市設定',Store], ['attr','商品屬性',Layers], ['staff','人員與休假',Users], ['book','預約管理',Calendar] ].map(([id,l,Ic])=><button key={id} onClick={()=>setTab(id)} className={`flex items-center gap-2 px-6 py-4 text-xs tracking-widest whitespace-nowrap ${tab===id?'bg-white border-x border-t border-[#EAE7E2] text-[#C29591] font-bold -mb-px':'text-gray-400'}`}><Ic size={14}/> {l}</button>)}
        </div>
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {tab === 'stores' && <div className="space-y-4">
            <div className="flex gap-2"><input className="flex-1 border p-2 text-xs" placeholder="新門市名稱" value={inputs.store} onChange={e=>setInputs({...inputs, store:e.target.value})}/><button onClick={()=>{if(!inputs.store)return;updateSettings('stores',[...settings.stores,{id:Date.now().toString(),name:inputs.store,cleaningTime:20}]);setInputs({...inputs,store:''})}} className="bg-[#463E3E] text-white px-4 text-xs">新增</button></div>
            <div className="grid md:grid-cols-3 gap-4">{settings.stores.map(s=><div key={s.id} className="border p-4 bg-white shadow-sm flex justify-between items-center"><span className="font-bold text-sm text-[#463E3E]">{s.name}</span><button onClick={()=>confirm('刪除?')&&updateSettings('stores',settings.stores.filter(x=>x.id!==s.id))}><Trash2 size={14} className="text-gray-300 hover:text-red-500"/></button></div>)}</div>
          </div>}
          {tab === 'attr' && <div className="grid lg:grid-cols-3 gap-8">
            <div className="space-y-4">
              <h4 className="font-bold text-sm">風格分類</h4>
              <div className="flex gap-2"><input className="flex-1 border p-2 text-xs" placeholder="新分類" value={inputs.cat} onChange={e=>setInputs({...inputs, cat:e.target.value})}/><button onClick={()=>{if(!inputs.cat)return;updateSettings('styleCategories',[...settings.styleCategories,inputs.cat]);setInputs({...inputs,cat:''})}} className="bg-[#463E3E] text-white px-3 text-xs">新增</button></div>
              <div className="flex flex-wrap gap-2">{settings.styleCategories.map(c=><span key={c} className="bg-gray-100 px-2 py-1 text-xs flex gap-1 items-center">{c}<X size={10} className="cursor-pointer" onClick={()=>confirm('刪除?')&&updateSettings('styleCategories',settings.styleCategories.filter(x=>x!==c))}/></span>)}</div>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold text-sm">常用標籤</h4>
              <div className="flex gap-2"><input className="flex-1 border p-2 text-xs" placeholder="新標籤" value={inputs.tag} onChange={e=>setInputs({...inputs, tag:e.target.value})}/><button onClick={()=>{if(!inputs.tag)return;updateSettings('savedTags',[...settings.savedTags,inputs.tag]);setInputs({...inputs,tag:''})}} className="bg-[#463E3E] text-white px-3 text-xs">新增</button></div>
              <div className="flex flex-wrap gap-2">{settings.savedTags.map(t=><span key={t} className="bg-gray-100 px-2 py-1 text-xs flex gap-1 items-center">#{t}<X size={10} className="cursor-pointer" onClick={()=>updateSettings('savedTags',settings.savedTags.filter(x=>x!==t))}/></span>)}</div>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold text-sm">加購項目</h4>
              <div className="flex flex-col gap-2 p-3 bg-gray-50 border">
                 <input className="border p-2 text-xs" placeholder="名稱" value={inputs.addon.name} onChange={e=>setInputs(p=>({...p,addon:{...p.addon,name:e.target.value}}))}/>
                 <div className="flex gap-2"><input type="number" className="w-1/2 border p-2 text-xs" placeholder="金額" value={inputs.addon.price} onChange={e=>setInputs(p=>({...p,addon:{...p.addon,price:e.target.value}}))}/><input type="number" className="w-1/2 border p-2 text-xs" placeholder="時間(分)" value={inputs.addon.duration} onChange={e=>setInputs(p=>({...p,addon:{...p.addon,duration:e.target.value}}))}/></div>
                 <button onClick={()=>{if(!inputs.addon.name)return;addDoc(collection(db,'artifacts',appId,'public','data','addons'),{...inputs.addon,price:Number(inputs.addon.price),duration:Number(inputs.addon.duration)});setInputs(p=>({...p,addon:{name:'',price:'',duration:''}}))}} className="bg-[#463E3E] text-white py-2 text-xs">新增</button>
              </div>
            </div>
          </div>}
          {tab === 'staff' && <div className="grid lg:grid-cols-2 gap-8">
             <div className="space-y-4">
               <div className="flex justify-between items-center"><h4 className="font-bold text-sm">人員名單</h4><button onClick={()=>{const n=prompt('姓名');if(n)updateSettings('staff',[...(settings.staff||[]),{id:Date.now().toString(),name:n,storeId:settings.stores[0]?.id,leaveDates:[]}])}} className="text-xs bg-[#C29591] text-white px-3 py-1 rounded-full">+ 新增</button></div>
               {settings.staff?.map(s=><div key={s.id} className="border p-3 text-xs bg-gray-50 space-y-2">
                 <div className="flex justify-between font-bold text-[#463E3E] items-center"><span>{s.name}</span><button onClick={()=>confirm('刪除?')&&updateSettings('staff',settings.staff.filter(x=>x.id!==s.id))}><Trash2 size={12}/></button></div>
                 <select value={s.storeId} onChange={e=>updateSettings('staff',settings.staff.map(x=>x.id===s.id?{...x,storeId:e.target.value}:x))} className="w-full border p-1">{settings.stores.map(st=><option key={st.id} value={st.id}>{st.name}</option>)}</select>
                 <div className="border-t pt-2"><label className="block mb-1 text-gray-400">新增休假</label><input type="date" className="border p-1 w-full" onChange={e=>e.target.value&&updateSettings('staff',settings.staff.map(x=>x.id===s.id?{...x,leaveDates:[...new Set([...(x.leaveDates||[]),e.target.value])].sort()}:x))}/>
                 <div className="flex flex-wrap gap-1 mt-1">{s.leaveDates?.map(d=><span key={d} className="bg-red-50 text-red-500 px-1 border flex items-center gap-1">{d}<X size={8} onClick={()=>updateSettings('staff',settings.staff.map(x=>x.id===s.id?{...x,leaveDates:x.leaveDates.filter(y=>y!==d)}:x))}/></span>)}</div></div>
               </div>)}
             </div>
             <div className="space-y-4">
                <h4 className="font-bold text-sm">公休日設定</h4>
                <div className="flex gap-2"><select className="text-xs border p-2" value={inputs.holiday.storeId} onChange={e=>setInputs(p=>({...p,holiday:{...p.holiday,storeId:e.target.value}}))}><option value="all">全品牌</option>{settings.stores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><input type="date" className="flex-1 border p-2 text-xs" value={inputs.holiday.date} onChange={e=>setInputs(p=>({...p,holiday:{...p.holiday,date:e.target.value}}))}/><button onClick={()=>{if(!inputs.holiday.date)return;updateSettings('holidays',[...(settings.holidays||[]),inputs.holiday])}} className="bg-[#463E3E] text-white px-3 text-xs">新增</button></div>
                <div className="flex flex-wrap gap-2">{settings.holidays?.map((h,i)=><span key={i} className="bg-gray-100 px-2 py-1 text-xs flex gap-1 items-center">{h.date} ({h.storeId==='all'?'全':settings.stores.find(s=>s.id===h.storeId)?.name})<X size={10} className="cursor-pointer" onClick={()=>updateSettings('holidays',settings.holidays.filter((_,x)=>x!==i))}/></span>)}</div>
             </div>
          </div>}
          {tab === 'book' && <div className="h-full flex flex-col space-y-4">
             <div className="flex justify-between items-center bg-gray-50 p-2 border">
                <select className="bg-transparent text-xs font-bold outline-none" value={inputs.search.store} onChange={e=>setInputs(p=>({...p,search:{...p.search,store:e.target.value}}))}><option value="all">全部分店</option>{settings.stores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
                <input type="date" className="bg-transparent text-xs border-b border-gray-300" value={inputs.search.date} onChange={e=>setInputs(p=>({...p,search:{...p.search,date:e.target.value}}))}/>
                <button onClick={()=>{ const csv = ["日期,時間,門市,姓名,電話,項目,金額"].join(',') + '\n' + bookings.filter(b=>inputs.search.store==='all'||String(b.storeId)===String(inputs.search.store)).map(b=>[b.date,b.time,b.storeName,b.name,b.phone,b.itemTitle,b.totalAmount].join(',')).join('\n'); const url = URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv'})); const a = document.createElement('a'); a.href=url; a.download='bookings.csv'; a.click(); }} className="text-gray-400 hover:text-[#C29591]"><Download size={16}/></button>
             </div>
             <div className="flex-1 overflow-y-auto space-y-2">
                {filteredBookings.length ? filteredBookings.map(b=><div key={b.id} className="border p-3 bg-white text-xs relative group"><div className="flex justify-between font-bold text-sm"><span>{b.time} <span className="text-gray-400 text-[10px] font-normal px-1 border rounded ml-1">{b.storeName}</span></span><button onClick={()=>confirm('取消?')&&onDeleteBooking(b.id)}><Trash2 size={14} className="text-gray-300 hover:text-red-500"/></button></div><div className="mt-1 font-bold">{b.name} <span className="font-normal text-gray-400">| {b.phone}</span></div><div className="mt-2 pt-2 border-t flex justify-between text-gray-500"><span>{b.itemTitle} {b.addonName!=='無'&&`+ ${b.addonName}`}</span><span className="text-[#C29591] font-bold">${b.totalAmount}</span></div></div>) : <p className="text-center text-gray-300 text-xs py-10">無預約</p>}
             </div>
          </div>}
        </div>
      </div>
    </div>
  );
};

const BookingSuccess = ({ data, item, addon, onReset }) => (
  <div className="max-w-lg mx-auto px-6 py-10">
    <div className="text-center mb-10"><div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FAF9F6] mb-4"><CheckCircle size={32} className="text-[#C29591]" /></div><h2 className="text-xl font-light tracking-[0.3em] uppercase text-[#463E3E]">Reservation Confirmed</h2><p className="text-[10px] text-gray-400 mt-2 tracking-widest">您的預約已成功送出</p></div>
    <div className="bg-white border border-[#EAE7E2] shadow-lg relative overflow-hidden">
      <div className="h-1 w-full bg-[#C29591]"></div>
      {item.images?.[0] && <div className="w-full h-48 relative"><img src={item.images[0]} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/30 flex items-end p-4"><h3 className="text-white font-bold">{item.title}</h3></div></div>}
      <div className="p-6 space-y-4 text-xs text-[#5C5555]">
        <div className="bg-[#FAF9F6] p-4 text-center border"><div className="text-lg font-bold text-[#463E3E]">{data.date} • {data.time}</div><div className="text-[#C29591] font-bold mt-1">{data.storeName}</div></div>
        {[ ['姓名',data.name], ['電話',data.phone], ['加購',addon?.name||'無'], ['時長',`${data.totalDuration}分`] ].map(([l,v])=><div key={l} className="flex justify-between border-b border-dashed pb-2"><span className="text-gray-400">{l}</span><span className="font-medium">{v}</span></div>)}
        <div className="pt-4 flex justify-between items-end"><span className="text-[10px] font-bold text-gray-400 uppercase">Total</span><span className="text-2xl font-bold text-[#C29591]">NT$ {data.totalAmount.toLocaleString()}</span></div>
      </div>
    </div>
    <button onClick={onReset} className="w-full mt-8 bg-[#463E3E] text-white py-4 text-xs tracking-widest uppercase hover:bg-[#C29591] shadow-lg">回到首頁</button>
  </div>
);

// --- Main App ---
export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('catalog');
  const [isAdmin, setIsAdmin] = useState(false);
  const [items, setItems] = useState([]);
  const [addons, setAddons] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [settings, setSettings] = useState({ stores: [], staff: [], holidays: [], styleCategories: CONST.DEFAULT_CATS, savedTags: [] });
  
  // UI States
  const [modals, setModals] = useState({ admin: false, upload: false, manager: false, login: false });
  const [editItem, setEditItem] = useState(null);
  const [filters, setFilters] = useState({ style: '全部', price: '全部', tag: '', search: '' });
  const [searchRes, setSearchRes] = useState([]);

  // Booking Flow
  const [bookStep, setBookStep] = useState('none');
  const [selects, setSelects] = useState({ item: null, addon: null });
  const [bookData, setBookData] = useState({ name: '', phone: '', email: '', date: '', time: '', storeId: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { signInAnonymously(auth); onAuthStateChanged(auth, setUser); }, []);
  useEffect(() => {
    if (!user) return;
    const unsub = [
      onSnapshot(doc(db, 'artifacts', appId, 'public', 'settings'), s => s.exists() && setSettings(s.data())),
      onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), s => setItems(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'addons'), s => setAddons(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), orderBy('createdAt', 'desc')), s => setBookings(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    ];
    return () => unsub.forEach(u => u());
  }, [user]);

  // Logic
  const validBook = bookData.name && !/\d/.test(bookData.name) && bookData.phone.length===10 && bookData.email.includes('@') && bookData.time && bookData.storeId;
  const totalTime = (Number(selects.item?.duration)||90) + (Number(selects.addon?.duration)||0);
  const totalCost = (Number(selects.item?.price)||0) + (Number(selects.addon?.price)||0);
  
  const isFull = (d, t) => {
    if (!d || !t || !bookData.storeId) return false;
    const staff = settings.staff.filter(s => String(s.storeId) === String(bookData.storeId) && !s.leaveDates?.includes(d));
    if (staff.length === 0) return true;
    const start = timeToMin(t), end = start + totalTime + (settings.stores.find(s=>s.id===bookData.storeId)?.cleaningTime||20);
    const concurrent = bookings.filter(b => b.date===d && String(b.storeId)===String(bookData.storeId) && !(timeToMin(b.time) >= end || (timeToMin(b.time) + b.totalDuration + 20) <= start));
    return concurrent.length >= staff.length;
  };

  const submitBooking = async () => {
    setSubmitting(true);
    const storeName = settings.stores.find(s => s.id === bookData.storeId)?.name || '';
    const payload = { ...bookData, storeName, itemTitle: selects.item.title, addonName: selects.addon?.name || '無', totalAmount: totalCost, totalDuration: totalTime, paymentMethod: '門市付款', createdAt: serverTimestamp() };
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), payload);
      await emailjs.send('service_uniwawa', 'template_d5tq1z9', { ...payload, to_email: bookData.email, to_name: bookData.name, notice_content: NOTICE_TEXT }, 'ehbGdRtZaXWft7qLM').catch(console.error);
      setBookData(prev => ({ ...prev, ...payload })); setBookStep('success');
    } catch (e) { alert(e.message); } finally { setSubmitting(false); }
  };

  const filteredItems = items.filter(i => (filters.style==='全部'||i.category===filters.style) && (filters.price==='全部'||(filters.price==='1300以下'?i.price<1300:filters.price==='1900以上'?i.price>1900:i.price>=1300&&i.price<=1900)) && (!filters.tag||i.tags?.includes(filters.tag)));

  // Renderers
  const renderNav = () => (
    <nav className="fixed top-0 w-full bg-white/90 backdrop-blur z-[500] border-b border-[#EAE7E2]">
      <div className="max-w-7xl mx-auto px-6 py-4 md:h-20 flex flex-col md:flex-row items-center justify-between">
        <h1 className="text-2xl md:text-3xl tracking-[0.4em] font-extralight cursor-pointer text-[#463E3E] mb-4 md:mb-0" onClick={()=>{setTab('catalog');setBookStep('none');}}>UNIWAWA</h1>
        <div className="flex gap-4 text-xs md:text-sm tracking-widest font-medium uppercase items-center overflow-x-auto pb-1 md:pb-0">
          {[ ['catalog','款式'], ['about','關於'], ['notice','須知'], ['store','門市'], ['search','查詢'], ['contact','聯絡'] ].map(([k,v]) => <button key={k} onClick={()=>{setTab(k);setBookStep('none');if(k==='search'){setFilters(f=>({...f,search:''}));setSearchRes([]);}}} className={`flex-shrink-0 ${tab===k?'text-[#C29591]':''}`}>{v}</button>)}
          {isAdmin ? <div className="flex gap-4 border-l pl-4 border-[#EAE7E2]"><button onClick={()=>{setEditItem(null);setModals(m=>({...m,upload:true}))}} className="text-[#C29591]"><Plus size={18}/></button><button onClick={()=>setModals(m=>({...m,manager:true}))} className="text-[#C29591]"><Settings size={18}/></button></div> : <button onClick={()=>setModals(m=>({...m,login:true}))} className="text-gray-300"><Lock size={14}/></button>}
        </div>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555] font-sans">
      <style>{`::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-thumb { background: #C29591; border-radius: 3px; } .hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
      {renderNav()}
      <main className="pt-32 md:pt-28 pb-12">
        {bookStep === 'success' ? <BookingSuccess data={bookData} item={selects.item} addon={selects.addon} onReset={()=>{setBookStep('none');setTab('catalog')}} /> :
         bookStep === 'form' ? (
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-2xl font-light tracking-[0.3em] text-center mb-12 text-[#463E3E]">預約資訊</h2>
            <div className="bg-white border p-6 mb-6 flex gap-6 items-center"><img src={selects.item.images[0]} className="w-24 h-24 object-cover" /><div className="flex-1"><p className="font-bold">{selects.item.title}</p><p className="text-xs text-gray-400">總時長: {totalTime}分</p></div><div className="text-xl font-bold">NT$ {totalCost.toLocaleString()}</div></div>
            <div className="bg-white border p-8 space-y-8">
               <div className="flex flex-wrap gap-3">{settings.stores.map(s=><button key={s.id} onClick={()=>setBookData({...bookData,storeId:s.id,date:'',time:''})} className={`px-4 py-2 text-xs border rounded-full ${bookData.storeId===s.id?'bg-[#463E3E] text-white':'hover:border-[#C29591]'}`}>{s.name}</button>)}</div>
               <div className="grid md:grid-cols-2 gap-6">
                 <input className={`border-b py-2 outline-none ${/\d/.test(bookData.name)?'border-red-300 text-red-500':''}`} value={bookData.name} onChange={e=>setBookData({...bookData,name:e.target.value})} placeholder="姓名 (不可含數字)" />
                 <input className={`border-b py-2 outline-none ${bookData.phone&&bookData.phone.length!==10?'border-red-300':''}`} value={bookData.phone} onChange={e=>setBookData({...bookData,phone:e.target.value.replace(/\D/g,'')})} placeholder="電話 (10碼)" />
                 <input className="border-b py-2 outline-none col-span-2" value={bookData.email} onChange={e=>setBookData({...bookData,email:e.target.value})} placeholder="電子信箱" type="email" />
               </div>
               <div className="flex justify-center"><CustomCalendar selectedDate={bookData.date} onDateSelect={d=>setBookData({...bookData,date:d,time:''})} settings={settings} storeId={bookData.storeId} isDayFull={d=>TIME_SLOTS.every(t=>isFull(d,t))} /></div>
               {bookData.date && <div className="grid grid-cols-4 md:grid-cols-6 gap-2">{TIME_SLOTS.map(t=><button key={t} disabled={isFull(bookData.date,t)} onClick={()=>setBookData({...bookData,time:t})} className={`py-2 text-[10px] border ${bookData.time===t?'bg-[#463E3E] text-white':'bg-white disabled:opacity-20'}`}>{t}</button>)}</div>}
               <button disabled={submitting || !validBook} onClick={submitBooking} className="w-full py-4 bg-[#463E3E] text-white text-xs tracking-widest uppercase disabled:opacity-50">{submitting?'處理中...':!bookData.storeId?'請選門市':!validBook?'請檢查資料':'送出預約'}</button>
            </div>
          </div>
        ) : tab === 'search' ? (
           <div className="max-w-3xl mx-auto px-6">
             <h2 className="text-2xl text-center mb-12 tracking-[0.3em]">預約查詢</h2>
             <div className="bg-white p-8 border mb-12"><input className="w-full border-b py-3 outline-none" placeholder="輸入姓名或電話" value={filters.search} onChange={e=>setFilters({...filters,search:e.target.value})} /><button onClick={()=>setSearchRes(bookings.filter(b=>b.name===filters.search||b.phone===filters.search))} className="w-full bg-[#463E3E] text-white py-3 mt-4 text-xs"><Search size={14} className="inline mr-2"/>查詢</button></div>
             <div className="space-y-6">{searchRes.map(b=><div key={b.id} className="bg-white border shadow-lg relative"><div className="h-1 bg-[#C29591]"/><div className="p-8"><div className="bg-[#FAF9F6] p-4 text-center border mb-6"><span className="text-lg font-bold">{b.date} • {b.time}</span><div className="text-[#C29591] text-xs font-bold">{b.storeName}</div></div><div className="flex justify-between text-xs text-gray-500"><span>{b.itemTitle}</span><span>NT$ {b.totalAmount}</span></div></div></div>)}</div>
           </div>
        ) : tab === 'notice' ? (
           <div className="max-w-3xl mx-auto px-6"><h2 className="text-2xl text-center mb-12 tracking-[0.3em]">預約須知</h2><div className="bg-white border p-12 relative"><div className="absolute top-0 left-0 w-full h-1 bg-[#C29591]"/><div className="space-y-6">{CONST.NOTICE.map((i,x)=><div key={x} className="flex gap-4 border-b border-dashed pb-4"><span className="text-3xl font-serif text-[#C29591]/80 italic">{String(x+1).padStart(2,'0')}</span><div><h3 className="font-bold text-sm text-[#463E3E] mb-2">{i.title}</h3><p className="text-xs text-gray-500 leading-6">{i.content}</p></div></div>)}</div><div className="mt-8 text-center text-[10px] text-gray-400 flex justify-center gap-2"><AlertOctagon size={14}/> 預約即代表同意以上條款</div></div></div>
        ) : tab === 'about' ? (
           <div className="max-w-3xl mx-auto px-6"><h2 className="text-2xl text-center mb-12 tracking-[0.3em]">關於 UNIWAWA</h2><div className="bg-white border p-12 relative"><div className="absolute top-0 left-0 w-full h-1 bg-[#C29591]"/><div className="flex flex-col md:flex-row gap-8"><img src={CONST.IMG_WAWA} className="w-full md:w-5/12 aspect-[4/5] object-cover bg-gray-100"/><div className="flex-1 text-xs text-gray-500 leading-8 text-justify"><p>創業八年的 <span className="font-bold text-[#463E3E]">UNIWAWA</span>，致力於將美感延伸至指尖藝術。</p><p>在這裡，我們延續對細節的堅持，期望為每一位顧客帶來獨一無二的體驗。</p></div></div></div></div>
        ) : tab === 'contact' ? (
           <div className="max-w-3xl mx-auto px-6 text-center"><h2 className="text-2xl mb-12 tracking-[0.3em]">聯絡我們</h2><div className="bg-white p-10 border shadow-sm"><p className="text-xs text-gray-500 mb-6">如有疑問歡迎加入 LINE (預約請用網站)</p><a href="https://lin.ee/X91bkZ6" target="_blank" className="inline-flex items-center gap-2 bg-[#06C755] text-white px-8 py-3 rounded-full font-bold text-sm"><MessageCircle size={20} />加入 LINE 好友</a></div></div>
        ) : tab === 'store' ? (
           <div className="max-w-4xl mx-auto px-6"><h2 className="text-2xl text-center mb-12 tracking-[0.3em]">門市資訊</h2><div className="bg-white border group hover:border-[#C29591]"><div className="aspect-video relative"><img src={CONST.IMG_STORE} className="w-full h-full object-cover"/></div><div className="p-8"><h3 className="text-lg font-medium text-[#463E3E] mb-2">桃園文中店</h3><div className="flex gap-2 text-xs text-gray-500 mb-6"><MapPin size={16} className="text-[#C29591]"/>桃園區文中三路 67 號 1 樓</div><button onClick={()=>window.open('https://www.google.com/maps/search/?api=1&query=桃園區文中三路67號1樓')} className="w-full border py-3 text-xs hover:bg-[#463E3E] hover:text-white transition-all">GOOGLE MAPS</button></div></div></div>
        ) : (
          <div className="max-w-7xl mx-auto px-6 space-y-8">
            <div className="flex flex-col gap-4 border-b pb-8 mb-8">
               <div className="flex gap-4 items-center"><span className="text-[10px] font-bold text-gray-400 w-12">STYLE</span><div className="flex flex-wrap gap-2">{['全部',...settings.styleCategories].map(c=><button key={c} onClick={()=>setFilters({...filters,style:c})} className={`px-4 py-1.5 text-xs rounded-full border ${filters.style===c?'bg-[#463E3E] text-white':'hover:border-[#C29591]'}`}>{c}</button>)}</div></div>
               <div className="flex gap-4 items-center"><span className="text-[10px] font-bold text-gray-400 w-12">PRICE</span><div className="flex flex-wrap gap-2">{CONST.PRICES.map(p=><button key={p} onClick={()=>setFilters({...filters,price:p})} className={`px-4 py-1.5 text-xs rounded-full border ${filters.price===p?'bg-[#463E3E] text-white':'hover:border-[#C29591]'}`}>{p}</button>)}</div></div>
               {filters.tag && <div className="text-center"><button onClick={()=>setFilters({...filters,tag:''})} className="bg-[#C29591] text-white px-4 py-1 rounded-full text-xs flex items-center gap-2 mx-auto">#{filters.tag} <X size={12}/></button></div>}
            </div>
            <div className="grid md:grid-cols-3 gap-10 pb-24">
              {filteredItems.map(item => <StyleCard key={item.id} item={item} isLoggedIn={isAdmin} onEdit={(i)=>{setEditItem(i);setModals(m=>({...m,upload:true}))}} onDelete={(id)=>deleteDoc(doc(db,'artifacts',appId,'public','data','nail_designs',id))} onBook={(i,a)=>{setSelects({item:i,addon:a});setBookData(p=>({...p,storeId:'',date:'',time:''}));setBookStep('form');window.scrollTo(0,0)}} addons={addons} onTagClick={t=>setFilters({...filters,tag:t})} />)}
            </div>
          </div>
        )}
      </main>

      {modals.login && <div className="fixed inset-0 bg-black/40 z-[1000] flex items-center justify-center p-4"><div className="bg-white p-10 max-w-sm w-full shadow-2xl"><h3 className="tracking-[0.5em] mb-10 font-light text-center text-sm">ADMIN</h3><input type="password" placeholder="••••" className="w-full border-b py-4 text-center tracking-[1.5em] outline-none" onChange={e=>{if(e.target.value==="8888"){setIsAdmin(true);setModals(m=>({...m,login:false}))}}} autoFocus/><button onClick={()=>setModals(m=>({...m,login:false}))} className="w-full mt-4 text-xs text-gray-400">CANCEL</button></div></div>}
      {modals.upload && <UploadModal item={editItem} settings={settings} onClose={()=>setModals(m=>({...m,upload:false}))} onSave={async(d)=>{const ref=d.id?doc(db,'artifacts',appId,'public','data','nail_designs',d.id):collection(db,'artifacts',appId,'public','data','nail_designs');d.id?await updateDoc(ref,d):await addDoc(ref,{...d,createdAt:serverTimestamp()});}} />}
      <AdminSystemModal isOpen={modals.manager} onClose={()=>setModals(m=>({...m,manager:false}))} settings={settings} setSettings={setSettings} bookings={bookings} onDeleteBooking={(id)=>deleteDoc(doc(db,'artifacts',appId,'public','data','bookings',id))} />
    </div>
  );
}