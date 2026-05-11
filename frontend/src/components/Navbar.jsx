import React, { useContext,useState, useRef, useEffect } from 'react'
import { assets } from '../assets/frontend_assets/assets'
import { Link, NavLink ,useLocation, useNavigate } from 'react-router-dom'
import { ShopContext } from '../context/ShopContext'

const Navbar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const isHomePage = location.pathname === '/'
  const [visible, setVisible] = useState(false)
  const {setSearch,showSearch, setShowSearch,getCartCount,isLoggedIn, logout, user} = useContext(ShopContext)
  const [showProfile, setShowProfile] = useState(false)
  const profileRef = useRef(null)

  const handleSearch = (e) => {
    setSearch(e.target.value)
    if (isHomePage) navigate('/search')
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className='flex items-center justify-between py-5 font-medium px-4 '>
      <a href='/'>
        <img src={assets.logo} className='w-50' alt="" />
      </a>

      <ul className='hidden sm:flex gap-7 text-md text-stone-500 '>
        <NavLink to='/men' className='flex flex-col items-center gap-1 hover:text-black hover:scale-110 transition-transform'>
          <p>MEN</p>
          <hr className='w-2/4 border-none h-[1.5px] bg-gray-700 hidden' />
        </NavLink>
        <NavLink to='/women' className='flex flex-col items-center gap-1 hover:text-black hover:scale-110 transition-transform'>
          <p>WOMEN</p>
          <hr className='w-2/4 border-none h-[1.5px] bg-gray-700 hidden' />
        </NavLink>
        <NavLink to='/kids' className='flex flex-col items-center gap-1 hover:text-black hover:scale-110 transition-transform'>
          <p>KIDS</p>
          <hr className='w-2/4 border-none h-[1.5px] bg-gray-700 hidden' />
        </NavLink>
      </ul>

      <div className="flex items-center gap-6">

        {/* Search Bar */}
        
        <div className={`flex items-center border rounded-full px-2 transition-all duration-300 bg-white overflow-hidden ${showSearch ? 'w-100 h-10 border-stone-300 ' : 'w-10 border-transparent'}`}>
          
          <img
            className='w-5 cursor-pointer hover:scale-125 transition-transform duration-200'
            src={assets.search_icon}
            alt='search'
            onClick={() => setShowSearch(!showSearch)}
          />
          <input
            type="text"
            placeholder='Search'
            onChange={handleSearch}
            className={`ml-2 outline-none text-sm transition-all duration-300 ${showSearch ? 'w-full opacity-100' : 'w-0 opacity-0'}`}
          />
        </div> 

        {/* Profile Icon  */}
        <div className='relative' ref={profileRef}>
          <img
            onClick={() => isLoggedIn ? setShowProfile(!showProfile) : navigate('/login')}
            src={assets.profile_icon}
            className='w-5 cursor-pointer'
            alt='profile'
          />
          {showProfile && isLoggedIn && (
            <div style={{ right: 0, top: 'calc(100% + 6px)' }}
              className='absolute w-56 bg-white border border-stone-200 rounded-xl overflow-hidden z-50 '>

              {/* User info header */}
              <div className='flex items-center gap-3 px-4 py-3 border-b border-stone-200 '>
                <div className='w-9 h-9 rounded-full bg-black text-white flex items-center justify-center text-xs font-medium flex-shrink-0 '>
                  {user?.name?.slice(0,2).toUpperCase()}
                </div>
                <div className='min-w-0'>
                  <p className='text-sm font-medium truncate'>{user?.name}</p>
                  <p className='text-xs text-stone-400 truncate'>{user?.email}</p>
                </div>
              </div>

              {/* Nav items */}
              <div className='p-1.5'>
                {[
                  { label: 'My profile',     path: '/profile' },
                  { label: 'My orders',      path: '/orders'  },
                  { label: 'Track delivery', path: '/delivery'},
                ].map(item => (
                  <button key={item.path}
                    onClick={() => { navigate(item.path); setShowProfile(false) }}
                    className='w-full text-left text-sm px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-stone-700 cursor-pointer'>
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Sign out */}
              <div className='p-1.5 border-t border-stone-200 '>
                <button onClick={logout}
                  className='w-full text-left text-sm px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors cursor-pointer'>
                  Sign out
                </button>
              </div>

            </div>
          )}
        </div>

        {/* Cart */}
        <Link to='/cart' className='relative'>
          <img src={assets.cart_icon} className='w-5 min-w-5 hover:scale-125 transition-transform duration-200' alt='' />
          <p className='absolute right-[-5px] bottom-[-5px] w-4 text-center leading-4 bg-black text-white aspect-square rounded-full text-[8px]'>{getCartCount()}</p>
        </Link>

        {/* Mobile Menu Icon */}
        <img
          onClick={() => setVisible(true)}
          src={assets.menu_icon}
          className='w-5 cursor-pointer sm:hidden'
          alt=""
        />
      </div>

      {/* Sidebar for small screens */}
      <div className={`absolute top-0 right-0 bottom-0 overflow-hidden z-50 bg-white transition-all ${visible ? 'w-full' : 'w-0'} sm:hidden`}>
        <div className="flex flex-col text-stone-600">
          <div onClick={() => setVisible(false)} className="flex items-center gap-4 p-3 cursor-pointer">
            <img src={assets.dropdown_icon} className='h-4 rotate-180' alt="" />
            <p>Back</p>
          </div>
          <NavLink onClick={() => setVisible(false)} className='py-2 pl-6 border' to='/'>LATEST</NavLink>
          <NavLink onClick={() => setVisible(false)} className='py-2 pl-6 border' to='/men'>MEN</NavLink>
          <NavLink onClick={() => setVisible(false)} className='py-2 pl-6 border' to='/women'>WOMEN</NavLink>
          <NavLink onClick={() => setVisible(false)} className='py-2 pl-6 border' to='/kids'>KIDS</NavLink>
        </div>
      </div>
    </div>
  )
}

export default Navbar
