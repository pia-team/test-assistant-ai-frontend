'use client';

import { useSocket } from '@/context/SocketContext';
import { Wifi, WifiOff } from 'lucide-react';
import { useLocale } from '@/components/locale-context';

export function ConnectionStatus() {
  const { isConnected } = useSocket();
  const { dictionary } = useLocale();

  return (
    <div className="flex items-center gap-2">
      {isConnected ? (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          <span className="text-xs text-green-500">{dictionary.connection.connected}</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-red-500" />
          <span className="text-xs text-red-500">{dictionary.connection.disconnected}</span>
        </>
      )}
    </div>
  );
}
