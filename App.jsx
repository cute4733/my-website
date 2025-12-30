return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#5C5555] font-sans">
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-[#EAE7E2]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <h1 className="text-xl tracking-[0.4em] font-extralight cursor-pointer text-[#463E3E]" onClick={() => {setActiveTab('home'); setBookingStep('none');}}>UNIWAWA</h1>
          <div className="flex gap-6 text-sm tracking-widest font-medium uppercase items-center">
            <button onClick={() => {setActiveTab('home'); setBookingStep('none');}} className={activeTab === 'home' && bookingStep === 'none' ? 'text-[#C29591]' : ''}>首頁</button>
            <button onClick={() => {setActiveTab('catalog'); setBookingStep('none');}} className={activeTab === 'catalog' && bookingStep === 'none' ? 'text-[#C29591]' : ''}>作品</button>
            {isLoggedIn && (
              <div className="flex gap-4 border-l pl-4 border-[#EAE7E2]">
                <button onClick={() => {setEditingItem(null); setFormData({title:'', price:'', category:'極簡氣質', duration:'90', images:[]}); setIsUploadModalOpen(true)}} className="text-[#C29591]"><Plus size={18}/></button>
                <button onClick={() => setIsBookingManagerOpen(true)} className="text-[#C29591]"><List size={18}/></button>
                <button onClick={() => setIsStoreManagerOpen(true)} className="text-[#C29591]"><MapPin size={18}/></button>
              </div>
            )}
            {!isLoggedIn && <button onClick={() => setIsAdminModalOpen(true)} className="text-gray-300"><Lock size={14}/></button>}
          </div>
        </div>
      </nav>

      <main className="pt-20">
        {bookingStep === 'form' ? (
          /* 預約表單頁面 */
          <div className="max-w-2xl mx-auto px-6 py-12">
            <h2 className="text-2xl font-light tracking-[0.3em] text-center mb-12 uppercase">Booking Details</h2>
            <div className="bg-white border p-8 space-y-8 shadow-sm">
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
                        className={`py-2 text-[9px] border ${bookingData.time === t ? 'bg-[#463E3E] text-white' : isFull ? 'bg-red-50 text-red-200 cursor-not-allowed' : isClosed ? 'bg-gray-50 text-gray-100 cursor-not-allowed' : 'bg-white text-gray-400'}`}
                      >
                        {isFull ? '已滿' : t}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="姓名" className="border-b py-2 outline-none" onChange={e => setBookingData({...bookingData, name: e.target.value})} />
                <input type="tel" placeholder="電話" className="border-b py-2 outline-none" onChange={e => setBookingData({...bookingData, phone: e.target.value})} />
              </div>
              <div className="flex items-center gap-3 py-4 border-t">
                <input type="checkbox" id="policy" checked={policyAccepted} onChange={e => setPolicyAccepted(e.target.checked)} className="accent-[#C29591]" />
                <label htmlFor="policy" className="text-xs text-gray-500">我已閱讀並同意 <button onClick={() => setIsPolicyModalOpen(true)} className="text-[#C29591] underline">預約政策</button></label>
              </div>
              <button disabled={isSubmitting} onClick={handleConfirmBooking} className="w-full bg-[#463E3E] text-white py-4 text-xs tracking-widest uppercase hover:bg-[#C29591]">
                {isSubmitting ? '處理中...' : `確認預約 (上限: ${settings.maxCapacity}人)`}
              </button>
            </div>
          </div>
        ) : bookingStep === 'success' ? (
          /* 預約成功頁面 */
          <div className="max-w-lg mx-auto px-6 py-20 flex flex-col items-center text-center">
            <CheckCircle size={48} className="text-[#06C755] mb-6" strokeWidth={1} />
            <h2 className="text-2xl font-light tracking-[0.4em] mb-4 text-[#463E3E]">預約已完成</h2>
            <button onClick={() => {setBookingStep('none'); setActiveTab('home');}} className="border border-[#463E3E] text-[#463E3E] px-12 py-3 text-xs tracking-[0.3em]">回到首頁</button>
          </div>
        ) : activeTab === 'home' ? (
          /* 首頁 */
          <div className="flex flex-col items-center">
            <section className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center">
              <span className="text-[#C29591] tracking-[0.4em] md:tracking-[0.8em] text-xs md:text-sm mb-10 uppercase font-extralight whitespace-nowrap">EST. 2026 • TAOYUAN</span>
              <div className="w-full max-w-xl mb-12 shadow-2xl rounded-sm overflow-hidden border border-[#EAE7E2]">
                <img src="https://drive.google.com/thumbnail?id=1ZJv3DS8ST_olFt0xzKB_miK9UKT28wMO&sz=w1200" className="w-full h-auto max-h-[40vh] object-cover" alt="Banner" />
              </div>
              <h2 className="text-4xl md:text-5xl font-extralight mb-12 tracking-[0.4em] text-[#463E3E] leading-relaxed">Beyond<br/>Expectation</h2>
              <button onClick={() => setActiveTab('catalog')} className="bg-[#463E3E] text-white px-16 py-4 tracking-[0.4em] text-xs font-light">進入作品集</button>
            </section>
            <section className="w-full bg-white py-24 border-y border-[#EAE7E2]">
              <div className="max-w-5xl mx-auto px-6 text-center">
                <h3 className="text-xs tracking-[0.5em] text-gray-400 mb-16 uppercase font-bold">What Clients Say</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  {reviews.map((r, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="flex gap-1 mb-4 text-[#C29591]">
                        {[...Array(r.stars)].map((_, s) => <Star key={s} size={12} fill="#C29591" />)}
                      </div>
                      <p className="text-sm italic text-gray-500 mb-4 leading-relaxed">"{r.content}"</p>
                      <span className="text-[10px] tracking-widest text-[#463E3E] font-bold">— {r.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        ) : (
          /* 作品集頁面 */
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="flex justify-center gap-8 mb-12 text-[10px] tracking-[0.3em] uppercase font-bold text-gray-400">
              {STYLE_CATEGORIES.map(c => <button key={c} onClick={() => setStyleFilter(c)} className={styleFilter === c ? 'text-[#463E3E]' : ''}>{c}</button>)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16">
              {filteredItems.map(item => (
                <div key={item.id} className="bg-white border border-[#F0EDEA] shadow-sm flex flex-col">
                  <div className="aspect-[3/4] overflow-hidden relative group">
                    <img src={item.images?.[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={item.title} />
                    {isLoggedIn && (
                      <div className="absolute top-4 right-4 flex gap-2">
                        <button onClick={() => {setEditingItem(item); setFormData(item); setIsUploadModalOpen(true);}} className="p-2 bg-white/90 rounded-full text-blue-600 shadow-sm"><Edit3 size={14}/></button>
                        <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nail_designs', item.id))} className="p-2 bg-white/90 rounded-full text-red-600 shadow-sm"><Trash2 size={14}/></button>
                      </div>
                    )}
                  </div>
                  <div className="p-8 text-center flex flex-col items-center">
                    <span className="text-[9px] text-[#C29591] tracking-[0.4em] mb-2 uppercase">{item.category}</span>
                    <h3 className="text-lg tracking-widest mb-1">{item.title}</h3>
                    <div className="text-[10px] text-gray-400 flex items-center gap-1 mb-4 font-light"><Clock size={12}/> {item.duration} MINS</div>
                    <div className="text-xl font-bold mb-8">NT$ {item.price.toLocaleString()}</div>
                    <div className="w-full mb-8 text-left">
                      <select className="w-full text-[11px] border border-[#EAE7E2] py-3 px-4 bg-[#FAF9F6] outline-none" onChange={(e) => setSelectedAddon(addons.find(a => a.id === e.target.value) || null)}>
                        <option value="">請選擇指甲現況</option>
                        <option value="none">不加購</option>
                        {addons.map(a => (<option key={a.id} value={a.id}>{a.name} (+${a.price} / {a.duration}分)</option>))}
                      </select>
                    </div>
                    <button onClick={() => { setSelectedItem(item); setBookingStep('form'); window.scrollTo(0,0); }} className="w-full py-3 bg-[#463E3E] text-white text-[10px] tracking-widest uppercase hover:bg-[#C29591]">點此預約</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* --- 所有彈窗 (Modals) --- */}
      {/* 這裡請保留原本的 isAdminModalOpen, isUploadModalOpen, isBookingManagerOpen, isPolicyModalOpen, isStoreManagerOpen 等彈窗代碼 */}
      
    </div>
  );