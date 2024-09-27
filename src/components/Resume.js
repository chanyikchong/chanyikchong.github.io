// src/components/Resume.js
import React from 'react';
import '../styles/Resume.css';
import ProfilePic from '../assets/Image.jpg';
import ResumePDF from '../assets/CV_for_freshers.pdf'; // Path to your resume PDF


const Resume = () => {
    return (
        <section className="resume-section">
            <div className="profile-container">
                <img src={ProfilePic} alt="Profile" className="profile-img"/>
            </div>
            <div className="resume-content">
                <h1>Yichong Chen</h1>
                <p><strong>Phone:</strong> (+86) 13794390972, (+44) 07754875112</p>
                <p><strong>Email:</strong> yichong.chen119@imperial.ac.uk, chanyikchong@outlook.com</p>

                <h2>Education Background</h2>
                <div className="education-section">
                    <div className="education-item">
                        <div className="education-school">
                            <span className="affiliation_name">Imperial College London</span>
                            <span className="degree">Ph.D in Computing</span>
                        </div>
                        <div className="education-time">April 2022 - Present</div>
                    </div>

                    <div className="education-item">
                        <div className="education-school">
                            <span className="affiliation_name">Imperial College London</span>
                            <span className="degree">MSc in Computing (AI & Machine Learning)</span>
                        </div>
                        <div className="education-time">Sep 2019 - Nov 2020</div>
                    </div>

                    <div className="education-item">
                        <div className="education-school">
                            <span className="affiliation_name">University of Birmingham</span>
                            <span className="degree">BSc in Mathematics</span>
                        </div>
                        <div className="education-time">Sep 2017 - June 2019</div>
                    </div>

                    <div className="education-item">
                        <div className="education-school">
                            <span className="affiliation_name">South China University of Technology</span>
                            <span className="degree">BEng in Information Management</span>
                        </div>
                        <div className="education-time">Sep 2014 - June 2019</div>
                    </div>
                </div>

                <h2>Work Experience</h2>
                <div className="experience-section">
                    <div className="experience-item">
                        <div className="experience-company">
                            <span className="affiliation_name">Imperial Consultants</span>
                            <span className="position">Consultant</span>
                        </div>
                        <div className="experience-time">Sep 2022 - Oct 2024</div>
                    </div>
                    <p className="experience-description">
                        Working as a full stack developer to help <a href="https://www.seeng-s.co.uk/" target="_blank"
                                                                     rel="noreferrer">S.e.eng LTD</a>
                        to build their platform SIMON. This include building the backend server to host their algorithm
                        to analyse the PV panel data and designing the frontend website to provide a UI to S.e.eng's
                        customer to maintain their PV panels.
                    </p>

                    <div className="experience-item">
                        <div className="experience-company">
                            <span className="affiliation_name">Huawei Technologies Co., Ltd</span>
                            <span className="position">AI Engineer</span>
                        </div>
                        <div className="experience-time">Nov 2020 - June 2022</div>
                    </div>
                    <p className="experience-description">
                        Designed AI systems to predict product quality and automatically generate reports on test
                        failures.
                        Technologies used: BERT, BiLSTM, CRF, Knowledge Graphs.
                    </p>

                    <div className="experience-item">
                        <div className="experience-company">
                            <span className="affiliation_name">China Construction Bank</span>
                            <span className="position">FinTech Intern</span>
                        </div>
                        <div className="experience-time">July 2019 - Sep 2019</div>
                    </div>
                    <p className="experience-description">
                        Analyzed financial demand of new energy vehicle market and proposed a service plan.
                    </p>

                    {/* Add more work here */}
                </div>

                <h2>Publications</h2>
                <div className="publication-section">
                    <div className="publication-item">
                        <ul>
                            <li className="publication-content">
                                S. Huang, K. Li, D. You, <span className="highlight-author">Y. Chen</span>, A. Lin, S.
                                Liu, X. Li, and j. McCann, "WiMANS: A Benchmark Dataset for WiFi-based Multi-user
                                Activity
                                Sensing,"
                                <i>arXiv preprint arXiv:2402.09430 (2024).</i>
                            </li>

                            <li className="publication-content">
                                <span className="highlight-author">Y. Chen</span>, M. Roveri, S, Tuli and G. Casale,
                                "Coupling QoS Co-Simulation with Online Adaptive Arrival Forecasting,"
                                <i>2023 19th International Conference on Network and Service Management (CNSM)</i>
                            </li>

                            <li className="publication-content">
                                <span className="highlight-author">Y. Chen</span> and G. Casale, "Deep Learning Models
                                for
                                Automated Identification of Scheduling Policies,"
                                <i>2021 29th International Symposium on Modeling, Analysis, and Simulation of Computer
                                    and
                                    Telecommunication Systems (MASCOTS)</i>
                            </li>
                        </ul>
                    </div>

                    {/* Add more publications here as additional div blocks */}
                </div>

                <h2>Technical Strengths</h2>
                <div className="technical-strengths">
                    <div className="tech-row">
                        <div className="tech-label">Coding:</div>
                        <div className="tech-value">Python, MATLAB, JavaScript, SQL</div>
                    </div>
                    <div className="tech-row">
                        <div className="tech-label">Software & Tools:</div>
                        <div className="tech-value">PyTorch, Nginx, Docker, Microsoft Office, LaTeX</div>
                    </div>
                    <div className="tech-row">
                        <div className="tech-label">Language:</div>
                        <div className="tech-value">
                            <div>English (Business Conversation)</div>
                            <div>Mandarin (Native)</div>
                            <div>Cantonese (Native)</div>
                        </div>

                    </div>

                </div>

                {/* Download Button */}
                <div className="download-container">
                    <a href={ResumePDF} download="YichongChen_Resume.pdf" className="download-button">
                        Download Résumé
                    </a>
                </div>

            </div>
        </section>
    );
};

export default Resume;
