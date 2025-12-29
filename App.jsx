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

// 使用 export default function 確保導出成功
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
    const unsubscribeItems = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), (s) => {
      setCloudItems(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubscribeAddons = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'addons'), (s) => {
      setAddons(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubscribeItems(); unsubscribeAddons(); };
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

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555]">
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-[#EAE7E2]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <h1 className="text-xl tracking-[0.4em] font-light cursor-pointer" onClick={() => setActiveTab('home')}>UNIWAWA</h1>
          <div className="flex gap-6 text-sm uppercase tracking-widest font-medium">
            <button onClick={() => setActiveTab('home')} className={activeTab === 'home' ? 'text-[#C29591]' : ''}>首頁</button>
            <button onClick={() => setActiveTab('catalog')} className={activeTab === 'catalog' ? 'text-[#C29591]' : ''}>款式</button>
            {isLoggedIn ? (
              <button onClick={() => setIsAddonManagerOpen(true)} className="text-[#C29591]"><Settings size={14}/></button>
            ) : (
              <button onClick={() => setIsAdminModalOpen(true)} className="text-gray-300"><Lock size={14}/></button>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-20">
        {activeTab === 'home' ? (
          <div className="h-[80vh] flex flex-col items-center justify-center text-center px-6">
            <h2 className="text-3xl md:text-4xl font-light mb-10 tracking-[0.3em] text-[#463E3E]">Beyond<br/>Expectation</h2>
            <button onClick={() => setActiveTab('catalog')} className="bg-[#463E3E] text-white px-12 py-4 tracking-widest text-sm">進入作品集</button>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-6 py-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {cloudItems.map(item => (
                <div key={item.id} className="border border-[#EAE7E2] p-6 bg-white">
                  <img src={item.images?.[0]} className="w-full aspect-[3/4] object-cover mb-4" />
                  <h3 className="text-lg tracking-widest mb-1">{item.title}</h3>
                  <p className="text-[#C29591] font-bold mb-4">NT$ {item.price}</p>
                  
                  {/* 加購選單 */}
                  <select required className="w-full border p-2 text-xs mb-4 outline-none" defaultValue="">
                    <option value="" disabled>請選擇加購項目</option>
                    <option value="none">不加購</option>
                    {addons.map(a => <option key={a.id} value={a.id}>{a.name} (+${a.price})</option>)}
                  </select>

                  <a href="https://lin.ee/Nes3ZBI" target="_blank" className="block text-center bg-[#06C755] text-white py-2 rounded-full text-xs tracking-widest">預約諮詢</a>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 管理員登入 */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
          <div className="bg-white p-8 max-w-xs w-full">
            <input type="password" placeholder="密碼" className="w-full border-b py-2 mb-4 text-center" onChange={e => setPasswordInput(e.target.value)} />
            <button className="w-full bg-[#463E3E] text-white py-2" onClick={() => {if(passwordInput==="8888") setIsLoggedIn(true); setIsAdminModalOpen(false);}}>登入</button>
          </div>
        </div>
      )}
    </div>
  );
}