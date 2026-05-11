import React, { useState } from 'react'
import { backendUrl } from '../App'
import axios from 'axios'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'

const Login = ({ setToken }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmitHandler = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await axios.post(backendUrl + '/api/user/admin', { email, password })
      if (response.data.token) {
        localStorage.setItem('admin_token', response.data.token)
        setToken(response.data.token)
        toast.success('Logged in successfully')
      } else {
        toast.error(response.data.message || 'Login failed')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="bg-white shadow-md rounded-xl px-8 py-8 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <img src={assets.logo} alt="Logo" className="h-10 object-contain" />
        </div>
        <h1 className="text-2xl font-bold mb-1 text-stone-800 text-center">Admin Panel</h1>
        <p className="text-sm text-stone-400 text-center mb-6">Sign in to manage your store</p>

        <form onSubmit={onSubmitHandler} className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-stone-700 mb-1">Email Address</p>
            <input
              onChange={(e) => setEmail(e.target.value)}
              value={email}
              className="rounded-lg w-full px-4 py-2.5 border border-stone-300 outline-none focus:border-teal-600 text-sm"
              type="email"
              placeholder="admin@example.com"
              required
            />
          </div>
          <div>
            <p className="text-sm font-medium text-stone-700 mb-1">Password</p>
            <input
              onChange={(e) => setPassword(e.target.value)}
              value={password}
              className="rounded-lg w-full px-4 py-2.5 border border-stone-300 outline-none focus:border-teal-600 text-sm"
              type="password"
              placeholder="Enter your password"
              required
            />
          </div>
          <button
            className="mt-2 w-full py-2.5 px-4 rounded-lg text-white bg-teal-700 hover:bg-teal-800 transition-colors cursor-pointer font-medium text-sm disabled:opacity-50"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
