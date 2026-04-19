export default function OrgLoading() {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top controls skeleton */}
      <div className="flex justify-center pt-4">
        <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 shadow-sm border border-gray-100">
          {[80, 72, 72, 72].map((w, i) => (
            <div
              key={i}
              className="h-7 rounded-lg animate-pulse bg-gray-200"
              style={{ width: w }}
            />
          ))}
          <div className="w-px h-6 bg-gray-200" />
          {[28, 40, 28, 64].map((w, i) => (
            <div
              key={`z${i}`}
              className="h-7 rounded-lg animate-pulse bg-gray-200"
              style={{ width: w }}
            />
          ))}
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 relative overflow-hidden p-8">
        {/* Three team columns */}
        {[0, 1, 2].map((col) => (
          <div
            key={col}
            className="absolute top-8"
            style={{ left: `${col * 33 + 4}%`, width: "30%" }}
          >
            {/* Team label */}
            <div className="h-5 w-16 rounded animate-pulse bg-gray-300 mb-6" />
            {/* Node grid */}
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: col === 0 ? 4 : 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl animate-pulse bg-white shadow-sm border border-gray-100 flex flex-col items-center p-3 gap-2"
                  style={{ height: 155 }}
                >
                  <div className="w-12 h-12 rounded-full bg-gray-200" />
                  <div className="h-3 w-16 rounded bg-gray-200" />
                  <div className="h-2 w-20 rounded bg-gray-100" />
                  <div className="flex gap-1">
                    <div className="h-4 w-10 rounded bg-gray-100" />
                    <div className="h-4 w-8 rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom legend skeleton */}
      <div className="flex justify-center pb-4">
        <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-2 shadow-sm border border-gray-100">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-4 w-12 rounded animate-pulse bg-gray-200" />
          ))}
        </div>
      </div>
    </div>
  )
}
