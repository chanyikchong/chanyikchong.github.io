import React, { useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import '../styles/ProjectModal.css';
import {createMarkdownComponents} from '../utils/markdown';
import LikeButton from './LikeButton';

function ProjectModal({ project, onClose }) {
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [onClose]);

    const markdownComponents = useMemo(
        () => createMarkdownComponents(project.basePath),
        [project.basePath]
    );

    const handleBackdropClick = (event) => {
        if (event.target === event.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="project-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-modal-title"
            onClick={handleBackdropClick}
        >
            <div className="project-modal">
                <button
                    type="button"
                    className="project-modal__close"
                    onClick={onClose}
                    aria-label="Close project"
                >
                    ×
                </button>
                <header className="project-modal__header">
                    <h2 id="project-modal-title">{project.title}</h2>
                </header>
                <div className="project-modal__body">
                    <ReactMarkdown
                        className="project-modal__abstract"
                        components={markdownComponents}
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeRaw, rehypeKatex]}
                    >
                        {project.abstract}
                    </ReactMarkdown>
                    <ReactMarkdown
                        components={markdownComponents}
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeRaw, rehypeKatex]}
                    >
                        {project.content}
                    </ReactMarkdown>
                </div>
                <div className="project-modal__footer">
                    <div className="project-modal__like">
                        <LikeButton type="project" itemId={project.folder} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProjectModal;
