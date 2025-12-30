{bookingStep === 'form' ? (
  <div className="max-w-2xl mx-auto px-6 py-12 animate-in fade-in duration-500">
    <h2 className="text-2xl font-light tracking-[0.3em] text-center mb-8 text-[#463E3E]">RESERVATION / 預約資訊</h2>
    
    <div className="bg-white border border-[#EAE7E2] shadow-sm mb-8">
      {/* 預約項目摘要明細 */}
      <div className="bg-[#FAF9F6] p-6 border-b border-[#EAE7E2]">
        <h4 className="text-[10px] tracking-[0.2em] text-[#C29591] font-bold uppercase mb-4">預約明細 SUMMARY</h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">選取款式：</span>
            <span className="text-[#463E3E]">{selectedItem?.title}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">附加服務：</span>
            <span className="text-[#463E3E]">{selectedAddon?.name || '無'}</span>
          </div>
          <hr className="border-[#EAE7E2]" />
          <div className="flex justify-between items-end">
            <div>
              <span className="text-gray-400 text-[10px] block uppercase tracking-tighter">Total Duration</span>
              <div className="flex items-center gap-1 text-[#463E3E]">
                <Clock size={14} />
                <span className="font-medium">{(selectedItem?.duration || 0) + (selectedAddon?.duration || 0)} 分鐘</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[#C29591] text-[10px] block uppercase tracking-tighter font-bold">Total Amount</span>
              <span className="text-xl font-bold text-[#463E3E]">
                <span className="text-xs mr-1 font-light">NT$</span>
                {((selectedItem?.price || 0) + (selectedAddon?.price || 0)).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 填寫資訊表單 */}
      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] text-gray-400 uppercase tracking-widest">顧客姓名 NAME</label>
            <input type="text" placeholder="請輸入姓名" className="w-full border-b py-2 outline-none focus:border-[#C29591] transition-colors" onChange={e => setBookingData({...bookingData, name: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-gray-400 uppercase tracking-widest">聯絡電話 PHONE</label>
            <input type="tel" placeholder="請輸入電話" className="w-full border-b py-2 outline-none focus:border-[#C29591] transition-colors" onChange={e => setBookingData({...bookingData, phone: e.target.value})} />
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-[10px] text-gray-400 uppercase tracking-widest">選擇日期 DATE</label>
          <input type="date" className="w-full border p-3 bg-[#FAF9F6] outline-none" onChange={e => setBookingData({...bookingData, date: e.target.value})} />
        </div>

        <div className="space-y-4">
          <label className="text-[10px] text-gray-400 uppercase tracking-widest block">選擇時間時段 TIME SLOT</label>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
            {TIME_SLOTS.map(t => (
              <button 
                key={t} 
                onClick={() => setBookingData({...bookingData, time:t})} 
                className={`py-2 text-[10px] border transition-all ${bookingData.time === t ? 'bg-[#463E3E] border-[#463E3E] text-white' : 'bg-white text-gray-400 hover:border-[#C29591]'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <button 
          disabled={isSubmitting} 
          onClick={handleConfirmBooking} 
          className="w-full bg-[#463E3E] text-white py-4 text-xs tracking-[0.3em] uppercase hover:bg-[#C29591] transition-all disabled:bg-gray-300"
        >
          {isSubmitting ? '處理中...' : '確認送出預約'}
        </button>
        
        <button 
          onClick={() => setBookingStep('none')}
          className="w-full text-gray-400 text-[10px] tracking-widest uppercase hover:text-gray-600 transition-colors"
        >
          返回重新選擇
        </button>
      </div>
    </div>
  </div>
) : ...