import React from 'react'
import { Link } from 'react-router-dom'
import Title from './Title'

const categories = [
  { name: "Tops",        image: "/images/12990971_1.jpg", path: "/topwear" },
  { name: "Bottoms",     image: "/images/17007742_0.jpg", path: "/bottomwear" },
  { name: "Footwear",    image: "/images/17733241_0.jpg", path: "/footwear" },
  { name: "Accessories", image: "/images/15282745_0.jpg", path: "/accessories" },
]

const ShopByCategory = () => {
  return (
    <div className='my-10 px-4'>
      <div className='text-center py-8 text-3xl'>
        <Title text1={"SHOP BY"} text2={" CATEGORY"} />
        <p className='w-3/4 m-auto text-xs sm:text-sm md:text-base text-gray-600'>
          Find the perfect style for everyone — browse our top categories.
        </p>
      </div>

      <div className='grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 gap-y-6'>
        {categories.map((cat, index) => (
          <Link
            key={index}
            to={cat.path}
            className='relative cursor-pointer group overflow-hidden rounded-md block'
          >
            <img
              src={cat.image}
              alt={cat.name}
              className='w-full aspect-[4/5] object-contain group-hover:scale-105 transition-transform duration-300'
            />
            <div className='absolute bottom-0 left-0 right-0 bg-black bg-opacity-40 text-white text-center py-3'>
              <p className='text-sm sm:text-base md:text-lg font-semibold tracking-wide'>
                {cat.name}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default ShopByCategory
