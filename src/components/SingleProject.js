import React from 'react';
import ReactMarkdown from 'react-markdown';
import '../styles/SingleProject.css';

function SingleProject({ project, mode, onClick }) {
    return (
        <div
            className={`single-project-item ${mode}`}
            onClick={onClick}
        >
            <div className={`project-abstract ${mode}`}>
                <h3>{project.title}</h3>
                <p>{project.abstract}</p>
            </div>
            <div className={`markdown-content ${mode}`}>
                <ReactMarkdown>{project.content}</ReactMarkdown>
            </div>
        </div>
    );
}

export default SingleProject;
