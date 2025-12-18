import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope, FaGithub, FaLinkedin } from 'react-icons/fa';
import '../styles/Footer.css';

const Footer = () => {
    const scriptsRef = useRef([]);
    const observerRef = useRef(null);
    const counterSpanRef = useRef(null);
    const isProduction = process.env.NODE_ENV === 'production';
    const [displayCount, setDisplayCount] = useState(isProduction ? '...' : '--');
    const latestDisplayRef = useRef(displayCount);

    useEffect(() => {
        latestDisplayRef.current = displayCount;
    }, [displayCount]);

    useEffect(() => {
        const counterSpan = counterSpanRef.current;
        if (counterSpan && counterSpan.textContent !== displayCount) {
            counterSpan.textContent = displayCount;
        }
    }, [displayCount]);

    useEffect(() => {
        if (!isProduction) {
            return;
        }

        const counterSpan = counterSpanRef.current;
        if (!counterSpan) {
            return;
        }

        const observer = new MutationObserver(() => {
            const value = counterSpan.textContent?.trim();
            if (value && value !== latestDisplayRef.current && value.toLowerCase() !== 'loading...') {
                setDisplayCount(value);
            }
        });

        observer.observe(counterSpan, {
            characterData: true,
            subtree: true,
            childList: true
        });

        observerRef.current = observer;

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

        document.body.appendChild(inlineScript);
        document.body.appendChild(counterScript);
        scriptsRef.current = [inlineScript, counterScript];

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
            }

            scriptsRef.current.forEach((script) => {
                if (script && script.parentNode) {
                    script.parentNode.removeChild(script);
                }
            });
            scriptsRef.current = [];
        };
    }, [isProduction]);

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

            <div className="footer-stats">
                <div className="footer-stats__label">Total Visitors</div>
                <div className="footer-stats__circle" aria-live="polite">
                    <span
                        ref={counterSpanRef}
                        className="footer-stats__count statcounter"
                        id="sc_counter_13157343"
                    >
                        {displayCount}
                    </span>
                </div>
                <a
                    className="footer-stats__link"
                    title="View full analytics"
                    href="https://statcounter.com/p13157343/?guest=1"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    View full analytics
                </a>
                {!isProduction && (
                    <span className="footer-stats__note">Stats update on the published site.</span>
                )}
            </div>
        </footer>
    );
};

export default Footer;
