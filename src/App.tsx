import { WarRoomDashboard } from "./ui/components/WarRoomDashboard";
import { ErrorBoundary } from "./ui/components/ErrorBoundary";

export default function App() {
  return (
    <div className="fixed inset-0 w-screen h-[100dvh] bg-[#020617] overflow-hidden select-none flex items-center justify-center">
      <div className="relative w-full h-full max-w-[1920px] max-h-[1080px] shadow-[0_0_100px_rgba(0,0,0,1)] flex items-center justify-center overflow-hidden">
        <ErrorBoundary>
          <WarRoomDashboard />
        </ErrorBoundary>

        <div className="absolute inset-0 z-[3000] scanline-effect opacity-[0.05]"></div>
        
        <div className="absolute inset-0 z-[2999] pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]"></div>
      </div>
    </div>
  );
}
