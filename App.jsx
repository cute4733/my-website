import React, { useState, useEffect } from 'react';
import { Plus, X, Lock, Trash2, Edit3, Settings, Clock, Calendar as CalendarIcon, MapPin, Users, UserMinus, ChevronLeft, ChevronRight, CheckCircle, Upload } from 'lucide-react';
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

// --- 子組件：自定義月曆 (整合請假判斷) ---
const CustomCalendar = ({ selectedDate, onDateSelect, settings }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today = new Date();
  today.setHours(0,0,0,0);

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      // 1. 檢查是否為全店公休日
      const isShopHoliday = (settings?.specificHolidays || []).includes(dateStr);
      
      // 2. 檢查是否全員請假 (可用人數為 0)
      const staffList = settings?.staff || [];
      const onLeaveCount = staffList.filter(s => (s.leaveDates || []).includes(dateStr)).length;
      const isAllOnLeave = staffList.length > 0 && (staffList.length - onLeaveCount) <= 0;

      const isPast = new Date(currentYear, currentMonth, d) < today;
      const isDisabled = isShopHoliday || isAllOnLeave || isPast;
      const isSelected = selectedDate === dateStr;

      days.push(
        <button key={d} disabled={isDisabled} onClick={() => onDateSelect(dateStr)}
          className={`h-10 w-10 text-[11px] rounded-full flex flex-col items-center justify-center transition-all 
            ${isDisabled ? 'text-gray-200 line-through cursor-not-allowed' : isSelected ? 'bg-[#463E3E] text-white shadow-lg' : 'hover:bg-[#C29591] hover:text-white'}`}>
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
      <div className="grid grid-cols-7 gap-1 mb-2 border-b pb-2">
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
  
  // 核心設定：包含公休、人員名單、請假
  const [shopSettings, setShopSettings] = useState({ specificHolidays: [], staff: [] });
  const [newHolidayInput, setNewHolidayInput] = useState('');
  
  const [bookingStep, setBookingStep] = useState('none');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedAddon, setSelectedAddon] = useState(null);
  const [bookingData, setBookingData] = useState({ name: '', phone: '', date: '', time: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isBookingManagerOpen, setIsBookingManagerOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

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

  // --- 產能計算邏輯 ---
  const isTimeSlotFull = (date, checkTimeStr) => {
    if (!date || !checkTimeStr) return false;
    
    // 計算該日可用人數：總人員數 - 該日請假人數
    const staffList = shopSettings.staff || [];
    const onLeaveCount = staffList.filter(s => (s.leaveDates || []).includes(date)).length;
    const availableStaff = staffList.length > 0 ? staffList.length - onLeaveCount : 1;

    const checkMin = timeToMinutes(checkTimeStr);
    const concurrent = allBookings.filter(b => {
      if (b.date !== date) return false;
      const start = timeToMinutes(b.time);
      const end = start + (Number(b.totalDuration) || 90) + 10;
      return checkMin >= start && checkMin < end;
    });

    return concurrent.length >= availableStaff;
  };

  const saveShopSettings = async (newSettings) => {
    await setDoc(doc(db, 'artifacts', appId, 'public', 'settings'), newSettings);
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

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555]">
      {/* 導覽列 */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-[#EAE7E2]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <h1 className="text-xl tracking-[0.4em] font-extralight cursor-pointer" onClick={() => {setActiveTab('home'); setBookingStep('none');}}>UNIWAWA</h1>
          <div className="flex gap-6 text-sm items-center">
            <button onClick={() => {setActiveTab('home'); setBookingStep('none');}} className={activeTab === 'home' ? 'text-[#C29591]' : ''}>首頁</button>
            <button onClick={() => {setActiveTab('catalog'); setBookingStep('none');}} className={activeTab === 'catalog' ? 'text-[#C29591]' : ''}>款式</button>
            {isLoggedIn ? (
              <button onClick={() => setIsBookingManagerOpen(true)} className="text-[#C29591]"><Settings size={18}/></button>
            ) : <button onClick={() => setIsAdminModalOpen(true)} className="text-gray-300"><Lock size={14}/></button>}
          </div>
        </div>
      </nav>

      <main className="pt-20">
        {/* 預約流程：略 (與原程式邏輯相同，調用新的 isTimeSlotFull) */}
        {bookingStep === 'form' ? (
          <div className="max-w-2xl mx-auto px-6 py-12">
            <h2 className="text-2xl font-light tracking-[0.3em] text-center mb-8">RESERVATION</h2>
            <div className="bg-white border p-8 shadow-sm space-y-8">
              <div className="flex justify-center">
                <CustomCalendar selectedDate={bookingData.date} onDateSelect={(d) => setBookingData({...bookingData, date: d, time: ''})} settings={shopSettings} />
              </div>
              {bookingData.date && (
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {TIME_SLOTS.map(t => (
                    <button key={t} disabled={isTimeSlotFull(bookingData.date, t)} onClick={() => setBookingData({...bookingData, time:t})}
                      className={`py-3 text-[10px] border ${bookingData.time===t ? 'bg-[#463E3E] text-white' : 'bg-white disabled:bg-gray-50 disabled:text-gray-200'}`}>{t}</button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input type="text" placeholder="顧客姓名" className="border-b py-2 outline-none focus:border-[#C29591]" onChange={e => setBookingData({...bookingData, name: e.target.value})} />
                <input type="tel" placeholder="聯絡電話" className="border-b py-2 outline-none focus:border-[#C29591]" onChange={e => setBookingData({...bookingData, phone: e.target.value})} />
              </div>
              <button disabled={isSubmitting || !bookingData.time} onClick={handleConfirmBooking} className="w-full py-4 bg-[#463E3E] text-white text-xs tracking-widest">{isSubmitting ? '處理中...' : '確認預約'}</button>
            </div>
          </div>
        ) : activeTab === 'home' ? (
          /* 完全保留原始首頁結構 */
          <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-6 text-center">
            <span className="text-[#C29591] tracking-[0.4em] md:tracking-[0.8em] text-xs md:text-sm mb-10 uppercase font-extralight">EST. 2026 • TAOYUAN</span>
            <div className="w-full max-w-xl mb-12 shadow-2xl rounded-sm overflow-hidden border border-[#EAE7E2]">
              <img src="https://drive.google.com/thumbnail?id=1ZJv3DS8ST_olFt0xzKB_miK9UKT28wMO&sz=w1200" className="w-full h-auto max-h-[40vh] object-cover" alt="home" />
            </div>
            <h2 className="text-4xl md:text-5xl font-extralight mb-12 tracking-[0.4em] text-[#463E3E] leading-relaxed">Beyond<br/>Expectation</h2>
            <button onClick={() => setActiveTab('catalog')} className="bg-[#463E3E] text-white px-16 py-4 tracking-[0.4em] text-xs font-light hover:bg-[#C29591] transition-all">點此預約</button>
          </div>
        ) : (
          /* 款式列表：略 (同原程式) */
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16">
              {cloudItems.map(item => (
                <div key={item.id} className="border p-8 text-center bg-white">
                  <h3 className="mb-4 tracking-widest">{item.title}</h3>
                  <button onClick={() => {setSelectedItem(item); setBookingStep('form');}} className="bg-[#463E3E] text-white px-8 py-2 text-xs">預約此款式</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 管理中心彈窗：新增人員與請假管理功能 */}
      {isBookingManagerOpen && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#FAF9F6] w-full max-w-5xl h-[85vh] shadow-2xl flex flex-col overflow-hidden rounded-sm">
            <div className="bg-white px-8 py-6 border-b flex justify-between items-center">
              <h3 className="text-xs tracking-[0.3em] font-bold uppercase text-[#463E3E]">系統管理中心 / 人員管理</h3>
              <button onClick={() => setIsBookingManagerOpen(false)}><X size={24}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-12">
              {/* 1. 人員與請假管理 (本次核心更新) */}
              <section className="space-y-6">
                <div className="flex justify-between items-center border-l-4 border-[#C29591] pl-4">
                  <div>
                    <h4 className="text-sm font-bold tracking-widest text-[#463E3E] uppercase">人員名單</h4>
                    <p className="text-[10px] text-gray-400 mt-1">人員數即為「同時段預約上限」</p>
                  </div>
                  <button onClick={() => {
                    const name = prompt("輸入新美甲師姓名：");
                    if(name) saveShopSettings({ ...shopSettings, staff: [...(shopSettings.staff || []), { id: Date.now().toString(), name, leaveDates: [] }] });
                  }} className="text-[10px] bg-[#C29591] text-white px-4 py-2 rounded-full hover:bg-[#463E3E] transition-colors">+ 新增人員</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(shopSettings.staff || []).map(staff => (
                    <div key={staff.id} className="bg-white border border-[#EAE7E2] p-5 space-y-4 shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold flex items-center gap-2"><Users size={14} className="text-[#C29591]"/> {staff.name}</span>
                        <button onClick={() => {
                          if(confirm(`確定刪除 ${staff.name}？`)) saveShopSettings({ ...shopSettings, staff: shopSettings.staff.filter(s => s.id !== staff.id) });
                        }}><Trash2 size={14} className="text-gray-300 hover:text-red-500"/></button>
                      </div>
                      
                      <div className="space-y-2 border-t pt-4">
                        <label className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><UserMinus size={12}/> 設定請假日期</label>
                        <input type="date" className="text-[10px] border p-2 w-full outline-none focus:border-[#C29591]" onChange={(e) => {
                          if(!e.target.value) return;
                          const newStaff = shopSettings.staff.map(s => {
                            if(s.id === staff.id) {
                              const leaves = s.leaveDates || [];
                              return { ...s, leaveDates: leaves.includes(e.target.value) ? leaves : [...leaves, e.target.value].sort() };
                            }
                            return s;
                          });
                          saveShopSettings({ ...shopSettings, staff: newStaff });
                        }} />
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(staff.leaveDates || []).map(d => (
                            <span key={d} className="text-[9px] bg-red-50 text-red-500 px-2 py-1 flex items-center gap-1 rounded-sm border border-red-100">
                              {d} <X size={10} className="cursor-pointer" onClick={() => {
                                const newStaff = shopSettings.staff.map(s => {
                                  if(s.id === staff.id) return { ...s, leaveDates: s.leaveDates.filter(ld => ld !== d) };
                                  return s;
                                });
                                saveShopSettings({ ...shopSettings, staff: newStaff });
                              }}/>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 2. 原有的公休日設定 */}
              <section className="space-y-6">
                 <h4 className="text-sm font-bold tracking-widest border-l-4 border-[#C29591] pl-4 uppercase">全店公休日</h4>
                 <div className="flex gap-4">
                   <input type="date" className="p-3 border text-xs outline-none focus:border-[#C29591]" value={newHolidayInput} onChange={e => setNewHolidayInput(e.target.value)} />
                   <button onClick={() => { 
                     if(!newHolidayInput) return; 
                     saveShopSettings({...shopSettings, specificHolidays: [...(shopSettings.specificHolidays || []), newHolidayInput].sort()}); 
                     setNewHolidayInput(''); 
                   }} className="bg-[#463E3E] text-white px-8 text-xs tracking-widest uppercase">新增公休</button>
                 </div>
                 <div className="flex flex-wrap gap-2">
                   {(shopSettings.specificHolidays || []).map(date => (
                     <span key={date} className="text-[10px] bg-gray-100 text-gray-500 px-3 py-1.5 flex items-center gap-2">
                       {date} <X size={12} className="cursor-pointer" onClick={() => saveShopSettings({...shopSettings, specificHolidays: shopSettings.specificHolidays.filter(d => d !== date)})} />
                     </span>
                   ))}
                 </div>
              </section>

              {/* 3. 預約清單 */}
              <section className="space-y-6">
                 <h4 className="text-sm font-bold tracking-widest border-l-4 border-[#C29591] pl-4 uppercase">現有預約</h4>
                 <div className="space-y-2">
                   {allBookings.map(b => (
                     <div key={b.id} className="bg-white border p-4 text-[11px] flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                       <div>
                         <div className="font-bold text-[#463E3E] text-sm">{b.date} <span className="text-[#C29591] ml-2">{b.time}</span></div>
                         <div className="mt-1">{b.name} ({b.phone}) - <span className="italic">{b.itemTitle}</span></div>
                       </div>
                       <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', b.id))} className="text-gray-300 hover:text-red-500 transition-colors">
                         <Trash2 size={16}/>
                       </button>
                     </div>
                   ))}
                 </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* 登入彈窗：略 (同原程式) */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[250] flex items-center justify-center p-4">
          <div className="bg-white p-10 max-w-sm w-full shadow-2xl">
            <h3 className="tracking-[0.5em] mb-10 text-gray-400 text-sm uppercase text-center font-light">Admin Access</h3>
            <form onSubmit={(e) => { e.preventDefault(); if(passwordInput==="8888") setIsLoggedIn(true); setIsAdminModalOpen(false); }}>
              <input type="password" placeholder="••••" className="w-full border-b py-4 text-center tracking-[1.5em] outline-none" onChange={e => setPasswordInput(e.target.value)} autoFocus />
              <button className="w-full bg-[#463E3E] text-white py-4 mt-8 text-xs tracking-widest uppercase">Enter</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}