import React, { useState, useEffect } from 'react';
import { Plus, X, Lock, Trash2, Clock, CheckCircle, List, Upload, MapPin, ChevronRight } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

// --- 1. Firebase 初始化 (使用您的專案配置) ---
const firebaseConfig = {
  apiKey: "AIzaSyBkFqTUwtC7MqZ6h4--2_1BmldXEg-Haiw",
  authDomain: "uniwawa-beauty.firebaseapp.com",
  projectId: "uniwawa-beauty",
  appId: "1:1009617609234:web:3cb5466e79a81c1f1aaecb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 常數定義
const STYLE_CATEGORIES = ['全部', '極簡氣質', '華麗鑽飾', '藝術手繪', '日系暈染', '貓眼系列'];
const TIME_SLOTS = ["12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

export default function App() {
  // 基礎狀態
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // 資料庫數據 (初始化為空陣列防止崩潰)
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [config, setConfig] = useState({ maxCapacity: 1 });

  // 預約暫存
  const [bookingStep, setBookingStep] = useState('none');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [tempBooking, setTempBooking] = useState({ name: '', phone: '', date: '', time: '' });

  // 彈窗控制
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  // 表單暫存
  const [newProduct, setNewProduct] = useState({ title: '', price: '', category: '極簡氣質', image: '' });
  const [password, setPassword] = useState('');
  const [filter, setFilter] = useState('全部');

  // --- 2. 資料監聽核心 ---
  useEffect(() => {
    signInAnonymously(auth);
    onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  useEffect(() => {
    if (!user) return;

    // 監聽商品 (對應雲端集合: products)
    const unsubP = onSnapshot(query(collection(db, 'products'), orderBy('createdAt', 'desc')), (s) => {
      setProducts(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 監聽門市 (對應雲端集合: stores)
    const unsubS = onSnapshot(collection(db, 'stores'), (s) => {
      setStores(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 監聽預約 (對應雲端集合: bookings)
    const unsubB = onSnapshot(query(collection(db, 'bookings'), orderBy('createdAt', 'desc')), (s) => {
      setBookings(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 監聽設定 (對應雲端文件: config/global)
    const unsubC = onSnapshot(doc(db, 'config', 'global'), (d) => {
      if (d.exists()) setConfig(d.data());
    });

    return () => { unsubP(); unsubS(); unsubB(); unsubC(); };
  }, [user]);

  // --- 3. 邏輯處理 ---
  const isTimeAvailable = (date, time) => {
    if (!date || !time || !selectedStoreId) return true;
    const count = bookings.filter(b => b.date === date && b.time === time && b.storeId === selectedStoreId).length;
    return count < (config.maxCapacity || 1);
  };

  const submitBooking = async () => {
    if (!tempBooking.name || !tempBooking.phone || !tempBooking.date || !tempBooking.time || !selectedStoreId) {
      alert("資料填寫不完整"); return;
    }
    try {
      await addDoc(collection(db, 'bookings'), {
        ...tempBooking,
        storeId: selectedStoreId,
        storeName: stores.find(s => s.id === selectedStoreId)?.name || '',
        productTitle: selectedProduct?.title || '未選款式',
        createdAt: serverTimestamp()
      });
      setBookingStep('success');
    } catch (e) { alert("儲存失敗"); }
  };

  // --- 4. 畫面渲染 ---
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555] font-sans selection:bg-[#C29591] selection:text-white">
      {/* 導覽列 */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-[#EAE7E2] px-6 py-4 flex justify-between items-center">
        <div className="text-xl tracking-[0.4em] font-light cursor-pointer" onClick={() => {setActiveTab('home'); setBookingStep('none');}}>UNIWAWA</div>
        <div className="flex items-center gap-6 text-[10px] tracking-[0.2em] font-bold uppercase">
          <button onClick={() => {setActiveTab('home'); setBookingStep('none');}} className={activeTab === 'home' ? 'text-[#C29591]' : ''}>Home</button>
          <button onClick={() => {setActiveTab('catalog'); setBookingStep('none');}} className={activeTab === 'catalog' ? 'text-[#C29591]' : ''}>Styles</button>
          {isLoggedIn ? (
            <button onClick={() => setShowManager(true)} className="bg-[#463E3E] text-white p-2 px-3 rounded-full flex items-center gap-1"><List size={14}/> Admin</button>
          ) : (
            <button onClick={() => setShowAdminLogin(true)}><Lock size={14} className="text-gray-300"/></button>
          )}
        </div>
      </nav>

      <main className="pt-24 pb-20 max-w-7xl mx-auto px-6">
        {bookingStep === 'success' ? (
          <div className="max-w-md mx-auto text-center py-20 space-y-6">
            <CheckCircle size={60} className="mx-auto text-green-500 stroke-1" />
            <h2 className="text-2xl font-light tracking-widest">預約成功</h2>
            <p className="text-gray-400 text-sm">我們已收到您的申請，期待您的光臨。</p>
            <button onClick={() => {setBookingStep('none'); setActiveTab('home');}} className="border border-black px-10 py-3 text-xs tracking-widest hover:bg-black hover:text-white transition-all">返回首頁</button>
          </div>
        ) : bookingStep === 'form' ? (
          <div className="max-w-xl mx-auto bg-white border border-[#EAE7E2] p-10 shadow-sm space-y-8">
            <h2 className="text-center text-xl font-light tracking-[0.3em]">RESERVATION</h2>
            
            <div className="space-y-4">
              <label className="text-[10px] text-gray-400 tracking-widest uppercase font-bold">Step 1: 選擇門市</label>
              <div className="grid grid-cols-2 gap-3">
                {stores.map(s => (
                  <button key={s.id} onClick={() => setSelectedStoreId(s.id)} className={`py-3 text-xs border transition-all ${selectedStoreId === s.id ? 'bg-[#463E3E] text-white border-[#463E3E]' : 'bg-white text-gray-400 border-[#EAE7E2]'}`}>{s.name}</button>
                ))}
                {stores.length === 0 && <p className="col-span-2 text-center text-xs text-red-300 italic">請先聯絡管理員新增門市</p>}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] text-gray-400 tracking-widest uppercase font-bold">Step 2: 選擇日期與時間</label>
              <input type="date" className="w-full border-b border-[#EAE7E2] p-2 outline-none" onChange={e => setTempBooking({...tempBooking, date: e.target.value})} />
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {TIME_SLOTS.map(t => {
                  const avail = isTimeAvailable(tempBooking.date, t);
                  return (
                    <button key={t} disabled={!avail} onClick={() => setTempBooking({...tempBooking, time: t})} className={`py-2 text-[10px] border transition-all ${tempBooking.time === t ? 'bg-[#463E3E] text-white' : avail ? 'bg-white text-gray-400 hover:border-[#C29591]' : 'bg-gray-50 text-gray-200 cursor-not-allowed'}`}>
                      {avail ? t : '滿'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] text-gray-400 tracking-widest uppercase font-bold">Step 3: 聯絡資訊</label>
              <input placeholder="姓名 (Full Name)" className="w-full border-b border-[#EAE7E2] p-2 outline-none" onChange={e => setTempBooking({...tempBooking, name: e.target.value})} />
              <input placeholder="電話 (Phone Number)" className="w-full border-b border-[#EAE7E2] p-2 outline-none" onChange={e => setTempBooking({...tempBooking, phone: e.target.value})} />
            </div>

            <button onClick={submitBooking} className="w-full bg-[#463E3E] text-white py-4 text-xs tracking-[0.3em] uppercase hover:bg-black transition-all shadow-lg">確認預約</button>
          </div>
        ) : activeTab === 'home' ? (
          <div className="flex flex-col items-center py-10">
            <img src="https://drive.google.com/thumbnail?id=1ZJv3DS8ST_olFt0xzKB_miK9UKT28wMO&sz=w1200" className="max-w-full md:max-w-2xl shadow-2xl rounded-sm mb-16" alt="Hero" />
            <h2 className="text-4xl font-extralight tracking-[0.5em] mb-12 text-[#463E3E]">Beyond Expectation</h2>
            <button onClick={() => setActiveTab('catalog')} className="bg-[#463E3E] text-white px-16 py-4 text-xs tracking-[0.4em] uppercase hover:bg-black transition-all">View Styles</button>
          </div>
        ) : (
          <div className="space-y-12">
            <div className="flex justify-center flex-wrap gap-6 text-[10px] tracking-[0.2em] font-bold text-gray-400 uppercase">
              {STYLE_CATEGORIES.map(c => <button key={c} onClick={() => setFilter(c)} className={filter === c ? 'text-[#463E3E] border-b border-[#463E3E] pb-1' : ''}>{c}</button>)}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              {products.filter(i => filter === '全部' || i.category === filter).map(item => (
                <div key={item.id} className="group bg-white border border-[#F0EDEA] p-6 text-center hover:shadow-xl transition-all duration-500">
                  <div className="aspect-[3/4] overflow-hidden mb-6 relative">
                    <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={item.title} />
                    {isLoggedIn && (
                      <button onClick={() => deleteDoc(doc(db, 'products', item.id))} className="absolute top-3 right-3 p-2 bg-white/90 text-red-500 rounded-full shadow-md hover:bg-red-500 hover:text-white transition-all"><Trash2 size={14}/></button>
                    )}
                  </div>
                  <span className="text-[9px] text-[#C29591] tracking-[0.3em] uppercase font-bold">{item.category}</span>
                  <h3 className="text-lg tracking-widest my-3 font-light">{item.title}</h3>
                  <div className="text-xl font-serif mb-8 text-[#463E3E]">NT$ {item.price?.toLocaleString()}</div>
                  <button onClick={() => {setSelectedProduct(item); setBookingStep('form'); window.scrollTo(0,0);}} className="w-full py-4 border border-[#463E3E] text-[10px] tracking-widest uppercase hover:bg-[#463E3E] hover:text-white transition-all">Reservation</button>
                </div>
              ))}
            </div>
            {products.length === 0 && <div className="text-center py-20 text-gray-300 tracking-widest italic font-light">目前尚無款式發佈</div>}
          </div>
        )}
      </main>

      {/* --- 後台管理 Modals --- */}
      
      {/* 登入 */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white p-10 w-80 text-center shadow-2xl">
            <h3 className="text-xs tracking-[0.4em] text-gray-400 mb-8 font-bold">ADMIN LOGIN</h3>
            <input type="password" placeholder="••••" className="w-full border-b border-[#EAE7E2] py-3 text-center tracking-[1em] outline-none focus:border-black" onChange={e => setPassword(e.target.value)} />
            <button onClick={() => {if(password==="8888") {setIsLoggedIn(true); setShowAdminLogin(false);} else alert("密碼錯誤");}} className="w-full bg-[#463E3E] text-white py-4 mt-8 text-xs tracking-widest uppercase hover:bg-black">Login</button>
            <button onClick={() => setShowAdminLogin(false)} className="mt-6 text-[10px] text-gray-300 uppercase tracking-widest">Cancel</button>
          </div>
        </div>
      )}

      {/* 管理面板 */}
      {showManager && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl rounded-sm">
            <div className="flex justify-between items-center mb-10 border-b pb-6">
              <h3 className="text-sm tracking-[0.4em] font-bold uppercase text-[#463E3E]">Management Panel</h3>
              <button onClick={() => setShowManager(false)} className="text-gray-400 hover:text-black"><X/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* 左欄：設定與門市 */}
              <div className="space-y-10">
                <section>
                  <h4 className="text-[10px] font-bold tracking-widest text-[#C29591] mb-6 uppercase">系統設定 (System)</h4>
                  <div className="flex items-center gap-4 bg-[#FAF9F6] p-4 border border-[#EAE7E2]">
                    <span className="text-xs">同時段人數上限:</span>
                    <input type="number" className="w-16 border-b border-black text-center bg-transparent font-bold" value={config.maxCapacity} onChange={e => updateDoc(doc(db, 'config', 'global'), {maxCapacity: Number(e.target.value)})} />
                  </div>
                </section>

                <section>
                  <h4 className="text-[10px] font-bold tracking-widest text-[#C29591] mb-6 uppercase">門市管理 (Stores)</h4>
                  <div className="flex gap-2 mb-6">
                    <input id="storeName" placeholder="門市名稱 (如：桃園店)" className="border-b border-[#EAE7E2] text-xs flex-1 py-2 outline-none" />
                    <button onClick={async () => {
                      const el = document.getElementById('storeName');
                      if(el.value) { await addDoc(collection(db, 'stores'), {name: el.value}); el.value = ''; }
                    }} className="bg-[#463E3E] text-white px-6 py-2 text-[10px] uppercase">Add</button>
                  </div>
                  <div className="space-y-2">
                    {stores.map(s => (
                      <div key={s.id} className="flex justify-between items-center bg-[#FAF9F6] p-3 text-xs border border-[#EAE7E2]">
                        <span>{s.name}</span>
                        <button onClick={() => deleteDoc(doc(db, 'stores', s.id))} className="text-red-300 hover:text-red-500"><Trash2 size={14}/></button>
                      </div>
                    ))}
                  </div>
                </section>

                <button onClick={() => setShowUpload(true)} className="w-full bg-[#C29591] text-white py-4 text-xs tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-[#b07d78] shadow-md"><Upload size={16}/> 發佈新作品</button>
              </div>

              {/* 右欄：預約清單 */}
              <section>
                <h4 className="text-[10px] font-bold tracking-widest text-[#C29591] mb-6 uppercase">預約訂單 (Bookings)</h4>
                <div className="space-y-4">
                  {bookings.map(b => (
                    <div key={b.id} className="border border-[#EAE7E2] p-4 bg-[#FAF9F6] relative group">
                      <div className="text-[10px] text-[#C29591] font-bold mb-1">{b.date} {b.time}</div>
                      <div className="text-sm font-bold text-[#463E3E]">{b.name} <span className="text-xs font-normal text-gray-400">({b.phone})</span></div>
                      <div className="text-[10px] text-gray-500 mt-2 uppercase tracking-tighter">{b.storeName} | {b.productTitle}</div>
                      <button onClick={() => deleteDoc(doc(db, 'bookings', b.id))} className="absolute top-4 right-4 text-red-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                    </div>
                  ))}
                  {bookings.length === 0 && <p className="text-center py-10 text-xs text-gray-300 italic">目前尚無預約</p>}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* 上傳款式 */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4">
          <div className="bg-white p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-sm font-bold tracking-widest mb-8 border-b pb-4">NEW COLLECTION</h3>
            <div className="space-y-6">
              <input placeholder="款式名稱 (Title)" className="w-full border-b border-[#EAE7E2] text-xs p-3 outline-none" onChange={e => setNewProduct({...newProduct, title: e.target.value})} />
              <input placeholder="價格 (Price NT$)" type="number" className="w-full border-b border-[#EAE7E2] text-xs p-3 outline-none" onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
              <select className="w-full border-b border-[#EAE7E2] text-xs p-3 outline-none bg-transparent" onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                {STYLE_CATEGORIES.filter(c => c !== '全部').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 uppercase font-bold">款式圖片 (Image)</label>
                <input type="file" className="text-[10px]" onChange={e => {
                  const reader = new FileReader();
                  reader.onload = () => setNewProduct({...newProduct, image: reader.result});
                  reader.readAsDataURL(e.target.files[0]);
                }} />
              </div>
              <button onClick={async () => {
                if(!newProduct.image || !newProduct.title) return alert("請填寫標題並上傳圖片");
                await addDoc(collection(db, 'products'), {...newProduct, price: Number(newProduct.price), createdAt: serverTimestamp()});
                setShowUpload(false);
              }} className="w-full bg-black text-white py-4 text-xs tracking-widest uppercase">Publish</button>
              <button onClick={() => setShowUpload(false)} className="w-full text-xs text-gray-400">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}