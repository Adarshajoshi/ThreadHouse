import React, { useEffect, useState } from 'react'
import { backendUrl } from '../App'
import axios from 'axios'
import { toast } from 'react-toastify'

const CATEGORIES    = ['Men', 'Women', 'Kids']
const SUBCATEGORIES = ['Topwear', 'Bottomwear', 'Footwear', 'Accessories']
const SIZES         = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

const List = ({ token }) => {
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [editing, setEditing]   = useState(null)        // product object or null
  const [savingEdit, setSavingEdit] = useState(false)

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const response = await axios.get(backendUrl + '/api/product/list')
      if (response.data.success) {
        setProducts(response.data.products || [])
      } else {
        toast.error(response.data.message)
      }
    } catch (err) {
      toast.error('Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProducts() }, [])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return
    setDeletingId(id)
    try {
      const response = await axios.post(
        backendUrl + '/api/product/remove',
        { id },
        { headers: { token } }
      )
      if (response.data.success) {
        toast.success('Product deleted')
        setProducts(prev => prev.filter(p => p._id !== id))
      } else {
        toast.error(response.data.message)
      }
    } catch (err) {
      toast.error('Failed to delete product')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSaveEdit = async () => {
    if (!editing) return
    setSavingEdit(true)
    try {
      const payload = {
        name:        editing.name,
        description: editing.description,
        price:       Number(editing.price) || 0,
        category:    editing.category,
        subCategory: editing.subCategory,
        sizes:       editing.sizes || [],
        bestseller:  !!editing.bestseller,
        stock:       Number(editing.stock) || 0,
      }
      const response = await axios.patch(
        `${backendUrl}/api/product/${editing._id}`,
        payload,
        { headers: { token } }
      )
      if (response.data.success) {
        toast.success('Product updated')
        setProducts(prev => prev.map(p => p._id === editing._id ? { ...p, ...payload } : p))
        setEditing(null)
      } else {
        toast.error(response.data.message || 'Update failed')
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Update failed')
    } finally {
      setSavingEdit(false)
    }
  }

  const toggleEditingSize = (size) => {
    setEditing(e => {
      if (!e) return e
      const next = e.sizes?.includes(size)
        ? e.sizes.filter(s => s !== size)
        : [...(e.sizes || []), size]
      return { ...e, sizes: next }
    })
  }

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-stone-800">
          All Products <span className="text-sm font-normal text-stone-400 ml-1">({products.length})</span>
        </h2>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products..."
          className="border border-stone-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-teal-600 w-52"
        />
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-stone-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          {search ? 'No products match your search.' : 'No products yet. Add your first product.'}
        </div>
      ) : (
        <>
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[80px_1fr_120px_80px_80px_150px] gap-4 px-4 py-2 text-xs font-semibold text-stone-500 uppercase tracking-wider border-b border-stone-200 mb-1">
            <span>Image</span>
            <span>Name</span>
            <span>Category</span>
            <span>Price</span>
            <span>Sizes</span>
            <span className="text-right">Actions</span>
          </div>

          <div className="flex flex-col gap-1">
            {filtered.map(product => (
              <div
                key={product._id}
                className="grid grid-cols-[80px_1fr_auto] md:grid-cols-[80px_1fr_120px_80px_80px_150px] gap-4 items-center px-4 py-3 bg-white rounded-lg border border-stone-200 hover:border-stone-300 transition-colors"
              >
                {/* Image */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                  <img
                    src={Array.isArray(product.image) ? product.image[0] : product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={e => { e.target.src = '' }}
                  />
                </div>

                {/* Name + bestseller */}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">{product.name}</p>
                  {product.bestseller && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full mt-0.5 inline-block">
                      Bestseller
                    </span>
                  )}
                </div>

                {/* Category */}
                <p className="text-sm text-stone-500 hidden md:block">
                  {product.category} · {product.subCategory}
                </p>

                {/* Price */}
                <div className="text-sm hidden md:block">
                  <p className="font-semibold text-stone-800">${Number(product.price).toLocaleString()}</p>
                  <p className={`text-[10px] mt-0.5 ${product.stock > 5 ? 'text-stone-400' : product.stock > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                    Stock: {product.stock ?? '—'}
                  </p>
                </div>

                {/* Sizes */}
                <div className="hidden md:flex flex-wrap gap-1">
                  {(product.sizes || []).map(s => (
                    <span key={s} className="text-xs border border-stone-200 px-1.5 py-0.5 rounded text-stone-500">{s}</span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 justify-end flex-shrink-0">
                  <button
                    onClick={() => setEditing({ ...product, sizes: product.sizes || [] })}
                    className="text-xs px-3 py-1.5 rounded-md border border-stone-300 bg-white hover:bg-teal-50 hover:border-teal-600 text-stone-700 hover:text-teal-700 font-medium transition-colors cursor-pointer"
                    title="Edit product"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product._id)}
                    disabled={deletingId === product._id}
                    className="text-xs px-3 py-1.5 rounded-md border border-red-300 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 font-medium transition-colors disabled:opacity-40 cursor-pointer"
                    title="Delete product"
                  >
                    {deletingId === product._id ? '…' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Edit modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/40 flex items-start justify-center pt-16 px-4 overflow-y-auto"
          onClick={() => !savingEdit && setEditing(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-stone-800">Edit product</h3>
              <button
                onClick={() => !savingEdit && setEditing(null)}
                className="text-stone-400 hover:text-stone-700 text-xl leading-none"
              >×</button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-medium text-stone-700 mb-1">Name</p>
                <input
                  value={editing.name || ''}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <p className="text-xs font-medium text-stone-700 mb-1">Description</p>
                <textarea
                  value={editing.description || ''}
                  onChange={e => setEditing({ ...editing, description: e.target.value })}
                  rows={3}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600 resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs font-medium text-stone-700 mb-1">Category</p>
                  <select
                    value={editing.category || ''}
                    onChange={e => setEditing({ ...editing, category: e.target.value })}
                    className="w-full border border-stone-300 rounded-lg px-2 py-2 text-sm outline-none focus:border-teal-600 bg-white"
                  >
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-xs font-medium text-stone-700 mb-1">Sub Category</p>
                  <select
                    value={editing.subCategory || ''}
                    onChange={e => setEditing({ ...editing, subCategory: e.target.value })}
                    className="w-full border border-stone-300 rounded-lg px-2 py-2 text-sm outline-none focus:border-teal-600 bg-white"
                  >
                    {SUBCATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-xs font-medium text-stone-700 mb-1">Price ($)</p>
                  <input
                    type="number" min="0" step="0.01"
                    value={editing.price ?? ''}
                    onChange={e => setEditing({ ...editing, price: e.target.value })}
                    className="w-full border border-stone-300 rounded-lg px-2 py-2 text-sm outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-stone-700 mb-2">Sizes</p>
                <div className="flex flex-wrap gap-2">
                  {SIZES.map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => toggleEditingSize(size)}
                      className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                        (editing.sizes || []).includes(size)
                          ? 'bg-teal-700 text-white border-teal-700'
                          : 'border-stone-300 text-stone-600 hover:border-teal-600'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!editing.bestseller}
                  onChange={e => setEditing({ ...editing, bestseller: e.target.checked })}
                  className="w-4 h-4 accent-teal-700"
                />
                <span className="text-sm text-stone-700">Mark as Bestseller</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => !savingEdit && setEditing(null)}
                className="text-sm px-4 py-2 rounded-lg border border-stone-300 text-stone-700 hover:border-teal-600"
              >Cancel</button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="text-sm px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white disabled:opacity-50"
              >{savingEdit ? 'Saving…' : 'Save changes'}</button>
            </div>

            <p className="text-xs text-stone-400 mt-3">Image swaps aren't supported here — re-add the product to change its images.</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default List
