import React, { useEffect, useState } from 'react';
import SingleProject from './SingleProject';
import ProjectModal from './ProjectModal';
import '../styles/Projects.css';

const manifestPath = `${process.env.PUBLIC_URL || ''}/projects/projects.json`;

function Projects() {
    const [projects, setProjects] = useState([]);
    const [activeProject, setActiveProject] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadProjects = async () => {
            try {
                const manifestResponse = await fetch(manifestPath);
                if (!manifestResponse.ok) {
                    throw new Error('Unable to load project manifest');
                }

                const manifest = await manifestResponse.json();
                const baseUrl = process.env.PUBLIC_URL || '';

                const loadedProjects = await Promise.all(
                    manifest.map(async (project) => {
                        const folderBase = `${baseUrl}/projects/${project.folder}`;

                        try {
                            const [abstractResponse, readmeResponse] = await Promise.all([
                                fetch(`${folderBase}/abstract.md`),
                                fetch(`${folderBase}/README.md`)
                            ]);

                            if (!abstractResponse.ok || !readmeResponse.ok) {
                                throw new Error(`Missing files for ${project.title}`);
                            }

                            const [abstract, content] = await Promise.all([
                                abstractResponse.text(),
                                readmeResponse.text()
                            ]);

                            return {
                                ...project,
                                abstract: abstract.trim(),
                                content,
                                basePath: `${folderBase}/`
                            };
                        } catch (innerError) {
                            console.error(innerError);
                            return {
                                ...project,
                                abstract: 'Project details coming soon.',
                                content: 'Project details coming soon.',
                                basePath: `${folderBase}/`
                            };
                        }
                    })
                );

                setProjects(loadedProjects);
            } catch (err) {
                console.error(err);
                setError('We could not load the project list right now.');
            } finally {
                setIsLoading(false);
            }
        };

        loadProjects();
    }, []);

    return (
        <section id="projects" className="projects">
            {isLoading && <p>Loading projects…</p>}
            {error && !isLoading && <p>{error}</p>}
            {!isLoading && !error && (
                <>
                    <div className="project-grid">
                        {projects.map((project) => (
                            <SingleProject
                                key={project.id}
                                project={project}
                                onClick={() => setActiveProject(project)}
                            />
                        ))}
                    </div>
                    {activeProject && (
                        <ProjectModal
                            project={activeProject}
                            onClose={() => setActiveProject(null)}
                        />
                    )}
                </>
            )}
        </section>
    );
}

export default Projects;
