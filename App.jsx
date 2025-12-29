import React, { useState, useEffect } from 'react';
import { Plus, X, Image as ImageIcon, Lock, Trash2, Edit3, Filter, ChevronRight } from 'lucide-react';

// --- Firebase 初始化 ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';

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

// 定義分類清單
const CATEGORIES = ['全部', '極簡氣質', '華麗鑽飾', '藝術手繪', '日系暈染', '貓眼系列'];

const App = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cloudItems, setCloudItems] = useState([]);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // 用於儲存正在編輯的項目
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('全部');

  // 上傳/編輯表單狀態
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({ title: '', price: '', category: '極簡氣質', color: '裸色系', images: [] });

  useEffect(() => {
    signInAnonymously(auth);
    onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCloudItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (passwordInput === "8888") {
      setIsLoggedIn(true);
      setIsAdminModalOpen(false);
    } else {
      alert("密碼錯誤");
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, images: [...prev.images, reader.result] }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.price) return alert("請填寫必填欄位");
    setIsUploading(true);
    try {
      if (editingItem) {
        // 修改現有產品
        const itemRef = doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', editingItem.id);
        await updateDoc(itemRef, { ...formData, price: Number(formData.price) });
        alert("修改成功");
      } else {
        // 新增產品
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'nail_designs'), {
          ...formData,
          price: Number(formData.price),
          createdAt: serverTimestamp()
        });
        alert("發布成功");
      }
      closeModal();
    } catch (err) {
      alert("操作失敗");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (itemId) => {
    if (window.confirm("確定要刪除此款式嗎？")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', itemId));
    }
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormData({ title: item.title, price: item.price, category: item.category || '極簡氣質', color: item.color || '裸色系', images: item.images || [] });
    setIsUploadModalOpen(true);
  };

  const closeModal = () => {
    setIsUploadModalOpen(false);
    setEditingItem(null);
    setFormData({ title: '', price: '', category: '極簡氣質', color: '裸色系', images: [] });
  };

  const filteredItems = cloudItems.filter(item => selectedFilter === '全部' || item.category === selectedFilter);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555] font-sans">
      {/* 導航 */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-[#EAE7E2]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <h1 className="text-xl tracking-[0.4em] font-light cursor-pointer text-[#463E3E]" onClick={() => setActiveTab('home')}>UNIWAWA</h1>
          <div className="flex gap-8 text-sm tracking-widest">
            <button onClick={() => setActiveTab('home')} className={activeTab === 'home' ? 'text-[#C29591]' : ''}>首頁</button>
            <button onClick={() => setActiveTab('catalog')} className={activeTab === 'catalog' ? 'text-[#C29591]' : ''}>設計款式</button>
            {isLoggedIn ? (
              <button onClick={() => setIsUploadModalOpen(true)} className="text-[#C29591] flex items-center gap-1"><Plus size={14}/> 新增</button>
            ) : (
              <button onClick={() => setIsAdminModalOpen(true)} className="text-gray-300"><Lock size={14}/></button>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-20 max-w-7xl mx-auto px-6">
        {activeTab === 'home' ? (
          <div className="text-center flex flex-col items-center animate-fade-in">
            <span className="text-[#C29591] tracking-[0.5em] text-xs mb-6">Est. 2025 • Taipei</span>
            <div className="w-full max-w-4xl mb-12 shadow-2xl rounded-sm overflow-hidden border border-[#EAE7E2]">
              <img src="https://drive.google.com/thumbnail?id=1ZJv3DS8ST_olFt0xzKB_miK9UKT28wMO&sz=w1200" className="w-full h-auto" alt="Hero" />
            </div>
            <h2 className="text-5xl md:text-7xl font-light mb-12 tracking-[0.2em] text-[#463E3E]">Beyond<br/>Expectation</h2>
            <button onClick={() => setActiveTab('catalog')} className="bg-[#463E3E] text-white px-12 py-4 hover:bg-[#C29591] transition-all tracking-widest text-sm">作品集</button>
          </div>
        ) : (
          <div>
            {/* 分類篩選列 */}
            <div className="flex flex-wrap gap-4 mb-12 justify-center border-b pb-8 border-[#EAE7E2]">
              {CATEGORIES.map(cat => (
                <button 
                  key={cat} 
                  onClick={() => setSelectedFilter(cat)}
                  className={`px-6 py-2 text-xs tracking-widest rounded-full transition-all border ${selectedFilter === cat ? 'bg-[#463E3E] text-white border-[#463E3E]' : 'text-gray-400 border-gray-200 hover:border-[#C29591]'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {filteredItems.map(item => (
                <div key={item.id} className="group relative bg-white border border-[#EAE7E2] overflow-hidden">
                  <div className="aspect-[3/4] overflow-hidden bg-[#F9F8F6] relative">
                    <img src={item.images?.[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={item.title} />
                    {isLoggedIn && (
                      <div className="absolute top-4 right-4 flex gap-2">
                        <button onClick={() => openEdit(item)} className="p-2 bg-white/80 backdrop-blur rounded-full text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-md"><Edit3 size={16}/></button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 bg-white/80 backdrop-blur rounded-full text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-md"><Trash2 size={16}/></button>
                      </div>
                    )}
                  </div>
                  <div className="p-6 text-center">
                    <span className="text-[10px] text-[#C29591] tracking-[0.2em] uppercase">{item.category}</span>
                    <h3 className="text-[#463E3E] font-medium text-lg mt-1 tracking-widest">{item.title}</h3>
                    <p className="text-[#C29591] font-bold mt-2">NT$ {item.price}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 登入彈窗 */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-10 max-w-sm w-full shadow-2xl rounded-sm">
            <h3 className="text-center tracking-widest mb-8">管理員登入</h3>
            <form onSubmit={handleAdminLogin} className="space-y-6">
              <input type="password" placeholder="輸入密碼" className="w-full border-b py-3 text-center tracking-[1em] focus:outline-none focus:border-[#C29591]" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} autoFocus />
              <button className="w-full bg-[#463E3E] text-white py-3 hover:bg-[#C29591] transition-all">確認</button>
              <button type="button" onClick={() => setIsAdminModalOpen(false)} className="w-full text-xs text-gray-400">取消</button>
            </form>
          </div>
        </div>
      )}

      {/* 新增/編輯 彈窗 */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white p-8 max-w-md w-full shadow-2xl my-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="tracking-widest">{editingItem ? '編輯款式' : '發布新款式'}</h3>
              <button onClick={closeModal}><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">款式名稱</label>
                <input type="text" className="w-full border-b py-2 focus:outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="例如: 晨露琥珀" required />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">價格</label>
                <input type="number" className="w-full border-b py-2 focus:outline-none" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="1680" required />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">產品分類</label>
                <select className="w-full border-b py-2 bg-transparent" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  {CATEGORIES.filter(c => c !== '全部').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {!editingItem && (
                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">照片上傳</label>
                  <input type="file" multiple className="mt-2 text-[10px]" onChange={handleImageChange} />
                  <div className="flex gap-2 mt-4 overflow-x-auto py-2">
                    {formData.images.map((src, i) => <img key={i} src={src} className="w-16 h-20 object-cover border border-[#EAE7E2]" />)}
                  </div>
                </div>
              )}
              <button disabled={isUploading} className="w-full bg-[#463E3E] text-white py-4 mt-4 hover:bg-[#C29591] disabled:opacity-50 tracking-widest text-sm transition-all shadow-lg">
                {isUploading ? '處理中...' : (editingItem ? '儲存修改' : '確認發布')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;