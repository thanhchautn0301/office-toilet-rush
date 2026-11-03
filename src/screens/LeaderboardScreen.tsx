export default function LeaderboardScreen({ onBack }: { onBack: () => void }) {
  return (
    <main className="mx-auto flex h-full max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
      <p className="floaty text-7xl">🏆</p>
      <h1 className="text-4xl font-extrabold">Bảng xếp hạng</h1>
      <p className="card px-5 py-4 text-lg font-medium">
        Sắp ra mắt ở phiên bản sau! Hiện tại mọi dữ liệu chỉ nằm trên máy của bạn.
      </p>
      <button className="btn btn-big btn-sky" onClick={onBack}>← Về menu</button>
    </main>
  )
}
