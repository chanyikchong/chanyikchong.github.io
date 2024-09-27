import React from 'react';
import { Link } from 'react-router-dom'; // Use Link for navigation
import { FaEnvelope, FaGithub, FaLinkedin } from 'react-icons/fa'; // Import necessary icons

import '../styles/Footer.css'; // Import the styles

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-icons">
                <Link to="/contact" aria-label="Contact">
                    <FaEnvelope />
                </Link>
                <a href="https://github.com/chanyikchong" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                    <FaGithub/>
                </a>
                <a href="https://linkedin.com/in/yichong-chen-57662b180/" target="_blank" rel="noopener noreferrer"
                   aria-label="LinkedIn">
                    <FaLinkedin/>
                </a>
            </div>
        </footer>
    );
};

export default Footer;
