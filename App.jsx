金鑰

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
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






















import React, { useState, useEffect } from 'react';
import { Search, Filter, Heart, Instagram, Facebook, Calendar, Menu, X, CheckCircle, ChevronDown, Plus, Upload, Image as ImageIcon, Lock, Cloud, Loader2, Sparkles, ArrowRight, MapPin, Clock, MessageCircle, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

// --- Firebase Imports ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

// --- Firebase Configuration & Initialization ---
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
    <div className="group relative bg-white overflow-hidden transition-all duration-500 hover:shadow-2xl">
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
          <>
            <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/50 p-1 rounded-full"><ChevronLeft size={20} /></button>
            <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/50 p-1 rounded-full"><ChevronRight size={20} /></button>
          </>
        )}
      </div>
      <div className="p-5">
        <h3 className="text-[#463E3E] font-medium text-lg mb-1">{item.title}</h3>
        <p className="text-[#C29591] font-bold">NT$ {item.price}</p>
        <button onClick={(e) => { e.stopPropagation(); handleBook(item.title); }} className="mt-4 w-full py-2 border border-[#C29591] text-[#C29591] hover:bg-[#C29591] hover:text-white transition-colors">
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
  const [displayItems, setDisplayItems] = useState(staticNailData);
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
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555] font-sans">
      {/* 導航欄 */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-[#EAE7E2]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <h1 className="text-xl tracking-[0.3em] font-light cursor-pointer" onClick={() => setActiveTab('home')}>UNIWAWA</h1>
          <div className="flex gap-8">
            <button onClick={() => setActiveTab('home')} className={activeTab === 'home' ? 'text-[#C29591]' : ''}>首頁</button>
            <button onClick={() => setActiveTab('catalog')} className={activeTab === 'catalog' ? 'text-[#C29591]' : ''}>設計款</button>
          </div>
        </div>
      </nav>

      {/* 內容 */}