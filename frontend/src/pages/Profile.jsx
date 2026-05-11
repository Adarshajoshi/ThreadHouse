import React, { useContext } from 'react'
import { ShopContext } from '../context/ShopContext'
import Title from '../components/Title'

const Profile = () => {
  const { user, isLoggedIn, logout, orders, currency, navigate } = useContext(ShopContext)

  if (!isLoggedIn) {
    navigate('/login')
    return null
  }

  return (
    <div className='border-t pt-16 px-4 min-h-[80vh]'>
      <div className='text-2xl mb-8'>
        <Title text1={'MY'} text2={' PROFILE'} />
      </div>

      {/* User Info Card */}
      <div className='flex flex-col sm:flex-row gap-8 max-w-3xl'>
        <div className='flex-1 border rounded-sm p-6'>
          <div className='w-16 h-16 rounded-full bg-black text-white flex items-center justify-center text-2xl font-medium mb-4'>
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <h2 className='text-xl font-medium'>{user.name}</h2>
          <p className='text-stone-500 text-sm mt-1'>{user.email}</p>

          <div className='mt-6 flex flex-col gap-3'>
            <button
              onClick={() => navigate('/orders')}
              className='border px-4 py-2 text-sm hover:bg-black hover:text-white transition-colors'
            >
              View Orders
            </button>
            <button
              onClick={logout}
              className='border border-red-400 text-red-400 px-4 py-2 text-sm hover:bg-red-400 hover:text-white transition-colors'
            >
              Logout
            </button>
          </div>
        </div>

        {/* Recent Orders */}
        <div className='flex-1'>
          <p className='text-sm font-medium uppercase tracking-widest text-stone-500 mb-4'>Recent Orders</p>
          {orders.length === 0 ? (
            <p className='text-stone-400 text-sm'>No orders yet.</p>
          ) : (
            <div className='flex flex-col gap-3'>
              {orders.slice(0, 3).map((order, i) => (
                <div key={i} className='border rounded-sm p-3 text-sm'>
                  <div className='flex justify-between items-center mb-1'>
                    <span className='font-mono text-xs text-stone-500 '>{order.orderId}</span>
                    <span className='text-xs font-medium'>{currency}{order.total}</span>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-stone-500 '>{order.date}</span>
                    <span className='text-xs px-2 py-0.5 bg-stone-100 rounded-full'>{order.status}</span>
                  </div>
                </div>
              ))}
              {orders.length > 3 && (
                <button onClick={() => navigate('/orders')} className='text-sm text-stone-500 underline text-left'>
                  View all {orders.length} orders
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Profile