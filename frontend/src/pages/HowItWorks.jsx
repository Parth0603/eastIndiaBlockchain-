import React, { useState } from 'react';

const HowItWorks = () => {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      question: "Is my donation really secure?",
      answer: "Yes, absolutely. All donations are processed through smart contracts on the Ethereum blockchain, which are immutable and transparent. Your funds go directly to verified beneficiaries without any intermediaries, and every transaction is publicly verifiable."
    },
    {
      question: "How do beneficiaries spend the aid?",
      answer: "Beneficiaries receive digital credits that can only be spent at verified local vendors for essential items like food, medicine, and shelter materials. Smart contracts automatically enforce these restrictions, ensuring aid is used appropriately."
    },
    {
      question: "Can I see where my money goes?",
      answer: "Yes! Every transaction is recorded on the blockchain and visible in real-time. You can track your specific donation from the moment you send it until it's spent by beneficiaries. Our transparency dashboard shows exactly how funds are being distributed and used."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              How Transparent Disaster Relief Works
            </h1>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto">
              Simple, secure, and transparent. Here's how your donation makes a real impact, tracked every step of the way.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Process Flow */}
        <div className="relative">
          {/* Connection Lines */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-blue-200 via-green-200 to-purple-200 transform -translate-y-1/2 z-0"></div>
          
          <div className="grid lg:grid-cols-4 gap-8 relative z-10">
            {/* Step 1: Donors Donate Securely */}
            <div className="bg-white rounded-3xl shadow-lg p-8 text-center relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                1
              </div>
              
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl flex items-center justify-center mx-auto mb-6 mt-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-3">Donors Donate Securely</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Send stablecoin donations directly to a campaign. Your funds are secure.
              </p>
            </div>

            {/* Step 2: Funds are Tracked on Blockchain */}
            <div className="bg-white rounded-3xl shadow-lg p-8 text-center relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                2
              </div>
              
              <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-3xl flex items-center justify-center mx-auto mb-6 mt-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-3">Funds are Tracked on Blockchain</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Every transaction is recorded on an immutable public ledger for complete transparency.
              </p>
            </div>

            {/* Step 3: Verified Beneficiaries Receive Aid */}
            <div className="bg-white rounded-3xl shadow-lg p-8 text-center relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                3
              </div>
              
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-3xl flex items-center justify-center mx-auto mb-6 mt-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-3">Verified Beneficiaries Receive Aid</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Only verified individuals in disaster zones receive digital credits.
              </p>
            </div>

            {/* Step 4: Aid is Spent on Essentials Only */}
            <div className="bg-white rounded-3xl shadow-lg p-8 text-center relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                4
              </div>
              
              <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-3xl flex items-center justify-center mx-auto mb-6 mt-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 3H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v4a2 2 0 01-2 2H9a2 2 0 01-2-2v-4m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                  </svg>
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-3">Aid is Spent on Essentials Only</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Beneficiaries spend credits at verified local vendors for food, medicine, and shelter.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions (FAQ)
            </h2>
          </div>
          
          <div className="max-w-4xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900 text-lg">
                    Q: {faq.question}
                  </span>
                  <div className={`transform transition-transform duration-200 ${openFaq === index ? 'rotate-180' : ''}`}>
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                
                {openFaq === index && (
                  <div className="px-8 pb-6">
                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-gray-600 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Support */}
        <div className="mt-16 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-3xl p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-green-500 rounded-2xl flex items-center justify-center mr-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Need Help? Contact Us</h3>
                <p className="text-gray-600">
                  Support via email or phone support can help aid agencies
                </p>
              </div>
            </div>
            <button className="bg-gradient-to-r from-blue-600 to-green-600 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-green-700 font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
              Live Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;