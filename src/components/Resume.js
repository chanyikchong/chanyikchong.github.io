import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import '../styles/Resume.css';

const RESUME_DATA_URL = `${process.env.PUBLIC_URL || ''}/resume/resume.json`;

const renderAuthors = (authors = []) => authors.map((author, index) => (
    <span
        key={`${author.name}-${index}`}
        className={author.highlight ? 'highlight-author' : undefined}
    >
        {author.name}{index < authors.length - 1 ? ', ' : ''}
    </span>
));

const resolveAssetPath = (assetPath = '') => {
    if (!assetPath) {
        return '';
    }

    if (/^(?:https?:)?\/\//i.test(assetPath)) {
        return assetPath;
    }

    const publicUrl = process.env.PUBLIC_URL || '';

    if (assetPath.startsWith('/')) {
        return `${publicUrl}${assetPath}`;
    }

    return `${publicUrl}/${assetPath}`;
};

const Resume = () => {
    const [resumeData, setResumeData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadResume = async () => {
            try {
                const response = await fetch(RESUME_DATA_URL);
                if (!response.ok) {
                    throw new Error('Unable to load résumé data');
                }
                const data = await response.json();
                setResumeData(data);
            } catch (err) {
                console.error(err);
                setError('We could not load the résumé right now.');
            } finally {
                setIsLoading(false);
            }
        };

        loadResume();
    }, []);

    const renderBulletList = (items = []) => (
        <ul className="experience-description">
            {items.map((item, index) => (
                <li key={index}>
                    <ReactMarkdown>{item}</ReactMarkdown>
                </li>
            ))}
        </ul>
    );

    if (isLoading) {
        return (
            <section className="resume-section">
                <p>Loading résumé…</p>
            </section>
        );
    }

    if (error || !resumeData) {
        return (
            <section className="resume-section">
                <p>{error || 'Résumé data is unavailable.'}</p>
            </section>
        );
    }

    const {
        name,
        phones = [],
        emails = [],
        profileImage,
        resumePdf,
        education = [],
        researchExperience = [],
        workExperience = [],
        publications = [],
        technicalStrengths = []
    } = resumeData;

    const resumeFileName = resumePdf ? resumePdf.split('/').pop() : 'resume.pdf';

    return (
        <section className="resume-section">
            <div className="profile-container">
                {profileImage && (
                    <img
                        src={resolveAssetPath(profileImage)}
                        alt="Profile"
                        className="profile-img"
                    />
                )}
            </div>
            <div className="resume-content">
                <h1>{name}</h1>
                <p><strong>Phone:</strong> {phones.join(', ')}</p>
                <p><strong>Email:</strong> {emails.join(', ')}</p>

                <h2>Education Background</h2>
                <div className="education-section">
                    {education.map((item) => (
                        <div className="education-item" key={`${item.school}-${item.time}`}>
                            <div className="education-school">
                                <span className="affiliation_name">{item.school}</span>
                                <span className="degree">{item.degree}</span>
                            </div>
                            <div className="education-time">{item.time}</div>
                        </div>
                    ))}
                </div>

                <h2>Research Experience</h2>
                <div className="experience-section">
                    {researchExperience.map((experience) => (
                        <div key={`${experience.organization}-${experience.time}`}>
                            <div className="experience-item">
                                <div className="experience-company">
                                    <span className="affiliation_name">{experience.organization}</span>
                                    <span className="position">{experience.role}</span>
                                </div>
                                <div className="experience-time">{experience.time}</div>
                            </div>
                            {renderBulletList(experience.bulletPoints)}
                        </div>
                    ))}
                </div>

                <h2>Work Experience</h2>
                <div className="experience-section">
                    {workExperience.map((experience) => (
                        <div key={`${experience.organization}-${experience.time}`}>
                            <div className="experience-item">
                                <div className="experience-company">
                                    <span className="affiliation_name">{experience.organization}</span>
                                    <span className="position">{experience.role}</span>
                                </div>
                                <div className="experience-time">{experience.time}</div>
                            </div>
                            {renderBulletList(experience.bulletPoints)}
                        </div>
                    ))}
                </div>

                <h2>Publications</h2>
                <div className="publication-section">
                    <div className="publication-item">
                        <ul>
                            {publications.map((publication) => (
                                <li
                                    className="publication-content"
                                    key={`${publication.title}-${publication.date}`}
                                >
                                    {renderAuthors(publication.authors)}
                                    {' '}
                                    <a
                                        href={publication.link}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        {publication.title}
                                    </a>
                                    , in <i>{publication.venue}</i>, {publication.date}.
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <h2>Technical Strengths</h2>
                <div className="technical-strengths">
                    {technicalStrengths.map((strength) => (
                        <div className="tech-row" key={strength.label}>
                            <div className="tech-label">{strength.label}:</div>
                            <div className="tech-value">
                                {strength.values.map((value, index) => (
                                    <div key={`${strength.label}-${index}`}>{value}</div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="download-container">
                    {resumePdf && (
                        <a
                            href={resolveAssetPath(resumePdf)}
                            download={resumeFileName}
                            className="download-button"
                        >
                            Download Résumé
                        </a>
                    )}
                </div>
            </div>
        </section>
    );
};

export default Resume;
