import jwt from 'jsonwebtoken';

export interface User {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'creator' | 'viewer';
    preferences: {
        defaultLanguage: string;
        preferredLanguages: string[];
    };
}

export function verifyToken(token: string): User | null {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'demo-secret') as any;
        return decoded;
    } catch (error) {
        return null;
    }
}

export function getUser(): User | null {
    if (typeof window === 'undefined') return null;
    
    try {
        const userData = localStorage.getItem('user');
        if (!userData) return null;
        
        const parsedUser = JSON.parse(userData);
        
        // Validate the parsed user object has required fields
        if (!parsedUser || !parsedUser.email || !parsedUser.role) {
            console.warn('Invalid user data structure, clearing localStorage');
            localStorage.removeItem('user');
            return null;
        }
        
        return parsedUser;
    } catch (error) {
        console.error('Error parsing user data from localStorage:', error);
        // Clear invalid data
        localStorage.removeItem('user');
        return null;
    }
}

export function isAuthenticated(): boolean {
    return getUser() !== null;
}

export function hasRole(requiredRole: string | string[]): boolean {
    const user = getUser();
    if (!user) return false;

    if (Array.isArray(requiredRole)) {
        return requiredRole.includes(user.role);
    }

    return user.role === requiredRole;
}

// Role hierarchy: admin > creator > viewer
export function hasMinimumRole(minimumRole: 'viewer' | 'creator' | 'admin'): boolean {
    const user = getUser();
    if (!user) return false;

    const roleHierarchy = {
        'viewer': 1,
        'creator': 2,
        'admin': 3
    };

    const userLevel = roleHierarchy[user.role] || 0;
    const requiredLevel = roleHierarchy[minimumRole] || 0;

    return userLevel >= requiredLevel;
}
