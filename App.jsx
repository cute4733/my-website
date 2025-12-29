
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

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'uniwawa01';

// --- 靜態資料 ---
const staticNailData = [
  { id: 101, title: "咖啡時光", category: "elegant", color: "brown", price: 1680, image: "https://drive.google.com/thumbnail?id=1zAGm6_3Lu34qYja-TUp5qCPJQb8uoP6A&sz=w1000", tags: ["秋冬", "顯白", "氣質"] },
];

// --- 子組件：商品卡片 ---
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
            <button onClick={prevImage} className="bg-white/80 p-1 rounded-full"><ChevronLeft size={20} /></button>
            <button onClick={nextImage} className="bg-white/80 p-1 rounded-full"><ChevronRight size={20} /></button>
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="text-[#463E3E] font-medium text-lg mb-1">{item.title}</h3>
        <p className="text-[#C29591] font-bold">NT$ {item.price}</p>
        <button onClick={(e) => { e.stopPropagation(); handleBook(item.title); }} className="mt-4 w-full py-2 bg-[#463E3E] text-white hover:bg-[#C29591] transition-colors text-sm tracking-widest">
          預約諮詢
        </button>
      </div>
    </div>
  );
};

// --- 主程式 App ---
const App = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  const handleBook = (title) => {
    setNotification(`已將「${title}」加入預約諮詢！`);
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555]">
      {/* 導航欄 */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-[#EAE7E2]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <h1 className="text-xl tracking-[0.4em] font-light cursor-pointer" onClick={() => setActiveTab('home')}>UNIWAWA</h1>
          <div className="flex gap-8 text-sm tracking-widest">
            <button onClick={() => setActiveTab('home')} className={activeTab === 'home' ? 'text-[#C29591]' : 'hover:text-[#C29591]'}>首頁</button>
            <button onClick={() => setActiveTab('catalog')} className={activeTab === 'catalog' ? 'text-[#C29591]' : 'hover:text-[#C29591]'}>設計款</button>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-20 max-w-7xl mx-auto px-6">
        {notification && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-[#463E3E] text-white px-8 py-3 rounded-full shadow-2xl z-50">
            {notification}
          </div>
        )}

        {activeTab === 'home' ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-[#C29591] tracking-[0.5em] mb-4 text-sm">EST. 2025</span>
            <h2 className="text-6xl font-light mb-12 tracking-widest leading-tight">Beyond<br/>Expectation</h2>
            <button onClick={() => setActiveTab('catalog')} className="group flex items-center gap-3 bg-[#463E3E] text-white px-12 py-5 hover:bg-[#C29591] transition-all shadow-xl">
              觀看款式 <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {staticNailData.map(item => (
              <ProductCard key={item.id} item={item} handleBook={handleBook} />
            ))}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-[#EAE7E2] py-12 text-center">
        <p className="text-xs tracking-[0.3em] text-gray-400">© 2025 UNIWAWA BEAUTY. ALL RIGHTS RESERVED.</p>
      </footer>
    </div>
  );
};

export default App;