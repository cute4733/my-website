import React, { useState, useEffect } from 'react';
import { Plus, X, Lock, Trash2, Edit3, Clock, CheckCircle, List, Upload, Star, MapPin } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

// --- 1. Firebase 設定 ---
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

// --- 2. 常數定義 ---
const STYLE_CATEGORIES = ['全部', '極簡氣質', '華麗鑽飾', '藝術手繪', '日系暈染', '貓眼系列'];
const TIME_SLOTS = ["12:00", "12:10", "12:20", "12:30", "12:40", "12:50", "13:00", "13:10", "13:20", "13:30", "13:40", "13:50", "14:00", "14:10", "14:20", "14:30", "14:40", "14:50", "15:00", "15:10", "15:20", "15:30", "15:40", "15:50", "16:00", "16:10", "16:20", "16:30", "16:40", "16:50", "17:00", "17:10", "17:20", "17:30", "17:40", "17:50", "18:00", "18:10", "18:20", "18:30", "18:40", "18:50", "19:00", "19:10", "19:20", "19:30", "19:40", "19:50", "20:00"];

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cloudItems, setCloudItems] = useState([]);
  const [addons, setAddons] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [stores, setStores] = useState([]);
  const [settings, setSettings] = useState({ maxCapacity: 1, closedDates: [] });
  
  const [bookingStep, setBookingStep] = useState('none');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedAddon, setSelectedAddon] = useState(null);
  const [selectedStore, setSelectedStore] = useState('');
  const [bookingData, setBookingData] = useState({ name: '', phone: '', date: '', time: '' });
  const [policyAccepted, setPolicyAccepted] = useState(false);

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isBookingManagerOpen, setIsBookingManagerOpen] = useState(false);
  const [isStoreManagerOpen, setIsStoreManagerOpen] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);

  const [formData, setFormData] = useState({ title: '', price: '', category: '極簡氣質', duration: '90', images: [] });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [styleFilter, setStyleFilter] = useState('全部');
  const [newStoreName, setNewStoreName] = useState('');

  // --- 3. 資料監聽 (加入防錯機制) ---
  useEffect(() => {
    signInAnonymously(auth).catch(e => console.log("Auth waiting..."));
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    try {
      const unsubD = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), (s) => 
        setCloudItems(s.docs.map(d => ({ id: d.id, ...d.data() })))
      );
      const unsubA = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'addons'), (s) => 
        setAddons(s.docs.map(d => ({ id: d.id, ...d.data() })))
      );
      const unsubS = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'stores'), (s) => 
        setStores(s.docs.map(d => ({ id: d.id, ...d.data() })))
      );
      const unsubB = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), orderBy('createdAt', 'desc')), (s) => 
        setAllBookings(s.docs.map(d => ({ id: d.id, ...d.data() })))
      );
      const unsubC = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config'), (d) => {
        if(d.exists()) setSettings(d.data());
      });

      return () => { unsubD(); unsubA(); unsubS(); unsubB(); unsubC(); };
    } catch (err) {
      console.error("Firestore Listen Error:", err);
    }
  }, [user]);

  // --- 4. 關鍵邏輯: 預約檢查 ---
  const isTimeSlotAvailable = (date, time, duration) => {
    if (!date || !time || !selectedStore) return true;
    
    // 檢查關閉日期
    if (settings?.closedDates && Array.isArray(settings.closedDates)) {
      if (settings.closedDates.includes(date)) return "CLOSED";
    }

    // 限制 24 小時前
    const now = new Date();
    const bookingTime = new Date(`${date} ${time}`);
    if (isNaN(bookingTime.getTime()) || bookingTime - now < 24 * 60 * 60 * 1000) return "TOO_SOON";

    const requestedStart = bookingTime.getTime();
    const requestedEnd = requestedStart + (Number(duration || 0) + 20) * 60000;

    // 檢查重疊 (確保 allBookings 是陣列)
    const currentBookings = Array.isArray(allBookings) ? allBookings : [];
    const overlapping = currentBookings.filter(b => {
      if (b.date !== date || b.storeId !== selectedStore) return false;
      try {
        const bStart = new Date(`${b.date} ${b.time}`).getTime();
        const bEnd = bStart + (Number(b.totalDuration || 0) + 20) * 60000;
        return (requestedStart < bEnd && requestedEnd > bStart);
      } catch (e) { return false; }
    });

    const max = Number(settings?.maxCapacity) || 1;
    return overlapping.length < max;
  };

  const handleConfirmBooking = async () => {
    if(!bookingData.name || !bookingData.phone || !bookingData.date || !bookingData.time || !selectedStore) {
      alert('請填寫完整資訊並選擇門市'); return;
    }
    if(!policyAccepted) { alert('請先勾選同意預約政策'); return; }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), {
        ...bookingData,
        storeId: selectedStore,
        itemTitle: selectedItem?.title || '未選取款式',
        addonName: selectedAddon?.name || '無',
        totalAmount: (Number(selectedItem?.price) || 0) + (Number(selectedAddon?.price) || 0),
        totalDuration: (Number(selectedItem?.duration) || 0) + (Number(selectedAddon?.duration) || 0),
        createdAt: serverTimestamp()
      });
      setBookingStep('success');
    } catch (e) { 
      console.error(e);
      alert('預約失敗，請再試一次'); 
    } finally { setIsSubmitting(false); }
  };

  const filteredItems = Array.isArray(cloudItems) 
    ? cloudItems.filter(item => styleFilter === '全部' || item.category === styleFilter)
    : [];

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555] font-sans">
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-[#EAE7E2]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <h1 className="text-xl tracking-[0.4em] font-extralight cursor-pointer" onClick={() => {setActiveTab('home'); setBookingStep('none');}}>UNIWAWA</h1>
          <div className="flex gap-6 text-sm tracking-widest font-medium uppercase items-center">
            <button onClick={() => {setActiveTab('home'); setBookingStep('none');}} className={activeTab === 'home' && bookingStep === 'none' ? 'text-[#C29591]' : ''}>首頁</button>
            <button onClick={() => {setActiveTab('catalog'); setBookingStep('none');}} className={activeTab === 'catalog' && bookingStep === 'none' ? 'text-[#C29591]' : ''}>作品集</button>
            {isLoggedIn && (
              <div className="flex gap-4 border-l pl-4 border-[#EAE7E2]">
                <button onClick={() => setIsUploadModalOpen(true)} className="text-[#C29591]"><Plus size={18}/></button>
                <button onClick={() => setIsBookingManagerOpen(true)} className="text-[#C29591]"><List size={18}/></button>
                <button onClick={() => setIsStoreManagerOpen(true)} className="text-[#C29591]"><MapPin size={18}/></button>
              </div>
            )}
            {!isLoggedIn && <button onClick={() => setIsAdminModalOpen(true)} className="text-gray-300"><Lock size={14}/></button>}
          </div>
        </div>
      </nav>

      <main className="pt-20">
        {bookingStep === 'form' ? (
          <div className="max-w-2xl mx-auto px-6 py-12">
            <h2 className="text-2xl font-light tracking-[0.3em] text-center mb-12">BOOKING</h2>
            <div className="bg-white border p-8 space-y-8 shadow-sm">
              <div>
                <label className="text-[10px] text-gray-400 block mb-2 tracking-widest uppercase">Select Store / 門市</label>
                <div className="grid grid-cols-2 gap-4">
                  {stores.length > 0 ? stores.map(s => (
                    <button key={s.id} onClick={() => setSelectedStore(s.id)} className={`py-3 border text-xs tracking-widest transition-all ${selectedStore === s.id ? 'bg-[#463E3E] text-white' : 'bg-white text-gray-400'}`}>{s.name}</button>
                  )) : <div className="col-span-2 text-center text-xs text-gray-300">目前尚無可用門市</div>}
                </div>
              </div>
              <input type="date" className="w-full border p-3 bg-[#FAF9F6] outline-none" onChange={e => setBookingData({...bookingData, date: e.target.value})} />
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {TIME_SLOTS.map(t => {
                  const duration = (selectedItem?.duration || 0) + (selectedAddon?.duration || 0);
                  const avail = isTimeSlotAvailable(bookingData.date, t, duration);
                  const isFull = avail === false;
                  const isClosed = avail === "CLOSED" || avail === "TOO_SOON" || !selectedStore;
                  return (
                    <button key={t} disabled={isFull || isClosed} onClick={() => setBookingData({...bookingData, time: t})} className={`py-2 text-[9px] border transition-all ${bookingData.time === t ? 'bg-[#463E3E] text-white' : (isFull || isClosed) ? 'bg-gray-100 text-gray-200' : 'bg-white hover:border-[#C29591]'}`}>
                      {isFull ? '已滿' : t}
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="顧客姓名" className="border-b py-2 outline-none" onChange={e => setBookingData({...bookingData, name: e.target.value})} />
                <input type="tel" placeholder="聯絡電話" className="border-b py-2 outline-none" onChange={e => setBookingData({...bookingData, phone: e.target.value})} />
              </div>
              <div className="flex items-center gap-2 py-4 border-t">
                <input type="checkbox" id="policy" checked={policyAccepted} onChange={e => setPolicyAccepted(e.target.checked)} />
                <label htmlFor="policy" className="text-xs text-gray-500">同意 <button onClick={() => setIsPolicyModalOpen(true)} className="underline">預約政策</button></label>
              </div>
              <button disabled={isSubmitting} onClick={handleConfirmBooking} className="w-full bg-[#463E3E] text-white py-4 text-xs tracking-widest hover:bg-black disabled:bg-gray-200">
                {isSubmitting ? '處理中...' : '送出預約申請'}
              </button>
            </div>
          </div>
        ) : bookingStep === 'success' ? (
          <div className="max-w-md mx-auto py-32 text-center">
            <CheckCircle size={60} className="mx-auto text-green-500 mb-8" strokeWidth={1} />
            <h2 className="text-2xl font-light mb-8">預約已完成</h2>
            <button onClick={() => {setBookingStep('none'); setActiveTab('home');}} className="border border-[#463E3E] px-12 py-3 text-xs tracking-widest">回到首頁</button>
          </div>
        ) : activeTab === 'home' ? (
          <div className="flex flex-col items-center">
            <section className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6">
              <span className="text-[#C29591] tracking-[0.4em] text-xs mb-10">EST. 2026 • TAOYUAN</span>
              <img src="https://drive.google.com/thumbnail?id=1ZJv3DS8ST_olFt0xzKB_miK9UKT28wMO&sz=w1200" className="w-full max-w-xl mb-12 shadow-2xl" alt="Banner" />
              <h2 className="text-4xl font-extralight tracking-[0.4em] mb-12">Beyond Expectation</h2>
              <button onClick={() => setActiveTab('catalog')} className="bg-[#463E3E] text-white px-16 py-4 text-xs tracking-widest uppercase">進入作品集</button>
            </section>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="flex justify-center gap-8 mb-12 text-[10px] tracking-widest text-gray-400 uppercase font-bold">
              {STYLE_CATEGORIES.map(c => <button key={c} onClick={() => setStyleFilter(c)} className={styleFilter === c ? 'text-[#463E3E]' : ''}>{c}</button>)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {filteredItems.map(item => (
                <div key={item.id} className="bg-white border flex flex-col group">
                  <div className="aspect-[3/4] overflow-hidden relative">
                    <img src={item.images?.[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={item.title} />
                    {isLoggedIn && (
                      <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', item.id))} className="absolute top-4 right-4 p-2 bg-white/90 rounded-full text-red-500 shadow-md"><Trash2 size={14}/></button>
                    )}
                  </div>
                  <div className="p-8 text-center flex flex-col items-center">
                    <span className="text-[9px] text-[#C29591] tracking-[0.4em] mb-2 uppercase">{item.category}</span>
                    <h3 className="text-lg tracking-widest my-2">{item.title}</h3>
                    <div className="text-[10px] text-gray-400 mb-4 flex items-center gap-1 font-light"><Clock size={12}/> {item.duration} MINS</div>
                    <div className="text-xl font-bold mb-8 font-serif">NT$ {item.price?.toLocaleString()}</div>
                    <button onClick={() => {setSelectedItem(item); setBookingStep('form'); window.scrollTo(0,0);}} className="w-full py-4 bg-[#463E3E] text-white text-[10px] tracking-widest uppercase hover:bg-[#C29591] transition-all">點此預約</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* --- Modals (底層結構加固) --- */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-10 max-w-sm w-full text-center">
            <h3 className="text-xs tracking-widest text-gray-400 mb-6 uppercase">Admin Access</h3>
            <input type="password" placeholder="••••" className="w-full border-b py-3 text-center tracking-[1em] outline-none" onChange={e => setPasswordInput(e.target.value)} />
            <button onClick={() => {if(passwordInput==="8888") { setIsLoggedIn(true); setIsAdminModalOpen(false); } else { alert("錯誤"); }}} className="w-full bg-[#463E3E] text-white py-4 mt-8 text-xs tracking-widest uppercase">Login</button>
          </div>
        </div>
      )}

      {isStoreManagerOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
              <h3 className="text-xs tracking-widest uppercase">Settings</h3>
              <button onClick={() => setIsStoreManagerOpen(false)}><X size={20}/></button>
            </div>
            <div className="space-y-8">
              <div>
                <label className="text-[10px] text-gray-400 block mb-2 font-bold uppercase">服務人數上限</label>
                <input type="number" className="border-b p-2 w-20 outline-none" value={settings?.maxCapacity || 1} onChange={async (e) => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config'), { maxCapacity: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 block mb-4 font-bold uppercase">門市清單</label>
                <div className="flex gap-2 mb-4">
                  <input className="border-b flex-1 py-2 text-xs outline-none" placeholder="店名" value={newStoreName} onChange={e => setNewStoreName(e.target.value)} />
                  <button onClick={async () => { if(newStoreName) { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'stores'), {name: newStoreName}); setNewStoreName(''); } }} className="bg-[#463E3E] text-white px-4 py-1 text-xs uppercase"><Plus size={14}/></button>
                </div>
                {stores.map(s => (
                  <div key={s.id} className="flex justify-between items-center bg-gray-50 p-3 text-xs border mb-1">
                    <span>{s.name}</span>
                    <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'stores', s.id))} className="text-red-300"><Trash2 size={14}/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isBookingManagerOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
              <h3 className="text-xs tracking-widest uppercase">Bookings</h3>
              <button onClick={() => setIsBookingManagerOpen(false)}><X size={20}/></button>
            </div>
            {allBookings.map(b => (
              <div key={b.id} className="border p-4 flex justify-between items-center text-xs bg-gray-50 mb-3 shadow-sm">
                <div><div className="font-bold text-sm">{b.date} {b.time} — {b.name}</div><div className="text-[#C29591]">{b.itemTitle} | {b.phone}</div></div>
                <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', b.id))} className="text-red-300"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6 pb-4 border-b"><h3>Upload</h3><button onClick={()=>setIsUploadModalOpen(false)}><X size={20}/></button></div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmitting(true);
              try {
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), {...formData, price: Number(formData.price), duration: Number(formData.duration), createdAt: serverTimestamp()});
                setIsUploadModalOpen(false);
                setFormData({ title: '', price: '', category: '極簡氣質', duration: '90', images: [] });
              } catch (err) { alert("上傳失敗"); } finally { setIsSubmitting(false); }
            }} className="space-y-6">
              <input placeholder="名稱" required className="w-full border-b py-2 text-sm outline-none" onChange={e=>setFormData({...formData, title: e.target.value})} />
              <div className="flex gap-4">
                <input placeholder="價格" type="number" required className="w-1/2 border-b py-2 text-sm outline-none" onChange={e=>setFormData({...formData, price: e.target.value})} />
                <input placeholder="工時" type="number" required className="w-1/2 border-b py-2 text-sm outline-none" onChange={e=>setFormData({...formData, duration: e.target.value})} />
              </div>
              <select className="w-full border-b py-2 text-sm outline-none bg-transparent" onChange={e=>setFormData({...formData, category: e.target.value})}>
                {STYLE_CATEGORIES.filter(c=>c!=='全部').map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              <input type="file" multiple className="text-xs" onChange={e => {
                const files = Array.from(e.target.files);
                files.forEach(f => {
                  const r = new FileReader();
                  r.onloadend = () => setFormData(p => ({...p, images: [...p.images, r.result]}));
                  r.readAsDataURL(f);
                });
              }} />
              <button disabled={isSubmitting} className="w-full bg-[#463E3E] text-white py-4 text-xs tracking-widest uppercase">{isSubmitting ? 'UPLOADING...' : 'CONFIRM'}</button>
            </form>
          </div>
        </div>
      )}

      {isPolicyModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-6">
          <div className="bg-white p-8 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-xs tracking-widest mb-4 uppercase border-b pb-2">Policy</h3>
            <ul className="text-[10px] text-gray-400 space-y-2 uppercase leading-relaxed">
              <li>• 請準時抵達 (15 MINS BUFFER)</li>
              <li>• 取消請於 24 小時前告知</li>
              <li>• 美甲保固 7 天</li>
            </ul>
            <button onClick={() => setIsPolicyModalOpen(false)} className="w-full mt-6 bg-[#463E3E] text-white py-3 text-[10px] tracking-widest">OK</button>
          </div>
        </div>
      )}
    </div>
  );
}