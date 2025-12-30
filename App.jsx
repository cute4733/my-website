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

// 生成 10 分鐘一格的時段
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

// 時間轉換輔助函式
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

// --- 自定義月曆組件 ---
const CustomCalendar = ({ selectedDate, onDateSelect, specificHolidays }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();

  // 計算月曆資訊
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const prevMonth = () => setViewDate(new Date(currentYear, currentMonth - 1, 1));
  const nextMonth = () => setViewDate(new Date(currentYear, currentMonth + 1, 1));

  const renderDays = () => {
    const days = [];
    // 填充空白
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
    }
    // 填充日期
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
            ${isSelected ? 'bg-[#463E3E] text-white !line-through-none' : ''}
            ${isHoliday && !isSelected ? 'bg-red-50/50' : ''}
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
      <div className="grid grid-cols-7 gap-1">
        {renderDays()}
      </div>
      <div className="mt-4 flex gap-3 px-2 border-t pt-3">
        <div className="flex items-center gap-1 text-[9px] text-gray-400"><div className="w-2 h-2 bg-red-50 border border-gray-100"></div> 公休日</div>
        <div className="flex items-center gap-1 text-[9px] text-gray-400"><div className="w-2 h-2 bg-[#463E3E]"></div> 已選擇</div>
      </div>
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
  
  // 系統設定狀態 (移除 closedDays 固定公休)
  const [shopSettings, setShopSettings] = useState({ specificHolidays: [], maxCapacity: 1 });
  const [newHolidayInput, setNewHolidayInput] = useState('');
  
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

  // 初始化登入
  useEffect(() => {
    signInAnonymously(auth);
    onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  // 監聽 Firebase 資料
  useEffect(() => {
    if (!user) return;

    // 1. 監聽店內設定
    const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'settings'), (d) => {
      if (d.exists()) {
        const data = d.data();
        setShopSettings({
          specificHolidays: Array.isArray(data.specificHolidays) ? data.specificHolidays : [],
          maxCapacity: Number(data.maxCapacity) || 1
        });
      } else {
        setShopSettings({ specificHolidays: [], maxCapacity: 1 });
      }
    });

    // 2. 監聽商品
    const unsubItems = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), (s) => 
      setCloudItems(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    // 3. 監聽加購項目
    const unsubAddons = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'addons'), (s) => 
      setAddons(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    // 4. 監聽預約訂單
    const bookingQuery = query(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), orderBy('createdAt', 'desc'));
    const unsubBookings = onSnapshot(bookingQuery, (s) => setAllBookings(s.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubSettings(); unsubItems(); unsubAddons(); unsubBookings(); };
  }, [user]);

  // 儲存設定
  const saveShopSettings = async (newSettings) => {
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'settings'), newSettings);
    } catch (e) { alert("設定儲存失敗"); }
  };

  // 檢查時段是否客滿
  const isTimeSlotFull = (date, checkTimeStr) => {
    if (!date || !checkTimeStr) return false;
    const checkMin = timeToMinutes(checkTimeStr);
    const bookingsToday = allBookings.filter(b => b.date === date);
    
    const concurrentCount = bookingsToday.filter(b => {
      const start = timeToMinutes(b.time);
      const duration = Number(b.totalDuration) || 90;
      const end = start + duration + 20;
      return checkMin >= start && checkMin < end;
    }).length;

    return concurrentCount >= (shopSettings.maxCapacity || 1);
  };

  // 送出預約
  const handleConfirmBooking = async () => {
    if(!bookingData.name || !bookingData.phone || !bookingData.date || !bookingData.time) {
      alert('請填寫完整資訊'); return;
    }
    setIsSubmitting(true);
    try {
      const totalDur = (Number(selectedItem?.duration) || 90) + (Number(selectedAddon?.duration) || 0);
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), {
        ...bookingData,
        itemTitle: selectedItem?.title,
        addonName: selectedAddon?.name || '無',
        totalAmount: (Number(selectedItem?.price) || 0) + (Number(selectedAddon?.price) || 0),
        totalDuration: totalDur,
        createdAt: serverTimestamp()
      });
      setBookingStep('success');
    } catch (e) { alert('預約失敗'); } finally { setIsSubmitting(false); }
  };

  // 商品上傳/更新
  const handleItemSubmit = async (e) => {
    e.preventDefault();
    if (formData.images.length === 0) { alert("請至少上傳一張圖片"); return; }
    setIsUploading(true);
    try {
      const payload = { 
        ...formData, 
        price: Number(formData.price), 
        duration: Number(formData.duration),
        updatedAt: serverTimestamp()
      };
      if (editingItem) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', editingItem.id), payload);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), { 
          ...payload, 
          createdAt: serverTimestamp() 
        });
      }
      setIsUploadModalOpen(false);
      setEditingItem(null);
      setFormData({ title: '', price: '', category: '極簡氣質', duration: '90', images: [] });
    } catch (err) { alert("儲存失敗"); } finally { setIsUploading(false); }
  };

  // 篩選商品
  const filteredItems = cloudItems.filter(item => {
    const matchStyle = styleFilter === '全部' || item.category === styleFilter;
    let matchPrice = true;
    if (priceFilter === '1300以下') matchPrice = item.price < 1300;
    else if (priceFilter === '1300-1900') matchPrice = item.price >= 1300 && item.price <= 1900;
    else if (priceFilter === '1900以上') matchPrice = item.price > 1900;
    return matchStyle && matchPrice;
  });

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555] font-sans">
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-[#EAE7E2]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <h1 className="text-xl tracking-[0.4em] font-extralight cursor-pointer text-[#463E3E]" onClick={() => {setActiveTab('home'); setBookingStep('none');}}>UNIWAWA</h1>
          <div className="flex gap-6 text-sm tracking-widest font-medium uppercase items-center">
            <button onClick={() => {setActiveTab('home'); setBookingStep('none');}} className={activeTab === 'home' ? 'text-[#C29591]' : ''}>首頁</button>
            <button onClick={() => {setActiveTab('catalog'); setBookingStep('none');}} className={activeTab === 'catalog' ? 'text-[#C29591]' : ''}>款式</button>
            {isLoggedIn && (
              <div className="flex gap-4 border-l pl-4 border-[#EAE7E2]">
                <button onClick={() => {setEditingItem(null); setFormData({title:'', price:'', category:'極簡氣質', duration:'90', images:[]}); setIsUploadModalOpen(true)}} className="text-[#C29591]"><Plus size={18}/></button>
                <button onClick={() => setIsBookingManagerOpen(true)} className="text-[#C29591]"><Settings size={18}/></button>
              </div>
            )}
            {!isLoggedIn && <button onClick={() => setIsAdminModalOpen(true)} className="text-gray-300"><Lock size={14}/></button>}
          </div>
        </div>
      </nav>

      <main className="pt-20">
        {bookingStep === 'form' ? (
          <div className="max-w-2xl mx-auto px-6 py-12">
            <h2 className="text-2xl font-light tracking-[0.3em] text-center mb-8 text-[#463E3E]">RESERVATION / 預約資訊</h2>
            <div className="bg-white border border-[#EAE7E2] mb-6 p-6 shadow-sm">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] text-[#C29591] tracking-widest uppercase font-bold">預約項目</p>
                    <p className="text-sm font-medium">{selectedItem?.title} + {selectedAddon?.name || '無附加項目'}</p>
                  </div>
                  <div className="flex gap-8 text-right">
                    <div>
                      <p className="text-[10px] text-gray-400 tracking-widest uppercase">總時長</p>
                      <p className="text-lg font-light flex items-center justify-end gap-1">
                        <Clock size={14} className="text-gray-300"/> 
                        {(Number(selectedItem?.duration) || 0) + (Number(selectedAddon?.duration) || 0)} min
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 tracking-widest uppercase">總金額</p>
                      <p className="text-lg font-bold text-[#463E3E]">NT$ {((Number(selectedItem?.price) || 0) + (Number(selectedAddon?.price) || 0)).toLocaleString()}</p>
                    </div>
                  </div>
               </div>
            </div>

            <div className="bg-white border border-[#EAE7E2] p-8 shadow-sm space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input type="text" placeholder="顧客姓名" className="border-b py-2 outline-none focus:border-[#C29591]" onChange={e => setBookingData({...bookingData, name: e.target.value})} />
                <input type="tel" placeholder="聯絡電話" className="border-b py-2 outline-none focus:border-[#C29591]" onChange={e => setBookingData({...bookingData, phone: e.target.value})} />
              </div>
              
              <div className="space-y-4">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                   <CalendarIcon size={14} /> 選擇預約日期
                </p>
                <div className="flex justify-center">
                  <CustomCalendar 
                    selectedDate={bookingData.date}
                    onDateSelect={(d) => setBookingData({...bookingData, date: d, time: ''})}
                    specificHolidays={shopSettings.specificHolidays}
                  />
                </div>
              </div>

              {bookingData.date && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-1">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">選擇時段 ({bookingData.date})</p>
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                    {TIME_SLOTS.map(t => {
                      const full = isTimeSlotFull(bookingData.date, t);
                      return (
                        <button key={t} disabled={full} onClick={() => setBookingData({...bookingData, time:t})} className={`py-2 text-[10px] border transition-all ${full ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : bookingData.time===t ? 'bg-[#463E3E] text-white' : 'bg-white text-gray-400 hover:border-[#C29591]'}`}>
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button disabled={isSubmitting || !bookingData.time} onClick={handleConfirmBooking} className={`w-full py-4 text-xs tracking-widest uppercase transition-all ${!bookingData.time ? 'bg-gray-200 cursor-not-allowed' : 'bg-[#463E3E] text-white hover:bg-[#C29591]'}`}>
                {isSubmitting ? '處理中...' : '確認送出預約'}
              </button>
              <button onClick={() => setBookingStep('none')} className="w-full text-center text-[10px] text-gray-400 uppercase tracking-widest">返回重新選擇</button>
            </div>
          </div>
        ) : bookingStep === 'success' ? (
          <div className="max-w-md mx-auto py-20 px-6 animate-in fade-in zoom-in duration-500">
            <div className="text-center mb-10">
              <CheckCircle size={56} className="text-[#C29591] mx-auto mb-4" />
              <h2 className="text-2xl font-light tracking-[0.3em] text-[#463E3E]">預約成功</h2>
              <p className="text-xs text-gray-400 mt-2 tracking-widest uppercase font-light">Your appointment has been received</p>
            </div>
            <div className="bg-white border border-[#EAE7E2] shadow-xl p-8 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#463E3E] text-white text-[8px] px-3 py-1 tracking-[0.2em] uppercase">Official Receipt</div>
              <div className="border-b border-dashed pb-4">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Reservation Details</p>
                <div className="flex justify-between items-baseline">
                  <h3 className="text-lg font-medium text-[#463E3E]">{bookingData.name} 先生/小姐</h3>
                  <span className="text-xs font-mono text-gray-400">{bookingData.phone}</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400 font-light">預約日期 Date</span>
                  <span className="text-[#463E3E]">{bookingData.date}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400 font-light">預約時間 Time</span>
                  <span className="text-[#463E3E] font-bold">{bookingData.time}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400 font-light">選擇款式 Style</span>
                  <span className="text-[#463E3E]">{selectedItem?.title}</span>
                </div>
              </div>
              <div className="pt-4 border-t border-[#FAF9F6] flex justify-between items-end">
                <div>
                  <span className="text-[10px] text-gray-400 block uppercase">Total Time</span>
                  <span className="text-sm font-light">{(Number(selectedItem?.duration) || 90) + (Number(selectedAddon?.duration) || 0)} mins</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#C29591] block uppercase font-bold tracking-tighter">Amount Due</span>
                  <span className="text-2xl font-bold text-[#463E3E]">NT$ {((Number(selectedItem?.price) || 0) + (Number(selectedAddon?.price) || 0)).toLocaleString()}</span>
                </div>
              </div>
              <p className="text-[9px] text-center text-gray-300 tracking-widest uppercase pt-4">請截圖此畫面並於預約時間準時抵達</p>
            </div>
            <button onClick={() => {setBookingStep('none'); setActiveTab('home');}} className="w-full mt-10 border border-[#EAE7E2] py-4 text-[10px] tracking-[0.4em] uppercase hover:bg-[#463E3E] hover:text-white transition-all">Back to Home</button>
          </div>
        ) : activeTab === 'home' ? (
          <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-6 text-center">
            <span className="text-[#C29591] tracking-[0.4em] md:tracking-[0.8em] text-xs md:text-sm mb-10 uppercase font-extralight">EST. 2026 • TAOYUAN</span>
            <div className="w-full max-w-xl mb-12 shadow-2xl rounded-sm overflow-hidden border border-[#EAE7E2]">
              <img src="https://drive.google.com/thumbnail?id=1ZJv3DS8ST_olFt0xzKB_miK9UKT28wMO&sz=w1200" className="w-full h-auto max-h-[40vh] object-cover" />
            </div>
            <h2 className="text-4xl md:text-5xl font-extralight mb-12 tracking-[0.4em] text-[#463E3E] leading-relaxed">Beyond<br/>Expectation</h2>
            <button onClick={() => setActiveTab('catalog')} className="bg-[#463E3E] text-white px-16 py-4 tracking-[0.4em] text-xs font-light">進入作品集</button>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16">
              {filteredItems.map(item => (
                <div key={item.id} className="group flex flex-col bg-white border border-[#F0EDEA] shadow-sm">
                  <div className="aspect-[3/4] overflow-hidden relative">
                    <img src={item.images?.[0]} className="w-full h-full object-cover" />
                    {isLoggedIn && (
                      <div className="absolute top-4 right-4 flex gap-2">
                        <button onClick={() => {setEditingItem(item); setFormData(item); setIsUploadModalOpen(true);}} className="p-2 bg-white/90 rounded-full text-blue-600"><Edit3 size={16}/></button>
                        <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', item.id))} className="p-2 bg-white/90 rounded-full text-red-600"><Trash2 size={16}/></button>
                      </div>
                    )}
                  </div>
                  <div className="p-8 flex flex-col items-center text-center">
                    <span className="text-[10px] text-[#C29591] tracking-[0.4em] uppercase mb-2 font-medium">{item.category}</span>
                    <h3 className="text-[#463E3E] font-medium text-lg tracking-widest mb-1">{item.title}</h3>
                    <div className="flex items-center gap-1.5 text-gray-400 text-[10px] mb-4 uppercase tracking-widest font-light">
                      <Clock size={12} /> 預計服務：{item.duration || '90'} 分鐘
                    </div>
                    <p className="text-[#463E3E] font-bold text-xl mb-8"><span className="text-xs font-light tracking-widest mr-1">NT$</span>{item.price.toLocaleString()}</p>
                    <select className="w-full text-[11px] border border-[#EAE7E2] py-3 px-4 bg-[#FAF9F6] mb-8 outline-none" onChange={(e) => setSelectedAddon(addons.find(a => a.id === e.target.value) || null)}>
                      <option value="">請選擇指甲現況</option>
                      {addons.map(a => (<option key={a.id} value={a.id}>{a.name} (+${a.price} / {a.duration}分)</option>))}
                    </select>
                    <button onClick={() => { setSelectedItem(item); setBookingStep('form'); window.scrollTo(0,0); }} className="bg-[#463E3E] text-white px-8 py-3.5 rounded-full text-xs tracking-[0.2em] font-medium w-full hover:bg-[#C29591] transition-colors">點此預約</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {isBookingManagerOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-10 border-b pb-4">
              <h3 className="tracking-[0.3em] font-light uppercase flex items-center gap-2 text-[#463E3E]"><Settings size={20}/> 系統後台管理</h3>
              <button onClick={() => setIsBookingManagerOpen(false)}><X size={24}/></button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 space-y-4">
                <h4 className="text-xs font-bold border-l-4 border-[#C29591] pl-2 uppercase tracking-widest">最新預約訂單</h4>
                <div className="space-y-3">
                  {allBookings.map(b => (
                    <div key={b.id} className="border p-4 bg-[#FAF9F6] text-xs flex justify-between items-center">
                      <div className="space-y-1">
                        <div className="font-bold text-sm">{b.date} {b.time} — {b.name}</div>
                        <div className="text-[#C29591]">{b.itemTitle} / {b.addonName}</div>
                        <div className="text-gray-400">{b.phone} | {b.totalDuration}min | NT${b.totalAmount}</div>
                      </div>
                      <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', b.id))} className="text-red-300 hover:text-red-500"><Trash2 size={18}/></button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-8 border-l lg:pl-10">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold border-l-4 border-[#C29591] pl-2 uppercase tracking-widest">特定日期公休設定</h4>
                  <div className="flex gap-2">
                    <input type="date" className="flex-1 p-2 border text-xs" value={newHolidayInput} onChange={e => setNewHolidayInput(e.target.value)} />
                    <button onClick={() => { if(!newHolidayInput) return; saveShopSettings({...shopSettings, specificHolidays: [...(shopSettings.specificHolidays || []), newHolidayInput]}); setNewHolidayInput(''); }} className="bg-[#463E3E] text-white px-4 text-[10px]">新增公休</button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {(shopSettings.specificHolidays || []).map(date => (
                      <div key={date} className="flex justify-between items-center text-[10px] bg-[#FAF9F6] p-2 border border-dashed">
                        <span>{date}</span>
                        <button onClick={() => saveShopSettings({...shopSettings, specificHolidays: shopSettings.specificHolidays.filter(d => d !== date)})} className="text-red-300">移除</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white p-10 max-w-sm w-full shadow-2xl text-center">
            <h3 className="tracking-[0.5em] mb-10 font-light text-gray-400 text-sm uppercase">Admin Access</h3>
            <form onSubmit={(e) => { e.preventDefault(); if(passwordInput==="8888") setIsLoggedIn(true); setIsAdminModalOpen(false); }}>
              <input type="password" placeholder="••••" className="w-full border-b border-[#EAE7E2] py-4 text-center tracking-[1.5em] mb-10 outline-none" onChange={e => setPasswordInput(e.target.value)} autoFocus />
              <button className="w-full bg-[#463E3E] text-white py-4 tracking-[0.3em] text-xs">ENTER SYSTEM</button>
            </form>
          </div>
        </div>
      )}

      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8 border-b pb-4">
              <h3 className="tracking-widest font-light">{editingItem ? '修改款式' : '上傳新款作品'}</h3>
              <button onClick={() => setIsUploadModalOpen(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleItemSubmit} className="space-y-6">
              <input type="text" required className="w-full border-b py-2 outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="款式名稱" />
              <div className="flex gap-4">
                <input type="number" required className="w-1/2 border-b py-2 outline-none" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="價格" />
                <input type="number" required className="w-1/2 border-b py-2 outline-none" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} placeholder="分鐘數" />
              </div>
              <select className="w-full border-b py-2 bg-transparent outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                {STYLE_CATEGORIES.filter(c => c !== '全部').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex flex-wrap gap-2">
                {formData.images.map((img, i) => (
                  <div key={i} className="relative w-20 h-20 border"><img src={img} className="w-full h-full object-cover" /></div>
                ))}
                <label className="w-20 h-20 border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer">
                  <Upload size={16} className="text-gray-300" /><input type="file" hidden accept="image/*" multiple onChange={(e) => {
                    Array.from(e.target.files).forEach(file => {
                      const reader = new FileReader();
                      reader.onloadend = () => setFormData(p => ({...p, images: [...p.images, reader.result]}));
                      reader.readAsDataURL(file);
                    });
                  }} />
                </label>
              </div>
              <button disabled={isUploading} className="w-full bg-[#463E3E] text-white py-4 text-xs tracking-[0.3em]">{isUploading ? '處理中...' : '確認發布'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}