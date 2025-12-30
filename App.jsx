import React, { useState, useEffect, useMemo } from 'react';
import { Plus, X, Lock, Trash2, Edit3, Settings, Clock, CheckCircle, Upload, ChevronLeft, ChevronRight, Users, UserMinus, Search, Info, AlertTriangle, ShieldCheck, Calendar, Briefcase, Tag, List as ListIcon, Grid, Download, Store, Filter, MapPin, CreditCard } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, query, orderBy, setDoc } from 'firebase/firestore';

// --- Firebase 配置 (請保持您原本的設定) ---
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
const DEFAULT_CLEANING_TIME = 20;
const MAX_BOOKING_DAYS = 30;

// 產生 12:00 - 19:00 的時段
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

// --- 核心演算法：檢查特定時段是否可用 ---
// 這是一個純函數，不依賴組件 state，確保計算準確
// 邏輯修正：佔用時間 = 服務時間 + 整備時間
const checkSlotAvailability = (params) => {
  const { 
    targetDate, 
    targetTime, 
    storeId, 
    serviceDuration, // (商品+加購)
    cleaningTime,    // 該店整備時間
    staffList, 
    allBookings,
    holidays
  } = params;

  if (!targetDate || !targetTime || !storeId) return false;

  // 1. 檢查是否為過去時間
  const todayStr = getTodayString();
  if (targetDate < todayStr) return false;
  if (targetDate === todayStr) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    // 如果是當天，必須比現在時間晚至少 30 分鐘才能預約
    if (timeToMinutes(targetTime) < currentMinutes + 30) return false; 
  }

  // 2. 檢查公休日
  const isGlobalHoliday = holidays.some(h => h.date === targetDate && h.storeId === 'all');
  const isStoreHoliday = holidays.some(h => h.date === targetDate && String(h.storeId) === String(storeId));
  if (isGlobalHoliday || isStoreHoliday) return false;

  // 3. 計算該店當日可用人力
  const storeStaff = staffList.filter(s => String(s.storeId) === String(storeId));
  const onLeaveCount = storeStaff.filter(s => (s.leaveDates || []).includes(targetDate)).length;
  const totalAvailableStaff = storeStaff.length - onLeaveCount;

  if (totalAvailableStaff <= 0) return false; // 無人上班

  // 4. 計算「新預約」的時間區間 [start, end]
  // 核心修正：結束時間必須包含整備時間
  const newStart = timeToMinutes(targetTime);
  const newEnd = newStart + serviceDuration + cleaningTime;

  // 5. 計算「現有訂單」的重疊數量
  const concurrentBookings = allBookings.filter(b => {
    if (b.date !== targetDate) return false;
    if (String(b.storeId) !== String(storeId)) return false;

    const existingStart = timeToMinutes(b.time);
    const existingDuration = Number(b.totalDuration) || 90; 
    // 核心修正：舊訂單也要加上整備時間才算釋出資源
    const existingEnd = existingStart + existingDuration + cleaningTime;

    // 判斷重疊公式：(StartA < EndB) && (StartB < EndA)
    return (newStart < existingEnd) && (existingStart < newEnd);
  });

  // 6. 如果重疊訂單數 >= 可用人力，則該時段額滿
  return concurrentBookings.length < totalAvailableStaff;
};


// --- 子組件：款式卡片 ---
const StyleCard = ({ item, isLoggedIn, onEdit, onDelete, onBook, addons }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [localAddonId, setLocalAddonId] = useState('');
  const images = item.images && item.images.length > 0 ? item.images : ['https://via.placeholder.com/400x533'];

  const nextImg = (e) => { e.stopPropagation(); setCurrentIdx((prev) => (prev + 1) % images.length); };
  const prevImg = (e) => { e.stopPropagation(); setCurrentIdx((prev) => (prev - 1 + images.length) % images.length); };

  return (
    <div className="group flex flex-col bg-white border border-[#F0EDEA] shadow-sm relative">
      {isLoggedIn && (
        <div className="absolute top-4 right-4 flex gap-2 z-[30]">
          <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-2 bg-white/90 rounded-full text-blue-600 shadow-sm hover:scale-110"><Edit3 size={16}/></button>
          <button onClick={(e) => { e.stopPropagation(); if(confirm('確定刪除？')) onDelete(item.id); }} className="p-2 bg-white/90 rounded-full text-red-600 shadow-sm hover:scale-110"><Trash2 size={16}/></button>
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
        <span className="text-xs text-[#C29591] tracking-[0.3em] uppercase mb-2 font-medium">{item.category}</span>
        <h3 className="text-[#463E3E] font-medium text-lg tracking-widest mb-1">{item.title}</h3>
        <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-4 uppercase tracking-widest font-light"><Clock size={14} /> 預計服務：{item.duration || '90'} 分鐘</div>
        <p className="text-[#463E3E] font-bold text-xl mb-8"><span className="text-xs font-light tracking-widest mr-1">NT$</span>{item.price.toLocaleString()}</p>
        
        <select className={`w-full text-sm border py-3 px-4 bg-[#FAF9F6] mb-8 outline-none text-[#463E3E] ${!localAddonId ? 'border-red-200' : 'border-[#EAE7E2]'}`} onChange={(e) => setLocalAddonId(e.target.value)} value={localAddonId}>
          <option value="">請選擇指甲現況 (必選)</option>
          {addons.map(a => <option key={a.id} value={a.id}>{a.name} (+${a.price} / +{a.duration}分)</option>)}
        </select>

        <button disabled={!localAddonId} onClick={() => onBook(item, addons.find(a => a.id === localAddonId) || null)} className="bg-[#463E3E] text-white px-8 py-3.5 rounded-full text-xs tracking-[0.2em] font-medium w-full hover:bg-[#C29591] transition-colors disabled:opacity-50 disabled:bg-gray-300">
          {!localAddonId ? '請先選擇現況' : '點此預約'}
        </button>
      </div>
    </div>
  );
};

// --- 子組件：月曆 ---
const CustomCalendar = ({ selectedDate, onDateSelect, isDateFullFunc }) => {
  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => { if (selectedDate) setViewDate(new Date(selectedDate)); }, [selectedDate]);

  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const today = new Date(); today.setHours(0,0,0,0);
  const maxDate = new Date(today); maxDate.setDate(today.getDate() + MAX_BOOKING_DAYS);

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="w-full aspect-square"></div>);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const targetDate = new Date(currentYear, currentMonth, d);
      
      const isPast = targetDate < today;
      const isTooFar = targetDate > maxDate;
      const isFullOrHoliday = isDateFullFunc ? isDateFullFunc(dateStr) : false;
      const isDisabled = isPast || isTooFar || isFullOrHoliday;
      const isSelected = selectedDate === dateStr;

      days.push(
        <button key={d} disabled={isDisabled} onClick={() => onDateSelect(dateStr)}
          className={`w-full aspect-square text-sm rounded-full flex items-center justify-center transition-all ${isDisabled ? 'text-gray-300 line-through cursor-not-allowed' : isSelected ? 'bg-[#463E3E] text-white' : 'hover:bg-[#C29591] hover:text-white'}`}>
          {d}
        </button>
      );
    }
    return days;
  };

  return (
    <div className="w-full max-w-md bg-white border border-[#EAE7E2] p-6 shadow-sm mx-auto">
      <div className="flex justify-between items-center mb-6 px-2">
        <h4 className="text-sm font-bold tracking-widest text-[#463E3E]">{currentYear}年 {currentMonth + 1}月</h4>
        <div className="flex gap-2">
          <button onClick={() => setViewDate(new Date(currentYear, currentMonth - 1, 1))}><ChevronLeft size={18}/></button>
          <button onClick={() => setViewDate(new Date(currentYear, currentMonth + 1, 1))}><ChevronRight size={18}/></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 mb-2">{WEEKDAYS.map(w => <div key={w} className="w-full aspect-square flex items-center justify-center text-xs text-gray-400 font-bold">{w}</div>)}</div>
      <div className="grid grid-cols-7 gap-2">{renderDays()}</div>
    </div>
  );
};

// --- 子組件：後台管理月曆 (完整版) ---
const AdminBookingCalendar = ({ bookings, onDateSelect, selectedDate }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="w-full aspect-square"></div>);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hasBooking = bookings.some(b => b.date === dateStr);
      const isSelected = selectedDate === dateStr;
      days.push(
        <button key={d} onClick={() => onDateSelect(dateStr)} className={`w-full aspect-square text-xs rounded-lg flex flex-col items-center justify-center gap-1 border ${isSelected ? 'border-[#C29591] bg-[#FAF9F6] text-[#C29591] font-bold' : 'border-transparent hover:bg-gray-50'}`}>
          <span>{d}</span>{hasBooking && <span className="w-1.5 h-1.5 rounded-full bg-[#C29591]"></span>}
        </button>
      );
    }
    return days;
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white border border-[#EAE7E2] p-4 md:p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6 px-2">
        <h4 className="text-sm font-bold tracking-widest text-[#463E3E]">{currentYear}年 {currentMonth + 1}月</h4>
        <div className="flex gap-2">
          <button onClick={() => setViewDate(new Date(currentYear, currentMonth - 1, 1))}><ChevronLeft size={18}/></button>
          <button onClick={() => setViewDate(new Date(currentYear, currentMonth + 1, 1))}><ChevronRight size={18}/></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">{WEEKDAYS.map(w => <div key={w} className="h-10 flex items-center justify-center text-[10px] text-gray-400 font-bold">{w}</div>)}</div>
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
  const [shopSettings, setShopSettings] = useState({ stores: [], staff: [], holidays: [] });
  
  // 管理後台 State
  const [managerTab, setManagerTab] = useState('stores'); 
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isBookingManagerOpen, setIsBookingManagerOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [newStoreInput, setNewStoreInput] = useState('');
  const [newHolidayInput, setNewHolidayInput] = useState({ date: '', storeId: 'all' });
  const [addonForm, setAddonForm] = useState({ name: '', price: '', duration: '' });
  const [adminSelectedStore, setAdminSelectedStore] = useState('all');
  const [bookingViewMode, setBookingViewMode] = useState('list');
  const [adminSelectedDate, setAdminSelectedDate] = useState(getTodayString());

  // 前台預約 State
  const [bookingStep, setBookingStep] = useState('none');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedAddon, setSelectedAddon] = useState(null);
  const [bookingData, setBookingData] = useState({ name: '', phone: '', date: '', time: '', storeId: '', paymentMethod: '門市付款' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 查詢與篩選 State
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [styleFilter, setStyleFilter] = useState('全部');
  const [priceFilter, setPriceFilter] = useState('全部');
  const [editingItem, setEditingItem] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({ title: '', price: '', category: '極簡氣質', duration: '90', images: [] });

  // --- 初始化 ---
  useEffect(() => { signInAnonymously(auth); onAuthStateChanged(auth, u => setUser(u)); }, []);

  useEffect(() => {
    if (!user) return;
    const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'settings'), (d) => {
      if (d.exists()) setShopSettings({ stores: d.data().stores || [], staff: d.data().staff || [], holidays: d.data().holidays || [] });
    });
    const unsubItems = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), (s) => setCloudItems(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubAddons = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'addons'), (s) => setAddons(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubBookings = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), orderBy('createdAt', 'desc')), (s) => setAllBookings(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubSettings(); unsubItems(); unsubAddons(); unsubBookings(); };
  }, [user]);

  // --- 計算屬性 ---
  const currentServiceDuration = useMemo(() => (Number(selectedItem?.duration) || 90) + (Number(selectedAddon?.duration) || 0), [selectedItem, selectedAddon]);
  const currentStoreCleaningTime = useMemo(() => {
    const s = shopSettings.stores.find(i => String(i.id) === String(bookingData.storeId));
    return Number(s?.cleaningTime) || DEFAULT_CLEANING_TIME;
  }, [shopSettings.stores, bookingData.storeId]);

  // --- 判斷某日是否全滿 (用於月曆顯示) ---
  const isDateFull = (dateStr) => {
    if (!bookingData.storeId) return true;
    return !TIME_SLOTS.some(time => 
      checkSlotAvailability({
        targetDate: dateStr, targetTime: time, storeId: bookingData.storeId,
        serviceDuration: currentServiceDuration, cleaningTime: currentStoreCleaningTime,
        staffList: shopSettings.staff, allBookings: allBookings, holidays: shopSettings.holidays
      })
    );
  };

  // --- 判斷特定時段是否可用 (用於時間按鈕) ---
  const isTimeSlotAvailable = (dateStr, timeStr) => {
    return checkSlotAvailability({
      targetDate: dateStr, targetTime: timeStr, storeId: bookingData.storeId,
      serviceDuration: currentServiceDuration, cleaningTime: currentStoreCleaningTime,
      staffList: shopSettings.staff, allBookings: allBookings, holidays: shopSettings.holidays
    });
  };

  // --- 【自動跳轉邏輯】 ---
  useEffect(() => {
    if (bookingStep === 'form' && bookingData.storeId && !bookingData.date) {
      if (shopSettings.stores.length === 0) return;
      const today = new Date();
      
      // 搜尋未來 30 天
      for (let i = 0; i < MAX_BOOKING_DAYS; i++) {
        const d = new Date(today); d.setDate(today.getDate() + i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        // 逐一檢查該日的每個時段
        for (const timeStr of TIME_SLOTS) {
          const isAvailable = checkSlotAvailability({
            targetDate: dateStr, targetTime: timeStr, storeId: bookingData.storeId,
            serviceDuration: currentServiceDuration, cleaningTime: currentStoreCleaningTime,
            staffList: shopSettings.staff, allBookings: allBookings, holidays: shopSettings.holidays
          });
          if (isAvailable) {
            setBookingData(prev => ({ ...prev, date: dateStr, time: timeStr }));
            return; // 找到第一個就結束
          }
        }
      }
    }
  }, [bookingStep, bookingData.storeId, bookingData.date, currentServiceDuration, currentStoreCleaningTime, shopSettings, allBookings]);

  // --- 處理函數 ---
  const handleConfirmBooking = async () => {
    setIsSubmitting(true);
    const finalAmount = (Number(selectedItem?.price) || 0) + (Number(selectedAddon?.price) || 0);
    const selectedStore = shopSettings.stores.find(s => s.id === bookingData.storeId);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), {
        ...bookingData, storeName: selectedStore ? selectedStore.name : '未指定',
        itemTitle: selectedItem?.title, addonName: selectedAddon?.name || '無',
        totalAmount: finalAmount, totalDuration: currentServiceDuration, createdAt: serverTimestamp()
      });
      setBookingStep('success');
    } catch (e) { alert('預約失敗'); } finally { setIsSubmitting(false); }
  };

  const saveShopSettings = async (newSettings) => await setDoc(doc(db, 'artifacts', appId, 'public', 'settings'), newSettings);
  const handleAddAddon = async (e) => { e.preventDefault(); await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'addons'), { ...addonForm, price: Number(addonForm.price), duration: Number(addonForm.duration||0), createdAt: serverTimestamp() }); setAddonForm({name:'',price:'',duration:''}); };
  const handleItemSubmit = async (e) => { e.preventDefault(); setIsUploading(true); try { const payload = { ...formData, price: Number(formData.price), duration: Number(formData.duration), updatedAt: serverTimestamp() }; if (editingItem) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', editingItem.id), payload); else await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), { ...payload, createdAt: serverTimestamp() }); setIsUploadModalOpen(false); setFormData({ title: '', price: '', category: '極簡氣質', duration: '90', images: [] }); } catch (err) { alert(err.message); } finally { setIsUploading(false); } };
  const handleSearchBooking = (e) => { e.preventDefault(); const res = allBookings.filter(b => b.name === searchName.trim() && b.phone === searchPhone.trim()).sort((a,b) => new Date(`${b.date} ${b.time}`) - new Date(`${a.date} ${a.time}`)); if(res.length>0) setSearchResult(res[0]); else { alert('查無資料'); setSearchResult(null); } };

  // 後台數據過濾
  const storeFilteredBookings = allBookings.filter(b => adminSelectedStore === 'all' || String(b.storeId) === String(adminSelectedStore)).sort((a, b) => new Date(`${a.date} ${a.time}`) - new Date(`${b.date} ${b.time}`));
  const dateFilteredBookings = adminSelectedDate ? storeFilteredBookings.filter(b => b.date === adminSelectedDate) : storeFilteredBookings;
  const handleExportCSV = () => {
    const csvContent = ['日期,時間,門市,姓名,電話,項目,加購,金額,時長,付款'].join(',') + '\n' + storeFilteredBookings.map(b => [b.date,b.time,b.storeName,b.name,b.phone,b.itemTitle,b.addonName,b.totalAmount,b.totalDuration,b.paymentMethod].join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = `預約_${getTodayString()}.csv`; link.click();
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555] font-sans">
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-[#EAE7E2]">
        {/* 手機版置中修正: items-center, justify-center */}
        <div className="max-w-7xl mx-auto px-6 py-4 md:py-0 md:h-20 flex flex-col md:flex-row items-center justify-between transition-all duration-300">
          <h1 className="text-2xl md:text-3xl tracking-[0.4em] font-extralight cursor-pointer text-[#463E3E] mb-4 md:mb-0 w-full md:w-auto text-center md:text-left" onClick={() => {setActiveTab('home'); setBookingStep('none');}}>UNIWAWA</h1>
          <div className="flex gap-3 md:gap-6 text-xs md:text-sm tracking-widest font-medium uppercase items-center justify-center md:justify-end w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
            {['home', 'notice', 'catalog', 'search', 'store'].map(tab => (
              <button key={tab} onClick={() => {setActiveTab(tab); setBookingStep('none'); if(tab==='search') setSearchResult(null);}} className={`flex-shrink-0 ${activeTab === tab ? 'text-[#C29591]' : ''}`}>
                {tab === 'home' ? '首頁' : tab === 'notice' ? '須知' : tab === 'catalog' ? '款式' : tab === 'search' ? '查詢' : '門市'}
              </button>
            ))}
            {isLoggedIn ? (
              <div className="flex gap-4 border-l pl-4 border-[#EAE7E2] flex-shrink-0">
                <button onClick={() => {setEditingItem(null); setFormData({title:'', price:'', category:'極簡氣質', duration:'90', images:[]}); setIsUploadModalOpen(true)}} className="text-[#C29591]"><Plus size={18}/></button>
                <button onClick={() => setIsBookingManagerOpen(true)} className="text-[#C29591]"><Settings size={18}/></button>
              </div>
            ) : (
              <button onClick={() => setIsAdminModalOpen(true)} className="text-gray-300 hover:text-[#C29591] transition-colors flex-shrink-0"><Lock size={14}/></button>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-32 md:pt-20">
        {bookingStep === 'form' ? (
          <div className="max-w-2xl mx-auto px-6 py-12">
            <h2 className="text-2xl font-light tracking-[0.3em] text-center mb-8 text-[#463E3E]">RESERVATION</h2>
            <div className="bg-white border border-[#EAE7E2] mb-6 p-6 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                   <div className="w-24 h-24 flex-shrink-0 bg-gray-50 border border-[#F0EDEA]">{selectedItem?.images?.[0] && <img src={selectedItem.images[0]} className="w-full h-full object-cover" alt="preview" />}</div>
                   <div className="flex-1 space-y-1">
                    <p className="text-xs text-[#C29591] tracking-widest uppercase font-bold">預約項目</p>
                    <p className="text-sm font-medium">{selectedItem?.title} {selectedAddon ? `+ ${selectedAddon.name}` : ''}</p>
                    <p className="text-xs text-gray-400">預計總時長: <span className="font-bold text-[#463E3E]">{currentServiceDuration}</span> 分鐘</p>
                   </div>
                   <div className="text-right"><p className="text-xs text-gray-400 tracking-widest uppercase">總金額</p><p className="text-lg font-bold text-[#463E3E]">NT$ {((Number(selectedItem?.price)||0) + (Number(selectedAddon?.price)||0)).toLocaleString()}</p></div>
                </div>
            </div>

            <div className="bg-white border border-[#EAE7E2] p-8 shadow-sm space-y-8">
              <div className="border-b border-[#EAE7E2] pb-6">
                <label className="block text-xs font-bold text-gray-400 mb-2">選擇預約門市</label>
                <div className="flex flex-wrap gap-3">
                  {shopSettings.stores.map(store => (
                    <button key={store.id} onClick={() => { setBookingData({...bookingData, storeId: store.id, date: '', time: ''}); }} className={`px-4 py-2 text-xs border rounded-full transition-all ${String(bookingData.storeId) === String(store.id) ? 'bg-[#463E3E] text-white border-[#463E3E]' : 'bg-white text-gray-500 border-gray-200 hover:border-[#C29591]'}`}>{store.name}</button>
                  ))}
                  {shopSettings.stores.length===0 && <p className="text-xs text-red-400">無可用門市</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input required type="text" placeholder="顧客姓名 (不可含數字)" className="border-b py-2 outline-none" value={bookingData.name} onChange={e => setBookingData({...bookingData, name: e.target.value})} />
                <input required type="tel" placeholder="聯絡電話 (10碼數字)" className="border-b py-2 outline-none" value={bookingData.phone} onChange={e => { if(e.target.value.length<=10) setBookingData({...bookingData, phone: e.target.value.replace(/\D/g, '')}); }} />
                <div className="flex items-center gap-2 border-b border-[#EAE7E2] py-2 text-gray-400 md:col-span-2"><CreditCard size={16}/> <span className="text-xs">付款方式：</span><span className="text-[#463E3E] font-medium text-xs">門市付款</span></div>
              </div>

              {bookingData.storeId && (
                <>
                  <div className="flex justify-center pt-2">
                    <CustomCalendar selectedDate={bookingData.date} onDateSelect={(d) => setBookingData({...bookingData, date: d, time: ''})} isDateFullFunc={isDateFull} />
                  </div>
                  {bookingData.date && (
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                      {TIME_SLOTS.map(t => {
                        const available = isTimeSlotAvailable(bookingData.date, t);
                        return <button key={t} disabled={!available} onClick={() => setBookingData({...bookingData, time:t})} className={`py-2 text-[10px] border transition-colors ${bookingData.time===t ? 'bg-[#463E3E] text-white border-[#463E3E]' : available ? 'bg-white hover:border-[#C29591]' : 'bg-gray-100 text-gray-300 border-transparent cursor-not-allowed'}`}>{t}</button>;
                      })}
                    </div>
                  )}
                </>
              )}

              <button disabled={isSubmitting || !bookingData.name || !bookingData.phone || !bookingData.time} onClick={handleConfirmBooking} className="w-full py-4 bg-[#463E3E] text-white text-xs tracking-widest uppercase disabled:opacity-50">{isSubmitting ? '處理中...' : '確認預約'}</button>
            </div>
          </div>
        ) : activeTab === 'home' ? (
          <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-6 text-center">
            <span className="text-[#C29591] tracking-[0.4em] md:tracking-[0.8em] text-xs md:text-sm mb-10 uppercase font-extralight">EST. 2026 • TAOYUAN</span>
            <div className="w-full max-w-xl mb-12 shadow-2xl rounded-sm overflow-hidden border border-[#EAE7E2]"><img src="https://drive.google.com/thumbnail?id=1ZJv3DS8ST_olFt0xzKB_miK9UKT28wMO&sz=w1200" className="w-full h-auto max-h-[40vh] object-cover" alt="home" /></div>
            <h2 className="text-4xl md:text-5xl font-extralight mb-12 tracking-[0.4em] text-[#463E3E] leading-relaxed">Pure Art</h2>
            <button onClick={() => setActiveTab('catalog')} className="bg-[#463E3E] text-white px-16 py-4 tracking-[0.4em] text-xs font-light">點此預約</button>
          </div>
        ) : activeTab === 'catalog' ? (
          <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
            <div className="flex flex-col gap-6 border-b border-[#EAE7E2] pb-8 mb-8">
                <div className="flex flex-wrap gap-4 justify-center items-center">{STYLE_CATEGORIES.map(c => <button key={c} onClick={() => setStyleFilter(c)} className={`text-xs tracking-widest px-4 py-1 ${styleFilter===c ? 'text-[#C29591] font-bold border-b border-[#C29591]' : 'text-gray-400'}`}>{c}</button>)}</div>
                <div className="flex flex-wrap gap-4 justify-center items-center">{PRICE_CATEGORIES.map(p => <button key={p} onClick={() => setPriceFilter(p)} className={`text-xs tracking-widest px-4 py-1 ${priceFilter===p ? 'text-[#C29591] font-bold border-b border-[#C29591]' : 'text-gray-400'}`}>{p}</button>)}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16">
              {cloudItems.filter(i => (styleFilter==='全部'||i.category===styleFilter) && (priceFilter==='全部'||(priceFilter==='1300以下'?i.price<1300:priceFilter==='1900以上'?i.price>1900:i.price>=1300&&i.price<=1900))).map(item => (
                <StyleCard key={item.id} item={item} isLoggedIn={isLoggedIn} onEdit={(i)=>{setEditingItem(i);setFormData(i);setIsUploadModalOpen(true)}} onDelete={(id)=>deleteDoc(doc(db,'artifacts',appId,'public','data','nail_designs',id))} onBook={(i,a)=>{setSelectedItem(i);setSelectedAddon(a);setBookingStep('form');window.scrollTo(0,0)}} addons={addons}/>
              ))}
            </div>
          </div>
        ) : activeTab === 'success' ? (
           <div className="max-w-lg mx-auto py-12 px-6 text-center">
             <CheckCircle size={48} className="text-[#C29591] mx-auto mb-6"/>
             <h2 className="text-xl tracking-widest text-[#463E3E] mb-2">預約成功</h2>
             <p className="text-xs text-gray-400 mb-8">我們期待您的光臨</p>
             <button onClick={()=>{setBookingStep('none');setActiveTab('home')}} className="bg-[#463E3E] text-white px-8 py-3 text-xs tracking-widest">回首頁</button>
           </div>
        ) : null}
        
        {activeTab === 'notice' && <div className="text-center py-20 text-gray-400 text-xs tracking-widest">預約須知內容...</div>}
        {activeTab === 'store' && <div className="text-center py-20 text-gray-400 text-xs tracking-widest">門市資訊內容...</div>}
        {activeTab === 'search' && (
           <div className="max-w-md mx-auto py-20 px-6">
             <input type="text" placeholder="姓名" className="w-full border-b mb-4 p-2" onChange={e=>setSearchName(e.target.value)}/>
             <input type="text" placeholder="電話" className="w-full border-b mb-4 p-2" onChange={e=>setSearchPhone(e.target.value)}/>
             <button onClick={handleSearchBooking} className="w-full bg-[#463E3E] text-white py-3 text-xs">查詢</button>
             {searchResult && <div className="mt-8 border p-4 bg-white"><p>預約日期: {searchResult.date} {searchResult.time}</p><p>項目: {searchResult.itemTitle}</p></div>}
           </div>
        )}
      </main>

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
      
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[300] flex items-center justify-center p-4">
           <div className="bg-white p-8 max-w-md w-full">
             <h3 className="mb-4">上傳/修改</h3>
             <form onSubmit={handleItemSubmit} className="space-y-4">
               <input className="w-full border p-2" placeholder="名稱" value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})}/>
               <input className="w-full border p-2" placeholder="價格" type="number" value={formData.price} onChange={e=>setFormData({...formData, price: e.target.value})}/>
               <input className="w-full border p-2" placeholder="時間(分)" type="number" value={formData.duration} onChange={e=>setFormData({...formData, duration: e.target.value})}/>
               <button className="w-full bg-[#463E3E] text-white py-2">{isUploading?'處理中':'確認'}</button>
               <button type="button" onClick={()=>setIsUploadModalOpen(false)} className="w-full text-gray-400 py-2">取消</button>
             </form>
           </div>
        </div>
      )}
      
      {isBookingManagerOpen && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-0 md:p-4 backdrop-blur-sm">
          <div className="bg-white w-full h-full md:w-full md:max-w-[98vw] md:h-[95vh] shadow-2xl flex flex-col overflow-hidden md:rounded-lg">
            <div className="bg-white px-8 py-6 border-b flex justify-between items-center">
              <h3 className="text-xs tracking-[0.3em] font-bold uppercase text-[#463E3E]">系統管理中心</h3>
              <button onClick={() => setIsBookingManagerOpen(false)}><X size={24}/></button>
            </div>
            <div className="flex border-b border-[#EAE7E2] px-8 bg-[#FAF9F6] sticky top-0 z-10">
              {[{ id: 'stores', label: '門市', icon: <Store size={14}/> }, { id: 'addons', label: '加購', icon: <Tag size={14}/> }, { id: 'staff_holiday', label: '人員/休假', icon: <Users size={14}/> }, { id: 'bookings', label: '訂單', icon: <Calendar size={14}/> }].map(tab => (
                <button key={tab.id} onClick={() => setManagerTab(tab.id)} className={`flex items-center gap-2 px-6 py-4 text-xs tracking-widest transition-all ${managerTab === tab.id ? 'bg-white border-x border-t border-[#EAE7E2] border-b-white text-[#C29591] font-bold -mb-[1px]' : 'text-gray-400 hover:text-[#463E3E]'}`}>{tab.icon} {tab.label}</button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-12">
              {managerTab === 'stores' && (
                <section className="space-y-6">
                  <div className="flex gap-2"><input type="text" className="flex-1 border p-2 text-xs" placeholder="新門市名稱" value={newStoreInput} onChange={e => setNewStoreInput(e.target.value)} /><button onClick={() => { if(!newStoreInput) return; saveShopSettings({ ...shopSettings, stores: [...shopSettings.stores, { id: Date.now().toString(), name: newStoreInput, cleaningTime: 20 }] }); setNewStoreInput(''); }} className="bg-[#463E3E] text-white px-4 text-xs">新增</button></div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{shopSettings.stores.map(store => (<div key={store.id} className="border p-4 bg-white shadow-sm"><div className="flex justify-between mb-2"><span>{store.name}</span><button onClick={() => confirm('刪除?') && saveShopSettings({ ...shopSettings, stores: shopSettings.stores.filter(s => s.id !== store.id) })}><Trash2 size={14}/></button></div><div className="flex items-center gap-2 text-xs text-gray-500">整備:<input type="number" className="w-10 border text-center" defaultValue={store.cleaningTime||20} onBlur={e=>saveShopSettings({...shopSettings, stores: shopSettings.stores.map(s=>s.id===store.id?{...s, cleaningTime: Number(e.target.value)}:s)})} />分</div></div>))}</div>
                </section>
              )}
              {managerTab === 'addons' && (
                <section className="space-y-6">
                  <div className="grid grid-cols-4 gap-2 text-xs"><input placeholder="名稱" className="border p-2" value={addonForm.name} onChange={e=>setAddonForm({...addonForm,name:e.target.value})}/><input placeholder="價格" className="border p-2" type="number" value={addonForm.price} onChange={e=>setAddonForm({...addonForm,price:e.target.value})}/><input placeholder="時間" className="border p-2" type="number" value={addonForm.duration} onChange={e=>setAddonForm({...addonForm,duration:e.target.value})}/><button onClick={handleAddAddon} className="bg-[#463E3E] text-white">新增</button></div>
                  <div className="grid grid-cols-3 gap-4">{addons.map(a=><div key={a.id} className="border p-4 flex justify-between"><div><div className="font-bold">{a.name}</div><div className="text-xs text-gray-400">${a.price} / {a.duration}分</div></div><button onClick={()=>deleteDoc(doc(db,'artifacts',appId,'public','data','addons',a.id))}><Trash2 size={14}/></button></div>)}</div>
                </section>
              )}
              {managerTab === 'staff_holiday' && (
                <div className="grid grid-cols-2 gap-8">
                  <section className="space-y-4">
                    <button onClick={()=>{const n=prompt('姓名?');if(n)saveShopSettings({...shopSettings,staff:[...shopSettings.staff,{id:Date.now().toString(),name:n,storeId:shopSettings.stores[0]?.id||'',leaveDates:[]}]})}} className="bg-[#C29591] text-white px-3 py-1 text-xs rounded">+ 人員</button>
                    {shopSettings.staff.map(s=><div key={s.id} className="border p-4 bg-[#FAF9F6]"><div className="flex justify-between mb-2"><span className="font-bold">{s.name}</span><select value={s.storeId} onChange={e=>saveShopSettings({...shopSettings,staff:shopSettings.staff.map(st=>st.id===s.id?{...st,storeId:e.target.value}:st)})}>{shopSettings.stores.map(st=><option key={st.id} value={st.id}>{st.name}</option>)}</select><button onClick={()=>saveShopSettings({...shopSettings,staff:shopSettings.staff.filter(st=>st.id!==s.id)})}><Trash2 size={14}/></button></div><div className="text-xs">請假: <input type="date" onChange={e=>{if(!e.target.value)return;saveShopSettings({...shopSettings,staff:shopSettings.staff.map(st=>st.id===s.id?{...st,leaveDates:[...st.leaveDates||[],e.target.value]}:st)})}}/> <div className="flex flex-wrap gap-1 mt-1">{(s.leaveDates||[]).map(d=><span key={d} className="bg-red-100 text-red-500 px-1 rounded flex items-center">{d}<X size={10} className="cursor-pointer" onClick={()=>saveShopSettings({...shopSettings,staff:shopSettings.staff.map(st=>st.id===s.id?{...st,leaveDates:st.leaveDates.filter(ld=>ld!==d)}:st)})}/></span>)}</div></div></div>)}
                  </section>
                  <section className="space-y-4">
                    <div className="flex gap-2 items-center"><select className="border p-2 text-xs" value={newHolidayInput.storeId} onChange={e=>setNewHolidayInput({...newHolidayInput,storeId:e.target.value})}><option value="all">全品牌</option>{shopSettings.stores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><input type="date" className="border p-2" value={newHolidayInput.date} onChange={e=>setNewHolidayInput({...newHolidayInput,date:e.target.value})}/><button onClick={()=>{if(!newHolidayInput.date)return;saveShopSettings({...shopSettings,holidays:[...shopSettings.holidays,newHolidayInput]})}} className="bg-[#463E3E] text-white px-3 py-1 text-xs">新增公休</button></div>
                    <div className="flex flex-wrap gap-2">{shopSettings.holidays.map((h,i)=><span key={i} className="border px-2 py-1 text-xs flex gap-2 items-center">{h.date} ({h.storeId==='all'?'全':shopSettings.stores.find(s=>s.id===h.storeId)?.name}) <X size={12} className="cursor-pointer" onClick={()=>saveShopSettings({...shopSettings,holidays:shopSettings.holidays.filter((_,idx)=>idx!==i)})}/></span>)}</div>
                  </section>
                </div>
              )}
              {managerTab === 'bookings' && (
                <section className="space-y-4 h-full flex flex-col">
                  <div className="flex justify-between items-center"><div className="flex items-center gap-2"><Filter size={14}/><select value={adminSelectedStore} onChange={e=>setAdminSelectedStore(e.target.value)} className="border-none bg-transparent font-bold"><option value="all">全部分店</option>{shopSettings.stores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div className="flex gap-2"><button onClick={()=>setBookingViewMode('list')}><ListIcon/></button><button onClick={()=>setBookingViewMode('calendar')}><Grid/></button><button onClick={handleExportCSV}><Download/></button></div></div>
                  {bookingViewMode==='list' ? <div className="flex-1 overflow-auto space-y-2">{storeFilteredBookings.map(b=><div key={b.id} className="border p-3 flex justify-between items-center text-xs"><div><span className="font-bold mr-2">{b.date} {b.time}</span><span className="bg-gray-100 px-1 rounded">{b.storeName}</span><div className="mt-1">{b.name} / {b.phone}</div><div className="text-gray-400">{b.itemTitle} + {b.addonName}</div></div><button onClick={()=>deleteDoc(doc(db,'artifacts',appId,'public','data','bookings',b.id))}><Trash2 size={14}/></button></div>)}</div> : <div className="flex gap-4"><AdminBookingCalendar bookings={storeFilteredBookings} selectedDate={adminSelectedDate} onDateSelect={setAdminSelectedDate} /><div className="flex-1">{dateFilteredBookings.map(b=><div key={b.id} className="border p-2 mb-2 text-xs"><div>{b.time} {b.storeName}</div><div>{b.name}</div></div>)}</div></div>}
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}