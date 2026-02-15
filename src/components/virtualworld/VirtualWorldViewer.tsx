import { useVirtualWorldStore } from '@/store/virtualWorldStore';

export default function VirtualWorldViewer() {
  const { currentWorld } = useVirtualWorldStore();

  if (!currentWorld) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        <p>Select a world to explore</p>
      </div>
    );
  }

  const getWorldGradient = () => {
    switch (currentWorld.theme) {
      case 'space':
        return 'from-indigo-900 via-purple-900 to-black';
      case 'beach':
        return 'from-sky-400 via-blue-300 to-yellow-200';
      case 'city':
        return 'from-gray-900 via-purple-900 to-pink-900';
      case 'forest':
        return 'from-green-900 via-green-700 to-green-500';
      default:
        return 'from-blue-500 to-purple-500';
    }
  };

  return (
    <div className={`h-full w-full bg-gradient-to-b ${getWorldGradient()} flex items-center justify-center`}>
      <div className="text-center text-white">
        <div className="mb-8">
          <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <span className="text-6xl">👤</span>
          </div>
          <p className="text-2xl font-bold mb-2">{currentWorld.name}</p>
          <p className="text-sm opacity-80">{currentWorld.description}</p>
        </div>
        <div className="text-sm opacity-60">
          <p>3D Virtual World Experience</p>
          <p className="mt-2">Theme: {currentWorld.theme}</p>
        </div>
      </div>
    </div>
  );
}