import React, { useState, useEffect } from 'react';
import { Plus, X, Lock, Trash2, Edit3, MessageCircle, Settings, Clock, Calendar, User, Phone, CheckCircle, List, Upload } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

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
  const [allBookings, setAllBookings] = useState([]);
  
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
    const bookingQuery = query(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), orderBy('createdAt', 'desc'));
    onSnapshot(bookingQuery, (s) => setAllBookings(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    if (formData.images.length === 0) { alert("請至少上傳一張圖片"); return; }
    setIsUploading(true);
    try {
      const payload = { 
        ...formData, 
        price: Number(formData.price), 
        duration: Number(formData.duration),
        updatedAt: serverTimestamp()
      };
      
      if (editingItem) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', editingItem.id), payload);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), { 
          ...payload, 
          createdAt: serverTimestamp() 
        });
      }
      setIsUploadModalOpen(false);
      setEditingItem(null);
      setFormData({ title: '', price: '', category: '極簡氣質', duration: '90', images: [] });
    } catch (err) {
      alert("儲存失敗");
    } finally {
      setIsUploading(false);
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
                <button onClick={() => setIsBookingManagerOpen(true)} className="text-[#C29591]"><List size={18}/></button>
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
            
            {/* 這裡新增：費用與時長摘要 */}
            <div className="bg-white border border-[#EAE7E2] mb-6 p-6 shadow-sm">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] text-[#C29591] tracking-widest uppercase font-bold">預約項目</p>
                    <p className="text-sm font-medium">{selectedItem?.title} + {selectedAddon?.name || '無附加項目'}</p>
                  </div>
                  <div className="flex gap-8">
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 tracking-widest uppercase">總時長</p>
                      <p className="text-lg font-light flex items-center justify-end gap-1">
                        <Clock size={14} className="text-gray-300"/> 
                        {(Number(selectedItem?.duration) || 0) + (Number(selectedAddon?.duration) || 0)} min
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 tracking-widest uppercase">總金額</p>
                      <p className="text-lg font-bold text-[#463E3E]">
                        NT$ {((Number(selectedItem?.price) || 0) + (Number(selectedAddon?.price) || 0)).toLocaleString()}
                      </p>
                    </div>
                  </div>
               </div>
            </div>

            <div className="bg-white border border-[#EAE7E2] p-8 shadow-sm space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input type="text" placeholder="顧客姓名" className="border-b py-2 outline-none focus:border-[#C29591]" onChange={e => setBookingData({...bookingData, name: e.target.value})} />
                <input type="tel" placeholder="聯絡電話" className="border-b py-2 outline-none focus:border-[#C29591]" onChange={e => setBookingData({...bookingData, phone: e.target.value})} />
              </div>
              <input type="date" className="w-full border p-3 bg-[#FAF9F6]" onChange={e => setBookingData({...bookingData, date: e.target.value})} />
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
              <button onClick={() => setBookingStep('none')} className="w-full text-center text-[10px] text-gray-400 uppercase tracking-widest">返回重新選擇</button>
            </div>
          </div>
        ) : bookingStep === 'success' ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
            <CheckCircle size={64} className="text-green-200 mb-6" />
            <h2 className="text-2xl font-light tracking-widest mb-4">預約已送出</h2>
            <p className="text-gray-400 text-sm mb-10">我們會儘快與您聯繫確認細節</p>
            <button onClick={() => {setBookingStep('none'); setActiveTab('home');}} className="border border-[#463E3E] px-12 py-3 text-xs tracking-widest">回到首頁</button>
          </div>
        ) : activeTab === 'home' ? (
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
                    <div className="flex items-center gap-1.5 text-gray-400 text-[10px] mb-4 uppercase tracking-widest font-light">
                      <Clock size={12} />
                      預計服務：{item.duration || '90'} 分鐘
                    </div>
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

      {/* 新增商品彈窗 */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8 border-b pb-4">
              <h3 className="tracking-widest font-light">{editingItem ? '修改款式' : '上傳新款作品'}</h3>
              <button onClick={() => setIsUploadModalOpen(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleItemSubmit} className="space-y-6">
              <div>
                <label className="text-[10px] text-gray-400 block mb-2 uppercase tracking-widest">款式名稱</label>
                <input type="text" required className="w-full border-b py-2 outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="例如：極簡法式細邊" />
              </div>
              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="text-[10px] text-gray-400 block mb-2 uppercase tracking-widest">預算價格 (NT$)</label>
                  <input type="number" required className="w-full border-b py-2 outline-none" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                </div>
                <div className="w-1/2">
                  <label className="text-[10px] text-gray-400 block mb-2 uppercase tracking-widest">所需時間 (分)</label>
                  <input type="number" required className="w-full border-b py-2 outline-none" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 block mb-2 uppercase tracking-widest">分類標籤</label>
                <select className="w-full border-b py-2 bg-transparent outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  {STYLE_CATEGORIES.filter(c => c !== '全部').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 block mb-4 uppercase tracking-widest">作品照片</label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {formData.images.map((img, i) => (
                    <div key={i} className="relative w-20 h-20 border">
                      <img src={img} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setFormData({...formData, images: formData.images.filter((_, idx) => idx !== i)})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X size={10}/></button>
                    </div>
                  ))}
                  <label className="w-20 h-20 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                    <Upload size={16} className="text-gray-300 mb-1" />
                    <span className="text-[8px] text-gray-400">上傳圖片</span>
                    <input type="file" hidden accept="image/*" multiple onChange={(e) => {
                      const files = Array.from(e.target.files);
                      files.forEach(file => {
                        const reader = new FileReader();
                        reader.onloadend = () => setFormData(prev => ({...prev, images: [...prev.images, reader.result]}));
                        reader.readAsDataURL(file);
                      });
                    }} />
                  </label>
                </div>
              </div>
              <button disabled={isUploading} className="w-full bg-[#463E3E] text-white py-4 text-xs tracking-[0.3em] hover:bg-[#C29591] transition-all">
                {isUploading ? '處理中...' : (editingItem ? '更新作品資料' : '正式發布作品')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 管理員登入彈窗 */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white p-10 max-w-sm w-full shadow-2xl text-center">
            <h3 className="tracking-[0.5em] mb-10 font-light text-gray-400 text-sm uppercase">Admin Access</h3>
            <form onSubmit={(e) => { e.preventDefault(); if(passwordInput==="8888") setIsLoggedIn(true); setIsAdminModalOpen(false); }}>
              <input type="password" placeholder="••••" className="w-full border-b border-[#EAE7E2] py-4 text-center tracking-[1.5em] mb-10 outline-none" onChange={e => setPasswordInput(e.target.value)} autoFocus />
              <button className="w-full bg-[#463E3E] text-white py-4 tracking-[0.3em] text-xs">ENTER SYSTEM</button>
            </form>
          </div>
        </div>
      )}

      {/* 預約管理彈窗 */}
      {isBookingManagerOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white p-8 max-w-3xl w-full shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8 border-b pb-4"><h3 className="tracking-widest font-light uppercase">Booking Management</h3><button onClick={() => setIsBookingManagerOpen(false)}><X size={20}/></button></div>
            <div className="space-y-4">
              {allBookings.map(b => (
                <div key={b.id} className="border p-4 flex flex-col md:flex-row justify-between md:items-center text-sm gap-4 bg-[#FAF9F6]">
                  <div className="space-y-1">
                    <div className="font-bold text-[#463E3E]">{b.date} {b.time} — {b.name}</div>
                    <div className="text-[11px] text-[#C29591] uppercase tracking-wider">{b.itemTitle} / {b.addonName}</div>
                    <div className="text-xs text-gray-500 font-mono">{b.phone}</div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="font-bold">NT$ {b.totalAmount?.toLocaleString()}</div>
                      <div className="text-[10px] text-gray-300 tracking-tighter uppercase">{b.totalDuration} MINS</div>
                    </div>
                    <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', b.id))} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                  </div>
                </div>
              ))}
              {allBookings.length === 0 && <div className="text-center py-10 text-gray-300 tracking-widest text-xs uppercase">No bookings found</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}