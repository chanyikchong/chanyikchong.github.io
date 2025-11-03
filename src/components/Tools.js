import React, { useState, useEffect } from 'react';
import { FaExternalLinkAlt } from 'react-icons/fa';
import '../styles/Projects.css';
import '../styles/SingleProject.css';

function Tools() {
    const [tools, setTools] = useState([]);

    useEffect(() => {
        // Load tools data (you could load this from a JSON or API like you did for projects)
        const loadTools = async () => {
            const toolsData = [
                { id: 1, name: 'Tax Calculator', description: 'A UK & China income tax calculator', url: 'https://chanyikchong.github.io/tax-calculator' },
                // { id: 2, name: 'Tool 2', description: 'A description of tool 2', url: '/tools/tool2' },
                // { id: 3, name: 'Tool 3', description: 'A description of tool 3', url: '/tools/tool3' },
                // Add more tools as needed
            ];

            setTools(toolsData);
        };

        loadTools();
    }, []);

    const handleToolClick = (url, event) => {
        window.open(url, '_blank', 'noopener,noreferrer');
        if (event?.currentTarget instanceof HTMLElement) {
            event.currentTarget.blur();
        }
    };

    return (
        <section id="tools" className="projects">
            <div className="project-grid">
                {tools.map((tool) => (
                    <button
                        type="button"
                        key={tool.id}
                        className="single-project-card tool-card"
                        onClick={(event) => handleToolClick(tool.url, event)}
                    >
                        <div className="tool-card__heading">
                            <h3>{tool.name}</h3>
                            {tool.badge && <span className="tool-card__badge">{tool.badge}</span>}
                        </div>
                        <p>{tool.description}</p>
                        <span className="single-project-card__cta">
                            Launch tool <FaExternalLinkAlt aria-hidden="true" />
                        </span>
                    </button>
                ))}
            </div>
        </section>
    );
}

export default Tools;
