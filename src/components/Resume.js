// src/components/Resume.js
import React from 'react';
import '../styles/Resume.css';
import ProfilePic from '../assets/Image.jpg';
import ResumePDF from '../assets/Yichong_s_CV.pdf'; // Path to your resume PDF


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

                <h2>Research Experience</h2>
                <div className="experience-section">
                    <div className="experience-item">
                        <div className="experience-company">
                            <span className="affiliation_name">Imperial College London</span>
                            <span className="position">Ph.D. Researcher</span>
                        </div>
                        <div className="experience-time">April 2022 - Present</div>
                    </div>
                    <ul className="experience-description">
                        <li>
                            Developed a collaborative AI system with early-exit neural networks and predictive models,
                            enabling faster and more energy-efficient inference on edge devices without sacrificing
                            accuracy.
                        </li>
                        <li>
                            Enhanced the AI system with reinforcement learning and automatic change detection to
                            maintain high performance even when network conditions and workloads shift unexpectedly.
                        </li>
                        <li>
                            Built a dynamic scheduler using simulation and online traffic prediction, significantly
                            improving task allocation and reducing service delays and failures under real-world
                            conditions.
                        </li>
                    </ul>
                </div>

                <h2>Work Experience</h2>
                <div className="experience-section">
                    <div className="experience-item">
                        <div className="experience-company">
                            <span className="affiliation_name">Imperial Consultants</span>
                            <span className="position">Full Stack Developer</span>
                        </div>
                        <div className="experience-time">Sep 2022 - Oct 2024</div>
                    </div>
                    <ul className="experience-description">
                        <li>
                            Led the design, development, and cloud deployment of SiMON, a solar anomaly detection
                            platform used by <a href="https://www.seeng-s.co.uk/" target="_blank"
                                                rel="noreferrer">SEENG LTD </a> to monitor large-scale solar fields.
                        </li>
                        <li>
                            Delivered a complete web-based application integrating client-provided detection algorithms,
                            enabling real-time monitoring and field diagnostics.
                        </li>
                        <li>
                            Supported SEENG LTD in securing new funding and external contracts by providing a robust,
                            production-ready system that demonstrated clear business value.
                        </li>
                    </ul>

                    <div className="experience-item">
                        <div className="experience-company">
                            <span className="affiliation_name">Huawei Technologies Co., Ltd</span>
                            <span className="position">AI Engineer</span>
                        </div>
                        <div className="experience-time">Nov 2020 - June 2022</div>
                    </div>
                    <ul className="experience-description">
                        <li>
                            Built and deployed AI systems for real-time monitoring of factory data, enabling early
                            detection of quality issues in production lines.
                        </li>
                        <li>
                            Developed interactive reporting tools to automate failure analysis and identify root causes,
                            streamlining engineering workflows.
                        </li>
                        <li>
                            Applied NLP models to extract insights from technical logs and built a searchable knowledge
                            graph to support intelligent queries and decision-making.
                        </li>
                    </ul>

                    {/* Add more work here */}
                </div>

                <h2>Publications</h2>
                <div className="publication-section">
                    <div className="publication-item">
                        <ul>
                            <li className="publication-content">
                                <span className="highlight-author">Y. Chen</span>, Z. Niu, M. Roveri, G. Casale. <a
                                href="https://ieeexplore.ieee.org/abstract/document/11044557"
                                target="_blank"
                                rel="noreferrer">CEED: Collaborative Early Exit Neural Network Inference at the Edge</a>,
                                in <i>Proc.of INFOCOM</i>, May 2025.
                            </li>
                            <li className="publication-content">
                                S. Huang, K. Li, D. You, <span className="highlight-author">Y. Chen</span>, A. Lin, S.
                                Liu, X. Li, and j. McCann, <a
                                href="https://link.springer.com/chapter/10.1007/978-3-031-72946-1_5" target="_blank"
                                rel="noreferrer">
                                Wimans: A benchmark dataset for wifi-based multi-user activity sensing</a>,
                                in <i>Proc.of ECCV</i>, Oct 2024.
                            </li>

                            <li className="publication-content">
                                <span className="highlight-author">Y. Chen</span>, M. Roveri, S, Tuli and G. Casale, <a
                                href="https://ieeexplore.ieee.org/abstract/document/10327805" target="_blank"
                                rel="noreferrer">
                                Coupling QoS Co-Simulation with Online Adaptive Arrival Forecasting</a>, in <i>Proc.of
                                IFIP/IEEE CNSM</i>, Nov 2023.
                            </li>

                            <li className="publication-content">
                                <span className="highlight-author">Y. Chen</span> and G. Casale, <a
                                href="https://ieeexplore.ieee.org/abstract/document/9614298"
                                target="_blank"
                                rel="noreferrer">Deep Learning Models for Automated Identification of Scheduling
                                Policies</a>, in <i>Proc.of IEEE MASCOTS</i>,
                                Nov 2021.
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
