import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const absoluteUrlRegex = /^(?:[a-z][a-z0-9+.-]*:|\/\/|data:|blob:)/i;

export const resolveMarkdownAsset = (src = '', basePath = '') => {
    if (!src) {
        return src;
    }

    if (absoluteUrlRegex.test(src) || src.startsWith('/')) {
        return src;
    }

    const publicUrl = process.env.PUBLIC_URL || '';
    const normalizedBase = basePath.startsWith(publicUrl)
        ? basePath
        : `${publicUrl}${basePath}`;

    const origin = normalizedBase.startsWith('http')
        ? normalizedBase
        : (typeof window !== 'undefined'
            ? `${window.location.origin}${normalizedBase}`
            : normalizedBase);

    if (!origin.startsWith('http')) {
        return `${normalizedBase}${src.replace(/^\.\//, '')}`;
    }

    try {
        return new URL(src, origin).toString();
    } catch (error) {
        console.error('Unable to resolve markdown asset', error);
        return `${normalizedBase}${src.replace(/^\.\//, '')}`;
    }
};

export const createMarkdownComponents = (basePath = '') => ({
    img: ({ src, alt, ...props }) => (
        <img src={resolveMarkdownAsset(src, basePath)} alt={alt} {...props} />
    ),
    a: ({ node, children, ...props }) => (
        <a {...props} target="_blank" rel="noreferrer noopener">
            {children}
        </a>
    ),
    code: ({ node, inline, className, children, ...props }) => {
        const match = /language-(\w+)/.exec(className || '');
        const language = match ? match[1] : '';

        if (!inline && language) {
            return (
                <SyntaxHighlighter
                    style={oneDark}
                    language={language}
                    PreTag="div"
                    customStyle={{
                        margin: 0,
                        borderRadius: '12px',
                        fontSize: '0.9em',
                    }}
                    {...props}
                >
                    {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
            );
        }

        return (
            <code className={className} {...props}>
                {children}
            </code>
        );
    }
});
