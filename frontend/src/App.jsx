import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import About from './pages/About'
import Cart from './pages/Cart'
import Contact from './pages/Contact'
import Login from './pages/Login'
import Orders from './pages/Orders'
import PlaceOrder from './pages/PlaceOrder'
import Product from './pages/Product'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Men from './pages/Men'
import Women from './pages/Women'
import Topwear from './pages/Topwear'
import Bottomwear from './pages/Bottomwear'
import Footwear from './pages/Footwear'
import Accessories from './pages/Accessories'
import Kids from './pages/Kids'
import Search from './pages/Search'
import { ToastContainer } from 'react-toastify'
import PrivacyPolicy from './pages/PrivacyPolicy'
import Profile from './pages/Profile'
import DeliveryStatus from './pages/DeliveryStatus'
import AnalyticsDashboard from './pages/AnalyticsDashboard'
import IntelUpload    from './pages/IntelUpload'
import IntelDashboard from './pages/IntelDashboard'
import IntelCustomers from './pages/IntelCustomers'
import IntelInsights  from './pages/IntelInsights'
import { useAnalytics } from './hooks/useAnalytics'

const App = () => {
  useAnalytics() 
  return (
    <div className='overflow-x-hidden'>
      <ToastContainer />
      <Routes>
        <Route path='/analytics' element={<AnalyticsDashboard />} />
        <Route path='/intel'                         element={<IntelUpload />} />
        <Route path='/intel/dashboard/:jobId'        element={<IntelDashboard />} />
        <Route path='/intel/customers/:jobId'        element={<IntelCustomers />} />
        <Route path='/intel/insights/:jobId'         element={<IntelInsights />} />
        <Route path='/*' element={
          <>
            <Navbar />
            <Routes>
              <Route path='/'            element={<Home />} />
              <Route path='/search'      element={<Search />} />
              <Route path='/men'         element={<Men />} />
              <Route path='/women'       element={<Women />} />
              <Route path='/kids'        element={<Kids />} />
              <Route path='/footwear'    element={<Footwear />} />
              <Route path='/accessories' element={<Accessories />} />
              <Route path='/about'       element={<About />} />
              <Route path='/cart'        element={<Cart />} />
              <Route path='/contact'     element={<Contact />} />
              <Route path='/login'       element={<Login />} />
              <Route path='/orders'      element={<Orders />} />
              <Route path='/topwear'     element={<Topwear />} />
              <Route path='/bottomwear'  element={<Bottomwear />} />
              <Route path='/profile'     element={<Profile />} />
              <Route path='/placeorder'  element={<PlaceOrder />} />
              <Route path='/privacy'     element={<PrivacyPolicy />} />
              <Route path='/product/:productId' element={<Product />} />
              <Route path='/delivery'    element={<DeliveryStatus />} />
              <Route path='*'            element={<p className='p-10'>Not Found</p>} />
            </Routes>
            <Footer />
          </>
        } />
      </Routes>
    </div>
  )
}

export default App
