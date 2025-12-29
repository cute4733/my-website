import React, { useState, useEffect } from 'react';
import { Plus, X, Image as ImageIcon, Lock, Trash2, Edit3, MessageCircle } from 'lucide-react';

// --- Firebase 初始化 ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBkFqTUwtC7MqZ6h4--2_1BmldXEg-Haiw",
  authDomain: "uniwawa-beauty.firebaseapp.com",
  projectId: "uniwawa-beauty",
  storageBucket: "uniwawa-beauty.firebasestorage.app",
  messagingSenderId: "1009617609234",
  appId: "1:1009617609234:web:3cb5466e79a81c1f1aaecb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'uniwawa01';

const STYLE_CATEGORIES = ['全部', '極簡氣質', '華麗鑽飾', '藝術手繪', '日系暈染', '貓眼系列'];
const PRICE_CATEGORIES = ['全部', '1300以下', '1300-1900', '1900以上'];

const App = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cloudItems, setCloudItems] = useState([]);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [styleFilter, setStyleFilter] = useState('全部');
  const [priceFilter, setPriceFilter] = useState('全部');
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({ title: '', price: '', category: '極簡氣質', images: [] });

  useEffect(() => {
    signInAnonymously(auth);
    onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCloudItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      const payload = { ...formData, price: Number(formData.price) };
      if (editingItem) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', editingItem.id), payload);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), { ...payload, createdAt: serverTimestamp() });
      }
      closeModal();
    } catch (err) { alert("操作失敗"); } finally { setIsUploading(false); }
  };

  const closeModal = () => {
    setIsUploadModalOpen(false);
    setEditingItem(null);
    setFormData({ title: '', price: '', category: '極簡氣質', images: [] });
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
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-lg tracking-[0.4em] font-light cursor-pointer text-[#463E3E]" onClick={() => setActiveTab('home')}>UNIWAWA</h1>
          <div className="flex gap-6 text-xs tracking-widest font-medium uppercase">
            <button onClick={() => setActiveTab('home')} className={activeTab === 'home' ? 'text-[#C29591]' : ''}>首頁</button>
            <button onClick={() => setActiveTab('catalog')} className={activeTab === 'catalog' ? 'text-[#C29591]' : ''}>款式</button>
            {isLoggedIn ? (
              <button onClick={() => setIsUploadModalOpen(true)} className="text-[#C29591] flex items-center gap-1"><Plus size={12}/> 新增</button>
            ) : (
              <button onClick={() => setIsAdminModalOpen(true)} className="text-gray-200"><Lock size={12}/></button>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-16">
        {activeTab === 'home' ? (
          <div className="h-[calc(100vh-64px)] w-full flex flex-col items-center justify-center px-6 animate-fade-in text-center overflow-hidden">
            <span className="text-[#C29591] tracking-[0.5em] text-[10px] mb-3 uppercase">Est. 2025 • Taipei</span>
            
            {/* 針對手機優化的首圖：高度動態縮放 */}
            <div className="w-full max-w-md mb-6 shadow-xl rounded-sm overflow-hidden border border-[#EAE7E2]">
              <img 
                src="https://drive.google.com/thumbnail?id=1ZJv3DS8ST_olFt0xzKB_miK9UKT28wMO&sz=w1200" 
                className="w-full h-auto max-h-[35vh] md:max-h-[45vh] object-cover" 
                alt="UNIWAWA" 
              />
            </div>

            <h2 className="text-2xl md:text-4xl font-light mb-6 tracking-[0.3em] text-[#463E3E] leading-snug">
              Beyond<br/>Expectation
            </h2>
            
            <button 
              onClick={() => setActiveTab('catalog')} 
              className="bg-[#463E3E] text-[#FAF9F6] px-10 py-3 hover:bg-[#C29591] transition-all tracking-[0.2em] text-xs shadow-lg"
            >
              進入作品集
            </button>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-6 py-10 animate-fade-in">
            {/* 篩選與列表維持原本的高級排版 */}
            <div className="space-y-4 mb-10 border-b pb-8 border-[#EAE7E2]">
              <div className="flex items-center gap-3 flex-wrap justify-center text-[10px] tracking-widest text-gray-400">
                <span>STYLE / 風格</span>
                {STYLE_CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setStyleFilter(cat)} className={`px-2 py-1 border-b ${styleFilter === cat ? 'border-[#463E3E] text-[#463E3E]' : 'border-transparent text-gray-300'}`}>{cat}</button>
                ))}
              </div>
              <div className="flex items-center gap-3 flex-wrap justify-center text-[10px] tracking-widest text-gray-400">
                <span>PRICE / 預算</span>
                {PRICE_CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setPriceFilter(cat)} className={`px-2 py-1 border-b ${priceFilter === cat ? 'border-[#C29591] text-[#C29591]' : 'border-transparent text-gray-300'}`}>{cat}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredItems.map(item => (
                <div key={item.id} className="group bg-white border border-[#EAE7E2] overflow-hidden flex flex-col shadow-sm">
                  <div className="aspect-[3/4] overflow-hidden relative">
                    <img src={item.images?.[0]} className="w-full h-full object-cover" alt={item.title} />
                    {isLoggedIn && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button onClick={() => {setEditingItem(item); setFormData(item); setIsUploadModalOpen(true);}} className="p-1.5 bg-white/90 rounded-full text-blue-600 shadow-sm"><Edit3 size={14}/></button>
                        <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', item.id))} className="p-1.5 bg-white/90 rounded-full text-red-600 shadow-sm"><Trash2 size={14}/></button>
                      </div>
                    )}
                  </div>
                  <div className="p-6 text-center flex-grow flex flex-col items-center">
                    <span className="text-[9px] text-[#C29591] tracking-[0.2em] uppercase mb-1">{item.category}</span>
                    <h3 className="text-[#463E3E] font-medium text-base tracking-widest mb-1">{item.title}</h3>
                    <p className="text-[#C29591] font-bold text-sm mb-4">NT$ {item.price}</p>
                    <a href="https://lin.ee/Nes3ZBI" target="_blank" rel="noopener noreferrer" className="mt-auto flex items-center gap-2 bg-[#06C755] text-white px-6 py-2 rounded-full text-[10px] tracking-widest hover:bg-[#05a346] shadow-md transition-colors font-medium">
                      <MessageCircle size={12} /> 預約諮詢
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 登入 Modal (不變) */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 text-center">
          <div className="bg-white p-8 max-w-xs w-full shadow-2xl rounded-sm">
            <h3 className="tracking-widest mb-6 font-light text-sm">管理員登入</h3>
            <form onSubmit={(e) => {e.preventDefault(); if(passwordInput==="8888") { setIsLoggedIn(true); setIsAdminModalOpen(false); } else { alert("錯誤"); } }} className="space-y-4">
              <input type="password" placeholder="PASSWORD" className="w-full border-b py-2 text-center tracking-[0.5em] focus:outline-none focus:border-[#C29591] text-sm" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} autoFocus />
              <button className="w-full bg-[#463E3E] text-white py-3 hover:bg-[#C29591] text-xs tracking-widest">確認</button>
            </form>
          </div>
        </div>
      )}

      {/* 上傳 Modal (不變) */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white p-6 max-w-sm w-full shadow-2xl my-auto">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="tracking-widest font-light text-sm">{editingItem ? '修改' : '發布'}</h3>
              <button onClick={closeModal}><X size={16}/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="text" className="w-full border-b py-2 focus:outline-none text-sm" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="款式名稱" required />
              <input type="number" className="w-full border-b py-2 focus:outline-none text-sm" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="價格" required />
              <select className="w-full border-b py-2 bg-transparent text-sm" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                {STYLE_CATEGORIES.filter(c => c !== '全部').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {!editingItem && <input type="file" multiple className="text-[10px]" onChange={(e) => {
                Array.from(e.target.files).forEach(file => {
                  const reader = new FileReader();
                  reader.onloadend = () => setFormData(prev => ({...prev, images: [...prev.images, reader.result]}));
                  reader.readAsDataURL(file);
                });
              }} />}
              <button disabled={isUploading} className="w-full bg-[#463E3E] text-white py-3 mt-4 text-xs tracking-widest">
                {isUploading ? '處理中...' : '確認'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;