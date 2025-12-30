import React, { useState, useEffect } from 'react';
import { Plus, X, Lock, Trash2, Edit3, MessageCircle, Settings, Clock, Calendar, User, Phone, CheckCircle, List, Upload, Coffee } from 'lucide-react';
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

// 輔助函式：轉換分鐘
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
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
  
  // 設定狀態保護：給予預設值防止 includes 報錯
  const [shopSettings, setShopSettings] = useState({ closedDays: [1], specificHolidays: [], maxCapacity: 1 });
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
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({ title: '', price: '', category: '極簡氣質', duration: '90', images: [] });

  // --- 關鍵修改：強大的保護監聽 ---
  useEffect(() => {
    signInAnonymously(auth);
    onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  useEffect(() => {
    if (!user) return;

    // 1. 監聽設定 (增加錯誤攔截與預設值)
    const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'settings'), (d) => {
      if (d.exists()) {
        const data = d.data();
        setShopSettings({
          closedDays: Array.isArray(data.closedDays) ? data.closedDays : [1],
          specificHolidays: Array.isArray(data.specificHolidays) ? data.specificHolidays : [],
          maxCapacity: Number(data.maxCapacity) || 1
        });
      } else {
        setShopSettings({ closedDays: [1], specificHolidays: [], maxCapacity: 1 });
      }
    }, (err) => {
      console.error("Settings error:", err);
      setShopSettings({ closedDays: [1], specificHolidays: [], maxCapacity: 1 });
    });

    // 2. 監聽商品
    const unsubItems = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), (s) => {
      setCloudItems(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 3. 監聽加購
    const unsubAddons = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'addons'), (s) => {
      setAddons(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 4. 監聽預約
    const unsubBookings = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), orderBy('createdAt', 'desc')), (s) => {
      setAllBookings(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubSettings(); unsubItems(); unsubAddons(); unsubBookings(); };
  }, [user]);

  // 輔助：存檔設定
  const saveShopSettings = async (newSettings) => {
    await setDoc(doc(db, 'artifacts', appId, 'public', 'settings'), newSettings);
  };

  // --- 核心邏輯：檢查時段是否已滿 (含 20 分鐘緩衝) ---
  const isTimeSlotFull = (date, checkTimeStr) => {
    if (!date || !checkTimeStr || !allBookings) return false;
    const checkMin = timeToMinutes(checkTimeStr);
    const bookingsToday = allBookings.filter(b => b.date === date);
    
    const concurrentCount = bookingsToday.filter(b => {
      const start = timeToMinutes(b.time);
      const end = start + (Number(b.totalDuration) || 90) + 20; // 服務時長 + 20分鐘
      return checkMin >= start && checkMin < end;
    }).length;

    return concurrentCount >= (shopSettings.maxCapacity || 1);
  };

  const handleDateChange = (e) => {
    const dateStr = e.target.value;
    const dateObj = new Date(dateStr);
    const dayOfWeek = dateObj.getDay();

    if (shopSettings.closedDays.includes(dayOfWeek) || shopSettings.specificHolidays.includes(dateStr)) {
      alert("抱歉，當日為店休日。");
      setBookingData({ ...bookingData, date: '', time: '' });
      e.target.value = '';
    } else {
      setBookingData({ ...bookingData, date: dateStr });
    }
  };

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

  // 略過部分 UI 組件以維持簡潔，核心架構保持不變...
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555]">
      {/* 導航欄 */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-[#EAE7E2]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <h1 className="text-xl tracking-[0.4em] font-extralight text-[#463E3E] cursor-pointer" onClick={() => setActiveTab('home')}>UNIWAWA</h1>
          <div className="flex gap-6 text-sm items-center">
            <button onClick={() => setActiveTab('home')}>首頁</button>
            <button onClick={() => setActiveTab('catalog')}>款式</button>
            {isLoggedIn && <button onClick={() => setIsBookingManagerOpen(true)} className="text-[#C29591]"><Settings size={18}/></button>}
            {!isLoggedIn && <button onClick={() => setIsAdminModalOpen(true)} className="text-gray-300"><Lock size={14}/></button>}
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
              <input type="date" className="w-full border p-3 bg-[#FAF9F6]" onChange={handleDateChange} />
              
              <div className="space-y-2">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">選擇開始時間 (含20min清潔時間)</p>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {TIME_SLOTS.map(t => {
                    const full = isTimeSlotFull(bookingData.date, t);
                    return (
                      <button 
                        key={t} 
                        disabled={full}
                        onClick={() => setBookingData({...bookingData, time:t})} 
                        className={`py-2 text-[10px] border transition-all 
                          ${full ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 
                            bookingData.time===t ? 'bg-[#463E3E] text-white' : 'bg-white text-gray-400'}`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button disabled={isSubmitting} onClick={handleConfirmBooking} className="w-full bg-[#463E3E] text-white py-4 text-xs tracking-widest uppercase">
                {isSubmitting ? '處理中...' : '確認送出預約'}
              </button>
            </div>
          </div>
        ) : activeTab === 'catalog' ? (
          <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
            {cloudItems.map(item => (
              <div key={item.id} className="bg-white border p-6 text-center">
                <img src={item.images?.[0]} className="w-full aspect-[3/4] object-cover mb-4" />
                <h3 className="tracking-widest font-medium mb-4">{item.title}</h3>
                <div className="mb-6">
                  <select className="w-full text-[11px] border p-2 bg-[#FAF9F6]" onChange={(e) => setSelectedAddon(addons.find(a => a.id === e.target.value) || null)}>
                    <option value="">選擇指甲現況</option>
                    {addons.map(a => <option key={a.id} value={a.id}>{a.name} (+{a.duration}分)</option>)}
                  </select>
                </div>
                <button onClick={() => { setSelectedItem(item); setBookingStep('form'); window.scrollTo(0,0); }} className="w-full bg-[#463E3E] text-white py-3 text-[10px] tracking-widest uppercase">點此預約</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center">
            <h2 className="text-4xl font-extralight tracking-[0.4em] text-[#463E3E]">UNIWAWA</h2>
            <button onClick={() => setActiveTab('catalog')} className="mt-10 bg-[#463E3E] text-white px-16 py-4 text-xs tracking-[0.4em]">進入作品集</button>
          </div>
        )}
      </main>

      {/* 後台管理彈窗 (含店休設定) */}
      {isBookingManagerOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-10 border-b pb-4">
              <h3 className="tracking-[0.3em] font-light uppercase flex items-center gap-2"><Settings size={20}/> 系統後台管理</h3>
              <button onClick={() => setIsBookingManagerOpen(false)}><X size={24}/></button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* 預約管理 */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold border-l-4 border-[#C29591] pl-2">最新預約</h4>
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

              {/* 店休管理 */}
              <div className="space-y-6">
                <div className="bg-[#FAF9F6] p-6 border">
                  <h4 className="text-xs font-bold mb-4 uppercase">每週固定店休</h4>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day, idx) => (
                      <button 
                        key={day} 
                        onClick={() => {
                          const newDays = shopSettings.closedDays.includes(idx) ? shopSettings.closedDays.filter(d => d !== idx) : [...shopSettings.closedDays, idx];
                          saveShopSettings({ ...shopSettings, closedDays: newDays });
                        }}
                        className={`px-3 py-1 text-[10px] border ${shopSettings.closedDays.includes(idx) ? 'bg-[#463E3E] text-white' : 'bg-white text-gray-400'}`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-[#FAF9F6] p-6 border">
                   <h4 className="text-xs font-bold mb-4 uppercase">特定日期店休</h4>
                   <div className="flex gap-2">
                     <input type="date" className="flex-1 p-2 border text-xs" value={newHolidayInput} onChange={e => setNewHolidayInput(e.target.value)} />
                     <button onClick={() => { if(!newHolidayInput) return; saveShopSettings({...shopSettings, specificHolidays: [...shopSettings.specificHolidays, newHolidayInput]}); setNewHolidayInput(''); }} className="bg-[#463E3E] text-white px-4 text-[10px]">新增</button>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 其他彈窗略... */}
    </div>
  );
}