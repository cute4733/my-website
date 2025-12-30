import React, { useState, useEffect } from 'react';
import { Plus, X, Lock, Trash2, Clock, CheckCircle, List, Upload, MapPin } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

// --- 1. Firebase 配置 ---
const firebaseConfig = {
  apiKey: "AIzaSyBkFqTUwtC7MqZ6h4--2_1BmldXEg-Haiw",
  authDomain: "uniwawa-beauty.firebaseapp.com",
  projectId: "uniwawa-beauty",
  appId: "1:1009617609234:web:3cb5466e79a81c1f1aaecb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 時段定義 (12:00 - 20:00)
const TIME_SLOTS = ["12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];
const STYLE_CATEGORIES = ['全部', '極簡氣質', '華麗鑽飾', '藝術手繪', '日系暈染', '貓眼系列'];

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // 資料庫數據
  const [cloudItems, setCloudItems] = useState([]);
  const [stores, setStores] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [settings, setSettings] = useState({ maxCapacity: 1 });

  // 預約流程狀態
  const [bookingStep, setBookingStep] = useState('none'); // none, form, success
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedStore, setSelectedStore] = useState('');
  const [bookingData, setBookingData] = useState({ name: '', phone: '', date: '', time: '' });

  // 彈窗狀態
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  
  const [formData, setFormData] = useState({ title: '', price: '', category: '極簡氣質', duration: '90', images: [] });
  const [passwordInput, setPasswordInput] = useState('');
  const [styleFilter, setStyleFilter] = useState('全部');

  // --- 2. 生命週期與資料監聽 ---
  useEffect(() => {
    signInAnonymously(auth).catch(() => {});
    onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  useEffect(() => {
    if (!user) return;
    // 使用簡化路徑，避免嵌套錯誤
    const unsubD = onSnapshot(collection(db, 'nail_designs'), s => setCloudItems(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubS = onSnapshot(collection(db, 'stores'), s => setStores(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubB = onSnapshot(collection(db, 'bookings'), s => setAllBookings(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubC = onSnapshot(doc(db, 'config', 'global'), d => d.exists() && setSettings(d.data()));
    return () => { unsubD(); unsubS(); unsubB(); unsubC(); };
  }, [user]);

  // --- 3. 預約檢查邏輯 ---
  const isTimeAvailable = (date, time) => {
    if (!date || !time || !selectedStore) return true;
    const count = allBookings.filter(b => b.date === date && b.time === time && b.storeId === selectedStore).length;
    return count < (settings.maxCapacity || 1);
  };

  const handleBooking = async () => {
    if (!bookingData.name || !bookingData.phone || !bookingData.date || !bookingData.time || !selectedStore) {
      alert("請填寫完整預約資訊"); return;
    }
    try {
      await addDoc(collection(db, 'bookings'), {
        ...bookingData,
        storeId: selectedStore,
        itemTitle: selectedItem?.title || '未選款式',
        totalPrice: selectedItem?.price || 0,
        createdAt: serverTimestamp()
      });
      setBookingStep('success');
    } catch (e) { alert("預約失敗"); }
  };

  // --- 4. 畫面渲染 ---
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555]">
      {/* 導航 */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b p-4 flex justify-between items-center">
        <h1 className="text-xl tracking-widest font-light cursor-pointer" onClick={() => {setActiveTab('home'); setBookingStep('none');}}>UNIWAWA</h1>
        <div className="flex gap-4 text-xs tracking-widest items-center">
          <button onClick={() => {setActiveTab('home'); setBookingStep('none');}}>首頁</button>
          <button onClick={() => {setActiveTab('catalog'); setBookingStep('none');}}>款式</button>
          {isLoggedIn ? (
            <button onClick={() => setIsManagerOpen(true)} className="text-[#C29591]"><List size={18}/></button>
          ) : (
            <button onClick={() => setIsAdminModalOpen(true)} className="text-gray-300"><Lock size={14}/></button>
          )}
        </div>
      </nav>

      <main className="pt-24 px-6 max-w-7xl mx-auto">
        {bookingStep === 'success' ? (
          <div className="text-center py-20">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
            <h2 className="text-xl mb-8">預約完成！</h2>
            <button onClick={() => {setBookingStep('none'); setActiveTab('home');}} className="border p-2 px-6">返回</button>
          </div>
        ) : bookingStep === 'form' ? (
          <div className="max-w-md mx-auto bg-white p-8 border shadow-sm space-y-6">
            <h2 className="text-center tracking-widest font-light">RESERVATION</h2>
            <select className="w-full border-b p-2" onChange={e => setSelectedStore(e.target.value)}>
              <option value="">選擇門市</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input type="date" className="w-full border-b p-2" onChange={e => setBookingData({...bookingData, date: e.target.value})} />
            <div className="grid grid-cols-3 gap-2">
              {TIME_SLOTS.map(t => {
                const avail = isTimeAvailable(bookingData.date, t);
                return (
                  <button key={t} disabled={!avail} onClick={() => setBookingData({...bookingData, time: t})} className={`p-2 text-[10px] border ${bookingData.time === t ? 'bg-black text-white' : avail ? 'bg-white' : 'bg-gray-100 text-gray-300'}`}>
                    {avail ? t : '滿'}
                  </button>
                );
              })}
            </div>
            <input placeholder="姓名" className="w-full border-b p-2" onChange={e => setBookingData({...bookingData, name: e.target.value})} />
            <input placeholder="電話" className="w-full border-b p-2" onChange={e => setBookingData({...bookingData, phone: e.target.value})} />
            <button onClick={handleBooking} className="w-full bg-black text-white py-3 text-xs tracking-widest">確認預約</button>
          </div>
        ) : activeTab === 'home' ? (
          <div className="text-center py-20">
            <img src="https://drive.google.com/thumbnail?id=1ZJv3DS8ST_olFt0xzKB_miK9UKT28wMO&sz=w1200" className="mx-auto max-w-full mb-10 shadow-lg" alt="hero" />
            <h2 className="text-3xl font-extralight tracking-widest mb-10">Beyond Expectation</h2>
            <button onClick={() => setActiveTab('catalog')} className="bg-[#463E3E] text-white px-12 py-3 text-xs tracking-widest">瀏覽作品</button>
          </div>
        ) : (
          <div>
            <div className="flex justify-center gap-4 mb-10 text-[10px] text-gray-400">
              {STYLE_CATEGORIES.map(c => <button key={c} onClick={() => setStyleFilter(c)} className={styleFilter === c ? 'text-black font-bold' : ''}>{c}</button>)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {cloudItems.filter(i => styleFilter === '全部' || i.category === styleFilter).map(item => (
                <div key={item.id} className="bg-white border p-4 text-center group">
                  <div className="aspect-[3/4] overflow-hidden mb-4 relative">
                    <img src={item.images?.[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    {isLoggedIn && <button onClick={() => deleteDoc(doc(db, 'nail_designs', item.id))} className="absolute top-2 right-2 p-2 bg-white/80 rounded-full text-red-500"><Trash2 size={14}/></button>}
                  </div>
                  <span className="text-[9px] text-[#C29591] tracking-widest">{item.category}</span>
                  <h3 className="text-sm my-2 tracking-widest">{item.title}</h3>
                  <div className="font-bold mb-4">NT$ {item.price}</div>
                  <button onClick={() => {setSelectedItem(item); setBookingStep('form');}} className="w-full py-2 bg-black text-white text-[10px] tracking-widest">立即預約</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* --- 後台管理彈窗 --- */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
          <div className="bg-white p-8 w-80 text-center">
            <h3 className="text-xs mb-6 tracking-widest">ADMIN LOGIN</h3>
            <input type="password" placeholder="••••" className="w-full border-b py-2 text-center outline-none" onChange={e => setPasswordInput(e.target.value)} />
            <button onClick={() => {if(passwordInput==="8888") {setIsLoggedIn(true); setIsAdminModalOpen(false);}}} className="w-full bg-black text-white py-2 mt-6 text-xs">登入</button>
            <button onClick={() => setIsAdminModalOpen(false)} className="mt-4 text-[10px] text-gray-400">取消</button>
          </div>
        </div>
      )}

      {isManagerOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between mb-6 border-b pb-2">
              <h3 className="text-sm">管理後台</h3>
              <button onClick={() => setIsManagerOpen(false)}><X/></button>
            </div>
            
            <section className="mb-8">
              <h4 className="text-xs font-bold mb-4">功能操作</h4>
              <div className="flex gap-4">
                <button onClick={() => setIsUploadModalOpen(true)} className="flex items-center gap-2 border p-2 text-xs"><Upload size={14}/> 上傳款式</button>
                <div className="flex items-center gap-2 border p-2 text-xs">
                  <span>人數上限:</span>
                  <input type="number" className="w-10 border-b text-center" value={settings.maxCapacity} onChange={e => updateDoc(doc(db, 'config', 'global'), {maxCapacity: Number(e.target.value)})} />
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h4 className="text-xs font-bold mb-4">門市設定</h4>
              <div className="flex gap-2 mb-4">
                <input id="newStore" placeholder="新店名" className="border-b text-xs flex-1" />
                <button onClick={() => {
                  const val = document.getElementById('newStore').value;
                  if(val) addDoc(collection(db, 'stores'), {name: val});
                }} className="bg-black text-white px-4 py-1 text-xs">新增</button>
              </div>
              {stores.map(s => <div key={s.id} className="flex justify-between text-xs py-2 border-b"><span>{s.name}</span><button onClick={()=>deleteDoc(doc(db, 'stores', s.id))}><Trash2 size={12}/></button></div>)}
            </section>

            <section>
              <h4 className="text-xs font-bold mb-4">預約清單</h4>
              {allBookings.map(b => (
                <div key={b.id} className="text-[10px] border-b py-2 flex justify-between items-center">
                  <span>{b.date} {b.time} | {b.name} ({b.phone}) - {b.itemTitle}</span>
                  <button onClick={() => deleteDoc(doc(db, 'bookings', b.id))}><Trash2 size={12}/></button>
                </div>
              ))}
            </section>
          </div>
        </div>
      )}

      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4">
          <div className="bg-white p-6 w-full max-w-sm">
            <h3 className="text-sm mb-4">新增作品</h3>
            <div className="space-y-4">
              <input placeholder="標題" className="w-full border-b text-xs p-2" onChange={e => setFormData({...formData, title: e.target.value})} />
              <input placeholder="價格" className="w-full border-b text-xs p-2" onChange={e => setFormData({...formData, price: e.target.value})} />
              <select className="w-full border-b text-xs p-2" onChange={e => setFormData({...formData, category: e.target.value})}>
                {STYLE_CATEGORIES.filter(c => c !== '全部').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="file" onChange={e => {
                const reader = new FileReader();
                reader.onload = () => setFormData({...formData, images: [reader.result]});
                reader.readAsDataURL(e.target.files[0]);
              }} />
              <button onClick={async () => {
                await addDoc(collection(db, 'nail_designs'), {...formData, price: Number(formData.price)});
                setIsUploadModalOpen(false);
              }} className="w-full bg-black text-white py-2 text-xs">確認上傳</button>
              <button onClick={() => setIsUploadModalOpen(false)} className="w-full text-xs text-gray-400">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}