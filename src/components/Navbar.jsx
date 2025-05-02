import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import '../css/styles.css';

const Navbar = () => {
  // State to manage the menu toggle
  const [menuOpen, setMenuOpen] = useState(false);

  // Function to toggle the menu
  const menutoggle = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <div className="header">
      <div className="container">
        <div className="navbar">
          <div className="logo">
          </div>
          <nav>
            <ul id="MenuItems" className={menuOpen ? "active" : ""}>
              
              
            </ul>
            <img src="/images/menu.png" onClick={menutoggle} className="menu-icon" alt="Menu Icon" />
          </nav>
        </div>
        <div className="row">
          <div className="col-2">
            <h1>ChatApp</h1>
          </div>
          <div className="col-2">
            <img src="/images/gro.jpg" alt="Grocery" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Navbar;