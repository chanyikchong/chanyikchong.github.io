import React from 'react';
import ReactMarkdown from 'react-markdown';
import '../styles/SingleProject.css';
import { FaArrowRight } from 'react-icons/fa';
import {createMarkdownComponents} from '../utils/markdown';
import LikeButton from './LikeButton';

function SingleProject({ project, onClick }) {
    return (
        <button
            type="button"
            className="single-project-card"
            onClick={(e) => {
                // Don't trigger onClick if clicking on like button
                if (e.target.closest('.like-button')) return;
                onClick();
            }}
        >
            <h3>{project.title}</h3>
            <ReactMarkdown
                className="single-project-card__abstract"
                disallowedElements={['h1', 'h2', 'h3', 'img']}
                components={createMarkdownComponents()}
            >
                {project.abstract}
            </ReactMarkdown>
            <div className="single-project-card__footer">
                <LikeButton type="project" itemId={project.folder} />
                <span className="single-project-card__cta">
                    View project <FaArrowRight aria-hidden="true" />
                </span>
            </div>
        </button>
    );
}

export default SingleProject;
