import React from 'react';
import {ReactTyped as Typed} from 'react-typed';
import '../styles/App.css';
import '../styles/Hero.css';

function Hero() {
    return (
        <section id="home" className="hero">
            <div className="hero-content">
                <div className="hero-name-role-content">
                    <h2 className="hero-hi">Hi ! <span className="wave" role="img" aria-label="wave">👋🏻</span></h2>
                    <h1 className="hero-intro">
                        I'M <strong className="hero-name">YICHONG CHEN</strong>
                    </h1>
                    <p className="hero-description">
                        <Typed
                            className="hero-role"
                            strings={[
                                "PhD Candidate",
                                "AI Enthusiast",
                                // "Distributed Computing Expert",
                                "Open Source Contributor"
                            ]}
                            typeSpeed={40}
                            backSpeed={50}
                            backDelay={1500}
                            loop
                        />
                    </p>
                </div>
                <div className="hero-about">
                    <ul>
                        <li>
                            <span className="list-icon"> 🎓 </span>
                            PhD student in the Department of Computing at Imperial College London, UK.
                        </li>
                        <li>
                            <span className="list-icon"> 🔬 </span>
                            Research interests in data-driven performance analysis and the design of distributed
                            systems, as well as the deployment of AI systems.
                        </li>
                        <li>
                            <span className="list-icon"> 🤖 </span>
                            Focus on leveraging advanced techniques in machine learning and deep learning to enhance the
                            efficiency and effectiveness of distributed computing environments.
                        </li>
                    </ul>
                </div>
            </div>
        </section>
    )
        ;
}

export default Hero;