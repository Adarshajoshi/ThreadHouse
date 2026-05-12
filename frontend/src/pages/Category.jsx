import React, { useContext, useEffect, useState } from 'react'
import { ShopContext } from '../context/ShopContext'
import Title from '../components/Title'
import ProductItem from '../components/ProductItem'

const SUBCATEGORIES = {
  Men:   ['Topwear', 'Bottomwear', 'Footwear', 'Accessories'],
  Women: ['Topwear', 'Bottomwear', 'Footwear', 'Accessories'],
  Kids:  ['Topwear', 'Bottomwear', 'Footwear', 'Accessories'],
}

const SUBCAT_LABELS = {
  Topwear:     'Tops',
  Bottomwear:  'Bottoms',
  Footwear:    'Shoes',
  Accessories: 'Accessories',
}

const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const DENIM_SIZES    = ['28', '30', '32', '34', '36']
const FOOTWEAR_SIZES = ['37', '38', '39', '40', '41', '42', '43']

const PRICE_PRESETS = [
  { label: 'Under $200',    min: 0,   max: 200  },
  { label: '$200 – $500',   min: 200, max: 500  },
  { label: '$500 – $1000',  min: 500, max: 1000 },
  { label: 'Over $1000',    min: 1000, max: Infinity },
]

const FilterSection = ({ title, children }) => (
  <div className='border border-gray-300 pl-5 pr-3 py-3 mt-4'>
    <p className='mb-3 text-sm font-medium'>{title}</p>
    {children}
  </div>
)

const Category = ({ category }) => {
  const { products,search,showSearch } = useContext(ShopContext)

  const [showFilter, setShowFilter]         = useState(false)
  const [filterProducts, setFilterProducts] = useState([])
  const [subCategory, setSubCategory]       = useState([])
  const [selectedSizes, setSelectedSizes]   = useState([])
  const [selectedPreset, setSelectedPreset] = useState(null)
  const [minPrice, setMinPrice]             = useState('')
  const [maxPrice, setMaxPrice]             = useState('')
  const [sortBy, setSortBy]                 = useState('relevance')

  const toggleSubCategory = (value) => {
    setSubCategory(prev =>
      prev.includes(value) ? prev.filter(i => i !== value) : [...prev, value]
    )
  }

  const toggleSize = (size) => {
    setSelectedSizes(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    )
  }

  const selectPreset = (preset) => {
    if (selectedPreset?.label === preset.label) {
      setSelectedPreset(null)
    } else {
      setSelectedPreset(preset)
      setMinPrice('')
      setMaxPrice('')
    }
  }

  const handleMinPrice = (val) => {
    setMinPrice(val)
    setSelectedPreset(null)
  }

  const handleMaxPrice = (val) => {
    setMaxPrice(val)
    setSelectedPreset(null)
  }

  const clearPrice = () => {
    setSelectedPreset(null)
    setMinPrice('')
    setMaxPrice('')
  }

  const activeSizeGroups = () => {
    const active = subCategory.length > 0 ? subCategory : ['Topwear', 'Bottomwear', 'Footwear']
    const groups = []
    if (active.includes('Topwear') || active.includes('Accessories')) groups.push({ label: 'Clothing', sizes: CLOTHING_SIZES })
    if (active.includes('Bottomwear')) groups.push({ label: 'Denim', sizes: DENIM_SIZES })
    if (active.includes('Footwear')) groups.push({ label: 'Footwear', sizes: FOOTWEAR_SIZES })
    return groups.filter((g, i, arr) => arr.findIndex(x => x.label === g.label) === i)
  }

  useEffect(() => {
    if (!products) return

    let result = products.filter(item => item.category === category)

    if(showSearch&&search){
      result=result.filter(item=>item.name.toLowerCase().includes(search.toLowerCase()))
    }
    if (subCategory.length > 0) {
      result = result.filter(item => subCategory.includes(item.subCategory))
    }

    if (selectedSizes.length > 0) {
      result = result.filter(item =>
        Array.isArray(item.sizes) && item.sizes.some(s => selectedSizes.includes(s))
      )
    }

    // Price filter 
    if (selectedPreset) {
      result = result.filter(item => item.price >= selectedPreset.min && item.price <= selectedPreset.max)
    } else {
      const min = minPrice !== '' ? Number(minPrice) : null
      const max = maxPrice !== '' ? Number(maxPrice) : null
      if (min !== null) result = result.filter(item => item.price >= min)
      if (max !== null) result = result.filter(item => item.price <= max)
    }

    if (sortBy === 'low-high') {
      result = [...result].sort((a, b) => a.price - b.price)
    } else if (sortBy === 'high-low') {
      result = [...result].sort((a, b) => b.price - a.price)
    }

    setFilterProducts(result)
  }, [products, category, subCategory, selectedSizes, selectedPreset, minPrice, maxPrice, sortBy, search, showSearch])

  const subcats    = SUBCATEGORIES[category] || ['Topwear', 'Bottomwear', 'Footwear', 'Accessories']
  const sizeGroups = activeSizeGroups()
  const priceActive = selectedPreset || minPrice !== '' || maxPrice !== ''

  return (
    <div className='flex flex-col sm:flex-row gap-1 pt-10 border-t px-5'>

      {/* Filter Panel */}
      <div className='w-full sm:w-44 sm:min-w-[176px] pr-4'>
        <p
          onClick={() => setShowFilter(!showFilter)}
          className='my-2 text-xl flex items-center cursor-pointer gap-2'
        >
          FILTERS
          <span className={`sm:hidden text-xs inline-block transition-transform duration-200 ${showFilter ? 'rotate-90' : ''}`}>▶</span>
        </p>

        <div className={`${showFilter ? '' : 'hidden'} sm:block`}>

          {/* Sort By */}
          <FilterSection title='SORT BY'>
            <div className='flex flex-col gap-2 text-sm text-gray-700 '>
              {[
                { value: 'relevance', label: 'Relevance' },
                { value: 'low-high',  label: 'Price: Low to High' },
                { value: 'high-low',  label: 'Price: High to Low' },
              ].map(opt => (
                <label key={opt.value} className='flex gap-2 cursor-pointer'>
                  <input
                    type='radio'
                    name='sortby'
                    value={opt.value}
                    checked={sortBy === opt.value}
                    onChange={e => setSortBy(e.target.value)}
                    className='w-3'
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </FilterSection>

          {/* Types */}
          <FilterSection title='TYPES'>
            <div className='flex flex-col gap-2 text-sm text-gray-700 '>
              {subcats.map(cat => (
                <label key={cat} className='flex gap-2 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={subCategory.includes(cat)}
                    onChange={() => toggleSubCategory(cat)}
                    className='w-3'
                  />
                  {SUBCAT_LABELS[cat]}
                </label>
              ))}
            </div>
          </FilterSection>

          {/* Price */}
          <FilterSection title='PRICE'>
            <div className='flex flex-col gap-2'>
              {/* Presets */}
              {PRICE_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => selectPreset(preset)}
                  className={`text-left text-sm px-2 py-1 border transition-all duration-150
                    ${selectedPreset?.label === preset.label
                      ? 'border-black bg-black text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-400'
                    }`}
                >
                  {preset.label}
                </button>
              ))}

              {/* Manual min/max */}
              <div className='flex items-center gap-1 mt-1'>
                <input
                  type='number'
                  placeholder='Min'
                  value={minPrice}
                  onChange={e => handleMinPrice(e.target.value)}
                  className='w-full border border-gray-300 text-xs px-2 py-1 text-gray-700 focus:outline-none focus:border-black'
                />
                <span className='text-gray-400 text-xs'>–</span>
                <input
                  type='number'
                  placeholder='Max'
                  value={maxPrice}
                  onChange={e => handleMaxPrice(e.target.value)}
                  className='w-full border border-gray-300 text-xs px-2 py-1 text-gray-700 focus:outline-none focus:border-black'
                />
              </div>

              {priceActive && (
                <p
                  onClick={clearPrice}
                  className='text-xs text-gray-400 cursor-pointer hover:text-black'
                >
                  Clear price
                </p>
              )}
            </div>
          </FilterSection>

          {/* Size */}
          <FilterSection title='SIZE'>
            <div className='flex flex-col gap-3'>
              {sizeGroups.map(group => (
                <div key={group.label}>
                  {sizeGroups.length > 1 && (
                    <p className='text-xs text-gray-400 mb-1'>{group.label}</p>
                  )}
                  <div className='flex flex-wrap gap-1'>
                    {group.sizes.map(size => (
                      <button
                        key={size}
                        onClick={() => toggleSize(size)}
                        className={`text-xs px-2 py-1 border transition-all duration-150
                          ${selectedSizes.includes(size)
                            ? 'border-black bg-black text-white'
                            : 'border-gray-300 text-gray-600 hover:border-gray-500'
                          }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {selectedSizes.length > 0 && (
                <p
                  onClick={() => setSelectedSizes([])}
                  className='text-xs text-gray-400 cursor-pointer hover:text-black'
                >
                  Clear sizes
                </p>
              )}
            </div>
          </FilterSection>

        </div>
      </div>

      {/* Product Grid */}
      <div className='flex-1 px-2'>
        <div className='flex justify-between items-center mb-6'>
          <Title text1={`${category.toUpperCase()}'S`} text2={' COLLECTION'} />
          <p className='text-sm text-gray-400 '>{filterProducts.length} items</p>
        </div>

        {filterProducts.length === 0 ? (
          <div className='text-center py-20 text-gray-400 text-sm'>
            No products found. Try adjusting your filters.
          </div>
        ) : (
          <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 gap-y-6'>
            {filterProducts.map((item, index) => (
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

    </div>
  )
}

export default Category
