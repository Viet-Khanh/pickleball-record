export function SetupNotice() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-2xl p-8 shadow text-center max-w-sm">
        <div className="text-4xl mb-3">⚙️</div>
        <h2 className="font-bold text-gray-800 mb-2">Chưa cấu hình Supabase</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          Tạo file <code className="bg-gray-100 px-1 rounded">.env.local</code> với{' '}
          <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> và{' '}
          <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
        </p>
      </div>
    </div>
  )
}
