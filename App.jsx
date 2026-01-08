import React, { useState, useEffect } from 'react';
import { Plus, X, Lock, Trash2, Edit3, Settings, Clock, CheckCircle, Upload, ChevronLeft, ChevronRight, Users, UserMinus, Search, Info, AlertTriangle, ShieldCheck, Calendar, Briefcase, Tag, List as ListIcon, Grid, Download, Store, Filter, MapPin, CreditCard, Hash, Layers, Globe, Layout, MessageCircle, CalendarX, AlertOctagon } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, query, orderBy, setDoc } from 'firebase/firestore';
// --- 1. 引入 EmailJS ---
import emailjs from '@emailjs/browser';

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
const DEFAULT_CATEGORIES = ['極簡氣質', '華麗鑽飾', '藝術手繪', '日系暈染', '貓眼系列'];
const PRICE_CATEGORIES = ['全部', '1300以下', '1300-1900', '1900以上']; 
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const DEFAULT_CLEANING_TIME = 20; 
const MAX_BOOKING_DAYS = 30; 

// 預約須知內容 (用於顯示與寄信)
const NOTICE_CONTENT = `
【預約須知】
1. 本店採網站預約制，請依系統開放的時段與服務項目進行預約。
2. 服務款式以網站上提供內容為主，暫不提供帶圖或客製設計。
3. 為了衛生與施作安全考量，恕不提供病甲（如黴菌感染、卷甲、崁甲、灰指甲等）相關服務。
4. 若遲到超過 10 分鐘，將視當日狀況調整服務內容。
5. 如需取消或改期，請於預約 24 小時前告知。
6. 施作後 7 日內非人為因素脫落，可協助免費補修。
`;

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
const StyleCard = ({ item, isLoggedIn, onEdit, onDelete, onBook, addons, onTagClick }) => {
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
      <div className="p-6 flex flex-col items-center text-center">
        <span className="text-xs text-[#C29591] tracking-[0.3em] uppercase mb-2 font-medium">{item.category}</span>
        <h3 className="text-[#463E3E] font-medium text-lg tracking-widest mb-1">{item.title}</h3>
        
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-3 mt-1">
            {item.tags.map((tag, idx) => (
              <button 
                key={idx} 
                onClick={() => onTagClick(tag)}
                className="text-[10px] text-gray-400 hover:text-[#C29591] transition-colors"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-4 uppercase tracking-widest font-light"><Clock size={14} /> 預計服務：{item.duration || '90'} 分鐘</div>
        <p className="text-[#463E3E] font-bold text-xl mb-6"><span className="text-xs font-light tracking-widest mr-1">NT$</span>{item.price.toLocaleString()}</p>
        
        <select 
          className={`w-full text-sm border py-3 px-4 bg-[#FAF9F6] mb-6 outline-none text-[#463E3E] transition-colors ${!localAddonId ? 'border-red-200' : 'border-[#EAE7E2]'}`} 
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

// --- 子組件：前台預約月曆 ---
const CustomCalendar = ({ selectedDate, onDateSelect, settings, selectedStoreId, isDayFull }) => {
  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => {
    if (selectedDate) {
      setViewDate(new Date(selectedDate));
    }
  }, [selectedDate]);

  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + MAX_BOOKING_DAYS);

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(<div key={`empty-${i}`} className="w-full aspect-square"></div>);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const targetDate = new Date(currentYear, currentMonth, d);
      
      const isGlobalHoliday = (settings?.holidays || []).some(h => h.date === dateStr && h.storeId === 'all');
      const isStoreHoliday = (settings?.holidays || []).some(h => h.date === dateStr && String(h.storeId) === String(selectedStoreId));
      const isHoliday = isGlobalHoliday || isStoreHoliday;

      const staffList = (settings?.staff || []).filter(s => String(s.storeId) === String(selectedStoreId));
      const onLeaveCount = staffList.filter(s => (s.leaveDates || []).includes(dateStr)).length;
      const isAllOnLeave = staffList.length > 0 && (staffList.length - onLeaveCount) <= 0;
      
      const isPast = targetDate < today; 
      const isTooFar = targetDate > maxDate;

      const isFull = isDayFull ? isDayFull(dateStr) : false;
      
      const isDisabled = isHoliday || isAllOnLeave || isPast || !selectedStoreId || isTooFar || isFull;
      const isSelected = selectedDate === dateStr;

      days.push(
        <button key={d} disabled={isDisabled} onClick={() => onDateSelect(dateStr)}
          className={`w-full aspect-square text-sm rounded-full flex items-center justify-center transition-all 
          ${isDisabled ? 'text-gray-300 line-through cursor-not-allowed' : isSelected ? 'bg-[#463E3E] text-white' : 'hover:bg-[#C29591] hover:text-white'}`}>
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
      <div className="grid grid-cols-7 gap-2 mb-2">
        {WEEKDAYS.map(w => <div key={w} className="w-full aspect-square flex items-center justify-center text-xs text-gray-400 font-bold">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-2">{renderDays()}</div>
      <div className="text-[10px] text-center text-gray-400 mt-4 tracking-widest">僅開放 {MAX_BOOKING_DAYS} 天內預約</div>
    </div>
  );
};

// --- 子組件：後台管理月曆 ---
const AdminBookingCalendar = ({ bookings, onDateSelect, selectedDate }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(<div key={`empty-${i}`} className="w-full aspect-square"></div>);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
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
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map(w => <div key={w} className="h-10 flex items-center justify-center text-[10px] text-gray-400 font-bold">{w}</div>)}
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
  // shopSettings 包含：stores, staff, holidays, styleCategories, savedTags
  const [shopSettings, setShopSettings] = useState({ 
    stores: [], staff: [], holidays: [], 
    styleCategories: DEFAULT_CATEGORIES,
    savedTags: []
  });
  const [newHolidayInput, setNewHolidayInput] = useState({ date: '', storeId: 'all' });
  const [newStoreInput, setNewStoreInput] = useState('');
  
  // 管理中心狀態
  const [managerTab, setManagerTab] = useState('stores'); 
  const [bookingViewMode, setBookingViewMode] = useState('list'); 
  const [adminSelectedDate, setAdminSelectedDate] = useState('');
  const [adminSelectedStore, setAdminSelectedStore] = useState('all');

  // 新增/管理用的輸入變數
  const [addonForm, setAddonForm] = useState({ name: '', price: '', duration: '' });
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [newTagInput, setNewTagInput] = useState('');

  const [bookingStep, setBookingStep] = useState('none');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedAddon, setSelectedAddon] = useState(null);
  
  // --- 2. 新增 email 狀態 ---
  const [bookingData, setBookingData] = useState({ name: '', phone: '', email: '', date: '', time: '', storeId: '', paymentMethod: '門市付款' });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isBookingManagerOpen, setIsBookingManagerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [styleFilter, setStyleFilter] = useState('全部');
  const [priceFilter, setPriceFilter] = useState('全部');
  const [tagFilter, setTagFilter] = useState(''); 

  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({ title: '', price: '', category: '極簡氣質', duration: '90', images: [], tags: '' });

  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResult, setSearchResult] = useState([]);

  useEffect(() => {
    signInAnonymously(auth);
    onAuthStateChanged(auth, u => setUser(u));
  }, []);

  useEffect(() => {
    if (!user) return;
    onSnapshot(doc(db, 'artifacts', appId, 'public', 'settings'), (d) => {
      if (d.exists()) {
        const data = d.data();
        setShopSettings({
          stores: data.stores || [],
          staff: data.staff || [],
          holidays: data.holidays || (data.specificHolidays ? data.specificHolidays.map(d => ({date: d, storeId: 'all'})) : []),
          styleCategories: data.styleCategories || DEFAULT_CATEGORIES,
          savedTags: data.savedTags || []
        });
      }
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

  const getStoreCleaningTime = (sId) => {
    const s = (shopSettings.stores || []).find(i => String(i.id) === String(sId));
    return Number(s?.cleaningTime) || DEFAULT_CLEANING_TIME;
  };

  const isTimeSlotFull = (date, checkTimeStr) => {
    if (!date || !checkTimeStr || !bookingData.storeId) return false;
    
    const checkDate = new Date(`${date} ${checkTimeStr}`);
    const now = new Date();
    const bufferDate = new Date(now.getTime() + 90 * 60000); 
    
    if (checkDate < bufferDate) return true;
    
    const staffList = (shopSettings.staff || []).filter(s => String(s.storeId) === String(bookingData.storeId));
    const onLeaveCount = staffList.filter(s => (s.leaveDates || []).includes(date)).length;
    const availableStaffCount = staffList.length === 0 ? 0 : (staffList.length - onLeaveCount);

    if (availableStaffCount <= 0) return true;

    const specificCleaningTime = getStoreCleaningTime(bookingData.storeId);

    const startA = timeToMinutes(checkTimeStr);
    const endA = startA + calcTotalDuration() + specificCleaningTime;

    const concurrentBookings = allBookings.filter(b => {
      if (b.date !== date) return false;
      if (String(b.storeId) !== String(bookingData.storeId)) return false;
      
      const startB = timeToMinutes(b.time);
      const endB = startB + (Number(b.totalDuration) || 90) + specificCleaningTime;
      return (startA < endB) && (startB < endA);
    });

    return concurrentBookings.length >= availableStaffCount;
  };

  const isDayFull = (date) => {
    return TIME_SLOTS.every(t => isTimeSlotFull(date, t));
  };

  useEffect(() => {
    if (bookingStep === 'form' && bookingData.storeId && !bookingData.date) {
      const autoSelectFirstAvailableDate = () => {
        const today = new Date();
        let checkDate = new Date(today);
        let found = false;
        
        for (let i = 0; i < MAX_BOOKING_DAYS; i++) {
          const y = checkDate.getFullYear();
          const m = String(checkDate.getMonth() + 1).padStart(2, '0');
          const d = String(checkDate.getDate()).padStart(2, '0');
          const dateStr = `${y}-${m}-${d}`;
          
          const isHoliday = (shopSettings.holidays || []).some(h => 
            h.date === dateStr && (h.storeId === 'all' || String(h.storeId) === String(bookingData.storeId))
          );

          if (!isHoliday) {
            const hasSlot = TIME_SLOTS.some(t => !isTimeSlotFull(dateStr, t));
            if (hasSlot) {
              setBookingData(prev => ({ ...prev, date: dateStr }));
              found = true;
              return;
            }
          }
          if (found) break;
          checkDate.setDate(checkDate.getDate() + 1);
        }
      };
      
      if (shopSettings.stores.length > 0) {
        autoSelectFirstAvailableDate();
      }
    }
  }, [bookingStep, bookingData.storeId, bookingData.date, shopSettings, allBookings]);

  useEffect(() => {
    if (bookingStep === 'form' && bookingData.date) {
        if (bookingData.time && isTimeSlotFull(bookingData.date, bookingData.time)) {
             setBookingData(prev => ({ ...prev, time: '' }));
        }
    }
  }, [bookingStep, bookingData.date, allBookings, bookingData.storeId]);

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
    const selectedStore = shopSettings.stores.find(s => s.id === bookingData.storeId);

    try {
      // 1. 寫入 Firebase
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), {
        ...bookingData,
        storeName: selectedStore ? selectedStore.name : '未指定',
        itemTitle: selectedItem?.title,
        addonName: selectedAddon?.name || '無',
        totalAmount: finalAmount,
        totalDuration: finalDuration,
        createdAt: serverTimestamp()
      });

      // 2. --- 發送 EmailJS ---
      // 準備要傳給 EmailJS 模板的參數
      const templateParams = {
        to_email: bookingData.email,     // 收件者 (客人)
        staff_email: 'unibeatuy@gmail.com', // 服務人員信箱 (副本)
        to_name: bookingData.name,       // 收件者姓名
        phone: bookingData.phone,
        store_name: selectedStore ? selectedStore.name : '未指定',
        booking_date: bookingData.date,
        booking_time: bookingData.time,
        item_title: selectedItem?.title,
        addon_name: selectedAddon?.name || '無',
        total_amount: finalAmount,
        total_duration: finalDuration,
        notice_content: NOTICE_CONTENT // 須知內容
      };

      // 使用您提供的 Service ID, Template ID 和 Public Key
      await emailjs.send('service_uniwawa', 'template_d5tq1z9', templateParams, 'ehbGdRtZaXWft7qLM');

      setBookingStep('success');
    } catch (e) { 
        console.error(e);
        // 就算 email 失敗，若 firebase 成功也算成功
        // alert('預約成功，但郵件發送失敗'); 
        setBookingStep('success'); 
    } finally { 
        setIsSubmitting(false); 
    }
  };

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      const priceVal = Number(formData.price);
      const durationVal = Number(formData.duration);
      if (isNaN(priceVal) || isNaN(durationVal)) throw new Error("價格或時間必須為數字");

      const payloadSize = JSON.stringify(formData).length;
      if (payloadSize > 900000) throw new Error("圖片檔案過大！請使用截圖或壓縮過的照片");

      const tagsArray = formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : [];

      const payload = { 
        ...formData, 
        price: priceVal, 
        duration: durationVal, 
        tags: tagsArray, 
        updatedAt: serverTimestamp() 
      };

      if (editingItem) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', editingItem.id), payload);
      else await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), { ...payload, createdAt: serverTimestamp() });
      
      setIsUploadModalOpen(false);
      setFormData({ title: '', price: '', category: shopSettings.styleCategories[0] || '極簡氣質', duration: '90', images: [], tags: '' });
      alert("發布成功！");
    } catch (err) { alert("儲存失敗：" + err.message); } finally { setIsUploading(false); }
  };

  const handleSearchBooking = (e) => {
    e.preventDefault();
    if(!searchKeyword.trim()) return;
    
    const keyword = searchKeyword.trim();
    const results = allBookings.filter(b => 
      b.name === keyword || b.phone === keyword
    );
    
    results.sort((a,b) => new Date(`${b.date} ${b.time}`) - new Date(`${a.date} ${a.time}`));
    
    if (results.length > 0) {
       setSearchResult(results); 
    } else {
       alert('查無預約資料，請確認姓名或電話是否正確');
       setSearchResult([]);
    }
  };

  // 使用 shopSettings 中的分類，若有'全部'則需加入
  const activeCategories = ['全部', ...shopSettings.styleCategories];

  const filteredItems = cloudItems.filter(item => {
    const matchStyle = styleFilter === '全部' || item.category === styleFilter;
    let matchPrice = true;
    if (priceFilter === '1300以下') matchPrice = item.price < 1300;
    else if (priceFilter === '1300-1900') matchPrice = item.price >= 1300 && item.price <= 1900;
    else if (priceFilter === '1900以上') matchPrice = item.price > 1900;
    
    const matchTag = tagFilter === '' || (item.tags && item.tags.includes(tagFilter));

    return matchStyle && matchPrice && matchTag;
  });

  const calcTotalAmount = () => (Number(selectedItem?.price) || 0) + (Number(selectedAddon?.price) || 0);

  const isNameInvalid = /\d/.test(bookingData.name);
  const isPhoneInvalid = bookingData.phone.length > 0 && bookingData.phone.length !== 10;
  // --- 簡單 Email 驗證 ---
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingData.email);

  const isFormValid = 
    bookingData.name.trim() !== '' && 
    !isNameInvalid &&
    bookingData.phone.length === 10 && 
    isEmailValid && // 檢查 email
    bookingData.time !== '' &&
    bookingData.storeId !== '';

  const sortedAdminBookings = [...allBookings].sort((a, b) => {
    return new Date(`${a.date} ${a.time}`) - new Date(`${b.date} ${b.time}`);
  });

  const storeFilteredBookings = sortedAdminBookings.filter(b => {
    if (adminSelectedStore === 'all') return true;
    return String(b.storeId) === String(adminSelectedStore);
  });

  const dateFilteredBookings = adminSelectedDate 
    ? storeFilteredBookings.filter(b => b.date === adminSelectedDate)
    : storeFilteredBookings;

  const handleExportCSV = () => {
    const headers = ['日期', '時間', '門市', '顧客姓名', '電話', '服務項目', '加購項目', '金額', '預計時長', '付款方式'];
    const rows = storeFilteredBookings.map(b => [ 
      b.date,
      b.time,
      b.storeName || '未指定',
      b.name,
      b.phone,
      b.itemTitle,
      b.addonName,
      b.totalAmount,
      b.totalDuration,
      b.paymentMethod || '門市付款'
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `預約清單_${adminSelectedStore === 'all' ? '全部' : '分店'}_${getTodayString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555] font-sans">
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-[#EAE7E2]">
        <div className="max-w-7xl mx-auto px-6 py-4 md:py-0 md:h-20 flex flex-col md:flex-row items-start md:items-center justify-between transition-all duration-300">
          <h1 className="text-2xl md:text-3xl tracking-[0.4em] font-extralight cursor-pointer text-[#463E3E] mb-4 md:mb-0 w-full md:w-auto text-center md:text-left" onClick={() => {setActiveTab('home'); setBookingStep('none');}}>UNIWAWA</h1>
          <div className="flex gap-3 md:gap-6 text-xs md:text-sm tracking-widest font-medium uppercase items-center w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0 justify-center">
            <button onClick={() => {setActiveTab('home'); setBookingStep('none');}} className={`flex-shrink-0 ${activeTab === 'home' ? 'text-[#C29591]' : ''}`}>首頁</button>
            <button onClick={() => {setActiveTab('notice'); setBookingStep('none');}} className={`flex-shrink-0 ${activeTab === 'notice' ? 'text-[#C29591]' : ''}`}>須知</button>
            <button onClick={() => {setActiveTab('catalog'); setBookingStep('none');}} className={`flex-shrink-0 ${activeTab === 'catalog' ? 'text-[#C29591]' : ''}`}>款式</button>
            <button onClick={() => {setActiveTab('search'); setBookingStep('none'); setSearchResult([]); setSearchKeyword('');}} className={`flex-shrink-0 ${activeTab === 'search' ? 'text-[#C29591]' : ''}`}>查詢</button>
            <button onClick={() => {setActiveTab('store'); setBookingStep('none');}} className={`flex-shrink-0 ${activeTab === 'store' ? 'text-[#C29591]' : ''}`}>門市</button>
            
            {isLoggedIn ? (
              <div className="flex gap-4 border-l pl-4 border-[#EAE7E2] flex-shrink-0">
                <button onClick={() => {setEditingItem(null); setFormData({title:'', price:'', category: shopSettings.styleCategories[0] || '極簡氣質', duration:'90', images:[], tags: ''}); setIsUploadModalOpen(true)}} className="text-[#C29591]"><Plus size={18}/></button>
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
            <h2 className="text-2xl font-light tracking-[0.3em] text-center mb-8 text-[#463E3E]">RESERVATION / 預約資訊</h2>
            <div className="bg-white border border-[#EAE7E2] mb-6 p-6 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                   <div className="w-24 h-24 flex-shrink-0 bg-gray-50 border border-[#F0EDEA]">
                      {selectedItem?.images?.[0] && <img src={selectedItem.images[0]} className="w-full h-full object-cover" alt="preview" />}
                   </div>
                   <div className="flex-1 space-y-1">
                    <p className="text-xs text-[#C29591] tracking-widest uppercase font-bold">預約項目</p>
                    <p className="text-sm font-medium">{selectedItem?.title} {selectedAddon ? `+ ${selectedAddon.name}` : ''}</p>
                    <p className="text-xs text-gray-400">
                        預計總時長: <span className="font-bold text-[#463E3E]">{calcTotalDuration()}</span> 分鐘
                    </p>
                   </div>
                   <div className="text-right">
                      <p className="text-xs text-gray-400 tracking-widest uppercase">總金額 (含加購)</p>
                      <p className="text-lg font-bold text-[#463E3E]">NT$ {calcTotalAmount().toLocaleString()}</p>
                   </div>
                </div>
            </div>

            <div className="bg-white border border-[#EAE7E2] p-8 shadow-sm space-y-8">
              {/* 門市選擇器 */}
              <div className="border-b border-[#EAE7E2] pb-6">
                <label className="block text-xs font-bold text-gray-400 mb-2">選擇預約門市</label>
                <div className="flex flex-wrap gap-3">
                  {shopSettings.stores.length > 0 ? shopSettings.stores.map(store => (
                    <button
                      key={store.id}
                      onClick={() => { setBookingData({...bookingData, storeId: store.id, date: '', time: ''}); }}
                      className={`px-4 py-2 text-xs border rounded-full transition-all ${String(bookingData.storeId) === String(store.id) ? 'bg-[#463E3E] text-white border-[#463E3E]' : 'bg-white text-gray-500 border-gray-200 hover:border-[#C29591]'}`}
                    >
                      {store.name}
                    </button>
                  )) : (
                    <p className="text-xs text-red-400">目前無可預約門市，請聯繫客服</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <input 
                    autoComplete="off"
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
                  autoComplete="off"
                  required 
                  type="tel" 
                  placeholder="聯絡電話 (必填10碼數字)" 
                  className={`border-b py-2 outline-none ${isPhoneInvalid ? 'border-red-300 text-red-500' : ''}`}
                  value={bookingData.phone} 
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, ''); 
                    if(val.length <= 10) setBookingData({...bookingData, phone: val});
                  }} 
                />

                {/* --- 3. 新增 Email 輸入框 --- */}
                <input 
                  autoComplete="off"
                  required 
                  type="email" 
                  placeholder="電子信箱 (接收預約通知)" 
                  className={`border-b py-2 outline-none ${!bookingData.email ? 'border-red-100' : 'border-gray-200'}`}
                  value={bookingData.email} 
                  onChange={e => setBookingData({...bookingData, email: e.target.value})} 
                />

                <div className="relative md:col-span-2">
                    <div className="flex items-center gap-2 border-b border-[#EAE7E2] py-2 text-gray-400">
                      <CreditCard size={16}/>
                      <span className="text-xs">付款方式：</span>
                      <span className="text-[#463E3E] font-medium text-xs">門市付款</span>
                    </div>
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <CustomCalendar 
                  selectedDate={bookingData.date} 
                  onDateSelect={(d) => {
                    setBookingData({...bookingData, date: d, time: ''}); 
                  }} 
                  settings={shopSettings} 
                  selectedStoreId={bookingData.storeId}
                  isDayFull={isDayFull} 
                />
              </div>
              
              {bookingData.date && bookingData.storeId && (
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
                 !bookingData.storeId ? '請先選擇門市' :
                 isNameInvalid ? '姓名不可包含數字' :
                 (!bookingData.name.trim()) ? '請填寫姓名' : 
                 (bookingData.phone.length !== 10) ? '電話需為10碼數字' : 
                 !isEmailValid ? '請輸入正確的電子信箱' :
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
                  <div className="mt-2 text-xs font-bold text-[#C29591]">
                    {shopSettings.stores.find(s=>s.id === bookingData.storeId)?.name}
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
                    <span className="text-gray-400">電子信箱</span>
                    <span className="font-medium">{bookingData.email}</span>
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
                  <div className="flex justify-between border-b border-dashed border-gray-100 pb-2">
                    <span className="text-gray-400">付款方式</span>
                    <span className="font-medium text-[#463E3E]">{bookingData.paymentMethod}</span>
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
          <div className="max-w-3xl mx-auto py-12 px-6 pb-24 h-full overflow-y-auto">
            <h2 className="text-2xl font-light tracking-[0.3em] text-center mb-12 text-[#463E3E]">RESERVATION POLICY / 預約須知</h2>
            <div className="bg-white border border-[#EAE7E2] p-8 shadow-sm space-y-6">
                {/* 須知項目：Icon + 文字 */}
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-[#FAF9F6] rounded-full flex-shrink-0 text-[#C29591]">
                        <Globe size={18} />
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed pt-1">
                        本店採 <span className="font-bold text-[#463E3E]">網站預約制</span>，請依系統開放的時段與服務項目進行預約
                    </p>
                </div>

                <div className="flex items-start gap-4">
                    <div className="p-2 bg-[#FAF9F6] rounded-full flex-shrink-0 text-[#C29591]">
                        <Layout size={18} />
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed pt-1">
                        服務款式以 <span className="font-bold text-[#463E3E]">網站上提供內容為主</span>，暫不提供帶圖或客製設計
                    </p>
                </div>

                <div className="flex items-start gap-4">
                    <div className="p-2 bg-red-50 rounded-full flex-shrink-0 text-red-400">
                        <AlertTriangle size={18} />
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed pt-1">
                        為了衛生與施作安全考量，<span className="text-red-400">恕不提供病甲（如黴菌感染、卷甲、崁甲、灰指甲等）相關服務</span>，敬請理解
                    </p>
                </div>

                <div className="flex items-start gap-4">
                    <div className="p-2 bg-[#FAF9F6] rounded-full flex-shrink-0 text-[#C29591]">
                        <Clock size={18} />
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed pt-1">
                        若遲到 <span className="font-bold text-[#463E3E]">超過 10 分鐘</span>，將視當日狀況調整服務內容，遲到或其他相關問題請聯絡 LINE 官方客服
                    </p>
                </div>

                <div className="flex items-start gap-4">
                    <div className="p-2 bg-[#FAF9F6] rounded-full flex-shrink-0 text-[#C29591]">
                        <MessageCircle size={18} />
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed pt-1">
                        LINE 官方帳號僅協助處理當日狀況，恕不作為預約或保留時段之管道
                    </p>
                </div>

                <div className="flex items-start gap-4">
                    <div className="p-2 bg-[#FAF9F6] rounded-full flex-shrink-0 text-[#C29591]">
                        <CalendarX size={18} />
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed pt-1">
                        如需取消或改期，請於 <span className="font-bold text-[#463E3E]">預約 24 小時前</span> 告知；未提前取消或未到者，將無法再接受後續預約，謝謝您的體諒
                    </p>
                </div>

                <div className="flex items-start gap-4">
                    <div className="p-2 bg-[#FAF9F6] rounded-full flex-shrink-0 text-[#C29591]">
                        <ShieldCheck size={18} />
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed pt-1">
                        施作後 7 日內非人為因素脫落，可協助免費補修，補修請提前預約
                    </p>
                </div>

                <div className="mt-8 pt-6 border-t border-dashed border-gray-200 flex items-center justify-center gap-2 text-[10px] text-gray-400">
                    <AlertOctagon size={14}/> 預約即代表您同意上述條款
                </div>
            </div>
          </div>
        ) : activeTab === 'search' ? ( 
          <div className="max-w-lg mx-auto py-12 px-6">
              <div className="text-center mb-12">
                 <h2 className="text-2xl font-light tracking-[0.3em] text-[#463E3E] uppercase mb-2">Check Booking</h2>
                 <p className="text-xs text-gray-400 tracking-widest">請輸入預約時的 手機 或 姓名 以查詢</p>
              </div>

              <form onSubmit={handleSearchBooking} autoComplete="off" className="flex flex-col gap-4 mb-12 bg-white p-8 border border-[#EAE7E2] shadow-sm">
                <input 
                  type="text" 
                  placeholder="輸入預約姓名 或 手機號碼" 
                  className="border-b border-[#EAE7E2] py-3 px-2 outline-none bg-transparent focus:border-[#C29591] text-xs"
                  value={searchKeyword}
                  onChange={e => setSearchKeyword(e.target.value)}
                />
                <button className="bg-[#463E3E] text-white w-full py-3 mt-2 text-xs tracking-widest hover:bg-[#C29591] transition-colors flex items-center justify-center gap-2">
                  <Search size={14}/> 查詢預約
                </button>
              </form>

              {/* 歷史訂單顯示區塊 */}
              <div className="space-y-6">
              {searchResult.map((booking) => (
                  <div key={booking.id} className="bg-white border border-[#EAE7E2] shadow-lg shadow-gray-100/50 overflow-hidden relative fade-in">
                    <div className="h-1 w-full bg-[#C29591]"></div>
                    {(() => {
                      const linkedItem = cloudItems.find(i => i.title === booking.itemTitle);
                      return linkedItem?.images?.[0] ? (
                        <div className="w-full h-40 relative bg-gray-50 group">
                          <img src={linkedItem.images[0]} className="w-full h-full object-cover" alt="booked-item" />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#463E3E]/90 via-transparent to-transparent flex items-end p-4">
                            <div className="text-white">
                              <p className="text-[10px] tracking-[0.2em] opacity-80 uppercase mb-1">{linkedItem.category}</p>
                              <h3 className="text-sm font-medium tracking-wide">{booking.itemTitle}</h3>
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })()}

                    <div className="p-8">
                      <div className="bg-[#FAF9F6] border border-[#EAE7E2] p-4 text-center mb-8">
                        <p className="text-[10px] text-gray-400 tracking-widest uppercase mb-1">預約時間</p>
                        <div className="flex justify-center items-baseline gap-2 text-[#463E3E]">
                          <span className="text-lg font-bold tracking-widest">{booking.date}</span>
                          <span className="text-[#C29591]">•</span>
                          <span className="text-xl font-bold tracking-widest">{booking.time}</span>
                        </div>
                        <div className="mt-2 text-xs font-bold text-[#C29591]">{booking.storeName}</div>
                      </div>

                      <div className="space-y-4 text-xs tracking-wide text-[#5C5555]">
                        <div className="flex justify-between border-b border-dashed border-gray-100 pb-2">
                          <span className="text-gray-400">顧客姓名</span>
                          <span className="font-medium text-[#463E3E]">{booking.name}</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-gray-100 pb-2">
                          <span className="text-gray-400">聯絡電話</span>
                          <span className="font-medium font-mono">{booking.phone}</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-gray-100 pb-2">
                          <span className="text-gray-400">加購項目</span>
                          <span className="font-medium text-[#463E3E]">{booking.addonName}</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-gray-100 pb-2">
                          <span className="text-gray-400">預計總時長</span>
                          <span className="font-medium text-[#463E3E]">{booking.totalDuration} 分鐘</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-gray-100 pb-2">
                          <span className="text-gray-400">付款方式</span>
                          <span className="font-medium text-[#463E3E]">{booking.paymentMethod || '門市付款'}</span>
                        </div>
                      </div>

                      <div className="mt-8 pt-6 border-t border-[#EAE7E2] flex justify-between items-end">
                        <span className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">Total Amount</span>
                        <div className="text-2xl font-bold text-[#C29591] leading-none">
                          <span className="text-xs mr-1 text-gray-400 font-normal align-top mt-1 inline-block">NT$</span>
                          {booking.totalAmount?.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
              ))}
              </div>
          </div>
        ) : activeTab === 'store' ? (
          <div className="max-w-4xl mx-auto py-16 px-6">
            <h2 className="text-2xl font-light tracking-[0.3em] text-center mb-12 text-[#463E3E]">STORE LOCATIONS / 門市資訊</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="bg-white border border-[#EAE7E2] group hover:border-[#C29591] transition-colors duration-300">
                  <div className="aspect-video bg-gray-100 overflow-hidden relative">
                     <img src="https://images.unsplash.com/photo-1522337660859-02fbefca4702?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="store" />
                     <div className="absolute inset-0 bg-[#463E3E]/10 group-hover:bg-transparent transition-colors"></div>
                  </div>
                  <div className="p-8">
                     <h3 className="text-lg font-medium tracking-widest text-[#463E3E] mb-2">桃園文中店</h3>
                     <div className="w-8 h-[1px] bg-[#C29591] mb-6"></div>
                     <div className="flex items-start gap-3 text-xs text-gray-500 leading-relaxed mb-6">
                        <MapPin size={16} className="text-[#C29591] flex-shrink-0 mt-0.5" />
                        <span>桃園區文中三路 67 號 1 樓</span>
                     </div>
                     <button 
                       onClick={() => window.open('https://www.google.com/maps/search/?api=1&query=桃園區文中三路67號1樓', '_blank')}
                       className="w-full border border-[#EAE7E2] py-3 text-xs tracking-widest text-gray-400 hover:bg-[#463E3E] hover:text-white hover:border-[#463E3E] transition-all"
                     >
                       GOOGLE MAPS
                     </button>
                  </div>
               </div>
            </div>
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
          // Catalog Tab
          <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
            <div className="flex flex-col gap-6 border-b border-[#EAE7E2] pb-8 mb-8">
                <div className="flex flex-wrap gap-4 justify-center items-center">
                   <span className="text-[10px] text-gray-300 tracking-widest mr-2">STYLE</span>
                   {activeCategories.map(c => (
                     <button key={c} onClick={() => setStyleFilter(c)} className={`text-xs tracking-widest px-4 py-1 transition-all duration-300 ${styleFilter===c ? 'text-[#C29591] font-bold border-b border-[#C29591]' : 'text-gray-400 hover:text-[#463E3E]'}`}>{c}</button>
                   ))}
                </div>

                <div className="flex flex-wrap gap-4 justify-center items-center">
                   <span className="text-[10px] text-gray-300 tracking-widest mr-2">PRICE</span>
                   {PRICE_CATEGORIES.map(p => (
                     <button key={p} onClick={() => setPriceFilter(p)} className={`text-xs tracking-widest px-4 py-1 transition-all duration-300 ${priceFilter===p ? 'text-[#C29591] font-bold border-b border-[#C29591]' : 'text-gray-400 hover:text-[#463E3E]'}`}>{p}</button>
                   ))}
                </div>

                {/* Tag Filter Display */}
                {tagFilter && (
                  <div className="flex justify-center items-center">
                    <button 
                      onClick={() => setTagFilter('')}
                      className="flex items-center gap-2 bg-[#C29591] text-white px-4 py-1.5 rounded-full text-xs tracking-wide hover:bg-[#463E3E] transition-colors"
                    >
                      正在瀏覽標籤：#{tagFilter} <X size={14} />
                    </button>
                  </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16">
              {filteredItems.map(item => (
                <StyleCard key={item.id} item={item} isLoggedIn={isLoggedIn}
                  onEdit={(i) => {
                    setEditingItem(i); 
                    const tagsStr = i.tags ? i.tags.join(', ') : '';
                    setFormData({...i, tags: tagsStr}); 
                    setIsUploadModalOpen(true);
                  }}
                  onDelete={(id) => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', id))}
                  onBook={(i, addon) => { 
                    setSelectedItem(i); 
                    setSelectedAddon(addon); 
                    setBookingData(prev => ({
                        ...prev,
                        storeId: '',
                        date: '',
                        time: ''
                    }));
                    setBookingStep('form'); 
                    window.scrollTo(0,0); 
                  }}
                  onTagClick={setTagFilter} 
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
              <input type="password" autoComplete="off" placeholder="••••" className="w-full border-b py-4 text-center tracking-[1.5em] outline-none" onChange={e => setPasswordInput(e.target.value)} autoFocus />
              <button className="w-full bg-[#463E3E] text-white py-4 mt-6 text-xs tracking-widest">ENTER</button>
            </form>
          </div>
        </div>
      )}

      {/* 管理彈窗 */}
      {isBookingManagerOpen && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-0 md:p-4 backdrop-blur-sm">
          <div className="bg-white w-full h-full md:w-full md:max-w-[98vw] md:h-[95vh] shadow-2xl flex flex-col overflow-hidden md:rounded-lg">
            <div className="bg-white px-8 py-6 border-b flex justify-between items-center">
              <h3 className="text-xs tracking-[0.3em] font-bold uppercase text-[#463E3E]">系統管理中心</h3>
              <button onClick={() => setIsBookingManagerOpen(false)}><X size={24}/></button>
            </div>

            {/* 管理分頁按鈕 */}
            <div className="flex border-b border-[#EAE7E2] px-8 bg-[#FAF9F6] sticky top-0 z-10 overflow-x-auto">
              {[
                { id: 'stores', label: '門市設定', icon: <Store size={14}/> },
                // 修改 1: 整合加購品頁面與分類 Hashtag
                { id: 'attributes', label: '商品屬性與加購', icon: <Layers size={14}/> },
                { id: 'staff_holiday', label: '人員與休假', icon: <Users size={14}/> },
                { id: 'bookings', label: '預約管理', icon: <Calendar size={14}/> }
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setManagerTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-xs tracking-widest transition-all whitespace-nowrap ${managerTab === tab.id ? 'bg-white border-x border-t border-[#EAE7E2] border-b-white text-[#C29591] font-bold -mb-[1px]' : 'text-gray-400 hover:text-[#463E3E]'}`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-12">
              
              {/* --- 0. 門市設定區塊 --- */}
              {managerTab === 'stores' && (
                <section className="space-y-6 fade-in">
                  <div className="border-l-4 border-[#C29591] pl-4">
                    <h4 className="text-sm font-bold tracking-widest text-[#463E3E]">門市管理</h4>
                    <p className="text-[10px] text-gray-400 mt-1">設定品牌旗下的所有分店</p>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      className="flex-1 border p-2 text-xs outline-none" 
                      placeholder="輸入新門市名稱" 
                      value={newStoreInput} 
                      onChange={e => setNewStoreInput(e.target.value)}
                    />
                    <button onClick={() => {
                      if(!newStoreInput) return;
                      const newStore = { id: Date.now().toString(), name: newStoreInput, cleaningTime: 20 };
                      saveShopSettings({ ...shopSettings, stores: [...shopSettings.stores, newStore] });
                      setNewStoreInput('');
                    }} className="bg-[#463E3E] text-white px-4 text-xs">新增</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {shopSettings.stores.map(store => (
                      <div key={store.id} className="border p-4 bg-white shadow-sm hover:border-[#C29591] transition-colors group">
                        <div className="flex justify-between items-start mb-3">
                          <span className="font-bold text-sm text-[#463E3E] tracking-widest">{store.name}</span>
                          <button onClick={() => {
                            if(confirm('確定刪除此門市？相關人員與預約將受影響。')) {
                              saveShopSettings({ ...shopSettings, stores: shopSettings.stores.filter(s => s.id !== store.id) });
                            }
                          }}><Trash2 size={14} className="text-gray-300 hover:text-red-500"/></button>
                        </div>
                        <div className="flex items-center gap-2 bg-[#FAF9F6] p-2 rounded">
                           <Clock size={12} className="text-gray-400"/>
                           <span className="text-[10px] text-gray-500 whitespace-nowrap">整備時間:</span>
                           <input 
                             type="number" 
                             className="w-10 bg-white border border-gray-200 text-center text-xs p-1 outline-none focus:border-[#C29591]"
                             defaultValue={store.cleaningTime || 20}
                             onBlur={(e) => {
                               const val = Number(e.target.value);
                               if(val < 0) return;
                               const updatedStores = shopSettings.stores.map(s => s.id === store.id ? {...s, cleaningTime: val} : s);
                               saveShopSettings({...shopSettings, stores: updatedStores});
                             }}
                           />
                           <span className="text-[10px] text-gray-400">分</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* --- 1. 商品屬性與加購 (整合後的分頁) --- */}
              {managerTab === 'attributes' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 fade-in">
                  
                  {/* 第一欄：風格分類管理 */}
                  <section className="space-y-6 lg:col-span-1 border-b lg:border-b-0 lg:border-r border-[#EAE7E2] pb-8 lg:pb-0 lg:pr-8">
                    <div className="border-l-4 border-[#C29591] pl-4">
                      <h4 className="text-sm font-bold tracking-widest text-[#463E3E]">風格分類管理</h4>
                      <p className="text-[10px] text-gray-400 mt-1">管理前台篩選與上傳時的分類選項</p>
                    </div>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            className="flex-1 border p-2 text-xs outline-none" 
                            placeholder="新分類 (如: 節慶限定)" 
                            value={newCategoryInput} 
                            onChange={e => setNewCategoryInput(e.target.value)}
                        />
                        <button onClick={() => {
                            if(!newCategoryInput || shopSettings.styleCategories.includes(newCategoryInput)) return;
                            saveShopSettings({ ...shopSettings, styleCategories: [...shopSettings.styleCategories, newCategoryInput] });
                            setNewCategoryInput('');
                        }} className="bg-[#463E3E] text-white px-3 text-xs">新增</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {shopSettings.styleCategories.map(cat => (
                            <div key={cat} className="group relative bg-[#FAF9F6] border border-[#EAE7E2] px-3 py-2 text-xs text-[#5C5555]">
                                {cat}
                                <button 
                                    onClick={() => {
                                        if(confirm(`確定刪除分類「${cat}」？`)) {
                                            saveShopSettings({ ...shopSettings, styleCategories: shopSettings.styleCategories.filter(c => c !== cat) });
                                        }
                                    }}
                                    className="absolute -top-2 -right-2 bg-red-400 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={10} />
                                </button>
                            </div>
                        ))}
                    </div>
                  </section>

                  {/* 第二欄：常用 Hashtag 管理 */}
                  <section className="space-y-6 lg:col-span-1 border-b lg:border-b-0 lg:border-r border-[#EAE7E2] pb-8 lg:pb-0 lg:pr-8">
                    <div className="border-l-4 border-[#C29591] pl-4">
                        <h4 className="text-sm font-bold tracking-widest text-[#463E3E]">常用標籤 (Hashtag)</h4>
                        <p className="text-[10px] text-gray-400 mt-1">設定常用的標籤，上傳時可快速選用</p>
                    </div>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            className="flex-1 border p-2 text-xs outline-none" 
                            placeholder="新標籤 (如: 顯白)" 
                            value={newTagInput} 
                            onChange={e => setNewTagInput(e.target.value)}
                        />
                        <button onClick={() => {
                            if(!newTagInput || shopSettings.savedTags.includes(newTagInput)) return;
                            saveShopSettings({ ...shopSettings, savedTags: [...shopSettings.savedTags, newTagInput] });
                            setNewTagInput('');
                        }} className="bg-[#463E3E] text-white px-3 text-xs">新增</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {shopSettings.savedTags.map(tag => (
                            <div key={tag} className="group relative bg-[#FAF9F6] border border-[#EAE7E2] px-3 py-2 text-xs text-gray-500 rounded-full">
                                #{tag}
                                <button 
                                    onClick={() => saveShopSettings({ ...shopSettings, savedTags: shopSettings.savedTags.filter(t => t !== tag) })}
                                    className="absolute -top-1 -right-1 bg-red-400 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={8} />
                                </button>
                            </div>
                        ))}
                        {shopSettings.savedTags.length === 0 && <span className="text-[10px] text-gray-300">尚未設定常用標籤</span>}
                    </div>
                  </section>

                  {/* 第三欄：加購品設定 */}
                  <section className="space-y-6 lg:col-span-1">
                    <div className="border-l-4 border-[#C29591] pl-4">
                      <h4 className="text-sm font-bold tracking-widest text-[#463E3E]">加購品項</h4>
                      <p className="text-[10px] text-gray-400 mt-1">設定如「卸甲」、「延甲」等額外服務</p>
                    </div>
                    <form onSubmit={handleAddAddon} className="bg-[#FAF9F6] p-4 border border-[#EAE7E2] space-y-3">
                      <div>
                        <input type="text" className="w-full border p-2 text-xs outline-none" placeholder="項目名稱 (如：卸甲)" value={addonForm.name} onChange={e => setAddonForm({...addonForm, name: e.target.value})} />
                      </div>
                      <div className="flex gap-2">
                        <input type="number" className="w-1/2 border p-2 text-xs outline-none" placeholder="金額" value={addonForm.price} onChange={e => setAddonForm({...addonForm, price: e.target.value})} />
                        <input type="number" className="w-1/2 border p-2 text-xs outline-none" placeholder="分鐘" value={addonForm.duration} onChange={e => setAddonForm({...addonForm, duration: e.target.value})} />
                      </div>
                      <button className="w-full bg-[#463E3E] text-white py-2 text-[10px] tracking-widest uppercase hover:bg-[#C29591] transition-colors">新增項目</button>
                    </form>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {addons.map(addon => (
                        <div key={addon.id} className="border border-[#EAE7E2] p-3 flex justify-between items-center bg-white shadow-sm">
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-[#463E3E]">{addon.name}</div>
                            <div className="text-[10px] text-gray-400">+${addon.price} / {addon.duration}分</div>
                          </div>
                          <button onClick={() => { if(confirm('確定刪除此加購項？')) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'addons', addon.id)); }}>
                            <Trash2 size={12} className="text-gray-300 hover:text-red-500 transition-colors"/>
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {/* --- 2. 人員與休假管理區塊 --- */}
              {managerTab === 'staff_holiday' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 fade-in">
                  <section className="space-y-6">
                    <div className="flex justify-between items-center border-l-4 border-[#C29591] pl-4">
                      <div>
                        <h4 className="text-sm font-bold tracking-widest text-[#463E3E]">人員名單與請假</h4>
                        <p className="text-[10px] text-gray-400 mt-1">設定美甲師名稱，系統會根據剩餘上班人數決定預約上限</p>
                      </div>
                      <button onClick={() => {
                        const name = prompt("請輸入美甲師姓名：");
                        if(name) {
                          const defaultStoreId = shopSettings.stores[0]?.id || '';
                          saveShopSettings({ ...shopSettings, staff: [...(shopSettings.staff || []), { id: Date.now().toString(), name, storeId: defaultStoreId, leaveDates: [] }] });
                        }
                      }} className="text-[10px] bg-[#C29591] text-white px-4 py-2 rounded-full hover:bg-[#463E3E] transition-colors">+ 新增人員</button>
                    </div>

                    <div className="space-y-4">
                      {(shopSettings.staff || []).map(staff => (
                        <div key={staff.id} className="bg-[#FAF9F6] border border-[#EAE7E2] p-5 space-y-4">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold flex items-center gap-2"><Users size={14} className="text-[#C29591]"/> {staff.name}</span>
                              <select 
                                value={staff.storeId} 
                                onChange={(e) => {
                                  const updatedStaff = shopSettings.staff.map(s => s.id === staff.id ? {...s, storeId: e.target.value} : s);
                                  saveShopSettings({...shopSettings, staff: updatedStaff});
                                }}
                                className="text-[10px] border bg-white p-1 ml-2"
                              >
                                {shopSettings.stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
                              </select>
                            </div>
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

                  <section className="space-y-6">
                      <h4 className="text-sm font-bold tracking-widest border-l-4 border-[#C29591] pl-4 uppercase">門市公休日設定</h4>
                      <div className="flex gap-2 items-center bg-[#FAF9F6] p-3 border">
                        <select 
                          className="text-xs border p-2 bg-white"
                          value={newHolidayInput.storeId}
                          onChange={e => setNewHolidayInput({...newHolidayInput, storeId: e.target.value})}
                        >
                          <option value="all">全品牌公休</option>
                          {shopSettings.stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <input type="date" className="flex-1 p-2 border text-xs outline-none focus:border-[#C29591]" value={newHolidayInput.date} onChange={e => setNewHolidayInput({...newHolidayInput, date: e.target.value})} />
                        <button onClick={() => { 
                          if(!newHolidayInput.date) return; 
                          saveShopSettings({...shopSettings, holidays: [...(shopSettings.holidays || []), newHolidayInput]}); 
                        }} className="bg-[#463E3E] text-white px-4 py-2 text-[10px] hover:bg-[#C29591] transition-colors">新增</button>
                      </div>
                      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                        {(shopSettings.holidays || []).map((h, idx) => (
                          <span key={idx} className="text-[10px] bg-gray-100 text-gray-500 px-3 py-1.5 border flex items-center gap-2">
                            {h.date} ({h.storeId === 'all' ? '全' : shopSettings.stores.find(s=>s.id===h.storeId)?.name})
                            <X size={12} className="cursor-pointer" onClick={() => saveShopSettings({...shopSettings, holidays: shopSettings.holidays.filter((_, i) => i !== idx)})} />
                          </span>
                        ))}
                      </div>
                  </section>
                </div>
              )}

              {/* --- 3. 預約管理區塊 --- */}
              {managerTab === 'bookings' && (
                <section className="space-y-6 fade-in h-full flex flex-col">
                  <div className="flex justify-between items-center border-b border-dashed pb-4">
                    <div className="border-l-4 border-[#C29591] pl-4">
                      <h4 className="text-sm font-bold tracking-widest text-[#463E3E]">預約訂單管理</h4>
                      <p className="text-[10px] text-gray-400 mt-1">查看與管理所有顧客預約</p>
                    </div>
                    <div className="flex gap-2 items-center bg-[#FAF9F6] p-1 rounded-lg">
                      <div className="flex items-center px-2">
                        <Filter size={14} className="text-gray-400 mr-1"/>
                        <select 
                          className="text-xs border-none bg-transparent outline-none text-[#463E3E] font-medium"
                          value={adminSelectedStore}
                          onChange={e => setAdminSelectedStore(e.target.value)}
                        >
                          <option value="all">全部分店</option>
                          {shopSettings.stores.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-[1px] h-6 bg-gray-300 mx-1"></div>
                      <button 
                        onClick={() => setBookingViewMode('list')}
                        className={`p-2 rounded ${bookingViewMode === 'list' ? 'bg-white shadow text-[#C29591]' : 'text-gray-400'}`}
                      ><ListIcon size={16}/></button>
                      <button 
                        onClick={() => { setBookingViewMode('calendar'); setAdminSelectedDate(getTodayString()); }}
                        className={`p-2 rounded ${bookingViewMode === 'calendar' ? 'bg-white shadow text-[#C29591]' : 'text-gray-400'}`}
                      ><Grid size={16}/></button>
                      <button 
                        onClick={handleExportCSV}
                        className="p-2 rounded text-gray-400 hover:bg-white hover:text-[#C29591] transition-colors"
                        title="匯出預約清單"
                      ><Download size={16}/></button>
                    </div>
                  </div>

                  {bookingViewMode === 'list' ? (
                    <div className="space-y-3 overflow-y-auto pr-2 flex-1">
                      {storeFilteredBookings.map(b => (
                        <div key={b.id} className="border p-4 flex justify-between items-center bg-[#FAF9F6] text-[11px] hover:border-[#C29591] transition-colors group">
                          <div>
                            <div className="font-bold text-sm mb-1 flex items-center gap-2">
                              {b.date} <span className="text-[#C29591]">{b.time}</span>
                              {new Date(`${b.date} ${b.time}`) < new Date() && <span className="px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded text-[9px]">已過期</span>}
                              <span className="bg-white border px-1.5 rounded text-gray-400">{b.storeName}</span>
                            </div>
                            <div className="font-bold">{b.name} <span className="font-normal text-gray-400 mx-1">|</span> {b.phone}</div>
                            <div className="text-gray-500 mt-1">
                              {b.itemTitle} 
                              {b.addonName && b.addonName !== '無' ? <span className="text-[#C29591]"> + {b.addonName}</span> : ''}
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5">付款: {b.paymentMethod || '門市付款'}</div>
                          </div>
                          <button onClick={() => { if(confirm('確定取消此預約？')) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', b.id)); }} className="text-gray-300 hover:text-red-500 transition-colors p-2"><Trash2 size={16}/></button>
                        </div>
                      ))}
                      {storeFilteredBookings.length === 0 && <p className="text-center text-gray-300 text-xs py-10">目前沒有預約資料</p>}
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row gap-8 h-auto md:h-full">
                      <div className="w-full md:w-auto flex-shrink-0">
                        <AdminBookingCalendar 
                          bookings={storeFilteredBookings} 
                          selectedDate={adminSelectedDate}
                          onDateSelect={setAdminSelectedDate}
                        />
                      </div>
                      <div className="flex-1 md:overflow-y-auto border-l-0 md:border-l border-dashed pl-0 md:pl-8 space-y-3">
                        <h5 className="text-xs font-bold text-[#463E3E] mb-4 flex items-center gap-2">
                          <Calendar size={14}/> {adminSelectedDate} 的預約
                        </h5>
                        {dateFilteredBookings.length > 0 ? dateFilteredBookings.map(b => (
                          <div key={b.id} className="border p-4 bg-white shadow-sm text-xs relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#C29591]"></div>
                            <div className="flex justify-between">
                              <div className="flex gap-2 items-baseline">
                                <span className="font-bold text-lg">{b.time}</span>
                                <span className="text-[10px] text-gray-400 border px-1 rounded">{b.storeName}</span>
                              </div>
                              <button onClick={() => { if(confirm('確定取消此預約？')) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', b.id)); }} className="text-gray-300 hover:text-red-500"><Trash2 size={14}/></button>
                            </div>
                            <div className="mt-1 font-bold">{b.name}</div>
                            <div className="text-gray-400">{b.phone}</div>
                            <div className="mt-2 pt-2 border-t border-dashed flex justify-between">
                              <span>{b.itemTitle}</span>
                              <span className="text-[#C29591] font-bold">NT${b.totalAmount}</span>
                            </div>
                          </div>
                        )) : (
                          <p className="text-gray-300 text-xs text-center py-10">當日無預約</p>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              )}
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
              
              {/* 修改部分：將價格與服務時間並列顯示，並加上明確標題 */}
              <div className="flex gap-4">
                <div className="w-1/2">
                    <label className="text-xs text-gray-400 mb-1 block">價格 (NT$)</label>
                    <input type="number" required className="w-full border-b py-2 outline-none" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="輸入價格" />
                </div>
                <div className="w-1/2">
                    <label className="text-xs text-gray-400 mb-1 block">服務時間 (分鐘)</label>
                    <input type="number" required className="w-full border-b py-2 outline-none" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} placeholder="預設 90" />
                </div>
              </div>

              <div className="space-y-2">
                 <label className="text-xs text-gray-400">風格分類</label>
                 <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full border-b py-2 outline-none bg-white">
                   {shopSettings.styleCategories.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
              </div>

              {/* Hashtag 輸入框 */}
              <div className="space-y-2">
                  <label className="text-xs text-gray-400 flex items-center gap-1"><Hash size={10} /> 標籤 (Tags)</label>
                  <input 
                    type="text" 
                    className="w-full border-b py-2 outline-none placeholder-gray-300 text-xs" 
                    value={formData.tags} 
                    onChange={e => setFormData({...formData, tags: e.target.value})} 
                    placeholder="例如：顯白, 夏天 (請用逗號分隔)" 
                  />
                  {/* 常用標籤快速選擇 */}
                  {shopSettings.savedTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                          {shopSettings.savedTags.map(tag => (
                              <button 
                                type="button"
                                key={tag}
                                onClick={() => {
                                    const currentTags = formData.tags ? formData.tags.split(',').map(t => t.trim()) : [];
                                    if(!currentTags.includes(tag)) {
                                        const newTags = [...currentTags, tag].filter(t => t).join(', ');
                                        setFormData({...formData, tags: newTags});
                                    }
                                }}
                                className="text-[9px] bg-gray-100 text-gray-500 px-2 py-1 rounded-full hover:bg-[#C29591] hover:text-white transition-colors"
                              >
                                #{tag}
                              </button>
                          ))}
                      </div>
                  )}
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