import React, {useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import {FaArrowRight, FaChevronRight, FaSearch, FaTimes} from 'react-icons/fa';
import '../styles/Posts.css';
import {createMarkdownComponents} from '../utils/markdown';
import LikeButton from './LikeButton';

const manifestPath = `${process.env.PUBLIC_URL || ''}/posts/posts.json`;

function Posts() {
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedTopics, setExpandedTopics] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const loadPosts = async () => {
            try {
                const response = await fetch(manifestPath);
                if (!response.ok) {
                    throw new Error('Unable to load posts manifest');
                }
                const manifest = await response.json();
                const baseUrl = process.env.PUBLIC_URL || '';

                const hydrated = await Promise.all(manifest.map(async (post) => {
                    const summaryResponse = await fetch(`${baseUrl}/posts/${post.folder}/summary.md`);
                    const summary = summaryResponse.ok ? await summaryResponse.text() : 'New post coming soon.';
                    return {
                        ...post,
                        summary: summary.trim()
                    };
                }));

                hydrated.sort((a, b) => new Date(b.date) - new Date(a.date));
                setPosts(hydrated);
            } catch (err) {
                console.error(err);
                setError('We could not load the post list right now.');
            } finally {
                setIsLoading(false);
            }
        };

        loadPosts();
    }, []);

    const markdownComponents = useMemo(() => createMarkdownComponents(), []);

    const openPost = (slug) => {
        navigate(`/posts/${slug}`);
    };

    // Filter posts based on search term
    const filteredPosts = useMemo(() => {
        if (!searchTerm.trim()) return posts;
        const term = searchTerm.toLowerCase();
        return posts.filter(post =>
            post.title.toLowerCase().includes(term) ||
            post.summary.toLowerCase().includes(term) ||
            (post.topic || '').toLowerCase().includes(term)
        );
    }, [posts, searchTerm]);

    // Get latest 3 posts from filtered results
    const latestPosts = filteredPosts.slice(0, 3);

    // Group filtered posts by topic
    const postsByTopic = useMemo(() => {
        const grouped = {};
        filteredPosts.forEach(post => {
            const topic = post.topic || 'Uncategorized';
            if (!grouped[topic]) {
                grouped[topic] = [];
            }
            grouped[topic].push(post);
        });
        return grouped;
    }, [filteredPosts]);

    const toggleTopic = (topic) => {
        setExpandedTopics(prev => ({
            ...prev,
            [topic]: !prev[topic]
        }));
    };

    const renderPostCard = (post) => (
        <article key={post.id} className="post-card">
            <button type="button" onClick={(e) => {
                if (e.target.closest('.like-button')) return;
                openPost(post.slug);
            }}>
                <div className="post-card__meta">
                    <time dateTime={post.date}>
                        {new Date(post.date).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                        })}
                    </time>
                </div>
                <h3>{post.title}</h3>
                <ReactMarkdown
                    className="post-card__summary"
                    components={markdownComponents}
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[[rehypeKatex, {trust: true}], rehypeRaw]}
                >
                    {post.summary}
                </ReactMarkdown>
                <div className="post-card__footer">
                    <LikeButton type="post" itemId={post.slug} />
                    <span className="post-card__cta">
                        View post <FaArrowRight aria-hidden="true" />
                    </span>
                </div>
            </button>
        </article>
    );

    return (
        <section id="posts" className="posts">
            <header className="posts__header">
                <h2>Thinking Log</h2>
                <p>Notes, experiments, and field learnings captured along the way.</p>
                <div className="posts__search">
                    <FaSearch className="posts__search-icon" aria-hidden="true" />
                    <input
                        type="text"
                        className="posts__search-input"
                        placeholder="Search posts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        aria-label="Search posts"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            className="posts__search-clear"
                            onClick={() => setSearchTerm('')}
                            aria-label="Clear search"
                        >
                            <FaTimes aria-hidden="true" />
                        </button>
                    )}
                </div>
                {searchTerm && (
                    <p className="posts__search-results">
                        {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'} found
                    </p>
                )}
            </header>
            {isLoading && <p>Loading posts…</p>}
            {error && !isLoading && <p>{error}</p>}
            {!isLoading && !error && (
                <>
                    {filteredPosts.length === 0 ? (
                        <div className="posts__no-results">
                            <p>No posts found matching "{searchTerm}"</p>
                        </div>
                    ) : (
                        <>
                            {/* Latest Posts Section */}
                            <div className="posts__latest">
                                <h3 className="posts__section-title">
                                    {searchTerm ? 'Matching Posts' : 'Latest Posts'}
                                </h3>
                                <div className="posts-grid">
                                    {latestPosts.map(renderPostCard)}
                                </div>
                            </div>

                            {/* Topics Table of Contents - only show when not searching */}
                            {!searchTerm && (
                                <div className="posts__toc">
                                    <h3 className="posts__section-title">Browse by Topic</h3>
                                    <div className="posts__topics">
                                        {Object.entries(postsByTopic).map(([topic, topicPosts]) => (
                                            <div key={topic} className="posts__topic">
                                                <button
                                                    type="button"
                                                    className="posts__topic-header"
                                                    onClick={() => toggleTopic(topic)}
                                                    aria-expanded={expandedTopics[topic] || false}
                                                >
                                                    <span className="posts__topic-icon">
                                                        <FaChevronRight aria-hidden="true" />
                                                    </span>
                                                    <span className="posts__topic-name">{topic}</span>
                                                    <span className="posts__topic-count">
                                                        {topicPosts.length} {topicPosts.length === 1 ? 'post' : 'posts'}
                                                    </span>
                                                </button>
                                                <div className={`posts__topic-content ${expandedTopics[topic] ? 'expanded' : ''}`}>
                                                    <div className="posts__topic-posts">
                                                        <div className="posts-grid">
                                                            {topicPosts.map(renderPostCard)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </section>
    );
}

export default Posts;
