import React from 'react';
import '../styles/SingleProject.css';
import { FaArrowRight } from 'react-icons/fa';

function SingleProject({ project, onClick }) {
    return (
        <button
            type="button"
            className="single-project-card"
            onClick={onClick}
        >
            <h3>{project.title}</h3>
            <p>{project.abstract}</p>
            <span className="single-project-card__cta">
                View project <FaArrowRight aria-hidden="true" />
            </span>
        </button>
    );
}

export default SingleProject;
