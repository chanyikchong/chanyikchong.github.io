import { ref, get, set, runTransaction } from 'firebase/database';
import { database } from './firebase';

// Get a unique identifier for this user's browser
const getUserId = () => {
    let userId = localStorage.getItem('userId');
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9) + Date.now();
        localStorage.setItem('userId', userId);
    }
    return userId;
};

// Get like count for a specific item
export const getLikeCount = async (type, itemId) => {
    try {
        const likesRef = ref(database, `likes/${type}/${itemId}/count`);
        const snapshot = await get(likesRef);
        return snapshot.exists() ? snapshot.val() : 0;
    } catch (error) {
        console.error('Error getting like count:', error);
        return 0;
    }
};

// Check if current user has liked an item
export const hasUserLiked = async (type, itemId) => {
    try {
        const userId = getUserId();
        const userLikeRef = ref(database, `likes/${type}/${itemId}/users/${userId}`);
        const snapshot = await get(userLikeRef);
        return snapshot.exists() && snapshot.val() === true;
    } catch (error) {
        console.error('Error checking user like:', error);
        return false;
    }
};

// Toggle like for an item
export const toggleLike = async (type, itemId) => {
    try {
        const userId = getUserId();
        const userLikeRef = ref(database, `likes/${type}/${itemId}/users/${userId}`);
        const countRef = ref(database, `likes/${type}/${itemId}/count`);

        // Check if user has already liked
        const hasLiked = await hasUserLiked(type, itemId);

        if (hasLiked) {
            // Unlike: remove user's like and decrement count
            await set(userLikeRef, null);
            await runTransaction(countRef, (currentCount) => {
                return (currentCount || 0) - 1;
            });
            return { liked: false, count: await getLikeCount(type, itemId) };
        } else {
            // Like: add user's like and increment count
            await set(userLikeRef, true);
            await runTransaction(countRef, (currentCount) => {
                return (currentCount || 0) + 1;
            });
            return { liked: true, count: await getLikeCount(type, itemId) };
        }
    } catch (error) {
        console.error('Error toggling like:', error);
        throw error;
    }
};

// Get all likes data for multiple items (for listing pages)
export const getLikesData = async (type, itemIds) => {
    try {
        const likesData = {};
        await Promise.all(
            itemIds.map(async (itemId) => {
                const count = await getLikeCount(type, itemId);
                const liked = await hasUserLiked(type, itemId);
                likesData[itemId] = { count, liked };
            })
        );
        return likesData;
    } catch (error) {
        console.error('Error getting likes data:', error);
        return {};
    }
};
