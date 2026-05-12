import React, { useContext, useEffect, useRef, useState } from 'react'
import { ShopContext } from '../context/ShopContext';
import { assets } from '../assets/frontend_assets/assets';
import { trackSearch } from '../hooks/useAnalytics';

const SearchBar = () => {
    const {search,setSearch,showSearch,setShowSearch}=useContext(ShopContext);

    // RFM tracking: debounced search event (fires 700ms after the user stops typing)
    const debounceRef = useRef(null);
    useEffect(() => {
      if (!search) return;
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => trackSearch(search), 700);
      return () => clearTimeout(debounceRef.current);
    }, [search]);
  return showSearch?(
    <div className={`transition-all duration-300 overflow-hidden border-t border-b br-gray-50 text-center ${showSearch?'max-h-40 opacity-100':'max-h-0 opacity-0'} `}>
      <div className='inline-flex items-center justify-center border border-gray-400 px-5 py-2 my-5 mx-3 rounded-full w-3/4 sm:w-1/2'>
        <input 
        value={search} 
        onChange={(e)=>setSearch(e.target.value)} 
        className='flex-1 outline-none bg-inherit text-sm' 
        type='text' placeholder='Search'/>
        <img className='w-4' src={assets.search_icon} alt="" />
      </div>
      <img onClick={()=>setShowSearch(false)} className='inline w-3 cursor-pointer' src={assets.cross_icon} alt="" />
    </div>
  ) : null
}

export default SearchBar