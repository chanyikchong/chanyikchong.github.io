import React, { useState, useEffect } from 'react';
import '../styles/Projects.css'; // You can reuse the styles if you want a similar layout
import '../styles/SingleProject.css'

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

    const handleToolClick = (url) => {
        window.open(url, '_blank'); // Open the external URL in a new tab
    };

    return (
        <section id="tools" className="projects">
            <div className="project-grid">
                {tools.map((tool) => (
                    <div
                        key={tool.id}
                        className="single-project-item abstract"
                        onClick={() => handleToolClick(tool.url)}
                    >
                        <h3>{tool.name}</h3>
                        <p>{tool.description}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

export default Tools;
