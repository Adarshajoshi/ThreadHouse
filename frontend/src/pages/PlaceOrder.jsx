import { useAnalytics } from '../hooks/useAnalytics'
import React, { useState, useContext,useEffect } from 'react'
import Title from '../components/Title'
import CartTotal from '../components/CartTotal'
import { assets } from '../assets/frontend_assets/assets'
import { ShopContext } from '../context/ShopContext'

const PlaceOrder = () => {
  const { placeOrder, getCartAmount } = useContext(ShopContext)
  const [method, setMethod] = useState('cod')
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '',
    street: '', city: '', state: '',
    zipCode: '', country: '', phone: ''
  })
  const [errors, setErrors] = useState({})
  const { track } = useAnalytics()

  useEffect(() => {
    track('checkout_start', 'placeorder_page', null)
  }, [])


  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setErrors({ ...errors, [e.target.name]: '' })
  }

  const validate = () => {
    const newErrors = {}
    if (!form.firstName.trim()) newErrors.firstName = 'Required'
    if (!form.lastName.trim())  newErrors.lastName  = 'Required'
    if (!form.email.trim())     newErrors.email     = 'Required'
    if (!form.street.trim())    newErrors.street    = 'Required'
    if (!form.city.trim())      newErrors.city      = 'Required'
    if (!form.country.trim())   newErrors.country   = 'Required'
    if (!form.phone.trim())     newErrors.phone     = 'Required'
    return newErrors
  }

  const handlePlaceOrder = () => {
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    if (getCartAmount() === 0) return
    placeOrder(form, method)
  }

  const inputClass = (field) =>
    `border rounded py-1.5 px-3.5 w-full outline-none focus:border-black transition-colors ${errors[field] ? 'border-red-400' : 'border-gray-300'}`

  return (
    <div className='flex flex-col sm:flex-row justify-between gap-4 pt-5 sm:pt-14 min-h-[80vh] border-t'>

      {/* Left — Delivery Info */}
      <div className='flex flex-col gap-4 w-full sm:max-w-[480px] pl-4'>
        <div className='text-xl sm:text-2xl my-3'>
          <Title text1={"DELIVERY"} text2={" INFORMATION"} />
        </div>
        <div className='flex gap-3'>
          <div className='w-full'>
            <input name='firstName' value={form.firstName} onChange={handleChange}
              className={inputClass('firstName')} type="text" placeholder="First name" />
            {errors.firstName && <p className='text-red-400 text-xs mt-1'>{errors.firstName}</p>}
          </div>
          <div className='w-full'>
            <input name='lastName' value={form.lastName} onChange={handleChange}
              className={inputClass('lastName')} type="text" placeholder="Last name" />
            {errors.lastName && <p className='text-red-400 text-xs mt-1'>{errors.lastName}</p>}
          </div>
        </div>
        <div>
          <input name='email' value={form.email} onChange={handleChange}
            className={inputClass('email')} type="email" placeholder="Email address" />
          {errors.email && <p className='text-red-400 text-xs mt-1'>{errors.email}</p>}
        </div>
        <div>
          <input name='street' value={form.street} onChange={handleChange}
            className={inputClass('street')} type="text" placeholder="Street" />
          {errors.street && <p className='text-red-400 text-xs mt-1'>{errors.street}</p>}
        </div>
        <div className='flex gap-3'>
          <div className='w-full'>
            <input name='city' value={form.city} onChange={handleChange}
              className={inputClass('city')} type="text" placeholder="City" />
            {errors.city && <p className='text-red-400 text-xs mt-1'>{errors.city}</p>}
          </div>
          <input name='state' value={form.state} onChange={handleChange}
            className={inputClass('state')} type="text" placeholder="State" />
        </div>
        <div className='flex gap-3'>
          <input name='zipCode' value={form.zipCode} onChange={handleChange}
            className={inputClass('zipCode')} type="number" placeholder="Zip Code" />
          <div className='w-full'>
            <input name='country' value={form.country} onChange={handleChange}
              className={inputClass('country')} type="text" placeholder="Country" />
            {errors.country && <p className='text-red-400 text-xs mt-1'>{errors.country}</p>}
          </div>
        </div>
        <div>
          <input name='phone' value={form.phone} onChange={handleChange}
            className={inputClass('phone')} type="number" placeholder="Phone" />
          {errors.phone && <p className='text-red-400 text-xs mt-1'>{errors.phone}</p>}
        </div>
      </div>

      {/* Right — Summary + Payment */}
      <div className='mt-8'>
        <div className='mt-8 min-w-80'><CartTotal /></div>
        <div className='mt-12'>
          <Title text1={'PAYMENT'} text2={' METHOD'} />
          <div className='flex gap-3 flex-col lg:flex-row'>
            <div onClick={() => setMethod('esewa')} className='flex items-center gap-3 border p-2 px-3 cursor-pointer'>
              <p className={`min-w-3.5 h-3.5 border rounded-full ${method === 'esewa' ? 'bg-green-400' : ''}`}></p>
              <img className='h-5 mx-4' src={assets.esewa_logo} alt='eSewa' />
            </div>
            <div onClick={() => setMethod('khalti')} className='flex items-center gap-3 border p-2 px-3 cursor-pointer'>
              <p className={`min-w-3.5 h-3.5 border rounded-full ${method === 'khalti' ? 'bg-green-400' : ''}`}></p>
              <img className='h-5 mx-4' src={assets.khalti_logo} alt='Khalti' />
            </div>
            <div onClick={() => setMethod('cod')} className='flex items-center gap-3 border p-2 px-3 cursor-pointer'>
              <p className={`min-w-3.5 h-3.5 border rounded-full ${method === 'cod' ? 'bg-green-400' : ''}`}></p>
              <p className='text-gray-500 text-sm font-medium mx-4'>CASH ON DELIVERY</p>
            </div>
          </div>
          <div className='w-full text-end mt-8'>
            <button onClick={handlePlaceOrder}
              className='bg-black text-white px-16 py-3 text-sm cursor-pointer hover:bg-gray-800 transition-colors'>
              PLACE ORDER
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlaceOrder
