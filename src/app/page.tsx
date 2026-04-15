import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-4">noticed-claw</h1>
      <p className="text-gray-600 mb-8">developer intelligence agent workshop</p>
      <div className="flex gap-4">
        <Link
          href="/chat"
          className="bg-blue-500 text-white rounded-lg px-6 py-3 text-sm hover:bg-blue-600"
        >
          open chat
        </Link>
        <Link
          href="/dashboard"
          className="bg-gray-100 text-gray-900 rounded-lg px-6 py-3 text-sm hover:bg-gray-200"
        >
          dashboard
        </Link>
      </div>
    </div>
  );
}
