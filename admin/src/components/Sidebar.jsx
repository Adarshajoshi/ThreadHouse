import React from 'react'
import { NavLink } from 'react-router-dom'
import { assets } from '../assets/assets'

const Sidebar = () => {
  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 border px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
      isActive
        ? 'bg-teal-700 text-white border-teal-700'
        : 'border-stone-200 text-stone-600 hover:bg-stone-100 :bg-stone-800'
    }`

  return (
    <div className="w-[18%] min-h-screen border-r border-stone-200 bg-white pt-6 pl-4 pr-2">
      <div className="flex flex-col gap-3">

        <NavLink className={linkClass} to="/add">
          <img className="w-5 h-5" src={assets.add_icon} alt="" />
          <p className="hidden md:block">Add Product</p>
        </NavLink>

        <NavLink className={linkClass} to="/list">
          <img className="w-5 h-5" src={assets.order_icon} alt="" />
          <p className="hidden md:block">Product List</p>
        </NavLink>

        <NavLink className={linkClass} to="/orders">
          <img className="w-5 h-5" src={assets.parcel_icon} alt="" />
          <p className="hidden md:block">Orders</p>
        </NavLink>

        <NavLink className={linkClass} to="/live">
          <span className="relative w-5 h-5 flex items-center justify-center">
            <span className="absolute w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
          </span>
          <p className="hidden md:block">Live Tracking</p>
        </NavLink>

        <NavLink className={linkClass} to="/intel">
          <p className="hidden md:block">Intel (ML)</p>
        </NavLink>

        <NavLink className={linkClass} to="/engagement">
          <p className="hidden md:block">Engagement</p>
        </NavLink>

      </div>
    </div>
  )
}

export default Sidebar
