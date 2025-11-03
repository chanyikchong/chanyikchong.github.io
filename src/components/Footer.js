import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope, FaGithub, FaLinkedin } from 'react-icons/fa';
import '../styles/Footer.css';

const Footer = () => {
    const counterRef = useRef(null);

    useEffect(() => {
        if (process.env.NODE_ENV !== 'production') {
            return;
        }

        const container = counterRef.current;

        const inlineScript = document.createElement('script');
        inlineScript.type = 'text/javascript';
        inlineScript.innerHTML = `
            var sc_project = 13157343;
            var sc_invisible = 0;
            var sc_security = "e78c74f5";
            var sc_https = 1;
            var scJsHost = "https://";
            var sc_text = 2;
        `;

        const counterScript = document.createElement('script');
        counterScript.type = 'text/javascript';
        counterScript.src = 'https://statcounter.com/counter/counter.js';
        counterScript.async = true;

        if (container) {
            container.appendChild(inlineScript);
            container.appendChild(counterScript);
        }

        return () => {
            if (container) {
                container.innerHTML = '';
            }
        };
    }, []);

    return (
        <footer className="footer">
            <div className="footer-icons">
                <Link to="/contact" aria-label="Contact">
                    <FaEnvelope />
                </Link>
                <a href="https://github.com/chanyikchong" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                    <FaGithub />
                </a>
                <a href="https://linkedin.com/in/yichong-chen-57662b180/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                    <FaLinkedin />
                </a>
            </div>

            <div ref={counterRef}>
                <a
                    title="Click to View Stats"
                    href="https://statcounter.com/p13157343/?guest=1"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <span>Total Visitors: </span>
                    <span className="statcounter" id="sc_counter_13157343">Loading...</span>
                </a>
            </div>
        </footer>
    );
};

export default Footer;
