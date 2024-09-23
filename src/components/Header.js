import React, {useState, useEffect} from 'react';
import {Link} from 'react-router-dom'; // Import Link from React Router
import '../styles/Header.css'; // Adjust your paths
import logo from '../assets/logo.svg'; // Adjust your paths

function Header() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth <= 768); // Set mobile screen size at 768px
        };

        checkScreenSize(); // Run on load
        window.addEventListener('resize', checkScreenSize); // Update on resize

        return () => {
            window.removeEventListener('resize', checkScreenSize);
        };
    }, []);

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    return (
        <header className={`App-header ${menuOpen ? 'open' : ''} ${isMobile ? 'mobile-header' : 'desktop-sidebar'}`}>
            <div className="header-content">
                <Link to="/">
                    <div className="header-icon">
                        <img src={logo} alt="Icon"/>
                    </div>
                </Link>
                {isMobile && (
                    <div className="menu-icon" onClick={toggleMenu}>
                        <span className="menu-icon-bar"></span>
                        <span className="menu-icon-bar"></span>
                        <span className="menu-icon-bar"></span>
                    </div>
                )}

                {/* Navigation with divs */}
                <nav className={`header-nav ${menuOpen ? 'open' : ''}`}>
                    <div className="menu-item">
                        <a href="/">Home</a>
                    </div>
                    <div className="menu-item">
                        <a href="/about">About</a>
                    </div>
                    <div className="menu-item">
                        <a href="/projects">Projects</a>
                    </div>
                    <div className="menu-item">
                        <a href="/contact">Contact</a>
                    </div>
                </nav>
            </div>
        </header>
    );
}

export default Header;
