// 請確保最上方的 import 只包含有使用的項目
import React, { useState, useEffect } from 'react';
import { Plus, X, Lock, Trash2, Edit3, MessageCircle, Settings, Clock } from 'lucide-react';

// ... (Firebase 初始化保持不變) ...

// 在渲染商品卡片的地方，確認 select 的處理方式如下：
<select 
  required 
  className="w-full text-[11px] border border-gray-200 py-2.5 px-3 rounded-sm bg-[#FAF9F6] text-[#5C5555] focus:outline-none focus:border-[#C29591]"
  defaultValue=""
  onChange={(e) => console.log(e.target.value)} // 增加一個空的處理函數防止警告
>
  <option value="" disabled>請選擇加購服務</option>
  <option value="none">不加購，僅施作此款式</option>
  {addons && addons.map(addon => (
    <option key={addon.id} value={addon.id}>
      {addon.name} (+${addon.price} / {addon.duration}分)
    </option>
  ))}
</select>