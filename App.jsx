import React, { useState, useEffect } from 'react';
import { Plus, X, Lock, Trash2, Clock, CheckCircle, List, Upload, Settings, Calendar, Coffee, ChevronRight, ChevronLeft } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, query, orderBy, setDoc } from 'firebase/firestore';

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

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // 資料庫數據
  const [products, setProducts] = useState([]);
  const [addons, setAddons] = useState([]);
  const [stores, setStores] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [config, setConfig] = useState({ maxCapacity: 1, closedDates: [] });

  // 預約流程狀態
  const [bookingStep, setBookingStep] = useState('none'); // none -> details -> form -> success
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [tempBooking, setTempBooking] = useState({ name: '', phone: '', date: '', time: '' });

  // UI 狀態
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [password, setPassword] = useState('');
  const [filter, setFilter] = useState('全部');

  // --- 1. 資料監聽 ---
  useEffect(() => {
    signInAnonymously(auth);
    onAuthStateChanged(auth, u => setUser(u));
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubP = onSnapshot(collection(db, 'products'), s => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubA = onSnapshot(collection(db, 'addons'), s => setAddons(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubS = onSnapshot(collection(db, 'stores'), s => setStores(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubB = onSnapshot(collection(db, 'bookings'), s => setBookings(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubC = onSnapshot(doc(db, 'config', 'global'), d => {
      if (d.exists()) setConfig(d.data());
      else setDoc(doc(db, 'config', 'global'), { maxCapacity: 1, closedDates: [] });
    });
    return () => { unsubP(); unsubA(); unsubS(); unsubB(); unsubC(); };
  }, [user]);

  // --- 2. 預約佔用邏輯 ---
  const isTimeAvailable = (date, time) => {
    if (!date || !time || !selectedStoreId) return true;
    
    // 24小時限制與店休檢查
    const now = new Date();
    const target = new Date(`${date} ${time}`);
    if (target - now < 24 * 60 * 60 * 1000) return false;
    if (config.closedDates?.includes(date)) return false;

    const [checkH, checkM] = time.split(':').map(Number);
    const checkTotalMin = checkH * 60 + checkM;
    
    const dayBookings = bookings.filter(b => b.date === date && b.storeId === selectedStoreId);
    let occupied = 0;

    dayBookings.forEach(b => {
      const [bH, bM] = b.time.split(':').map(Number);
      const bStartMin = bH * 60 + bM;
      const bDurationTotal = (Number(b.duration) || 90) + 20; // 服務時間 + 20分清潔
      const bEndMin = bStartMin + bDurationTotal;

      if (checkTotalMin >= bStartMin && checkTotalMin < bEndMin) {
        occupied++;
      }
    });

    return occupied < (config.maxCapacity || 1);
  };

  // --- 3. 提交預約 ---
  const handleBookingSubmit = async () => {
    if (!tempBooking.name || !tempBooking.phone || !tempBooking.date || !tempBooking.time || !selectedStoreId) {
      alert("請填寫完整預約資料"); return;
    }
    const addonPrice = selectedAddons.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
    
    await addDoc(collection(db, 'bookings'), {
      ...tempBooking,
      storeId: selectedStoreId,
      storeName: stores.find(s => s.id === selectedStoreId)?.name || '',
      productId: selectedProduct.id,
      productTitle: selectedProduct.title,
      duration: selectedProduct.duration || 90,
      addons: selectedAddons.map(a => a.title),
      totalPrice: (Number(selectedProduct.price) || 0) + addonPrice,
      createdAt: serverTimestamp()
    });
    setBookingStep('success');
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555] font-sans">
      {/* 導覽列 */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b p-4 flex justify-between items-center px-6">
        <h1 className="text-xl tracking-[0.3em] font-light cursor-pointer" onClick={() => {setActiveTab('home'); setBookingStep('none');}}>UNIWAWA</h1>
        <div className="flex gap-6 text-[10px] font-bold uppercase tracking-widest">
          <button onClick={() => {setActiveTab('home'); setBookingStep('none');}} className={activeTab === 'home' ? 'text-[#C29591]' : ''}>Home</button>
          <button onClick={() => {setActiveTab('catalog'); setBookingStep('none');}} className={activeTab === 'catalog' ? 'text-[#C29591]' : ''}>Styles</button>
          {isLoggedIn ? (
            <button onClick={() => setShowManager(true)} className="text-[#C29591]"><Settings size={18}/></button>
          ) : (
            <button onClick={() => setShowAdminLogin(true)} className="text-gray-300 hover:text-gray-500"><Lock size={14}/></button>
          )}
        </div>
      </nav>

      <main className="pt-24 pb-20 px-6 max-w-7xl mx-auto">
        {bookingStep === 'success' ? (
          <div className="text-center py-20 space-y-6 animate-in fade-in zoom-in duration-500">
            <CheckCircle size={60} className="mx-auto text-green-500 stroke-1" />
            <h2 className="text-2xl font-light tracking-[0.2em]">預約已送出</h2>
            <p className="text-gray-400 text-sm">我們會盡快核對您的預約資訊。</p>
            <button onClick={() => {setBookingStep('none'); setActiveTab('home');}} className="border border-black px-12 py-3 text-xs tracking-widest uppercase hover:bg-black hover:text-white transition-all">返回首頁</button>
          </div>
        ) : bookingStep === 'details' ? (
          /* 作品詳情頁：包含加購選項與服務時間 */
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 animate-in slide-in-from-bottom-8 duration-500">
            <div className="relative group">
              <img src={selectedProduct?.image} className="w-full aspect-[3/4] object-cover shadow-2xl rounded-sm" />
            </div>
            
            <div className="flex flex-col justify-between py-2">
              <div className="space-y-8">
                <header>
                  <span className="text-[10px] text-[#C29591] font-bold tracking-[0.2em] uppercase">{selectedProduct?.category}</span>
                  <h2 className="text-3xl font-light tracking-[0.1em] mt-2 mb-4">{selectedProduct?.title}</h2>
                  <div className="flex items-center gap-6 text-sm text-gray-500 border-y py-4">
                    <span className="flex items-center gap-2"><Clock size={16} className="text-[#C29591]"/> 服務工時：{selectedProduct?.duration} 分鐘</span>
                    <span className="text-black font-bold text-lg">NT$ {selectedProduct?.price}</span>
                  </div>
                </header>

                <section className="space-y-4">
                  <h4 className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">加購服務 (Optional Add-ons)</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {addons.length > 0 ? addons.map(a => (
                      <button 
                        key={a.id} 
                        onClick={() => {
                          if(selectedAddons.find(sa => sa.id === a.id)) setSelectedAddons(selectedAddons.filter(sa => sa.id !== a.id));
                          else setSelectedAddons([...selectedAddons, a]);
                        }} 
                        className={`flex justify-between items-center p-4 border text-xs transition-all ${selectedAddons.find(sa => sa.id === a.id) ? 'bg-[#463E3E] text-white border-[#463E3E]' : 'bg-white hover:border-gray-400'}`}
                      >
                        <span className="tracking-widest">{a.title}</span>
                        <span className="font-bold">+ NT$ {a.price}</span>
                      </button>
                    )) : (
                      <p className="text-xs text-gray-300 italic py-4">目前沒有可用的加購項目</p>
                    )}
                  </div>
                </section>
              </div>

              <div className="mt-12 pt-6 border-t flex items-center justify-between">
                <div>
                  <p className="text-[9px] text-gray-400 uppercase tracking-widest">Estimated Total</p>
                  <p className="text-2xl font-bold">NT$ {(Number(selectedProduct?.price) || 0) + selectedAddons.reduce((sum, a) => sum + (Number(a.price) || 0), 0)}</p>
                </div>
                <button onClick={() => setBookingStep('form')} className="bg-[#463E3E] text-white px-10 py-4 text-xs tracking-widest uppercase hover:bg-black flex items-center gap-2 shadow-xl">
                  選擇預約時間 <ChevronRight size={14}/>
                </button>
              </div>
            </div>
          </div>
        ) : bookingStep === 'form' ? (
          /* 預約時段與基本資料頁面 */
          <div className="max-w-xl mx-auto space-y-8 animate-in slide-in-from-right-8 duration-500">
            <button onClick={() => setBookingStep('details')} className="flex items-center gap-2 text-[10px] font-bold text-gray-400 hover:text-black uppercase tracking-widest">
              <ChevronLeft size={16}/> 返回加購選單
            </button>
            
            <div className="bg-white p-8 border border-[#EAE7E2] shadow-sm space-y-10">
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-[#C29591] tracking-widest uppercase">1. 選擇服務門市</label>
                <div className="grid grid-cols-2 gap-2">
                  {stores.map(s => (
                    <button key={s.id} onClick={() => setSelectedStoreId(s.id)} className={`p-4 text-xs border transition-all ${selectedStoreId === s.id ? 'bg-[#463E3E] text-white border-[#463E3E]' : 'bg-white hover:border-gray-300'}`}>{s.name}</button>
                  ))}
                  {stores.length === 0 && <p className="col-span-2 text-xs text-red-300 text-center py-4 italic">請先在後台新增門市</p>}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-[#C29591] tracking-widest uppercase">2. 預約日期與時間 (每10分鐘一檔)</label>
                <input type="date" className="w-full border-b border-[#EAE7E2] p-3 text-sm outline-none focus:border-black" onChange={e => setTempBooking({...tempBooking, date: e.target.value})} />
                
                {config.closedDates?.includes(tempBooking.date) ? (
                  <div className="py-12 text-center text-red-400 text-xs border border-dashed border-red-100 bg-red-50/30">該日期目前不開放預約</div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 max-h-48 overflow-y-auto border p-2 bg-gray-50/50">
                    {TIME_SLOTS.map(t => {
                      const avail = isTimeAvailable(tempBooking.date, t);
                      return (
                        <button key={t} disabled={!avail} onClick={() => setTempBooking({...tempBooking, time: t})} className={`p-2 text-[9px] border transition-all ${tempBooking.time === t ? 'bg-[#463E3E] text-white' : avail ? 'bg-white hover:border-black' : 'bg-gray-50 text-gray-200'}`}>
                          {t}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-4">
                <label className="text-[10px] font-bold text-[#C29591] tracking-widest uppercase">3. 填寫聯繫資料</label>
                <input placeholder="姓名 (Full Name)" className="w-full border-b border-[#EAE7E2] p-3 text-sm outline-none focus:border-black" onChange={e => setTempBooking({...tempBooking, name: e.target.value})} />
                <input placeholder="電話 (Phone Number)" className="w-full border-b border-[#EAE7E2] p-3 text-sm outline-none focus:border-black" onChange={e => setTempBooking({...tempBooking, phone: e.target.value})} />
              </div>

              <button onClick={handleBookingSubmit} className="w-full bg-[#463E3E] text-white py-5 text-xs tracking-[0.4em] uppercase hover:bg-black transition-all shadow-lg">提交預約單</button>
            </div>
          </div>
        ) : activeTab === 'home' ? (
          /* 首頁：品牌大圖 */
          <div className="text-center py-10 space-y-16">
            <div className="relative inline-block">
              <img src="https://drive.google.com/thumbnail?id=1ZJv3DS8ST_olFt0xzKB_miK9UKT28wMO&sz=w1200" className="mx-auto max-w-2xl shadow-2xl rounded-sm" />
              <div className="absolute inset-0 border-[1px] border-white/30 m-4 pointer-events-none"></div>
            </div>
            <div className="space-y-6">
              <h2 className="text-4xl font-extralight tracking-[0.6em] text-[#463E3E]">Beyond Beauty</h2>
              <p className="text-gray-400 tracking-[0.2em] text-[10px] uppercase font-bold">Crafting confidence through artful nails</p>
              <button onClick={() => setActiveTab('catalog')} className="bg-[#463E3E] text-white px-16 py-4 text-xs tracking-[0.4em] uppercase hover:bg-black transition-all shadow-xl">瀏覽款式目錄</button>
            </div>
          </div>
        ) : (
          /* 作品列表頁 */
          <div className="space-y-12">
            <div className="flex justify-center gap-8 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b pb-4">
              {STYLE_CATEGORIES.map(c => (
                <button key={c} onClick={() => setFilter(c)} className={filter === c ? 'text-black border-b-2 border-black pb-4' : 'pb-4 transition-colors hover:text-gray-600'}>{c}</button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              {products.filter(i => filter === '全部' || i.category === filter).map(item => (
                <div key={item.id} className="group cursor-pointer" onClick={() => {setSelectedProduct(item); setSelectedAddons([]); setBookingStep('details'); window.scrollTo(0,0);}}>
                  <div className="aspect-[3/4] overflow-hidden mb-6 relative shadow-sm bg-gray-100">
                    <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="border border-white text-white px-8 py-3 text-[10px] tracking-widest uppercase backdrop-blur-sm">View Details</div>
                    </div>
                    {isLoggedIn && (
                      <button onClick={(e) => {e.stopPropagation(); deleteDoc(doc(db, 'products', item.id));}} className="absolute top-4 right-4 p-2 bg-white/90 text-red-500 rounded-full shadow-lg hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button>
                    )}
                  </div>
                  <div className="text-center space-y-2">
                    <span className="text-[9px] text-[#C29591] font-bold tracking-[0.2em] uppercase">{item.category}</span>
                    <h3 className="text-sm tracking-widest font-light">{item.title}</h3>
                    <div className="text-xs font-bold text-[#463E3E]">NT$ {item.price}</div>
                  </div>
                </div>
              ))}
            </div>
            {products.length === 0 && <div className="text-center py-20 text-gray-300 italic tracking-widest">目前暫無款式上架</div>}
          </div>
        )}
      </main>

      {/* --- 後台管理 Modals --- */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white p-12 w-80 text-center shadow-2xl">
            <h3 className="text-[10px] font-bold tracking-[0.4em] mb-10 uppercase text-gray-400">Admin Login</h3>
            <input type="password" placeholder="••••" className="w-full border-b border-[#EAE7E2] py-3 text-center tracking-[1em] outline-none focus:border-black" onChange={e => setPassword(e.target.value)} />
            <button onClick={() => {if(password==="8888") {setIsLoggedIn(true); setShowAdminLogin(false);} else alert("密碼錯誤");}} className="w-full bg-[#463E3E] text-white py-4 mt-10 text-xs tracking-widest uppercase hover:bg-black shadow-lg">進入後台</button>
            <button onClick={() => setShowAdminLogin(false)} className="mt-6 text-[10px] text-gray-300 uppercase tracking-widest">Cancel</button>
          </div>
        </div>
      )}

      {showManager && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white p-8 w-full max-w-6xl h-[90vh] overflow-y-auto rounded-sm shadow-2xl">
            <div className="flex justify-between items-center mb-10 border-b pb-6">
              <h3 className="text-xs font-bold tracking-[0.3em] uppercase flex items-center gap-2"><Settings size={16}/> Management Console</h3>
              <button onClick={() => setShowManager(false)} className="hover:rotate-90 transition-transform"><X/></button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* 第一欄：系統設定與門市 */}
              <div className="space-y-10">
                <section className="bg-[#FAF9F6] p-6 border border-[#EAE7E2]">
                  <h4 className="text-[10px] font-bold text-[#C29591] tracking-widest uppercase mb-4">系統全局設定</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <span>同時段預約上限 (人):</span>
                      <input type="number" className="w-12 border-b border-black text-center bg-transparent font-bold" value={config.maxCapacity} onChange={e => updateDoc(doc(db, 'config', 'global'), {maxCapacity: Number(e.target.value)})} />
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h4 className="text-[10px] font-bold text-[#C29591] tracking-widest uppercase flex items-center gap-2"><Calendar size={14}/> 店休日期管理</h4>
                  <div className="flex gap-2">
                    <input type="date" id="c_date" className="flex-1 bg-white border border-[#EAE7E2] text-xs p-2 outline-none" />
                    <button onClick={() => {
                      const d = document.getElementById('c_date').value;
                      if(d) updateDoc(doc(db, 'config', 'global'), { closedDates: [...(config.closedDates || []), d] });
                    }} className="bg-red-500 text-white px-4 text-[10px]">新增</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {config.closedDates?.map(d => (
                      <span key={d} className="bg-red-50 text-red-500 border border-red-100 px-2 py-1 text-[10px] flex items-center gap-1">
                        {d} <X size={10} className="cursor-pointer" onClick={() => updateDoc(doc(db, 'config', 'global'), { closedDates: config.closedDates.filter(cd => cd !== d) })} />
                      </span>
                    ))}
                  </div>
                </section>

                <section className="space-y-4">
                  <h4 className="text-[10px] font-bold text-[#C29591] tracking-widest uppercase">服務門市設定</h4>
                  <div className="flex gap-2">
                    <input id="s_new" className="flex-1 border-b text-xs p-2" placeholder="新門市名稱" />
                    <button onClick={() => {const v = document.getElementById('s_new').value; if(v){addDoc(collection(db, 'stores'), {name: v}); document.getElementById('s_new').value='';}}} className="bg-black text-white px-4 text-[10px]">ADD</button>
                  </div>
                  <div className="space-y-2">
                    {stores.map(s => <div key={s.id} className="flex justify-between p-3 border text-xs bg-[#FAF9F6]"><span>{s.name}</span><Trash2 size={12} className="text-red-200 cursor-pointer" onClick={() => deleteDoc(doc(db, 'stores', s.id))} /></div>)}
                  </div>
                </section>
              </div>

              {/* 第二欄：加購項目與上傳 */}
              <div className="space-y-10">
                <section className="space-y-4">
                  <h4 className="text-[10px] font-bold text-[#C29591] tracking-widest uppercase flex items-center gap-2"><Coffee size={14}/> 加購項目清單</h4>
                  <div className="flex gap-2">
                    <input id="an" className="flex-1 border-b text-xs p-2" placeholder="項目名" />
                    <input id="ap" className="w-16 border-b text-xs p-2" placeholder="價格" />
                    <button onClick={() => {
                      const n = document.getElementById('an').value;
                      const p = document.getElementById('ap').value;
                      if(n) { addDoc(collection(db, 'addons'), {title: n, price: Number(p)}); document.getElementById('an').value=''; document.getElementById('ap').value=''; }
                    }} className="bg-black text-white px-4 text-[10px]">ADD</button>
                  </div>
                  <div className="space-y-2">
                    {addons.map(a => <div key={a.id} className="flex justify-between p-3 border text-xs text-gray-400 italic"><span>{a.title} (+{a.price})</span><Trash2 size={12} className="cursor-pointer hover:text-red-500" onClick={() => deleteDoc(doc(db, 'addons', a.id))} /></div>)}
                  </div>
                </section>

                <button onClick={() => setShowUpload(true)} className="w-full bg-[#C29591] text-white py-5 text-xs tracking-widest uppercase shadow-xl flex items-center justify-center gap-2 hover:bg-[#b5837e]"><Upload size={16}/> 發佈新款式作品</button>
              </div>

              {/* 第三欄：預約名單 */}
              <div className="space-y-6">
                <h4 className="text-[10px] font-bold text-[#C29591] tracking-widest uppercase">最新預約紀錄</h4>
                <div className="space-y-4">
                  {bookings.sort((a,b) => b.createdAt - a.createdAt).map(b => (
                    <div key={b.id} className="p-5 border border-[#EAE7E2] bg-[#FAF9F6] relative group text-xs animate-in fade-in duration-300">
                      <div className="font-bold flex items-center gap-2 text-[#463E3E]"><Calendar size={12}/> {b.date} {b.time}</div>
                      <div className="text-[10px] uppercase tracking-tighter text-gray-400 mt-1 mb-3">{b.storeName} | {b.productTitle}</div>
                      <div className="space-y-1">
                        <p>客戶：<span className="font-bold">{b.name}</span></p>
                        <p>電話：{b.phone}</p>
                        <p className="text-[10px] text-gray-400 mt-2">加購：{b.addons?.join(', ') || '無'}</p>
                        <p className="text-black font-bold pt-2 border-t">總額：NT$ {b.totalPrice}</p>
                      </div>
                      <button onClick={() => deleteDoc(doc(db, 'bookings', b.id))} className="absolute top-4 right-4 text-red-200 opacity-0 group-hover:opacity-100 transition-all hover:text-red-600"><Trash2 size={16}/></button>
                    </div>
                  ))}
                  {bookings.length === 0 && <p className="text-center py-10 text-xs text-gray-300 italic">目前尚無預約資料</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 款式上傳 Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white p-10 w-full max-w-md shadow-2xl rounded-sm">
            <h3 className="text-xs font-bold tracking-widest uppercase border-b pb-4 mb-8">Publish New Style</h3>
            <div className="space-y-6">
              <input placeholder="Style Title (款式名稱)" className="w-full border-b border-[#EAE7E2] text-xs p-3 outline-none focus:border-black" id="u_t" />
              <div className="flex gap-4">
                <input placeholder="Price (NT$)" className="flex-1 border-b border-[#EAE7E2] text-xs p-3 outline-none focus:border-black" id="u_p" />
                <input placeholder="Duration (工時-分)" className="w-32 border-b border-[#EAE7E2] text-xs p-3 outline-none focus:border-black" id="u_d" defaultValue="90" />
              </div>
              <select className="w-full border-b border-[#EAE7E2] text-xs p-3 bg-transparent outline-none focus:border-black" id="u_c">
                {STYLE_CATEGORIES.filter(c => c !== '全部').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400">款式圖片 (Image File)</label>
                <input type="file" id="u_f" className="text-[10px] w-full" />
              </div>
              <button onClick={() => {
                const t = document.getElementById('u_t').value;
                const p = document.getElementById('u_p').value;
                const d = document.getElementById('u_d').value;
                const c = document.getElementById('u_c').value;
                const f = document.getElementById('u_f').files[0];
                if(!f || !t) return alert("款式標題與圖片為必填");
                const r = new FileReader();
                r.onload = async () => {
                  await addDoc(collection(db, 'products'), { title: t, price: Number(p), duration: Number(d), category: c, image: r.result, createdAt: serverTimestamp() });
                  setShowUpload(false);
                };
                r.readAsDataURL(f);
              }} className="w-full bg-black text-white py-5 text-xs tracking-widest uppercase hover:bg-gray-800 shadow-xl transition-all">確認發佈</button>
              <button onClick={() => setShowUpload(false)} className="w-full text-xs text-gray-400 uppercase tracking-widest">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}