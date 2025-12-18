#!/usr/bin/env node

/**
 * Script to generate projects.json from the folder structure
 *
 * Folder structure expected:
 * public/projects/
 * ├── project-folder/        (project folder)
 * │   ├── abstract.md        (project abstract)
 * │   ├── README.md          (full project content)
 * │   ├── metadata.json      (project metadata - optional)
 * │   └── images/            (optional)
 * └── another-project/
 *     └── ...
 *
 * metadata.json format (optional):
 * {
 *   "title": "Project Title",
 *   "order": 1  // optional, for custom sorting (lower = first)
 * }
 *
 * If metadata.json doesn't exist, the script will:
 * - Extract title from first # heading in abstract.md or README.md
 * - Use folder name as title if no heading found
 *
 * Usage: node scripts/generate-projects.js
 */

const fs = require('fs');
const path = require('path');

const PROJECTS_DIR = path.join(__dirname, '..', 'public', 'projects');
const OUTPUT_FILE = path.join(PROJECTS_DIR, 'projects.json');

// Folders/files to ignore
const IGNORE = ['projects.json', '.DS_Store', 'Thumbs.db'];

function extractTitleFromMarkdown(content) {
    // Look for first # heading
    const match = content.match(/^#\s+(.+)$/m);
    if (match) {
        return match[1].trim();
    }
    return null;
}

function folderToTitle(folderName) {
    // Convert folder name to title case
    return folderName
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

function scanProjects() {
    const projects = [];
    let id = 1;

    // Get all project folders
    const projectFolders = fs.readdirSync(PROJECTS_DIR).filter(item => {
        const itemPath = path.join(PROJECTS_DIR, item);
        return fs.statSync(itemPath).isDirectory() && !IGNORE.includes(item);
    });

    console.log(`Found ${projectFolders.length} project(s)`);

    for (const projectFolder of projectFolders) {
        const projectPath = path.join(PROJECTS_DIR, projectFolder);
        const metadataPath = path.join(projectPath, 'metadata.json');
        const abstractPath = path.join(projectPath, 'abstract.md');
        const readmePath = path.join(projectPath, 'README.md');

        let metadata = {};

        // Try to read metadata.json
        if (fs.existsSync(metadataPath)) {
            try {
                metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                console.log(`  ✓ ${projectFolder}: Using metadata.json`);
            } catch (e) {
                console.warn(`  ⚠ ${projectFolder}: Invalid metadata.json, using defaults`);
            }
        }

        // Try to extract title from abstract.md or README.md if not in metadata
        if (!metadata.title) {
            if (fs.existsSync(abstractPath)) {
                const content = fs.readFileSync(abstractPath, 'utf8');
                metadata.title = extractTitleFromMarkdown(content);
            }
            if (!metadata.title && fs.existsSync(readmePath)) {
                const content = fs.readFileSync(readmePath, 'utf8');
                metadata.title = extractTitleFromMarkdown(content);
            }
        }

        // Set defaults
        const project = {
            id: id++,
            title: metadata.title || folderToTitle(projectFolder),
            folder: projectFolder,
            order: metadata.order !== undefined ? metadata.order : 999
        };

        projects.push(project);
        console.log(`  → ${project.title}`);
    }

    return projects;
}

function main() {
    console.log('🔍 Scanning projects directory...\n');

    if (!fs.existsSync(PROJECTS_DIR)) {
        console.error(`❌ Projects directory not found: ${PROJECTS_DIR}`);
        process.exit(1);
    }

    let projects = scanProjects();

    // Sort by order (lower first), then by title alphabetically
    projects.sort((a, b) => {
        if (a.order !== b.order) {
            return a.order - b.order;
        }
        return a.title.localeCompare(b.title);
    });

    // Re-assign IDs after sorting and remove order field from output
    projects = projects.map((project, index) => ({
        id: index + 1,
        title: project.title,
        folder: project.folder
    }));

    // Write to projects.json
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(projects, null, 2) + '\n');

    console.log(`\n✅ Generated ${OUTPUT_FILE}`);
    console.log(`   Total projects: ${projects.length}`);
}

main();
