import React from 'react'
import Title from '../components/Title'
import NewsletterBox from '../components/NewsletterBox'

const PrivacyPolicy = () => {
  return (
    <div className='lg:px-20 border-t'>
      <div className='text-2xl text-center pt-8'>
        <Title text1={'PRIVACY'} text2={' POLICY'} />
      </div>
      <p className='text-xs text-gray-400 text-center mb-10'>Last updated: March 2025</p>

      <div className='flex flex-col gap-8 text-gray-600 text-sm leading-relaxed mb-20 max-w-3xl mx-auto'>

        <section>
          <h2 className='text-base font-semibold text-gray-800 mb-2'>1. Information We Collect</h2>
          <p>When you use ThreadHouse, we may collect personal information such as your name, email address, phone number, shipping address, and payment details. We also collect non-personal data such as browser type, pages visited, and time spent on our site to improve your experience.</p>
        </section>

        <section>
          <h2 className='text-base font-semibold text-gray-800 mb-2'>2. How We Use Your Information</h2>
          <p>We use the information we collect to process your orders, send order confirmations and updates, respond to customer service requests, personalise your shopping experience, and improve our website and product offerings. We do not sell your personal data to third parties.</p>
        </section>

        <section>
          <h2 className='text-base font-semibold text-gray-800 mb-2'>3. Data Security</h2>
          <p>We implement industry-standard security measures to protect your personal information. All payment transactions are encrypted. However, no method of transmission over the internet is 100% secure and we cannot guarantee absolute security.</p>
        </section>

        <section>
          <h2 className='text-base font-semibold text-gray-800 mb-2'>4. Cookies</h2>
          <p>ThreadHouse uses cookies to enhance your browsing experience, remember your cart items, and analyse site traffic. You can choose to disable cookies through your browser settings, although this may affect certain features of the site.</p>
        </section>

        <section>
          <h2 className='text-base font-semibold text-gray-800 mb-2'>5. Third-Party Services</h2>
          <p>We may use third-party services such as eSewa and Khalti for payment processing. These services have their own privacy policies and we encourage you to review them. We are not responsible for the privacy practices of these services.</p>
        </section>

        <section>
          <h2 className='text-base font-semibold text-gray-800 mb-2'>6. Your Rights</h2>
          <p>You have the right to access, correct, or delete your personal data at any time. To make a request, please contact us at support@threadhouse.com. We will respond to your request within 7 business days.</p>
        </section>

        <section>
          <h2 className='text-base font-semibold text-gray-800 mb-2'>7. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at:<br />
            <span className='font-medium text-gray-800'>support@threadhouse.com</span><br />
            Shantinagar, Kathmandu, Nepal<br />
            +977 9867543210
          </p>
        </section>
      </div>

      <NewsletterBox />
    </div>
  )
}

export default PrivacyPolicy
