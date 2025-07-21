export default function Home() {
  const timestamp = new Date().toISOString();
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Numbers ERP</h1>
      <p className="text-lg">Welcome to the Tutoring Center Platform</p>
      <div className="mt-8 p-6 bg-gray-100 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Static Test Page</h2>
        <p>This is a simple test page to verify Vercel deployment.</p>
        <p className="text-sm text-gray-600 mt-4">Build time: {timestamp}</p>
        <p className="text-sm text-gray-600">If you can see this, the page is loading correctly!</p>
      </div>
    </main>
  );
}
