export function createStars(numStars = 100) {
    const starContainer = document.querySelector('.star-field');
    const stars = [];

    // Create stars and append them to the DOM
    for (let i = 0; i < numStars; i++) {
        const star = document.createElement('div');
        star.classList.add('star');

        // Randomize the floating direction and distance for each star
        const randomX = Math.random() * 20 - 20; // Random movement between -10px and 10px on the X-axis
        const randomY = Math.random() * 20 - 20; // Random movement between -10px and 10px on the Y-axis
        star.style.setProperty('--random-x', `${randomX}px`);
        star.style.setProperty('--random-y', `${randomY}px`);

        // Random float duration for each star
        const randomFloatDuration = Math.random() * 5 + 3; // Random float duration between 3s and 8s
        star.style.setProperty('--float-duration', `${randomFloatDuration}s`);

        // Set a random size for each star
        const randomSize = Math.random() * 3 + 1; // Random size between 1px and 4px
        star.style.width = `${randomSize}px`;
        star.style.height = `${randomSize}px`;

        // Set a random twinkle duration for each star
        const randomTwinkleDuration = Math.random() * 3 + 2; // Random twinkle duration between 2s and 5s
        star.style.setProperty('--twinkle-duration', `${randomTwinkleDuration}s`);

        // Set the initial position of each star
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;

        // Append the star to the container
        starContainer.appendChild(star);
        stars.push(star);
    }

    return stars;
}

export function handleMouseMove(stars) {
    return function (e) {
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        stars.forEach((star) => {
            const starRect = star.getBoundingClientRect();
            const parentRect = star.parentElement.getBoundingClientRect(); // Get parent container's position
            const starX = starRect.left + starRect.width / 2;
            const starY = starRect.top + starRect.height / 2;

            const dx = starX - mouseX;
            const dy = starY - mouseY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 100) { // Adjust the distance threshold for interaction
                const angle = Math.atan2(dy, dx);
                const moveX = Math.cos(angle) * 30; // The distance to push the star away
                const moveY = Math.sin(angle) * 30;

                // Set the new top and left values relative to the parent container
                const newLeft = starRect.left - parentRect.left + moveX;
                const newTop = starRect.top - parentRect.top + moveY;

                star.style.left = `${newLeft}px`;
                star.style.top = `${newTop}px`;

                // Stop floating animation during interaction
                // star.style.animation = 'none'; // Disable animation when interacting

            } else {
                // Reset the star's position if not near the mouse
                star.style.animation = ''; // Resume floating and twinkling animation when no interaction
            }
        });
    };
}
