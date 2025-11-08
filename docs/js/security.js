/**
 * Security utilities for web UI
 * Provides XSS protection, input sanitization, and safe DOM manipulation
 */

const Security = {
    /**
     * Escape HTML to prevent XSS attacks
     * @param {string} unsafe - Unsafe HTML string
     * @returns {string} Escaped HTML string
     */
    escapeHtml(unsafe) {
        const div = document.createElement('div');
        div.textContent = unsafe;
        return div.innerHTML;
    },

    /**
     * Sanitize user input to remove potentially dangerous characters
     * @param {string} input - User input
     * @returns {string} Sanitized input
     */
    sanitizeInput(input) {
        if (typeof input !== 'string') {
            return '';
        }

        // Remove null bytes, control characters
        return input
            .replace(/\0/g, '')
            .replace(/[\x00-\x1F\x7F]/g, '')
            .trim();
    },

    /**
     * Validate project name (alphanumeric with hyphens, DNS-compliant)
     * Matches backend validation in scripts/security/validator.py
     * @param {string} name - Project name
     * @returns {boolean} True if valid
     */
    validateProjectName(name) {
        const pattern = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
        const reservedNames = ['tmp', 'temp', 'admin', 'root', 'default'];

        return pattern.test(name) &&
               name.length <= 63 &&
               !reservedNames.includes(name.toLowerCase());
    },

    /**
     * Validate AWS Account ID (12 digits)
     * Matches backend validation in scripts/security/validator.py
     * @param {string} accountId - AWS Account ID
     * @returns {boolean} True if valid
     */
    validateAwsAccountId(accountId) {
        const pattern = /^\d{12}$/;
        return pattern.test(accountId) &&
               accountId !== '000000000000' &&
               accountId !== '123456789012';
    },

    /**
     * Validate AWS Region
     * Matches backend validation in scripts/security/validator.py
     * @param {string} region - AWS Region
     * @returns {boolean} True if valid
     */
    validateAwsRegion(region) {
        const allowedRegions = [
            'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
            'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1',
            'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1',
            'ca-central-1', 'sa-east-1'
        ];
        return allowedRegions.includes(region);
    },

    /**
     * Validate CIDR notation (e.g., "10.0.0.0/16")
     * @param {string} cidr - CIDR block to validate
     * @returns {boolean} True if valid CIDR notation
     */
    validateCIDR(cidr) {
        if (!cidr || typeof cidr !== 'string') {
            return false;
        }

        // CIDR pattern: IP address + /prefix
        const cidrPattern = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
        if (!cidrPattern.test(cidr)) {
            return false;
        }

        const [ip, prefix] = cidr.split('/');
        const prefixNum = parseInt(prefix, 10);

        // Validate prefix length (0-32 for IPv4)
        if (prefixNum < 0 || prefixNum > 32) {
            return false;
        }

        // Validate each octet in IP address
        const octets = ip.split('.');
        for (const octet of octets) {
            const num = parseInt(octet, 10);
            if (num < 0 || num > 255) {
                return false;
            }
        }

        // Common VPC CIDR ranges: /16, /20, /24
        // Allow /8 to /28 for flexibility
        if (prefixNum < 8 || prefixNum > 28) {
            return false;
        }

        return true;
    },

    /**
     * Create safe HTML element with text content
     * @param {string} tagName - HTML tag name
     * @param {string} textContent - Text content (will be escaped)
     * @param {Object} attributes - Element attributes
     * @returns {HTMLElement} Created element
     */
    createSafeElement(tagName, textContent = '', attributes = {}) {
        const element = document.createElement(tagName);

        // Set text content (automatically escaped)
        if (textContent) {
            element.textContent = textContent;
        }

        // Set attributes safely
        for (const [key, value] of Object.entries(attributes)) {
            // Prevent javascript: URLs and other dangerous attributes
            if (key.toLowerCase() === 'href' || key.toLowerCase() === 'src') {
                if (this.isValidUrl(value)) {
                    element.setAttribute(key, value);
                }
            } else if (!key.toLowerCase().startsWith('on')) {
                // Prevent event handler attributes
                element.setAttribute(key, value);
            }
        }

        return element;
    },

    /**
     * Validate URL to prevent javascript: and data: URLs
     * @param {string} url - URL to validate
     * @returns {boolean} True if valid
     */
    isValidUrl(url) {
        if (!url) return false;

        const lower = url.toLowerCase().trim();

        // Block javascript:, data:, vbscript:, etc.
        const dangerous = ['javascript:', 'data:', 'vbscript:', 'file:'];
        if (dangerous.some(prefix => lower.startsWith(prefix))) {
            return false;
        }

        // Allow http(s), relative URLs, and anchors
        return lower.startsWith('http://') ||
               lower.startsWith('https://') ||
               lower.startsWith('/') ||
               lower.startsWith('#');
    },

    /**
     * Safely set innerHTML with sanitization
     * Only allows specific safe tags and strips dangerous content
     * @param {HTMLElement} element - Target element
     * @param {string} html - HTML content to set
     * @returns {void}
     */
    setSafeInnerHTML(element, html) {
        // Create a template to parse HTML
        const template = document.createElement('template');
        template.innerHTML = html;

        // Clone and sanitize
        const sanitized = this.sanitizeNode(template.content);

        // Clear and append
        element.innerHTML = '';
        element.appendChild(sanitized);
    },

    /**
     * Recursively sanitize a DOM node and its children
     * @param {Node} node - Node to sanitize
     * @returns {Node} Sanitized node
     */
    sanitizeNode(node) {
        // Allowed tags
        const allowedTags = [
            'div', 'span', 'p', 'br', 'strong', 'em', 'b', 'i', 'u',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'a', 'code', 'pre', 'blockquote'
        ];

        // Allowed attributes
        const allowedAttributes = ['href', 'class', 'id', 'style'];

        const fragment = document.createDocumentFragment();

        for (const child of Array.from(node.childNodes)) {
            if (child.nodeType === Node.TEXT_NODE) {
                // Text nodes are safe
                fragment.appendChild(child.cloneNode());
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                const tagName = child.tagName.toLowerCase();

                if (allowedTags.includes(tagName)) {
                    const newElement = document.createElement(tagName);

                    // Copy allowed attributes
                    for (const attr of Array.from(child.attributes)) {
                        if (allowedAttributes.includes(attr.name.toLowerCase())) {
                            // Special validation for href
                            if (attr.name.toLowerCase() === 'href') {
                                if (this.isValidUrl(attr.value)) {
                                    newElement.setAttribute(attr.name, attr.value);
                                }
                            } else {
                                newElement.setAttribute(attr.name, attr.value);
                            }
                        }
                    }

                    // Recursively sanitize children
                    newElement.appendChild(this.sanitizeNode(child));
                    fragment.appendChild(newElement);
                } else {
                    // Strip disallowed tags but keep content
                    fragment.appendChild(this.sanitizeNode(child));
                }
            }
        }

        return fragment;
    },

    /**
     * Create a safe modal message with mixed content
     * @param {string} title - Modal title (will be escaped)
     * @param {string} message - Modal message (will be escaped)
     * @param {Array} buttons - Array of button configs {text, href, className}
     * @returns {HTMLElement} Modal content element
     */
    createSafeModalContent(title, message, buttons = []) {
        const container = document.createElement('div');

        // Add title
        const h3 = this.createSafeElement('h3', title);
        container.appendChild(h3);

        // Add message
        const p = this.createSafeElement('p', message);
        container.appendChild(p);

        // Add buttons
        buttons.forEach(button => {
            const a = this.createSafeElement('a', button.text, {
                href: button.href || '#',
                class: button.className || 'btn-primary',
                target: '_blank',
                style: 'display: inline-block; margin-top: 1rem; text-decoration: none;'
            });
            container.appendChild(a);
        });

        return container;
    },

    /**
     * Create safe configuration display
     * @param {Object} config - Configuration object
     * @returns {HTMLElement} Configuration display element
     */
    createSafeConfigDisplay(config) {
        const ul = document.createElement('ul');
        ul.style.textAlign = 'left';
        ul.style.margin = '1rem 0';

        for (const [key, value] of Object.entries(config)) {
            const li = document.createElement('li');

            // Create label
            const label = this.createSafeElement('span', `${key}: `);
            li.appendChild(label);

            // Create value in code tag
            const code = this.createSafeElement('code', String(value));
            li.appendChild(code);

            ul.appendChild(li);
        }

        return ul;
    },

    /**
     * Rate limiter for operations
     * Prevents abuse by limiting operations within a time window
     * @class RateLimiter
     */
    RateLimiter: class {
        /**
         * Initialize rate limiter
         * @constructor
         * @param {number} [maxOperations=10] - Maximum operations allowed in time window
         * @param {number} [timeWindow=60000] - Time window in milliseconds (default: 60 seconds)
         */
        constructor(maxOperations = 10, timeWindow = 60000) {
            this.maxOperations = maxOperations;
            this.timeWindow = timeWindow;
            this.operations = [];
        }

        /**
         * Check if operation can proceed and record it if allowed
         * Cleans up old operations outside the time window before checking
         * @returns {boolean} True if operation is allowed, false if rate limit exceeded
         */
        canProceed() {
            const now = Date.now();

            // Remove old operations
            this.operations = this.operations.filter(
                time => now - time < this.timeWindow
            );

            // Check limit
            if (this.operations.length >= this.maxOperations) {
                return false;
            }

            // Record operation
            this.operations.push(now);
            return true;
        }

        /**
         * Reset rate limiter by clearing all recorded operations
         * @returns {void}
         */
        reset() {
            this.operations = [];
        }
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Security;
}
