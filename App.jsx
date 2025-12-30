import React, { useState, useEffect } from 'react';
import { Plus, X, Lock, Trash2, Edit3, MessageCircle, Settings, Clock, Calendar as CalendarIcon, User, Phone, CheckCircle, List, Upload, ChevronLeft, ChevronRight, Users, UserMinus, Sparkles, CreditCard, Timer } from 'lucide-react';
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

// --- 子組件：款式卡片 ---
const StyleCard = ({ item, isLoggedIn, onEdit, onDelete, onBook, addons, setSelectedAddon }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const images = item.images && item.images.length > 0 ? item.images : ['https://via.placeholder.com/400x533'];

  return (
    <div className="group flex flex-col bg-white border border-[#F0EDEA] shadow-sm relative">
      {isLoggedIn && (
        <div className="absolute top-4 right-4 flex gap-2 z-[30]">
          <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-2 bg-white/90 rounded-full text-blue-600 shadow-sm hover:scale-110 transition-transform"><Edit3 size={16}/></button>
          <button onClick={(e) => { e.stopPropagation(); if(confirm('確定刪除？')) onDelete(item.id); }} className="p-2 bg-white/90 rounded-full text-red-600 shadow-sm hover:scale-110 transition-transform"><Trash2 size={16}/></button>
        </div>
      )}
      <div className="aspect-[3/4] overflow-hidden relative bg-gray-50">
        <img src={images[currentIdx]} className="w-full h-full object-cover transition-opacity duration-300" alt={item.title} />
        {images.length > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); setCurrentIdx(p => (p - 1 + images.length) % images.length); }} className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/50 hover:bg-white/80 rounded-full z-10"><ChevronLeft size={20} /></button>
            <button onClick={(e) => { e.stopPropagation(); setCurrentIdx(p => (p + 1) % images.length); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/50 hover:bg-white/80 rounded-full z-10"><ChevronRight size={20} /></button>
          </>
        )}
      </div>
      <div className="p-8 flex flex-col items-center text-center">
        <span className="text-[10px] text-[#C29591] tracking-[0.4em] uppercase mb-2 font-medium">{item.category}</span>
        <h3 className="text-[#463E3E] font-medium text-lg tracking-widest mb-1">{item.title}</h3>
        <div className="flex items-center gap-1.5 text-gray-400 text-[10px] mb-4 uppercase tracking-widest font-light"><Clock size={12} /> 預計服務：{item.duration || '90'} 分鐘</div>
        <p className="text-[#463E3E] font-bold text-xl mb-8"><span className="text-xs font-light tracking-widest mr-1">NT$</span>{item.price.toLocaleString()}</p>
        <select className="w-full text-[11px] border border-[#EAE7E2] py-3 px-4 bg-[#FAF9F6] mb-8 outline-none" onChange={(e) => setSelectedAddon(addons.find(a => a.id === e.target.value) || null)}>
          <option value="">請選擇指甲現況 (非必選)</option>
          {addons.map(a => (<option key={a.id} value={a.id}>{a.name} (+${a.price} / {a.duration}分)</option>))}
        </select>
        <button onClick={() => onBook(item)} className="bg-[#463E3E] text-white px-8 py-3.5 rounded-full text-xs tracking-[0.2em] font-medium w-full hover:bg-[#C29591] transition-colors">點此預約</button>
      </div>
    </div>
  );
};

// --- 子組件：月曆 ---
const CustomCalendar = ({ selectedDate, onDateSelect, settings }) => {
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
      const isShopHoliday = (settings?.specificHolidays || []).includes(dateStr);
      const staffList = settings?.staff || [];
      const onLeaveCount = staffList.filter(s => (s.leaveDates || []).includes(dateStr)).length;
      const isAllOnLeave = staffList.length > 0 && (staffList.length - onLeaveCount) <= 0;
      const isPast = new Date(currentYear, currentMonth, d) < today;
      const isDisabled = isShopHoliday || isAllOnLeave || isPast;
      const isSelected = selectedDate === dateStr;

      days.push(
        <button key={d} disabled={isDisabled} onClick={() => onDateSelect(dateStr)}
          className={`h-10 w-10 text-[11px] rounded-full flex items-center justify-center transition-all 
            ${isDisabled ? 'text-gray-200 line-through cursor-not-allowed' : isSelected ? 'bg-[#463E3E] text-white' : 'hover:bg-[#C29591] hover:text-white'}`}>
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
          <button onClick={() => setViewDate(new Date(currentYear, currentMonth - 1, 1))}><ChevronLeft size={16}/></button>
          <button onClick={() => setViewDate(new Date(currentYear, currentMonth + 1, 1))}><ChevronRight size={16}/></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map(w => <div key={w} className="h-10 w-10 flex items-center justify-center text-[10px] text-gray-400 font-bold">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">{renderDays()}</div>
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
  const [shopSettings, setShopSettings] = useState({ specificHolidays: [], staff: [] });
  const [newHolidayInput, setNewHolidayInput] = useState('');
  
  const [addonForm, setAddonForm] = useState({ name: '', price: '', duration: '' });
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
  const [styleFilter, setStyleFilter] = useState('全部');
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({ title: '', price: '', category: '極簡氣質', duration: '90', images: [] });

  useEffect(() => {
    signInAnonymously(auth);
    onAuthStateChanged(auth, u => setUser(u));
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
    const staffList = shopSettings.staff || [];
    const onLeaveCount = staffList.filter(s => (s.leaveDates || []).includes(date)).length;
    const availableStaffCount = staffList.length > 0 ? (staffList.length - onLeaveCount) : 1;
    const checkMin = timeToMinutes(checkTimeStr);
    const concurrent = allBookings.filter(b => {
      if (b.date !== date) return false;
      const start = timeToMinutes(b.time);
      const end = start + (Number(b.totalDuration) || 90) + 20;
      return checkMin >= start && checkMin < end;
    });
    return concurrent.length >= availableStaffCount;
  };

  const handleConfirmBooking = async () => {
    if(!bookingData.name || !bookingData.phone || !bookingData.time) {
        alert("請完整填寫資訊");
        return;
    }
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
      setFormData({ title: '', price: '', category: '極簡氣質', duration: '90', images: [] });
    } catch (err) { alert("儲存失敗"); } finally { setIsUploading(false); }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555] font-sans">
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-[#EAE7E2]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <h1 className="text-xl tracking-[0.4em] font-extralight cursor-pointer text-[#463E3E]" onClick={() => {setActiveTab('home'); setBookingStep('none');}}>UNIWAWA</h1>
          <div className="flex gap-6 text-sm tracking-widest font-medium uppercase items-center">
            <button onClick={() => {setActiveTab('home'); setBookingStep('none');}} className={activeTab === 'home' ? 'text-[#C29591]' : ''}>首頁</button>
            <button onClick={() => {setActiveTab('catalog'); setBookingStep('none');}} className={activeTab === 'catalog' ? 'text-[#C29591]' : ''}>款式</button>
            {isLoggedIn ? (
              <div className="flex gap-4 border-l pl-4 border-[#EAE7E2]">
                <button onClick={() => {setEditingItem(null); setFormData({title:'', price:'', category:'極簡氣質', duration:'90', images:[]}); setIsUploadModalOpen(true)}} className="text-[#C29591]"><Plus size={18}/></button>
                <button onClick={() => setIsBookingManagerOpen(true)} className="text-[#C29591]"><Settings size={18}/></button>
              </div>
            ) : (
              <button onClick={() => setIsAdminModalOpen(true)} className="text-gray-300 hover:text-[#C29591] transition-colors"><Lock size={14}/></button>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-20">
        {bookingStep === 'form' ? (
          <div className="max-w-4xl mx-auto px-6 py-12">
            <h2 className="text-2xl font-light tracking-[0.3em] text-center mb-12 text-[#463E3E]">BOOKING DETAILS / 預約詳情</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* 左側：訂單卡片 */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white border border-[#EAE7E2] overflow-hidden shadow-sm">
                  <div className="relative aspect-[4/5] bg-gray-50">
                    <img src={selectedItem?.images?.[0] || 'https://via.placeholder.com/400x533'} className="w-full h-full object-cover" alt="item" />
                    <div className="absolute top-4 left-4 bg-[#463E3E] text-white text-[9px] px-3 py-1 tracking-[0.2em] uppercase">預約項目</div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="text-lg font-medium text-[#463E3E] tracking-widest">{selectedItem?.title}</h3>
                      <p className="text-xs text-[#C29591] mt-1 font-bold">{selectedAddon ? `加購：${selectedAddon.name}` : '無額外加購'}</p>
                    </div>
                    
                    <div className="pt-4 border-t border-[#F0EDEA] space-y-3">
                        <div className="flex justify-between items-center text-xs">
                           <span className="text-gray-400 flex items-center gap-2"><CreditCard size={14}/> 預估總金額</span>
                           <span className="font-bold text-[#463E3E]">NT$ {((Number(selectedItem?.price) || 0) + (Number(selectedAddon?.price) || 0)).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                           <span className="text-gray-400 flex items-center gap-2"><Timer size={14}/> 預估總時間</span>
                           <span className="font-bold text-[#463E3E]">{((Number(selectedItem?.duration) || 90) + (Number(selectedAddon?.duration) || 0))} 分鐘</span>
                        </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 右側：填寫資訊 */}
              <div className="lg:col-span-3 bg-white border border-[#EAE7E2] p-8 shadow-sm">
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] tracking-widest text-gray-400 uppercase font-bold">顧客姓名 NAME</label>
                      <div className="flex items-center border-b border-[#EAE7E2] focus-within:border-[#C29591] transition-colors">
                        <User size={16} className="text-gray-300 mr-2"/>
                        <input type="text" placeholder="輸入姓名" className="w-full py-2 outline-none text-sm bg-transparent" onChange={e => setBookingData({...bookingData, name: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] tracking-widest text-gray-400 uppercase font-bold">聯絡電話 PHONE</label>
                      <div className="flex items-center border-b border-[#EAE7E2] focus-within:border-[#C29591] transition-colors">
                        <Phone size={16} className="text-gray-300 mr-2"/>
                        <input type="tel" placeholder="09XX-XXX-XXX" className="w-full py-2 outline-none text-sm bg-transparent" onChange={e => setBookingData({...bookingData, phone: e.target.value})} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] tracking-widest text-gray-400 uppercase font-bold block text-center">選擇預約日期 DATE</label>
                    <div className="flex justify-center">
                      <CustomCalendar selectedDate={bookingData.date} onDateSelect={(d) => setBookingData({...bookingData, date: d, time: ''})} settings={shopSettings} />
                    </div>
                  </div>

                  {bookingData.date && (
                    <div className="space-y-4 animate-fade-in">
                      <label className="text-[10px] tracking-widest text-gray-400 uppercase font-bold block text-center">預約時段 TIME SLOT</label>
                      <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                        {TIME_SLOTS.map(t => (
                          <button key={t} disabled={isTimeSlotFull(bookingData.date, t)} onClick={() => setBookingData({...bookingData, time:t})} 
                            className={`py-2 text-[10px] border transition-all ${bookingData.time===t ? 'bg-[#463E3E] text-white border-[#463E3E]' : 'bg-white border-[#EAE7E2] hover:border-[#C29591] disabled:opacity-20 disabled:bg-gray-50'}`}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button disabled={isSubmitting || !bookingData.time} onClick={handleConfirmBooking} 
                    className="w-full py-4 bg-[#463E3E] text-white text-xs tracking-[0.3em] font-medium uppercase hover:bg-[#C29591] transition-colors shadow-lg disabled:bg-gray-300">
                    {isSubmitting ? '處理中...' : '確認發送預約請求'}
                  </button>
                  <p className="text-[9px] text-gray-400 text-center tracking-widest">點擊確認即代表同意 UNIWAWA 服務條款與取消預約規範</p>
                </div>
              </div>
            </div>
          </div>
        ) : bookingStep === 'success' ? (
          <div className="max-w-md mx-auto py-20 px-6 text-center">
            <CheckCircle size={56} className="text-[#C29591] mx-auto mb-4" />
            <h2 className="text-2xl font-light tracking-[0.3em] mb-4">預約已送出</h2>
            <p className="text-xs text-gray-400 mb-10 tracking-widest uppercase">Thank you for your reservation</p>
            <div className="bg-white border border-[#EAE7E2] p-8 shadow-sm space-y-4">
               {selectedItem?.images?.[0] && <img src={selectedItem.images[0]} className="w-full h-48 object-cover mb-6" alt="success" />}
               <div className="space-y-2 border-t pt-4">
                  <p className="text-sm font-bold text-[#463E3E]">{bookingData.date} {bookingData.time}</p>
                  <p className="text-xs text-gray-500">{bookingData.name} 閣下，我們已收到您的預約。</p>
               </div>
               <button onClick={() => {setBookingStep('none'); setActiveTab('home');}} className="w-full mt-6 bg-[#463E3E] text-white py-4 text-xs tracking-widest uppercase">回到首頁</button>
            </div>
          </div>
        ) : activeTab === 'home' ? (
          <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-6 text-center">
            <span className="text-[#C29591] tracking-[0.4em] md:tracking-[0.8em] text-xs md:text-sm mb-10 uppercase font-extralight">EST. 2026 • TAOYUAN</span>
            <div className="w-full max-w-xl mb-12 shadow-2xl rounded-sm overflow-hidden border border-[#EAE7E2]">
              <img src="https://drive.google.com/thumbnail?id=1ZJv3DS8ST_olFt0xzKB_miK9UKT28wMO&sz=w1200" className="w-full h-auto max-h-[40vh] object-cover" alt="home" />
            </div>
            <h2 className="text-4xl md:text-5xl font-extralight mb-12 tracking-[0.4em] text-[#463E3E] leading-relaxed">Beyond<br/>Expectation</h2>
            <button onClick={() => setActiveTab('catalog')} className="bg-[#463E3E] text-white px-16 py-4 tracking-[0.4em] text-xs font-light hover:bg-[#C29591] transition-colors">點此預約</button>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
            <div className="flex flex-wrap gap-4 justify-center border-b border-[#EAE7E2] pb-8">
               {STYLE_CATEGORIES.map(c => (
                 <button key={c} onClick={() => setStyleFilter(c)} className={`text-[10px] tracking-widest px-4 py-1 ${styleFilter===c ? 'text-[#C29591] font-bold underline underline-offset-8' : 'text-gray-400'}`}>{c}</button>
               ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16">
              {cloudItems.filter(i => styleFilter === '全部' || i.category === styleFilter).map(item => (
                <StyleCard key={item.id} item={item} isLoggedIn={isLoggedIn}
                  onEdit={(i) => {setEditingItem(i); setFormData(i); setIsUploadModalOpen(true);}}
                  onDelete={(id) => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', id))}
                  onBook={(i) => { setSelectedItem(i); setBookingStep('form'); window.scrollTo(0,0); }}
                  addons={addons} setSelectedAddon={setSelectedAddon}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 管理者登入 */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[250] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white p-10 max-w-sm w-full shadow-2xl">
            <h3 className="tracking-[0.5em] mb-10 font-light text-gray-400 text-sm uppercase text-center">Admin Access</h3>
            <form onSubmit={(e) => { e.preventDefault(); if(passwordInput==="8888") setIsLoggedIn(true); setIsAdminModalOpen(false); }}>
              <input type="password" placeholder="••••" className="w-full border-b py-4 text-center tracking-[1.5em] outline-none" onChange={e => setPasswordInput(e.target.value)} autoFocus />
              <button className="w-full bg-[#463E3E] text-white py-4 mt-6 text-xs tracking-widest">ENTER</button>
            </form>
          </div>
        </div>
      )}

      {/* 管理彈窗 */}
      {isBookingManagerOpen && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-5xl h-[85vh] shadow-2xl flex flex-col overflow-hidden rounded-sm">
            <div className="bg-white px-8 py-6 border-b flex justify-between items-center">
              <h3 className="text-xs tracking-[0.3em] font-bold uppercase text-[#463E3E]">系統管理中心</h3>
              <button onClick={() => setIsBookingManagerOpen(false)}><X size={24}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-12">
              <section className="space-y-6">
                <div className="border-l-4 border-[#C29591] pl-4">
                  <h4 className="text-sm font-bold tracking-widest text-[#463E3E]">加購品設定 (指甲現況)</h4>
                </div>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if(!addonForm.name || !addonForm.price) return;
                  await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'addons'), { ...addonForm, price: Number(addonForm.price), duration: Number(addonForm.duration || 0), createdAt: serverTimestamp() });
                  setAddonForm({ name: '', price: '', duration: '' });
                }} className="bg-[#FAF9F6] p-5 border border-[#EAE7E2] grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <input type="text" className="border p-2 text-xs outline-none" placeholder="項目名稱" value={addonForm.name} onChange={e => setAddonForm({...addonForm, name: e.target.value})} />
                  <input type="number" className="border p-2 text-xs outline-none" placeholder="NT$" value={addonForm.price} onChange={e => setAddonForm({...addonForm, price: e.target.value})} />
                  <input type="number" className="border p-2 text-xs outline-none" placeholder="分鐘" value={addonForm.duration} onChange={e => setAddonForm({...addonForm, duration: e.target.value})} />
                  <button className="bg-[#463E3E] text-white py-2.5 text-[10px] tracking-widest uppercase">新增項目</button>
                </form>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {addons.map(addon => (
                    <div key={addon.id} className="border p-4 flex justify-between items-center bg-white shadow-sm">
                      <div className="text-xs">
                        <div className="font-bold">{addon.name}</div>
                        <div className="text-gray-400">+ NT$ {addon.price} / {addon.duration} min</div>
                      </div>
                      <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'addons', addon.id))}><Trash2 size={14} className="text-gray-300 hover:text-red-500"/></button>
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 border-t pt-12">
                <section className="space-y-6">
                   <h4 className="text-sm font-bold tracking-widest border-l-4 border-[#C29591] pl-4 uppercase">全店公休日</h4>
                   <div className="flex gap-2">
                     <input type="date" className="flex-1 p-2 border text-xs" value={newHolidayInput} onChange={e => setNewHolidayInput(e.target.value)} />
                     <button onClick={() => { if(!newHolidayInput) return; setDoc(doc(db, 'artifacts', appId, 'public', 'settings'), {...shopSettings, specificHolidays: [...(shopSettings.specificHolidays || []), newHolidayInput].sort()}); setNewHolidayInput(''); }} className="bg-[#463E3E] text-white px-4 text-[10px]">新增</button>
                   </div>
                   <div className="flex flex-wrap gap-2">
                     {(shopSettings.specificHolidays || []).map(date => (
                       <span key={date} className="text-[10px] bg-gray-100 px-3 py-1.5 border flex items-center gap-2">
                         {date} <X size={12} className="cursor-pointer" onClick={() => setDoc(doc(db, 'artifacts', appId, 'public', 'settings'), {...shopSettings, specificHolidays: shopSettings.specificHolidays.filter(d => d !== date)})} />
                       </span>
                     ))}
                   </div>
                </section>
                <section className="space-y-6">
                  <h4 className="text-sm font-bold tracking-widest border-l-4 border-[#C29591] pl-4 uppercase">預約訂單列表</h4>
                  <div className="space-y-3">
                    {allBookings.map(b => (
                      <div key={b.id} className="border p-4 flex justify-between items-center bg-[#FAF9F6] text-[11px]">
                        <div>
                          <div className="font-bold text-sm">{b.date} {b.time}</div>
                          <div>{b.name} • {b.phone}</div>
                          <div className="text-[#C29591]">{b.itemTitle} + {b.addonName} (NT${b.totalAmount})</div>
                        </div>
                        <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', b.id))} className="text-gray-300 hover:text-red-500"><Trash2 size={18}/></button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 款式上傳彈窗 */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[300] flex items-center justify-center p-4">
          <div className="bg-white p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="tracking-widest font-light">{editingItem ? '修改款式' : '上傳新款'}</h3>
              <button onClick={() => setIsUploadModalOpen(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleItemSubmit} className="space-y-6">
              <input type="text" required className="w-full border-b py-2 outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="款式名稱" />
              <div className="flex gap-4">
                <input type="number" required className="w-1/2 border-b py-2 outline-none" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="價格" />
                <input type="number" required className="w-1/2 border-b py-2 outline-none" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} placeholder="分鐘" />
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.images.map((img, i) => (
                  <div key={i} className="relative w-20 h-20 border">
                    <img src={img} className="w-full h-full object-cover" alt="preview" />
                    <button type="button" onClick={() => setFormData({...formData, images: formData.images.filter((_, idx) => idx !== i)})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"><X size={12}/></button>
                  </div>
                ))}
                <label className="w-20 h-20 border-2 border-dashed flex items-center justify-center cursor-pointer">
                  <Upload size={16} /><input type="file" hidden accept="image/*" multiple onChange={(e) => {
                    Array.from(e.target.files).forEach(file => {
                      const reader = new FileReader();
                      reader.onloadend = () => setFormData(p => ({...p, images: [...p.images, reader.result]}));
                      reader.readAsDataURL(file);
                    });
                  }} />
                </label>
              </div>
              <button disabled={isUploading} className="w-full bg-[#463E3E] text-white py-4 text-xs tracking-widest uppercase">{isUploading ? '處理中...' : '確認發布'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}