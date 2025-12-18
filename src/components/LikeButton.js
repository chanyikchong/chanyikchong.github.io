import React, { useState, useEffect } from 'react';
import { toggleLike, getLikeCount, hasUserLiked } from '../utils/likesService';
import '../styles/LikeButton.css';

const LikeButton = ({ type, itemId, showCount = true }) => {
    const [liked, setLiked] = useState(false);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        const loadLikeData = async () => {
            try {
                const [likeCount, userLiked] = await Promise.all([
                    getLikeCount(type, itemId),
                    hasUserLiked(type, itemId)
                ]);
                setCount(likeCount);
                setLiked(userLiked);
            } catch (error) {
                console.error('Error loading like data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadLikeData();
    }, [type, itemId]);

    const handleLike = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (loading) return;

        // Optimistic update
        const newLiked = !liked;
        const newCount = newLiked ? count + 1 : count - 1;
        setLiked(newLiked);
        setCount(newCount);
        setAnimating(true);

        try {
            const result = await toggleLike(type, itemId);
            // Update with actual values from server
            setLiked(result.liked);
            setCount(result.count);
        } catch (error) {
            // Revert on error
            setLiked(!newLiked);
            setCount(count);
            console.error('Error toggling like:', error);
        }

        setTimeout(() => setAnimating(false), 300);
    };

    return (
        <div
            className={`like-button ${liked ? 'liked' : ''} ${animating ? 'animating' : ''} ${loading ? 'disabled' : ''}`}
            onClick={loading ? undefined : handleLike}
            role="button"
            tabIndex={loading ? -1 : 0}
            aria-label={liked ? 'Unlike' : 'Like'}
            aria-disabled={loading}
            onKeyDown={(e) => {
                if (!loading && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleLike(e);
                }
            }}
        >
            <span className="like-icon">{liked ? '👍' : '🤜'}</span>
            {showCount && <span className="like-count">{count}</span>}
        </div>
    );
};

export default LikeButton;
