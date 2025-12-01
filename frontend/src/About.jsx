import React from 'react'

export default function About({ onBack }) {
  const features = [
    {
      icon: '🔐',
      title: 'Secure Authentication',
      description: 'JWT-based authentication with role-based access control (Admin & User roles)'
    },
    {
      icon: '📊',
      title: 'Real-time Dashboard',
      description: 'Interactive dashboard with live statistics and 3D animated stat cards'
    },
    {
      icon: '🎨',
      title: 'Modern UI/UX',
      description: 'Beautiful 3D animations, glassmorphism effects, and responsive design'
    },
    {
      icon: '⚡',
      title: 'Fast Performance',
      description: 'Optimized React components with efficient state management'
    },
    {
      icon: '🔍',
      title: 'Advanced Filtering',
      description: 'Filter grievances by status with interactive stat cards'
    },
    {
      icon: '👥',
      title: 'Role-Based Access',
      description: 'Admins manage all grievances, users manage their own'
    },
    {
      icon: '📈',
      title: 'Analytics & Stats',
      description: 'Track grievance statistics with visual data representation'
    },
    {
      icon: '🛡️',
      title: 'Secure Backend',
      description: 'RESTful API with authentication middleware and data validation'
    }
  ]

  const techStack = [
    { name: 'React', category: 'Frontend' },
    { name: 'Vite', category: 'Build Tool' },
    { name: 'Node.js', category: 'Backend' },
    { name: 'Express', category: 'Backend' },
    { name: 'MongoDB', category: 'Database' },
    { name: 'Mongoose', category: 'ODM' },
    { name: 'JWT', category: 'Authentication' },
    { name: 'Axios', category: 'HTTP Client' }
  ]

  return (
    <div className="about-page">
      <div className="about-background">
        <div className="about-orb orb-1"></div>
        <div className="about-orb orb-2"></div>
      </div>
      
      <div className="about-container">
        <button onClick={onBack} className="back-btn">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Home
        </button>

        <div className="about-header">
          <h1 className="about-title">About Grievance Tracker</h1>
          <p className="about-subtitle">
            A modern, full-stack grievance management system built with the MERN stack
          </p>
        </div>

        <section className="about-section">
          <h2 className="section-title">✨ Key Features</h2>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="about-section">
          <h2 className="section-title">🛠️ Tech Stack</h2>
          <div className="tech-grid">
            {techStack.map((tech, index) => (
              <div key={index} className="tech-card">
                <div className="tech-name">{tech.name}</div>
                <div className="tech-category">{tech.category}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="about-section">
          <h2 className="section-title">👥 Team & Credits</h2>
          <div className="team-section">
            <p className="team-text">
              This project was developed as a group project to demonstrate full-stack development skills
              using modern web technologies.
            </p>
            
            <div className="team-members">
              <div className="team-member">
                <div className="member-avatar">MK</div>
                <h3 className="member-name">Mukesh Kumar</h3>
                <p className="member-role">Frontend Developer & UI/UX</p>
                <div className="member-responsibilities">
                  <span className="responsibility-tag">React Components</span>
                  <span className="responsibility-tag">UI Design</span>
                  <span className="responsibility-tag">Animations</span>
                  <span className="responsibility-tag">Responsive Design</span>
                </div>
              </div>
              
              <div className="team-member">
                <div className="member-avatar">SPS</div>
                <h3 className="member-name">Surya Prakash Singh</h3>
                <p className="member-role">Backend Developer & Database</p>
                <div className="member-responsibilities">
                  <span className="responsibility-tag">API Development</span>
                  <span className="responsibility-tag">Authentication</span>
                  <span className="responsibility-tag">Database Design</span>
                  <span className="responsibility-tag">Security</span>
                </div>
              </div>
              
              <div className="team-member">
                <div className="member-avatar">AS</div>
                <h3 className="member-name">Aditya Sharma</h3>
                <p className="member-role">Full-Stack Developer & Integration</p>
                <div className="member-responsibilities">
                  <span className="responsibility-tag">Feature Integration</span>
                  <span className="responsibility-tag">Testing</span>
                  <span className="responsibility-tag">Documentation</span>
                  <span className="responsibility-tag">Deployment</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

