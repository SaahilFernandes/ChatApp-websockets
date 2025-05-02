import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [isLoginForm, setIsLoginForm] = useState(true); // Toggle between login/register forms
  const [isFormVisible, setIsFormVisible] = useState(false); // State for sliding animation
  const [loginData, setLoginData] = useState({ loginIdentifier: '', password: '' });
  const [signupData, setSignupData] = useState({ name: '', email: '', password: '' });
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginIdentifier: loginData.loginIdentifier,
          password: loginData.password,
        }),
        credentials: 'include',
      });
      const data = await response.json();
      console.log('Login response:', data);
      if (response.ok) {
        alert('Login successful');
        navigate('/home');
      } else {
        alert(`Login failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error logging in:', error);
      alert('Error logging in. Please check console/network tab.');
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (signupData.password.length < 6) {
       alert('Password must be at least 6 characters');
       return;
    }
    try {
      const response = await fetch('http://localhost:5000/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
      });
      const data = await response.json();
      console.log('Signup response:', data);
      if (response.ok) {
        alert('Signup successful! Please log in.');
        setIsLoginForm(true);
        if (!isFormVisible) setIsFormVisible(true);
      } else {
         alert(`Signup failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error registering:', error);
       alert('Error registering. Please check console/network tab.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (isLoginForm) {
      setLoginData((prev) => ({ ...prev, [name]: value }));
    } else {
      setSignupData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const toggleFormPanel = () => {
    setIsFormVisible(!isFormVisible);
  };

  return (
    <div className="login-page-container">
      {/* Main container with logo and login form */}
      <div className={`sliding-container ${isFormVisible ? 'form-active' : ''}`}>
        {/* Logo Panel - Centered initially, slides to left when clicked */}
        <div className="panel logo-panel">
          <div className="logo-content">
            <img src="/path/to/menu-icon.png" alt="Menu Icon" className="menu-icon" />
            <h1 onClick={toggleFormPanel} className="app-title">ChatApp</h1>
            <div className="app-subtitle">Grocery</div>
          </div>
        </div>

        {/* Login/Register Form Panel */}
        <div className="panel form-panel">
          <div className="form-container">
            <h2 className="form-title">
              {isLoginForm ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="form-subtitle">
              {isLoginForm ? 'Please enter your details' : 'Please sign up to continue'}
            </p>
            
            {/* Login Form */}
            {isLoginForm ? (
              <form className="login-form" onSubmit={handleLogin}>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Email address"
                    name="loginIdentifier"
                    value={loginData.loginIdentifier}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <input
                    type="password"
                    placeholder="Password"
                    name="password"
                    value={loginData.password}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-options">
                  <label className="remember-me">
                    <input type="checkbox" /> Remember for 30 days
                  </label>
                  <a href="#" className="forgot-password">Forgot password</a>
                </div>
                
                <button type="submit" className="submit-btn">Sign in</button>
                
                <button type="button" className="google-btn">
                  <svg viewBox="0 0 24 24" width="20" height="20" className="google-icon">
                    <path d="M12.545 10.239v3.821h5.445c-0.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866 0.549 3.921 1.453l2.814-2.814c-1.79-1.677-4.184-2.702-6.735-2.702-5.522 0-10 4.478-10 10s4.478 10 10 10c8.396 0 10.249-7.85 9.449-11.666l-9.449 0z" fill="#4285F4"></path>
                  </svg>
                  Sign in with Google
                </button>
              </form>
            ) : (
              /* Register Form */
              <form className="register-form" onSubmit={handleSignup}>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Username"
                    name="name"
                    value={signupData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <input
                    type="email"
                    placeholder="Email address"
                    name="email"
                    value={signupData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <input
                    type="password"
                    placeholder="Password (min 6 chars)"
                    name="password"
                    value={signupData.password}
                    onChange={handleInputChange}
                    required
                    minLength="6"
                  />
                </div>
                
                <button type="submit" className="submit-btn">Create account</button>
              </form>
            )}
            
            <div className="account-toggle">
              {isLoginForm ? (
                <p>Don't have an account? <button type="button" onClick={() => setIsLoginForm(false)}>Sign up</button></p>
              ) : (
                <p>Already have an account? <button type="button" onClick={() => setIsLoginForm(true)}>Sign in</button></p>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Main container styles */
        .login-page-container {
        display: flex;
        justify-content: flex-start; /* Changed from center to flex-start */
        align-items: center;
        min-height: 100vh;
        background-color:#242424;
        padding: 50px;
        box-sizing: border-box;
        width: 100%;
        }


        /* Container for animation */
        .sliding-container {
          position: relative;
          width: 1810px;
          max-width: 100%;
          height: 800px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          border-radius: 12px;
          display: flex;
          transition: transform 0.8s ease;
        }

        /* Base styles for panels */
        .panel {
          position: absolute;
          top: 0;
          width: 50%;
          height: 100%;
          transition: all 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55);
          overflow: hidden;
        }

        /* Logo Panel Styles */
        .logo-panel {
          left: 0;
          width: 100%;
          background-color: #1a1a1a;
          color: white;
          display: flex;
          justify-content: center;
          align-items: center;
          text-align: center;
          z-index: 1;
        }

        .logo-content {
          padding: 40px;
          transition: transform 0.8s ease;
        }

        .menu-icon {
          display: block;
          width: 30px;
          height: 30px;
          margin: 0 auto 10px;
          opacity: 0.8;
        }

        .app-title {
          font-size: 4rem;
          font-weight: 700;
          margin: 10px 0;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .app-title:hover {
          transform: scale(1.05);
        }

        .app-subtitle {
          font-size: 1.2rem;
          opacity: 0.7;
          margin-top: 5px;
        }

        /* Form Panel Styles */
        .form-panel {
          right: -50%;
          width: 50%;
          background-color: white;
          z-index: 2;
          opacity: 0;
          visibility: hidden;
          transition: all 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55);
        }

        /* Animation triggered state */
        .sliding-container.form-active .logo-panel {
          width: 50%;
          transform: translateX(0);
        }

        .sliding-container.form-active .logo-content {
          transform: translateX(0);
        }

        .sliding-container.form-active .form-panel {
          right: 0;
          opacity: 1;
          visibility: visible;
        }

        /* Form container styles */
        .form-container {
          width: 100%;
          max-width: 360px;
          padding: 40px 30px;
          margin: 0 auto;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .form-title {
          font-size: 1.8rem;
          font-weight: 600;
          color: #333;
          margin-bottom: 8px;
        }

        .form-subtitle {
          color: #666;
          margin-bottom: 30px;
          font-size: 0.95rem;
        }

        /* Form element styles */
        .form-group {
          margin-bottom: 20px;
        }

        .login-form input,
        .register-form input {
          width: 100%;
          padding: 12px 15px;
          border: 1px solid #e1e1e1;
          border-radius: 8px;
          font-size: 0.95rem;
          transition: border-color 0.3s;
          box-sizing: border-box;
        }

        .login-form input:focus,
        .register-form input:focus {
          border-color: #4285F4;
          outline: none;
          box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
        }

        .form-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
          font-size: 0.85rem;
        }

        .remember-me {
          display: flex;
          align-items: center;
          cursor: pointer;
        }

        .remember-me input {
          margin-right: 6px;
        }

        .forgot-password {
          color: #4285F4;
          text-decoration: none;
        }

        .forgot-password:hover {
          text-decoration: underline;
        }

        /* Button styles */
        .submit-btn {
          width: 100%;
          padding: 12px;
          background-color: #4285F4;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          margin-bottom: 15px;
          transition: background-color 0.3s;
        }

        .submit-btn:hover {
          background-color: #3367d6;
        }

        .google-btn {
          width: 100%;
          padding: 12px;
          background-color: white;
          color: #333;
          border: 1px solid #e1e1e1;
          border-radius: 8px;
          font-weight: 500;
          font-size: 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.3s;
          margin-top: 10px;
        }

        .google-btn:hover {
          background-color: #f5f5f5;
        }

        .google-icon {
          margin-right: 10px;
        }

        /* Account toggle section */
        .account-toggle {
          text-align: center;
          margin-top: 25px;
          font-size: 0.9rem;
          color: #666;
        }

        .account-toggle button {
          background: none;
          border: none;
          color: #4285F4;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          font-size: 0.9rem;
        }

        .account-toggle button:hover {
          text-decoration: underline;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .sliding-container {
            height: 100vh;
            border-radius: 0;
            width: 100%;
            max-width: 100%;
          }
          
          .sliding-container.form-active .logo-panel {
            width: 40%;
          }
          
          .form-panel {
            width: 60%;
          }
          
          .sliding-container.form-active .form-panel {
            right: 0;
            width: 60%;
          }
          
          .app-title {
            font-size: 3rem;
          }
        }

        @media (max-width: 576px) {
          .sliding-container.form-active .logo-panel {
            width: 0;
            opacity: 0;
          }
          
          .form-panel {
            width: 100%;
          }
          
          .sliding-container.form-active .form-panel {
            width: 100%;
          }
          
          .form-container {
            padding: 30px 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;