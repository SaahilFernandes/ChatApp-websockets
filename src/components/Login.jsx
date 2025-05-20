import {React, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../css/login.css'

const Login = () => {
    const { login } = useAuth();
  const [isLoginForm, setIsLoginForm] = useState(true); // Toggle between login/register forms
  const [isFormVisible, setIsFormVisible] = useState(false); // State for sliding animation
  const [loginData, setLoginData] = useState({ loginIdentifier: '', password: '' });
  const [signupData, setSignupData] = useState({ name: '', email: '', password: '' });
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/login`, {
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
        login(data.accessToken);
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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/register`, {
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

     
    </div>
  );
};

export default Login;