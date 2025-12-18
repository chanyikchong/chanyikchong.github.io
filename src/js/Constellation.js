const DEFAULTS = {
    pointCount: 80,
    maxVelocity: 0.25,
    linkDistance: 150
};

const DIAGONAL_PAIRS = [
    [0, 2],
    [1, 3],
    [2, 4],
    [3, 5],
    [4, 0],
    [5, 1]
];

const HEX_EDGES = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 0]
];

const randomRange = (min, max) => Math.random() * (max - min) + min;

const resolveColor = (variableName, fallback) => {
    if (typeof window === 'undefined') {
        return fallback;
    }

    const styles = getComputedStyle(document.documentElement);
    const value = styles.getPropertyValue(variableName);
    return value ? value.trim() : fallback;
};

const createNode = (width, height, config) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: randomRange(-config.maxVelocity, config.maxVelocity),
    vy: randomRange(-config.maxVelocity, config.maxVelocity),
    radius: randomRange(1.2, 2.4),
    phase: Math.random() * Math.PI * 2,
    flickerSpeed: randomRange(0.003, 0.008)
});

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const createHexagon = (centerX, centerY, radius, width, height, startTime) => {
    const margin = 40;
    const safeRadius = Math.min(
        radius,
        Math.max(20, centerX - margin),
        Math.max(20, width - centerX - margin),
        Math.max(20, centerY - margin),
        Math.max(20, height - centerY - margin)
    );
    const clampedRadius = clamp(safeRadius, 50, 160);
    const clampedX = clamp(centerX, clampedRadius + margin, width - clampedRadius - margin);
    const clampedY = clamp(centerY, clampedRadius + margin, height - clampedRadius - margin);
    const rotation = Math.random() * Math.PI;
    const points = Array.from({length: 6}, (_, i) => {
        const angle = rotation + (i * Math.PI) / 3;
        return {
            x: clampedX + clampedRadius * Math.cos(angle),
            y: clampedY + clampedRadius * Math.sin(angle)
        };
    });

    return {
        points,
        start: startTime,
        duration: randomRange(2800, 4800)
    };
};

const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

const clusterSpan = (indices, nodes) => {
    if (!indices || indices.length < 6) {
        return Infinity;
    }

    let span = 0;
    for (let i = 0; i < indices.length; i++) {
        for (let j = i + 1; j < indices.length; j++) {
            const nodeA = nodes[indices[i]];
            const nodeB = nodes[indices[j]];
            if (!nodeA || !nodeB) {
                continue;
            }
            const dx = nodeA.x - nodeB.x;
            const dy = nodeA.y - nodeB.y;
            const distance = Math.hypot(dx, dy);
            span = Math.max(span, distance);
        }
    }
    return span;
};

const findClosestCluster = (nodes) => {
    if (nodes.length < 6) {
        return null;
    }

    let best = null;
    for (let i = 0; i < nodes.length; i++) {
        const distances = [];
        for (let j = 0; j < nodes.length; j++) {
            if (i === j) {
                continue;
            }
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            distances.push({index: j, distance: Math.hypot(dx, dy)});
        }

        distances.sort((a, b) => a.distance - b.distance);
        const candidate = [i, ...distances.slice(0, 5).map((entry) => entry.index)];
        const span = clusterSpan(candidate, nodes);

        if (!best || span < best.span) {
            best = {indices: candidate, span};
        }
    }

    return best ? best.indices : null;
};

const drawNodes = (ctx, nodes, color) => {
    ctx.fillStyle = color;
    nodes.forEach((node) => {
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    });
};

const drawConnections = (ctx, nodes, color, timestamp, linkDistance) => {
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const source = nodes[i];
            const target = nodes[j];
            const dx = source.x - target.x;
            const dy = source.y - target.y;
            const distance = Math.hypot(dx, dy);

            if (distance >= linkDistance) {
                continue;
            }

            const intensity = 1 - distance / linkDistance;
            const flicker = (Math.sin(timestamp * 0.001 + source.phase + target.phase) + 1) / 2;

            if (flicker <= 0.55) {
                continue;
            }

            const alpha = intensity * ((flicker - 0.55) / 0.45);
            ctx.strokeStyle = color;
            ctx.globalAlpha = alpha * 0.85;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(source.x, source.y);
            ctx.lineTo(target.x, target.y);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }
};

const drawHexagon = (ctx, hexagon, nodes, color, timestamp) => {
    const progress = (timestamp - hexagon.start) / hexagon.duration;
    if (progress >= 1) {
        return false;
    }

    let alpha = 1;
    if (progress < 0.2) {
        alpha = progress / 0.2;
    } else if (progress > 0.8) {
        alpha = (1 - progress) / 0.2;
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.85 * alpha;
    const nodePositions = hexagon.nodeIndices.map((index) => nodes[index]);

    HEX_EDGES.forEach(([startIndex, endIndex]) => {
        const from = nodePositions[startIndex];
        const to = nodePositions[endIndex];
        if (!from || !to) {
            return;
        }
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
    });

    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5 * alpha;
    DIAGONAL_PAIRS.forEach(([startIndex, endIndex]) => {
        const from = nodePositions[startIndex];
        const to = nodePositions[endIndex];
        if (!from || !to) {
            return;
        }
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
    });

    ctx.globalAlpha = 1;
    return true;
};

const assignHexagon = (nodes, width, height, timestamp) => {
    if (nodes.length < 6) {
        return null;
    }

    const selectedIndices = findClosestCluster(nodes);
    if (!selectedIndices) {
        return null;
    }

    const centroid = selectedIndices.reduce(
        (sum, nodeIndex) => {
            const node = nodes[nodeIndex];
            sum.x += node.x;
            sum.y += node.y;
            return sum;
        },
        {x: 0, y: 0}
    );

    centroid.x /= selectedIndices.length;
    centroid.y /= selectedIndices.length;

    const averageDistance =
        selectedIndices.reduce((acc, idx) => {
            const node = nodes[idx];
            const dx = node.x - centroid.x;
            const dy = node.y - centroid.y;
            return acc + Math.hypot(dx, dy);
        }, 0) / selectedIndices.length;

    const hexagon = createHexagon(
        centroid.x,
        centroid.y,
        clamp(averageDistance * 1.3 || 80, 60, 140),
        width,
        height,
        timestamp
    );

    selectedIndices.forEach((nodeIndex, pointIdx) => {
        const node = nodes[nodeIndex];
        node.hexMeta = {
            start: hexagon.start,
            duration: hexagon.duration,
            originX: node.x,
            originY: node.y,
            targetX: hexagon.points[pointIdx].x,
            targetY: hexagon.points[pointIdx].y
        };
    });

    return {
        ...hexagon,
        nodeIndices: selectedIndices
    };
};

const updateNodes = (nodes, width, height, timestamp) => {
    nodes.forEach((node) => {
        if (node.hexMeta) {
            const {start, duration, originX, originY, targetX, targetY} = node.hexMeta;
            const progress = (timestamp - start) / duration;

            if (progress >= 1) {
                node.hexMeta = null;
            } else if (progress < 0.35) {
                const eased = easeInOutQuad(progress / 0.35);
                node.x = originX + (targetX - originX) * eased;
                node.y = originY + (targetY - originY) * eased;
                return;
            } else if (progress < 0.65) {
                node.x = targetX;
                node.y = targetY;
                return;
            } else {
                node.hexMeta = null;
            }
        }

        node.x += node.vx;
        node.y += node.vy;
        node.phase += node.flickerSpeed;

        if (node.x <= 0 || node.x >= width) {
            node.vx *= -1;
        }

        if (node.y <= 0 || node.y >= height) {
            node.vy *= -1;
        }

        node.x = Math.min(Math.max(node.x, 0), width);
        node.y = Math.min(Math.max(node.y, 0), height);
    });
};

export function createConstellation(container, options = {}) {
    if (typeof document === 'undefined' || !container) {
        return () => {};
    }

    const config = {...DEFAULTS, ...options};
    const canvas = document.createElement('canvas');
    canvas.className = 'constellation-canvas';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const pointColor = resolveColor('--muted-text-color', '#94a3b8');
    const connectionColor = resolveColor('--accent-color', '#7c3aed');

    const resizeCanvas = () => {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const nodes = Array.from({length: config.pointCount}, () =>
        createNode(canvas.width, canvas.height, config)
    );

    let animationFrameId;
    let hexagon = null;
    let nextHexTime = performance.now() + randomRange(4000, 9000);

    const render = (timestamp) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        updateNodes(nodes, canvas.width, canvas.height, timestamp);
        drawConnections(ctx, nodes, connectionColor, timestamp, config.linkDistance);
        drawNodes(ctx, nodes, pointColor);

        if (!hexagon && timestamp >= nextHexTime) {
            hexagon = assignHexagon(nodes, canvas.width, canvas.height, timestamp);
        }

        if (hexagon) {
            const stillVisible = drawHexagon(ctx, hexagon, nodes, connectionColor, timestamp);
            if (!stillVisible) {
                hexagon = null;
                nextHexTime = timestamp + randomRange(3500, 8000);
            }
        }

        animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', resizeCanvas);
        canvas.remove();
    };
}
