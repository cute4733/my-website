import React, { useState, useEffect } from 'react';
import { Search, Filter, Heart, Instagram, Facebook, Calendar, Menu, X, CheckCircle, ChevronDown, Plus, Upload, Image as ImageIcon, Lock, Cloud, Loader2, Sparkles, ArrowRight, MapPin, Clock, MessageCircle, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

// --- Firebase Imports ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyBkFqTUwtC7MqZ6h4--2_1BmldXEg-Haiw",
  authDomain: "uniwawa-beauty.firebaseapp.com",
  projectId: "uniwawa-beauty",
  storageBucket: "uniwawa-beauty.firebasestorage.app",
  messagingSenderId: "1009617609234",
  appId: "1:1009617609234:web:3cb5466e79a81c1f1aaecb"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'uniwawa01';

// --- 靜態資料 ---
const staticNailData = [
  { id: 101, title: "咖啡時光", category: "elegant", color: "brown", price: 1680, image: "https://drive.google.com/thumbnail?id=1zAGm6_3Lu34qYja-TUp5qCPJQb8uoP6A&sz=w1000", tags: ["秋冬", "顯白", "氣質"] },
];

// --- 子組件：商品卡片 (支援多圖輪播) ---
const ProductCard = ({ item, handleBook }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = item.images && item.images.length > 0 ? item.images : (item.image ? [item.image] : []);
  const hasMultipleImages = images.length > 1;

  const nextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };
  const prevImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="group relative bg-white overflow-hidden transition-all duration-500 hover:shadow-2xl border border-[#EAE7E2]">
      <div className="relative aspect-[3/4] overflow-hidden bg-[#F9F8F6]">
        {images.length > 0 ? (
          <div className="w-full h-full flex transition-transform duration-500" style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}>
            {images.map((img, index) => (
              <img key={index} src={img} alt={item.title} className="w-full h-full object-cover flex-shrink-0" />
            ))}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400"><ImageIcon size={32} /></div>
        )}
        
        {hasMultipleImages && (
          <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={prevImage} className="bg-white/80 p-1 rounded-full text-[#463E3E] hover:bg-white"><ChevronLeft size={20} /></button>
            <button onClick={nextImage} className="bg-white/80 p-1 rounded-full text-[#463E3E] hover:bg-white"><ChevronRight size={20} /></button>
          </div>
        )}

        <button 
          onClick={(e) => { e.stopPropagation(); handleBook(item.title); }} 
          className="absolute bottom-4 right-4 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-[#463E3E] shadow-sm opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:bg-[#C29591] hover:text-white z-10"
        >
          <Plus size={20} />
        </button>
      </div>
      
      <div className="p-5">
        <h3 className="text-[#463E3E] font-medium text-lg mb-1">{item.title}</h3>
        <p className="text-xs text-[#8A8181] mb-2">色系: {item.color || '未分類'}</p>
        <p className="text-[#C29591] font-bold">NT$ {item.price}</p>
      </div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cloudItems, setCloudItems] = useState([]);
  const [allItems, setAllItems] = useState(staticNailData);
  const [displayItems, setDisplayItems] = useState(staticNailData);
  const [notification, setNotification] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  const [newNail, setNewNail] = useState({ title: '', price: '', category: 'minimalist', color: 'nude', images: [], imagePreviews: [] });
  const [filters, setFilters] = useState({ price: 'all', color: 'all', style: 'all' });

  // 1. 初始化 Firebase Auth
  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. 監聽雲端資料庫
  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCloudItems(fetchedItems);
    });
    return () => unsubscribe();
  }, [user]);

  // 3. 合併資料
  useEffect(() => {
    setAllItems([...cloudItems, ...staticNailData]);
  }, [cloudItems]);

  // 4. 處理篩選
  useEffect(() => {
    let result = allItems;
    if (filters.style !== 'all') result = result.filter(item => item.category === filters.style);
    if (filters.color !== 'all') result = result.filter(item => item.color === filters.color);
    setDisplayItems(result);
  }, [filters, allItems]);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === "8888") {
      setIsAdminModalOpen(false);
      setIsUploadModalOpen(true);
    } else {
      alert("密碼錯誤");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555]">
      {/* 導航欄 */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-[#EAE7E2]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <h1 className="text-xl tracking-[0.3em] font-light cursor-pointer" onClick={() => setActiveTab('home')}>UNIWAWA</h1>
          <div className="hidden md:flex gap-8 text-xs uppercase tracking-widest">
            <button onClick={() => setActiveTab('home')} className={activeTab === 'home' ? 'text-[#C29591]' : ''}>首頁</button>
            <button onClick={() => setActiveTab('catalog')} className={activeTab === 'catalog' ? 'text-[#C29591]' : ''}>設計款</button>
            <button onClick={() => setIsAdminModalOpen(true)} className="text-gray-400 hover:text-[#C29591]">管理</button>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-20 max-w-7xl mx-auto px-6">
        {notification && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-[#463E3E] text-white px-8 py-3 rounded-full z-50 shadow-xl animate-fade-in">
            {notification}
          </div>
        )}

        {activeTab === 'home' ? (
          <div className="text-center py-20">
            <h2 className="text-6xl font-light mb-8 tracking-widest">Beyond Expectation</h2>
            <p className="max-w-xl mx-auto mb-12 text-[#8A8181] leading-relaxed">專注於莫蘭迪色系的調和與極簡線條的勾勒。</p>
            <button onClick={() => setActiveTab('catalog')} className="bg-[#463E3E] text-white px-12 py-4 hover:bg-[#C29591] transition-all">觀看款式</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {displayItems.map(item => (
              <ProductCard key={item.id} item={item} handleBook={(t) => showNotification(`已預約: ${t}`)} />
            ))}
          </div>
        )}
      </main>

      {/* 管理員登入 Modal */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 max-w-sm w-full rounded-sm shadow-2xl relative">
            <button onClick={() => setIsAdminModalOpen(false)} className="absolute top-4 right-4"><X /></button>
            <h3 className="text-xl mb-6 tracking-widest">管理員登入</h3>
            <form onSubmit={handlePasswordSubmit}>
              <input 
                type="password" 
                placeholder="請輸入密碼" 
                className="w-full border-b border-gray-300 py-2 mb-6 focus:outline-none focus:border-[#C29591]"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
              />
              <button className="w-full bg-[#463E3E] text-white py-3 hover:bg-[#C29591]">登入</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;