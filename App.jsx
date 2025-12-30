import React, { useState, useEffect } from 'react';
import { Plus, X, Lock, Trash2, Edit3, Settings, Calendar as CalendarIcon, MapPin, Users, UserMinus, UserCheck, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
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

// --- 子組件：自定義月曆 ---
const CustomCalendar = ({ selectedDate, onDateSelect, branchData }) => {
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
      
      // 判斷是否為店休
      const isShopHoliday = (branchData?.specificHolidays || []).includes(dateStr);
      
      // 判斷是否全體請假 (可用人力為 0)
      const staffList = branchData?.staff || [];
      const onLeaveCount = staffList.filter(s => (s.leaveDates || []).includes(dateStr)).length;
      const isAllOnLeave = staffList.length > 0 && onLeaveCount >= staffList.length;

      const isPast = new Date(currentYear, currentMonth, d) < today;
      const isSelected = selectedDate === dateStr;
      const isDisabled = isShopHoliday || isAllOnLeave || isPast;

      days.push(
        <button key={d} disabled={isDisabled} onClick={() => onDateSelect(dateStr)}
          className={`h-10 w-10 text-[11px] rounded-full flex flex-col items-center justify-center transition-all ${isDisabled ? 'text-gray-200 line-through' : isSelected ? 'bg-[#463E3E] text-white shadow-lg' : 'hover:bg-[#C29591] hover:text-white'}`}>
          {d}
          {!isDisabled && staffList.length > 0 && (
             <span className="text-[7px] mt-0.5 opacity-60">{staffList.length - onLeaveCount}人</span>
          )}
        </button>
      );
    }
    return days;
  };

  return (
    <div className="w-full max-w-[320px] bg-white border p-4 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-xs font-bold tracking-widest">{currentYear}年 {currentMonth + 1}月</h4>
        <div className="flex gap-2">
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
  const [branches, setBranches] = useState([]); 
  const [selectedBranchId, setSelectedBranchId] = useState(''); 
  const [adminSelectedBranchId, setAdminSelectedBranchId] = useState(''); 
  const [cloudItems, setCloudItems] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [bookingStep, setBookingStep] = useState('none');
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
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'branches'), (s) => {
      const bList = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setBranches(bList);
      if (bList.length > 0 && !selectedBranchId) {
        setSelectedBranchId(bList[0].id);
        setAdminSelectedBranchId(bList[0].id);
      }
    });
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), (s) => 
      setCloudItems(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), orderBy('createdAt', 'desc')), (s) => 
      setAllBookings(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [user]);

  // --- 計算邏輯：檢查時段是否已滿 ---
  const isTimeSlotFull = (date, checkTimeStr, branchId) => {
    if (!date || !checkTimeStr || !branchId) return false;
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return false;

    // 1. 計算該日「實際上班」的人數 (總人數 - 請假人數)
    const staffList = branch.staff || [];
    const onLeaveCount = staffList.filter(s => (s.leaveDates || []).includes(date)).length;
    const availableStaffCount = staffList.length > 0 ? staffList.length - onLeaveCount : (branch.maxCapacity || 1);

    if (availableStaffCount <= 0) return true; // 全員請假

    // 2. 檢查該時段已有的預約數
    const checkMin = timeToMinutes(checkTimeStr);
    const concurrentBookings = allBookings.filter(b => {
      if (b.date !== date || b.branchId !== branchId) return false;
      const start = timeToMinutes(b.time);
      const end = start + (Number(b.totalDuration) || 90) + 10;
      return checkMin >= start && checkMin < end;
    });

    return concurrentBookings.length >= availableStaffCount;
  };

  const updateBranchData = async (branchId, newData) => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'branches', branchId), newData);
  };

  const handleAddStaff = () => {
    const name = prompt("請輸入人員姓名：");
    if (!name) return;
    const branch = branches.find(b => b.id === adminSelectedBranchId);
    const newStaff = [...(branch.staff || []), { id: Date.now().toString(), name: name, leaveDates: [] }];
    updateBranchData(adminSelectedBranchId, { staff: newStaff });
  };

  const toggleStaffLeave = (staffId, date) => {
    const branch = branches.find(b => b.id === adminSelectedBranchId);
    const newStaff = branch.staff.map(s => {
      if (s.id === staffId) {
        const leaveDates = s.leaveDates || [];
        const updatedLeaves = leaveDates.includes(date) 
          ? leaveDates.filter(d => d !== date) 
          : [...leaveDates, date];
        return { ...s, leaveDates: updatedLeaves };
      }
      return s;
    });
    updateBranchData(adminSelectedBranchId, { staff: newStaff });
  };

  const handleConfirmBooking = async () => {
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), {
        ...bookingData,
        branchId: selectedBranchId,
        branchName: branches.find(b => b.id === selectedBranchId)?.name,
        createdAt: serverTimestamp()
      });
      setBookingStep('success');
    } catch (e) { alert('預約失敗'); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555] font-sans">
      {/* 導覽列 */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <h1 className="text-xl tracking-[0.4em] font-extralight cursor-pointer" onClick={() => setActiveTab('home')}>UNIWAWA</h1>
          <div className="flex gap-6 text-sm items-center">
            <button onClick={() => setActiveTab('home')} className={activeTab === 'home' ? 'text-[#C29591]' : ''}>首頁</button>
            <button onClick={() => setActiveTab('catalog')} className={activeTab === 'catalog' ? 'text-[#C29591]' : ''}>款式預約</button>
            {isLoggedIn ? (
              <button onClick={() => setIsBookingManagerOpen(true)} className="text-[#C29591] flex items-center gap-1">
                <Settings size={18}/> 管理
              </button>
            ) : <button onClick={() => setIsAdminModalOpen(true)} className="text-gray-300"><Lock size={14}/></button>}
          </div>
        </div>
      </nav>

      <main className="pt-20">
        {bookingStep === 'form' ? (
          <div className="max-w-2xl mx-auto px-6 py-12">
            <div className="bg-white border p-8 shadow-sm space-y-8">
              <h2 className="text-xl font-light tracking-widest text-center border-b pb-6">RESERVATION</h2>
              
              {/* 1. 分店選擇 */}
              <div className="space-y-4">
                <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase flex items-center gap-2">
                  <MapPin size={14}/> 選擇服務分店
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {branches.map(b => (
                    <button key={b.id} onClick={() => {setSelectedBranchId(b.id); setBookingData({...bookingData, date:'', time: ''});}}
                      className={`py-4 border text-xs tracking-widest transition-all ${selectedBranchId === b.id ? 'bg-[#463E3E] text-white border-[#463E3E]' : 'bg-white hover:border-[#C29591]'}`}>
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. 日期選擇 */}
              <div className="space-y-4">
                <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase flex items-center gap-2">
                  <CalendarIcon size={14}/> 選擇日期
                </label>
                <div className="flex justify-center">
                  <CustomCalendar 
                    selectedDate={bookingData.date} 
                    onDateSelect={(d) => setBookingData({...bookingData, date: d, time: ''})} 
                    branchData={branches.find(b => b.id === selectedBranchId)} 
                  />
                </div>
              </div>

              {/* 3. 時段選擇 */}
              {bookingData.date && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">可用時段</label>
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                    {TIME_SLOTS.map(t => {
                      const full = isTimeSlotFull(bookingData.date, t, selectedBranchId);
                      return (
                        <button key={t} disabled={full} onClick={() => setBookingData({...bookingData, time:t})}
                          className={`py-3 text-[10px] border transition-all ${full ? 'bg-gray-50 text-gray-300 line-through' : bookingData.time===t ? 'bg-[#463E3E] text-white' : 'bg-white hover:bg-gray-50'}`}>
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-400 font-bold uppercase">顧客姓名</label>
                  <input type="text" className="w-full border-b py-2 outline-none focus:border-[#C29591]" onChange={e => setBookingData({...bookingData, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-400 font-bold uppercase">聯絡電話</label>
                  <input type="tel" className="w-full border-b py-2 outline-none focus:border-[#C29591]" onChange={e => setBookingData({...bookingData, phone: e.target.value})} />
                </div>
              </div>

              <button disabled={isSubmitting || !bookingData.time || !bookingData.name} onClick={handleConfirmBooking}
                className="w-full py-5 bg-[#463E3E] text-white text-xs tracking-[0.3em] uppercase hover:bg-[#C29591] disabled:bg-gray-300 transition-colors">
                {isSubmitting ? '處理中...' : '確認預約'}
              </button>
            </div>
          </div>
        ) : bookingStep === 'success' ? (
          <div className="max-w-md mx-auto py-20 px-6 text-center">
            <CheckCircle size={56} className="text-[#C29591] mx-auto mb-6" />
            <h2 className="text-2xl font-light tracking-[0.3em] mb-4">預約成功</h2>
            <div className="bg-white border p-8 shadow-sm text-left space-y-4">
               <p className="text-sm border-b pb-3">分店：{branches.find(b => b.id === selectedBranchId)?.name}</p>
               <p className="text-sm border-b pb-3">日期：{bookingData.date}</p>
               <p className="text-sm border-b pb-3">時間：{bookingData.time}</p>
               <button onClick={() => {setBookingStep('none'); setActiveTab('home');}} className="w-full mt-6 bg-[#463E3E] text-white py-4 text-xs tracking-widest">回到首頁</button>
            </div>
          </div>
        ) : activeTab === 'home' ? (
          <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-6 text-center">
            <span className="text-[#C29591] tracking-[0.8em] text-xs mb-10 uppercase">Beauty & Care</span>
            <h2 className="text-4xl md:text-5xl font-extralight mb-12 tracking-[0.4em] text-[#463E3E] leading-relaxed">Personalized<br/>Experience</h2>
            <button onClick={() => setBookingStep('form')} className="bg-[#463E3E] text-white px-16 py-4 tracking-[0.4em] text-xs font-light hover:bg-[#C29591] transition-all">點此預約</button>
          </div>
        ) : (
          /* 款式列表 (略，同之前版本) */
          <div className="max-w-7xl mx-auto px-6 py-12 text-center text-gray-400">款式載入中...</div>
        )}
      </main>

      {/* 管理者登入彈窗 */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[250] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white p-10 max-w-sm w-full shadow-2xl">
            <h3 className="tracking-[0.5em] mb-10 text-gray-400 text-sm uppercase text-center">Admin</h3>
            <input type="password" placeholder="••••" className="w-full border-b py-4 text-center tracking-[1.5em] outline-none" onChange={e => setPasswordInput(e.target.value)} autoFocus />
            <button onClick={() => { if(passwordInput==="8888") setIsLoggedIn(true); setIsAdminModalOpen(false); }} className="w-full bg-[#463E3E] text-white py-4 mt-8 text-xs tracking-widest">LOGIN</button>
          </div>
        </div>
      )}

      {/* 系統後台管理中心 (含人員請假解決方案) */}
      {isBookingManagerOpen && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#FAF9F6] w-full max-w-6xl h-[85vh] shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-white px-8 py-4 border-b flex justify-between items-center">
              <h3 className="text-xs tracking-[0.3em] font-bold uppercase">管理中心 / {branches.find(b => b.id === adminSelectedBranchId)?.name}</h3>
              <button onClick={() => setIsBookingManagerOpen(false)} className="hover:rotate-90 transition-transform"><X size={24}/></button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* 左側：分店切換 */}
              <div className="w-48 bg-white border-r p-4 space-y-2">
                <p className="text-[10px] text-gray-400 font-bold mb-4 uppercase">切換分店</p>
                {branches.map(b => (
                  <button key={b.id} onClick={() => setAdminSelectedBranchId(b.id)}
                    className={`w-full text-left p-3 text-[11px] rounded ${adminSelectedBranchId === b.id ? 'bg-[#463E3E] text-white' : 'hover:bg-gray-100'}`}>
                    {b.name}
                  </button>
                ))}
              </div>

              {/* 中間：人員管理與請假設定 */}
              <div className="flex-1 overflow-y-auto p-8 space-y-10">
                <section>
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-xs font-bold tracking-widest flex items-center gap-2"><Users size={16}/> 人員管理與請假</h4>
                    <button onClick={handleAddStaff} className="text-[10px] bg-[#C29591] text-white px-3 py-1.5 rounded-full hover:bg-[#463E3E] transition-colors">+ 新增人員</button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(branches.find(b => b.id === adminSelectedBranchId)?.staff || []).map(staff => (
                      <div key={staff.id} className="bg-white border p-4 shadow-sm group">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className="text-xs font-bold text-[#463E3E]">{staff.name}</span>
                            <p className="text-[9px] text-gray-400 uppercase mt-1">Staff Member</p>
                          </div>
                          <button onClick={() => {
                            if(confirm(`確定刪除人員 ${staff.name}？`)) {
                              const newStaff = branches.find(b => b.id === adminSelectedBranchId).staff.filter(s => s.id !== staff.id);
                              updateBranchData(adminSelectedBranchId, { staff: newStaff });
                            }
                          }} className="text-gray-300 hover:text-red-500"><Trash2 size={14}/></button>
                        </div>
                        
                        <div className="space-y-3">
                          <p className="text-[10px] font-bold text-gray-400 border-t pt-3 flex items-center gap-1">
                            <UserMinus size={12}/> 設定請假日期 (今日起)
                          </p>
                          <input type="date" className="text-[10px] border p-1 w-full" onChange={(e) => {
                            if(e.target.value) toggleStaffLeave(staff.id, e.target.value);
                          }} />
                          <div className="flex flex-wrap gap-1">
                            {(staff.leaveDates || []).sort().map(d => (
                              <span key={d} className="text-[9px] bg-red-50 text-red-500 px-2 py-0.5 rounded flex items-center gap-1">
                                {d} <X size={8} className="cursor-pointer" onClick={() => toggleStaffLeave(staff.id, d)}/>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="pt-10 border-t">
                  <h4 className="text-xs font-bold tracking-widest mb-6 flex items-center gap-2"><CheckCircle size={16}/> 該店預約清單</h4>
                  <div className="space-y-2">
                    {allBookings.filter(b => b.branchId === adminSelectedBranchId).map(b => (
                      <div key={b.id} className="bg-white border p-4 text-[11px] flex justify-between items-center hover:shadow-md transition-shadow">
                        <div>
                          <div className="font-bold text-[#463E3E] text-sm mb-1">{b.date} <span className="text-[#C29591] ml-2">{b.time}</span></div>
                          <div className="text-gray-500">{b.name} ({b.phone})</div>
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
        </div>
      )}
    </div>
  );
}