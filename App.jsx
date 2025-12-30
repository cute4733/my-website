{filteredItems.map(item => (
  <div key={item.id} className="group flex flex-col bg-white border border-[#F0EDEA] shadow-sm">
    <div className="aspect-[3/4] overflow-hidden relative">
      <img src={item.images?.[0]} className="w-full h-full object-cover" />
      {isLoggedIn && (
        <div className="absolute top-4 right-4 flex gap-2">
          <button onClick={() => {setEditingItem(item); setFormData(item); setIsUploadModalOpen(true);}} className="p-2 bg-white/90 rounded-full text-blue-600"><Edit3 size={16}/></button>
          <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', item.id))} className="p-2 bg-white/90 rounded-full text-red-600"><Trash2 size={16}/></button>
        </div>
      )}
    </div>
    <div className="p-8 flex flex-col items-center text-center">
      <span className="text-[10px] text-[#C29591] tracking-[0.4em] uppercase mb-2 font-medium">{item.category}</span>
      <h3 className="text-[#463E3E] font-medium text-lg tracking-widest mb-1">{item.title}</h3>
      
      {/* --- 加回服務時間顯示 --- */}
      <div className="flex items-center gap-1.5 text-gray-400 text-[10px] mb-4 uppercase tracking-widest font-light">
        <Clock size={12} />
        預計服務：{item.duration || '90'} 分鐘
      </div>
      {/* ---------------------- */}

      <p className="text-[#463E3E] font-bold text-xl mb-8"><span className="text-xs font-light tracking-widest mr-1">NT$</span>{item.price.toLocaleString()}</p>
      
      <div className="w-full mb-8 text-left">
        <select className="w-full text-[11px] border border-[#EAE7E2] py-3 px-4 bg-[#FAF9F6] outline-none" onChange={(e) => setSelectedAddon(addons.find(a => a.id === e.target.value) || null)}>
          <option value="">請選擇指甲現況</option>
          {addons.map(a => (<option key={a.id} value={a.id}>{a.name} (+${a.price} / {a.duration}分)</option>))}
        </select>
      </div>

      <button onClick={() => { setSelectedItem(item); setBookingStep('form'); window.scrollTo(0,0); }} className="bg-[#463E3E] text-white px-8 py-3.5 rounded-full text-xs tracking-[0.2em] font-medium w-full hover:bg-[#C29591] transition-colors">
        點此預約
      </button>
    </div>
  </div>
))}