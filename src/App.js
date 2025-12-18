import React, {useEffect, useState} from 'react';
import {HashRouter as Router, Route, Routes} from 'react-router-dom';

import './styles/App.css';
import './styles/Stars.css';

import Header from './components/Header';
import Hero from './components/Hero';
import Resume from './components/Resume';
import Projects from './components/Projects';
import Posts from './components/Posts';
import PostPage from './components/PostPage';
import Tools from './components/Tools';
import Contact from './components/Contact';
import Footer from './components/Footer'; // Import the Footer

import {createStars, handleMouseMove} from './js/Stars'; // Import the stars script
import {createConstellation} from './js/Constellation';

const THEME_STORAGE_KEY = 'preferred-theme';

const getInitialTheme = () => {
    if (typeof window === 'undefined') {
        return 'dark';
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark') {
        if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('data-theme', storedTheme);
        }
        return storedTheme;
    }

    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolvedTheme = prefersDark
        ? 'dark'
        : 'light';
    if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', resolvedTheme);
    }
    return resolvedTheme;
};

function App() {
    const [theme, setTheme] = useState(getInitialTheme);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
    };

    useEffect(() => {
        const starContainer = document.querySelector('.star-field');
        if (!starContainer) {
            return undefined;
        }

        const clearContainer = () => {
            while (starContainer.firstChild) {
                starContainer.removeChild(starContainer.firstChild);
            }
        };

        clearContainer();

        let cleanup = () => {};

        if (theme === 'dark') {
            const stars = createStars(500, starContainer);
            const onMouseMove = handleMouseMove(stars);
            window.addEventListener('mousemove', onMouseMove);
            cleanup = () => {
                window.removeEventListener('mousemove', onMouseMove);
            };
        } else {
            cleanup = createConstellation(starContainer);
        }

        return () => {
            cleanup();
            clearContainer();
        };
    }, [theme]);

    return (
        <Router>
            <div className={`App theme-${theme}`}>
                <Header theme={theme} onToggleTheme={toggleTheme}/>
                <div className="star-field"></div>
                <main>
                    <Routes>
                        <Route path="/" element={<Hero/>}/>
                        <Route path="/resume" element={<Resume/>}/>
                        <Route path="/projects" element={<Projects/>}/>
                        <Route path="/posts" element={<Posts/>}/>
                        <Route path="/posts/:slug" element={<PostPage/>}/>
                        <Route path="/tools" element={<Tools />} />
                        <Route path="/contact" element={<Contact/>}/>
                    </Routes>
                </main>
                <Footer/>
            </div>
        </Router>
    );
}

export default App;
