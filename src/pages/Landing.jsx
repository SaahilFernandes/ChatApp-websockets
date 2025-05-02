import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

const Login = () => {
  const [isLoginForm, setIsLoginForm] = useState(true); // Toggle between login and register forms
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ name: '', email: '', password: '' });
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
        credentials: 'include',
      });
      const data = await response.json();
      console.log('Login response:', data);
      if (response.ok) {
        alert('Login successful');
        navigate('/home');
      } else {
        alert('Login failed');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      alert('Error logging in. Please try again.');
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
      });
      const data = await response.json();
      console.log(data);
      if (response.ok) {
        alert('Signup successful');
        setIsLoginForm(true); // Switch to login after successful registration
      } else {
        alert('Signup failed');
      }
    } catch (error) {
      console.error('Error registering:', error);
      alert('Error registering. Please try again.');
    }
  };

  const handleInputChange = (e, isLogin) => {
    const { name, value } = e.target;
    if (isLogin) setLoginData({ ...loginData, [name]: value });
    else setSignupData({ ...signupData, [name]: value });
  };

  return (
    <div className="custom-container">
      
        
        <Navbar />
        

      <div className="custom-account-page">
        <div className="custom-row">
          <div className="custom-col-2 image-container">
            <img src="images/bg.jpg" alt="Background" />
          </div>

          <div className="custom-col-2">
            <div className="custom-form-container">
              <div className="custom-form-btn">
                <button onClick={() => setIsLoginForm(true)}>Login</button>
                <button onClick={() => setIsLoginForm(false)}>Register</button>
                <hr
                  className="custom-indicator"
                  style={{ transform: isLoginForm ? 'translateX(0)' : 'translateX(100px)' }}
                />
              </div>

              {isLoginForm ? (
                <form className="custom-login-form" onSubmit={handleLogin}>
                  <input
                    type="text"
                    placeholder="Email"
                    name="email"
                    onChange={(e) => handleInputChange(e, true)}
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    name="password"
                    onChange={(e) => handleInputChange(e, true)}
                  />
                  <button type="submit" className="custom-btn">Login</button>
                </form>
              ) : (
                <form className="custom-register-form" onSubmit={handleSignup}>
                  <input
                    type="text"
                    placeholder="Username"
                    name="name"
                    onChange={(e) => handleInputChange(e, false)}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    name="email"
                    onChange={(e) => handleInputChange(e, false)}
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    name="password"
                    onChange={(e) => handleInputChange(e, false)}
                  />
                  <button type="submit" className="custom-btn">Register</button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-container {
          max-width: 1200px;
          margin: auto;
          padding: 20px;
        }

        .custom-navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #2e8b57;
          padding: 10px 0;
        }

        .custom-menu-items li {
          display: inline;
          margin-right: 20px;
        }

        .custom-account-page {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 80vh;
        }

        .custom-row {
          display: flex;
          flex-wrap: wrap;
          width: 100%;
        }

        .custom-col-2 {
          flex: 1;
          min-width: 300px;
          margin: 10px;
        }

        .image-container img {
          width: 100%;
          height: auto;
          border-radius: 10px;
        }

        .custom-form-container {
          max-width: 400px;
          margin: auto;
          padding: 20px;
          box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
        }

        .custom-form-btn {
          display: flex;
          justify-content: space-around;
          margin-bottom: 20px;
        }

        .custom-login-form,
        .custom-register-form {
          display: flex;
          flex-direction: column;
        }

        .custom-login-form input,
        .custom-register-form input {
          margin: 10px 0;
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 5px;
        }

        .custom-btn {
          background-color: #2e8b57;
          color: white;
          border: none;
          padding: 10px;
          cursor: pointer;
        }

        .custom-btn:hover {
          background-color: #256d4f;
        }

        .custom-indicator {
          height: 3px;
          width: 100px;
          background-color: #2e8b57;
          transition: transform 0.3s;
        }
      `}</style>
    </div>
  );
};

export default Login;