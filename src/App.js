import React, {useEffect} from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './styles/App.css';
import './styles/Stars.css';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import Projects from './components/Projects';
import Contact from './components/Contact';
import { createStars, handleMouseMove } from './js/Stars'; // Import the stars script


function App() {
  useEffect(() => {
    // Create stars and handle mouse movement
    const starContainer = document.querySelector('.star-field');

    // Clear any existing stars before creating new ones
    while (starContainer.firstChild) {
      starContainer.removeChild(starContainer.firstChild);
    }

    const stars = createStars(500); // Number of stars to generate
    const onMouseMove = handleMouseMove(stars); // Get mouse move handler

    // Attach the mousemove event listener
    window.addEventListener('mousemove', onMouseMove);

    // Clean up the event listener and stars on component unmount
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      while (starContainer.firstChild) {
        starContainer.removeChild(starContainer.firstChild);
      }
    };
  }, []); // Empty dependency array to ensure this effect only runs once

  return (
    <Router>
      <div className="App">
        <Header/>
        <main>
          <div className="star-field"></div>
          <Routes>
            <Route path="/" element={<Hero/>}/>
            <Route path="/about" element={<About/>}/>
            <Route path="/projects" element={<Projects/>}/>
            <Route path="/contact" element={<Contact/>}/>
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;