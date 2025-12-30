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

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cloudItems, setCloudItems] = useState([]);
  const [addons, setAddons] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  
  // 新增：店休相關狀態
  const [shopSettings, setShopSettings] = useState({ closedDays: [1], specificHolidays: [] });
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
    // 監聽店休設定
    onSnapshot(doc(db, 'artifacts', appId, 'public', 'settings'), (d) => {
      if (d.exists()) setShopSettings(d.data());
    });
  }, [user]);

  const saveShopSettings = async (newSettings) => {
    await setDoc(doc(db, 'artifacts', appId, 'public', 'settings'), newSettings);
  };

  const handleDateChange = (e) => {
    const dateStr = e.target.value;
    const dateObj = new Date(dateStr);
    const dayOfWeek = dateObj.getDay();

    if (shopSettings.closedDays.includes(dayOfWeek) || shopSettings.specificHolidays.includes(dateStr)) {
      alert("抱歉，所選日期為店休日，請選擇其他日期。");
      setBookingData({ ...bookingData, date: '' });
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
            {/* 預約摘要內容... */}
            <div className="bg-white border border-[#EAE7E2] p-8 shadow-sm space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input type="text" placeholder="顧客姓名" className="border-b py-2 outline-none focus:border-[#C29591]" onChange={e => setBookingData({...bookingData, name: e.target.value})} />
                <input type="tel" placeholder="聯絡電話" className="border-b py-2 outline-none focus:border-[#C29591]" onChange={e => setBookingData({...bookingData, phone: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-2">預約日期 (店休日不開放)</label>
                <input type="date" className="w-full border p-3 bg-[#FAF9F6] outline-none focus:border-[#C29591]" min={new Date().toISOString().split('T')[0]} onChange={handleDateChange} />
              </div>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {TIME_SLOTS.map(t => (
                  <button key={t} onClick={() => setBookingData({...bookingData, time:t})} className={`py-2 text-[10px] border transition-colors ${bookingData.time===t ? 'bg-[#463E3E] text-white' : 'bg-white text-gray-400 hover:border-[#C29591]'}`}>
                    {t}
                  </button>
                ))}
              </div>
              <button disabled={isSubmitting} onClick={handleConfirmBooking} className="w-full bg-[#463E3E] text-white py-4 text-xs tracking-widest uppercase hover:bg-[#C29591] transition-all">
                {isSubmitting ? '處理中...' : '確認送出預約'}
              </button>
            </div>
          </div>
        ) : bookingStep === 'success' ? (
          /* 預約成功畫面保持不變 */
          <div className="max-w-md mx-auto py-20 px-6 text-center">
             <CheckCircle size={56} className="text-[#C29591] mx-auto mb-4" />
             <h2 className="text-2xl font-light tracking-[0.3em]">預約成功</h2>
             <button onClick={() => {setBookingStep('none'); setActiveTab('home');}} className="w-full mt-10 border py-4 text-[10px] tracking-[0.4em]">Back to Home</button>
          </div>
        ) : (
          /* 首頁或款式清單... */
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16">
               {filteredItems.map(item => (
                  <div key={item.id} className="border p-6 bg-white">
                     <img src={item.images?.[0]} className="w-full aspect-[3/4] object-cover mb-4" />
                     <h3 className="font-medium text-center">{item.title}</h3>
                     <button onClick={() => {setSelectedItem(item); setBookingStep('form');}} className="w-full mt-4 bg-[#463E3E] text-white py-3 text-xs">點此預約</button>
                  </div>
               ))}
            </div>
          </div>
        )}
      </main>

      {/* 修改後的 Booking Manager 彈窗 */}
      {isBookingManagerOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white p-8 max-w-5xl w-full shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8 border-b pb-4">
              <h3 className="tracking-widest font-light uppercase flex items-center gap-2"><Settings size={18}/> 系統後台管理</h3>
              <button onClick={() => setIsBookingManagerOpen(false)}><X size={20}/></button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* 預約清單 */}
              <div>
                <h4 className="text-xs font-bold tracking-[0.2em] mb-4 border-l-2 border-[#C29591] pl-2 uppercase text-gray-400">最新預約名單</h4>
                <div className="space-y-3">
                  {allBookings.map(b => (
                    <div key={b.id} className="border p-4 flex justify-between items-center text-sm bg-[#FAF9F6]">
                      <div>
                        <div className="font-bold text-[#463E3E]">{b.date} {b.time}</div>
                        <div className="text-[10px] text-gray-500">{b.name} | {b.phone}</div>
                      </div>
                      <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', b.id))} className="text-red-300 hover:text-red-500"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 店休設定區塊 */}
              <div className="space-y-8">
                <div className="bg-[#FAF9F6] p-6 border border-[#EAE7E2]">
                  <h4 className="text-xs font-bold tracking-[0.2em] mb-4 flex items-center gap-2 uppercase"><Coffee size={14}/> 每週固定公休日</h4>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day, idx) => (
                      <button 
                        key={day}
                        onClick={() => {
                          const newDays = shopSettings.closedDays.includes(idx) ? shopSettings.closedDays.filter(d => d !== idx) : [...shopSettings.closedDays, idx];
                          saveShopSettings({ ...shopSettings, closedDays: newDays });
                        }}
                        className={`px-3 py-2 text-[10px] border transition-all ${shopSettings.closedDays.includes(idx) ? 'bg-[#463E3E] text-white border-[#463E3E]' : 'bg-white text-gray-400'}`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[#FAF9F6] p-6 border border-[#EAE7E2]">
                  <h4 className="text-xs font-bold tracking-[0.2em] mb-4 uppercase">特定店休日 (如年假)</h4>
                  <div className="flex gap-2 mb-4">
                    <input type="date" className="flex-1 text-xs p-2 border outline-none" value={newHolidayInput} onChange={e => setNewHolidayInput(e.target.value)} />
                    <button onClick={() => { if(!newHolidayInput) return; saveShopSettings({...shopSettings, specificHolidays: [...shopSettings.specificHolidays, newHolidayInput]}); setNewHolidayInput(''); }} className="bg-[#463E3E] text-white px-4 text-[10px]">新增</button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {shopSettings.specificHolidays.map(date => (
                      <div key={date} className="flex justify-between items-center bg-white p-2 text-[10px] border border-[#EAE7E2]">
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
      
      {/* 其餘彈窗 (Upload, Admin) 保持不變 */}
    </div>
  );
}