{filteredItems.map(item => (
  <div key={item.id} className="group bg-white border border-[#EAE7E2] overflow-hidden flex flex-col shadow-sm">
    <div className="aspect-[3/4] overflow-hidden relative">
      <img src={item.images?.[0]} className="w-full h-full object-cover" alt={item.title} />
      {isLoggedIn && (
        <div className="absolute top-4 right-4 flex gap-2">
          <button onClick={() => {setEditingItem(item); setFormData(item); setIsUploadModalOpen(true);}} className="p-2 bg-white/90 rounded-full text-blue-600 shadow-md"><Edit3 size={16}/></button>
          <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', item.id))} className="p-2 bg-white/90 rounded-full text-red-600 shadow-md"><Trash2 size={16}/></button>
        </div>
      )}
    </div>
    <div className="p-8 flex-grow flex flex-col items-center text-center">
      <span className="text-[10px] text-[#C29591] tracking-[0.3em] uppercase mb-1">{item.category}</span>
      <h3 className="text-[#463E3E] font-medium text-lg tracking-widest">{item.title}</h3>
      
      <div className="flex items-center gap-1 text-gray-400 text-xs mt-1 mb-2">
        <Clock size={12} /> <span>基本時長: {item.duration || '--'} 分鐘</span>
      </div>

      <p className="text-[#C29591] font-bold mb-4">NT$ {item.price}</p>
      
      {/* 必填加購下拉選單 */}
      <div className="w-full mb-6 text-left">
        <label className="text-[9px] text-gray-400 tracking-widest uppercase mb-1 block ml-1">服務選項 (必選)</label>
        <select 
          required 
          className="w-full text-[11px] border border-gray-200 py-2.5 px-3 rounded-sm bg-[#FAF9F6] text-[#5C5555] focus:outline-none focus:border-[#C29591]"
          defaultValue=""
        >
          <option value="" disabled>請選擇加購服務</option>
          <option value="none">不加購，僅施作此款式</option>
          {addons.map(addon => (
            <option key={addon.id} value={addon.id}>
              {addon.name} (+${addon.price} / {addon.duration}分)
            </option>
          ))}
        </select>
      </div>

      <a href="https://lin.ee/Nes3ZBI" target="_blank" className="mt-auto flex items-center gap-2 bg-[#06C755] text-white px-8 py-2.5 rounded-full text-xs tracking-[0.2em] font-medium w-full justify-center">
        <MessageCircle size={14} /> 預約諮詢
      </a>
    </div>
  </div>
))}