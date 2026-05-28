'use client';

import { useState, useEffect, useCallback } from 'react';
import { m } from 'framer-motion';
import {
  Activity, RefreshCw, Monitor, Smartphone, Tablet,
  Wifi, WifiOff, TrendingDown, AlertCircle, CheckCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { PageLoader } from '@/components/ui/PageLoader';
import { AdminSidebar } from '@/components/admin/sidebar/AdminSidebar';
import { AdminBottomNav } from '@/components/admin/sidebar/AdminBottomNav';
import { AdminSubNav } from '@/components/admin/sidebar/AdminSubNav';

interface WebVital {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_rating: 'good' | 'needs-improvement' | 'poor';
  page_path: string;
  device_type: 'mobile' | 'tablet' | 'desktop';
  connection_type: string | null;
  session_id: string;
  country_code: string | null;
  created_at: string;
  user_agent: string;
}

interface MetricStats {
  metric_name: string;
  avg_value: number;
  p75_value: number;
  p95_value: number;
  good_count: number;
  needs_improvement_count: number;
  poor_count: number;
  total_count: number;
}

const METRIC_INFO: Record<string, { name: string; unit: string; good: number; poor: number }> = {
  'LCP': { name: 'Largest Contentful Paint', unit: 'ms', good: 2500, poor: 4000 },
  'FID': { name: 'First Input Delay', unit: 'ms', good: 100, poor: 300 },
  'CLS': { name: 'Cumulative Layout Shift', unit: '', good: 0.1, poor: 0.25 },
  'FCP': { name: 'First Contentful Paint', unit: 'ms', good: 1800, poor: 3000 },
  'TTFB': { name: 'Time to First Byte', unit: 'ms', good: 800, poor: 1800 },
  'INP': { name: 'Interaction to Next Paint', unit: 'ms', good: 200, poor: 500 },
};

const DEVICE_ICONS = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: Monitor,
};

export default function WebVitalsPageClient() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();

  const [vitals, setVitals] = useState<WebVital[]>([]);
  const [stats, setStats] = useState<MetricStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<string>('LCP');
  const [selectedDevice, setSelectedDevice] = useState<string>('all');
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  const checkAdminAccess = useCallback(async () => {
    try {
      if (!supabase) {
        toast.error('Database connection error');
        router.push('/');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user!.id)
        .single();

      if (!profile?.is_admin) {
        toast.error('Access denied: Admin only');
        router.push('/');
        return;
      }

      await fetchData();
    } catch (error) {
      console.error('Error checking admin access:', error);
      toast.error('Error checking permissions');
      router.push('/');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      checkAdminAccess();
    }
  }, [user, authLoading, router, checkAdminAccess]);

  async function fetchData() {
    setLoading(true);
    try {
      await Promise.all([fetchVitals(), fetchStats()]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load web vitals data');
    } finally {
      setLoading(false);
    }
  }

  async function fetchVitals() {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return;
    }

    const timeRangeMap = {
      '1h': 60,
      '24h': 1440,
      '7d': 10080,
      '30d': 43200,
    };

    const minutesAgo = timeRangeMap[timeRange];
    const startTime = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();

    let query = supabase
      .from('web_vitals')
      .select('*')
      .gte('created_at', startTime)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (selectedMetric !== 'all') {
      query = query.eq('metric_name', selectedMetric);
    }

    if (selectedDevice !== 'all') {
      query = query.eq('device_type', selectedDevice);
    }

    if (selectedRating !== 'all') {
      query = query.eq('metric_rating', selectedRating);
    }

    const { data, error } = await query;

    if (error) throw error;
    setVitals(data || []);
  }

  async function fetchStats() {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return;
    }

    const { data, error } = await supabase.rpc('get_web_vitals_stats', {
      time_range_minutes: timeRange === '1h' ? 60 : timeRange === '24h' ? 1440 : timeRange === '7d' ? 10080 : 43200
    });

    if (error) {
      console.error('Error fetching stats:', error);
      return;
    }

    setStats(data || []);
  }

  function getRatingColor(rating: string) {
    switch (rating) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200';
      case 'needs-improvement': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }

  function getRatingIcon(rating: string) {
    switch (rating) {
      case 'good': return CheckCircle;
      case 'needs-improvement': return AlertCircle;
      case 'poor': return TrendingDown;
      default: return Activity;
    }
  }

  function formatValue(metricName: string, value: number): string {
    if (metricName === 'CLS') {
      return value.toFixed(3);
    }
    return Math.round(value).toString();
  }

  function getDeviceBadge(deviceType: string) {
    const Icon = DEVICE_ICONS[deviceType as keyof typeof DEVICE_ICONS] || Monitor;
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
        <Icon className="w-3 h-3" />
        {deviceType}
      </span>
    );
  }

  function getConnectionBadge(connectionType: string | null) {
    if (!connectionType) return null;
    const Icon = connectionType === '4g' || connectionType === '5g' ? Wifi : WifiOff;
    const color = connectionType === '4g' || connectionType === '5g'
      ? 'bg-green-100 text-green-700'
      : 'bg-orange-100 text-orange-700';

    return (
      <span className={cn("inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full", color)}>
        <Icon className="w-3 h-3" />
        {connectionType}
      </span>
    );
  }

  const isDark = theme === 'dark';

  if (authLoading || loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neo-navy">
        <PageLoader size="lg" text="Loading Web Vitals..." />
      </div>
    );
  }

  return (
    <div className={cn("flex-1 flex flex-col w-full overflow-x-hidden min-h-screen", isDark ? "bg-neo-navy" : "bg-gray-50")}>
      <Header />
      <AdminSubNav />

      <div className="flex flex-1">
        <AdminSidebar />

        <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8 pb-20 sm:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={cn("text-3xl font-bold", isDark ? "text-white" : "text-gray-900")}>
              Web Vitals Performance
            </h1>
            <p className={cn("text-sm mt-1", isDark ? "text-gray-400" : "text-gray-600")}>
              Core Web Vitals metrics and performance monitoring
            </p>
          </div>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 me-2" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className={cn("p-4 rounded-lg mb-6 border", isDark ? "bg-neo-navy-light border-gray-700" : "bg-white border-gray-200")}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={cn("block text-sm font-medium mb-2", isDark ? "text-gray-300" : "text-gray-700")}>
                Time Range
              </label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className={cn(
                  "w-full px-3 py-2 rounded-lg border",
                  isDark ? "bg-neo-navy-elevated border-gray-600 text-white" : "bg-white border-gray-300"
                )}
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>

            <div>
              <label className={cn("block text-sm font-medium mb-2", isDark ? "text-gray-300" : "text-gray-700")}>
                Metric
              </label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 rounded-lg border",
                  isDark ? "bg-neo-navy-elevated border-gray-600 text-white" : "bg-white border-gray-300"
                )}
              >
                <option value="all">All Metrics</option>
                {Object.keys(METRIC_INFO).map(key => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={cn("block text-sm font-medium mb-2", isDark ? "text-gray-300" : "text-gray-700")}>
                Device Type
              </label>
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 rounded-lg border",
                  isDark ? "bg-neo-navy-elevated border-gray-600 text-white" : "bg-white border-gray-300"
                )}
              >
                <option value="all">All Devices</option>
                <option value="mobile">Mobile</option>
                <option value="tablet">Tablet</option>
                <option value="desktop">Desktop</option>
              </select>
            </div>

            <div>
              <label className={cn("block text-sm font-medium mb-2", isDark ? "text-gray-300" : "text-gray-700")}>
                Performance
              </label>
              <select
                value={selectedRating}
                onChange={(e) => setSelectedRating(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 rounded-lg border",
                  isDark ? "bg-neo-navy-elevated border-gray-600 text-white" : "bg-white border-gray-300"
                )}
              >
                <option value="all">All Ratings</option>
                <option value="good">Good</option>
                <option value="needs-improvement">Needs Improvement</option>
                <option value="poor">Poor</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {stats.map((stat) => {
            const info = METRIC_INFO[stat.metric_name];
            const goodPercent = (stat.good_count / stat.total_count) * 100;
            const poorPercent = (stat.poor_count / stat.total_count) * 100;

            return (
              <m.div
                key={stat.metric_name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-6 rounded-lg border",
                  isDark ? "bg-neo-navy-light border-gray-700" : "bg-white border-gray-200"
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className={cn("font-bold text-lg", isDark ? "text-white" : "text-gray-900")}>
                    {stat.metric_name}
                  </h3>
                  <Activity className="w-5 h-5 text-blue-500" />
                </div>

                <p className={cn("text-sm mb-3", isDark ? "text-gray-400" : "text-gray-600")}>
                  {info?.name}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-600")}>Average</span>
                    <span className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>
                      {formatValue(stat.metric_name, stat.avg_value)}{info?.unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-600")}>P75</span>
                    <span className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>
                      {formatValue(stat.metric_name, stat.p75_value)}{info?.unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-600")}>P95</span>
                    <span className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>
                      {formatValue(stat.metric_name, stat.p95_value)}{info?.unit}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-600">Good</span>
                    <span className="font-medium">{goodPercent.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${goodPercent}%` }}
                    />
                  </div>
                </div>

                {poorPercent > 10 && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    ⚠️ {poorPercent.toFixed(1)}% poor performance
                  </div>
                )}
              </m.div>
            );
          })}
        </div>

        {/* Recent Vitals Table */}
        <div className={cn("rounded-lg border overflow-hidden", isDark ? "bg-neo-navy-light border-gray-700" : "bg-white border-gray-200")}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className={cn("font-bold text-lg", isDark ? "text-white" : "text-gray-900")}>
              Recent Measurements ({vitals.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={cn("text-sm", isDark ? "bg-neo-navy-elevated" : "bg-gray-50")}>
                <tr>
                  <th className="px-3 sm:px-4 py-3 text-left font-medium">Metric</th>
                  <th className="px-3 sm:px-4 py-3 text-left font-medium">Value</th>
                  <th className="px-3 sm:px-4 py-3 text-left font-medium">Rating</th>
                  <th className="hidden sm:table-cell px-4 py-3 text-left font-medium">Page</th>
                  <th className="hidden md:table-cell px-4 py-3 text-left font-medium">Device</th>
                  <th className="hidden lg:table-cell px-4 py-3 text-left font-medium">Connection</th>
                  <th className="hidden sm:table-cell px-4 py-3 text-left font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {vitals.map((vital) => {
                  const RatingIcon = getRatingIcon(vital.metric_rating);
                  const info = METRIC_INFO[vital.metric_name];
                  const isPoor = vital.metric_rating === 'poor' || vital.metric_rating === 'needs-improvement';

                  return (
                    <tr
                      key={vital.id}
                      className={cn(
                        "text-sm",
                        isPoor && "bg-red-50 dark:bg-red-900/10",
                        isDark ? "hover:bg-neo-navy-elevated" : "hover:bg-gray-50"
                      )}
                    >
                      <td className={cn("px-3 sm:px-4 py-3 font-medium", isDark ? "text-white" : "text-gray-900")}>
                        {vital.metric_name}
                      </td>
                      <td className={cn("px-3 sm:px-4 py-3", isDark ? "text-gray-300" : "text-gray-700")}>
                        {formatValue(vital.metric_name, vital.metric_value)}{info?.unit}
                      </td>
                      <td className="px-3 sm:px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border", getRatingColor(vital.metric_rating))}>
                          <RatingIcon className="w-3 h-3" />
                          {vital.metric_rating}
                        </span>
                      </td>
                      <td className={cn("hidden sm:table-cell px-4 py-3 max-w-xs truncate", isDark ? "text-gray-300" : "text-gray-700")}>
                        {vital.page_path}
                      </td>
                      <td className="hidden md:table-cell px-4 py-3">
                        {isPoor && (
                          <div className="flex flex-col gap-1">
                            {getDeviceBadge(vital.device_type)}
                            {vital.connection_type && getConnectionBadge(vital.connection_type)}
                          </div>
                        )}
                        {!isPoor && getDeviceBadge(vital.device_type)}
                      </td>
                      <td className="hidden lg:table-cell px-4 py-3">
                        {vital.connection_type ? getConnectionBadge(vital.connection_type) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className={cn("hidden sm:table-cell px-4 py-3 text-xs", isDark ? "text-gray-400" : "text-gray-500")}>
                        {new Date(vital.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {vitals.length === 0 && (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className={cn("text-gray-600", isDark && "text-gray-400")}>
                  No web vitals data found for the selected filters
                </p>
              </div>
            )}
          </div>
        </div>
        </main>
      </div>

      <AdminBottomNav />
    </div>
  );
}
