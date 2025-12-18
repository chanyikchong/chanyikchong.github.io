import React, {useState, useEffect} from 'react';
import {Link} from 'react-router-dom'; // Import Link from React Router
import '../styles/Header.css'; // Adjust your paths
import logo from '../assets/logo.svg'; // Adjust your paths

function Header({theme = 'dark', onToggleTheme = () => {}}) {
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

    const nextThemeLabel = theme === 'dark' ? 'Light' : 'Dark';

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
                        <Link to="/" onClick={toggleMenu}>Home</Link>
                    </div>
                    <div className="menu-item">
                        <Link to="/resume" onClick={toggleMenu}>Résumé</Link>
                    </div>
                    <div className="menu-item">
                        <Link to="/projects" onClick={toggleMenu}>Projects</Link>
                    </div>
                    <div className="menu-item">
                        <Link to="/posts" onClick={toggleMenu}>Posts</Link>
                    </div>
                    <div className="menu-item">
                        <Link to="/tools" onClick={toggleMenu}>Tools</Link>
                    </div>
                </nav>
                {(!isMobile || menuOpen) && (
                    <button
                        type="button"
                        className="theme-toggle"
                        onClick={onToggleTheme}
                        aria-label={`Switch to ${nextThemeLabel.toLowerCase()} theme`}
                    >
                        <span className="theme-toggle__icon" aria-hidden="true">
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </span>
                        <span className="theme-toggle__label">
                            {nextThemeLabel} mode
                        </span>
                    </button>
                )}
            </div>
        </header>
    );
}

export default Header;
