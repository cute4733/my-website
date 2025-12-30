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

const STYLE_CATEGORIES = ['全部', '極簡氣質', '華麗鑽飾', '藝術手繪', '日系暈染', '貓眼系列'];
const WEEKDAYS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

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

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cloudItems, setCloudItems] = useState([]);
  const [addons, setAddons] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  
  // 系統設定：包含店休與同時服務人數
  const [shopSettings, setShopSettings] = useState({ 
    closedDays: [1], 
    specificHolidays: [],
    maxCapacity: 1 // 預設同時只能接 1 位客人
  });
  
  const [bookingStep, setBookingStep] = useState('none');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedAddon, setSelectedAddon] = useState(null);
  const [bookingData, setBookingData] = useState({ name: '', phone: '', date: '', time: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isBookingManagerOpen, setIsBookingManagerOpen] = useState(false);
  
  const [passwordInput, setPasswordInput] = useState('');
  const [newHolidayInput, setNewHolidayInput] = useState('');

  useEffect(() => {
    signInAnonymously(auth);
    onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  useEffect(() => {
    if (!user) return;
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), (s) => 
      setCloudItems(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'addons'), (s) => 
      setAddons(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), orderBy('createdAt', 'desc')), (s) => 
      setAllBookings(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    onSnapshot(doc(db, 'artifacts', appId, 'public', 'settings'), (d) => {
      if (d.exists()) setShopSettings(prev => ({ ...prev, ...d.data() }));
    });
  }, [user]);

  const saveShopSettings = async (newSettings) => {
    await setDoc(doc(db, 'artifacts', appId, 'public', 'settings'), newSettings);
  };

  // 核心邏輯：檢查某個日期時段是否已滿
  const isTimeSlotFull = (date, time) => {
    if (!date || !time) return false;
    const count = allBookings.filter(b => b.date === date && b.time === time).length;
    return count >= (shopSettings.maxCapacity || 1);
  };

  const handleConfirmBooking = async () => {
    if (isTimeSlotFull(bookingData.date, bookingData.time)) {
      alert("很抱歉，該時段剛剛已被約滿，請選擇其他時段。");
      return;
    }
    // ... 原本的提交邏輯 ...
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), {
        ...bookingData,
        itemTitle: selectedItem?.title,
        addonName: selectedAddon?.name || '無',
        totalAmount: (Number(selectedItem?.price) || 0) + (Number(selectedAddon?.price) || 0),
        totalDuration: (Number(selectedItem?.duration) || 0) + (Number(selectedAddon?.duration) || 0),
        createdAt: serverTimestamp()
      });
      setBookingStep('success');
    } catch (e) { alert('預約失敗'); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555] font-sans">
      {/* 導覽列與主內容 (保持先前結構) */}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input type="text" placeholder="顧客姓名" className="border-b py-2 outline-none" onChange={e => setBookingData({...bookingData, name: e.target.value})} />
                <input type="tel" placeholder="聯絡電話" className="border-b py-2 outline-none" onChange={e => setBookingData({...bookingData, phone: e.target.value})} />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">預約日期</label>
                <input 
                  type="date" 
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border p-3 bg-[#FAF9F6]" 
                  onChange={(e) => {
                    const date = e.target.value;
                    const day = new Date(date).getDay();
                    if (shopSettings.closedDays.includes(day) || shopSettings.specificHolidays.includes(date)) {
                      alert("店休日不開放預約");
                      e.target.value = '';
                    } else {
                      setBookingData({...bookingData, date});
                    }
                  }} 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">選擇時段 (灰色為已約滿)</label>
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
                            bookingData.time===t ? 'bg-[#463E3E] text-white' : 'bg-white text-gray-400 hover:border-[#C29591]'}`}
                      >
                        {t} {full && '滿'}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button disabled={isSubmitting || !bookingData.time} onClick={handleConfirmBooking} className="w-full bg-[#463E3E] text-white py-4 text-xs tracking-widest uppercase hover:bg-[#C29591]">
                {isSubmitting ? '處理中...' : '確認送出預約'}
              </button>
            </div>
          </div>
        ) : bookingStep === 'success' ? (
          /* ... (保持之前的預約成功憑證內容) ... */
          <div className="max-w-md mx-auto py-20 px-6 text-center">
            <CheckCircle size={56} className="text-[#C29591] mx-auto mb-4" />
            <h2 className="text-2xl font-light tracking-[0.3em]">預約成功</h2>
            {/* 之前的卡片細節 */}
            <button onClick={() => {setBookingStep('none'); setActiveTab('home');}} className="w-full mt-10 border py-4 text-[10px] tracking-[0.4em]">Back to Home</button>
          </div>
        ) : (
           /* ... 首頁與列表邏輯 ... */
           <div className="p-10 text-center">
              <button onClick={() => setActiveTab('catalog')} className="bg-[#463E3E] text-white px-8 py-3">進入作品集</button>
           </div>
        )}
      </main>

      {/* 管理員後台 - 包含服務人數設定 */}
      {isBookingManagerOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[200] flex items-center justify-end">
          <div className="bg-white w-full max-w-4xl h-full shadow-2xl p-8 overflow-y-auto">
            <div className="flex justify-between items-center mb-10 border-b pb-4">
              <h3 className="tracking-[0.3em] font-light uppercase flex items-center gap-2"><Settings size={20}/> 系統後台管理</h3>
              <button onClick={() => setIsBookingManagerOpen(false)}><X size={24}/></button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-6">
                <h4 className="text-xs font-bold tracking-widest uppercase flex items-center gap-2 border-l-4 border-[#C29591] pl-3">預約管理</h4>
                <div className="space-y-3">
                  {allBookings.map(b => (
                    <div key={b.id} className="border p-4 bg-[#FAF9F6] text-xs flex justify-between items-center">
                      <div>
                        <div className="font-bold">{b.date} {b.time}</div>
                        <div className="text-gray-400">{b.name} | {b.phone}</div>
                      </div>
                      <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', b.id))} className="text-red-300"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-10">
                {/* 新增：同時服務人數設定 */}
                <div className="bg-[#FAF9F6] p-6 border border-[#EAE7E2]">
                  <h4 className="text-xs font-bold tracking-widest uppercase mb-4 flex items-center gap-2"><Users size={16}/> 同時服務人數 (美容師人數)</h4>
                  <div className="flex items-center gap-4">
                    <input 
                      type="number" 
                      min="1" 
                      className="w-20 p-2 border text-center text-sm outline-none"
                      value={shopSettings.maxCapacity}
                      onChange={(e) => saveShopSettings({ ...shopSettings, maxCapacity: parseInt(e.target.value) || 1 })}
                    />
                    <span className="text-[10px] text-gray-400 font-light">設定為 {shopSettings.maxCapacity} 位，則每個時段最多接受 {shopSettings.maxCapacity} 筆預約。</span>
                  </div>
                </div>

                <div className="bg-[#FAF9F6] p-6 border border-[#EAE7E2]">
                  <h4 className="text-xs font-bold tracking-widest uppercase mb-4 flex items-center gap-2"><Coffee size={16}/> 每週固定店休</h4>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day, index) => (
                      <button 
                        key={day}
                        onClick={() => {
                          const newDays = shopSettings.closedDays.includes(index) ? shopSettings.closedDays.filter(d => d !== index) : [...shopSettings.closedDays, index];
                          saveShopSettings({ ...shopSettings, closedDays: newDays });
                        }}
                        className={`px-3 py-2 text-[10px] border ${shopSettings.closedDays.includes(index) ? 'bg-[#463E3E] text-white' : 'bg-white'}`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[#FAF9F6] p-6 border border-[#EAE7E2]">
                  <h4 className="text-xs font-bold tracking-widest uppercase mb-4">特定日期店休</h4>
                  <div className="flex gap-2 mb-4">
                    <input type="date" className="flex-1 text-xs p-2 border outline-none" value={newHolidayInput} onChange={(e) => setNewHolidayInput(e.target.value)} />
                    <button onClick={() => { if(!newHolidayInput) return; saveShopSettings({ ...shopSettings, specificHolidays: [...shopSettings.specificHolidays, newHolidayInput] }); setNewHolidayInput(''); }} className="bg-[#463E3E] text-white px-4 text-xs">新增</button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {shopSettings.specificHolidays.map(date => (
                      <div key={date} className="flex justify-between items-center bg-white p-2 text-xs border">
                        <span>{date}</span>
                        <button onClick={() => saveShopSettings({ ...shopSettings, specificHolidays: shopSettings.specificHolidays.filter(d => d !== date) })} className="text-red-300">移除</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}