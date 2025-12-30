import React, { useState, useEffect } from 'react';
import { Plus, X, Lock, Trash2, Edit3, MessageCircle, Settings, Clock, Calendar as CalendarIcon, User, Phone, CheckCircle, List, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
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

// --- 常數設定 ---
const STYLE_CATEGORIES = ['全部', '極簡氣質', '華麗鑽飾', '藝術手繪', '日系暈染', '貓眼系列'];
const PRICE_CATEGORIES = ['全部', '1300以下', '1300-1900', '1900以上'];
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

const generateTimeSlots = () => {
  const slots = [];
  for (let h = 12; h <= 20; h++) {
    for (let m = 0; m < 60; m += 10) {
      if (h === 20 && m > 0) break;
      slots.push(`${h}:${m === 0 ? '00' : m}`);
    }
  }
  return slots;
};
const TIME_SLOTS = generateTimeSlots();

const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

// --- 子組件：款式卡片 (確保設定圖示固定不消失) ---
const StyleCard = ({ item, isLoggedIn, onEdit, onDelete, onBook, addons, setSelectedAddon }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const images = item.images && item.images.length > 0 ? item.images : ['https://via.placeholder.com/400x533'];

  const nextImg = (e) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev + 1) % images.length);
  };

  const prevImg = (e) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="group flex flex-col bg-white border border-[#F0EDEA] shadow-sm relative">
      {/* 圖片區域容器 */}
      <div className="aspect-[3/4] overflow-hidden relative bg-gray-50">
        
        {/* 管理圖示層：放在最外層 Absolute，確保 z-index 最高且不隨圖片滾動 */}
        {isLoggedIn && (
          <div className="absolute top-4 right-4 flex gap-2 z-[40]">
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(item); }} 
              className="p-2.5 bg-[#463E3E] text-white rounded-full shadow-xl hover:bg-[#C29591] transition-all transform hover:scale-110"
              title="編輯"
            >
              <Edit3 size={14}/>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); if(confirm('確定刪除此款式？')) onDelete(item.id); }} 
              className="p-2.5 bg-white text-red-500 rounded-full shadow-xl hover:bg-red-50 transition-all border border-red-100 transform hover:scale-110"
              title="刪除"
            >
              <Trash2 size={14}/>
            </button>
          </div>
        )}

        {/* 圖片顯示 (使用絕對定位與 Opacity 切換，避免 layout 偏移) */}
        {images.map((img, idx) => (
          <img 
            key={idx}
            src={img} 
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out ${idx === currentIdx ? 'opacity-100 z-10' : 'opacity-0 z-0'}`} 
            alt={`${item.title}-${idx}`} 
          />
        ))}
        
        {/* 輪播控制按鈕 (z-30) */}
        {images.length > 1 && (
          <>
            <button 
              onClick={prevImg} 
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full opacity-0 group-hover:opacity-100 transition-all z-30 shadow-md"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={nextImg} 
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full opacity-0 group-hover:opacity-100 transition-all z-30 shadow-md"
            >
              <ChevronRight size={20} />
            </button>
            
            {/* 底部指示器點點 */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-30">
              {images.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1 rounded-full transition-all ${i === currentIdx ? 'bg-white w-6 shadow-sm' : 'bg-white/40 w-2'}`} 
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* 文字資訊區域 */}
      <div className="p-8 flex flex-col items-center text-center">
        <span className="text-[10px] text-[#C29591] tracking-[0.4em] uppercase mb-2 font-semibold">{item.category}</span>
        <h3 className="text-[#463E3E] font-medium text-lg tracking-widest mb-1">{item.title}</h3>
        <div className="flex items-center gap-1.5 text-gray-400 text-[10px] mb-4 uppercase tracking-widest font-light">
          <Clock size={12} /> {item.duration || '90'} MINS
        </div>
        <p className="text-[#463E3E] font-bold text-xl mb-8">
          <span className="text-xs font-light tracking-widest mr-1">NT$</span>
          {item.price?.toLocaleString()}
        </p>
        
        <select 
          className="w-full text-[11px] border border-[#EAE7E2] py-3 px-4 bg-[#FAF9F6] mb-8 outline-none focus:border-[#C29591] transition-colors" 
          onChange={(e) => setSelectedAddon(addons.find(a => a.id === e.target.value) || null)}
        >
          <option value="">指甲狀態（卸甲/加厚）</option>
          {addons.map(a => (<option key={a.id} value={a.id}>{a.name} (+${a.price} / {a.duration}分)</option>))}
        </select>
        
        <button 
          onClick={() => onBook(item)} 
          className="bg-[#463E3E] text-white px-8 py-4 rounded-none text-[10px] tracking-[0.3em] font-medium w-full hover:bg-[#C29591] transition-colors uppercase"
        >
          Reserve Now
        </button>
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

  const prevMonth = () => setViewDate(new Date(currentYear, currentMonth - 1, 1));
  const nextMonth = () => setViewDate(new Date(currentYear, currentMonth + 1, 1));

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(currentYear, currentMonth, d);
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isHoliday = (specificHolidays || []).includes(dateStr);
      const isPast = dateObj < today;
      const isDisabled = isHoliday || isPast;
      const isSelected = selectedDate === dateStr;

      days.push(
        <button
          key={d}
          disabled={isDisabled}
          onClick={() => onDateSelect(dateStr)}
          className={`h-10 w-10 text-[11px] rounded-full flex items-center justify-center transition-all
            ${isDisabled ? 'text-gray-200 cursor-not-allowed line-through' : 'hover:bg-[#C29591] hover:text-white text-[#463E3E]'}
            ${isSelected ? 'bg-[#463E3E] text-white' : ''}
          `}
        >
          {d}
        </button>
      );
    }
    return days;
  };

  return (
    <div className="w-full max-w-[320px] bg-white border border-[#EAE7E2] p-4 shadow-sm">
      <div className="flex justify-between items-center mb-4 px-2">
        <h4 className="text-xs font-bold tracking-widest text-[#463E3E]">{currentYear}年 {currentMonth + 1}月</h4>
        <div className="flex gap-1">
          <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft size={16}/></button>
          <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded"><ChevronRight size={16}/></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map(w => (
          <div key={w} className="h-10 w-10 flex items-center justify-center text-[10px] text-gray-400 font-bold">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">{renderDays()}</div>
    </div>
  );
};

// --- 主程式 ---
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
  const [isBookingManagerOpen, setIsBookingManagerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({ title: '', price: '', category: '極簡氣質', duration: '90', images: [] });

  useEffect(() => {
    signInAnonymously(auth);
    onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  useEffect(() => {
    if (!user) return;
    onSnapshot(doc(db, 'artifacts', appId, 'public', 'settings'), (d) => {
      if (d.exists()) setShopSettings(d.data());
    });
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), (s) => 
      setCloudItems(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'addons'), (s) => 
      setAddons(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), orderBy('createdAt', 'desc')), (s) => 
      setAllBookings(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [user]);

  const isTimeSlotFull = (date, checkTimeStr) => {
    if (!date || !checkTimeStr) return false;
    const checkMin = timeToMinutes(checkTimeStr);
    const bookingsToday = allBookings.filter(b => b.date === date);
    const concurrentCount = bookingsToday.filter(b => {
      const start = timeToMinutes(b.time);
      const duration = Number(b.totalDuration) || 90;
      return checkMin >= start && checkMin < start + duration + 20;
    }).length;
    return concurrentCount >= (shopSettings.maxCapacity || 1);
  };

  const handleConfirmBooking = async () => {
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

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      const payload = { ...formData, price: Number(formData.price), duration: Number(formData.duration), updatedAt: serverTimestamp() };
      if (editingItem) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', editingItem.id), payload);
      else await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), { ...payload, createdAt: serverTimestamp() });
      setIsUploadModalOpen(false);
      setEditingItem(null);
      setFormData({ title: '', price: '', category: '極簡氣質', duration: '90', images: [] });
    } catch (err) { alert("儲存失敗"); } finally { setIsUploading(false); }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555] font-sans">
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-[100] border-b border-[#EAE7E2]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <h1 className="text-xl tracking-[0.4em] font-extralight cursor-pointer text-[#463E3E]" onClick={() => {setActiveTab('home'); setBookingStep('none');}}>UNIWAWA</h1>
          <div className="flex gap-6 text-[10px] tracking-widest font-bold uppercase items-center">
            <button onClick={() => {setActiveTab('home'); setBookingStep('none');}} className={activeTab === 'home' ? 'text-[#C29591]' : ''}>HOME</button>
            <button onClick={() => {setActiveTab('catalog'); setBookingStep('none');}} className={activeTab === 'catalog' ? 'text-[#C29591]' : ''}>COLLECTION</button>
            {isLoggedIn ? (
              <div className="flex gap-4 border-l pl-4 border-[#EAE7E2]">
                <button onClick={() => {setEditingItem(null); setFormData({title:'', price:'', category:'極簡氣質', duration:'90', images:[]}); setIsUploadModalOpen(true)}} className="text-[#C29591]"><Plus size={18}/></button>
                <button onClick={() => setIsBookingManagerOpen(true)} className="text-[#C29591]"><Settings size={18}/></button>
                <button onClick={() => setIsLoggedIn(false)} className="text-gray-400"><X size={18}/></button>
              </div>
            ) : (
              <button onClick={() => setIsAdminModalOpen(true)} className="text-gray-300 opacity-20"><Lock size={12}/></button>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-20">
        {bookingStep === 'form' ? (
          <div className="max-w-2xl mx-auto px-6 py-12">
            <h2 className="text-2xl font-light tracking-[0.3em] text-center mb-8 text-[#463E3E]">RESERVATION</h2>
            <div className="bg-white border border-[#EAE7E2] mb-6 p-6 shadow-sm flex items-center gap-6">
                <div className="w-20 h-20 bg-gray-50">
                   {selectedItem?.images?.[0] && <img src={selectedItem.images[0]} className="w-full h-full object-cover" />}
                </div>
                <div>
                  <p className="text-xs font-bold">{selectedItem?.title}</p>
                  <p className="text-[10px] text-gray-400">Total: NT$ {((Number(selectedItem?.price) || 0) + (Number(selectedAddon?.price) || 0)).toLocaleString()}</p>
                </div>
            </div>
            <div className="bg-white border border-[#EAE7E2] p-8 shadow-sm space-y-6">
              <input type="text" placeholder="NAME" className="w-full border-b py-2 text-xs outline-none" onChange={e => setBookingData({...bookingData, name: e.target.value})} />
              <input type="tel" placeholder="PHONE" className="w-full border-b py-2 text-xs outline-none" onChange={e => setBookingData({...bookingData, phone: e.target.value})} />
              <div className="flex justify-center pt-4">
                <CustomCalendar selectedDate={bookingData.date} onDateSelect={(d) => setBookingData({...bookingData, date: d, time: ''})} specificHolidays={shopSettings.specificHolidays} />
              </div>
              {bookingData.date && (
                <div className="grid grid-cols-4 gap-2">
                  {TIME_SLOTS.map(t => (
                    <button key={t} disabled={isTimeSlotFull(bookingData.date, t)} onClick={() => setBookingData({...bookingData, time:t})} className={`py-2 text-[10px] border ${bookingData.time===t ? 'bg-[#463E3E] text-white' : 'bg-white text-gray-400'}`}>{t}</button>
                  ))}
                </div>
              )}
              <button disabled={isSubmitting || !bookingData.time} onClick={handleConfirmBooking} className="w-full py-4 bg-[#463E3E] text-white text-[10px] tracking-widest uppercase">{isSubmitting ? 'PROCESSING...' : 'CONFIRM'}</button>
            </div>
          </div>
        ) : activeTab === 'home' ? (
          <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-6 text-center">
            <span className="text-[#C29591] tracking-[0.8em] text-sm mb-10 uppercase font-light">EST. 2026 • TAOYUAN</span>
            <div className="w-full max-w-xl mb-12 shadow-2xl overflow-hidden">
              <img src="https://drive.google.com/thumbnail?id=1ZJv3DS8ST_olFt0xzKB_miK9UKT28wMO&sz=w1200" className="w-full h-auto max-h-[45vh] object-cover" />
            </div>
            <h2 className="text-5xl font-extralight mb-12 tracking-[0.4em] text-[#463E3E]">Pure Art.</h2>
            <button onClick={() => setActiveTab('catalog')} className="bg-[#463E3E] text-white px-16 py-4 tracking-[0.4em] text-xs font-light hover:bg-[#C29591] transition-colors">EXPLORE</button>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
              {cloudItems.map(item => (
                <StyleCard 
                  key={item.id} 
                  item={item} 
                  isLoggedIn={isLoggedIn}
                  onEdit={(i) => {setEditingItem(i); setFormData(i); setIsUploadModalOpen(true);}}
                  onDelete={(id) => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', id))}
                  onBook={(i) => { setSelectedItem(i); setBookingStep('form'); window.scrollTo(0,0); }}
                  addons={addons}
                  setSelectedAddon={setSelectedAddon}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 密碼彈窗 */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[250] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white p-10 max-w-sm w-full shadow-2xl border border-[#EAE7E2]">
            <form onSubmit={(e) => { e.preventDefault(); if(passwordInput==="8888") setIsLoggedIn(true); setIsAdminModalOpen(false); }}>
              <p className="text-[10px] tracking-[0.3em] text-center mb-6 text-gray-400">ADMIN ACCESS</p>
              <input type="password" placeholder="••••" className="w-full border-b py-4 text-center tracking-[1.5em] outline-none text-xl" onChange={e => setPasswordInput(e.target.value)} autoFocus />
              <button className="w-full bg-[#463E3E] text-white py-4 mt-8 text-xs tracking-widest">LOGIN</button>
            </form>
          </div>
        </div>
      )}

      {/* 上傳彈窗 */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white p-8 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-10">
              <h3 className="tracking-[0.3em] text-xs font-bold uppercase">Update Style</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-gray-400 hover:text-black"><X size={20}/></button>
            </div>
            <form onSubmit={handleItemSubmit} className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] tracking-widest text-gray-400 uppercase">Style Info</label>
                <input type="text" required className="w-full border-b py-2 outline-none text-sm" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="款式名稱" />
                <div className="flex gap-4">
                  <input type="number" required className="w-1/2 border-b py-2 outline-none text-sm" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="價格" />
                  <input type="number" required className="w-1/2 border-b py-2 outline-none text-sm" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} placeholder="分鐘" />
                </div>
                <select className="w-full border-b py-2 outline-none text-sm bg-transparent" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  {STYLE_CATEGORIES.filter(c => c !== '全部').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              
              <div className="space-y-4">
                <label className="text-[10px] tracking-widest text-gray-400 uppercase">Images ({formData.images.length})</label>
                <div className="grid grid-cols-4 gap-2">
                  {formData.images.map((img, i) => (
                    <div key={i} className="relative aspect-square border group">
                      <img src={img} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setFormData(p => ({...p, images: p.images.filter((_, idx) => idx !== i)}))} className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button>
                    </div>
                  ))}
                  <label className="aspect-square border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-[#C29591] transition-colors">
                    <Plus size={20} className="text-gray-300" />
                    <input type="file" hidden accept="image/*" multiple onChange={(e) => {
                      Array.from(e.target.files).forEach(file => {
                        const reader = new FileReader();
                        reader.onloadend = () => setFormData(p => ({...p, images: [...p.images, reader.result]}));
                        reader.readAsDataURL(file);
                      });
                    }} />
                  </label>
                </div>
              </div>
              
              <button disabled={isUploading} className="w-full bg-[#463E3E] text-white py-4 text-[10px] tracking-[0.3em] uppercase hover:bg-[#C29591] transition-colors">
                {isUploading ? 'SAVING...' : 'PUBLISH STYLE'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 預約管理彈窗 */}
      {isBookingManagerOpen && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl p-8 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-8 border-b pb-6">
              <h3 className="text-xs tracking-[0.3em] font-bold uppercase">Booking Records</h3>
              <button onClick={() => setIsBookingManagerOpen(false)}><X size={24}/></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
              {allBookings.map(b => (
                <div key={b.id} className="border-b p-4 flex justify-between items-center hover:bg-[#FAF9F6] transition-colors">
                  <div className="flex gap-6 items-center">
                    <div className="text-center min-w-[60px]">
                      <div className="text-[10px] text-gray-400 font-bold uppercase">{b.date?.split('-')[1]}/{b.date?.split('-')[2]}</div>
                      <div className="text-sm font-bold text-[#463E3E]">{b.time}</div>
                    </div>
                    <div className="h-8 w-[1px] bg-gray-100"></div>
                    <div className="text-[11px]">
                      <div className="font-bold text-[#463E3E] tracking-widest">{b.name} <span className="font-light ml-2">{b.phone}</span></div>
                      <div className="text-[#C29591] mt-0.5">{b.itemTitle} + {b.addonName}</div>
                    </div>
                  </div>
                  <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', b.id))} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}