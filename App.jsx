import React, { useState, useEffect } from 'react';
import { Plus, X, Lock, Trash2, Edit3, Settings, Clock, CheckCircle, Upload, ChevronLeft, ChevronRight, Users, UserMinus, Search, Info, AlertTriangle, ShieldCheck } from 'lucide-react';
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
const CLEANING_TIME = 20;

const generateTimeSlots = () => {
  const slots = [];
  for (let h = 12; h <= 19; h++) {
    for (let m = 0; m < 60; m += 10) {
      if (h === 19 && m > 0) break;
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

const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// --- 子組件：款式卡片 ---
const StyleCard = ({ item, isLoggedIn, onEdit, onDelete, onBook, addons }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [localAddonId, setLocalAddonId] = useState('');
  const images = item.images && item.images.length > 0 ? item.images : ['https://via.placeholder.com/400x533'];

  const nextImg = (e) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev + 1) % images.length);
  };

  const prevImg = (e) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleBookingClick = () => {
    const selectedAddonObj = addons.find(a => a.id === localAddonId) || null;
    onBook(item, selectedAddonObj);
  };

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
            <button onClick={prevImg} className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/50 hover:bg-white/80 rounded-full z-10"><ChevronLeft size={20} /></button>
            <button onClick={nextImg} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/50 hover:bg-white/80 rounded-full z-10"><ChevronRight size={20} /></button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {images.map((_, i) => (<div key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentIdx ? 'bg-white' : 'bg-white/40'}`} />))}
            </div>
          </>
        )}
      </div>
      <div className="p-8 flex flex-col items-center text-center">
        <span className="text-[10px] text-[#C29591] tracking-[0.4em] uppercase mb-2 font-medium">{item.category}</span>
        <h3 className="text-[#463E3E] font-medium text-lg tracking-widest mb-1">{item.title}</h3>
        <div className="flex items-center gap-1.5 text-gray-400 text-[10px] mb-4 uppercase tracking-widest font-light"><Clock size={12} /> 預計服務：{item.duration || '90'} 分鐘</div>
        <p className="text-[#463E3E] font-bold text-xl mb-8"><span className="text-xs font-light tracking-widest mr-1">NT$</span>{item.price.toLocaleString()}</p>
        
        <select 
          className={`w-full text-[11px] border py-3 px-4 bg-[#FAF9F6] mb-8 outline-none text-[#463E3E] transition-colors ${!localAddonId ? 'border-red-200' : 'border-[#EAE7E2]'}`} 
          onChange={(e) => setLocalAddonId(e.target.value)}
          value={localAddonId}
        >
          <option value="">請選擇指甲現況 (必選)</option>
          {addons.map(a => (
            <option key={a.id} value={a.id}>
              {a.name} (+${a.price} / +{a.duration}分)
            </option>
          ))}
        </select>

        <button 
          disabled={!localAddonId} 
          onClick={handleBookingClick} 
          className="bg-[#463E3E] text-white px-8 py-3.5 rounded-full text-xs tracking-[0.2em] font-medium w-full hover:bg-[#C29591] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {!localAddonId ? '請先選擇現況' : '點此預約'}
        </button>
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
      
      const isPastOrToday = new Date(currentYear, currentMonth, d) <= today;
      
      const isDisabled = isShopHoliday || isAllOnLeave || isPastOrToday;
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
  const [priceFilter, setPriceFilter] = useState('全部');
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({ title: '', price: '', category: '極簡氣質', duration: '90', images: [] });

  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [searchResult, setSearchResult] = useState(null);

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

  const calcTotalDuration = () => (Number(selectedItem?.duration) || 90) + (Number(selectedAddon?.duration) || 0);

  const isTimeSlotFull = (date, checkTimeStr) => {
    if (!date || !checkTimeStr) return false;
    
    const todayStr = getTodayString();
    if (date === todayStr) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const checkMinutes = timeToMinutes(checkTimeStr);
      if (checkMinutes <= currentMinutes) return true;
    }
    
    const staffList = shopSettings.staff || [];
    const onLeaveCount = staffList.filter(s => (s.leaveDates || []).includes(date)).length;
    const availableStaffCount = staffList.length > 0 ? (staffList.length - onLeaveCount) : 1;

    const startA = timeToMinutes(checkTimeStr);
    const endA = startA + calcTotalDuration() + CLEANING_TIME;

    const concurrentBookings = allBookings.filter(b => {
      if (b.date !== date) return false;
      const startB = timeToMinutes(b.time);
      const endB = startB + (Number(b.totalDuration) || 90) + CLEANING_TIME;
      return (startA < endB) && (startB < endA);
    });

    return concurrentBookings.length >= availableStaffCount;
  };

  const findFirstAvailableTime = (targetDate) => {
    return TIME_SLOTS.find(slot => !isTimeSlotFull(targetDate, slot)) || '';
  };

  useEffect(() => {
    if (bookingStep === 'form' && bookingData.date) {
        if (!bookingData.time || isTimeSlotFull(bookingData.date, bookingData.time)) {
            const firstTime = findFirstAvailableTime(bookingData.date);
            if (firstTime) {
                setBookingData(prev => ({ ...prev, time: firstTime }));
            }
        }
    }
  }, [bookingStep, bookingData.date, allBookings]); 

  const saveShopSettings = async (newSettings) => {
    await setDoc(doc(db, 'artifacts', appId, 'public', 'settings'), newSettings);
  };

  const handleAddAddon = async (e) => {
    e.preventDefault();
    if(!addonForm.name || !addonForm.price) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'addons'), {
        ...addonForm,
        price: Number(addonForm.price),
        duration: Number(addonForm.duration || 0),
        createdAt: serverTimestamp()
      });
      setAddonForm({ name: '', price: '', duration: '' });
      alert('加購項目已新增');
    } catch (err) { alert("新增失敗：" + err.message); }
  };

  const handleConfirmBooking = async () => {
    setIsSubmitting(true);
    const finalAmount = (Number(selectedItem?.price) || 0) + (Number(selectedAddon?.price) || 0);
    const finalDuration = (Number(selectedItem?.duration) || 90) + (Number(selectedAddon?.duration) || 0);

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), {
        ...bookingData,
        itemTitle: selectedItem?.title,
        addonName: selectedAddon?.name || '無',
        totalAmount: finalAmount,
        totalDuration: finalDuration,
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

  const handleSearchBooking = (e) => {
    e.preventDefault();
    if(!searchName.trim() || !searchPhone.trim()) return;
    const results = allBookings.filter(b => 
      b.name === searchName.trim() && b.phone === searchPhone.trim()
    );
    results.sort((a,b) => new Date(`${b.date} ${b.time}`) - new Date(`${a.date} ${a.time}`));
    if (results.length > 0) {
       setSearchResult(results[0]); 
    } else {
       alert('查無預約資料，請確認姓名與電話是否正確');
       setSearchResult(null);
    }
  };

  const filteredItems = cloudItems.filter(item => {
    const matchStyle = styleFilter === '全部' || item.category === styleFilter;
    let matchPrice = true;
    if (priceFilter === '1300以下') matchPrice = item.price < 1300;
    else if (priceFilter === '1300-1900') matchPrice = item.price >= 1300 && item.price <= 1900;
    else if (priceFilter === '1900以上') matchPrice = item.price > 1900;
    return matchStyle && matchPrice;
  });

  const calcTotalAmount = () => (Number(selectedItem?.price) || 0) + (Number(selectedAddon?.price) || 0);

  const isNameInvalid = /\d/.test(bookingData.name);
  const isPhoneInvalid = bookingData.phone.length > 0 && bookingData.phone.length !== 10;
  const isFormValid = 
    bookingData.name.trim() !== '' && 
    !isNameInvalid &&
    bookingData.phone.length === 10 && 
    bookingData.time !== '';

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555] font-sans">
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-[#EAE7E2]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <h1 className="text-xl tracking-[0.4em] font-extralight cursor-pointer text-[#463E3E]" onClick={() => {setActiveTab('home'); setBookingStep('none');}}>UNIWAWA</h1>
          <div className="flex gap-6 text-sm tracking-widest font-medium uppercase items-center">
            <button onClick={() => {setActiveTab('home'); setBookingStep('none');}} className={activeTab === 'home' ? 'text-[#C29591]' : ''}>首頁</button>
            <button onClick={() => {setActiveTab('notice'); setBookingStep('none');}} className={activeTab === 'notice' ? 'text-[#C29591]' : ''}>須知</button>
            <button onClick={() => {setActiveTab('catalog'); setBookingStep('none');}} className={activeTab === 'catalog' ? 'text-[#C29591]' : ''}>款式</button>
            <button onClick={() => {setActiveTab('search'); setBookingStep('none'); setSearchResult(null); setSearchName(''); setSearchPhone('');}} className={activeTab === 'search' ? 'text-[#C29591]' : ''}>查詢</button>
            
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
          <div className="max-w-2xl mx-auto px-6 py-12">
            <h2 className="text-2xl font-light tracking-[0.3em] text-center mb-8 text-[#463E3E]">RESERVATION / 預約資訊</h2>
            <div className="bg-white border border-[#EAE7E2] mb-6 p-6 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                   <div className="w-24 h-24 flex-shrink-0 bg-gray-50 border border-[#F0EDEA]">
                      {selectedItem?.images?.[0] && <img src={selectedItem.images[0]} className="w-full h-full object-cover" alt="preview" />}
                   </div>
                   <div className="flex-1 space-y-1">
                    <p className="text-[10px] text-[#C29591] tracking-widest uppercase font-bold">預約項目</p>
                    <p className="text-sm font-medium">{selectedItem?.title} {selectedAddon ? `+ ${selectedAddon.name}` : ''}</p>
                    <p className="text-[10px] text-gray-400">
                        預計總時長: <span className="font-bold text-[#463E3E]">{calcTotalDuration()}</span> 分鐘
                    </p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] text-gray-400 tracking-widest uppercase">總金額 (含加購)</p>
                      <p className="text-lg font-bold text-[#463E3E]">NT$ {calcTotalAmount().toLocaleString()}</p>
                   </div>
                </div>
            </div>

            <div className="bg-white border border-[#EAE7E2] p-8 shadow-sm space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <input 
                    required 
                    type="text" 
                    placeholder="顧客姓名 (必填，不可含數字)" 
                    className={`w-full border-b py-2 outline-none ${isNameInvalid ? 'border-red-300 text-red-500' : !bookingData.name.trim() ? 'border-red-100' : 'border-gray-200'}`}
                    value={bookingData.name} 
                    onChange={e => setBookingData({...bookingData, name: e.target.value})} 
                  />
                  {isNameInvalid && <span className="absolute -bottom-5 left-0 text-[10px] text-red-500">姓名不可包含數字</span>}
                </div>
                
                <input 
                  required 
                  type="tel" 
                  placeholder="聯絡電話 (必填10碼數字)" 
                  className={`border-b py-2 outline-none ${isPhoneInvalid ? 'border-red-300 text-red-500' : ''}`}
                  value={bookingData.phone} 
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, ''); // 只允許數字
                    if(val.length <= 10) setBookingData({...bookingData, phone: val});
                  }} 
                />
              </div>

              <div className="flex justify-center pt-2">
                <CustomCalendar selectedDate={bookingData.date} 
                  onDateSelect={(d) => {
                    setBookingData({...bookingData, date: d, time: ''}); 
                  }} 
                  settings={shopSettings} />
              </div>
              
              {bookingData.date && (
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {TIME_SLOTS.map(t => (
                    <button key={t} disabled={isTimeSlotFull(bookingData.date, t)} onClick={() => setBookingData({...bookingData, time:t})} className={`py-2 text-[10px] border ${bookingData.time===t ? 'bg-[#463E3E] text-white' : 'bg-white disabled:opacity-20'}`}>{t}</button>
                  ))}
                </div>
              )}

              <button 
                disabled={isSubmitting || !isFormValid} 
                onClick={handleConfirmBooking} 
                className="w-full py-4 bg-[#463E3E] text-white text-xs tracking-widest uppercase disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '處理中...' : 
                 isNameInvalid ? '姓名不可包含數字' :
                 (!bookingData.name.trim()) ? '請填寫姓名' : 
                 (bookingData.phone.length !== 10) ? '電話需為10碼數字' : 
                 !bookingData.time ? '請選擇時間' : '確認送出預約'}
              </button>
            </div>
          </div>
        ) : bookingStep === 'success' ? (
          <div className="max-w-lg mx-auto py-12 px-6">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FAF9F6] mb-4">
                <CheckCircle size={32} className="text-[#C29591]" />
              </div>
              <h2 className="text-xl font-light tracking-[0.3em] text-[#463E3E] uppercase">Reservation Confirmed</h2>
              <p className="text-[10px] text-gray-400 mt-2 tracking-widest">您的預約已成功送出，期待與您相見</p>
            </div>

            <div className="bg-white border border-[#EAE7E2] shadow-lg shadow-gray-100/50 overflow-hidden relative">
              <div className="h-1 w-full bg-[#C29591]"></div>
              {selectedItem?.images?.[0] && (
                <div className="w-full h-56 relative bg-gray-50 group">
                  <img src={selectedItem.images[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="success" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#463E3E]/90 via-transparent to-transparent flex items-end p-6">
                    <div className="text-white">
                      <p className="text-[10px] tracking-[0.2em] opacity-80 uppercase mb-1">{selectedItem.category}</p>
                      <h3 className="text-lg font-medium tracking-wide">{selectedItem.title}</h3>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-8">
                <div className="bg-[#FAF9F6] border border-[#EAE7E2] p-4 text-center mb-8">
                  <p className="text-[10px] text-gray-400 tracking-widest uppercase mb-1">預約時間</p>
                  <div className="flex justify-center items-baseline gap-2 text-[#463E3E]">
                     <span className="text-lg font-bold tracking-widest">{bookingData.date}</span>
                     <span className="text-[#C29591]">•</span>
                     <span className="text-xl font-bold tracking-widest">{bookingData.time}</span>
                  </div>
                </div>

                <div className="space-y-4 text-xs tracking-wide text-[#5C5555]">
                  <div className="flex justify-between border-b border-dashed border-gray-100 pb-2">
                    <span className="text-gray-400">顧客姓名</span>
                    <span className="font-medium text-[#463E3E]">{bookingData.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-gray-100 pb-2">
                    <span className="text-gray-400">聯絡電話</span>
                    <span className="font-medium font-mono">{bookingData.phone}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-gray-100 pb-2">
                    <span className="text-gray-400">加購項目</span>
                    <span className="font-medium text-[#463E3E]">{selectedAddon ? selectedAddon.name : '無'}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-gray-100 pb-2">
                    <span className="text-gray-400">預計總時長</span>
                    <span className="font-medium text-[#463E3E]">
                      {calcTotalDuration()} 分鐘
                    </span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-[#EAE7E2] flex justify-between items-end">
                  <span className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">Total Amount</span>
                  <div className="text-2xl font-bold text-[#C29591] leading-none">
                    <span className="text-xs mr-1 text-gray-400 font-normal align-top mt-1 inline-block">NT$</span>
                    {calcTotalAmount().toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={() => {setBookingStep('none'); setActiveTab('home');}} 
              className="w-full mt-8 bg-[#463E3E] text-white py-4 text-xs tracking-[0.2em] font-medium hover:bg-[#C29591] transition-all duration-300 shadow-lg shadow-gray-200 uppercase"
            >
              回到首頁
            </button>
          </div>
        ) : activeTab === 'notice' ? (
          <div className="max-w-3xl mx-auto py-16 px-6">
            <h2 className="text-2xl font-light tracking-[0.3em] text-center mb-12 text-[#463E3E]">RESERVATION POLICY / 預約須知</h2>
            <div className="space-y-12">
              <div className="flex gap-6">
                <div className="flex-shrink-0 mt-1"><Info className="text-[#C29591]" size={24}/></div>
                <div>
                  <h4 className="text-sm font-bold tracking-widest text-[#463E3E] mb-2 uppercase">預約說明</h4>
                  <ul className="text-xs text-gray-500 space-y-2 leading-relaxed list-disc list-outside pl-4">
                    <li>本店採「網站預約制」，請依系統開放的時段與服務項目進行預約。</li>
                    <li>服務款式以網站上提供內容為主，暫不提供帶圖或客製設計服務。</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex-shrink-0 mt-1"><AlertTriangle className="text-[#C29591]" size={24}/></div>
                <div>
                  <h4 className="text-sm font-bold tracking-widest text-[#463E3E] mb-2 uppercase">服務限制</h4>
                  <ul className="text-xs text-gray-500 space-y-2 leading-relaxed list-disc list-outside pl-4">
                    <li>為了衛生與施作安全考量，恕不提供病甲（如黴菌感染、卷甲、崁甲、灰指甲等）相關服務，敬請理解。</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex-shrink-0 mt-1"><Clock className="text-[#C29591]" size={24}/></div>
                <div>
                  <h4 className="text-sm font-bold tracking-widest text-[#463E3E] mb-2 uppercase">守時與更動</h4>
                  <ul className="text-xs text-gray-500 space-y-2 leading-relaxed list-disc list-outside pl-4">
                    <li>若遲到超過 <span className="font-bold text-[#463E3E]">10 分鐘</span>，將視當日狀況調整服務內容。</li>
                    <li>遲到或其他相關問題請聯絡 LINE 官方客服。LINE 僅協助處理當日狀況，恕不作為預約管道。</li>
                    <li>如需取消或改期，請於 <span className="font-bold text-[#463E3E]">預約 24 小時前</span> 告知。</li>
                    <li>未提前取消或無故未到者，將無法再接受後續預約，謝謝您的體諒。</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex-shrink-0 mt-1"><ShieldCheck className="text-[#C29591]" size={24}/></div>
                <div>
                  <h4 className="text-sm font-bold tracking-widest text-[#463E3E] mb-2 uppercase">保固服務</h4>
                  <ul className="text-xs text-gray-500 space-y-2 leading-relaxed list-disc list-outside pl-4">
                    <li>施作後 7 日內非人為因素脫落，可協助免費補修，補修請提前預約。</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'search' ? ( 
          <div className="max-w-lg mx-auto py-12 px-6">
             <div className="text-center mb-12">
                <h2 className="text-xl font-light tracking-[0.3em] text-[#463E3E] uppercase mb-2">Check Booking</h2>
                <p className="text-[10px] text-gray-400 tracking-widest">請輸入預約時的姓名與電話以查詢</p>
             </div>

             <form onSubmit={handleSearchBooking} className="flex flex-col gap-4 mb-12 bg-white p-8 border border-[#EAE7E2] shadow-sm">
               <input 
                 type="text" 
                 placeholder="預約姓名 (Name)" 
                 className="border-b border-[#EAE7E2] py-3 px-2 outline-none bg-transparent focus:border-[#C29591] text-xs"
                 value={searchName}
                 onChange={e => setSearchName(e.target.value)}
               />
               <input 
                 type="tel" 
                 placeholder="預約電話 (Phone)" 
                 className="border-b border-[#EAE7E2] py-3 px-2 outline-none bg-transparent focus:border-[#C29591] text-xs"
                 value={searchPhone}
                 onChange={e => setSearchPhone(e.target.value)}
               />
               <button className="bg-[#463E3E] text-white w-full py-3 mt-2 text-xs tracking-widest hover:bg-[#C29591] transition-colors flex items-center justify-center gap-2">
                 <Search size={14}/> 查詢預約
               </button>
             </form>

             {searchResult && (
                <div className="bg-white border border-[#EAE7E2] shadow-lg shadow-gray-100/50 overflow-hidden relative fade-in">
                  <div className="h-1 w-full bg-[#C29591]"></div>
                  {(() => {
                    const linkedItem = cloudItems.find(i => i.title === searchResult.itemTitle);
                    return linkedItem?.images?.[0] ? (
                      <div className="w-full h-40 relative bg-gray-50 group">
                        <img src={linkedItem.images[0]} className="w-full h-full object-cover" alt="booked-item" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#463E3E]/90 via-transparent to-transparent flex items-end p-4">
                          <div className="text-white">
                            <p className="text-[10px] tracking-[0.2em] opacity-80 uppercase mb-1">{linkedItem.category}</p>
                            <h3 className="text-sm font-medium tracking-wide">{searchResult.itemTitle}</h3>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  <div className="p-8">
                    <div className="bg-[#FAF9F6] border border-[#EAE7E2] p-4 text-center mb-8">
                      <p className="text-[10px] text-gray-400 tracking-widest uppercase mb-1">預約時間</p>
                      <div className="flex justify-center items-baseline gap-2 text-[#463E3E]">
                        <span className="text-lg font-bold tracking-widest">{searchResult.date}</span>
                        <span className="text-[#C29591]">•</span>
                        <span className="text-xl font-bold tracking-widest">{searchResult.time}</span>
                      </div>
                    </div>

                    <div className="space-y-4 text-xs tracking-wide text-[#5C5555]">
                      <div className="flex justify-between border-b border-dashed border-gray-100 pb-2">
                        <span className="text-gray-400">顧客姓名</span>
                        <span className="font-medium text-[#463E3E]">{searchResult.name}</span>
                      </div>
                      <div className="flex justify-between border-b border-dashed border-gray-100 pb-2">
                        <span className="text-gray-400">聯絡電話</span>
                        <span className="font-medium font-mono">{searchResult.phone}</span>
                      </div>
                      <div className="flex justify-between border-b border-dashed border-gray-100 pb-2">
                        <span className="text-gray-400">加購項目</span>
                        <span className="font-medium text-[#463E3E]">{searchResult.addonName}</span>
                      </div>
                      <div className="flex justify-between border-b border-dashed border-gray-100 pb-2">
                        <span className="text-gray-400">預計總時長</span>
                        <span className="font-medium text-[#463E3E]">{searchResult.totalDuration} 分鐘</span>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-[#EAE7E2] flex justify-between items-end">
                      <span className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">Total Amount</span>
                      <div className="text-2xl font-bold text-[#C29591] leading-none">
                        <span className="text-xs mr-1 text-gray-400 font-normal align-top mt-1 inline-block">NT$</span>
                        {searchResult.totalAmount?.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
             )}
          </div>
        ) : activeTab === 'home' ? (
          <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-6 text-center">
            <span className="text-[#C29591] tracking-[0.4em] md:tracking-[0.8em] text-xs md:text-sm mb-10 uppercase font-extralight">EST. 2026 • TAOYUAN</span>
            <div className="w-full max-w-xl mb-12 shadow-2xl rounded-sm overflow-hidden border border-[#EAE7E2]">
              <img src="https://drive.google.com/thumbnail?id=1ZJv3DS8ST_olFt0xzKB_miK9UKT28wMO&sz=w1200" className="w-full h-auto max-h-[40vh] object-cover" alt="home" />
            </div>
            <h2 className="text-4xl md:text-5xl font-extralight mb-12 tracking-[0.4em] text-[#463E3E] leading-relaxed">Pure Art</h2>
            <button onClick={() => setActiveTab('catalog')} className="bg-[#463E3E] text-white px-16 py-4 tracking-[0.4em] text-xs font-light">點此預約</button>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
            <div className="flex flex-col gap-6 border-b border-[#EAE7E2] pb-8 mb-8">
                <div className="flex flex-wrap gap-4 justify-center items-center">
                   <span className="text-[10px] text-gray-300 tracking-widest mr-2">STYLE</span>
                   {STYLE_CATEGORIES.map(c => (
                     <button key={c} onClick={() => setStyleFilter(c)} className={`text-xs tracking-widest px-4 py-1 transition-all duration-300 ${styleFilter===c ? 'text-[#C29591] font-bold border-b border-[#C29591]' : 'text-gray-400 hover:text-[#463E3E]'}`}>{c}</button>
                   ))}
                </div>

                <div className="flex flex-wrap gap-4 justify-center items-center">
                   <span className="text-[10px] text-gray-300 tracking-widest mr-2">PRICE</span>
                   {PRICE_CATEGORIES.map(p => (
                     <button key={p} onClick={() => setPriceFilter(p)} className={`text-xs tracking-widest px-4 py-1 transition-all duration-300 ${priceFilter===p ? 'text-[#C29591] font-bold border-b border-[#C29591]' : 'text-gray-400 hover:text-[#463E3E]'}`}>{p}</button>
                   ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16">
              {filteredItems.map(item => (
                <StyleCard key={item.id} item={item} isLoggedIn={isLoggedIn}
                  onEdit={(i) => {setEditingItem(i); setFormData(i); setIsUploadModalOpen(true);}}
                  onDelete={(id) => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', id))}
                  onBook={(i, addon) => { 
                    setSelectedItem(i); 
                    setSelectedAddon(addon); 
                    setBookingStep('form'); 
                    window.scrollTo(0,0); 
                  }}
                  addons={addons}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 管理者登入 */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[250] flex items-center justify-center p-4">
          <div className="bg-white p-10 max-w-sm w-full shadow-2xl">
            <h3 className="tracking-[0.5em] mb-10 font-light text-gray-400 text-sm uppercase text-center">Admin Access</h3>
            <form onSubmit={(e) => { e.preventDefault(); if(passwordInput==="8888") setIsLoggedIn(true); setIsAdminModalOpen(false); }}>
              <input type="password" placeholder="••••" className="w-full border-b py-4 text-center tracking-[1.5em] outline-none" onChange={e => setPasswordInput(e.target.value)} autoFocus />
              <button className="w-full bg-[#463E3E] text-white py-4 mt-6 text-xs tracking-widest">ENTER</button>
            </form>
          </div>
        </div>
      )}

      {/* 管理彈窗：包含人員與【加購品設定】 */}
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
                  <p className="text-[10px] text-gray-400 mt-1">設定如「卸甲」、「延甲」等額外服務的金額與所需時間，顧客預約時可選。</p>
                </div>
                <form onSubmit={handleAddAddon} className="bg-[#FAF9F6] p-5 border border-[#EAE7E2] grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">名稱 (如：現場卸甲)</label>
                    <input type="text" className="w-full border p-2 text-xs outline-none focus:border-[#C29591]" placeholder="項目名稱" value={addonForm.name} onChange={e => setAddonForm({...addonForm, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">加價金額 (NT$)</label>
                    <input type="number" className="w-full border p-2 text-xs outline-none focus:border-[#C29591]" placeholder="0" value={addonForm.price} onChange={e => setAddonForm({...addonForm, price: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">所需時間 (分鐘)</label>
                    <input type="number" className="w-full border p-2 text-xs outline-none focus:border-[#C29591]" placeholder="0" value={addonForm.duration} onChange={e => setAddonForm({...addonForm, duration: e.target.value})} />
                  </div>
                  <button className="bg-[#463E3E] text-white py-2.5 text-[10px] tracking-widest uppercase hover:bg-[#C29591] transition-colors">新增項目</button>
                </form>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {addons.map(addon => (
                    <div key={addon.id} className="border border-[#EAE7E2] p-4 flex justify-between items-center bg-white shadow-sm hover:border-[#C29591] transition-colors">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-[#463E3E]">{addon.name}</div>
                        <div className="text-[10px] text-gray-400">+ NT$ {addon.price} / + {addon.duration} 分鐘</div>
                      </div>
                      <button onClick={() => { if(confirm('確定刪除此加購項？')) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'addons', addon.id)); }}>
                        <Trash2 size={14} className="text-gray-300 hover:text-red-500 transition-colors"/>
                      </button>
                    </div>
                  ))}
                  {addons.length === 0 && <p className="text-[10px] text-gray-300 col-span-full text-center py-4">目前沒有設定任何加購項目</p>}
                </div>
              </section>

              <section className="space-y-6 pt-6 border-t border-dashed">
                <div className="flex justify-between items-center border-l-4 border-[#C29591] pl-4">
                  <div>
                    <h4 className="text-sm font-bold tracking-widest text-[#463E3E]">人員名單與請假</h4>
                    <p className="text-[10px] text-gray-400 mt-1">設定美甲師名稱，系統會根據剩餘上班人數決定預約上限</p>
                  </div>
                  <button onClick={() => {
                    const name = prompt("請輸入美甲師姓名：");
                    if(name) saveShopSettings({ ...shopSettings, staff: [...(shopSettings.staff || []), { id: Date.now().toString(), name, leaveDates: [] }] });
                  }} className="text-[10px] bg-[#C29591] text-white px-4 py-2 rounded-full hover:bg-[#463E3E] transition-colors">+ 新增人員</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(shopSettings.staff || []).map(staff => (
                    <div key={staff.id} className="bg-[#FAF9F6] border border-[#EAE7E2] p-5 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold flex items-center gap-2"><Users size={14} className="text-[#C29591]"/> {staff.name}</span>
                        <button onClick={() => {
                          if(confirm(`確定刪除 ${staff.name}？`)) saveShopSettings({ ...shopSettings, staff: shopSettings.staff.filter(s => s.id !== staff.id) });
                        }}><Trash2 size={14} className="text-gray-300 hover:text-red-500"/></button>
                      </div>
                      <div className="space-y-2 border-t pt-4">
                        <label className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><UserMinus size={12}/> 設定請假</label>
                        <input type="date" className="text-[10px] border p-2 w-full outline-none focus:border-[#C29591]" onChange={(e) => {
                          if(!e.target.value) return;
                          const updatedStaff = shopSettings.staff.map(s => {
                            if(s.id === staff.id) {
                              const currentLeaves = s.leaveDates || [];
                              return { ...s, leaveDates: currentLeaves.includes(e.target.value) ? currentLeaves : [...currentLeaves, e.target.value].sort() };
                            }
                            return s;
                          });
                          saveShopSettings({ ...shopSettings, staff: updatedStaff });
                        }} />
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(staff.leaveDates || []).map(d => (
                            <span key={d} className="text-[9px] bg-red-50 text-red-500 px-2 py-1 flex items-center gap-1 rounded-sm border border-red-100">
                              {d} <X size={10} className="cursor-pointer" onClick={() => {
                                const updatedStaff = shopSettings.staff.map(s => {
                                  if(s.id === staff.id) return { ...s, leaveDates: s.leaveDates.filter(ld => ld !== d) };
                                  return s;
                                });
                                saveShopSettings({ ...shopSettings, staff: updatedStaff });
                              }}/>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 border-t border-dashed pt-6">
                <section className="space-y-6">
                    <h4 className="text-sm font-bold tracking-widest border-l-4 border-[#C29591] pl-4 uppercase">全店公休日設定</h4>
                    <div className="flex gap-2">
                      <input type="date" className="flex-1 p-2 border text-xs outline-none focus:border-[#C29591]" value={newHolidayInput} onChange={e => setNewHolidayInput(e.target.value)} />
                      <button onClick={() => { if(!newHolidayInput) return; saveShopSettings({...shopSettings, specificHolidays: [...(shopSettings.specificHolidays || []), newHolidayInput].sort()}); setNewHolidayInput(''); }} className="bg-[#463E3E] text-white px-4 text-[10px] hover:bg-[#C29591] transition-colors">新增</button>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                      {(shopSettings.specificHolidays || []).map(date => (
                        <span key={date} className="text-[10px] bg-gray-100 text-gray-500 px-3 py-1.5 border flex items-center gap-2">
                          {date} <X size={12} className="cursor-pointer" onClick={() => saveShopSettings({...shopSettings, specificHolidays: shopSettings.specificHolidays.filter(d => d !== date)})} />
                        </span>
                      ))}
                    </div>
                </section>

                <section className="space-y-6">
                  <h4 className="text-sm font-bold tracking-widest border-l-4 border-[#C29591] pl-4 uppercase">現有預約</h4>
                  <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                    {allBookings.map(b => (
                      <div key={b.id} className="border p-4 flex justify-between items-center bg-[#FAF9F6] text-[11px] hover:border-[#C29591] transition-colors">
                        <div>
                          <div className="font-bold text-sm">{b.date} {b.time}</div>
                          <div>{b.name} • {b.phone}</div>
                          <div className="text-[#C29591] mt-1">
                            {b.itemTitle} 
                            {b.addonName && b.addonName !== '無' ? <span className="text-[#463E3E]"> + {b.addonName}</span> : ''}
                          </div>
                          <div className="text-gray-400 mt-0.5">總額: NT${b.totalAmount}</div>
                        </div>
                        <button onClick={() => { if(confirm('確定取消此預約？')) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', b.id)); }} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                      </div>
                    ))}
                    {allBookings.length === 0 && <p className="text-center text-gray-300 text-xs py-4">目前沒有預約</p>}
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
              <div className="space-y-2">
                 <label className="text-xs text-gray-400">風格分類</label>
                 <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full border-b py-2 outline-none bg-white">
                   {STYLE_CATEGORIES.filter(c => c!=='全部').map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.images.map((img, i) => (
                  <div key={i} className="relative w-20 h-20 border">
                    <img src={img} className="w-full h-full object-cover" alt="upload-preview" />
                    <button type="button" onClick={() => setFormData({...formData, images: formData.images.filter((_, idx) => idx !== i)})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"><X size={12}/></button>
                  </div>
                ))}
                <label className="w-20 h-20 border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-[#C29591] text-gray-400 hover:text-[#C29591] transition-colors">
                  <Upload size={16} /><input type="file" hidden accept="image/*" multiple onChange={(e) => {
                    Array.from(e.target.files).forEach(file => {
                      const reader = new FileReader();
                      reader.onloadend = () => setFormData(p => ({...p, images: [...p.images, reader.result]}));
                      reader.readAsDataURL(file);
                    });
                  }} />
                </label>
              </div>
              <button disabled={isUploading} className="w-full bg-[#463E3E] text-white py-4 text-xs tracking-widest uppercase hover:bg-[#C29591] transition-colors">{isUploading ? '處理中...' : '確認發布'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}