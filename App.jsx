import React, { useState, useEffect } from 'react';
import { Plus, X, Lock, Trash2, Edit3, MessageCircle, Settings, Clock, Calendar as CalendarIcon, User, Phone, CheckCircle, List, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, query, orderBy, setDoc } from 'firebase/firestore';

// --- Firebase 配置 ---
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

// --- 常數設定 ---
const STYLE_CATEGORIES = ['全部', '極簡氣質', '華麗鑽飾', '藝術手繪', '日系暈染', '貓眼系列'];
const PRICE_CATEGORIES = ['全部', '1300以下', '1300-1900', '1900以上'];
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

const generateTimeSlots = () => {
  const slots = [];
  for (let h = 12; h <= 20; h++) {
    for (let m = 0; m < 60; m += 10) {
      if (h === 20 && m > 0) break;
      slots.push(`${h}:${m === 0 ? '00' : m}`);
    }
  }
  return slots;
};
const TIME_SLOTS = generateTimeSlots();

const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

// --- 子組件：款式卡片 (確保設定圖示固定不消失) ---
const StyleCard = ({ item, isLoggedIn, onEdit, onDelete, onBook, addons, setSelectedAddon }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const images = item.images && item.images.length > 0 ? item.images : ['https://via.placeholder.com/400x533'];

  const nextImg = (e) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev + 1) % images.length);
  };

  const prevImg = (e) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="group flex flex-col bg-white border border-[#F0EDEA] shadow-sm relative">
      {/* 圖片區域容器 */}
      <div className="aspect-[3/4] overflow-hidden relative bg-gray-50">
        
        {/* 管理圖示層：放在最外層 Absolute，確保 z-index 最高且不隨圖片滾動 */}
        {isLoggedIn && (
          <div className="absolute top-4 right-4 flex gap-2 z-[40]">
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(item); }} 
              className="p-2.5 bg-[#463E3E] text-white rounded-full shadow-xl hover:bg-[#C29591] transition-all transform hover:scale-110"
              title="編輯"
            >
              <Edit3 size={14}/>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); if(confirm('確定刪除此款式？')) onDelete(item.id); }} 
              className="p-2.5 bg-white text-red-500 rounded-full shadow-xl hover:bg-red-50 transition-all border border-red-100 transform hover:scale-110"
              title="刪除"
            >
              <Trash2 size={14}/>
            </button>
          </div>
        )}

        {/* 圖片顯示 (使用絕對定位與 Opacity 切換，避免 layout 偏移) */}
        {images.map((img, idx) => (
          <img 
            key={idx}
            src={img} 
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out ${idx === currentIdx ? 'opacity-100 z-10' : 'opacity-0 z-0'}`} 
            alt={`${item.title}-${idx}`} 
          />
        ))}
        
        {/* 輪播控制按鈕 (z-30) */}
        {images.length > 1 && (
          <>
            <button 
              onClick={prevImg} 
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full opacity-0 group-hover:opacity-100 transition-all z-30 shadow-md"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={nextImg} 
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full opacity-0 group-hover:opacity-100 transition-all z-30 shadow-md"
            >
              <ChevronRight size={20} />
            </button>
            
            {/* 底部指示器點點 */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-30">
              {images.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1 rounded-full transition-all ${i === currentIdx ? 'bg-white w-6 shadow-sm' : 'bg-white/40 w-2'}`} 
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* 文字資訊區域 */}
      <div className="p-8 flex flex-col items-center text-center">
        <span className="text-[10px] text-[#C29591] tracking-[0.4em] uppercase mb-2 font-semibold">{item.category}</span>
        <h3 className="text-[#463E3E] font-medium text-lg tracking-widest mb-1">{item.title}</h3>
        <div className="flex items-center gap-1.5 text-gray-400 text-[10px] mb-4 uppercase tracking-widest font-light">
          <Clock size={12} /> {item.duration || '90'} MINS
        </div>
        <p className="text-[#463E3E] font-bold text-xl mb-8">
          <span className="text-xs font-light tracking-widest mr-1">NT$</span>
          {item.price?.toLocaleString()}
        </p>
        
        <select 
          className="w-full text-[11px] border border-[#EAE7E2] py-3 px-4 bg-[#FAF9F6] mb-8 outline-none focus:border-[#C29591] transition-colors" 
          onChange={(e) => setSelectedAddon(addons.find(a => a.id === e.target.value) || null)}
        >
          <option value="">指甲狀態（卸甲/加厚）</option>
          {addons.map(a => (<option key={a.id} value={a.