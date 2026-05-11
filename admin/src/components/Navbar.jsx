import React from 'react'
import { assets } from '../assets/assets'

const Navbar = ({ onLogout }) => {
  return (
    <div className="flex items-center py-3 px-[4%] justify-between bg-white shadow-sm">
      <img className="w-[max(10%,80px)] object-contain" src={assets.logo} alt="Logo" />
      <div className="flex items-center gap-4">
        <span className="text-sm text-stone-500 hidden sm:block">Threadhouse Admin</span>
        <button
          onClick={onLogout}
          className="bg-gray-700 text-white px-5 py-2 sm:px-7 sm:py-2 rounded-full text-xs sm:text-sm hover:bg-gray-900 transition-colors cursor-pointer"
        >
          Logout
        </button>
      </div>
    </div>
  )
}

export default Navbar
