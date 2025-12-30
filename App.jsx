import React, { useState, useEffect } from 'react';
import { Plus, X, Lock, Trash2, Edit3, MessageCircle, Settings, Clock, Calendar, User, Phone, CheckCircle, List, Upload } from 'lucide-react';
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
const PRICE_CATEGORIES = ['全部', '1300以下', '1300-1900', '1900以上'];
const WEEKDAYS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

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
  
  // 新增：店休與系統設定狀態
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
  const [priceFilter, setPriceFilter] = useState('全部');
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({ title: '', price: '', category: '極簡氣質', duration: '90', images: [] });

  useEffect(() => {
    signInAnonymously(auth);
    onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  // 核心修改：增加 settings 監聽與防錯
  useEffect(() => {
    if (!user) return;

    // 1. 監聽店內設定
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
    });

    // 2. 監聽商品、加購、預約
    const unsubItems = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), (s) => 
      setCloudItems(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubAddons = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'addons'), (s) => 
      setAddons(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const bookingQuery = query(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), orderBy('createdAt', 'desc'));
    const unsubBookings = onSnapshot(bookingQuery, (s) => setAllBookings(s.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubSettings(); unsubItems(); unsubAddons(); unsubBookings(); };
  }, [user]);

  // 儲存設定到 Firebase
  const saveShopSettings = async (newSettings) => {
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'settings'), newSettings);
    } catch (e) { alert("設定儲存失敗"); }
  };

  // 檢查時間是否客滿 (含緩衝)
  const isTimeSlotFull = (date, checkTimeStr) => {
    if (!date || !checkTimeStr || !allBookings) return false;
    const checkMin = timeToMinutes(checkTimeStr);
    const bookingsToday = allBookings.filter(b => b.date === date);
    
    const concurrentCount = bookingsToday.filter(b => {
      const start = timeToMinutes(b.time);
      const duration = Number(b.totalDuration) || 90;
      const end = start + duration + 20; // 服務時長 + 20分鐘清潔
      return checkMin >= start && checkMin < end;
    }).length;

    return concurrentCount >= (shopSettings.maxCapacity || 1);
  };

  // 處理日期變更 (阻擋店休)
  const handleDateChange = (e) => {
    const dateStr = e.target.value;
    if (!dateStr) return;
    const dateObj = new Date(dateStr);
    const dayOfWeek = dateObj.getDay();

    if (shopSettings.closedDays.includes(dayOfWeek) || shopSettings.specificHolidays.includes(dateStr)) {
      alert("抱歉，該日期為店休日，請選擇其他時段。");
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
            
            {/* 預約項目簡介 */}
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
              
              <div className="space-y-2">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">選擇日期 (週一店休)</p>
                <input type="date" className="w-full border p-3 bg-[#FAF9F6]" onChange={handleDateChange} />
              </div>

              <div className="space-y-2">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">選擇時段 (包含清潔緩衝)</p>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {TIME_SLOTS.map(t => {
                    const full = isTimeSlotFull(bookingData.date, t);
                    return (
                      <button 
                        key={t} 
                        disabled={full}
                        onClick={() => setBookingData({...bookingData, time:t})} 
                        className={`py-2 text-[10px] border transition-all ${full ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : bookingData.time===t ? 'bg-[#463E3E] text-white' : 'bg-white text-gray-400 hover:border-[#C29591]'}`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button disabled={isSubmitting} onClick={handleConfirmBooking} className="w-full bg-[#463E3E] text-white py-4 text-xs tracking-widest uppercase hover:bg-[#C29591] transition-all">
                {isSubmitting ? '處理中...' : '確認送出預約'}
              </button>
              <button onClick={() => setBookingStep('none')} className="w-full text-center text-[10px] text-gray-400 uppercase tracking-widest">返回重新選擇</button>
            </div>
          </div>
        ) : (
          /* ... 保持原本 activeTab 'catalog' 與 'home' 的渲染邏輯 ... */
          activeTab === 'home' ? (
            <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-6 text-center">
              <span className="text-[#C29591] tracking-[0.4em] md:tracking-[0.8em] text-xs md:text-sm mb-10 uppercase font-extralight whitespace-nowrap">EST. 2026 • TAOYUAN</span>
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
          )
        )}
      </main>

      {/* 後台管理與系統設定彈窗 */}
      {isBookingManagerOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-10 border-b pb-4">
              <h3 className="tracking-[0.3em] font-light uppercase flex items-center gap-2 text-[#463E3E]"><Settings size={20}/> 系統後台管理</h3>
              <button onClick={() => setIsBookingManagerOpen(false)}><X size={24}/></button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {/* 預約管理 (佔 2 欄) */}
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
                      <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', b.id))} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 店休設定 (佔 1 欄) */}
              <div className="space-y-8 border-l lg:pl-10">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold border-l-4 border-[#C29591] pl-2 uppercase tracking-widest">固定週休設定</h4>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day, idx) => (
                      <button 
                        key={day} 
                        onClick={() => {
                          const newDays = shopSettings.closedDays.includes(idx) ? shopSettings.closedDays.filter(d => d !== idx) : [...shopSettings.closedDays, idx];
                          saveShopSettings({ ...shopSettings, closedDays: newDays });
                        }}
                        className={`px-3 py-2 text-[10px] border transition-all ${shopSettings.closedDays.includes(idx) ? 'bg-[#463E3E] text-white border-[#463E3E]' : 'bg-white text-gray-400 border-gray-200'}`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold border-l-4 border-[#C29591] pl-2 uppercase tracking-widest">特定日期公休</h4>
                  <div className="flex gap-2">
                    <input type="date" className="flex-1 p-2 border text-xs outline-none" value={newHolidayInput} onChange={e => setNewHolidayInput(e.target.value)} />
                    <button onClick={() => { if(!newHolidayInput) return; saveShopSettings({...shopSettings, specificHolidays: [...shopSettings.specificHolidays, newHolidayInput]}); setNewHolidayInput(''); }} className="bg-[#463E3E] text-white px-4 text-[10px] tracking-widest">新增</button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {shopSettings.specificHolidays.map(date => (
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

      {/* 保持原本的 Admin 與 Upload 彈窗... */}
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
    </div>
  );
}