import React from 'react'
import Title from '../components/Title'
import { assets } from '../assets/frontend_assets/assets'
import NewsletterBox from '../components/NewsletterBox'
const About = () => {
  return (
    <div className='lg:px-20 '>
      <div className='text-2xl text-center pt-8 border-t '>
        <Title text1={'ABOUT'} text2={' US'}/>
      </div>

      <div className='my-10 flex flex-col md:flex-row gap-16'>
        <img className='w-full md:max-w-[450px]' src={assets.about_img} />
        <div className='flex flex-col justify-center gap-6 md:w-2/4 text-gray-600'>
          <p>Welcome to Thread House, where style meets comfort and every thread tells a story. We believe clothing is more than just fabric,it’s a way to express individuality, confidence, and personality. Our mission is to provide high-quality, trendy, and affordable fashion that fits seamlessly into your everyday life, whether you're dressing for a special occasion or keeping it casual. Every piece in our collection is thoughtfully selected to reflect modern trends while maintaining a timeless appeal.</p>
          <p>At Thread House, we are committed to quality, comfort, and customer satisfaction. We focus on delivering well-crafted designs using premium materials, ensuring you look and feel your best. More than just an ecommerce store, Thread House is a growing community of fashion lovers who value creativity and self-expression. We’re here to help you wear your story with confidence, every single day.</p>
          <b className='text-gray-800'>Our Mission</b>
          <p>At Thread House, our mission is to make fashion accessible, affordable, and inspiring for everyone by offering high-quality clothing that combines style, comfort, and durability. We aim to help individuals express their unique identity with confidence through thoughtfully designed pieces that reflect both modern trends and timeless appeal. Committed to excellent customer service and continuous innovation, we strive to create a seamless shopping experience while building a community where fashion empowers creativity, individuality, and self-expression, one thread at a time.</p>
        </div>
      </div>
      <div className='text-xl py-4'>
        <Title text1={"WHY"} text2={" CHOOSE US"} />
      </div>
      <div className='flex flex-col md:flex-row text-sm mb-20'>
        <div className='border px-10 md:px-16 py-8 sm:py-20 flex flex-col gap-4'>
          <b>Quality Assurance:</b>
          <p className='text-gray-600'>We ensure every piece meets high standards of quality, comfort, and durability before it reaches you.</p>
        </div>
        <div className='border px-10 md:px-16 py-8 sm:py-20 flex flex-col gap-4'>
          <b>Convenience</b>
          <p className='text-gray-600'>With our user-friendly interface and hassle-free ordering process,shopping has never been easier.</p>
        </div>
        <div className='border px-10 md:px-16 py-8 sm:py-20 flex flex-col gap-4'>
          <b>Exceptional Customer Service</b>
          <p className='text-gray-600'>Our team of dedicated professionals is here to assist you the way, ensuring your satisfaction is our top priority.</p>
        </div>
      </div>
      <NewsletterBox/>
    </div>
  )
}

export default About