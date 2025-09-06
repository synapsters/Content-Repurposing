'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Plus,
  BookOpen,
  FileText,
  Users,
  Globe,
  Sparkles,
  Video,
  BarChart3
} from 'lucide-react';
import { IProgram } from '@/models/Program';
import { getUser } from '@/lib/auth';
import { IGeneratedContent } from '@/models/Program';

// Helper function to count latest versions of generated content
const getLatestVersionsCount = (generatedContent: IGeneratedContent[]): number => {
  if (!generatedContent || generatedContent.length === 0) {
    return 0;
  }

  // Group by content type and language combination
  const groupedByTypeAndLang = generatedContent
    .filter(content => content.status === 'published')
    .reduce((acc, content) => {
      const key = `${content.type}-${content.language}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(content);
      return acc;
    }, {} as Record<string, IGeneratedContent[]>);

  // Count the latest version for each type-language combination
  let count = 0;
  Object.keys(groupedByTypeAndLang).forEach(key => {
    const contentForKey = groupedByTypeAndLang[key];
    if (contentForKey.length > 0) {
      count += 1; // Count one latest version per type-language combination
    }
  });

  return count;
};

export default function Dashboard() {
  const router = useRouter();
  const [programs, setPrograms] = useState<IProgram[]>([]);
  const [stats, setStats] = useState({
    totalPrograms: 0,
    totalAssets: 0,
    totalGeneratedContent: 0,
    publishedPrograms: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const user = getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    fetchDashboardData();
  }, [router]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/programs?limit=5');
      const data = await response.json();

      setPrograms(data.programs || []);

      // Calculate stats
      const totalAssets = data.programs?.reduce((acc: number, program: IProgram) =>
        acc + (program.assets?.length || 0), 0) || 0;
      // Helper function to get latest versions only
      const getLatestVersionsCount = (contents: IGeneratedContent[]) => {
        const publishedContent = contents.filter(content => content.status === 'published');
        const groupedByTypeAndLang = publishedContent.reduce((acc, content) => {
          const key = `${content.type}-${content.language}`;
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(content);
          return acc;
        }, {} as Record<string, IGeneratedContent[]>);

        return Object.keys(groupedByTypeAndLang).length; // Count unique type-language combinations
      };

      const totalGeneratedContent = data.programs?.reduce((acc: number, program: IProgram) => {
        const contentCount = program.assets?.reduce((assetAcc: number, asset) =>
          assetAcc + getLatestVersionsCount(asset.generatedContent || []), 0) || 0;
        return acc + contentCount;
      }, 0) || 0;
      const publishedPrograms = data.programs?.filter((program: IProgram) =>
        program.isPublished).length || 0;

      setStats({
        totalPrograms: data.programs?.length || 0,
        totalAssets,
        totalGeneratedContent,
        publishedPrograms
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Programs',
      value: stats.totalPrograms,
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Content Assets',
      value: stats.totalAssets,
      icon: Video,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Generated Content',
      value: stats.totalGeneratedContent,
      icon: Sparkles,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Published Programs',
      value: stats.publishedPrograms,
      icon: Globe,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  if (loading) {
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
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Welcome to your AI-powered content repurposing platform
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        {stat.title}
                      </p>
                      <p className="text-3xl font-bold text-gray-900">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${stat.bgColor}`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Programs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>Recent Programs</span>
              </CardTitle>
              <CardDescription>
                Your latest content programs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {programs.length > 0 ? (
                <div className="space-y-4">
                  {programs.slice(0, 5).map((program) => (
                    <div
                      key={program._id as string}
                      className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 break-words line-clamp-2">
                          {program.title}
                        </h4>
                        <p className="text-sm text-gray-600 break-words line-clamp-2 mt-1">
                          {program.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                            {program.assets?.length || 0} assets
                          </span>
                          <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                            {program.assets?.reduce((acc, asset) => acc + getLatestVersionsCount(asset.generatedContent || []), 0) || 0} generated
                          </span>
                          {program.isPublished && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Published
                            </span>
                          )}
                        </div>
                      </div>
                      <Link href={`/programs/${program._id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </div>
                  ))}
                  <Link href="/programs">
                    <Button variant="outline" className="w-full">
                      View All Programs
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No programs yet</p>
                  <Link href="/programs/create">
                    <Button>Create Your First Program</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5" />
                <span>Quick Actions</span>
              </CardTitle>
              <CardDescription>
                Get started with content creation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Link href="/programs/create">
                  <Button variant="outline" className="w-full justify-start">
                    <Plus className="h-4 w-4 mr-3" />
                    Create New Program
                  </Button>
                </Link>
                <Link href="/programs">
                  <Button variant="outline" className="w-full justify-start">
                    <BookOpen className="h-4 w-4 mr-3" />
                    Browse Programs
                  </Button>
                </Link>
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="h-4 w-4 mr-3" />
                  View Analytics
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Globe className="h-4 w-4 mr-3" />
                  Language Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Highlights */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Features</CardTitle>
            <CardDescription>
              Powerful AI-driven content repurposing capabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-blue-100 p-3 rounded-full w-12 h-12 mx-auto mb-3">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Smart Summaries</h3>
                <p className="text-sm text-gray-600">
                  Generate comprehensive summaries from any content type
                </p>
              </div>
              <div className="text-center">
                <div className="bg-green-100 p-3 rounded-full w-12 h-12 mx-auto mb-3">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Interactive Quizzes</h3>
                <p className="text-sm text-gray-600">
                  Create engaging quizzes to test knowledge retention
                </p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 p-3 rounded-full w-12 h-12 mx-auto mb-3">
                  <Globe className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Multi-Language</h3>
                <p className="text-sm text-gray-600">
                  Automatically localize content to multiple languages
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}