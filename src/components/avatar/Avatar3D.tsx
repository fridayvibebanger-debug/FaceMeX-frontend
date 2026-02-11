export default function Avatar3D() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
          <span className="text-4xl">👤</span>
        </div>
        <p className="text-sm text-muted-foreground">3D Avatar Preview</p>
      </div>
    </div>
  );
}