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

// 這裡直接使用 export default function 確保導出成功
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
    } catch (err) { alert("操作失敗"); } finally { setIsUploading(false); }
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
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555]">
      {/* 導航欄 */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-[#EAE7E2]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <h1 className="text-xl tracking-[0.4em] font-light cursor-pointer" onClick={() => setActiveTab('home')}>UNIWAWA</h1>
          <div className="flex gap-6 text-sm tracking-widest font-medium uppercase">
            <button onClick={() => setActiveTab('home')} className={activeTab === 'home' ? 'text-[#C29591]' : ''}>首頁</button>
            <button onClick={() => setActiveTab('catalog')} className={activeTab === 'catalog' ? 'text-[#C29591]' : ''}>款式</button>
            {isLoggedIn ? (
              <button onClick={() => setIsAddonManagerOpen(true)} className="text-[#C29591]"><Settings size={18}/></button>
            ) : (
              <button onClick={() => setIsAdminModalOpen(true)} className="text-gray-300"><Lock size={14}/></button>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-20">
        {activeTab === 'home' ? (
          <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-6 text-center">
            <div className="w-full max-w-3xl mb-10 shadow-2xl overflow-hidden">
              <img src="https://drive.google.com/thumbnail?id=1ZJv3DS8ST_olFt0xzKB_miK9UKT28wMO&sz=w1200" className="w-full h-auto max-h-[55vh] object-cover" alt="Home" />
            </div>
            <h2 className="text-3xl md:text-4xl font-light mb-10 tracking-[0.3em] text-[#463E3E]">Beyond<br/>Expectation</h2>
            <button onClick={() => setActiveTab('catalog')} className="bg-[#463E3E] text-white px-14 py-4 tracking-widest text-sm shadow-xl">進入作品集</button>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-6 py-12">
            {/* 篩選按鈕：手機版一種類別佔一行 */}
            <div className="flex flex-col md:flex-row justify-center gap-10 mb-16 border-b pb-10">
              {[{ label: 'Style / 風格', list: STYLE_CATEGORIES, state: styleFilter, set: setStyleFilter },
                { label: 'Price / 預算', list: PRICE_CATEGORIES, state: priceFilter, set: setPriceFilter }].map((group, idx) => (
                <div key={idx} className="flex flex-col items-center gap-3">
                  <span className="text-[10px] tracking-widest text-gray-400 font-bold uppercase">{group.label}</span>
                  <div className="flex flex-wrap justify-center gap-2">
                    {group.list.map(c => (
                      <button key={c} onClick={() => group.set(c)} className={`px-3 py-1 text-xs tracking-widest border-b-2 transition-all ${group.state === c ? 'border-[#463E3E] text-[#463E3E]' : 'border-transparent text-gray-300'}`}>{c}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* 商品網格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              {filteredItems.map(item => (
                <div key={item.id} className="bg-white border border-[#EAE7E2] flex flex-col shadow-sm">
                  <div className="aspect-[3/4] overflow-hidden relative">
                    <img src={item.images?.[0]} className="w-full h-full object-cover" alt={item.title} />
                    {isLoggedIn && (
                      <button onClick={() => {setEditingItem(item); setFormData(item); setIsUploadModalOpen(true);}} className="absolute top-4 right-4 p-2 bg-white/90 rounded-full text-blue-600"><Edit3 size={16}/></button>
                    )}
                  </div>
                  <div className="p-8 flex flex-col items-center text-center">
                    <h3 className="text-[#463E3E] font-medium text-lg tracking-widest mb-1">{item.title}</h3>
                    <div className="flex items-center gap-1 text-gray-400 text-xs mb-2">
                      <Clock size={12} /> 製作: {item.duration || '--'} 分
                    </div>
                    <p className="text-[#C29591] font-bold mb-6">NT$ {item.price}</p>
                    
                    <div className="w-full mb-6 text-left">
                      <label className="text-[9px] text-gray-400 tracking-widest uppercase mb-1 block">服務選項 (必選)</label>
                      <select required className="w-full text-[11px] border py-2.5 px-3 bg-[#FAF9F6]" defaultValue="">
                        <option value="" disabled>請選擇加購項目</option>
                        <option value="none">不加購，僅施作此款式</option>
                        {addons.map(a => <option key={a.id} value={a.id}>{a.name} (+${a.price})</option>)}
                      </select>
                    </div>

                    <a href="https://lin.ee/Nes3ZBI" target="_blank" rel="noopener noreferrer" className="bg-[#06C755] text-white px-8 py-3 rounded-full text-xs tracking-widest w-full flex justify-center items-center gap-2">
                      <MessageCircle size={14} /> 預約諮詢
                    </a>
                  </div>
                </div>
              ))}
              {isLoggedIn && (
                <div onClick={() => setIsUploadModalOpen(true)} className="border-2 border-dashed border-gray-200 aspect-[3/4] flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 text-gray-300">
                  <Plus size={48} />
                  <span className="mt-2 text-sm">新增款式</span>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 管理彈窗 */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white p-10 max-w-sm w-full shadow-2xl">
            <h3 className="text-center tracking-widest mb-8 font-light">ADMIN LOGIN</h3>
            <input type="password" placeholder="密碼" className="w-full border-b py-3 text-center mb-6" onChange={e => setPasswordInput(e.target.value)} />
            <button className="w-full bg-[#463E3E] text-white py-4" onClick={() => { if(passwordInput==="8888") setIsLoggedIn(true); setIsAdminModalOpen(false); }}>登入</button>
          </div>
        </div>
      )}
    </div>
  );
}