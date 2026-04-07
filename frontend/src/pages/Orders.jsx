import React, { useContext } from 'react'
import { ShopContext } from '../context/ShopContext'
import Title from '../components/Title'

const STATUS_COLORS = {
  'Order Placed':      'bg-blue-500',
  'Processing':        'bg-yellow-500',
  'Shipped':           'bg-purple-500',
  'Out for Delivery':  'bg-orange-500',
  'Delivered':         'bg-green-500',
}

const Orders = () => {
  const { orders, currency, navigate } = useContext(ShopContext)

  return (
    <div className='border-t pt-16 px-4'>
      <div className='text-2xl mb-6'>
        <Title text1={'MY'} text2={' ORDERS'} />
      </div>

      {orders.length === 0 ? (
        <div className='text-center py-20 text-gray-400'>
          <p className='text-5xl mb-4'>📦</p>
          <p className='text-lg font-medium text-gray-600'>No orders yet</p>
          <p className='text-sm mt-1'>Place your first order to see it here.</p>
        </div>
      ) : (
        <div>
          {orders.map((order, orderIndex) => (
            <div key={orderIndex} className='mb-6 border rounded-sm'>

              {/* Order header */}
              <div className='flex justify-between items-center px-4 py-3 bg-gray-50 border-b text-sm text-gray-500'>
                <div className='flex gap-6'>
                  <p>Order ID: <span className='font-mono font-medium text-gray-800'>{order.orderId}</span></p>
                  <p>Date: <span className='text-gray-800'>{order.date}</span></p>
                  <p>Payment: <span className='text-gray-800 uppercase'>{order.paymentMethod}</span></p>
                </div>
                <p className='font-medium text-gray-800'>{currency}{order.total}.00</p>
              </div>

              {/* Order items */}
              {order.items.map((item, itemIndex) => (
                <div key={itemIndex} className='py-4 px-4 border-b last:border-b-0 text-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
                  <div className='flex items-start gap-6 text-sm'>
                    <img className='w-16 sm:w-20 object-cover' src={`/${item.image[0]}`} alt={item.name} />
                    <div>
                      <p className='sm:text-base font-medium'>{item.name}</p>
                      <div className='flex items-center gap-3 mt-2 text-gray-600'>
                        <p>{currency}{item.price}</p>
                        <p>Qty: {item.quantity}</p>
                        <p>Size: {item.size}</p>
                      </div>
                      <p className='mt-1 text-xs text-gray-400'>
                        {order.deliveryInfo.city}, {order.deliveryInfo.country}
                      </p>
                    </div>
                  </div>
                  <div className='flex items-center justify-between md:justify-end md:gap-8'>
                    <div className='flex items-center gap-2'>
                      <p className={`min-w-2 h-2 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-400'}`}></p>
                      <p className='text-sm'>{order.status}</p>
                    </div>
                    {/* ← only this line changed */}
                    <button
                      onClick={() => navigate(`/delivery/${order.orderId}`)}
                      className='border px-4 py-2 text-sm font-medium rounded-sm cursor-pointer hover:bg-black hover:text-white transition-colors'>
                      Track Order
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Orders