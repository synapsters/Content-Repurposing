'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

export default function LocalStorageDebugger() {
    const [userData, setUserData] = useState<string | null>(null);
    const [isValid, setIsValid] = useState<boolean | null>(null);
    const [parsedUser, setParsedUser] = useState<object | null>(null);

    const checkUserData = () => {
        try {
            const data = localStorage.getItem('user');
            setUserData(data);

            if (data) {
                const parsed = JSON.parse(data);
                setParsedUser(parsed);
                setIsValid(true);
            } else {
                setParsedUser(null);
                setIsValid(null);
            }
        } catch (error) {
            setIsValid(false);
            setParsedUser(null);
            console.error('LocalStorage parsing error:', error);
        }
    };

    const clearUserData = () => {
        localStorage.removeItem('user');
        setUserData(null);
        setIsValid(null);
        setParsedUser(null);
    };

    useEffect(() => {
        checkUserData();
    }, []);

    // Only show in development
    if (process.env.NODE_ENV === 'production') {
        return null;
    }

    return (
        <Card className="fixed bottom-4 right-4 w-80 z-50 shadow-lg border-2 border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600" />
                    LocalStorage Debugger
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Status */}
                <div className="flex items-center space-x-2">
                    {isValid === true && (
                        <>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-green-800">Valid user data</span>
                        </>
                    )}
                    {isValid === false && (
                        <>
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <span className="text-sm text-red-800">Invalid JSON data</span>
                        </>
                    )}
                    {isValid === null && (
                        <span className="text-sm text-gray-600">No user data</span>
                    )}
                </div>

                {/* Raw Data */}
                {userData && (
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-700">Raw Data:</p>
                        <div className="bg-gray-100 p-2 rounded text-xs break-all max-h-20 overflow-y-auto">
                            {userData.substring(0, 200)}{userData.length > 200 && '...'}
                        </div>
                    </div>
                )}

                {/* Parsed Data */}
                {parsedUser && (
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-700">Parsed User:</p>
                        <div className="bg-green-50 p-2 rounded text-xs">
                            <p><strong>Name:</strong> {parsedUser.name}</p>
                            <p><strong>Email:</strong> {parsedUser.email}</p>
                            <p><strong>Role:</strong> {parsedUser.role}</p>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex space-x-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={checkUserData}
                        className="text-xs"
                    >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Refresh
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={clearUserData}
                        className="text-xs"
                    >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clear
                    </Button>
                </div>

                <p className="text-xs text-gray-500">
                    This debugger only shows in development mode
                </p>
            </CardContent>
        </Card>
    );
}
