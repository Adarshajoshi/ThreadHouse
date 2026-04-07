import React from 'react'
import {assets} from '../assets/assets'

const Navbar = () => {
  return (
    <div className='flex items-center py-2 px-[4%] justify-between'>
        <img className='w-[max(15%,100px)]' src={assets.logo} alt="Logo" />
        <button className='bg-gray-600 text-white px-5 py-2 sm:px-7 sm:py-2 rounded-full text-xs sm:test-sm'>Logout</button>
    </div>
  )
}

export default Navbar