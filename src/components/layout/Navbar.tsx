'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { User } from '@/lib/auth';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    BookOpen,
    Plus,
    Settings,
    User,
    Sparkles,
    Home,
    LogOut,
    LogIn,
    Crown,
    Shield
} from 'lucide-react';

const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Programs', href: '/programs', icon: BookOpen },
    { name: 'Create Program', href: '/programs/create', icon: Plus },
    // { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        // Check if user is logged in
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                setUser(JSON.parse(userData));
            } catch (error) {
                console.error('Invalid user data in localStorage:', error);
                // Clear invalid data
                localStorage.removeItem('user');
                setUser(null);
            }
        }
    }, []);

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            localStorage.removeItem('user');
            setUser(null);
            router.push('/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'admin': return Crown;
            case 'creator': return User;
            case 'viewer': return Shield;
            default: return User;
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'admin': return 'text-purple-600 bg-purple-100';
            case 'creator': return 'text-blue-600 bg-blue-100';
            case 'viewer': return 'text-green-600 bg-green-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    return (
        <nav className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <Link href="/" className="flex items-center space-x-2">
                                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                                    <Sparkles className="h-6 w-6 text-white" />
                                </div>
                                <span className="text-xl font-bold text-gray-900">
                                    ContentAI
                                </span>
                            </Link>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            {navigation.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive
                                            ? 'border-blue-500 text-gray-900'
                                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                            }`}
                                    >
                                        <Icon className="h-4 w-4 mr-2" />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                    <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
                        {user ? (
                            <>
                                {/* User Info */}
                                <div className="flex items-center space-x-3">
                                    <div className={`p-2 rounded-full ${getRoleColor(user.role)}`}>
                                        {(() => {
                                            const RoleIcon = getRoleIcon(user.role);
                                            return <RoleIcon className="h-4 w-4" />;
                                        })()}
                                    </div>
                                    <div className="text-sm">
                                        <p className="font-medium text-gray-900">{user.name}</p>
                                        <p className="text-gray-500 capitalize">{user.role}</p>
                                    </div>
                                </div>

                                {/* Logout Button */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleLogout}
                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Logout
                                </Button>
                            </>
                        ) : (
                            <Link href="/login">
                                <Button variant="outline" size="sm">
                                    <LogIn className="h-4 w-4 mr-2" />
                                    Login
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
