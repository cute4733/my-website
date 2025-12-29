import React, { useState, useEffect } from 'react';
import { Search, Filter, Heart, Instagram, Facebook, Calendar, Menu, X, CheckCircle, ChevronDown, Plus, Upload, Image as ImageIcon, Lock, Cloud, Loader2, Sparkles, ArrowRight, MapPin, Clock, MessageCircle, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

// --- Firebase Imports ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

// --- Firebase 金鑰與初始化 (你的原始金鑰) ---
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

// --- 靜態資料 (包含你的首圖 Google Drive 連結) ---
const staticNailData = [
  { 
    id: 101, 
    title: "咖啡時光", 
    category: "elegant", 
    color: "brown", 
    price: 1680, 
    image: "https://drive.google.com/thumbnail?id=1zAGm6_3Lu34qYja-TUp5qCPJQb8uoP6A&sz=w1000", 
    tags: ["秋冬", "顯白", "氣質"] 
  },
];

const ProductCard = ({ item, handleBook }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = item.images && item.images.length > 0 ? item.images : (item.image ? [item.image] : []);
  const hasMultipleImages = images.length > 1;

  return (
    <div className="group relative bg-white overflow-hidden transition-all duration-500 hover:shadow-2xl border border-[#EAE7E2]">
      <div className="relative aspect-[3/4] overflow-hidden bg-[#F9F8F6]">
        {images.length > 0 ? (
          <img src={images[currentImageIndex]} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={48} /></div>
        )}
        <button 
          onClick={(e) => { e.stopPropagation(); handleBook(item.title); }} 
          className="absolute bottom-4 right-4 w-12 h-12 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-[#463E3E] shadow-lg opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all hover:bg-[#C29591] hover:text-white z-10"
        >
          <Plus size={24} />
        </button>
      </div>
      <div className="p-6">
        <h3 className="text-[#463E3E] font-medium text-lg mb-1 tracking-wide">{item.title}</h3>
        <p className="text-xs text-[#8A8181] mb-3 uppercase tracking-widest">{item.color} Series</p>
        <p className="text-[#C29591] font-semibold tracking-tighter">NT$ {item.price}</p>
      </div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [cloudItems, setCloudItems] = useState([]);
  const [displayItems, setDisplayItems] = useState(staticNailData);
  const [notification, setNotification] = useState(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  // 1. 初始化 Firebase 登入
  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error("Firebase Auth Error:", err));
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // 2. 實時抓取雲端資料庫的照片 (這就是為什麼首圖/資料會同步的原因)
  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCloudItems(fetched);
    }, (err) => console.error("Firestore Error:", err));
    return () => unsubscribe();
  }, [user]);

  // 3. 合併資料
  useEffect(() => {
    setDisplayItems([...cloudItems, ...staticNailData]);
  }, [cloudItems]);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === "8888") {
      setIsAdminModalOpen(false);
      alert("管理員驗證成功！(上傳功能已啟用)");
      setActiveTab('catalog');
    } else {
      alert("密碼錯誤！");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555] font-serif">
      {/* 導航 */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-[#EAE7E2]">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <h1 className="text-2xl tracking-[0.5em] font-light cursor-pointer text-[#463E3E]" onClick={() => setActiveTab('home')}>UNIWAWA</h1>
          <div className="flex gap-10 text-xs uppercase tracking-[0.2em]">
            <button onClick={() => setActiveTab('home')} className={activeTab === 'home' ? 'text-[#C29591]' : 'hover:text-[#C29591]'}>Home</button>
            <button onClick={() => setActiveTab('catalog')} className={activeTab === 'catalog' ? 'text-[#C29591]' : 'hover:text-[#C29591]'}>Catalog</button>
            <button onClick={() => setIsAdminModalOpen(true)} className="text-gray-300"><Lock size={14} /></button>
          </div>
        </div>
      </nav>

      {/* 內容 */}
      <main className="pt-40 pb-20 max-w-7xl mx-auto px-6">
        {activeTab === 'home' ? (
          <div className="text-center animate-fade-in">
             <div className="mb-6 text-[#C29591] tracking-[0.6em] text-sm uppercase">Est. 2025 • Taipei</div>
             <h2 className="text-7xl font-light mb-10 tracking-widest leading-tight text-[#463E3E]">Beyond<br/>Expectation</h2>
             <button onClick={() => setActiveTab('catalog')} className="bg-[#463E3E] text-white px-14 py-5 hover:bg-[#C29591] transition-all shadow-2xl tracking-widest text-sm">
               EXPLORE COLLECTION
             </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {displayItems.map(item => (
              <ProductCard key={item.id} item={item} handleBook={(t) => alert(`已選取: ${t}`)} />
            ))}
          </div>
        )}
      </main>

      {/* 密碼視窗 */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-[#463E3E]/60 backdrop-blur-md z-[100] flex items-center justify-center">
          <div className="bg-white p-10 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl mb-8 tracking-[0.2em] text-center">ADMIN ACCESS</h3>
            <form onSubmit={handlePasswordSubmit}>
              <input 
                type="password" 
                className="w-full border-b border-gray-300 py-3 mb-8 focus:outline-none focus:border-[#C29591] text-center tracking-[1em]"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoFocus
              />
              <div className="flex gap-4">
                <button type="button" onClick={() => setIsAdminModalOpen(false)} className="flex-1 py-3 border border-gray-200 text-gray-400">CLOSE</button>
                <button type="submit" className="flex-1 py-3 bg-[#463E3E] text-white">ENTER</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;