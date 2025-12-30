import React, { useState, useEffect } from 'react';
import { Plus, X, Lock, Trash2, Edit3, MessageCircle, Settings, Clock, Calendar as CalendarIcon, User, Phone, CheckCircle, List, Upload, ChevronLeft, ChevronRight, Users, UserMinus, Tag } from 'lucide-react';
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
    const staffList = settings?.staff || [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isShopHoliday = (settings?.specificHolidays || []).includes(dateStr);
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
  const [shopSettings, setShopSettings] = useState({ specificHolidays: [], staff: [] });
  
  const [bookingStep, setBookingStep] = useState('none');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedAddon, setSelectedAddon] = useState(null);
  const [bookingData, setBookingData] = useState({ name: '', phone: '', date: '', time: '' });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isBookingManagerOpen, setIsBookingManagerOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [styleFilter, setStyleFilter] = useState('全部');
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
    const availableStaff = staffList.length > 0 ? (staffList.length - onLeaveCount) : 1;

    const checkMin = timeToMinutes(checkTimeStr);
    const concurrent = allBookings.filter(b => {
      if (b.date !== date) return false;
      const start = timeToMinutes(b.time);
      const end = start + (Number(b.totalDuration) || 90) + 10;
      return checkMin >= start && checkMin < end;
    });
    return concurrent.length >= availableStaff;
  };

  const handleConfirmBooking = async () => {
    if (!bookingData.name || !bookingData.phone || !bookingData.date || !bookingData.time) {
      alert("請填寫完整的姓名、電話、日期與時間");
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), {
        ...bookingData,
        itemTitle: selectedItem?.title || '未指定',
        addonName: selectedAddon?.name || '無',
        totalAmount: (Number(selectedItem?.price) || 0) + (Number(selectedAddon?.price) || 0),
        totalDuration: (Number(selectedItem?.duration) || 90) + (Number(selectedAddon?.duration) || 0),
        createdAt: serverTimestamp()
      });
      setBookingStep('success');
    } catch (e) { 
      alert('預約失敗，請重試'); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const filteredItems = cloudItems.filter(item => styleFilter === '全部' || item.category === styleFilter);

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
        {bookingStep === 'form' ? (
          <div className="max-w-2xl mx-auto px-6 py-12">
            <h2 className="text-2xl font-light tracking-[0.3em] text-center mb-8 uppercase">Reservation</h2>
            
            {/* 結帳明細卡片 */}
            <div className="bg-white border p-6 mb-8 flex items-center gap-6 shadow-sm">
              <div className="w-24 h-24 bg-gray-50 flex-shrink-0">
                {selectedItem?.images?.[0] && <img src={selectedItem.images[0]} className="w-full h-full object-cover" alt="" />}
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-[#C29591] tracking-widest font-bold">預約款式</p>
                <p className="text-sm font-medium">{selectedItem?.title}</p>
                <div className="mt-2">
                   <p className="text-[10px] text-gray-400 font-bold uppercase">附加服務</p>
                   <select 
                    className="w-full mt-1 border border-gray-100 text-[11px] p-2 bg-[#FAF9F6]"
                    onChange={(e) => setSelectedAddon(addons.find(a => a.id === e.target.value) || null)}
                   >
                     <option value="">純款式 (無加購/卸甲)</option>
                     {addons.map(a => <option key={a.id} value={a.id}>{a.name} (+${a.price})</option>)}
                   </select>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase">預估金額</p>
                <p className="text-xl font-bold text-[#463E3E]">NT$ {((Number(selectedItem?.price) || 0) + (Number(selectedAddon?.price) || 0)).toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-white border p-8 shadow-sm space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] text-gray-400 font-bold mb-1 block">顧客姓名 *</label>
                  <input type="text" placeholder="例：王小明" className="w-full border-b py-2 outline-none focus:border-[#C29591]" onChange={e => setBookingData({...bookingData, name: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-bold mb-1 block">聯絡電話 *</label>
                  <input type="tel" placeholder="例：0912345678" className="w-full border-b py-2 outline-none focus:border-[#C29591]" onChange={e => setBookingData({...bookingData, phone: e.target.value})} />
                </div>
              </div>
              
              <div className="flex flex-col items-center">
                <label className="text-[10px] text-gray-400 font-bold mb-4 uppercase">Step 2: 選擇日期與時間</label>
                <CustomCalendar selectedDate={bookingData.date} onDateSelect={(d) => setBookingData({...bookingData, date: d, time: ''})} settings={shopSettings} />
              </div>

              {bookingData.date && (
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {TIME_SLOTS.map(t => (
                    <button key={t} disabled={isTimeSlotFull(bookingData.date, t)} onClick={() => setBookingData({...bookingData, time:t})}
                      className={`py-3 text-[10px] border transition-all ${bookingData.time===t ? 'bg-[#463E3E] text-white border-[#463E3E]' : 'bg-white disabled:opacity-20'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              )}

              <button 
                disabled={isSubmitting || !bookingData.time || !bookingData.name || !bookingData.phone} 
                onClick={handleConfirmBooking} 
                className="w-full py-4 bg-[#463E3E] text-white text-xs tracking-widest disabled:bg-gray-200"
              >
                {isSubmitting ? '處理中...' : '確認送出預約'}
              </button>
            </div>
          </div>
        ) : bookingStep === 'success' ? (
          <div className="max-w-md mx-auto py-20 px-6 text-center">
            <CheckCircle size={56} className="text-[#C29591] mx-auto mb-4" />
            <h2 className="text-2xl font-light tracking-[0.3em] mb-10">預約成功</h2>
            <div className="bg-white border p-8 space-y-2">
              <p className="text-sm">預約日期：{bookingData.date}</p>
              <p className="text-sm">預約時間：{bookingData.time}</p>
              <p className="text-xs text-gray-400 mt-4">我們將會發送簡訊通知您</p>
              <button onClick={() => {setBookingStep('none'); setActiveTab('home');}} className="w-full mt-8 bg-[#463E3E] text-white py-4 text-xs">回到首頁</button>
            </div>
          </div>
        ) : activeTab === 'home' ? (
          <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-6 text-center">
            <span className="text-[#C29591] tracking-[0.4em] md:tracking-[0.8em] text-xs md:text-sm mb-10 uppercase font-extralight">EST. 2026 • TAOYUAN</span>
            <div className="w-full max-w-xl mb-12 shadow-2xl rounded-sm overflow-hidden border border-[#EAE7E2]">
              <img src="https://drive.google.com/thumbnail?id=1ZJv3DS8ST_olFt0xzKB_miK9UKT28wMO&sz=w1200" className="w-full h-auto max-h-[40vh] object-cover" alt="home" />
            </div>
            <h2 className="text-4xl md:text-5xl font-extralight mb-12 tracking-[0.4em] text-[#463E3E] leading-relaxed">Beyond<br/>Expectation</h2>
            <button onClick={() => setActiveTab('catalog')} className="bg-[#463E3E] text-white px-16 py-4 tracking-[0.4em] text-xs font-light hover:bg-[#C29591] transition-all">點此預約</button>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-6 py-12">
            {/* 分類篩選 */}
            <div className="flex flex-wrap gap-4 justify-center border-b border-[#EAE7E2] pb-8 mb-12">
               {STYLE_CATEGORIES.map(c => (
                 <button key={c} onClick={() => setStyleFilter(c)} className={`text-[10px] tracking-widest px-4 py-1 ${styleFilter===c ? 'text-[#C29591] font-bold underline underline-offset-8' : 'text-gray-400'}`}>{c}</button>
               ))}
            </div>
            {/* 款式列表 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16">
              {filteredItems.map(item => (
                <div key={item.id} className="border p-8 text-center bg-white shadow-sm relative group">
                  {isLoggedIn && (
                    <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', item.id))} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={16}/>
                    </button>
                  )}
                  <div className="aspect-[3/4] bg-gray-50 mb-6 overflow-hidden">
                    {item.images?.[0] && <img src={item.images[0]} className="w-full h-full object-cover" alt="" />}
                  </div>
                  <h3 className="mb-4 tracking-widest text-sm font-medium text-[#463E3E]">{item.title}</h3>
                  <p className="text-lg font-bold mb-6 text-[#C29591]">NT$ {item.price}</p>
                  <button onClick={() => {setSelectedItem(item); setBookingStep('form'); window.scrollTo(0,0);}} className="bg-[#463E3E] text-white px-10 py-3 text-[10px] tracking-widest hover:bg-[#C29591] transition-colors">立即預約</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 管理中心彈窗 */}
      {isBookingManagerOpen && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-6xl h-[85vh] shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-white px-8 py-6 border-b flex justify-between items-center">
              <h3 className="text-xs font-bold tracking-[0.2em] uppercase">SYSTEM DASHBOARD / 系統管理中心</h3>
              <div className="flex gap-4">
                <button onClick={() => setIsUploadModalOpen(true)} className="text-[10px] border border-[#463E3E] px-4 py-2 hover:bg-[#463E3E] hover:text-white transition-all">+ 上傳新款式</button>
                <button onClick={() => setIsBookingManagerOpen(false)}><X size={24}/></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-12 bg-[#FAF9F6]">
              {/* 美甲師與請假 */}
              <section className="space-y-6">
                <div className="flex justify-between items-center border-l-4 border-[#C29591] pl-4">
                  <h4 className="text-sm font-bold tracking-widest uppercase">美甲師團隊與請假</h4>
                  <button onClick={() => {
                    const name = prompt("請輸入人員姓名：");
                    if (name) {
                      const newStaff = [...(shopSettings.staff || []), { id: Date.now().toString(), name, leaveDates: [] }];
                      setDoc(doc(db, 'artifacts', appId, 'public', 'settings'), { ...shopSettings, staff: newStaff });
                    }
                  }} className="text-[10px] bg-[#C29591] text-white px-4 py-2 rounded-full">+ 新增人員</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(shopSettings.staff || []).map(staff => (
                    <div key={staff.id} className="bg-white border p-5 shadow-sm space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold flex items-center gap-2"><Users size={14}/> {staff.name}</span>
                        <button onClick={() => {
                          if(confirm(`確定移除 ${staff.name}？`)) {
                            const newS = shopSettings.staff.filter(s => s.id !== staff.id);
                            setDoc(doc(db, 'artifacts', appId, 'public', 'settings'), { ...shopSettings, staff: newS });
                          }
                        }}><Trash2 size={14} className="text-gray-300 hover:text-red-500"/></button>
                      </div>
                      <input type="date" className="text-[10px] border p-2 w-full outline-none" onChange={(e) => {
                        if (!e.target.value) return;
                        const updated = shopSettings.staff.map(s => {
                          if (s.id === staff.id) {
                            const leaves = s.leaveDates || [];
                            return { ...s, leaveDates: leaves.includes(e.target.value) ? leaves : [...leaves, e.target.value].sort() };
                          }
                          return s;
                        });
                        setDoc(doc(db, 'artifacts', appId, 'public', 'settings'), { ...shopSettings, staff: updated });
                      }} />
                      <div className="flex flex-wrap gap-1">
                        {(staff.leaveDates || []).map(d => (
                          <span key={d} className="text-[9px] bg-red-50 text-red-500 px-2 py-1 flex items-center gap-1 border border-red-100">
                            {d} <X size={10} className="cursor-pointer" onClick={() => {
                              const updated = shopSettings.staff.map(s => {
                                if (s.id === staff.id) return { ...s, leaveDates: s.leaveDates.filter(ld => ld !== d) };
                                return s;
                              });
                              setDoc(doc(db, 'artifacts', appId, 'public', 'settings'), { ...shopSettings, staff: updated });
                            }}/>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 加購品管理 */}
              <section className="space-y-6">
                 <div className="flex justify-between items-center border-l-4 border-[#C29591] pl-4">
                  <h4 className="text-sm font-bold tracking-widest uppercase">加購服務/卸甲管理</h4>
                  <button onClick={() => {
                    const name = prompt("加購項目名稱：");
                    const price = prompt("加購價格：");
                    if(name && price) addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'addons'), { name, price: Number(price), duration: 30 });
                  }} className="text-[10px] bg-[#463E3E] text-white px-4 py-2 rounded-full">+ 新增項目</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {addons.map(a => (
                    <div key={a.id} className="bg-white border p-4 flex justify-between items-center shadow-sm">
                      <div>
                        <p className="text-xs font-bold">{a.name}</p>
                        <p className="text-[10px] text-[#C29591]">+$ {a.price}</p>
                      </div>
                      <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'addons', a.id))}><Trash2 size={14} className="text-gray-300 hover:text-red-500"/></button>
                    </div>
                  ))}
                </div>
              </section>

              {/* 預約單列表 */}
              <section className="space-y-6">
                <h4 className="text-sm font-bold tracking-widest border-l-4 border-[#C29591] pl-4 uppercase">預約訂單列表</h4>
                <div className="bg-white border overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="p-4">預約日期</th>
                        <th className="p-4">顧客資訊</th>
                        <th className="p-4">項目</th>
                        <th className="p-4">金額</th>
                        <th className="p-4">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {allBookings.map(b => (
                        <tr key={b.id} className="hover:bg-gray-50">
                          <td className="p-4 font-bold">{b.date} <br/> {b.time}</td>
                          <td className="p-4">{b.name} <br/> {b.phone}</td>
                          <td className="p-4">{b.itemTitle} <br/> <span className="text-[#C29591]">+{b.addonName}</span></td>
                          <td className="p-4 font-bold">NT$ {b.totalAmount}</td>
                          <td className="p-4">
                            <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', b.id))} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* 登入與款式上傳 Modal (略，與原代碼一致) */}
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

      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[400] flex items-center justify-center p-4">
          <div className="bg-white p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="tracking-widest font-light">上傳款式圖資</h3>
              <button onClick={() => setIsUploadModalOpen(false)}><X size={20}/></button>
            </div>
            <input type="text" placeholder="款式名稱" className="w-full border-b py-2 outline-none" onChange={e => setFormData({...formData, title: e.target.value})} />
            <div className="flex gap-4">
              <input type="number" placeholder="金額" className="w-1/2 border-b py-2 outline-none" onChange={e => setFormData({...formData, price: e.target.value})} />
              <select className="w-1/2 border-b py-2 outline-none" onChange={e => setFormData({...formData, category: e.target.value})}>
                {STYLE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <label className="block w-full border-2 border-dashed py-10 text-center cursor-pointer">
              <Upload size={24} className="mx-auto text-gray-300 mb-2"/>
              <span className="text-xs text-gray-400">點此貼上圖片網址或選擇檔案 (目前支援網址輸入)</span>
              <input type="text" placeholder="圖片 URL" className="mt-4 w-full border-b py-1 px-2 text-[10px]" onChange={e => setFormData({...formData, images: [e.target.value]})} />
            </label>
            <button onClick={async () => {
              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), {...formData, price: Number(formData.price), createdAt: serverTimestamp()});
              setIsUploadModalOpen(false);
            }} className="w-full bg-[#463E3E] text-white py-4 text-xs tracking-widest">發布款式</button>
          </div>
        </div>
      )}
    </div>
  );
}