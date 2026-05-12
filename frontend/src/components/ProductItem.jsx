import React, { useContext } from 'react'
import { ShopContext } from '../context/ShopContext'
import { Link } from 'react-router-dom'

const ProductItem = ({ id, image, name, price }) => {
  const { currency, toggleWishlist, isWishlisted } = useContext(ShopContext)
  const liked = !!isWishlisted?.(id)

  const onHeart = (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWishlist?.(id)
  }

  return (
    <Link className='text-gray-700 cursor-pointer block relative group' to={`/product/${id}`}>
      <button
        onClick={onHeart}
        type='button'
        aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'}
        className={`absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 backdrop-blur shadow-sm border border-gray-200 transition-opacity ${liked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
      >
        <svg viewBox='0 0 24 24' className='w-4 h-4' fill={liked ? '#dc2626' : 'none'} stroke={liked ? '#dc2626' : 'currentColor'} strokeWidth='2'>
          <path d='M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'/>
        </svg>
      </button>
      <div className='overflow-hidden'>
        <img className='hover:scale-110 transition ease-in-out' src={image} alt={name} />
      </div>
      <p className='pt-3 pb-1 text-sm'>{name}</p>
      <p className='text-sm font-medium'>{currency}{price}</p>
    </Link>
  )
}

export default ProductItem
