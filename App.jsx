import React, { useState, useEffect } from 'react';
import { Plus, X, Lock, Trash2, Clock, CheckCircle, List, Upload, Settings, Calendar, Coffee } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

// Firebase 配置
const firebaseConfig = {
  apiKey: "AIzaSyBkFqTUwtC7MqZ6h4--2_1BmldXEg-Haiw",
  authDomain: "uniwawa-beauty.firebaseapp.com",
  projectId: "uniwawa-beauty",
  appId: "1:1009617609234:web:3cb5466e79a81c1f1aaecb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const STYLE_CATEGORIES = ['全部', '極簡氣質', '華麗鑽飾', '藝術手繪', '日系暈染', '貓眼系列'];
const TIME_SLOTS = ["12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // 資料庫
  const [products, setProducts] = useState([]);
  const [addons, setAddons] = useState([]);
  const [stores, setStores] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [config, setConfig] = useState({ maxCapacity: 1, closedDates: [] });

  // 狀態
  const [bookingStep, setBookingStep] = useState('none');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [tempBooking, setTempBooking] = useState({ name: '', phone: '', date: '', time: '' });

  // 彈窗
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [password, setPassword] = useState('');
  const [filter, setFilter] = useState('全部');

  useEffect(() => {
    signInAnonymously(auth);
    onAuthStateChanged(auth, u => setUser(u));
  }, []);

  useEffect(() => {
    if (!user) return;
    onSnapshot(collection(db, 'products'), s => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(collection(db, 'addons'), s => setAddons(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(collection(db, 'stores'), s => setStores(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(collection(db, 'bookings'), s => setBookings(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(doc(db, 'config', 'global'), d => d.exists() && setConfig(d.data()));
  }, [user]);

  // --- 核心邏輯：檢查時段可用性 ---
  const isTimeAvailable = (date, time) => {
    if (!date || !time || !selectedStoreId) return true;

    // 1. 檢查 24 小時前限制
    const now = new Date();
    const target = new Date(`${date} ${time}`);
    if (target - now < 24 * 60 * 60 * 1000) return false;

    // 2. 檢查是否為店休日
    if (config.closedDates?.includes(date)) return false;

    // 3. 檢查人數與工時緩衝 (當前預約會占用此時段，及其後續工時+20min的時段)
    const currentSlots = bookings.filter(b => b.date === date && b.storeId === selectedStoreId);
    
    // 計算該時段目前有多少人正在進行中
    let occupiedCount = 0;
    currentSlots.forEach(b => {
      const bStart = parseInt(b.time.split(':')[0]);
      const durationHours = Math.ceil((parseInt(b.duration || 90) + 20) / 60);
      const targetHour = parseInt(time.split(':')[0]);
      
      // 如果目標時間落在該筆預約的持續時間內，則計入占用
      if (targetHour >= bStart && targetHour < bStart + durationHours) {
        occupiedCount++;
      }
    });

    return occupiedCount < (config.maxCapacity || 1);
  };

  const handleBooking = async () => {
    if (!tempBooking.name || !tempBooking.phone || !tempBooking.date || !tempBooking.time || !selectedStoreId) return alert("請填寫完整資訊");
    const totalAddonPrice = selectedAddons.reduce((sum, a) => sum + (a.price || 0), 0);
    
    await addDoc(collection(db, 'bookings'), {
      ...tempBooking,
      storeId: selectedStoreId,
      productId: selectedProduct?.id,
      productTitle: selectedProduct?.title,
      duration: selectedProduct?.duration || 90,
      addons: selectedAddons.map(a => a.title),
      totalPrice: (selectedProduct?.price || 0) + totalAddonPrice,
      createdAt: serverTimestamp()
    });
    setBookingStep('success');
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555]">
      {/* 導覽 */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b p-4 flex justify-between items-center px-6">
        <h1 className="text-xl tracking-widest font-light" onClick={() => {setActiveTab('home'); setBookingStep('none');}}>UNIWAWA</h1>
        <div className="flex gap-4 text-xs font-bold uppercase">
          <button onClick={() => {setActiveTab('home'); setBookingStep('none');}}>Home</button>
          <button onClick={() => {setActiveTab('catalog'); setBookingStep('none');}}>Styles</button>
          {isLoggedIn ? (
            <button onClick={() => setShowManager(true)} className="text-[#C29591]"><Settings size={18}/></button>
          ) : (
            <button onClick={() => setShowAdminLogin(true)} className="text-gray-300"><Lock size={14}/></button>
          )}
        </div>
      </nav>

      <main className="pt-24 px-6 max-w-7xl mx-auto">
        {bookingStep === 'success' ? (
          <div className="text-center py-20 space-y-6">
            <CheckCircle size={60} className="mx-auto text-green-500" />
            <h2 className="text-2xl font-light tracking-widest">預約完成</h2>
            <button onClick={() => {setBookingStep('none'); setActiveTab('home');}} className="border p-2 px-10">返回</button>
          </div>
        ) : bookingStep === 'form' ? (
          <div className="max-w-xl mx-auto bg-white p-8 border shadow-sm space-y-8">
            <h2 className="text-center tracking-widest">RESERVATION</h2>
            
            {/* 加購項目區 */}
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-[#C29591]">ADD-ONS 加購項目</label>
              <div className="grid grid-cols-2 gap-2">
                {addons.map(a => (
                  <button key={a.id} onClick={() => {
                    if(selectedAddons.find(sa => sa.id === a.id)) setSelectedAddons(selectedAddons.filter(sa => sa.id !== a.id));
                    else setSelectedAddons([...selectedAddons, a]);
                  }} className={`p-3 text-xs border ${selectedAddons.find(sa => sa.id === a.id) ? 'bg-[#463E3E] text-white' : 'bg-white'}`}>
                    {a.title} (+${a.price})
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold text-[#C29591]">STEP 1: 選擇門市</label>
              <div className="grid grid-cols-2 gap-2">
                {stores.map(s => (
                  <button key={s.id} onClick={() => setSelectedStoreId(s.id)} className={`p-3 text-xs border ${selectedStoreId === s.id ? 'bg-[#463E3E] text-white' : 'bg-white'}`}>{s.name}</button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold text-[#C29591]">STEP 2: 日期與時間 (請預約24小時後時段)</label>
              <input type="date" className="w-full border-b p-2 outline-none" onChange={e => setTempBooking({...tempBooking, date: e.target.value})} />
              <div className="grid grid-cols-3 gap-2">
                {TIME_SLOTS.map(t => {
                  const avail = isTimeAvailable(tempBooking.date, t);
                  return (
                    <button key={t} disabled={!avail} onClick={() => setTempBooking({...tempBooking, time: t})} className={`p-2 text-[10px] border ${tempBooking.time === t ? 'bg-[#463E3E] text-white' : avail ? 'bg-white' : 'bg-gray-100 text-gray-300'}`}>
                      {avail ? t : '不可預約'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold text-[#C29591]">STEP 3: 聯絡人資料</label>
              <input placeholder="您的姓名" className="w-full border-b p-2" onChange={e => setTempBooking({...tempBooking, name: e.target.value})} />
              <input placeholder="電話號碼" className="w-full border-b p-2" onChange={e => setTempBooking({...tempBooking, phone: e.target.value})} />
            </div>

            <button onClick={handleBooking} className="w-full bg-[#463E3E] text-white py-4 text-xs tracking-widest">確認並送出</button>
          </div>
        ) : activeTab === 'home' ? (
          <div className="text-center py-10">
            <img src="https://drive.google.com/thumbnail?id=1ZJv3DS8ST_olFt0xzKB_miK9UKT28wMO&sz=w1200" className="mx-auto max-w-2xl shadow-xl mb-12" />
            <h2 className="text-3xl font-extralight tracking-[0.4em] mb-8">UNIWAWA BEAUTY</h2>
            <button onClick={() => setActiveTab('catalog')} className="bg-[#463E3E] text-white px-12 py-3 text-xs tracking-widest">開始預約款式</button>
          </div>
        ) : (
          <div>
            <div className="flex justify-center gap-6 mb-10 text-[10px] font-bold text-gray-400">
              {STYLE_CATEGORIES.map(c => <button key={c} onClick={() => setFilter(c)} className={filter === c ? 'text-black border-b border-black' : ''}>{c}</button>)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {products.filter(i => filter === '全部' || i.category === filter).map(item => (
                <div key={item.id} className="bg-white p-6 border group hover:shadow-lg transition-all">
                  <div className="aspect-[3/4] overflow-hidden mb-6 relative">
                    <img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    {isLoggedIn && <button onClick={() => deleteDoc(doc(db, 'products', item.id))} className="absolute top-2 right-2 p-2 bg-white/80 text-red-500 rounded-full"><Trash2 size={14}/></button>}
                  </div>
                  <h3 className="text-sm tracking-widest mb-2">{item.title}</h3>
                  <div className="font-bold mb-6">NT$ {item.price} <span className="text-[10px] text-gray-400 font-normal">/ {item.duration}min</span></div>
                  <button onClick={() => {setSelectedProduct(item); setBookingStep('form'); window.scrollTo(0,0);}} className="w-full py-3 bg-black text-white text-[10px] tracking-widest">預約款式</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 管理員登入彈窗 */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center">
          <div className="bg-white p-10 w-80 text-center">
            <h3 className="text-xs font-bold mb-6">ADMIN</h3>
            <input type="password" placeholder="••••" className="w-full border-b py-2 text-center outline-none" onChange={e => setPassword(e.target.value)} />
            <button onClick={() => {if(password==="8888") {setIsLoggedIn(true); setShowAdminLogin(false);} else alert("錯誤");}} className="w-full bg-black text-white py-3 mt-6 text-xs">登入</button>
            <button onClick={() => setShowAdminLogin(false)} className="mt-4 text-[10px] text-gray-400">取消</button>
          </div>
        </div>
      )}

      {/* 管理後台 */}
      {showManager && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 w-full max-w-4xl h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8 border-b pb-4">
              <h3 className="text-sm font-bold uppercase">系統管理後台</h3>
              <button onClick={() => setShowManager(false)}><X/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* 左側：核心設定 */}
              <div className="space-y-8">
                <section className="bg-gray-50 p-4 border">
                  <h4 className="text-[10px] font-bold mb-4 flex items-center gap-2"><Settings size={14}/> 全局設定</h4>
                  <div className="space-y-4 text-xs">
                    <div className="flex justify-between items-center">
                      <span>同時段預約上限 (人數):</span>
                      <input type="number" className="w-16 border-b text-center bg-transparent" value={config.maxCapacity} onChange={e => updateDoc(doc(db, 'config', 'global'), {maxCapacity: Number(e.target.value)})} />
                    </div>
                  </div>
                </section>

                <section className="bg-gray-50 p-4 border">
                  <h4 className="text-[10px] font-bold mb-4 flex items-center gap-2"><Calendar size={14}/> 店休日期 (預約關閉)</h4>
                  <div className="flex gap-2 mb-4">
                    <input type="date" id="closeDateInput" className="text-xs flex-1 border-b bg-transparent" />
                    <button onClick={() => {
                      const val = document.getElementById('closeDateInput').value;
                      if(val) updateDoc(doc(db, 'config', 'global'), {closedDates: [...(config.closedDates || []), val]});
                    }} className="bg-black text-white px-3 py-1 text-[10px]">新增禁領</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {config.closedDates?.map(d => (
                      <span key={d} className="bg-red-50 text-red-500 px-2 py-1 text-[10px] flex items-center gap-1 border border-red-100">
                        {d} <X size={10} className="cursor-pointer" onClick={() => updateDoc(doc(db, 'config', 'global'), {closedDates: config.closedDates.filter(cd => cd !== d)})} />
                      </span>
                    ))}
                  </div>
                </section>

                <section className="bg-gray-50 p-4 border">
                  <h4 className="text-[10px] font-bold mb-4 flex items-center gap-2"><MapPin size={14}/> 門市管理</h4>
                  <div className="flex gap-2 mb-4">
                    <input id="storeIn" placeholder="新門市名稱" className="text-xs flex-1 border-b bg-transparent" />
                    <button onClick={() => {
                      const el = document.getElementById('storeIn');
                      if(el.value) addDoc(collection(db, 'stores'), {name: el.value});
                      el.value = '';
                    }} className="bg-black text-white px-3 py-1 text-[10px]">新增</button>
                  </div>
                  {stores.map(s => <div key={s.id} className="flex justify-between text-xs py-2 border-b"><span>{s.name}</span><Trash2 size={12} className="text-gray-300 hover:text-red-500 cursor-pointer" onClick={() => deleteDoc(doc(db, 'stores', s.id))} /></div>)}
                </section>

                <section className="bg-gray-50 p-4 border">
                  <h4 className="text-[10px] font-bold mb-4 flex items-center gap-2"><Coffee size={14}/> 加購項目管理</h4>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input id="addonT" placeholder="名稱" className="text-xs flex-1 border-b bg-transparent" />
                      <input id="addonP" placeholder="價格" className="text-xs w-16 border-b bg-transparent" />
                      <button onClick={() => {
                        const t = document.getElementById('addonT');
                        const p = document.getElementById('addonP');
                        if(t.value) addDoc(collection(db, 'addons'), {title: t.value, price: Number(p.value)});
                        t.value = ''; p.value = '';
                      }} className="bg-black text-white px-3 py-1 text-[10px]">新增</button>
                    </div>
                    {addons.map(a => <div key={a.id} className="flex justify-between text-xs py-2 border-b text-gray-400"><span>{a.title} (+${a.price})</span><Trash2 size={12} className="cursor-pointer" onClick={() => deleteDoc(doc(db, 'addons', a.id))} /></div>)}
                  </div>
                </section>

                <button onClick={() => setShowUpload(true)} className="w-full bg-[#C29591] text-white py-4 text-xs tracking-widest flex items-center justify-center gap-2"><Upload size={16}/> 發佈新款式</button>
              </div>

              {/* 右側：預約名單 */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-[#C29591] uppercase tracking-widest">預約清單</h4>
                {bookings.map(b => (
                  <div key={b.id} className="p-4 border bg-[#FAF9F6] relative group">
                    <div className="text-[10px] font-bold text-gray-400 mb-1">{b.date} {b.time}</div>
                    <div className="text-sm font-bold">{b.name} <span className="text-xs font-normal">({b.phone})</span></div>
                    <div className="text-[10px] text-gray-500 mt-2">款式：{b.productTitle} | 加購：{b.addons?.join(', ') || '無'}</div>
                    <div className="text-[10px] mt-1 font-bold">總金額：NT$ {b.totalPrice}</div>
                    <button onClick={() => deleteDoc(doc(db, 'bookings', b.id))} className="absolute top-4 right-4 text-red-200 group-hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 上傳款式彈窗 */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4">
          <div className="bg-white p-8 w-full max-w-md">
            <h3 className="text-sm font-bold mb-8">發佈新作品</h3>
            <div className="space-y-6">
              <input placeholder="款式名稱" className="w-full border-b text-xs p-3 outline-none" id="upTitle" />
              <div className="flex gap-4">
                <input placeholder="價格" className="flex-1 border-b text-xs p-3 outline-none" id="upPrice" />
                <input placeholder="工時 (分鐘)" className="w-24 border-b text-xs p-3 outline-none" id="upDuration" defaultValue="90" />
              </div>
              <select className="w-full border-b text-xs p-3 outline-none" id="upCat">
                {STYLE_CATEGORIES.filter(c => c !== '全部').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="space-y-2">
                <label className="text-[10px] font-bold">圖片選取</label>
                <input type="file" id="upImg" className="text-[10px]" />
              </div>
              <button onClick={async () => {
                const t = document.getElementById('upTitle').value;
                const p = document.getElementById('upPrice').value;
                const d = document.getElementById('upDuration').value;
                const c = document.getElementById('upCat').value;
                const f = document.getElementById('upImg').files[0];
                if(!f || !t) return alert("請完整填寫");
                
                const reader = new FileReader();
                reader.onload = async () => {
                  await addDoc(collection(db, 'products'), {
                    title: t, price: Number(p), duration: Number(d), category: c, image: reader.result, createdAt: serverTimestamp()
                  });
                  setShowUpload(false);
                };
                reader.readAsDataURL(f);
              }} className="w-full bg-black text-white py-4 text-xs tracking-widest">發佈</button>
              <button onClick={() => setShowUpload(false)} className="w-full text-xs text-gray-400">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}