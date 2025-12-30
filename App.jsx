import React, { useState, useEffect } from 'react';
import { Plus, X, Image as ImageIcon, Lock, Trash2, Edit3, MessageCircle, Settings, Clock, Check } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';

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

const App = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cloudItems, setCloudItems] = useState([]);
  const [addons, setAddons] = useState([]);
  
  // 紀錄每一件商品的加購選擇狀態 { itemId: [addonId1, addonId2] }
  const [selectedAddons, setSelectedAddons] = useState({});
  
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
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs');
    const unsubscribeItems = onSnapshot(q, (snapshot) => {
      setCloudItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const qAddons = collection(db, 'artifacts', appId, 'public', 'data', 'addons');
    const unsubscribeAddons = onSnapshot(qAddons, (snapshot) => {
      setAddons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubscribeItems(); unsubscribeAddons(); };
  }, [user]);

  const toggleAddon = (itemId, addon) => {
    const currentSelected = selectedAddons[itemId] || [];
    const isSelected = currentSelected.find(a => a.id === addon.id);
    
    if (isSelected) {
      setSelectedAddons({ ...selectedAddons, [itemId]: currentSelected.filter(a => a.id !== addon.id) });
    } else {
      setSelectedAddons({ ...selectedAddons, [itemId]: [...currentSelected, addon] });
    }
  };

  const calculateTotal = (item) => {
    const selected = selectedAddons[item.id] || [];
    const extraPrice = selected.reduce((sum, a) => sum + Number(a.price), 0);
    const extraTime = selected.reduce((sum, a) => sum + Number(a.duration), 0);
    return {
      price: item.price + extraPrice,
      duration: (Number(item.duration) || 0) + extraTime,
      addonNames: selected.map(a => a.name).join('、')
    };
  };

  const getLineLink = (item) => {
    const { price, duration, addonNames } = calculateTotal(item);
    const message = `您好，我想預約：\n【款式】${item.title}\n【加購】${addonNames || '無'}\n【預計總額】NT$ ${price}\n【預計工時】約 ${duration} 分鐘\n請協助確認空檔，謝謝！`;
    return `https://line.me/R/oaMessage/@Nes3ZBI/?${encodeURIComponent(message)}`;
  };

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
      closeModal();
    } catch (err) { alert("操作失敗"); } finally { setIsUploading(false); }
  };

  const handleAddAddon = async () => {
    if (!newAddon.name || !newAddon.price) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'addons'), {
      ...newAddon,
      price: Number(newAddon.price),
      duration: Number(newAddon.duration)
    });
    setNewAddon({ name: '', price: '', duration: '' });
  };

  const closeModal = () => {
    setIsUploadModalOpen(false);
    setEditingItem(null);
    setFormData({ title: '', price: '', category: '極簡氣質', duration: '90', images: [] });
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
          <h1 className="text-xl tracking-[0.4em] font-light cursor-pointer text-[#463E3E]" onClick={() => setActiveTab('home')}>UNIWAWA</h1>
          <div className="flex gap-6 text-sm tracking-widest font-medium uppercase">
            <button onClick={() => setActiveTab('home')} className={activeTab === 'home' ? 'text-[#C29591]' : ''}>首頁</button>
            <button onClick={() => setActiveTab('catalog')} className={activeTab === 'catalog' ? 'text-[#C29591]' : ''}>款式</button>
            {isLoggedIn && (
              <div className="flex gap-4 border-l pl-4 border-gray-200">
                <button onClick={() => setIsUploadModalOpen(true)} className="text-[#C29591] flex items-center gap-1 text-xs"><Plus size={14}/> 款式</button>
                <button onClick={() => setIsAddonManagerOpen(true)} className="text-[#C29591] flex items-center gap-1 text-xs"><Settings size={14}/> 加購項目</button>
              </div>
            )}
            {!isLoggedIn && <button onClick={() => setIsAdminModalOpen(true)} className="text-gray-300 hover:text-gray-500 transition-colors"><Lock size={14}/></button>}
          </div>
        </div>
      </nav>

      <main className="pt-20">
        {activeTab === 'home' ? (
          <div className="min-h-[calc(100vh-80px)] w-full flex flex-col items-center justify-center px-6 text-center">
            <span className="text-[#C29591] tracking-[0.5em] text-xs mb-6 uppercase">Est. 2025 • Taipei</span>
            <div className="w-full max-w-3xl mb-10 shadow-2xl rounded-sm overflow-hidden border border-[#EAE7E2]">
              <img src="https://drive.google.com/thumbnail?id=1ZJv3DS8ST_olFt0xzKB_miK9UKT28wMO&sz=w1200" className="w-full h-auto max-h-[40vh] md:max-h-[55vh] object-cover" alt="UNIWAWA" />
            </div>
            <h2 className="text-3xl md:text-4xl font-light mb-10 tracking-[0.3em] text-[#463E3E] leading-relaxed">Beyond<br/>Expectation</h2>
            <button onClick={() => setActiveTab('catalog')} className="bg-[#463E3E] text-[#FAF9F6] px-14 py-4 hover:bg-[#C29591] transition-all tracking-[0.2em] text-sm shadow-xl">進入作品集</button>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-6 py-12">
            {/* 篩選列 */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-center gap-8 mb-16 border-b pb-10 border-[#EAE7E2]">
              <div className="flex flex-col items-center gap-3">
                <span className="text-[10px] tracking-[0.3em] text-gray-400 uppercase font-bold">Style / 風格</span>
                <div className="flex flex-wrap justify-center gap-2 md:gap-4">
                  {STYLE_CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setStyleFilter(cat)} className={`px-3 py-1 text-xs tracking-widest border-b-2 transition-all ${styleFilter === cat ? 'border-[#463E3E] text-[#463E3E]' : 'border-transparent text-gray-300 hover:text-gray-400'}`}>{cat}</button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-center gap-3">
                <span className="text-[10px] tracking-[0.3em] text-gray-400 uppercase font-bold">Price / 預算</span>
                <div className="flex flex-wrap justify-center gap-2 md:gap-4">
                  {PRICE_CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setPriceFilter(cat)} className={`px-3 py-1 text-xs tracking-widest border-b-2 transition-all ${priceFilter === cat ? 'border-[#C29591] text-[#C29591]' : 'border-transparent text-gray-300 hover:text-gray-400'}`}>{cat}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* 商品網格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              {filteredItems.map(item => {
                const { price: totalPrice, duration: totalTime } = calculateTotal(item);
                const currentItemAddons = selectedAddons[item.id] || [];

                return (
                  <div key={item.id} className="group bg-white border border-[#EAE7E2] overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
                    <div className="aspect-[3/4] overflow-hidden relative">
                      <img src={item.images?.[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={item.title} />
                      {isLoggedIn && (
                        <div className="absolute top-4 right-4 flex gap-2">
                          <button onClick={() => {setEditingItem(item); setFormData(item); setIsUploadModalOpen(true);}} className="p-2 bg-white/90 rounded-full text-blue-600 shadow-md hover:bg-white"><Edit3 size={16}/></button>
                          <button onClick={() => {if(window.confirm('確定刪除？')) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', item.id))}} className="p-2 bg-white/90 rounded-full text-red-600 shadow-md hover:bg-white"><Trash2 size={16}/></button>
                        </div>
                      )}
                    </div>
                    <div className="p-8 flex-grow flex flex-col items-center">
                      <span className="text-[10px] text-[#C29591] tracking-[0.3em] uppercase mb-1">{item.category}</span>
                      <h3 className="text-[#463E3E] font-medium text-lg tracking-widest mb-1">{item.title}</h3>
                      
                      <div className="flex items-center gap-1 text-gray-400 text-[10px] mb-4 uppercase tracking-tighter">
                        <Clock size={10} /> <span>預計總時長: {totalTime} 分鐘</span>
                      </div>

                      <div className="text-xl font-bold text-[#463E3E] mb-6 tracking-tighter">NT$ {totalPrice}</div>
                      
                      {/* 多選加購區域 */}
                      <div className="w-full mb-8">
                        <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase mb-3 border-b border-gray-100 pb-1">加購服務選項</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {addons.map(addon => {
                            const isSelected = currentItemAddons.find(a => a.id === addon.id);
                            return (
                              <button 
                                key={addon.id} 
                                onClick={() => toggleAddon(item.id, addon)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] transition-all ${
                                  isSelected 
                                  ? 'bg-[#C29591] border-[#C29591] text-white shadow-sm' 
                                  : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                                }`}
                              >
                                {isSelected ? <Check size={10} /> : <Plus size={10} />}
                                {addon.name} (+${addon.price})
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <a 
                        href={getLineLink(item)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-auto w-full flex justify-center items-center gap-2 bg-[#06C755] text-white py-3.5 rounded-sm text-xs tracking-[0.2em] font-medium hover:brightness-105 transition-all shadow-lg active:scale-95"
                      >
                        <MessageCircle size={16} /> 即刻 Line 預約
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
            {filteredItems.length === 0 && (
              <div className="text-center py-20 text-gray-300 tracking-widest">目前沒有符合條件的款式</div>
            )}
          </div>
        )}
      </main>

      {/* 管理加購項目彈窗 (無變動) */}
      {isAddonManagerOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white p-8 max-w-md w-full shadow-2xl overflow-y-auto max-h-[80vh]">
            <div className="flex justify-between items-center mb-6 border-b pb-2">
              <h3 className="tracking-widest font-light uppercase text-sm">管理全局加購服務</h3>
              <button onClick={() => setIsAddonManagerOpen(false)}><X size={20}/></button>
            </div>
            
            <div className="space-y-3 mb-8 bg-gray-50 p-4 rounded-sm border border-gray-100">
              <input type="text" placeholder="服務名稱 (如: 卸甲)" className="w-full border-b bg-transparent py-2 text-sm focus:border-[#C29591] outline-none" value={newAddon.name} onChange={e => setNewAddon({...newAddon, name: e.target.value})} />
              <div className="flex gap-2">
                <input type="number" placeholder="加購價" className="w-1/2 border-b bg-transparent py-2 text-sm focus:border-[#C29591] outline-none" value={newAddon.price} onChange={e => setNewAddon({...newAddon, price: e.target.value})} />
                <input type="number" placeholder="增加時長(分)" className="w-1/2 border-b bg-transparent py-2 text-sm focus:border-[#C29591] outline-none" value={newAddon.duration} onChange={e => setNewAddon({...newAddon, duration: e.target.value})} />
              </div>
              <button onClick={handleAddAddon} className="w-full bg-[#C29591] text-white py-2 text-xs tracking-widest hover:brightness-105 transition-all">新增項目</button>
            </div>

            <div className="space-y-2">
              {addons.map(addon => (
                <div key={addon.id} className="flex justify-between items-center text-sm border-b py-3 border-gray-50">
                  <div className="flex flex-col">
                    <span className="font-medium">{addon.name}</span>
                    <span className="text-[10px] text-gray-400">+ ${addon.price} / {addon.duration} min</span>
                  </div>
                  <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'addons', addon.id))} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 新增/編輯 款式彈窗 (無變動) */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="tracking-widest font-light">{editingItem ? '修改款式資訊' : '發布全新設計'}</h3>
              <button onClick={closeModal}><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <input type="text" className="w-full border-b py-2 focus:border-black outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="款式名稱" required />
              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 block">基本定價</label>
                  <input type="number" className="w-full border-b py-2 outline-none focus:border-black" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="1680" required />
                </div>
                <div className="w-1/2">
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 block">基本工時 (分)</label>
                  <input type="number" className="w-full border-b py-2 outline-none focus:border-black" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} placeholder="90" required />
                </div>
              </div>
              <select className="w-full border-b py-2 bg-transparent outline-none focus:border-black" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                {STYLE_CATEGORIES.filter(c => c !== '全部').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {!editingItem && <div className="space-y-2">
                <label className="text-[10px] text-gray-400 uppercase tracking-widest block">作品圖片</label>
                <input type="file" multiple className="text-[10px] mt-2 block w-full" onChange={(e) => {
                  Array.from(e.target.files).forEach(file => {
                    const reader = new FileReader();
                    reader.onloadend = () => setFormData(prev => ({...prev, images: [...prev.images, reader.result]}));
                    reader.readAsDataURL(file);
                  });
                }} />
              </div>}
              <button disabled={isUploading} className="w-full bg-[#463E3E] text-white py-4 mt-6 hover:bg-black tracking-widest transition-all">
                {isUploading ? '正在發布中...' : editingItem ? '儲存變更' : '確認發布作品'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 登入彈窗 (密碼 8888) */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-10 max-w-sm w-full shadow-2xl rounded-sm">
            <h3 className="text-center tracking-widest mb-8 font-light text-sm uppercase">管理員權限登入</h3>
            <form onSubmit={(e) => {e.preventDefault(); if(passwordInput==="8888") { setIsLoggedIn(true); setIsAdminModalOpen(false); setPasswordInput(''); } else { alert("密碼錯誤"); } }} className="space-y-6">
              <input type="password" placeholder="ENTER PASSWORD" className="w-full border-b py-3 text-center tracking-[1em] focus:outline-none" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} autoFocus />
              <button className="w-full bg-[#463E3E] text-white py-4 tracking-widest hover:bg-black transition-all">Login</button>
              <button type="button" onClick={() => setIsAdminModalOpen(false)} className="w-full text-[10px] text-gray-300 tracking-widest uppercase">Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;