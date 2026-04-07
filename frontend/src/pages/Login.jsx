import React, { useState,useContext } from 'react'
import { toast } from 'react-toastify'
import { ShopContext } from '../context/ShopContext'


const Login = () => {

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { navigate, setUser } = useContext(ShopContext)
  const [currentState, setCurrentState] = useState('Login')

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  const onSubmitHandler = async (event) => {
    event.preventDefault()

    const endpoint = currentState === 'Login' ? '/api/auth/login' : '/api/auth/signup'
    const body = currentState === 'Login'
      ? { email, password }
      : { name, email, password }

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.detail || 'Something went wrong')
        return
      }

      localStorage.setItem('th_token', data.token)
      setUser({ id: data.user_id, name: data.name, email: data.email })
      localStorage.setItem('th_user', JSON.stringify({ id: data.user_id, name: data.name, email: data.email }))
      toast.success(currentState === 'Login' ? 'Welcome back!' : 'Account created!')
      navigate('/')
    } catch {
      toast.error('Could not connect to server')
    }
  }

  return (
    <form onSubmit={onSubmitHandler} className='flex flex-col items-center w-[90%] sm:max-w-96 m-auto mt-14 gap-4 text-gray-800'>
      <div className='inline-flex items-center gap-2 mb-2 mt-10'>
        <p className='prata-regular text-3xl'>{currentState}</p> 
      </div>
      {currentState==="Login"?'':<input type='text' onChange={e => setName(e.target.value)} className='w-full px-3 py-2 border border-gray-800' placeholder='Name' required />}
      <input value={email} type='email' onChange={e => setEmail(e.target.value)} className='w-full px-3 py-2 border border-gray-800' placeholder='Email' required />
      <input value={password} type='password' onChange={e => setPassword(e.target.value)} className='w-full px-3 py-2 border border-gray-800' placeholder='Password' required />
      <div className='w-full flex justify-between text-sm mt-[-8px]'>
        <p className='cursor-pointer'>Forgot your password?</p>
        {
          currentState==="Login" 
          ? <p onClick={()=>setCurrentState('Sign Up')} className='cursor-pointer'>Create account</p>
          : <p onClick={()=>setCurrentState('Login')} className='cursor-pointer'>Login Here</p>
        }
      </div>
      <button className='bg-black text-white font-light px-8 py-2 mt-4 cursor-pointer'>{currentState==="Login"?"Sign In":"Sign Up"}</button>
    </form>
  )
}

export default Login