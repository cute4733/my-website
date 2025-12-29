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






















import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, Heart, Instagram, Facebook, Calendar, Menu, X, CheckCircle, ChevronDown, Plus, Upload, Image as ImageIcon, Lock, Cloud, Loader2, Sparkles, ArrowRight, MapPin, Clock, MessageCircle, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

// --- Firebase Imports ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

// --- Firebase Configuration & Initialization ---
// 
const firebaseConfig = 
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

// --- 子組件：商品卡片 (支援多圖輪播) ---
const ProductCard = ({ item, handleBook }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // 整合單圖與多圖資料格式
  const images = item.images && item.images.length > 0 
    ? item.images 
    : (item.image ? [item.image] : []);

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
    <div className="group cursor-pointer flex flex-col">
      {/* Image Container */}
      <div className="relative aspect-[3/4] overflow-hidden bg-[#EAE8E4] rounded-t-full md:rounded-sm mb-6 group-hover:shadow-md transition-all duration-300">
        
        {/* Images Display */}
        {images.length > 0 ? (
          <div className="w-full h-full relative">
             {images.map((img, index) => (
                <img 
                  key={index}
                  src={img} 
                  alt={`${item.title} - ${index + 1}`} 
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out ${index === currentImageIndex ? 'opacity-100' : 'opacity-0'}`}
                />
             ))}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#C2C0C0]">
            <ImageIcon size={32} strokeWidth={1} />
          </div>
        )}
        
        {/* Navigation Arrows (Only if multiple images) */}
        {hasMultipleImages && (
          <>
            <button 
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/50 hover:bg-white/80 p-1 rounded-full text-[#463E3E] opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/50 hover:bg-white/80 p-1 rounded-full text-[#463E3E] opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight size={16} />
            </button>
            
            {/* Dots Indicator */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
              {images.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`w-1.5 h-1.5 rounded-full transition-colors shadow-sm ${idx === currentImageIndex ? 'bg-white' : 'bg-white/40'}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-[#463E3E]/0 group-hover:bg-[#463E3E]/5 transition-colors duration-500 pointer-events-none"></div>
        
        {/* Floating Add to List Button */}
        <button 
          onClick={(e) => { e.stopPropagation(); handleBook(item.title); }}
          className="absolute bottom-4 right-4 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-[#463E3E] shadow-sm opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:bg-[#C29591] hover:text-white z-10"
        >
            <Plus size={18} strokeWidth={1.5} />
        </button>
      </div>
      
      {/* Info (No Tags) */}
      <div className="flex justify-between items-start border-t border-[#E3CAC8]/50 pt-4">
        <div>
            <h3 className="text-lg font-serif text-[#463E3E] group-hover:text-[#C29591] transition-colors duration-300">{item.title}</h3>
            {/* 色系提示 (Optional) */}
            <span className="text-[10px] text-[#8A8181] uppercase tracking-wider block mt-1">{item.color}</span>
        </div>
        <p className="text-sm font-medium text-[#5C5555] font-serif italic">NT$ {item.price}</p>
      </div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // 資料相關
  const [cloudItems, setCloudItems] = useState([]); 
  const [allItems, setAllItems] = useState(staticNailData); 
  const [displayItems, setDisplayItems] = useState(staticNailData);
  
  const [notification, setNotification] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Modal 狀態
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  // 新增款式表單
  const [newNail, setNewNail] = useState({
    title: '',
    price: '',
    category: 'minimalist',
    color: 'nude',
    images: [], // 原始 File 物件陣列
    imagePreviews: [] // 預覽網址陣列
  });

  // 篩選狀態
  const [filters, setFilters] = useState({
    price: 'all',
    color: 'all',
    style: 'all'
  });

  // 1. 初始化 Firebase Auth
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
         await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. 監聽雲端資料庫
  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setCloudItems(fetchedItems);
    }, (error) => {
      console.error("讀取資料失敗:", error);
    });
    return () => unsubscribe();
  }, [user]);

  // 3. 合併資料
  useEffect(() => {
    const merged = [...cloudItems, ...staticNailData];
    setAllItems(merged);
  }, [cloudItems]);

  // 4. 處理篩選邏輯
  useEffect(() => {
    let result = allItems;
    if (filters.style !== 'all') result = result.filter(item => item.category === filters.style);
    if (filters.color !== 'all') result = result.filter(item => item.color === filters.color);
    if (filters.price !== 'all') {
      if (filters.price === 'low') result = result.filter(item => item.price < 1300);
      else if (filters.price === 'mid') result = result.filter(item => item.price >= 1300 && item.price <= 1900);
      else if (filters.price === 'high') result = result.filter(item => item.price > 1900);
    }
    setDisplayItems(result);
  }, [filters, allItems]);

  // 輔助功能：壓縮圖片 (高畫質版)
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          // 提升到 1024px，確保清晰度
          const MAX_WIDTH = 1024; 
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_WIDTH) {
              width *= MAX_WIDTH / height;
              height = MAX_WIDTH;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // 提升品質到 0.8，確保細節
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleBook = (title) => {
    showNotification(`已將「${title}」加入預約諮詢！`);
  };

  const resetFilters = () => {
    setFilters({ price: 'all', color: 'all', style: 'all' });
  };

  // 處理多圖選擇
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // 限制總數最多 5 張
    const currentCount = newNail.images.length;
    const availableSlots = 5 - currentCount;
    
    if (availableSlots <= 0) {
        alert("最多只能上傳 5 張照片");
        return;
    }

    const filesToAdd = files.slice(0, availableSlots);
    const newPreviews = filesToAdd.map(file => URL.createObjectURL(file));

    setNewNail(prev => ({
        ...prev,
        images: [...prev.images, ...filesToAdd],
        imagePreviews: [...prev.imagePreviews, ...newPreviews]
    }));
  };

  const handleAdminCheck = () => {
    setIsAdminModalOpen(true);
    setPasswordInput('');
    setIsMenuOpen(false);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === "8888") {
      setIsAdminModalOpen(false);
      setIsUploadModalOpen(true);
      showNotification("管理員登入成功！");
    } else {
      alert("密碼錯誤，請重新嘗試。");
    }
  };

  const handleSubmitNewNail = async (e) => {
    e.preventDefault();
    if (!newNail.title || !newNail.price || newNail.images.length === 0) {
      alert("請填寫完整資訊並至少上傳一張圖片");
      return;
    }
    if (!user) {
        alert("系統連線中，請稍後再試...");
        return;
    }
    setIsUploading(true);
    try {
      // 壓縮所有圖片
      const compressedImages = await Promise.all(
          newNail.images.map(file => compressImage(file))
      );

      // 檢查總大小 (Firestore 單一文件限制 1MB)
      const totalSize = compressedImages.reduce((acc, curr) => acc + curr.length, 0);
      
      // 預留 50KB 給文字資料，限制設為 950KB
      if (totalSize > 950000) { 
          alert(`照片總檔案太大 (${(totalSize/1024/1024).toFixed(2)}MB)，超過雲端限制。\n\n建議：\n1. 減少一次上傳的照片張數 (例如分兩次上傳)\n2. 或是只選擇 1-2 張重點照片`);
          setIsUploading(false);
          return;
      }

      const newItemData = {
        title: newNail.title,
        price: Number(newNail.price),
        category: newNail.category,
        color: newNail.color,
        image: compressedImages[0], 
        images: compressedImages, 
        tags: [],
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), newItemData);
      
      setIsUploadModalOpen(false);
      setNewNail({ title: '', price: '', category: 'minimalist', color: 'nude', images: [], imagePreviews: [] });
      showNotification("成功發布新款！");
      setActiveTab('catalog'); 
      resetFilters();
    } catch (error) {
      console.error("上傳失敗", error);
      alert("上傳失敗，請檢查網路狀態。");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] font-sans text-[#5C5555] selection:bg-[#E3CAC8] selection:text-[#463E3E]">
      
      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${activeTab === 'home' ? 'bg-[#FAF9F6]/80 backdrop-blur-sm' : 'bg-[#FAF9F6] border-b border-[#E3CAC8]/30'}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-24">
            {/* Logo */}
            <div className="flex-shrink-0 cursor-pointer group" onClick={() => setActiveTab('home')}>
              <h1 className="text-3xl font-serif tracking-[0.1em] text-[#463E3E] group-hover:text-[#C29591] transition-colors duration-500">
                UNIWAWA
                <span className="text-[10px] tracking-[0.4em] text-[#C29591]/80 block mt-1 font-sans font-light uppercase">Beauty Studio</span>
              </h1>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-12">
              {['Home', 'Catalog', 'About'].map((item) => (
                <button 
                  key={item}
                  onClick={() => setActiveTab(item.toLowerCase())}
                  className={`relative px-1 py-2 text-xs uppercase tracking-[0.2em] font-medium transition-all duration-300 hover:text-[#C29591]
                    ${activeTab === item.toLowerCase() ? 'text-[#C29591]' : 'text-[#8A8181]'}
                  `}
                >
                  {item === 'Home' ? '首頁' : item === 'Catalog' ? '設計款' : '關於'}
                  <span className={`absolute -bottom-1 left-1/2 w-0 h-[1px] bg-[#C29591] transition-all duration-300 -translate-x-1/2 group-hover:w-full ${activeTab === item.toLowerCase() ? 'w-full' : ''}`}></span>
                </button>
              ))}
              
              {/* Admin Link (Desktop) */}
              <button 
                onClick={handleAdminCheck}
                className="text-xs uppercase tracking-[0.1em] text-[#C29591] hover:text-[#463E3E] transition-colors border border-[#E3CAC8] px-4 py-2 rounded-sm hover:bg-[#E3CAC8]/20"
              >
                新增款式 (Admin)
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-[#5C5555] hover:text-[#C29591] p-2">
                {isMenuOpen ? <X size={24} strokeWidth={1} /> : <Menu size={24} strokeWidth={1} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-24 left-0 w-full bg-[#FAF9F6] border-b border-[#E3CAC8]/30 animate-fade-in shadow-sm">
            <div className="px-8 py-8 space-y-6">
              {['Home', 'Catalog', 'About'].map((item) => (
                <button 
                  key={item}
                  onClick={() => {setActiveTab(item.toLowerCase()); setIsMenuOpen(false)}} 
                  className={`block w-full text-left py-2 text-lg font-serif tracking-widest
                    ${activeTab === item.toLowerCase() ? 'text-[#C29591]' : 'text-[#5C5555]'}
                  `}
                >
                  {item === 'Home' ? '首頁' : item === 'Catalog' ? '設計款' : '關於我們'}
                </button>
              ))}
              {/* Admin Link (Mobile) */}
              <button 
                  onClick={handleAdminCheck}
                  className="block w-full text-left py-2 text-sm font-medium tracking-widest text-[#C29591] border-t border-[#E3CAC8]/30 pt-6 mt-2"
                >
                  新增款式 (管理員專用)
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="pt-24">
        
        {/* Notification Toast */}
        {notification && (
          <div className="fixed top-28 right-6 bg-[#463E3E] text-[#FDFCF8] px-8 py-4 rounded-sm shadow-2xl z-[60] animate-fade-in-down flex items-center tracking-wide border-l-2 border-[#C29591]">
            <Sparkles className="text-[#C29591] mr-4" size={16} />
            <span className="font-light text-sm">{notification}</span>
          </div>
        )}

        {/* HOME PAGE */}
        {activeTab === 'home' && (
          <div className="animate-fade-in">
            {/* Hero Section */}
            <div className="relative h-[85vh] flex items-center justify-center overflow-hidden bg-[#FAF9F6]">
              {/* Image Section - New Abstract Oil Painting Style (Drive Link) */}
              <div className="absolute inset-4 md:inset-8 bg-white overflow-hidden shadow-sm">
                 <img 
                  src="https://drive.google.com/thumbnail?id=1ZJv3DS8ST_olFt0xzKB_miK9UKT28wMO&sz=w1920" 
                  alt="Hero Abstract Art" 
                  className="w-full h-full object-cover opacity-95"
                />
                <div className="absolute inset-0 bg-[#E3CAC8]/20 mix-blend-multiply"></div>
              </div>
              
              <div className="relative z-20 text-center px-6 max-w-4xl mx-auto text-[#463E3E]">
                <span className="inline-block py-1 px-4 border border-[#463E3E]/20 rounded-full text-[12px] tracking-[0.3em] uppercase mb-8 backdrop-blur-sm shadow-sm bg-white/40">
                   EST. 2025 • TAIPEI
                </span>
                <h2 className="text-5xl md:text-8xl font-serif font-light mb-8 leading-tight tracking-wider drop-shadow-sm text-[#463E3E]">
                  Beyond <br/> <span className="italic font-normal text-[#6D6363]">Expectation</span>
                </h2>
                <div className="flex justify-center gap-6">
                   <button 
                    onClick={() => setActiveTab('catalog')}
                    className="group flex items-center gap-3 bg-[#463E3E] text-[#FAF9F6] px-8 py-4 rounded-sm text-xs tracking-[0.2em] uppercase transition-all hover:bg-[#C29591] hover:text-white shadow-lg"
                  >
                    觀看款式
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>

            {/* Introduction Section */}
            <div className="max-w-7xl mx-auto py-32 px-6 md:px-12 bg-[#FAF9F6]">
              <div className="flex flex-col md:flex-row gap-16 items-start">
                 <div className="md:w-1/3 pt-8">
                    <h3 className="text-sm font-bold text-[#C29591] uppercase tracking-[0.2em] mb-4">Why Choose Us</h3>
                    <h2 className="text-4xl font-serif text-[#463E3E] leading-relaxed">
                       Less but <br/> Better.
                    </h2>
                 </div>
                 <div className="md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-12">
                    <p className="text-[#8A8181] font-light leading-8">
                      我們屏棄繁複俗艷的設計，專注於莫蘭迪色系的調和與極簡線條的勾勒。UNIWAWA 相信，美甲不只是裝飾，而是一種生活態度的延伸。「Smoky Pink」是我們的靈魂色調，象徵著成熟、內斂與不張揚的溫柔。
                    </p>
                    <div className="space-y-8">
                       <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full border border-[#E3CAC8] flex items-center justify-center text-[#C29591] shrink-0">
                             <span className="font-serif italic">01</span>
                          </div>
                          <div>
                            <span className="text-sm tracking-widest uppercase text-[#5C5555] block font-bold mb-1">舒適預約制</span>
                            <span className="text-xs text-[#8A8181] font-light">
                              提供寧靜放鬆的專屬時段，不需等待，享受完整的服務體驗。
                            </span>
                          </div>
                       </div>
                       <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full border border-[#E3CAC8] flex items-center justify-center text-[#C29591] shrink-0">
                             <span className="font-serif italic">02</span>
                          </div>
                          <div>
                            <span className="text-sm tracking-widest uppercase text-[#5C5555] block font-bold mb-1">設計款透明價格</span>
                            <span className="text-xs text-[#8A8181] font-light">
                               多款獨家設計可供挑選，價格公開透明，預算好掌握。
                            </span>
                          </div>
                       </div>
                       <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full border border-[#E3CAC8] flex items-center justify-center text-[#C29591] shrink-0">
                             <span className="font-serif italic">03</span>
                          </div>
                          <div>
                            <span className="text-sm tracking-widest uppercase text-[#5C5555] block font-bold mb-1">獨特美感</span>
                            <span className="text-xs text-[#8A8181] font-light">
                               專注於細節處理與整體配色的協調性，呈現指尖的藝術品味。
                            </span>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* CATALOG PAGE */}
        {activeTab === 'catalog' && (
          <div className="max-w-7xl mx-auto px-6 py-12 animate-fade-in relative min-h-screen">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 pb-6 border-b border-[#E3CAC8]/30">
              <div className="space-y-2">
                 <span className="text-xs text-[#C29591] font-bold tracking-[0.2em] uppercase">Collection</span>
                 <h2 className="text-4xl font-serif text-[#463E3E]">Lookbook</h2>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[#8A8181] font-medium tracking-widest uppercase mt-4 md:mt-0">
                 <Cloud size={12} />
                 <span>Synced with Cloud</span>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="sticky top-24 z-30 mb-12 py-2 bg-[#FAF9F6]/95 backdrop-blur-sm">
               <div className="flex flex-wrap items-center gap-3 md:gap-6">
                  {/* Style Filter */}
                  <div className="relative group">
                    <select 
                      className="appearance-none bg-white pl-4 pr-8 py-2 text-[#5C5555] text-xs tracking-wide border border-[#E3CAC8] rounded-sm hover:border-[#C29591] focus:outline-none focus:border-[#C29591] cursor-pointer transition-colors w-32 md:w-40"
                      value={filters.style}
                      onChange={(e) => setFilters({...filters, style: e.target.value})}
                    >
                      <option value="all">風格 (全部)</option>
                      <option value="minimalist">極簡氣質</option>
                      <option value="cute">可愛甜美</option>
                      <option value="korean">韓系手繪</option>
                      <option value="luxury">奢華華麗</option>
                      <option value="cool">個性酷帥</option>
                      <option value="elegant">優雅知性</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 text-[#C29591]" size={12} />
                  </div>

                  {/* Color Filter */}
                  <div className="relative group">
                    <select 
                      className="appearance-none bg-white pl-4 pr-8 py-2 text-[#5C5555] text-xs tracking-wide border border-[#E3CAC8] rounded-sm hover:border-[#C29591] focus:outline-none focus:border-[#C29591] cursor-pointer transition-colors w-32 md:w-40"
                      value={filters.color}
                      onChange={(e) => setFilters({...filters, color: e.target.value})}
                    >
                      <option value="all">色系 (全部)</option>
                      <option value="red">紅色系</option>
                      <option value="pink">粉色系</option>
                      <option value="blue">藍色系</option>
                      <option value="white">白色系</option>
                      <option value="black">黑色系</option>
                      <option value="nude">裸色系</option>
                      <option value="green">綠色系</option>
                      <option value="brown">棕色系</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 text-[#C29591]" size={12} />
                  </div>

                  {/* Price Filter */}
                  <div className="relative group">
                    <select 
                      className="appearance-none bg-white pl-4 pr-8 py-2 text-[#5C5555] text-xs tracking-wide border border-[#E3CAC8] rounded-sm hover:border-[#C29591] focus:outline-none focus:border-[#C29591] cursor-pointer transition-colors w-32 md:w-40"
                      value={filters.price}
                      onChange={(e) => setFilters({...filters, price: e.target.value})}
                    >
                      <option value="all">價位 (全部)</option>
                      <option value="low">&lt; $1300</option>
                      <option value="mid">$1300 - $1900</option>
                      <option value="high">&gt; $1900</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 text-[#C29591]" size={12} />
                  </div>
                  
                  <button 
                    onClick={resetFilters}
                    className="ml-auto text-[10px] text-[#8A8181] hover:text-[#C29591] tracking-widest uppercase border-b border-transparent hover:border-[#C29591] transition-all"
                  >
                    Clear All
                  </button>
               </div>
            </div>

            {/* Products Grid (With Carousel) */}
            {displayItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16">
                {displayItems.map((item) => (
                  <ProductCard key={item.id} item={item} handleBook={handleBook} />
                ))}
              </div>
            ) : (
              <div className="text-center py-32 border border-dashed border-[#E3CAC8] rounded-sm">
                <p className="text-[#8A8181] text-lg font-serif italic">No styles found.</p>
                <button 
                  onClick={resetFilters}
                  className="mt-4 text-[#C29591] hover:text-[#463E3E] text-xs tracking-widest uppercase transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* ABOUT PAGE */}
        {activeTab === 'about' && (
          <div className="animate-fade-in max-w-6xl mx-auto px-6 py-20">
             <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
                <div className="md:col-span-7 relative">
                   <div className="absolute top-8 left-8 w-full h-full bg-[#E3CAC8]/30 -z-10 rounded-sm"></div>
                   <img 
                      src="https://images.unsplash.com/photo-1596918667673-450917637841?auto=format&fit=crop&q=80&w=800"
                      className="w-full h-[600px] object-cover rounded-sm grayscale-[10%]"
                      alt="Studio"
                   />
                </div>
                <div className="md:col-span-5 md:-ml-12 z-10 bg-[#FAF9F6]/95 p-8 md:p-12 shadow-sm border border-[#E3CAC8]/20 backdrop-blur-sm">
                   <span className="text-xs font-bold text-[#C29591] uppercase tracking-[0.2em] mb-4 block">About UNIWAWA</span>
                   <h2 className="text-4xl font-serif text-[#463E3E] mb-8 leading-snug">
                     A Sanctuary for <br/> Your Soul.
                   </h2>
                   <div className="space-y-6 text-[#5C5555] font-light leading-7 text-justify text-sm">
                      <p>
                        UNIWAWA BEAUTY 成立於 2023 年，座落於桃園中路特區。我們打造的不僅是美甲工作室，更是一個能讓心靈暫時棲息的空間。
                      </p>
                      <p>
                        我們堅持使用高品質的無毒凝膠，並相信「Smoky Pink」所代表的：成熟、內斂與不張揚的溫柔。在這快速流動的城市裡，我們為您保留一份從容。
                      </p>
                   </div>
                   
                   <div className="pt-8 mt-8 border-t border-[#E3CAC8]/30">
                      <ul className="space-y-4 text-xs text-[#5C5555] tracking-wide">
                         <li className="flex justify-between items-center border-b border-[#E3CAC8]/30 pb-2">
                            <span className="uppercase text-[#8A8181]">Address</span>
                            <span className="text-right max-w-[200px] leading-relaxed">桃園市桃園區文中三路67號1樓<br/>(中路特區文中匯社區/桃園壽司郎旁)</span>
                         </li>
                         <li className="flex justify-between items-center border-b border-[#E3CAC8]/30 pb-2">
                            <span className="uppercase text-[#8A8181]">Hours</span>
                            <span>11:00 - 20:00 (Daily)</span>
                         </li>
                         <li className="flex justify-between items-center pt-2">
                            <span className="uppercase text-[#8A8181]">Reservation</span>
                            <span>請透過 LINE 預約</span>
                         </li>
                      </ul>
                   </div>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* Admin Login Modal */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-[#463E3E]/10 backdrop-blur-sm z-[80] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-[#FAF9F6] w-full max-w-sm p-10 shadow-2xl relative border border-[#E3CAC8]/50">
            <button 
              onClick={() => setIsAdminModalOpen(false)}
              className="absolute top-4 right-4 text-[#8A8181] hover:text-[#463E3E]"
            >
              <X size={20} strokeWidth={1} />
            </button>
            <div className="text-center space-y-8">
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#C29591] block">Admin Area</span>
                <h3 className="text-2xl font-serif text-[#463E3E]">Staff Access</h3>
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <input 
                    type="password" 
                    autoFocus
                    className="w-full bg-transparent border-b border-[#E3CAC8] py-3 text-center text-[#5C5555] focus:border-[#C29591] focus:outline-none transition-colors"
                    placeholder="••••"
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                  />
                  <button 
                    type="submit" 
                    className="w-full bg-[#463E3E] hover:bg-[#C29591] text-white py-4 text-[10px] uppercase tracking-[0.2em] transition-colors"
                  >
                    Enter
                  </button>
                </form>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal (Updated for Multiple Images) */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-[#463E3E]/10 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#FAF9F6] w-full max-w-md p-8 shadow-2xl relative border border-[#E3CAC8]/50 max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => !isUploading && setIsUploadModalOpen(false)}
              className="absolute top-4 right-4 text-[#8A8181] hover:text-[#463E3E] disabled:opacity-50"
              disabled={isUploading}
            >
              <X size={20} strokeWidth={1} />
            </button>
            
            <div className="mb-8 text-center">
              <h3 className="text-2xl font-serif text-[#463E3E]">New Collection</h3>
              <p className="text-[#8A8181] text-[10px] tracking-[0.2em] uppercase mt-2">Upload to Cloud</p>
            </div>
            
            <form onSubmit={handleSubmitNewNail} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-[#8A8181]">Title</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-white border border-[#E3CAC8] p-3 text-[#5C5555] text-sm focus:outline-none focus:border-[#C29591]"
                  value={newNail.title}
                  disabled={isUploading}
                  onChange={e => setNewNail({...newNail, title: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-[#8A8181]">Price</label>
                  <input 
                    type="number" 
                    required
                    className="w-full bg-white border border-[#E3CAC8] p-3 text-[#5C5555] text-sm focus:outline-none focus:border-[#C29591]"
                    value={newNail.price}
                    disabled={isUploading}
                    onChange={e => setNewNail({...newNail, price: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-[#8A8181]">Category</label>
                  <select 
                    className="w-full bg-white border border-[#E3CAC8] p-3 text-[#5C5555] text-sm focus:outline-none focus:border-[#C29591]"
                    value={newNail.category}
                    disabled={isUploading}
                    onChange={e => setNewNail({...newNail, category: e.target.value})}
                  >
                    <option value="minimalist">極簡氣質</option>
                    <option value="cute">可愛甜美</option>
                    <option value="korean">韓系手繪</option>
                    <option value="luxury">奢華華麗</option>
                    <option value="cool">個性酷帥</option>
                    <option value="elegant">優雅知性</option>
                  </select>
                </div>
              </div>

              {/* 新增：色系選擇 */}
              <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-[#8A8181]">Color Tone</label>
                  <select 
                    className="w-full bg-white border border-[#E3CAC8] p-3 text-[#5C5555] text-sm focus:outline-none focus:border-[#C29591]"
                    value={newNail.color}
                    disabled={isUploading}
                    onChange={e => setNewNail({...newNail, color: e.target.value})}
                  >
                    <option value="red">紅色系</option>
                    <option value="pink">粉色系</option>
                    <option value="blue">藍色系</option>
                    <option value="white">白色系</option>
                    <option value="black">黑色系</option>
                    <option value="nude">裸色系</option>
                    <option value="green">綠色系</option>
                    <option value="brown">棕色系</option>
                  </select>
              </div>

               <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-[#8A8181]">Images (Max 5)</label>
                <div className="border border-dashed border-[#E3CAC8] bg-[#FDFCF8] p-6 text-center hover:bg-white transition-colors relative cursor-pointer group">
                  <input 
                    type="file" 
                    accept="image/*"
                    multiple // 允許選多張
                    onChange={handleImageChange}
                    disabled={isUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  {newNail.imagePreviews.length > 0 ? (
                    <div className="grid grid-cols-5 gap-2 relative z-20 pointer-events-none">
                       {newNail.imagePreviews.map((preview, idx) => (
                           <div key={idx} className="relative aspect-square bg-[#EAE8E4] rounded overflow-hidden">
                               <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                               {/* 刪除按鈕邏輯需要更複雜的 UI 處理，這裡簡化為重新選擇提示 */}
                           </div>
                       ))}
                    </div>
                  ) : (
                    <div className="py-2 text-[#8A8181] group-hover:text-[#C29591] transition-colors">
                      <p className="text-xs tracking-wide">Click to browse (1-5 photos)</p>
                    </div>
                  )}
                </div>
                {newNail.imagePreviews.length > 0 && (
                    <button 
                        type="button"
                        onClick={() => setNewNail(prev => ({ ...prev, images: [], imagePreviews: [] }))}
                        className="text-[10px] text-red-400 hover:text-red-600 underline mt-1"
                    >
                        Clear All Images
                    </button>
                )}
              </div>

              <button 
                type="submit" 
                disabled={isUploading}
                className="w-full bg-[#463E3E] hover:bg-[#C29591] text-white py-4 text-[10px] uppercase tracking-[0.2em] transition-colors flex items-center justify-center gap-2"
              >
                {isUploading ? <Loader2 className="animate-spin" size={16} /> : "Publish Item"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-[#FDFCF8] text-[#8A8181] py-16 border-t border-[#E3CAC8]/30 mt-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-serif text-[#463E3E] mb-6 tracking-wider">UNIWAWA</h2>
          <div className="text-xs font-light tracking-widest space-y-2 mb-8 text-[#5C5555]">
            <p>週一至周日 11:00 - 20:00</p>
            <p>桃園市桃園區文中三路67號1樓</p>
            <p>(中路特區文中匯社區/桃園壽司郎旁)</p>
          </div>
          <div className="flex justify-center gap-8 text-[10px] font-medium tracking-[0.2em] uppercase mb-8">
             <a href="#" className="hover:text-[#C29591] transition-colors">Instagram</a>
             <a href="#" className="hover:text-[#C29591] transition-colors">Facebook</a>
             <a href="#" className="hover:text-[#C29591] transition-colors">Line</a>
          </div>
          <p className="text-[9px] text-[#C2C0C0] font-light tracking-wide">
            © 2024 UNIWAWA BEAUTY STUDIO. ALL RIGHTS RESERVED.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
