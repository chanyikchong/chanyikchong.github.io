import React from 'react';

function Projects() {
  return (
    <section id="projects" className="projects">
      <h2>Projects</h2>
      <div className="project-grid">
        {/* Add your project items here */}
        <div className="project-item">
          <h3>Project 1</h3>
          <p>Description of Project 1</p>
        </div>
        <div className="project-item">
          <h3>Project 2</h3>
          <p>Description of Project 2</p>
        </div>
        {/* Add more project items as needed */}
      </div>
    </section>
  );
}

export default Projects;