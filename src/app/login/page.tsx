'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, LogIn, User, Mail, Lock, Users, Crown, Shield } from 'lucide-react';

// Sample users for demonstration
const sampleUsers = [
    {
        email: 'admin@example.com',
        password: 'admin123',
        name: 'Admin User',
        role: 'admin' as const,
        icon: Crown,
        description: 'Full system access, can manage all programs and users'
    },
    {
        email: 'creator@example.com',
        password: 'creator123',
        name: 'Content Creator',
        role: 'creator' as const,
        icon: User,
        description: 'Can create and edit programs, generate content'
    },
    {
        email: 'viewer@example.com',
        password: 'viewer123',
        name: 'Content Viewer',
        role: 'viewer' as const,
        icon: Shield,
        description: 'Can view programs and generated content (read-only)'
    }
];

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Login failed');
            }

            const responseData = await response.json();

            // Store only the user data in localStorage (in a real app, use proper session management)
            if (responseData.success && responseData.user) {
                localStorage.setItem('user', JSON.stringify(responseData.user));

                // Redirect to programs page
                router.push('/programs');
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error('Login error:', error);
            setError(error instanceof Error ? error.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleQuickLogin = (user: typeof sampleUsers[0]) => {
        setEmail(user.email);
        setPassword(user.password);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
                {/* Left Side - Sample Users */}
                <div className="space-y-6">
                    <div className="text-center lg:text-left">
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">
                            Welcome Back! 👋
                        </h1>
                        <p className="text-lg text-gray-600 mb-8">
                            Choose a sample user to test the system
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                            <Users className="h-5 w-5 mr-2" />
                            Sample User Accounts
                        </h2>

                        {sampleUsers.map((user, index) => {
                            const IconComponent = user.icon;
                            return (
                                <Card
                                    key={index}
                                    className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-300"
                                    onClick={() => handleQuickLogin(user)}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start space-x-4">
                                            <div className={`p-3 rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-600' :
                                                user.role === 'creator' ? 'bg-blue-100 text-blue-600' :
                                                    'bg-green-100 text-green-600'
                                                }`}>
                                                <IconComponent className="h-6 w-6" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h3 className="font-semibold text-gray-900">{user.name}</h3>
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                                        user.role === 'creator' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-green-100 text-green-800'
                                                        }`}>
                                                        {user.role.toUpperCase()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 mb-2">{user.description}</p>
                                                <div className="space-y-1">
                                                    <div className="flex items-center text-xs text-gray-500">
                                                        <Mail className="h-3 w-3 mr-1" />
                                                        {user.email}
                                                    </div>
                                                    <div className="flex items-center text-xs text-gray-500">
                                                        <Lock className="h-3 w-3 mr-1" />
                                                        {user.password}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                            💡 <strong>Tip:</strong> Click on any user card above to auto-fill the login form,
                            or manually enter the credentials in the form on the right.
                        </p>
                    </div>
                </div>

                {/* Right Side - Login Form */}
                <div className="flex justify-center lg:justify-end">
                    <Card className="w-full max-w-md shadow-xl border-0">
                        <CardHeader className="text-center pb-6">
                            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                                <LogIn className="h-8 w-8 text-white" />
                            </div>
                            <CardTitle className="text-2xl font-bold text-gray-900">
                                Sign In
                            </CardTitle>
                            <CardDescription className="text-gray-600">
                                Enter your credentials to access the system
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            {error && (
                                <Alert className="border-red-200 bg-red-50">
                                    <AlertDescription className="text-red-800">
                                        {error}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                                        Email Address
                                    </Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="Enter your email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="pl-10"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                                        Password
                                    </Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Enter your password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="pl-10 pr-10"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <div className="flex items-center">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Signing In...
                                        </div>
                                    ) : (
                                        <div className="flex items-center">
                                            <LogIn className="h-4 w-4 mr-2" />
                                            Sign In
                                        </div>
                                    )}
                                </Button>
                            </form>

                            <div className="text-center pt-4 border-t border-gray-200">
                                <p className="text-sm text-gray-600">
                                    Demo System • No Real Authentication Required
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
