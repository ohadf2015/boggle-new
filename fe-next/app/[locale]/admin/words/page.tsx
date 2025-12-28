import { DailyWordManager } from '@/components/admin/DailyWordManager';

export default function AdminWordsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">Daily Challenge Word Manager</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage target words for daily word hunt challenges across all languages
          </p>
        </div>
        <DailyWordManager />
      </div>
    </div>
  );
}
