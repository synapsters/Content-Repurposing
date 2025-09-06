'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Plus,
    Search,
    Filter,
    BookOpen,
    Video,
    FileText,
    Globe,
    Calendar,
    MoreVertical,
    Edit,
    Trash2,
    Eye
} from 'lucide-react';
import { IProgram } from '@/models/Program';
import { formatDuration, getLanguageFlag } from '@/lib/utils';

export default function ProgramsPage() {
    const [programs, setPrograms] = useState<IProgram[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchPrograms();
    }, [currentPage, searchTerm]);

    const fetchPrograms = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: '12',
                ...(searchTerm && { search: searchTerm })
            });

            const response = await fetch(`/api/programs?${params}`);
            const data = await response.json();

            setPrograms(data.programs || []);
            setTotalPages(data.pagination?.pages || 1);
        } catch (error) {
            console.error('Error fetching programs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1);
        fetchPrograms();
    };

    const getAssetTypeIcon = (type: string) => {
        switch (type) {
            case 'video':
                return Video;
            case 'text':
                return FileText;
            default:
                return BookOpen;
        }
    };

    const getStatusColor = (isPublished: boolean) => {
        return isPublished
            ? 'bg-green-100 text-green-800'
            : 'bg-yellow-100 text-yellow-800';
    };

    const getStatusText = (isPublished: boolean) => {
        return isPublished ? 'Published' : 'Draft';
    };

    if (loading && programs.length === 0) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Programs</h1>
                        <p className="mt-2 text-gray-600">
                            Manage your content programs and AI-generated materials
                        </p>
                    </div>
                    <div className="mt-4 sm:mt-0">
                        <Link href="/programs/create">
                            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                                <Plus className="h-4 w-4 mr-2" />
                                Create Program
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Search and Filters */}
                <Card>
                    <CardContent className="p-6">
                        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                    <Input
                                        placeholder="Search programs..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <Button type="submit" variant="outline">
                                <Search className="h-4 w-4 mr-2" />
                                Search
                            </Button>
                            <Button variant="outline">
                                <Filter className="h-4 w-4 mr-2" />
                                Filter
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Programs Grid */}
                {programs.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {programs.map((program) => (
                                <Card key={program._id} className="hover:shadow-lg transition-shadow">
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <CardTitle className="text-lg line-clamp-2">
                                                    {program.title}
                                                </CardTitle>
                                                <CardDescription className="mt-2 line-clamp-2">
                                                    {program.description}
                                                </CardDescription>
                                            </div>
                                            <div className="ml-2">
                                                <Button variant="ghost" size="sm">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {/* Status and Languages */}
                                            <div className="flex items-center justify-between">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(program.isPublished)}`}>
                                                    {getStatusText(program.isPublished)}
                                                </span>
                                                <div className="flex items-center space-x-1">
                                                    {program.supportedLanguages?.slice(0, 3).map((lang) => (
                                                        <span key={lang} className="text-sm">
                                                            {getLanguageFlag(lang)}
                                                        </span>
                                                    ))}
                                                    {(program.supportedLanguages?.length || 0) > 3 && (
                                                        <span className="text-xs text-gray-500">
                                                            +{(program.supportedLanguages?.length || 0) - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Assets Summary */}
                                            <div className="flex items-center justify-between text-sm text-gray-600">
                                                <div className="flex items-center space-x-4">
                                                    <span className="flex items-center">
                                                        <BookOpen className="h-4 w-4 mr-1" />
                                                        {program.assets?.length || 0} assets
                                                    </span>
                                                    <span className="flex items-center">
                                                        <FileText className="h-4 w-4 mr-1" />
                                                        {program.generatedContent?.length || 0} generated
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Asset Types */}
                                            {program.assets && program.assets.length > 0 && (
                                                <div className="flex items-center space-x-2">
                                                    {Array.from(new Set(program.assets.map(asset => asset.type))).map((type) => {
                                                        const Icon = getAssetTypeIcon(type);
                                                        return (
                                                            <div key={type} className="flex items-center space-x-1 text-xs text-gray-500">
                                                                <Icon className="h-3 w-3" />
                                                                <span className="capitalize">{type}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Tags */}
                                            {program.tags && program.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {program.tags.slice(0, 3).map((tag) => (
                                                        <span
                                                            key={tag}
                                                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                    {program.tags.length > 3 && (
                                                        <span className="text-xs text-gray-500">
                                                            +{program.tags.length - 3} more
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="flex items-center justify-between pt-2 border-t">
                                                <div className="flex items-center text-xs text-gray-500">
                                                    <Calendar className="h-3 w-3 mr-1" />
                                                    {new Date(program.updatedAt).toLocaleDateString()}
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Link href={`/programs/${program._id}`}>
                                                        <Button variant="ghost" size="sm">
                                                            <Eye className="h-3 w-3 mr-1" />
                                                            View
                                                        </Button>
                                                    </Link>
                                                    <Link href={`/programs/${program._id}/edit`}>
                                                        <Button variant="ghost" size="sm">
                                                            <Edit className="h-3 w-3 mr-1" />
                                                            Edit
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center space-x-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                >
                                    Previous
                                </Button>
                                <span className="text-sm text-gray-600">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                </Button>
                            </div>
                        )}
                    </>
                ) : (
                    <Card>
                        <CardContent className="text-center py-12">
                            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No programs found
                            </h3>
                            <p className="text-gray-600 mb-6">
                                {searchTerm
                                    ? `No programs match your search for "${searchTerm}"`
                                    : "Get started by creating your first content program"
                                }
                            </p>
                            <Link href="/programs/create">
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Program
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}
            </div>
        </Layout>
    );
}
