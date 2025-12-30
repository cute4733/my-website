import React, { useState, useEffect } from 'react';
import { Plus, X, Lock, Trash2, Edit3, Clock, CheckCircle, List, Upload, Star, MapPin } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

// --- Firebase 配置 ---
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
  for (let h = 12; h <= 20; h++) {
    for (let m = 0; m < 60; m += 10) {
      if (h === 20 && m > 0) break;
      slots.push(`${h}:${m === 0 ? '00' : m}`);
    }
  }
  return slots;
})();

export default function App() {
  // --- 狀態定義 ---
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

  const reviews = [
    { name: "Jessica", content: "環境非常舒服，美甲師超級細心！", stars: 5 },
    { name: "Emily", content: "貓眼系列做得超美，每次都被朋友稱讚。", stars: 5 },
    { name: "欣怡", content: "修甲修得很乾淨，預約系統也很方便。", stars: 5 }
  ];

  // --- 資料監聽 ---
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
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'stores'), (s) => 
      setStores(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), orderBy('createdAt', 'desc')), (s) => 
      setAllBookings(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config'), (d) => {
      if(d.exists()) setSettings(d.data());
    });
  }, [user]);

  // --- 邏輯函數 ---
  const isTimeSlotAvailable = (date, time, duration) => {
    if (!date || !time) return true;
    if (settings.closedDates?.includes(date)) return "CLOSED";
    const now = new Date();
    const bookingTime = new Date(`${date} ${time}`);
    if (bookingTime - now < 24 * 60 * 60 * 1000) return "TOO_SOON";

    const requestedStart = bookingTime.getTime();
    const requestedEnd = requestedStart + (duration + 20) * 60000;

    const overlapping = allBookings.filter(b => {
      if (b.date !== date || b.storeId !== selectedStore) return false;
      const bStart = new Date(`${b.date} ${b.time}`).getTime();
      const bEnd = bStart + (b.totalDuration + 20) * 60000;
      return (requestedStart < bEnd && requestedEnd > bStart);
    });
    return overlapping.length < (settings.maxCapacity || 1);
  };

  const handleConfirmBooking = async () => {
    if(!bookingData.name || !bookingData.phone || !bookingData.date || !bookingData.time || !selectedStore) {
      alert('請填寫完整資訊並選擇門市'); return;
    }
    if(!policyAccepted) { alert('請先同意預約政策'); return; }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), {
        ...bookingData,
        storeId: selectedStore,
        itemTitle: selectedItem?.title,
        addonName: selectedAddon?.name || '無',
        totalAmount: (selectedItem?.price || 0) + (selectedAddon?.price || 0),
        totalDuration: (selectedItem?.duration || 0) + (selectedAddon?.duration || 0),
        createdAt: serverTimestamp()
      });
      setBookingStep('success');
    } catch (e) { alert('預約失敗'); } finally { setIsSubmitting(false); }
  };

  const filteredItems = cloudItems.filter(item => styleFilter === '全部' || item.category === styleFilter);

  // --- 介面渲染 ---
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555] font-sans">
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-[#EAE7E2]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <h1 className="text-xl tracking-[0.4em] font-extralight cursor-pointer" onClick={() => {setActiveTab('home'); setBookingStep('none');}}>UNIWAWA</h1>
          <div className="flex gap-6 text-sm tracking-widest font-medium uppercase items-center">
            <button onClick={() => {setActiveTab('home'); setBookingStep('none');}} className={activeTab === 'home' ? 'text-[#C29591]' : ''}>首頁</button>
            <button onClick={() => {setActiveTab('catalog'); setBookingStep('none');}} className={activeTab === 'catalog' ? 'text-[#C29591]' : ''}>作品</button>
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
            <h2 className="text-2xl font-light tracking-[0.3em] text-center mb-12">RESERVATION</h2>
            <div className="bg-white border p-8 space-y-8 shadow-sm">
              <div>
                <label className="text-[10px] text-gray-400 block mb-2 tracking-widest uppercase">Select Store / 門市</label>
                <div className="grid grid-cols-2 gap-4">
                  {stores.map(s => (
                    <button key={s.id} onClick={() => setSelectedStore(s.id)} className={`py-3 border text-xs ${selectedStore === s.id ? 'bg-[#463E3E] text-white' : 'bg-white'}`}>{s.name}</button>
                  ))}
                </div>
              </div>
              <input type="date" className="w-full border p-3 bg-[#FAF9F6]" onChange={e => setBookingData({...bookingData, date: e.target.value})} />
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {TIME_SLOTS.map(t => {
                  const avail = isTimeSlotAvailable(bookingData.date, t, (selectedItem?.duration || 0) + (selectedAddon?.duration || 0));
                  const disabled = avail === false || avail === "CLOSED" || avail === "TOO_SOON" || !selectedStore;
                  return (
                    <button key={t} disabled={disabled} onClick={() => setBookingData({...bookingData, time: t})} className={`py-2 text-[9px] border ${bookingData.time === t ? 'bg-[#463E3E] text-white' : disabled ? 'bg-gray-100 text-gray-300' : 'bg-white'}`}>
                      {avail === false ? '已滿' : t}
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="姓名" className="border-b py-2 outline-none" onChange={e => setBookingData({...bookingData, name: e.target.value})} />
                <input type="tel" placeholder="電話" className="border-b py-2 outline-none" onChange={e => setBookingData({...bookingData, phone: e.target.value})} />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={policyAccepted} onChange={e => setPolicyAccepted(e.target.checked)} />
                <span>同意 <button onClick={() => setIsPolicyModalOpen(true)} className="underline">預約政策</button></span>
              </div>
              <button disabled={isSubmitting} onClick={handleConfirmBooking} className="w-full bg-[#463E3E] text-white py-4 text-xs tracking-widest uppercase">
                {isSubmitting ? '提交中...' : '確認預約'}
              </button>
            </div>
          </div>
        ) : bookingStep === 'success' ? (
          <div className="text-center py-20">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-light mb-8">預約已完成</h2>
            <button onClick={() => {setBookingStep('none'); setActiveTab('home');}} className="border border-[#463E3E] px-8 py-2 text-xs">回到首頁</button>
          </div>
        ) : activeTab === 'home' ? (
          <div className="flex flex-col items-center">
            <section className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6">
              <span className="text-[#C29591] tracking-[0.4em] text-xs mb-10">EST. 2026 • TAOYUAN</span>
              <img src="https://drive.google.com/thumbnail?id=1ZJv3DS8ST_olFt0xzKB_miK9UKT28wMO&sz=w1200" className="w-full max-w-xl mb-12 shadow-xl" alt="Banner" />
              <h2 className="text-4xl font-extralight tracking-[0.4em] mb-12">Beyond Expectation</h2>
              <button onClick={() => setActiveTab('catalog')} className="bg-[#463E3E] text-white px-16 py-4 text-xs">進入作品集</button>
            </section>
            <section className="w-full bg-white py-24 border-y text-center">
              <h3 className="text-xs tracking-[0.5em] text-gray-400 mb-16 uppercase">What Clients Say</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto px-6">
                {reviews.map((r, i) => (
                  <div key={i}>
                    <div className="flex justify-center gap-1 mb-4 text-[#C29591]">{[...Array(r.stars)].map((_, s) => <Star key={s} size={12} fill="currentColor" />)}</div>
                    <p className="text-sm italic text-gray-500 mb-4">"{r.content}"</p>
                    <span className="text-[10px]">— {r.name}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="flex justify-center gap-8 mb-12 text-[10px] tracking-widest text-gray-400">
              {STYLE_CATEGORIES.map(c => <button key={c} onClick={() => setStyleFilter(c)} className={styleFilter === c ? 'text-[#463E3E]' : ''}>{c}</button>)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {filteredItems.map(item => (
                <div key={item.id} className="bg-white border p-4 flex flex-col">
                  <div className="aspect-[3/4] overflow-hidden relative group">
                    <img src={item.images?.[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={item.title} />
                    {isLoggedIn && (
                      <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', item.id))} className="absolute top-2 right-2 p-2 bg-white/80 rounded-full text-red-500"><Trash2 size={14}/></button>
                    )}
                  </div>
                  <div className="p-6 text-center">
                    <span className="text-[9px] text-[#C29591] tracking-widest uppercase">{item.category}</span>
                    <h3 className="text-lg my-2 tracking-widest">{item.title}</h3>
                    <div className="text-[10px] text-gray-400 mb-4 flex justify-center items-center gap-1"><Clock size={12}/> {item.duration} MINS</div>
                    <div className="text-xl font-bold mb-6">NT$ {item.price.toLocaleString()}</div>
                    <button onClick={() => {setSelectedItem(item); setBookingStep('form'); window.scrollTo(0,0);}} className="w-full py-3 bg-[#463E3E] text-white text-[10px] tracking-widest uppercase">點此預約</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* --- 管理與彈窗 --- */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 max-w-sm w-full text-center">
            <h3 className="text-xs tracking-widest mb-6">ADMIN LOGIN</h3>
            <input type="password" placeholder="••••" className="w-full border-b py-2 text-center tracking-widest outline-none" onChange={e => setPasswordInput(e.target.value)} />
            <button onClick={() => {if(passwordInput==="8888") setIsLoggedIn(true); setIsAdminModalOpen(false);}} className="w-full bg-[#463E3E] text-white py-3 mt-6 text-xs">LOGIN</button>
          </div>
        </div>
      )}

      {isStoreManagerOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6"><h3>門市與設定管理</h3><button onClick={() => setIsStoreManagerOpen(false)}><X size={20}/></button></div>
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold block mb-2">同時段上限 (人)</label>
                <input type="number" className="border-b p-2 w-full" value={settings.maxCapacity} onChange={async (e) => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config'), { maxCapacity: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs font-bold block mb-2">門市清單</label>
                <div className="flex gap-2 mb-2"><input className="border-b flex-1 text-sm" value={newStoreName} onChange={e => setNewStoreName(e.target.value)} /><button onClick={async () => {await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'stores'), {name: newStoreName}); setNewStoreName('')}}><Plus size={16}/></button></div>
                {stores.map(s => <div key={s.id} className="flex justify-between text-sm py-1 border-b"><span>{s.name}</span><button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'stores', s.id))}><Trash2 size={12}/></button></div>)}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {isBookingManagerOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6"><h3>預約單管理</h3><button onClick={() => setIsBookingManagerOpen(false)}><X size={20}/></button></div>
            <div className="space-y-4">
              {allBookings.map(b => (
                <div key={b.id} className="border p-4 flex justify-between items-center text-sm bg-gray-50">
                  <div><div className="font-bold">{b.date} {b.time} - {b.name}</div><div className="text-xs text-gray-400">{b.itemTitle} | {b.phone}</div></div>
                  <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', b.id))} className="text-red-400"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 max-w-md w-full">
            <div className="flex justify-between mb-6"><h3>上傳作品</h3><button onClick={()=>setIsUploadModalOpen(false)}><X size={20}/></button></div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), {...formData, price: Number(formData.price), duration: Number(formData.duration), createdAt: serverTimestamp()});
              setIsUploadModalOpen(false);
            }} className="space-y-4">
              <input placeholder="名稱" className="w-full border-b py-2 outline-none" onChange={e=>setFormData({...formData, title: e.target.value})} />
              <div className="flex gap-4">
                <input placeholder="價格" type="number" className="w-1/2 border-b py-2" onChange={e=>setFormData({...formData, price: e.target.value})} />
                <input placeholder="工時" type="number" className="w-1/2 border-b py-2" onChange={e=>setFormData({...formData, duration: e.target.value})} />
              </div>
              <select className="w-full border-b py-2" onChange={e=>setFormData({...formData, category: e.target.value})}>
                {STYLE_CATEGORIES.filter(c=>c!=='全部').map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              <input type="file" multiple onChange={e => {
                const files = Array.from(e.target.files);
                files.forEach(f => {
                  const r = new FileReader();
                  r.onloadend = () => setFormData(p => ({...p, images: [...p.images, r.result]}));
                  r.readAsDataURL(f);
                });
              }} />
              <button className="w-full bg-[#463E3E] text-white py-3">確認上傳</button>
            </form>
          </div>
        </div>
      )}

      {isPolicyModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-6">
          <div className="bg-white p-8 max-w-sm w-full">
            <h3 className="font-bold mb-4">預約需知</h3>
            <p className="text-xs text-gray-500 leading-relaxed">1. 遲到15分鐘將視情況調整內容。 2. 取消請於24小時前通知。 3. 保固7天。</p>
            <button onClick={() => setIsPolicyModalOpen(false)} className="w-full mt-6 bg-[#463E3E] text-white py-2 text-xs">我已了解</button>
          </div>
        </div>
      )}
    </div>
  );
}