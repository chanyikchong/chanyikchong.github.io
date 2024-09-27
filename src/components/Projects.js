import React, { useState, useEffect } from 'react';
import SingleProject from './SingleProject';  // Import the SingleProject component
import '../styles/Projects.css';

function Projects() {
    const [projects, setProjects] = useState([]);
    const [openProjectId, setOpenProjectId] = useState(null);

    // test
    const [isClicked, setIsClicked] = useState(false);

    // Toggle the state when button is clicked
    const handleClick = () => {
        setIsClicked(!isClicked); // Toggle the state
    };

    useEffect(() => {
        // Load project data
        const loadProjects = async () => {
            const projectsData = [
                { id: 1, title: 'Project 1', folder: 'project1' },
                { id: 2, title: 'Project 2', folder: 'project2' },
                { id: 3, title: 'Project 3', folder: 'project3' },
                // Add more projects as needed
            ];

            const loadedProjects = await Promise.all(projectsData.map(async (project) => {
                const abstractResponse = await fetch(`/projects/${project.folder}/abstract.md`);
                const abstract = await abstractResponse.text();

                const response = await fetch(`/projects/${project.folder}/README.md`);
                const content = await response.text();
                return { ...project, abstract, content };
            }));

            setProjects(loadedProjects);
        };

        loadProjects();
    }, []);

    const handleProjectClick = (projectId) => {
        setOpenProjectId(openProjectId === projectId ? null : projectId);
    };

    return (
        <section id="projects" className="projects">
            {/*<h2>Projects</h2>*/}
            <div className={`project-grid ${isClicked ? 'no-grid' : ''}`}>
                {projects.map((project) => {
                    let mode = 'abstract';
                    if (openProjectId === project.id) {
                        mode = 'open';
                    } else if (openProjectId !== null) {
                        mode = 'close';
                    }

                    return (
                        <SingleProject
                            key={project.id}
                            project={project}
                            mode={mode}
                            onClick={() => {handleProjectClick(project.id); handleClick()}}
                        />
                    );
                })}
            </div>
        </section>
    );
}

export default Projects;
