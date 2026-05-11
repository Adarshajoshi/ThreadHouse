export default function LoadingSpinner({ message = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-10 h-10 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
      <p className="text-zinc-500 text-sm">{message}</p>
    </div>
  )
}
