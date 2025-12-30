import React, { useState, useEffect } from 'react';
import { Plus, X, Lock, Trash2, Edit3, Settings, Clock, Calendar, Check, ChevronRight, MapPin, Users } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, setDoc, query, where } from 'firebase/firestore';

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
const TIME_SLOTS = (() => {
  const slots = [];
  for (let h = 12; h <= 19; h++) {
    for (let m = 0; m < 60; m += 10) {
      if (h === 19 && m > 0) break;
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  return slots;
})();

const App = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cloudItems, setCloudItems] = useState([]);
  const [addons, setAddons] = useState([]);
  const [stores, setStores] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [config, setConfig] = useState({ maxCapacity: 1, closedDates: [] });

  // 預約暫存狀態
  const [bookingStep, setBookingStep] = useState(null); // null, 'form'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentAddons, setCurrentAddons] = useState([]);
  const [bookingData, setBookingData] = useState({ name: '', phone: '', storeId: '', date: '', time: '' });

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    signInAnonymously(auth);
    onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  useEffect(() => {
    if (!user) return;
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), s => setCloudItems(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'addons'), s => setAddons(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'stores'), s => setStores(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), s => setBookings(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(doc(db, 'artifacts', appId, 'public', 'config', 'global'), d => d.exists() ? setConfig(d.data()) : setDoc(d.ref, { maxCapacity: 1, closedDates: [] }));
  }, [user]);

  // --- 核心邏輯：檢查時段是否可預約 ---
  const isTimeAvailable = (date, time) => {
    if (!date || !time || !bookingData.storeId) return true;
    
    // 1. 24小時限制
    const now = new Date();
    const target = new Date(`${date} ${time}`);
    if (target - now < 24 * 60 * 60 * 1000) return false;

    // 2. 店休檢查
    if (config.closedDates?.includes(date)) return false;

    // 3. 佔用檢查 (工時 + 20min)
    const [checkH, checkM] = time.split(':').map(Number);
    const checkTotalMin = checkH * 60 + checkM;
    
    const storeBookings = bookings.filter(b => b.date === date && b.storeId === bookingData.storeId);
    let occupiedCount = 0;

    storeBookings.forEach(b => {
      const [bH, bM] = b.time.split(':').map(Number);
      const bStart = bH * 60 + bM;
      const bEnd = bStart + (Number(b.totalDuration) || 90) + 20;

      if (checkTotalMin >= bStart && checkTotalMin < bEnd) occupiedCount++;
    });

    return occupiedCount < (config.maxCapacity || 1);
  };

  const handleBooking = async () => {
    if (!bookingData.name || !bookingData.phone || !bookingData.date || !bookingData.time) return alert("請填寫完整預約資料");
    
    const extraTime = currentAddons.reduce((sum, a) => sum + Number(a.duration), 0);
    const extraPrice = currentAddons.reduce((sum, a) => sum + Number(a.price), 0);

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), {
        ...bookingData,
        productTitle: selectedProduct.title,
        totalDuration: (Number(selectedProduct.duration) || 90) + extraTime,
        totalPrice: (Number(selectedProduct.price) || 0) + extraPrice,
        addonNames: currentAddons.map(a => a.name),
        createdAt: serverTimestamp()
      });
      alert("預約成功！我們將盡快與您聯繫確認。");
      setBookingStep(null);
      setActiveTab('home');
    } catch (e) { alert("預約失敗"); }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555] font-sans">
      {/* 導覽列 */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-[#EAE7E2]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <h1 className="text-xl tracking-[0.4em] font-light cursor-pointer" onClick={() => {setActiveTab('home'); setBookingStep(null);}}>UNIWAWA</h1>
          <div className="flex gap-6 text-xs tracking-widest font-medium uppercase">
            <button onClick={() => {setActiveTab('home'); setBookingStep(null);}} className={activeTab === 'home' ? 'text-[#C29591]' : ''}>HOME</button>
            <button onClick={() => {setActiveTab('catalog'); setBookingStep(null);}} className={activeTab === 'catalog' ? 'text-[#C29591]' : ''}>CATALOG</button>
            {isLoggedIn ? (
              <button onClick={() => setIsManagerOpen(true)} className="text-[#C29591] flex items-center gap-1"><Settings size={14}/> ADMIN</button>
            ) : (
              <button onClick={() => setIsAdminModalOpen(true)} className="text-gray-300"><Lock size={14}/></button>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-20">
        {bookingStep === 'form' ? (
          /* 預約填寫頁面 */
          <div className="max-w-2xl mx-auto px-6 py-12 animate-in fade-in duration-500">
            <button onClick={() => setBookingStep(null)} className="text-[10px] tracking-widest text-gray-400 mb-8 flex items-center gap-1 uppercase">← Back to Styles</button>
            <div className="bg-white p-8 border border-[#EAE7E2] shadow-sm space-y-10">
              <header className="border-b pb-6">
                <h2 className="text-2xl font-light tracking-widest text-[#463E3E]">{selectedProduct.title}</h2>
                <p className="text-xs text-gray-400 mt-2 uppercase">預計工時: {Number(selectedProduct.duration) + currentAddons.reduce((s,a)=>s+Number(a.duration),0)} min</p>
              </header>

              <section className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-[#C29591] block mb-3 uppercase">1. 選擇門市</label>
                  <div className="grid grid-cols-2 gap-2">
                    {stores.map(s => (
                      <button key={s.id} onClick={() => setBookingData({...bookingData, storeId: s.id})} className={`p-4 text-xs border transition-all ${bookingData.storeId === s.id ? 'bg-[#463E3E] text-white border-[#463E3E]' : 'bg-white hover:border-gray-300'}`}>{s.name}</button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold tracking-widest text-[#C29591] block mb-3 uppercase">2. 預約日期</label>
                    <input type="date" className="w-full border-b p-2 outline-none focus:border-black" onChange={e => setBookingData({...bookingData, date: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold tracking-widest text-[#C29591] block mb-3 uppercase">3. 預約時間</label>
                    <select className="w-full border-b p-2 outline-none focus:border-black bg-transparent" onChange={e => setBookingData({...bookingData, time: e.target.value})}>
                      <option value="">請選擇時段</option>
                      {TIME_SLOTS.map(t => {
                        const avail = isTimeAvailable(bookingData.date, t);
                        return <option key={t} value={t} disabled={!avail}>{t} {avail ? '' : '(額滿)'}</option>
                      })}
                    </select>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <input placeholder="姓名" className="w-full border-b p-3 outline-none focus:border-black" onChange={e => setBookingData({...bookingData, name: e.target.value})} />
                  <input placeholder="聯絡電話" className="w-full border-b p-3 outline-none focus:border-black" onChange={e => setBookingData({...bookingData, phone: e.target.value})} />
                </div>
              </section>

              <button onClick={handleBooking} className="w-full bg-[#463E3E] text-white py-5 tracking-[0.3em] text-xs hover:bg-[#C29591] transition-all shadow-lg">提交預約單</button>
            </div>
          </div>
        ) : activeTab === 'home' ? (
          /* 首頁看板 */
          <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center text-center">
             <div className="max-w-2xl w-full px-6 space-y-12">
                <img src="https://drive.google.com/thumbnail?id=1ZJv3DS8ST_olFt0xzKB_miK9UKT28wMO&sz=w1200" className="w-full shadow-2xl" alt="Hero" />
                <h2 className="text-4xl font-extralight tracking-[0.4em] text-[#463E3E]">PRIVATE<br/>NAIL STUDIO</h2>
                <button onClick={() => setActiveTab('catalog')} className="bg-[#463E3E] text-white px-16 py-4 tracking-[0.3em] text-xs hover:bg-black transition-all">BROWSE STYLES</button>
             </div>
          </div>
        ) : (
          /* 目錄頁面 */
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              {cloudItems.map(item => (
                <div key={item.id} className="group bg-white border border-[#EAE7E2] overflow-hidden flex flex-col shadow-sm">
                  <div className="aspect-[3/4] overflow-hidden relative">
                    <img src={item.images?.[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={item.title} />
                  </div>
                  <div className="p-8 flex flex-col items-center">
                    <span className="text-[10px] text-[#C29591] tracking-[0.3em] uppercase mb-2">{item.category}</span>
                    <h3 className="text-[#463E3E] font-medium text-lg tracking-widest mb-4">{item.title}</h3>
                    <div className="flex flex-wrap gap-2 justify-center mb-8">
                       {addons.map(a => (
                         <button 
                           key={a.id} 
                           onClick={() => {
                             const exists = currentAddons.find(ca => ca.id === a.id);
                             if (exists) setCurrentAddons(currentAddons.filter(ca => ca.id !== a.id));
                             else setCurrentAddons([...currentAddons, a]);
                           }}
                           className={`px-3 py-1.5 rounded-full border text-[10px] transition-all ${currentAddons.find(ca => ca.id === a.id) ? 'bg-[#C29591] text-white border-[#C29591]' : 'text-gray-400 border-gray-100 hover:border-gray-200'}`}
                         >
                           {a.name} (+${a.price})
                         </button>
                       ))}
                    </div>
                    <button 
                      onClick={() => { setSelectedProduct(item); setBookingStep('form'); window.scrollTo(0,0); }}
                      className="w-full flex justify-center items-center gap-2 bg-[#463E3E] text-white py-3 tracking-widest text-xs hover:bg-black transition-all shadow-md"
                    >
                      <Calendar size={14}/> 即刻預約諮詢
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 管理後台大面板 */}
      {isManagerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl h-[85vh] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="tracking-[0.2em] font-light flex items-center gap-2"><Settings size={18}/> 管理主控台</h3>
              <button onClick={() => setIsManagerOpen(false)}><X size={24}/></button>
            </div>
            
            <div className="flex-grow overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-10">
              {/* 設定區 */}
              <div className="space-y-8">
                <section>
                  <label className="text-[10px] font-bold text-[#C29591] tracking-widest uppercase mb-4 block">同時段預約人數上限</label>
                  <div className="flex items-center gap-4">
                    <input type="number" className="w-20 border-b p-2 outline-none" value={config.maxCapacity} onChange={e => updateDoc(doc(db, 'artifacts', appId, 'public', 'config', 'global'), {maxCapacity: Number(e.target.value)})} />
                    <span className="text-xs text-gray-400">目前設定: {config.maxCapacity} 位</span>
                  </div>
                </section>

                <section>
                  <label className="text-[10px] font-bold text-[#C29591] tracking-widest uppercase mb-4 block">門市管理</label>
                  <div className="flex gap-2 mb-4">
                    <input id="store_name" className="flex-1 border-b text-sm" placeholder="新門市名稱" />
                    <button onClick={() => {
                      const n = document.getElementById('store_name').value;
                      if(n) { addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'stores'), {name: n}); document.getElementById('store_name').value = ''; }
                    }} className="bg-black text-white px-4 py-2 text-[10px]">新增</button>
                  </div>
                  <div className="space-y-2">
                    {stores.map(s => (
                      <div key={s.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-sm border">
                        <span className="text-xs">{s.name}</span>
                        <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'stores', s.id))} className="text-red-300 hover:text-red-500"><Trash2 size={14}/></button>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <label className="text-[10px] font-bold text-[#C29591] tracking-widest uppercase mb-4 block">店休日期 (關閉預約)</label>
                  <input type="date" id="close_date" className="w-full border-b mb-4 outline-none" />
                  <button onClick={() => {
                    const d = document.getElementById('close_date').value;
                    if(d) updateDoc(doc(db, 'artifacts', appId, 'public', 'config', 'global'), {closedDates: [...(config.closedDates || []), d]});
                  }} className="w-full bg-red-400 text-white py-2 text-[10px] mb-4">新增關閉日期</button>
                  <div className="flex flex-wrap gap-2">
                    {config.closedDates?.map(d => (
                      <span key={d} className="bg-red-50 text-red-500 text-[10px] px-2 py-1 flex items-center gap-1 border border-red-100">
                        {d} <X size={10} className="cursor-pointer" onClick={() => updateDoc(doc(db, 'artifacts', appId, 'public', 'config', 'global'), {closedDates: config.closedDates.filter(item => item !== d)})} />
                      </span>
                    ))}
                  </div>
                </section>
              </div>

              {/* 預約單列表 */}
              <div className="lg:col-span-2 space-y-6">
                 <label className="text-[10px] font-bold text-[#C29591] tracking-widest uppercase block">最新預約訂單</label>
                 <div className="space-y-4">
                   {bookings.sort((a,b) => b.createdAt - a.createdAt).map(b => (
                     <div key={b.id} className="p-5 border bg-gray-50 rounded-sm relative group">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-bold text-[#463E3E]">{b.productTitle}</h4>
                          <span className="text-[10px] bg-white px-2 py-1 border">{b.date} {b.time}</span>
                        </div>
                        <div className="text-xs text-gray-500 space-y-1">
                          <p>顧客: {b.name} ({b.phone})</p>
                          <p>門市: {stores.find(s=>s.id===b.storeId)?.name || '未知'}</p>
                          <p>總金額: NT$ {b.totalPrice} | 總工時: {b.totalDuration} min</p>
                        </div>
                        <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', b.id))} className="absolute top-4 right-4 text-red-200 opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                     </div>
                   ))}
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 款式上傳與登入彈窗 (保持與原代碼類似的視覺風格) */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
          <div className="bg-white p-10 max-w-sm w-full shadow-2xl text-center">
            <h3 className="tracking-widest mb-8 font-light text-sm uppercase">ADMIN ACCESS</h3>
            <input type="password" placeholder="PASSWORD" className="w-full border-b py-3 text-center tracking-[1em] focus:outline-none" onChange={e => setPasswordInput(e.target.value)} autoFocus />
            <button onClick={() => {if(passwordInput==="8888") {setIsLoggedIn(true); setIsAdminModalOpen(false);} else alert("錯誤");}} className="w-full bg-[#463E3E] text-white py-4 mt-8 tracking-widest">LOGIN</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;