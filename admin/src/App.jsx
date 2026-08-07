import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import { Route, Routes, Navigate } from 'react-router-dom'
import Add from './pages/Add'
import List from './pages/List'
import Orders from './pages/Orders'
import LiveTracking from './pages/LiveTracking'
import Intel from './pages/Intel'
import Engagement from './pages/Engagement'
import Login from './components/Login'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

export const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

const App = () => {
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '')

  const handleLogout = () => {
    setToken('')
    localStorage.removeItem('admin_token')
  }

  // Global 401 handler: an expired/invalid token clears auth and returns to
  // login, instead of letting pages retry the request forever.
  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error?.response?.status === 401) {
          localStorage.removeItem('admin_token')
          setToken('')
        }
        return Promise.reject(error)
      }
    )
    return () => axios.interceptors.response.eject(interceptorId)
  }, [])

  if (token === '') {
    return (
      <>
        <ToastContainer />
        <Login setToken={setToken} />
      </>
    )
  }

  return (
    <div className="bg-white min-h-screen text-stone-900">
      <ToastContainer />
      <Navbar onLogout={handleLogout} />
      <hr />
      <div className="flex w-full">
        <Sidebar />
        <div className="w-[70%] mx-auto ml-[max(5vw,25px)] my-8 text-stone-600 text-base">
          <Routes>
            <Route path="/" element={<Navigate to="/list" replace />} />
            <Route path="/add" element={<Add token={token} />} />
            <Route path="/list" element={<List token={token} />} />
            <Route path="/orders" element={<Orders token={token} />} />
            <Route path="/live"   element={<LiveTracking token={token} />} />
            <Route path="/intel"  element={<Intel token={token} />} />
            <Route path="/engagement" element={<Engagement token={token} />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

export default App
