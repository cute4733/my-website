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
  
  // 雙重篩選狀態
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
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555] font-sans selection:bg-[#C29591] selection:text-white">
      {/* 導航 */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-[#EAE7E2]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <h1 className="text-xl tracking-[0.4em] font-light cursor-pointer text-[#463E3E]" onClick={() => setActiveTab('home')}>UNIWAWA</h1>
          <div className="flex gap-8 text-sm tracking-widest font-medium">
            <button onClick={() => setActiveTab('home')} className={activeTab === 'home' ? 'text-[#C29591]' : 'hover:text-[#C29591] transition-colors'}>首頁</button>
            <button onClick={() => setActiveTab('catalog')} className={activeTab === 'catalog' ? 'text-[#C29591]' : 'hover:text-[#C29591] transition-colors'}>款式</button>
            {isLoggedIn ? (
              <button onClick={() => setIsUploadModalOpen(true)} className="text-[#C29591] flex items-center gap-1"><Plus size={14}/> 新增</button>
            ) : (
              <button onClick={() => setIsAdminModalOpen(true)} className="text-gray-300 hover:text-[#C29591] transition-colors"><Lock size={14}/></button>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-20 max-w-7xl mx-auto px-6">
        {activeTab === 'home' ? (
          <div className="flex flex-col items-center animate-fade-in min-h-[85vh] justify-center">
            <span className="text-[#C29591] tracking-[0.5em] text-xs mb-4 uppercase">Est. 2025 • Taipei</span>
            
            {/* 首圖高度優化 */}
            <div className="w-full max-w-3xl mb-8 shadow-2xl rounded-sm overflow-hidden border border-[#EAE7E2]">
              <img 
                src="https://drive.google.com/thumbnail?id=1ZJv3DS8ST_olFt0xzKB_miK9UKT28wMO&sz=w1200" 
                className="w-full h-auto max-h-[55vh] object-cover" 
                alt="UNIWAWA Hero" 
              />
            </div>

            <h2 className="text-4xl md:text-6xl font-light mb-10 tracking-[0.2em] text-[#463E3E] text-center leading-tight">Beyond<br/>Expectation</h2>
            
            <button 
              onClick={() => setActiveTab('catalog')} 
              className="bg-[#463E3E] text-[#FAF9F6] px-14 py-4 hover:bg-[#C29591] transition-all tracking-[0.2em] text-sm shadow-xl"
            >
              進入作品集
            </button>
          </div>
        ) : (
          <div>
            {/* 雙重篩選索引 */}
            <div className="space-y-6 mb-12 border-b pb-8 border-[#EAE7E2]">
              <div className="flex items-center gap-4 flex-wrap justify-center">
                <span className="text-[10px] tracking-widest text-gray-400 uppercase">Style / 風格</span>
                {STYLE_CATEGORIES.map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setStyleFilter(cat)} 
                    className={`px-4 py-1 text-xs tracking-widest border-b-2 transition-all ${styleFilter === cat ? 'border-[#463E3E] text-[#463E3E]' : 'border-transparent text-gray-300 hover:text-gray-500'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4 flex-wrap justify-center">
                <span className="text-[10px] tracking-widest text-gray-400 uppercase">Price / 預算</span>
                {PRICE_CATEGORIES.map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setPriceFilter(cat)} 
                    className={`px-4 py-1 text-xs tracking-widest border-b-2 transition-all ${priceFilter === cat ? 'border-[#C29591] text-[#C29591]' : 'border-transparent text-gray-300 hover:text-gray-500'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* 款式列表 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              {filteredItems.map(item => (
                <div key={item.id} className="group bg-white border border-[#EAE7E2] overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
                  <div className="aspect-[3/4] overflow-hidden bg-[#F9F8F6] relative">
                    <img 
                      src={item.images?.[0]} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                      alt={item.title} 
                    />
                    {isLoggedIn && (
                      <div className="absolute top-4 right-4 flex gap-2">
                        <button onClick={() => {setEditingItem(item); setFormData(item); setIsUploadModalOpen(true);}} className="p-2 bg-white/90 rounded-full text-blue-600 shadow-md hover:bg-blue-600 hover:text-white transition-colors"><Edit3 size={16}/></button>
                        <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', item.id))} className="p-2 bg-white/90 rounded-full text-red-600 shadow-md hover:bg-red-600 hover:text-white transition-colors"><Trash2 size={16}/></button>
                      </div>
                    )}
                  </div>
                  <div className="p-8 text-center flex-grow flex flex-col items-center">
                    <span className="text-[10px] text-[#C29591] tracking-[0.3em] uppercase mb-2">{item.category}</span>
                    <h3 className="text-[#463E3E] font-medium text-lg tracking-widest mb-1">{item.title}</h3>
                    <p className="text-[#C29591] font-bold mb-6">NT$ {item.price}</p>
                    
                    {/* LINE 預約按鈕 */}
                    <a 
                      href="https://lin.ee/Nes3ZBI" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="mt-auto flex items-center gap-2 bg-[#06C755] text-white px-8 py-2.5 rounded-full text-xs tracking-[0.2em] hover:bg-[#05a346] transition-colors shadow-lg font-medium"
                    >
                      <MessageCircle size={14} /> 預約諮詢
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 登入彈窗 */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-10 max-w-sm w-full shadow-2xl rounded-sm">
            <h3 className="text-center tracking-widest mb-8 font-light text-lg">管理員登入</h3>
            <form onSubmit={(e) => {e.preventDefault(); if(passwordInput==="8888") { setIsLoggedIn(true); setIsAdminModalOpen(false); } else { alert("密碼錯誤"); } }} className="space-y-6">
              <input type="password" placeholder="PASSWORD" className="w-full border-b py-3 text-center tracking-[1em] focus:outline-none focus:border-[#C29591]" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} autoFocus />
              <button className="w-full bg-[#463E3E] text-white py-4 hover:bg-[#C29591] transition-colors tracking-widest">確認</button>
            </form>
          </div>
        </div>
      )}

      {/* 新增/編輯 彈窗 */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white p-8 max-w-md w-full shadow-2xl my-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="tracking-widest font-light text-lg">{editingItem ? '修改款式' : '發布新款'}</h3>
              <button onClick={closeModal}><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-[10px] text-gray-400 tracking-widest uppercase mb-1 block">款式名稱</label>
                <input type="text" className="w-full border-b py-2 focus:outline-none focus:border-[#C29591]" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="例如: 琥珀美學" required />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 tracking-widest uppercase mb-1 block">價格</label>
                <input type="number" className="w-full border-b py-2 focus:outline-none focus:border-[#C29591]" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="1680" required />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 tracking-widest uppercase mb-1 block">風格分類</label>
                <select className="w-full border-b py-2 bg-transparent" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  {STYLE_CATEGORIES.filter(c => c !== '全部').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {!editingItem && (
                <div>
                  <label className="text-[10px] text-gray-400 tracking-widest uppercase mb-1 block">照片 (可多選)</label>
                  <input type="file" multiple className="text-[10px] mt-2" onChange={(e) => {
                    Array.from(e.target.files).forEach(file => {
                      const reader = new FileReader();
                      reader.onloadend = () => setFormData(prev => ({...prev, images: [...prev.images, reader.result]}));
                      reader.readAsDataURL(file);
                    });
                  }} />
                </div>
              )}
              <button disabled={isUploading} className="w-full bg-[#463E3E] text-white py-4 mt-6 hover:bg-[#C29591] transition-all tracking-widest shadow-lg">
                {isUploading ? '處理中...' : (editingItem ? '儲存修改' : '確認發布')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;