import React, { useState, useEffect } from 'react';
import { Plus, X, Lock, Trash2, Edit3, MessageCircle, Settings, Clock } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';

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

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cloudItems, setCloudItems] = useState([]);
  const [addons, setAddons] = useState([]);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAddonManagerOpen, setIsAddonManagerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [styleFilter, setStyleFilter] = useState('全部');
  const [priceFilter, setPriceFilter] = useState('全部');
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({ title: '', price: '', category: '極簡氣質', duration: '90', images: [] });
  const [newAddon, setNewAddon] = useState({ name: '', price: '', duration: '' });

  useEffect(() => {
    signInAnonymously(auth);
    onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubItems = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), (s) => 
      setCloudItems(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubAddons = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'addons'), (s) => 
      setAddons(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { unsubItems(); unsubAddons(); };
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      const payload = { ...formData, price: Number(formData.price), duration: Number(formData.duration) };
      if (editingItem) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', editingItem.id), payload);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), { ...payload, createdAt: serverTimestamp() });
      }
      setIsUploadModalOpen(false);
      setEditingItem(null);
      setFormData({ title: '', price: '', category: '極簡氣質', duration: '90', images: [] });
    } catch (err) { alert("失敗"); } finally { setIsUploading(false); }
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
          <h1 className="text-xl tracking-[0.4em] font-extralight cursor-pointer text-[#463E3E]" onClick={() => setActiveTab('home')}>UNIWAWA</h1>
          <div className="flex gap-6 text-sm tracking-widest font-medium uppercase">
            <button onClick={() => setActiveTab('home')} className={activeTab === 'home' ? 'text-[#C29591]' : ''}>首頁</button>
            <button onClick={() => setActiveTab('catalog')} className={activeTab === 'catalog' ? 'text-[#C29591]' : ''}>款式</button>
            {isLoggedIn && <button onClick={() => setIsAddonManagerOpen(true)} className="text-[#C29591]"><Settings size={18}/></button>}
            {!isLoggedIn && <button onClick={() => setIsAdminModalOpen(true)} className="text-gray-300"><Lock size={14}/></button>}
          </div>
        </div>
      </nav>

      <main className="pt-20">
        {activeTab === 'home' ? (
          <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-6 text-center">
            {/* 標語放大並維持字體 */}
            <span className="text-[#C29591] tracking-[0.8em] text-sm md:text-base mb-10 uppercase font-extralight">EST. 2026 • TAOYUAN</span>
            
            {/* 調整後的首頁圖片：限制最大高度 max-h-[40vh] */}
            <div className="w-full max-w-xl mb-12 shadow-2xl rounded-sm overflow-hidden border border-[#EAE7E2]">
              <img 
                src="https://drive.google.com/thumbnail?id=1ZJv3DS8ST_olFt0xzKB_miK9UKT28wMO&sz=w1200" 
                className="w-full h-auto max-h-[40vh] object-cover" 
                alt="Banner" 
              />
            </div>
            
            <h2 className="text-4xl md:text-5xl font-extralight mb-12 tracking-[0.4em] text-[#463E3E] leading-relaxed">Beyond<br/>Expectation</h2>
            <button onClick={() => setActiveTab('catalog')} className="bg-[#463E3E] text-white px-16 py-4 hover:bg-[#C29591] transition-all tracking-[0.4em] text-xs shadow-xl font-light">進入作品集</button>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-6 py-12">
            {/* 篩選與價位區 */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-12 mb-20 border-b pb-12 border-[#EAE7E2]">
              <div className="flex flex-col items-center gap-4">
                <span className="text-[10px] tracking-[0.3em] text-gray-400 font-bold uppercase">Style / 風格</span>
                <div className="flex flex-wrap justify-center gap-3">
                  {STYLE_CATEGORIES.map(c => (
                    <button key={c} onClick={() => setStyleFilter(c)} className={`px-4 py-1.5 text-xs tracking-widest border-b transition-all ${styleFilter === c ? 'border-[#463E3E] text-[#463E3E]' : 'border-transparent text-gray-300 hover:text-gray-500'}`}>{c}</button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-center gap-4">
                <span className="text-[10px] tracking-[0.3em] text-gray-400 font-bold uppercase">Price / 預算</span>
                <div className="flex flex-wrap justify-center gap-3">
                  {PRICE_CATEGORIES.map(c => (
                    <button key={c} onClick={() => setPriceFilter(c)} className={`px-4 py-1.5 text-xs tracking-widest border-b transition-all ${priceFilter === c ? 'border-[#C29591] text-[#C29591]' : 'border-transparent text-gray-300 hover:text-gray-500'}`}>{c}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16">
              {filteredItems.map(item => (
                <div key={item.id} className="group flex flex-col bg-white border border-[#F0EDEA] shadow-sm">
                  <div className="aspect-[3/4] overflow-hidden relative">
                    <img src={item.images?.[0]} className="w-full h-full object-cover" alt={item.title} />
                    {isLoggedIn && (
                      <div className="absolute top-4 right-4 flex gap-2">
                        <button onClick={() => {setEditingItem(item); setFormData(item); setIsUploadModalOpen(true);}} className="p-2 bg-white/90 rounded-full text-blue-600"><Edit3 size={16}/></button>
                        <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', item.id))} className="p-2 bg-white/90 rounded-full text-red-600"><Trash2 size={16}/></button>
                      </div>
                    )}
                  </div>
                  <div className="p-8 flex flex-col items-center text-center">
                    <span className="text-[10px] text-[#C29591] tracking-[0.4em] uppercase mb-2 font-medium">{item.category}</span>
                    <h3 className="text-[#463E3E] font-medium text-lg tracking-widest mb-2">{item.title}</h3>
                    <p className="text-[#463E3E] font-bold text-xl mb-8"><span className="text-xs font-light tracking-widest mr-1">NT$</span>{item.price.toLocaleString()}</p>
                    <div className="w-full mb-8 text-left">
                      <label className="text-[9px] text-gray-400 tracking-[0.2em] uppercase mb-2 block ml-1 font-bold">服務加購 / 選項</label>
                      <select required className="w-full text-[11px] border border-[#EAE7E2] py-3 px-4 bg-[#FAF9F6] outline-none" defaultValue="">
                        <option value="" disabled>請選擇您的指甲現況</option>
                        <option value="none">不加購（純卸甲）</option>
                        {addons.map(a => (<option key={a.id} value={a.id}>{a.name} (+${a.price} / {a.duration}分)</option>))}
                      </select>
                    </div>
                    <a href="https://lin.ee/Nes3ZBI" target="_blank" rel="noopener noreferrer" className="bg-[#06C755] text-white px-8 py-3.5 rounded-full text-xs tracking-[0.2em] font-medium w-full flex justify-center items-center gap-2">
                      <MessageCircle size={16} fill="white" />立即 LINE 預約
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 管理彈窗保持不變... */}
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