import React, { useState, useEffect } from 'react';
import { Plus, X, Lock, Trash2, Edit3, MessageCircle, Settings, Clock, Calendar, User, Phone, CheckCircle, List, Upload, Star, ShieldCheck, MapPin, Users } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

// ... (Firebase Config 保持不變)

export default function App() {
  // --- 狀態擴充 ---
  const [stores, setStores] = useState([]); // 門市列表
  const [settings, setSettings] = useState({ maxCapacity: 1, closedDates: [] }); // 全域設定
  const [selectedStore, setSelectedStore] = useState('');
  
  // 管理員專用的門市與設定編輯
  const [isStoreManagerOpen, setIsStoreManagerOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');

  // ... (保留原有的 useEffect 監聽款式、加購、預約單)

  useEffect(() => {
    if (!user) return;
    // 監聽門市
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'stores'), (s) => 
      setStores(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    // 監聽設定 (黑名單日期、容納人數)
    onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config'), (d) => {
      if(d.exists()) setSettings(d.data());
    });
  }, [user]);

  // --- 預約邏輯核心算法 ---
  const isTimeSlotAvailable = (date, time, duration) => {
    // 1. 檢查是否為關閉日期
    if (settings.closedDates?.includes(date)) return "CLOSED";

    // 2. 檢查是否在 24 小時內
    const now = new Date();
    const bookingTime = new Date(`${date} ${time}`);
    if (bookingTime - now < 24 * 60 * 60 * 1000) return "TOO_SOON";

    // 3. 檢查同時段人數上限
    const requestedStart = bookingTime.getTime();
    const requestedEnd = requestedStart + (duration + 20) * 60000; // 工時 + 20分

    const overlappingBookings = allBookings.filter(b => {
      if (b.date !== date || b.storeId !== selectedStore) return false;
      const bStart = new Date(`${b.date} ${b.time}`).getTime();
      const bEnd = bStart + (b.totalDuration + 20) * 60000;
      // 判斷時間區段是否有重疊
      return (requestedStart < bEnd && requestedEnd > bStart);
    });

    return overlappingBookings.length < (settings.maxCapacity || 1);
  };

  // --- 管理功能 ---
  const toggleDateLock = async (date) => {
    let newClosed = [...(settings.closedDates || [])];
    if (newClosed.includes(date)) newClosed = newClosed.filter(d => d !== date);
    else newClosed.push(date);
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config'), { closedDates: newClosed });
  };

  const addStore = async () => {
    if (!newStoreName) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'stores'), { name: newStoreName });
    setNewStoreName('');
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555]">
      {/* 導航欄新增管理按鈕 */}
      <nav className="...">
        {/* ... (略) */}
        {isLoggedIn && (
          <button onClick={() => setIsStoreManagerOpen(true)} className="text-[#C29591]"><MapPin size={18}/></button>
        )}
      </nav>

      <main className="pt-20">
        {bookingStep === 'form' ? (
          <div className="max-w-2xl mx-auto px-6 py-12">
            <h2 className="text-2xl font-light tracking-[0.3em] text-center mb-12 uppercase">Booking Details</h2>
            <div className="bg-white border p-8 space-y-8 shadow-sm">
              
              {/* 門市選取 */}
              <div>
                <label className="text-[10px] text-gray-400 block mb-2 uppercase tracking-widest">Select Store / 門市選取</label>
                <div className="grid grid-cols-2 gap-4">
                  {stores.map(s => (
                    <button key={s.id} onClick={() => setSelectedStore(s.id)} className={`py-3 border text-xs tracking-widest ${selectedStore === s.id ? 'bg-[#463E3E] text-white' : 'bg-white text-gray-400'}`}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 日期與時段 */}
              <div className="space-y-4">
                <input type="date" className="w-full border p-3 bg-[#FAF9F6]" onChange={e => setBookingData({...bookingData, date: e.target.value})} />
                
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {TIME_SLOTS.map(t => {
                    const availability = isTimeSlotAvailable(bookingData.date, t, (selectedItem?.duration || 0) + (selectedAddon?.duration || 0));
                    const isFull = availability === false;
                    const isClosed = availability === "CLOSED" || availability === "TOO_SOON";

                    return (
                      <button 
                        key={t} 
                        disabled={isFull || isClosed || !selectedStore}
                        onClick={() => setBookingData({...bookingData, time: t})}
                        className={`py-2 text-[9px] border transition-all ${
                          bookingData.time === t ? 'bg-[#463E3E] text-white' : 
                          isFull ? 'bg-red-50 text-red-200 border-red-100 cursor-not-allowed' :
                          isClosed ? 'bg-gray-50 text-gray-200 border-gray-100 cursor-not-allowed' :
                          'bg-white text-gray-400 hover:border-[#C29591]'
                        }`}
                      >
                        {isFull ? '已滿' : t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ... (其餘表單欄位保持不變) */}
              <button 
                onClick={handleConfirmBooking}
                className="w-full bg-[#463E3E] text-white py-4 text-xs tracking-widest uppercase hover:bg-[#C29591]"
              >
                確認預約 (上限: {settings.maxCapacity}人)
              </button>
            </div>
          </div>
        ) : (
          /* ... 其他區塊保持不變 */
        )}
      </main>

      {/* --- 門市與進階設定管理彈窗 --- */}
      {isStoreManagerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
          <div className="bg-white p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8 border-b pb-4">
              <h3 className="tracking-widest font-light uppercase">Store & Capacity Settings</h3>
              <button onClick={() => setIsStoreManagerOpen(false)}><X size={20}/></button>
            </div>

            <div className="space-y-10">
              {/* 人數上限設定 */}
              <div>
                <label className="text-xs font-bold mb-4 block">同時段服務人數上限</label>
                <div className="flex items-center gap-4">
                  <input type="number" className="border-b p-2 w-20 text-center" value={settings.maxCapacity} onChange={async (e) => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config'), { maxCapacity: Number(e.target.value) })} />
                  <span className="text-xs text-gray-400">人 (系統將根據此數值判斷時段是否已滿)</span>
                </div>
              </div>

              {/* 門市管理 */}
              <div>
                <label className="text-xs font-bold mb-4 block">門市清單</label>
                <div className="flex gap-2 mb-4">
                  <input type="text" className="border-b flex-1 p-2 text-xs" placeholder="輸入新門市名稱" value={newStoreName} onChange={e => setNewStoreName(e.target.value)} />
                  <button onClick={addStore} className="bg-[#463E3E] text-white px-4 py-2 text-xs"><Plus size={14}/></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {stores.map(s => (
                    <div key={s.id} className="border p-3 flex justify-between items-center text-xs">
                      {s.name}
                      <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'stores', s.id))} className="text-red-300"><Trash2 size={14}/></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 關閉特定日期 (簡單示意) */}
              <div>
                <label className="text-xs font-bold mb-4 block">手動關閉日期 (黑名單)</label>
                <div className="flex gap-2 mb-4">
                  <input type="date" className="border p-2 text-xs" id="lockDateInput" />
                  <button onClick={() => toggleDateLock(document.getElementById('lockDateInput').value)} className="bg-red-400 text-white px-4 py-2 text-xs">鎖定/解鎖該日期</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {settings.closedDates?.map(d => (
                    <span key={d} className="bg-gray-100 px-3 py-1 text-[10px] rounded-full flex items-center gap-2">
                      {d} <X size={10} className="cursor-pointer" onClick={() => toggleDateLock(d)} />
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}