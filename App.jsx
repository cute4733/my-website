import React, { useState, useEffect } from 'react';
import { Plus, X, Lock, Trash2, Clock, CheckCircle, List, Upload, Settings, Calendar, Coffee, ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react';
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

const STYLE_CATEGORIES = ['全部', '極簡氣質', '華麗鑽飾', '藝術手繪', '日系暈染', '貓眼系列'];

// 生成 12:00 - 19:00 每 10 分鐘一個時段
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 12; hour <= 19; hour++) {
    for (let min = 0; min < 60; min += 10) {
      if (hour === 19 && min > 0) break;
      const h = hour.toString().padStart(2, '0');
      const m = min.toString().padStart(2, '0');
      slots.push(`${h}:${m}`);
    }
  }
  return slots;
};
const TIME_SLOTS = generateTimeSlots();

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  const [products, setProducts] = useState([]);
  const [addons, setAddons] = useState([]);
  const [stores, setStores] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [config, setConfig] = useState({ maxCapacity: 1, closedDates: [] });

  const [bookingStep, setBookingStep] = useState('none');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [tempBooking, setTempBooking] = useState({ name: '', phone: '', date: '', time: '' });

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
    onSnapshot(doc(db, 'config', 'global'), d => {
      if (d.exists()) setConfig(d.data());
      else setDoc(doc(db, 'config', 'global'), { maxCapacity: 1, closedDates: [] });
    });
  }, [user]);

  // --- 進階時段檢查邏輯 ---
  const isTimeAvailable = (date, time) => {
    if (!date || !time || !selectedStoreId) return true;
    
    // 1. 檢查 24 小時限制
    const now = new Date();
    const target = new Date(`${date} ${time}`);
    if (target - now < 24 * 60 * 60 * 1000) return false;

    // 2. 檢查日期開關 (店休)
    if (config.closedDates?.includes(date)) return false;

    // 3. 檢查同時段人數 (含工時重疊)
    const [checkH, checkM] = time.split(':').map(Number);
    const checkTotalMin = checkH * 60 + checkM;
    
    const dayBookings = bookings.filter(b => b.date === date && b.storeId === selectedStoreId);
    
    let occupied = 0;
    dayBookings.forEach(b => {
      const [bH, bM] = b.time.split(':').map(Number);
      const bStartTotalMin = bH * 60 + bM;
      const bDurationTotal = (parseInt(b.duration) || 90) + 20; // 工時 + 20min 緩衝
      const bEndTotalMin = bStartTotalMin + bDurationTotal;

      // 如果「檢查的時間點」落在該預約的「起始」到「結束」範圍內
      if (checkTotalMin >= bStartTotalMin && checkTotalMin < bEndTotalMin) {
        occupied++;
      }
    });

    return occupied < (config.maxCapacity || 1);
  };

  const handleBooking = async () => {
    if (!tempBooking.name || !tempBooking.phone || !tempBooking.date || !tempBooking.time || !selectedStoreId) return alert("資訊不完整");
    const totalAddonPrice = selectedAddons.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
    
    try {
      await addDoc(collection(db, 'bookings'), {
        ...tempBooking,
        storeId: selectedStoreId,
        storeName: stores.find(s => s.id === selectedStoreId)?.name || '',
        productTitle: selectedProduct?.title,
        duration: selectedProduct?.duration || 90,
        addons: selectedAddons.map(a => a.title),
        totalPrice: (Number(selectedProduct?.price) || 0) + totalAddonPrice,
        createdAt: serverTimestamp()
      });
      setBookingStep('success');
    } catch(e) { alert("預約失敗，請稍後再試"); }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555]">
      {/* 導覽列與前台渲染 (與上一版邏輯相同，略作調整) */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b p-4 flex justify-between items-center px-6">
        <h1 className="text-xl tracking-widest font-light cursor-pointer" onClick={() => {setActiveTab('home'); setBookingStep('none');}}>UNIWAWA</h1>
        <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest">
          <button onClick={() => {setActiveTab('home'); setBookingStep('none');}}>Home</button>
          <button onClick={() => {setActiveTab('catalog'); setBookingStep('none');}}>Styles</button>
          {isLoggedIn ? (
            <button onClick={() => setShowManager(true)} className="text-[#C29591]"><Settings size={18}/></button>
          ) : (
            <button onClick={() => setShowAdminLogin(true)} className="text-gray-300"><Lock size={14}/></button>
          )}
        </div>
      </nav>

      <main className="pt-24 px-6 max-w-7xl mx-auto pb-20">
        {bookingStep === 'success' ? (
          <div className="text-center py-20">
            <CheckCircle size={64} className="mx-auto text-green-500 mb-6 stroke-1" />
            <h2 className="text-2xl font-light tracking-widest">預約完成</h2>
            <button onClick={() => {setBookingStep('none'); setActiveTab('home');}} className="mt-10 border border-black px-12 py-3 text-xs tracking-widest">返回</button>
          </div>
        ) : bookingStep === 'details' ? (
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
            <img src={selectedProduct?.image} className="w-full aspect-[3/4] object-cover shadow-2xl" />
            <div className="space-y-8">
              <div>
                <span className="text-[10px] text-[#C29591] font-bold uppercase tracking-widest">{selectedProduct?.category}</span>
                <h2 className="text-3xl font-light tracking-widest mt-2">{selectedProduct?.title}</h2>
                <div className="flex items-center gap-4 mt-4 text-gray-400 text-sm">
                  <span className="flex items-center gap-1"><Clock size={14}/> {selectedProduct?.duration} Min</span>
                  <span className="text-black font-bold">NT$ {selectedProduct?.price}</span>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold tracking-widest border-b pb-2">ADD-ONS 加購項目</h4>
                <div className="grid grid-cols-1 gap-2">
                  {addons.map(a => (
                    <button key={a.id} onClick={() => {
                      if(selectedAddons.find(sa => sa.id === a.id)) setSelectedAddons(selectedAddons.filter(sa => sa.id !== a.id));
                      else setSelectedAddons([...selectedAddons, a]);
                    }} className={`flex justify-between p-4 text-xs border ${selectedAddons.find(sa => sa.id === a.id) ? 'bg-black text-white border-black' : 'bg-white'}`}>
                      <span>{a.title}</span><span>+NT$ {a.price}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setBookingStep('form')} className="w-full bg-black text-white py-4 text-xs tracking-widest uppercase">下一步：選擇門市與時間</button>
            </div>
          </div>
        ) : bookingStep === 'form' ? (
          <div className="max-w-xl mx-auto space-y-8">
            <div className="bg-white p-8 border shadow-sm space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-[#C29591]">STEP 1: 選擇門市</label>
                <div className="grid grid-cols-2 gap-2">
                  {stores.map(s => (
                    <button key={s.id} onClick={() => setSelectedStoreId(s.id)} className={`p-4 text-xs border ${selectedStoreId === s.id ? 'bg-black text-white' : 'bg-white'}`}>{s.name}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-[#C29591]">STEP 2: 預約日期 (10分鐘為一單位)</label>
                <input type="date" className="w-full border-b p-3 outline-none" onChange={e => setTempBooking({...tempBooking, date: e.target.value})} />
                
                {config.closedDates?.includes(tempBooking.date) ? (
                  <div className="text-red-400 text-xs py-10 text-center border border-dashed border-red-200">該日期目前不開放預約</div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 h-60 overflow-y-auto border p-2">
                    {TIME_SLOTS.map(t => {
                      const avail = isTimeAvailable(tempBooking.date, t);
                      return (
                        <button key={t} disabled={!avail} onClick={() => setTempBooking({...tempBooking, time: t})} className={`p-2 text-[9px] border transition-all ${tempBooking.time === t ? 'bg-black text-white' : avail ? 'bg-white hover:border-black' : 'bg-gray-50 text-gray-200'}`}>
                          {t}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-[#C29591]">STEP 3: 顧客資料</label>
                <input placeholder="姓名" className="w-full border-b p-3 text-sm" onChange={e => setTempBooking({...tempBooking, name: e.target.value})} />
                <input placeholder="電話" className="w-full border-b p-3 text-sm" onChange={e => setTempBooking({...tempBooking, phone: e.target.value})} />
              </div>

              <button onClick={handleBooking} className="w-full bg-[#463E3E] text-white py-5 text-xs tracking-widest uppercase">確認預約</button>
            </div>
          </div>
        ) : activeTab === 'home' ? (
          <div className="text-center py-10 space-y-12">
            <img src="https://drive.google.com/thumbnail?id=1ZJv3DS8ST_olFt0xzKB_miK9UKT28wMO&sz=w1200" className="mx-auto max-w-2xl shadow-2xl" />
            <button onClick={() => setActiveTab('catalog')} className="bg-[#463E3E] text-white px-16 py-4 text-xs tracking-widest uppercase">View Catalog</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {products.filter(i => filter === '全部' || i.category === filter).map(item => (
              <div key={item.id} className="cursor-pointer group" onClick={() => {setSelectedProduct(item); setBookingStep('details'); window.scrollTo(0,0);}}>
                <div className="aspect-[3/4] overflow-hidden mb-4 relative shadow-sm">
                  <img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="text-center">
                  <h3 className="text-sm tracking-widest font-light">{item.title}</h3>
                  <div className="text-xs font-bold mt-1">NT$ {item.price}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* --- 管理後台 Modals --- */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center">
          <div className="bg-white p-10 w-80 text-center">
            <input type="password" placeholder="PASSWORD" className="w-full border-b py-3 text-center outline-none" onChange={e => setPassword(e.target.value)} />
            <button onClick={() => {if(password==="8888") {setIsLoggedIn(true); setShowAdminLogin(false);} else alert("錯誤");}} className="w-full bg-black text-white py-4 mt-8 text-xs uppercase tracking-widest">Login</button>
          </div>
        </div>
      )}

      {showManager && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 w-full max-w-5xl h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8 border-b pb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest">Admin Control Panel</h3>
              <button onClick={() => setShowManager(false)}><X/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-10">
                {/* 日期管理區 */}
                <section className="space-y-4">
                  <h4 className="text-[10px] font-bold text-[#C29591] flex items-center gap-2"><Calendar size={14}/> 日期開關管理</h4>
                  <div className="bg-gray-50 p-4 border space-y-4">
                    <div className="flex gap-2">
                      <input type="date" id="close_date" className="flex-1 bg-transparent text-xs border-b p-1" />
                      <button onClick={() => {
                        const d = document.getElementById('close_date').value;
                        if(d && !config.closedDates.includes(d)) {
                          updateDoc(doc(db, 'config', 'global'), { closedDates: [...config.closedDates, d] });
                        }
                      }} className="bg-red-500 text-white px-4 py-1 text-[10px]">設為店休</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {config.closedDates?.map(d => (
                        <span key={d} className="bg-white border border-red-200 text-red-500 px-2 py-1 text-[10px] flex items-center gap-1">
                          {d} <X size={10} className="cursor-pointer" onClick={() => updateDoc(doc(db, 'config', 'global'), { closedDates: config.closedDates.filter(item => item !== d) })} />
                        </span>
                      ))}
                      {(!config.closedDates || config.closedDates.length === 0) && <span className="text-gray-300 text-[10px] italic">目前無休假日期</span>}
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h4 className="text-[10px] font-bold text-[#C29591] uppercase">Settings</h4>
                  <div className="bg-gray-50 p-4 border flex justify-between text-xs">
                    <span>每時段可容納人數</span>
                    <input type="number" className="w-12 text-center border-b bg-transparent" value={config.maxCapacity} onChange={e => updateDoc(doc(db, 'config', 'global'), {maxCapacity: Number(e.target.value)})} />
                  </div>
                </section>

                <section className="space-y-4">
                  <h4 className="text-[10px] font-bold text-[#C29591] uppercase">Stores</h4>
                  <div className="flex gap-2">
                    <input id="new_s" className="flex-1 border-b text-xs p-1" placeholder="新門市" />
                    <button onClick={() => {const v = document.getElementById('new_s').value; if(v){addDoc(collection(db, 'stores'), {name: v}); document.getElementById('new_s').value='';}}} className="bg-black text-white px-4 text-[10px]">ADD</button>
                  </div>
                  {stores.map(s => <div key={s.id} className="flex justify-between p-2 border-b text-xs">{s.name} <Trash2 size={12} className="text-red-200 cursor-pointer" onClick={() => deleteDoc(doc(db, 'stores', s.id))} /></div>)}
                </section>

                <button onClick={() => setShowUpload(true)} className="w-full bg-[#C29591] text-white py-4 text-xs tracking-widest uppercase">+ Upload New Style</button>
              </div>

              {/* 預約列表 */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-[#C29591] uppercase tracking-widest">Bookings</h4>
                <div className="space-y-3">
                  {bookings.sort((a,b) => b.date.localeCompare(a.date)).map(b => (
                    <div key={b.id} className="p-4 border bg-gray-50 relative group text-[11px]">
                      <div className="font-bold">{b.date} {b.time}</div>
                      <div className="text-gray-500 uppercase mt-1">{b.storeName} | {b.productTitle}</div>
                      <div className="mt-2">{b.name} ({b.phone})</div>
                      <div className="text-[10px] text-gray-400 mt-1">加購：{b.addons?.join(', ') || '無'}</div>
                      <button onClick={() => deleteDoc(doc(db, 'bookings', b.id))} className="absolute top-4 right-4 text-red-200 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 上傳款式視窗 (維持原樣) */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4">
          <div className="bg-white p-8 w-full max-w-md space-y-6">
            <h3 className="text-xs font-bold tracking-widest uppercase border-b pb-2">New Style</h3>
            <input placeholder="款式標題" className="w-full border-b text-xs p-2 outline-none" id="up_t" />
            <div className="flex gap-4">
              <input placeholder="價格" className="flex-1 border-b text-xs p-2 outline-none" id="up_p" />
              <input placeholder="工時 (min)" className="w-24 border-b text-xs p-2 outline-none" id="up_d" defaultValue="90" />
            </div>
            <select className="w-full border-b text-xs p-2 bg-transparent outline-none" id="up_c">
              {STYLE_CATEGORIES.filter(c => c !== '全部').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="file" id="up_f" className="text-[10px]" />
            <button onClick={() => {
              const t = document.getElementById('up_t').value;
              const p = document.getElementById('up_p').value;
              const d = document.getElementById('up_d').value;
              const c = document.getElementById('up_c').value;
              const f = document.getElementById('up_f').files[0];
              if(!f || !t) return alert("資訊不足");
              const r = new FileReader();
              r.onload = async () => {
                await addDoc(collection(db, 'products'), { title: t, price: Number(p), duration: Number(d), category: c, image: r.result, createdAt: serverTimestamp() });
                setShowUpload(false);
              };
              r.readAsDataURL(f);
            }} className="w-full bg-black text-white py-4 text-xs tracking-widest uppercase">Publish</button>
            <button onClick={() => setShowUpload(false)} className="w-full text-xs text-gray-400">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}