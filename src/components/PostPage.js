import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import '../styles/PostPage.css';
import {createMarkdownComponents} from '../utils/markdown';
import LikeButton from './LikeButton';

const manifestPath = `${process.env.PUBLIC_URL || ''}/posts/posts.json`;

function PostPage() {
    const {slug} = useParams();
    const navigate = useNavigate();
    const [post, setPost] = useState(null);
    const [content, setContent] = useState('');
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [scrollProgress, setScrollProgress] = useState(0);

    const handleScroll = useCallback(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        setScrollProgress(progress);
    }, []);

    useEffect(() => {
        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Calculate initial progress
        return () => window.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    useEffect(() => {
        const loadPost = async () => {
            try {
                const response = await fetch(manifestPath);
                if (!response.ok) {
                    throw new Error('Unable to load posts manifest');
                }
                const manifest = await response.json();
                const match = manifest.find((item) => item.slug === slug);

                if (!match) {
                    setError('Post not found.');
                    return;
                }

                setPost(match);

                const baseUrl = process.env.PUBLIC_URL || '';
                const contentResponse = await fetch(`${baseUrl}/posts/${match.folder}/post.md`);
                if (!contentResponse.ok) {
                    throw new Error('Unable to load post content');
                }
                setContent(await contentResponse.text());
            } catch (err) {
                console.error(err);
                setError('We could not load this post right now.');
            } finally {
                setIsLoading(false);
            }
        };

        loadPost();
    }, [slug]);

    const markdownComponents = useMemo(
        () => createMarkdownComponents(post ? `${process.env.PUBLIC_URL || ''}/posts/${post.folder}/` : ''),
        [post]
    );

    if (isLoading) {
        return <section className="post-page"><p>Loading post…</p></section>;
    }

    if (error) {
        return (
            <section className="post-page">
                <p>{error}</p>
                <button type="button" onClick={() => navigate('/posts')}>
                    Back to posts
                </button>
            </section>
        );
    }

    return (
        <section className="post-page">
            <div className="post-page__progress-track" />
            <div className="post-page__progress-bar" style={{ width: `${scrollProgress}%` }} />
            <div className="post-page__panel">
                <div className="post-page__back-wrapper">
                    <button type="button" className="post-page__back" onClick={() => navigate('/posts')}>
                        ← Back to posts
                    </button>
                </div>
                <header>
                    <p className="post-page__date">
                        {new Date(post.date).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </p>
                    <h1>{post.title}</h1>
                </header>
                <article>
                    <ReactMarkdown
                        components={markdownComponents}
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[[rehypeKatex, {trust: true}], rehypeRaw]}
                    >
                        {content}
                    </ReactMarkdown>
                </article>
                <div className="post-page__footer">
                    <div className="post-page__like">
                        <LikeButton type="post" itemId={post.slug} />
                    </div>
                    <div className="post-page__back-wrapper">
                        <button type="button" className="post-page__back" onClick={() => navigate('/posts')}>
                            ← Back to posts
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default PostPage;
