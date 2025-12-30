import React, { useState, useEffect } from 'react';
import { Plus, X, Lock, Trash2, Edit3, MessageCircle, Settings, Clock, Calendar, User, Phone, CheckCircle, List, Upload, AlertCircle, Coffee, Users } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, query, orderBy, setDoc } from 'firebase/firestore';

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

const WEEKDAYS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
const SLOT_INTERVAL = 10; // 每格 10 分鐘
const BUFFER_TIME = 20;   // 每筆預約自動增加的緩衝時間

// 生成 12:00 ~ 20:00 的 10 分鐘格點
const TIME_SLOTS = (() => {
  const slots = [];
  for (let h = 12; h <= 20; h++) {
    for (let m = 0; m < 60; m += SLOT_INTERVAL) {
      if (h === 20 && m > 0) break;
      slots.push(`${h}:${m === 0 ? '00' : m}`);
    }
  }
  return slots;
})();

// 輔助函式：將 "12:30" 轉換為分鐘數，方便運算
const timeToMinutes = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cloudItems, setCloudItems] = useState([]);
  const [addons, setAddons] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [shopSettings, setShopSettings] = useState({ closedDays: [1], specificHolidays: [], maxCapacity: 1 });
  
  const [bookingStep, setBookingStep] = useState('none');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedAddon, setSelectedAddon] = useState(null);
  const [bookingData, setBookingData] = useState({ name: '', phone: '', date: '', time: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isBookingManagerOpen, setIsBookingManagerOpen] = useState(false);

  useEffect(() => {
    signInAnonymously(auth);
    onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  useEffect(() => {
    if (!user) return;
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), (s) => setCloudItems(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'addons'), (s) => setAddons(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), orderBy('createdAt', 'desc')), (s) => setAllBookings(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(doc(db, 'artifacts', appId, 'public', 'settings'), (d) => { if (d.exists()) setShopSettings(prev => ({ ...prev, ...d.data() })); });
  }, [user]);

  const saveShopSettings = async (newSettings) => { await setDoc(doc(db, 'artifacts', appId, 'public', 'settings'), newSettings); };

  /**
   * 核心邏輯：檢查某個特定時間點是否已滿
   * 這裡會考慮到每一筆預約的「開始時間」到「結束時間 (+緩衝)」
   */
  const isTimeSlotFull = (date, checkTimeStr) => {
    if (!date || !checkTimeStr) return false;
    const checkMinutes = timeToMinutes(checkTimeStr);
    
    // 找出當天所有預約
    const bookingsToday = allBookings.filter(b => b.date === date);
    
    // 計算在 checkTimeStr 這個時間點，有多少人正在進行服務
    const concurrentBookings = bookingsToday.filter(b => {
      const start = timeToMinutes(b.time);
      const end = start + (Number(b.totalDuration) || 90) + BUFFER_TIME;
      return checkMinutes >= start && checkMinutes < end;
    });

    return concurrentBookings.length >= (shopSettings.maxCapacity || 1);
  };

  const handleConfirmBooking = async () => {
    const totalDuration = (Number(selectedItem?.duration) || 0) + (Number(selectedAddon?.duration) || 0);
    
    // 提交前最後檢查：確保預約期間內的「每一格」都有空位
    const startMin = timeToMinutes(bookingData.time);
    const endMin = startMin + totalDuration + BUFFER_TIME;
    
    const isConflict = TIME_SLOTS.some(slot => {
      const slotMin = timeToMinutes(slot);
      return slotMin >= startMin && slotMin < endMin && isTimeSlotFull(bookingData.date, slot);
    });

    if (isConflict) {
      alert("抱歉，該時段與現有預約衝突（包含緩衝時間），請選擇其他時段。");
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), {
        ...bookingData,
        itemTitle: selectedItem?.title,
        addonName: selectedAddon?.name || '無',
        totalAmount: (Number(selectedItem?.price) || 0) + (Number(selectedAddon?.price) || 0),
        totalDuration: totalDuration, // 存儲純服務時間
        createdAt: serverTimestamp()
      });
      setBookingStep('success');
    } catch (e) { alert('預約失敗'); } finally { setIsSubmitting(false); }
  };

  // --- UI 部分 (僅列出改動處) ---
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555] font-sans">
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-[#EAE7E2]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <h1 className="text-xl tracking-[0.4em] font-extralight cursor-pointer" onClick={() => {setActiveTab('home'); setBookingStep('none');}}>UNIWAWA</h1>
          <div className="flex gap-6 text-sm tracking-widest font-medium uppercase items-center">
            <button onClick={() => {setActiveTab('home'); setBookingStep('none');}}>首頁</button>
            <button onClick={() => {setActiveTab('catalog'); setBookingStep('none');}}>款式</button>
            {isLoggedIn && <button onClick={() => setIsBookingManagerOpen(true)} className="text-[#C29591] flex items-center gap-1 border-l pl-4 border-[#EAE7E2]"><Settings size={18}/> 管理</button>}
          </div>
        </div>
      </nav>

      <main className="pt-20">
        {bookingStep === 'form' ? (
          <div className="max-w-2xl mx-auto px-6 py-12">
            <h2 className="text-2xl font-light tracking-[0.3em] text-center mb-8">RESERVATION</h2>
            
            <div className="bg-white border p-8 shadow-sm space-y-8">
              {/* 客人資訊輸入... */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input type="text" placeholder="顧客姓名" className="border-b py-2 outline-none focus:border-[#C29591]" onChange={e => setBookingData({...bookingData, name: e.target.value})} />
                <input type="tel" placeholder="聯絡電話" className="border-b py-2 outline-none focus:border-[#C29591]" onChange={e => setBookingData({...bookingData, phone: e.target.value})} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">預約日期</label>
                <input 
                  type="date" 
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border p-3 bg-[#FAF9F6] outline-none" 
                  onChange={(e) => {
                    const date = e.target.value;
                    const day = new Date(date).getDay();
                    if (shopSettings.closedDays.includes(day) || shopSettings.specificHolidays.includes(date)) {
                      alert("店休日不開放預約"); e.target.value = '';
                    } else { setBookingData({...bookingData, date}); }
                  }} 
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">選擇開始時段</label>
                  <span className="text-[9px] text-[#C29591]">服務後自動預留 20min 清潔時間</span>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {TIME_SLOTS.map(t => {
                    const full = isTimeSlotFull(bookingData.date, t);
                    return (
                      <button 
                        key={t} 
                        disabled={full}
                        onClick={() => setBookingData({...bookingData, time:t})} 
                        className={`py-2 text-[10px] border transition-all 
                          ${full ? 'bg-gray-100 text-gray-300 cursor-not-allowed border-gray-100' : 
                            bookingData.time===t ? 'bg-[#463E3E] text-white border-[#463E3E]' : 'bg-white text-gray-400 hover:border-[#C29591]'}`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button disabled={isSubmitting || !bookingData.time} onClick={handleConfirmBooking} className="w-full bg-[#463E3E] text-white py-4 text-xs tracking-widest uppercase hover:bg-[#C29591] transition-all">
                {isSubmitting ? '處理中...' : '確認送出預約'}
              </button>
            </div>
          </div>
        ) : bookingStep === 'success' ? (
          <div className="max-w-md mx-auto py-20 px-6 text-center">
            <CheckCircle size={56} className="text-[#C29591] mx-auto mb-4" />
            <h2 className="text-2xl font-light tracking-[0.3em]">預約成功</h2>
            <div className="bg-white border border-[#EAE7E2] shadow-xl p-8 mt-8 space-y-4 text-left relative overflow-hidden">
               <div className="absolute top-0 right-0 bg-[#463E3E] text-white text-[8px] px-3 py-1 uppercase">Voucher</div>
               <p className="text-sm"><strong>顧客：</strong>{bookingData.name}</p>
               <p className="text-sm"><strong>日期：</strong>{bookingData.date}</p>
               <p className="text-sm"><strong>時間：</strong>{bookingData.time}</p>
               <p className="text-sm"><strong>項目：</strong>{selectedItem?.title}</p>
               <div className="pt-4 border-t border-dashed flex justify-between items-end">
                 <span className="text-[10px] text-gray-400">TOTAL AMOUNT</span>
                 <span className="text-xl font-bold text-[#463E3E]">NT$ {((Number(selectedItem?.price) || 0) + (Number(selectedAddon?.price) || 0)).toLocaleString()}</span>
               </div>
            </div>
            <button onClick={() => {setBookingStep('none'); setActiveTab('home');}} className="w-full mt-10 border py-4 text-[10px] tracking-[0.4em] uppercase">Back to Home</button>
          </div>
        ) : activeTab === 'home' ? (
          <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center text-center px-6">
            <h2 className="text-4xl font-extralight mb-12 tracking-[0.4em] text-[#463E3E]">UNIWAWA</h2>
            <button onClick={() => setActiveTab('catalog')} className="bg-[#463E3E] text-white px-16 py-4 tracking-[0.4em] text-xs">進入作品集</button>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
            {cloudItems.map(item => (
              <div key={item.id} className="bg-white border p-6 flex flex-col items-center">
                <img src={item.images?.[0]} className="w-full aspect-[3/4] object-cover mb-4" />
                <h3 className="tracking-widest font-medium">{item.title}</h3>
                <p className="text-[#C29591] text-sm mb-6">NT$ {item.price.toLocaleString()}</p>
                <div className="w-full mb-4">
                   <select className="w-full text-[11px] border py-2 px-2 bg-[#FAF9F6] outline-none" onChange={(e) => setSelectedAddon(addons.find(a => a.id === e.target.value) || null)}>
                      <option value="">選擇加購項目</option>
                      {addons.map(a => <option key={a.id} value={a.id}>{a.name} (+{a.duration}分)</option>)}
                   </select>
                </div>
                <button onClick={() => { setSelectedItem(item); setBookingStep('form'); window.scrollTo(0,0); }} className="w-full bg-[#463E3E] text-white py-3 text-[10px] tracking-widest uppercase">點此預約</button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 管理後台彈窗 (包含同時服務人數設定) */}
      {isBookingManagerOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[200] flex items-center justify-end">
          <div className="bg-white w-full max-w-4xl h-full shadow-2xl p-8 overflow-y-auto">
            <div className="flex justify-between items-center mb-10 border-b pb-4">
              <h3 className="tracking-[0.3em] font-light uppercase flex items-center gap-2"><Settings size={20}/> 系統後台管理</h3>
              <button onClick={() => setIsBookingManagerOpen(false)}><X size={24}/></button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-6">
                <h4 className="text-xs font-bold tracking-widest uppercase flex items-center gap-2 border-l-4 border-[#C29591] pl-3">預約清單</h4>
                {allBookings.map(b => (
                  <div key={b.id} className="border p-4 bg-[#FAF9F6] text-xs flex justify-between items-center">
                    <div>
                      <div className="font-bold">{b.date} {b.time} ({b.totalDuration}分)</div>
                      <div className="text-gray-400">{b.name} | {b.phone}</div>
                    </div>
                    <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', b.id))} className="text-red-300"><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>
              <div className="space-y-8">
                <div className="bg-[#FAF9F6] p-6 border">
                  <h4 className="text-xs font-bold tracking-widest uppercase mb-4 flex items-center gap-2"><Users size={16}/> 同時服務人數</h4>
                  <input type="number" min="1" className="w-20 p-2 border text-center" value={shopSettings.maxCapacity} onChange={(e) => saveShopSettings({ ...shopSettings, maxCapacity: parseInt(e.target.value) || 1 })} />
                </div>
                <div className="bg-[#FAF9F6] p-6 border">
                   <h4 className="text-xs font-bold tracking-widest uppercase mb-4">固定店休</h4>
                   <div className="flex flex-wrap gap-2">
                     {WEEKDAYS.map((day, idx) => (
                       <button key={day} onClick={() => {
                         const newDays = shopSettings.closedDays.includes(idx) ? shopSettings.closedDays.filter(d => d !== idx) : [...shopSettings.closedDays, idx];
                         saveShopSettings({ ...shopSettings, closedDays: newDays });
                       }} className={`px-2 py-1 text-[10px] border ${shopSettings.closedDays.includes(idx) ? 'bg-[#463E3E] text-white' : 'bg-white'}`}>{day}</button>
                     ))}
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 登入彈窗... (略) */}
    </div>
  );
}