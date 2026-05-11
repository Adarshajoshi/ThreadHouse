import React, { useState } from 'react'
import { assets } from '../assets/assets'
import { backendUrl } from '../App'
import axios from 'axios'
import { toast } from 'react-toastify'

const CATEGORIES = ['Men', 'Women', 'Kids']
const SUBCATEGORIES = ['Topwear', 'Bottomwear', 'Footwear', 'Accessories']
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

const Add = ({ token }) => {
  const [images, setImages] = useState([null, null, null, null])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('Men')
  const [subCategory, setSubCategory] = useState('Topwear')
  const [sizes, setSizes] = useState([])
  const [bestseller, setBestseller] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleImageChange = (index, file) => {
    const updated = [...images]
    updated[index] = file
    setImages(updated)
  }

  const toggleSize = (size) => {
    setSizes(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    )
  }

  const onSubmitHandler = async (e) => {
    e.preventDefault()
    if (sizes.length === 0) { toast.error('Select at least one size'); return }
    const validImages = images.filter(Boolean)
    if (validImages.length === 0) { toast.error('Upload at least one image'); return }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('description', description)
      formData.append('price', price)
      formData.append('category', category)
      formData.append('subCategory', subCategory)
      formData.append('sizes', JSON.stringify(sizes))
      formData.append('bestseller', bestseller)
      images.forEach((img, i) => {
        if (img) formData.append(`image${i + 1}`, img)
      })

      const response = await axios.post(backendUrl + '/api/product/add', formData, {
        headers: { token }
      })

      if (response.data.success) {
        toast.success('Product added successfully')
        setName(''); setDescription(''); setPrice('')
        setCategory('Men'); setSubCategory('Topwear')
        setSizes([]); setBestseller(false)
        setImages([null, null, null, null])
      } else {
        toast.error(response.data.message)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add product')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold text-stone-800 mb-6">Add New Product</h2>

      <form onSubmit={onSubmitHandler} className="flex flex-col gap-6">

        {/* Image uploads */}
        <div>
          <p className="text-sm font-medium text-stone-700 mb-2">Product Images</p>
          <div className="flex gap-3">
            {images.map((img, i) => (
              <label key={i} className="cursor-pointer">
                <div className="w-20 h-20 border-2 border-dashed border-stone-300 rounded-lg overflow-hidden hover:border-teal-600 transition-colors flex items-center justify-center bg-white">
                  {img
                    ? <img src={URL.createObjectURL(img)} className="w-full h-full object-cover" alt="" />
                    : <img src={assets.upload_area} className="w-8 h-8 opacity-40" alt="upload" />
                  }
                </div>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => handleImageChange(i, e.target.files[0])}
                />
              </label>
            ))}
          </div>
          <p className="text-xs text-stone-400 mt-1">Upload up to 4 images. First image is the main display.</p>
        </div>

        {/* Name */}
        <div>
          <p className="text-sm font-medium text-stone-700 mb-1">Product Name</p>
          <input
            value={name} onChange={e => setName(e.target.value)}
            className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-teal-600"
            placeholder="e.g. Slim Fit Chinos"
            required
          />
        </div>

        {/* Description */}
        <div>
          <p className="text-sm font-medium text-stone-700 mb-1">Description</p>
          <textarea
            value={description} onChange={e => setDescription(e.target.value)}
            className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-teal-600 resize-none"
            rows={4}
            placeholder="Describe the product..."
            required
          />
        </div>

        {/* Category / Subcategory / Price */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm font-medium text-stone-700 mb-1">Category</p>
            <select
              value={category} onChange={e => setCategory(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-teal-600 bg-white"
            >
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <p className="text-sm font-medium text-stone-700 mb-1">Sub Category</p>
            <select
              value={subCategory} onChange={e => setSubCategory(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-teal-600 bg-white"
            >
              {SUBCATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <p className="text-sm font-medium text-stone-700 mb-1">Price ($)</p>
            <input
              value={price} onChange={e => setPrice(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-teal-600"
              type="number" min="0" step="0.01"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        {/* Sizes */}
        <div>
          <p className="text-sm font-medium text-stone-700 mb-2">Available Sizes</p>
          <div className="flex flex-wrap gap-2">
            {SIZES.map(size => (
              <button
                key={size}
                type="button"
                onClick={() => toggleSize(size)}
                className={`px-4 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                  sizes.includes(size)
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'border-stone-300 text-stone-600 hover:border-teal-600'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Bestseller */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={bestseller}
            onChange={e => setBestseller(e.target.checked)}
            className="w-4 h-4 accent-teal-700"
          />
          <span className="text-sm text-stone-700">Mark as Bestseller</span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-40 bg-teal-700 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-teal-800 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Adding...' : 'Add Product'}
        </button>

      </form>
    </div>
  )
}

export default Add
