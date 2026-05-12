import React, { useContext } from 'react'
import { ShopContext } from '../context/ShopContext'
import ProductItem from '../components/ProductItem'
import Title from '../components/Title'

const Search = () => {
  const { products, search } = useContext(ShopContext)

  const results = products.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className='px-5 pt-10 border-t'>
      <div className='flex justify-between items-center mb-6'>
        <Title text1='SEARCH' text2=' RESULTS' />
        <p className='text-sm text-gray-400 '>{results.length} items</p>
      </div>

      {results.length === 0 ? (
        <div className='text-center py-20 text-gray-400 text-sm'>
          No products found for "{search}"
        </div>
      ) : (
        <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 gap-y-6'>
          {results.map((item, index) => (
            <ProductItem
              key={index}
              name={item.name}
              id={item._id}
              price={item.price}
              image={`/${item.image[0]}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default Search