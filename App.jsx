import React, { useState, useEffect } from 'react';
import { Plus, X, Lock, Trash2, Edit3, Settings, Clock, CheckCircle, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, query, orderBy, setDoc } from 'firebase/firestore';

// --- Firebase 配置 ---
const firebaseConfig = {
  apiKey: "AIzaSyBkFqTUwtC7MqZ6h4--2_1BmldXEg-Haiw",
  authDomain: "uniwawa-beauty.firebaseapp.com",
  projectId: "uniwawa-beauty",
  appId: "1:1009617609234:web:3cb5466e79a81c1f1aaecb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'uniwawa01';

const STYLE_CATEGORIES = ['全部', '極簡氣質', '華麗鑽飾', '藝術手繪', '日系暈染', '貓眼系列'];
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const TIME_SLOTS = (() => {
  const slots = [];
  for (let h = 12; h <= 20; h++) {
    for (let m = 0; m < 60; m += 10) {
      if (h === 20 && m > 0) break;
      slots.push(`${h}:${m === 0 ? '00' : m}`);
    }
  }
  return slots;
})();

const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

// --- 子組件：款式卡片 (包含加購與輪播) ---
const StyleCard = ({ item, isLoggedIn, onEdit, onDelete, onBook, addons }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [localAddon, setLocalAddon] = useState(null);
  const images = item.images && item.images.length > 0 ? item.images : ['https://via.placeholder.com/400x533'];

  return (
    <div className="group flex flex-col bg-white border border-[#F0EDEA] shadow-sm relative">
      {isLoggedIn && (
        <div className="absolute top-4 right-4 flex gap-2 z-30">
          <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-2 bg-white/90 rounded-full text-blue-600 shadow-sm"><Edit3 size={16}/></button>
          <button onClick={(e) => { e.stopPropagation(); if(confirm('確定刪除？')) onDelete(item.id); }} className="p-2 bg-white/90 rounded-full text-red-600 shadow-sm"><Trash2 size={16}/></button>
        </div>
      )}

      <div className="aspect-[3/4] overflow-hidden relative bg-gray-50">
        <img src={images[currentIdx]} className="w-full h-full object-cover" alt={item.title} />
        {images.length > 1 && (
          <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); setCurrentIdx((prev) => (prev - 1 + images.length) % images.length); }} className="p-1.5 bg-white/70 rounded-full z-40"><ChevronLeft size={20} /></button>
            <button onClick={(e) => { e.stopPropagation(); setCurrentIdx((prev) => (prev + 1) % images.length); }} className="p-1.5 bg-white/70 rounded-full z-40"><ChevronRight size={20} /></button>
          </div>
        )}
      </div>

      <div className="p-8 flex flex-col items-center text-center">
        <span className="text-[10px] text-[#C29591] tracking-[0.4em] uppercase mb-2 font-medium">{item.category}</span>
        <h3 className="text-[#463E3E] font-medium text-lg tracking-widest mb-1">{item.title}</h3>
        <div className="flex items-center gap-1.5 text-gray-400 text-[10px] mb-4 uppercase tracking-widest font-light"><Clock size={12} /> 服務時長：{item.duration || '90'} 分鐘</div>
        <p className="text-[#463E3E] font-bold text-xl mb-6">NT$ {item.price?.toLocaleString()}</p>
        
        <select 
          className="w-full text-[11px] border border-[#EAE7E2] py-3 px-4 bg-[#FAF9F6] mb-6 outline-none cursor-pointer" 
          onChange={(e) => setLocalAddon(addons.find(a => a.id === e.target.value) || null)}
        >
          <option value="">選擇指甲現況 / 加購服務</option>
          {addons.map(a => (<option key={a.id} value={a.id}>{a.name} (+${a.price} / {a.duration}分)</option>))}
        </select>
        
        <button onClick={() => onBook(item, localAddon)} className="bg-[#463E3E] text-white px-8 py-3.5 rounded-full text-xs tracking-[0.2em] font-medium w-full hover:bg-[#C29591] transition-colors">點此預約</button>
      </div>
    </div>
  );
};

// --- 月曆組件 ---
const CustomCalendar = ({ selectedDate, onDateSelect, specificHolidays }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isHoliday = (specificHolidays || []).includes(dateStr);
      const isPast = new Date(currentYear, currentMonth, d) < today;
      const isDisabled = isHoliday || isPast;
      const isSelected = selectedDate === dateStr;
      days.push(
        <button key={d} disabled={isDisabled} onClick={() => onDateSelect(dateStr)}
          className={`h-10 w-10 text-[11px] rounded-full flex items-center justify-center transition-all ${isDisabled ? 'text-gray-200 cursor-not-allowed line-through' : isSelected ? 'bg-[#463E3E] text-white' : 'hover:bg-[#C29591] hover:text-white'}`}>
          {d}
        </button>
      );
    }
    return days;
  };

  return (
    <div className="w-full max-w-[320px] bg-white border border-[#EAE7E2] p-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-xs font-bold tracking-widest">{currentYear}年 {currentMonth + 1}月</h4>
        <div className="flex gap-1">
          <button onClick={() => setViewDate(new Date(currentYear, currentMonth - 1, 1))}><ChevronLeft size={16}/></button>
          <button onClick={() => setViewDate(new Date(currentYear, currentMonth + 1, 1))}><ChevronRight size={16}/></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">{renderDays()}</div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cloudItems, setCloudItems] = useState([]);
  const [addons, setAddons] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [shopSettings, setShopSettings] = useState({ specificHolidays: [], maxCapacity: 1 });
  
  const [bookingStep, setBookingStep] = useState('none');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedAddon, setSelectedAddon] = useState(null);
  const [bookingData, setBookingData] = useState({ name: '', phone: '', date: '', time: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [formData, setFormData] = useState({ title: '', price: '', category: '極簡氣質', duration: '90', images: [] });

  useEffect(() => {
    signInAnonymously(auth);
    onAuthStateChanged(auth, u => setUser(u));
  }, []);

  useEffect(() => {
    if (!user) return;
    onSnapshot(doc(db, 'artifacts', appId, 'public', 'settings'), (d) => d.exists() && setShopSettings(d.data()));
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), (s) => setCloudItems(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'addons'), (s) => setAddons(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), orderBy('createdAt', 'desc')), (s) => setAllBookings(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

  const isTimeSlotFull = (date, checkTimeStr) => {
    if (!date || !checkTimeStr) return false;
    const checkMin = timeToMinutes(checkTimeStr);
    const concurrent = allBookings.filter(b => {
      if (b.date !== date) return false;
      const start = timeToMinutes(b.time);
      const end = start + (Number(b.totalDuration) || 90) + 20;
      return checkMin >= start && checkMin < end;
    });
    return concurrent.length >= (shopSettings.maxCapacity || 1);
  };

  const handleConfirmBooking = async () => {
    if (!bookingData.name || !bookingData.phone || !bookingData.time) return alert("請填寫姓名、電話並選擇時間");
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), {
        ...bookingData,
        itemTitle: selectedItem?.title,
        addonName: selectedAddon?.name || '無',
        totalAmount: (Number(selectedItem?.price) || 0) + (Number(selectedAddon?.price) || 0),
        totalDuration: (Number(selectedItem?.duration) || 90) + (Number(selectedAddon?.duration) || 0),
        createdAt: serverTimestamp()
      });
      setBookingStep('success');
    } catch (e) { alert('預約失敗'); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555]">
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-[#EAE7E2]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <h1 className="text-xl tracking-[0.4em] font-extralight cursor-pointer" onClick={() => {setActiveTab('home'); setBookingStep('none');}}>UNIWAWA</h1>
          <div className="flex gap-6 text-sm items-center">
            <button onClick={() => {setActiveTab('home'); setBookingStep('none');}} className={activeTab === 'home' ? 'text-[#C29591]' : ''}>首頁</button>
            <button onClick={() => {setActiveTab('catalog'); setBookingStep('none');}} className={activeTab === 'catalog' ? 'text-[#C29591]' : ''}>款式</button>
            {isLoggedIn ? <button onClick={() => setIsAdminModalOpen(true)} className="text-[#C29591]"><Settings size={18}/></button> : <button onClick={() => setIsAdminModalOpen(true)} className="text-gray-300"><Lock size={14}/></button>}
          </div>
        </div>
      </nav>

      <main className="pt-20">
        {bookingStep === 'form' ? (
          <div className="max-w-2xl mx-auto px-6 py-12">
            <h2 className="text-2xl font-light tracking-[0.3em] text-center mb-8">預約明細</h2>
            <div className="bg-white border border-[#EAE7E2] mb-6 p-6 shadow-sm">
                <div className="flex gap-6 items-center">
                   <div className="w-24 h-24 bg-gray-50 border">{selectedItem?.images?.[0] && <img src={selectedItem.images[0]} className="w-full h-full object-cover" alt="" />}</div>
                   <div className="flex-1">
                    <p className="text-[10px] text-[#C29591] font-bold tracking-widest uppercase">已選項目</p>
                    <p className="text-sm font-medium">{selectedItem?.title} {selectedAddon ? `+ ${selectedAddon.name}` : ''}</p>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase">Total Time: {(Number(selectedItem?.duration) || 90) + (Number(selectedAddon?.duration) || 0)} mins</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] text-gray-400 uppercase">Amount</p>
                      <p className="text-lg font-bold">NT$ {((Number(selectedItem?.price) || 0) + (Number(selectedAddon?.price) || 0)).toLocaleString()}</p>
                   </div>
                </div>
            </div>
            <div className="bg-white border border-[#EAE7E2] p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input type="text" placeholder="顧客姓名" className="border-b py-2 outline-none" onChange={e => setBookingData({...bookingData, name: e.target.value})} />
                <input type="tel" placeholder="聯絡電話" className="border-b py-2 outline-none" onChange={e => setBookingData({...bookingData, phone: e.target.value})} />
              </div>
              <div className="flex justify-center">
                <CustomCalendar selectedDate={bookingData.date} onDateSelect={(d) => setBookingData({...bookingData, date: d, time: ''})} specificHolidays={shopSettings.specificHolidays} />
              </div>
              {bookingData.date && (
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {TIME_SLOTS.map(t => (
                    <button key={t} disabled={isTimeSlotFull(bookingData.date, t)} onClick={() => setBookingData({...bookingData, time:t})} className={`py-2 text-[10px] border ${bookingData.time===t ? 'bg-[#463E3E] text-white' : 'bg-white'}`}>{t}</button>
                  ))}
                </div>
              )}
              <button disabled={isSubmitting || !bookingData.time} onClick={handleConfirmBooking} className="w-full py-4 bg-[#463E3E] text-white text-xs tracking-widest uppercase">{isSubmitting ? '處理中...' : '確認預約'}</button>
            </div>
          </div>
        ) : bookingStep === 'success' ? (
          <div className="max-w-md mx-auto py-20 px-6 text-center">
            <CheckCircle size={56} className="text-[#C29591] mx-auto mb-6" />
            <h2 className="text-2xl font-light tracking-[0.3em] mb-8">預約成功</h2>
            
            <div className="bg-white border border-[#EAE7E2] p-6 mb-10 shadow-sm">
                <div className="aspect-square bg-gray-50 mb-4 overflow-hidden border">
                   {selectedItem?.images?.[0] && <img src={selectedItem.images[0]} className="w-full h-full object-cover" alt="success-view" />}
                </div>
                <p className="text-xs tracking-widest text-[#463E3E] font-bold mb-1">{selectedItem?.title}</p>
                <p className="text-sm text-[#C29591]">{bookingData.date} {bookingData.time}</p>
            </div>

            <button onClick={() => {setBookingStep('none'); setActiveTab('home');}} className="w-full bg-[#463E3E] text-white py-4 text-xs tracking-widest">回到首頁</button>
          </div>
        ) : activeTab === 'home' ? (
          <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-6 text-center">
            <span className="text-[#C29591] tracking-[0.4em] text-xs mb-10 uppercase font-extralight">EST. 2026 • TAOYUAN</span>
            <div className="w-full max-w-xl mb-12 shadow-2xl border border-[#EAE7E2]"><img src="https://drive.google.com/thumbnail?id=1ZJv3DS8ST_olFt0xzKB_miK9UKT28wMO&sz=w1200" className="w-full h-auto object-cover" alt="home" /></div>
            <h2 className="text-4xl md:text-5xl font-extralight mb-12 tracking-[0.4em] text-[#463E3E] leading-relaxed">Beyond<br/>Expectation</h2>
            <button onClick={() => setActiveTab('catalog')} className="bg-[#463E3E] text-white px-16 py-4 tracking-[0.4em] text-xs font-light hover:bg-[#C29591]">點此預約</button>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16">
              {cloudItems.map(item => (
                <StyleCard key={item.id} item={item} isLoggedIn={isLoggedIn} addons={addons} 
                  onEdit={(i) => {setFormData(i); setIsUploadModalOpen(true);}}
                  onDelete={(id) => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', id))}
                  onBook={(i, addon) => { setSelectedItem(i); setSelectedAddon(addon); setBookingStep('form'); window.scrollTo(0,0); }} 
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 管理彈窗 (簡化版) */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[250] flex items-center justify-center p-4">
          <div className="bg-white p-10 max-w-sm w-full shadow-2xl">
            <h3 className="tracking-[0.5em] mb-10 text-gray-400 text-sm text-center uppercase">Admin</h3>
            <form onSubmit={(e) => { e.preventDefault(); if(passwordInput==="8888") setIsLoggedIn(true); setIsAdminModalOpen(false); }}>
              <input type="password" placeholder="••••" className="w-full border-b py-4 text-center tracking-[1.5em] outline-none" onChange={e => setPasswordInput(e.target.value)} autoFocus />
              <button className="w-full bg-[#463E3E] text-white py-4 mt-6 text-xs tracking-widest">ENTER</button>
            </form>
          </div>
        </div>
      )}

      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[300] flex items-center justify-center p-4">
          <div className="bg-white p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6"><h3 className="tracking-widest font-light">上傳款式</h3><button onClick={() => setIsUploadModalOpen(false)}><X size={20}/></button></div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), { ...formData, price: Number(formData.price), duration: Number(formData.duration), createdAt: serverTimestamp() });
              setIsUploadModalOpen(false);
            }} className="space-y-6">
              <input type="text" required className="w-full border-b py-2 outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="款式名稱" />
              <div className="flex gap-4">
                <input type="number" required className="w-1/2 border-b py-2 outline-none" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="價格" />
                <input type="number" required className="w-1/2 border-b py-2 outline-none" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} placeholder="分鐘" />
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.images.map((img, i) => (<div key={i} className="relative w-20 h-20 border"><img src={img} className="w-full h-full object-cover" alt="" /></div>))}
                <label className="w-20 h-20 border-2 border-dashed flex items-center justify-center cursor-pointer">
                  <Upload size={16} /><input type="file" hidden multiple onChange={(e) => {
                    Array.from(e.target.files).forEach(file => {
                      const reader = new FileReader();
                      reader.onloadend = () => setFormData(p => ({...p, images: [...p.images, reader.result]}));
                      reader.readAsDataURL(file);
                    });
                  }} />
                </label>
              </div>
              <button className="w-full bg-[#463E3E] text-white py-4 text-xs tracking-widest uppercase">發布</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}