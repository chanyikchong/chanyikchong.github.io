#!/usr/bin/env node

/**
 * Script to convert Jupyter notebooks (.ipynb) to Markdown for posts
 *
 * This script finds all .ipynb files in the posts directory and converts them
 * to post.md format, preserving code cells, outputs, and markdown cells.
 *
 * Usage: node scripts/convert-notebooks.js
 *
 * The script will:
 * 1. Find all .ipynb files in public/posts/
 * 2. Convert each notebook to markdown
 * 3. Save as post.md in the same folder
 * 4. Generate summary.md from the first markdown cell (if not exists)
 * 5. Generate metadata.json from notebook metadata (if not exists)
 */

const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '..', 'public', 'posts');

function findNotebooks(dir) {
    const notebooks = [];

    function scan(currentDir) {
        const items = fs.readdirSync(currentDir);
        for (const item of items) {
            const itemPath = path.join(currentDir, item);
            const stat = fs.statSync(itemPath);

            if (stat.isDirectory()) {
                scan(itemPath);
            } else if (item.endsWith('.ipynb')) {
                notebooks.push(itemPath);
            }
        }
    }

    scan(dir);
    return notebooks;
}

/**
 * Convert LaTeX \textcolor{color}{text} to {\color{color} text} for KaTeX compatibility
 * KaTeX better supports the {\color{...} ...} syntax
 */
function convertTextcolorToColor(text) {
    // Use a function to properly match balanced braces for deeply nested content
    let result = text;
    let changed = true;

    // Keep converting until no more \textcolor commands are found
    while (changed) {
        changed = false;
        const textcolorIndex = result.indexOf('\\textcolor{');

        if (textcolorIndex === -1) break;

        // Find the color argument (first {...})
        let colorStart = textcolorIndex + '\\textcolor{'.length;
        let colorEnd = result.indexOf('}', colorStart);
        if (colorEnd === -1) break;

        const color = result.substring(colorStart, colorEnd);

        // Find the content argument (second {...}) with balanced brace matching
        let contentStart = colorEnd + 1;
        if (result[contentStart] !== '{') break;

        // Match balanced braces for the content
        let braceCount = 1;
        let contentEnd = contentStart + 1;
        while (contentEnd < result.length && braceCount > 0) {
            if (result[contentEnd] === '{') braceCount++;
            else if (result[contentEnd] === '}') braceCount--;
            contentEnd++;
        }

        if (braceCount !== 0) break;

        const content = result.substring(contentStart + 1, contentEnd - 1);

        // Replace \textcolor{color}{content} with {\color{color} content}
        const before = result.substring(0, textcolorIndex);
        const after = result.substring(contentEnd);
        result = before + `{\\color{${color}} ${content}}` + after;
        changed = true;
    }

    return result;
}

/**
 * Normalize display math blocks for remark-math compatibility
 * Ensures $$ delimiters are on their own lines, not combined with \begin{} or \end{}
 * This fixes parsing issues where $$\begin{aligned} on one line confuses remark-math
 */
function normalizeDisplayMath(text) {
    let result = text;

    // Fix opening: $$\begin{...} -> $$\n\begin{...}
    // Note: In replacement strings, $$ produces a single $, so we use $$$$ to get $$
    result = result.replace(/\$\$\\begin\{/g, '$$$$\n\\begin{');

    // Fix closing: \end{...}$$ -> \end{...}\n$$
    result = result.replace(/\\end\{([^}]+)\}\$\$/g, '\\end{$1}\n$$$$');

    return result;
}

function extractTextFromOutput(output) {
    if (output.text) {
        return Array.isArray(output.text) ? output.text.join('') : output.text;
    }
    if (output.data) {
        // Prefer plain text, then markdown, then HTML
        if (output.data['text/plain']) {
            const text = output.data['text/plain'];
            return Array.isArray(text) ? text.join('') : text;
        }
        if (output.data['text/markdown']) {
            const md = output.data['text/markdown'];
            return Array.isArray(md) ? md.join('') : md;
        }
        if (output.data['text/html']) {
            const html = output.data['text/html'];
            return `<div class="notebook-html-output">\n${Array.isArray(html) ? html.join('') : html}\n</div>`;
        }
        // Handle images
        if (output.data['image/png']) {
            return `![Output](data:image/png;base64,${output.data['image/png']})`;
        }
        if (output.data['image/jpeg']) {
            return `![Output](data:image/jpeg;base64,${output.data['image/jpeg']})`;
        }
    }
    return '';
}

function convertNotebookToMarkdown(notebookPath) {
    const content = fs.readFileSync(notebookPath, 'utf8');
    const notebook = JSON.parse(content);

    const cells = notebook.cells || [];
    const markdownParts = [];
    let title = null;
    let firstMarkdownCell = null;

    for (const cell of cells) {
        const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;

        if (cell.cell_type === 'markdown') {
            // Extract title from first heading
            if (!title) {
                const titleMatch = source.match(/^#\s+(.+)$/m);
                if (titleMatch) {
                    title = titleMatch[1].trim();
                }
            }

            // Store first markdown cell for summary
            if (!firstMarkdownCell) {
                firstMarkdownCell = source;
            }

            markdownParts.push(source);
            markdownParts.push('\n\n');
        } else if (cell.cell_type === 'code') {
            // Detect language from notebook metadata
            const language = notebook.metadata?.kernelspec?.language ||
                            notebook.metadata?.language_info?.name ||
                            'python';

            // Add code block
            markdownParts.push('```' + language + '\n');
            markdownParts.push(source);
            if (!source.endsWith('\n')) {
                markdownParts.push('\n');
            }
            markdownParts.push('```\n\n');

            // Add outputs
            const outputs = cell.outputs || [];
            for (const output of outputs) {
                if (output.output_type === 'stream') {
                    const text = Array.isArray(output.text) ? output.text.join('') : output.text;
                    if (text.trim()) {
                        markdownParts.push('<div class="notebook-output">\n\n```\n');
                        markdownParts.push(text);
                        if (!text.endsWith('\n')) {
                            markdownParts.push('\n');
                        }
                        markdownParts.push('```\n\n</div>\n\n');
                    }
                } else if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
                    const text = extractTextFromOutput(output);
                    if (text.trim()) {
                        markdownParts.push('<div class="notebook-output">\n\n');
                        markdownParts.push(text);
                        markdownParts.push('\n\n</div>\n\n');
                    }
                } else if (output.output_type === 'error') {
                    markdownParts.push('<div class="notebook-error">\n\n```\n');
                    markdownParts.push((output.traceback || []).join('\n'));
                    markdownParts.push('\n```\n\n</div>\n\n');
                }
            }
        }
    }

    // Apply \textcolor to \color conversion for KaTeX compatibility
    let markdown = convertTextcolorToColor(markdownParts.join(''));

    // Normalize display math blocks for remark-math compatibility
    // Ensure $$ is on its own line, separate from \begin{} and \end{}
    markdown = normalizeDisplayMath(markdown);

    return {
        markdown: markdown,
        title: title,
        summary: firstMarkdownCell ? firstMarkdownCell.replace(/^#.*\n?/, '').trim().split('\n\n')[0] : null,
        metadata: notebook.metadata || {}
    };
}

function processNotebook(notebookPath) {
    const dir = path.dirname(notebookPath);
    const notebookName = path.basename(notebookPath, '.ipynb');

    console.log(`\n📓 Processing: ${notebookPath}`);

    try {
        const result = convertNotebookToMarkdown(notebookPath);

        // Write post.md
        const postPath = path.join(dir, 'post.md');
        fs.writeFileSync(postPath, result.markdown);
        console.log(`   ✓ Created: post.md`);

        // Write summary.md if doesn't exist
        const summaryPath = path.join(dir, 'summary.md');
        if (!fs.existsSync(summaryPath) && result.summary) {
            fs.writeFileSync(summaryPath, result.summary);
            console.log(`   ✓ Created: summary.md`);
        }

        // Write metadata.json if doesn't exist
        const metadataPath = path.join(dir, 'metadata.json');
        if (!fs.existsSync(metadataPath)) {
            const metadata = {
                title: result.title || notebookName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                date: new Date().toISOString().split('T')[0],
                slug: notebookName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
            };
            fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + '\n');
            console.log(`   ✓ Created: metadata.json`);
        }

        return true;
    } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        return false;
    }
}

function main() {
    console.log('🔍 Scanning for Jupyter notebooks...');

    if (!fs.existsSync(POSTS_DIR)) {
        console.error(`❌ Posts directory not found: ${POSTS_DIR}`);
        process.exit(1);
    }

    const notebooks = findNotebooks(POSTS_DIR);

    if (notebooks.length === 0) {
        console.log('\nNo Jupyter notebooks found in posts directory.');
        return;
    }

    console.log(`Found ${notebooks.length} notebook(s)`);

    let success = 0;
    let failed = 0;

    for (const notebook of notebooks) {
        if (processNotebook(notebook)) {
            success++;
        } else {
            failed++;
        }
    }

    console.log(`\n✅ Conversion complete!`);
    console.log(`   Success: ${success}`);
    if (failed > 0) {
        console.log(`   Failed: ${failed}`);
    }
    console.log(`\n💡 Run 'npm run generate-posts' to update posts.json`);
}

main();
