import React from 'react'
import { Link } from 'react-router-dom'
import { assets } from '../assets/frontend_assets/assets'

const Hero = () => {
  return (
    <div className='relative h-[92vh] w-full overflow-hidden '>

      {/* Background image */}
      <img 
        src={assets.hero_img} 
        alt="Hero" 
        className="absolute inset-0 h-full w-full object-cover object-[80%_30%] -z-10" 
      />

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />

      {/* Content */}
      <div className="relative z-10 h-full flex items-end sm:items-center pb-24 sm:pb-0 px-6 sm:px-12 md:px-16">
        <div className="max-w-lg text-white">

          <p className="text-xs sm:text-sm tracking-[0.3em] uppercase mb-3 opacity-75">
            Welcome to Threadhouse
          </p>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-light mb-4 leading-tight">
            Dress the <br />Moment
          </h1>

          <p className="text-sm sm:text-base md:text-lg mb-8 leading-relaxed opacity-85 max-w-xs sm:max-w-sm">
            Curated styles for every occasion —
            explore our latest topwear collection.
          </p>

          <Link to='/topwear'>
            <button className='bg-white text-black py-3 px-8 text-xs sm:text-sm tracking-widest font-semibold hover:bg-black hover:text-white transition duration-300 cursor-pointer w-full sm:w-auto'>
              SHOP TOPWEAR
            </button>
          </Link>

        </div>
      </div>

    </div>
  )
}

export default Hero