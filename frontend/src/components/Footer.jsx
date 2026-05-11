import React from 'react'
import { Link } from 'react-router-dom'
import { assets } from '../assets/frontend_assets/assets'

const Footer = () => {
  return (
    <div>
        <div className='flex flex-col sm:grid grid-cols-[3fr_1fr_1fr] gap-14 my-10 mt-40 text-small'>
            <div>
                <img src={assets.logo} className='mb-5 w-36' alt="" />
                <p className='w-full md:w-2/3 text-stone-600 '> Your destination for premium fashion — curated styles for men, women, and kids. Quality you can feel, prices you'll love.</p>
            </div>
            <div>
               <p className='text-xl font-medium mb-5'>COMPANY</p> 
               <ul className='flex flex-col gap-1 text-stone-600 '>
                <li><Link to="/" className="footer-link">Home</Link></li>
                <li><Link to="/about" className="footer-link">About Us</Link></li>
                <li><Link to="/contact" className="footer-link">Contact Us</Link></li>
                <li><Link to="/privacy" className="footer-link">Privacy Policy</Link></li>
               </ul>
            </div>
            <div>
                <p className='text-xl font-medium mb-5'>GET IN TOUCH</p>
                <ul className='flex flex-col gap-1 text-stone-600 '>
                    <li className="footer-link"><a href='tel:+977 986754321'>+977 9867543210</a></li>
                    <li className="footer-link"><a href='mailto:mindless@gmail.com' >support@threadhouse.com</a></li>
                </ul>
            </div>
        </div>
        <div>
           <hr /> 
           <p className='py-5 text-sm text-center'>Copyright 2026@ mindless.com-All Rights Reserved</p>
        </div>
    </div>
  )
}

export default Footer