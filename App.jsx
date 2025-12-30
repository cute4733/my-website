import React, { useState, useEffect } from 'react';
import { Plus, X, Lock, Trash2, Edit3, MessageCircle, Settings, Clock } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';

// --- Firebase 初始化 (保持與您專案一致) ---
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
  
  // Modals 控制
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAddonManagerOpen, setIsAddonManagerOpen] = useState(false);
  
  // 狀態管理
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
    } catch (err) { alert("儲存失敗"); } finally { setIsUploading(false); }
  };

  const handleAddAddon = async () => {
    if (!newAddon.name || !newAddon.price) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'addons'), {
      ...newAddon, price: Number(newAddon.price), duration: Number(newAddon.duration)
    });
    setNewAddon({ name: '', price: '', duration: '' });
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
      {/* 導航欄 */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-[#EAE7E2]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <h1 className="text-xl tracking-[0.4em] font-light cursor-pointer text-[#463E3E]" onClick={() => setActiveTab('home')}>UNIWAWA</h1>
          <div className="flex gap-6 text-sm tracking-widest font-medium uppercase">
            <button onClick={() => setActiveTab('home')} className={activeTab === 'home' ? 'text-[#C29591]' : 'hover:text-[#C29591] transition-colors'}>首頁</button>
            <button onClick={() => setActiveTab('catalog')} className={activeTab === 'catalog' ? 'text-[#C29591]' : 'hover:text-[#C29591] transition-colors'}>款式</button>
            {isLoggedIn && <button onClick={() => setIsAddonManagerOpen(true)} className="text-[#C29591]"><Settings size={18}/></button>}
            {!isLoggedIn && <button onClick={() => setIsAdminModalOpen(true)} className="text-gray-300"><Lock size={14}/></button>}
          </div>
        </div>
      </nav>

      <main className="pt-20">
        {activeTab === 'home' ? (
          /* 首頁區塊 */
          <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-6 text-center">
            <span className="text-[#C29591] tracking-[0.5em] text-[10px] mb-6 uppercase">Est. 2025 • Taipei</span>
            <div className="w-full max-w-2xl mb-12 shadow-2xl rounded-sm overflow-hidden border border-[#EAE7E2]">
              <img src="https://drive.google.com/thumbnail?id=1ZJv3DS8ST_olFt0xzKB_miK9UKT28wMO&sz=w1200" className="w-full h-auto object-cover" alt="Banner" />
            </div>
            <h2 className="text-3xl md:text-4xl font-light mb-12 tracking-[0.3em] text-[#463E3E] leading-relaxed italic">Beyond Expectation</h2>
            <button onClick={() => setActiveTab('catalog')} className="bg-[#463E3E] text-white px-16 py-4 hover:bg-[#C29591] transition-all tracking-[0.3em] text-xs shadow-xl">進入作品集</button>
          </div>
        ) : (
          /* 商品目錄區塊 */
          <div className="max-w-7xl mx-auto px-6 py-12">
            {/* 篩選按鈕 */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-10 mb-20 border-b pb-12 border-[#EAE7E2]">
              <div className="flex flex-col items-center gap-4">
                <span className="text-[10px] tracking-[0.3em] text-gray-400 font-bold uppercase">Style / 風格細分</span>
                <div className="flex flex-wrap justify-center gap-3">
                  {STYLE_CATEGORIES.map(c => (
                    <button key={c} onClick={() => setStyleFilter(c)} className={`px-4 py-1.5 text-xs tracking-widest border-b transition-all ${styleFilter === c ? 'border-[#463E3E] text-[#463E3E]' : 'border-transparent text-gray-300 hover:text-gray-500'}`}>{c}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* 商品網格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16">
              {filteredItems.map(item => (
                <div key={item.id} className="group flex flex-col bg-white border border-[#F0EDEA] shadow-sm hover:shadow-md transition-shadow">
                  {/* 圖片區 */}
                  <div className="aspect-[3/4] overflow-hidden relative">
                    <img src={item.images?.[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={item.title} />
                    {isLoggedIn && (
                      <div className="absolute top-4 right-4 flex gap-2">
                        <button onClick={() => {setEditingItem(item); setFormData(item); setIsUploadModalOpen(true);}} className="p-2 bg-white/90 rounded-full text-blue-600 shadow-sm hover:bg-white"><Edit3 size={16}/></button>
                        <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', item.id))} className="p-2 bg-white/90 rounded-full text-red-600 shadow-sm hover:bg-white"><Trash2 size={16}/></button>
                      </div>
                    )}
                  </div>

                  {/* 資訊區 */}
                  <div className="p-8 flex flex-col items-center text-center">
                    <span className="text-[10px] text-[#C29591] tracking-[0.4em] uppercase mb-2 font-medium">{item.category}</span>
                    <h3 className="text-[#463E3E] font-medium text-lg tracking-widest mb-2">{item.title}</h3>
                    
                    <div className="flex items-center gap-1.5 text-gray-400 text-[11px] mb-4 tracking-wider">
                      <Clock size={13} className="text-gray-300" />
                      <span>基本製作：{item.duration || '90'} 分鐘</span>
                    </div>

                    <div className="w-8 h-[1px] bg-[#EAE7E2] mb-5"></div>
                    
                    <p className="text-[#463E3E] font-bold text-xl tracking-tighter mb-8">
                      <span className="text-xs font-light tracking-widest mr-1">NT$</span>{item.price.toLocaleString()}
                    </p>
                    
                    {/* 加購選單區 */}
                    <div className="w-full mb-8 text-left">
                      <label className="text-[9px] text-gray-400 tracking-[0.2em] uppercase mb-2 block ml-1 font-bold">服務加購 / 選項 (必選)</label>
                      <select 
                        required 
                        className="w-full text-[11px] border border-[#EAE7E2] py-3 px-4 bg-[#FAF9F6] text-[#5C5555] focus:outline-none focus:border-[#C29591] transition-colors appearance-none cursor-pointer"
                        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23C29591\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center' }}
                        defaultValue=""
                      >
                        <option value="" disabled>請選擇您的指甲現況</option>
                        <option value="none">不加購（僅施作此款式）</option>
                        {addons.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.name} (+${a.price} / {a.duration}分)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* LINE 預約按鈕 */}
                    <a 
                      href="https://lin.ee/Nes3ZBI" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="group/btn relative bg-[#06C755] text-white px-8 py-3.5 rounded-full text-xs tracking-[0.2em] font-medium w-full flex justify-center items-center gap-2 overflow-hidden hover:bg-[#05b34c] transition-colors shadow-lg shadow-green-100"
                    >
                      <MessageCircle size={16} fill="white" />
                      立即 LINE 預約諮詢
                    </a>
                  </div>
                </div>
              ))}

              {/* 管理員新增按鈕 */}
              {isLoggedIn && (
                <div 
                  onClick={() => setIsUploadModalOpen(true)}
                  className="border-2 border-dashed border-[#EAE7E2] aspect-[3/4] flex flex-col items-center justify-center cursor-pointer hover:bg-white hover:border-[#C29591] transition-all text-gray-300 hover:text-[#C29591]"
                >
                  <Plus size={48} strokeWidth={1} />
                  <span className="mt-4 text-xs tracking-[0.3em] uppercase">發布新款式</span>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* --- Modals (保持功能一致，僅優化 UI) --- */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white p-10 max-w-sm w-full shadow-2xl rounded-sm">
            <h3 className="text-center tracking-[0.5em] mb-10 font-light text-gray-400 text-sm">ADMIN ACCESS</h3>
            <form onSubmit={(e) => { e.preventDefault(); if(passwordInput==="8888") setIsLoggedIn(true); setIsAdminModalOpen(false); }}>
              <input 
                type="password" 
                placeholder="••••" 
                className="w-full border-b border-[#EAE7E2] py-4 text-center tracking-[1.5em] mb-10 focus:outline-none focus:border-[#C29591]" 
                onChange={e => setPasswordInput(e.target.value)} 
                autoFocus 
              />
              <button className="w-full bg-[#463E3E] text-white py-4 tracking-[0.3em] text-xs hover:bg-[#C29591] transition-all">ENTER SYSTEM</button>
            </form>
          </div>
        </div>
      )}

      {/* 加購管理彈窗 */}
      {isAddonManagerOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white p-8 max-w-md w-full shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8 border-b pb-4">
              <h3 className="tracking-widest font-light">全局加購服務管理</h3>
              <button onClick={() => setIsAddonManagerOpen(false)}><X size={20}/></button>
            </div>
            <div className="bg-[#FAF9F6] p-6 rounded-sm mb-8 space-y-4">
              <input type="text" placeholder="服務名稱 (如: 卸甲、延甲)" className="w-full border-b bg-transparent py-2 text-sm focus:outline-none" value={newAddon.name} onChange={e => setNewAddon({...newAddon, name: e.target.value})} />
              <div className="flex gap-4">
                <input type="number" placeholder="加購價" className="w-1/2 border-b bg-transparent py-2 text-sm focus:outline-none" value={newAddon.price} onChange={e => setNewAddon({...newAddon, price: e.target.value})} />
                <input type="number" placeholder="時長(分)" className="w-1/2 border-b bg-transparent py-2 text-sm focus:outline-none" value={newAddon.duration} onChange={e => setNewAddon({...newAddon, duration: e.target.value})} />
              </div>
              <button onClick={handleAddAddon} className="w-full bg-[#C29591] text-white py-3 text-xs tracking-widest mt-2">新增項目</button>
            </div>
            <div className="divide-y border-t">
              {addons.map(a => (
                <div key={a.id} className="py-4 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-sm text-[#463E3E]">{a.name}</span>
                    <span className="text-[10px] text-gray-400 tracking-widest">+${a.price} / {a.duration}min</span>
                  </div>
                  <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'addons', a.id))} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 款式上傳彈窗 */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="tracking-widest font-light">{editingItem ? '修改現有款式' : '發布新款設計'}</h3>
              <button onClick={() => { setIsUploadModalOpen(false); setEditingItem(null); }}><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <input type="text" className="w-full border-b py-2 focus:outline-none focus:border-[#C29591]" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="款式名稱" required />
              <div className="flex gap-6">
                <div className="w-1/2">
                  <label className="text-[10px] text-gray-400 tracking-widest uppercase mb-1 block">基礎定價</label>
                  <input type="number" className="w-full border-b py-2" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="1600" required />
                </div>
                <div className="w-1/2">
                  <label className="text-[10px] text-gray-400 tracking-widest uppercase mb-1 block">預計時長(分)</label>
                  <input type="number" className="w-full border-b py-2" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} placeholder="90" required />
                </div>
              </div>
              <select className="w-full border-b py-2 bg-transparent" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                {STYLE_CATEGORIES.filter(c => c !== '全部').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {!editingItem && (
                <div className="mt-2">
                  <label className="text-[10px] text-gray-400 tracking-widest uppercase mb-2 block">上傳照片</label>
                  <input type="file" multiple className="text-[10px]" onChange={(e) => {
                    Array.from(e.target.files).forEach(file => {
                      const reader = new FileReader();
                      reader.onloadend = () => setFormData(prev => ({...prev, images: [...prev.images, reader.result]}));
                      reader.readAsDataURL(file);
                    });
                  }} />
                </div>
              )}
              <button disabled={isUploading} className="w-full bg-[#463E3E] text-white py-4 mt-4 hover:bg-[#C29591] tracking-[0.3em] text-xs transition-all">
                {isUploading ? '正在儲存至雲端...' : '確認發布'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}