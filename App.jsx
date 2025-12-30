import React, { useState, useEffect } from 'react';
import { Plus, X, Lock, Trash2, Edit3, MessageCircle, Settings, Clock, Calendar, User, Phone, CheckCircle, List } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

// --- Firebase 初始化 ---
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

const generateTimeSlots = () => {
  const slots = [];
  for (let h = 12; h <= 20; h++) {
    for (let m = 0; m < 60; m += 10) {
      if (h === 20 && m > 0) break;
      const time = `${h}:${m === 0 ? '00' : m}`;
      slots.push(time);
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
  const [allBookings, setAllBookings] = useState([]); // 存儲所有預約單
  
  // 預約與流程狀態
  const [bookingStep, setBookingStep] = useState('none');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedAddon, setSelectedAddon] = useState(null);
  const [bookingData, setBookingData] = useState({ name: '', phone: '', date: '', time: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAddonManagerOpen, setIsAddonManagerOpen] = useState(false);
  const [isBookingManagerOpen, setIsBookingManagerOpen] = useState(false); // 管理預約單
  
  const [passwordInput, setPasswordInput] = useState('');
  const [styleFilter, setStyleFilter] = useState('全部');
  const [priceFilter, setPriceFilter] = useState('全部');

  useEffect(() => {
    signInAnonymously(auth);
    onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  useEffect(() => {
    if (!user) return;
    // 監聽款式、加購、以及預約單
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), (s) => 
      setCloudItems(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'addons'), (s) => 
      setAddons(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    // 管理員專用：按時間排序監聽預約單
    const bookingQuery = query(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), orderBy('createdAt', 'desc'));
    onSnapshot(bookingQuery, (s) => setAllBookings(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

  const totalAmount = (selectedItem?.price || 0) + (selectedAddon?.price || 0);
  const totalDuration = (selectedItem?.duration || 0) + (selectedAddon?.duration || 0);

  // 送出預約到 Firebase
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
        totalAmount,
        totalDuration,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setBookingStep('success');
    } catch (e) {
      alert('預約失敗，請再試一次');
    } finally {
      setIsSubmitting(false);
    }
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
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555] font-sans selection:bg-[#C29591] selection:text-white">
      {/* 導航欄 */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-[#EAE7E2]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <h1 className="text-xl tracking-[0.4em] font-extralight cursor-pointer text-[#463E3E]" onClick={() => {setActiveTab('home'); setBookingStep('none');}}>UNIWAWA</h1>
          <div className="flex gap-6 text-sm tracking-widest font-medium uppercase">
            <button onClick={() => {setActiveTab('home'); setBookingStep('none');}} className={activeTab === 'home' && bookingStep === 'none' ? 'text-[#C29591]' : ''}>首頁</button>
            <button onClick={() => {setActiveTab('catalog'); setBookingStep('none');}} className={activeTab === 'catalog' && bookingStep === 'none' ? 'text-[#C29591]' : ''}>款式</button>
            {isLoggedIn && (
              <div className="flex gap-4 border-l pl-4 border-[#EAE7E2]">
                <button onClick={() => setIsBookingManagerOpen(true)} className="text-[#C29591]"><List size={18}/></button>
                <button onClick={() => setIsAddonManagerOpen(true)} className="text-[#C29591]"><Settings size={18}/></button>
              </div>
            )}
            {!isLoggedIn && <button onClick={() => setIsAdminModalOpen(true)} className="text-gray-300"><Lock size={14}/></button>}
          </div>
        </div>
      </nav>

      <main className="pt-20">
        {bookingStep === 'form' ? (
          /* --- 預約填寫頁面 --- */
          <div className="max-w-2xl mx-auto px-6 py-12">
            <h2 className="text-2xl font-light tracking-[0.3em] text-center mb-12 text-[#463E3E]">RESERVATION / 預約資訊</h2>
            <div className="bg-white border border-[#EAE7E2] p-8 shadow-sm space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] tracking-widest text-gray-400 mb-2 block font-bold uppercase">顧客姓名</label>
                  <input type="text" className="w-full border-b border-[#EAE7E2] py-2 outline-none focus:border-[#C29591]" value={bookingData.name} onChange={e => setBookingData({...bookingData, name: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] tracking-widest text-gray-400 mb-2 block font-bold uppercase">聯絡電話</label>
                  <input type="tel" className="w-full border-b border-[#EAE7E2] py-2 outline-none focus:border-[#C29591]" value={bookingData.phone} onChange={e => setBookingData({...bookingData, phone: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-[10px] tracking-widest text-gray-400 mb-2 block font-bold uppercase">預約日期</label>
                <input type="date" className="w-full border border-[#EAE7E2] p-3 bg-[#FAF9F6] outline-none" value={bookingData.date} onChange={e => setBookingData({...bookingData, date: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] tracking-widest text-gray-400 mb-3 block font-bold uppercase">預約時段</label>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {TIME_SLOTS.map(time => (
                    <button key={time} onClick={() => setBookingData({...bookingData, time})} className={`py-2 text-[10px] border ${bookingData.time === time ? 'bg-[#463E3E] text-white' : 'bg-white text-gray-400'}`}>{time}</button>
                  ))}
                </div>
              </div>
              <div className="bg-[#FAF9F6] p-6 border-y border-[#EAE7E2]">
                <div className="flex justify-between text-sm mb-2"><span>{selectedItem?.title}</span><span>NT$ {selectedItem?.price}</span></div>
                <div className="flex justify-between text-sm mb-4"><span>{selectedAddon?.name || '無'}</span><span>NT$ {selectedAddon?.price || 0}</span></div>
                <div className="flex justify-between items-center pt-4 border-t border-[#EAE7E2]">
                  <div className="text-[#C29591] text-xs"><Clock size={14} className="inline mr-1"/> 總需時：{totalDuration} 分鐘</div>
                  <div className="text-lg font-bold text-[#463E3E]">總計 NT$ {totalAmount.toLocaleString()}</div>
                </div>
              </div>
              <button disabled={isSubmitting} onClick={handleConfirmBooking} className="w-full bg-[#463E3E] text-white py-4 tracking-[0.3em] text-xs hover:bg-[#C29591]">
                {isSubmitting ? '正在送出預約...' : '確認預約'}
              </button>
            </div>
          </div>
        ) : bookingStep === 'success' ? (
          /* --- 預約成功頁面 --- */
          <div className="max-w-lg mx-auto px-6 py-20 flex flex-col items-center text-center">
            <CheckCircle size={48} className="text-[#06C755] mb-6" strokeWidth={1} />
            <h2 className="text-2xl font-light tracking-[0.4em] mb-4 text-[#463E3E]">預約已完成</h2>
            <div className="w-full bg-white border border-[#EAE7E2] p-8 text-left space-y-4 mb-12">
              <div className="flex justify-between border-b pb-4"><span className="text-gray-400 text-xs tracking-widest uppercase">預約內容</span><span className="text-sm font-medium">{selectedItem?.title}</span></div>
              <div className="flex justify-between border-b pb-4"><span className="text-gray-400 text-xs tracking-widest uppercase">預約時間</span><span className="text-sm font-medium">{bookingData.date} {bookingData.time}</span></div>
              <div className="flex justify-between pt-2"><span className="text-[#C29591] text-xs font-bold uppercase tracking-widest">總計金額</span><span className="text-lg font-bold">NT$ {totalAmount.toLocaleString()}</span></div>
            </div>
            <button onClick={() => {setBookingStep('none'); setActiveTab('home');}} className="border border-[#463E3E] text-[#463E3E] px-12 py-3 text-xs tracking-[0.3em]">回到首頁</button>
          </div>
        ) : activeTab === 'home' ? (
          /* --- 首頁 --- */
          <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-6 text-center">
            <span className="text-[#C29591] tracking-[0.4em] md:tracking-[0.8em] text-xs md:text-sm mb-10 uppercase font-extralight whitespace-nowrap">EST. 2026 • TAOYUAN</span>
            <div className="w-full max-w-xl mb-12 shadow-2xl rounded-sm overflow-hidden border border-[#EAE7E2]">
              <img src="https://drive.google.com/thumbnail?id=1ZJv3DS8ST_olFt0xzKB_miK9UKT28wMO&sz=w1200" className="w-full h-auto max-h-[40vh] object-cover" />
            </div>
            <h2 className="text-4xl md:text-5xl font-extralight mb-12 tracking-[0.4em] text-[#463E3E] leading-relaxed">Beyond<br/>Expectation</h2>
            <button onClick={() => setActiveTab('catalog')} className="bg-[#463E3E] text-white px-16 py-4 tracking-[0.4em] text-xs shadow-xl font-light">進入作品集</button>
          </div>
        ) : (
          /* --- 目錄頁 --- */
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16">
              {filteredItems.map(item => (
                <div key={item.id} className="group flex flex-col bg-white border border-[#F0EDEA] shadow-sm">
                  <div className="aspect-[3/4] overflow-hidden relative">
                    <img src={item.images?.[0]} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-8 flex flex-col items-center text-center">
                    <span className="text-[10px] text-[#C29591] tracking-[0.4em] uppercase mb-2 font-medium">{item.category}</span>
                    <h3 className="text-[#463E3E] font-medium text-lg tracking-widest mb-2">{item.title}</h3>
                    <p className="text-[#463E3E] font-bold text-xl mb-8"><span className="text-xs font-light tracking-widest mr-1">NT$</span>{item.price.toLocaleString()}</p>
                    <div className="w-full mb-8 text-left">
                      <select className="w-full text-[11px] border border-[#EAE7E2] py-3 px-4 bg-[#FAF9F6] outline-none" onChange={(e) => setSelectedAddon(addons.find(a => a.id === e.target.value) || null)}>
                        <option value="">請選擇指甲現況</option>
                        <option value="none">不加購（純卸甲）</option>
                        {addons.map(a => (<option key={a.id} value={a.id}>{a.name} (+${a.price} / {a.duration}分)</option>))}
                      </select>
                    </div>
                    <button onClick={() => { setSelectedItem(item); setBookingStep('form'); window.scrollTo(0,0); }} className="bg-[#463E3E] text-white px-8 py-3.5 rounded-full text-xs tracking-[0.2em] font-medium w-full">點此預約</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 管理彈窗 - 預約清單 */}
      {isBookingManagerOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white p-8 max-w-3xl w-full shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8 border-b pb-4"><h3 className="tracking-widest font-light">預約訂單管理</h3><button onClick={() => setIsBookingManagerOpen(false)}><X size={20}/></button></div>
            <div className="space-y-4">
              {allBookings.map(b => (
                <div key={b.id} className="border p-4 flex flex-col md:flex-row justify-between md:items-center text-sm gap-4">
                  <div className="space-y-1">
                    <div className="font-bold">{b.date} {b.time} - {b.name}</div>
                    <div className="text-xs text-gray-400">{b.itemTitle} / {b.addonName}</div>
                    <div className="text-xs text-blue-500">{b.phone}</div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right"><div className="font-bold">NT$ {b.totalAmount}</div><div className="text-[10px] text-gray-300">{b.totalDuration} min</div></div>
                    <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', b.id))} className="text-red-300 hover:text-red-500"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}
              {allBookings.length === 0 && <div className="text-center py-10 text-gray-300">目前尚無預約單</div>}
            </div>
          </div>
        </div>
      )}

      {/* 其餘後台登入彈窗 (密碼 8888) */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white p-10 max-w-sm w-full shadow-2xl rounded-sm">
            <h3 className="text-center tracking-[0.5em] mb-10 font-light text-gray-400 text-sm">ADMIN ACCESS</h3>
            <form onSubmit={(e) => { e.preventDefault(); if(passwordInput==="8888") setIsLoggedIn(true); setIsAdminModalOpen(false); }}>
              <input type="password" placeholder="••••" className="w-full border-b border-[#EAE7E2] py-4 text-center tracking-[1.5em] mb-10 focus:outline-none" onChange={e => setPasswordInput(e.target.value)} autoFocus />
              <button className="w-full bg-[#463E3E] text-white py-4 tracking-[0.3em] text-xs">ENTER</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}