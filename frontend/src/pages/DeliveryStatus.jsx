import React, { useContext } from 'react'
import { useParams } from 'react-router-dom'
import { ShopContext } from '../context/ShopContext'
import Title from '../components/Title'

const STEPS = ['Order Placed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered']

const STATUS_COLORS = {
  'Order Placed':     'bg-blue-500',
  'Processing':       'bg-yellow-500',
  'Shipped':          'bg-purple-500',
  'Out for Delivery': 'bg-orange-500',
  'Delivered':        'bg-green-500',
}

const ETA = {
  'Order Placed':     'Preparing your order',
  'Processing':       'Processing — est. 1–2 days',
  'Shipped':          'In transit — est. 2–4 days',
  'Out for Delivery': 'Arriving today',
  'Delivered':        'Successfully delivered',
}

const TIMELINE = {
  'Order Placed':     ['Order confirmed — payment received'],
  'Processing':       ['Order confirmed — payment received', 'Processing started — warehouse picking items'],
  'Shipped':          ['Order confirmed', 'Packed & dispatched from warehouse', 'Shipped — in transit with courier'],
  'Out for Delivery': ['Order confirmed', 'Packed & dispatched', 'Shipped — in transit', 'Out for delivery — courier on the way'],
  'Delivered':        ['Order confirmed', 'Packed & dispatched', 'Shipped — in transit', 'Out for delivery', 'Delivered — package received'],
}

const DeliveryStatus = () => {
  const { orderId } = useParams()
  const { orders, currency, navigate } = useContext(ShopContext)

  const order = orders.find(o => o.orderId === orderId)

  if (!order) {
    return (
      <div className='border-t pt-16 px-4 min-h-[60vh] flex flex-col items-center justify-center text-center'>
        <p className='text-5xl mb-4'>📦</p>
        <p className='text-lg font-medium text-stone-600 '>Order not found</p>
        <p className='text-sm text-stone-400 mt-1'>This order may not exist or has been removed.</p>
        <button
          onClick={() => navigate('/orders')}
          className='mt-6 border px-6 py-2 text-sm hover:bg-black hover:text-white transition-colors'>
          Back to orders
        </button>
      </div>
    )
  }

  const activeStep = STEPS.indexOf(order.status)
  const timeline   = (TIMELINE[order.status] || []).slice().reverse()
  const di         = order.deliveryInfo || {}

  return (
    <div className='border-t pt-16 px-4 pb-16 max-w-3xl mx-auto'>

      {/* Back button */}
      <button
        onClick={() => navigate('/orders')}
        className='flex items-center gap-2 text-sm text-stone-500 hover:text-black transition-colors mb-8'>
        ← Back to orders
      </button>

      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-10'>
        <div>
          <div className='text-2xl mb-1'>
            <Title text1={'TRACK'} text2={' ORDER'} />
          </div>
          <p className='font-mono text-sm text-stone-500 '>{order.orderId}</p>
          <p className='text-xs text-stone-400 mt-1'>Placed on {order.date}</p>
        </div>
        <div className='flex items-center gap-2 border rounded-full px-4 py-2 text-sm self-start'>
          <span className={`w-2 h-2 rounded-full ${order.status === 'Delivered' ? 'bg-green-500' : 'bg-orange-400 animate-pulse'}`}></span>
          <span className='text-stone-600 '>{ETA[order.status]}</span>
        </div>
      </div>

      {/* Step tracker */}
      <div className='flex items-start mb-10'>
        {STEPS.map((step, i) => {
          const done    = i < activeStep
          const active  = i === activeStep
          const pending = i > activeStep
          return (
            <div key={step} className='flex-1 flex flex-col items-center relative'>
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className={`absolute top-3.5 left-1/2 right-0 h-0.5 -translate-y-1/2 ${done ? 'bg-black' : 'bg-gray-200'}`} style={{ width: '100%', left: '50%' }} />
              )}
              {/* Node */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center z-10 border-2 transition-all
                ${done   ? 'bg-black border-black' : ''}
                ${active ? 'bg-white border-black' : ''}
                ${pending? 'bg-white border-stone-200 ' : ''}
              `}>
                {done && (
                  <svg width='10' height='10' viewBox='0 0 10 10' fill='none'>
                    <polyline points='1.5,5 4,7.5 8.5,2.5' stroke='white' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'/>
                  </svg>
                )}
                {active && <span className='w-2.5 h-2.5 rounded-full bg-black'></span>}
              </div>
              {/* Label */}
              <p className={`text-center mt-2 text-xs leading-tight px-1
                ${active  ? 'font-medium text-black' : ''}
                ${done    ? 'text-stone-500 ' : ''}
                ${pending ? 'text-gray-300' : ''}
              `}>
                {step}
              </p>
            </div>
          )
        })}
      </div>

      {/* Info cards */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10'>
        <div className='bg-stone-50 rounded-sm p-4'>
          <p className='text-xs uppercase tracking-widest text-stone-400 mb-2'>Deliver to</p>
          <p className='font-medium text-sm'>{di.firstName} {di.lastName}</p>
          <p className='text-xs text-stone-500 mt-1'>{di.street}</p>
          <p className='text-xs text-stone-500 '>{di.city}{di.state ? `, ${di.state}` : ''} {di.zipCode}</p>
          <p className='text-xs text-stone-500 '>{di.country}</p>
          <p className='text-xs text-stone-500 mt-1'>{di.phone}</p>
        </div>
        <div className='bg-stone-50 rounded-sm p-4'>
          <p className='text-xs uppercase tracking-widest text-stone-400 mb-2'>Payment</p>
          <p className='font-medium text-sm uppercase'>{order.paymentMethod}</p>
          <p className='text-xs text-stone-500 mt-1'>Total: {currency}{order.total}.00</p>
          <p className='text-xs text-stone-500 mt-3 uppercase tracking-widest'>Status</p>
          <div className='flex items-center gap-2 mt-1'>
            <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-400'}`}></span>
            <span className='text-sm font-medium'>{order.status}</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className='mb-10'>
        <p className='text-xs uppercase tracking-widest text-stone-400 mb-4'>Activity</p>
        <div className='border-l-2 border-stone-200 ml-2 pl-5 flex flex-col gap-5'>
          {timeline.map((event, i) => (
            <div key={i} className='relative'>
              <span className={`absolute -left-7 top-1 w-2.5 h-2.5 rounded-full border-2 border-white
                ${i === 0 ? 'bg-black' : 'bg-gray-300'}`}>
              </span>
              <p className='text-xs text-stone-400 mb-0.5'>{i === 0 ? 'Most recent' : `${i + 1} steps ago`}</p>
              <p className='text-sm font-medium text-stone-800 '>{event}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Items */}
      <div>
        <p className='text-xs uppercase tracking-widest text-stone-400 mb-4'>Items in this order</p>
        <div className='border rounded-sm divide-y'>
          {order.items.map((item, i) => (
            <div key={i} className='flex items-center gap-4 p-4'>
              <img src={`/${item.image[0]}`} alt={item.name} className='w-14 h-16 object-cover bg-stone-50 ' />
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-medium truncate'>{item.name}</p>
                <p className='text-xs text-stone-500 mt-1'>Size: {item.size} · Qty: {item.quantity}</p>
              </div>
              <p className='text-sm font-medium font-mono'>{currency}{item.price}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

export default DeliveryStatus