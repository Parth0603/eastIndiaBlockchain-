import { useNavigate } from 'react-router-dom';

const SignUp = () => {
  const navigate = useNavigate();

  const roles = [
    {
      id: 'beneficiary',
      title: 'Apply for Relief',
      description: 'I need assistance due to a disaster or emergency situation',
      icon: '🏠',
      color: 'green',
      benefits: [
        'Apply for emergency assistance',
        'Access to verified service providers',
        'Transparent fund allocation',
        'Direct help from donors'
      ],
      route: '/signup/beneficiary'
    },
    {
      id: 'vendor',
      title: 'Service Provider',
      description: 'I want to provide goods or services to disaster victims',
      icon: '🏪',
      color: 'purple',
      benefits: [
        'Get verified as a trusted provider',
        'Receive direct payments for services',
        'Help disaster victims in your area',
        'Build reputation through reviews'
      ],
      route: '/signup/vendor'
    },
    {
      id: 'donor',
      title: 'Donor',
      description: 'I want to donate funds to help disaster victims',
      icon: '💝',
      color: 'blue',
      benefits: [
        'Make transparent donations',
        'Track fund usage in real-time',
        'Support verified beneficiaries',
        'See direct impact of donations'
      ],
      route: '/signup/donor'
    }
  ];

  const handleRoleSelect = (role) => {
    navigate(role.route);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Join Our Platform</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose your role to get started with transparent disaster relief. 
            Each role has a dedicated registration process tailored to your needs.
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {roles.map((role) => (
            <div
              key={role.id}
              onClick={() => handleRoleSelect(role)}
              className={`group bg-white p-8 border-2 border-gray-200 rounded-2xl cursor-pointer transition-all duration-300 hover:border-${role.color}-500 hover:shadow-2xl hover:-translate-y-2`}
            >
              <div className="text-center mb-6">
                <div className={`w-20 h-20 bg-${role.color}-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-${role.color}-200 transition-colors`}>
                  <span className="text-4xl">{role.icon}</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{role.title}</h3>
                <p className="text-gray-600 mb-4">{role.description}</p>
              </div>
              
              <div className="space-y-3 mb-6">
                {role.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center text-sm text-gray-600">
                    <span className="text-green-500 mr-3 text-lg">✓</span>
                    {benefit}
                  </div>
                ))}
              </div>

              <button className={`w-full bg-${role.color}-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-${role.color}-700 transition-colors group-hover:shadow-lg`}>
                Get Started →
              </button>
            </div>
          ))}
        </div>

        {/* Security Information */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔒</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Maximum Security Approach</h2>
            <p className="text-gray-600">
              We prioritize your security above convenience
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">🚫</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">No Auto-Connection</h3>
              <p className="text-sm text-gray-600">
                Your wallet never connects automatically. You must explicitly approve each connection.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">🗑️</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">No Data Persistence</h3>
              <p className="text-sm text-gray-600">
                No sensitive data is stored locally. You authenticate fresh each visit.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">🛡️</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">MetaMask Permission</h3>
              <p className="text-sm text-gray-600">
                Every connection requires explicit MetaMask approval, ensuring you're always in control.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;