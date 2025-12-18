#!/usr/bin/env node

/**
 * Script to generate posts.json from the folder structure
 *
 * Folder structure expected:
 * public/posts/
 * ├── Topic Name/           (topic folder)
 * │   ├── post-slug/        (post folder)
 * │   │   ├── post.md       (post content)
 * │   │   ├── summary.md    (post summary - optional)
 * │   │   └── metadata.json (post metadata - optional)
 * │   └── another-post/
 * │       └── ...
 * └── Another Topic/
 *     └── ...
 *
 * metadata.json format (optional):
 * {
 *   "title": "Post Title",
 *   "date": "2024-10-12",
 *   "slug": "custom-slug"  // optional, defaults to folder name
 * }
 *
 * If metadata.json doesn't exist, the script will:
 * - Extract title from first # heading in post.md
 * - Use folder name as slug
 * - Use current date as date (you should update this manually)
 *
 * Usage: node scripts/generate-posts.js
 */

const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '..', 'public', 'posts');
const OUTPUT_FILE = path.join(POSTS_DIR, 'posts.json');

// Folders/files to ignore
const IGNORE = ['posts.json', '.DS_Store', 'Thumbs.db'];

function extractTitleFromMarkdown(content) {
    // Look for first # heading
    const match = content.match(/^#\s+(.+)$/m);
    if (match) {
        return match[1].trim();
    }
    return null;
}

function generateSlug(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function scanPosts() {
    const posts = [];
    let id = 1;

    // Get all topic folders
    const topicFolders = fs.readdirSync(POSTS_DIR).filter(item => {
        const itemPath = path.join(POSTS_DIR, item);
        return fs.statSync(itemPath).isDirectory() && !IGNORE.includes(item);
    });

    console.log(`Found ${topicFolders.length} topic(s): ${topicFolders.join(', ')}`);

    for (const topic of topicFolders) {
        const topicPath = path.join(POSTS_DIR, topic);

        // Get all post folders in this topic
        const postFolders = fs.readdirSync(topicPath).filter(item => {
            const itemPath = path.join(topicPath, item);
            return fs.statSync(itemPath).isDirectory() && !IGNORE.includes(item);
        });

        console.log(`  Topic "${topic}" has ${postFolders.length} post(s)`);

        for (const postFolder of postFolders) {
            const postPath = path.join(topicPath, postFolder);
            const metadataPath = path.join(postPath, 'metadata.json');
            const postMdPath = path.join(postPath, 'post.md');

            let metadata = {};

            // Try to read metadata.json
            if (fs.existsSync(metadataPath)) {
                try {
                    metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                    console.log(`    ✓ ${postFolder}: Using metadata.json`);
                } catch (e) {
                    console.warn(`    ⚠ ${postFolder}: Invalid metadata.json, using defaults`);
                }
            }

            // Try to extract title from post.md if not in metadata
            if (!metadata.title && fs.existsSync(postMdPath)) {
                const content = fs.readFileSync(postMdPath, 'utf8');
                metadata.title = extractTitleFromMarkdown(content);
            }

            // Set defaults
            const post = {
                id: id++,
                title: metadata.title || postFolder.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                folder: `${topic}/${postFolder}`,
                slug: metadata.slug || generateSlug(postFolder),
                date: metadata.date || new Date().toISOString().split('T')[0],
                topic: topic
            };

            posts.push(post);
            console.log(`    → ${post.title} (${post.date})`);
        }
    }

    return posts;
}

function main() {
    console.log('🔍 Scanning posts directory...\n');

    if (!fs.existsSync(POSTS_DIR)) {
        console.error(`❌ Posts directory not found: ${POSTS_DIR}`);
        process.exit(1);
    }

    const posts = scanPosts();

    // Sort by date (newest first)
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Re-assign IDs after sorting
    posts.forEach((post, index) => {
        post.id = index + 1;
    });

    // Write to posts.json
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(posts, null, 2) + '\n');

    console.log(`\n✅ Generated ${OUTPUT_FILE}`);
    console.log(`   Total posts: ${posts.length}`);
}

main();
